-- Direct check for the new user
-- Run this in Supabase SQL Editor

-- 1. Check auth.users for ctperfect
SELECT id, email, created_at, user_metadata 
FROM auth.users 
WHERE email = 'ctperfect@yahoo.com';

-- 2. Check user_profiles (bypass RLS with service role)
SELECT * FROM public.user_profiles 
WHERE email = 'ctperfect@yahoo.com';

-- 3. Check all recent user_profiles
SELECT * FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check affiliate_profiles for new user
SELECT * FROM public.affiliate_profiles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ctperfect@yahoo.com'
);

-- 5. Check dashboard_settings for new user
SELECT * FROM public.dashboard_settings 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ctperfect@yahoo.com'
);

-- 6. Check if trigger exists and is enabled
SELECT 
  tgname,
  tgenabled,
  proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
AND tgname = 'on_auth_user_created';
