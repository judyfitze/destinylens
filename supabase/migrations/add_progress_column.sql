-- Add current_progress_percent column to dashboard_settings
ALTER TABLE dashboard_settings ADD COLUMN IF NOT EXISTS current_progress_percent INTEGER DEFAULT 0;
