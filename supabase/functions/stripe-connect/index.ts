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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { connection_id, user_id } = await req.json()

    if (!connection_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing connection_id or user_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get Stripe credentials from vault
    const { data: secretData } = await supabaseClient
      .from('vault.decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', 'stripe_client_secret')
      .single()

    const stripeSecret = secretData?.decrypted_secret || Deno.env.get('STRIPE_CLIENT_SECRET')
    
    if (!stripeSecret) {
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Generate OAuth state parameter
    const state = crypto.randomUUID()
    
    // Store state in connection for verification
    await supabaseClient
      .from('income_connections')
      .update({ 
        external_account_id: state,
        updated_at: new Date().toISOString()
      })
      .eq('connection_id', connection_id)
      .eq('user_id', user_id)

    // Build Stripe OAuth URL
    const redirectUri = `${Deno.env.get('SUPABASE_FUNCTIONS_URL')}/stripe-callback`
    const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeSecret.split('_')[0]}&state=${state}&scope=read_only&redirect_uri=${encodeURIComponent(redirectUri)}`

    return new Response(
      JSON.stringify({ url: stripeOAuthUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
