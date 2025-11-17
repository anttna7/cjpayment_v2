-- Migration rollback: create_recharge_sessions_table
-- Created at: 2025-08-12 12:03:00
-- Description: Drop recharge_sessions table

BEGIN;

DROP TABLE IF EXISTS recharge_sessions;

COMMIT;