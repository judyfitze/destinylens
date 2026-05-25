import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 })
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get dashboard settings by slug
    const { data: settings, error: settingsError } = await supabase
      .from('dashboard_settings')
      .select('user_id, show_goal_cards_publicly')
      .eq('public_share_slug', slug)
      .eq('public_share_enabled', true)
      .single()
    
    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }
    
    if (settings.show_goal_cards_publicly === false) {
      return new Response(JSON.stringify({ goals: [] }))
    }
    
    // Get goals for this user
    const { data: goals, error: goalsError } = await supabase
      .from('goal_cards')
      .select('*')
      .eq('user_id', settings.user_id)
      .order('sort_order', { ascending: true })
    
    if (goalsError) {
      return new Response(JSON.stringify({ error: goalsError.message }), { status: 500 })
    }
    
    return new Response(JSON.stringify({ goals: goals || [] }))
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
