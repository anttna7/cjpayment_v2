-- Migration: add_merchant_modal_fields (rollback)
-- Created at: 2025-08-08 18:00:00
-- Description: Rollback merchant management modal fields

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_merchants_agent_name;
DROP INDEX IF EXISTS idx_merchants_port_name_unique;
DROP INDEX IF EXISTS idx_receive_accounts_custom_provider;

-- Remove fields from merchants table
ALTER TABLE merchants DROP COLUMN IF EXISTS agent_name;
ALTER TABLE merchants DROP COLUMN IF EXISTS port_name;
ALTER TABLE merchants DROP COLUMN IF EXISTS remark;

-- Remove field from receive_accounts table
ALTER TABLE receive_accounts DROP COLUMN IF EXISTS custom_payment_provider;

COMMIT;