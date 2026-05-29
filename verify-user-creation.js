import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfyabrvkqgzuzxjetqbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWFicnZrcWd6dXp4amV0cWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAxMzYsImV4cCI6MjA5NDE5NjEzNn0.BmpDxYXwPNR1RftmjtKIqpE5h3Ljkn5gaGmHkFDfTm0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

console.log('=== VERIFYING USER CREATION ===\n');

// Check all user_profiles (not filtered by email)
console.log('1. All user_profiles (last 5)...');
const { data: allProfiles } = await supabase
  .from('user_profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('   Total:', allProfiles?.length || 0);
allProfiles?.forEach(p => {
  console.log('   -', p.email, '(', p.id, ')');
  console.log('     Referred by:', p.referred_by_code || '(none)');
});

// Check all affiliate_profiles
console.log('\n2. All affiliate_profiles (last 5)...');
const { data: allAffiliates } = await supabase
  .from('affiliate_profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('   Total:', allAffiliates?.length || 0);
allAffiliates?.forEach(a => {
  console.log('   - Code:', a.affiliate_code, 'User:', a.user_id);
  console.log('     Referrals:', a.total_referrals, 'Commissions:', a.total_commissions_earned);
});

// Check dashboard_settings
console.log('\n3. Recent dashboard_settings...');
const { data: allSettings } = await supabase
  .from('dashboard_settings')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

console.log('   Total:', allSettings?.length || 0);
allSettings?.forEach(s => {
  console.log('   - User:', s.user_id, 'Title:', s.dashboard_title);
});

console.log('\n=== CHECK COMPLETE ===');
