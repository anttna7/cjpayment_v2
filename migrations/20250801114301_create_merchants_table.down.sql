-- Rollback migration: create_merchants_table
-- Created at: 2025-08-01 11:43:01
-- Description: Drop merchants table

BEGIN;

DROP TABLE IF EXISTS merchants CASCADE;

COMMIT;
