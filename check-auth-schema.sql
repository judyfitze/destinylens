-- Check the auth schema for issues
-- 1. Check if there are any problematic triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgtype
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 2. Check for any constraints that might be causing issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass;

-- 3. Check if there's a unique constraint on email
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users' AND schemaname = 'auth';
