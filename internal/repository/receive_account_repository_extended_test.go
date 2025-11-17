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

func TestReceiveAccountRepository_ExistsByAccountNumber(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	// Create a test receive account
	account := &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(5000),
		SingleLimit:   decimal.NewFromInt(500),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := repo.Create(ctx, account)
	require.NoError(t, err)

	tests := []struct {
		name          string
		accountNumber string
		expected      bool
	}{
		{
			name:          "existing account number",
			accountNumber: "123456789",
			expected:      true,
		},
		{
			name:          "non-existing account number",
			accountNumber: "999999999",
			expected:      false,
		},
		{
			name:          "partial account number",
			accountNumber: "123456",
			expected:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists, err := repo.ExistsByAccountNumber(ctx, tt.accountNumber)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, exists)
		})
	}
}

func TestReceiveAccountRepository_CreateWithMerchantAssociation(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	accountRepo := NewReceiveAccountRepository(db)
	merchantRepo := NewMerchantRepository(db)
	merchantAccountRepo := NewMerchantReceiveAccountRepository(db)
	ctx := context.Background()

	// Create a test merchant first
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

	// Create receive account with merchant association
	customProvider := "Custom Payment Provider"
	account := &ReceiveAccount{
		ID:                    uuid.New(),
		AccountName:           "Test Account",
		AccountNumber:         "123456789",
		AccountType:           "other",
		CustomPaymentProvider: &customProvider,
		AccountHolder:         "Test Holder",
		PaymentType:           "private",
		Status:                "active",
		DailyLimit:            decimal.NewFromInt(5000),
		SingleLimit:           decimal.NewFromInt(500),
	}

	weight := 100
	err = accountRepo.CreateWithMerchantAssociation(ctx, account, merchant.ID, weight)
	require.NoError(t, err)

	// Verify account was created
	retrievedAccount, err := accountRepo.GetByID(ctx, account.ID)
	require.NoError(t, err)

	assert.Equal(t, account.ID, retrievedAccount.ID)
	assert.Equal(t, account.AccountName, retrievedAccount.AccountName)
	assert.Equal(t, account.AccountNumber, retrievedAccount.AccountNumber)
	assert.Equal(t, account.AccountType, retrievedAccount.AccountType)
	require.NotNil(t, retrievedAccount.CustomPaymentProvider)
	assert.Equal(t, customProvider, *retrievedAccount.CustomPaymentProvider)

	// Verify merchant association was created
	associations, err := merchantAccountRepo.GetByMerchant(ctx, merchant.ID)
	require.NoError(t, err)
	require.Len(t, associations, 1)

	association := associations[0]
	assert.Equal(t, merchant.ID, association.MerchantID)
	assert.Equal(t, account.ID, association.ReceiveAccountID)
	assert.Equal(t, weight, association.Weight)
	assert.True(t, association.IsActive)
}

func TestReceiveAccountRepository_CreateWithMerchantAssociation_TransactionRollback(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	accountRepo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	// Try to create account with association to non-existing merchant
	nonExistingMerchantID := uuid.New()
	account := &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(5000),
		SingleLimit:   decimal.NewFromInt(500),
	}

	weight := 100
	err := accountRepo.CreateWithMerchantAssociation(ctx, account, nonExistingMerchantID, weight)
	require.Error(t, err)

	// Verify account was not created (transaction rolled back)
	_, err = accountRepo.GetByID(ctx, account.ID)
	assert.Error(t, err) // Should not exist
}

