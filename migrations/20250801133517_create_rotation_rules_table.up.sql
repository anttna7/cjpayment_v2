-- Migration: create_rotation_rules_table
-- Created at: 2025-08-01 13:35:17
-- Description: Create rotation_rules table for managing account rotation strategies

BEGIN;

CREATE TABLE rotation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL CHECK (strategy_type IN ('weighted', 'time_based', 'amount_tier', 'round_robin')),
    strategy_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1 CHECK (priority > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_rotation_rules_merchant_id ON rotation_rules(merchant_id);
CREATE INDEX idx_rotation_rules_strategy_type ON rotation_rules(strategy_type);
CREATE INDEX idx_rotation_rules_is_active ON rotation_rules(is_active);
CREATE INDEX idx_rotation_rules_priority ON rotation_rules(priority);

-- Create unique constraint for rule name per merchant
CREATE UNIQUE INDEX idx_rotation_rules_unique_name ON rotation_rules(merchant_id, rule_name);

-- Create GIN index for JSONB strategy_config for efficient JSON queries
CREATE INDEX idx_rotation_rules_strategy_config ON rotation_rules USING GIN (strategy_config);

COMMIT;