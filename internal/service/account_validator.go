package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/validation"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// AccountValidator provides account-specific validation rules
type AccountValidator struct {
	businessValidator *validation.BusinessValidator
	
	// Account-specific validation patterns
	bankCardRegex      *regexp.Regexp
	alipayRegex        *regexp.Regexp
	wechatRegex        *regexp.Regexp
	
	// Account type and status enums
	validAccountTypes  []string
	validAccountStatus []string
	validPaymentTypes  []string
	
	// Repository for duplicate checks
	accountRepo repository.ReceiveAccountRepository
}

// NewAccountValidator creates a new account validator
func NewAccountValidator(accountRepo repository.ReceiveAccountRepository) *AccountValidator {
	return &AccountValidator{
		businessValidator: validation.NewBusinessValidator(),
		
		// Bank card: 10-30 digits
		bankCardRegex: regexp.MustCompile(`^\d{10,30}$`),
		
		// Alipay: email or mobile phone
		alipayRegex: regexp.MustCompile(`^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|1[3-9]\d{9})$`),
		
		// WeChat: 6-20 alphanumeric characters starting with letter
		wechatRegex: regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]{5,19}$`),
		
		validAccountTypes:  []string{"alipay", "wechat", "bank", "other"},
		validAccountStatus: []string{"active", "inactive", "suspended", "closed"},
		validPaymentTypes:  []string{"private", "business"},
		
		accountRepo: accountRepo,
	}
}

// AccountValidationRequest represents an account validation request
type AccountValidationRequest struct {
	ID                    *uuid.UUID      `json:"id,omitempty"`
	AccountName           string          `json:"account_name"`
	AccountNumber         string          `json:"account_number"`
	AccountType           string          `json:"account_type"`
	CustomPaymentProvider *string         `json:"custom_payment_provider,omitempty"`
	BankName              *string         `json:"bank_name,omitempty"`
	BankBranch            *string         `json:"bank_branch,omitempty"`
	AccountHolder         string          `json:"account_holder"`
	PaymentType           string          `json:"payment_type"`
	Status                string          `json:"status"`
	DailyLimit            decimal.Decimal `json:"daily_limit"`
	SingleLimit           decimal.Decimal `json:"single_limit"`
}

// AccountValidationResult holds account validation results
type AccountValidationResult struct {
	Valid  bool                         `json:"valid"`
	Errors []validation.ValidationError `json:"errors,omitempty"`
}

// ValidateAccount validates a complete account request
func (v *AccountValidator) ValidateAccount(ctx context.Context, req *AccountValidationRequest) AccountValidationResult {
	var errors []validation.ValidationError

	// Validate account name
	if err := v.validateAccountName(req.AccountName); err != nil {
		errors = append(errors, *err)
	}

	// Validate account number with type-specific rules
	if err := v.validateAccountNumber(req.AccountNumber, req.AccountType); err != nil {
		errors = append(errors, *err)
	}

	// Validate account type
	if err := v.validateAccountType(req.AccountType); err != nil {
		errors = append(errors, *err)
	}

	// Validate custom payment provider if provided
	if req.CustomPaymentProvider != nil && *req.CustomPaymentProvider != "" {
		if err := v.validateCustomPaymentProvider(*req.CustomPaymentProvider); err != nil {
			errors = append(errors, *err)
		}
	}

	// Validate bank information for bank accounts
	if req.AccountType == "bank" {
		if err := v.validateBankInfo(req.BankName, req.BankBranch); err != nil {
			errors = append(errors, *err)
		}
	}

	// Validate account holder
	if err := v.validateAccountHolder(req.AccountHolder); err != nil {
		errors = append(errors, *err)
	}

	// Validate payment type
	if err := v.validatePaymentType(req.PaymentType); err != nil {
		errors = append(errors, *err)
	}

	// Validate status
	if err := v.validateStatus(req.Status); err != nil {
		errors = append(errors, *err)
	}

	// Validate limits
	if err := v.validateLimits(req.DailyLimit, req.SingleLimit); err != nil {
		errors = append(errors, *err)
	}

	// Check for duplicate account number (only for new accounts or when number changes)
	if err := v.validateAccountNumberUniqueness(ctx, req.ID, req.AccountNumber); err != nil {
		errors = append(errors, *err)
	}

	return AccountValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateAccountForUpdate validates account data for update operations
func (v *AccountValidator) ValidateAccountForUpdate(ctx context.Context, id uuid.UUID, req *AccountValidationRequest) AccountValidationResult {
	req.ID = &id
	return v.ValidateAccount(ctx, req)
}

// Individual validation methods

func (v *AccountValidator) validateAccountName(name string) *validation.ValidationError {
	name = strings.TrimSpace(name)
	if name == "" {
		return &validation.ValidationError{
			Field:   "account_name",
			Message: "账户名称不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(name) < 2 || len(name) > 100 {
		return &validation.ValidationError{
			Field:   "account_name",
			Message: "账户名称长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	// Check for valid characters (Chinese, English, numbers, spaces, common punctuation)
	validNameRegex := regexp.MustCompile(`^[\u4e00-\u9fa5a-zA-Z0-9\s\-_()（）]+$`)
	if !validNameRegex.MatchString(name) {
		return &validation.ValidationError{
			Field:   "account_name",
			Message: "账户名称包含无效字符",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *AccountValidator) validateAccountNumber(number, accountType string) *validation.ValidationError {
	number = strings.TrimSpace(number)
	if number == "" {
		return &validation.ValidationError{
			Field:   "account_number",
			Message: "账户号码不能为空",
			Code:    "REQUIRED",
		}
	}

	switch accountType {
	case "bank":
		if !v.bankCardRegex.MatchString(number) {
			return &validation.ValidationError{
				Field:   "account_number",
				Message: "银行卡号格式无效，应为10-30位数字",
				Code:    "FORMAT_INVALID",
			}
		}
		
		// Additional bank card validation (Luhn algorithm)
		if !v.validateBankCardLuhn(number) {
			return &validation.ValidationError{
				Field:   "account_number",
				Message: "银行卡号校验失败，请检查卡号是否正确",
				Code:    "CHECKSUM_INVALID",
			}
		}

	case "alipay":
		if !v.alipayRegex.MatchString(number) {
			return &validation.ValidationError{
				Field:   "account_number",
				Message: "支付宝账号格式无效，应为邮箱地址或手机号码",
				Code:    "FORMAT_INVALID",
			}
		}

	case "wechat":
		if !v.wechatRegex.MatchString(number) {
			return &validation.ValidationError{
				Field:   "account_number",
				Message: "微信账号格式无效，应为6-20位字母数字组合，以字母开头",
				Code:    "FORMAT_INVALID",
			}
		}

	case "other":
		// For other types, use general validation
		if len(number) < 6 || len(number) > 50 {
			return &validation.ValidationError{
				Field:   "account_number",
				Message: "账户号码长度必须在6-50个字符之间",
				Code:    "LENGTH_INVALID",
			}
		}

	default:
		return &validation.ValidationError{
			Field:   "account_type",
			Message: "未知的账户类型",
			Code:    "INVALID_VALUE",
		}
	}

	return nil
}

func (v *AccountValidator) validateAccountType(accountType string) *validation.ValidationError {
	if accountType == "" {
		return &validation.ValidationError{
			Field:   "account_type",
			Message: "账户类型不能为空",
			Code:    "REQUIRED",
		}
	}

	for _, valid := range v.validAccountTypes {
		if accountType == valid {
			return nil
		}
	}

	return &validation.ValidationError{
		Field:   "account_type",
		Message: fmt.Sprintf("无效的账户类型，允许的类型: %s", strings.Join(v.validAccountTypes, ", ")),
		Code:    "INVALID_VALUE",
	}
}

func (v *AccountValidator) validateCustomPaymentProvider(provider string) *validation.ValidationError {
	provider = strings.TrimSpace(provider)
	if len(provider) < 2 || len(provider) > 50 {
		return &validation.ValidationError{
			Field:   "custom_payment_provider",
			Message: "自定义支付提供商名称长度必须在2-50个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	// Check for valid characters
	validProviderRegex := regexp.MustCompile(`^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]+$`)
	if !validProviderRegex.MatchString(provider) {
		return &validation.ValidationError{
			Field:   "custom_payment_provider",
			Message: "自定义支付提供商名称包含无效字符",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *AccountValidator) validateBankInfo(bankName, bankBranch *string) *validation.ValidationError {
	if bankName == nil || strings.TrimSpace(*bankName) == "" {
		return &validation.ValidationError{
			Field:   "bank_name",
			Message: "银行账户必须提供银行名称",
			Code:    "REQUIRED",
		}
	}

	name := strings.TrimSpace(*bankName)
	if len(name) < 2 || len(name) > 100 {
		return &validation.ValidationError{
			Field:   "bank_name",
			Message: "银行名称长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	if bankBranch != nil && *bankBranch != "" {
		branch := strings.TrimSpace(*bankBranch)
		if len(branch) > 200 {
			return &validation.ValidationError{
				Field:   "bank_branch",
				Message: "银行支行信息不能超过200个字符",
				Code:    "LENGTH_INVALID",
			}
		}
	}

	return nil
}

func (v *AccountValidator) validateAccountHolder(holder string) *validation.ValidationError {
	holder = strings.TrimSpace(holder)
	if holder == "" {
		return &validation.ValidationError{
			Field:   "account_holder",
			Message: "账户持有人不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(holder) < 2 || len(holder) > 100 {
		return &validation.ValidationError{
			Field:   "account_holder",
			Message: "账户持有人姓名长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	// Check for valid characters (Chinese, English, spaces)
	validHolderRegex := regexp.MustCompile(`^[\u4e00-\u9fa5a-zA-Z\s]+$`)
	if !validHolderRegex.MatchString(holder) {
		return &validation.ValidationError{
			Field:   "account_holder",
			Message: "账户持有人姓名只能包含中文、英文和空格",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *AccountValidator) validatePaymentType(paymentType string) *validation.ValidationError {
	if paymentType == "" {
		return &validation.ValidationError{
			Field:   "payment_type",
			Message: "支付类型不能为空",
			Code:    "REQUIRED",
		}
	}

	for _, valid := range v.validPaymentTypes {
		if paymentType == valid {
			return nil
		}
	}

	return &validation.ValidationError{
		Field:   "payment_type",
		Message: fmt.Sprintf("无效的支付类型，允许的类型: %s", strings.Join(v.validPaymentTypes, ", ")),
		Code:    "INVALID_VALUE",
	}
}

func (v *AccountValidator) validateStatus(status string) *validation.ValidationError {
	if status == "" {
		return &validation.ValidationError{
			Field:   "status",
			Message: "账户状态不能为空",
			Code:    "REQUIRED",
		}
	}

	for _, valid := range v.validAccountStatus {
		if status == valid {
			return nil
		}
	}

	return &validation.ValidationError{
		Field:   "status",
		Message: fmt.Sprintf("无效的账户状态，允许的状态: %s", strings.Join(v.validAccountStatus, ", ")),
		Code:    "INVALID_VALUE",
	}
}

func (v *AccountValidator) validateLimits(dailyLimit, singleLimit decimal.Decimal) *validation.ValidationError {
	if dailyLimit.IsNegative() {
		return &validation.ValidationError{
			Field:   "daily_limit",
			Message: "日限额不能为负数",
			Code:    "INVALID_VALUE",
		}
	}

	if singleLimit.IsNegative() {
		return &validation.ValidationError{
			Field:   "single_limit",
			Message: "单笔限额不能为负数",
			Code:    "INVALID_VALUE",
		}
	}

	if !dailyLimit.IsZero() && !singleLimit.IsZero() && singleLimit.GreaterThan(dailyLimit) {
		return &validation.ValidationError{
			Field:   "single_limit",
			Message: "单笔限额不能大于日限额",
			Code:    "LIMIT_CONFLICT",
		}
	}

	// Check decimal places (max 2)
	if dailyLimit.Exponent() < -2 {
		return &validation.ValidationError{
			Field:   "daily_limit",
			Message: "日限额最多支持2位小数",
			Code:    "DECIMAL_PLACES_INVALID",
		}
	}

	if singleLimit.Exponent() < -2 {
		return &validation.ValidationError{
			Field:   "single_limit",
			Message: "单笔限额最多支持2位小数",
			Code:    "DECIMAL_PLACES_INVALID",
		}
	}

	return nil
}

func (v *AccountValidator) validateAccountNumberUniqueness(ctx context.Context, id *uuid.UUID, accountNumber string) *validation.ValidationError {
	exists, err := v.accountRepo.ExistsByAccountNumber(ctx, accountNumber)
	if err != nil {
		return &validation.ValidationError{
			Field:   "account_number",
			Message: "无法验证账户号码唯一性",
			Code:    "VALIDATION_ERROR",
		}
	}

	if exists {
		// If this is an update operation, check if the existing account is the same one
		if id != nil {
			existingAccount, err := v.accountRepo.GetByAccountNumber(ctx, accountNumber)
			if err == nil && existingAccount != nil && existingAccount.ID == *id {
				// Same account, allow the update
				return nil
			}
		}

		return &validation.ValidationError{
			Field:   "account_number",
			Message: "账户号码已存在，请使用不同的账户号码",
			Code:    "DUPLICATE_VALUE",
		}
	}

	return nil
}

// validateBankCardLuhn validates bank card number using Luhn algorithm
func (v *AccountValidator) validateBankCardLuhn(cardNumber string) bool {
	// Remove any spaces or dashes
	cardNumber = strings.ReplaceAll(cardNumber, " ", "")
	cardNumber = strings.ReplaceAll(cardNumber, "-", "")

	// Convert to slice of integers
	var digits []int
	for _, r := range cardNumber {
		if r < '0' || r > '9' {
			return false
		}
		digits = append(digits, int(r-'0'))
	}

	// Apply Luhn algorithm
	sum := 0
	alternate := false

	// Process digits from right to left
	for i := len(digits) - 1; i >= 0; i-- {
		digit := digits[i]

		if alternate {
			digit *= 2
			if digit > 9 {
				digit = digit%10 + digit/10
			}
		}

		sum += digit
		alternate = !alternate
	}

	return sum%10 == 0
}

// GetValidAccountTypes returns the list of valid account types
func (v *AccountValidator) GetValidAccountTypes() []string {
	return v.validAccountTypes
}

// GetValidAccountStatus returns the list of valid account statuses
func (v *AccountValidator) GetValidAccountStatus() []string {
	return v.validAccountStatus
}

// GetValidPaymentTypes returns the list of valid payment types
func (v *AccountValidator) GetValidPaymentTypes() []string {
	return v.validPaymentTypes
}

// SanitizeAccountData sanitizes account input data
func (v *AccountValidator) SanitizeAccountData(req *AccountValidationRequest) {
	req.AccountName = v.businessValidator.SanitizeInput(req.AccountName)
	req.AccountNumber = v.businessValidator.SanitizeInput(req.AccountNumber)
	req.AccountType = strings.ToLower(strings.TrimSpace(req.AccountType))
	req.AccountHolder = v.businessValidator.SanitizeInput(req.AccountHolder)
	req.PaymentType = strings.ToLower(strings.TrimSpace(req.PaymentType))
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))

	if req.CustomPaymentProvider != nil {
		sanitized := v.businessValidator.SanitizeInput(*req.CustomPaymentProvider)
		req.CustomPaymentProvider = &sanitized
	}

	if req.BankName != nil {
		sanitized := v.businessValidator.SanitizeInput(*req.BankName)
		req.BankName = &sanitized
	}

	if req.BankBranch != nil {
		sanitized := v.businessValidator.SanitizeInput(*req.BankBranch)
		req.BankBranch = &sanitized
	}
}