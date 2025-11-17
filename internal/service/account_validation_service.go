package service

import (
	"context"
	"fmt"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/validation"
)

// AccountValidationService provides comprehensive account validation
type AccountValidationService struct {
	accountValidator  *AccountValidator
	businessValidator *validation.BusinessValidator
	structValidator   *validator.Validate
	accountRepo       repository.ReceiveAccountRepository
}

// NewAccountValidationService creates a new account validation service
func NewAccountValidationService(accountRepo repository.ReceiveAccountRepository) *AccountValidationService {
	service := &AccountValidationService{
		accountValidator:  NewAccountValidator(accountRepo),
		businessValidator: validation.NewBusinessValidator(),
		structValidator:   validator.New(),
		accountRepo:       accountRepo,
	}

	// Register custom validators
	service.registerCustomValidators()

	return service
}

// registerCustomValidators registers custom validation rules
func (s *AccountValidationService) registerCustomValidators() {
	// Register account number format validator
	s.structValidator.RegisterValidation("account_number_format", s.validateAccountNumberFormat)
	
	// Register bank card validator
	s.structValidator.RegisterValidation("bank_card", s.validateBankCard)
	
	// Register alipay account validator
	s.structValidator.RegisterValidation("alipay_account", s.validateAlipayAccount)
	
	// Register wechat account validator
	s.structValidator.RegisterValidation("wechat_account", s.validateWechatAccount)
	
	// Register limit consistency validator
	s.structValidator.RegisterValidation("limit_consistency", s.validateLimitConsistency)
}

// ValidateAccount performs comprehensive validation on a receive account
func (s *AccountValidationService) ValidateAccount(ctx context.Context, account *repository.ReceiveAccount) *AccountValidationResult {
	var errors []validation.ValidationError

	// 1. Struct validation using tags
	if err := s.structValidator.Struct(account); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, fieldError := range validationErrors {
				errors = append(errors, validation.ValidationError{
					Field:   fieldError.Field(),
					Message: s.getValidationMessage(fieldError),
					Code:    fieldError.Tag(),
				})
			}
		}
	}

	// 2. Business logic validation using AccountValidator
	req := &AccountValidationRequest{
		AccountName:           account.AccountName,
		AccountNumber:         account.AccountNumber,
		AccountType:           account.AccountType,
		CustomPaymentProvider: account.CustomPaymentProvider,
		BankName:              account.BankName,
		BankBranch:            account.BankBranch,
		AccountHolder:         account.AccountHolder,
		PaymentType:           account.PaymentType,
		Status:                account.Status,
		DailyLimit:            account.DailyLimit,
		SingleLimit:           account.SingleLimit,
	}

	businessResult := s.accountValidator.ValidateAccount(ctx, req)
	errors = append(errors, businessResult.Errors...)

	// 3. Additional business rules validation
	if additionalErrors := s.validateBusinessRules(ctx, account); len(additionalErrors) > 0 {
		errors = append(errors, additionalErrors...)
	}

	return &AccountValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateAccountForUpdate validates account for update operations
func (s *AccountValidationService) ValidateAccountForUpdate(ctx context.Context, id uuid.UUID, account *repository.ReceiveAccount) *AccountValidationResult {
	account.ID = id
	
	var errors []validation.ValidationError

	// 1. Struct validation
	if err := s.structValidator.Struct(account); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			for _, fieldError := range validationErrors {
				errors = append(errors, validation.ValidationError{
					Field:   fieldError.Field(),
					Message: s.getValidationMessage(fieldError),
					Code:    fieldError.Tag(),
				})
			}
		}
	}

	// 2. Business logic validation for updates
	req := &AccountValidationRequest{
		ID:                    &id,
		AccountName:           account.AccountName,
		AccountNumber:         account.AccountNumber,
		AccountType:           account.AccountType,
		CustomPaymentProvider: account.CustomPaymentProvider,
		BankName:              account.BankName,
		BankBranch:            account.BankBranch,
		AccountHolder:         account.AccountHolder,
		PaymentType:           account.PaymentType,
		Status:                account.Status,
		DailyLimit:            account.DailyLimit,
		SingleLimit:           account.SingleLimit,
	}

	businessResult := s.accountValidator.ValidateAccountForUpdate(ctx, id, req)
	errors = append(errors, businessResult.Errors...)

	// 3. Update-specific business rules
	if updateErrors := s.validateUpdateRules(ctx, id, account); len(updateErrors) > 0 {
		errors = append(errors, updateErrors...)
	}

	return &AccountValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateAccountCreation validates account for creation with additional checks
func (s *AccountValidationService) ValidateAccountCreation(ctx context.Context, account *repository.ReceiveAccount) *AccountValidationResult {
	// Set default values for creation
	if account.Status == "" {
		account.Status = "active"
	}
	if account.DailyUsed.IsZero() {
		account.DailyUsed = decimal.Zero
	}

	result := s.ValidateAccount(ctx, account)

	// Additional creation-specific validations
	if creationErrors := s.validateCreationRules(ctx, account); len(creationErrors) > 0 {
		result.Errors = append(result.Errors, creationErrors...)
		result.Valid = false
	}

	return result
}

