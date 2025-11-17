-- 多域名故障转移系统数据库表
-- 创建时间: 2025-01-23
-- 描述: 支持多域名和多支付网关的故障转移机制

-- ================== 域名配置表 ==================
CREATE TABLE IF NOT EXISTS domain_config (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '域名配置ID',
    domain_name VARCHAR(255) NOT NULL UNIQUE COMMENT '域名地址',
    domain_type ENUM('primary', 'backup') DEFAULT 'backup' COMMENT '域名类型: primary=主域名, backup=备用域名',
    is_active BOOLEAN DEFAULT true COMMENT '是否启用',
    priority INT DEFAULT 0 COMMENT '优先级(数字越小优先级越高)',
    health_check_url VARCHAR(512) COMMENT '健康检查URL',
    health_check_interval INT DEFAULT 30 COMMENT '健康检查间隔(秒)',
    timeout_seconds INT DEFAULT 10 COMMENT '健康检查超时时间(秒)',
    failure_threshold INT DEFAULT 3 COMMENT '连续失败次数阈值',
    success_threshold INT DEFAULT 2 COMMENT '连续成功次数阈值(恢复判定)',
    last_check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后检查时间',
    last_success_time TIMESTAMP NULL COMMENT '最后成功时间',
    consecutive_failures INT DEFAULT 0 COMMENT '连续失败次数',
    consecutive_successes INT DEFAULT 0 COMMENT '连续成功次数',
    status ENUM('online', 'offline', 'checking', 'maintenance') DEFAULT 'checking' COMMENT '域名状态',
    ssl_check BOOLEAN DEFAULT true COMMENT '是否检查SSL证书',
    ssl_expiry_date DATE NULL COMMENT 'SSL证书过期时间',
    response_time_ms INT DEFAULT 0 COMMENT '平均响应时间(毫秒)',
    description TEXT COMMENT '域名描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_domain_type (domain_type),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_is_active (is_active),
    INDEX idx_last_check_time (last_check_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='域名配置表';

-- ================== 支付网关配置表 ==================
CREATE TABLE IF NOT EXISTS payment_gateway_config (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '网关配置ID',
    gateway_name VARCHAR(100) NOT NULL COMMENT '网关名称',
    gateway_code VARCHAR(50) NOT NULL UNIQUE COMMENT '网关代码(唯一标识)',
    gateway_url VARCHAR(512) NOT NULL COMMENT '网关接口URL',
    gateway_type ENUM('primary', 'backup') DEFAULT 'backup' COMMENT '网关类型',
    is_active BOOLEAN DEFAULT true COMMENT '是否启用',
    priority INT DEFAULT 0 COMMENT '优先级(数字越小优先级越高)',
    weight INT DEFAULT 100 COMMENT '负载均衡权重',
    timeout_seconds INT DEFAULT 30 COMMENT '请求超时时间(秒)',
    retry_count INT DEFAULT 3 COMMENT '重试次数',
    health_check_interval INT DEFAULT 60 COMMENT '健康检查间隔(秒)',
    failure_threshold INT DEFAULT 5 COMMENT '连续失败次数阈值',
    success_threshold INT DEFAULT 3 COMMENT '连续成功次数阈值',

    -- 网关认证信息
    api_key VARCHAR(512) COMMENT 'API密钥',
    api_secret VARCHAR(512) COMMENT 'API密钥',
    merchant_id VARCHAR(100) COMMENT '商户ID',
    app_id VARCHAR(100) COMMENT '应用ID',

    -- 支付配置
    supported_currencies JSON COMMENT '支持的货币类型',
    min_amount DECIMAL(15,2) DEFAULT 0.01 COMMENT '最小支付金额',
    max_amount DECIMAL(15,2) DEFAULT 999999.99 COMMENT '最大支付金额',
    fee_rate DECIMAL(5,4) DEFAULT 0.0000 COMMENT '手续费率',

    -- 状态监控
    last_check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后检查时间',
    last_success_time TIMESTAMP NULL COMMENT '最后成功时间',
    consecutive_failures INT DEFAULT 0 COMMENT '连续失败次数',
    consecutive_successes INT DEFAULT 0 COMMENT '连续成功次数',
    status ENUM('online', 'offline', 'checking', 'maintenance') DEFAULT 'checking' COMMENT '网关状态',
    response_time_ms INT DEFAULT 0 COMMENT '平均响应时间(毫秒)',
    success_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '成功率百分比',

    -- 统计信息
    total_requests INT DEFAULT 0 COMMENT '总请求数',
    successful_requests INT DEFAULT 0 COMMENT '成功请求数',
    failed_requests INT DEFAULT 0 COMMENT '失败请求数',
    last_error_message TEXT COMMENT '最后错误信息',

    description TEXT COMMENT '网关描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_gateway_type (gateway_type),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_is_active (is_active),
    INDEX idx_gateway_code (gateway_code),
    INDEX idx_last_check_time (last_check_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付网关配置表';

-- ================== 故障转移日志表 ==================
CREATE TABLE IF NOT EXISTS failover_logs (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    event_type ENUM('domain_switch', 'gateway_switch', 'domain_recovery', 'gateway_recovery') NOT NULL COMMENT '事件类型',
    event_level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info' COMMENT '事件级别',

    -- 转移相关信息
    from_target VARCHAR(255) COMMENT '切换前目标(域名或网关)',
    to_target VARCHAR(255) COMMENT '切换后目标(域名或网关)',
    from_target_id INT COMMENT '切换前目标ID',
    to_target_id INT COMMENT '切换后目标ID',

    -- 故障信息
    failure_reason TEXT COMMENT '故障原因',
    error_message TEXT COMMENT '错误信息',
    failure_count INT DEFAULT 0 COMMENT '失败次数',
    response_time_ms INT COMMENT '响应时间(毫秒)',

    -- 切换控制
    auto_switch BOOLEAN DEFAULT true COMMENT '是否自动切换',
    switch_success BOOLEAN DEFAULT true COMMENT '切换是否成功',
    rollback_available BOOLEAN DEFAULT false COMMENT '是否可以回滚',

    -- 影响范围
    affected_users INT DEFAULT 0 COMMENT '影响用户数',
    downtime_seconds INT DEFAULT 0 COMMENT '故障时长(秒)',

    -- 操作信息
    operator_id INT COMMENT '操作员ID',
    operator_name VARCHAR(100) COMMENT '操作员姓名',
    client_ip VARCHAR(45) COMMENT '客户端IP',
    user_agent VARCHAR(500) COMMENT '用户代理',

    -- 附加信息
    additional_info JSON COMMENT '附加信息(JSON格式)',
    tags VARCHAR(500) COMMENT '标签(逗号分隔)',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_event_type (event_type),
    INDEX idx_event_level (event_level),
    INDEX idx_auto_switch (auto_switch),
    INDEX idx_created_at (created_at),
    INDEX idx_from_target (from_target),
    INDEX idx_to_target (to_target),
    INDEX idx_operator_id (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故障转移日志表';

-- ================== 健康检查记录表 ==================
CREATE TABLE IF NOT EXISTS health_check_records (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    target_type ENUM('domain', 'gateway') NOT NULL COMMENT '检查目标类型',
    target_id INT NOT NULL COMMENT '目标ID',
    target_name VARCHAR(255) NOT NULL COMMENT '目标名称',
    check_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '检查时间',
    response_time_ms INT DEFAULT 0 COMMENT '响应时间(毫秒)',
    status_code INT COMMENT 'HTTP状态码',
    is_success BOOLEAN DEFAULT false COMMENT '检查是否成功',
    error_message TEXT COMMENT '错误信息',
    response_size INT DEFAULT 0 COMMENT '响应大小(字节)',
    dns_resolution_time_ms INT DEFAULT 0 COMMENT 'DNS解析时间(毫秒)',
    tcp_connection_time_ms INT DEFAULT 0 COMMENT 'TCP连接时间(毫秒)',
    ssl_handshake_time_ms INT DEFAULT 0 COMMENT 'SSL握手时间(毫秒)',
    additional_metrics JSON COMMENT '附加指标(JSON格式)',

    INDEX idx_target_type_id (target_type, target_id),
    INDEX idx_check_time (check_time),
    INDEX idx_is_success (is_success),
    INDEX idx_target_name (target_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康检查记录表';

-- ================== 系统配置表扩展 ==================
CREATE TABLE IF NOT EXISTS system_failover_config (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'int', 'float', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description TEXT COMMENT '配置描述',
    is_active BOOLEAN DEFAULT true COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_config_key (config_key),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故障转移系统配置表';

-- ================== 插入默认配置数据 ==================

-- 插入默认域名配置
INSERT INTO domain_config (domain_name, domain_type, priority, health_check_url, description) VALUES
('pay.cjpayment.com', 'primary', 0, 'https://pay.cjpayment.com/health', '主域名'),
('backup1.cjpayment.com', 'backup', 1, 'https://backup1.cjpayment.com/health', '备用域名1'),
('backup2.cjpayment.com', 'backup', 2, 'https://backup2.cjpayment.com/health', '备用域名2')
ON DUPLICATE KEY UPDATE domain_name=domain_name;

-- 插入默认支付网关配置
INSERT INTO payment_gateway_config (
    gateway_name, gateway_code, gateway_url, gateway_type, priority, weight,
    supported_currencies, min_amount, max_amount, description
) VALUES
(
    '主支付网关', 'primary_gateway', 'https://api.payment.com/v1/pay', 'primary', 0, 100,
    '["CNY", "USD"]', 0.01, 999999.99, '主要支付网关'
),
(
    '备用支付网关1', 'backup_gateway_1', 'https://backup1.payment.com/v1/pay', 'backup', 1, 80,
    '["CNY", "USD"]', 0.01, 999999.99, '备用支付网关1'
),
(
    '备用支付网关2', 'backup_gateway_2', 'https://backup2.payment.com/v1/pay', 'backup', 2, 60,
    '["CNY"]', 0.01, 999999.99, '备用支付网关2'
)
ON DUPLICATE KEY UPDATE gateway_code=gateway_code;

-- 插入默认系统配置
INSERT INTO system_failover_config (config_key, config_value, config_type, description) VALUES
('domain_health_check_enabled', 'true', 'boolean', '是否启用域名健康检查'),
('gateway_health_check_enabled', 'true', 'boolean', '是否启用网关健康检查'),
('auto_failover_enabled', 'true', 'boolean', '是否启用自动故障转移'),
('health_check_interval', '30', 'int', '健康检查间隔(秒)'),
('failure_threshold', '3', 'int', '故障判定阈值'),
('max_concurrent_checks', '10', 'int', '最大并发检查数'),
('log_retention_days', '30', 'int', '日志保留天数'),
('notification_enabled', 'true', 'boolean', '是否启用故障通知'),
('webhook_url', '', 'string', '故障通知Webhook URL')
ON DUPLICATE KEY UPDATE config_key=config_key;

COMMIT;