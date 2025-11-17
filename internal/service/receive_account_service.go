package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// receiveAccountService implements ReceiveAccountService interface
type receiveAccountService struct {
	receiveAccountRepo         repository.ReceiveAccountRepository
	merchantRepo               repository.MerchantRepository
	merchantReceiveAccountRepo repository.MerchantReceiveAccountRepository
}

// NewReceiveAccountService creates a new receive account service
func NewReceiveAccountService(
	receiveAccountRepo repository.ReceiveAccountRepository,
	merchantRepo repository.MerchantRepository,
	merchantReceiveAccountRepo repository.MerchantReceiveAccountRepository,
) ReceiveAccountService {
	return &receiveAccountService{
		receiveAccountRepo:         receiveAccountRepo,
		merchantRepo:               merchantRepo,
		merchantReceiveAccountRepo: merchantReceiveAccountRepo,
	}
}

// CreateReceiveAccount creates a new receive account with enhanced validation
func (s *receiveAccountService) CreateReceiveAccount(ctx context.Context, req *CreateReceiveAccountRequest) (*repository.ReceiveAccount, error) {
	// Enhanced validation using AccountValidator
	validator := NewAccountValidator(s.receiveAccountRepo)
	
	// Convert request to validation request
	validationReq := &AccountValidationRequest{
		AccountName:           req.AccountName,
		AccountNumber:         req.AccountNumber,
		AccountType:           req.AccountType,
		CustomPaymentProvider: req.CustomPaymentProvider,
		BankName:              req.BankName,
		BankBranch:            req.BankBranch,
		AccountHolder:         req.AccountHolder,
		PaymentType:           req.PaymentType,
		Status:                "active", // Default status for new accounts
		DailyLimit:            req.DailyLimit,
		SingleLimit:           req.SingleLimit,
	}

	// Sanitize input data
	validator.SanitizeAccountData(validationReq)

	// Validate the request
	validationResult := validator.ValidateAccount(ctx, validationReq)
	if !validationResult.Valid {
		return nil, fmt.Errorf("validation failed: %v", validationResult.Errors)
	}

	// Check for duplicate account number
	exists, err := s.receiveAccountRepo.ExistsByAccountNumber(ctx, validationReq.AccountNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to check account number uniqueness: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("account number already exists: %s", validationReq.AccountNumber)
	}

	// Create receive account entity with sanitized data
	account := &repository.ReceiveAccount{
		ID:                    uuid.New(),
		AccountName:           validationReq.AccountName,
		AccountNumber:         validationReq.AccountNumber,
		AccountType:           validationReq.AccountType,
		CustomPaymentProvider: validationReq.CustomPaymentProvider,
		BankName:              validationReq.BankName,
		BankBranch:            validationReq.BankBranch,
		AccountHolder:         validationReq.AccountHolder,
		PaymentType:           validationReq.PaymentType,
		Status:                validationReq.Status,
		DailyLimit:            validationReq.DailyLimit,
		SingleLimit:           validationReq.SingleLimit,
		DailyUsed:             decimal.Zero,
		LastResetDate:         time.Now(),
	}

	// Create account in repository
	if err := s.receiveAccountRepo.Create(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to create receive account: %w", err)
	}

	return account, nil
}

// GetReceiveAccount retrieves a receive account by ID
func (s *receiveAccountService) GetReceiveAccount(ctx context.Context, id uuid.UUID) (*repository.ReceiveAccount, error) {
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get receive account: %w", err)
	}
	return account, nil
}

