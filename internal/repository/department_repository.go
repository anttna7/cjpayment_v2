package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// DepartmentRepository 部门数据访问接口
type DepartmentRepository interface {
	Create(ctx context.Context, dept *Department) error
	Update(ctx context.Context, dept *Department) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*Department, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID) ([]*Department, error)
	List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Department, int, error)

	// 用户-部门关联
	AssignUserToDepartment(ctx context.Context, userID, departmentID uuid.UUID) error
	RemoveUserFromDepartment(ctx context.Context, userID, departmentID uuid.UUID) error
	GetUserDepartments(ctx context.Context, userID uuid.UUID) ([]*Department, error)
	GetDepartmentUsers(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error)

	// 部门-角色关联
	AssignRoleToDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error
	RemoveRoleFromDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error
	GetDepartmentRoles(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error)
	GetRoleDepartments(ctx context.Context, roleID uuid.UUID) ([]*Department, error)
}

type departmentRepository struct {
	db *sqlx.DB
}

// NewDepartmentRepository 创建部门仓库实例
func NewDepartmentRepository(db *sqlx.DB) DepartmentRepository {
	return &departmentRepository{db: db}
}

func (r *departmentRepository) Create(ctx context.Context, dept *Department) error {
	query := `
		INSERT INTO departments (id, tenant_id, name, description, created_at, updated_at)
		VALUES (:id, :tenant_id, :name, :description, :created_at, :updated_at)
	`

	if dept.ID == uuid.Nil {
		dept.ID = uuid.New()
	}

	now := time.Now()
	dept.CreatedAt = now
	dept.UpdatedAt = now

	_, err := r.db.NamedExecContext(ctx, query, dept)
	return err
}

func (r *departmentRepository) Update(ctx context.Context, dept *Department) error {
	query := `
		UPDATE departments
		SET name = :name, description = :description, updated_at = :updated_at
		WHERE id = :id
	`

	dept.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, dept)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *departmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM departments WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *departmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*Department, error) {
	query := `SELECT * FROM departments WHERE id = $1`

	var dept Department
	err := r.db.GetContext(ctx, &dept, query, id)
	if err != nil {
		return nil, err
	}

	return &dept, nil
}

func (r *departmentRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID) ([]*Department, error) {
	query := `
		SELECT * FROM departments
		WHERE tenant_id = $1
		ORDER BY name ASC
	`

	var depts []*Department
	err := r.db.SelectContext(ctx, &depts, query, tenantID)
	if err != nil {
		return nil, err
	}

	return depts, nil
}

func (r *departmentRepository) List(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]*Department, int, error) {
	countQuery := `SELECT COUNT(*) FROM departments WHERE tenant_id = $1`
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, tenantID)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT * FROM departments
		WHERE tenant_id = $1
		ORDER BY name ASC
		LIMIT $2 OFFSET $3
	`

	var depts []*Department
	err = r.db.SelectContext(ctx, &depts, dataQuery, tenantID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return depts, total, nil
}

// 用户-部门关联
func (r *departmentRepository) AssignUserToDepartment(ctx context.Context, userID, departmentID uuid.UUID) error {
	query := `
		INSERT INTO user_departments (id, user_id, department_id, assigned_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, department_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, uuid.New(), userID, departmentID, time.Now())
	return err
}

func (r *departmentRepository) RemoveUserFromDepartment(ctx context.Context, userID, departmentID uuid.UUID) error {
	query := `DELETE FROM user_departments WHERE user_id = $1 AND department_id = $2`

	_, err := r.db.ExecContext(ctx, query, userID, departmentID)
	return err
}

func (r *departmentRepository) GetUserDepartments(ctx context.Context, userID uuid.UUID) ([]*Department, error) {
	query := `
		SELECT d.* FROM departments d
		INNER JOIN user_departments ud ON d.id = ud.department_id
		WHERE ud.user_id = $1
		ORDER BY d.name ASC
	`

	var depts []*Department
	err := r.db.SelectContext(ctx, &depts, query, userID)
	if err != nil {
		return nil, err
	}

	return depts, nil
}

func (r *departmentRepository) GetDepartmentUsers(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		SELECT user_id FROM user_departments
		WHERE department_id = $1
	`

	var userIDs []uuid.UUID
	err := r.db.SelectContext(ctx, &userIDs, query, departmentID)
	if err != nil {
		return nil, err
	}

	return userIDs, nil
}

// 部门-角色关联
func (r *departmentRepository) AssignRoleToDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error {
	query := `
		INSERT INTO department_roles (id, department_id, role_id, created_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (department_id, role_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, uuid.New(), departmentID, roleID, time.Now())
	return err
}

func (r *departmentRepository) RemoveRoleFromDepartment(ctx context.Context, departmentID, roleID uuid.UUID) error {
	query := `DELETE FROM department_roles WHERE department_id = $1 AND role_id = $2`

	_, err := r.db.ExecContext(ctx, query, departmentID, roleID)
	return err
}

func (r *departmentRepository) GetDepartmentRoles(ctx context.Context, departmentID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		SELECT role_id FROM department_roles
		WHERE department_id = $1
	`

	var roleIDs []uuid.UUID
	err := r.db.SelectContext(ctx, &roleIDs, query, departmentID)
	if err != nil {
		return nil, err
	}

	return roleIDs, nil
}

func (r *departmentRepository) GetRoleDepartments(ctx context.Context, roleID uuid.UUID) ([]*Department, error) {
	query := `
		SELECT d.* FROM departments d
		INNER JOIN department_roles dr ON d.id = dr.department_id
		WHERE dr.role_id = $1
		ORDER BY d.name ASC
	`

	var depts []*Department
	err := r.db.SelectContext(ctx, &depts, query, roleID)
	if err != nil {
		return nil, err
	}

	return depts, nil
}
