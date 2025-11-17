-- Rollback migration: create_users_and_roles_tables
-- Created at: 2025-08-01 11:38:15
-- Description: Rollback create_users_and_roles_tables - Drop users, roles, permissions and related tables

BEGIN;

-- Drop junction tables first (due to foreign key constraints)
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

COMMIT;
