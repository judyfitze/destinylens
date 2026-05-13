// Entitlement System - Checks user access to features
// Integrates with Stripe for subscription validation

const ENTITLEMENTS = {
    DREAM_LIFE_DASHBOARD: 'dream_life_dashboard',
    DREAM_LIFE_CALCULATOR: 'dream_life_calculator',
    ABUNDANCE_PLAYGROUND_PREMIUM: 'abundance_playground_premium',
    FUTURE_SELF_ORACLE: 'future_self_oracle_member'
};

// Check if user has specific entitlement
async function checkEntitlement(userId, entitlement) {
    if (!supabaseClient) {
        console.warn('Supabase not configured, allowing access');
        return { hasAccess: true, source: 'fallback' };
    }
    
    // Get current user to check for admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Hardcoded admin access for Judy
    if (user && user.email === 'judyfitze@gmail.com') {
        return {
            hasAccess: true,
            source: 'admin',
            plan: 'lifetime',
            expiresAt: null
        };
    }
    
    // First check if user has active subscription in database
    const { data: subscription, error } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
    
    if (error) {
        console.log('No active subscription found:', error);
    }
    
    if (subscription) {
        // Check if subscription includes this entitlement
        const entitlements = subscription.entitlements || [];
        const hasEntitlement = entitlements.includes(entitlement) || 
                               entitlements.includes('all') ||
                               subscription.plan_type === 'premium';
        
        if (hasEntitlement) {
            return {
                hasAccess: true,
                source: 'subscription',
                plan: subscription.plan_type,
                expiresAt: subscription.current_period_end
            };
        }
    }
    
    // Check for one-time product purchases
    const { data: purchase, error: purchaseError } = await supabaseClient
        .from('user_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', entitlement)
        .eq('status', 'completed')
        .single();
    
    if (purchase && !purchaseError) {
        return {
            hasAccess: true,
            source: 'purchase',
            purchasedAt: purchase.created_at
        };
    }
    
    // Check for lifetime access
    const { data: lifetime, error: lifetimeError } = await supabaseClient
        .from('user_lifetime_access')
        .select('*')
        .eq('user_id', userId)
        .eq('entitlement', entitlement)
        .single();
    
    if (lifetime && !lifetimeError) {
        return {
            hasAccess: true,
            source: 'lifetime',
            grantedAt: lifetime.created_at
        };
    }
    
    // No access found
    return {
        hasAccess: false,
        source: null
    };
}

// Require entitlement or redirect to locked page
async function requireEntitlement(entitlement) {
    const { user } = await getCurrentUser();
    
    if (!user) {
        // Not logged in - redirect to login
        const currentPath = window.location.pathname;
        window.location.href = `/auth.html?returnTo=${encodeURIComponent(currentPath)}`;
        return null;
    }
    
    const check = await checkEntitlement(user.id, entitlement);
    
    if (!check.hasAccess) {
        // Redirect to locked page
        window.location.href = `/locked.html?feature=${encodeURIComponent(entitlement)}`;
        return null;
    }
    
    return { user, entitlement: check };
}

// Get all entitlements for current user
async function getUserEntitlements() {
    const { user } = await getCurrentUser();
    if (!user) return [];
    
    const entitlements = [];
    
    // Check all known entitlements
    for (const [key, value] of Object.entries(ENTITLEMENTS)) {
        const check = await checkEntitlement(user.id, value);
        if (check.hasAccess) {
            entitlements.push({
                key: key,
                id: value,
                ...check
            });
        }
    }
    
    return entitlements;
}

// Check if user has any premium access
async function hasPremiumAccess() {
    const entitlements = await getUserEntitlements();
    return entitlements.length > 0;
}

// Create checkout session (Stripe integration)
async function createCheckoutSession(priceId, successUrl, cancelUrl) {
    if (!supabaseClient) {
        return { error: { message: 'Supabase not configured' } };
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    // Call Supabase Edge Function to create Stripe checkout
    const { data, error } = await supabaseClient.functions.invoke('create-checkout', {
        body: {
            priceId,
            successUrl: successUrl || window.location.origin + '/members.html',
            cancelUrl: cancelUrl || window.location.origin + '/locked.html',
            customerEmail: user.email,
            metadata: {
                userId: user.id
            }
        }
    });
    
    if (error) {
        console.error('Checkout error:', error);
        return { error };
    }
    
    // Redirect to Stripe Checkout
    if (data?.url) {
        window.location.href = data.url;
    }
    
    return { data };
}

// Create customer portal session
async function createPortalSession() {
    if (!supabaseClient) {
        return { error: { message: 'Supabase not configured' } };
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        return { error: { message: 'Not authenticated' } };
    }
    
    const { data, error } = await supabaseClient.functions.invoke('create-portal', {
        body: {
            returnUrl: window.location.origin + '/members.html'
        }
    });
    
    if (error) {
        console.error('Portal error:', error);
        return { error };
    }
    
    if (data?.url) {
        window.location.href = data.url;
    }
    
    return { data };
}

// Export for use
window.ENTITLEMENTS = ENTITLEMENTS;
window.checkEntitlement = checkEntitlement;
window.requireEntitlement = requireEntitlement;
window.getUserEntitlements = getUserEntitlements;
window.hasPremiumAccess = hasPremiumAccess;
window.createCheckoutSession = createCheckoutSession;
window.createPortalSession = createPortalSession;
