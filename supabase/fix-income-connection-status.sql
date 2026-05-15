-- Fix income_connections status constraint to include 'connected'
-- Run this in Supabase SQL Editor

-- Drop existing constraint
ALTER TABLE income_connections 
DROP CONSTRAINT IF EXISTS income_connections_status_check;

-- Add updated constraint with 'connected' status
ALTER TABLE income_connections 
ADD CONSTRAINT income_connections_status_check 
CHECK (status IN ('active', 'pending', 'connected', 'disconnected', 'error', 'manual'));
