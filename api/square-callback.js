// Square Connect OAuth Callback
// GET /api/square-callback?code=XXX&state=YYY
// Handles the OAuth redirect from Square

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const { code, state, error: squareError, error_description } = req.query;

    // Handle Square OAuth errors
    if (squareError) {
      console.error('Square OAuth error:', squareError, error_description);
      res.status(400).send(renderErrorPage('Connection Failed', error_description || squareError));
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
      .eq('provider', 'square')
      .single();

    if (connError || !connection) {
      console.error('Connection not found for state:', state);
      res.status(404).send(renderErrorPage('Connection Not Found', 'The connection request was not found or has expired.'));
      return;
    }

    // Exchange code for access token with Square
    const squareAppId = process.env.SQUARE_APP_ID;
    const squareSecret = process.env.SQUARE_SECRET;
    
    if (!squareAppId || !squareSecret) {
      console.error('Square credentials not configured');
      res.status(500).send(renderErrorPage('Configuration Error', 'Square is not properly configured.'));
      return;
    }

    // Determine Square environment
    const isSandbox = process.env.SQUARE_ENVIRONMENT === 'sandbox';
    const squareTokenUrl = isSandbox 
      ? 'https://connect.squareupsandbox.com/oauth2/token'
      : 'https://connect.squareup.com/oauth2/token';

    const redirectUri = `${process.env.SITE_URL || 'https://destinylens.io'}/api/square-callback`;

    const tokenResponse = await fetch(squareTokenUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-01'
      },
      body: JSON.stringify({
        client_id: squareAppId,
        client_secret: squareSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Square token exchange error:', tokenData);
      
      // Update connection status to error
      await supabase
        .from('income_connections')
        .update({ 
          status: 'error', 
          updated_at: new Date().toISOString() 
        })
        .eq('connection_id', connection.connection_id);

      res.status(400).send(renderErrorPage('Square Error', tokenData.message || 'Failed to connect to Square'));
      return;
    }

    // Success! We have the access token and Square merchant ID
    const { access_token, refresh_token, merchant_id } = tokenData;

    console.log('Square Connect success:', { 
      connection_id: connection.connection_id, 
      merchant_id 
    });

    // Update connection as active
    await supabase
      .from('income_connections')
      .update({
        status: 'active',
        external_account_id: merchant_id, // Now stores the actual Square merchant ID
        vault_secret_reference: `square_token_${connection.connection_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection.connection_id);

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
  <title>Square Connected!</title>
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
    <h1>Square Connected!</h1>
    <p>Your Square account is now linked to DestinyLens.<br>This window will close automatically...</p>
  </div>
  <script>
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ type: 'square-connected', success: true }, '*');
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
      window.opener.postMessage({ type: 'square-connected', success: false, error: '${title}' }, '*');
    }
  </script>
</body>
</html>
  `;
}
