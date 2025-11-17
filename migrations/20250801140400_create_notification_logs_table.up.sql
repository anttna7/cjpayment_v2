-- Create notification_logs table
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recharge_order_id UUID REFERENCES recharge_orders(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    request_headers JSONB,
    request_body TEXT,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed, max_retries_exceeded
    error_message TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notification_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_recharge_order_id ON notification_logs(recharge_order_id);
CREATE INDEX idx_notification_logs_event_type ON notification_logs(event_type);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_next_retry_at ON notification_logs(next_retry_at);

-- Add comments
COMMENT ON TABLE notification_logs IS '通知发送日志表';
COMMENT ON COLUMN notification_logs.id IS '日志ID';
COMMENT ON COLUMN notification_logs.notification_id IS '通知配置ID';
COMMENT ON COLUMN notification_logs.recharge_order_id IS '关联的充值订单ID';
COMMENT ON COLUMN notification_logs.event_type IS '事件类型';
COMMENT ON COLUMN notification_logs.target_url IS '目标URL';
COMMENT ON COLUMN notification_logs.request_headers IS '请求头';
COMMENT ON COLUMN notification_logs.request_body IS '请求体';
COMMENT ON COLUMN notification_logs.response_status IS '响应状态码';
COMMENT ON COLUMN notification_logs.response_headers IS '响应头';
COMMENT ON COLUMN notification_logs.response_body IS '响应体';
COMMENT ON COLUMN notification_logs.execution_time_ms IS '执行时间（毫秒）';
COMMENT ON COLUMN notification_logs.retry_count IS '重试次数';
COMMENT ON COLUMN notification_logs.max_retries IS '最大重试次数';
COMMENT ON COLUMN notification_logs.status IS '发送状态';
COMMENT ON COLUMN notification_logs.error_message IS '错误信息';
COMMENT ON COLUMN notification_logs.next_retry_at IS '下次重试时间';