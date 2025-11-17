package service

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

// Mock repositories
type mockUserRepository struct {
	mock.Mock
}

func (m *mockUserRepository) Create(ctx context.Context, user *repository.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.User), args.Error(1)
}

func (m *mockUserRepository) GetByUsername(ctx context.Context, username string) (*repository.User, error) {
	args := m.Called(ctx, username)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.User), args.Error(1)
}

func (m *mockUserRepository) GetByEmail(ctx context.Context, email string) (*repository.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.User), args.Error(1)
}

func (m *mockUserRepository) Update(ctx context.Context, user *repository.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockUserRepository) List(ctx context.Context, filter *repository.UserFilter) ([]*repository.User, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.User), args.Error(1)
}

func (m *mockUserRepository) Count(ctx context.Context, filter *repository.UserFilter) (int64, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(int64), args.Error(1)
}

type mockRoleRepository struct {
	mock.Mock
}

func (m *mockRoleRepository) Create(ctx context.Context, role *repository.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *mockRoleRepository) GetByID(ctx context.Context, id uuid.UUID) (*repository.Role, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Role), args.Error(1)
}

func (m *mockRoleRepository) GetByName(ctx context.Context, name string) (*repository.Role, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Role), args.Error(1)
}

func (m *mockRoleRepository) Update(ctx context.Context, role *repository.Role) error {
	args := m.Called(ctx, role)
	return args.Error(0)
}

func (m *mockRoleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRoleRepository) List(ctx context.Context, filter *repository.RoleFilter) ([]*repository.Role, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Role), args.Error(1)
}

func (m *mockRoleRepository) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*repository.Role, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*repository.Role), args.Error(1)
}

func (m *mockRoleRepository) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	args := m.Called(ctx, userID, roleID)
	return args.Error(0)
}

func (m *mockRoleRepository) RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error {
	args := m.Called(ctx, userID, roleID)
	return args.Error(0)
}

func TestAuthService_Login(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	jwtManager := NewJWTManager("test-secret", time.Hour, time.Hour*24)
	authService := NewAuthService(userRepo, roleRepo, jwtManager, nil)

	// Test data
	userID := uuid.New()
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &repository.User{
		ID:       userID,
		Username: "testuser",
		Email:    "test@example.com",
		Password: string(hashedPassword),
		FullName: "Test User",
		Status:   "active",
	}
	roles := []*repository.Role{
		{ID: uuid.New(), Name: "user"},
	}

	t.Run("successful login", func(t *testing.T) {
		userRepo.On("GetByUsername", ctx, "testuser").Return(user, nil).Once()
		roleRepo.On("GetUserRoles", ctx, userID).Return(roles, nil).Twice() // Called in Login and GenerateTokens

		req := &LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		resp, err := authService.Login(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, user.Username, resp.User.Username)
		assert.Equal(t, user.Email, resp.User.Email)
		assert.NotEmpty(t, resp.TokenResponse.AccessToken)
		assert.NotEmpty(t, resp.TokenResponse.RefreshToken)
	})

	t.Run("invalid username", func(t *testing.T) {
		userRepo.On("GetByUsername", ctx, "nonexistent").Return(nil, sql.ErrNoRows).Once()

		req := &LoginRequest{
			Username: "nonexistent",
			Password: "password123",
		}

		resp, err := authService.Login(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidCredentials, err)
		assert.Nil(t, resp)
	})

	t.Run("invalid password", func(t *testing.T) {
		userRepo.On("GetByUsername", ctx, "testuser").Return(user, nil).Once()

		req := &LoginRequest{
			Username: "testuser",
			Password: "wrongpassword",
		}

		resp, err := authService.Login(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidCredentials, err)
		assert.Nil(t, resp)
	})

	t.Run("inactive user", func(t *testing.T) {
		inactiveUser := *user
		inactiveUser.Status = "inactive"
		userRepo.On("GetByUsername", ctx, "testuser").Return(&inactiveUser, nil).Once()

		req := &LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		resp, err := authService.Login(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrUserInactive, err)
		assert.Nil(t, resp)
	})
}

