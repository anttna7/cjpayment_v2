package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

func TestMerchantRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	merchant := &Merchant{
		Name:         "Test Merchant",
		Code:         "TEST001",
		ContactPerson: stringPtr("John Doe"),
		ContactPhone: stringPtr("1234567890"),
		ContactEmail: stringPtr("john@test.com"),
		Status:       "active",
		DailyLimit:   decimal.NewFromInt(10000),
		SingleLimit:  decimal.NewFromInt(1000),
	}

	err := repo.Create(ctx, merchant)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Verify merchant was created with ID
	if merchant.ID == uuid.Nil {
		t.Error("Expected merchant ID to be set")
	}
}

func TestMerchantRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create a merchant first
	merchant := &Merchant{
		Name:        "Test Merchant",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
	}

	err := repo.Create(ctx, merchant)
	if err != nil {
		t.Fatalf("Failed to create merchant: %v", err)
	}

	// Retrieve the merchant
	retrieved, err := repo.GetByID(ctx, merchant.ID)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if retrieved.Name != merchant.Name {
		t.Errorf("Expected name %s, got %s", merchant.Name, retrieved.Name)
	}

	if retrieved.Code != merchant.Code {
		t.Errorf("Expected code %s, got %s", merchant.Code, retrieved.Code)
	}
}

func TestMerchantRepository_GetByCode(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create a merchant first
	merchant := &Merchant{
		Name:        "Test Merchant",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
	}

	err := repo.Create(ctx, merchant)
	if err != nil {
		t.Fatalf("Failed to create merchant: %v", err)
	}

	// Retrieve the merchant by code
	retrieved, err := repo.GetByCode(ctx, merchant.Code)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if retrieved.ID != merchant.ID {
		t.Errorf("Expected ID %s, got %s", merchant.ID, retrieved.ID)
	}
}

func TestMerchantRepository_Search(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create test merchants
	merchants := []*Merchant{
		{Name: "Apple Inc", Code: "APPLE", Status: "active", DailyLimit: decimal.NewFromInt(10000), SingleLimit: decimal.NewFromInt(1000)},
		{Name: "Google LLC", Code: "GOOGLE", Status: "active", DailyLimit: decimal.NewFromInt(10000), SingleLimit: decimal.NewFromInt(1000)},
		{Name: "Microsoft Corp", Code: "MSFT", Status: "active", DailyLimit: decimal.NewFromInt(10000), SingleLimit: decimal.NewFromInt(1000)},
	}

	for _, merchant := range merchants {
		err := repo.Create(ctx, merchant)
		if err != nil {
			t.Fatalf("Failed to create merchant: %v", err)
		}
	}

	// Test search by name
	results, err := repo.Search(ctx, "Apple")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	found := false
	for _, result := range results {
		if result.Name == "Apple Inc" {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected to find Apple Inc in search results")
	}

	// Test search by code
	results, err = repo.Search(ctx, "GOOGLE")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	found = false
	for _, result := range results {
		if result.Code == "GOOGLE" {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected to find GOOGLE in search results")
	}
}

func TestMerchantRepository_List(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create test merchants
	merchants := []*Merchant{
		{Name: "Active Merchant", Code: "ACTIVE", Status: "active", DailyLimit: decimal.NewFromInt(10000), SingleLimit: decimal.NewFromInt(1000)},
		{Name: "Inactive Merchant", Code: "INACTIVE", Status: "inactive", DailyLimit: decimal.NewFromInt(10000), SingleLimit: decimal.NewFromInt(1000)},
	}

	for _, merchant := range merchants {
		err := repo.Create(ctx, merchant)
		if err != nil {
			t.Fatalf("Failed to create merchant: %v", err)
		}
	}

	// Test list with no filter
	filter := &MerchantFilter{Limit: 10}
	result, err := repo.List(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if len(result) < 2 {
		t.Errorf("Expected at least 2 merchants, got %d", len(result))
	}

	// Test list with status filter
	status := "active"
	filter = &MerchantFilter{Status: &status, Limit: 10}
	result, err = repo.List(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	for _, merchant := range result {
		if merchant.Status != "active" {
			t.Errorf("Expected all merchants to have status 'active', got %s", merchant.Status)
		}
	}
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}