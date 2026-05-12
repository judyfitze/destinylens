-- DestinyLens Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dream Life Calculations table
CREATE TABLE dream_life_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Home
    home_description TEXT,
    home_location TEXT,
    home_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Vehicle
    vehicle_description TEXT,
    vehicle_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Travel
    travel_description TEXT,
    travel_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Food
    food_description TEXT,
    food_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Trainer
    trainer_description TEXT,
    trainer_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Chef
    chef_description TEXT,
    chef_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- College
    college_description TEXT,
    college_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Retirement
    retirement_description TEXT,
    retirement_monthly_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Other expenses (JSON array)
    other_expenses JSONB DEFAULT '[]'::jsonb,
    
    -- Calculated totals
    monthly_total DECIMAL(12,2) DEFAULT 0,
    yearly_total DECIMAL(12,2) DEFAULT 0,
    weekly_total DECIMAL(12,2) DEFAULT 0,
    daily_total DECIMAL(12,2) DEFAULT 0,
    hourly_total DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard Settings table
CREATE TABLE dashboard_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Active calculation reference
    active_calculation_id UUID REFERENCES dream_life_calculations(id),
    
    -- Display settings
    dashboard_title TEXT DEFAULT 'Dream Life Financial Command Center',
    dashboard_subtitle TEXT DEFAULT 'Live Your Dream Life',
    
    -- Income targets
    daily_income_target DECIMAL(12,2) DEFAULT 0,
    weekly_income_target DECIMAL(12,2) DEFAULT 0,
    monthly_income_target DECIMAL(12,2) DEFAULT 0,
    yearly_income_target DECIMAL(12,2) DEFAULT 0,
    hourly_income_target DECIMAL(12,2) DEFAULT 0,
    
    -- Currency and timezone
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'America/Vancouver',
    
    -- Counter settings
    counter_start_date DATE,
    counter_total_days INTEGER DEFAULT 720,
    counter_mode TEXT DEFAULT 'count_up',
    counter_label TEXT DEFAULT 'Day',
    
    -- Visual settings
    background_image_url TEXT,
    primary_color TEXT DEFAULT '#A94CF0',
    secondary_color TEXT DEFAULT '#F6C26B',
    
    -- Sharing settings
    public_share_enabled BOOLEAN DEFAULT false,
    public_share_slug TEXT,
    password_protected BOOLEAN DEFAULT false,
    show_source_breakdown_publicly BOOLEAN DEFAULT false,
    show_income_numbers_publicly BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goal Cards table
CREATE TABLE goal_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES dashboard_settings(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    icon TEXT,
    link_url TEXT,
    monthly_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Income Sources table
CREATE TABLE income_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    source_type TEXT NOT NULL, -- 'stripe', 'paypal', 'shopify', 'affiliate', 'bank_feed', 'manual'
    source_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Connection status
    connection_status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    
    -- Settings
    include_refunds BOOLEAN DEFAULT true,
    gross_or_net TEXT DEFAULT 'gross',
    include_pending BOOLEAN DEFAULT false,
    include_unapproved_commissions BOOLEAN DEFAULT false,
    
    -- Currency and timezone
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'America/Vancouver',
    refresh_interval_minutes INTEGER DEFAULT 60,
    
    -- Sync tracking
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_sync_status TEXT,
    last_sync_error_safe_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Income Snapshots table (aggregated daily data)
CREATE TABLE income_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID REFERENCES income_sources(id) ON DELETE CASCADE,
    
    date DATE NOT NULL,
    timezone TEXT DEFAULT 'America/Vancouver',
    
    -- Income totals
    gross_income DECIMAL(12,2) DEFAULT 0,
    net_income DECIMAL(12,2) DEFAULT 0,
    refunds DECIMAL(12,2) DEFAULT 0,
    pending_income DECIMAL(12,2) DEFAULT 0,
    approved_commissions DECIMAL(12,2) DEFAULT 0,
    paid_commissions DECIMAL(12,2) DEFAULT 0,
    
    currency TEXT DEFAULT 'USD',
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, source_id, date)
);

-- Manual Income Entries table
CREATE TABLE manual_income_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    amount DECIMAL(12,2) NOT NULL,
    income_source_label TEXT,
    entry_date DATE NOT NULL,
    note TEXT,
    currency TEXT DEFAULT 'USD',
    include_in_dashboard BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard Images table
CREATE TABLE dashboard_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES dashboard_settings(id) ON DELETE CASCADE,
    
    image_url TEXT NOT NULL,
    image_type TEXT DEFAULT 'background', -- 'background', 'goal_card', 'vision_board'
    label TEXT,
    is_active_background BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE dream_life_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own calculations"
    ON dream_life_calculations FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own dashboard settings"
    ON dashboard_settings FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own goal cards"
    ON goal_cards FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own income sources"
    ON income_sources FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own income snapshots"
    ON income_snapshots FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own manual entries"
    ON manual_income_entries FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own images"
    ON dashboard_images FOR ALL
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_calculations_user_id ON dream_life_calculations(user_id);
CREATE INDEX idx_calculations_active ON dream_life_calculations(user_id, is_active);
CREATE INDEX idx_dashboard_user_id ON dashboard_settings(user_id);
CREATE INDEX idx_goal_cards_dashboard ON goal_cards(dashboard_id);
CREATE INDEX idx_income_sources_user ON income_sources(user_id, is_active);
CREATE INDEX idx_income_snapshots_user_date ON income_snapshots(user_id, date);
CREATE INDEX idx_manual_entries_user_date ON manual_income_entries(user_id, entry_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_dream_life_calculations_updated_at BEFORE UPDATE ON dream_life_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_settings_updated_at BEFORE UPDATE ON dashboard_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_cards_updated_at BEFORE UPDATE ON goal_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON income_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_income_entries_updated_at BEFORE UPDATE ON manual_income_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();