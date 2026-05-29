-- Check for recent users including getsmartyclaw
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'paid' as is_paid,
    u.raw_user_meta_data->>'referral_code' as referral_code,
    p.referred_by_code,
    a.affiliate_code as their_code
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
LEFT JOIN public.affiliate_profiles a ON u.id = a.user_id
WHERE u.email IN ('getsmartyclaw@gmail.com', 'ctperfect@yahoo.com', 'e2etest1779909852764@example.com')
ORDER BY u.created_at DESC;
