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
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(
        `<html><body><h1>Connection Failed</h1><p>${error}</p><script>window.close()</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    if (!code || !state) {
      return new Response(
        `<html><body><h1>Invalid Request</h1><script>window.close()</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Find connection by state
    const { data: connection } = await supabaseClient
      .from('income_connections')
      .select('*')
      .eq('external_account_id', state)
      .eq('provider', 'stripe')
      .single()

    if (!connection) {
      return new Response(
        `<html><body><h1>Connection Not Found</h1><script>window.close()</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for access token
    const stripeResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_secret: Deno.env.get('STRIPE_SECRET_KEY') || '',
      }),
    })

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok) {
      await supabaseClient
        .from('income_connections')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('connection_id', connection.connection_id)

      return new Response(
        `<html><body><h1>Stripe Error</h1><p>${stripeData.error_description}</p><script>window.close()</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Store access token in vault
    const { error: vaultError } = await supabaseClient.rpc('vault_insert_secret', {
      secret_name: `stripe_token_${connection.connection_id}`,
      secret_value: stripeData.access_token,
      description: `Stripe access token for connection ${connection.connection_id}`
    })

    if (vaultError) {
      console.error('Vault error:', vaultError)
    }

    // Update connection as active
    await supabaseClient
      .from('income_connections')
      .update({
        status: 'active',
        external_account_id: stripeData.stripe_user_id,
        vault_secret_reference: `stripe_token_${connection.connection_id}`,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection.connection_id)

    // Register webhook for this account
    await registerStripeWebhook(supabaseClient, stripeData.access_token, connection.connection_id)

    return new Response(
      `<html><body><h1>Success!</h1><p>Your Stripe account is now connected.</p><script>window.opener.postMessage('stripe-connected', '*'); window.close()</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    return new Response(
      `<html><body><h1>Error</h1><p>${error.message}</p><script>window.close()</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
})

async function registerStripeWebhook(supabaseClient: any, accessToken: string, connectionId: string) {
  try {
    const webhookUrl = `${Deno.env.get('SUPABASE_FUNCTIONS_URL')}/stripe-webhook`
    
    const response = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        url: webhookUrl,
        'enabled_events[]': 'charge.succeeded',
        'enabled_events[]': 'payment_intent.succeeded',
        'metadata[connection_id]': connectionId,
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      await supabaseClient
        .from('income_connections')
        .update({ webhook_reference: data.id })
        .eq('connection_id', connectionId)
    }
  } catch (error) {
    console.error('Webhook registration error:', error)
  }
}
