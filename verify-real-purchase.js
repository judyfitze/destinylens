import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfyabrvkqgzuzxjetqbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWFicnZrcWd6dXp4amV0cWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAxMzYsImV4cCI6MjA5NDE5NjEzNn0.BmpDxYXwPNR1RftmjtKIqpE5h3Ljkn5gaGmHkFDfTm0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

console.log('=== VERIFYING REAL PURCHASE ===\n');

// Check recent auth users
console.log('1. Recent auth.users...');
const { data: recentUsers } = await supabase
  .from('auth.users')
  .select('id, email, created_at, user_metadata')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('   Found:', recentUsers?.length || 0);
recentUsers?.forEach(u => {
  console.log('   -', u.email, '(', u.id, ')');
  console.log('     Metadata:', JSON.stringify(u.user_metadata));
});

// Check user_profiles
console.log('\n2. Recent user_profiles...');
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('   Found:', profiles?.length || 0);
profiles?.forEach(p => {
  console.log('   -', p.email, 'Referred by:', p.referred_by_code || '(none)');
});

// Check affiliate_profiles
console.log('\n3. Recent affiliate_profiles...');
const { data: affiliates } = await supabase
  .from('affiliate_profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('   Found:', affiliates?.length || 0);
affiliates?.forEach(a => {
  console.log('   - Code:', a.affiliate_code, 'User:', a.user_id);
  console.log('     Referrals:', a.total_referrals, 'Earnings:', a.total_commissions_earned);
});

// Check referral_visits
console.log('\n4. Recent referral_visits...');
const { data: visits } = await supabase
  .from('referral_visits')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('   Found:', visits?.length || 0);
visits?.forEach(v => {
  console.log('   - Code:', v.affiliate_code, 'Converted:', v.converted_to_user_id ? 'YES' : 'NO');
});

console.log('\n=== VERIFICATION COMPLETE ===');
