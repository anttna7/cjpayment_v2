package service

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestAccountFilterBuilder_BuildQuery(t *testing.T) {
	builder := NewAccountFilterBuilder()

	tests := []struct {
		name     string
		request  *FilterRequest
		wantArgs int
		checks   func(t *testing.T, result *QueryResult)
	}{
		{
			name:     "Empty filter",
			request:  &FilterRequest{},
			wantArgs: 2, // LIMIT and OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "SELECT * FROM receive_accounts")
				assert.Contains(t, result.Query, "ORDER BY created_at DESC")
				assert.Contains(t, result.Query, "LIMIT")
				assert.Contains(t, result.Query, "OFFSET")
				assert.NotContains(t, result.Query, "WHERE")
			},
		},
		{
			name: "Single account type filter",
			request: &FilterRequest{
				AccountType: stringPtr("alipay"),
			},
			wantArgs: 3, // account_type, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "WHERE account_type = $1")
				assert.Equal(t, "alipay", result.Args[0])
			},
		},
		{
			name: "Multiple account types filter",
			request: &FilterRequest{
				AccountTypes: []string{"alipay", "wechat", "bank"},
			},
			wantArgs: 5, // 3 account types, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "account_type IN ($1, $2, $3)")
				assert.Equal(t, "alipay", result.Args[0])
				assert.Equal(t, "wechat", result.Args[1])
				assert.Equal(t, "bank", result.Args[2])
			},
		},
		{
			name: "Search filter",
			request: &FilterRequest{
				Search: stringPtr("test"),
			},
			wantArgs: 3, // search term, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "account_name ILIKE $1 OR account_number ILIKE $1")
				assert.Equal(t, "%test%", result.Args[0])
			},
		},
		{
			name: "Range filters",
			request: &FilterRequest{
				MinDailyLimit:  float64Ptr(1000.0),
				MaxDailyLimit:  float64Ptr(10000.0),
				MinSingleLimit: float64Ptr(500.0),
				MaxSingleLimit: float64Ptr(5000.0),
			},
			wantArgs: 6, // 4 range filters, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "daily_limit >= $1")
				assert.Contains(t, result.Query, "daily_limit <= $2")
				assert.Contains(t, result.Query, "single_limit >= $3")
				assert.Contains(t, result.Query, "single_limit <= $4")
			},
		},
		{
			name: "Date range filters",
			request: &FilterRequest{
				CreatedAfter:  timePtr(time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)),
				CreatedBefore: timePtr(time.Date(2023, 12, 31, 23, 59, 59, 0, time.UTC)),
			},
			wantArgs: 4, // 2 date filters, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "created_at >= $1")
				assert.Contains(t, result.Query, "created_at <= $2")
			},
		},
		{
			name: "Merchant association filter",
			request: &FilterRequest{
				MerchantID: uuidPtr(uuid.New()),
			},
			wantArgs: 3, // merchant_id, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "id IN (SELECT receive_account_id FROM merchant_receive_accounts WHERE merchant_id = $1 AND is_active = true)")
			},
		},
		{
			name: "Advanced options",
			request: &FilterRequest{
				IncludeInactive: false,
				OnlyAvailable:   true,
			},
			wantArgs: 2, // LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "status != 'inactive'")
				assert.Contains(t, result.Query, "status = 'active' AND daily_limit > daily_used")
			},
		},
		{
			name: "Custom pagination and sorting",
			request: &FilterRequest{
				Page:     2,
				Limit:    50,
				OrderBy:  "account_name",
				OrderDir: "ASC",
			},
			wantArgs: 2, // LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "ORDER BY account_name ASC")
				assert.Equal(t, 50, result.Args[len(result.Args)-2]) // LIMIT
				assert.Equal(t, 50, result.Args[len(result.Args)-1]) // OFFSET (page 2 * limit 50 - limit 50)
			},
		},
		{
			name: "Complex combined filter",
			request: &FilterRequest{
				AccountTypes: []string{"alipay", "wechat"},
				PaymentTypes: []string{"private", "business"},
				Statuses:     []string{"active", "inactive"},
				Search:       stringPtr("test"),
				MinDailyLimit: float64Ptr(1000.0),
				Page:         1,
				Limit:        25,
				OrderBy:      "created_at",
				OrderDir:     "DESC",
			},
			wantArgs: 10, // 2 account types, 2 payment types, 2 statuses, search, min_daily_limit, LIMIT, OFFSET
			checks: func(t *testing.T, result *QueryResult) {
				assert.Contains(t, result.Query, "account_type IN")
				assert.Contains(t, result.Query, "payment_type IN")
				assert.Contains(t, result.Query, "status IN")
				assert.Contains(t, result.Query, "ILIKE")
				assert.Contains(t, result.Query, "daily_limit >=")
				assert.Contains(t, result.Query, "ORDER BY created_at DESC")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := builder.BuildQuery(tt.request)
			
			assert.NotNil(t, result)
			assert.NotEmpty(t, result.Query)
			assert.NotEmpty(t, result.CountQuery)
			assert.NotNil(t, result.Filter)
			assert.Len(t, result.Args, tt.wantArgs)
			
			// Ensure count query doesn't have ORDER BY, LIMIT, OFFSET
			assert.NotContains(t, result.CountQuery, "ORDER BY")
			assert.NotContains(t, result.CountQuery, "LIMIT")
			assert.NotContains(t, result.CountQuery, "OFFSET")
			
			if tt.checks != nil {
				tt.checks(t, result)
			}
		})
	}
}

