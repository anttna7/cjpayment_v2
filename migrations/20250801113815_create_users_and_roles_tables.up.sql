-- Migration: create_users_and_roles_tables
-- Created at: 2025-08-01 11:38:15
-- Description: Create users, roles, permissions and related tables for RBAC system

BEGIN;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles junction table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Insert default permissions
INSERT INTO permissions (name, code, resource, action, description) VALUES
    ('View Users', 'users.view', 'users', 'view', 'View user information'),
    ('Create Users', 'users.create', 'users', 'create', 'Create new users'),
    ('Update Users', 'users.update', 'users', 'update', 'Update user information'),
    ('Delete Users', 'users.delete', 'users', 'delete', 'Delete users'),
    ('Manage Roles', 'roles.manage', 'roles', 'manage', 'Manage user roles'),
    
    ('View Merchants', 'merchants.view', 'merchants', 'view', 'View merchant information'),
    ('Create Merchants', 'merchants.create', 'merchants', 'create', 'Create new merchants'),
    ('Update Merchants', 'merchants.update', 'merchants', 'update', 'Update merchant information'),
    ('Delete Merchants', 'merchants.delete', 'merchants', 'delete', 'Delete merchants'),
    
    ('View Accounts', 'accounts.view', 'accounts', 'view', 'View receive accounts'),
    ('Create Accounts', 'accounts.create', 'accounts', 'create', 'Create new receive accounts'),
    ('Update Accounts', 'accounts.update', 'accounts', 'update', 'Update receive accounts'),
    ('Delete Accounts', 'accounts.delete', 'accounts', 'delete', 'Delete receive accounts'),
    
    ('View Recharges', 'recharges.view', 'recharges', 'view', 'View recharge orders'),
    ('Create Recharges', 'recharges.create', 'recharges', 'create', 'Create new recharge orders'),
    ('Update Recharges', 'recharges.update', 'recharges', 'update', 'Update recharge orders'),
    ('Approve Recharges', 'recharges.approve', 'recharges', 'approve', 'Approve recharge orders'),
    ('Reject Recharges', 'recharges.reject', 'recharges', 'reject', 'Reject recharge orders'),
    
    ('View Reports', 'reports.view', 'reports', 'view', 'View reports and statistics'),
    ('Export Reports', 'reports.export', 'reports', 'export', 'Export reports'),
    
    ('System Admin', 'system.admin', 'system', 'admin', 'Full system administration access');

-- Insert default roles
INSERT INTO roles (name, code, description, is_system) VALUES
    ('Super Admin', 'super_admin', 'Full system access with all permissions', true),
    ('Admin', 'admin', 'Administrative access with most permissions', true),
    ('Finance', 'finance', 'Financial operations and approvals', true),
    ('Customer Service', 'customer_service', 'Customer service operations', true),
    ('Media Buyer', 'media_buyer', 'Media buying and recharge operations', true),
    ('Operations', 'operations', 'General operations access', true),
    ('Viewer', 'viewer', 'Read-only access to reports and data', true);

-- Assign permissions to Super Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'super_admin';

-- Assign permissions to Admin role (most permissions except system admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin' AND p.code != 'system.admin';

-- Assign permissions to Finance role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'finance' AND p.code IN (
    'recharges.view', 'recharges.approve', 'recharges.reject', 'recharges.update',
    'merchants.view', 'accounts.view', 'reports.view', 'reports.export'
);

-- Assign permissions to Customer Service role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'customer_service' AND p.code IN (
    'recharges.view', 'recharges.create', 'recharges.update',
    'merchants.view', 'accounts.view', 'reports.view'
);

-- Assign permissions to Media Buyer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'media_buyer' AND p.code IN (
    'recharges.view', 'recharges.create',
    'merchants.view', 'accounts.view'
);

-- Assign permissions to Operations role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'operations' AND p.code IN (
    'merchants.view', 'merchants.create', 'merchants.update',
    'accounts.view', 'accounts.create', 'accounts.update',
    'recharges.view', 'reports.view'
);

-- Assign permissions to Viewer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'viewer' AND p.code IN (
    'merchants.view', 'accounts.view', 'recharges.view', 'reports.view'
);

COMMIT;
