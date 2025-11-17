-- Create reports table for report generation and management
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('excel', 'csv', 'pdf')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    file_size BIGINT,
    file_path VARCHAR(500),
    download_url VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_reports_type_status ON reports(report_type, status);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_expires_at ON reports(expires_at) WHERE expires_at IS NOT NULL;

-- Add comments
COMMENT ON TABLE reports IS 'Generated reports and their metadata';
COMMENT ON COLUMN reports.report_type IS 'Type of report: transaction, merchant, account, summary';
COMMENT ON COLUMN reports.format IS 'Output format: excel, csv, pdf';
COMMENT ON COLUMN reports.status IS 'Report generation status';
COMMENT ON COLUMN reports.progress IS 'Generation progress percentage (0-100)';
COMMENT ON COLUMN reports.parameters IS 'Report generation parameters in JSON format';