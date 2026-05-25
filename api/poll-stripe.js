// Stripe Polling API - Fetches recent payments from connected Stripe accounts
// Called by frontend to check for new payments
// POST /api/poll-stripe
// Body: { connection_id }

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { connection_id } = req.body;

    if (!connection_id) {
      res.status(400).json({ error: 'Missing connection_id' });
      return;
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('income_connections')
      .select('*')
      .eq('connection_id', connection_id)
      .eq('provider', 'stripe')
      .single();

    if (connError || !connection) {
      res.status(404).json({ error: 'Connection not found' });
      return;
    }

    // Get the stored access token from the connection
    const accessToken = connection.vault_secret_reference;
    
    if (!accessToken) {
      res.status(500).json({ error: 'No access token found. Please reconnect Stripe.' });
      return;
    }

    // Get last sync time (default to 24 hours ago)
    const lastSync = connection.last_synced_at 
      ? new Date(connection.last_synced_at)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const lastSyncTimestamp = Math.floor(lastSync.getTime() / 1000);

    // Fetch recent charges from Stripe using connected account's access token
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/charges?created[gte]=${lastSyncTimestamp}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Account': connection.external_account_id || undefined, // Request on behalf of connected account
        },
      }
    );

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      res.status(500).json({ error: 'Stripe API error' });
      return;
    }

    const stripeData = await stripeResponse.json();
    const charges = stripeData.data || [];

    console.log(`Found ${charges.length} charges since ${lastSync.toISOString()}`);

    // Process each charge
    let newPayments = 0;
    for (const charge of charges) {
      // Skip failed charges
      if (!charge.paid || charge.refunded) continue;

      // Check for duplicate
      const { data: existing } = await supabase
        .from('income_progress_events')
        .select('income_event_id')
        .eq('provider', 'stripe')
        .eq('connection_id', connection_id)
        .eq('external_event_id', charge.id)
        .maybeSingle();

      if (existing) {
        console.log('Charge already processed:', charge.id);
        continue;
      }

      // Insert new payment
      const { error: insertError } = await supabase
        .from('income_progress_events')
        .insert({
          user_id: connection.user_id,
          connection_id: connection_id,
          provider: 'stripe',
          external_event_id: charge.id,
          amount: charge.amount / 100, // Convert cents to dollars
          currency: (charge.currency || 'usd').toUpperCase(),
          status: 'received',
          received_at: new Date(charge.created * 1000).toISOString(),
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        continue;
      }

      newPayments++;
      console.log('New payment recorded:', charge.id, charge.amount / 100);
    }

    // Update last sync time
    await supabase
      .from('income_connections')
      .update({ 
        last_synced_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('connection_id', connection_id);

    res.status(200).json({
      success: true,
      checked: charges.length,
      new: newPayments,
      lastSync: lastSync.toISOString(),
    });

  } catch (error) {
    console.error('Polling error:', error);
    res.status(500).json({ error: error.message });
  }
}
