package repository

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Validation functions for repository models

// ValidateMerchant validates a merchant model
func ValidateMerchant(merchant *Merchant) error {
	if merchant == nil {
		return fmt.Errorf("merchant cannot be nil")
	}

	if strings.TrimSpace(merchant.Name) == "" {
		return fmt.Errorf("merchant name is required")
	}

	if len(merchant.Name) < 2 || len(merchant.Name) > 100 {
		return fmt.Errorf("merchant name must be between 2 and 100 characters")
	}

	if strings.TrimSpace(merchant.Code) == "" {
		return fmt.Errorf("merchant code is required")
	}

	if len(merchant.Code) < 2 || len(merchant.Code) > 50 {
		return fmt.Errorf("merchant code must be between 2 and 50 characters")
	}

	// Validate status
	validStatuses := map[string]bool{
		"active":    true,
		"inactive":  true,
		"suspended": true,
	}
	if !validStatuses[merchant.Status] {
		return fmt.Errorf("invalid merchant status: %s", merchant.Status)
	}

	// Validate limits
	if merchant.DailyLimit.IsNegative() {
		return fmt.Errorf("daily limit cannot be negative")
	}

	if merchant.SingleLimit.IsNegative() {
		return fmt.Errorf("single limit cannot be negative")
	}

	if merchant.DailyUsed.IsNegative() {
		return fmt.Errorf("daily used cannot be negative")
	}

	// Validate contact information if provided
	if merchant.ContactEmail != nil && *merchant.ContactEmail != "" {
		if !isValidEmail(*merchant.ContactEmail) {
			return fmt.Errorf("invalid email format")
		}
	}

	if merchant.ContactPhone != nil && *merchant.ContactPhone != "" {
		if !isValidPhone(*merchant.ContactPhone) {
			return fmt.Errorf("invalid phone format")
		}
	}

	// Validate business type if provided
	if merchant.BusinessType != nil && *merchant.BusinessType != "" {
		validBusinessTypes := map[string]bool{
			"e-commerce":    true,
			"retail":        true,
			"service":       true,
			"manufacturing": true,
			"other":         true,
		}
		if !validBusinessTypes[*merchant.BusinessType] {
			return fmt.Errorf("invalid business type: %s", *merchant.BusinessType)
		}
	}

	return nil
}

// ValidateReceiveAccount validates a receive account model
func ValidateReceiveAccount(account *ReceiveAccount) error {
	if account == nil {
		return fmt.Errorf("receive account cannot be nil")
	}

	if strings.TrimSpace(account.AccountName) == "" {
		return fmt.Errorf("account name is required")
	}

	if len(account.AccountName) < 2 || len(account.AccountName) > 100 {
		return fmt.Errorf("account name must be between 2 and 100 characters")
	}

	if strings.TrimSpace(account.AccountNumber) == "" {
		return fmt.Errorf("account number is required")
	}

	if len(account.AccountNumber) < 6 || len(account.AccountNumber) > 50 {
		return fmt.Errorf("account number must be between 6 and 50 characters")
	}

	// Validate account type
	validAccountTypes := map[string]bool{
		"alipay": true,
		"wechat": true,
		"bank":   true,
		"other":  true,
	}
	if !validAccountTypes[account.AccountType] {
		return fmt.Errorf("invalid account type: %s", account.AccountType)
	}

	// Validate custom payment provider for "other" type
	if account.AccountType == "other" {
		if account.CustomPaymentProvider == nil || *account.CustomPaymentProvider == "" {
			return fmt.Errorf("custom payment provider is required for 'other' account type")
		}
		if len(*account.CustomPaymentProvider) < 2 || len(*account.CustomPaymentProvider) > 50 {
			return fmt.Errorf("custom payment provider must be between 2 and 50 characters")
		}
	}

	if strings.TrimSpace(account.AccountHolder) == "" {
		return fmt.Errorf("account holder is required")
	}

	if len(account.AccountHolder) < 2 || len(account.AccountHolder) > 100 {
		return fmt.Errorf("account holder must be between 2 and 100 characters")
	}

	// Validate payment type
	validPaymentTypes := map[string]bool{
		"private":  true,
		"business": true,
	}
	if !validPaymentTypes[account.PaymentType] {
		return fmt.Errorf("invalid payment type: %s", account.PaymentType)
	}

	// Validate status
	validStatuses := map[string]bool{
		"active":    true,
		"inactive":  true,
		"suspended": true,
		"closed":    true,
	}
	if !validStatuses[account.Status] {
		return fmt.Errorf("invalid account status: %s", account.Status)
	}

	// Validate limits
	if account.DailyLimit.IsNegative() {
		return fmt.Errorf("daily limit cannot be negative")
	}

	if account.SingleLimit.IsNegative() {
		return fmt.Errorf("single limit cannot be negative")
	}

	if account.DailyUsed.IsNegative() {
		return fmt.Errorf("daily used cannot be negative")
	}

	// Validate bank information for bank accounts
	if account.AccountType == "bank" {
		if account.BankName == nil || *account.BankName == "" {
			return fmt.Errorf("bank name is required for bank accounts")
		}
		if len(*account.BankName) < 2 || len(*account.BankName) > 100 {
			return fmt.Errorf("bank name must be between 2 and 100 characters")
		}
	}

	return nil
}

