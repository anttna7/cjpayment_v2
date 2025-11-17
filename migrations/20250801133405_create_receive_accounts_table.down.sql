-- Rollback migration: create_receive_accounts_table
-- Created at: 2025-08-01 13:34:05
-- Description: Drop receive_accounts table

BEGIN;

DROP TABLE IF EXISTS receive_accounts CASCADE;

COMMIT;