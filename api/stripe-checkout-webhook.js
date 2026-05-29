// Stripe Checkout Webhook - Creates user after successful payment
// POST /api/stripe-checkout-webhook
// Stripe sends checkout.session.completed events

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Retry helper for async operations
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, data: result, attempt };
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        return { success: false, error, attempt };
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, stripe-signature');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Parse body - handle both JSON and raw body
    let payload = req.body;
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    
    console.log('Webhook raw body type:', typeof req.body);
    console.log('Webhook payload type:', typeof payload);
    
    const eventType = payload.type;

    console.log('Stripe webhook received:', eventType);

    // Only process completed checkouts
    if (eventType !== 'checkout.session.completed') {
      res.status(200).json({ message: 'Event ignored' });
      return;
    }

    const session = payload.data?.object;
    if (!session) {
      res.status(400).json({ error: 'No session data' });
      return;
    }

    const customerEmail = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || '';
    const referralCode = session.metadata?.referral_code || null;

    console.log('=== STRIPE CHECKOUT SESSION ===');
    console.log('Customer:', customerEmail);
    console.log('Session ID:', session.id);
    console.log('Metadata:', JSON.stringify(session.metadata));
    console.log('Referral Code:', referralCode);
    console.log('================================');

    if (!customerEmail) {
      console.error('No email in checkout session');
      res.status(400).json({ error: 'No email found' });
      return;
    }

    console.log('Processing purchase for:', customerEmail);

    // Initialize Supabase with service role
    console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'MISSING');
    console.log('Supabase Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Check if user already exists using auth admin API with retry
    let existingUser = null;
    const listUsersResult = await withRetry(async () => {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      return users;
    }, 3, 1000);

    if (listUsersResult.success) {
      existingUser = listUsersResult.data.find(u => u.email === customerEmail);
      
      if (existingUser) {
        console.log('User already exists:', customerEmail);
        
        // Update user metadata to mark as paid
        const updateResult = await withRetry(async () => {
          const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { 
              paid: true, 
              purchased_at: new Date().toISOString(),
              product: 'DestinyLens'
            }
          });
          if (updateError) throw updateError;
        }, 3, 1000);
        
        if (!updateResult.success) {
          console.error('Error updating user after retries:', updateResult.error);
        }
        
        res.status(200).json({ message: 'User updated', user_id: existingUser.id });
        return;
      }
    } else {
      console.error('Error listing users after retries:', listUsersResult.error);
    }

    // Generate a secure random password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

    // Create new user in Supabase Auth with retry
    console.log('Creating user with email:', customerEmail);
    
    const createUserResult = await withRetry(async () => {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          paid: true,
          purchased_at: new Date().toISOString(),
          product: 'DestinyLens',
          name: customerName,
          referral_code: referralCode
        }
      });
      
      if (createError) throw createError;
      if (!newUser || !newUser.user) throw new Error('No user returned from createUser');
      
      return newUser.user;
    }, 3, 2000);

    let userId;
    let userCreated = false;

    if (createUserResult.success) {
      userId = createUserResult.data.id;
      userCreated = true;
      console.log('User created via Auth API:', userId);
    } else {
      console.error('=== USER CREATION FAILED AFTER RETRIES ===');
      console.error('Error code:', createUserResult.error?.code);
      console.error('Error message:', createUserResult.error?.message);
      console.error('Error details:', JSON.stringify(createUserResult.error));
      console.error('===========================================');
      
      // FALLBACK: Generate a UUID and store purchase data
      // The user will need to be manually created or retried later
      console.log('Attempting fallback: Storing purchase data...');
      
      userId = crypto.randomUUID();
      
      try {
        // Store purchase record for later processing
        const { error: purchaseError } = await supabase
          .from('purchases')
          .insert({
            user_id: userId,
            email: customerEmail,
            name: customerName,
            stripe_session_id: session.id,
            referral_code: referralCode,
            amount: 4700, // $47.00 in cents
            currency: 'USD',
            status: 'completed',
            created_at: new Date().toISOString()
          });
        
        if (purchaseError) {
          console.error('Fallback: Error creating purchase record:', purchaseError);
        } else {
          console.log('Fallback: Created purchase record for:', customerEmail);
        }
        
      } catch (fallbackError) {
        console.error('Fallback creation failed:', fallbackError);
      }
    }

    // If user was created via auth, create related records
    if (userCreated) {
      // Update user_profiles with referral code if applicable
      if (referralCode) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ referred_by_code: referralCode })
            .eq('id', userId);
          
          if (profileError) {
            console.error('Error updating user profile with referral:', profileError);
          } else {
            console.log('User profile updated with referral code:', referralCode);
          }
        } catch (e) {
          console.error('Exception updating user profile:', e);
        }
      }

      // Create dashboard_settings for the user
      try {
        const { error: settingsError } = await supabase
          .from('dashboard_settings')
          .insert({
            user_id: userId,
            dashboard_title: `${customerName || 'My'}'s Dream`,
            dashboard_subtitle: 'Living my best life...',
            public_share_enabled: false,
            password_protected: false,
            currency: 'USD',
            timezone: 'America/Los_Angeles',
            counter_mode: 'count_up',
            counter_label: 'Day',
            counter_total_days: 730,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (settingsError) {
          console.error('Error creating dashboard settings:', settingsError);
        } else {
          console.log('Dashboard settings created for user:', userId);
        }
      } catch (e) {
        console.error('Exception creating dashboard settings:', e);
      }

      // Handle referral conversion if applicable
      if (referralCode) {
        try {
          const { error: convertError } = await supabase.rpc('mark_referral_converted', {
            p_affiliate_code: referralCode,
            p_user_id: userId
          });
          
          if (convertError) {
            console.error('Error marking referral converted:', convertError);
          } else {
            console.log('Referral converted:', referralCode, '->', userId);
          }
        } catch (e) {
          console.error('Exception converting referral:', e);
        }
      }
    }

    // Add to Global Control with Buyer-DestinyLens tag
    try {
      const gcApiKey = process.env.GC_API_KEY;
      
      if (gcApiKey) {
        const tagsResponse = await fetch('https://api.globalcontrol.io/api/ai/tags', {
          headers: { 'X-API-KEY': gcApiKey }
        });
        const tagsData = await tagsResponse.json();
        const buyerTag = tagsData.data?.find(t => t.name === 'Buyer-DestinyLens');
        
        if (buyerTag) {
          const tagData = { 
            email: customerEmail, 
            firstName: customerName?.split(' ')[0] || '', 
            lastName: customerName?.split(' ').slice(1).join(' ') || '' 
          };
          
          const tagResponse = await fetch(`https://api.globalcontrol.io/api/ai/tags/fire-tag/${buyerTag._id}`, {
            method: 'POST',
            headers: { 
              'X-API-KEY': gcApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(tagData)
          });
          
          if (tagResponse.ok) {
            console.log('Global Control tag applied:', buyerTag.name);
          } else {
            console.error('Failed to fire tag:', await tagResponse.text());
          }
        }
      }
    } catch (gcError) {
      console.error('Global Control error:', gcError);
    }

    res.status(200).json({ 
      success: true, 
      message: userCreated ? 'User created' : 'Purchase recorded (auth pending)',
      user_id: userId,
      auth_created: userCreated,
      referral_code: referralCode
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
