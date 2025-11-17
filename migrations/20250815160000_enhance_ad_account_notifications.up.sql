-- 增强广告账户通知功能相关表
-- 广告账户通知配置表和实时监控表

-- 广告账户通知配置表
CREATE TABLE ad_account_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_name VARCHAR(100) NOT NULL,
    ad_account_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- 通知配置
    webhook_url VARCHAR(500) NOT NULL,
    webhook_secret VARCHAR(100),
    backup_webhook_url VARCHAR(500), -- 备用webhook地址
    
    -- 通知事件配置
    enabled_events TEXT[] DEFAULT '{"recharge_created","recharge_paid","recharge_confirmed","recharge_failed"}',
    
    -- 重试策略
    max_retries INTEGER DEFAULT 5,
    retry_interval_seconds INTEGER DEFAULT 60,
    exponential_backoff BOOLEAN DEFAULT true,
    max_retry_interval_seconds INTEGER DEFAULT 3600,
    
    -- 超时配置
    timeout_seconds INTEGER DEFAULT 30,
    
    -- 通知格式
    notification_format VARCHAR(20) DEFAULT 'json', -- json/xml/form
    custom_headers JSONB,
    
    -- 状态和监控
    is_active BOOLEAN DEFAULT true,
    last_notification_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    total_notifications INTEGER DEFAULT 0,
    
    -- 健康检查
    health_check_enabled BOOLEAN DEFAULT true,
    health_check_url VARCHAR(500),
    health_check_interval_minutes INTEGER DEFAULT 30,
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(20) DEFAULT 'unknown', -- healthy/unhealthy/unknown
    
    -- 联系信息
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 广告账户通知日志增强表
CREATE TABLE ad_account_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_account_notification_id UUID REFERENCES ad_account_notifications(id) ON DELETE CASCADE,
    recharge_order_id UUID REFERENCES recharge_orders(id) ON DELETE CASCADE,
    
    -- 事件信息
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    
    -- 请求信息
    target_url VARCHAR(500) NOT NULL,
    request_method VARCHAR(10) DEFAULT 'POST',
    request_headers JSONB,
    request_body TEXT,
    
    -- 响应信息
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    execution_time_ms INTEGER,
    
    -- 重试信息
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- 状态和结果
    status VARCHAR(20) DEFAULT 'pending', -- pending/processing/success/failed/max_retries_exceeded
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- 签名和安全
    webhook_signature VARCHAR(200),
    is_signature_valid BOOLEAN,
    
    -- 时间信息
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 实时通知监控表
CREATE TABLE notification_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 监控目标
    target_type VARCHAR(20) NOT NULL, -- ad_account/webhook/endpoint
    target_id UUID NOT NULL, -- 关联的目标ID
    target_name VARCHAR(100) NOT NULL,
    
    -- 监控指标
    total_notifications INTEGER DEFAULT 0,
    successful_notifications INTEGER DEFAULT 0,
    failed_notifications INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2) DEFAULT 0,
    
    -- 近期统计（过去24小时）
    recent_notifications_24h INTEGER DEFAULT 0,
    recent_successes_24h INTEGER DEFAULT 0,
    recent_failures_24h INTEGER DEFAULT 0,
    recent_avg_response_ms DECIMAL(10,2) DEFAULT 0,
    
    -- 状态指标
    current_status VARCHAR(20) DEFAULT 'healthy', -- healthy/warning/critical/unknown
    last_notification_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- 健康检查
    health_check_status VARCHAR(20) DEFAULT 'unknown',
    last_health_check_at TIMESTAMP WITH TIME ZONE,
    health_check_response_time_ms INTEGER,
    
    -- 告警信息
    alert_threshold_failures INTEGER DEFAULT 5,
    alert_threshold_response_time_ms INTEGER DEFAULT 5000,
    is_alerting BOOLEAN DEFAULT false,
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- 时间信息
    monitoring_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知模板增强表
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 模板基本信息
    name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) NOT NULL, -- webhook/email/sms/realtime
    event_type VARCHAR(50) NOT NULL,
    
    -- 模板内容
    subject_template TEXT, -- 用于邮件主题或通知标题
    body_template TEXT NOT NULL,
    
    -- 格式配置
    content_type VARCHAR(50) DEFAULT 'application/json',
    template_engine VARCHAR(20) DEFAULT 'go_template', -- go_template/mustache/jinja2
    
    -- 变量定义
    template_variables JSONB, -- 可用变量定义和描述
    sample_data JSONB, -- 示例数据
    
    -- 验证和测试
    is_validated BOOLEAN DEFAULT false,
    validation_errors TEXT[],
    test_results JSONB,
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 版本管理
    version VARCHAR(20) DEFAULT '1.0.0',
    parent_template_id UUID REFERENCES notification_templates(id),
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 通知队列表（用于批量和定时通知）
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 队列信息
    queue_name VARCHAR(50) DEFAULT 'default',
    priority INTEGER DEFAULT 5, -- 1-10, 数值越小优先级越高
    
    -- 通知目标
    target_type VARCHAR(20) NOT NULL, -- webhook/email/sms/realtime
    target_identifier VARCHAR(200) NOT NULL, -- URL或接收者标识
    
    -- 通知内容
    notification_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'application/json',
    
    -- 元数据
    metadata JSONB,
    reference_id UUID, -- 关联的业务对象ID
    reference_type VARCHAR(50), -- 业务对象类型
    
    -- 调度信息
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delay_seconds INTEGER DEFAULT 0,
    
    -- 重试配置
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    retry_interval_seconds INTEGER DEFAULT 60,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending', -- pending/processing/sent/failed/cancelled
    
    -- 执行信息
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_result JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_ad_account_notifications_account_id ON ad_account_notifications(ad_account_id);
CREATE INDEX idx_ad_account_notifications_active ON ad_account_notifications(is_active) WHERE is_active = true;
CREATE INDEX idx_ad_account_notifications_health_check ON ad_account_notifications(health_check_enabled, next_health_check_at) WHERE health_check_enabled = true;

