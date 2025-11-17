package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Validation errors
var (
	ErrMerchantNameExists         = errors.New("公司名称已存在")
	ErrPortNameExists            = errors.New("端口名称已被使用")
	ErrAccountNumberExists       = errors.New("收款账号已存在")
	ErrInvalidAccountFormat      = errors.New("账号格式不正确")
	ErrLimitValidation          = errors.New("单笔限额不能大于单日限额")
	ErrMissingPaymentProvider   = errors.New("选择其它类型时必须填写收单机构名称")
	ErrInvalidCompanyNameFormat = errors.New("公司名称格式不正确")
	ErrInvalidPortNameFormat    = errors.New("端口名称格式不正确")
	ErrInvalidAccountName       = errors.New("账户名称格式不正确")
)

// MerchantValidator provides validation services for merchant-related operations
type MerchantValidator struct {
	merchantRepo repository.MerchantRepository
	accountRepo  repository.ReceiveAccountRepository
}

// NewMerchantValidator creates a new merchant validator
func NewMerchantValidator(
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
) *MerchantValidator {
	return &MerchantValidator{
		merchantRepo: merchantRepo,
		accountRepo:  accountRepo,
	}
}

// ValidateCreateMerchantRequest validates a create merchant request
func (v *MerchantValidator) ValidateCreateMerchantRequest(ctx context.Context, req *CreateMerchantRequest) error {
	// 1. Validate company name format
	if err := v.ValidateCompanyNameFormat(req.Name); err != nil {
		return err
	}

	// 2. Validate company name uniqueness
	if err := v.ValidateCompanyNameUniqueness(ctx, req.Name); err != nil {
		return err
	}

	// 3. Validate port name if provided
	if req.PortName != nil && *req.PortName != "" {
		if err := v.ValidatePortNameFormat(*req.PortName); err != nil {
			return err
		}
		if err := v.ValidatePortNameUniqueness(ctx, *req.PortName); err != nil {
			return err
		}
	}

	// 4. Validate receive account if provided
	if req.ReceiveAccount != nil {
		if err := v.ValidateReceiveAccountRequest(ctx, req.ReceiveAccount); err != nil {
			return err
		}
	}

	return nil
}

// ValidateUpdateMerchantRequest validates an update merchant request
func (v *MerchantValidator) ValidateUpdateMerchantRequest(ctx context.Context, merchantID uuid.UUID, req *UpdateMerchantRequest) error {
	// 1. Validate company name if provided
	if req.Name != nil {
		if err := v.ValidateCompanyNameFormat(*req.Name); err != nil {
			return err
		}
		if err := v.ValidateCompanyNameUniquenessExcluding(ctx, *req.Name, merchantID); err != nil {
			return err
		}
	}

	// 2. Validate port name if provided
	if req.PortName != nil && *req.PortName != "" {
		if err := v.ValidatePortNameFormat(*req.PortName); err != nil {
			return err
		}
		if err := v.ValidatePortNameUniquenessExcluding(ctx, *req.PortName, merchantID); err != nil {
			return err
		}
	}

	// 3. Validate limits if provided
	if req.DailyLimit != nil && req.SingleLimit != nil {
		if err := v.ValidateLimitLogic(*req.SingleLimit, *req.DailyLimit); err != nil {
			return err
		}
	}

	return nil
}

// ValidateCompanyNameFormat validates company name format
func (v *MerchantValidator) ValidateCompanyNameFormat(companyName string) error {
	if strings.TrimSpace(companyName) == "" {
		return fmt.Errorf("公司名称不能为空")
	}

	if len(companyName) < 2 {
		return fmt.Errorf("公司名称长度不能少于2个字符")
	}

	if len(companyName) > 100 {
		return fmt.Errorf("公司名称长度不能超过100个字符")
	}

	// Allow Chinese characters, English letters, numbers, spaces, and common symbols
	pattern := `^[\u4e00-\u9fa5a-zA-Z0-9\s\(\)（）\-_\.]+$`
	matched, err := regexp.MatchString(pattern, companyName)
	if err != nil {
		return fmt.Errorf("公司名称格式验证失败: %w", err)
	}

	if !matched {
		return ErrInvalidCompanyNameFormat
	}

	return nil
}

