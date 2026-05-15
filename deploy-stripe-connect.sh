#!/bin/bash
# Stripe Connect OAuth Deployment Script for DestinyLens

set -e

echo "🚀 Deploying Stripe Connect OAuth to Vercel..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Install with: npm i -g vercel${NC}"
    exit 1
fi

# Check if user is logged in
echo "Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please login:${NC}"
    vercel login
fi

echo -e "${GREEN}✅ Logged in as:$(vercel whoami)${NC}"
echo ""

# Check required environment variables
echo "Checking environment variables..."
MISSING_VARS=()

# Try to get env vars from Vercel
SUPABASE_URL=$(vercel env get SUPABASE_URL 2>/dev/null || echo "")
STRIPE_CLIENT_ID=$(vercel env get STRIPE_CLIENT_ID 2>/dev/null || echo "")
STRIPE_SECRET_KEY=$(vercel env get STRIPE_SECRET_KEY 2>/dev/null || echo "")

if [ -z "$SUPABASE_URL" ]; then
    MISSING_VARS+=("SUPABASE_URL")
fi

if [ -z "$STRIPE_CLIENT_ID" ]; then
    MISSING_VARS+=("STRIPE_CLIENT_ID")
fi

if [ -z "$STRIPE_SECRET_KEY" ]; then
    MISSING_VARS+=("STRIPE_SECRET_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please set them using:"
    echo "  vercel env add SUPABASE_URL"
    echo "  vercel env add SUPABASE_SERVICE_ROLE_KEY"
    echo "  vercel env add STRIPE_CLIENT_ID"
    echo "  vercel env add STRIPE_SECRET_KEY"
    echo "  vercel env add SITE_URL"
    echo ""
    echo -e "${YELLOW}Get your Stripe Client ID from: https://dashboard.stripe.com/settings/connect${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"
echo ""

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.stripe.com/settings/connect"
echo "2. Add the redirect URL: https://destinylens.io/api/stripe-callback"
echo "3. Test the OAuth flow in the Income Connections page"
echo ""
