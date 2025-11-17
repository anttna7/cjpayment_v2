-- Migration: create_departments_and_role_hierarchy (DOWN)
-- Revert departments, user-departments, role hierarchy and department-roles

BEGIN;

DROP INDEX IF EXISTS idx_department_roles_role;
DROP INDEX IF EXISTS idx_department_roles_department;
DROP TABLE IF EXISTS department_roles;

DROP INDEX IF EXISTS idx_role_hierarchy_parent;
DROP INDEX IF EXISTS idx_role_hierarchy_child;
DROP TABLE IF EXISTS role_hierarchy;

DROP INDEX IF EXISTS idx_user_departments_department_id;
DROP INDEX IF EXISTS idx_user_departments_user_id;
DROP TABLE IF EXISTS user_departments;

DROP INDEX IF EXISTS idx_departments_name;
DROP INDEX IF EXISTS idx_departments_tenant_id;
DROP TABLE IF EXISTS departments;

COMMIT;