// ValidateCompanyNameUniqueness validates company name uniqueness
func (v *MerchantValidator) ValidateCompanyNameUniqueness(ctx context.Context, companyName string) error {
	exists, err := v.merchantRepo.ExistsByName(ctx, companyName)
	if err != nil {
		return fmt.Errorf("验证公司名称唯一性失败: %w", err)
	}

	if exists {
		return ErrMerchantNameExists
	}

	return nil
}

// ValidateCompanyNameUniquenessExcluding validates company name uniqueness excluding a specific merchant
func (v *MerchantValidator) ValidateCompanyNameUniquenessExcluding(ctx context.Context, companyName string, excludeMerchantID uuid.UUID) error {
	exists, err := v.merchantRepo.ExistsByName(ctx, companyName)
	if err != nil {
		return fmt.Errorf("验证公司名称唯一性失败: %w", err)
	}

	if exists {
		// Check if the existing merchant is the one we're updating
		existingMerchant, err := v.merchantRepo.GetByCode(ctx, companyName)
		if err == nil && existingMerchant != nil && existingMerchant.ID != excludeMerchantID {
			return ErrMerchantNameExists
		}
	}

	return nil
}

// ValidatePortNameFormat validates port name format
func (v *MerchantValidator) ValidatePortNameFormat(portName string) error {
	if strings.TrimSpace(portName) == "" {
		return fmt.Errorf("端口名称不能为空")
	}

	if len(portName) < 2 {
		return fmt.Errorf("端口名称长度不能少于2个字符")
	}

	if len(portName) > 50 {
		return fmt.Errorf("端口名称长度不能超过50个字符")
	}

	// Port names should only contain alphanumeric characters, underscores, and hyphens
	pattern := `^[a-zA-Z0-9_-]+$`
	matched, err := regexp.MatchString(pattern, portName)
	if err != nil {
		return fmt.Errorf("端口名称格式验证失败: %w", err)
	}

	if !matched {
		return ErrInvalidPortNameFormat
	}

	return nil
}

// ValidatePortNameUniqueness validates port name uniqueness
func (v *MerchantValidator) ValidatePortNameUniqueness(ctx context.Context, portName string) error {
	exists, err := v.merchantRepo.ExistsByPortName(ctx, portName)
	if err != nil {
		return fmt.Errorf("验证端口名称唯一性失败: %w", err)
	}

	if exists {
		return ErrPortNameExists
	}

	return nil
}

// ValidatePortNameUniquenessExcluding validates port name uniqueness excluding a specific merchant
func (v *MerchantValidator) ValidatePortNameUniquenessExcluding(ctx context.Context, portName string, excludeMerchantID uuid.UUID) error {
	exists, err := v.merchantRepo.ExistsByPortName(ctx, portName)
	if err != nil {
		return fmt.Errorf("验证端口名称唯一性失败: %w", err)
	}

	if exists {
		// Get the merchant with this port name to check if it's the same one we're updating
		merchant, _, err := v.merchantRepo.GetMerchantWithAccounts(ctx, excludeMerchantID)
		if err == nil && merchant != nil && merchant.PortName != nil && *merchant.PortName == portName {
			// It's the same merchant, so it's allowed
			return nil
		}
		return ErrPortNameExists
	}

	return nil
}

// ValidateReceiveAccountRequest validates a receive account request
func (v *MerchantValidator) ValidateReceiveAccountRequest(ctx context.Context, req *CreateReceiveAccountRequest) error {
	// 1. Validate account name format
	if err := v.ValidateAccountNameFormat(req.AccountName); err != nil {
		return err
	}

	// 2. Validate account number format and uniqueness
	if err := v.ValidateAccountNumberFormat(req.AccountNumber, req.AccountType); err != nil {
		return err
	}

	if err := v.ValidateAccountNumberUniqueness(ctx, req.AccountNumber); err != nil {
		return err
	}

	// 3. Validate account type and custom payment provider
	if err := v.ValidateAccountTypeAndProvider(req.AccountType, req.CustomPaymentProvider); err != nil {
		return err
	}

	// 4. Validate limits
	if err := v.ValidateLimitLogic(req.SingleLimit, req.DailyLimit); err != nil {
		return err
	}

	return nil
}

