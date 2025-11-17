-- Migration rollback: enhance_merchants_for_recharge_testing
-- Created at: 2025-08-12 12:00:00
-- Description: Rollback enhancements to merchants table for recharge testing system

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_merchants_recharge_url;
DROP INDEX IF EXISTS idx_merchants_recharge_enabled;

-- Remove added columns
ALTER TABLE merchants 
DROP COLUMN IF EXISTS business_type,
DROP COLUMN IF EXISTS recharge_url,
DROP COLUMN IF EXISTS recharge_page_config,
DROP COLUMN IF EXISTS is_recharge_enabled;

COMMIT;