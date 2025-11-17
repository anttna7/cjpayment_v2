-- Migration: enhance_notifications_for_recharge_testing
-- Created at: 2025-08-12 12:06:00
-- Description: Enhance notifications table for recharge testing system specific events

BEGIN;

-- Add recharge testing specific fields
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id),
ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(50) DEFAULT 'webhook', -- 'webhook', 'email', 'sms', 'internal'
ADD COLUMN IF NOT EXISTS recipient_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trigger_conditions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trigger_count INTEGER DEFAULT 0;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_notifications_merchant_id ON notifications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_notification_channel ON notifications(notification_channel);
CREATE INDEX IF NOT EXISTS idx_notifications_last_triggered_at ON notifications(last_triggered_at);

-- Add comments for new fields
COMMENT ON COLUMN notifications.merchant_id IS '关联商户ID（如果通知特定于商户）';
COMMENT ON COLUMN notifications.notification_channel IS '通知渠道';
COMMENT ON COLUMN notifications.recipient_config IS '接收者配置信息';
COMMENT ON COLUMN notifications.trigger_conditions IS '触发条件配置';
COMMENT ON COLUMN notifications.last_triggered_at IS '最后触发时间';
COMMENT ON COLUMN notifications.trigger_count IS '触发次数统计';

COMMIT;