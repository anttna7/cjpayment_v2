package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// merchantService implements MerchantService interface
type merchantService struct {
	merchantRepo repository.MerchantRepository
	baseURL      string // Base URL for recharge links
}

// NewMerchantService creates a new merchant service
func NewMerchantService(merchantRepo repository.MerchantRepository) MerchantService {
	return &merchantService{
		merchantRepo: merchantRepo,
		baseURL:      "https://recharge.example.com", // TODO: Make this configurable
	}
}

// NewMerchantServiceWithConfig creates a new merchant service with configuration
func NewMerchantServiceWithConfig(merchantRepo repository.MerchantRepository, baseURL string) MerchantService {
	return &merchantService{
		merchantRepo: merchantRepo,
		baseURL:      baseURL,
	}
}

// CreateMerchant creates a new merchant
func (s *merchantService) CreateMerchant(ctx context.Context, req *CreateMerchantRequest) (*repository.Merchant, error) {
	// Validate request
	if err := s.validateCreateMerchantRequest(req); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Check for duplicate merchant name
	if exists, err := s.merchantRepo.ExistsByName(ctx, req.Name); err != nil {
		return nil, fmt.Errorf("failed to check merchant name uniqueness: %w", err)
	} else if exists {
		return nil, fmt.Errorf("merchant with name '%s' already exists", req.Name)
	}

	// Check if merchant code already exists
	existing, err := s.merchantRepo.GetByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("merchant with code '%s' already exists", req.Code)
	}

	// Check port name uniqueness if provided
	if req.PortName != nil && *req.PortName != "" {
		if exists, err := s.merchantRepo.ExistsByPortName(ctx, *req.PortName); err != nil {
			return nil, fmt.Errorf("failed to check port name uniqueness: %w", err)
		} else if exists {
			return nil, fmt.Errorf("merchant with port name '%s' already exists", *req.PortName)
		}
	}

	// Create merchant entity
	merchant := &repository.Merchant{
		ID:                 uuid.New(),
		Name:               req.Name,
		Code:               req.Code,
		ContactPerson:      req.ContactPerson,
		ContactPhone:       req.ContactPhone,
		ContactEmail:       req.ContactEmail,
		Status:             "active", // Default status
		DailyLimit:         req.DailyLimit,
		SingleLimit:        req.SingleLimit,
		DailyUsed:          decimal.Zero,
		LastResetDate:      time.Now().Truncate(24 * time.Hour),
		AgentName:          req.AgentName,
		PortName:           req.PortName,
		Remark:             req.Remark,
		BusinessType:       req.BusinessType,
		IsRechargeEnabled:  false, // Default to disabled
		RechargePageConfig: make(map[string]interface{}),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Create merchant in repository
	if err := s.merchantRepo.Create(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to create merchant: %w", err)
	}

	return merchant, nil
}

// GetMerchant retrieves a merchant by ID
func (s *merchantService) GetMerchant(ctx context.Context, id uuid.UUID) (*repository.Merchant, error) {
	merchant, err := s.merchantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant: %w", err)
	}
	return merchant, nil
}

// GetMerchantByCode retrieves a merchant by code
func (s *merchantService) GetMerchantByCode(ctx context.Context, code string) (*repository.Merchant, error) {
	merchant, err := s.merchantRepo.GetByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant by code: %w", err)
	}
	return merchant, nil
}

