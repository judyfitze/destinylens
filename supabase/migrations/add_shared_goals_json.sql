-- Add shared_goals_json column to dashboard_settings
ALTER TABLE dashboard_settings ADD COLUMN IF NOT EXISTS shared_goals_json JSONB DEFAULT '[]'::jsonb;
