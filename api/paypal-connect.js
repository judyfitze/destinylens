// PayPal Connect OAuth - Generate OAuth URL
// POST /api/paypal-connect
// Body: { connection_id, user_id }

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { connection_id, user_id } = req.body;

    if (!connection_id || !user_id) {
      res.status(400).json({ error: 'Missing connection_id or user_id' });
      return;
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Verify the connection exists and belongs to this user
    const { data: connection, error: connError } = await supabase
      .from('income_connections')
      .select('*')
      .eq('connection_id', connection_id)
      .eq('user_id', user_id)
      .single();

    if (connError || !connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    // Get PayPal Client ID from environment
    const paypalClientId = process.env.PAYPAL_CLIENT_ID;
    
    if (!paypalClientId) {
      console.error('PAYPAL_CLIENT_ID not configured');
      res.status(500).json({ error: 'PayPal configuration missing' });
      return;
    }

    // Generate OAuth state parameter (for CSRF protection)
    const state = `${connection_id}:${user_id}:${Date.now()}`;
    const stateEncoded = Buffer.from(state).toString('base64');

    // Store state in connection for verification
    await supabase
      .from('income_connections')
      .update({ 
        external_account_id: stateEncoded,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection_id);

    // Build PayPal OAuth URL
    const redirectUri = `${process.env.SITE_URL || 'https://destinylens.io'}/api/paypal-callback`;
    
    // Determine PayPal environment
    const isSandbox = process.env.PAYPAL_ENVIRONMENT === 'sandbox';
    const paypalAuthUrl = isSandbox 
      ? 'https://www.sandbox.paypal.com/signin/authorize'
      : 'https://www.paypal.com/signin/authorize';
    
    const authUrl = new URL(paypalAuthUrl);
    authUrl.searchParams.set('flowEntry', 'static');
    authUrl.searchParams.set('client_id', paypalClientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email https://uri.paypal.com/services/paypalattributes https://uri.paypal.com/services/payments/realtimepayment https://uri.paypal.com/services/payments/payment');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', stateEncoded);

    res.status(200).json({ 
      url: authUrl.toString(),
      state: stateEncoded 
    });

  } catch (error) {
    console.error('PayPal Connect error:', error);
    res.status(500).json({ error: error.message });
  }
}
