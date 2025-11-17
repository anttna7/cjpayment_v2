package repository

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMerchant_JSONSerialization(t *testing.T) {
	// Test data
	merchantID := uuid.New()
	createdBy := uuid.New()
	agentName := "Test Agent"
	portName := "test-port"
	remark := "Test remark"

	merchant := &Merchant{
		ID:            merchantID,
		Name:          "Test Company",
		Code:          "TEST001",
		ContactPerson: &[]string{"John Doe"}[0],
		ContactPhone:  &[]string{"+1234567890"}[0],
		ContactEmail:  &[]string{"john@test.com"}[0],
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.NewFromInt(500),
		LastResetDate: time.Now().Truncate(time.Second),
		AgentName:     &agentName,
		PortName:      &portName,
		Remark:        &remark,
		CreatedAt:     time.Now().Truncate(time.Second),
		UpdatedAt:     time.Now().Truncate(time.Second),
		CreatedBy:     &createdBy,
		UpdatedBy:     &createdBy,
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(merchant)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Company")
	assert.Contains(t, string(jsonData), "Test Agent")
	assert.Contains(t, string(jsonData), "test-port")

	// Test JSON unmarshaling
	var unmarshaled Merchant
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, merchant.ID, unmarshaled.ID)
	assert.Equal(t, merchant.Name, unmarshaled.Name)
	assert.Equal(t, merchant.Code, unmarshaled.Code)
	assert.Equal(t, *merchant.AgentName, *unmarshaled.AgentName)
	assert.Equal(t, *merchant.PortName, *unmarshaled.PortName)
	assert.Equal(t, *merchant.Remark, *unmarshaled.Remark)
	assert.True(t, merchant.DailyLimit.Equal(unmarshaled.DailyLimit))
	assert.True(t, merchant.SingleLimit.Equal(unmarshaled.SingleLimit))
}

func TestReceiveAccount_JSONSerialization(t *testing.T) {
	// Test data
	accountID := uuid.New()
	createdBy := uuid.New()
	customProvider := "Custom Payment Provider"
	bankName := "Test Bank"
	bankBranch := "Main Branch"

	account := &ReceiveAccount{
		ID:                    accountID,
		AccountName:           "Test Account",
		AccountNumber:         "1234567890",
		AccountType:           "other",
		CustomPaymentProvider: &customProvider,
		BankName:              &bankName,
		BankBranch:            &bankBranch,
		AccountHolder:         "John Doe",
		PaymentType:           "private",
		Status:                "active",
		DailyLimit:            decimal.NewFromInt(5000),
		SingleLimit:           decimal.NewFromInt(500),
		DailyUsed:             decimal.NewFromInt(100),
		LastResetDate:         time.Now().Truncate(time.Second),
		CreatedAt:             time.Now().Truncate(time.Second),
		UpdatedAt:             time.Now().Truncate(time.Second),
		CreatedBy:             &createdBy,
		UpdatedBy:             &createdBy,
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(account)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Account")
	assert.Contains(t, string(jsonData), "Custom Payment Provider")

	// Test JSON unmarshaling
	var unmarshaled ReceiveAccount
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, account.ID, unmarshaled.ID)
	assert.Equal(t, account.AccountName, unmarshaled.AccountName)
	assert.Equal(t, account.AccountNumber, unmarshaled.AccountNumber)
	assert.Equal(t, account.AccountType, unmarshaled.AccountType)
	assert.Equal(t, *account.CustomPaymentProvider, *unmarshaled.CustomPaymentProvider)
	assert.True(t, account.DailyLimit.Equal(unmarshaled.DailyLimit))
	assert.True(t, account.SingleLimit.Equal(unmarshaled.SingleLimit))
}

func TestAgentSuggestion_JSONSerialization(t *testing.T) {
	// Test data
	suggestionID := uuid.New()
	now := time.Now().Truncate(time.Second)

	suggestion := &AgentSuggestion{
		ID:         suggestionID,
		AgentName:  "Test Agent",
		UsageCount: 5,
		LastUsedAt: now,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(suggestion)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Agent")
	assert.Contains(t, string(jsonData), "5")

	// Test JSON unmarshaling
	var unmarshaled AgentSuggestion
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, suggestion.ID, unmarshaled.ID)
	assert.Equal(t, suggestion.AgentName, unmarshaled.AgentName)
	assert.Equal(t, suggestion.UsageCount, unmarshaled.UsageCount)
	assert.Equal(t, suggestion.LastUsedAt.Unix(), unmarshaled.LastUsedAt.Unix())
}

