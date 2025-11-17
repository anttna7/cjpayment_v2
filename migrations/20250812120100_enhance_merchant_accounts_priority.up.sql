-- Migration: enhance_merchant_accounts_priority
-- Created at: 2025-08-12 12:01:00
-- Description: Enhance merchant_receive_accounts table with priority and usage tracking

BEGIN;

-- Rename weight to priority for better clarity
ALTER TABLE merchant_receive_accounts 
RENAME COLUMN weight TO priority;

-- Add usage tracking fields
ALTER TABLE merchant_receive_accounts 
ADD COLUMN IF NOT EXISTS daily_usage_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_reset_date DATE DEFAULT CURRENT_DATE;

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_merchant_receive_accounts_priority ON merchant_receive_accounts(merchant_id, priority, is_active);
CREATE INDEX IF NOT EXISTS idx_merchant_receive_accounts_usage_reset ON merchant_receive_accounts(usage_reset_date);

-- Add comments for new fields
COMMENT ON COLUMN merchant_receive_accounts.priority IS '账号优先级，数字越小优先级越高';
COMMENT ON COLUMN merchant_receive_accounts.daily_usage_amount IS '当日使用金额';
COMMENT ON COLUMN merchant_receive_accounts.daily_usage_count IS '当日使用次数';
COMMENT ON COLUMN merchant_receive_accounts.last_used_at IS '最后使用时间';
COMMENT ON COLUMN merchant_receive_accounts.usage_reset_date IS '使用统计重置日期';

COMMIT;