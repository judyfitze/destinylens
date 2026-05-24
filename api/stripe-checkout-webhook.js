// Stripe Checkout Webhook - Creates user after successful payment
// POST /api/stripe-checkout-webhook
// Stripe sends checkout.session.completed events

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = req.body;
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

    if (!customerEmail) {
      console.error('No email in checkout session');
      res.status(400).json({ error: 'No email found' });
      return;
    }

    console.log('Processing purchase for:', customerEmail);

    // Initialize Supabase with service role
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
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        paid: true,
        purchased_at: new Date().toISOString(),
        product: 'DestinyLens',
        name: customerName
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      res.status(500).json({ error: 'Failed to create user: ' + createError.message });
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

    // Send welcome email with credentials
    try {
      // Use Supabase's built-in email service (requires SMTP configuration in Supabase)
      // For now, we'll use a direct API call to send email
      const emailPayload = {
        to: customerEmail,
        subject: 'Welcome to DestinyLens - Your Login Details',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #A94CF0; margin: 0;">DestinyLens</h1>
              <p style="color: #F6C26B; font-size: 14px; margin: 5px 0 0 0;">Your Dream Life In Focus</p>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(169, 76, 240, 0.08) 0%, rgba(246, 194, 107, 0.05) 100%); border: 1px solid rgba(169, 76, 240, 0.2); border-radius: 16px; padding: 32px; margin-bottom: 24px;">
              <h2 style="color: #333; margin-top: 0;">Welcome to Your Dream Life Journey!</h2>
              <p style="color: #666; line-height: 1.6;">Thank you for purchasing DestinyLens. Your account has been created and is ready to use.</p>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Your Login Details</h3>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${customerEmail}</p>
                <p style="margin: 8px 0;"><strong>Password:</strong> ${tempPassword}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.destinylens.io/auth.html" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #A94CF0 0%, #F6C26B 100%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Log In Now</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">You can also log in with the magic link we'll send separately.</p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>DestinyLens | support@destinylens.io</p>
              <p>If you didn't make this purchase, please contact us immediately.</p>
            </div>
          </div>
        `,
        text: `Welcome to DestinyLens!\n\nYour login details:\nEmail: ${customerEmail}\nPassword: ${tempPassword}\n\nLog in at: https://www.destinylens.io/auth.html\n\nIf you need help, contact support@destinylens.io`
      };
      
      // Try to send via Supabase Edge Function or external service
      // For now, log the email content for manual sending if needed
      console.log('=== WELCOME EMAIL ===');
      console.log('To:', emailPayload.to);
      console.log('Subject:', emailPayload.subject);
      console.log('Text:', emailPayload.text);
      console.log('=== END EMAIL ===');
      
      // Store email in Supabase for later processing
      await supabase.from('pending_emails').insert({
        to_email: customerEmail,
        subject: emailPayload.subject,
        html_content: emailPayload.html,
        text_content: emailPayload.text,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Log credentials for debugging
    console.log('=== NEW USER CREDENTIALS ===');
    console.log('Email:', customerEmail);
    console.log('Temp Password:', tempPassword);
    console.log('User ID:', newUser.user.id);
    console.log('=== END CREDENTIALS ===');

    // Add to Global Control
    try {
      const gcApiKey = '21c6ddbd3338d2e75cffd56f6b6c3ed6bf419e870393e0a0bd02c985565d39ab';
      
      // Get DestinyLens Buyer tag ID
      const tagsResponse = await fetch('https://api.globalcontrol.io/api/ai/tags', {
        headers: { 'X-API-KEY': gcApiKey }
      });
      const tagsData = await tagsResponse.json();
      const buyerTag = tagsData.data?.find(t => t.name === 'Buyer-DestinyLens');
      
      if (buyerTag) {
        // Write tag fire JSON to temp file
        const fs = await import('fs');
        const tagData = { email: customerEmail, firstName: customerName?.split(' ')[0] || '', lastName: customerName?.split(' ').slice(1).join(' ') || '' };
        fs.writeFileSync('/tmp/tag-fire.json', JSON.stringify(tagData));
        
        // Fire tag
        await fetch(`https://api.globalcontrol.io/api/ai/tags/fire-tag/${buyerTag._id}`, {
          method: 'POST',
          headers: { 
            'X-API-KEY': gcApiKey,
            'Content-Type': 'application/json'
          },
          body: fs.readFileSync('/tmp/tag-fire.json')
        });
        
        console.log('Global Control tag applied:', buyerTag.name);
        fs.unlinkSync('/tmp/tag-fire.json');
      } else {
        console.log('DestinyLens Buyer tag not found in Global Control');
      }
    } catch (gcError) {
      console.error('Global Control error:', gcError);
      // Don't fail the webhook if GC fails
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
