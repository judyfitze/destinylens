-- Verify judy@leadpulsepro.com purchase
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'paid' as is_paid,
    u.raw_user_meta_data->>'referral_code' as meta_referral,
    p.referred_by_code,
    a.affiliate_code as their_code
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
LEFT JOIN public.affiliate_profiles a ON u.id = a.user_id
WHERE u.email = 'judy@leadpulsepro.com';
