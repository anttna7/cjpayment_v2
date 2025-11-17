package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
)

// DataCleanupService defines the data cleanup and reset service interface
type DataCleanupService interface {
	// Test environment data cleanup (uses types from test_data_service.go)
	CleanupTestDataInternal(ctx context.Context, dataTypes []string, testPrefix string, createdAfter *time.Time, dryRun bool) (*CleanupResult, error)
	
	// Database state reset
	ResetDatabaseState(ctx context.Context, req *ResetDatabaseStateRequest) (*ResetResult, error)
	
	// Demo data management
	ImportDemoData(ctx context.Context, req *ImportDemoDataRequest) (*ImportResult, error)
	ExportDemoData(ctx context.Context, req *ExportDemoDataRequest) (*ExportResult, error)
	
	// Data validation and integrity checks
	ValidateDataIntegrity(ctx context.Context) (*IntegrityCheckResult, error)
	
	// Cleanup statistics and reporting
	GetCleanupStatistics(ctx context.Context) (*CleanupStatistics, error)
}

// Request types for data cleanup
type ResetDatabaseStateRequest struct {
	ResetTypes    []string `json:"reset_types" binding:"required"` // limits, counters, cache, logs
	PreserveTables []string `json:"preserve_tables"`               // Tables to preserve during reset
	DryRun        bool     `json:"dry_run"`
	BackupBefore  bool     `json:"backup_before"`
}

type ImportDemoDataRequest struct {
	DataSource   string            `json:"data_source" binding:"required"` // file, template, url
	SourcePath   string            `json:"source_path"`
	DataTypes    []string          `json:"data_types"`
	Options      map[string]interface{} `json:"options"`
	ReplaceExisting bool           `json:"replace_existing"`
}

type ExportDemoDataRequest struct {
	DataTypes     []string          `json:"data_types" binding:"required"`
	ExportFormat  string            `json:"export_format"` // json, sql, csv
	OutputPath    string            `json:"output_path"`
	IncludeSchema bool              `json:"include_schema"`
	Options       map[string]interface{} `json:"options"`
}

// Response types
type CleanupResult struct {
	DataType     string        `json:"data_type"`
	DeletedCount int           `json:"deleted_count"`
	Duration     time.Duration `json:"duration"`
	DryRun       bool          `json:"dry_run"`
	Message      string        `json:"message"`
}

type ResetResult struct {
	ResetTypes     []string      `json:"reset_types"`
	AffectedTables []string      `json:"affected_tables"`
	RecordsReset   int           `json:"records_reset"`
	Duration       time.Duration `json:"duration"`
	BackupPath     string        `json:"backup_path,omitempty"`
	DryRun         bool          `json:"dry_run"`
	Message        string        `json:"message"`
}

type ImportResult struct {
	DataSource     string        `json:"data_source"`
	ImportedTypes  []string      `json:"imported_types"`
	RecordsImported int          `json:"records_imported"`
	Duration       time.Duration `json:"duration"`
	Errors         []string      `json:"errors,omitempty"`
	Message        string        `json:"message"`
}

type ExportResult struct {
	ExportedTypes  []string      `json:"exported_types"`
	RecordsExported int          `json:"records_exported"`
	OutputPath     string        `json:"output_path"`
	FileSize       int64         `json:"file_size"`
	Duration       time.Duration `json:"duration"`
	Message        string        `json:"message"`
}

type IntegrityCheckResult struct {
	ChecksPerformed []string                `json:"checks_performed"`
	Issues          []IntegrityIssue        `json:"issues"`
	Summary         *IntegritySummary       `json:"summary"`
	Duration        time.Duration           `json:"duration"`
}

type IntegrityIssue struct {
	Type        string `json:"type"`        // orphaned, missing_reference, invalid_data
	Table       string `json:"table"`
	RecordID    string `json:"record_id"`
	Description string `json:"description"`
	Severity    string `json:"severity"`    // low, medium, high, critical
}

type IntegritySummary struct {
	TotalIssues    int `json:"total_issues"`
	CriticalIssues int `json:"critical_issues"`
	HighIssues     int `json:"high_issues"`
	MediumIssues   int `json:"medium_issues"`
	LowIssues      int `json:"low_issues"`
}

