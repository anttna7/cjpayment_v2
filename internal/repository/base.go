package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Common repository errors
var (
	ErrNotFound = errors.New("record not found")
)

// BaseRepository provides common database operations
type BaseRepository struct {
	db *sqlx.DB
}

// NewBaseRepository creates a new base repository instance
func NewBaseRepository(db *sqlx.DB) *BaseRepository {
	return &BaseRepository{db: db}
}

// DB returns the underlying database connection
func (r *BaseRepository) DB() *sqlx.DB {
	return r.db
}

// WithTx executes a function within a database transaction
func (r *BaseRepository) WithTx(ctx context.Context, fn func(*sqlx.Tx) error) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	err = fn(tx)
	return err
}

// Exists checks if a record exists with the given condition
func (r *BaseRepository) Exists(ctx context.Context, table string, condition string, args ...interface{}) (bool, error) {
	query := fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM %s WHERE %s)", table, condition)
	var exists bool
	err := r.db.GetContext(ctx, &exists, query, args...)
	return exists, err
}

// Count returns the count of records matching the condition
func (r *BaseRepository) Count(ctx context.Context, table string, condition string, args ...interface{}) (int64, error) {
	query := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", table, condition)
	var count int64
	err := r.db.GetContext(ctx, &count, query, args...)
	return count, err
}

// GetByID retrieves a single record by ID
func (r *BaseRepository) GetByID(ctx context.Context, dest interface{}, table string, id interface{}) error {
	query := fmt.Sprintf("SELECT * FROM %s WHERE id = $1", table)
	return r.db.GetContext(ctx, dest, query, id)
}

// GetOne retrieves a single record matching the condition
func (r *BaseRepository) GetOne(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return r.db.GetContext(ctx, dest, query, args...)
}

// GetMany retrieves multiple records matching the condition
func (r *BaseRepository) GetMany(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	return r.db.SelectContext(ctx, dest, query, args...)
}

// Insert inserts a new record and returns the ID
func (r *BaseRepository) Insert(ctx context.Context, query string, args ...interface{}) (string, error) {
	var id string
	err := r.db.GetContext(ctx, &id, query+" RETURNING id", args...)
	return id, err
}

// Update updates records matching the condition
func (r *BaseRepository) Update(ctx context.Context, query string, args ...interface{}) (int64, error) {
	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// Delete deletes records matching the condition
func (r *BaseRepository) Delete(ctx context.Context, query string, args ...interface{}) (int64, error) {
	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// Exec executes a query without returning rows
func (r *BaseRepository) Exec(ctx context.Context, query string, args ...interface{}) error {
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// IsNoRowsError checks if the error is a "no rows" error
func IsNoRowsError(err error) bool {
	return err == sql.ErrNoRows
}