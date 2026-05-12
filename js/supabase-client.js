// DestinyLens Supabase Client
// Replace with your actual Supabase credentials

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

// Initialize Supabase client
function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase not configured. Using localStorage fallback.');
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
    if (!supabaseClient) {
        // Fallback to localStorage
        localStorage.setItem('destinylens_calculation', JSON.stringify(calculationData));
        return { data: calculationData, error: null };
    }
    
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
    if (!supabaseClient) {
        const local = localStorage.getItem('destinylens_calculation');
        return { data: local ? [JSON.parse(local)] : [], error: null };
    }
    
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
    if (!supabaseClient) {
        const local = localStorage.getItem('destinylens_calculation');
        return { data: local ? JSON.parse(local) : null, error: null };
    }
    
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
    if (!supabaseClient) return { data: null, error: null };
    
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
    if (!supabaseClient) return { data: settings, error: null };
    
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
    if (!supabaseClient) return { data: [], error: null };
    
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
    if (!supabaseClient) return { data: cardData, error: null };
    
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
    if (!supabaseClient) return { data: [], error: null };
    
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
    if (!supabaseClient) {
        // Store in localStorage for now
        const entries = JSON.parse(localStorage.getItem('destinylens_manual_income') || '[]');
        entries.push({ ...entry, id: Date.now(), created_at: new Date().toISOString() });
        localStorage.setItem('destinylens_manual_income', JSON.stringify(entries));
        return { data: entry, error: null };
    }
    
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
    const today = new Date().toISOString().split('T')[0];
    
    if (!supabaseClient) {
        const entries = JSON.parse(localStorage.getItem('destinylens_manual_income') || '[]');
        const todayEntries = entries.filter(e => e.entry_date === today);
        const total = todayEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        return { data: { total, entries: todayEntries }, error: null };
    }
    
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