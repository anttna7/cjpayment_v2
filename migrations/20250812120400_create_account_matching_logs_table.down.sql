-- Migration rollback: create_account_matching_logs_table
-- Created at: 2025-08-12 12:04:00
-- Description: Drop account_matching_logs table

BEGIN;

DROP TABLE IF EXISTS account_matching_logs;

COMMIT;