-- Add indexes for receive_accounts table to optimize pagination and filtering queries

-- Index for account type and status filtering (most common filters)
CREATE INDEX IF NOT EXISTS idx_receive_accounts_type_status 
ON receive_accounts(account_type, status);

-- Index for payment type filtering
CREATE INDEX IF NOT EXISTS idx_receive_accounts_payment_type 
ON receive_accounts(payment_type);

-- Index for created_at ordering (default sort)
CREATE INDEX IF NOT EXISTS idx_receive_accounts_created_at 
ON receive_accounts(created_at DESC);

-- Index for updated_at ordering
CREATE INDEX IF NOT EXISTS idx_receive_accounts_updated_at 
ON receive_accounts(updated_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_receive_accounts_type_payment_status 
ON receive_accounts(account_type, payment_type, status);

-- Index for account name search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_receive_accounts_account_name_lower 
ON receive_accounts(LOWER(account_name));

-- Index for account holder search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_receive_accounts_account_holder_lower 
ON receive_accounts(LOWER(account_holder));

-- Index for daily usage queries
CREATE INDEX IF NOT EXISTS idx_receive_accounts_daily_usage 
ON receive_accounts(status, daily_limit, daily_used) 
WHERE status = 'active';

-- Index for merchant association queries (on merchant_receive_accounts table)
CREATE INDEX IF NOT EXISTS idx_merchant_receive_accounts_merchant_active 
ON merchant_receive_accounts(merchant_id, is_active, weight DESC) 
WHERE is_active = true;

-- Index for account association queries
CREATE INDEX IF NOT EXISTS idx_merchant_receive_accounts_account_active 
ON merchant_receive_accounts(receive_account_id, is_active) 
WHERE is_active = true;