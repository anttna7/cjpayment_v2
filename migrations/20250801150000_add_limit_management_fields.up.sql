-- Add daily usage tracking fields to merchants table
ALTER TABLE merchants 
ADD COLUMN daily_used DECIMAL(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE NOT NULL;

-- Create limit_alerts table
CREATE TABLE limit_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('account_limit', 'merchant_limit')),
    entity_id UUID NOT NULL,
    entity_name VARCHAR(200) NOT NULL,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('warning', 'critical')),
    threshold DECIMAL(5,2) NOT NULL,
    current_used DECIMAL(5,2) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_limit_alerts_entity_type ON limit_alerts(entity_id, alert_type);
CREATE INDEX idx_limit_alerts_resolved ON limit_alerts(is_resolved);
CREATE INDEX idx_limit_alerts_created_at ON limit_alerts(created_at);
CREATE INDEX idx_limit_alerts_alert_level ON limit_alerts(alert_level);

-- Create index for merchants daily usage queries
CREATE INDEX idx_merchants_last_reset_date ON merchants(last_reset_date);

-- Update existing merchants to have proper default values
UPDATE merchants 
SET daily_used = 0, last_reset_date = CURRENT_DATE 
WHERE daily_used IS NULL OR last_reset_date IS NULL;