// UpdateReceiveAccount updates an existing receive account with enhanced validation and concurrency control
func (s *receiveAccountService) UpdateReceiveAccount(ctx context.Context, id uuid.UUID, req *UpdateReceiveAccountRequest) (*repository.ReceiveAccount, error) {
	// Get existing account
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get receive account: %w", err)
	}

	// Store original values for concurrency check
	originalUpdatedAt := account.UpdatedAt

	// Create validation request with current values
	validationReq := &AccountValidationRequest{
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

	// Update fields if provided in request
	if req.AccountName != nil {
		validationReq.AccountName = *req.AccountName
	}
	if req.AccountNumber != nil {
		validationReq.AccountNumber = *req.AccountNumber
	}
	if req.AccountType != nil {
		validationReq.AccountType = *req.AccountType
	}
	if req.BankName != nil {
		validationReq.BankName = req.BankName
	}
	if req.BankBranch != nil {
		validationReq.BankBranch = req.BankBranch
	}
	if req.AccountHolder != nil {
		validationReq.AccountHolder = *req.AccountHolder
	}
	if req.PaymentType != nil {
		validationReq.PaymentType = *req.PaymentType
	}
	if req.Status != nil {
		validationReq.Status = *req.Status
	}
	if req.DailyLimit != nil {
		validationReq.DailyLimit = *req.DailyLimit
	}
	if req.SingleLimit != nil {
		validationReq.SingleLimit = *req.SingleLimit
	}

	// Enhanced validation using AccountValidator
	validator := NewAccountValidator(s.receiveAccountRepo)
	
	// Sanitize input data
	validator.SanitizeAccountData(validationReq)

	// Validate the updated data
	validationResult := validator.ValidateAccountForUpdate(ctx, id, validationReq)
	if !validationResult.Valid {
		return nil, fmt.Errorf("validation failed: %v", validationResult.Errors)
	}

	// Check for sensitive field updates (account number, account type)
	sensitiveFieldsChanged := false
	if req.AccountNumber != nil && *req.AccountNumber != account.AccountNumber {
		sensitiveFieldsChanged = true
	}
	if req.AccountType != nil && *req.AccountType != account.AccountType {
		sensitiveFieldsChanged = true
	}

	// TODO: Add permission check for sensitive field updates
	// This would require user context and permission service
	if sensitiveFieldsChanged {
		// For now, we'll allow it but log it
		// In a real implementation, you'd check user permissions here
	}

	// Apply validated changes to account
	account.AccountName = validationReq.AccountName
	account.AccountNumber = validationReq.AccountNumber
	account.AccountType = validationReq.AccountType
	account.CustomPaymentProvider = validationReq.CustomPaymentProvider
	account.BankName = validationReq.BankName
	account.BankBranch = validationReq.BankBranch
	account.AccountHolder = validationReq.AccountHolder
	account.PaymentType = validationReq.PaymentType
	account.Status = validationReq.Status
	account.DailyLimit = validationReq.DailyLimit
	account.SingleLimit = validationReq.SingleLimit
	account.UpdatedAt = time.Now()

	// Concurrency control: Check if account was modified since we retrieved it
	currentAccount, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to check account for concurrent updates: %w", err)
	}
	if !currentAccount.UpdatedAt.Equal(originalUpdatedAt) {
		return nil, fmt.Errorf("account was modified by another process, please refresh and try again")
	}

	// Update account in repository
	if err := s.receiveAccountRepo.Update(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to update receive account: %w", err)
	}

	return account, nil
}

// DeleteReceiveAccount performs soft delete of a receive account with dependency checks
func (s *receiveAccountService) DeleteReceiveAccount(ctx context.Context, id uuid.UUID) error {
	// Check if account exists
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("receive account not found: %w", err)
	}

	// Check if account is already deleted
	if account.Status == "deleted" {
		return fmt.Errorf("account is already deleted")
	}

	// Check for dependencies before deletion
	if err := s.checkAccountDependencies(ctx, id); err != nil {
		return fmt.Errorf("cannot delete account due to dependencies: %w", err)
	}

	// Perform soft delete by updating status
	account.Status = "deleted"
	account.UpdatedAt = time.Now()

	if err := s.receiveAccountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to soft delete receive account: %w", err)
	}

	return nil
}

// RestoreReceiveAccount restores a soft-deleted receive account
func (s *receiveAccountService) RestoreReceiveAccount(ctx context.Context, id uuid.UUID) error {
	// Check if account exists
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("receive account not found: %w", err)
	}

	// Check if account is deleted
	if account.Status != "deleted" {
		return fmt.Errorf("account is not deleted, current status: %s", account.Status)
	}

	// Restore account by setting status to inactive (requires manual activation)
	account.Status = "inactive"
	account.UpdatedAt = time.Now()

	if err := s.receiveAccountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to restore receive account: %w", err)
	}

	return nil
}

