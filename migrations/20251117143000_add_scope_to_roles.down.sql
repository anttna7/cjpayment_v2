BEGIN;

-- 删除新增的索引
DROP INDEX IF EXISTS idx_roles_tenant_name;
DROP INDEX IF EXISTS idx_roles_platform_name;
DROP INDEX IF EXISTS idx_roles_tenant_code;
DROP INDEX IF EXISTS idx_roles_platform_code;
DROP INDEX IF EXISTS idx_roles_scope;
DROP INDEX IF EXISTS idx_roles_tenant_id;

-- 恢复原来的唯一约束
ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE roles ADD CONSTRAINT roles_code_key UNIQUE (code);

-- 删除新增的列
ALTER TABLE roles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE roles DROP COLUMN IF EXISTS scope;

COMMIT;
