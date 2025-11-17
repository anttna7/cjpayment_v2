package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/company/cjpayment/internal/repository"
)

// AccountFilterBuilder provides dynamic SQL query building for account filtering
type AccountFilterBuilder struct {
	// Default values
	defaultLimit  int
	defaultOffset int
	defaultOrderBy string
	defaultOrderDir string
	
	// Valid sort fields
	validSortFields map[string]bool
	
	// Search fields for fuzzy matching
	searchFields []string
}

// NewAccountFilterBuilder creates a new account filter builder
func NewAccountFilterBuilder() *AccountFilterBuilder {
	return &AccountFilterBuilder{
		defaultLimit:    20,
		defaultOffset:   0,
		defaultOrderBy:  "created_at",
		defaultOrderDir: "DESC",
		
		validSortFields: map[string]bool{
			"account_name":   true,
			"account_number": true,
			"account_type":   true,
			"account_holder": true,
			"payment_type":   true,
			"status":         true,
			"daily_limit":    true,
			"single_limit":   true,
			"daily_used":     true,
			"created_at":     true,
			"updated_at":     true,
		},
		
		searchFields: []string{
			"account_name",
			"account_number", 
			"account_holder",
			"bank_name",
		},
	}
}

// FilterRequest represents a comprehensive filter request for accounts
type FilterRequest struct {
	// Basic filters
	AccountType *string `json:"account_type"`
	PaymentType *string `json:"payment_type"`
	Status      *string `json:"status"`
	MerchantID  *uuid.UUID `json:"merchant_id"`
	
	// Search and text filters
	Search          *string `json:"search"`
	AccountName     *string `json:"account_name"`
	AccountNumber   *string `json:"account_number"`
	AccountHolder   *string `json:"account_holder"`
	BankName        *string `json:"bank_name"`
	
	// Range filters
	MinDailyLimit   *float64 `json:"min_daily_limit"`
	MaxDailyLimit   *float64 `json:"max_daily_limit"`
	MinSingleLimit  *float64 `json:"min_single_limit"`
	MaxSingleLimit  *float64 `json:"max_single_limit"`
	
	// Date filters
	CreatedAfter  *time.Time `json:"created_after"`
	CreatedBefore *time.Time `json:"created_before"`
	UpdatedAfter  *time.Time `json:"updated_after"`
	UpdatedBefore *time.Time `json:"updated_before"`
	
	// Multiple value filters
	AccountTypes []string `json:"account_types"`
	PaymentTypes []string `json:"payment_types"`
	Statuses     []string `json:"statuses"`
	
	// Pagination and sorting
	Page     int    `json:"page"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
	OrderBy  string `json:"order_by"`
	OrderDir string `json:"order_dir"`
	
	// Advanced options
	IncludeInactive bool `json:"include_inactive"`
	OnlyAvailable   bool `json:"only_available"`
}

// QueryResult represents the result of building a query
type QueryResult struct {
	Query      string
	CountQuery string
	Args       []interface{}
	Filter     *repository.ReceiveAccountFilter
}

// BuildQuery builds a dynamic SQL query based on the filter request
func (b *AccountFilterBuilder) BuildQuery(req *FilterRequest) *QueryResult {
	if req == nil {
		req = &FilterRequest{}
	}

	var conditions []string
	var args []interface{}
	argIndex := 1

	// Base query
	baseQuery := "SELECT * FROM receive_accounts"
	countQuery := "SELECT COUNT(*) FROM receive_accounts"

	// Build WHERE conditions
	
	// Account type filter
	if req.AccountType != nil && *req.AccountType != "" {
		conditions = append(conditions, fmt.Sprintf("account_type = $%d", argIndex))
		args = append(args, *req.AccountType)
		argIndex++
	}

	// Multiple account types filter
	if len(req.AccountTypes) > 0 {
		placeholders := make([]string, len(req.AccountTypes))
		for i, accountType := range req.AccountTypes {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, accountType)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("account_type IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Payment type filter
	if req.PaymentType != nil && *req.PaymentType != "" {
		conditions = append(conditions, fmt.Sprintf("payment_type = $%d", argIndex))
		args = append(args, *req.PaymentType)
		argIndex++
	}

	// Multiple payment types filter
	if len(req.PaymentTypes) > 0 {
		placeholders := make([]string, len(req.PaymentTypes))
		for i, paymentType := range req.PaymentTypes {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, paymentType)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("payment_type IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Status filter
	if req.Status != nil && *req.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}

	// Multiple statuses filter
	if len(req.Statuses) > 0 {
		placeholders := make([]string, len(req.Statuses))
		for i, status := range req.Statuses {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, status)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Merchant association filter
	if req.MerchantID != nil {
		conditions = append(conditions, fmt.Sprintf("id IN (SELECT receive_account_id FROM merchant_receive_accounts WHERE merchant_id = $%d AND is_active = true)", argIndex))
		args = append(args, *req.MerchantID)
		argIndex++
	}

	// Search filter (fuzzy matching across multiple fields)
	if req.Search != nil && *req.Search != "" {
		searchTerm := "%" + *req.Search + "%"
		searchConditions := make([]string, len(b.searchFields))
		for i, field := range b.searchFields {
			searchConditions[i] = fmt.Sprintf("%s ILIKE $%d", field, argIndex)
		}
		conditions = append(conditions, fmt.Sprintf("(%s)", strings.Join(searchConditions, " OR ")))
		args = append(args, searchTerm)
		argIndex++
	}

	// Specific field filters
	if req.AccountName != nil && *req.AccountName != "" {
		conditions = append(conditions, fmt.Sprintf("account_name ILIKE $%d", argIndex))
		args = append(args, "%"+*req.AccountName+"%")
		argIndex++
	}

	if req.AccountNumber != nil && *req.AccountNumber != "" {
		conditions = append(conditions, fmt.Sprintf("account_number ILIKE $%d", argIndex))
		args = append(args, "%"+*req.AccountNumber+"%")
		argIndex++
	}

	if req.AccountHolder != nil && *req.AccountHolder != "" {
		conditions = append(conditions, fmt.Sprintf("account_holder ILIKE $%d", argIndex))
		args = append(args, "%"+*req.AccountHolder+"%")
		argIndex++
	}

	if req.BankName != nil && *req.BankName != "" {
		conditions = append(conditions, fmt.Sprintf("bank_name ILIKE $%d", argIndex))
		args = append(args, "%"+*req.BankName+"%")
		argIndex++
	}

	// Range filters for limits
	if req.MinDailyLimit != nil {
		conditions = append(conditions, fmt.Sprintf("daily_limit >= $%d", argIndex))
		args = append(args, *req.MinDailyLimit)
		argIndex++
	}

	if req.MaxDailyLimit != nil {
		conditions = append(conditions, fmt.Sprintf("daily_limit <= $%d", argIndex))
		args = append(args, *req.MaxDailyLimit)
		argIndex++
	}

	if req.MinSingleLimit != nil {
		conditions = append(conditions, fmt.Sprintf("single_limit >= $%d", argIndex))
		args = append(args, *req.MinSingleLimit)
		argIndex++
	}

	if req.MaxSingleLimit != nil {
		conditions = append(conditions, fmt.Sprintf("single_limit <= $%d", argIndex))
		args = append(args, *req.MaxSingleLimit)
		argIndex++
	}

	// Date range filters
	if req.CreatedAfter != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *req.CreatedAfter)
		argIndex++
	}

	if req.CreatedBefore != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *req.CreatedBefore)
		argIndex++
	}

	if req.UpdatedAfter != nil {
		conditions = append(conditions, fmt.Sprintf("updated_at >= $%d", argIndex))
		args = append(args, *req.UpdatedAfter)
		argIndex++
	}

	if req.UpdatedBefore != nil {
		conditions = append(conditions, fmt.Sprintf("updated_at <= $%d", argIndex))
		args = append(args, *req.UpdatedBefore)
		argIndex++
	}

	// Advanced filters
	if !req.IncludeInactive {
		conditions = append(conditions, "status != 'inactive'")
	}

	if req.OnlyAvailable {
		conditions = append(conditions, "status = 'active' AND daily_limit > daily_used")
	}

	// Build final queries
	var finalQuery, finalCountQuery string

	if len(conditions) > 0 {
		whereClause := " WHERE " + strings.Join(conditions, " AND ")
		finalQuery = baseQuery + whereClause
		finalCountQuery = countQuery + whereClause
	} else {
		finalQuery = baseQuery
		finalCountQuery = countQuery
	}

	// Add ordering
	orderBy := b.defaultOrderBy
	if req.OrderBy != "" && b.validSortFields[req.OrderBy] {
		orderBy = req.OrderBy
	}

	orderDir := b.defaultOrderDir
	if req.OrderDir != "" && (strings.ToUpper(req.OrderDir) == "ASC" || strings.ToUpper(req.OrderDir) == "DESC") {
		orderDir = strings.ToUpper(req.OrderDir)
	}

	finalQuery += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDir)

	// Add pagination
	limit := b.defaultLimit
	if req.Limit > 0 {
		limit = req.Limit
	}
	if limit > 1000 { // Max limit for safety
		limit = 1000
	}

	offset := b.defaultOffset
	if req.Offset > 0 {
		offset = req.Offset
	} else if req.Page > 0 {
		offset = (req.Page - 1) * limit
	}

	finalQuery += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	// Create repository filter for compatibility
	repoFilter := &repository.ReceiveAccountFilter{
		AccountType: req.AccountType,
		PaymentType: req.PaymentType,
		Status:      req.Status,
		MerchantID:  req.MerchantID,
		Search:      req.Search,
		Limit:       limit,
		Offset:      offset,
		OrderBy:     orderBy,
		OrderDir:    orderDir,
	}

	return &QueryResult{
		Query:      finalQuery,
		CountQuery: finalCountQuery,
		Args:       args,
		Filter:     repoFilter,
	}
}

// BuildSimpleFilter creates a simple repository filter from basic parameters
func (b *AccountFilterBuilder) BuildSimpleFilter(accountType, paymentType, status, search *string, merchantID *uuid.UUID, page, limit int) *repository.ReceiveAccountFilter {
	if limit <= 0 {
		limit = b.defaultLimit
	}
	if limit > 1000 {
		limit = 1000
	}

	offset := 0
	if page > 0 {
		offset = (page - 1) * limit
	}

	return &repository.ReceiveAccountFilter{
		AccountType: accountType,
		PaymentType: paymentType,
		Status:      status,
		MerchantID:  merchantID,
		Search:      search,
		Limit:       limit,
		Offset:      offset,
		OrderBy:     b.defaultOrderBy,
		OrderDir:    b.defaultOrderDir,
	}
}

// ValidateFilterRequest validates the filter request parameters
func (b *AccountFilterBuilder) ValidateFilterRequest(req *FilterRequest) []string {
	var errors []string

	if req == nil {
		return errors
	}

	// Validate pagination
	if req.Page < 0 {
		errors = append(errors, "page must be non-negative")
	}

	if req.Limit < 0 {
		errors = append(errors, "limit must be non-negative")
	}

	if req.Limit > 1000 {
		errors = append(errors, "limit cannot exceed 1000")
	}

	if req.Offset < 0 {
		errors = append(errors, "offset must be non-negative")
	}

	// Validate sort field
	if req.OrderBy != "" && !b.validSortFields[req.OrderBy] {
		errors = append(errors, fmt.Sprintf("invalid order_by field: %s", req.OrderBy))
	}

	// Validate sort direction
	if req.OrderDir != "" {
		upperDir := strings.ToUpper(req.OrderDir)
		if upperDir != "ASC" && upperDir != "DESC" {
			errors = append(errors, "order_dir must be 'ASC' or 'DESC'")
		}
	}

	// Validate date ranges
	if req.CreatedAfter != nil && req.CreatedBefore != nil && req.CreatedAfter.After(*req.CreatedBefore) {
		errors = append(errors, "created_after must be before created_before")
	}

	if req.UpdatedAfter != nil && req.UpdatedBefore != nil && req.UpdatedAfter.After(*req.UpdatedBefore) {
		errors = append(errors, "updated_after must be before updated_before")
	}

	// Validate limit ranges
	if req.MinDailyLimit != nil && req.MaxDailyLimit != nil && *req.MinDailyLimit > *req.MaxDailyLimit {
		errors = append(errors, "min_daily_limit must be less than or equal to max_daily_limit")
	}

	if req.MinSingleLimit != nil && req.MaxSingleLimit != nil && *req.MinSingleLimit > *req.MaxSingleLimit {
		errors = append(errors, "min_single_limit must be less than or equal to max_single_limit")
	}

	// Validate negative limits
	if req.MinDailyLimit != nil && *req.MinDailyLimit < 0 {
		errors = append(errors, "min_daily_limit cannot be negative")
	}

	if req.MaxDailyLimit != nil && *req.MaxDailyLimit < 0 {
		errors = append(errors, "max_daily_limit cannot be negative")
	}

	if req.MinSingleLimit != nil && *req.MinSingleLimit < 0 {
		errors = append(errors, "min_single_limit cannot be negative")
	}

	if req.MaxSingleLimit != nil && *req.MaxSingleLimit < 0 {
		errors = append(errors, "max_single_limit cannot be negative")
	}

	return errors
}

// GetValidSortFields returns the list of valid sort fields
func (b *AccountFilterBuilder) GetValidSortFields() []string {
	fields := make([]string, 0, len(b.validSortFields))
	for field := range b.validSortFields {
		fields = append(fields, field)
	}
	return fields
}

// GetSearchFields returns the list of searchable fields
func (b *AccountFilterBuilder) GetSearchFields() []string {
	return b.searchFields
}

// SanitizeSearchTerm sanitizes search terms to prevent SQL injection
func (b *AccountFilterBuilder) SanitizeSearchTerm(term string) string {
	// Remove potentially dangerous characters
	term = strings.ReplaceAll(term, "'", "")
	term = strings.ReplaceAll(term, "\"", "")
	term = strings.ReplaceAll(term, ";", "")
	term = strings.ReplaceAll(term, "--", "")
	term = strings.ReplaceAll(term, "/*", "")
	term = strings.ReplaceAll(term, "*/", "")
	
	// Trim whitespace
	term = strings.TrimSpace(term)
	
	// Limit length
	if len(term) > 100 {
		term = term[:100]
	}
	
	return term
}

// BuildSearchQuery builds a specialized search query for autocomplete/suggestions
func (b *AccountFilterBuilder) BuildSearchQuery(searchTerm string, limit int) (string, []interface{}) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	searchTerm = b.SanitizeSearchTerm(searchTerm)
	if searchTerm == "" {
		return "", nil
	}

	// Build query for search suggestions
	query := `
		SELECT DISTINCT 
			account_name,
			account_number,
			account_type,
			account_holder,
			status
		FROM receive_accounts 
		WHERE status = 'active' 
		  AND (account_name ILIKE $1 OR account_number ILIKE $1 OR account_holder ILIKE $1)
		ORDER BY 
			CASE 
				WHEN account_name ILIKE $2 THEN 1
				WHEN account_number ILIKE $2 THEN 2
				WHEN account_holder ILIKE $2 THEN 3
				ELSE 4
			END,
			account_name
		LIMIT $3`

	args := []interface{}{
		"%" + searchTerm + "%",  // For general matching
		searchTerm + "%",        // For prefix matching (higher priority)
		limit,
	}

	return query, args
}

// FilterStats represents statistics about filtered results
type FilterStats struct {
	TotalCount      int64            `json:"total_count"`
	FilteredCount   int64            `json:"filtered_count"`
	AccountTypes    map[string]int64 `json:"account_types"`
	PaymentTypes    map[string]int64 `json:"payment_types"`
	Statuses        map[string]int64 `json:"statuses"`
	HasNextPage     bool             `json:"has_next_page"`
	HasPreviousPage bool             `json:"has_previous_page"`
	CurrentPage     int              `json:"current_page"`
	TotalPages      int              `json:"total_pages"`
}

// CalculateStats calculates statistics for the filtered results
func (b *AccountFilterBuilder) CalculateStats(req *FilterRequest, totalCount, filteredCount int64) *FilterStats {
	limit := req.Limit
	if limit <= 0 {
		limit = b.defaultLimit
	}

	page := req.Page
	if page <= 0 {
		page = 1
	}

	totalPages := int((filteredCount + int64(limit) - 1) / int64(limit))

	return &FilterStats{
		TotalCount:      totalCount,
		FilteredCount:   filteredCount,
		HasNextPage:     page < totalPages,
		HasPreviousPage: page > 1,
		CurrentPage:     page,
		TotalPages:      totalPages,
		AccountTypes:    make(map[string]int64),
		PaymentTypes:    make(map[string]int64),
		Statuses:        make(map[string]int64),
	}
}