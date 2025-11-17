-- Create export schedules table for automated data exports
CREATE TABLE IF NOT EXISTS export_schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '任务名称',
    description VARCHAR(500) COMMENT '任务描述',
    export_type VARCHAR(50) NOT NULL COMMENT '导出类型: daily, weekly, monthly',
    schedule VARCHAR(100) NOT NULL COMMENT '调度表达式',
    merchant_id BIGINT UNSIGNED NULL COMMENT '商户ID，NULL表示全部商户',
    status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active, inactive',
    email_list VARCHAR(1000) COMMENT '接收邮箱列表，逗号分隔',
    last_run_at TIMESTAMP NULL COMMENT '上次执行时间',
    next_run_at TIMESTAMP NULL COMMENT '下次执行时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_export_schedules_status (status),
    INDEX idx_export_schedules_export_type (export_type),
    INDEX idx_export_schedules_next_run (next_run_at),
    INDEX idx_export_schedules_merchant_id (merchant_id),
    
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导出调度表';