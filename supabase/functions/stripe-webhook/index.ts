import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get webhook secret from env
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      console.error('Missing webhook secret')
      return new Response('Configuration error', { status: 500 })
    }

    // Verify webhook signature
    const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts')
    const encoder = new TextEncoder()
    
    const parts = signature.split(',')
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
    const signatureHash = parts.find(p => p.startsWith('v1='))?.split('=')[1]
    
    if (!timestamp || !signatureHash) {
      return new Response('Invalid signature format', { status: 400 })
    }

    const signedPayload = `${timestamp}.${payload}`
    const key = await crypto.crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const mac = await crypto.crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const computedHash = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedHash !== signatureHash) {
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(payload)

    // Only process successful payments
    if (event.type !== 'charge.succeeded' && event.type !== 'payment_intent.succeeded') {
      return new Response('Event type not processed', { status: 200 })
    }

    const charge = event.data.object
    const amount = charge.amount / 100 // Convert from cents
    const currency = charge.currency.toUpperCase()
    const stripeAccountId = event.account || charge.on_behalf_of
    
    if (!stripeAccountId) {
      return new Response('Missing account ID', { status: 400 })
    }

    // Find the connection
    const { data: connection } = await supabaseClient
      .from('income_connections')
      .select('*')
      .eq('external_account_id', stripeAccountId)
      .eq('provider', 'stripe')
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log('No active connection found for account:', stripeAccountId)
      return new Response('Connection not found', { status: 200 })
    }

    // Check for duplicate
    const { data: existing } = await supabaseClient
      .from('income_progress_events')
      .select('income_event_id')
      .eq('provider', 'stripe')
      .eq('connection_id', connection.connection_id)
      .eq('external_event_id', event.id)
      .maybeSingle()

    if (existing) {
      return new Response('Event already processed', { status: 200 })
    }

    // Insert income event
    const { error: insertError } = await supabaseClient
      .from('income_progress_events')
      .insert({
        user_id: connection.user_id,
        connection_id: connection.connection_id,
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

    // Update last_synced_at
    await supabaseClient
      .from('income_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('connection_id', connection.connection_id)

    return new Response('Success', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal error', { status: 500 })
  }
})