// ValidateAccountNameFormat validates account name format
func (v *MerchantValidator) ValidateAccountNameFormat(accountName string) error {
	if strings.TrimSpace(accountName) == "" {
		return fmt.Errorf("账户名称不能为空")
	}

	if len(accountName) < 2 {
		return fmt.Errorf("账户名称长度不能少于2个字符")
	}

	if len(accountName) > 50 {
		return fmt.Errorf("账户名称长度不能超过50个字符")
	}

	// Allow Chinese characters, English letters, numbers, and spaces
	pattern := `^[\u4e00-\u9fa5a-zA-Z0-9\s]+$`
	matched, err := regexp.MatchString(pattern, accountName)
	if err != nil {
		return fmt.Errorf("账户名称格式验证失败: %w", err)
	}

	if !matched {
		return ErrInvalidAccountName
	}

	return nil
}

// ValidateAccountNumberFormat validates account number format based on account type
func (v *MerchantValidator) ValidateAccountNumberFormat(accountNumber, accountType string) error {
	if strings.TrimSpace(accountNumber) == "" {
		return fmt.Errorf("收款账号不能为空")
	}

	if len(accountNumber) < 6 {
		return fmt.Errorf("收款账号长度不能少于6个字符")
	}

	if len(accountNumber) > 30 {
		return fmt.Errorf("收款账号长度不能超过30个字符")
	}

	// Validate format based on account type
	switch accountType {
	case "alipay":
		// Alipay account can be email or mobile number
		emailPattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
		mobilePattern := `^1[3-9]\d{9}$`
		
		emailMatched, _ := regexp.MatchString(emailPattern, accountNumber)
		mobileMatched, _ := regexp.MatchString(mobilePattern, accountNumber)
		
		if !emailMatched && !mobileMatched {
			return fmt.Errorf("支付宝账号格式不正确，应为邮箱或手机号")
		}

	case "wechat":
		// WeChat account can be various formats, allow alphanumeric and some symbols
		pattern := `^[a-zA-Z0-9_-]+$`
		matched, err := regexp.MatchString(pattern, accountNumber)
		if err != nil {
			return fmt.Errorf("微信账号格式验证失败: %w", err)
		}
		if !matched {
			return fmt.Errorf("微信账号格式不正确")
		}

	case "bank":
		// Bank account should be numeric
		pattern := `^\d{10,30}$`
		matched, err := regexp.MatchString(pattern, accountNumber)
		if err != nil {
			return fmt.Errorf("银行账号格式验证失败: %w", err)
		}
		if !matched {
			return fmt.Errorf("银行账号格式不正确，应为10-30位数字")
		}

	case "other":
		// For other types, allow alphanumeric and common symbols
		pattern := `^[a-zA-Z0-9@._-]+$`
		matched, err := regexp.MatchString(pattern, accountNumber)
		if err != nil {
			return fmt.Errorf("账号格式验证失败: %w", err)
		}
		if !matched {
			return ErrInvalidAccountFormat
		}

	default:
		return fmt.Errorf("不支持的账户类型: %s", accountType)
	}

	return nil
}

// ValidateAccountNumberUniqueness validates account number uniqueness
func (v *MerchantValidator) ValidateAccountNumberUniqueness(ctx context.Context, accountNumber string) error {
	exists, err := v.accountRepo.ExistsByAccountNumber(ctx, accountNumber)
	if err != nil {
		return fmt.Errorf("验证收款账号唯一性失败: %w", err)
	}

	if exists {
		return ErrAccountNumberExists
	}

	return nil
}

// ValidateAccountTypeAndProvider validates account type and custom payment provider
func (v *MerchantValidator) ValidateAccountTypeAndProvider(accountType string, customPaymentProvider *string) error {
	// Validate account type
	validTypes := []string{"alipay", "wechat", "bank", "other"}
	isValidType := false
	for _, validType := range validTypes {
		if accountType == validType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		return fmt.Errorf("无效的账户类型: %s", accountType)
	}

	// If account type is "other", custom payment provider is required
	if accountType == "other" {
		if customPaymentProvider == nil || strings.TrimSpace(*customPaymentProvider) == "" {
			return ErrMissingPaymentProvider
		}

		if len(*customPaymentProvider) < 2 {
			return fmt.Errorf("收单机构名称长度不能少于2个字符")
		}

		if len(*customPaymentProvider) > 50 {
			return fmt.Errorf("收单机构名称长度不能超过50个字符")
		}
	}

	return nil
}

