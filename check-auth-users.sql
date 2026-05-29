-- Check auth.users directly
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
WHERE email IN ('getsmartyclaw@gmail.com', 'ctperfect@yahoo.com')
ORDER BY created_at DESC;
