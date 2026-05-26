// DestinyLens Referral Tracker
// Captures ?ref=CODE, validates it, stores 30-day cookie, records visit
// First-referrer-wins policy

(function() {
    'use strict';

    const COOKIE_NAME = 'dl_ref';
    const STORAGE_KEY = 'dl_ref';
    const TIMESTAMP_KEY = 'dl_ref_timestamp';
    const VISITOR_ID_KEY = 'dl_visitor_id';
    const COOKIE_DAYS = 30;

    // =============================================================================
    // 1. UTILITY FUNCTIONS
    // =============================================================================

    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
    }

    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r;
        }, '');
    }

    function getVisitorId() {
        let id = localStorage.getItem(VISITOR_ID_KEY);
        if (!id) {
            id = 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem(VISITOR_ID_KEY, id);
        }
        return id;
    }

    function isReferralExpired() {
        const timestamp = localStorage.getItem(TIMESTAMP_KEY);
        if (!timestamp) return true;
        const expiresAt = parseInt(timestamp, 10) + (COOKIE_DAYS * 24 * 60 * 60 * 1000);
        return Date.now() > expiresAt;
    }

    function getStoredReferral() {
        // Check cookie first, then localStorage
        const cookieVal = getCookie(COOKIE_NAME);
        const storageVal = localStorage.getItem(STORAGE_KEY);
        return cookieVal || storageVal || null;
    }

    // =============================================================================
    // 2. VALIDATE AFFILIATE CODE VIA SUPABASE
    // =============================================================================

    async function validateAffiliateCode(code) {
        try {
            // Use the Supabase client if available
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { data, error } = await supabaseClient
                    .from('affiliate_profiles')
                    .select('affiliate_code, is_affiliate_active')
                    .eq('affiliate_code', code)
                    .eq('is_affiliate_active', true)
                    .maybeSingle();

                if (error) {
                    console.error('Referral validation error:', error);
                    return false;
                }

                return !!data;
            }

            // Fallback: if supabaseClient not loaded yet, skip validation
            // (will be validated server-side on signup anyway)
            console.warn('Supabase client not available for referral validation');
            return true;
        } catch (err) {
            console.error('Referral validation exception:', err);
            return false;
        }
    }

    // =============================================================================
    // 3. RECORD REFERRAL VISIT
    // =============================================================================

    async function recordVisit(code) {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { error } = await supabaseClient
                    .rpc('record_referral_visit', {
                        p_affiliate_code: code,
                        p_ip_hash: null,           // No raw IPs — server handles if needed
                        p_user_agent: navigator.userAgent,
                        p_landing_page: window.location.href
                    });

                if (error) {
                    console.error('Record visit error:', error);
                } else {
                    console.log('Referral visit recorded for:', code);
                }
            }
        } catch (err) {
            console.error('Record visit exception:', err);
        }
    }

    // =============================================================================
    // 4. MAIN REFERRAL CAPTURE LOGIC
    // =============================================================================

    async function captureReferral() {
        const urlCode = getUrlParam('ref');
        const storedCode = getStoredReferral();

        // Case 1: No ?ref= in URL
        if (!urlCode) {
            // Keep existing referral if valid
            if (storedCode && !isReferralExpired()) {
                console.log('Existing referral still valid:', storedCode);
                return;
            }
            // Expired — clear it
            if (storedCode) {
                clearReferral();
            }
            return;
        }

        // Case 2: ?ref= in URL
        // First-referrer-wins: don't overwrite existing valid referral
        if (storedCode && !isReferralExpired() && storedCode !== urlCode) {
            console.log('First-referrer-wins: keeping existing', storedCode, 'ignoring new', urlCode);
            return;
        }

        // Same code re-clicked — refresh the timer
        if (storedCode === urlCode && !isReferralExpired()) {
            console.log('Referral refreshed:', urlCode);
            storeReferral(urlCode);
            await recordVisit(urlCode);
            return;
        }

        // Validate the new code
        const isValid = await validateAffiliateCode(urlCode);
        if (!isValid) {
            console.warn('Invalid or inactive affiliate code:', urlCode);
            return;
        }

        // Store the valid referral
        console.log('New valid referral captured:', urlCode);
        storeReferral(urlCode);
        await recordVisit(urlCode);
    }

    function storeReferral(code) {
        const now = Date.now();
        setCookie(COOKIE_NAME, code, COOKIE_DAYS);
        localStorage.setItem(STORAGE_KEY, code);
        localStorage.setItem(TIMESTAMP_KEY, now.toString());
        getVisitorId(); // Ensure visitor ID exists
    }

    function clearReferral() {
        setCookie(COOKIE_NAME, '', -1);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
    }

    // =============================================================================
    // 5. PUBLIC API
    // =============================================================================

    window.DLReferral = {
        getCode: getStoredReferral,
        getVisitorId: getVisitorId,
        isExpired: isReferralExpired,
        clear: clearReferral,
        capture: captureReferral
    };

    // =============================================================================
    // 6. AUTO-INIT ON PAGE LOAD
    // =============================================================================

    // Wait for Supabase to be ready, then capture
    function init() {
        // If supabaseClient is already loaded, capture now
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            captureReferral();
            return;
        }

        // Otherwise wait for it
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        const interval = setInterval(() => {
            attempts++;
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                clearInterval(interval);
                captureReferral();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('Supabase not loaded after 5s, referral capture skipped');
            }
        }, 100);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
