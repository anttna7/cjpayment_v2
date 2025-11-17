package migration

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

// Manager handles database migrations
type Manager struct {
	migrate     *migrate.Migrate
	db          *sql.DB
	migrationsDir string
}

// MigrationInfo contains information about a migration
type MigrationInfo struct {
	Version     uint      `json:"version"`
	Name        string    `json:"name"`
	Applied     bool      `json:"applied"`
	AppliedAt   *time.Time `json:"applied_at,omitempty"`
	Description string    `json:"description"`
}

// Status represents the current migration status
type Status struct {
	CurrentVersion uint            `json:"current_version"`
	IsDirty        bool            `json:"is_dirty"`
	Migrations     []MigrationInfo `json:"migrations"`
}

// NewManager creates a new migration manager
func NewManager(dsn, migrationsDir string) (*Manager, error) {
	// Connect to database
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Create migration driver
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create migration driver: %w", err)
	}

	// Create migrate instance
	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsDir,
		"postgres",
		driver,
	)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create migrate instance: %w", err)
	}

	return &Manager{
		migrate:       m,
		db:            db,
		migrationsDir: migrationsDir,
	}, nil
}

// Close closes the migration manager
func (m *Manager) Close() error {
	if m.migrate != nil {
		if sourceErr, dbErr := m.migrate.Close(); sourceErr != nil || dbErr != nil {
			return fmt.Errorf("failed to close migrate instance: source=%v, db=%v", sourceErr, dbErr)
		}
	}
	if m.db != nil {
		return m.db.Close()
	}
	return nil
}

// Up runs all pending migrations
func (m *Manager) Up() error {
	err := m.migrate.Up()
	if err == migrate.ErrNoChange {
		return nil
	}
	return err
}

// Down rolls back all migrations
func (m *Manager) Down() error {
	err := m.migrate.Down()
	if err == migrate.ErrNoChange {
		return nil
	}
	return err
}

// Steps runs a specific number of migrations
func (m *Manager) Steps(n int) error {
	err := m.migrate.Steps(n)
	if err == migrate.ErrNoChange {
		return nil
	}
	return err
}

// Migrate to a specific version
func (m *Manager) Migrate(version uint) error {
	err := m.migrate.Migrate(version)
	if err == migrate.ErrNoChange {
		return nil
	}
	return err
}

// Force sets the database version without running migrations
func (m *Manager) Force(version int) error {
	return m.migrate.Force(version)
}

// Drop drops the entire database
func (m *Manager) Drop() error {
	return m.migrate.Drop()
}

// Version returns the current database version
func (m *Manager) Version() (uint, bool, error) {
	version, dirty, err := m.migrate.Version()
	if err == migrate.ErrNilVersion {
		return 0, false, nil
	}
	return version, dirty, err
}

// Status returns the current migration status
func (m *Manager) Status() (*Status, error) {
	version, dirty, err := m.Version()
	if err != nil {
		return nil, fmt.Errorf("failed to get version: %w", err)
	}

	migrations, err := m.listMigrations()
	if err != nil {
		return nil, fmt.Errorf("failed to list migrations: %w", err)
	}

	// Mark applied migrations
	for i := range migrations {
		if migrations[i].Version <= version && !dirty {
			migrations[i].Applied = true
			// Get applied timestamp from schema_migrations table
			appliedAt, err := m.getAppliedAt(migrations[i].Version)
			if err == nil && appliedAt != nil {
				migrations[i].AppliedAt = appliedAt
			}
		}
	}

	return &Status{
		CurrentVersion: version,
		IsDirty:        dirty,
		Migrations:     migrations,
	}, nil
}

// listMigrations lists all available migrations
func (m *Manager) listMigrations() ([]MigrationInfo, error) {
	files, err := filepath.Glob(filepath.Join(m.migrationsDir, "*.up.sql"))
	if err != nil {
		return nil, fmt.Errorf("failed to list migration files: %w", err)
	}

	var migrations []MigrationInfo
	for _, file := range files {
		basename := filepath.Base(file)
		parts := strings.Split(basename, "_")
		if len(parts) > 0 {
			if version, err := strconv.ParseUint(parts[0], 10, 32); err == nil {
				name := strings.TrimSuffix(strings.Join(parts[1:], "_"), ".up.sql")
				migrations = append(migrations, MigrationInfo{
					Version:     uint(version),
					Name:        name,
					Description: m.extractDescription(file),
				})
			}
		}
	}

	return migrations, nil
}

// extractDescription extracts description from migration file
func (m *Manager) extractDescription(filename string) string {
	// This is a simple implementation - you could enhance it to parse comments
	basename := filepath.Base(filename)
	parts := strings.Split(basename, "_")
	if len(parts) > 1 {
		name := strings.TrimSuffix(strings.Join(parts[1:], "_"), ".up.sql")
		return strings.ReplaceAll(name, "_", " ")
	}
	return ""
}

// getAppliedAt gets the timestamp when a migration was applied
func (m *Manager) getAppliedAt(version uint) (*time.Time, error) {
	var appliedAt time.Time
	query := `
		SELECT dirty, version 
		FROM schema_migrations 
		WHERE version = $1
	`
	
	var dirty bool
	var dbVersion uint
	err := m.db.QueryRow(query, version).Scan(&dirty, &dbVersion)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// For now, we can't get the exact timestamp from golang-migrate
	// This would require custom schema_migrations table or additional tracking
	return &appliedAt, nil
}

// Validate checks if all migrations are valid
func (m *Manager) Validate() error {
	// Check if migrations directory exists
	if _, err := os.Stat(m.migrationsDir); os.IsNotExist(err) {
		return fmt.Errorf("migrations directory does not exist: %s", m.migrationsDir)
	}

	// Check for missing down migrations
	upFiles, err := filepath.Glob(filepath.Join(m.migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("failed to list up migrations: %w", err)
	}

	for _, upFile := range upFiles {
		downFile := strings.Replace(upFile, ".up.sql", ".down.sql", 1)
		if _, err := os.Stat(downFile); os.IsNotExist(err) {
			return fmt.Errorf("missing down migration for %s", upFile)
		}
	}

	return nil
}

// Reset drops all tables and re-runs all migrations
func (m *Manager) Reset() error {
	if err := m.Drop(); err != nil {
		return fmt.Errorf("failed to drop database: %w", err)
	}
	
	if err := m.Up(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	
	return nil
}