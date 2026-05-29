-- Add share_password column to dashboard_settings table
-- This column stores the password for password-protected public dashboard sharing

ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS share_password TEXT;

-- Add password_protected boolean column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE;

-- Add public_share_enabled boolean column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT FALSE;

-- Add public_share_slug column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS public_share_slug TEXT;

-- Add show_income_numbers_publicly boolean column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS show_income_numbers_publicly BOOLEAN DEFAULT FALSE;

-- Add show_goal_cards_publicly boolean column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS show_goal_cards_publicly BOOLEAN DEFAULT FALSE;

-- Add dashboard_title column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS dashboard_title TEXT DEFAULT 'My Dream Life Dashboard';

-- Add dashboard_subtitle column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS dashboard_subtitle TEXT DEFAULT 'Financial Command Center';

-- Add timezone column if it doesn't exist
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add shared_goals_json column if it doesn't exist (for storing goals to share publicly)
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS shared_goals_json JSONB DEFAULT '[]'::jsonb;

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dashboard_settings' 
ORDER BY ordinal_position;
