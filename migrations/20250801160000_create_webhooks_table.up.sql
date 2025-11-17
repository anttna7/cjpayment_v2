-- Create webhooks table for webhook registration and management
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_created_at ON webhooks(created_at);

-- Create webhook events table for event tracking
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook events
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_timestamp ON webhook_events(timestamp);

-- Create webhook deliveries table for tracking webhook delivery attempts
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    request_headers JSONB,
    request_body TEXT NOT NULL,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    execution_time_ms INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook deliveries
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event_id ON webhook_deliveries(event_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Add comments for documentation
COMMENT ON TABLE webhooks IS 'Webhook registrations for external system notifications';
COMMENT ON TABLE webhook_events IS 'Events that can trigger webhook notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and their results';

COMMENT ON COLUMN webhooks.events IS 'Array of event types this webhook subscribes to';
COMMENT ON COLUMN webhooks.secret IS 'Secret key for webhook signature validation';
COMMENT ON COLUMN webhook_events.data IS 'Event payload data in JSON format';
COMMENT ON COLUMN webhook_deliveries.retry_count IS 'Number of delivery attempts made';
COMMENT ON COLUMN webhook_deliveries.max_retries IS 'Maximum number of retry attempts allowed';