func TestAccountFilterBuilder_BuildSimpleFilter(t *testing.T) {
	builder := NewAccountFilterBuilder()

	accountType := "alipay"
	paymentType := "private"
	status := "active"
	search := "test"
	merchantID := uuid.New()

	filter := builder.BuildSimpleFilter(&accountType, &paymentType, &status, &search, &merchantID, 2, 25)

	assert.Equal(t, &accountType, filter.AccountType)
	assert.Equal(t, &paymentType, filter.PaymentType)
	assert.Equal(t, &status, filter.Status)
	assert.Equal(t, &search, filter.Search)
	assert.Equal(t, &merchantID, filter.MerchantID)
	assert.Equal(t, 25, filter.Limit)
	assert.Equal(t, 25, filter.Offset) // Page 2 with limit 25
	assert.Equal(t, "created_at", filter.OrderBy)
	assert.Equal(t, "DESC", filter.OrderDir)
}

func TestAccountFilterBuilder_ValidateFilterRequest(t *testing.T) {
	builder := NewAccountFilterBuilder()

	tests := []struct {
		name      string
		request   *FilterRequest
		wantErrs  int
		checkErrs func(t *testing.T, errors []string)
	}{
		{
			name:     "Valid request",
			request:  &FilterRequest{Page: 1, Limit: 20, OrderBy: "account_name", OrderDir: "ASC"},
			wantErrs: 0,
		},
		{
			name:     "Negative page",
			request:  &FilterRequest{Page: -1},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "page must be non-negative")
			},
		},
		{
			name:     "Negative limit",
			request:  &FilterRequest{Limit: -1},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "limit must be non-negative")
			},
		},
		{
			name:     "Limit too large",
			request:  &FilterRequest{Limit: 2000},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "limit cannot exceed 1000")
			},
		},
		{
			name:     "Invalid order by field",
			request:  &FilterRequest{OrderBy: "invalid_field"},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "invalid order_by field")
			},
		},
		{
			name:     "Invalid order direction",
			request:  &FilterRequest{OrderDir: "INVALID"},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "order_dir must be 'ASC' or 'DESC'")
			},
		},
		{
			name: "Invalid date range",
			request: &FilterRequest{
				CreatedAfter:  timePtr(time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC)),
				CreatedBefore: timePtr(time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)),
			},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "created_after must be before created_before")
			},
		},
		{
			name: "Invalid limit range",
			request: &FilterRequest{
				MinDailyLimit: float64Ptr(10000.0),
				MaxDailyLimit: float64Ptr(5000.0),
			},
			wantErrs: 1,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, errors[0], "min_daily_limit must be less than or equal to max_daily_limit")
			},
		},
		{
			name: "Negative limits",
			request: &FilterRequest{
				MinDailyLimit:  float64Ptr(-1000.0),
				MaxSingleLimit: float64Ptr(-500.0),
			},
			wantErrs: 2,
			checkErrs: func(t *testing.T, errors []string) {
				assert.Contains(t, strings.Join(errors, " "), "cannot be negative")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errors := builder.ValidateFilterRequest(tt.request)
			assert.Len(t, errors, tt.wantErrs)
			
			if tt.checkErrs != nil && len(errors) > 0 {
				tt.checkErrs(t, errors)
			}
		})
	}
}