func TestAuthService_Register(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	jwtManager := NewJWTManager("test-secret", time.Hour, time.Hour*24)
	authService := NewAuthService(userRepo, roleRepo, jwtManager, nil)

	t.Run("successful registration", func(t *testing.T) {
		userRepo.On("GetByUsername", ctx, "newuser").Return(nil, sql.ErrNoRows).Once()
		userRepo.On("GetByEmail", ctx, "new@example.com").Return(nil, sql.ErrNoRows).Once()
		userRepo.On("Create", ctx, mock.AnythingOfType("*repository.User")).Return(nil).Once()

		req := &RegisterRequest{
			Username: "newuser",
			Email:    "new@example.com",
			Password: "password123",
			FullName: "New User",
		}

		resp, err := authService.Register(ctx, req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, req.Username, resp.User.Username)
		assert.Equal(t, req.Email, resp.User.Email)
		assert.Equal(t, req.FullName, resp.User.FullName)
		assert.Equal(t, "active", resp.User.Status)
	})

	t.Run("username already exists", func(t *testing.T) {
		existingUser := &repository.User{
			ID:       uuid.New(),
			Username: "existinguser",
			Email:    "existing@example.com",
		}
		userRepo.On("GetByUsername", ctx, "existinguser").Return(existingUser, nil).Once()

		req := &RegisterRequest{
			Username: "existinguser",
			Email:    "new@example.com",
			Password: "password123",
			FullName: "New User",
		}

		resp, err := authService.Register(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrUserExists, err)
		assert.Nil(t, resp)
	})

	t.Run("email already exists", func(t *testing.T) {
		existingUser := &repository.User{
			ID:       uuid.New(),
			Username: "existing",
			Email:    "existing@example.com",
		}
		userRepo.On("GetByUsername", ctx, "newuser").Return(nil, sql.ErrNoRows).Once()
		userRepo.On("GetByEmail", ctx, "existing@example.com").Return(existingUser, nil).Once()

		req := &RegisterRequest{
			Username: "newuser",
			Email:    "existing@example.com",
			Password: "password123",
			FullName: "New User",
		}

		resp, err := authService.Register(ctx, req)

		assert.Error(t, err)
		assert.Equal(t, ErrUserExists, err)
		assert.Nil(t, resp)
	})
}

func TestAuthService_ChangePassword(t *testing.T) {
	ctx := context.Background()
	userRepo := &mockUserRepository{}
	roleRepo := &mockRoleRepository{}
	jwtManager := NewJWTManager("test-secret", time.Hour, time.Hour*24)
	authService := NewAuthService(userRepo, roleRepo, jwtManager, nil)

	userID := uuid.New()
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("oldpassword"), bcrypt.DefaultCost)
	user := &repository.User{
		ID:       userID,
		Username: "testuser",
		Email:    "test@example.com",
		Password: string(hashedPassword),
		FullName: "Test User",
		Status:   "active",
	}

	t.Run("successful password change", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(user, nil).Once()
		userRepo.On("Update", ctx, mock.AnythingOfType("*repository.User")).Return(nil).Once()

		req := &ChangePasswordRequest{
			OldPassword: "oldpassword",
			NewPassword: "newpassword123",
		}

		err := authService.ChangePassword(ctx, userID, req)

		assert.NoError(t, err)
	})

	t.Run("invalid old password", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(user, nil).Once()

		req := &ChangePasswordRequest{
			OldPassword: "wrongpassword",
			NewPassword: "newpassword123",
		}

		err := authService.ChangePassword(ctx, userID, req)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidPassword, err)
	})

	t.Run("user not found", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(nil, sql.ErrNoRows).Once()

		req := &ChangePasswordRequest{
			OldPassword: "oldpassword",
			NewPassword: "newpassword123",
		}

		err := authService.ChangePassword(ctx, userID, req)

		assert.Error(t, err)
	})
}