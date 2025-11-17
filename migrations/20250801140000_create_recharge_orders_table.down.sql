-- Drop indexes
DROP INDEX IF EXISTS idx_recharge_orders_receiver_account_id;
DROP INDEX IF EXISTS idx_recharge_orders_created_at;
DROP INDEX IF EXISTS idx_recharge_orders_status;
DROP INDEX IF EXISTS idx_recharge_orders_merchant_id;
DROP INDEX IF EXISTS idx_recharge_orders_order_number;

-- Drop table
DROP TABLE IF EXISTS recharge_orders;