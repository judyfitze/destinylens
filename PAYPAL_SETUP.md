# PayPal OAuth Integration Setup

## Overview
PayPal OAuth integration has been added to DestinyLens, similar to the existing Stripe Connect implementation.

## Files Created

### API Endpoints
1. `/api/paypal-connect.js` - Generates PayPal OAuth URL
2. `/api/paypal-callback.js` - Handles OAuth callback and token exchange
3. `/api/webhook/paypal.js` - Receives PayPal payment webhooks

### Frontend Updates
- `/income-connections.html` - Updated to support PayPal OAuth flow

## Environment Variables Required

Add these to your Vercel environment variables:

```
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or 'production' for live
```

## How to Get PayPal Credentials

### 1. Create a PayPal Developer Account
- Go to https://developer.paypal.com/
- Sign in with your PayPal account or create one

### 2. Create an App
- Go to Dashboard → My Apps & Credentials
- Click "Create App"
- Enter app name (e.g., "DestinyLens")
- Select "Merchant" app type

### 3. Get Your Credentials
- **Client ID**: Copy from app details
- **Client Secret**: Click "Show" to reveal and copy
- **Webhook ID**: Will be created automatically during OAuth

### 4. Configure Redirect URI
In your PayPal app settings, add this redirect URI:
```
https://destinylens.io/api/paypal-callback
```

For local testing, also add:
```
http://localhost:3000/api/paypal-callback
```

## Testing the Integration

### Sandbox Testing
1. Set `PAYPAL_ENVIRONMENT=sandbox`
2. Use sandbox credentials from PayPal Developer Dashboard
3. Use sandbox buyer accounts for testing payments

### Webhook Events Supported
- `PAYMENT.CAPTURE.COMPLETED` - Payment received
- `PAYMENT.CAPTURE.DENIED` - Payment denied
- `CHECKOUT.ORDER.COMPLETED` - Order completed
- `BILLING.SUBSCRIPTION.PAYMENT.COMPLETED` - Subscription payment

## User Flow

1. User clicks "Connect PayPal" on Income Connections page
2. System creates pending connection in database
3. Popup opens to PayPal authorization page
4. User logs in and grants permissions
5. PayPal redirects to callback endpoint
6. System exchanges code for access token
7. Webhook endpoint is registered with PayPal
8. Connection status updated to "active"
9. Payment events automatically tracked

## Database Schema

The existing `income_connections` table supports PayPal:
- `provider` = 'paypal'
- `status` = 'pending' → 'active'
- `external_account_id` = PayPal merchant ID
- `vault_secret_reference` = token reference
- `webhook_reference` = PayPal webhook ID

## Troubleshooting

### Connection Issues
- Verify environment variables are set in Vercel
- Check that redirect URI matches exactly in PayPal app settings
- Ensure `PAYPAL_ENVIRONMENT` matches your credentials (sandbox vs production)

### Webhook Issues
- PayPal webhooks require HTTPS (won't work on localhost)
- Check Vercel logs for webhook errors
- Verify webhook signature if implementing verification

### Token Expiration
- PayPal access tokens expire after ~9 hours
- Refresh tokens are stored for renewal (implementation needed for long-term)

## Security Notes

- Access tokens are not stored directly in database
- State parameter used for CSRF protection
- Webhook signature verification recommended for production
- All API calls use HTTPS
