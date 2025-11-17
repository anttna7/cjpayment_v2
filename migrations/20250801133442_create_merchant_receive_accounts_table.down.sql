-- Rollback migration: create_merchant_receive_accounts_table
-- Created at: 2025-08-01 13:34:42
-- Description: Drop merchant_receive_accounts table

BEGIN;

DROP TABLE IF EXISTS merchant_receive_accounts CASCADE;

COMMIT;