-- Remove indexes for receive_accounts table

DROP INDEX IF EXISTS idx_receive_accounts_type_status;
DROP INDEX IF EXISTS idx_receive_accounts_payment_type;
DROP INDEX IF EXISTS idx_receive_accounts_created_at;
DROP INDEX IF EXISTS idx_receive_accounts_updated_at;
DROP INDEX IF EXISTS idx_receive_accounts_type_payment_status;
DROP INDEX IF EXISTS idx_receive_accounts_account_name_lower;
DROP INDEX IF EXISTS idx_receive_accounts_account_holder_lower;
DROP INDEX IF EXISTS idx_receive_accounts_daily_usage;
DROP INDEX IF EXISTS idx_merchant_receive_accounts_merchant_active;
DROP INDEX IF EXISTS idx_merchant_receive_accounts_account_active;