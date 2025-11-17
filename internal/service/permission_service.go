package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrRoleNotFound       = errors.New("role not found")
	ErrPermissionNotFound = errors.New("permission not found")
	ErrRoleExists         = errors.New("role already exists")
	ErrPermissionExists   = errors.New("permission already exists")
	ErrPermissionDenied   = errors.New("permission denied")
)

// permissionService implements PermissionService interface
type permissionService struct {
	userRepo       repository.UserRepository
	roleRepo       repository.RoleRepository
	permissionRepo repository.PermissionRepository
}

// NewPermissionService creates a new permission service
func NewPermissionService(
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	permissionRepo repository.PermissionRepository,
) PermissionService {
	return &permissionService{
		userRepo:       userRepo,
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
	}
}

// CreateRole creates a new role
func (s *permissionService) CreateRole(ctx context.Context, req *CreateRoleRequest) (*repository.Role, error) {
	// Check if role already exists
	_, err := s.roleRepo.GetByName(ctx, req.Name)
	if err == nil {
		return nil, ErrRoleExists
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to check role existence: %w", err)
	}

	role := &repository.Role{
		ID:          uuid.New(),
		Name:        req.Name,
		Code:        strings.ToLower(strings.ReplaceAll(req.Name, " ", "_")),
		Description: &req.Description,
		IsSystem:    false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.roleRepo.Create(ctx, role); err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	return role, nil
}

// UpdateRole updates an existing role
func (s *permissionService) UpdateRole(ctx context.Context, roleID uuid.UUID, req *UpdateRoleRequest) (*repository.Role, error) {
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	// Update fields if provided
	if req.Name != "" {
		// Check if new name conflicts with existing role
		existingRole, err := s.roleRepo.GetByName(ctx, req.Name)
		if err == nil && existingRole.ID != roleID {
			return nil, ErrRoleExists
		}
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("failed to check role name: %w", err)
		}
		role.Name = req.Name
	}
	if req.Description != "" {
		role.Description = &req.Description
	}

	role.UpdatedAt = time.Now()

	if err := s.roleRepo.Update(ctx, role); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return role, nil
}

// DeleteRole deletes a role
func (s *permissionService) DeleteRole(ctx context.Context, roleID uuid.UUID) error {
	if err := s.roleRepo.Delete(ctx, roleID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoleNotFound
		}
		return fmt.Errorf("failed to delete role: %w", err)
	}
	return nil
}

// GetRole retrieves a role by ID
func (s *permissionService) GetRole(ctx context.Context, roleID uuid.UUID) (*repository.Role, error) {
	role, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("failed to get role: %w", err)
	}
	return role, nil
}

// ListRoles lists roles with filtering
func (s *permissionService) ListRoles(ctx context.Context, filter *repository.RoleFilter) ([]*repository.Role, error) {
	roles, err := s.roleRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list roles: %w", err)
	}
	return roles, nil
}

// CreatePermission creates a new permission
func (s *permissionService) CreatePermission(ctx context.Context, req *CreatePermissionRequest) (*repository.Permission, error) {
	permission := &repository.Permission{
		ID:          uuid.New(),
		Resource:    req.Resource,
		Action:      req.Action,
		Description: req.Description,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.permissionRepo.Create(ctx, permission); err != nil {
		return nil, fmt.Errorf("failed to create permission: %w", err)
	}

	return permission, nil
}

// UpdatePermission updates an existing permission
func (s *permissionService) UpdatePermission(ctx context.Context, permissionID uuid.UUID, req *UpdatePermissionRequest) (*repository.Permission, error) {
	permission, err := s.permissionRepo.GetByID(ctx, permissionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPermissionNotFound
		}
		return nil, fmt.Errorf("failed to get permission: %w", err)
	}

	// Update fields if provided
	if req.Resource != "" {
		permission.Resource = req.Resource
	}
	if req.Action != "" {
		permission.Action = req.Action
	}
	if req.Description != "" {
		permission.Description = req.Description
	}

	permission.UpdatedAt = time.Now()

	if err := s.permissionRepo.Update(ctx, permission); err != nil {
		return nil, fmt.Errorf("failed to update permission: %w", err)
	}

	return permission, nil
}

