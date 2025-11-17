package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestReceiveAccountValidation_Unit tests validation logic without database
func TestReceiveAccountValidation_Unit(t *testing.T) {
	// Create a mock repository for testing validation logic
	repo := &receiveAccountRepository{}
	ctx := context.Background()

	t.Run("ValidateAccountType", func(t *testing.T) {
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
	})

	t.Run("ValidatePaymentProvider", func(t *testing.T) {
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
	})
}

