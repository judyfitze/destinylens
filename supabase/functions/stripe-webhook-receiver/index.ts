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
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Parse the event
    const event = JSON.parse(payload)
    
    console.log('Received Stripe event:', event.type)

    // Only process successful payments
    if (event.type !== 'charge.succeeded' && event.type !== 'payment_intent.succeeded') {
      return new Response('Event type not processed', { status: 200 })
    }

    const charge = event.data.object
    const amount = charge.amount / 100 // Convert from cents
    const currency = charge.currency.toUpperCase()
    
    // Get connection ID from URL query parameter
    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connection_id')
    
    if (!connectionId) {
      console.error('Missing connection_id in webhook URL')
      return new Response('Missing connection ID', { status: 400 })
    }

    // Find the connection
    const { data: connection, error: connError } = await supabaseClient
      .from('income_connections')
      .select('*')
      .eq('connection_id', connectionId)
      .eq('provider', 'stripe')
      .single()

    if (connError || !connection) {
      console.error('Connection not found:', connectionId)
      return new Response('Connection not found', { status: 404 })
    }

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
        received_at: new Date(charge.created * 1000).toISOString()
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response('Database error', { status: 500 })
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
