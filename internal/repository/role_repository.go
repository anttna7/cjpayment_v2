package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// roleRepository implements RoleRepository interface
type roleRepository struct {
	*BaseRepository
}

// NewRoleRepository creates a new role repository
func NewRoleRepository(db *sqlx.DB) RoleRepository {
	return &roleRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new role
func (r *roleRepository) Create(ctx context.Context, role *Role) error {
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	role.CreatedAt = time.Now()
	role.UpdatedAt = time.Now()

	query := `
		INSERT INTO roles (id, name, code, description, is_system, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :name, :code, :description, :is_system, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, role)
	return err
}

// GetByID retrieves a role by ID
func (r *roleRepository) GetByID(ctx context.Context, id uuid.UUID) (*Role, error) {
	var role Role
	query := "SELECT * FROM roles WHERE id = $1"
	err := r.db.GetContext(ctx, &role, query, id)
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// GetByName retrieves a role by name
func (r *roleRepository) GetByName(ctx context.Context, name string) (*Role, error) {
	var role Role
	query := "SELECT * FROM roles WHERE name = $1"
	err := r.db.GetContext(ctx, &role, query, name)
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// Update updates a role
func (r *roleRepository) Update(ctx context.Context, role *Role) error {
	role.UpdatedAt = time.Now()

	query := `
		UPDATE roles 
		SET name = :name, code = :code, description = :description, is_system = :is_system,
		    updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, role)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("role with id %s not found", role.ID)
	}

	return nil
}

// Delete deletes a role by ID
func (r *roleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM roles WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("role with id %s not found", id)
	}

	return nil
}

// List retrieves roles with filtering
func (r *roleRepository) List(ctx context.Context, filter *RoleFilter) ([]*Role, error) {
	var roles []*Role
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM roles"

	// Build WHERE conditions
	if filter.IsSystem != nil {
		conditions = append(conditions, fmt.Sprintf("is_system = $%d", argIndex))
		args = append(args, *filter.IsSystem)
		argIndex++
	}

	if filter.Keyword != nil && *filter.Keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex))
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

	err := r.db.SelectContext(ctx, &roles, query, args...)
	return roles, err
}

// GetUserRoles retrieves all roles for a user
func (r *roleRepository) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*Role, error) {
	var roles []*Role
	query := `
		SELECT r.* FROM roles r
		INNER JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name`

	err := r.db.SelectContext(ctx, &roles, query, userID)
	return roles, err
}

// AssignRoleToUser assigns a role to a user
func (r *roleRepository) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	// Check if assignment already exists
	exists, err := r.Exists(ctx, "user_roles", "user_id = $1 AND role_id = $2", userID, roleID)
	if err != nil {
		return err
	}
	if exists {
		return nil // Already assigned
	}

	query := `
		INSERT INTO user_roles (id, user_id, role_id, created_at)
		VALUES ($1, $2, $3, $4)`

	_, err = r.db.ExecContext(ctx, query, uuid.New(), userID, roleID, time.Now())
	return err
}

// RemoveRoleFromUser removes a role from a user
func (r *roleRepository) RemoveRoleFromUser(ctx context.Context, userID, roleID uuid.UUID) error {
	query := "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2"
	result, err := r.db.ExecContext(ctx, query, userID, roleID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("role assignment not found for user %s and role %s", userID, roleID)
	}

	return nil
}