package repository

import (
	"context"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func setupTestDB(t *testing.T) *sqlx.DB {
	// This would typically use a test database
	// For now, we'll skip actual database tests
	t.Skip("Database tests require test database setup")
	return nil
}

func TestBaseRepository_WithTx(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewBaseRepository(db)
	ctx := context.Background()

	// Test successful transaction
	err := repo.WithTx(ctx, func(tx *sqlx.Tx) error {
		// This would perform some database operations
		return nil
	})

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
}

func TestBaseRepository_Exists(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewBaseRepository(db)
	ctx := context.Background()

	// Test exists check
	exists, err := repo.Exists(ctx, "users", "id = $1", "test-id")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Should be false for non-existent record
	if exists {
		t.Errorf("Expected false, got %v", exists)
	}
}

func TestBaseRepository_Count(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewBaseRepository(db)
	ctx := context.Background()

	// Test count
	count, err := repo.Count(ctx, "users", "status = $1", "active")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Should be 0 for empty table
	if count < 0 {
		t.Errorf("Expected non-negative count, got %v", count)
	}
}

func TestIsNoRowsError(t *testing.T) {
	// Test with nil error
	if IsNoRowsError(nil) {
		t.Error("Expected false for nil error")
	}

	// Test with different error
	err := context.Canceled
	if IsNoRowsError(err) {
		t.Error("Expected false for non-sql error")
	}
}