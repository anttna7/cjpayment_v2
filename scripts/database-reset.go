package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// DatabaseResetRequest represents the database reset request
type DatabaseResetRequest struct {
	ResetTypes     []string `json:"reset_types"`
	PreserveTables []string `json:"preserve_tables"`
	DryRun         bool     `json:"dry_run"`
	BackupBefore   bool     `json:"backup_before"`
}

// CleanupRequest represents the cleanup request
type CleanupRequest struct {
	DataTypes    []string `json:"data_types"`
	TestPrefix   string   `json:"test_prefix"`
	CreatedAfter string   `json:"created_after,omitempty"`
	DryRun       bool     `json:"dry_run"`
}

func main() {
	// Get API base URL from environment or use default
	apiBaseURL := os.Getenv("API_BASE_URL")
	if apiBaseURL == "" {
		apiBaseURL = "http://localhost:8080"
	}

	// Parse command line arguments
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "reset-limits":
		resetLimits(apiBaseURL)
	case "reset-counters":
		resetCounters(apiBaseURL)
	case "reset-cache":
		resetCache(apiBaseURL)
	case "reset-logs":
		resetLogs(apiBaseURL)
	case "reset-all":
		resetAll(apiBaseURL)
	case "cleanup-test":
		cleanupTestData(apiBaseURL)
	case "cleanup-all":
		cleanupAllTestData(apiBaseURL)
	case "validate-integrity":
		validateIntegrity(apiBaseURL)
	case "statistics":
		getStatistics(apiBaseURL)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: go run database-reset.go <command>")
	fmt.Println("")
	fmt.Println("Commands:")
	fmt.Println("  reset-limits      - Reset daily usage limits for merchants and accounts")
	fmt.Println("  reset-counters    - Reset various counters and statistics")
	fmt.Println("  reset-cache       - Clear cache data")
	fmt.Println("  reset-logs        - Clean up old log entries")
	fmt.Println("  reset-all         - Reset all database states")
	fmt.Println("  cleanup-test      - Clean up test data")
	fmt.Println("  cleanup-all       - Clean up all test data types")
	fmt.Println("  validate-integrity - Validate data integrity")
	fmt.Println("  statistics        - Get cleanup statistics")
	fmt.Println("")
	fmt.Println("Environment variables:")
	fmt.Println("  API_BASE_URL - Base URL for the API (default: http://localhost:8080)")
	fmt.Println("")
	fmt.Println("Examples:")
	fmt.Println("  go run database-reset.go reset-limits")
	fmt.Println("  go run database-reset.go cleanup-test")
	fmt.Println("  API_BASE_URL=http://staging:8080 go run database-reset.go reset-all")
}

func resetLimits(baseURL string) {
	req := DatabaseResetRequest{
		ResetTypes:   []string{"limits"},
		DryRun:       false,
		BackupBefore: true,
	}

	url := fmt.Sprintf("%s/api/v1/data-cleanup/reset-database", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to reset limits: %v", err)
	}

	fmt.Printf("✅ Reset limits successfully:\n%s\n", response)
}

func resetCounters(baseURL string) {
	req := DatabaseResetRequest{
		ResetTypes:   []string{"counters"},
		DryRun:       false,
		BackupBefore: false,
	}

	url := fmt.Sprintf("%s/api/v1/data-cleanup/reset-database", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to reset counters: %v", err)
	}

	fmt.Printf("✅ Reset counters successfully:\n%s\n", response)
}

func resetCache(baseURL string) {
	req := DatabaseResetRequest{
		ResetTypes: []string{"cache"},
		DryRun:     false,
	}

	url := fmt.Sprintf("%s/api/v1/data-cleanup/reset-database", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to reset cache: %v", err)
	}

	fmt.Printf("✅ Reset cache successfully:\n%s\n", response)
}

func resetLogs(baseURL string) {
	req := DatabaseResetRequest{
		ResetTypes: []string{"logs"},
		DryRun:     false,
	}

	url := fmt.Sprintf("%s/api/v1/data-cleanup/reset-database", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to reset logs: %v", err)
	}

	fmt.Printf("✅ Reset logs successfully:\n%s\n", response)
}

func resetAll(baseURL string) {
	req := DatabaseResetRequest{
		ResetTypes:   []string{"limits", "counters", "cache", "logs"},
		DryRun:       false,
		BackupBefore: true,
	}

	url := fmt.Sprintf("%s/api/v1/data-cleanup/reset-database", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to reset database: %v", err)
	}

	fmt.Printf("✅ Reset database successfully:\n%s\n", response)
}

func cleanupTestData(baseURL string) {
	req := CleanupRequest{
		DataTypes:  []string{"orders", "accounts", "merchants"},
		TestPrefix: "Test",
		DryRun:     false,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/cleanup", baseURL)
	response, err := makeRequest("DELETE", url, req)
	if err != nil {
		log.Fatalf("Failed to cleanup test data: %v", err)
	}

	fmt.Printf("✅ Cleaned up test data successfully:\n%s\n", response)
}

func cleanupAllTestData(baseURL string) {
	req := CleanupRequest{
		DataTypes:  []string{"orders", "relationships", "accounts", "merchants", "users", "roles"},
		TestPrefix: "Test",
		DryRun:     false,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/cleanup", baseURL)
	response, err := makeRequest("DELETE", url, req)
	if err != nil {
		log.Fatalf("Failed to cleanup all test data: %v", err)
	}

	fmt.Printf("✅ Cleaned up all test data successfully:\n%s\n", response)
}

func validateIntegrity(baseURL string) {
	url := fmt.Sprintf("%s/api/v1/data-cleanup/validate-integrity", baseURL)
	response, err := makeRequest("GET", url, nil)
	if err != nil {
		log.Fatalf("Failed to validate integrity: %v", err)
	}

	fmt.Printf("✅ Data integrity validation completed:\n%s\n", response)
}

func getStatistics(baseURL string) {
	url := fmt.Sprintf("%s/api/v1/data-cleanup/statistics", baseURL)
	response, err := makeRequest("GET", url, nil)
	if err != nil {
		log.Fatalf("Failed to get statistics: %v", err)
	}

	fmt.Printf("📊 Cleanup statistics:\n%s\n", response)
}

func makeRequest(method, url string, payload interface{}) (string, error) {
	var body io.Reader
	if payload != nil {
		jsonData, err := json.Marshal(payload)
		if err != nil {
			return "", fmt.Errorf("failed to marshal request: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(responseBody))
	}

	// Pretty print JSON response
	var prettyJSON bytes.Buffer
	err = json.Indent(&prettyJSON, responseBody, "", "  ")
	if err != nil {
		return string(responseBody), nil // Return raw response if pretty printing fails
	}

	return prettyJSON.String(), nil
}