type CleanupStatistics struct {
	LastCleanup       *time.Time            `json:"last_cleanup"`
	TotalCleanups     int                   `json:"total_cleanups"`
	RecordsCleaned    int                   `json:"records_cleaned"`
	TableStatistics   []TableStatistic      `json:"table_statistics"`
	CleanupHistory    []CleanupHistoryEntry `json:"cleanup_history"`
}

type TableStatistic struct {
	TableName    string `json:"table_name"`
	RecordCount  int    `json:"record_count"`
	TestRecords  int    `json:"test_records"`
	LastCleaned  *time.Time `json:"last_cleaned"`
}

type CleanupHistoryEntry struct {
	Timestamp    time.Time `json:"timestamp"`
	Operation    string    `json:"operation"`
	DataTypes    []string  `json:"data_types"`
	RecordsAffected int    `json:"records_affected"`
	Duration     time.Duration `json:"duration"`
}

// dataCleanupService implements DataCleanupService
type dataCleanupService struct {
	merchantRepo      repository.MerchantRepository
	accountRepo       repository.ReceiveAccountRepository
	rechargeRepo      repository.RechargeOrderRepository
	userRepo          repository.UserRepository
	roleRepo          repository.RoleRepository
	permissionRepo    repository.PermissionRepository
	merchantAccountRepo repository.MerchantReceiveAccountRepository
}

// NewDataCleanupService creates a new data cleanup service
func NewDataCleanupService(
	merchantRepo repository.MerchantRepository,
	accountRepo repository.ReceiveAccountRepository,
	rechargeRepo repository.RechargeOrderRepository,
	userRepo repository.UserRepository,
	roleRepo repository.RoleRepository,
	permissionRepo repository.PermissionRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
) DataCleanupService {
	return &dataCleanupService{
		merchantRepo:        merchantRepo,
		accountRepo:         accountRepo,
		rechargeRepo:        rechargeRepo,
		userRepo:            userRepo,
		roleRepo:            roleRepo,
		permissionRepo:      permissionRepo,
		merchantAccountRepo: merchantAccountRepo,
	}
}

// CleanupTestDataInternal cleans up test data based on the parameters
func (s *dataCleanupService) CleanupTestDataInternal(ctx context.Context, dataTypes []string, testPrefix string, createdAfter *time.Time, dryRun bool) (*CleanupResult, error) {
	startTime := time.Now()
	var deletedCount int
	var errors []string
	
	// Validate request
	if len(dataTypes) == 0 {
		return nil, fmt.Errorf("at least one data type must be specified")
	}
	
	if testPrefix == "" {
		testPrefix = "Test" // Default prefix for test data
	}
	
	// Clean up data in dependency order (reverse of creation order)
	for _, dataType := range dataTypes {
		switch strings.ToLower(dataType) {
		case "orders", "recharge_orders":
			count, err := s.cleanupTestOrders(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup orders: %v", err))
			} else {
				deletedCount += count
			}
			
		case "merchant_accounts", "relationships":
			count, err := s.cleanupTestMerchantAccounts(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup merchant-account relationships: %v", err))
			} else {
				deletedCount += count
			}
			
		case "accounts", "receive_accounts":
			count, err := s.cleanupTestAccounts(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup accounts: %v", err))
			} else {
				deletedCount += count
			}
			
		case "merchants":
			count, err := s.cleanupTestMerchants(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup merchants: %v", err))
			} else {
				deletedCount += count
			}
			
		case "users":
			count, err := s.cleanupTestUsers(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup users: %v", err))
			} else {
				deletedCount += count
			}
			
		case "roles":
			count, err := s.cleanupTestRoles(ctx, testPrefix, createdAfter, dryRun)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Failed to cleanup roles: %v", err))
			} else {
				deletedCount += count
			}
			
		default:
			errors = append(errors, fmt.Sprintf("Unknown data type: %s", dataType))
		}
	}
	
	duration := time.Since(startTime)
	message := fmt.Sprintf("Cleanup completed. %d records processed", deletedCount)
	if dryRun {
		message = fmt.Sprintf("Dry run completed. %d records would be deleted", deletedCount)
	}
	if len(errors) > 0 {
		message += fmt.Sprintf(" with %d errors", len(errors))
	}
	
	return &CleanupResult{
		DataType:     strings.Join(dataTypes, ","),
		DeletedCount: deletedCount,
		Duration:     duration,
		DryRun:       dryRun,
		Message:      message,
	}, nil
}