// ValidateRechargeOrder validates a recharge order model
func ValidateRechargeOrder(order *RechargeOrder) error {
	if order == nil {
		return fmt.Errorf("recharge order cannot be nil")
	}

	if strings.TrimSpace(order.OrderNumber) == "" {
		return fmt.Errorf("order number is required")
	}

	if strings.TrimSpace(order.PayerName) == "" {
		return fmt.Errorf("payer name is required")
	}

	if len(order.PayerName) < 2 || len(order.PayerName) > 50 {
		return fmt.Errorf("payer name must be between 2 and 50 characters")
	}

	if order.Amount.IsZero() || order.Amount.IsNegative() {
		return fmt.Errorf("amount must be greater than zero")
	}

	if order.MerchantID == uuid.Nil {
		return fmt.Errorf("merchant ID is required")
	}

	if strings.TrimSpace(order.AdAccount) == "" {
		return fmt.Errorf("ad account is required")
	}

	if len(order.AdAccount) < 2 || len(order.AdAccount) > 100 {
		return fmt.Errorf("ad account must be between 2 and 100 characters")
	}

	// Validate payment type
	validPaymentTypes := map[string]bool{
		"private":  true,
		"business": true,
	}
	if !validPaymentTypes[order.PaymentType] {
		return fmt.Errorf("invalid payment type: %s", order.PaymentType)
	}

	// Validate status
	validStatuses := map[string]bool{
		"pending":   true,
		"paid":      true,
		"confirmed": true,
		"completed": true,
		"cancelled": true,
		"expired":   true,
		"failed":    true,
	}
	if !validStatuses[order.Status] {
		return fmt.Errorf("invalid order status: %s", order.Status)
	}

	// Validate expiration time if set
	if order.ExpiredAt != nil && order.ExpiredAt.Before(order.CreatedAt) {
		return fmt.Errorf("expiration time cannot be before creation time")
	}

	return nil
}

// ValidateRechargeSession validates a recharge session model
func ValidateRechargeSession(session *RechargeSession) error {
	if session == nil {
		return fmt.Errorf("recharge session cannot be nil")
	}

	if strings.TrimSpace(session.SessionToken) == "" {
		return fmt.Errorf("session token is required")
	}

	if len(session.SessionToken) < 32 {
		return fmt.Errorf("session token must be at least 32 characters")
	}

	if session.MerchantID == uuid.Nil {
		return fmt.Errorf("merchant ID is required")
	}

	if strings.TrimSpace(session.CurrentStep) == "" {
		return fmt.Errorf("current step is required")
	}

	// Validate current step
	validSteps := map[string]bool{
		"form_filling":    true,
		"account_matching": true,
		"payment_info":    true,
		"payment_proof":   true,
		"completed":       true,
	}
	if !validSteps[session.CurrentStep] {
		return fmt.Errorf("invalid current step: %s", session.CurrentStep)
	}

	if session.ExpiresAt.Before(time.Now()) {
		return fmt.Errorf("session has expired")
	}

	return nil
}

// ValidateCreateRechargeOrderRequest validates a create recharge order request
func ValidateCreateRechargeOrderRequest(req *CreateRechargeOrderRequest) error {
	if req == nil {
		return fmt.Errorf("request cannot be nil")
	}

	if strings.TrimSpace(req.PayerName) == "" {
		return fmt.Errorf("payer name is required")
	}

	if len(req.PayerName) < 2 || len(req.PayerName) > 50 {
		return fmt.Errorf("payer name must be between 2 and 50 characters")
	}

	if req.Amount.IsZero() || req.Amount.IsNegative() {
		return fmt.Errorf("amount must be greater than zero")
	}

	// Validate amount range (e.g., minimum 1, maximum 1,000,000)
	minAmount := decimal.NewFromInt(1)
	maxAmount := decimal.NewFromInt(1000000)
	if req.Amount.LessThan(minAmount) || req.Amount.GreaterThan(maxAmount) {
		return fmt.Errorf("amount must be between %s and %s", minAmount.String(), maxAmount.String())
	}

	if strings.TrimSpace(req.AdAccount) == "" {
		return fmt.Errorf("ad account is required")
	}

	if len(req.AdAccount) < 2 || len(req.AdAccount) > 100 {
		return fmt.Errorf("ad account must be between 2 and 100 characters")
	}

	// Validate payment type
	validPaymentTypes := map[string]bool{
		"private":  true,
		"business": true,
	}
	if !validPaymentTypes[req.PaymentType] {
		return fmt.Errorf("invalid payment type: %s", req.PaymentType)
	}

	if req.MerchantID == uuid.Nil {
		return fmt.Errorf("merchant ID is required")
	}

	// Validate optional fields
	if req.PayerAccount != nil && *req.PayerAccount != "" {
		if len(*req.PayerAccount) < 6 || len(*req.PayerAccount) > 50 {
			return fmt.Errorf("payer account must be between 6 and 50 characters")
		}
	}

	if req.Remark != nil && len(*req.Remark) > 500 {
		return fmt.Errorf("remark cannot exceed 500 characters")
	}

	return nil
}

// Helper functions

// isValidEmail validates email format
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// isValidPhone validates phone format (basic validation)
func isValidPhone(phone string) bool {
	// Remove common separators
	cleanPhone := strings.ReplaceAll(phone, " ", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, "-", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, "(", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, ")", "")
	cleanPhone = strings.ReplaceAll(cleanPhone, "+", "")

	// Check if it contains only digits and has reasonable length
	phoneRegex := regexp.MustCompile(`^\d{10,15}$`)
	return phoneRegex.MatchString(cleanPhone)
}

// GenerateOrderNumber generates a unique order number
func GenerateOrderNumber() string {
	now := time.Now()
	return fmt.Sprintf("RO%s%06d", 
		now.Format("20060102150405"), 
		now.Nanosecond()/1000%1000000)
}

// ValidateOrderNumber validates order number format
func ValidateOrderNumber(orderNumber string) bool {
	// Order number should start with "RO" followed by timestamp and sequence
	orderRegex := regexp.MustCompile(`^RO\d{14}\d{6}$`)
	return orderRegex.MatchString(orderNumber)
}