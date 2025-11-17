-- 回滚广告账户通知功能增强的数据库变更

-- 删除触发器
DROP TRIGGER IF EXISTS notification_queue_update_trigger ON notification_queue;
DROP TRIGGER IF EXISTS notification_templates_update_trigger ON notification_templates;
DROP TRIGGER IF EXISTS notification_monitoring_update_trigger ON notification_monitoring;
DROP TRIGGER IF EXISTS ad_account_notification_logs_update_trigger ON ad_account_notification_logs;
DROP TRIGGER IF EXISTS ad_account_notifications_update_trigger ON ad_account_notifications;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_ad_account_notification_updated_at();

-- 删除表
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_monitoring CASCADE;
DROP TABLE IF EXISTS ad_account_notification_logs CASCADE;
DROP TABLE IF EXISTS ad_account_notifications CASCADE;