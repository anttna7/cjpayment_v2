package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func TestUserRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
		FullName: "Test User",
		Status:   "active",
	}

	err := repo.Create(ctx, user)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Verify user was created with ID
	if user.ID == uuid.Nil {
		t.Error("Expected user ID to be set")
	}
}

func TestUserRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
		FullName: "Test User",
		Status:   "active",
	}

	err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Retrieve the user
	retrieved, err := repo.GetByID(ctx, user.ID)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if retrieved.Username != user.Username {
		t.Errorf("Expected username %s, got %s", user.Username, retrieved.Username)
	}
}

func TestUserRepository_GetByUsername(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
		FullName: "Test User",
		Status:   "active",
	}

	err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Retrieve the user by username
	retrieved, err := repo.GetByUsername(ctx, user.Username)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if retrieved.ID != user.ID {
		t.Errorf("Expected ID %s, got %s", user.ID, retrieved.ID)
	}
}

func TestUserRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	// Create a user first
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
		FullName: "Test User",
		Status:   "active",
	}

	err := repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Update the user
	user.FullName = "Updated Test User"
	err = repo.Update(ctx, user)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Verify the update
	retrieved, err := repo.GetByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("Failed to retrieve user: %v", err)
	}

	if retrieved.FullName != "Updated Test User" {
		t.Errorf("Expected full name 'Updated Test User', got %s", retrieved.FullName)
	}
}

func TestUserRepository_List(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	// Create test users
	users := []*User{
		{Username: "user1", Email: "user1@example.com", Password: "hash1", FullName: "User One", Status: "active"},
		{Username: "user2", Email: "user2@example.com", Password: "hash2", FullName: "User Two", Status: "inactive"},
	}

	for _, user := range users {
		err := repo.Create(ctx, user)
		if err != nil {
			t.Fatalf("Failed to create user: %v", err)
		}
	}

	// Test list with no filter
	filter := &UserFilter{Limit: 10}
	result, err := repo.List(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if len(result) < 2 {
		t.Errorf("Expected at least 2 users, got %d", len(result))
	}

	// Test list with status filter
	status := "active"
	filter = &UserFilter{Status: &status, Limit: 10}
	result, err = repo.List(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	for _, user := range result {
		if user.Status != "active" {
			t.Errorf("Expected all users to have status 'active', got %s", user.Status)
		}
	}
}

func TestUserRepository_Count(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewUserRepository(db)
	ctx := context.Background()

	// Get initial count
	filter := &UserFilter{}
	initialCount, err := repo.Count(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	// Create a user
	user := &User{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "hashedpassword",
		FullName: "Test User",
		Status:   "active",
	}

	err = repo.Create(ctx, user)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Get new count
	newCount, err := repo.Count(ctx, filter)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if newCount != initialCount+1 {
		t.Errorf("Expected count to increase by 1, got %d -> %d", initialCount, newCount)
	}
}