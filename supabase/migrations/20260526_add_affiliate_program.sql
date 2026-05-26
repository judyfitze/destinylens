-- DestinyLens Affiliate Program — Checkpoint 1 Migration
-- Date: 2026-05-26
-- Purpose: Create affiliate tables, columns, indexes, RLS policies, and helper functions
-- Commission: 30%, Pending: 30 days, Min Payout: $50 CAD, Manual payouts for MVP

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. HELPER FUNCTION: Generate unique affiliate code
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-char alphanumeric code (lowercase, no ambiguous chars)
        code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        -- Replace ambiguous chars
        code := replace(replace(replace(replace(code, '0', 'x'), 'o', 'y'), 'l', 'z'), 'i', 'w');

        SELECT EXISTS(SELECT 1 FROM affiliate_profiles WHERE affiliate_code = code)
        INTO exists_check;

        EXIT WHEN NOT exists_check;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. TABLE: affiliate_profiles
-- Source of truth for affiliate codes and earnings
-- =============================================================================

CREATE TABLE IF NOT EXISTS affiliate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Affiliate identity
    affiliate_code TEXT NOT NULL UNIQUE DEFAULT generate_affiliate_code(),
    referral_link TEXT,

    -- Earnings tracking
    total_referrals INTEGER NOT NULL DEFAULT 0,
    total_commissions_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_commissions_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    pending_commissions DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Payout settings (manual for MVP)
    payout_method TEXT CHECK (payout_method IN ('paypal', 'stripe', 'bank_transfer', 'other')),
    payout_details JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_affiliate_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT affiliate_profiles_user_id_unique UNIQUE (user_id)
);

-- =============================================================================
-- 4. TABLE: referral_visits
-- Tracks ?ref=CODE visits with 30-day cookie window
-- No raw IPs stored — uses ip_hash only
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_code TEXT NOT NULL REFERENCES affiliate_profiles(affiliate_code) ON DELETE CASCADE,

    -- Visitor info (privacy-safe)
    ip_hash TEXT,                              -- SHA-256 hash of IP, not raw IP
    visitor_user_agent TEXT,
    landing_page TEXT,

    -- Conversion tracking
    converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    converted_at TIMESTAMP WITH TIME ZONE,

    -- Cookie window
    cookie_set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cookie_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. TABLE: affiliate_commissions
-- Tracks pending and paid commissions from Stripe webhook events
-- =============================================================================

CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Order reference
    order_id TEXT NOT NULL,                    -- Stripe session ID or payment intent ID
    stripe_customer_email TEXT,

    -- Financials
    amount DECIMAL(12,2) NOT NULL,             -- Full sale amount
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.30,  -- 30% for MVP
    commission_amount DECIMAL(12,2) NOT NULL,  -- amount * commission_rate
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Status lifecycle: pending → approved → paid | cancelled | refunded
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'paid', 'cancelled', 'refunded')),

    -- Pending period: 30 days from purchase
    pending_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

    -- Payout tracking
    paid_at TIMESTAMP WITH TIME ZONE,
    payout_reference TEXT,                     -- PayPal txn ID, bank ref, etc.
    payout_notes TEXT,

    -- Self-referral guard
    is_self_referral BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 6. ADD COLUMNS TO EXISTING TABLES
-- =============================================================================

-- user_profiles: track who referred this user
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS referred_by_code TEXT REFERENCES affiliate_profiles(affiliate_code) ON DELETE SET NULL;

-- dashboard_settings: denormalized affiliate code for share page performance
ALTER TABLE dashboard_settings
    ADD COLUMN IF NOT EXISTS affiliate_code TEXT;

-- =============================================================================
-- 7. INDEXES
-- =============================================================================

