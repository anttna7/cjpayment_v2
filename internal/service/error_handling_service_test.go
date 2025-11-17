package service

import (
	"context"
	"testing"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/company/cjpayment/pkg/errors"
)

func TestErrorHandlingService_HandleError(t *testing.T) {
	// Setup test database
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	config := &ErrorHandlingConfig{
		EnableRecovery:         true,
		EnableConsistencyCheck: true,
		EnableAlerts:          true,
		ErrorStatsWindow:      time.Hour,
		MaxErrorRate:          0.1,
	}

	service := NewErrorHandlingService(db, logger, config)
	ctx := context.Background()

	err = service.Start(ctx)
	require.NoError(t, err)
	defer service.Stop()

	tests := []struct {
		name           string
		inputError     error
		source         string
		expectedCode   errors.ErrorCode
		expectedSeverity errors.ErrorSeverity
	}{
		{
			name:           "database connection error",
			inputError:     errors.NewAPIError(errors.ErrDatabaseConnection, "Database connection failed"),
			source:         "database",
			expectedCode:   errors.ErrDatabaseConnection,
			expectedSeverity: errors.SeverityCritical,
		},
		{
			name:           "validation error",
			inputError:     errors.NewAPIError(errors.ErrValidationFailed, "Validation failed"),
			source:         "validation",
			expectedCode:   errors.ErrValidationFailed,
			expectedSeverity: errors.SeverityMedium,
		},
		{
			name:           "generic error conversion",
			inputError:     assert.AnError,
			source:         "test",
			expectedCode:   errors.ErrInternalServer,
			expectedSeverity: errors.SeverityCritical,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiErr := service.HandleError(ctx, tt.inputError, tt.source)
			
			assert.Equal(t, tt.expectedCode, apiErr.Code)
			assert.Equal(t, tt.expectedSeverity, apiErr.Severity)
			assert.NotEmpty(t, apiErr.Message)
			assert.False(t, apiErr.Timestamp.IsZero())
		})
	}
}

func TestErrorHandlingService_ErrorStatistics(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	service := NewErrorHandlingService(db, logger, nil)
	ctx := context.Background()

	// Record some errors
	err1 := errors.NewAPIError(errors.ErrDatabaseConnection, "DB error")
	err2 := errors.NewAPIError(errors.ErrValidationFailed, "Validation error")
	err3 := errors.NewAPIError(errors.ErrDatabaseConnection, "Another DB error")

	service.HandleError(ctx, err1, "database")
	service.HandleError(ctx, err2, "validation")
	service.HandleError(ctx, err3, "database")

	stats := service.GetErrorStatistics()
	
	assert.Equal(t, int64(3), stats.totalErrors)
	assert.Equal(t, int64(2), stats.errorsByCode[errors.ErrDatabaseConnection])
	assert.Equal(t, int64(1), stats.errorsByCode[errors.ErrValidationFailed])
	assert.Equal(t, int64(2), stats.errorsByCategory["system"])
	assert.Equal(t, int64(1), stats.errorsByCategory["validation"])
	assert.Len(t, stats.recentErrors, 3)
}

func TestErrorHandlingService_RecoverFromError(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	config := &ErrorHandlingConfig{
		EnableRecovery: true,
	}

	service := NewErrorHandlingService(db, logger, config)
	ctx := context.Background()

	err = service.Start(ctx)
	require.NoError(t, err)
	defer service.Stop()

	tests := []struct {
		name        string
		error       *errors.APIError
		source      string
		expectError bool
	}{
		{
			name:        "retryable database error",
			error:       errors.NewAPIError(errors.ErrDatabaseConnection, "DB connection failed"),
			source:      "database",
			expectError: false,
		},
		{
			name:        "non-retryable error",
			error:       errors.NewAPIError(errors.ErrMerchantNotFound, "Merchant not found"),
			source:      "merchant",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.RecoverFromError(ctx, tt.error, tt.source)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				// Database recovery should work with in-memory SQLite
				assert.NoError(t, err)
			}
		})
	}
}

func TestErrorHandlingService_StartStop(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	service := NewErrorHandlingService(db, logger, nil)
	ctx := context.Background()

	// Test start
	err = service.Start(ctx)
	assert.NoError(t, err)
	assert.True(t, service.running)

	// Test double start
	err = service.Start(ctx)
	assert.Error(t, err)

	// Test stop
	err = service.Stop()
	assert.NoError(t, err)
	assert.False(t, service.running)

	// Test double stop
	err = service.Stop()
	assert.Error(t, err)
}

