-- Drop limit_alerts table
DROP TABLE IF EXISTS limit_alerts;

-- Remove daily usage tracking fields from merchants table
ALTER TABLE merchants 
DROP COLUMN IF EXISTS daily_used,
DROP COLUMN IF EXISTS last_reset_date;