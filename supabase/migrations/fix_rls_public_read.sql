-- Allow public read access to dream_life_calculations via share slug
-- This is safe because we're only allowing reads, not writes

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only access their own calculations" ON dream_life_calculations;

-- Create new policies
CREATE POLICY "Users can manage their own calculations"
    ON dream_life_calculations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow public reads for shared dashboards
CREATE POLICY "Public can read calculations for shared dashboards"
    ON dream_life_calculations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dashboard_settings ds
            WHERE ds.active_calculation_id = dream_life_calculations.id
            AND ds.public_share_enabled = true
            AND ds.public_share_slug IS NOT NULL
        )
    );
