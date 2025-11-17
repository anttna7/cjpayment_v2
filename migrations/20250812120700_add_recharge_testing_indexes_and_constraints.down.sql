-- Migration rollback: add_recharge_testing_indexes_and_constraints
-- Created at: 2025-08-12 12:07:00
-- Description: Remove indexes and constraints added for recharge testing system

BEGIN;

-- Drop partial indexes
DROP INDEX IF EXISTS idx_recharge_orders_pending_status;
DROP INDEX IF EXISTS idx_recharge_orders_completed_today;
DROP INDEX IF EXISTS idx_recharge_sessions_active;

-- Drop check constraints
ALTER TABLE recharge_orders 
DROP CONSTRAINT IF EXISTS chk_recharge_orders_amount_positive;

ALTER TABLE merchant_receive_accounts 
DROP CONSTRAINT IF EXISTS chk_merchant_receive_accounts_priority_positive;

ALTER TABLE recharge_sessions 
DROP CONSTRAINT IF EXISTS chk_recharge_sessions_expires_future;

ALTER TABLE data_export_logs 
DROP CONSTRAINT IF EXISTS chk_data_export_logs_date_range;

-- Drop composite indexes
DROP INDEX IF EXISTS idx_recharge_orders_merchant_date_amount;
DROP INDEX IF EXISTS idx_recharge_orders_status_payment_type;
DROP INDEX IF EXISTS idx_recharge_orders_receiver_account_date;
DROP INDEX IF EXISTS idx_order_status_logs_date_status;
DROP INDEX IF EXISTS idx_merchant_receive_accounts_active_priority;

-- Drop additional indexes
DROP INDEX IF EXISTS idx_merchants_business_type;
DROP INDEX IF EXISTS idx_merchants_status_enabled;
DROP INDEX IF EXISTS idx_recharge_orders_payer_name;
DROP INDEX IF EXISTS idx_recharge_orders_ad_account;

COMMIT;