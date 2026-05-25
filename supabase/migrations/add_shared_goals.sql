-- Add shared_goals_json column to dashboard_settings for public share page
ALTER TABLE dashboard_settings ADD COLUMN IF NOT EXISTS shared_goals_json JSONB DEFAULT '[]'::jsonb;

-- Update RLS policy to allow public reads on specific columns
CREATE POLICY "Public can read shared dashboards" 
    ON dashboard_settings FOR SELECT
    USING (public_share_enabled = true AND public_share_slug IS NOT NULL);
