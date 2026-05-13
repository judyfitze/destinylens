-- Add RLS policy to allow public access to shared dashboards
-- Run this in Supabase SQL Editor

-- Allow anonymous users to read dashboard settings for public shares
CREATE POLICY "Public can view shared dashboards"
    ON dashboard_settings FOR SELECT
    TO anon
    USING (public_share_enabled = true);

-- Also allow authenticated users to view any public share
CREATE POLICY "Authenticated can view shared dashboards"
    ON dashboard_settings FOR SELECT
    TO authenticated
    USING (public_share_enabled = true);
