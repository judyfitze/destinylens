// Auth Guard - Protects private routes
// Redirects to login if not authenticated

async function checkAuth() {
    // Initialize Supabase
    initSupabase();
    
    // Get current user
    const { user } = await getCurrentUser();
    
    if (!user) {
        // Not logged in - redirect to login
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/auth.html?returnTo=${returnUrl}`;
        return null;
    }
    
    return user;
}

async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
}

// Check entitlement using the entitlements system
async function checkEntitlementAccess(userId, feature) {
    // Load entitlements script if not already loaded
    if (typeof checkEntitlement === 'undefined') {
        await loadScript('js/entitlements.js');
    }
    
    return await checkEntitlement(userId, feature);
}

async function requireEntitlementAccess(feature) {
    const user = await requireAuth();
    const { hasAccess } = await checkEntitlementAccess(user.id, feature);
    
    if (!hasAccess) {
        // Redirect to locked page
        window.location.href = '/locked.html?feature=' + encodeURIComponent(feature);
        return null;
    }
    
    return user;
}

// Helper to load script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Logout function
async function logout() {
    await signOut();
    window.location.href = '/';
}

// Logout button removed - now in hamburger menu

// Run on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase first
    initSupabase();
    
    // Check if this is a protected page
    const protectedPaths = [
        { path: '/dashboard.html', entitlement: 'dream_life_dashboard' },
        { path: '/members.html', entitlement: null }, // Members area is always accessible if logged in
        { path: '/calculator.html', entitlement: 'dream_life_calculator' },
        { path: '/income-connections.html', entitlement: null },
        { path: '/settings.html', entitlement: null }
    ];
    
    const currentPath = window.location.pathname;
    const protectedRoute = protectedPaths.find(p => p.path === currentPath);
    
    if (protectedRoute) {
        if (protectedRoute.entitlement) {
            // Require specific entitlement
            await requireEntitlementAccess(protectedRoute.entitlement);
        } else {
            // Just require auth
            await requireAuth();
        }
    }
    

});
