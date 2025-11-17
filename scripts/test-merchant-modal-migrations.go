package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/pkg/migration"
	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Construct DSN
	var dsn string
	if cfg.Database.DSN != "" {
		dsn = cfg.Database.DSN
	} else {
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Database.Host, cfg.Database.Port, cfg.Database.User, cfg.Database.Password, cfg.Database.DBName, cfg.Database.SSLMode)
	}

	// Create migration manager
	manager, err := migration.NewManager(dsn, "migrations")
	if err != nil {
		log.Fatalf("Failed to create migration manager: %v", err)
	}
	defer manager.Close()

	// Test migration validation
	fmt.Println("Validating migrations...")
	if err := manager.Validate(); err != nil {
		log.Fatalf("Migration validation failed: %v", err)
	}
	fmt.Println("✓ Migration validation passed")

	// Get current status
	fmt.Println("\nChecking current migration status...")
	status, err := manager.Status()
	if err != nil {
		log.Fatalf("Failed to get migration status: %v", err)
	}

	fmt.Printf("Current version: %d\n", status.CurrentVersion)
	fmt.Printf("Is dirty: %t\n", status.IsDirty)

	// Test database connection and verify new fields exist after migration
	fmt.Println("\nTesting database schema...")
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Check if new merchant fields exist
	merchantFields := []string{"agent_name", "port_name", "remark"}
	for _, field := range merchantFields {
		if err := checkColumnExists(db, "merchants", field); err != nil {
			fmt.Printf("⚠ Field 'merchants.%s' not found: %v\n", field, err)
		} else {
			fmt.Printf("✓ Field 'merchants.%s' exists\n", field)
		}
	}

	// Check if custom_payment_provider field exists in receive_accounts
	if err := checkColumnExists(db, "receive_accounts", "custom_payment_provider"); err != nil {
		fmt.Printf("⚠ Field 'receive_accounts.custom_payment_provider' not found: %v\n", err)
	} else {
		fmt.Printf("✓ Field 'receive_accounts.custom_payment_provider' exists\n")
	}

	// Check if agent_suggestions table exists
	if err := checkTableExists(db, "agent_suggestions"); err != nil {
		fmt.Printf("⚠ Table 'agent_suggestions' not found: %v\n", err)
	} else {
		fmt.Printf("✓ Table 'agent_suggestions' exists\n")
		
		// Check agent_suggestions table structure
		agentSuggestionFields := []string{"id", "agent_name", "usage_count", "last_used_at", "created_at", "updated_at"}
		for _, field := range agentSuggestionFields {
			if err := checkColumnExists(db, "agent_suggestions", field); err != nil {
				fmt.Printf("⚠ Field 'agent_suggestions.%s' not found: %v\n", field, err)
			} else {
				fmt.Printf("✓ Field 'agent_suggestions.%s' exists\n", field)
			}
		}
	}

	// Check indexes
	fmt.Println("\nChecking indexes...")
	indexes := []struct {
		table string
		name  string
	}{
		{"merchants", "idx_merchants_agent_name"},
		{"merchants", "idx_merchants_port_name_unique"},
		{"receive_accounts", "idx_receive_accounts_custom_provider"},
		{"agent_suggestions", "idx_agent_suggestions_name"},
		{"agent_suggestions", "idx_agent_suggestions_usage"},
		{"agent_suggestions", "idx_agent_suggestions_last_used"},
	}

	for _, idx := range indexes {
		if err := checkIndexExists(db, idx.table, idx.name); err != nil {
			fmt.Printf("⚠ Index '%s' on table '%s' not found: %v\n", idx.name, idx.table, err)
		} else {
			fmt.Printf("✓ Index '%s' on table '%s' exists\n", idx.name, idx.table)
		}
	}

	fmt.Println("\n✅ Migration test completed successfully!")
}

func checkColumnExists(db *sql.DB, tableName, columnName string) error {
	query := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = $1 AND column_name = $2
	`
	var name string
	err := db.QueryRow(query, tableName, columnName).Scan(&name)
	if err == sql.ErrNoRows {
		return fmt.Errorf("column does not exist")
	}
	return err
}

func checkTableExists(db *sql.DB, tableName string) error {
	query := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_name = $1 AND table_schema = 'public'
	`
	var name string
	err := db.QueryRow(query, tableName).Scan(&name)
	if err == sql.ErrNoRows {
		return fmt.Errorf("table does not exist")
	}
	return err
}

func checkIndexExists(db *sql.DB, tableName, indexName string) error {
	query := `
		SELECT indexname 
		FROM pg_indexes 
		WHERE tablename = $1 AND indexname = $2
	`
	var name string
	err := db.QueryRow(query, tableName, indexName).Scan(&name)
	if err == sql.ErrNoRows {
		return fmt.Errorf("index does not exist")
	}
	return err
}