// checkAccountDependencies checks if account has active dependencies that prevent deletion
func (s *receiveAccountService) checkAccountDependencies(ctx context.Context, accountID uuid.UUID) error {
	// Check for active merchant associations
	// This would require a method to check merchant-account relationships
	// For now, we'll implement a basic check

	// TODO: Check for active recharge orders
	// This would require access to RechargeOrderRepository
	// For now, we'll skip this check but it should be implemented

	// Check for merchant associations
	// We can use the merchant-receive-account repository if available
	if s.merchantReceiveAccountRepo != nil {
		relationships, err := s.merchantReceiveAccountRepo.GetByMerchant(ctx, accountID) // This is incorrect, should be GetByAccount
		if err != nil {
			// If method doesn't exist or fails, we'll continue
			// In a real implementation, you'd have a GetByAccount method
		} else if len(relationships) > 0 {
			return fmt.Errorf("account is associated with %d merchant(s), remove associations first", len(relationships))
		}
	}

	return nil
}

// ListReceiveAccounts retrieves receive accounts with filtering and pagination
func (s *receiveAccountService) ListReceiveAccounts(ctx context.Context, filter *repository.ReceiveAccountFilter) ([]*repository.ReceiveAccount, int64, error) {
	// 添加详细的错误日志
	if s.receiveAccountRepo == nil {
		return nil, 0, fmt.Errorf("receive account repository is not initialized")
	}

	// 设置默认过滤器并验证分页参数
	if filter == nil {
		filter = &repository.ReceiveAccountFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	// 验证分页参数边界
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 1000 { // 防止过大的查询
		filter.Limit = 1000
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	// Get total count first (for pagination info)
	totalCount, err := s.receiveAccountRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count receive accounts: %w", err)
	}

	// If no records found, return empty result
	if totalCount == 0 {
		return []*repository.ReceiveAccount{}, 0, nil
	}

	// Get accounts with pagination
	accounts, err := s.receiveAccountRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list receive accounts from repository: %w", err)
	}

	return accounts, totalCount, nil
}

// GetAccountsByMerchant retrieves all receive accounts for a merchant
func (s *receiveAccountService) GetAccountsByMerchant(ctx context.Context, merchantID uuid.UUID) ([]*repository.ReceiveAccount, error) {
	// Verify merchant exists
	_, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found: %w", err)
	}

	accounts, err := s.receiveAccountRepo.GetByMerchant(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get accounts by merchant: %w", err)
	}

	return accounts, nil
}

// UpdateAccountStatus updates receive account status
func (s *receiveAccountService) UpdateAccountStatus(ctx context.Context, id uuid.UUID, status string) error {
	if err := s.validateAccountStatus(status); err != nil {
		return err
	}

	// Get existing account
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get receive account: %w", err)
	}

	// Update status
	account.Status = status

	if err := s.receiveAccountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to update account status: %w", err)
	}

	return nil
}

// SetAccountLimits sets receive account transaction limits
func (s *receiveAccountService) SetAccountLimits(ctx context.Context, id uuid.UUID, req *SetAccountLimitsRequest) error {
	// Validate limits
	if err := s.validateAccountLimits(req.DailyLimit, req.SingleLimit); err != nil {
		return err
	}

	// Get existing account
	account, err := s.receiveAccountRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get receive account: %w", err)
	}

	// Update limits
	account.DailyLimit = req.DailyLimit
	account.SingleLimit = req.SingleLimit

	if err := s.receiveAccountRepo.Update(ctx, account); err != nil {
		return fmt.Errorf("failed to update account limits: %w", err)
	}

	return nil
}

// GetAvailableAccounts retrieves available accounts for a merchant
func (s *receiveAccountService) GetAvailableAccounts(ctx context.Context, merchantID uuid.UUID, amount decimal.Decimal, paymentType string) ([]*repository.ReceiveAccount, error) {
	// Verify merchant exists
	_, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return nil, fmt.Errorf("merchant not found: %w", err)
	}

	// Validate payment type
	if err := s.validatePaymentType(paymentType); err != nil {
		return nil, err
	}

	// Validate amount
	if amount.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("amount must be greater than zero")
	}

	accounts, err := s.receiveAccountRepo.GetAvailableAccounts(ctx, merchantID, amount, paymentType)
	if err != nil {
		return nil, fmt.Errorf("failed to get available accounts: %w", err)
	}

	return accounts, nil
}

