-- Check the trigger function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user_safe';
