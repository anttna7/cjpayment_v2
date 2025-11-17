-- Migration: create_data_export_logs_table
-- Created at: 2025-08-12 12:05:00
-- Description: Create data_export_logs table for tracking data export operations

BEGIN;

CREATE TABLE data_export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type VARCHAR(50) NOT NULL, -- 'daily_orders', 'merchant_summary', 'custom_query'
    export_format VARCHAR(20) NOT NULL DEFAULT 'excel', -- 'excel', 'csv', 'json'
    date_range_start DATE,
    date_range_end DATE,
    merchant_id UUID REFERENCES merchants(id),
    filter_criteria JSONB DEFAULT '{}',
    total_records INTEGER DEFAULT 0,
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    export_status VARCHAR(20) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    exported_by UUID REFERENCES users(id),
    exported_by_name VARCHAR(100),
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_data_export_logs_export_type ON data_export_logs(export_type);
CREATE INDEX idx_data_export_logs_export_status ON data_export_logs(export_status);
CREATE INDEX idx_data_export_logs_exported_by ON data_export_logs(exported_by);
CREATE INDEX idx_data_export_logs_merchant_id ON data_export_logs(merchant_id);
CREATE INDEX idx_data_export_logs_created_at ON data_export_logs(created_at);
CREATE INDEX idx_data_export_logs_expires_at ON data_export_logs(expires_at);

-- Add comments
COMMENT ON TABLE data_export_logs IS '数据导出日志表';
COMMENT ON COLUMN data_export_logs.id IS '导出日志ID';
COMMENT ON COLUMN data_export_logs.export_type IS '导出类型';
COMMENT ON COLUMN data_export_logs.export_format IS '导出格式';
COMMENT ON COLUMN data_export_logs.date_range_start IS '日期范围开始';
COMMENT ON COLUMN data_export_logs.date_range_end IS '日期范围结束';
COMMENT ON COLUMN data_export_logs.merchant_id IS '商户ID（如果按商户导出）';
COMMENT ON COLUMN data_export_logs.filter_criteria IS '筛选条件';
COMMENT ON COLUMN data_export_logs.total_records IS '导出记录总数';
COMMENT ON COLUMN data_export_logs.file_path IS '文件路径';
COMMENT ON COLUMN data_export_logs.file_size_bytes IS '文件大小（字节）';
COMMENT ON COLUMN data_export_logs.export_status IS '导出状态';
COMMENT ON COLUMN data_export_logs.error_message IS '错误信息';
COMMENT ON COLUMN data_export_logs.exported_by IS '导出操作人ID';
COMMENT ON COLUMN data_export_logs.exported_by_name IS '导出操作人姓名';
COMMENT ON COLUMN data_export_logs.download_count IS '下载次数';
COMMENT ON COLUMN data_export_logs.last_downloaded_at IS '最后下载时间';
COMMENT ON COLUMN data_export_logs.expires_at IS '文件过期时间';
COMMENT ON COLUMN data_export_logs.completed_at IS '导出完成时间';

COMMIT;