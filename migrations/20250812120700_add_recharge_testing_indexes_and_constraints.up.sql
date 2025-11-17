-- Migration: add_recharge_testing_indexes_and_constraints
-- Created at: 2025-08-12 12:07:00
-- Description: Add comprehensive indexes and constraints for recharge testing system performance

BEGIN;

-- Add performance indexes for common query patterns

-- Merchants table additional indexes
CREATE INDEX IF NOT EXISTS idx_merchants_business_type ON merchants(business_type) WHERE business_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_status_enabled ON merchants(status, is_recharge_enabled);

-- Recharge orders performance indexes
CREATE INDEX IF NOT EXISTS idx_recharge_orders_payer_name ON recharge_orders(payer_name);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_ad_account ON recharge_orders(ad_account);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_recharge_orders_merchant_date_amount ON recharge_orders(merchant_id, DATE(created_at), amount);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_status_payment_type ON recharge_orders(status, payment_type);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_receiver_account_date ON recharge_orders(receiver_account_id, DATE(created_at));

-- Order status logs performance indexes
CREATE INDEX IF NOT EXISTS idx_order_status_logs_date_status ON order_status_logs(DATE(created_at), new_status);

-- Merchant receive accounts performance indexes
CREATE INDEX IF NOT EXISTS idx_merchant_receive_accounts_active_priority ON merchant_receive_accounts(merchant_id, is_active, priority) WHERE is_active = true;

-- Add check constraints for data integrity
ALTER TABLE recharge_orders 
ADD CONSTRAINT IF NOT EXISTS chk_recharge_orders_amount_positive 
CHECK (amount > 0);

ALTER TABLE merchant_receive_accounts 
ADD CONSTRAINT IF NOT EXISTS chk_merchant_receive_accounts_priority_positive 
CHECK (priority > 0);

ALTER TABLE recharge_sessions 
ADD CONSTRAINT IF NOT EXISTS chk_recharge_sessions_expires_future 
CHECK (expires_at > created_at);

ALTER TABLE data_export_logs 
ADD CONSTRAINT IF NOT EXISTS chk_data_export_logs_date_range 
CHECK (date_range_end IS NULL OR date_range_start IS NULL OR date_range_end >= date_range_start);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_recharge_orders_pending_status ON recharge_orders(created_at, merchant_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_recharge_orders_completed_today ON recharge_orders(completed_at, amount) WHERE DATE(completed_at) = CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_recharge_sessions_active ON recharge_sessions(merchant_id, current_step) WHERE expires_at > NOW();

COMMIT;