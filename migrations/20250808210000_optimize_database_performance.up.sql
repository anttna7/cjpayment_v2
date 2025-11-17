-- Database performance optimization migration
-- This migration adds additional indexes, constraints, and optimizations for production

-- Additional indexes for receive_accounts table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receive_accounts_status_daily_limit 
ON receive_accounts(status, daily_limit) 
WHERE status = 'active' AND daily_limit > 0;

-- Partial index for active accounts with available limits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receive_accounts_available_limit 
ON receive_accounts(id, daily_limit, daily_used) 
WHERE status = 'active' AND daily_used < daily_limit;

-- Index for account number lookups (unique constraint already exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_receive_accounts_account_number_hash 
ON receive_accounts USING hash(account_number);

-- Optimize merchant_receive_accounts table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_receive_accounts_weight_priority 
ON merchant_receive_accounts(merchant_id, weight DESC, priority DESC) 
WHERE is_active = true;

-- Index for rotation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_receive_accounts_last_used 
ON merchant_receive_accounts(merchant_id, last_used_at ASC) 
WHERE is_active = true;

-- Optimize recharge_orders table for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recharge_orders_created_status 
ON recharge_orders(created_at DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recharge_orders_merchant_date 
ON recharge_orders(merchant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recharge_orders_account_date 
ON recharge_orders(receive_account_id, created_at DESC);

-- Optimize users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_status 
ON users(role_id, status) 
WHERE status = 'active';

-- Optimize merchants table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchants_status_created 
ON merchants(status, created_at DESC);

-- Add table statistics update
ANALYZE receive_accounts;
ANALYZE merchant_receive_accounts;
ANALYZE recharge_orders;
ANALYZE users;
ANALYZE merchants;

-- Set table-specific autovacuum settings for high-traffic tables
ALTER TABLE receive_accounts SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE recharge_orders SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

ALTER TABLE merchant_receive_accounts SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);