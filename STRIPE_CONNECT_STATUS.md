# Stripe Connect OAuth Implementation Status

## Current State (May 15, 2025)

### What's Working
1. ✅ Database schema for `income_connections` and `income_progress_events`
2. ✅ Vercel webhook handler at `/api/webhook/stripe.js` - receives Stripe webhooks
3. ✅ Frontend UI for creating connections and displaying webhook URLs
4. ✅ Connection status tracking (pending → connected → active)

### What's NOT Working
1. ❌ **No Stripe Connect OAuth flow** - The UI creates connections but doesn't actually authenticate with Stripe via OAuth
2. ❌ **Supabase Edge Functions not deployed** - `stripe-connect` and `stripe-callback` functions exist but aren't deployed
3. ❌ **No OAuth URL generation** - Frontend doesn't call anything to get a Stripe Connect OAuth URL
4. ❌ **Missing environment variables** - Need to configure Stripe credentials in Vercel/Supabase

### Current Flow (Manual Webhook)
```
User clicks "Connect Stripe" 
→ Creates pending connection in DB
→ Shows webhook URL to user
→ User manually configures webhook in Stripe Dashboard
→ Stripe sends webhooks → Vercel API route → DB
```

### Required Flow (OAuth + Automatic Webhook)
```
User clicks "Connect Stripe"
→ Call /api/stripe-connect (generates OAuth URL)
→ Redirect user to Stripe OAuth
→ User authorizes app
→ Stripe redirects to /api/stripe-callback
→ Callback exchanges code for access_token
→ Automatically registers webhook
→ Updates connection status to 'active'
```

## Implementation Needed

### 1. Create Vercel API Routes for OAuth
- `/api/stripe-connect` - Generate OAuth URL
- `/api/stripe-callback` - Handle OAuth callback

### 2. Update Frontend
- Call `/api/stripe-connect` instead of just creating pending connection
- Handle OAuth popup/redirect flow

### 3. Configure Environment Variables
```
STRIPE_CLIENT_ID=ca_XXXXX (from Stripe Connect settings)
STRIPE_SECRET_KEY=sk_live_XXXXX or sk_test_XXXXX
SUPABASE_URL=https://nfyabrvkqgzuzxjetqbe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=XXXXX
```

### 4. Stripe Dashboard Configuration
- Get Client ID from Stripe Connect settings
- Add redirect URL: `https://destinylens.io/api/stripe-callback`
- Enable Connect OAuth

## Files to Create/Modify

1. `/api/stripe-connect.js` - NEW
2. `/api/stripe-callback.js` - NEW
3. `income-connections.html` - MODIFY (call API instead of just creating pending)
4. Vercel environment variables - CONFIGURE
