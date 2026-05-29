-- Check admin users and roles
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.role,
    p.is_active
FROM auth.users u
JOIN public.user_profiles p ON u.id = p.id
WHERE p.role = 'admin'
ORDER BY u.created_at DESC;
