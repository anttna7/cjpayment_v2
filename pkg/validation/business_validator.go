package validation

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// BusinessValidator provides business-specific validation rules
type BusinessValidator struct {
	// Validation patterns
	merchantNameRegex    *regexp.Regexp
	accountNumberRegex   *regexp.Regexp
	orderNumberRegex     *regexp.Regexp
	phoneRegex          *regexp.Regexp
	bankAccountRegex    *regexp.Regexp
	alipayAccountRegex  *regexp.Regexp
	wechatAccountRegex  *regexp.Regexp
	
	// Business constraints
	minRechargeAmount   decimal.Decimal
	maxRechargeAmount   decimal.Decimal
	maxDailyTransactions int
	allowedPaymentTypes []string
	allowedAccountTypes []string
}

// NewBusinessValidator creates a new business validator
func NewBusinessValidator() *BusinessValidator {
	return &BusinessValidator{
		merchantNameRegex:    regexp.MustCompile(`^[\u4e00-\u9fa5a-zA-Z0-9\s\-_]{2,50}$`),
		accountNumberRegex:   regexp.MustCompile(`^[a-zA-Z0-9\-_]{6,50}$`),
		orderNumberRegex:     regexp.MustCompile(`^[A-Z0-9]{10,32}$`),
		phoneRegex:          regexp.MustCompile(`^1[3-9]\d{9}$`),
		bankAccountRegex:    regexp.MustCompile(`^\d{10,30}$`),
		alipayAccountRegex:  regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^1[3-9]\d{9}$`),
		wechatAccountRegex:  regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_-]{5,19}$`),
		
		minRechargeAmount:   decimal.NewFromFloat(0.01),
		maxRechargeAmount:   decimal.NewFromFloat(1000000.00),
		maxDailyTransactions: 1000,
		allowedPaymentTypes: []string{"public", "private"},
		allowedAccountTypes: []string{"alipay", "wechat", "bank", "other"},
	}
}

// ValidationError represents a validation error with field and message
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

// ValidationResult holds validation results
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors,omitempty"`
}

// RechargeOrderValidationRequest represents a recharge order validation request
type RechargeOrderValidationRequest struct {
	PayerName       string          `json:"payer_name"`
	PayerAccount    string          `json:"payer_account"`
	PaymentType     string          `json:"payment_type"`
	Amount          decimal.Decimal `json:"amount"`
	MerchantName    string          `json:"merchant_name"`
	AdAccount       string          `json:"ad_account"`
	Remark          string          `json:"remark"`
}

// MerchantValidationRequest represents a merchant validation request
type MerchantValidationRequest struct {
	Name         string          `json:"name"`
	Code         string          `json:"code"`
	ContactPerson string         `json:"contact_person"`
	ContactPhone  string         `json:"contact_phone"`
	ContactEmail  string         `json:"contact_email"`
	DailyLimit   decimal.Decimal `json:"daily_limit"`
	SingleLimit  decimal.Decimal `json:"single_limit"`
}

// ReceiveAccountValidationRequest represents a receive account validation request
type ReceiveAccountValidationRequest struct {
	AccountName   string          `json:"account_name"`
	AccountNumber string          `json:"account_number"`
	AccountType   string          `json:"account_type"`
	BankName      string          `json:"bank_name"`
	BankBranch    string          `json:"bank_branch"`
	AccountHolder string          `json:"account_holder"`
	PaymentType   string          `json:"payment_type"`
	DailyLimit    decimal.Decimal `json:"daily_limit"`
	SingleLimit   decimal.Decimal `json:"single_limit"`
}

