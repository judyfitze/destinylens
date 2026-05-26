// Stripe Checkout Session API
// POST /api/create-checkout-session
// Body: { email, success_url, cancel_url }

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, coupon, referral_code, success_url, cancel_url } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      res.status(500).json({ error: 'Stripe not configured' });
      return;
    }

    // Validate referral_code server-side if provided
    let validReferralCode = null;
    if (referral_code) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } }
        );

        const { data: affiliate, error: affiliateError } = await supabase
          .from('affiliate_profiles')
          .select('affiliate_code')
          .eq('affiliate_code', referral_code)
          .eq('is_affiliate_active', true)
          .maybeSingle();

        if (!affiliateError && affiliate) {
          validReferralCode = affiliate.affiliate_code;
          console.log('Valid referral code:', validReferralCode);
        } else {
          console.warn('Invalid or inactive referral code:', referral_code);
        }
      } catch (validationErr) {
        console.error('Referral validation error:', validationErr);
        // Continue without referral code — don't block purchase
      }
    }

    // Build Stripe metadata
    const stripeMetadata = {
      'metadata[email]': email,
      'metadata[source]': 'destinylens_affiliate',
    };

    if (validReferralCode) {
      stripeMetadata['metadata[referral_code]'] = validReferralCode;
    }

    // Create Stripe checkout session
    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'customer_email': email,
        'success_url': success_url || 'https://destinylens.io/thank-you.html',
        'cancel_url': cancel_url || 'https://destinylens.io/checkout.html',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'DestinyLens',
        'line_items[0][price_data][product_data][description]': 'Dream Life Calculator + Dashboard',
        'line_items[0][price_data][unit_amount]': '4700', // $47.00 in cents
        'line_items[0][quantity]': '1',
        ...stripeMetadata,
        ...(coupon ? { 'discounts[0][coupon]': coupon } : {}),
      }),
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.error('Stripe error:', sessionData);
      res.status(500).json({ error: sessionData.error?.message || 'Failed to create checkout' });
      return;
    }

    res.status(200).json({
      success: true,
      url: sessionData.url,
      session_id: sessionData.id,
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: error.message });
  }
}
