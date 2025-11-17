-- =====================================================
-- CJPayment 充值系统数据表创建脚本
-- 创建时间: 2025-08-28
-- =====================================================

-- 1. 商户信息表
CREATE TABLE IF NOT EXISTS merchants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    account_id VARCHAR(64) NOT NULL COMMENT '账户ID',
    company_name VARCHAR(255) NOT NULL COMMENT '开户主体',
    agent_id VARCHAR(64) NULL COMMENT '代理商ID',
    agent_name VARCHAR(255) NULL COMMENT '代理商名称',
    rebate_policy DECIMAL(10,4) DEFAULT 1.0000 COMMENT '返点政策',
    account_status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '账户状态',
    link_type ENUM('general', 'dedicated') DEFAULT 'general' COMMENT '充值链接类型',
    dedicated_link VARCHAR(500) NULL COMMENT '专用充值链接',
    remarks TEXT NULL COMMENT '备注信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_account_id (account_id),
    INDEX idx_company_name (company_name),
    INDEX idx_agent_id (agent_id),
    INDEX idx_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户信息表';

-- 2. 收款账户表
CREATE TABLE IF NOT EXISTS payment_accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    account_number VARCHAR(255) NOT NULL COMMENT '收款账号',
    institution_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '账户机构类型',
    institution_name VARCHAR(255) NOT NULL COMMENT '账户机构名称',
    account_name VARCHAR(255) NOT NULL COMMENT '账户名称',
    payment_type ENUM('business', 'personal') NOT NULL COMMENT '收款类型:对公/对私',
    daily_limit DECIMAL(15,2) DEFAULT 999999999.99 COMMENT '日限额',
    single_limit DECIMAL(15,2) DEFAULT 999999999.99 COMMENT '单笔限额',
    bank_branch VARCHAR(255) NULL COMMENT '开户行支行(银行专用)',
    account_status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '账户状态',
    remarks TEXT NULL COMMENT '备注信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_institution_type (institution_type),
    INDEX idx_payment_type (payment_type),
    INDEX idx_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收款账户表';

-- 3. 轮询规则表
CREATE TABLE IF NOT EXISTS polling_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    rule_name VARCHAR(255) NOT NULL COMMENT '规则名称',
    payment_type ENUM('business', 'personal') NOT NULL COMMENT '支付类型',
    rule_type ENUM('round_robin', 'weight', 'amount_based') DEFAULT 'round_robin' COMMENT '轮询类型',
    rule_config JSON NOT NULL COMMENT '轮询规则配置',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '规则状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_payment_type (payment_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轮询规则表';

