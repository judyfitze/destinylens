-- Delete old goal cards for user so calculator data is used instead
-- Run this in Supabase SQL Editor

-- Delete all goal cards for the specific user
DELETE FROM goal_cards 
WHERE user_id = '275addd3-7e2f-419f-acd5-644ced3aff54';

-- Verify deletion
SELECT * FROM goal_cards 
WHERE user_id = '275addd3-7e2f-419f-acd5-644ced3aff54';
