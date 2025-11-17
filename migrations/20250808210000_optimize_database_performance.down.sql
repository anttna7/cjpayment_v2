-- Rollback database performance optimization migration

-- Drop additional indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_receive_accounts_status_daily_limit;
DROP INDEX CONCURRENTLY IF EXISTS idx_receive_accounts_available_limit;
DROP INDEX CONCURRENTLY IF EXISTS idx_receive_accounts_account_number_hash;
DROP INDEX CONCURRENTLY IF EXISTS idx_merchant_receive_accounts_weight_priority;
DROP INDEX CONCURRENTLY IF EXISTS idx_merchant_receive_accounts_last_used;
DROP INDEX CONCURRENTLY IF EXISTS idx_recharge_orders_created_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_recharge_orders_merchant_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_recharge_orders_account_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_role_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_merchants_status_created;

-- Reset autovacuum settings to defaults
ALTER TABLE receive_accounts RESET (
  autovacuum_vacuum_scale_factor,
  autovacuum_analyze_scale_factor
);

ALTER TABLE recharge_orders RESET (
  autovacuum_vacuum_scale_factor,
  autovacuum_analyze_scale_factor
);

ALTER TABLE merchant_receive_accounts RESET (
  autovacuum_vacuum_scale_factor,
  autovacuum_analyze_scale_factor
);