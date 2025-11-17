-- Migration: create_agent_suggestions_table
-- Created at: 2025-08-08 18:01:00
-- Description: Create agent_suggestions table for autocomplete functionality in merchant management modal

BEGIN;

CREATE TABLE agent_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_agent_suggestions_name ON agent_suggestions(agent_name);
CREATE INDEX idx_agent_suggestions_usage ON agent_suggestions(usage_count DESC);
CREATE INDEX idx_agent_suggestions_last_used ON agent_suggestions(last_used_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_agent_suggestions_updated_at
    BEFORE UPDATE ON agent_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_suggestions_updated_at();

COMMIT;