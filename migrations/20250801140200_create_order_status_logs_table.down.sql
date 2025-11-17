-- Drop indexes
DROP INDEX IF EXISTS idx_order_status_logs_operator_id;
DROP INDEX IF EXISTS idx_order_status_logs_created_at;
DROP INDEX IF EXISTS idx_order_status_logs_new_status;
DROP INDEX IF EXISTS idx_order_status_logs_recharge_order_id;

-- Drop table
DROP TABLE IF EXISTS order_status_logs;