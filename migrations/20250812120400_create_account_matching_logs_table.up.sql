-- Migration: create_account_matching_logs_table
-- Created at: 2025-08-12 12:04:00
-- Description: Create account_matching_logs table for tracking account matching decisions

BEGIN;

CREATE TABLE account_matching_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recharge_order_id UUID NOT NULL REFERENCES recharge_orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    payment_type VARCHAR(20) NOT NULL,
    requested_amount DECIMAL(15,2) NOT NULL,
    matching_strategy VARCHAR(50) NOT NULL,
    available_accounts JSONB,
    selected_account_id UUID REFERENCES receive_accounts(id),
    match_score INTEGER,
    match_reason TEXT,
    matching_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_account_matching_logs_recharge_order_id ON account_matching_logs(recharge_order_id);
CREATE INDEX idx_account_matching_logs_merchant_id ON account_matching_logs(merchant_id);
CREATE INDEX idx_account_matching_logs_selected_account_id ON account_matching_logs(selected_account_id);
CREATE INDEX idx_account_matching_logs_matching_strategy ON account_matching_logs(matching_strategy);
CREATE INDEX idx_account_matching_logs_created_at ON account_matching_logs(created_at);

-- Add comments
COMMENT ON TABLE account_matching_logs IS '账号匹配日志表';
COMMENT ON COLUMN account_matching_logs.id IS '日志ID';
COMMENT ON COLUMN account_matching_logs.recharge_order_id IS '充值订单ID';
COMMENT ON COLUMN account_matching_logs.merchant_id IS '商户ID';
COMMENT ON COLUMN account_matching_logs.payment_type IS '付款类型';
COMMENT ON COLUMN account_matching_logs.requested_amount IS '请求金额';
COMMENT ON COLUMN account_matching_logs.matching_strategy IS '匹配策略';
COMMENT ON COLUMN account_matching_logs.available_accounts IS '可用账号列表';
COMMENT ON COLUMN account_matching_logs.selected_account_id IS '选中的账号ID';
COMMENT ON COLUMN account_matching_logs.match_score IS '匹配得分';
COMMENT ON COLUMN account_matching_logs.match_reason IS '匹配原因';
COMMENT ON COLUMN account_matching_logs.matching_duration_ms IS '匹配耗时（毫秒）';

COMMIT;