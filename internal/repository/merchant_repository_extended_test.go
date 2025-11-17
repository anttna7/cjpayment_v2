package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMerchantRepository_ExistsByName(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create a test merchant
	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := repo.Create(ctx, merchant)
	require.NoError(t, err)

	tests := []struct {
		name         string
		merchantName string
		expected     bool
	}{
		{
			name:         "existing merchant name",
			merchantName: "Test Company",
			expected:     true,
		},
		{
			name:         "non-existing merchant name",
			merchantName: "Non-existing Company",
			expected:     false,
		},
		{
			name:         "case sensitive check",
			merchantName: "test company",
			expected:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists, err := repo.ExistsByName(ctx, tt.merchantName)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, exists)
		})
	}
}

func TestMerchantRepository_ExistsByPortName(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create a test merchant with port name
	portName := "test-port-001"
	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		PortName:    &portName,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := repo.Create(ctx, merchant)
	require.NoError(t, err)

	tests := []struct {
		name     string
		portName string
		expected bool
	}{
		{
			name:     "existing port name",
			portName: "test-port-001",
			expected: true,
		},
		{
			name:     "non-existing port name",
			portName: "non-existing-port",
			expected: false,
		},
		{
			name:     "case sensitive check",
			portName: "TEST-PORT-001",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists, err := repo.ExistsByPortName(ctx, tt.portName)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, exists)
		})
	}
}

func TestMerchantRepository_GetMerchantWithAccounts(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	merchantRepo := NewMerchantRepository(db)
	accountRepo := NewReceiveAccountRepository(db)
	merchantAccountRepo := NewMerchantReceiveAccountRepository(db)
	ctx := context.Background()

	// Create a test merchant
	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := merchantRepo.Create(ctx, merchant)
	require.NoError(t, err)

	// Create test receive accounts
	account1 := &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account 1",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder 1",
		PaymentType:   "private",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(5000),
		SingleLimit:   decimal.NewFromInt(500),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	account2 := &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account 2",
		AccountNumber: "987654321",
		AccountType:   "alipay",
		AccountHolder: "Test Holder 2",
		PaymentType:   "business",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(3000),
		SingleLimit:   decimal.NewFromInt(300),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err = accountRepo.Create(ctx, account1)
	require.NoError(t, err)

	err = accountRepo.Create(ctx, account2)
	require.NoError(t, err)

	// Create merchant-account associations
	association1 := &MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       merchant.ID,
		ReceiveAccountID: account1.ID,
		Weight:           100,
		IsActive:         true,
		CreatedAt:        time.Now(),
	}

	association2 := &MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       merchant.ID,
		ReceiveAccountID: account2.ID,
		Weight:           50,
		IsActive:         true,
		CreatedAt:        time.Now(),
	}

	err = merchantAccountRepo.Create(ctx, association1)
	require.NoError(t, err)

	err = merchantAccountRepo.Create(ctx, association2)
	require.NoError(t, err)

	// Test GetMerchantWithAccounts
	retrievedMerchant, accounts, err := merchantRepo.GetMerchantWithAccounts(ctx, merchant.ID)
	require.NoError(t, err)

	// Verify merchant
	assert.Equal(t, merchant.ID, retrievedMerchant.ID)
	assert.Equal(t, merchant.Name, retrievedMerchant.Name)
	assert.Equal(t, merchant.Code, retrievedMerchant.Code)

	// Verify accounts (should be ordered by weight DESC)
	require.Len(t, accounts, 2)
	assert.Equal(t, account1.ID, accounts[0].ID) // Higher weight (100)
	assert.Equal(t, account2.ID, accounts[1].ID) // Lower weight (50)

	// Test with non-existing merchant
	nonExistingID := uuid.New()
	_, _, err = merchantRepo.GetMerchantWithAccounts(ctx, nonExistingID)
	assert.Error(t, err)
}

func TestMerchantRepository_GetMerchantWithAccounts_NoAccounts(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create a test merchant without accounts
	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := repo.Create(ctx, merchant)
	require.NoError(t, err)

	// Test GetMerchantWithAccounts
	retrievedMerchant, accounts, err := repo.GetMerchantWithAccounts(ctx, merchant.ID)
	require.NoError(t, err)

	// Verify merchant
	assert.Equal(t, merchant.ID, retrievedMerchant.ID)
	assert.Equal(t, merchant.Name, retrievedMerchant.Name)

	// Verify no accounts
	assert.Empty(t, accounts)
}

func TestMerchantRepository_CreateWithNewFields(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Test creating merchant with new fields
	agentName := "Test Agent"
	portName := "test-port-123"
	remark := "This is a test merchant with additional fields"

	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company with Fields",
		Code:        "TESTFIELDS001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		AgentName:   &agentName,
		PortName:    &portName,
		Remark:      &remark,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := repo.Create(ctx, merchant)
	require.NoError(t, err)

	// Retrieve and verify
	retrieved, err := repo.GetByID(ctx, merchant.ID)
	require.NoError(t, err)

	assert.Equal(t, merchant.ID, retrieved.ID)
	assert.Equal(t, merchant.Name, retrieved.Name)
	assert.Equal(t, merchant.Code, retrieved.Code)
	require.NotNil(t, retrieved.AgentName)
	assert.Equal(t, agentName, *retrieved.AgentName)
	require.NotNil(t, retrieved.PortName)
	assert.Equal(t, portName, *retrieved.PortName)
	require.NotNil(t, retrieved.Remark)
	assert.Equal(t, remark, *retrieved.Remark)
}

func TestMerchantRepository_UpdateWithNewFields(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewMerchantRepository(db)
	ctx := context.Background()

	// Create initial merchant
	merchant := &Merchant{
		ID:          uuid.New(),
		Name:        "Test Company",
		Code:        "TEST001",
		Status:      "active",
		DailyLimit:  decimal.NewFromInt(10000),
		SingleLimit: decimal.NewFromInt(1000),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := repo.Create(ctx, merchant)
	require.NoError(t, err)

	// Update with new fields
	agentName := "Updated Agent"
	portName := "updated-port-456"
	remark := "Updated remark"

	merchant.AgentName = &agentName
	merchant.PortName = &portName
	merchant.Remark = &remark

	err = repo.Update(ctx, merchant)
	require.NoError(t, err)

	// Retrieve and verify
	retrieved, err := repo.GetByID(ctx, merchant.ID)
	require.NoError(t, err)

	require.NotNil(t, retrieved.AgentName)
	assert.Equal(t, agentName, *retrieved.AgentName)
	require.NotNil(t, retrieved.PortName)
	assert.Equal(t, portName, *retrieved.PortName)
	require.NotNil(t, retrieved.Remark)
	assert.Equal(t, remark, *retrieved.Remark)
}