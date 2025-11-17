-- Migration rollback: enhance_notifications_for_recharge_testing
-- Created at: 2025-08-12 12:06:00
-- Description: Rollback enhancements to notifications table

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_merchant_id;
DROP INDEX IF EXISTS idx_notifications_notification_channel;
DROP INDEX IF EXISTS idx_notifications_last_triggered_at;

-- Remove added columns
ALTER TABLE notifications 
DROP COLUMN IF EXISTS merchant_id,
DROP COLUMN IF EXISTS notification_channel,
DROP COLUMN IF EXISTS recipient_config,
DROP COLUMN IF EXISTS trigger_conditions,
DROP COLUMN IF EXISTS last_triggered_at,
DROP COLUMN IF EXISTS trigger_count;

COMMIT;