CREATE INDEX idx_ad_account_notification_logs_account_id ON ad_account_notification_logs(ad_account_notification_id);
CREATE INDEX idx_ad_account_notification_logs_order_id ON ad_account_notification_logs(recharge_order_id);
CREATE INDEX idx_ad_account_notification_logs_status ON ad_account_notification_logs(status);
CREATE INDEX idx_ad_account_notification_logs_retry ON ad_account_notification_logs(status, next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_ad_account_notification_logs_event_type ON ad_account_notification_logs(event_type);

CREATE INDEX idx_notification_monitoring_target ON notification_monitoring(target_type, target_id);
CREATE INDEX idx_notification_monitoring_status ON notification_monitoring(current_status);
CREATE INDEX idx_notification_monitoring_alerting ON notification_monitoring(is_alerting) WHERE is_alerting = true;

CREATE INDEX idx_notification_templates_type_event ON notification_templates(template_type, event_type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_at, priority) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_retry ON notification_queue(status, next_retry_at) WHERE status = 'failed';

-- 添加计算列索引
CREATE INDEX idx_ad_account_notification_logs_created_date ON ad_account_notification_logs(DATE(created_at));
CREATE INDEX idx_notification_monitoring_target_name ON notification_monitoring(target_name);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_ad_account_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ad_account_notifications_update_trigger
    BEFORE UPDATE ON ad_account_notifications
    FOR EACH ROW EXECUTE FUNCTION update_ad_account_notification_updated_at();

CREATE TRIGGER ad_account_notification_logs_update_trigger
    BEFORE UPDATE ON ad_account_notification_logs
    FOR EACH ROW EXECUTE FUNCTION update_ad_account_notification_updated_at();

CREATE TRIGGER notification_monitoring_update_trigger
    BEFORE UPDATE ON notification_monitoring
    FOR EACH ROW EXECUTE FUNCTION update_ad_account_notification_updated_at();

CREATE TRIGGER notification_templates_update_trigger
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_ad_account_notification_updated_at();

CREATE TRIGGER notification_queue_update_trigger
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_ad_account_notification_updated_at();

-- 添加约束
ALTER TABLE ad_account_notifications ADD CONSTRAINT chk_retry_interval CHECK (retry_interval_seconds > 0);
ALTER TABLE ad_account_notifications ADD CONSTRAINT chk_max_retry_interval CHECK (max_retry_interval_seconds >= retry_interval_seconds);
ALTER TABLE ad_account_notifications ADD CONSTRAINT chk_timeout CHECK (timeout_seconds > 0 AND timeout_seconds <= 300);
ALTER TABLE ad_account_notifications ADD CONSTRAINT chk_health_check_interval CHECK (health_check_interval_minutes > 0);

ALTER TABLE notification_queue ADD CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 10);
ALTER TABLE notification_queue ADD CONSTRAINT chk_delay CHECK (delay_seconds >= 0);

-- 添加注释
COMMENT ON TABLE ad_account_notifications IS '广告账户通知配置表，存储每个广告账户的通知设置';
COMMENT ON COLUMN ad_account_notifications.exponential_backoff IS '是否使用指数退避重试策略';
COMMENT ON COLUMN ad_account_notifications.health_check_enabled IS '是否启用健康检查';

COMMENT ON TABLE ad_account_notification_logs IS '广告账户通知日志表，记录所有通知的发送详情';
COMMENT ON COLUMN ad_account_notification_logs.execution_time_ms IS '通知执行耗时（毫秒）';

COMMENT ON TABLE notification_monitoring IS '通知监控表，实时跟踪通知系统的健康状态和性能指标';
COMMENT ON COLUMN notification_monitoring.consecutive_failures IS '连续失败次数，用于判断系统健康状态';

COMMENT ON TABLE notification_templates IS '通知模板表，支持多种通知类型的模板管理';
COMMENT ON COLUMN notification_templates.template_engine IS '模板引擎类型，支持Go template、Mustache等';

COMMENT ON TABLE notification_queue IS '通知队列表，支持批量通知和定时通知的排队处理';
COMMENT ON COLUMN notification_queue.priority IS '优先级，1-10，数值越小优先级越高';