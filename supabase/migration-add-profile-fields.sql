-- Migration: Add profile fields and custom_goals to dream_life_calculations
-- Run this in Supabase SQL Editor to update existing tables

-- Add profile columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dream_life_calculations' 
                   AND column_name = 'profile_name') THEN
        ALTER TABLE dream_life_calculations ADD COLUMN profile_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dream_life_calculations' 
                   AND column_name = 'profile_gender') THEN
        ALTER TABLE dream_life_calculations ADD COLUMN profile_gender TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dream_life_calculations' 
                   AND column_name = 'profile_age') THEN
        ALTER TABLE dream_life_calculations ADD COLUMN profile_age INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dream_life_calculations' 
                   AND column_name = 'profile_ethnicity') THEN
        ALTER TABLE dream_life_calculations ADD COLUMN profile_ethnicity TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dream_life_calculations' 
                   AND column_name = 'custom_goals') THEN
        ALTER TABLE dream_life_calculations ADD COLUMN custom_goals JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dream_life_calculations' 
AND column_name IN ('profile_name', 'profile_gender', 'profile_age', 'profile_ethnicity', 'custom_goals')
ORDER BY column_name;
