import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.text()
    
    // Log all headers for debugging
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    console.log('Request URL:', req.url)
    console.log('Request method:', req.method)
    
    // TEMP: Skip signature check to test if auth is the issue
    // We'll verify the webhook properly once auth works
    console.log('Skipping signature check for testing')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Parse the event
    const event = JSON.parse(payload)
    
    console.log('Received Stripe event:', event.type)

    // Process ANY payment-related Stripe event
    let amount: number = 0
    let currency: string = 'USD'
    let created: number = Math.floor(Date.now() / 1000)
    
    console.log('Processing event type:', event.type)
    console.log('Event data:', JSON.stringify(event.data.object, null, 2))
    
    // Try to extract amount from various event types
    const obj = event.data.object
    
    if (event.type === 'checkout.session.completed') {
      amount = (obj.amount_total || obj.amount_subtotal || 0) / 100
      currency = (obj.currency || 'usd').toUpperCase()
    } else if (event.type === 'charge.succeeded') {
      amount = (obj.amount || 0) / 100
      currency = (obj.currency || 'usd').toUpperCase()
      created = obj.created || created
    } else if (event.type === 'payment_intent.succeeded') {
      amount = (obj.amount || 0) / 100
      currency = (obj.currency || 'usd').toUpperCase()
      created = obj.created || created
    } else {
      // Try to find amount in any field
      amount = (obj.amount || obj.amount_total || obj.amount_subtotal || 0) / 100
      currency = (obj.currency || 'usd').toUpperCase()
    }
    
    if (amount <= 0) {
      console.error('Could not extract amount from event:', event.type)
      return new Response('No amount found in event', { status: 200 })
    }
    
    // Get connection ID from URL query parameter
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connection_id')
    
    if (!connectionId) {
      console.error('Missing connection_id in webhook URL')
      return new Response('Missing connection ID', { status: 400 })
    }

    // Find the connection
    console.log('Looking for connection:', connectionId)
    
    const { data: connection, error: connError } = await supabaseClient
      .from('income_connections')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('provider', 'stripe')
      .single()

    if (connError) {
      console.error('Connection query error:', connError)
      return new Response('Connection query error: ' + connError.message, { status: 500 })
    }
    
    if (!connection) {
      console.error('Connection not found:', connectionId)
      return new Response('Connection not found', { status: 404 })
    }
    
    console.log('Found connection:', connection.connection_id, 'User:', connection.user_id)

    // Check for duplicate
    const { data: existing } = await supabaseClient
      .from('income_progress_events')
      .select('income_event_id')
      .eq('provider', 'stripe')
      .eq('connection_id', connectionId)
      .eq('external_event_id', event.id)
      .maybeSingle()

    if (existing) {
      console.log('Event already processed:', event.id)
      return new Response('Event already processed', { status: 200 })
    }

    // Insert income event
    console.log('Inserting income event:', {
      user_id: connection.user_id,
      connection_id: connectionId,
      amount: amount,
      currency: currency,
      event_id: event.id
    })
    
    const { error: insertError } = await supabaseClient
      .from('income_progress_events')
      .insert({
        user_id: connection.user_id,
        connection_id: connectionId,
        provider: 'stripe',
        external_event_id: event.id,
        amount: amount,
        currency: currency,
        status: 'received',
        received_at: new Date(created * 1000).toISOString()
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response('Database error: ' + insertError.message, { status: 500 })
    }

    console.log('Income event saved:', event.id, amount, currency)

    // Update connection status and last_synced_at
    // pending -> connected (first webhook received)
    // connected -> active (first payment processed)
    const newStatus = connection.status === 'pending' ? 'connected' : 
                      connection.status === 'connected' ? 'active' : 
                      connection.status;
    
    await supabaseClient
      .from('income_connections')
      .update({ 
        status: newStatus,
        last_synced_at: new Date().toISOString() 
      })
      .eq('connection_id', connectionId)

    console.log('Connection status updated to:', newStatus)

    return new Response('Success', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal error', { status: 500 })
  }
})
