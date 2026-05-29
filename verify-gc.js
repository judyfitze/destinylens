import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfyabrvkqgzuzxjetqbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meWFicnZrcWd6dXp4amV0cWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjAxMzYsImV4cCI6MjA5NDE5NjEzNn0.BmpDxYXwPNR1RftmjtKIqpE5h3Ljkn5gaGmHkFDfTm0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

console.log('=== VERIFYING USERS AND GLOBAL CONTROL ===\n');

// Check getsmartyclaw
console.log('1. Checking getsmartyclaw@gmail.com...');
const { data: gcUser } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'getsmartyclaw@gmail.com')
  .single();

if (gcUser) {
  console.log('   ✅ Found!');
  console.log('   - ID:', gcUser.id);
  console.log('   - Referred by:', gcUser.referred_by_code || '(none)');
} else {
  console.log('   ❌ Not found in user_profiles');
}

// Check ctperfect
console.log('\n2. Checking ctperfect@yahoo.com...');
const { data: ctUser } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'ctperfect@yahoo.com')
  .single();

if (ctUser) {
  console.log('   ✅ Found!');
  console.log('   - ID:', ctUser.id);
  console.log('   - Referred by:', ctUser.referred_by_code || '(none)');
} else {
  console.log('   ❌ Not found in user_profiles');
}

// Check all recent users
console.log('\n3. All recent user_profiles...');
const { data: allUsers } = await supabase
  .from('user_profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5);

allUsers?.forEach(u => {
  console.log('   -', u.email, '(referred by:', u.referred_by_code || 'none', ')');
});

console.log('\n=== CHECK COMPLETE ===');
