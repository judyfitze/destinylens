# DestinyLens Affiliate Program - Webhook Status

## Date: May 27, 2026

## Issue Summary
The Stripe webhook that creates users after successful payment is failing with:
- **Error**: "Database error creating new user"
- **Code**: `unexpected_failure`
- **Status**: 500

## Root Cause
The `supabase.auth.admin.createUser()` API is failing due to a database error in the auth schema. This is likely caused by:
1. A trigger on `auth.users` that's failing during user creation
2. The trigger `handle_new_user_with_affiliate()` may have issues

## Current Workaround
The webhook has been updated with:
1. **Retry logic**: 3 attempts with exponential backoff
2. **Fallback mode**: Stores purchase data without creating auth user
3. **Purchase tracking**: Records are stored in `purchases` table for later processing

## What's Working
✅ Referral code capture (?ref=CODE)  
✅ 30-day cookie storage  
✅ Visit recording in `referral_visits`  
✅ Stripe checkout session creation  
✅ Webhook receives events  
✅ Purchase data stored in fallback mode  

## What's Not Working
❌ Auth user creation (supabase.auth.admin.createUser() fails)  
❌ Dashboard settings creation (requires auth user)  
❌ Referral conversion tracking (requires auth user)  

## Next Steps to Fix

### Option 1: Fix the Auth Trigger (Recommended)
1. Access Supabase Dashboard → Database → Triggers
2. Check the `on_auth_user_created` trigger on `auth.users`
3. Either:
   - Fix the trigger function `handle_new_user_with_affiliate()`
   - Or temporarily disable it and create user profiles manually

### Option 2: Run the Fix Migration
Apply this SQL in Supabase SQL Editor:
```sql
-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create safer trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
BEGIN
    BEGIN
        INSERT INTO public.user_profiles (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO NOTHING;
        
        new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        new_code := replace(replace(replace(replace(new_code, '0', 'x'), 'o', 'y'), 'l', 'z'), 'i', 'w');
        
        INSERT INTO public.affiliate_profiles (user_id, affiliate_code, referral_link, created_at, updated_at)
        VALUES (NEW.id, new_code, 'https://destinylens.io/?ref=' || new_code, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user_safe: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_safe();
```

### Option 3: Manual User Creation
For now, you can:
1. Monitor the `purchases` table for new entries
2. Manually create users in Supabase Auth dashboard
3. Run a script to backfill user_profiles and affiliate_profiles

## Files Modified
- `/api/stripe-checkout-webhook.js` - Added retry logic and fallback
- `/supabase/migrations/20260527_fix_auth_trigger_final.sql` - Trigger fix
- `/supabase/migrations/20260527_create_purchases_table.sql` - Fallback table

## Testing
Test the webhook:
```bash
curl -X POST https://www.destinylens.io/api/stripe-checkout-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "test_session",
        "customer_email": "test@example.com",
        "metadata": {
          "referral_code": "TEST123"
        }
      }
    }
  }'
```

## Monitoring
Check Vercel logs:
```bash
vercel logs --token YOUR_TOKEN
```

## Contact
If the auth issue persists, contact Supabase support with:
- Project ref: `nfyabrvkqgzuzxjetqbe`
- Error: "Database error creating new user"
- Endpoint: `supabase.auth.admin.createUser()`
