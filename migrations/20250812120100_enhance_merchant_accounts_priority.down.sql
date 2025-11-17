-- Migration rollback: enhance_merchant_accounts_priority
-- Created at: 2025-08-12 12:01:00
-- Description: Rollback enhancements to merchant_receive_accounts table

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_merchant_receive_accounts_priority;
DROP INDEX IF EXISTS idx_merchant_receive_accounts_usage_reset;

-- Remove added columns
ALTER TABLE merchant_receive_accounts 
DROP COLUMN IF EXISTS daily_usage_amount,
DROP COLUMN IF EXISTS daily_usage_count,
DROP COLUMN IF EXISTS last_used_at,
DROP COLUMN IF EXISTS usage_reset_date;

-- Rename priority back to weight
ALTER TABLE merchant_receive_accounts 
RENAME COLUMN priority TO weight;

COMMIT;