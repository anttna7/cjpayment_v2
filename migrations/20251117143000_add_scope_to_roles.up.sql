-- Migration: add_scope_to_roles
-- Created at: 2025-11-17 14:30:00
-- Description: Add scope and tenant_id fields to roles table to distinguish platform and tenant roles

BEGIN;

-- 添加scope字段，用于区分平台角色和租户角色
ALTER TABLE roles ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'platform' CHECK (scope IN ('platform', 'tenant'));

-- 添加tenant_id字段，用于租户角色关联
ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES merchants(id) ON DELETE CASCADE;

-- 为租户角色添加索引
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);

-- 更新现有角色为平台角色
UPDATE roles SET scope = 'platform' WHERE scope IS NULL OR scope = 'platform';

-- 添加唯一约束：平台角色的code全局唯一，租户角色的code在租户内唯一
-- 先删除原来的唯一约束
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_code_key;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;

-- 添加新的唯一约束
-- 平台角色：code全局唯一（tenant_id为NULL）
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_platform_code ON roles(code) WHERE scope = 'platform';
-- 租户角色：code在租户内唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_code ON roles(tenant_id, code) WHERE scope = 'tenant';

-- 平台角色：name全局唯一（tenant_id为NULL）
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_platform_name ON roles(name) WHERE scope = 'platform';
-- 租户角色：name在租户内唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_name ON roles(tenant_id, name) WHERE scope = 'tenant';

COMMENT ON COLUMN roles.scope IS '角色作用域：platform（平台角色，如超级管理员）、tenant（租户角色，如公司管理员）';
COMMENT ON COLUMN roles.tenant_id IS '租户ID，仅对租户角色有效';

COMMIT;
