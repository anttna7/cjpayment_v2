package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/pkg/database"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to database
	db, err := database.ConnectX(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Hash password
	password := "admin123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Create admin user
	ctx := context.Background()
	
	// Check if admin user already exists
	var count int
	err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users WHERE username = $1", "admin").Scan(&count)
	if err != nil {
		log.Fatalf("Failed to check existing admin user: %v", err)
	}

	if count > 0 {
		fmt.Println("Admin user already exists")
		return
	}

	// Insert admin user
	var userID string
	err = db.QueryRowContext(ctx, `
		INSERT INTO users (username, email, password_hash, full_name, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, "admin", "admin@cjpayment.com", string(hashedPassword), "系统管理员", "active", time.Now(), time.Now()).Scan(&userID)
	
	if err != nil {
		log.Fatalf("Failed to create admin user: %v", err)
	}

	// Get super_admin role ID
	var roleID string
	err = db.QueryRowContext(ctx, "SELECT id FROM roles WHERE code = $1", "super_admin").Scan(&roleID)
	if err != nil {
		log.Fatalf("Failed to get super_admin role: %v", err)
	}

	// Assign super_admin role to admin user
	_, err = db.ExecContext(ctx, `
		INSERT INTO user_roles (user_id, role_id, assigned_at)
		VALUES ($1, $2, $3)
	`, userID, roleID, time.Now())
	
	if err != nil {
		log.Fatalf("Failed to assign role to admin user: %v", err)
	}

	fmt.Printf("Admin user created successfully!\n")
	fmt.Printf("Username: admin\n")
	fmt.Printf("Password: %s\n", password)
	fmt.Printf("Email: admin@cjpayment.com\n")
}