// DeletePermission deletes a permission
func (s *permissionService) DeletePermission(ctx context.Context, permissionID uuid.UUID) error {
	if err := s.permissionRepo.Delete(ctx, permissionID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrPermissionNotFound
		}
		return fmt.Errorf("failed to delete permission: %w", err)
	}
	return nil
}

// GetPermission retrieves a permission by ID
func (s *permissionService) GetPermission(ctx context.Context, permissionID uuid.UUID) (*repository.Permission, error) {
	permission, err := s.permissionRepo.GetByID(ctx, permissionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrPermissionNotFound
		}
		return nil, fmt.Errorf("failed to get permission: %w", err)
	}
	return permission, nil
}

// ListPermissions lists permissions with filtering
func (s *permissionService) ListPermissions(ctx context.Context, filter *repository.PermissionFilter) ([]*repository.Permission, error) {
	permissions, err := s.permissionRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list permissions: %w", err)
	}
	return permissions, nil
}

// AssignPermissionToRole assigns a permission to a role
func (s *permissionService) AssignPermissionToRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	// Verify role exists
	_, err := s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoleNotFound
		}
		return fmt.Errorf("failed to get role: %w", err)
	}

	// Verify permission exists
	_, err = s.permissionRepo.GetByID(ctx, permissionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrPermissionNotFound
		}
		return fmt.Errorf("failed to get permission: %w", err)
	}

	if err := s.permissionRepo.AssignPermissionToRole(ctx, roleID, permissionID); err != nil {
		return fmt.Errorf("failed to assign permission to role: %w", err)
	}

	return nil
}

// RemovePermissionFromRole removes a permission from a role
func (s *permissionService) RemovePermissionFromRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	if err := s.permissionRepo.RemovePermissionFromRole(ctx, roleID, permissionID); err != nil {
		return fmt.Errorf("failed to remove permission from role: %w", err)
	}
	return nil
}

// GetRolePermissions retrieves all permissions for a role
func (s *permissionService) GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*repository.Permission, error) {
	permissions, err := s.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get role permissions: %w", err)
	}
	return permissions, nil
}

// AssignRoleToUser assigns a role to a user
func (s *permissionService) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	// Verify user exists
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify role exists
	_, err = s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoleNotFound
		}
		return fmt.Errorf("failed to get role: %w", err)
	}

	if err := s.roleRepo.AssignRoleToUser(ctx, userID, roleID); err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}

	return nil
}

// RemoveRoleFromUser removes a role from a user
func (s *permissionService) RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error {
	if err := s.roleRepo.RemoveRoleFromUser(ctx, userID, roleID); err != nil {
		return fmt.Errorf("failed to remove role from user: %w", err)
	}
	return nil
}

// GetUserRoles retrieves all roles for a user
func (s *permissionService) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*repository.Role, error) {
	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}
	return roles, nil
}

// CheckPermission checks if a user has a specific permission
func (s *permissionService) CheckPermission(ctx context.Context, userID uuid.UUID, resource, action string) (bool, error) {
	// Get user roles
	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Check permissions for each role
	for _, role := range roles {
		permissions, err := s.permissionRepo.GetRolePermissions(ctx, role.ID)
		if err != nil {
			return false, fmt.Errorf("failed to get role permissions: %w", err)
		}

		for _, permission := range permissions {
			if permission.Resource == resource && permission.Action == action {
				return true, nil
			}
			// Check for wildcard permissions
			if permission.Resource == "*" && permission.Action == action {
				return true, nil
			}
			if permission.Resource == resource && permission.Action == "*" {
				return true, nil
			}
			if permission.Resource == "*" && permission.Action == "*" {
				return true, nil
			}
		}
	}

	return false, nil
}

// GetUserPermissions retrieves all permissions for a user (through roles)
func (s *permissionService) GetUserPermissions(ctx context.Context, userID uuid.UUID) ([]*repository.Permission, error) {
	// Get user roles
	roles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Collect all permissions from all roles
	permissionMap := make(map[uuid.UUID]*repository.Permission)
	for _, role := range roles {
		permissions, err := s.permissionRepo.GetRolePermissions(ctx, role.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get role permissions: %w", err)
		}

		for _, permission := range permissions {
			permissionMap[permission.ID] = permission
		}
	}

	// Convert map to slice
	permissions := make([]*repository.Permission, 0, len(permissionMap))
	for _, permission := range permissionMap {
		permissions = append(permissions, permission)
	}

	return permissions, nil
}