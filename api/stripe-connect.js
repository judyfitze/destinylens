// Stripe Connect OAuth - Generate OAuth URL
// POST /api/stripe-connect
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

    // Get Stripe Client ID from environment
    const stripeClientId = process.env.STRIPE_CLIENT_ID;
    
    if (!stripeClientId) {
      console.error('STRIPE_CLIENT_ID not configured');
      res.status(500).json({ error: 'Stripe configuration missing' });
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

    // Build Stripe OAuth URL
    const redirectUri = `${process.env.SITE_URL || 'https://destinylens.io'}/api/stripe-callback`;
    
    const stripeOAuthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    stripeOAuthUrl.searchParams.set('response_type', 'code');
    stripeOAuthUrl.searchParams.set('client_id', stripeClientId);
    stripeOAuthUrl.searchParams.set('state', stateEncoded);
    stripeOAuthUrl.searchParams.set('scope', 'read_write'); // or 'read_only' for read-only access
    stripeOAuthUrl.searchParams.set('redirect_uri', redirectUri);

    // Optional: pre-fill Stripe account info
    // stripeOAuthUrl.searchParams.set('stripe_user[email]', userEmail);

    res.status(200).json({ 
      url: stripeOAuthUrl.toString(),
      state: stateEncoded 
    });

  } catch (error) {
    console.error('Stripe Connect error:', error);
    res.status(500).json({ error: error.message });
  }
}