// UpdateMerchant updates an existing merchant
func (s *merchantService) UpdateMerchant(ctx context.Context, id uuid.UUID, req *UpdateMerchantRequest) (*repository.Merchant, error) {
	// Get existing merchant
	merchant, err := s.merchantRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get merchant: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		// Check for duplicate name (excluding current merchant)
		if exists, err := s.merchantRepo.ExistsByName(ctx, *req.Name); err != nil {
			return nil, fmt.Errorf("failed to check merchant name uniqueness: %w", err)
		} else if exists && merchant.Name != *req.Name {
			return nil, fmt.Errorf("merchant with name '%s' already exists", *req.Name)
		}
		merchant.Name = *req.Name
	}
	if req.Code != nil {
		// Check if new code already exists (excluding current merchant)
		existing, err := s.merchantRepo.GetByCode(ctx, *req.Code)
		if err == nil && existing != nil && existing.ID != id {
			return nil, fmt.Errorf("merchant with code '%s' already exists", *req.Code)
		}
		merchant.Code = *req.Code
	}
	if req.ContactPerson != nil {
		merchant.ContactPerson = req.ContactPerson
	}
	if req.ContactPhone != nil {
		merchant.ContactPhone = req.ContactPhone
	}
	if req.ContactEmail != nil {
		merchant.ContactEmail = req.ContactEmail
	}
	if req.Status != nil {
		if err := s.validateMerchantStatus(*req.Status); err != nil {
			return nil, err
		}
		merchant.Status = *req.Status
	}
	if req.DailyLimit != nil {
		if err := s.validateLimits(*req.SingleLimit, *req.DailyLimit); err != nil {
			return nil, err
		}
		merchant.DailyLimit = *req.DailyLimit
	}
	if req.SingleLimit != nil {
		if err := s.validateLimits(*req.SingleLimit, merchant.DailyLimit); err != nil {
			return nil, err
		}
		merchant.SingleLimit = *req.SingleLimit
	}
	if req.AgentName != nil {
		merchant.AgentName = req.AgentName
	}
	if req.PortName != nil {
		// Check port name uniqueness if changed
		if *req.PortName != "" && (merchant.PortName == nil || *merchant.PortName != *req.PortName) {
			if exists, err := s.merchantRepo.ExistsByPortName(ctx, *req.PortName); err != nil {
				return nil, fmt.Errorf("failed to check port name uniqueness: %w", err)
			} else if exists {
				return nil, fmt.Errorf("merchant with port name '%s' already exists", *req.PortName)
			}
		}
		merchant.PortName = req.PortName
	}
	if req.Remark != nil {
		merchant.Remark = req.Remark
	}
	if req.BusinessType != nil {
		merchant.BusinessType = req.BusinessType
	}

	merchant.UpdatedAt = time.Now()

	// Update merchant in repository
	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return nil, fmt.Errorf("failed to update merchant: %w", err)
	}

	return merchant, nil
}

// DeleteMerchant deletes a merchant
func (s *merchantService) DeleteMerchant(ctx context.Context, id uuid.UUID) error {
	// Check if merchant exists
	_, err := s.merchantRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("merchant not found: %w", err)
	}

	// TODO: Check if merchant has active orders or accounts before deletion
	// This would require additional repository methods

	if err := s.merchantRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete merchant: %w", err)
	}

	return nil
}

// ListMerchants retrieves merchants with filtering and pagination
func (s *merchantService) ListMerchants(ctx context.Context, filter *repository.MerchantFilter) ([]*repository.Merchant, int64, error) {
	// Get merchants
	merchants, err := s.merchantRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list merchants: %w", err)
	}

	// Get total count
	count, err := s.merchantRepo.Count(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count merchants: %w", err)
	}

	return merchants, count, nil
}

// SearchMerchants searches merchants by keyword
func (s *merchantService) SearchMerchants(ctx context.Context, keyword string) ([]*repository.Merchant, error) {
	if strings.TrimSpace(keyword) == "" {
		return []*repository.Merchant{}, nil
	}

	merchants, err := s.merchantRepo.Search(ctx, keyword)
	if err != nil {
		return nil, fmt.Errorf("failed to search merchants: %w", err)
	}

	return merchants, nil
}

// UpdateMerchantStatus updates merchant status
func (s *merchantService) UpdateMerchantStatus(ctx context.Context, id uuid.UUID, status string) error {
	if err := s.validateMerchantStatus(status); err != nil {
		return err
	}

	// Get existing merchant
	merchant, err := s.merchantRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	// Update status
	merchant.Status = status

	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return fmt.Errorf("failed to update merchant status: %w", err)
	}

	return nil
}

// SetMerchantLimits sets merchant transaction limits
func (s *merchantService) SetMerchantLimits(ctx context.Context, id uuid.UUID, req *SetMerchantLimitsRequest) error {
	// Validate limits
	if req.DailyLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("daily limit cannot be negative")
	}
	if req.SingleLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("single limit cannot be negative")
	}
	if req.SingleLimit.GreaterThan(req.DailyLimit) {
		return fmt.Errorf("single limit cannot be greater than daily limit")
	}

	// Get existing merchant
	merchant, err := s.merchantRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get merchant: %w", err)
	}

	// Update limits
	merchant.DailyLimit = req.DailyLimit
	merchant.SingleLimit = req.SingleLimit

	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return fmt.Errorf("failed to update merchant limits: %w", err)
	}

	return nil
}