func TestAccountFilterBuilder_SanitizeSearchTerm(t *testing.T) {
	builder := NewAccountFilterBuilder()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Normal text",
			input:    "test account",
			expected: "test account",
		},
		{
			name:     "SQL injection attempt",
			input:    "test'; DROP TABLE accounts; --",
			expected: "test DROP TABLE accounts",
		},
		{
			name:     "With quotes",
			input:    `test "account" name`,
			expected: "test account name",
		},
		{
			name:     "With comments",
			input:    "test /* comment */ account",
			expected: "test  account",
		},
		{
			name:     "Long text",
			input:    strings.Repeat("a", 150),
			expected: strings.Repeat("a", 100),
		},
		{
			name:     "Whitespace",
			input:    "  test account  ",
			expected: "test account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := builder.SanitizeSearchTerm(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestAccountFilterBuilder_BuildSearchQuery(t *testing.T) {
	builder := NewAccountFilterBuilder()

	tests := []struct {
		name       string
		searchTerm string
		limit      int
		wantQuery  bool
		wantArgs   int
	}{
		{
			name:       "Valid search",
			searchTerm: "test",
			limit:      10,
			wantQuery:  true,
			wantArgs:   3,
		},
		{
			name:       "Empty search term",
			searchTerm: "",
			limit:      10,
			wantQuery:  false,
			wantArgs:   0,
		},
		{
			name:       "Invalid limit (too high)",
			searchTerm: "test",
			limit:      100,
			wantQuery:  true,
			wantArgs:   3,
		},
		{
			name:       "Invalid limit (zero)",
			searchTerm: "test",
			limit:      0,
			wantQuery:  true,
			wantArgs:   3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			query, args := builder.BuildSearchQuery(tt.searchTerm, tt.limit)
			
			if tt.wantQuery {
				assert.NotEmpty(t, query)
				assert.Contains(t, query, "SELECT DISTINCT")
				assert.Contains(t, query, "account_name ILIKE")
				assert.Contains(t, query, "ORDER BY")
				assert.Contains(t, query, "LIMIT")
			} else {
				assert.Empty(t, query)
			}
			
			assert.Len(t, args, tt.wantArgs)
		})
	}
}

func TestAccountFilterBuilder_CalculateStats(t *testing.T) {
	builder := NewAccountFilterBuilder()

	tests := []struct {
		name          string
		request       *FilterRequest
		totalCount    int64
		filteredCount int64
		checks        func(t *testing.T, stats *FilterStats)
	}{
		{
			name: "First page with results",
			request: &FilterRequest{
				Page:  1,
				Limit: 20,
			},
			totalCount:    100,
			filteredCount: 50,
			checks: func(t *testing.T, stats *FilterStats) {
				assert.Equal(t, int64(100), stats.TotalCount)
				assert.Equal(t, int64(50), stats.FilteredCount)
				assert.Equal(t, 1, stats.CurrentPage)
				assert.Equal(t, 3, stats.TotalPages) // 50/20 = 2.5 -> 3
				assert.False(t, stats.HasPreviousPage)
				assert.True(t, stats.HasNextPage)
			},
		},
		{
			name: "Last page",
			request: &FilterRequest{
				Page:  3,
				Limit: 20,
			},
			totalCount:    100,
			filteredCount: 50,
			checks: func(t *testing.T, stats *FilterStats) {
				assert.Equal(t, 3, stats.CurrentPage)
				assert.Equal(t, 3, stats.TotalPages)
				assert.True(t, stats.HasPreviousPage)
				assert.False(t, stats.HasNextPage)
			},
		},
		{
			name: "Default values",
			request: &FilterRequest{},
			totalCount:    100,
			filteredCount: 100,
			checks: func(t *testing.T, stats *FilterStats) {
				assert.Equal(t, 1, stats.CurrentPage)
				assert.Equal(t, 5, stats.TotalPages) // 100/20 = 5
				assert.False(t, stats.HasPreviousPage)
				assert.True(t, stats.HasNextPage)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stats := builder.CalculateStats(tt.request, tt.totalCount, tt.filteredCount)
			assert.NotNil(t, stats)
			
			if tt.checks != nil {
				tt.checks(t, stats)
			}
		})
	}
}

func TestAccountFilterBuilder_GetValidSortFields(t *testing.T) {
	builder := NewAccountFilterBuilder()
	fields := builder.GetValidSortFields()
	
	assert.NotEmpty(t, fields)
	assert.Contains(t, fields, "account_name")
	assert.Contains(t, fields, "account_number")
	assert.Contains(t, fields, "created_at")
}

func TestAccountFilterBuilder_GetSearchFields(t *testing.T) {
	builder := NewAccountFilterBuilder()
	fields := builder.GetSearchFields()
	
	assert.NotEmpty(t, fields)
	assert.Contains(t, fields, "account_name")
	assert.Contains(t, fields, "account_number")
	assert.Contains(t, fields, "account_holder")
}

// Helper functions for creating pointers
func stringPtr(s string) *string {
	return &s
}

func float64Ptr(f float64) *float64 {
	return &f
}

func timePtr(t time.Time) *time.Time {
	return &t
}

func uuidPtr(u uuid.UUID) *uuid.UUID {
	return &u
}