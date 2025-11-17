-- Migration rollback: create_data_export_logs_table
-- Created at: 2025-08-12 12:05:00
-- Description: Drop data_export_logs table

BEGIN;

DROP TABLE IF EXISTS data_export_logs;

COMMIT;