-- Fix: Allow public (anon) reads on active affiliate codes for referral validation
-- This avoids RLS recursion and allows the frontend tracker to validate codes

-- Drop existing policies that cause issues
DROP POLICY IF EXISTS "Users can read own affiliate profile" ON affiliate_profiles;

-- Create policy: anyone can read active affiliate profiles (needed for referral validation)
CREATE POLICY "Public can read active affiliate profiles"
    ON affiliate_profiles FOR SELECT
    USING (is_affiliate_active = true);

-- Keep update policy for owners
CREATE POLICY "Users can update own affiliate profile"
    ON affiliate_profiles FOR UPDATE
    USING (auth.uid() = user_id);