-- 4. 轮询规则账户关联表
CREATE TABLE IF NOT EXISTS polling_rule_accounts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    rule_id BIGINT NOT NULL COMMENT '规则ID',
    account_id BIGINT NOT NULL COMMENT '收款账户ID',
    weight INT DEFAULT 1 COMMENT '权重',
    priority INT DEFAULT 0 COMMENT '优先级',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    FOREIGN KEY (rule_id) REFERENCES polling_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES payment_accounts(id) ON DELETE CASCADE,
    INDEX idx_rule_id (rule_id),
    INDEX idx_account_id (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轮询规则账户关联表';

-- 5. 充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    order_number VARCHAR(18) UNIQUE NOT NULL COMMENT '订单号',
    merchant_id BIGINT NOT NULL COMMENT '商户ID',
    account_id VARCHAR(64) NOT NULL COMMENT '账户ID',
    company_name VARCHAR(255) NOT NULL COMMENT '开户主体',
    
    -- 付款信息
    payer_account VARCHAR(255) NOT NULL COMMENT '付款账号',
    payer_name VARCHAR(255) NOT NULL COMMENT '付款姓名',
    payer_institution_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '付款机构类型',
    payer_institution_name VARCHAR(255) NOT NULL COMMENT '付款机构名称',
    payment_amount DECIMAL(15,2) NOT NULL COMMENT '付款金额',
    payment_type ENUM('business', 'personal') NOT NULL COMMENT '付款类型',
    
    -- 收款信息
    receiver_account_id BIGINT NOT NULL COMMENT '收款账户ID',
    receiver_account VARCHAR(255) NOT NULL COMMENT '收款账号',
    receiver_name VARCHAR(255) NOT NULL COMMENT '收款账户名称',
    receiver_institution_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '收款机构类型',
    receiver_institution_name VARCHAR(255) NOT NULL COMMENT '收款机构名称',
    
    -- 状态信息
    order_status ENUM('pending', 'paid', 'confirmed', 'success', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    audit_status ENUM('unaudited', 'confirmed', 'rejected') DEFAULT 'unaudited' COMMENT '审核状态',
    
    -- 凭证信息
    payment_proof VARCHAR(500) NULL COMMENT '付款凭证路径',
    gateway_response JSON NULL COMMENT '网关返回信息',
    
    -- 时间信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    paid_at TIMESTAMP NULL COMMENT '付款时间',
    confirmed_at TIMESTAMP NULL COMMENT '确认时间',
    
    -- 账户币相关
    rebate_policy DECIMAL(10,4) NOT NULL COMMENT '返点政策',
    account_currency_amount DECIMAL(15,2) NULL COMMENT '账户币加值金额',
    
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    FOREIGN KEY (receiver_account_id) REFERENCES payment_accounts(id),
    INDEX idx_order_number (order_number),
    INDEX idx_account_id (account_id),
    INDEX idx_order_status (order_status),
    INDEX idx_audit_status (audit_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值订单表';

-- 6. 账户余额表
CREATE TABLE IF NOT EXISTS account_balances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    account_id VARCHAR(64) UNIQUE NOT NULL COMMENT '账户ID',
    available_balance DECIMAL(15,2) DEFAULT 0.00 COMMENT '可用余额',
    frozen_balance DECIMAL(15,2) DEFAULT 0.00 COMMENT '冻结余额',
    total_balance DECIMAL(15,2) DEFAULT 0.00 COMMENT '总余额',
    total_recharge DECIMAL(15,2) DEFAULT 0.00 COMMENT '累计充值',
    total_consume DECIMAL(15,2) DEFAULT 0.00 COMMENT '累计消费',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    
    INDEX idx_account_id (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账户余额表';

-- 7. 余额变更记录表
CREATE TABLE IF NOT EXISTS balance_changes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    account_id VARCHAR(64) NOT NULL COMMENT '账户ID',
    order_number VARCHAR(18) NULL COMMENT '关联订单号',
    change_type ENUM('recharge', 'consume', 'freeze', 'unfreeze', 'refund') NOT NULL COMMENT '变更类型',
    amount DECIMAL(15,2) NOT NULL COMMENT '变更金额',
    balance_before DECIMAL(15,2) NOT NULL COMMENT '变更前余额',
    balance_after DECIMAL(15,2) NOT NULL COMMENT '变更后余额',
    remark VARCHAR(500) NULL COMMENT '变更备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_account_id (account_id),
    INDEX idx_order_number (order_number),
    INDEX idx_change_type (change_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='余额变更记录表';

-- 8. 机器人通知记录表
CREATE TABLE IF NOT EXISTS bot_notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    order_number VARCHAR(18) NOT NULL COMMENT '订单号',
    account_id VARCHAR(64) NOT NULL COMMENT '账户ID',
    notification_type ENUM('feishu', 'wechat_work') NOT NULL COMMENT '通知类型',
    group_id VARCHAR(255) NOT NULL COMMENT '群组ID',
    message_content TEXT NOT NULL COMMENT '消息内容',
    send_status ENUM('pending', 'success', 'failed') DEFAULT 'pending' COMMENT '发送状态',
    response_data JSON NULL COMMENT '响应数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    sent_at TIMESTAMP NULL COMMENT '发送时间',
    
    INDEX idx_order_number (order_number),
    INDEX idx_account_id (account_id),
    INDEX idx_send_status (send_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人通知记录表';

-- 9. 充值链接统计表
CREATE TABLE IF NOT EXISTS recharge_link_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    link_type ENUM('general', 'dedicated') NOT NULL COMMENT '链接类型',
    link_identifier VARCHAR(255) NOT NULL COMMENT '链接标识(通用链接为"general"，专用链接为merchant_id)',
    company_name VARCHAR(255) NULL COMMENT '开户主体(专用链接)',
    visit_count INT DEFAULT 0 COMMENT '访问次数',
    order_count INT DEFAULT 0 COMMENT '订单数量',
    success_count INT DEFAULT 0 COMMENT '成功订单数',
    total_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT '总金额',
    success_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT '成功金额',
    last_visit TIMESTAMP NULL COMMENT '最后访问时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY uk_link (link_type, link_identifier),
    INDEX idx_link_type (link_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值链接统计表';

-- 10. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT NOT NULL COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description VARCHAR(500) NULL COMMENT '配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认配置
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('general_recharge_url', 'https://pay.cjpayment.com/recharge', 'string', '通用充值链接'),
('feishu_app_id', '', 'string', '飞书应用ID'),
('feishu_app_secret', '', 'string', '飞书应用密钥'),
('wechat_work_corp_id', '', 'string', '企业微信企业ID'),
('wechat_work_agent_id', '', 'string', '企业微信应用ID'),
('wechat_work_secret', '', 'string', '企业微信应用密钥'),
('max_upload_size', '10485760', 'number', '最大上传文件大小(字节)'),
('order_expire_time', '86400', 'number', '订单过期时间(秒)');

-- 创建订单号序列表
CREATE TABLE IF NOT EXISTS order_sequences (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    date_key VARCHAR(8) UNIQUE NOT NULL COMMENT '日期键(YYMMDD)',
    sequence_number INT DEFAULT 0 COMMENT '当日序列号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单号序列表';