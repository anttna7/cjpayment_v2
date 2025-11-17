-- 充值系统数据库表结构设计

-- 1. 商户信息表
CREATE TABLE IF NOT EXISTS merchants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_id VARCHAR(32) UNIQUE NOT NULL COMMENT '商户ID，自动生成',
    merchant_name VARCHAR(100) NOT NULL COMMENT '商户名称',
    recharge_link VARCHAR(255) NOT NULL COMMENT '充值链接，自动生成',
    status ENUM('pending', 'active', 'disabled') DEFAULT 'pending' COMMENT '状态：待审核、启用、禁用',
    description TEXT COMMENT '商户描述',
    contact_person VARCHAR(50) COMMENT '联系人',
    contact_phone VARCHAR(20) COMMENT '联系方式',
    industry VARCHAR(50) COMMENT '行业',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remarks TEXT COMMENT '备注',
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户信息表';

-- 2. 广告账户表
CREATE TABLE IF NOT EXISTS ad_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    merchant_id VARCHAR(32) NOT NULL COMMENT '关联商户ID',
    ad_account_id VARCHAR(50) NOT NULL COMMENT '广告账户ID',
    ad_account_name VARCHAR(100) NOT NULL COMMENT '广告账户名称',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_merchant_ad_account (merchant_id, ad_account_id),
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_ad_account_id (ad_account_id),
    FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='广告账户表';

-- 3. 付款账户表
CREATE TABLE IF NOT EXISTS payment_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL COMMENT '付款账户名称',
    account_number VARCHAR(50) NOT NULL COMMENT '付款账号',
    account_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '账户机构',
    bank_name VARCHAR(50) COMMENT '银行名称（账户类型为银行时）',
    bank_branch VARCHAR(100) COMMENT '开户行信息',
    merchant_id VARCHAR(32) NOT NULL COMMENT '关联商户ID',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remarks TEXT COMMENT '备注信息',
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_account_number (account_number),
    INDEX idx_status (status),
    FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='付款账户表';

