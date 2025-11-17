package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// permissionRepository implements PermissionRepository interface
type permissionRepository struct {
	*BaseRepository
}

// NewPermissionRepository creates a new permission repository
func NewPermissionRepository(db *sqlx.DB) PermissionRepository {
	return &permissionRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// Create creates a new permission
func (r *permissionRepository) Create(ctx context.Context, permission *Permission) error {
	if permission.ID == uuid.Nil {
		permission.ID = uuid.New()
	}
	permission.CreatedAt = time.Now()
	permission.UpdatedAt = time.Now()

	query := `
		INSERT INTO permissions (id, resource, action, description, created_at, updated_at, created_by, updated_by)
		VALUES (:id, :resource, :action, :description, :created_at, :updated_at, :created_by, :updated_by)`

	_, err := r.db.NamedExecContext(ctx, query, permission)
	return err
}

// GetByID retrieves a permission by ID
func (r *permissionRepository) GetByID(ctx context.Context, id uuid.UUID) (*Permission, error) {
	var permission Permission
	query := "SELECT * FROM permissions WHERE id = $1"
	err := r.db.GetContext(ctx, &permission, query, id)
	if err != nil {
		return nil, err
	}
	return &permission, nil
}

// Update updates a permission
func (r *permissionRepository) Update(ctx context.Context, permission *Permission) error {
	permission.UpdatedAt = time.Now()

	query := `
		UPDATE permissions 
		SET resource = :resource, action = :action, description = :description,
		    updated_at = :updated_at, updated_by = :updated_by
		WHERE id = :id`

	result, err := r.db.NamedExecContext(ctx, query, permission)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("permission with id %s not found", permission.ID)
	}

	return nil
}

// Delete deletes a permission by ID
func (r *permissionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := "DELETE FROM permissions WHERE id = $1"
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("permission with id %s not found", id)
	}

	return nil
}

// List retrieves permissions with filtering
func (r *permissionRepository) List(ctx context.Context, filter *PermissionFilter) ([]*Permission, error) {
	var permissions []*Permission
	var conditions []string
	var args []interface{}
	argIndex := 1

	query := "SELECT * FROM permissions"

	// Build WHERE conditions
	if filter.Resource != nil {
		conditions = append(conditions, fmt.Sprintf("resource = $%d", argIndex))
		args = append(args, *filter.Resource)
		argIndex++
	}

	if filter.Action != nil {
		conditions = append(conditions, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, *filter.Action)
		argIndex++
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	orderBy := "resource, action"
	if filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	orderDir := "ASC"
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

	err := r.db.SelectContext(ctx, &permissions, query, args...)
	return permissions, err
}

// GetRolePermissions retrieves all permissions for a role
func (r *permissionRepository) GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*Permission, error) {
	var permissions []*Permission
	query := `
		SELECT p.* FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1
		ORDER BY p.resource, p.action`

	err := r.db.SelectContext(ctx, &permissions, query, roleID)
	return permissions, err
}

// AssignPermissionToRole assigns a permission to a role
func (r *permissionRepository) AssignPermissionToRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	// Check if assignment already exists
	exists, err := r.Exists(ctx, "role_permissions", "role_id = $1 AND permission_id = $2", roleID, permissionID)
	if err != nil {
		return err
	}
	if exists {
		return nil // Already assigned
	}

	query := `
		INSERT INTO role_permissions (id, role_id, permission_id, created_at)
		VALUES ($1, $2, $3, $4)`

	_, err = r.db.ExecContext(ctx, query, uuid.New(), roleID, permissionID, time.Now())
	return err
}

// RemovePermissionFromRole removes a permission from a role
func (r *permissionRepository) RemovePermissionFromRole(ctx context.Context, roleID, permissionID uuid.UUID) error {
	query := "DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2"
	result, err := r.db.ExecContext(ctx, query, roleID, permissionID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("permission assignment not found for role %s and permission %s", roleID, permissionID)
	}

	return nil
}