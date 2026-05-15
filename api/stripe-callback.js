// Stripe Connect OAuth Callback
// GET /api/stripe-callback?code=XXX&state=YYY
// Handles the OAuth redirect from Stripe

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const { code, state, error: stripeError } = req.query;

    // Handle Stripe OAuth errors
    if (stripeError) {
      console.error('Stripe OAuth error:', stripeError);
      res.status(400).send(renderErrorPage('Connection Failed', stripeError));
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
      .eq('provider', 'stripe')
      .single();

    if (connError || !connection) {
      console.error('Connection not found for state:', state);
      res.status(404).send(renderErrorPage('Connection Not Found', 'The connection request was not found or has expired.'));
      return;
    }

    // Exchange code for access token with Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      res.status(500).send(renderErrorPage('Configuration Error', 'Stripe is not properly configured.'));
      return;
    }

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_secret: stripeSecretKey,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Stripe token exchange error:', tokenData);
      
      // Update connection status to error
      await supabase
        .from('income_connections')
        .update({ 
          status: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('connection_id', connection.connection_id);

      res.status(400).send(renderErrorPage('Stripe Error', tokenData.error_description || 'Failed to connect to Stripe'));
      return;
    }

    // Success! We have the access token and Stripe account ID
    const { access_token, stripe_user_id, refresh_token } = tokenData;

    console.log('Stripe Connect success:', { 
      connection_id: connection.connection_id, 
      stripe_user_id 
    });

    // Store the access token securely (in a real app, use a secrets vault)
    // For now, we'll store a reference and the stripe_user_id
    // IMPORTANT: In production, store access_token in a proper secrets manager

    // Update connection as active
    await supabase
      .from('income_connections')
      .update({
        status: 'active',
        external_account_id: stripe_user_id, // Now stores the actual Stripe account ID
        vault_secret_reference: `stripe_token_${connection.connection_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection.connection_id);

    // Optionally: Register webhook for this connected account
    // This allows us to receive events for this specific account
    try {
      const webhookUrl = `${process.env.SITE_URL || 'https://destinylens.io'}/api/webhook/stripe?connection_id=${connection.connection_id}`;
      
      const webhookResponse = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          url: webhookUrl,
          'enabled_events[]': 'checkout.session.completed',
          'enabled_events[]': 'charge.succeeded',
          'enabled_events[]': 'payment_intent.succeeded',
          'metadata[connection_id]': connection.connection_id,
        }),
      });

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        
        // Store webhook reference
        await supabase
          .from('income_connections')
          .update({ webhook_reference: webhookData.id })
          .eq('connection_id', connection.connection_id);
          
        console.log('Webhook registered:', webhookData.id);
      } else {
        console.error('Webhook registration failed:', await webhookResponse.text());
        // Non-fatal - connection still works, just manual webhook setup needed
      }
    } catch (webhookError) {
      console.error('Webhook registration error:', webhookError);
      // Non-fatal
    }

    // Return success page that closes popup and notifies parent
    res.status(200).send(renderSuccessPage());

  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send(renderErrorPage('Error', error.message));
  }
}

function renderSuccessPage() {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Stripe Connected!</title>
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
    <h1>Stripe Connected!</h1>
    <p>Your Stripe account is now linked to DestinyLens.<br>This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ type: 'stripe-connected', success: true }, '*');
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
      window.opener.postMessage({ type: 'stripe-connected', success: false, error: '${title}' }, '*');
    }
  </script>
</body>
</html>
  `;
}
