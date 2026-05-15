# Stripe Connect OAuth Setup Guide

## Overview

This document explains how to set up Stripe Connect OAuth for DestinyLens, allowing users to securely connect their Stripe accounts and automatically track income.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User clicks    │────▶│  /api/stripe-    │────▶│  Stripe OAuth   │
│  "Connect"      │     │  connect         │     │  URL generated  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              ▼
│  Connection     │◀────│  /api/stripe-    │◀─────┌──────────────┐
│  marked active  │     │  callback        │      │ User grants  │
└─────────────────┘     └──────────────────┘      │ permission   │
         │                                        └──────────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Stripe sends   │────▶│  /api/webhook/   │────▶│  Income events  │
│  webhooks       │     │  stripe          │     │  stored in DB   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Files Created/Modified

### New API Routes
- `/api/stripe-connect.js` - Generates Stripe OAuth URL
- `/api/stripe-callback.js` - Handles OAuth callback from Stripe

### Modified Files
- `/api/webhook/stripe.js` - Already existed, receives webhooks
- `income-connections.html` - Updated to use OAuth flow
- `vercel.json` - Added environment variable configuration

## Setup Instructions

### 1. Get Stripe Credentials

1. Go to https://dashboard.stripe.com/settings/connect
2. Copy your **Client ID** (starts with `ca_`)
3. Go to https://dashboard.stripe.com/apikeys
4. Copy your **Secret key** (starts with `sk_`)

### 2. Configure Environment Variables in Vercel

```bash
# Login to Vercel
vercel login

# Set environment variables
vercel env add SUPABASE_URL
# Enter: https://nfyabrvkqgzuzxjetqbe.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter: your-service-role-key

vercel env add STRIPE_CLIENT_ID
# Enter: ca_XXXXX (from Stripe Connect settings)

vercel env add STRIPE_SECRET_KEY
# Enter: sk_XXXXX (from Stripe API keys)

vercel env add SITE_URL
# Enter: https://destinylens.io
```

### 3. Configure Stripe Connect Redirect URL

1. Go to https://dashboard.stripe.com/settings/connect
2. Under "Integration", add this redirect URL:
   ```
   https://destinylens.io/api/stripe-callback
   ```
3. Save changes

### 4. Deploy

```bash
# Using the deployment script
./deploy-stripe-connect.sh

# Or manually
vercel --prod
```

### 5. Test the Flow

1. Go to https://destinylens.io/income-connections.html
2. Click "Connect Stripe"
3. Enter a label (e.g., "My Business")
4. Click "Connect"
5. You should be redirected to Stripe OAuth
6. Authorize the connection
7. You should be redirected back and see "Stripe Connected!"

## How It Works

### 1. Initiating Connection

When user clicks "Connect Stripe":

1. Frontend creates a pending connection in `income_connections` table
2. Frontend calls `/api/stripe-connect` with `connection_id` and `user_id`
3. Backend generates Stripe OAuth URL with:
   - `client_id` - Your Stripe Connect client ID
   - `state` - CSRF protection token (stores connection info)
   - `redirect_uri` - Where Stripe sends user after auth
   - `scope` - Permissions (read_write for full access)

### 2. OAuth Flow

1. User is redirected to Stripe's OAuth page
2. User logs into their Stripe account (if not already)
3. User reviews and approves the permissions
4. Stripe redirects to `/api/stripe-callback?code=XXX&state=YYY`

### 3. Callback Handling

1. Backend verifies the `state` parameter matches stored value
2. Backend exchanges `code` for `access_token` via Stripe API
3. Backend receives:
   - `access_token` - For making API calls on user's behalf
   - `stripe_user_id` - The connected Stripe account ID
   - `refresh_token` - For refreshing access (if needed)
4. Backend updates connection status to `active`
5. Backend optionally registers webhook endpoint

### 4. Receiving Webhooks

Once connected, Stripe sends webhooks to `/api/webhook/stripe`:

- `checkout.session.completed`
- `charge.succeeded`
- `payment_intent.succeeded`

These are stored in `income_progress_events` table.

## Database Schema

### income_connections

| Column | Type | Description |
|--------|------|-------------|
| connection_id | UUID | Primary key |
| user_id | UUID | References auth.users |
| provider | text | 'stripe', 'paypal', etc. |
| connection_label | text | User-defined name |
| external_account_id | text | Stripe account ID (after OAuth) |
| status | text | 'pending' → 'active' |
| vault_secret_reference | text | Reference to stored token |
| webhook_reference | text | Stripe webhook endpoint ID |
| last_synced_at | timestamptz | Last webhook received |

### income_progress_events

| Column | Type | Description |
|--------|------|-------------|
| income_event_id | UUID | Primary key |
| user_id | UUID | References auth.users |
| connection_id | UUID | References income_connections |
| provider | text | 'stripe', etc. |
| external_event_id | text | Stripe event ID (for deduplication) |
| amount | decimal | Payment amount |
| currency | text | USD, etc. |
| status | text | 'received', 'refunded', etc. |
| received_at | timestamptz | When payment occurred |

## Security Considerations

1. **State Parameter**: Used to prevent CSRF attacks. Must be verified in callback.
2. **Access Tokens**: Currently stored reference only. In production, use a secrets vault.
3. **Webhook Verification**: Should verify Stripe signature (currently skipped for testing).
4. **HTTPS Only**: OAuth requires HTTPS in production.

## Troubleshooting

### "Stripe configuration missing"
- Check that `STRIPE_CLIENT_ID` and `STRIPE_SECRET_KEY` are set in Vercel

### "Connection not found"
- The state parameter may have expired or been tampered with
- Try creating a new connection

### "Invalid redirect_uri"
- Make sure the redirect URL is added in Stripe Connect settings
- Must match exactly (including https://)

### Popup blocked
- Browser may block the OAuth popup
- User can allow popups for destinylens.io
- Or we fallback to redirect flow

## Future Improvements

1. **Webhook Signature Verification**: Add proper Stripe signature validation
2. **Token Refresh**: Handle token expiration and refresh
3. **More Providers**: Add PayPal, Square, etc.
4. **Disconnect**: Allow users to revoke access
5. **Sync History**: Show historical payments after connection
