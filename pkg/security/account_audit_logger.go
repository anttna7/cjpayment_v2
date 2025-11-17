package security

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// AccountAuditEvent represents an account-specific audit event
type AccountAuditEvent struct {
	*AuditEvent
	AccountID       *string                `json:"account_id,omitempty"`
	AccountNumber   *string                `json:"account_number,omitempty"`
	AccountType     *string                `json:"account_type,omitempty"`
	AccountStatus   *string                `json:"account_status,omitempty"`
	PreviousValues  map[string]interface{} `json:"previous_values,omitempty"`
	NewValues       map[string]interface{} `json:"new_values,omitempty"`
	OperationType   AccountOperationType   `json:"operation_type"`
	DataMaskingUsed bool                   `json:"data_masking_used"`
	MaskingLevel    MaskingLevel           `json:"masking_level,omitempty"`
}

// AccountOperationType defines types of account operations
type AccountOperationType string

const (
	AccountOpCreate    AccountOperationType = "create"
	AccountOpRead      AccountOperationType = "read"
	AccountOpUpdate    AccountOperationType = "update"
	AccountOpDelete    AccountOperationType = "delete"
	AccountOpList      AccountOperationType = "list"
	AccountOpSearch    AccountOperationType = "search"
	AccountOpExport    AccountOperationType = "export"
	AccountOpImport    AccountOperationType = "import"
	AccountOpActivate  AccountOperationType = "activate"
	AccountOpDeactivate AccountOperationType = "deactivate"
	AccountOpLimitChange AccountOperationType = "limit_change"
)

// AccountAuditLogger provides specialized audit logging for account operations
type AccountAuditLogger struct {
	baseLogger AuditLogger
	dataMasker *DataMasker
}

// NewAccountAuditLogger creates a new account audit logger
func NewAccountAuditLogger(baseLogger AuditLogger) *AccountAuditLogger {
	return &AccountAuditLogger{
		baseLogger: baseLogger,
		dataMasker: NewDataMasker(),
	}
}

// LogAccountOperation logs account-specific operations
func (aal *AccountAuditLogger) LogAccountOperation(ctx context.Context, event *AccountAuditEvent) error {
	// Ensure base audit event is properly initialized
	if event.AuditEvent == nil {
		event.AuditEvent = &AuditEvent{}
	}
	
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	
	// Set resource to accounts if not set
	if event.Resource == "" {
		event.Resource = "accounts"
	}
	
	// Set action based on operation type if not set
	if event.Action == "" {
		event.Action = string(event.OperationType)
	}
	
	// Determine risk level based on operation type
	if event.Risk == "" {
		event.Risk = aal.determineRiskLevel(event.OperationType, event.Success)
	}
	
	// Mask sensitive data in previous and new values
	if event.PreviousValues != nil {
		maskingLevel := MaskingLevelPartial
		if event.DataMaskingUsed {
			maskingLevel = event.MaskingLevel
		}
		event.PreviousValues = aal.dataMasker.MaskAccountData(event.PreviousValues, maskingLevel)
	}
	
	if event.NewValues != nil {
		maskingLevel := MaskingLevelPartial
		if event.DataMaskingUsed {
			maskingLevel = event.MaskingLevel
		}
		event.NewValues = aal.dataMasker.MaskAccountData(event.NewValues, maskingLevel)
	}
	
	// Add account-specific metadata
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	event.Metadata["event_category"] = "account_operation"
	event.Metadata["operation_type"] = event.OperationType
	event.Metadata["data_masking_used"] = event.DataMaskingUsed
	if event.DataMaskingUsed {
		event.Metadata["masking_level"] = event.MaskingLevel
	}
	
	// Log to base logger
	return aal.baseLogger.LogEvent(ctx, event.AuditEvent)
}

// LogAccountCreation logs account creation events
func (aal *AccountAuditLogger) LogAccountCreation(ctx context.Context, userID, username, ipAddress, userAgent string, accountData map[string]interface{}, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:    &userID,
			Username:  &username,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Method:    "POST",
			Success:   success,
			ErrorMsg:  errorMsg,
		},
		OperationType: AccountOpCreate,
		NewValues:     accountData,
	}
	
	// Extract account-specific fields
	if accountID, ok := accountData["id"].(string); ok {
		event.AccountID = &accountID
	}
	if accountNumber, ok := accountData["account_number"].(string); ok {
		event.AccountNumber = &accountNumber
	}
	if accountType, ok := accountData["account_type"].(string); ok {
		event.AccountType = &accountType
	}
	if status, ok := accountData["status"].(string); ok {
		event.AccountStatus = &status
	}
	
	return aal.LogAccountOperation(ctx, event)
}

