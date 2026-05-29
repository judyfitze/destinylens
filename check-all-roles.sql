-- Check all user roles
SELECT 
    u.id,
    u.email,
    p.role,
    p.is_active,
    p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY p.created_at DESC;
