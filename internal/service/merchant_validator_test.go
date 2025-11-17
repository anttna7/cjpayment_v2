package service

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestMerchantValidator_ValidateCompanyNameFormat_Simple(t *testing.T) {
	validator := &MerchantValidator{}

	tests := []struct {
		name        string
		companyName string
		wantErr     bool
		errMsg      string
	}{
		{
			name:        "Valid Chinese company name",
			companyName: "北京科技有限公司",
			wantErr:     false,
		},
		{
			name:        "Valid English company name",
			companyName: "Tech Solutions Inc.",
			wantErr:     false,
		},
		{
			name:        "Valid mixed company name",
			companyName: "ABC科技(北京)有限公司",
			wantErr:     false,
		},
		{
			name:        "Empty company name",
			companyName: "",
			wantErr:     true,
			errMsg:      "公司名称不能为空",
		},
		{
			name:        "Too short company name",
			companyName: "A",
			wantErr:     true,
			errMsg:      "公司名称长度不能少于2个字符",
		},
		{
			name:        "Invalid characters in company name",
			companyName: "公司@#$%",
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateCompanyNameFormat(tt.companyName)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMerchantValidator_ValidatePortNameFormat_Simple(t *testing.T) {
	validator := &MerchantValidator{}

	tests := []struct {
		name     string
		portName string
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "Valid port name",
			portName: "api-gateway-01",
			wantErr:  false,
		},
		{
			name:     "Valid port name with underscores",
			portName: "payment_service_v2",
			wantErr:  false,
		},
		{
			name:     "Empty port name",
			portName: "",
			wantErr:  true,
			errMsg:   "端口名称不能为空",
		},
		{
			name:     "Too short port name",
			portName: "a",
			wantErr:  true,
			errMsg:   "端口名称长度不能少于2个字符",
		},
		{
			name:     "Invalid characters in port name",
			portName: "port@name",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidatePortNameFormat(tt.portName)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMerchantValidator_ValidateAccountNumberFormat_Simple(t *testing.T) {
	validator := &MerchantValidator{}

	tests := []struct {
		name          string
		accountNumber string
		accountType   string
		wantErr       bool
		errMsg        string
	}{
		{
			name:          "Valid Alipay email",
			accountNumber: "user@example.com",
			accountType:   "alipay",
			wantErr:       false,
		},
		{
			name:          "Valid Alipay mobile",
			accountNumber: "13812345678",
			accountType:   "alipay",
			wantErr:       false,
		},
		{
			name:          "Invalid Alipay account",
			accountNumber: "invalid-alipay",
			accountType:   "alipay",
			wantErr:       true,
			errMsg:        "支付宝账号格式不正确",
		},
		{
			name:          "Valid WeChat account",
			accountNumber: "wechat_user123",
			accountType:   "wechat",
			wantErr:       false,
		},
		{
			name:          "Invalid WeChat account",
			accountNumber: "wechat@user",
			accountType:   "wechat",
			wantErr:       true,
			errMsg:        "微信账号格式不正确",
		},
		{
			name:          "Valid bank account",
			accountNumber: "1234567890123456",
			accountType:   "bank",
			wantErr:       false,
		},
		{
			name:          "Invalid bank account - too short",
			accountNumber: "123456789",
			accountType:   "bank",
			wantErr:       true,
			errMsg:        "银行账号格式不正确",
		},
		{
			name:          "Valid other account",
			accountNumber: "other_account123",
			accountType:   "other",
			wantErr:       false,
		},
		{
			name:          "Empty account number",
			accountNumber: "",
			accountType:   "alipay",
			wantErr:       true,
			errMsg:        "收款账号不能为空",
		},
		{
			name:          "Unsupported account type",
			accountNumber: "123456789",
			accountType:   "unsupported",
			wantErr:       true,
			errMsg:        "不支持的账户类型",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateAccountNumberFormat(tt.accountNumber, tt.accountType)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMerchantValidator_ValidateLimitLogic_Simple(t *testing.T) {
	validator := &MerchantValidator{}

	tests := []struct {
		name        string
		singleLimit decimal.Decimal
		dailyLimit  decimal.Decimal
		wantErr     bool
		errMsg      string
	}{
		{
			name:        "Valid limits",
			singleLimit: decimal.NewFromInt(1000),
			dailyLimit:  decimal.NewFromInt(10000),
			wantErr:     false,
		},
		{
			name:        "Equal limits",
			singleLimit: decimal.NewFromInt(5000),
			dailyLimit:  decimal.NewFromInt(5000),
			wantErr:     false,
		},
		{
			name:        "Single limit greater than daily limit",
			singleLimit: decimal.NewFromInt(10000),
			dailyLimit:  decimal.NewFromInt(5000),
			wantErr:     true,
			errMsg:      "单笔限额不能大于单日限额",
		},
		{
			name:        "Negative single limit",
			singleLimit: decimal.NewFromInt(-1000),
			dailyLimit:  decimal.NewFromInt(10000),
			wantErr:     true,
			errMsg:      "单笔限额不能为负数",
		},
		{
			name:        "Negative daily limit",
			singleLimit: decimal.NewFromInt(1000),
			dailyLimit:  decimal.NewFromInt(-10000),
			wantErr:     true,
			errMsg:      "单日限额不能为负数",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateLimitLogic(tt.singleLimit, tt.dailyLimit)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMerchantValidator_GetValidationRules_Simple(t *testing.T) {
	validator := &MerchantValidator{}

	rules := validator.GetValidationRules()

	assert.NotNil(t, rules)
	assert.Contains(t, rules, "companyName")
	assert.Contains(t, rules, "accountName")
	assert.Contains(t, rules, "accountNumber")
	assert.Contains(t, rules, "portName")
	assert.Contains(t, rules, "limits")

	// Check company name rules
	companyNameRules := rules["companyName"].(map[string]interface{})
	assert.Equal(t, true, companyNameRules["required"])
	assert.Equal(t, 2, companyNameRules["minLength"])
	assert.Equal(t, 100, companyNameRules["maxLength"])

	// Check account number patterns
	accountNumberRules := rules["accountNumber"].(map[string]interface{})
	patterns := accountNumberRules["patterns"].(map[string]string)
	assert.Contains(t, patterns, "alipay")
	assert.Contains(t, patterns, "wechat")
	assert.Contains(t, patterns, "bank")
	assert.Contains(t, patterns, "other")
}