func TestReceiveAccountRepository_CreateWithCustomPaymentProvider(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	tests := []struct {
		name                  string
		accountType           string
		customPaymentProvider *string
		expectError           bool
	}{
		{
			name:                  "other type with custom provider",
			accountType:           "other",
			customPaymentProvider: stringPtr("Custom Provider"),
			expectError:           false,
		},
		{
			name:                  "other type without custom provider",
			accountType:           "other",
			customPaymentProvider: nil,
			expectError:           false, // Repository doesn't validate business rules
		},
		{
			name:                  "bank type with custom provider",
			accountType:           "bank",
			customPaymentProvider: stringPtr("Custom Bank"),
			expectError:           false,
		},
		{
			name:                  "alipay type without custom provider",
			accountType:           "alipay",
			customPaymentProvider: nil,
			expectError:           false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			account := &ReceiveAccount{
				ID:                    uuid.New(),
				AccountName:           "Test Account " + tt.name,
				AccountNumber:         "123456789" + tt.name,
				AccountType:           tt.accountType,
				CustomPaymentProvider: tt.customPaymentProvider,
				AccountHolder:         "Test Holder",
				PaymentType:           "private",
				Status:                "active",
				DailyLimit:            decimal.NewFromInt(5000),
				SingleLimit:           decimal.NewFromInt(500),
				CreatedAt:             time.Now(),
				UpdatedAt:             time.Now(),
			}

			err := repo.Create(ctx, account)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)

				// Verify the account was created correctly
				retrieved, err := repo.GetByID(ctx, account.ID)
				require.NoError(t, err)

				assert.Equal(t, account.AccountType, retrieved.AccountType)
				if tt.customPaymentProvider != nil {
					require.NotNil(t, retrieved.CustomPaymentProvider)
					assert.Equal(t, *tt.customPaymentProvider, *retrieved.CustomPaymentProvider)
				} else {
					assert.Nil(t, retrieved.CustomPaymentProvider)
				}
			}
		})
	}
}

