# Stripe Connect OAuth Deployment Status

## Date: May 15, 2026

## Status: READY FOR DEPLOYMENT

All files are prepared and ready for deployment to Vercel. Only authentication is pending.

---

## Files Prepared ✅

### API Routes
- ✅ `/api/stripe-connect.js` - OAuth URL generator (3,099 bytes)
- ✅ `/api/stripe-callback.js` - OAuth callback handler (7,992 bytes)

### Frontend
- ✅ `/income-connections.html` - Updated with OAuth flow integration

### Configuration
- ✅ `vercel.json` - Environment variables configured with secret references
- ✅ `package.json` - Dependencies include `@supabase/supabase-js`
- ✅ `.vercel/project.json` - Project linked (prj_zV2ETEtaCGRCkkkoTCtSDqSCJcRn)

---

## Environment Variables (Configured in Vercel)

The following secrets are referenced in `vercel.json`:

| Variable | Secret Reference | Status |
|----------|-----------------|--------|
| `SUPABASE_URL` | `@supabase_url` | ✅ Referenced |
| `SUPABASE_SERVICE_ROLE_KEY` | `@supabase_service_role_key` | ✅ Referenced |
| `STRIPE_CLIENT_ID` | `@stripe_client_id` | ✅ Referenced |
| `STRIPE_SECRET_KEY` | `@stripe_secret_key` | ✅ Referenced |
| `SITE_URL` | `@site_url` | ✅ Referenced |

**Note:** These secrets need to be set in Vercel's dashboard or via CLI before deployment.

---

## Required Stripe Configuration

### 1. Stripe Connect Settings
- **URL:** https://dashboard.stripe.com/settings/connect
- **Action Required:** Add redirect URL:
  ```
  https://destinylens.io/api/stripe-callback
  ```

### 2. Credentials Required
These should be set as environment variables in Vercel:
- **STRIPE_CLIENT_ID** - From Stripe Connect settings (starts with `ca_`)
- **STRIPE_SECRET_KEY** - From Stripe API keys (starts with `sk_`)
- **SUPABASE_URL** - Your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY** - Your Supabase service role key
- **SITE_URL** - `https://destinylens.io`

---

## Deployment Steps

### Option 1: Using Vercel CLI (Requires Authentication)

```bash
# Navigate to project
cd /root/.openclaw/workspace/destinylens

# Login to Vercel (if not already logged in)
vercel login

# Set environment variables (if not already set)
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_CLIENT_ID
vercel env add STRIPE_SECRET_KEY
vercel env add SITE_URL

# Deploy to production
vercel --prod
```

### Option 2: Using Vercel Token (Non-Interactive)

```bash
# Set environment variables
export VERCEL_TOKEN="vca_your_token_here"
export VERCEL_ORG_ID="team_KukkMkxQKsADixoljJ7972vg"
export VERCEL_PROJECT_ID="prj_zV2ETEtaCGRCkkkoTCtSDqSCJcRn"

# Deploy
cd /root/.openclaw/workspace/destinylens
vercel deploy --prod -y --no-wait
```

### Option 3: Using Deploy Script

```bash
cd /root/.openclaw/workspace/destinylens
./deploy-stripe-connect.sh
```

---

## Post-Deployment Verification

### 1. Test OAuth URL Generation
```bash
curl -X POST https://destinylens.io/api/stripe-connect \
  -H "Content-Type: application/json" \
  -d '{"connection_id":"test","user_id":"test"}'
```

Expected: JSON response with `url` field containing Stripe OAuth URL

### 2. Test Callback Handler
```bash
curl "https://destinylens.io/api/stripe-callback?code=test&state=test"
```

Expected: HTML error page (since code/state are invalid, but endpoint is accessible)

### 3. Full Flow Test
1. Visit https://destinylens.io/income-connections.html
2. Click "Connect Stripe"
3. Enter a label
4. Click "Connect"
5. Verify Stripe OAuth popup opens
6. Complete OAuth flow
7. Verify connection status changes to "active"

---

## Current Blocker

**Issue:** Vercel CLI is not authenticated
**Error:** "No existing credentials found. Please run `vercel login` or pass '--token'"

**Solution Options:**
1. Run `vercel login` interactively (requires browser)
2. Set `VERCEL_TOKEN` environment variable with a valid token from https://vercel.com/account/tokens
3. Use Vercel dashboard to deploy manually

---

## Next Actions Required

1. **Authenticate with Vercel** - Run `vercel login` or provide `VERCEL_TOKEN`
2. **Set environment variables** - Add the 5 required secrets to Vercel
3. **Deploy** - Run `vercel --prod`
4. **Configure Stripe** - Add redirect URL in Stripe Connect settings
5. **Test** - Verify the OAuth flow works end-to-end

---

## Architecture Summary

```
User clicks "Connect Stripe"
        ↓
Frontend creates pending connection in Supabase
        ↓
Frontend calls /api/stripe-connect
        ↓
Backend generates Stripe OAuth URL
        ↓
User redirected to Stripe OAuth page
        ↓
User authorizes connection
        ↓
Stripe redirects to /api/stripe-callback?code=XXX&state=YYY
        ↓
Backend exchanges code for access_token
        ↓
Backend updates connection status to "active"
        ↓
Backend registers webhook endpoint
        ↓
Success page shown, popup closes
        ↓
Frontend receives message, refreshes connection list
```

---

## Security Notes

- ✅ State parameter used for CSRF protection
- ✅ CORS headers configured
- ⚠️ Access tokens should be stored in a secrets vault (currently stores reference only)
- ⚠️ Webhook signature verification not implemented (should be added for production)
- ✅ HTTPS enforced (Vercel default)

---

## Files Checksum

```
api/stripe-connect.js:   3099 bytes - OAuth URL generator
api/stripe-callback.js:  7992 bytes - OAuth callback handler
income-connections.html: 47831 bytes - Frontend with OAuth integration
vercel.json:             339 bytes  - Environment configuration
```

---

**Status:** All components ready. Deployment pending Vercel authentication.
