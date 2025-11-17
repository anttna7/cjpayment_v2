package repository

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestValidateMerchant(t *testing.T) {
	tests := []struct {
		name        string
		merchant    *Merchant
		expectError bool
	}{
		{
			name: "valid merchant",
			merchant: &Merchant{
				ID:          uuid.New(),
				Name:        "Test Merchant",
				Code:        "TEST001",
				Status:      "active",
				DailyLimit:  decimal.NewFromInt(10000),
				SingleLimit: decimal.NewFromInt(1000),
				DailyUsed:   decimal.Zero,
			},
			expectError: false,
		},
		{
			name:        "nil merchant",
			merchant:    nil,
			expectError: true,
		},
		{
			name: "empty name",
			merchant: &Merchant{
				ID:          uuid.New(),
				Name:        "",
				Code:        "TEST001",
				Status:      "active",
				DailyLimit:  decimal.NewFromInt(10000),
				SingleLimit: decimal.NewFromInt(1000),
				DailyUsed:   decimal.Zero,
			},
			expectError: true,
		},
		{
			name: "invalid status",
			merchant: &Merchant{
				ID:          uuid.New(),
				Name:        "Test Merchant",
				Code:        "TEST001",
				Status:      "invalid",
				DailyLimit:  decimal.NewFromInt(10000),
				SingleLimit: decimal.NewFromInt(1000),
				DailyUsed:   decimal.Zero,
			},
			expectError: true,
		},
		{
			name: "negative daily limit",
			merchant: &Merchant{
				ID:          uuid.New(),
				Name:        "Test Merchant",
				Code:        "TEST001",
				Status:      "active",
				DailyLimit:  decimal.NewFromInt(-1000),
				SingleLimit: decimal.NewFromInt(1000),
				DailyUsed:   decimal.Zero,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateMerchant(tt.merchant)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateReceiveAccount(t *testing.T) {
	tests := []struct {
		name        string
		account     *ReceiveAccount
		expectError bool
	}{
		{
			name: "valid alipay account",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Test Alipay",
				AccountNumber: "123456789012345",
				AccountType:   "alipay",
				AccountHolder: "Test User",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
				DailyUsed:     decimal.Zero,
			},
			expectError: false,
		},
		{
			name: "valid bank account",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Test Bank",
				AccountNumber: "1234567890123456",
				AccountType:   "bank",
				AccountHolder: "Test User",
				PaymentType:   "business",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
				DailyUsed:     decimal.Zero,
				BankName:      stringPtr("Test Bank"),
			},
			expectError: false,
		},
		{
			name: "other type without custom provider",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Test Other",
				AccountNumber: "123456789012345",
				AccountType:   "other",
				AccountHolder: "Test User",
				PaymentType:   "private",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
				DailyUsed:     decimal.Zero,
			},
			expectError: true,
		},
		{
			name: "bank account without bank name",
			account: &ReceiveAccount{
				ID:            uuid.New(),
				AccountName:   "Test Bank",
				AccountNumber: "1234567890123456",
				AccountType:   "bank",
				AccountHolder: "Test User",
				PaymentType:   "business",
				Status:        "active",
				DailyLimit:    decimal.NewFromInt(10000),
				SingleLimit:   decimal.NewFromInt(1000),
				DailyUsed:     decimal.Zero,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateReceiveAccount(tt.account)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateRechargeOrder(t *testing.T) {
	merchantID := uuid.New()
	accountID := uuid.New()

	tests := []struct {
		name        string
		order       *RechargeOrder
		expectError bool
	}{
		{
			name: "valid order",
			order: &RechargeOrder{
				ID:               uuid.New(),
				OrderNumber:      "RO20240101120000123456",
				PayerName:        "Test Payer",
				PayerAccount:     "test@example.com",
				PaymentType:      "private",
				Amount:           decimal.NewFromInt(1000),
				MerchantID:       merchantID,
				AdAccount:        "AD123456",
				ReceiveAccountID: accountID,
				Status:           "pending",
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			},
			expectError: false,
		},
		{
			name: "zero amount",
			order: &RechargeOrder{
				ID:               uuid.New(),
				OrderNumber:      "RO20240101120000123456",
				PayerName:        "Test Payer",
				PayerAccount:     "test@example.com",
				PaymentType:      "private",
				Amount:           decimal.Zero,
				MerchantID:       merchantID,
				AdAccount:        "AD123456",
				ReceiveAccountID: accountID,
				Status:           "pending",
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			},
			expectError: true,
		},
		{
			name: "invalid status",
			order: &RechargeOrder{
				ID:               uuid.New(),
				OrderNumber:      "RO20240101120000123456",
				PayerName:        "Test Payer",
				PayerAccount:     "test@example.com",
				PaymentType:      "private",
				Amount:           decimal.NewFromInt(1000),
				MerchantID:       merchantID,
				AdAccount:        "AD123456",
				ReceiveAccountID: accountID,
				Status:           "invalid",
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRechargeOrder(tt.order)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateCreateRechargeOrderRequest(t *testing.T) {
	merchantID := uuid.New()

	tests := []struct {
		name        string
		request     *CreateRechargeOrderRequest
		expectError bool
	}{
		{
			name: "valid request",
			request: &CreateRechargeOrderRequest{
				PayerName:   "Test Payer",
				Amount:      decimal.NewFromInt(1000),
				AdAccount:   "AD123456",
				PaymentType: "private",
				MerchantID:  merchantID,
			},
			expectError: false,
		},
		{
			name: "amount too large",
			request: &CreateRechargeOrderRequest{
				PayerName:   "Test Payer",
				Amount:      decimal.NewFromInt(2000000), // Exceeds max limit
				AdAccount:   "AD123456",
				PaymentType: "private",
				MerchantID:  merchantID,
			},
			expectError: true,
		},
		{
			name: "invalid payment type",
			request: &CreateRechargeOrderRequest{
				PayerName:   "Test Payer",
				Amount:      decimal.NewFromInt(1000),
				AdAccount:   "AD123456",
				PaymentType: "invalid",
				MerchantID:  merchantID,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateCreateRechargeOrderRequest(tt.request)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGenerateOrderNumber(t *testing.T) {
	orderNumber := GenerateOrderNumber()
	assert.NotEmpty(t, orderNumber)
	assert.True(t, ValidateOrderNumber(orderNumber))
	assert.True(t, len(orderNumber) == 22) // "RO" + 14 digits + 6 digits
}

func TestValidateOrderNumber(t *testing.T) {
	tests := []struct {
		name        string
		orderNumber string
		expected    bool
	}{
		{
			name:        "valid order number",
			orderNumber: "RO20240101120000123456",
			expected:    true,
		},
		{
			name:        "invalid prefix",
			orderNumber: "XX20240101120000123456",
			expected:    false,
		},
		{
			name:        "too short",
			orderNumber: "RO2024010112000012345",
			expected:    false,
		},
		{
			name:        "too long",
			orderNumber: "RO202401011200001234567",
			expected:    false,
		},
		{
			name:        "contains letters",
			orderNumber: "RO2024010112000012345A",
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateOrderNumber(tt.orderNumber)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Helper function for tests
func stringPtr(s string) *string {
	return &s
}