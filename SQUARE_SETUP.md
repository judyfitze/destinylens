# Square OAuth Integration Setup

## Files Created

1. **`/api/square-connect.js`** - Generates Square OAuth URL
2. **`/api/square-callback.js`** - Handles OAuth callback, exchanges code for tokens
3. **`/api/webhook/square.js`** - Receives Square payment webhooks

## Environment Variables Required

Add these to your Vercel project:

```bash
SQUARE_APP_ID=sq0idp-tGZA-AYaMxyVZuvvP5boOw
SQUARE_SECRET=sq0idp-tGZA-AYaMxyVZuvvP5boOw
SQUARE_ENVIRONMENT=sandbox
SITE_URL=https://destinylens.io
```

## OAuth Flow

1. User clicks "Connect Square" in income-connections.html
2. Frontend calls `/api/square-connect` to generate OAuth URL
3. User authorizes in Square popup
4. Square redirects to `/api/square-callback`
5. Callback exchanges code for access token
6. Connection status updated to "active"

## Square Developer Setup

1. Go to https://developer.squareup.com/apps
2. Select your app or create one
3. Add OAuth Redirect URL: `https://destinylens.io/api/square-callback`
4. Add webhook URL: `https://destinylens.io/api/webhook/square?connection_id={connection_id}`
5. Select webhook events: `payment.created`, `order.created`

## Deployment

Run from project root:
```bash
vercel --prod
```

Or push to Git to auto-deploy.

## Testing

1. Create a Square connection in DestinyLens
2. Complete OAuth flow
3. Create a test payment in Square sandbox
4. Verify webhook received in DestinyLens
