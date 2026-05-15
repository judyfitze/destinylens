// PayPal Connect OAuth Callback
// GET /api/paypal-callback?code=XXX&state=YYY
// Handles the OAuth redirect from PayPal

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const { code, state, error: paypalError } = req.query;

    // Handle PayPal OAuth errors
    if (paypalError) {
      console.error('PayPal OAuth error:', paypalError);
      res.status(400).send(renderErrorPage('Connection Failed', paypalError));
      return;
    }

    if (!code || !state) {
      res.status(400).send(renderErrorPage('Invalid Request', 'Missing code or state parameter'));
      return;
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Find connection by state
    const { data: connection, error: connError } = await supabase
      .from('income_connections')
      .select('*')
      .eq('external_account_id', state)
      .eq('provider', 'paypal')
      .single();

    if (connError || !connection) {
      console.error('Connection not found for state:', state);
      res.status(404).send(renderErrorPage('Connection Not Found', 'The connection request was not found or has expired.'));
      return;
    }

    // Exchange code for access token with PayPal
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!paypalClientId || !paypalClientSecret) {
      console.error('PayPal credentials not configured');
      res.status(500).send(renderErrorPage('Configuration Error', 'PayPal is not properly configured.'));
      return;
    }

    // Determine PayPal environment
    const isSandbox = process.env.PAYPAL_ENVIRONMENT === 'sandbox';
    const paypalApiUrl = isSandbox 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    // Exchange code for tokens
    const tokenResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('PayPal token exchange error:', tokenData);
      
      // Update connection status to error
      await supabase
        .from('income_connections')
        .update({ 
          status: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('connection_id', connection.connection_id);

      res.status(400).send(renderErrorPage('PayPal Error', tokenData.error_description || 'Failed to connect to PayPal'));
      return;
    }

    // Success! We have the access token and other info
    const { access_token, refresh_token, expires_in } = tokenData;

    console.log('PayPal Connect success:', { 
      connection_id: connection.connection_id,
      expires_in 
    });

    // Get merchant info using the access token
    let merchantId = null;
    let merchantEmail = null;
    try {
      const userInfoResponse = await fetch(`${paypalApiUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        merchantId = userInfo.payer_id;
        merchantEmail = userInfo.email;
        console.log('PayPal merchant info:', { merchantId, merchantEmail });
      }
    } catch (userInfoError) {
      console.error('Error fetching user info:', userInfoError);
      // Non-fatal - continue without merchant info
    }

    // Update connection as active
    await supabase
      .from('income_connections')
      .update({
        status: 'active',
        external_account_id: merchantId || 'paypal_connected',
        vault_secret_reference: `paypal_token_${connection.connection_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection.connection_id);

    // Register webhook for this connected account
    try {
      const webhookUrl = `${process.env.SITE_URL || 'https://destinylens.io'}/api/webhook/paypal?connection_id=${connection.connection_id}`;
      
      const webhookResponse = await fetch(`${paypalApiUrl}/v1/notifications/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          event_types: [
            { name: 'PAYMENT.CAPTURE.COMPLETED' },
            { name: 'PAYMENT.CAPTURE.DENIED' },
            { name: 'CHECKOUT.ORDER.COMPLETED' },
            { name: 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED' },
          ],
        }),
      });

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        
        // Store webhook reference
        await supabase
          .from('income_connections')
          .update({ webhook_reference: webhookData.id })
          .eq('connection_id', connection.connection_id);
          
        console.log('PayPal webhook registered:', webhookData.id);
      } else {
        const webhookError = await webhookResponse.text();
        console.error('PayPal webhook registration failed:', webhookError);
        // Non-fatal - connection still works, just manual webhook setup needed
      }
    } catch (webhookError) {
      console.error('PayPal webhook registration error:', webhookError);
      // Non-fatal
    }

    // Return success page that closes popup and notifies parent
    res.status(200).send(renderSuccessPage());

  } catch (error) {
    console.error('PayPal callback error:', error);
    res.status(500).send(renderErrorPage('Error', error.message));
  }
}

function renderSuccessPage() {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>PayPal Connected!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #A94CF0 0%, #F6C26B 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: rgba(255,255,255,0.7);
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✅</div>
    <h1>PayPal Connected!</h1>
    <p>Your PayPal account is now linked to DestinyLens.<br>This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ type: 'paypal-connected', success: true }, '*');
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>
  `;
}

function renderErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0a0a12 0%, #1a1a2e 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
      color: #ef4444;
    }
    p {
      color: rgba(255,255,255,0.7);
      font-size: 16px;
    }
    button {
      margin-top: 20px;
      padding: 12px 24px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: rgba(255,255,255,0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'paypal-connected', success: false, error: '${title}' }, '*');
    }
  </script>
</body>
</html>
  `;
}