func TestReceiveAccountRepository_UpdateWithCustomPaymentProvider(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	// Create initial account
	account := &ReceiveAccount{
		ID:            uuid.New(),
		AccountName:   "Test Account",
		AccountNumber: "123456789",
		AccountType:   "bank",
		AccountHolder: "Test Holder",
		PaymentType:   "private",
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(5000),
		SingleLimit:   decimal.NewFromInt(500),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	err := repo.Create(ctx, account)
	require.NoError(t, err)

	// Update with custom payment provider
	customProvider := "Updated Custom Provider"
	account.AccountType = "other"
	account.CustomPaymentProvider = &customProvider

	err = repo.Update(ctx, account)
	require.NoError(t, err)

	// Verify update
	retrieved, err := repo.GetByID(ctx, account.ID)
	require.NoError(t, err)

	assert.Equal(t, "other", retrieved.AccountType)
	require.NotNil(t, retrieved.CustomPaymentProvider)
	assert.Equal(t, customProvider, *retrieved.CustomPaymentProvider)
}

func TestReceiveAccountRepository_ValidateAccountType(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	tests := []struct {
		name        string
		accountType string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "valid alipay type",
			accountType: "alipay",
			expectError: false,
		},
		{
			name:        "valid wechat type",
			accountType: "wechat",
			expectError: false,
		},
		{
			name:        "valid bank type",
			accountType: "bank",
			expectError: false,
		},
		{
			name:        "valid other type",
			accountType: "other",
			expectError: false,
		},
		{
			name:        "invalid type",
			accountType: "invalid",
			expectError: true,
			errorMsg:    "invalid account type: invalid",
		},
		{
			name:        "empty type",
			accountType: "",
			expectError: true,
			errorMsg:    "invalid account type: ",
		},
		{
			name:        "case sensitive - uppercase",
			accountType: "ALIPAY",
			expectError: true,
			errorMsg:    "invalid account type: ALIPAY",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.ValidateAccountType(ctx, tt.accountType)
			if tt.expectError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestReceiveAccountRepository_ValidatePaymentProvider(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	tests := []struct {
		name                  string
		accountType           string
		customPaymentProvider *string
		expectError           bool
		errorMsg              string
	}{
		{
			name:                  "other type with valid custom provider",
			accountType:           "other",
			customPaymentProvider: stringPtr("Custom Provider"),
			expectError:           false,
		},
		{
			name:                  "other type without custom provider",
			accountType:           "other",
			customPaymentProvider: nil,
			expectError:           true,
			errorMsg:              "custom payment provider is required when account type is 'other'",
		},
		{
			name:                  "other type with empty custom provider",
			accountType:           "other",
			customPaymentProvider: stringPtr(""),
			expectError:           true,
			errorMsg:              "custom payment provider is required when account type is 'other'",
		},
		{
			name:                  "other type with too short custom provider",
			accountType:           "other",
			customPaymentProvider: stringPtr("A"),
			expectError:           true,
			errorMsg:              "custom payment provider must be between 2 and 50 characters",
		},
		{
			name:                  "other type with too long custom provider",
			accountType:           "other",
			customPaymentProvider: stringPtr("This is a very long custom payment provider name that exceeds the maximum allowed length of 50 characters"),
			expectError:           true,
			errorMsg:              "custom payment provider must be between 2 and 50 characters",
		},
		{
			name:                  "alipay type without custom provider",
			accountType:           "alipay",
			customPaymentProvider: nil,
			expectError:           false,
		},
		{
			name:                  "alipay type with custom provider",
			accountType:           "alipay",
			customPaymentProvider: stringPtr("Should not be allowed"),
			expectError:           true,
			errorMsg:              "custom payment provider should not be specified for account type 'alipay'",
		},
		{
			name:                  "wechat type without custom provider",
			accountType:           "wechat",
			customPaymentProvider: nil,
			expectError:           false,
		},
		{
			name:                  "wechat type with custom provider",
			accountType:           "wechat",
			customPaymentProvider: stringPtr("Should not be allowed"),
			expectError:           true,
			errorMsg:              "custom payment provider should not be specified for account type 'wechat'",
		},
		{
			name:                  "bank type without custom provider",
			accountType:           "bank",
			customPaymentProvider: nil,
			expectError:           false,
		},
		{
			name:                  "bank type with custom provider",
			accountType:           "bank",
			customPaymentProvider: stringPtr("Should not be allowed"),
			expectError:           true,
			errorMsg:              "custom payment provider should not be specified for account type 'bank'",
		},
		{
			name:                  "invalid account type",
			accountType:           "invalid",
			customPaymentProvider: nil,
			expectError:           true,
			errorMsg:              "invalid account type: invalid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := repo.ValidatePaymentProvider(ctx, tt.accountType, tt.customPaymentProvider)
			if tt.expectError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestReceiveAccountRepository_ValidationIntegration(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewReceiveAccountRepository(db)
	ctx := context.Background()

	// Test creating accounts with validation
	tests := []struct {
		name                  string
		account               *ReceiveAccount
		shouldValidate        bool
		expectValidationError bool
	}{
		{
			name: "valid other type account",
			account: &ReceiveAccount{
				ID:                    uuid.New(),
				AccountName:           "Valid Other Account",
				AccountNumber:         "valid123",
				AccountType:           "other",
				CustomPaymentProvider: stringPtr("Valid Provider"),
				AccountHolder:         "Test Holder",
				PaymentType:           "private",
				Status:                "active",
				DailyLimit:            decimal.NewFromInt(5000),
				SingleLimit:           decimal.NewFromInt(500),
			},
			shouldValidate:        true,
			expectValidationError: false,
		},
		{
			name: "invalid other type account - no provider",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Invalid Other Account",
				AccountNumber: "invalid123",
				AccountType:   "other",
				AccountHolder: "Test Holder",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(5000),
				SingleLimit:   decimal.NewFromInt(500),
			},
			shouldValidate:        true,
			expectValidationError: true,
		},
		{
			name: "valid alipay account",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Valid Alipay Account",
				AccountNumber: "alipay123",
				AccountType:   "alipay",
				AccountHolder: "Test Holder",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(5000),
				SingleLimit:   decimal.NewFromInt(500),
			},
			shouldValidate:        true,
			expectValidationError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.shouldValidate {
				err := repo.ValidatePaymentProvider(ctx, tt.account.AccountType, tt.account.CustomPaymentProvider)
				if tt.expectValidationError {
					assert.Error(t, err)
					return // Don't try to create invalid account
				} else {
					assert.NoError(t, err)
				}
			}

			// Try to create the account
			tt.account.CreatedAt = time.Now()
			tt.account.UpdatedAt = time.Now()
			err := repo.Create(ctx, tt.account)
			assert.NoError(t, err) // Repository doesn't enforce business validation

			// Verify the account was created
			retrieved, err := repo.GetByID(ctx, tt.account.ID)
			require.NoError(t, err)
			assert.Equal(t, tt.account.AccountType, retrieved.AccountType)
			
			if tt.account.CustomPaymentProvider != nil {
				require.NotNil(t, retrieved.CustomPaymentProvider)
				assert.Equal(t, *tt.account.CustomPaymentProvider, *retrieved.CustomPaymentProvider)
			} else {
				assert.Nil(t, retrieved.CustomPaymentProvider)
			}
		})
	}
}



