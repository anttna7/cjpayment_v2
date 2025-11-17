-- Migration: create_departments_and_role_hierarchy
-- Created at: 2025-11-13 12:20:00
-- Description: Create departments, user-department mapping, role hierarchy and department-roles

BEGIN;

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE TABLE IF NOT EXISTS user_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

CREATE TABLE IF NOT EXISTS role_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    parent_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'tenant' CHECK (scope IN ('platform','tenant','department')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_role_id, parent_role_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_role_hierarchy_child ON role_hierarchy(child_role_id);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_parent ON role_hierarchy(parent_role_id);

CREATE TABLE IF NOT EXISTS department_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(department_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_department_roles_department ON department_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_department_roles_role ON department_roles(role_id);

COMMIT;