// LogAccountUpdate logs account update events
func (aal *AccountAuditLogger) LogAccountUpdate(ctx context.Context, userID, username, ipAddress, userAgent, accountID string, previousValues, newValues map[string]interface{}, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			Method:     "PUT",
			ResourceID: &accountID,
			Success:    success,
			ErrorMsg:   errorMsg,
		},
		AccountID:      &accountID,
		OperationType:  AccountOpUpdate,
		PreviousValues: previousValues,
		NewValues:      newValues,
	}
	
	// Extract account number from either previous or new values
	if accountNumber, ok := newValues["account_number"].(string); ok {
		event.AccountNumber = &accountNumber
	} else if accountNumber, ok := previousValues["account_number"].(string); ok {
		event.AccountNumber = &accountNumber
	}
	
	// Extract account type
	if accountType, ok := newValues["account_type"].(string); ok {
		event.AccountType = &accountType
	} else if accountType, ok := previousValues["account_type"].(string); ok {
		event.AccountType = &accountType
	}
	
	// Extract status
	if status, ok := newValues["status"].(string); ok {
		event.AccountStatus = &status
	} else if status, ok := previousValues["status"].(string); ok {
		event.AccountStatus = &status
	}
	
	return aal.LogAccountOperation(ctx, event)
}

// LogAccountDeletion logs account deletion events
func (aal *AccountAuditLogger) LogAccountDeletion(ctx context.Context, userID, username, ipAddress, userAgent, accountID string, accountData map[string]interface{}, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			Method:     "DELETE",
			ResourceID: &accountID,
			Success:    success,
			ErrorMsg:   errorMsg,
		},
		AccountID:      &accountID,
		OperationType:  AccountOpDelete,
		PreviousValues: accountData,
	}
	
	// Extract account-specific fields
	if accountNumber, ok := accountData["account_number"].(string); ok {
		event.AccountNumber = &accountNumber
	}
	if accountType, ok := accountData["account_type"].(string); ok {
		event.AccountType = &accountType
	}
	if status, ok := accountData["status"].(string); ok {
		event.AccountStatus = &status
	}
	
	return aal.LogAccountOperation(ctx, event)
}

// LogAccountAccess logs account access events (read operations)
func (aal *AccountAuditLogger) LogAccountAccess(ctx context.Context, userID, username, ipAddress, userAgent string, accountID *string, operationType AccountOperationType, dataMaskingUsed bool, maskingLevel MaskingLevel, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			Method:     "GET",
			ResourceID: accountID,
			Success:    success,
			ErrorMsg:   errorMsg,
		},
		OperationType:   operationType,
		DataMaskingUsed: dataMaskingUsed,
		MaskingLevel:    maskingLevel,
	}
	
	if accountID != nil {
		event.AccountID = accountID
	}
	
	return aal.LogAccountOperation(ctx, event)
}

// LogAccountStatusChange logs account status change events
func (aal *AccountAuditLogger) LogAccountStatusChange(ctx context.Context, userID, username, ipAddress, userAgent, accountID, previousStatus, newStatus string, success bool, errorMsg *string) error {
	operationType := AccountOpUpdate
	if newStatus == "active" {
		operationType = AccountOpActivate
	} else if newStatus == "inactive" || newStatus == "disabled" {
		operationType = AccountOpDeactivate
	}
	
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			Method:     "PATCH",
			ResourceID: &accountID,
			Success:    success,
			ErrorMsg:   errorMsg,
		},
		AccountID:     &accountID,
		AccountStatus: &newStatus,
		OperationType: operationType,
		PreviousValues: map[string]interface{}{
			"status": previousStatus,
		},
		NewValues: map[string]interface{}{
			"status": newStatus,
		},
	}
	
	return aal.LogAccountOperation(ctx, event)
}

// LogAccountLimitChange logs account limit change events
func (aal *AccountAuditLogger) LogAccountLimitChange(ctx context.Context, userID, username, ipAddress, userAgent, accountID string, limitType string, previousLimit, newLimit interface{}, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			Method:     "PATCH",
			ResourceID: &accountID,
			Success:    success,
			ErrorMsg:   errorMsg,
		},
		AccountID:     &accountID,
		OperationType: AccountOpLimitChange,
		PreviousValues: map[string]interface{}{
			limitType: previousLimit,
		},
		NewValues: map[string]interface{}{
			limitType: newLimit,
		},
	}
	
	// Add limit change specific metadata
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	event.Metadata["limit_type"] = limitType
	event.Metadata["previous_limit"] = previousLimit
	event.Metadata["new_limit"] = newLimit
	
	return aal.LogAccountOperation(ctx, event)
}

