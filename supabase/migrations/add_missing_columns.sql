-- Add missing columns to dream_life_calculations table
-- Run this in Supabase SQL Editor

-- Add custom_goals column (JSONB for flexible goal storage)
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS custom_goals JSONB DEFAULT '[]'::jsonb;

-- Add profile fields
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS profile_name TEXT,
ADD COLUMN IF NOT EXISTS profile_gender TEXT,
ADD COLUMN IF NOT EXISTS profile_age INTEGER,
ADD COLUMN IF NOT EXISTS profile_ethnicity TEXT;

-- Add is_active flag
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add timeframe_days (for journey calculation)
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS timeframe_days INTEGER DEFAULT 730;

-- Add index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_dream_life_calculations_is_active 
ON dream_life_calculations(is_active) 
WHERE is_active = true;

-- Add index on user_id + is_active for dashboard queries
CREATE INDEX IF NOT EXISTS idx_dream_life_calculations_user_active 
ON dream_life_calculations(user_id, is_active);

-- Comment on columns for documentation
COMMENT ON COLUMN dream_life_calculations.custom_goals IS 'Array of custom goal objects with label, description, amount';
COMMENT ON COLUMN dream_life_calculations.profile_name IS 'User profile name';
COMMENT ON COLUMN dream_life_calculations.profile_gender IS 'User profile gender';
COMMENT ON COLUMN dream_life_calculations.profile_age IS 'User profile age';
COMMENT ON COLUMN dream_life_calculations.profile_ethnicity IS 'User profile ethnicity';
COMMENT ON COLUMN dream_life_calculations.is_active IS 'Whether this is the currently active calculation for the user';
COMMENT ON COLUMN dream_life_calculations.timeframe_days IS 'Number of days for the dream life journey (default 730 = 2 years)';
