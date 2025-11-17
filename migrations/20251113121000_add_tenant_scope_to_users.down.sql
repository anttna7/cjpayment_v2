-- Migration: add_tenant_scope_to_users (DOWN)
-- Revert tenant_id from users

BEGIN;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS fk_users_tenant;

DROP INDEX IF EXISTS idx_users_tenant_id;

ALTER TABLE users
    DROP COLUMN IF EXISTS tenant_id;

COMMIT;

