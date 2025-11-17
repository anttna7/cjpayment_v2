-- Migration: enhance_recharge_orders_for_testing
-- Created at: 2025-08-12 12:02:00
-- Description: Enhance recharge_orders table for comprehensive recharge testing system

BEGIN;

-- Add missing fields for recharge testing system
ALTER TABLE recharge_orders 
ADD COLUMN IF NOT EXISTS payment_proof TEXT,
ADD COLUMN IF NOT EXISTS processing_notes TEXT,
ADD COLUMN IF NOT EXISTS auto_matched BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS match_score INTEGER,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include more statuses
ALTER TABLE recharge_orders 
DROP CONSTRAINT IF EXISTS recharge_orders_status_check;

ALTER TABLE recharge_orders 
ADD CONSTRAINT recharge_orders_status_check 
CHECK (status IN ('pending', 'paid', 'confirmed', 'completed', 'cancelled', 'expired', 'failed'));

-- Create additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recharge_orders_payment_type ON recharge_orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_amount ON recharge_orders(amount);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_completed_at ON recharge_orders(completed_at);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_expired_at ON recharge_orders(expired_at);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_auto_matched ON recharge_orders(auto_matched);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recharge_orders_merchant_status_date ON recharge_orders(merchant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_date_status ON recharge_orders(DATE(created_at), status);

-- Add comments for new fields
COMMENT ON COLUMN recharge_orders.payment_proof IS '付款凭证信息';
COMMENT ON COLUMN recharge_orders.processing_notes IS '处理备注';
COMMENT ON COLUMN recharge_orders.auto_matched IS '是否自动匹配账号';
COMMENT ON COLUMN recharge_orders.match_score IS '账号匹配得分';
COMMENT ON COLUMN recharge_orders.ip_address IS '创建订单的IP地址';
COMMENT ON COLUMN recharge_orders.user_agent IS '用户代理信息';
COMMENT ON COLUMN recharge_orders.completed_at IS '订单完成时间';
COMMENT ON COLUMN recharge_orders.expired_at IS '订单过期时间';

COMMIT;