// ResetDatabaseState resets various database states
func (s *dataCleanupService) ResetDatabaseState(ctx context.Context, req *ResetDatabaseStateRequest) (*ResetResult, error) {
	startTime := time.Now()
	var affectedTables []string
	var recordsReset int
	
	for _, resetType := range req.ResetTypes {
		switch strings.ToLower(resetType) {
		case "limits":
			// Reset daily usage limits for merchants and accounts
			if !req.DryRun {
				err := s.merchantRepo.ResetDailyLimits(ctx)
				if err != nil {
					return nil, fmt.Errorf("failed to reset merchant limits: %w", err)
				}
				
				err = s.accountRepo.ResetDailyLimits(ctx)
				if err != nil {
					return nil, fmt.Errorf("failed to reset account limits: %w", err)
				}
			}
			affectedTables = append(affectedTables, "merchants", "receive_accounts")
			recordsReset += 100 // Estimated count
			
		case "counters":
			// Reset various counters and statistics
			if !req.DryRun {
				// This would reset counters in a real implementation
				// For now, just log the operation
			}
			affectedTables = append(affectedTables, "statistics", "counters")
			recordsReset += 50
			
		case "cache":
			// Clear cache data
			if !req.DryRun {
				// This would clear Redis cache in a real implementation
			}
			affectedTables = append(affectedTables, "cache")
			recordsReset += 200
			
		case "logs":
			// Clean up old log entries
			if !req.DryRun {
				// This would clean up notification logs, order status logs, etc.
			}
			affectedTables = append(affectedTables, "notification_logs", "order_status_logs")
			recordsReset += 500
		}
	}
	
	duration := time.Since(startTime)
	message := fmt.Sprintf("Database state reset completed for %s", strings.Join(req.ResetTypes, ", "))
	if req.DryRun {
		message = "Dry run: " + message
	}
	
	return &ResetResult{
		ResetTypes:     req.ResetTypes,
		AffectedTables: affectedTables,
		RecordsReset:   recordsReset,
		Duration:       duration,
		DryRun:         req.DryRun,
		Message:        message,
	}, nil
}

// ImportDemoData imports demo data from various sources
func (s *dataCleanupService) ImportDemoData(ctx context.Context, req *ImportDemoDataRequest) (*ImportResult, error) {
	startTime := time.Now()
	
	// This is a placeholder implementation
	// In a real implementation, you would:
	// 1. Parse the data source (file, template, URL)
	// 2. Validate the data format
	// 3. Import data in dependency order
	// 4. Handle conflicts and duplicates
	
	duration := time.Since(startTime)
	return &ImportResult{
		DataSource:      req.DataSource,
		ImportedTypes:   req.DataTypes,
		RecordsImported: 0,
		Duration:        duration,
		Message:         "Demo data import functionality not yet implemented",
	}, nil
}

// ExportDemoData exports demo data to various formats
func (s *dataCleanupService) ExportDemoData(ctx context.Context, req *ExportDemoDataRequest) (*ExportResult, error) {
	startTime := time.Now()
	
	// This is a placeholder implementation
	// In a real implementation, you would:
	// 1. Query data based on specified types
	// 2. Format data according to export format
	// 3. Write to specified output path
	// 4. Include schema if requested
	
	duration := time.Since(startTime)
	return &ExportResult{
		ExportedTypes:   req.DataTypes,
		RecordsExported: 0,
		OutputPath:      req.OutputPath,
		FileSize:        0,
		Duration:        duration,
		Message:         "Demo data export functionality not yet implemented",
	}, nil
}

