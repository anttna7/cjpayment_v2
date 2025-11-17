package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func main() {
	migrationsDir := "migrations"
	
	// Check if migrations directory exists
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Fatalf("Migrations directory '%s' does not exist", migrationsDir)
	}

	// Get all migration files
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		log.Fatalf("Failed to list migration files: %v", err)
	}

	if len(files) == 0 {
		fmt.Println("No migration files found")
		return
	}

	// Group files by version
	migrations := make(map[string][]string)
	for _, file := range files {
		basename := filepath.Base(file)
		parts := strings.Split(basename, "_")
		if len(parts) < 2 {
			log.Printf("Warning: Invalid migration file name format: %s", basename)
			continue
		}

		version := parts[0]
		if _, err := strconv.Atoi(version); err != nil {
			log.Printf("Warning: Invalid version number in file: %s", basename)
			continue
		}

		migrations[version] = append(migrations[version], file)
	}

	// Validate migrations
	var errors []string
	var validMigrations []string

	for version, files := range migrations {
		hasUp := false
		hasDown := false

		for _, file := range files {
			if strings.Contains(file, ".up.sql") {
				hasUp = true
			}
			if strings.Contains(file, ".down.sql") {
				hasDown = true
			}
		}

		if !hasUp {
			errors = append(errors, fmt.Sprintf("Version %s: Missing up migration", version))
		}
		if !hasDown {
			errors = append(errors, fmt.Sprintf("Version %s: Missing down migration", version))
		}

		if hasUp && hasDown {
			validMigrations = append(validMigrations, version)
		}
	}

	// Print results
	fmt.Printf("Migration Validation Results\n")
	fmt.Printf("============================\n\n")

	if len(validMigrations) > 0 {
		fmt.Printf("✅ Valid Migrations (%d):\n", len(validMigrations))
		for _, version := range validMigrations {
			fmt.Printf("  - Version %s\n", version)
		}
		fmt.Println()
	}

	if len(errors) > 0 {
		fmt.Printf("❌ Validation Errors (%d):\n", len(errors))
		for _, err := range errors {
			fmt.Printf("  - %s\n", err)
		}
		fmt.Println()
		os.Exit(1)
	}

	fmt.Printf("🎉 All migrations are valid!\n")
	fmt.Printf("Total migrations: %d\n", len(validMigrations))
}