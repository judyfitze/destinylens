// DestinyLens Supabase Client
// Replace with your actual Supabase credentials

const SUPABASE_URL = 'https://nfyabrvkqgzuzxjetqbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWFicnZrcWd6dXp4amV0cWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAxMzYsImV4cCI6MjA5NDE5NjEzNn0.BmpDxYXwPNR1RftmjtKIqpE5h3Ljkn5gaGmHkFDfTm0';

let supabaseClient = null;

// Initialize Supabase client
function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase not configured.');
        return null;
    }
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    
    return supabaseClient;
}

// Auth functions
async function signUp(email, password) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });
    
    return { data, error };
}

async function signIn(email, password) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    
    return { data, error };
}

async function signOut() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { error } = await supabaseClient.auth.signOut();
    return { error };
}

async function getCurrentUser() {
    if (!supabaseClient) return { data: { user: null } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    return { user };
}

// Calculation functions
async function saveCalculation(calculationData) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('dream_life_calculations')
        .upsert({
            user_id: user.id,
            ...calculationData,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
}

async function getCalculations() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('dream_life_calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    return { data, error };
}

async function getActiveCalculation() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('dream_life_calculations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
    
    return { data, error };
}

// Dashboard settings functions
async function getDashboardSettings() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('dashboard_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    return { data, error };
}

async function updateDashboardSettings(settings) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('dashboard_settings')
        .upsert({
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
}

// Goal cards functions
async function getGoalCards() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('goal_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
    
    return { data, error };
}

async function saveGoalCard(cardData) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('goal_cards')
        .upsert({
            user_id: user.id,
            ...cardData,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();
    
    return { data, error };
}

// Income functions
async function getIncomeSources() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
    
    return { data, error };
}

async function addManualIncome(entry) {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    const { data, error } = await supabaseClient
        .from('manual_income_entries')
        .insert({
            user_id: user.id,
            ...entry
        })
        .select()
        .single();
    
    return { data, error };
}

async function getTodayIncome() {
    if (!supabaseClient) return { error: { message: 'Supabase not configured' } };
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };
    
    // Get manual entries for today
    const { data: manualEntries, error: manualError } = await supabaseClient
        .from('manual_income_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .eq('include_in_dashboard', true);
    
    if (manualError) return { error: manualError };
    
    // Get income snapshots for today
    const { data: snapshots, error: snapshotError } = await supabaseClient
        .from('income_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);
    
    if (snapshotError) return { error: snapshotError };
    
    const manualTotal = manualEntries?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    const snapshotTotal = snapshots?.reduce((sum, s) => sum + parseFloat(s.net_income || s.gross_income), 0) || 0;
    
    return {
        data: {
            total: manualTotal + snapshotTotal,
            manual: manualTotal,
            connected: snapshotTotal,
            manualEntries,
            snapshots
        },
        error: null
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