// GenerateRechargeURL generates a unique recharge URL for a merchant
func (s *merchantService) GenerateRechargeURL(ctx context.Context, merchantID uuid.UUID) (string, error) {
	// Get merchant to ensure it exists
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return "", fmt.Errorf("merchant not found: %w", err)
	}

	// Generate unique URL path
	urlPath, err := s.generateUniqueURLPath(ctx, merchant.Code)
	if err != nil {
		return "", fmt.Errorf("failed to generate URL path: %w", err)
	}

	// Update merchant with recharge URL
	merchant.RechargeURL = &urlPath
	merchant.UpdatedAt = time.Now()

	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return "", fmt.Errorf("failed to update merchant with recharge URL: %w", err)
	}

	// Return full URL
	fullURL := fmt.Sprintf("%s%s", s.baseURL, urlPath)
	return fullURL, nil
}

// EnableRechargeService enables or disables recharge functionality for a merchant
func (s *merchantService) EnableRechargeService(ctx context.Context, merchantID uuid.UUID, enabled bool) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("merchant not found: %w", err)
	}

	merchant.IsRechargeEnabled = enabled
	merchant.UpdatedAt = time.Now()

	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return fmt.Errorf("failed to update merchant recharge status: %w", err)
	}

	return nil
}

// UpdateRechargePageConfig updates the recharge page configuration for a merchant
func (s *merchantService) UpdateRechargePageConfig(ctx context.Context, merchantID uuid.UUID, config map[string]interface{}) error {
	merchant, err := s.merchantRepo.GetByID(ctx, merchantID)
	if err != nil {
		return fmt.Errorf("merchant not found: %w", err)
	}

	// Validate configuration
	if err := s.validateRechargePageConfig(config); err != nil {
		return fmt.Errorf("invalid recharge page config: %w", err)
	}

	merchant.RechargePageConfig = config
	merchant.UpdatedAt = time.Now()

	if err := s.merchantRepo.Update(ctx, merchant); err != nil {
		return fmt.Errorf("failed to update merchant recharge config: %w", err)
	}

	return nil
}

// GetMerchantByRechargeURL retrieves a merchant by recharge URL
func (s *merchantService) GetMerchantByRechargeURL(ctx context.Context, rechargeURL string) (*repository.Merchant, error) {
	// Extract path from URL if full URL is provided
	urlPath := rechargeURL
	if strings.HasPrefix(rechargeURL, "http") {
		parsedURL, err := url.Parse(rechargeURL)
		if err != nil {
			return nil, fmt.Errorf("invalid recharge URL: %w", err)
		}
		urlPath = parsedURL.Path
	}

	// Find merchant by recharge URL path
	filter := &repository.MerchantFilter{
		Limit: 1,
	}
	merchants, err := s.merchantRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to search merchants: %w", err)
	}

	for _, merchant := range merchants {
		if merchant.RechargeURL != nil && *merchant.RechargeURL == urlPath && merchant.IsRechargeEnabled {
			return merchant, nil
		}
	}

	return nil, fmt.Errorf("merchant not found for recharge URL: %s", urlPath)
}

