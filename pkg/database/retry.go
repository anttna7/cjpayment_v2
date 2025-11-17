package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/config"
	"github.com/jmoiron/sqlx"
)

// RetryConfig defines retry configuration for database connections
type RetryConfig struct {
	MaxRetries    int
	InitialDelay  time.Duration
	MaxDelay      time.Duration
	BackoffFactor float64
}

// DefaultRetryConfig returns default retry configuration
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxRetries:    5,
		InitialDelay:  1 * time.Second,
		MaxDelay:      30 * time.Second,
		BackoffFactor: 2.0,
	}
}

// ConnectWithRetry establishes a database connection with retry logic
func ConnectWithRetry(cfg config.DatabaseConfig, retryConfig RetryConfig) (*sql.DB, error) {
	var db *sql.DB
	var err error
	
	delay := retryConfig.InitialDelay
	
	for attempt := 0; attempt <= retryConfig.MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(delay)
			// Exponential backoff with jitter
			delay = time.Duration(float64(delay) * retryConfig.BackoffFactor)
			if delay > retryConfig.MaxDelay {
				delay = retryConfig.MaxDelay
			}
		}
		
		db, err = Connect(cfg)
		if err == nil {
			return db, nil
		}
		
		if attempt < retryConfig.MaxRetries {
			fmt.Printf("Database connection attempt %d failed: %v. Retrying in %v...\n", 
				attempt+1, err, delay)
		}
	}
	
	return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", 
		retryConfig.MaxRetries+1, err)
}

// ConnectXWithRetry establishes a sqlx database connection with retry logic
func ConnectXWithRetry(cfg config.DatabaseConfig, retryConfig RetryConfig) (*sqlx.DB, error) {
	var db *sqlx.DB
	var err error
	
	delay := retryConfig.InitialDelay
	
	for attempt := 0; attempt <= retryConfig.MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(delay)
			// Exponential backoff with jitter
			delay = time.Duration(float64(delay) * retryConfig.BackoffFactor)
			if delay > retryConfig.MaxDelay {
				delay = retryConfig.MaxDelay
			}
		}
		
		db, err = ConnectX(cfg)
		if err == nil {
			return db, nil
		}
		
		if attempt < retryConfig.MaxRetries {
			fmt.Printf("Database connection attempt %d failed: %v. Retrying in %v...\n", 
				attempt+1, err, delay)
		}
	}
	
	return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", 
		retryConfig.MaxRetries+1, err)
}

// ExecuteWithRetry executes a database operation with retry logic
func ExecuteWithRetry(ctx context.Context, db *sql.DB, operation func(*sql.DB) error, retryConfig RetryConfig) error {
	var err error
	delay := retryConfig.InitialDelay
	
	for attempt := 0; attempt <= retryConfig.MaxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				// Continue with retry
			}
			
			delay = time.Duration(float64(delay) * retryConfig.BackoffFactor)
			if delay > retryConfig.MaxDelay {
				delay = retryConfig.MaxDelay
			}
		}
		
		err = operation(db)
		if err == nil {
			return nil
		}
		
		// Check if error is retryable
		if !isRetryableError(err) {
			return err
		}
		
		if attempt < retryConfig.MaxRetries {
			fmt.Printf("Database operation attempt %d failed: %v. Retrying in %v...\n", 
				attempt+1, err, delay)
		}
	}
	
	return fmt.Errorf("database operation failed after %d attempts: %w", 
		retryConfig.MaxRetries+1, err)
}

// isRetryableError determines if an error is retryable
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}
	
	// Check for common retryable database errors
	errStr := err.Error()
	retryableErrors := []string{
		"connection refused",
		"connection reset",
		"timeout",
		"temporary failure",
		"server closed the connection",
		"broken pipe",
	}
	
	for _, retryableErr := range retryableErrors {
		if contains(errStr, retryableErr) {
			return true
		}
	}
	
	return false
}

// contains checks if a string contains a substring (case-insensitive)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		(s == substr || len(substr) == 0 || 
		 (len(s) > len(substr) && containsHelper(s, substr)))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}