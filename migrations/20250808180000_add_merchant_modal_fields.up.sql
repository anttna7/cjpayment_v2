-- Migration: add_merchant_modal_fields
-- Created at: 2025-08-08 18:00:00
-- Description: Add new fields to merchants and receive_accounts tables for merchant management modal functionality

BEGIN;

-- Add new fields to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS port_name VARCHAR(50);
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add unique constraint for port_name (only if not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_port_name_unique 
ON merchants(port_name) WHERE port_name IS NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_merchants_agent_name ON merchants(agent_name);

-- Add custom_payment_provider field to receive_accounts table
ALTER TABLE receive_accounts ADD COLUMN IF NOT EXISTS custom_payment_provider VARCHAR(50);

-- Add index for custom_payment_provider
CREATE INDEX IF NOT EXISTS idx_receive_accounts_custom_provider ON receive_accounts(custom_payment_provider);

COMMIT;