func TestErrorHandlingService_ConvertToAPIError(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	service := NewErrorHandlingService(db, logger, nil)

	tests := []struct {
		name         string
		inputError   error
		expectedCode errors.ErrorCode
	}{
		{
			name:         "nil error",
			inputError:   nil,
			expectedCode: errors.ErrInternalServer,
		},
		{
			name:         "record not found",
			inputError:   gorm.ErrRecordNotFound,
			expectedCode: errors.ErrOrderNotFound,
		},
		{
			name:         "generic error",
			inputError:   assert.AnError,
			expectedCode: errors.ErrInternalServer,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiErr := service.convertToAPIError(tt.inputError)
			assert.Equal(t, tt.expectedCode, apiErr.Code)
		})
	}
}

func TestErrorHandlingService_GetErrorCategory(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	service := NewErrorHandlingService(db, logger, nil)

	tests := []struct {
		code     errors.ErrorCode
		expected string
	}{
		{errors.ErrInternalServer, "system"},
		{errors.ErrUnauthorized, "auth"},
		{errors.ErrMerchantNotFound, "merchant"},
		{errors.ErrAccountNotFound, "account"},
		{errors.ErrOrderNotFound, "order"},
		{errors.ErrPaymentFailed, "payment"},
		{errors.ErrValidationFailed, "validation"},
		{errors.ErrBusinessRuleViolation, "business"},
		{errors.ErrExternalServiceError, "external"},
		{errors.ErrorCode(99999), "unknown"},
	}

	for _, tt := range tests {
		t.Run(string(tt.code), func(t *testing.T) {
			category := service.getErrorCategory(tt.code)
			assert.Equal(t, tt.expected, category)
		})
	}
}

func TestErrorHandlingService_ShouldAlert(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	service := NewErrorHandlingService(db, logger, nil)

	tests := []struct {
		severity errors.ErrorSeverity
		expected bool
	}{
		{errors.SeverityCritical, true},
		{errors.SeverityHigh, true},
		{errors.SeverityMedium, false},
		{errors.SeverityLow, false},
		{errors.SeverityInfo, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.severity), func(t *testing.T) {
			apiErr := &errors.APIError{Severity: tt.severity}
			result := service.shouldAlert(apiErr)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestErrorHandlingService_ShouldTriggerCircuitBreaker(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	service := NewErrorHandlingService(db, logger, nil)

	tests := []struct {
		name     string
		apiErr   *errors.APIError
		expected bool
	}{
		{
			name: "critical database error",
			apiErr: &errors.APIError{
				Code:     errors.ErrDatabaseConnection,
				Severity: errors.SeverityCritical,
			},
			expected: true,
		},
		{
			name: "critical redis error",
			apiErr: &errors.APIError{
				Code:     errors.ErrRedisConnection,
				Severity: errors.SeverityCritical,
			},
			expected: true,
		},
		{
			name: "non-critical error",
			apiErr: &errors.APIError{
				Code:     errors.ErrValidationFailed,
				Severity: errors.SeverityMedium,
			},
			expected: false,
		},
		{
			name: "critical but non-system error",
			apiErr: &errors.APIError{
				Code:     errors.ErrMerchantNotFound,
				Severity: errors.SeverityCritical,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.shouldTriggerCircuitBreaker(tt.apiErr)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestErrorStatistics_CleanOldErrors(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	logger := logrus.New()
	config := &ErrorHandlingConfig{
		ErrorStatsWindow: time.Minute,
	}
	service := NewErrorHandlingService(db, logger, config)

	// Add some old and new errors
	now := time.Now()
	service.errorStats.recentErrors = []ErrorEvent{
		{Timestamp: now.Add(-2 * time.Minute)}, // Old
		{Timestamp: now.Add(-30 * time.Second)}, // New
		{Timestamp: now.Add(-5 * time.Second)},  // New
	}

	service.errorStats.cleanOldErrors(now)

	assert.Len(t, service.errorStats.recentErrors, 2)
	for _, event := range service.errorStats.recentErrors {
		assert.True(t, now.Sub(event.Timestamp) <= time.Minute)
	}
}

// Benchmark tests
func BenchmarkErrorHandlingService_HandleError(b *testing.B) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(b, err)

	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel) // Reduce logging for benchmark

	service := NewErrorHandlingService(db, logger, nil)
	ctx := context.Background()

	testError := errors.NewAPIError(errors.ErrValidationFailed, "Test error")

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			service.HandleError(ctx, testError, "benchmark")
		}
	})
}

func BenchmarkErrorHandlingService_GetErrorStatistics(b *testing.B) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(b, err)

	logger := logrus.New()
	service := NewErrorHandlingService(db, logger, nil)

	// Pre-populate with some errors
	for i := 0; i < 1000; i++ {
		service.recordError(
			errors.NewAPIError(errors.ErrValidationFailed, "Test error"),
			"benchmark",
		)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.GetErrorStatistics()
	}
}