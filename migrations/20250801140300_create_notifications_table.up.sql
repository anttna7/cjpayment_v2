-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- recharge_success, recharge_failed, recharge_pending, etc.
    target_system VARCHAR(50) NOT NULL, -- ad_account_system, internal_system, etc.
    webhook_url VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    headers JSONB,
    template_body TEXT NOT NULL,
    retry_policy JSONB, -- {max_retries: 3, retry_intervals: [1, 5, 15]}
    timeout_seconds INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_notifications_event_type ON notifications(event_type);
CREATE INDEX idx_notifications_target_system ON notifications(target_system);
CREATE INDEX idx_notifications_is_active ON notifications(is_active);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Add comments
COMMENT ON TABLE notifications IS '通知配置表';
COMMENT ON COLUMN notifications.id IS '通知配置ID';
COMMENT ON COLUMN notifications.name IS '通知配置名称';
COMMENT ON COLUMN notifications.event_type IS '事件类型';
COMMENT ON COLUMN notifications.target_system IS '目标系统';
COMMENT ON COLUMN notifications.webhook_url IS 'Webhook URL';
COMMENT ON COLUMN notifications.http_method IS 'HTTP方法';
COMMENT ON COLUMN notifications.headers IS 'HTTP请求头';
COMMENT ON COLUMN notifications.template_body IS '通知模板内容';
COMMENT ON COLUMN notifications.retry_policy IS '重试策略配置';
COMMENT ON COLUMN notifications.timeout_seconds IS '超时时间（秒）';
COMMENT ON COLUMN notifications.is_active IS '是否启用';