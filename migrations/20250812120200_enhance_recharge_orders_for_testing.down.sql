-- Migration rollback: enhance_recharge_orders_for_testing
-- Created at: 2025-08-12 12:02:00
-- Description: Rollback enhancements to recharge_orders table

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_recharge_orders_payment_type;
DROP INDEX IF EXISTS idx_recharge_orders_amount;
DROP INDEX IF EXISTS idx_recharge_orders_completed_at;
DROP INDEX IF EXISTS idx_recharge_orders_expired_at;
DROP INDEX IF EXISTS idx_recharge_orders_auto_matched;
DROP INDEX IF EXISTS idx_recharge_orders_merchant_status_date;
DROP INDEX IF EXISTS idx_recharge_orders_date_status;

-- Remove status constraint
ALTER TABLE recharge_orders 
DROP CONSTRAINT IF EXISTS recharge_orders_status_check;

-- Remove added columns
ALTER TABLE recharge_orders 
DROP COLUMN IF EXISTS payment_proof,
DROP COLUMN IF EXISTS processing_notes,
DROP COLUMN IF EXISTS auto_matched,
DROP COLUMN IF EXISTS match_score,
DROP COLUMN IF EXISTS ip_address,
DROP COLUMN IF EXISTS user_agent,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS expired_at;

-- Restore original status constraint (if needed)
ALTER TABLE recharge_orders 
ADD CONSTRAINT recharge_orders_status_check 
CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancelled'));

COMMIT;