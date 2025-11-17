package security

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestAccountAuditLogger_LogAccountCreation(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	
	accountData := map[string]interface{}{
		"id":             uuid.New().String(),
		"account_number": "1234567890123456",
		"account_type":   "bank",
		"status":         "active",
		"account_holder": "John Doe",
	}
	
	err := accountLogger.LogAccountCreation(ctx, userID, username, ipAddress, userAgent, accountData, true, nil)
	if err != nil {
		t.Errorf("LogAccountCreation failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "create" {
		t.Errorf("Expected action 'create', got '%s'", event.Action)
	}
	
	if event.Resource != "accounts" {
		t.Errorf("Expected resource 'accounts', got '%s'", event.Resource)
	}
	
	if !event.Success {
		t.Errorf("Expected success to be true")
	}
	
	if event.Risk != RiskMedium {
		t.Errorf("Expected risk level 'medium', got '%s'", event.Risk)
	}
}

func TestAccountAuditLogger_LogAccountUpdate(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	previousValues := map[string]interface{}{
		"account_holder": "John Doe",
		"status":         "active",
	}
	
	newValues := map[string]interface{}{
		"account_holder": "John Smith",
		"status":         "active",
	}
	
	err := accountLogger.LogAccountUpdate(ctx, userID, username, ipAddress, userAgent, accountID, previousValues, newValues, true, nil)
	if err != nil {
		t.Errorf("LogAccountUpdate failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "update" {
		t.Errorf("Expected action 'update', got '%s'", event.Action)
	}
	
	if event.Method != "PUT" {
		t.Errorf("Expected method 'PUT', got '%s'", event.Method)
	}
	
	if event.ResourceID == nil || *event.ResourceID != accountID {
		t.Errorf("Expected resource ID '%s', got '%v'", accountID, event.ResourceID)
	}
}

func TestAccountAuditLogger_LogAccountDeletion(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	accountData := map[string]interface{}{
		"id":             accountID,
		"account_number": "1234567890123456",
		"account_type":   "bank",
		"status":         "active",
		"account_holder": "John Doe",
	}
	
	err := accountLogger.LogAccountDeletion(ctx, userID, username, ipAddress, userAgent, accountID, accountData, true, nil)
	if err != nil {
		t.Errorf("LogAccountDeletion failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "delete" {
		t.Errorf("Expected action 'delete', got '%s'", event.Action)
	}
	
	if event.Risk != RiskHigh {
		t.Errorf("Expected risk level 'high', got '%s'", event.Risk)
	}
	
	if event.Method != "DELETE" {
		t.Errorf("Expected method 'DELETE', got '%s'", event.Method)
	}
}

func TestAccountAuditLogger_LogAccountAccess(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	err := accountLogger.LogAccountAccess(ctx, userID, username, ipAddress, userAgent, &accountID, AccountOpRead, true, MaskingLevelPartial, true, nil)
	if err != nil {
		t.Errorf("LogAccountAccess failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "read" {
		t.Errorf("Expected action 'read', got '%s'", event.Action)
	}
	
	if event.Risk != RiskLow {
		t.Errorf("Expected risk level 'low', got '%s'", event.Risk)
	}
	
	// Check metadata for data masking information
	if event.Metadata == nil {
		t.Errorf("Expected metadata to be set")
	} else {
		if dataMaskingUsed, ok := event.Metadata["data_masking_used"].(bool); !ok || !dataMaskingUsed {
			t.Errorf("Expected data_masking_used to be true")
		}
		
		if maskingLevel, ok := event.Metadata["masking_level"].(MaskingLevel); !ok || maskingLevel != MaskingLevelPartial {
			t.Errorf("Expected masking_level to be 'partial', got '%v'", maskingLevel)
		}
	}
}

func TestAccountAuditLogger_LogAccountStatusChange(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	err := accountLogger.LogAccountStatusChange(ctx, userID, username, ipAddress, userAgent, accountID, "active", "inactive", true, nil)
	if err != nil {
		t.Errorf("LogAccountStatusChange failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "deactivate" {
		t.Errorf("Expected action 'deactivate', got '%s'", event.Action)
	}
	
	if event.Method != "PATCH" {
		t.Errorf("Expected method 'PATCH', got '%s'", event.Method)
	}
	
	// Check that previous and new values are set
	if event.Metadata == nil {
		t.Errorf("Expected metadata to be set")
	} else {
		if operationType, ok := event.Metadata["operation_type"].(AccountOperationType); !ok || operationType != AccountOpDeactivate {
			t.Errorf("Expected operation_type to be 'deactivate', got '%v'", operationType)
		}
	}
}

func TestAccountAuditLogger_LogAccountLimitChange(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	err := accountLogger.LogAccountLimitChange(ctx, userID, username, ipAddress, userAgent, accountID, "daily_limit", "10000.00", "15000.00", true, nil)
	if err != nil {
		t.Errorf("LogAccountLimitChange failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "limit_change" {
		t.Errorf("Expected action 'limit_change', got '%s'", event.Action)
	}
	
	if event.Risk != RiskMedium {
		t.Errorf("Expected risk level 'medium', got '%s'", event.Risk)
	}
	
	// Check limit change metadata
	if event.Metadata == nil {
		t.Errorf("Expected metadata to be set")
	} else {
		if limitType, ok := event.Metadata["limit_type"].(string); !ok || limitType != "daily_limit" {
			t.Errorf("Expected limit_type to be 'daily_limit', got '%v'", limitType)
		}
		
		if previousLimit, ok := event.Metadata["previous_limit"].(string); !ok || previousLimit != "10000.00" {
			t.Errorf("Expected previous_limit to be '10000.00', got '%v'", previousLimit)
		}
		
		if newLimit, ok := event.Metadata["new_limit"].(string); !ok || newLimit != "15000.00" {
			t.Errorf("Expected new_limit to be '15000.00', got '%v'", newLimit)
		}
	}
}

func TestAccountAuditLogger_LogBulkAccountOperation(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	
	err := accountLogger.LogBulkAccountOperation(ctx, userID, username, ipAddress, userAgent, AccountOpExport, 100, true, nil)
	if err != nil {
		t.Errorf("LogBulkAccountOperation failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "export" {
		t.Errorf("Expected action 'export', got '%s'", event.Action)
	}
	
	if event.Method != "GET" {
		t.Errorf("Expected method 'GET', got '%s'", event.Method)
	}
	
	// Check bulk operation metadata
	if event.Metadata == nil {
		t.Errorf("Expected metadata to be set")
	} else {
		if bulkOp, ok := event.Metadata["bulk_operation"].(bool); !ok || !bulkOp {
			t.Errorf("Expected bulk_operation to be true")
		}
		
		if accountCount, ok := event.Metadata["account_count"].(int); !ok || accountCount != 100 {
			t.Errorf("Expected account_count to be 100, got %v", accountCount)
		}
	}
}

func TestAccountAuditLogger_LogSuspiciousAccountActivity(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	err := accountLogger.LogSuspiciousAccountActivity(ctx, userID, username, ipAddress, userAgent, &accountID, "unusual_access_pattern", "Multiple failed access attempts from different IPs")
	if err != nil {
		t.Errorf("LogSuspiciousAccountActivity failed: %v", err)
	}
	
	// Verify event was logged
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "unusual_access_pattern" {
		t.Errorf("Expected action 'unusual_access_pattern', got '%s'", event.Action)
	}
	
	if event.Risk != RiskHigh {
		t.Errorf("Expected risk level 'high', got '%s'", event.Risk)
	}
	
	if event.Success {
		t.Errorf("Expected success to be false for suspicious activity")
	}
	
	// Check suspicious activity metadata
	if event.Metadata == nil {
		t.Errorf("Expected metadata to be set")
	} else {
		if suspicious, ok := event.Metadata["suspicious_activity"].(bool); !ok || !suspicious {
			t.Errorf("Expected suspicious_activity to be true")
		}
		
		if requiresInvestigation, ok := event.Metadata["requires_investigation"].(bool); !ok || !requiresInvestigation {
			t.Errorf("Expected requires_investigation to be true")
		}
		
		if description, ok := event.Metadata["description"].(string); !ok || description != "Multiple failed access attempts from different IPs" {
			t.Errorf("Expected correct description, got '%v'", description)
		}
	}
}

func TestAccountAuditLogger_DetermineRiskLevel(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	tests := []struct {
		name          string
		operationType AccountOperationType
		success       bool
		expectedRisk  RiskLevel
	}{
		{
			name:          "successful delete operation",
			operationType: AccountOpDelete,
			success:       true,
			expectedRisk:  RiskHigh,
		},
		{
			name:          "failed delete operation",
			operationType: AccountOpDelete,
			success:       false,
			expectedRisk:  RiskHigh,
		},
		{
			name:          "successful create operation",
			operationType: AccountOpCreate,
			success:       true,
			expectedRisk:  RiskMedium,
		},
		{
			name:          "failed create operation",
			operationType: AccountOpCreate,
			success:       false,
			expectedRisk:  RiskMedium,
		},
		{
			name:          "successful read operation",
			operationType: AccountOpRead,
			success:       true,
			expectedRisk:  RiskLow,
		},
		{
			name:          "failed read operation",
			operationType: AccountOpRead,
			success:       false,
			expectedRisk:  RiskMedium,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			risk := accountLogger.determineRiskLevel(tt.operationType, tt.success)
			if risk != tt.expectedRisk {
				t.Errorf("determineRiskLevel() = %v, want %v", risk, tt.expectedRisk)
			}
		})
	}
}

func TestAccountAuditLogger_DataMasking(t *testing.T) {
	baseLogger := NewDatabaseAuditLogger()
	accountLogger := NewAccountAuditLogger(baseLogger)
	
	ctx := context.Background()
	userID := uuid.New().String()
	username := "testuser"
	ipAddress := "192.168.1.1"
	userAgent := "test-agent"
	accountID := uuid.New().String()
	
	// Test with sensitive data that should be masked
	previousValues := map[string]interface{}{
		"account_number": "1234567890123456",
		"account_holder": "John Doe",
		"contact_phone":  "123-456-7890",
	}
	
	newValues := map[string]interface{}{
		"account_number": "1234567890123456",
		"account_holder": "John Smith",
		"contact_phone":  "123-456-7890",
	}
	
	err := accountLogger.LogAccountUpdate(ctx, userID, username, ipAddress, userAgent, accountID, previousValues, newValues, true, nil)
	if err != nil {
		t.Errorf("LogAccountUpdate failed: %v", err)
	}
	
	// Verify event was logged and data was masked
	events := baseLogger.GetEvents()
	if len(events) != 1 {
		t.Errorf("Expected 1 event, got %d", len(events))
	}
	
	// Note: The actual masking verification would depend on the specific implementation
	// and how the audit event stores the masked data. This is a placeholder for such verification.
}