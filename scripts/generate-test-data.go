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

// TestDataGenerationRequest represents the batch test data generation request
type TestDataGenerationRequest struct {
	Merchants *MerchantTestDataRequest `json:"merchants,omitempty"`
	Accounts  *AccountTestDataRequest  `json:"accounts,omitempty"`
	Orders    *OrderTestDataRequest    `json:"orders,omitempty"`
	Users     *UserTestDataRequest     `json:"users,omitempty"`
	LinkAccounts bool                  `json:"link_accounts"`
}

type MerchantTestDataRequest struct {
	Count       int    `json:"count"`
	NamePrefix  string `json:"name_prefix"`
	CodePrefix  string `json:"code_prefix"`
	WithLimits  bool   `json:"with_limits"`
	WithAccounts bool  `json:"with_accounts"`
}

type AccountTestDataRequest struct {
	Count         int      `json:"count"`
	AccountTypes  []string `json:"account_types"`
	PaymentTypes  []string `json:"payment_types"`
	WithLimits    bool     `json:"with_limits"`
}

type OrderTestDataRequest struct {
	Count        int      `json:"count"`
	PaymentTypes []string `json:"payment_types"`
	Statuses     []string `json:"statuses"`
	AmountRange  *AmountRange `json:"amount_range"`
}

type UserTestDataRequest struct {
	Count           int      `json:"count"`
	UsernamePrefix  string   `json:"username_prefix"`
	Roles           []string `json:"roles"`
	WithPermissions bool     `json:"with_permissions"`
}

type AmountRange struct {
	MinAmount float64 `json:"min_amount"`
	MaxAmount float64 `json:"max_amount"`
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
	case "merchants":
		generateMerchants(apiBaseURL)
	case "accounts":
		generateAccounts(apiBaseURL)
	case "orders":
		generateOrders(apiBaseURL)
	case "users":
		generateUsers(apiBaseURL)
	case "batch":
		generateBatch(apiBaseURL)
	case "cleanup":
		cleanupData(apiBaseURL)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: go run generate-test-data.go <command>")
	fmt.Println("")
	fmt.Println("Commands:")
	fmt.Println("  merchants  - Generate test merchant data")
	fmt.Println("  accounts   - Generate test receive account data")
	fmt.Println("  orders     - Generate test recharge order data")
	fmt.Println("  users      - Generate test user data")
	fmt.Println("  batch      - Generate all types of test data")
	fmt.Println("  cleanup    - Clean up test data")
	fmt.Println("")
	fmt.Println("Environment variables:")
	fmt.Println("  API_BASE_URL - Base URL for the API (default: http://localhost:8080)")
}

func generateMerchants(baseURL string) {
	req := MerchantTestDataRequest{
		Count:       10,
		NamePrefix:  "TestMerchant",
		CodePrefix:  "TM",
		WithLimits:  true,
		WithAccounts: false,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/merchants", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to generate merchants: %v", err)
	}

	fmt.Printf("✅ Generated merchants successfully:\n%s\n", response)
}

func generateAccounts(baseURL string) {
	req := AccountTestDataRequest{
		Count:        15,
		AccountTypes: []string{"alipay", "wechat", "bank"},
		PaymentTypes: []string{"public", "private"},
		WithLimits:   true,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/accounts", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to generate accounts: %v", err)
	}

	fmt.Printf("✅ Generated accounts successfully:\n%s\n", response)
}

func generateOrders(baseURL string) {
	req := OrderTestDataRequest{
		Count:        50,
		PaymentTypes: []string{"public", "private"},
		Statuses:     []string{"pending", "paid", "confirmed", "cancelled"},
		AmountRange: &AmountRange{
			MinAmount: 100.0,
			MaxAmount: 5000.0,
		},
	}

	url := fmt.Sprintf("%s/api/v1/test-data/orders", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to generate orders: %v", err)
	}

	fmt.Printf("✅ Generated orders successfully:\n%s\n", response)
}

func generateUsers(baseURL string) {
	req := UserTestDataRequest{
		Count:           5,
		UsernamePrefix:  "testuser",
		Roles:           []string{"admin", "finance", "operator", "viewer"},
		WithPermissions: true,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/users", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to generate users: %v", err)
	}

	fmt.Printf("✅ Generated users successfully:\n%s\n", response)
}

func generateBatch(baseURL string) {
	req := TestDataGenerationRequest{
		Merchants: &MerchantTestDataRequest{
			Count:       5,
			NamePrefix:  "BatchMerchant",
			CodePrefix:  "BM",
			WithLimits:  true,
		},
		Accounts: &AccountTestDataRequest{
			Count:        10,
			AccountTypes: []string{"alipay", "wechat", "bank"},
			PaymentTypes: []string{"public", "private"},
			WithLimits:   true,
		},
		Orders: &OrderTestDataRequest{
			Count:        25,
			PaymentTypes: []string{"public", "private"},
			Statuses:     []string{"pending", "paid", "confirmed"},
			AmountRange: &AmountRange{
				MinAmount: 200.0,
				MaxAmount: 3000.0,
			},
		},
		Users: &UserTestDataRequest{
			Count:           3,
			UsernamePrefix:  "batchuser",
			Roles:           []string{"admin", "operator"},
			WithPermissions: true,
		},
		LinkAccounts: true,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/batch", baseURL)
	response, err := makeRequest("POST", url, req)
	if err != nil {
		log.Fatalf("Failed to generate batch data: %v", err)
	}

	fmt.Printf("✅ Generated batch test data successfully:\n%s\n", response)
}

func cleanupData(baseURL string) {
	req := map[string]interface{}{
		"data_types":  []string{"merchants", "accounts", "orders", "users"},
		"test_prefix": "Test",
		"dry_run":     false,
	}

	url := fmt.Sprintf("%s/api/v1/test-data/cleanup", baseURL)
	response, err := makeRequest("DELETE", url, req)
	if err != nil {
		log.Fatalf("Failed to cleanup data: %v", err)
	}

	fmt.Printf("✅ Cleaned up test data successfully:\n%s\n", response)
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