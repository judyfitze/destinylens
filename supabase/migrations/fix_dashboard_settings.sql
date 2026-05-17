-- Fix dashboard_settings table to add missing journey tracking columns
-- Run this in Supabase SQL Editor

-- First, check if dashboard_settings table exists and create it if not
CREATE TABLE IF NOT EXISTS dashboard_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    active_calculation_id UUID REFERENCES dream_life_calculations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add original journey tracking columns (if they don't exist)
ALTER TABLE dashboard_settings 
ADD COLUMN IF NOT EXISTS original_journey_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS original_journey_calculation_id UUID REFERENCES dream_life_calculations(id);

-- Add comments for documentation
COMMENT ON COLUMN dashboard_settings.original_journey_start_date IS 'The original journey start date (used when user chooses to continue)';
COMMENT ON COLUMN dashboard_settings.original_journey_calculation_id IS 'Reference to the original calculation (used when user chooses to continue)';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user_id ON dashboard_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_active_calculation ON dashboard_settings(active_calculation_id);

-- Enable RLS
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own dashboard settings" ON dashboard_settings;
CREATE POLICY "Users can view own dashboard settings"
    ON dashboard_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard settings" ON dashboard_settings;
CREATE POLICY "Users can insert own dashboard settings"
    ON dashboard_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dashboard settings" ON dashboard_settings;
CREATE POLICY "Users can update own dashboard settings"
    ON dashboard_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dashboard_settings' 
ORDER BY ordinal_position;
