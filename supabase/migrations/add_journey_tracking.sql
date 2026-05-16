-- Add journey tracking fields to support reset/continue functionality
-- Run this in Supabase SQL Editor

-- Add journey_start_date to dream_life_calculations
-- This allows a calculation to have a custom start date (for continuing from original journey)
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS journey_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add original_journey_calculation_id to track which calculation started the journey
-- This links new calculations back to the original journey start
ALTER TABLE dream_life_calculations
ADD COLUMN IF NOT EXISTS original_journey_calculation_id UUID REFERENCES dream_life_calculations(id);

-- Add fields to dashboard_settings to track user's journey preferences
ALTER TABLE dashboard_settings
ADD COLUMN IF NOT EXISTS original_journey_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS original_journey_calculation_id UUID REFERENCES dream_life_calculations(id);

-- Add comments for documentation
COMMENT ON COLUMN dream_life_calculations.journey_start_date IS 'The date this journey started (may differ from created_at if continuing from original)';
COMMENT ON COLUMN dream_life_calculations.original_journey_calculation_id IS 'Reference to the original calculation that started this journey (for tracking resets)';
COMMENT ON COLUMN dashboard_settings.original_journey_start_date IS 'The original journey start date (used when user chooses to continue)';
COMMENT ON COLUMN dashboard_settings.original_journey_calculation_id IS 'Reference to the original calculation (used when user chooses to continue)';

-- Add index for faster queries on journey tracking
CREATE INDEX IF NOT EXISTS idx_dream_life_calculations_journey_start 
ON dream_life_calculations(journey_start_date);

CREATE INDEX IF NOT EXISTS idx_dream_life_calculations_original_journey 
ON dream_life_calculations(original_journey_calculation_id);
