-- Check for missing user_profiles
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN p.id IS NULL THEN 'MISSING profile'
        ELSE 'Has profile'
    END as profile_status
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
