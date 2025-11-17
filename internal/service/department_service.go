package service

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
)

// DepartmentService 部门服务接口
type DepartmentService interface {
	CreateDepartment(ctx context.Context, req CreateDepartmentRequest) (*repository.Department, error)
	UpdateDepartment(ctx context.Context, id uuid.UUID, req UpdateDepartmentRequest) error
	DeleteDepartment(ctx context.Context, id uuid.UUID) error
	GetDepartmentByID(ctx context.Context, id uuid.UUID) (*repository.Department, error)
	ListDepartments(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]*repository.Department, int, error)

	// 用户-部门管理
	AssignUserToDepartment(ctx context.Context, userID, departmentID uuid.UUID) error
	RemoveUserFromDepartment(ctx context.Context, userID, departmentID uuid.UUID) error
	GetUserDepartments(ctx context.Context, userID uuid.UUID) ([]*repository.Department, error)
	GetDepartmentUsers(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error)

	// 部门-角色管理
	AssignRoleToDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error
	RemoveRoleFromDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error
	GetDepartmentRoles(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error)

	// 权限继承
	GetUserEffectivePermissions(ctx context.Context, userID uuid.UUID) ([]string, error)
	GetDepartmentPermissions(ctx context.Context, departmentID uuid.UUID) ([]string, error)
}

