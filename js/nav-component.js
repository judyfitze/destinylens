// Shared Navigation Component for DestinyLens
// Single dropdown menu on all pages with icons

function initNavigation() {
    // Initialize Supabase
    if (typeof initSupabase === 'function') {
        initSupabase();
    }
    
    // Check auth state
    checkAuthState();
}

async function checkAuthState() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Supabase not initialized yet');
            return;
        }
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // User is logged in - show dropdown
            const loginLink = document.getElementById('loginLink');
            const userDropdown = document.getElementById('userDropdown');
            
            if (loginLink) loginLink.style.display = 'none';
            if (userDropdown) userDropdown.style.display = 'block';
            
            // Check if admin
            const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            const adminLink = document.getElementById('adminLink');
            if (adminLink && profile?.role === 'admin') {
                adminLink.style.display = 'block';
            }
        } else {
            // User is not logged in - show login
            const loginLink = document.getElementById('loginLink');
            const userDropdown = document.getElementById('userDropdown');
            
            if (loginLink) loginLink.style.display = 'block';
            if (userDropdown) userDropdown.style.display = 'none';
        }
    } catch (err) {
        console.error('Auth check error:', err);
    }
}

function toggleDropdown() {
    const menu = document.getElementById('dropdownMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

async function logout() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    window.location.href = '/';
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        const menu = document.getElementById('dropdownMenu');
        if (menu) menu.style.display = 'none';
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

// Retry after a short delay if Supabase wasn't ready
setTimeout(checkAuthState, 1000);
