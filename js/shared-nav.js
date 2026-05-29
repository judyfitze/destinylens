// Shared Navigation Component
// Include this script on all pages for consistent navigation

// Initialize Supabase first
if (typeof initSupabase === 'function') {
    initSupabase();
}

// Mobile menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const hamburger = document.getElementById('hamburgerMenu');
    if (menu && hamburger) {
        menu.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
}

// Dropdown toggle
function toggleDropdown() {
    const menu = document.getElementById('dropdownMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Logout
async function logout() {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    window.location.href = '/';
}

// Check auth state and update UI
async function checkAuthState() {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.log('Supabase not initialized yet');
            return;
        }
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            // User is logged in - show dropdown, hide login
            const loginLink = document.getElementById('loginLink');
            const userDropdown = document.getElementById('userDropdown');
            const loginLinkMobile = document.getElementById('loginLinkMobile');
            
            if (loginLink) loginLink.style.display = 'none';
            if (userDropdown) userDropdown.style.display = 'block';
            if (loginLinkMobile) loginLinkMobile.style.display = 'none';
            
            // Check if admin
            const { data: profile } = await supabaseClient
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            
            const adminLink = document.getElementById('adminLink');
            const adminLinkMobile = document.getElementById('adminLinkMobile');
            
            if (profile?.role === 'admin') {
                if (adminLink) adminLink.style.display = 'block';
                if (adminLinkMobile) adminLinkMobile.style.display = 'block';
            }
        } else {
            // User is not logged in - show login, hide dropdown
            const loginLink = document.getElementById('loginLink');
            const userDropdown = document.getElementById('userDropdown');
            const loginLinkMobile = document.getElementById('loginLinkMobile');
            
            if (loginLink) loginLink.style.display = 'block';
            if (userDropdown) userDropdown.style.display = 'none';
            if (loginLinkMobile) loginLinkMobile.style.display = 'block';
        }
    } catch (err) {
        console.error('Auth check error:', err);
    }
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
    document.addEventListener('DOMContentLoaded', checkAuthState);
} else {
    checkAuthState();
}

// Retry after a short delay if Supabase wasn't ready
setTimeout(checkAuthState, 1000);
