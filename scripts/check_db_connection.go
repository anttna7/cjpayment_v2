// +build tools

package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "root:password@tcp(localhost:3306)/cjpayment_test?charset=utf8mb4&parseTime=True&loc=Local"
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Printf("Failed to open database connection: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Printf("Failed to ping database: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Database connection successful")
}