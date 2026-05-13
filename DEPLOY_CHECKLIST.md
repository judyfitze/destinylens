# DestinyLens Domain Migration Checklist

## Domain: destinylens.io

### Step 1: Vercel Domain Setup
- [ ] Go to Vercel Dashboard → destinylens project → Settings → Domains
- [ ] Add domain: `destinylens.io`
- [ ] Follow DNS instructions:
  - Option A: Add A record pointing to Vercel's IP
  - Option B: Add CNAME record pointing to `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)

### Step 2: Supabase Configuration
- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Add `https://destinylens.io` to "Allowed Origins (CORS)"
- [ ] Keep `https://destinylens.vercel.app` as backup during transition

### Step 3: Supabase Edge Functions Secrets
- [ ] Go to Supabase Dashboard → Edge Functions → Secrets
- [ ] Add/update these secrets:
  - `SITE_URL` = `https://destinylens.io`
  - `SUPABASE_FUNCTIONS_URL` = `https://nfyabrvkqgzuzxjetqbe.supabase.co/functions/v1`

### Step 4: Stripe Configuration (when ready)
- [ ] In Stripe Dashboard, update webhook endpoints to use `https://destinylens.io`
- [ ] Update any Stripe Connect redirect URLs

### Step 5: Test Everything
- [ ] Visit `https://destinylens.io` - should load the site
- [ ] Test login/signup
- [ ] Test calculator
- [ ] Test dashboard
- [ ] Test income connections
- [ ] Verify webhooks are receiving data

### Step 6: Cleanup (after migration is stable)
- [ ] Remove `https://destinylens.vercel.app` from Supabase CORS (optional)
- [ ] Set up redirect from `www.destinylens.io` to `destinylens.io` (optional)

## Notes

- The webhook URLs are dynamically generated using `window.location.origin`, so they will automatically use `https://destinylens.io` once the domain is pointed
- Share links will automatically use the new domain
- No code changes needed - just configuration updates
