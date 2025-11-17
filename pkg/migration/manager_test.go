package migration

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/lib/pq"
)

func TestMigrationManager(t *testing.T) {
	// Skip if no test database is available
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set, skipping integration tests")
	}

	// Create temporary migrations directory
	tempDir := t.TempDir()
	migrationsDir := filepath.Join(tempDir, "migrations")
	if err := os.MkdirAll(migrationsDir, 0755); err != nil {
		t.Fatalf("Failed to create migrations directory: %v", err)
	}

	// Create test migration files
	upSQL := `CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));`
	downSQL := `DROP TABLE IF EXISTS test_table;`

	upFile := filepath.Join(migrationsDir, "001_test_migration.up.sql")
	downFile := filepath.Join(migrationsDir, "001_test_migration.down.sql")

	if err := os.WriteFile(upFile, []byte(upSQL), 0644); err != nil {
		t.Fatalf("Failed to create up migration: %v", err)
	}
	if err := os.WriteFile(downFile, []byte(downSQL), 0644); err != nil {
		t.Fatalf("Failed to create down migration: %v", err)
	}

	// Test migration manager
	manager, err := NewManager(dsn, migrationsDir)
	if err != nil {
		t.Fatalf("Failed to create migration manager: %v", err)
	}
	defer manager.Close()

	// Test Up migration
	if err := manager.Up(); err != nil {
		t.Fatalf("Failed to run up migration: %v", err)
	}

	// Test Version
	version, dirty, err := manager.Version()
	if err != nil {
		t.Fatalf("Failed to get version: %v", err)
	}
	if version != 1 {
		t.Errorf("Expected version 1, got %d", version)
	}
	if dirty {
		t.Error("Expected clean state, got dirty")
	}

	// Test Status
	status, err := manager.Status()
	if err != nil {
		t.Fatalf("Failed to get status: %v", err)
	}
	if status.CurrentVersion != 1 {
		t.Errorf("Expected current version 1, got %d", status.CurrentVersion)
	}
	if len(status.Migrations) != 1 {
		t.Errorf("Expected 1 migration, got %d", len(status.Migrations))
	}

	// Test Down migration
	if err := manager.Steps(-1); err != nil {
		t.Fatalf("Failed to run down migration: %v", err)
	}

	// Verify table was dropped
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	var exists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'test_table'
		)
	`).Scan(&exists)
	if err != nil {
		t.Fatalf("Failed to check table existence: %v", err)
	}
	if exists {
		t.Error("Expected test_table to be dropped")
	}
}

func TestValidate(t *testing.T) {
	// Create temporary migrations directory
	tempDir := t.TempDir()
	migrationsDir := filepath.Join(tempDir, "migrations")
	if err := os.MkdirAll(migrationsDir, 0755); err != nil {
		t.Fatalf("Failed to create migrations directory: %v", err)
	}

	// Create only up migration (missing down migration)
	upFile := filepath.Join(migrationsDir, "001_test_migration.up.sql")
	if err := os.WriteFile(upFile, []byte("CREATE TABLE test;"), 0644); err != nil {
		t.Fatalf("Failed to create up migration: %v", err)
	}

	// Create manager with mock DSN (won't be used for validation)
	manager := &Manager{
		migrationsDir: migrationsDir,
	}

	// Validation should fail due to missing down migration
	if err := manager.Validate(); err == nil {
		t.Error("Expected validation to fail due to missing down migration")
	}

	// Create down migration
	downFile := filepath.Join(migrationsDir, "001_test_migration.down.sql")
	if err := os.WriteFile(downFile, []byte("DROP TABLE test;"), 0644); err != nil {
		t.Fatalf("Failed to create down migration: %v", err)
	}

	// Validation should now pass
	if err := manager.Validate(); err != nil {
		t.Errorf("Expected validation to pass, got error: %v", err)
	}
}