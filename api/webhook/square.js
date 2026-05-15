// Square Webhook Handler - Vercel Serverless Function
// No JWT auth required - Square sends webhooks directly

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-square-signature',
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
    
    console.log('Received Square event:', payload.type);
    console.log('Event data:', JSON.stringify(payload.data, null, 2));

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
      .eq('provider', 'square')
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

    // Process payment events
    let amount = 0;
    let currency = 'USD';
    let eventId = payload.event_id || payload.id || 'unknown';
    let createdAt = new Date().toISOString();
    
    const obj = payload.data?.object || payload.data || {};
    
    // Handle different Square event types
    if (payload.type === 'payment.created' || payload.type === 'payment.updated') {
      // Payment webhook
      amount = (obj.amount_money?.amount || 0) / 100;
      currency = (obj.amount_money?.currency || 'USD').toUpperCase();
      eventId = obj.id || eventId;
      createdAt = obj.created_at || createdAt;
    } else if (payload.type === 'order.created' || payload.type === 'order.updated') {
      // Order webhook - use total money
      amount = (obj.total_money?.amount || obj.total_money?.amount || 0) / 100;
      currency = (obj.total_money?.currency || 'USD').toUpperCase();
      eventId = obj.id || eventId;
      createdAt = obj.created_at || createdAt;
    } else if (payload.type === 'invoice.payment_made') {
      // Invoice payment
      amount = (obj.payment_amount?.amount || 0) / 100;
      currency = (obj.payment_amount?.currency || 'USD').toUpperCase();
      eventId = obj.invoice_id || eventId;
      createdAt = obj.payment_date || createdAt;
    } else {
      // Try to extract amount from any field
      const moneyField = obj.amount_money || obj.total_money || obj.payment_amount || obj.amount || {};
      amount = (moneyField.amount || 0) / 100;
      currency = (moneyField.currency || 'USD').toUpperCase();
    }
    
    if (amount <= 0) {
      console.log('No amount found in event:', payload.type);
      res.status(200).json({ message: 'No amount found' });
      return;
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('income_progress_events')
      .select('income_event_id')
      .eq('provider', 'square')
      .eq('connection_id', connection_id)
      .eq('external_event_id', eventId)
      .maybeSingle();

    if (existing) {
      console.log('Event already processed:', eventId);
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
        provider: 'square',
        external_event_id: eventId,
        amount: amount,
        currency: currency,
        status: 'received',
        received_at: createdAt
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      res.status(500).json({ error: 'Insert error: ' + insertError.message });
      return;
    }

    console.log('Saved event:', eventId, amount, currency);

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
