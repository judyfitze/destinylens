-- Direct fix for RLS infinite recursion
-- Drop ALL problematic policies and recreate clean ones

-- 1. Drop ALL existing policies on affected tables
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can read own affiliate profile" ON affiliate_profiles;
DROP POLICY IF EXISTS "Users can update own affiliate profile" ON affiliate_profiles;
DROP POLICY IF EXISTS "Admins can read all affiliate profiles" ON affiliate_profiles;
DROP POLICY IF EXISTS "Admins can update all affiliate profiles" ON affiliate_profiles;
DROP POLICY IF EXISTS "Public can read active affiliate profiles" ON affiliate_profiles;

DROP POLICY IF EXISTS "Users can read own commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Admins can read all commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Admins can update all commissions" ON affiliate_commissions;

-- 2. Drop the is_admin function if it exists
DROP FUNCTION IF EXISTS is_admin(UUID);

-- 3. Recreate clean policies for user_profiles
CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- 4. Recreate clean policies for affiliate_profiles
-- Public can read active affiliates (for referral validation)
CREATE POLICY "Public can read active affiliates"
    ON affiliate_profiles FOR SELECT
    USING (is_affiliate_active = true);

-- Users can update own affiliate profile
CREATE POLICY "Users can update own affiliate profile"
    ON affiliate_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. Recreate clean policies for affiliate_commissions
CREATE POLICY "Users can read own commissions"
    ON affiliate_commissions FOR SELECT
    USING (auth.uid() = affiliate_user_id);
