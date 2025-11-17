package database

import (
	"fmt"
	"github.com/company/cjpayment/internal/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"           // PostgreSQL driver
	_ "github.com/go-sql-driver/mysql" // MySQL driver
	_ "github.com/mattn/go-sqlite3"  // SQLite driver for sqlx
	_ "gorm.io/driver/sqlite"      // SQLite driver for GORM
	"gorm.io/gorm"
	"gorm.io/driver/postgres"
	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
)

// ConnectX establishes a sqlx database connection based on the configuration
func ConnectX(cfg config.DatabaseConfig) (*sqlx.DB, error) {
	var dsn string
	var driver string
	
	// Check for custom DSN first
	if cfg.DSN != "" {
		return sqlx.Connect("postgres", cfg.DSN)
	}
	
	// Build DSN based on driver type
	if cfg.Driver != "" {
		driver = cfg.Driver
	} else {
		driver = "postgres" // default
	}
	
	switch driver {
	case "sqlite":
		dsn = cfg.DBName
		return sqlx.Connect("sqlite3", dsn)
		
	case "mysql":
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)
		return sqlx.Connect("mysql", dsn)
		
	case "postgres":
		fallthrough
	default:
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)
		return sqlx.Connect("postgres", dsn)
	}
}

// Connect establishes a standard database connection (for compatibility)
func Connect(cfg config.DatabaseConfig) (*sqlx.DB, error) {
	return ConnectX(cfg)
}

// ConnectGORM establishes a GORM database connection
func ConnectGORM(cfg config.DatabaseConfig) (*gorm.DB, error) {
	var dsn string
	var driver string
	
	// Check for custom DSN first
	if cfg.DSN != "" {
		return gorm.Open(postgres.Open(cfg.DSN), &gorm.Config{})
	}
	
	// Build DSN based on driver type
	if cfg.Driver != "" {
		driver = cfg.Driver
	} else {
		driver = "postgres" // default
	}
	
	switch driver {
	case "sqlite":
		dsn = cfg.DBName
		return gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		
	case "mysql":
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.DBName)
		return gorm.Open(mysql.Open(dsn), &gorm.Config{})
		
	case "postgres":
		fallthrough
	default:
		dsn = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)
		return gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}
}