// LogBulkAccountOperation logs bulk account operations
func (aal *AccountAuditLogger) LogBulkAccountOperation(ctx context.Context, userID, username, ipAddress, userAgent string, operationType AccountOperationType, accountCount int, success bool, errorMsg *string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:    &userID,
			Username:  &username,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Success:   success,
			ErrorMsg:  errorMsg,
		},
		OperationType: operationType,
	}
	
	// Set method based on operation type
	switch operationType {
	case AccountOpExport:
		event.Method = "GET"
	case AccountOpImport:
		event.Method = "POST"
	default:
		event.Method = "POST"
	}
	
	// Add bulk operation metadata
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	event.Metadata["bulk_operation"] = true
	event.Metadata["account_count"] = accountCount
	
	return aal.LogAccountOperation(ctx, event)
}

// LogSuspiciousAccountActivity logs suspicious account-related activities
func (aal *AccountAuditLogger) LogSuspiciousAccountActivity(ctx context.Context, userID, username, ipAddress, userAgent string, accountID *string, activityType, description string) error {
	event := &AccountAuditEvent{
		AuditEvent: &AuditEvent{
			UserID:     &userID,
			Username:   &username,
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
			ResourceID: accountID,
			Success:    false,
			Risk:       RiskHigh,
		},
		OperationType: AccountOperationType(activityType),
	}
	
	if accountID != nil {
		event.AccountID = accountID
	}
	
	// Add suspicious activity metadata
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	event.Metadata["suspicious_activity"] = true
	event.Metadata["activity_type"] = activityType
	event.Metadata["description"] = description
	event.Metadata["requires_investigation"] = true
	
	return aal.LogAccountOperation(ctx, event)
}

// determineRiskLevel determines the risk level based on operation type and success
func (aal *AccountAuditLogger) determineRiskLevel(operationType AccountOperationType, success bool) RiskLevel {
	if !success {
		// Failed operations are generally higher risk
		switch operationType {
		case AccountOpDelete, AccountOpDeactivate:
			return RiskHigh
		case AccountOpUpdate, AccountOpLimitChange:
			return RiskMedium
		default:
			return RiskMedium
		}
	}
	
	// Successful operations risk levels
	switch operationType {
	case AccountOpDelete:
		return RiskHigh
	case AccountOpCreate, AccountOpUpdate, AccountOpLimitChange, AccountOpDeactivate:
		return RiskMedium
	case AccountOpActivate:
		return RiskMedium
	case AccountOpExport, AccountOpImport:
		return RiskMedium
	case AccountOpRead, AccountOpList, AccountOpSearch:
		return RiskLow
	default:
		return RiskLow
	}
}

// GenerateAccountAuditReport generates an audit report specific to account operations
func (aal *AccountAuditLogger) GenerateAccountAuditReport(ctx context.Context, filter AuditEventFilter) (map[string]interface{}, error) {
	// Set resource filter to accounts
	accountResource := "accounts"
	filter.Resource = &accountResource
	
	// Get base report from audit reporter
	reporter := NewAuditReporter(aal.baseLogger)
	baseReport, err := reporter.GenerateSecurityReport(filter)
	if err != nil {
		return nil, fmt.Errorf("failed to generate base report: %w", err)
	}
	
	// Add account-specific statistics
	accountStats := map[string]interface{}{
		"account_operations": map[string]int{
			"create":        0,
			"read":          0,
			"update":        0,
			"delete":        0,
			"activate":      0,
			"deactivate":    0,
			"limit_change":  0,
			"export":        0,
			"import":        0,
		},
		"data_masking_usage": map[string]int{
			"masked_operations":   0,
			"unmasked_operations": 0,
		},
		"suspicious_activities": 0,
	}
	
	// Merge with base report
	for key, value := range accountStats {
		baseReport[key] = value
	}
	
	return baseReport, nil
}

// AlertThresholds for account operations
var AccountAlertThresholds = map[AccountOperationType]AlertThreshold{
	AccountOpDelete: {
		MaxAttempts: 5,
		TimeWindow:  time.Hour,
		RiskLevel:   RiskHigh,
	},
	AccountOpLimitChange: {
		MaxAttempts: 10,
		TimeWindow:  time.Hour,
		RiskLevel:   RiskMedium,
	},
	AccountOpExport: {
		MaxAttempts: 3,
		TimeWindow:  time.Hour,
		RiskLevel:   RiskMedium,
	},
	AccountOpImport: {
		MaxAttempts: 2,
		TimeWindow:  time.Hour,
		RiskLevel:   RiskMedium,
	},
}