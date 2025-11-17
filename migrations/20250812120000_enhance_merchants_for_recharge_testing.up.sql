-- Migration: enhance_merchants_for_recharge_testing
-- Created at: 2025-08-12 12:00:00
-- Description: Enhance merchants table for recharge testing system functionality

BEGIN;

-- Add recharge testing specific fields to merchants table
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS recharge_url VARCHAR(200),
ADD COLUMN IF NOT EXISTS recharge_page_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_recharge_enabled BOOLEAN DEFAULT true;

-- Create index for recharge URL lookups
CREATE INDEX IF NOT EXISTS idx_merchants_recharge_url ON merchants(recharge_url) WHERE recharge_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_recharge_enabled ON merchants(is_recharge_enabled);

-- Add comments for new fields
COMMENT ON COLUMN merchants.business_type IS '业务类型';
COMMENT ON COLUMN merchants.recharge_url IS '充值页面URL';
COMMENT ON COLUMN merchants.recharge_page_config IS '充值页面配置信息';
COMMENT ON COLUMN merchants.is_recharge_enabled IS '是否启用充值功能';

COMMIT;