// ValidateLimitLogic validates that single limit is not greater than daily limit
func (v *MerchantValidator) ValidateLimitLogic(singleLimit, dailyLimit decimal.Decimal) error {
	if singleLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("单笔限额不能为负数")
	}

	if dailyLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("单日限额不能为负数")
	}

	if singleLimit.GreaterThan(dailyLimit) {
		return ErrLimitValidation
	}

	return nil
}

// ValidateMerchantModalDTO validates a merchant modal DTO
func (v *MerchantValidator) ValidateMerchantModalDTO(ctx context.Context, dto *repository.MerchantModalDTO) error {
	// 1. Validate company name
	if err := v.ValidateCompanyNameFormat(dto.CompanyName); err != nil {
		return err
	}

	if dto.ID == nil {
		// Creating new merchant - check uniqueness
		if err := v.ValidateCompanyNameUniqueness(ctx, dto.CompanyName); err != nil {
			return err
		}
	} else {
		// Updating existing merchant - check uniqueness excluding current merchant
		if err := v.ValidateCompanyNameUniquenessExcluding(ctx, dto.CompanyName, *dto.ID); err != nil {
			return err
		}
	}

	// 2. Validate port name if provided
	if dto.PortName != nil && *dto.PortName != "" {
		if err := v.ValidatePortNameFormat(*dto.PortName); err != nil {
			return err
		}

		if dto.ID == nil {
			if err := v.ValidatePortNameUniqueness(ctx, *dto.PortName); err != nil {
				return err
			}
		} else {
			if err := v.ValidatePortNameUniquenessExcluding(ctx, *dto.PortName, *dto.ID); err != nil {
				return err
			}
		}
	}

	// 3. Validate receive account information
	if err := v.ValidateAccountNameFormat(dto.ReceiveAccountName); err != nil {
		return err
	}

	if err := v.ValidateAccountNumberFormat(dto.ReceiveAccountNumber, dto.AccountType); err != nil {
		return err
	}

	if dto.ID == nil {
		// For new merchants, check account number uniqueness
		if err := v.ValidateAccountNumberUniqueness(ctx, dto.ReceiveAccountNumber); err != nil {
			return err
		}
	}

	if err := v.ValidateAccountTypeAndProvider(dto.AccountType, dto.CustomPaymentProvider); err != nil {
		return err
	}

	// 4. Validate limits
	if err := v.ValidateLimitLogic(dto.SingleLimit, dto.DailyLimit); err != nil {
		return err
	}

	return nil
}

// GetValidationRules returns validation rules for frontend use
func (v *MerchantValidator) GetValidationRules() map[string]interface{} {
	return map[string]interface{}{
		"companyName": map[string]interface{}{
			"required":  true,
			"minLength": 2,
			"maxLength": 100,
			"pattern":   `^[\u4e00-\u9fa5a-zA-Z0-9\s\(\)（）\-_\.]+$`,
			"message":   "公司名称只能包含中文、英文、数字、空格和常用符号",
		},
		"accountName": map[string]interface{}{
			"required":  true,
			"minLength": 2,
			"maxLength": 50,
			"pattern":   `^[\u4e00-\u9fa5a-zA-Z0-9\s]+$`,
			"message":   "账户名称只能包含中文、英文、数字和空格",
		},
		"accountNumber": map[string]interface{}{
			"required":  true,
			"minLength": 6,
			"maxLength": 30,
			"patterns": map[string]string{
				"alipay": `^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|1[3-9]\d{9})$`,
				"wechat": `^[a-zA-Z0-9_-]+$`,
				"bank":   `^\d{10,30}$`,
				"other":  `^[a-zA-Z0-9@._-]+$`,
			},
			"messages": map[string]string{
				"alipay": "支付宝账号格式不正确，应为邮箱或手机号",
				"wechat": "微信账号格式不正确",
				"bank":   "银行账号格式不正确，应为10-30位数字",
				"other":  "账号格式不正确",
			},
		},
		"portName": map[string]interface{}{
			"required":  false,
			"minLength": 2,
			"maxLength": 50,
			"pattern":   `^[a-zA-Z0-9_-]+$`,
			"message":   "端口名称只能包含英文、数字、下划线和连字符",
		},
		"limits": map[string]interface{}{
			"singleLimit": map[string]interface{}{
				"min":     0,
				"message": "单笔限额不能为负数",
			},
			"dailyLimit": map[string]interface{}{
				"min":     0,
				"message": "单日限额不能为负数",
			},
			"logic": "单笔限额不能大于单日限额",
		},
	}
}