// CreateDepartmentRequest 创建部门请求
type CreateDepartmentRequest struct {
	TenantID    uuid.UUID `json:"tenant_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
}

// UpdateDepartmentRequest 更新部门请求
type UpdateDepartmentRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

type departmentService struct {
	deptRepo       repository.DepartmentRepository
	roleRepo       repository.RoleRepository
	permissionRepo repository.PermissionRepository
	userRepo       repository.UserRepository
}

// NewDepartmentService 创建部门服务实例
func NewDepartmentService(
	deptRepo repository.DepartmentRepository,
	roleRepo repository.RoleRepository,
	permissionRepo repository.PermissionRepository,
	userRepo repository.UserRepository,
) DepartmentService {
	return &departmentService{
		deptRepo:       deptRepo,
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
		userRepo:       userRepo,
	}
}

func (s *departmentService) CreateDepartment(ctx context.Context, req CreateDepartmentRequest) (*repository.Department, error) {
	dept := &repository.Department{
		TenantID:    req.TenantID,
		Name:        req.Name,
		Description: req.Description,
	}

	err := s.deptRepo.Create(ctx, dept)
	if err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}

	return dept, nil
}

func (s *departmentService) UpdateDepartment(ctx context.Context, id uuid.UUID, req UpdateDepartmentRequest) error {
	// 获取现有部门
	dept, err := s.deptRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get department: %w", err)
	}

	// 更新字段
	if req.Name != nil {
		dept.Name = *req.Name
	}
	if req.Description != nil {
		dept.Description = req.Description
	}

	err = s.deptRepo.Update(ctx, dept)
	if err != nil {
		return fmt.Errorf("failed to update department: %w", err)
	}

	return nil
}

func (s *departmentService) DeleteDepartment(ctx context.Context, id uuid.UUID) error {
	// 检查是否有用户
	users, err := s.deptRepo.GetDepartmentUsers(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get department users: %w", err)
	}

	if len(users) > 0 {
		return fmt.Errorf("cannot delete department with users, please reassign users first")
	}

	err = s.deptRepo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete department: %w", err)
	}

	return nil
}

func (s *departmentService) GetDepartmentByID(ctx context.Context, id uuid.UUID) (*repository.Department, error) {
	dept, err := s.deptRepo.GetByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("department not found")
		}
		return nil, fmt.Errorf("failed to get department: %w", err)
	}

	return dept, nil
}

func (s *departmentService) ListDepartments(ctx context.Context, tenantID uuid.UUID, page, pageSize int) ([]*repository.Department, int, error) {
	// 设置默认分页
	if pageSize <= 0 {
		pageSize = 20
	}
	if page <= 0 {
		page = 1
	}

	offset := (page - 1) * pageSize

	depts, total, err := s.deptRepo.List(ctx, tenantID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list departments: %w", err)
	}

	return depts, total, nil
}

// 用户-部门管理
func (s *departmentService) AssignUserToDepartment(ctx context.Context, userID, departmentID uuid.UUID) error {
	// 验证用户存在
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// 验证部门存在
	_, err = s.deptRepo.GetByID(ctx, departmentID)
	if err != nil {
		return fmt.Errorf("department not found: %w", err)
	}

	err = s.deptRepo.AssignUserToDepartment(ctx, userID, departmentID)
	if err != nil {
		return fmt.Errorf("failed to assign user to department: %w", err)
	}

	return nil
}

func (s *departmentService) RemoveUserFromDepartment(ctx context.Context, userID, departmentID uuid.UUID) error {
	err := s.deptRepo.RemoveUserFromDepartment(ctx, userID, departmentID)
	if err != nil {
		return fmt.Errorf("failed to remove user from department: %w", err)
	}

	return nil
}

func (s *departmentService) GetUserDepartments(ctx context.Context, userID uuid.UUID) ([]*repository.Department, error) {
	depts, err := s.deptRepo.GetUserDepartments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user departments: %w", err)
	}

	return depts, nil
}

func (s *departmentService) GetDepartmentUsers(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error) {
	users, err := s.deptRepo.GetDepartmentUsers(ctx, departmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get department users: %w", err)
	}

	return users, nil
}

// 部门-角色管理
func (s *departmentService) AssignRoleToDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error {
	// 验证部门存在
	_, err := s.deptRepo.GetByID(ctx, departmentID)
	if err != nil {
		return fmt.Errorf("department not found: %w", err)
	}

	// 验证角色存在
	_, err = s.roleRepo.GetByID(ctx, roleID)
	if err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	err = s.deptRepo.AssignRoleToDepartment(ctx, departmentID, roleID)
	if err != nil {
		return fmt.Errorf("failed to assign role to department: %w", err)
	}

	return nil
}

func (s *departmentService) RemoveRoleFromDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error {
	err := s.deptRepo.RemoveRoleFromDepartment(ctx, departmentID, roleID)
	if err != nil {
		return fmt.Errorf("failed to remove role from department: %w", err)
	}

	return nil
}

func (s *departmentService) GetDepartmentRoles(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error) {
	roles, err := s.deptRepo.GetDepartmentRoles(ctx, departmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get department roles: %w", err)
	}

	return roles, nil
}

// 权限继承逻辑
func (s *departmentService) GetUserEffectivePermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	permissionMap := make(map[string]bool)

	// 1. 获取用户直接分配的角色权限
	userRoles, err := s.roleRepo.GetUserRoles(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	for _, role := range userRoles {
		permissions, err := s.permissionRepo.GetRolePermissions(ctx, role.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get role permissions: %w", err)
		}

		for _, perm := range permissions {
			permissionCode := fmt.Sprintf("%s.%s", perm.Resource, perm.Action)
			permissionMap[permissionCode] = true
		}
	}

	// 2. 获取用户所属部门的角色权限（权限继承）
	departments, err := s.deptRepo.GetUserDepartments(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user departments: %w", err)
	}

	for _, dept := range departments {
		deptPermissions, err := s.GetDepartmentPermissions(ctx, dept.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get department permissions: %w", err)
		}

		for _, perm := range deptPermissions {
			permissionMap[perm] = true
		}
	}

	// 3. 转换为数组
	permissions := make([]string, 0, len(permissionMap))
	for perm := range permissionMap {
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

func (s *departmentService) GetDepartmentPermissions(ctx context.Context, departmentID uuid.UUID) ([]string, error) {
	permissionMap := make(map[string]bool)

	// 获取部门的所有角色
	roleIDs, err := s.deptRepo.GetDepartmentRoles(ctx, departmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get department roles: %w", err)
	}

	// 聚合所有角色的权限
	for _, roleID := range roleIDs {
		permissions, err := s.permissionRepo.GetRolePermissions(ctx, roleID)
		if err != nil {
			return nil, fmt.Errorf("failed to get role permissions: %w", err)
		}

		for _, perm := range permissions {
			permissionCode := fmt.Sprintf("%s.%s", perm.Resource, perm.Action)
			permissionMap[permissionCode] = true
		}
	}

	// 转换为数组
	permissions := make([]string, 0, len(permissionMap))
	for perm := range permissionMap {
		permissions = append(permissions, perm)
	}

	return permissions, nil
}