// ValidateRechargeOrder validates a recharge order request
func (v *BusinessValidator) ValidateRechargeOrder(ctx context.Context, req *RechargeOrderValidationRequest) ValidationResult {
	var errors []ValidationError

	// Validate payer name
	if err := v.validatePayerName(req.PayerName); err != nil {
		errors = append(errors, *err)
	}

	// Validate payer account
	if err := v.validatePayerAccount(req.PayerAccount, req.PaymentType); err != nil {
		errors = append(errors, *err)
	}

	// Validate payment type
	if err := v.validatePaymentType(req.PaymentType); err != nil {
		errors = append(errors, *err)
	}

	// Validate amount
	if err := v.validateAmount(req.Amount); err != nil {
		errors = append(errors, *err)
	}

	// Validate merchant name
	if err := v.validateMerchantName(req.MerchantName); err != nil {
		errors = append(errors, *err)
	}

	// Validate ad account
	if err := v.validateAdAccount(req.AdAccount); err != nil {
		errors = append(errors, *err)
	}

	// Validate remark
	if err := v.validateRemark(req.Remark); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateMerchant validates a merchant request
func (v *BusinessValidator) ValidateMerchant(ctx context.Context, req *MerchantValidationRequest) ValidationResult {
	var errors []ValidationError

	// Validate name
	if err := v.validateMerchantName(req.Name); err != nil {
		errors = append(errors, *err)
	}

	// Validate code
	if err := v.validateMerchantCode(req.Code); err != nil {
		errors = append(errors, *err)
	}

	// Validate contact person
	if err := v.validateContactPerson(req.ContactPerson); err != nil {
		errors = append(errors, *err)
	}

	// Validate contact phone
	if err := v.validateContactPhone(req.ContactPhone); err != nil {
		errors = append(errors, *err)
	}

	// Validate contact email
	if err := v.validateContactEmail(req.ContactEmail); err != nil {
		errors = append(errors, *err)
	}

	// Validate limits
	if err := v.validateLimits(req.DailyLimit, req.SingleLimit); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateReceiveAccount validates a receive account request
func (v *BusinessValidator) ValidateReceiveAccount(ctx context.Context, req *ReceiveAccountValidationRequest) ValidationResult {
	var errors []ValidationError

	// Validate account name
	if err := v.validateAccountName(req.AccountName); err != nil {
		errors = append(errors, *err)
	}

	// Validate account number based on type
	if err := v.validateAccountNumber(req.AccountNumber, req.AccountType); err != nil {
		errors = append(errors, *err)
	}

	// Validate account type
	if err := v.validateAccountType(req.AccountType); err != nil {
		errors = append(errors, *err)
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

	// Validate limits
	if err := v.validateLimits(req.DailyLimit, req.SingleLimit); err != nil {
		errors = append(errors, *err)
	}

	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// Individual validation methods

func (v *BusinessValidator) validatePayerName(name string) *ValidationError {
	if strings.TrimSpace(name) == "" {
		return &ValidationError{
			Field:   "payer_name",
			Message: "付款人姓名不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(name) < 2 || len(name) > 50 {
		return &ValidationError{
			Field:   "payer_name",
			Message: "付款人姓名长度必须在2-50个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	// Check for valid characters (Chinese, English, numbers, spaces, hyphens, underscores)
	if !v.merchantNameRegex.MatchString(name) {
		return &ValidationError{
			Field:   "payer_name",
			Message: "付款人姓名包含无效字符",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validatePayerAccount(account, paymentType string) *ValidationError {
	if strings.TrimSpace(account) == "" {
		return &ValidationError{
			Field:   "payer_account",
			Message: "付款账号不能为空",
			Code:    "REQUIRED",
		}
	}

	switch paymentType {
	case "public":
		// For public payments, validate as bank account
		if !v.bankAccountRegex.MatchString(account) {
			return &ValidationError{
				Field:   "payer_account",
				Message: "对公付款账号格式无效，应为10-30位数字",
				Code:    "FORMAT_INVALID",
			}
		}
	case "private":
		// For private payments, allow various formats
		if len(account) < 6 || len(account) > 50 {
			return &ValidationError{
				Field:   "payer_account",
				Message: "对私付款账号长度必须在6-50个字符之间",
				Code:    "LENGTH_INVALID",
			}
		}
	}

	return nil
}

func (v *BusinessValidator) validatePaymentType(paymentType string) *ValidationError {
	if paymentType == "" {
		return &ValidationError{
			Field:   "payment_type",
			Message: "付款类型不能为空",
			Code:    "REQUIRED",
		}
	}

	for _, allowed := range v.allowedPaymentTypes {
		if paymentType == allowed {
			return nil
		}
	}

	return &ValidationError{
		Field:   "payment_type",
		Message: fmt.Sprintf("无效的付款类型，允许的类型: %s", strings.Join(v.allowedPaymentTypes, ", ")),
		Code:    "INVALID_VALUE",
	}
}

func (v *BusinessValidator) validateAmount(amount decimal.Decimal) *ValidationError {
	if amount.IsZero() {
		return &ValidationError{
			Field:   "amount",
			Message: "充值金额不能为空",
			Code:    "REQUIRED",
		}
	}

	if amount.LessThan(v.minRechargeAmount) {
		return &ValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("充值金额不能小于 %s 元", v.minRechargeAmount.String()),
			Code:    "AMOUNT_TOO_SMALL",
		}
	}

	if amount.GreaterThan(v.maxRechargeAmount) {
		return &ValidationError{
			Field:   "amount",
			Message: fmt.Sprintf("充值金额不能大于 %s 元", v.maxRechargeAmount.String()),
			Code:    "AMOUNT_TOO_LARGE",
		}
	}

	// Check decimal places (max 2)
	if amount.Exponent() < -2 {
		return &ValidationError{
			Field:   "amount",
			Message: "充值金额最多支持2位小数",
			Code:    "DECIMAL_PLACES_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateMerchantName(name string) *ValidationError {
	if strings.TrimSpace(name) == "" {
		return &ValidationError{
			Field:   "merchant_name",
			Message: "商户名称不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(name) < 2 || len(name) > 50 {
		return &ValidationError{
			Field:   "merchant_name",
			Message: "商户名称长度必须在2-50个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	if !v.merchantNameRegex.MatchString(name) {
		return &ValidationError{
			Field:   "merchant_name",
			Message: "商户名称包含无效字符",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateAdAccount(account string) *ValidationError {
	if strings.TrimSpace(account) == "" {
		return &ValidationError{
			Field:   "ad_account",
			Message: "广告账户不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(account) < 3 || len(account) > 100 {
		return &ValidationError{
			Field:   "ad_account",
			Message: "广告账户长度必须在3-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateRemark(remark string) *ValidationError {
	if len(remark) > 500 {
		return &ValidationError{
			Field:   "remark",
			Message: "备注信息不能超过500个字符",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateMerchantCode(code string) *ValidationError {
	if strings.TrimSpace(code) == "" {
		return &ValidationError{
			Field:   "code",
			Message: "商户编码不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(code) < 3 || len(code) > 20 {
		return &ValidationError{
			Field:   "code",
			Message: "商户编码长度必须在3-20个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	// Merchant code should only contain alphanumeric characters and underscores
	codeRegex := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	if !codeRegex.MatchString(code) {
		return &ValidationError{
			Field:   "code",
			Message: "商户编码只能包含字母、数字和下划线",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateContactPerson(person string) *ValidationError {
	if strings.TrimSpace(person) == "" {
		return &ValidationError{
			Field:   "contact_person",
			Message: "联系人不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(person) < 2 || len(person) > 50 {
		return &ValidationError{
			Field:   "contact_person",
			Message: "联系人姓名长度必须在2-50个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateContactPhone(phone string) *ValidationError {
	if strings.TrimSpace(phone) == "" {
		return &ValidationError{
			Field:   "contact_phone",
			Message: "联系电话不能为空",
			Code:    "REQUIRED",
		}
	}

	if !v.phoneRegex.MatchString(phone) {
		return &ValidationError{
			Field:   "contact_phone",
			Message: "联系电话格式无效，请输入有效的手机号码",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateContactEmail(email string) *ValidationError {
	if strings.TrimSpace(email) == "" {
		return &ValidationError{
			Field:   "contact_email",
			Message: "联系邮箱不能为空",
			Code:    "REQUIRED",
		}
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return &ValidationError{
			Field:   "contact_email",
			Message: "联系邮箱格式无效",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateLimits(dailyLimit, singleLimit decimal.Decimal) *ValidationError {
	if dailyLimit.IsNegative() {
		return &ValidationError{
			Field:   "daily_limit",
			Message: "日限额不能为负数",
			Code:    "INVALID_VALUE",
		}
	}

	if singleLimit.IsNegative() {
		return &ValidationError{
			Field:   "single_limit",
			Message: "单笔限额不能为负数",
			Code:    "INVALID_VALUE",
		}
	}

	if !dailyLimit.IsZero() && !singleLimit.IsZero() && singleLimit.GreaterThan(dailyLimit) {
		return &ValidationError{
			Field:   "single_limit",
			Message: "单笔限额不能大于日限额",
			Code:    "LIMIT_CONFLICT",
		}
	}

	return nil
}

func (v *BusinessValidator) validateAccountName(name string) *ValidationError {
	if strings.TrimSpace(name) == "" {
		return &ValidationError{
			Field:   "account_name",
			Message: "账户名称不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(name) < 2 || len(name) > 100 {
		return &ValidationError{
			Field:   "account_name",
			Message: "账户名称长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateAccountNumber(number, accountType string) *ValidationError {
	if strings.TrimSpace(number) == "" {
		return &ValidationError{
			Field:   "account_number",
			Message: "账户号码不能为空",
			Code:    "REQUIRED",
		}
	}

	switch accountType {
	case "bank":
		if !v.bankAccountRegex.MatchString(number) {
			return &ValidationError{
				Field:   "account_number",
				Message: "银行账号格式无效，应为10-30位数字",
				Code:    "FORMAT_INVALID",
			}
		}
	case "alipay":
		if !v.alipayAccountRegex.MatchString(number) {
			return &ValidationError{
				Field:   "account_number",
				Message: "支付宝账号格式无效，应为邮箱或手机号",
				Code:    "FORMAT_INVALID",
			}
		}
	case "wechat":
		if !v.wechatAccountRegex.MatchString(number) {
			return &ValidationError{
				Field:   "account_number",
				Message: "微信账号格式无效，应为6-20位字母数字组合",
				Code:    "FORMAT_INVALID",
			}
		}
	default:
		// For other types, use general validation
		if len(number) < 6 || len(number) > 50 {
			return &ValidationError{
				Field:   "account_number",
				Message: "账户号码长度必须在6-50个字符之间",
				Code:    "LENGTH_INVALID",
			}
		}
	}

	return nil
}

func (v *BusinessValidator) validateAccountType(accountType string) *ValidationError {
	if accountType == "" {
		return &ValidationError{
			Field:   "account_type",
			Message: "账户类型不能为空",
			Code:    "REQUIRED",
		}
	}

	for _, allowed := range v.allowedAccountTypes {
		if accountType == allowed {
			return nil
		}
	}

	return &ValidationError{
		Field:   "account_type",
		Message: fmt.Sprintf("无效的账户类型，允许的类型: %s", strings.Join(v.allowedAccountTypes, ", ")),
		Code:    "INVALID_VALUE",
	}
}

func (v *BusinessValidator) validateBankInfo(bankName, bankBranch string) *ValidationError {
	if strings.TrimSpace(bankName) == "" {
		return &ValidationError{
			Field:   "bank_name",
			Message: "银行名称不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(bankName) < 2 || len(bankName) > 100 {
		return &ValidationError{
			Field:   "bank_name",
			Message: "银行名称长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	if bankBranch != "" && len(bankBranch) > 200 {
		return &ValidationError{
			Field:   "bank_branch",
			Message: "银行支行信息不能超过200个字符",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

func (v *BusinessValidator) validateAccountHolder(holder string) *ValidationError {
	if strings.TrimSpace(holder) == "" {
		return &ValidationError{
			Field:   "account_holder",
			Message: "账户持有人不能为空",
			Code:    "REQUIRED",
		}
	}

	if len(holder) < 2 || len(holder) > 100 {
		return &ValidationError{
			Field:   "account_holder",
			Message: "账户持有人姓名长度必须在2-100个字符之间",
			Code:    "LENGTH_INVALID",
		}
	}

	return nil
}

// ValidateOrderNumber validates order number format
func (v *BusinessValidator) ValidateOrderNumber(orderNumber string) *ValidationError {
	if strings.TrimSpace(orderNumber) == "" {
		return &ValidationError{
			Field:   "order_number",
			Message: "订单号不能为空",
			Code:    "REQUIRED",
		}
	}

	if !v.orderNumberRegex.MatchString(orderNumber) {
		return &ValidationError{
			Field:   "order_number",
			Message: "订单号格式无效，应为10-32位大写字母和数字组合",
			Code:    "FORMAT_INVALID",
		}
	}

	return nil
}

// ValidateTimeRange validates time range parameters
func (v *BusinessValidator) ValidateTimeRange(startTime, endTime *time.Time) *ValidationError {
	if startTime != nil && endTime != nil {
		if startTime.After(*endTime) {
			return &ValidationError{
				Field:   "time_range",
				Message: "开始时间不能晚于结束时间",
				Code:    "TIME_RANGE_INVALID",
			}
		}

		// Check if time range is too large (e.g., more than 1 year)
		if endTime.Sub(*startTime) > 365*24*time.Hour {
			return &ValidationError{
				Field:   "time_range",
				Message: "查询时间范围不能超过1年",
				Code:    "TIME_RANGE_TOO_LARGE",
			}
		}
	}

	return nil
}

// ValidatePagination validates pagination parameters
func (v *BusinessValidator) ValidatePagination(page, limit int) *ValidationError {
	if page < 1 {
		return &ValidationError{
			Field:   "page",
			Message: "页码必须大于0",
			Code:    "INVALID_VALUE",
		}
	}

	if limit < 1 || limit > 1000 {
		return &ValidationError{
			Field:   "limit",
			Message: "每页数量必须在1-1000之间",
			Code:    "INVALID_VALUE",
		}
	}

	return nil
}

// SanitizeInput sanitizes input string
func (v *BusinessValidator) SanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	// Remove control characters except tab, newline, and carriage return
	var result strings.Builder
	for _, r := range input {
		if r == '\t' || r == '\n' || r == '\r' || r >= 32 {
			result.WriteRune(r)
		}
	}
	
	return result.String()
}

// FormatAmount formats decimal amount to string with proper precision
func (v *BusinessValidator) FormatAmount(amount decimal.Decimal) string {
	return amount.StringFixed(2)
}

// ParseAmount parses string amount to decimal
func (v *BusinessValidator) ParseAmount(amountStr string) (decimal.Decimal, error) {
	amountStr = strings.TrimSpace(amountStr)
	if amountStr == "" {
		return decimal.Zero, fmt.Errorf("amount cannot be empty")
	}

	amount, err := decimal.NewFromString(amountStr)
	if err != nil {
		return decimal.Zero, fmt.Errorf("invalid amount format: %v", err)
	}

	return amount, nil
}