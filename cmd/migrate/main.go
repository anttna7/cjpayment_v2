package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

const (
	migrationsDir = "migrations"
)

func main() {
	var (
		command = flag.String("command", "up", "Migration command: up, down, create, status, version, force, drop")
		steps   = flag.Int("steps", 0, "Number of migration steps (0 for all)")
		name    = flag.String("name", "", "Migration name for create command")
		version = flag.Uint("version", 0, "Version for force command")
	)
	flag.Parse()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	switch *command {
	case "create":
		if *name == "" {
			log.Fatal("Migration name is required for create command")
		}
		createMigration(*name)
	case "up", "down", "status", "version", "force", "drop":
		runMigration(*command, *steps, *version, cfg)
	default:
		log.Fatalf("Invalid command: %s. Use 'up', 'down', 'create', 'status', 'version', 'force', or 'drop'", *command)
	}
}

func createMigration(name string) {
	// Ensure migrations directory exists
	if err := os.MkdirAll(migrationsDir, 0755); err != nil {
		log.Fatalf("Failed to create migrations directory: %v", err)
	}

	// Generate timestamp
	timestamp := time.Now().Format("20060102150405")
	
	// Clean migration name
	cleanName := strings.ReplaceAll(strings.ToLower(name), " ", "_")
	
	// Create migration files
	upFile := filepath.Join(migrationsDir, fmt.Sprintf("%s_%s.up.sql", timestamp, cleanName))
	downFile := filepath.Join(migrationsDir, fmt.Sprintf("%s_%s.down.sql", timestamp, cleanName))

	// Create up migration file
	upContent := fmt.Sprintf(`-- Migration: %s
-- Created at: %s
-- Description: %s

BEGIN;

-- Add your migration SQL here


COMMIT;
`, name, time.Now().Format("2006-01-02 15:04:05"), name)

	if err := os.WriteFile(upFile, []byte(upContent), 0644); err != nil {
		log.Fatalf("Failed to create up migration file: %v", err)
	}

	// Create down migration file
	downContent := fmt.Sprintf(`-- Rollback migration: %s
-- Created at: %s
-- Description: Rollback %s

BEGIN;

-- Add your rollback SQL here


COMMIT;
`, name, time.Now().Format("2006-01-02 15:04:05"), name)

	if err := os.WriteFile(downFile, []byte(downContent), 0644); err != nil {
		log.Fatalf("Failed to create down migration file: %v", err)
	}

	fmt.Printf("Created migration files:\n")
	fmt.Printf("  %s\n", upFile)
	fmt.Printf("  %s\n", downFile)
}

func runMigration(command string, steps int, version uint, cfg *config.Config) {
	// Construct DSN
	var dsn string
	if cfg.Database.DSN != "" {
		dsn = cfg.Database.DSN
	} else {
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.DBName, cfg.Database.SSLMode)
	}

	// Connect to database
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Create migration driver
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("Failed to create migration driver: %v", err)
	}

	// Create migrate instance
	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsDir,
		"postgres",
		driver,
	)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer m.Close()

	// Execute command
	switch command {
	case "up":
		err = runUp(m, steps)
	case "down":
		err = runDown(m, steps)
	case "status":
		showStatus(m)
		return
	case "version":
		showVersion(m)
		return
	case "force":
		if version == 0 {
			log.Fatal("Version is required for force command")
		}
		err = m.Force(int(version))
		if err == nil {
			fmt.Printf("Forced database version to %d\n", version)
		}
	case "drop":
		fmt.Print("Are you sure you want to drop the entire database? This action cannot be undone. (y/N): ")
		var response string
		fmt.Scanln(&response)
		if strings.ToLower(response) == "y" || strings.ToLower(response) == "yes" {
			err = m.Drop()
			if err == nil {
				fmt.Println("Database dropped successfully")
			}
		} else {
			fmt.Println("Operation cancelled")
			return
		}
	}

	if err != nil {
		if err == migrate.ErrNoChange {
			fmt.Println("No migrations to apply")
		} else {
			log.Fatalf("Migration failed: %v", err)
		}
	} else {
		fmt.Printf("Migration '%s' completed successfully\n", command)
	}
}

func runUp(m *migrate.Migrate, steps int) error {
	if steps == 0 {
		return m.Up()
	}
	return m.Steps(steps)
}

func runDown(m *migrate.Migrate, steps int) error {
	if steps == 0 {
		return m.Down()
	}
	return m.Steps(-steps)
}

func showStatus(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if err != nil {
		if err == migrate.ErrNilVersion {
			fmt.Println("Database version: No migrations applied")
		} else {
			log.Fatalf("Failed to get database version: %v", err)
		}
		return
	}

	fmt.Printf("Database version: %d\n", version)
	if dirty {
		fmt.Println("Status: DIRTY (migration failed or was interrupted)")
		fmt.Println("Note: Use 'force' command to fix dirty state")
	} else {
		fmt.Println("Status: CLEAN")
	}

	// Show available migrations
	showAvailableMigrations()
}

func showVersion(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if err != nil {
		if err == migrate.ErrNilVersion {
			fmt.Println("0")
		} else {
			log.Fatalf("Failed to get database version: %v", err)
		}
		return
	}

	if dirty {
		fmt.Printf("%d (dirty)\n", version)
	} else {
		fmt.Printf("%d\n", version)
	}
}

func showAvailableMigrations() {
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		log.Printf("Failed to list migration files: %v", err)
		return
	}

	if len(files) == 0 {
		fmt.Println("No migration files found")
		return
	}

	fmt.Println("\nAvailable migrations:")
	for _, file := range files {
		basename := filepath.Base(file)
		// Extract version from filename
		parts := strings.Split(basename, "_")
		if len(parts) > 0 {
			if version, err := strconv.Atoi(parts[0]); err == nil {
				name := strings.TrimSuffix(strings.Join(parts[1:], "_"), ".up.sql")
				fmt.Printf("  %d: %s\n", version, name)
			}
		}
	}
}
