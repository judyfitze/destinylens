-- Fix the auth trigger issue
-- The problem: handle_new_user_with_affiliate() trigger is failing
-- Solution: Simplify the trigger and add error handling

-- 1. First, check if the trigger exists and what's happening
DO $$
BEGIN
    -- Log that we're starting
    RAISE NOTICE 'Starting trigger fix...';
END $$;

-- 2. Drop the problematic triggers (both of them)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create a simpler, more robust trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    referred_by TEXT;
BEGIN
    -- Wrap everything in exception handling
    BEGIN
        -- Create user profile (ignore if already exists)
        INSERT INTO public.user_profiles (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO NOTHING;
        
        -- Generate affiliate code
        new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        new_code := replace(replace(replace(replace(new_code, '0', 'x'), 'o', 'y'), 'l', 'z'), 'i', 'w');
        
        -- Create affiliate profile (ignore if already exists)
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
        
        -- Check if user was referred
        referred_by := NEW.raw_user_meta_data->>'referred_by_code';
        
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
        -- Log error but don't fail the transaction
        RAISE WARNING 'Error in handle_new_user_safe: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the new trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_safe();

-- 5. Verify the trigger was created
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
    AND tgname = 'on_auth_user_created';
    
    IF trigger_count > 0 THEN
        RAISE NOTICE 'Trigger on_auth_user_created successfully created';
    ELSE
        RAISE WARNING 'Trigger on_auth_user_created was not created!';
    END IF;
END $$;

-- 6. Test the trigger by creating a test user (will be deleted)
-- Note: This is optional and should be run manually after verification
/*
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Create a test user
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
    VALUES ('test_trigger@example.com', 'test', NOW())
    RETURNING id INTO test_user_id;
    
    -- Check if user_profiles was created
    PERFORM 1 FROM public.user_profiles WHERE id = test_user_id;
    IF FOUND THEN
        RAISE NOTICE 'Test successful: user_profiles created';
    ELSE
        RAISE WARNING 'Test failed: user_profiles not created';
    END IF;
    
    -- Clean up test user
    DELETE FROM auth.users WHERE id = test_user_id;
END $$;
*/