// validateBusinessRules validates additional business rules
func (s *AccountValidationService) validateBusinessRules(ctx context.Context, account *repository.ReceiveAccount) []validation.ValidationError {
	var errors []validation.ValidationError

	// Validate account type specific requirements
	switch account.AccountType {
	case "bank":
		if account.BankName == nil || *account.BankName == "" {
			errors = append(errors, validation.ValidationError{
				Field:   "bank_name",
				Message: "银行账户必须提供银行名称",
				Code:    "REQUIRED_FOR_BANK",
			})
		}
	case "other":
		if account.CustomPaymentProvider == nil || *account.CustomPaymentProvider == "" {
			errors = append(errors, validation.ValidationError{
				Field:   "custom_payment_provider",
				Message: "其他类型账户必须提供自定义支付提供商",
				Code:    "REQUIRED_FOR_OTHER",
			})
		}
	}

	// Validate limit consistency
	if !account.DailyLimit.IsZero() && !account.SingleLimit.IsZero() {
		if account.SingleLimit.GreaterThan(account.DailyLimit) {
			errors = append(errors, validation.ValidationError{
				Field:   "single_limit",
				Message: "单笔限额不能大于日限额",
				Code:    "LIMIT_INCONSISTENT",
			})
		}
	}

	// Validate daily used amount
	if account.DailyUsed.GreaterThan(account.DailyLimit) {
		errors = append(errors, validation.ValidationError{
			Field:   "daily_used",
			Message: "日已用金额不能大于日限额",
			Code:    "DAILY_USED_EXCEEDED",
		})
	}

	return errors
}

// validateUpdateRules validates update-specific rules
func (s *AccountValidationService) validateUpdateRules(ctx context.Context, id uuid.UUID, account *repository.ReceiveAccount) []validation.ValidationError {
	var errors []validation.ValidationError

	// Get existing account for comparison
	existing, err := s.accountRepo.GetByID(ctx, id)
	if err != nil {
		errors = append(errors, validation.ValidationError{
			Field:   "id",
			Message: "无法获取现有账户信息",
			Code:    "ACCOUNT_NOT_FOUND",
		})
		return errors
	}

	// Validate status transitions
	if !s.isValidStatusTransition(existing.Status, account.Status) {
		errors = append(errors, validation.ValidationError{
			Field:   "status",
			Message: fmt.Sprintf("无效的状态转换：从 %s 到 %s", existing.Status, account.Status),
			Code:    "INVALID_STATUS_TRANSITION",
		})
	}

	// Validate that daily used amount is not reduced below zero when limits are changed
	if account.DailyLimit.LessThan(existing.DailyUsed) {
		errors = append(errors, validation.ValidationError{
			Field:   "daily_limit",
			Message: "日限额不能小于当前已用金额",
			Code:    "LIMIT_BELOW_USED",
		})
	}

	return errors
}

// validateCreationRules validates creation-specific rules
func (s *AccountValidationService) validateCreationRules(ctx context.Context, account *repository.ReceiveAccount) []validation.ValidationError {
	var errors []validation.ValidationError

	// Ensure account doesn't already exist
	exists, err := s.accountRepo.ExistsByAccountNumber(ctx, account.AccountNumber)
	if err != nil {
		errors = append(errors, validation.ValidationError{
			Field:   "account_number",
			Message: "无法验证账户号码唯一性",
			Code:    "VALIDATION_ERROR",
		})
	} else if exists {
		errors = append(errors, validation.ValidationError{
			Field:   "account_number",
			Message: "账户号码已存在",
			Code:    "DUPLICATE_ACCOUNT_NUMBER",
		})
	}

	// Validate initial status
	if account.Status != "active" && account.Status != "inactive" {
		errors = append(errors, validation.ValidationError{
			Field:   "status",
			Message: "新账户状态只能是 active 或 inactive",
			Code:    "INVALID_INITIAL_STATUS",
		})
	}

	return errors
}

// isValidStatusTransition checks if status transition is valid
func (s *AccountValidationService) isValidStatusTransition(from, to string) bool {
	validTransitions := map[string][]string{
		"active":    {"inactive", "suspended", "closed"},
		"inactive":  {"active", "closed"},
		"suspended": {"active", "inactive", "closed"},
		"closed":    {}, // No transitions from closed
	}

	allowedTransitions, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, allowed := range allowedTransitions {
		if to == allowed {
			return true
		}
	}

	return false
}

// Custom validator functions

func (s *AccountValidationService) validateAccountNumberFormat(fl validator.FieldLevel) bool {
	accountNumber := fl.Field().String()
	accountType := fl.Parent().FieldByName("AccountType").String()
	
	err := s.accountValidator.validateAccountNumber(accountNumber, accountType)
	return err == nil
}

func (s *AccountValidationService) validateBankCard(fl validator.FieldLevel) bool {
	cardNumber := fl.Field().String()
	return s.accountValidator.validateBankCardLuhn(cardNumber)
}

