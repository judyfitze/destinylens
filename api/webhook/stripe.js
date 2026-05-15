// Stripe Webhook Handler - Vercel Serverless Function
// No JWT auth required - Stripe sends webhooks directly

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, stripe-signature',
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
    const payload = req.body;
    
    console.log('Received Stripe event:', payload.type);
    console.log('Event data:', JSON.stringify(payload.data?.object, null, 2));

    // Process payment events
    let amount = 0;
    let currency = 'USD';
    let created = Math.floor(Date.now() / 1000);
    
    const obj = payload.data?.object || {};
    
    if (payload.type === 'checkout.session.completed') {
      amount = (obj.amount_total || obj.amount_subtotal || 0) / 100;
      currency = (obj.currency || 'usd').toUpperCase();
    } else if (payload.type === 'charge.succeeded') {
      amount = (obj.amount || 0) / 100;
      currency = (obj.currency || 'usd').toUpperCase();
      created = obj.created || created;
    } else if (payload.type === 'payment_intent.succeeded') {
      amount = (obj.amount || 0) / 100;
      currency = (obj.currency || 'usd').toUpperCase();
      created = obj.created || created;
    } else if (payload.type === 'invoice.payment_succeeded') {
      amount = (obj.amount_paid || obj.amount || 0) / 100;
      currency = (obj.currency || 'usd').toUpperCase();
    } else {
      // Try any field
      amount = (obj.amount || obj.amount_total || obj.amount_subtotal || obj.amount_paid || 0) / 100;
      currency = (obj.currency || 'usd').toUpperCase();
    }
    
    if (amount <= 0) {
      console.log('No amount found in event:', payload.type);
      res.status(200).json({ message: 'No amount found' });
      return;
    }

    // Get connection ID from URL
    const { connection_id } = req.query;
    
    if (!connection_id) {
      console.error('Missing connection_id');
      res.status(400).json({ error: 'Missing connection ID' });
      return;
    }

    // Connect to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    console.log('Looking for connection:', connection_id);
    
    // Find the connection
    const { data: connection, error: connError } = await supabase
      .from('income_connections')
      .select('*')
      .eq('connection_id', connection_id)
      .eq('provider', 'stripe')
      .single();

    if (connError) {
      console.error('Connection query error:', connError);
      res.status(500).json({ error: 'Connection error: ' + connError.message });
      return;
    }
    
    if (!connection) {
      console.error('Connection not found:', connection_id);
      res.status(404).json({ error: 'Connection not found' });
      return;
    }
    
    console.log('Found connection for user:', connection.user_id);

    // Check for duplicate
    const { data: existing } = await supabase
      .from('income_progress_events')
      .select('income_event_id')
      .eq('provider', 'stripe')
      .eq('connection_id', connection_id)
      .eq('external_event_id', payload.id)
      .maybeSingle();

    if (existing) {
      console.log('Event already processed:', payload.id);
      res.status(200).json({ message: 'Already processed' });
      return;
    }

    console.log('Inserting:', { user_id: connection.user_id, amount, currency });
    
    // Insert income event
    const { error: insertError } = await supabase
      .from('income_progress_events')
      .insert({
        user_id: connection.user_id,
        connection_id: connection_id,
        provider: 'stripe',
        external_event_id: payload.id,
        amount: amount,
        currency: currency,
        status: 'received',
        received_at: new Date(created * 1000).toISOString()
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      res.status(500).json({ error: 'Insert error: ' + insertError.message });
      return;
    }

    console.log('Saved event:', payload.id, amount, currency);

    // Update connection status
    const newStatus = connection.status === 'pending' ? 'connected' : 
                      connection.status === 'connected' ? 'active' : 
                      connection.status;
    
    await supabase
      .from('income_connections')
      .update({ status: newStatus, last_synced_at: new Date().toISOString() })
      .eq('connection_id', connection_id);

    res.status(200).json({ message: 'Success', amount, currency });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
