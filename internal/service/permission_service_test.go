package service

import (
	"context"
	"database/sql"
	"testing"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock permission repository
type mockPermissionRepository struct {
	mock.Mock
}

func (m *mockPermissionRepository) Create(ctx context.Context, permission *repository.Permission) error {
	args := m.Called(ctx, permission)
	return args.Error(0)
}

func (m *mockPermissionRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.Permission, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Permission), args.Error(1)
}

func (m *mockPermissionRepository) Update(ctx context.Context, permission *repository.Permission) error {
	args := m.Called(ctx, permission)
	return args.Error(0)
}

func (m *mockPermissionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockPermissionRepository) List(ctx context.Context, filter *repository.PermissionFilter) ([]*repository.Permission, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Permission), args.Error(1)
}

func (m *mockPermissionRepository) GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*repository.Permission, error) {
	args := m.Called(ctx, roleID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Permission), args.Error(1)
}

func (m *mockPermissionRepository) AssignPermissionToRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	args := m.Called(ctx, roleID, permissionID)
	return args.Error(0)
}

func (m *mockPermissionRepository) RemovePermissionFromRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	args := m.Called(ctx, roleID, permissionID)
	return args.Error(0)
}

func TestPermissionService_CreateRole(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	permissionRepo := &mockPermissionRepository{}
	permissionService := NewPermissionService(userRepo, roleRepo, permissionRepo)

	t.Run("successful role creation", func(t *testing.T) {
		roleRepo.On("GetByName", ctx, "admin").Return(nil, sql.ErrNoRows).Once()
		roleRepo.On("Create", ctx, mock.AnythingOfType("*repository.Role")).Return(nil).Once()

		req := &CreateRoleRequest{
			Name:        "admin",
			Description: "Administrator role",
		}

		role, err := permissionService.CreateRole(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, role)
		assert.Equal(t, req.Name, role.Name)
		assert.Equal(t, req.Description, role.Description)
		assert.Equal(t, "active", role.Status)
	})

	t.Run("role already exists", func(t *testing.T) {
		existingRole := &repository.Role{
			ID:   uuid.New(),
			Name: "admin",
		}
		roleRepo.On("GetByName", ctx, "admin").Return(existingRole, nil).Once()

		req := &CreateRoleRequest{
			Name:        "admin",
			Description: "Administrator role",
		}

		role, err := permissionService.CreateRole(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrRoleExists, err)
		assert.Nil(t, role)
	})
}

func TestPermissionService_CreatePermission(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	permissionRepo := &mockPermissionRepository{}
	permissionService := NewPermissionService(userRepo, roleRepo, permissionRepo)

	t.Run("successful permission creation", func(t *testing.T) {
		permissionRepo.On("Create", ctx, mock.AnythingOfType("*repository.Permission")).Return(nil).Once()

		req := &CreatePermissionRequest{
			Resource:    "users",
			Action:      "read",
			Description: "Read users",
		}

		permission, err := permissionService.CreatePermission(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, permission)
		assert.Equal(t, req.Resource, permission.Resource)
		assert.Equal(t, req.Action, permission.Action)
		assert.Equal(t, req.Description, permission.Description)
	})
}

func TestPermissionService_AssignPermissionToRole(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	permissionRepo := &mockPermissionRepository{}
	permissionService := NewPermissionService(userRepo, roleRepo, permissionRepo)

	roleID := uuid.New()
	permissionID := uuid.New()
	role := &repository.Role{ID: roleID, Name: "admin"}
	permission := &repository.Permission{ID: permissionID, Resource: "users", Action: "read"}

	t.Run("successful assignment", func(t *testing.T) {
		roleRepo.On("GetByID", ctx, roleID).Return(role, nil).Once()
		permissionRepo.On("GetByID", ctx, permissionID).Return(permission, nil).Once()
		permissionRepo.On("AssignPermissionToRole", ctx, roleID, permissionID).Return(nil).Once()

		err := permissionService.AssignPermissionToRole(ctx, roleID, permissionID)

		assert.NoError(t, err)
	})

	t.Run("role not found", func(t *testing.T) {
		roleRepo.On("GetByID", ctx, roleID).Return(nil, sql.ErrNoRows).Once()

		err := permissionService.AssignPermissionToRole(ctx, roleID, permissionID)

		assert.Error(t, err)
		assert.Equal(t, ErrRoleNotFound, err)
	})

	t.Run("permission not found", func(t *testing.T) {
		roleRepo.On("GetByID", ctx, roleID).Return(role, nil).Once()
		permissionRepo.On("GetByID", ctx, permissionID).Return(nil, sql.ErrNoRows).Once()

		err := permissionService.AssignPermissionToRole(ctx, roleID, permissionID)

		assert.Error(t, err)
		assert.Equal(t, ErrPermissionNotFound, err)
	})
}