-- affiliate_profiles indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_user_id ON affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code ON affiliate_profiles(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_active ON affiliate_profiles(is_affiliate_active) WHERE is_affiliate_active = true;

-- referral_visits indexes
CREATE INDEX IF NOT EXISTS idx_referral_visits_code ON referral_visits(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_referral_visits_converted ON referral_visits(converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_visits_cookie_expires ON referral_visits(cookie_expires_at);
CREATE INDEX IF NOT EXISTS idx_referral_visits_ip_hash ON referral_visits(ip_hash, affiliate_code);

-- affiliate_commissions indexes
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referred ON affiliate_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order ON affiliate_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_pending_until ON affiliate_commissions(pending_until) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_commissions_created ON affiliate_commissions(created_at);

-- user_profiles index
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by_code);

-- dashboard_settings index
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_affiliate_code ON dashboard_settings(affiliate_code);

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- affiliate_profiles: users read own, admins read all, service role full access
CREATE POLICY "Users can read own affiliate profile"
    ON affiliate_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own affiliate profile"
    ON affiliate_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all affiliate profiles"
    ON affiliate_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all affiliate profiles"
    ON affiliate_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- referral_visits: service role only (no direct user access)
-- No SELECT/INSERT/UPDATE/DELETE policies for users — service role bypasses RLS

-- affiliate_commissions: users read own, admins read all
CREATE POLICY "Users can read own commissions"
    ON affiliate_commissions FOR SELECT
    USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Admins can read all commissions"
    ON affiliate_commissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all commissions"
    ON affiliate_commissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- =============================================================================
-- 9. TRIGGER: Auto-create affiliate profile on user signup
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_with_affiliate()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    referred_by TEXT;
BEGIN
    -- Generate unique affiliate code
    new_code := generate_affiliate_code();

    -- Check if user was referred (from signup metadata)
    referred_by := NEW.raw_user_meta_data->>'referred_by_code';

    -- Create affiliate profile
    INSERT INTO affiliate_profiles (
        user_id,
        affiliate_code,
        referral_link,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        new_code,
        'https://destinylens.io/?ref=' || new_code,
        NOW(),
        NOW()
    );

    -- Update user_profiles with referred_by_code if present
    IF referred_by IS NOT NULL AND referred_by != '' THEN
        UPDATE user_profiles
        SET referred_by_code = referred_by
        WHERE id = NEW.id;
    END IF;

    -- Update dashboard_settings with denormalized affiliate code
    UPDATE dashboard_settings
    SET affiliate_code = new_code
    WHERE user_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_with_affiliate();

-- =============================================================================
-- 10. TRIGGER: Update updated_at timestamps
-- =============================================================================

CREATE TRIGGER update_affiliate_profiles_updated_at
    BEFORE UPDATE ON affiliate_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_commissions_updated_at
    BEFORE UPDATE ON affiliate_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 11. FUNCTION: Get or create affiliate profile (for share page fallback)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_or_create_affiliate_profile(target_user_id UUID)
RETURNS TABLE (
    affiliate_code TEXT,
    referral_link TEXT,
    is_new BOOLEAN
) AS $$
DECLARE
    existing RECORD;
    new_code TEXT;
BEGIN
    -- Try to find existing profile
    SELECT ap.affiliate_code, ap.referral_link
    INTO existing
    FROM affiliate_profiles ap
    WHERE ap.user_id = target_user_id;

    IF FOUND THEN
        RETURN QUERY SELECT existing.affiliate_code, existing.referral_link, false;
        RETURN;
    END IF;

    -- Create new profile
    new_code := generate_affiliate_code();

    INSERT INTO affiliate_profiles (
        user_id,
        affiliate_code,
        referral_link,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        new_code,
        'https://destinylens.io/?ref=' || new_code,
        NOW(),
        NOW()
    );

    -- Update dashboard_settings denormalized field
    UPDATE dashboard_settings
    SET affiliate_code = new_code
    WHERE user_id = target_user_id;

    RETURN QUERY SELECT new_code, 'https://destinylens.io/?ref=' || new_code, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 12. FUNCTION: Record referral visit (called from frontend or edge function)
-- =============================================================================

CREATE OR REPLACE FUNCTION record_referral_visit(
    p_affiliate_code TEXT,
    p_ip_hash TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_landing_page TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    visit_id UUID;
BEGIN
    INSERT INTO referral_visits (
        affiliate_code,
        ip_hash,
        visitor_user_agent,
        landing_page,
        cookie_set_at,
        cookie_expires_at
    ) VALUES (
        p_affiliate_code,
        p_ip_hash,
        p_user_agent,
        p_landing_page,
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO visit_id;

    RETURN visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 13. FUNCTION: Mark referral converted (called when referred user signs up)
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_referral_converted(
    p_affiliate_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE referral_visits
    SET converted_to_user_id = p_user_id,
        converted_at = NOW()
    WHERE affiliate_code = p_affiliate_code
      AND converted_to_user_id IS NULL
      AND cookie_expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count > 0 THEN
        -- Increment referrer's total_referrals
        UPDATE affiliate_profiles
        SET total_referrals = total_referrals + 1,
            updated_at = NOW()
        WHERE affiliate_code = p_affiliate_code;
    END IF;

    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 14. FUNCTION: Create commission from Stripe webhook (service role)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_affiliate_commission(
    p_affiliate_code TEXT,
    p_referred_user_id UUID,
    p_order_id TEXT,
    p_stripe_customer_email TEXT,
    p_amount DECIMAL,
    p_currency TEXT DEFAULT 'USD',
    p_commission_rate DECIMAL DEFAULT 0.30
)
RETURNS UUID AS $$
DECLARE
    affiliate_record RECORD;
    commission_id UUID;
    is_self BOOLEAN;
BEGIN
    -- Look up affiliate
    SELECT user_id INTO affiliate_record
    FROM affiliate_profiles
    WHERE affiliate_code = p_affiliate_code
      AND is_affiliate_active = true;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Self-referral guard
    is_self := (affiliate_record.user_id = p_referred_user_id);

    IF is_self THEN
        -- Log self-referral attempt but don't create commission
        RETURN NULL;
    END IF;

    -- Create commission record
    INSERT INTO affiliate_commissions (
        affiliate_user_id,
        referred_user_id,
        order_id,
        stripe_customer_email,
        amount,
        commission_rate,
        commission_amount,
        currency,
        status,
        pending_until,
        is_self_referral,
        created_at,
        updated_at
    ) VALUES (
        affiliate_record.user_id,
        p_referred_user_id,
        p_order_id,
        p_stripe_customer_email,
        p_amount,
        p_commission_rate,
        ROUND(p_amount * p_commission_rate, 2),
        p_currency,
        'pending',
        NOW() + INTERVAL '30 days',
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO commission_id;

    -- Update affiliate pending commissions
    UPDATE affiliate_profiles
    SET pending_commissions = pending_commissions + ROUND(p_amount * p_commission_rate, 2),
        total_commissions_earned = total_commissions_earned + ROUND(p_amount * p_commission_rate, 2),
        updated_at = NOW()
    WHERE affiliate_code = p_affiliate_code;

    RETURN commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 15. FUNCTION: Approve pending commissions (manual payout workflow)
-- =============================================================================

CREATE OR REPLACE FUNCTION approve_commissions_for_payout(
    p_affiliate_user_id UUID
)
RETURNS TABLE (
    commission_id UUID,
    amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    UPDATE affiliate_commissions
    SET status = 'approved',
        updated_at = NOW()
    WHERE affiliate_user_id = p_affiliate_user_id
      AND status = 'pending'
      AND pending_until <= NOW()
    RETURNING id, commission_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 16. FUNCTION: Mark commissions as paid (manual payout workflow)
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_commissions_paid(
    p_affiliate_user_id UUID,
    p_payout_reference TEXT DEFAULT NULL,
    p_payout_notes TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    total_paid DECIMAL;
BEGIN
    SELECT COALESCE(SUM(commission_amount), 0) INTO total_paid
    FROM affiliate_commissions
    WHERE affiliate_user_id = p_affiliate_user_id
      AND status = 'approved';

    UPDATE affiliate_commissions
    SET status = 'paid',
        paid_at = NOW(),
        payout_reference = p_payout_reference,
        payout_notes = p_payout_notes,
        updated_at = NOW()
    WHERE affiliate_user_id = p_affiliate_user_id
      AND status = 'approved';

    -- Update affiliate profile totals
    UPDATE affiliate_profiles
    SET total_commissions_paid = total_commissions_paid + total_paid,
        pending_commissions = pending_commissions - total_paid,
        updated_at = NOW()
    WHERE user_id = p_affiliate_user_id;

    RETURN total_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 17. BACKFILL: Create affiliate profiles for existing users
-- =============================================================================

DO $$
DECLARE
    user_record RECORD;
    new_code TEXT;
BEGIN
    FOR user_record IN
        SELECT u.id
        FROM auth.users u
        LEFT JOIN affiliate_profiles ap ON ap.user_id = u.id
        WHERE ap.id IS NULL
    LOOP
        new_code := generate_affiliate_code();

        INSERT INTO affiliate_profiles (
            user_id,
            affiliate_code,
            referral_link,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            new_code,
            'https://destinylens.io/?ref=' || new_code,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Update dashboard_settings denormalized field
        UPDATE dashboard_settings
        SET affiliate_code = new_code
        WHERE user_id = user_record.id;
    END LOOP;
END $$;

-- =============================================================================
-- 18. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE affiliate_profiles IS 'Source of truth for affiliate codes and earnings. One row per user.';
COMMENT ON TABLE referral_visits IS 'Tracks ?ref=CODE visits. 30-day cookie window. No raw IPs stored.';
COMMENT ON TABLE affiliate_commissions IS 'Commission records from Stripe webhook events. 30-day pending period.';
COMMENT ON COLUMN user_profiles.referred_by_code IS 'The affiliate code that referred this user (if any).';
COMMENT ON COLUMN dashboard_settings.affiliate_code IS 'Denormalized cache of affiliate code for share page performance only.';
