#!/bin/bash
# Deploy PayPal Connect OAuth endpoints to Vercel

echo "🚀 Deploying PayPal Connect integration to Vercel..."

# Check if environment variables are set
echo "📋 Checking environment variables..."

if [ -z "$PAYPAL_CLIENT_ID" ]; then
    echo "❌ PAYPAL_CLIENT_ID is not set"
    echo "   Set it with: export PAYPAL_CLIENT_ID=your_client_id"
    exit 1
fi

if [ -z "$PAYPAL_CLIENT_SECRET" ]; then
    echo "❌ PAYPAL_CLIENT_SECRET is not set"
    echo "   Set it with: export PAYPAL_CLIENT_SECRET=your_client_secret"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL is not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
    exit 1
fi

echo "✅ Environment variables check passed"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Ensure environment variables are set in Vercel dashboard"
echo "2. Test PayPal connection from Income Connections page"
echo "3. Verify webhooks are working with a test payment"
