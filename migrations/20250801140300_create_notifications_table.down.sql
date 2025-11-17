-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_is_active;
DROP INDEX IF EXISTS idx_notifications_target_system;
DROP INDEX IF EXISTS idx_notifications_event_type;

-- Drop table
DROP TABLE IF EXISTS notifications;