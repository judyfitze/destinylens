import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfyabrvkqgzuzxjetqbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWFicnZrcWd6dXp4amV0cWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAxMzYsImV4cCI6MjA5NDE5NjEzNn0.BmpDxYXwPNR1RftmjtKIqpE5h3Ljkn5gaGmHkFDfTm0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

console.log('=== VERIFYING AFFILIATE TRACKING ===\n');

// 1. Check the new user's profile
console.log('1. New user profile (ctperfect@yahoo.com)...');
const { data: newUserProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'ctperfect@yahoo.com')
  .single();

if (newUserProfile) {
  console.log('   ✅ Found!');
  console.log('   - ID:', newUserProfile.id);
  console.log('   - Referred by code:', newUserProfile.referred_by_code || '(none)');
} else {
  console.log('   ❌ Not found');
}

// 2. Check the referrer's affiliate profile
console.log('\n2. Referrer affiliate profile (568f91c5)...');
const { data: referrer } = await supabase
  .from('affiliate_profiles')
  .select('*')
  .eq('affiliate_code', '568f91c5')
  .single();

if (referrer) {
  console.log('   ✅ Found!');
  console.log('   - User ID:', referrer.user_id);
  console.log('   - Total referrals:', referrer.total_referrals);
  console.log('   - Total commissions:', referrer.total_commissions_earned);
} else {
  console.log('   ❌ Not found');
}

// 3. Check referral visits
console.log('\n3. Referral visits for code 568f91c5...');
const { data: visits } = await supabase
  .from('referral_visits')
  .select('*')
  .eq('affiliate_code', '568f91c5')
  .order('created_at', { ascending: false });

console.log('   Found:', visits?.length || 0, 'visit(s)');
visits?.forEach(v => {
  console.log('   - Converted:', v.converted_to_user_id ? 'YES (' + v.converted_to_user_id + ')' : 'NO');
});

// 4. Check affiliate commissions
console.log('\n4. Affiliate commissions for code 568f91c5...');
const { data: commissions } = await supabase
  .from('affiliate_commissions')
  .select('*')
  .eq('affiliate_user_id', referrer?.user_id || 'none')
  .order('created_at', { ascending: false });

console.log('   Found:', commissions?.length || 0, 'commission(s)');
commissions?.forEach(c => {
  console.log('   - Amount:', c.commission_amount, 'Status:', c.status);
});

console.log('\n=== VERIFICATION COMPLETE ===');