func TestMerchantModalDTO_Validation(t *testing.T) {
	tests := []struct {
		name    string
		dto     MerchantModalDTO
		wantErr bool
	}{
		{
			name: "valid DTO",
			dto: MerchantModalDTO{
				CompanyName:               "Test Company",
				ReceiveAccountName:        "Test Account",
				ReceiveAccountNumber:      "1234567890",
				AccountType:               "bank",
				AccountHolder:             "John Doe",
				PaymentType:               "private",
				DailyLimit:                decimal.NewFromInt(10000),
				SingleLimit:               decimal.NewFromInt(1000),
			},
			wantErr: false,
		},
		{
			name: "valid DTO with custom payment provider",
			dto: MerchantModalDTO{
				CompanyName:               "Test Company",
				ReceiveAccountName:        "Test Account",
				ReceiveAccountNumber:      "1234567890",
				AccountType:               "other",
				CustomPaymentProvider:     &[]string{"Custom Provider"}[0],
				AccountHolder:             "John Doe",
				PaymentType:               "business",
				DailyLimit:                decimal.NewFromInt(10000),
				SingleLimit:               decimal.NewFromInt(1000),
			},
			wantErr: false,
		},
		{
			name: "valid DTO with optional fields",
			dto: MerchantModalDTO{
				CompanyName:               "Test Company",
				ReceiveAccountName:        "Test Account",
				ReceiveAccountNumber:      "1234567890",
				AccountType:               "alipay",
				AccountHolder:             "John Doe",
				PaymentType:               "private",
				DailyLimit:                decimal.NewFromInt(10000),
				SingleLimit:               decimal.NewFromInt(1000),
				AgentName:                 &[]string{"Test Agent"}[0],
				PortName:                  &[]string{"test-port"}[0],
				Remark:                    &[]string{"Test remark"}[0],
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test JSON serialization
			jsonData, err := json.Marshal(tt.dto)
			require.NoError(t, err)

			// Test JSON deserialization
			var unmarshaled MerchantModalDTO
			err = json.Unmarshal(jsonData, &unmarshaled)
			require.NoError(t, err)

			// Verify fields
			assert.Equal(t, tt.dto.CompanyName, unmarshaled.CompanyName)
			assert.Equal(t, tt.dto.ReceiveAccountName, unmarshaled.ReceiveAccountName)
			assert.Equal(t, tt.dto.AccountType, unmarshaled.AccountType)
			assert.True(t, tt.dto.DailyLimit.Equal(unmarshaled.DailyLimit))
			assert.True(t, tt.dto.SingleLimit.Equal(unmarshaled.SingleLimit))

			if tt.dto.AgentName != nil {
				require.NotNil(t, unmarshaled.AgentName)
				assert.Equal(t, *tt.dto.AgentName, *unmarshaled.AgentName)
			}

			if tt.dto.PortName != nil {
				require.NotNil(t, unmarshaled.PortName)
				assert.Equal(t, *tt.dto.PortName, *unmarshaled.PortName)
			}

			if tt.dto.CustomPaymentProvider != nil {
				require.NotNil(t, unmarshaled.CustomPaymentProvider)
				assert.Equal(t, *tt.dto.CustomPaymentProvider, *unmarshaled.CustomPaymentProvider)
			}
		})
	}
}

