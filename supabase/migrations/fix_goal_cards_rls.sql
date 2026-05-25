-- Fix RLS policies for goal_cards to allow authenticated users

-- Drop existing policy
DROP POLICY IF EXISTS "Users can only access their own goal cards" ON goal_cards;

-- Create separate policies for different operations
CREATE POLICY "Users can view their own goal cards"
    ON goal_cards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal cards"
    ON goal_cards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal cards"
    ON goal_cards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal cards"
    ON goal_cards FOR DELETE
    USING (auth.uid() = user_id);
