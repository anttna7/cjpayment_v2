package security

import (
	"testing"
)

func TestDataMasker_MaskAccountNumber(t *testing.T) {
	masker := NewDataMasker()
	
	tests := []struct {
		name          string
		accountNumber string
		level         MaskingLevel
		expected      string
	}{
		{
			name:          "partial masking short number",
			accountNumber: "1234",
			level:         MaskingLevelPartial,
			expected:      "****",
		},
		{
			name:          "partial masking long number",
			accountNumber: "1234567890123456",
			level:         MaskingLevelPartial,
			expected:      "12************56",
		},
		{
			name:          "full masking",
			accountNumber: "1234567890123456",
			level:         MaskingLevelFull,
			expected:      "************",
		},
		{
			name:          "no masking",
			accountNumber: "1234567890123456",
			level:         MaskingLevelNone,
			expected:      "1234567890123456",
		},
		{
			name:          "empty account number",
			accountNumber: "",
			level:         MaskingLevelPartial,
			expected:      "",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := masker.maskAccountNumber(tt.accountNumber, tt.level)
			if result != tt.expected {
				t.Errorf("maskAccountNumber() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDataMasker_MaskPhone(t *testing.T) {
	masker := NewDataMasker()
	
	tests := []struct {
		name     string
		phone    string
		level    MaskingLevel
		expected string
	}{
		{
			name:     "partial masking with dashes",
			phone:    "123-456-7890",
			level:    MaskingLevelPartial,
			expected: "***-***-7890",
		},
		{
			name:     "partial masking without dashes",
			phone:    "1234567890",
			level:    MaskingLevelPartial,
			expected: "******7890",
		},
		{
			name:     "full masking",
			phone:    "123-456-7890",
			level:    MaskingLevelFull,
			expected: "************",
		},
		{
			name:     "no masking",
			phone:    "123-456-7890",
			level:    MaskingLevelNone,
			expected: "123-456-7890",
		},
		{
			name:     "short phone",
			phone:    "1234",
			level:    MaskingLevelPartial,
			expected: "****",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := masker.maskPhone(tt.phone, tt.level)
			if result != tt.expected {
				t.Errorf("maskPhone() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDataMasker_MaskEmail(t *testing.T) {
	masker := NewDataMasker()
	
	tests := []struct {
		name     string
		email    string
		level    MaskingLevel
		expected string
	}{
		{
			name:     "partial masking normal email",
			email:    "user@example.com",
			level:    MaskingLevelPartial,
			expected: "u***@example.com",
		},
		{
			name:     "partial masking short username",
			email:    "ab@example.com",
			level:    MaskingLevelPartial,
			expected: "**@example.com",
		},
		{
			name:     "full masking",
			email:    "user@example.com",
			level:    MaskingLevelFull,
			expected: "****@***********",
		},
		{
			name:     "no masking",
			email:    "user@example.com",
			level:    MaskingLevelNone,
			expected: "user@example.com",
		},
		{
			name:     "invalid email",
			email:    "invalid-email",
			level:    MaskingLevelPartial,
			expected: "i***********l",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := masker.maskEmail(tt.email, tt.level)
			if result != tt.expected {
				t.Errorf("maskEmail() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDataMasker_MaskName(t *testing.T) {
	masker := NewDataMasker()
	
	tests := []struct {
		name     string
		fullName string
		level    MaskingLevel
		expected string
	}{
		{
			name:     "partial masking full name",
			fullName: "John Doe",
			level:    MaskingLevelPartial,
			expected: "J*** D**",
		},
		{
			name:     "partial masking single name",
			fullName: "John",
			level:    MaskingLevelPartial,
			expected: "J***",
		},
		{
			name:     "full masking",
			fullName: "John Doe",
			level:    MaskingLevelFull,
			expected: "********",
		},
		{
			name:     "no masking",
			fullName: "John Doe",
			level:    MaskingLevelNone,
			expected: "John Doe",
		},
		{
			name:     "single character name",
			fullName: "J",
			level:    MaskingLevelPartial,
			expected: "*",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := masker.maskName(tt.fullName, tt.level)
			if result != tt.expected {
				t.Errorf("maskName() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDataMasker_MaskAccountData(t *testing.T) {
	masker := NewDataMasker()
	
	accountData := map[string]interface{}{
		"id":                         "123e4567-e89b-12d3-a456-426614174000",
		"account_name":               "Test Account",
		"account_number":             "1234567890123456",
		"account_holder":             "John Doe",
		"account_type":               "bank",
		"payment_type":               "bank_transfer",
		"status":                     "active",
		"daily_limit":                "10000.00",
		"single_limit":               "5000.00",
		"daily_used":                 "2500.00",
		"custom_payment_provider":    "test_provider",
		"contact_phone":              "123-456-7890",
		"contact_email":              "john@example.com",
	}
	
	tests := []struct {
		name     string
		level    MaskingLevel
		checkKey string
		expected string
	}{
		{
			name:     "partial masking account number",
			level:    MaskingLevelPartial,
			checkKey: "account_number",
			expected: "12************56",
		},
		{
			name:     "partial masking account holder",
			level:    MaskingLevelPartial,
			checkKey: "account_holder",
			expected: "J*** D**",
		},
		{
			name:     "no masking for non-sensitive fields",
			level:    MaskingLevelPartial,
			checkKey: "account_name",
			expected: "Test Account",
		},
		{
			name:     "full masking account number",
			level:    MaskingLevelFull,
			checkKey: "account_number",
			expected: "************",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := masker.MaskAccountData(accountData, tt.level)
			if result[tt.checkKey] != tt.expected {
				t.Errorf("MaskAccountData() field %s = %v, want %v", tt.checkKey, result[tt.checkKey], tt.expected)
			}
		})
	}
}

func TestDataMasker_AddCustomRule(t *testing.T) {
	masker := NewDataMasker()
	
	// Add a custom rule
	customRule := FieldMaskingRule{
		FieldName:    "custom_field",
		MaskingType:  MaskingTypeCustom,
		MaskingLevel: MaskingLevelFull,
		CustomMask:   "[CUSTOM_MASKED]",
	}
	masker.AddRule(customRule)
	
	data := map[string]interface{}{
		"custom_field": "sensitive_data",
		"normal_field": "normal_data",
	}
	
	result := masker.MaskAccountData(data, MaskingLevelPartial)
	
	if result["custom_field"] != "[CUSTOM_MASKED]" {
		t.Errorf("Custom rule not applied correctly, got %v", result["custom_field"])
	}
	
	if result["normal_field"] != "normal_data" {
		t.Errorf("Normal field should not be masked, got %v", result["normal_field"])
	}
}

func TestGetMaskingLevelForUser(t *testing.T) {
	tests := []struct {
		name      string
		userRoles []string
		operation string
		expected  MaskingLevel
	}{
		{
			name:      "admin user no masking",
			userRoles: []string{"admin"},
			operation: "read",
			expected:  MaskingLevelNone,
		},
		{
			name:      "account manager partial masking for read",
			userRoles: []string{"account_manager"},
			operation: "read",
			expected:  MaskingLevelPartial,
		},
		{
			name:      "account manager no masking for write",
			userRoles: []string{"account_manager"},
			operation: "write",
			expected:  MaskingLevelNone,
		},
		{
			name:      "regular user full masking",
			userRoles: []string{"user"},
			operation: "read",
			expected:  MaskingLevelFull,
		},
		{
			name:      "no roles full masking",
			userRoles: []string{},
			operation: "read",
			expected:  MaskingLevelFull,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetMaskingLevelForUser(tt.userRoles, tt.operation)
			if result != tt.expected {
				t.Errorf("GetMaskingLevelForUser() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDataMasker_MaskAccountResponse(t *testing.T) {
	masker := NewDataMasker()
	
	accounts := []map[string]interface{}{
		{
			"id":             "123",
			"account_number": "1234567890123456",
			"account_holder": "John Doe",
		},
		{
			"id":             "456",
			"account_number": "9876543210987654",
			"account_holder": "Jane Smith",
		},
	}
	
	result := masker.MaskAccountResponse(accounts, MaskingLevelPartial)
	
	if len(result) != 2 {
		t.Errorf("Expected 2 accounts, got %d", len(result))
	}
	
	if result[0]["account_number"] != "12************56" {
		t.Errorf("First account number not masked correctly: %v", result[0]["account_number"])
	}
	
	if result[1]["account_holder"] != "J*** S****" {
		t.Errorf("Second account holder not masked correctly: %v", result[1]["account_holder"])
	}
}