-- 4. 收款账户表
CREATE TABLE IF NOT EXISTS receive_accounts_new (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL COMMENT '收款账户名称',
    account_number VARCHAR(50) NOT NULL UNIQUE COMMENT '收款账号',
    account_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '账户机构',
    bank_name VARCHAR(50) COMMENT '银行名称（账户类型为银行时）',
    bank_branch VARCHAR(100) COMMENT '开户行信息',
    daily_limit DECIMAL(15,2) DEFAULT NULL COMMENT '单日限额（NULL表示无限制）',
    single_limit DECIMAL(15,2) DEFAULT NULL COMMENT '单笔限额（NULL表示无限制）',
    daily_received DECIMAL(15,2) DEFAULT 0.00 COMMENT '今日已收款',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态：启用、禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remarks TEXT COMMENT '备注信息',
    INDEX idx_account_number (account_number),
    INDEX idx_account_type (account_type),
    INDEX idx_status (status),
    INDEX idx_daily_received (daily_received)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收款账户表';

-- 5. 充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders_new (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(32) UNIQUE NOT NULL COMMENT '订单号，自动生成',
    bank_voucher_number VARCHAR(50) COMMENT '银行凭证号',
    amount DECIMAL(15,2) NOT NULL COMMENT '交易金额',
    merchant_id VARCHAR(32) NOT NULL COMMENT '商户ID',
    merchant_name VARCHAR(100) NOT NULL COMMENT '商户名称',
    ad_account_id VARCHAR(50) NOT NULL COMMENT '广告账户ID',
    ad_account_name VARCHAR(100) NOT NULL COMMENT '广告账户名称',
    payer_name VARCHAR(100) NOT NULL COMMENT '付款账户名称',
    payer_account VARCHAR(50) NOT NULL COMMENT '付款账号',
    payer_account_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '付款账户机构',
    payer_bank_name VARCHAR(50) COMMENT '付款银行名称',
    payee_name VARCHAR(100) NOT NULL COMMENT '收款账户名称',
    payee_account VARCHAR(50) NOT NULL COMMENT '收款账号',
    payee_account_type ENUM('bank', 'alipay', 'wechat', 'other') NOT NULL COMMENT '收款账户机构',
    payee_bank_name VARCHAR(50) COMMENT '收款银行名称',
    business_type ENUM('corporate', 'personal') NOT NULL COMMENT '业务类别：对公、对私',
    status ENUM('pending', 'success', 'failed', 'reviewing') DEFAULT 'pending' COMMENT '状态',
    payment_voucher_url VARCHAR(255) COMMENT '付款凭证URL（对私转账）',
    bank_callback_data JSON COMMENT '银行回调数据（对公转账）',
    external_notify_status ENUM('pending', 'success', 'failed') DEFAULT 'pending' COMMENT '外部系统通知状态',
    external_notify_data JSON COMMENT '外部系统通知数据',
    audit_status ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending' COMMENT '财务审核状态',
    audit_time TIMESTAMP NULL COMMENT '审核时间',
    audit_user VARCHAR(50) COMMENT '审核人员',
    audit_remarks TEXT COMMENT '审核备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    success_at TIMESTAMP NULL COMMENT '成功时间',
    INDEX idx_order_number (order_number),
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_status (status),
    INDEX idx_audit_status (audit_status),
    INDEX idx_created_at (created_at),
    INDEX idx_amount (amount),
    FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值订单表';

-- 6. 轮询规则表（扩展）
CREATE TABLE IF NOT EXISTS polling_rules_new (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    merchant_id VARCHAR(32) COMMENT '关联商户ID（NULL表示全局规则）',
    priority INT DEFAULT 1 COMMENT '优先级（数字越大优先级越高）',
    conditions JSON COMMENT '匹配条件（JSON格式）',
    allocation_strategy ENUM('weight', 'sequence', 'amount', 'priority') NOT NULL COMMENT '分配策略',
    allocation_config JSON NOT NULL COMMENT '分配配置（JSON格式）',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    FOREIGN KEY (merchant_id) REFERENCES merchants(merchant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮询规则表';

-- 7. 银行名称字典表
CREATE TABLE IF NOT EXISTS bank_dictionary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_code VARCHAR(20) UNIQUE NOT NULL COMMENT '银行代码',
    bank_name VARCHAR(100) NOT NULL COMMENT '银行名称',
    bank_short_name VARCHAR(20) COMMENT '银行简称',
    status ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_bank_code (bank_code),
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='银行名称字典表';

-- 8. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description VARCHAR(255) COMMENT '配置描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 初始化银行数据
INSERT INTO bank_dictionary (bank_code, bank_name, bank_short_name, sort_order) VALUES
('ICBC', '中国工商银行', '工商银行', 1),
('ABC', '中国农业银行', '农业银行', 2),
('BOC', '中国银行', '中国银行', 3),
('CCB', '中国建设银行', '建设银行', 4),
('COMM', '交通银行', '交通银行', 5),
('CMB', '招商银行', '招商银行', 6),
('CITIC', '中信银行', '中信银行', 7),
('CEB', '光大银行', '光大银行', 8),
('CMBC', '中国民生银行', '民生银行', 9),
('PAB', '平安银行', '平安银行', 10),
('SPB', '上海浦东发展银行', '浦发银行', 11),
('CIB', '兴业银行', '兴业银行', 12),
('HXB', '华夏银行', '华夏银行', 13),
('GDB', '广发银行', '广发银行', 14),
('BSB', '包商银行', '包商银行', 15);

-- 初始化系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description) VALUES
('recharge_link_prefix', 'https://pay.cjpayment.com/recharge/', 'string', '充值链接前缀'),
('max_daily_amount', '1000000.00', 'number', '单日最大充值金额'),
('max_single_amount', '100000.00', 'number', '单笔最大充值金额'),
('external_notify_url', 'https://api.accounts.com/notify/recharge', 'string', '外部系统通知URL'),
('auto_audit_threshold', '1000.00', 'number', '自动审核阈值金额');