-- Fix the ON CONFLICT issue for dashboard_settings
-- Run this in Supabase SQL Editor

-- Add unique constraint on user_id if it doesn't exist
ALTER TABLE dashboard_settings 
DROP CONSTRAINT IF EXISTS dashboard_settings_user_id_key;

ALTER TABLE dashboard_settings 
ADD CONSTRAINT dashboard_settings_user_id_key 
UNIQUE (user_id);
