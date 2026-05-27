// Stripe Checkout Webhook - Creates user after successful payment
// POST /api/stripe-checkout-webhook
// Stripe sends checkout.session.completed events

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Check if user already exists using auth admin API
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
      } else {
        const existingUser = users.find(u => u.email === customerEmail);
        
        if (existingUser) {
          console.log('User already exists:', customerEmail);
          
          // Update user metadata to mark as paid
          const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { 
              paid: true, 
              purchased_at: new Date().toISOString(),
              product: 'DestinyLens'
            }
          });
          
          if (updateError) {
            console.error('Error updating user:', updateError);
          }
          
          res.status(200).json({ message: 'User updated', user_id: existingUser.id });
          return;
        }
      }
    } catch (e) {
      console.error('Error checking existing user:', e);
    }

    // Generate a secure random password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase();

    // Create new user in Supabase Auth
    console.log('Creating user with email:', customerEmail);
    
    console.log('Attempting to create user with email:', customerEmail);
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: tempPassword,
      email_confirm: true,  // Auto-confirm since they just paid
      user_metadata: {
        paid: true,
        purchased_at: new Date().toISOString(),
        product: 'DestinyLens',
        name: customerName
      }
    });

    if (createError) {
      console.error('=== USER CREATION ERROR ===');
      console.error('Error code:', createError.code);
      console.error('Error message:', createError.message);
      console.error('Error details:', JSON.stringify(createError));
      console.error('===========================');
      res.status(500).json({ error: 'Failed to create user: ' + createError.message, code: createError.code });
      return;
    }

    if (!newUser || !newUser.user) {
      console.error('No user returned from createUser');
      res.status(500).json({ error: 'User creation failed - no user returned' });
      return;
    }

    console.log('User created:', newUser.user.id);

    // Create dashboard_settings for the new user
    try {
      const { error: settingsError } = await supabase
        .from('dashboard_settings')
        .insert({
          user_id: newUser.user.id,
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
      }
    } catch (e) {
      console.error('Exception creating dashboard settings:', e);
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
      message: 'User created',
      user_id: newUser.user.id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