func TestPermissionService_CheckPermission(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	permissionRepo := &mockPermissionRepository{}
	permissionService := NewPermissionService(userRepo, roleRepo, permissionRepo)

	userID := uuid.New()
	roleID := uuid.New()
	roles := []*repository.Role{
		{ID: roleID, Name: "admin"},
	}
	permissions := []*repository.Permission{
		{ID: uuid.New(), Resource: "users", Action: "read"},
		{ID: uuid.New(), Resource: "users", Action: "write"},
	}

	t.Run("user has permission", func(t *testing.T) {
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()
		permissionRepo.On("GetRolePermissions", ctx, roleID).Return(permissions, nil).Once()

		hasPermission, err := permissionService.CheckPermission(ctx, userID, "users", "read")

		assert.NoError(t, err)
		assert.True(t, hasPermission)
	})

	t.Run("user does not have permission", func(t *testing.T) {
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()
		permissionRepo.On("GetRolePermissions", ctx, roleID).Return(permissions, nil).Once()

		hasPermission, err := permissionService.CheckPermission(ctx, userID, "orders", "read")

		assert.NoError(t, err)
		assert.False(t, hasPermission)
	})

	t.Run("wildcard resource permission", func(t *testing.T) {
		wildcardPermissions := []*repository.Permission{
			{ID: uuid.New(), Resource: "*", Action: "read"},
		}
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()
		permissionRepo.On("GetRolePermissions", ctx, roleID).Return(wildcardPermissions, nil).Once()

		hasPermission, err := permissionService.CheckPermission(ctx, userID, "orders", "read")

		assert.NoError(t, err)
		assert.True(t, hasPermission)
	})

	t.Run("wildcard action permission", func(t *testing.T) {
		wildcardPermissions := []*repository.Permission{
			{ID: uuid.New(), Resource: "users", Action: "*"},
		}
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()
		permissionRepo.On("GetRolePermissions", ctx, roleID).Return(wildcardPermissions, nil).Once()

		hasPermission, err := permissionService.CheckPermission(ctx, userID, "users", "delete")

		assert.NoError(t, err)
		assert.True(t, hasPermission)
	})

	t.Run("super admin permission", func(t *testing.T) {
		superAdminPermissions := []*repository.Permission{
			{ID: uuid.New(), Resource: "*", Action: "*"},
		}
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Once()
		permissionRepo.On("GetRolePermissions", ctx, roleID).Return(superAdminPermissions, nil).Once()

		hasPermission, err := permissionService.CheckPermission(ctx, userID, "anything", "anything")

		assert.NoError(t, err)
		assert.True(t, hasPermission)
	})
}

func TestPermissionService_AssignRoleToUser(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	permissionRepo := &mockPermissionRepository{}
	permissionService := NewPermissionService(userRepo, roleRepo, permissionRepo)

	userID := uuid.New()
	roleID := uuid.New()
	user := &repository.User{ID: userID, Username: "testuser"}
	role := &repository.Role{ID: roleID, Name: "admin"}

	t.Run("successful assignment", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(user, nil).Once()
		roleRepo.On("GetByID", ctx, roleID).Return(role, nil).Once()
		roleRepo.On("AssignRoleToUser", ctx, userID, roleID).Return(nil).Once()

		err := permissionService.AssignRoleToUser(ctx, userID, roleID)

		assert.NoError(t, err)
	})

	t.Run("user not found", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(nil, sql.ErrNoRows).Once()

		err := permissionService.AssignRoleToUser(ctx, userID, roleID)

		assert.Error(t, err)
		assert.Equal(t, ErrUserNotFound, err)
	})

	t.Run("role not found", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(user, nil).Once()
		roleRepo.On("GetByID", ctx, roleID).Return(nil, sql.ErrNoRows).Once()

		err := permissionService.AssignRoleToUser(ctx, userID, roleID)

		assert.Error(t, err)
		assert.Equal(t, ErrRoleNotFound, err)
	})
}