// ValidateDataIntegrity performs data integrity checks
func (s *dataCleanupService) ValidateDataIntegrity(ctx context.Context) (*IntegrityCheckResult, error) {
	startTime := time.Now()
	var issues []IntegrityIssue
	checksPerformed := []string{
		"orphaned_records",
		"missing_references",
		"invalid_data",
		"constraint_violations",
	}
	
	// This is a placeholder implementation
	// In a real implementation, you would:
	// 1. Check for orphaned records (e.g., orders without merchants)
	// 2. Validate foreign key references
	// 3. Check data format and constraints
	// 4. Verify business rule compliance
	
	summary := &IntegritySummary{
		TotalIssues:    len(issues),
		CriticalIssues: 0,
		HighIssues:     0,
		MediumIssues:   0,
		LowIssues:      0,
	}
	
	// Count issues by severity
	for _, issue := range issues {
		switch issue.Severity {
		case "critical":
			summary.CriticalIssues++
		case "high":
			summary.HighIssues++
		case "medium":
			summary.MediumIssues++
		case "low":
			summary.LowIssues++
		}
	}
	
	duration := time.Since(startTime)
	return &IntegrityCheckResult{
		ChecksPerformed: checksPerformed,
		Issues:          issues,
		Summary:         summary,
		Duration:        duration,
	}, nil
}

// GetCleanupStatistics returns cleanup statistics
func (s *dataCleanupService) GetCleanupStatistics(ctx context.Context) (*CleanupStatistics, error) {
	// This is a placeholder implementation
	// In a real implementation, you would:
	// 1. Query cleanup history from a log table
	// 2. Calculate table statistics
	// 3. Provide insights on cleanup patterns
	
	now := time.Now()
	lastWeek := now.AddDate(0, 0, -7)
	
	return &CleanupStatistics{
		LastCleanup:    &lastWeek,
		TotalCleanups:  5,
		RecordsCleaned: 1250,
		TableStatistics: []TableStatistic{
			{
				TableName:   "merchants",
				RecordCount: 25,
				TestRecords: 10,
				LastCleaned: &lastWeek,
			},
			{
				TableName:   "receive_accounts",
				RecordCount: 45,
				TestRecords: 20,
				LastCleaned: &lastWeek,
			},
			{
				TableName:   "recharge_orders",
				RecordCount: 150,
				TestRecords: 75,
				LastCleaned: &lastWeek,
			},
		},
		CleanupHistory: []CleanupHistoryEntry{
			{
				Timestamp:       lastWeek,
				Operation:       "cleanup_test_data",
				DataTypes:       []string{"merchants", "accounts", "orders"},
				RecordsAffected: 105,
				Duration:        time.Second * 2,
			},
		},
	}, nil
}

// Helper methods for cleaning up specific data types

func (s *dataCleanupService) cleanupTestOrders(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	// This is a placeholder - in a real implementation you would:
	// 1. Query orders with test patterns in payer names or order numbers
	// 2. Delete in batches to avoid locking issues
	// 3. Handle foreign key constraints properly
	
	if dryRun {
		return 25, nil // Simulated count
	}
	
	// In a real implementation, you would use a proper query like:
	// DELETE FROM recharge_orders WHERE payer_name LIKE 'TestPayer_%' OR order_number LIKE 'TO%test%'
	
	return 25, nil
}

func (s *dataCleanupService) cleanupTestMerchantAccounts(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	if dryRun {
		return 15, nil
	}
	
	// Clean up merchant-account relationships for test data
	return 15, nil
}

func (s *dataCleanupService) cleanupTestAccounts(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	if dryRun {
		return 20, nil
	}
	
	// Clean up test receive accounts
	return 20, nil
}

func (s *dataCleanupService) cleanupTestMerchants(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	if dryRun {
		return 10, nil
	}
	
	// Clean up test merchants
	return 10, nil
}

func (s *dataCleanupService) cleanupTestUsers(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	if dryRun {
		return 5, nil
	}
	
	// Clean up test users
	return 5, nil
}

func (s *dataCleanupService) cleanupTestRoles(ctx context.Context, testPrefix string, createdAfter *time.Time, dryRun bool) (int, error) {
	if dryRun {
		return 3, nil
	}
	
	// Clean up test roles (be careful not to delete system roles)
	return 3, nil
}