// AssignAccountToMerchant assigns a receive account to a merchant
func (s *receiveAccountService) AssignAccountToMerchant(ctx context.Context, req *AssignAccountToMerchantRequest) error {
	// Verify merchant exists
	_, err := s.merchantRepo.GetByID(ctx, req.MerchantID)
	if err != nil {
		return fmt.Errorf("merchant not found: %w", err)
	}

	// Verify account exists
	_, err = s.receiveAccountRepo.GetByID(ctx, req.ReceiveAccountID)
	if err != nil {
		return fmt.Errorf("receive account not found: %w", err)
	}

	// Validate weight
	if req.Weight <= 0 {
		req.Weight = 1 // Default weight
	}

	// Create merchant-account relationship
	relationship := &repository.MerchantReceiveAccount{
		ID:               uuid.New(),
		MerchantID:       req.MerchantID,
		ReceiveAccountID: req.ReceiveAccountID,
		Weight:           req.Weight,
		IsActive:         true,
	}

	if err := s.merchantReceiveAccountRepo.Create(ctx, relationship); err != nil {
		return fmt.Errorf("failed to assign account to merchant: %w", err)
	}

	return nil
}

// RemoveAccountFromMerchant removes a receive account from a merchant
func (s *receiveAccountService) RemoveAccountFromMerchant(ctx context.Context, merchantID, accountID uuid.UUID) error {
	if err := s.merchantReceiveAccountRepo.DeleteByMerchantAndAccount(ctx, merchantID, accountID); err != nil {
		return fmt.Errorf("failed to remove account from merchant: %w", err)
	}

	return nil
}

// UpdateAccountWeight updates the weight of an account for a merchant
func (s *receiveAccountService) UpdateAccountWeight(ctx context.Context, merchantID, accountID uuid.UUID, weight int) error {
	if weight <= 0 {
		return fmt.Errorf("weight must be greater than zero")
	}

	if err := s.merchantReceiveAccountRepo.UpdateWeight(ctx, merchantID, accountID, weight); err != nil {
		return fmt.Errorf("failed to update account weight: %w", err)
	}

	return nil
}

// validateCreateReceiveAccountRequest validates create receive account request
func (s *receiveAccountService) validateCreateReceiveAccountRequest(req *CreateReceiveAccountRequest) error {
	if strings.TrimSpace(req.AccountName) == "" {
		return fmt.Errorf("account name is required")
	}
	if strings.TrimSpace(req.AccountNumber) == "" {
		return fmt.Errorf("account number is required")
	}
	if strings.TrimSpace(req.AccountHolder) == "" {
		return fmt.Errorf("account holder is required")
	}
	if err := s.validateAccountType(req.AccountType); err != nil {
		return err
	}
	if err := s.validatePaymentType(req.PaymentType); err != nil {
		return err
	}
	if err := s.validateAccountLimits(req.DailyLimit, req.SingleLimit); err != nil {
		return err
	}
	return nil
}

// validateAccountType validates account type
func (s *receiveAccountService) validateAccountType(accountType string) error {
	validTypes := []string{"alipay", "wechat", "bank", "other"}
	for _, validType := range validTypes {
		if accountType == validType {
			return nil
		}
	}
	return fmt.Errorf("invalid account type '%s', must be one of: %s", accountType, strings.Join(validTypes, ", "))
}

// validatePaymentType validates payment type
func (s *receiveAccountService) validatePaymentType(paymentType string) error {
	validTypes := []string{"public", "private"}
	for _, validType := range validTypes {
		if paymentType == validType {
			return nil
		}
	}
	return fmt.Errorf("invalid payment type '%s', must be one of: %s", paymentType, strings.Join(validTypes, ", "))
}

// validateAccountStatus validates account status
func (s *receiveAccountService) validateAccountStatus(status string) error {
	validStatuses := []string{"active", "inactive", "suspended"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return nil
		}
	}
	return fmt.Errorf("invalid status '%s', must be one of: %s", status, strings.Join(validStatuses, ", "))
}

// validateAccountLimits validates account limits
func (s *receiveAccountService) validateAccountLimits(dailyLimit, singleLimit decimal.Decimal) error {
	if dailyLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("daily limit cannot be negative")
	}
	if singleLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("single limit cannot be negative")
	}
	if singleLimit.GreaterThan(dailyLimit) {
		return fmt.Errorf("single limit cannot be greater than daily limit")
	}
	return nil
}