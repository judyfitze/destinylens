-- Check current triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Check if user_profiles has any conflicting data
SELECT COUNT(*) as total_profiles,
       COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
       COUNT(DISTINCT id) as unique_ids
FROM public.user_profiles;

-- Check for duplicate emails in auth.users
SELECT email, COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;
