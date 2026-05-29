-- Fix trigger to check both referral_code and referred_by_code
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    referred_by TEXT;
BEGIN
    BEGIN
        -- Create user profile
        INSERT INTO public.user_profiles (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO NOTHING;
        
        -- Generate affiliate code
        new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        new_code := replace(replace(replace(replace(new_code, '0', 'x'), 'o', 'y'), 'l', 'z'), 'i', 'w');
        
        -- Create affiliate profile
        INSERT INTO public.affiliate_profiles (
            user_id,
            affiliate_code,
            referral_link,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            new_code,
            'https://destinylens.io/?ref=' || new_code,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Check if user was referred (try both field names)
        referred_by := COALESCE(
            NEW.raw_user_meta_data->>'referral_code',
            NEW.raw_user_meta_data->>'referred_by_code'
        );
        
        IF referred_by IS NOT NULL AND referred_by != '' THEN
            UPDATE public.user_profiles
            SET referred_by_code = referred_by
            WHERE id = NEW.id;
        END IF;
        
        -- Update dashboard_settings with denormalized affiliate code
        UPDATE public.dashboard_settings
        SET affiliate_code = new_code
        WHERE user_id = NEW.id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user_safe: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_safe();
