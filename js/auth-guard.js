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

// Check entitlement (placeholder for Stripe integration)
async function checkEntitlement(userId, feature) {
    // TODO: Connect to Stripe/subscription system
    // For now, allow all authenticated users
    return { hasAccess: true };
}

async function requireEntitlement(feature) {
    const user = await requireAuth();
    const { hasAccess } = await checkEntitlement(user.id, feature);
    
    if (!hasAccess) {
        // Redirect to locked page
        window.location.href = '/locked.html?feature=' + encodeURIComponent(feature);
        return null;
    }
    
    return user;
}

// Logout function
async function logout() {
    await signOut();
    window.location.href = '/';
}

// Add logout button to nav if user is logged in
async function addLogoutButton() {
    const { user } = await getCurrentUser();
    if (user) {
        const nav = document.querySelector('nav');
        if (nav) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'nav-btn';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = logout;
            nav.appendChild(logoutBtn);
        }
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a protected page
    const protectedPaths = [
        '/dashboard.html',
        '/members.html',
        '/calculator.html'
    ];
    
    const currentPath = window.location.pathname;
    
    if (protectedPaths.includes(currentPath)) {
        requireAuth();
    }
    
    // Add logout button to all pages
    addLogoutButton();
});
