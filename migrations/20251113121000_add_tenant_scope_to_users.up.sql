-- Migration: add_tenant_scope_to_users
-- Created at: 2025-11-13 12:10:00
-- Description: Add tenant_id to users for multi-tenant scoping

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;

ALTER TABLE users
    ADD CONSTRAINT IF NOT EXISTS fk_users_tenant
        FOREIGN KEY (tenant_id) REFERENCES merchants(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

COMMIT;

