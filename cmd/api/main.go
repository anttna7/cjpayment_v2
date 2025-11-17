package main

import (
	"log"

	"github.com/company/cjpayment/internal/config"
	"github.com/company/cjpayment/internal/handler"
	"github.com/company/cjpayment/pkg/database"
	"github.com/company/cjpayment/pkg/logger"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	logger.Init(cfg.LogLevel)

	// Initialize database
	db, err := database.ConnectX(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Gin router
	router := gin.Default()

	// Initialize handlers
	h := handler.New(db, cfg)
	h.RegisterRoutes(router)

	// Start server
	port := cfg.Server.Port
	if port == "" {
		port = "8088"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}