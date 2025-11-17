-- Migration: create_recharge_sessions_table
-- Created at: 2025-08-12 12:03:00
-- Description: Create recharge_sessions table for tracking user sessions during recharge process

BEGIN;

CREATE TABLE recharge_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(64) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    form_data JSONB DEFAULT '{}',
    current_step VARCHAR(50) DEFAULT 'form_filling',
    matched_account_id UUID REFERENCES receive_accounts(id),
    recharge_order_id UUID REFERENCES recharge_orders(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_recharge_sessions_session_token ON recharge_sessions(session_token);
CREATE INDEX idx_recharge_sessions_merchant_id ON recharge_sessions(merchant_id);
CREATE INDEX idx_recharge_sessions_expires_at ON recharge_sessions(expires_at);
CREATE INDEX idx_recharge_sessions_recharge_order_id ON recharge_sessions(recharge_order_id);
CREATE INDEX idx_recharge_sessions_current_step ON recharge_sessions(current_step);

-- Add comments
COMMENT ON TABLE recharge_sessions IS '充值会话表，用于跟踪用户充值过程';
COMMENT ON COLUMN recharge_sessions.id IS '会话ID';
COMMENT ON COLUMN recharge_sessions.session_token IS '会话令牌';
COMMENT ON COLUMN recharge_sessions.merchant_id IS '商户ID';
COMMENT ON COLUMN recharge_sessions.ip_address IS 'IP地址';
COMMENT ON COLUMN recharge_sessions.user_agent IS '用户代理';
COMMENT ON COLUMN recharge_sessions.form_data IS '表单数据';
COMMENT ON COLUMN recharge_sessions.current_step IS '当前步骤';
COMMENT ON COLUMN recharge_sessions.matched_account_id IS '匹配的收款账号ID';
COMMENT ON COLUMN recharge_sessions.recharge_order_id IS '关联的充值订单ID';
COMMENT ON COLUMN recharge_sessions.expires_at IS '过期时间';

COMMIT;