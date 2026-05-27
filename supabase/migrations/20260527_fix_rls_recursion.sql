-- Fix RLS infinite recursion on user_profiles
-- The admin check policy was querying user_profiles from within a user_profiles policy

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all affiliate profiles" ON affiliate_profiles;
DROP POLICY IF EXISTS "Admins can update all affiliate profiles" ON affiliate_profiles;
DROP POLICY IF EXISTS "Admins can read all commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Admins can update all commissions" ON affiliate_commissions;

-- Create a secure function to check admin status (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate user_profiles policy using the function
CREATE POLICY "Admins can read all profiles"
    ON user_profiles FOR SELECT
    USING (is_admin(auth.uid()));

-- Recreate affiliate_profiles policies
CREATE POLICY "Admins can read all affiliate profiles"
    ON affiliate_profiles FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all affiliate profiles"
    ON affiliate_profiles FOR UPDATE
    USING (is_admin(auth.uid()));

-- Recreate affiliate_commissions policies
CREATE POLICY "Admins can read all commissions"
    ON affiliate_commissions FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all commissions"
    ON affiliate_commissions FOR UPDATE
    USING (is_admin(auth.uid()));