func TestCreateMerchantRequest_JSONSerialization(t *testing.T) {
	agentName := "Test Agent"
	portName := "test-port"
	remark := "Test remark"
	contactPerson := "John Doe"
	contactPhone := "+1234567890"
	contactEmail := "john@test.com"
	customProvider := "Custom Provider"

	request := &CreateMerchantRequest{
		CompanyName:   "Test Company",
		ContactPerson: &contactPerson,
		ContactPhone:  &contactPhone,
		ContactEmail:  &contactEmail,
		ReceiveAccount: &CreateReceiveAccountRequest{
			AccountName:           "Test Account",
			AccountNumber:         "1234567890",
			AccountType:           "other",
			CustomPaymentProvider: &customProvider,
			AccountHolder:         "John Doe",
			PaymentType:           "private",
			DailyLimit:            decimal.NewFromInt(10000),
			SingleLimit:           decimal.NewFromInt(1000),
		},
		AgentName: &agentName,
		PortName:  &portName,
		Remark:    &remark,
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(request)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Company")
	assert.Contains(t, string(jsonData), "Test Agent")
	assert.Contains(t, string(jsonData), "Custom Provider")

	// Test JSON unmarshaling
	var unmarshaled CreateMerchantRequest
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, request.CompanyName, unmarshaled.CompanyName)
	assert.Equal(t, *request.ContactPerson, *unmarshaled.ContactPerson)
	assert.Equal(t, *request.AgentName, *unmarshaled.AgentName)
	assert.Equal(t, *request.PortName, *unmarshaled.PortName)
	assert.Equal(t, *request.Remark, *unmarshaled.Remark)

	require.NotNil(t, unmarshaled.ReceiveAccount)
	assert.Equal(t, request.ReceiveAccount.AccountName, unmarshaled.ReceiveAccount.AccountName)
	assert.Equal(t, request.ReceiveAccount.AccountType, unmarshaled.ReceiveAccount.AccountType)
	assert.Equal(t, *request.ReceiveAccount.CustomPaymentProvider, *unmarshaled.ReceiveAccount.CustomPaymentProvider)
}

func TestMerchantResponse_JSONSerialization(t *testing.T) {
	merchantID := uuid.New()
	accountID := uuid.New()
	agentName := "Test Agent"
	portName := "test-port"
	remark := "Test remark"
	contactPerson := "John Doe"
	customProvider := "Custom Provider"

	response := &MerchantResponse{
		ID:            merchantID,
		Name:          "Test Company",
		Code:          "TEST001",
		ContactPerson: &contactPerson,
		Status:        "active",
		DailyLimit:    decimal.NewFromInt(10000),
		SingleLimit:   decimal.NewFromInt(1000),
		DailyUsed:     decimal.NewFromInt(500),
		AgentName:     &agentName,
		PortName:      &portName,
		Remark:        &remark,
		Accounts: []*ReceiveAccountResponse{
			{
				ID:                    accountID,
				AccountName:           "Test Account",
				AccountNumber:         "1234567890",
				AccountType:           "other",
				CustomPaymentProvider: &customProvider,
				AccountHolder:         "John Doe",
				PaymentType:           "private",
				Status:                "active",
				DailyLimit:            decimal.NewFromInt(5000),
				SingleLimit:           decimal.NewFromInt(500),
				DailyUsed:             decimal.NewFromInt(100),
				CreatedAt:             time.Now().Truncate(time.Second),
				UpdatedAt:             time.Now().Truncate(time.Second),
			},
		},
		CreatedAt: time.Now().Truncate(time.Second),
		UpdatedAt: time.Now().Truncate(time.Second),
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(response)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Company")
	assert.Contains(t, string(jsonData), "Test Agent")
	assert.Contains(t, string(jsonData), "Custom Provider")

	// Test JSON unmarshaling
	var unmarshaled MerchantResponse
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, response.ID, unmarshaled.ID)
	assert.Equal(t, response.Name, unmarshaled.Name)
	assert.Equal(t, *response.AgentName, *unmarshaled.AgentName)
	assert.Equal(t, *response.PortName, *unmarshaled.PortName)
	assert.Equal(t, *response.Remark, *unmarshaled.Remark)
	assert.True(t, response.DailyLimit.Equal(unmarshaled.DailyLimit))

	require.Len(t, unmarshaled.Accounts, 1)
	assert.Equal(t, response.Accounts[0].ID, unmarshaled.Accounts[0].ID)
	assert.Equal(t, response.Accounts[0].AccountName, unmarshaled.Accounts[0].AccountName)
	assert.Equal(t, *response.Accounts[0].CustomPaymentProvider, *unmarshaled.Accounts[0].CustomPaymentProvider)
}

func TestAgentSuggestionResponse_JSONSerialization(t *testing.T) {
	now := time.Now().Truncate(time.Second)

	response := &AgentSuggestionResponse{
		AgentName:  "Test Agent",
		UsageCount: 10,
		LastUsedAt: now,
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(response)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "Test Agent")
	assert.Contains(t, string(jsonData), "10")

	// Test JSON unmarshaling
	var unmarshaled AgentSuggestionResponse
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, response.AgentName, unmarshaled.AgentName)
	assert.Equal(t, response.UsageCount, unmarshaled.UsageCount)
	assert.Equal(t, response.LastUsedAt.Unix(), unmarshaled.LastUsedAt.Unix())
}

