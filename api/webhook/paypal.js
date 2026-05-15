// PayPal Webhook Handler - Vercel Serverless Function
// No JWT auth required - PayPal sends webhooks directly
// POST /api/webhook/paypal?connection_id=XXX

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, paypal-transmission-id, paypal-transmission-time, paypal-transmission-sig, paypal-cert-url, paypal-auth-algo',
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
    const headers = req.headers;
    
    console.log('Received PayPal event:', payload.event_type);
    console.log('Event ID:', payload.id);

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

    // Find the connection
    const { data: connection, error: connError } = await supabase
      .from('income_connections')
      .select('*')
      .eq('connection_id', connection_id)
      .eq('provider', 'paypal')
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

    // Verify webhook signature (optional but recommended)
    // For now, we'll skip signature verification to keep it simple
    // In production, implement: https://developer.paypal.com/api/rest/webhooks/rest/
    
    // Check for duplicate event
    const { data: existing } = await supabase
      .from('income_progress_events')
      .select('income_event_id')
      .eq('provider', 'paypal')
      .eq('connection_id', connection_id)
      .eq('external_event_id', payload.id)
      .maybeSingle();

    if (existing) {
      console.log('Event already processed:', payload.id);
      res.status(200).json({ message: 'Already processed' });
      return;
    }

    // Process payment events
    let amount = 0;
    let currency = 'USD';
    let status = 'received';
    let receivedAt = new Date().toISOString();

    const resource = payload.resource || {};

    switch (payload.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        amount = parseFloat(resource.amount?.value || 0);
        currency = resource.amount?.currency_code || 'USD';
        receivedAt = resource.create_time || receivedAt;
        status = 'received';
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REVERSED':
        amount = parseFloat(resource.amount?.value || 0);
        currency = resource.amount?.currency_code || 'USD';
        status = 'failed';
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        // For completed orders, we need to look at the purchase units
        const purchaseUnits = resource.purchase_units || [];
        if (purchaseUnits.length > 0) {
          const payments = purchaseUnits[0].payments || {};
          const captures = payments.captures || [];
          if (captures.length > 0) {
            amount = parseFloat(captures[0].amount?.value || 0);
            currency = captures[0].amount?.currency_code || 'USD';
          }
        }
        receivedAt = resource.create_time || receivedAt;
        status = 'received';
        break;

      case 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED':
        amount = parseFloat(resource.amount?.value || resource.amount_with_breakdown?.gross_amount?.value || 0);
        currency = resource.amount?.currency_code || resource.amount_with_breakdown?.gross_amount?.currency_code || 'USD';
        receivedAt = resource.create_time || receivedAt;
        status = 'received';
        break;

      default:
        console.log('Unhandled PayPal event type:', payload.event_type);
        res.status(200).json({ message: 'Event type not handled' });
        return;
    }

    if (amount <= 0) {
      console.log('No amount found in event:', payload.event_type);
      res.status(200).json({ message: 'No amount found' });
      return;
    }

    console.log('Inserting PayPal event:', { 
      user_id: connection.user_id, 
      amount, 
      currency,
      event_type: payload.event_type 
    });

    // Insert income event
    const { error: insertError } = await supabase
      .from('income_progress_events')
      .insert({
        user_id: connection.user_id,
        connection_id: connection_id,
        provider: 'paypal',
        external_event_id: payload.id,
        amount: amount,
        currency: currency,
        status: status,
        received_at: receivedAt
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      res.status(500).json({ error: 'Insert error: ' + insertError.message });
      return;
    }

    console.log('Saved PayPal event:', payload.id, amount, currency);

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
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
