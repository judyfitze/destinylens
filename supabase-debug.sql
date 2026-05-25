-- Run this in Supabase SQL Editor to find the root cause
-- https://app.supabase.com/project/nfyabrvkqgzuzxjetqbe/sql/new

-- 1. Get Judy Fitzpatrick's user ID
SELECT id, email FROM auth.users WHERE email = 'judyfitze@gmail.com';

-- 2. Get all calculations for Judy
SELECT id, user_id, daily_total, created_at, 
       home_description, vehicle_description 
FROM dream_life_calculations 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'judyfitze@gmail.com');

-- 3. Check if any dashboard_settings point to Judy's calculations
SELECT ds.id, ds.user_id, ds.active_calculation_id, 
       u.email as user_email,
       calc.user_id as calc_user_id,
       calc.daily_total
FROM dashboard_settings ds
JOIN dream_life_calculations calc ON ds.active_calculation_id = calc.id
LEFT JOIN auth.users u ON ds.user_id = u.id
WHERE calc.user_id = (SELECT id FROM auth.users WHERE email = 'judyfitze@gmail.com')
  AND ds.user_id != calc.user_id;

-- 4. Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'dream_life_calculations';

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'dream_life_calculations';

-- 6. Check if there are any triggers on the table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'dream_life_calculations';