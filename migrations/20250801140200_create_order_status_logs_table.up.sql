-- Create order_status_logs table
CREATE TABLE order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recharge_order_id UUID NOT NULL REFERENCES recharge_orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_reason TEXT,
    operator_id UUID REFERENCES users(id),
    operator_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_order_status_logs_recharge_order_id ON order_status_logs(recharge_order_id);
CREATE INDEX idx_order_status_logs_new_status ON order_status_logs(new_status);
CREATE INDEX idx_order_status_logs_created_at ON order_status_logs(created_at);
CREATE INDEX idx_order_status_logs_operator_id ON order_status_logs(operator_id);

-- Add comments
COMMENT ON TABLE order_status_logs IS '订单状态变更日志表';
COMMENT ON COLUMN order_status_logs.id IS '日志ID';
COMMENT ON COLUMN order_status_logs.recharge_order_id IS '充值订单ID';
COMMENT ON COLUMN order_status_logs.previous_status IS '变更前状态';
COMMENT ON COLUMN order_status_logs.new_status IS '变更后状态';
COMMENT ON COLUMN order_status_logs.status_reason IS '状态变更原因';
COMMENT ON COLUMN order_status_logs.operator_id IS '操作人员ID';
COMMENT ON COLUMN order_status_logs.operator_name IS '操作人员姓名';
COMMENT ON COLUMN order_status_logs.created_at IS '创建时间';