// ValidateMerchantInfo validates merchant information for duplicates and format
func (s *merchantService) ValidateMerchantInfo(ctx context.Context, req *ValidateMerchantInfoRequest) (*ValidateMerchantInfoResponse, error) {
	response := &ValidateMerchantInfoResponse{
		IsValid: true,
		Errors:  make(map[string]string),
	}

	// Validate merchant name
	if req.Name != "" {
		if err := s.validateMerchantName(req.Name); err != nil {
			response.IsValid = false
			response.Errors["name"] = err.Error()
		} else if req.ExcludeMerchantID == nil {
			// Check uniqueness for new merchant
			if exists, err := s.merchantRepo.ExistsByName(ctx, req.Name); err != nil {
				response.IsValid = false
				response.Errors["name"] = "Failed to check name uniqueness"
			} else if exists {
				response.IsValid = false
				response.Errors["name"] = "Merchant name already exists"
			}
		}
	}

	// Validate merchant code
	if req.Code != "" {
		if err := s.validateMerchantCode(req.Code); err != nil {
			response.IsValid = false
			response.Errors["code"] = err.Error()
		} else {
			// Check uniqueness
			existing, err := s.merchantRepo.GetByCode(ctx, req.Code)
			if err == nil && existing != nil {
				if req.ExcludeMerchantID == nil || existing.ID != *req.ExcludeMerchantID {
					response.IsValid = false
					response.Errors["code"] = "Merchant code already exists"
				}
			}
		}
	}

	// Validate port name
	if req.PortName != "" {
		if err := s.validatePortName(req.PortName); err != nil {
			response.IsValid = false
			response.Errors["port_name"] = err.Error()
		} else if req.ExcludeMerchantID == nil {
			// Check uniqueness for new merchant
			if exists, err := s.merchantRepo.ExistsByPortName(ctx, req.PortName); err != nil {
				response.IsValid = false
				response.Errors["port_name"] = "Failed to check port name uniqueness"
			} else if exists {
				response.IsValid = false
				response.Errors["port_name"] = "Port name already exists"
			}
		}
	}

	// Validate contact information
	if req.ContactEmail != "" {
		if err := s.validateEmail(req.ContactEmail); err != nil {
			response.IsValid = false
			response.Errors["contact_email"] = err.Error()
		}
	}

	if req.ContactPhone != "" {
		if err := s.validatePhone(req.ContactPhone); err != nil {
			response.IsValid = false
			response.Errors["contact_phone"] = err.Error()
		}
	}

	// Validate limits
	if !req.SingleLimit.IsZero() && !req.DailyLimit.IsZero() {
		if err := s.validateLimits(req.SingleLimit, req.DailyLimit); err != nil {
			response.IsValid = false
			response.Errors["limits"] = err.Error()
		}
	}

	return response, nil
}

// generateUniqueURLPath generates a unique URL path for recharge
func (s *merchantService) generateUniqueURLPath(ctx context.Context, merchantCode string) (string, error) {
	// Generate random suffix
	randomBytes := make([]byte, 4)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	randomSuffix := hex.EncodeToString(randomBytes)

	// Create URL path
	urlPath := fmt.Sprintf("/recharge/%s-%s", merchantCode, randomSuffix)

	// TODO: Check if URL path already exists and regenerate if needed
	// For now, assume it's unique due to random suffix

	return urlPath, nil
}

// validateRechargePageConfig validates recharge page configuration
func (s *merchantService) validateRechargePageConfig(config map[string]interface{}) error {
	// Define required and optional configuration keys
	allowedKeys := map[string]bool{
		"page_title":        true,
		"show_merchant_info": true,
		"payment_methods":   true,
		"custom_css":        true,
		"custom_js":         true,
		"footer_text":       true,
		"contact_info":      true,
	}

	// Validate configuration keys
	for key := range config {
		if !allowedKeys[key] {
			return fmt.Errorf("invalid configuration key: %s", key)
		}
	}

	// Validate specific configuration values
	if pageTitle, exists := config["page_title"]; exists {
		if title, ok := pageTitle.(string); !ok || len(title) > 100 {
			return fmt.Errorf("page_title must be a string with maximum 100 characters")
		}
	}

	if paymentMethods, exists := config["payment_methods"]; exists {
		if methods, ok := paymentMethods.([]interface{}); ok {
			validMethods := map[string]bool{"alipay": true, "wechat": true, "bank": true}
			for _, method := range methods {
				if methodStr, ok := method.(string); !ok || !validMethods[methodStr] {
					return fmt.Errorf("invalid payment method: %v", method)
				}
			}
		} else {
			return fmt.Errorf("payment_methods must be an array")
		}
	}

	return nil
}

