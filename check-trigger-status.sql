-- Check trigger status
SELECT 
    tgname as trigger_name,
    proname as function_name,
    tgtype,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- Check if user_profiles has any records
SELECT COUNT(*) as user_profiles_count FROM public.user_profiles;

-- Check if the latest user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
