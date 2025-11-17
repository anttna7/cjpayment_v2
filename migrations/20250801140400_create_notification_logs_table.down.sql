-- Drop indexes
DROP INDEX IF EXISTS idx_notification_logs_next_retry_at;
DROP INDEX IF EXISTS idx_notification_logs_created_at;
DROP INDEX IF EXISTS idx_notification_logs_status;
DROP INDEX IF EXISTS idx_notification_logs_event_type;
DROP INDEX IF EXISTS idx_notification_logs_recharge_order_id;
DROP INDEX IF EXISTS idx_notification_logs_notification_id;

-- Drop table
DROP TABLE IF EXISTS notification_logs;