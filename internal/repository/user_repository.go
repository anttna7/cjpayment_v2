package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/company/cjpayment/pkg/cache"
)

// userRepository implements UserRepository interface
type userRepository struct {
	*BaseRepository
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sqlx.DB) UserRepository {
	return &userRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new user
func (r *userRepository) Create(ctx context.Context, user *User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, username, email, password_hash, full_name, status, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :username, :email, :password_hash, :full_name, :status, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, user)
	return err
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User
	query := "SELECT * FROM users WHERE id = $1"
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByUsername retrieves a user by username
func (r *userRepository) GetByUsername(ctx context.Context, username string) (*User, error) {
	var user User
	query := "SELECT * FROM users WHERE username = $1"
	err := r.db.GetContext(ctx, &user, query, username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	query := "SELECT * FROM users WHERE email = $1"
	err := r.db.GetContext(ctx, &user, query, email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Update updates a user
func (r *userRepository) Update(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()

	query := `
		UPDATE users 
		SET username = :username, email = :email, password_hash = :password_hash, 
		    full_name = :full_name, status = :status, updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user with id %s not found", user.ID)
	}

	return nil
}

// Delete deletes a user by ID
func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM users WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user with id %s not found", id)
	}

	return nil
}

// List retrieves users with filtering
func (r *userRepository) List(ctx context.Context, filter *UserFilter) ([]*User, error) {
	var users []*User
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM users"

	// Build WHERE conditions
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.RoleID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT user_id FROM user_roles WHERE role_id = $%d)", argIndex))
		args = append(args, *filter.RoleID)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR full_name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "created_at"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}

	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
	}

	err := r.db.SelectContext(ctx, &users, query, args...)
	return users, err
}

// Count returns the count of users matching the filter
func (r *userRepository) Count(ctx context.Context, filter *UserFilter) (int64, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM users"

	// Build WHERE conditions (same as List)
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.RoleID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT user_id FROM user_roles WHERE role_id = $%d)", argIndex))
		args = append(args, *filter.RoleID)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR full_name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// cachedUserRepository implements UserRepository interface with caching
type cachedUserRepository struct {
	*CachedBaseRepository
}

// NewUserRepositoryWithCache creates a new cached user repository
func NewUserRepositoryWithCache(db *sqlx.DB, cacheClient cache.Cache) UserRepository {
	return &cachedUserRepository{
		CachedBaseRepository: NewCachedBaseRepository(db, cacheClient),
	}
}

// Create creates a new user with cache invalidation
func (r *cachedUserRepository) Create(ctx context.Context, user *User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (id, username, email, password_hash, full_name, status, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :username, :email, :password_hash, :full_name, :status, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return err
	}

	// Invalidate user-related cache
	r.invalidator.InvalidateUser(user.ID.String())
	
	return nil
}

// GetByID retrieves a user by ID with caching
func (r *cachedUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var user User
	err := r.GetByIDWithCache(ctx, &user, "users", id, "user")
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByUsername retrieves a user by username with caching
func (r *cachedUserRepository) GetByUsername(ctx context.Context, username string) (*User, error) {
	cacheKey := fmt.Sprintf("user:username:%s", username)
	var user User
	
	err := r.GetWithCache(ctx, &user, cacheKey, cache.MediumExpiration, 
		"SELECT * FROM users WHERE username = $1", username)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByEmail retrieves a user by email with caching
func (r *cachedUserRepository) GetByEmail(ctx context.Context, email string) (*User, error) {
	cacheKey := fmt.Sprintf("user:email:%s", email)
	var user User
	
	err := r.GetWithCache(ctx, &user, cacheKey, cache.MediumExpiration,
		"SELECT * FROM users WHERE email = $1", email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Update updates a user with cache invalidation
func (r *cachedUserRepository) Update(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()

	query := `
		UPDATE users 
		SET username = :username, email = :email, password_hash = :password_hash, 
		    full_name = :full_name, status = :status, updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user with id %s not found", user.ID)
	}

	// Invalidate user-related cache
	r.invalidator.InvalidateUser(user.ID.String())

	return nil
}

// Delete deletes a user by ID with cache invalidation
func (r *cachedUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM users WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user with id %s not found", id)
	}

	// Invalidate user-related cache
	r.invalidator.InvalidateUser(id.String())

	return nil
}

// List retrieves users with caching for common filters
func (r *cachedUserRepository) List(ctx context.Context, filter *UserFilter) ([]*User, error) {
	// Generate cache key based on filter
	cacheKey := r.generateUserListCacheKey(filter)
	
	var users []*User
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM users"

	// Build WHERE conditions
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.RoleID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT user_id FROM user_roles WHERE role_id = $%d)", argIndex))
		args = append(args, *filter.RoleID)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR full_name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "created_at"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "DESC"
	if filter.OrderDir != "" {
		orderDir = filter.OrderDir
	}
	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}

	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
	}

	// Use cache for simple queries without complex filters
	if r.shouldCacheUserList(filter) {
		err := r.GetManyWithCache(ctx, &users, cacheKey, cache.ShortExpiration, query, args...)
		return users, err
	}

	// Direct database query for complex filters
	err := r.db.SelectContext(ctx, &users, query, args...)
	return users, err
}

// Count returns the count of users with caching
func (r *cachedUserRepository) Count(ctx context.Context, filter *UserFilter) (int64, error) {
	cacheKey := r.generateUserCountCacheKey(filter)
	
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT COUNT(*) FROM users"

	// Build WHERE conditions (same as List)
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.RoleID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT user_id FROM user_roles WHERE role_id = $%d)", argIndex))
		args = append(args, *filter.RoleID)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR full_name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+*filter.Keyword+"%")
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Use cache for simple queries
	if r.shouldCacheUserList(filter) {
		return r.CountWithCache(ctx, "users", strings.Join(conditions, " AND "), cacheKey, cache.ShortExpiration, args...)
	}

	// Direct database query
	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// generateUserListCacheKey generates a cache key for user list queries
func (r *cachedUserRepository) generateUserListCacheKey(filter *UserFilter) string {
	key := "user_list"
	
	if filter.Status != nil {
		key += fmt.Sprintf(":status:%s", *filter.Status)
	}
	if filter.RoleID != nil {
		key += fmt.Sprintf(":role:%s", filter.RoleID.String())
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		key += fmt.Sprintf(":keyword:%s", *filter.Keyword)
	}
	
	key += fmt.Sprintf(":order:%s:%s", filter.OrderBy, filter.OrderDir)
	key += fmt.Sprintf(":page:%d:%d", filter.Offset, filter.Limit)
	
	return key
}

// generateUserCountCacheKey generates a cache key for user count queries
func (r *cachedUserRepository) generateUserCountCacheKey(filter *UserFilter) string {
	key := "user_count"
	
	if filter.Status != nil {
		key += fmt.Sprintf(":status:%s", *filter.Status)
	}
	if filter.RoleID != nil {
		key += fmt.Sprintf(":role:%s", filter.RoleID.String())
	}
	if filter.Keyword != nil && *filter.Keyword != "" {
		key += fmt.Sprintf(":keyword:%s", *filter.Keyword)
	}
	
	return key
}

// shouldCacheUserList determines if a user list query should be cached
func (r *cachedUserRepository) shouldCacheUserList(filter *UserFilter) bool {
	// Cache simple queries without complex filters
	return filter.Keyword == nil || *filter.Keyword == ""
}