-- Drop indexes
DROP INDEX IF EXISTS idx_payment_vouchers_created_at;
DROP INDEX IF EXISTS idx_payment_vouchers_upload_status;
DROP INDEX IF EXISTS idx_payment_vouchers_recharge_order_id;

-- Drop table
DROP TABLE IF EXISTS payment_vouchers;