func TestErrorResponse_JSONSerialization(t *testing.T) {
	response := &ErrorResponse{
		Code:    "VALIDATION_ERROR",
		Message: "Validation failed",
		ValidationErrors: []*ValidationErrorResponse{
			{
				Field:   "company_name",
				Message: "Company name is required",
				Value:   "",
			},
			{
				Field:   "account_type",
				Message: "Invalid account type",
				Value:   "invalid",
			},
		},
		Details: map[string]interface{}{
			"request_id": "12345",
			"timestamp": time.Now().Unix(),
		},
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(response)
	require.NoError(t, err)
	assert.Contains(t, string(jsonData), "VALIDATION_ERROR")
	assert.Contains(t, string(jsonData), "company_name")

	// Test JSON unmarshaling
	var unmarshaled ErrorResponse
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Equal(t, response.Code, unmarshaled.Code)
	assert.Equal(t, response.Message, unmarshaled.Message)
	require.Len(t, unmarshaled.ValidationErrors, 2)
	assert.Equal(t, response.ValidationErrors[0].Field, unmarshaled.ValidationErrors[0].Field)
	assert.Equal(t, response.ValidationErrors[0].Message, unmarshaled.ValidationErrors[0].Message)
}

func TestDecimalFieldsHandling(t *testing.T) {
	// Test zero values
	dto := MerchantModalDTO{
		CompanyName:               "Test Company",
		ReceiveAccountName:        "Test Account",
		ReceiveAccountNumber:      "1234567890",
		AccountType:               "bank",
		AccountHolder:             "John Doe",
		PaymentType:               "private",
		DailyLimit:                decimal.Zero,
		SingleLimit:               decimal.Zero,
	}

	jsonData, err := json.Marshal(dto)
	require.NoError(t, err)

	var unmarshaled MerchantModalDTO
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.True(t, dto.DailyLimit.Equal(unmarshaled.DailyLimit))
	assert.True(t, dto.SingleLimit.Equal(unmarshaled.SingleLimit))

	// Test large decimal values
	dto.DailyLimit = decimal.NewFromFloat(999999.99)
	dto.SingleLimit = decimal.NewFromFloat(99999.99)

	jsonData, err = json.Marshal(dto)
	require.NoError(t, err)

	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.True(t, dto.DailyLimit.Equal(unmarshaled.DailyLimit))
	assert.True(t, dto.SingleLimit.Equal(unmarshaled.SingleLimit))
}

func TestNilPointerFieldsHandling(t *testing.T) {
	// Test with nil optional fields
	dto := MerchantModalDTO{
		CompanyName:               "Test Company",
		ReceiveAccountName:        "Test Account",
		ReceiveAccountNumber:      "1234567890",
		AccountType:               "bank",
		AccountHolder:             "John Doe",
		PaymentType:               "private",
		DailyLimit:                decimal.NewFromInt(10000),
		SingleLimit:               decimal.NewFromInt(1000),
		CustomPaymentProvider:     nil,
		AgentName:                 nil,
		PortName:                  nil,
		Remark:                    nil,
	}

	jsonData, err := json.Marshal(dto)
	require.NoError(t, err)

	var unmarshaled MerchantModalDTO
	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	assert.Nil(t, unmarshaled.CustomPaymentProvider)
	assert.Nil(t, unmarshaled.AgentName)
	assert.Nil(t, unmarshaled.PortName)
	assert.Nil(t, unmarshaled.Remark)

	// Test with non-nil optional fields
	customProvider := "Custom Provider"
	agentName := "Test Agent"
	portName := "test-port"
	remark := "Test remark"

	dto.CustomPaymentProvider = &customProvider
	dto.AgentName = &agentName
	dto.PortName = &portName
	dto.Remark = &remark

	jsonData, err = json.Marshal(dto)
	require.NoError(t, err)

	err = json.Unmarshal(jsonData, &unmarshaled)
	require.NoError(t, err)

	require.NotNil(t, unmarshaled.CustomPaymentProvider)
	assert.Equal(t, customProvider, *unmarshaled.CustomPaymentProvider)
	require.NotNil(t, unmarshaled.AgentName)
	assert.Equal(t, agentName, *unmarshaled.AgentName)
	require.NotNil(t, unmarshaled.PortName)
	assert.Equal(t, portName, *unmarshaled.PortName)
	require.NotNil(t, unmarshaled.Remark)
	assert.Equal(t, remark, *unmarshaled.Remark)
}