// validateCreateMerchantRequest validates create merchant request
func (s *merchantService) validateCreateMerchantRequest(req *CreateMerchantRequest) error {
	if err := s.validateMerchantName(req.Name); err != nil {
		return err
	}
	if err := s.validateMerchantCode(req.Code); err != nil {
		return err
	}
	if err := s.validateLimits(req.SingleLimit, req.DailyLimit); err != nil {
		return err
	}
	if req.ContactEmail != nil && *req.ContactEmail != "" {
		if err := s.validateEmail(*req.ContactEmail); err != nil {
			return err
		}
	}
	if req.ContactPhone != nil && *req.ContactPhone != "" {
		if err := s.validatePhone(*req.ContactPhone); err != nil {
			return err
		}
	}
	if req.PortName != nil && *req.PortName != "" {
		if err := s.validatePortName(*req.PortName); err != nil {
			return err
		}
	}
	return nil
}

// validateMerchantName validates merchant name
func (s *merchantService) validateMerchantName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("merchant name is required")
	}
	if len(name) < 2 {
		return fmt.Errorf("merchant name must be at least 2 characters")
	}
	if len(name) > 100 {
		return fmt.Errorf("merchant name must not exceed 100 characters")
	}
	// Check for valid characters (letters, numbers, spaces, hyphens, underscores)
	validNameRegex := regexp.MustCompile(`^[a-zA-Z0-9\s\-_\u4e00-\u9fff]+$`)
	if !validNameRegex.MatchString(name) {
		return fmt.Errorf("merchant name contains invalid characters")
	}
	return nil
}

// validateMerchantCode validates merchant code
func (s *merchantService) validateMerchantCode(code string) error {
	code = strings.TrimSpace(code)
	if code == "" {
		return fmt.Errorf("merchant code is required")
	}
	if len(code) < 2 {
		return fmt.Errorf("merchant code must be at least 2 characters")
	}
	if len(code) > 50 {
		return fmt.Errorf("merchant code must not exceed 50 characters")
	}
	// Check for valid characters (letters, numbers, hyphens, underscores)
	validCodeRegex := regexp.MustCompile(`^[a-zA-Z0-9\-_]+$`)
	if !validCodeRegex.MatchString(code) {
		return fmt.Errorf("merchant code can only contain letters, numbers, hyphens, and underscores")
	}
	return nil
}

// validatePortName validates port name
func (s *merchantService) validatePortName(portName string) error {
	portName = strings.TrimSpace(portName)
	if portName == "" {
		return nil // Port name is optional
	}
	if len(portName) < 2 {
		return fmt.Errorf("port name must be at least 2 characters")
	}
	if len(portName) > 100 {
		return fmt.Errorf("port name must not exceed 100 characters")
	}
	// Check for valid characters
	validPortNameRegex := regexp.MustCompile(`^[a-zA-Z0-9\s\-_\u4e00-\u9fff]+$`)
	if !validPortNameRegex.MatchString(portName) {
		return fmt.Errorf("port name contains invalid characters")
	}
	return nil
}

// validateEmail validates email format
func (s *merchantService) validateEmail(email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return nil // Email is optional
	}
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}
	if len(email) > 100 {
		return fmt.Errorf("email must not exceed 100 characters")
	}
	return nil
}

// validatePhone validates phone number format
func (s *merchantService) validatePhone(phone string) error {
	phone = strings.TrimSpace(phone)
	if phone == "" {
		return nil // Phone is optional
	}
	// Allow various phone formats (with or without country code, with or without separators)
	phoneRegex := regexp.MustCompile(`^[\+]?[0-9\-\s\(\)]{7,20}$`)
	if !phoneRegex.MatchString(phone) {
		return fmt.Errorf("invalid phone number format")
	}
	return nil
}

// validateLimits validates single and daily limits
func (s *merchantService) validateLimits(singleLimit, dailyLimit decimal.Decimal) error {
	if singleLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("single limit cannot be negative")
	}
	if dailyLimit.LessThan(decimal.Zero) {
		return fmt.Errorf("daily limit cannot be negative")
	}
	if singleLimit.GreaterThan(dailyLimit) {
		return fmt.Errorf("single limit cannot be greater than daily limit")
	}
	return nil
}

// validateMerchantStatus validates merchant status
func (s *merchantService) validateMerchantStatus(status string) error {
	validStatuses := []string{"active", "inactive", "suspended"}
	for _, validStatus := range validStatuses {
		if status == validStatus {
			return nil
		}
	}
	return fmt.Errorf("invalid status '%s', must be one of: %s", status, strings.Join(validStatuses, ", "))
}