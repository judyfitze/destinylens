-- Create purchases table for fallback when auth fails
-- This stores purchase data until we can create the auth user

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- Generated UUID, not FK to auth.users
    email TEXT NOT NULL,
    name TEXT,
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    referral_code TEXT,
    amount INTEGER NOT NULL,  -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
    auth_user_created BOOLEAN NOT NULL DEFAULT false,
    auth_user_id UUID,  -- Will be filled when auth user is created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(email);
CREATE INDEX IF NOT EXISTS idx_purchases_session ON purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own purchases"
    ON purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all purchases"
    ON purchases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Comment
COMMENT ON TABLE purchases IS 'Stores purchase records as fallback when auth user creation fails';
