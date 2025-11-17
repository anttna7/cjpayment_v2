package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	migrationsDir := "migrations"
	
	fmt.Println("Validating merchant modal migration files...")
	
	// Check if migrations directory exists
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Fatalf("Migrations directory does not exist: %s", migrationsDir)
	}
	
	// Define expected migration files
	expectedFiles := []string{
		"20250808180000_add_merchant_modal_fields.up.sql",
		"20250808180000_add_merchant_modal_fields.down.sql",
		"20250808180100_create_agent_suggestions_table.up.sql",
		"20250808180100_create_agent_suggestions_table.down.sql",
	}
	
	// Check if all expected files exist
	for _, filename := range expectedFiles {
		filepath := filepath.Join(migrationsDir, filename)
		if _, err := os.Stat(filepath); os.IsNotExist(err) {
			log.Fatalf("Migration file does not exist: %s", filepath)
		}
		fmt.Printf("✓ Found migration file: %s\n", filename)
	}
	
	// Validate file contents
	fmt.Println("\nValidating migration file contents...")
	
	// Validate merchant modal fields migration
	validateMerchantModalFieldsMigration()
	
	// Validate agent suggestions table migration
	validateAgentSuggestionsTableMigration()
	
	fmt.Println("\n✅ All migration files validated successfully!")
	fmt.Println("\nTo apply these migrations:")
	fmt.Println("1. Start the database service")
	fmt.Println("2. Run: go run cmd/migrate/main.go -command=up")
	fmt.Println("3. Verify with: go run cmd/migrate/main.go -command=status")
}

func validateMerchantModalFieldsMigration() {
	// Check up migration
	upFile := "migrations/20250808180000_add_merchant_modal_fields.up.sql"
	upContent, err := ioutil.ReadFile(upFile)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", upFile, err)
	}
	
	upContentStr := string(upContent)
	
	// Check for required ALTER TABLE statements
	requiredStatements := []string{
		"ALTER TABLE merchants ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100)",
		"ALTER TABLE merchants ADD COLUMN IF NOT EXISTS port_name VARCHAR(50)",
		"ALTER TABLE merchants ADD COLUMN IF NOT EXISTS remark TEXT",
		"ALTER TABLE receive_accounts ADD COLUMN IF NOT EXISTS custom_payment_provider VARCHAR(50)",
	}
	
	for _, stmt := range requiredStatements {
		if !strings.Contains(upContentStr, stmt) {
			log.Fatalf("Missing required statement in %s: %s", upFile, stmt)
		}
	}
	
	// Check for required indexes
	requiredIndexes := []string{
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_port_name_unique",
		"CREATE INDEX IF NOT EXISTS idx_merchants_agent_name",
		"CREATE INDEX IF NOT EXISTS idx_receive_accounts_custom_provider",
	}
	
	for _, idx := range requiredIndexes {
		if !strings.Contains(upContentStr, idx) {
			log.Fatalf("Missing required index in %s: %s", upFile, idx)
		}
	}
	
	fmt.Printf("✓ Validated merchant modal fields up migration\n")
	
	// Check down migration
	downFile := "migrations/20250808180000_add_merchant_modal_fields.down.sql"
	downContent, err := ioutil.ReadFile(downFile)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", downFile, err)
	}
	
	downContentStr := string(downContent)
	
	// Check for required DROP statements
	requiredDrops := []string{
		"ALTER TABLE merchants DROP COLUMN IF EXISTS agent_name",
		"ALTER TABLE merchants DROP COLUMN IF EXISTS port_name",
		"ALTER TABLE merchants DROP COLUMN IF EXISTS remark",
		"ALTER TABLE receive_accounts DROP COLUMN IF EXISTS custom_payment_provider",
	}
	
	for _, stmt := range requiredDrops {
		if !strings.Contains(downContentStr, stmt) {
			log.Fatalf("Missing required drop statement in %s: %s", downFile, stmt)
		}
	}
	
	fmt.Printf("✓ Validated merchant modal fields down migration\n")
}

func validateAgentSuggestionsTableMigration() {
	// Check up migration
	upFile := "migrations/20250808180100_create_agent_suggestions_table.up.sql"
	upContent, err := ioutil.ReadFile(upFile)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", upFile, err)
	}
	
	upContentStr := string(upContent)
	
	// Check for CREATE TABLE statement
	if !strings.Contains(upContentStr, "CREATE TABLE agent_suggestions") {
		log.Fatalf("Missing CREATE TABLE statement in %s", upFile)
	}
	
	// Check for required columns
	requiredColumns := []string{
		"id UUID PRIMARY KEY DEFAULT gen_random_uuid()",
		"agent_name VARCHAR(100) NOT NULL UNIQUE",
		"usage_count INTEGER DEFAULT 1",
		"last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
		"created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
		"updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
	}
	
	for _, col := range requiredColumns {
		if !strings.Contains(upContentStr, col) {
			log.Fatalf("Missing required column in %s: %s", upFile, col)
		}
	}
	
	// Check for required indexes
	requiredIndexes := []string{
		"CREATE INDEX idx_agent_suggestions_name ON agent_suggestions(agent_name)",
		"CREATE INDEX idx_agent_suggestions_usage ON agent_suggestions(usage_count DESC)",
		"CREATE INDEX idx_agent_suggestions_last_used ON agent_suggestions(last_used_at DESC)",
	}
	
	for _, idx := range requiredIndexes {
		if !strings.Contains(upContentStr, idx) {
			log.Fatalf("Missing required index in %s: %s", upFile, idx)
		}
	}
	
	// Check for trigger
	if !strings.Contains(upContentStr, "CREATE TRIGGER trigger_agent_suggestions_updated_at") {
		log.Fatalf("Missing trigger in %s", upFile)
	}
	
	fmt.Printf("✓ Validated agent suggestions table up migration\n")
	
	// Check down migration
	downFile := "migrations/20250808180100_create_agent_suggestions_table.down.sql"
	downContent, err := ioutil.ReadFile(downFile)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", downFile, err)
	}
	
	downContentStr := string(downContent)
	
	// Check for DROP statements
	if !strings.Contains(downContentStr, "DROP TABLE IF EXISTS agent_suggestions") {
		log.Fatalf("Missing DROP TABLE statement in %s", downFile)
	}
	
	if !strings.Contains(downContentStr, "DROP TRIGGER IF EXISTS trigger_agent_suggestions_updated_at") {
		log.Fatalf("Missing DROP TRIGGER statement in %s", downFile)
	}
	
	if !strings.Contains(downContentStr, "DROP FUNCTION IF EXISTS update_agent_suggestions_updated_at()") {
		log.Fatalf("Missing DROP FUNCTION statement in %s", downFile)
	}
	
	fmt.Printf("✓ Validated agent suggestions table down migration\n")
}