func (s *AccountValidationService) validateAlipayAccount(fl validator.FieldLevel) bool {
	account := fl.Field().String()
	err := s.accountValidator.validateAccountNumber(account, "alipay")
	return err == nil
}

func (s *AccountValidationService) validateWechatAccount(fl validator.FieldLevel) bool {
	account := fl.Field().String()
	err := s.accountValidator.validateAccountNumber(account, "wechat")
	return err == nil
}

func (s *AccountValidationService) validateLimitConsistency(fl validator.FieldLevel) bool {
	singleLimit := fl.Field().Interface().(decimal.Decimal)
	dailyLimit := fl.Parent().FieldByName("DailyLimit").Interface().(decimal.Decimal)
	
	if singleLimit.IsZero() || dailyLimit.IsZero() {
		return true // Skip validation if either is zero
	}
	
	return singleLimit.LessThanOrEqual(dailyLimit)
}

// getValidationMessage returns user-friendly validation messages
func (s *AccountValidationService) getValidationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s 是必填字段", s.getFieldName(fe.Field()))
	case "min":
		return fmt.Sprintf("%s 长度不能少于 %s 个字符", s.getFieldName(fe.Field()), fe.Param())
	case "max":
		return fmt.Sprintf("%s 长度不能超过 %s 个字符", s.getFieldName(fe.Field()), fe.Param())
	case "oneof":
		return fmt.Sprintf("%s 必须是以下值之一: %s", s.getFieldName(fe.Field()), fe.Param())
	case "gte":
		return fmt.Sprintf("%s 不能小于 %s", s.getFieldName(fe.Field()), fe.Param())
	case "account_number_format":
		return fmt.Sprintf("%s 格式不正确", s.getFieldName(fe.Field()))
	case "bank_card":
		return "银行卡号格式不正确或校验失败"
	case "alipay_account":
		return "支付宝账号格式不正确"
	case "wechat_account":
		return "微信账号格式不正确"
	case "limit_consistency":
		return "单笔限额不能大于日限额"
	default:
		return fmt.Sprintf("%s 验证失败", s.getFieldName(fe.Field()))
	}
}

// getFieldName returns Chinese field names
func (s *AccountValidationService) getFieldName(field string) string {
	fieldNames := map[string]string{
		"AccountName":           "账户名称",
		"AccountNumber":         "账户号码",
		"AccountType":           "账户类型",
		"CustomPaymentProvider": "自定义支付提供商",
		"BankName":              "银行名称",
		"BankBranch":            "银行支行",
		"AccountHolder":         "账户持有人",
		"PaymentType":           "支付类型",
		"Status":                "账户状态",
		"DailyLimit":            "日限额",
		"SingleLimit":           "单笔限额",
		"DailyUsed":             "日已用金额",
	}

	if name, exists := fieldNames[field]; exists {
		return name
	}
	return field
}

// SanitizeAccount sanitizes account data before validation
func (s *AccountValidationService) SanitizeAccount(account *repository.ReceiveAccount) {
	req := &AccountValidationRequest{
		AccountName:           account.AccountName,
		AccountNumber:         account.AccountNumber,
		AccountType:           account.AccountType,
		CustomPaymentProvider: account.CustomPaymentProvider,
		BankName:              account.BankName,
		BankBranch:            account.BankBranch,
		AccountHolder:         account.AccountHolder,
		PaymentType:           account.PaymentType,
		Status:                account.Status,
	}

	s.accountValidator.SanitizeAccountData(req)

	// Update the account with sanitized data
	account.AccountName = req.AccountName
	account.AccountNumber = req.AccountNumber
	account.AccountType = req.AccountType
	account.CustomPaymentProvider = req.CustomPaymentProvider
	account.BankName = req.BankName
	account.BankBranch = req.BankBranch
	account.AccountHolder = req.AccountHolder
	account.PaymentType = req.PaymentType
	account.Status = req.Status
}

// GetValidationRules returns validation rules for frontend
func (s *AccountValidationService) GetValidationRules() map[string]interface{} {
	return map[string]interface{}{
		"account_name": map[string]interface{}{
			"required": true,
			"min":      2,
			"max":      100,
		},
		"account_number": map[string]interface{}{
			"required": true,
			"min":      6,
			"max":      50,
		},
		"account_type": map[string]interface{}{
			"required": true,
			"options":  s.accountValidator.GetValidAccountTypes(),
		},
		"account_holder": map[string]interface{}{
			"required": true,
			"min":      2,
			"max":      100,
		},
		"payment_type": map[string]interface{}{
			"required": true,
			"options":  s.accountValidator.GetValidPaymentTypes(),
		},
		"status": map[string]interface{}{
			"required": true,
			"options":  s.accountValidator.GetValidAccountStatus(),
		},
		"daily_limit": map[string]interface{}{
			"min": 0,
		},
		"single_limit": map[string]interface{}{
			"min": 0,
		},
		"custom_payment_provider": map[string]interface{}{
			"min": 2,
			"max": 50,
		},
		"bank_name": map[string]interface{}{
			"min": 2,
			"max": 100,
		},
		"bank_branch": map[string]interface{}{
			"min": 2,
			"max": 200,
		},
	}
}