-- Migration: Add API keys for MCP and external integrations
-- Created: 2025-01-01

-- Add api_key column to users table
ALTER TABLE users ADD COLUMN api_key TEXT;
ALTER TABLE users ADD COLUMN api_key_created_at INTEGER;

-- Create index for API key lookups
CREATE INDEX idx_users_api_key ON users(api_key);
