-- Rollback migration: create_rotation_rules_table
-- Created at: 2025-08-01 13:35:17
-- Description: Drop rotation_rules table

BEGIN;

DROP TABLE IF EXISTS rotation_rules CASCADE;

COMMIT;