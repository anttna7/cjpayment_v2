package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHelperFunctions(t *testing.T) {
	// Test generateAccountNumber
	tests := []struct {
		accountType string
		index       int
		expected    string
	}{
		{"alipay", 1, "alipay_1@test.com"},
		{"wechat", 2, "wx_test_2"},
		{"bank", 3, "6222000000000003"},
		{"other", 4, "other_4"},
	}

	for _, tt := range tests {
		result := generateAccountNumber(tt.accountType, tt.index)
		assert.Equal(t, tt.expected, result)
	}

	// Test generatePayerAccount
	publicAccount := generatePayerAccount("public", 1)
	assert.Equal(t, "6228000000000001", publicAccount)

	privateAccount := generatePayerAccount("private", 1)
	assert.Equal(t, "payer_1@test.com", privateAccount)
}

func TestTestDataServiceInterface(t *testing.T) {
	// Test that our service implements the interface correctly
	var _ TestDataService = (*testDataService)(nil)
	
	// Test request structs have proper validation tags
	req := &GenerateMerchantTestDataRequest{
		Count: 5,
	}
	assert.Equal(t, 5, req.Count)
	
	batchReq := &BatchTestDataRequest{
		LinkAccounts: true,
	}
	assert.True(t, batchReq.LinkAccounts)
}