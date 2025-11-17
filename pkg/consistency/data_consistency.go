package consistency

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/shopspring/decimal"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/company/cjpayment/internal/repository"
	"github.com/company/cjpayment/pkg/errors"
)

// ConsistencyChecker manages data consistency checks and repairs
type ConsistencyChecker struct {
	db       *gorm.DB
	logger   *logrus.Logger
	config   *ConsistencyConfig
	checks   map[string]ConsistencyCheck
	mu       sync.RWMutex
	running  bool
	stopCh   chan struct{}
}

// ConsistencyConfig holds consistency check configuration
type ConsistencyConfig struct {
	CheckInterval    time.Duration `yaml:"check_interval"`
	EnableAutoRepair bool          `yaml:"enable_auto_repair"`
	MaxRepairRetries int           `yaml:"max_repair_retries"`
	AlertOnFailure   bool          `yaml:"alert_on_failure"`
}

// ConsistencyCheck represents a data consistency check
type ConsistencyCheck struct {
	Name        string
	Description string
	CheckFunc   func(ctx context.Context) (*ConsistencyResult, error)
	RepairFunc  func(ctx context.Context, issues []ConsistencyIssue) error
	Enabled     bool
	LastRun     time.Time
	Schedule    string // cron-like schedule
}

// ConsistencyResult represents the result of a consistency check
type ConsistencyResult struct {
	CheckName   string              `json:"check_name"`
	Status      string              `json:"status"` // "pass", "fail", "warning"
	Issues      []ConsistencyIssue  `json:"issues"`
	Summary     string              `json:"summary"`
	Timestamp   time.Time           `json:"timestamp"`
	Duration    time.Duration       `json:"duration"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ConsistencyIssue represents a data consistency issue
type ConsistencyIssue struct {
	Type        string                 `json:"type"`
	Severity    string                 `json:"severity"` // "critical", "high", "medium", "low"
	Description string                 `json:"description"`
	TableName   string                 `json:"table_name,omitempty"`
	RecordID    interface{}            `json:"record_id,omitempty"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Repairable  bool                   `json:"repairable"`
}

// NewConsistencyChecker creates a new consistency checker
func NewConsistencyChecker(db *gorm.DB, logger *logrus.Logger, config *ConsistencyConfig) *ConsistencyChecker {
	if config == nil {
		config = &ConsistencyConfig{
			CheckInterval:    1 * time.Hour,
			EnableAutoRepair: false,
			MaxRepairRetries: 3,
			AlertOnFailure:   true,
		}
	}

	cc := &ConsistencyChecker{
		db:     db,
		logger: logger,
		config: config,
		checks: make(map[string]ConsistencyCheck),
		stopCh: make(chan struct{}),
	}

	// Register default consistency checks
	cc.registerDefaultChecks()

	return cc
}

// Start starts the consistency checker
func (cc *ConsistencyChecker) Start(ctx context.Context) error {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	if cc.running {
		return fmt.Errorf("consistency checker is already running")
	}

	cc.running = true
	go cc.runPeriodicChecks(ctx)

	cc.logger.Info("Consistency checker started")
	return nil
}

// Stop stops the consistency checker
func (cc *ConsistencyChecker) Stop() error {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	if !cc.running {
		return fmt.Errorf("consistency checker is not running")
	}

	close(cc.stopCh)
	cc.running = false

	cc.logger.Info("Consistency checker stopped")
	return nil
}

// RegisterCheck registers a new consistency check
func (cc *ConsistencyChecker) RegisterCheck(check ConsistencyCheck) {
	cc.mu.Lock()
	defer cc.mu.Unlock()

	cc.checks[check.Name] = check
	cc.logger.WithField("check_name", check.Name).Info("Consistency check registered")
}

// RunCheck runs a specific consistency check
func (cc *ConsistencyChecker) RunCheck(ctx context.Context, checkName string) (*ConsistencyResult, error) {
	cc.mu.RLock()
	check, exists := cc.checks[checkName]
	cc.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("consistency check '%s' not found", checkName)
	}

	if !check.Enabled {
		return nil, fmt.Errorf("consistency check '%s' is disabled", checkName)
	}

	return cc.executeCheck(ctx, check)
}

// RunAllChecks runs all enabled consistency checks
func (cc *ConsistencyChecker) RunAllChecks(ctx context.Context) ([]*ConsistencyResult, error) {
	cc.mu.RLock()
	checks := make([]ConsistencyCheck, 0, len(cc.checks))
	for _, check := range cc.checks {
		if check.Enabled {
			checks = append(checks, check)
		}
	}
	cc.mu.RUnlock()

	var results []*ConsistencyResult
	var wg sync.WaitGroup
	resultsCh := make(chan *ConsistencyResult, len(checks))
	errorsCh := make(chan error, len(checks))

	for _, check := range checks {
		wg.Add(1)
		go func(c ConsistencyCheck) {
			defer wg.Done()
			result, err := cc.executeCheck(ctx, c)
			if err != nil {
				errorsCh <- err
				return
			}
			resultsCh <- result
		}(check)
	}

	wg.Wait()
	close(resultsCh)
	close(errorsCh)

	// Collect results
	for result := range resultsCh {
		results = append(results, result)
	}

	// Check for errors
	var errs []error
	for err := range errorsCh {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		return results, fmt.Errorf("some consistency checks failed: %v", errs)
	}

	return results, nil
}

// executeCheck executes a single consistency check
func (cc *ConsistencyChecker) executeCheck(ctx context.Context, check ConsistencyCheck) (*ConsistencyResult, error) {
	start := time.Now()
	
	cc.logger.WithField("check_name", check.Name).Info("Running consistency check")

	result, err := check.CheckFunc(ctx)
	if err != nil {
		cc.logger.WithFields(logrus.Fields{
			"check_name": check.Name,
			"error":      err,
		}).Error("Consistency check failed")
		return nil, err
	}

	result.Duration = time.Since(start)
	result.Timestamp = time.Now()

	// Update last run time
	cc.mu.Lock()
	check.LastRun = time.Now()
	cc.checks[check.Name] = check
	cc.mu.Unlock()

	// Log results
	cc.logger.WithFields(logrus.Fields{
		"check_name":   check.Name,
		"status":       result.Status,
		"issues_count": len(result.Issues),
		"duration":     result.Duration,
	}).Info("Consistency check completed")

	// Attempt auto-repair if enabled and issues found
	if cc.config.EnableAutoRepair && len(result.Issues) > 0 && check.RepairFunc != nil {
		cc.attemptRepair(ctx, check, result.Issues)
	}

	return result, nil
}

// attemptRepair attempts to repair consistency issues
func (cc *ConsistencyChecker) attemptRepair(ctx context.Context, check ConsistencyCheck, issues []ConsistencyIssue) {
	repairableIssues := make([]ConsistencyIssue, 0)
	for _, issue := range issues {
		if issue.Repairable {
			repairableIssues = append(repairableIssues, issue)
		}
	}

	if len(repairableIssues) == 0 {
		return
	}

	cc.logger.WithFields(logrus.Fields{
		"check_name":        check.Name,
		"repairable_issues": len(repairableIssues),
	}).Info("Attempting to repair consistency issues")

	for attempt := 1; attempt <= cc.config.MaxRepairRetries; attempt++ {
		err := check.RepairFunc(ctx, repairableIssues)
		if err == nil {
			cc.logger.WithFields(logrus.Fields{
				"check_name": check.Name,
				"attempt":    attempt,
			}).Info("Consistency issues repaired successfully")
			return
		}

		cc.logger.WithFields(logrus.Fields{
			"check_name": check.Name,
			"attempt":    attempt,
			"error":      err,
		}).Warn("Repair attempt failed")

		if attempt < cc.config.MaxRepairRetries {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}

	cc.logger.WithField("check_name", check.Name).Error("All repair attempts failed")
}

// runPeriodicChecks runs consistency checks periodically
func (cc *ConsistencyChecker) runPeriodicChecks(ctx context.Context) {
	ticker := time.NewTicker(cc.config.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-cc.stopCh:
			return
		case <-ticker.C:
			results, err := cc.RunAllChecks(ctx)
			if err != nil {
				cc.logger.WithError(err).Error("Periodic consistency check failed")
			} else {
				cc.logPeriodicResults(results)
			}
		}
	}
}

// logPeriodicResults logs the results of periodic checks
func (cc *ConsistencyChecker) logPeriodicResults(results []*ConsistencyResult) {
	totalIssues := 0
	criticalIssues := 0
	
	for _, result := range results {
		totalIssues += len(result.Issues)
		for _, issue := range result.Issues {
			if issue.Severity == "critical" {
				criticalIssues++
			}
		}
	}

	cc.logger.WithFields(logrus.Fields{
		"checks_run":      len(results),
		"total_issues":    totalIssues,
		"critical_issues": criticalIssues,
	}).Info("Periodic consistency check completed")
}

// registerDefaultChecks registers default consistency checks
func (cc *ConsistencyChecker) registerDefaultChecks() {
	// Merchant-Account binding consistency
	cc.RegisterCheck(ConsistencyCheck{
		Name:        "merchant_account_binding",
		Description: "Check merchant-account binding consistency",
		Enabled:     true,
		CheckFunc:   cc.checkMerchantAccountBinding,
		RepairFunc:  cc.repairMerchantAccountBinding,
	})

	// Order-Account consistency
	cc.RegisterCheck(ConsistencyCheck{
		Name:        "order_account_consistency",
		Description: "Check order-account relationship consistency",
		Enabled:     true,
		CheckFunc:   cc.checkOrderAccountConsistency,
		RepairFunc:  cc.repairOrderAccountConsistency,
	})

	// Order status consistency
	cc.RegisterCheck(ConsistencyCheck{
		Name:        "order_status_consistency",
		Description: "Check order status transition consistency",
		Enabled:     true,
		CheckFunc:   cc.checkOrderStatusConsistency,
		RepairFunc:  cc.repairOrderStatusConsistency,
	})

	// Account limit consistency
	cc.RegisterCheck(ConsistencyCheck{
		Name:        "account_limit_consistency",
		Description: "Check account daily limit consistency",
		Enabled:     true,
		CheckFunc:   cc.checkAccountLimitConsistency,
		RepairFunc:  cc.repairAccountLimitConsistency,
	})
}

// checkMerchantAccountBinding checks merchant-account binding consistency
func (cc *ConsistencyChecker) checkMerchantAccountBinding(ctx context.Context) (*ConsistencyResult, error) {
	result := &ConsistencyResult{
		CheckName: "merchant_account_binding",
		Status:    "pass",
		Issues:    make([]ConsistencyIssue, 0),
	}

	// Check for orphaned merchant_accounts records
	var orphanedBindings []struct {
		ID         uint
		MerchantID uint
		AccountID  uint
	}

	err := cc.db.WithContext(ctx).Raw(`
		SELECT ma.id, ma.merchant_id, ma.receive_account_id as account_id
		FROM merchant_accounts ma
		LEFT JOIN merchants m ON ma.merchant_id = m.id
		LEFT JOIN receive_accounts ra ON ma.receive_account_id = ra.id
		WHERE m.id IS NULL OR ra.id IS NULL
	`).Scan(&orphanedBindings).Error

	if err != nil {
		return nil, err
	}

	for _, binding := range orphanedBindings {
		result.Issues = append(result.Issues, ConsistencyIssue{
			Type:        "orphaned_binding",
			Severity:    "high",
			Description: fmt.Sprintf("Merchant account binding %d references non-existent merchant %d or account %d", binding.ID, binding.MerchantID, binding.AccountID),
			TableName:   "merchant_accounts",
			RecordID:    binding.ID,
			Repairable:  true,
		})
	}

	if len(result.Issues) > 0 {
		result.Status = "fail"
		result.Summary = fmt.Sprintf("Found %d orphaned merchant-account bindings", len(result.Issues))
	} else {
		result.Summary = "All merchant-account bindings are consistent"
	}

	return result, nil
}

// repairMerchantAccountBinding repairs merchant-account binding issues
func (cc *ConsistencyChecker) repairMerchantAccountBinding(ctx context.Context, issues []ConsistencyIssue) error {
	for _, issue := range issues {
		if issue.Type == "orphaned_binding" {
			err := cc.db.WithContext(ctx).Delete(&repository.MerchantAccount{}, issue.RecordID).Error
			if err != nil {
				return fmt.Errorf("failed to delete orphaned binding %v: %w", issue.RecordID, err)
			}
			cc.logger.WithField("binding_id", issue.RecordID).Info("Deleted orphaned merchant-account binding")
		}
	}
	return nil
}

// checkOrderAccountConsistency checks order-account relationship consistency
func (cc *ConsistencyChecker) checkOrderAccountConsistency(ctx context.Context) (*ConsistencyResult, error) {
	result := &ConsistencyResult{
		CheckName: "order_account_consistency",
		Status:    "pass",
		Issues:    make([]ConsistencyIssue, 0),
	}

	// Check for orders with invalid account references
	var invalidOrders []struct {
		ID        uint
		OrderNo   string
		AccountID uint
	}

	err := cc.db.WithContext(ctx).Raw(`
		SELECT ro.id, ro.order_no, ro.receive_account_id as account_id
		FROM recharge_orders ro
		LEFT JOIN receive_accounts ra ON ro.receive_account_id = ra.id
		WHERE ro.receive_account_id IS NOT NULL AND ra.id IS NULL
	`).Scan(&invalidOrders).Error

	if err != nil {
		return nil, err
	}

	for _, order := range invalidOrders {
		result.Issues = append(result.Issues, ConsistencyIssue{
			Type:        "invalid_account_reference",
			Severity:    "high",
			Description: fmt.Sprintf("Order %s references non-existent account %d", order.OrderNo, order.AccountID),
			TableName:   "recharge_orders",
			RecordID:    order.ID,
			Repairable:  true,
		})
	}

	if len(result.Issues) > 0 {
		result.Status = "fail"
		result.Summary = fmt.Sprintf("Found %d orders with invalid account references", len(result.Issues))
	} else {
		result.Summary = "All order-account relationships are consistent"
	}

	return result, nil
}

// repairOrderAccountConsistency repairs order-account consistency issues
func (cc *ConsistencyChecker) repairOrderAccountConsistency(ctx context.Context, issues []ConsistencyIssue) error {
	for _, issue := range issues {
		if issue.Type == "invalid_account_reference" {
			// Set account reference to NULL for invalid references
			err := cc.db.WithContext(ctx).Model(&repository.RechargeOrder{}).
				Where("id = ?", issue.RecordID).
				Update("receive_account_id", nil).Error
			if err != nil {
				return fmt.Errorf("failed to clear invalid account reference for order %v: %w", issue.RecordID, err)
			}
			cc.logger.WithField("order_id", issue.RecordID).Info("Cleared invalid account reference")
		}
	}
	return nil
}

// checkOrderStatusConsistency checks order status transition consistency
func (cc *ConsistencyChecker) checkOrderStatusConsistency(ctx context.Context) (*ConsistencyResult, error) {
	result := &ConsistencyResult{
		CheckName: "order_status_consistency",
		Status:    "pass",
		Issues:    make([]ConsistencyIssue, 0),
	}

	// Check for orders with invalid status transitions
	var invalidStatusOrders []struct {
		ID      uint
		OrderNo string
		Status  string
	}

	err := cc.db.WithContext(ctx).Raw(`
		SELECT id, order_no, status
		FROM recharge_orders
		WHERE status NOT IN ('pending', 'paid', 'confirmed', 'completed', 'cancelled', 'expired')
	`).Scan(&invalidStatusOrders).Error

	if err != nil {
		return nil, err
	}

	for _, order := range invalidStatusOrders {
		result.Issues = append(result.Issues, ConsistencyIssue{
			Type:        "invalid_status",
			Severity:    "medium",
			Description: fmt.Sprintf("Order %s has invalid status: %s", order.OrderNo, order.Status),
			TableName:   "recharge_orders",
			RecordID:    order.ID,
			Repairable:  true,
		})
	}

	if len(result.Issues) > 0 {
		result.Status = "fail"
		result.Summary = fmt.Sprintf("Found %d orders with invalid status", len(result.Issues))
	} else {
		result.Summary = "All order statuses are consistent"
	}

	return result, nil
}

// repairOrderStatusConsistency repairs order status consistency issues
func (cc *ConsistencyChecker) repairOrderStatusConsistency(ctx context.Context, issues []ConsistencyIssue) error {
	for _, issue := range issues {
		if issue.Type == "invalid_status" {
			// Reset to pending status for invalid statuses
			err := cc.db.WithContext(ctx).Model(&repository.RechargeOrder{}).
				Where("id = ?", issue.RecordID).
				Update("status", "pending").Error
			if err != nil {
				return fmt.Errorf("failed to reset status for order %v: %w", issue.RecordID, err)
			}
			cc.logger.WithField("order_id", issue.RecordID).Info("Reset invalid order status to pending")
		}
	}
	return nil
}

// checkAccountLimitConsistency checks account daily limit consistency
func (cc *ConsistencyChecker) checkAccountLimitConsistency(ctx context.Context) (*ConsistencyResult, error) {
	result := &ConsistencyResult{
		CheckName: "account_limit_consistency",
		Status:    "pass",
		Issues:    make([]ConsistencyIssue, 0),
	}

	// Check for accounts with inconsistent daily limits
	var inconsistentAccounts []struct {
		ID          uint
		AccountName string
		DailyLimit  decimal.Decimal
		UsedAmount  decimal.Decimal
	}

	today := time.Now().Format("2006-01-02")
	err := cc.db.WithContext(ctx).Raw(`
		SELECT 
			ra.id,
			ra.account_name,
			ra.daily_limit,
			COALESCE(SUM(ro.amount), 0) as used_amount
		FROM receive_accounts ra
		LEFT JOIN recharge_orders ro ON ra.id = ro.receive_account_id 
			AND DATE(ro.created_at) = ? 
			AND ro.status IN ('paid', 'confirmed', 'completed')
		GROUP BY ra.id, ra.account_name, ra.daily_limit
		HAVING ra.daily_limit > 0 AND used_amount > ra.daily_limit
	`, today).Scan(&inconsistentAccounts).Error

	if err != nil {
		return nil, err
	}

	for _, account := range inconsistentAccounts {
		result.Issues = append(result.Issues, ConsistencyIssue{
			Type:        "limit_exceeded",
			Severity:    "high",
			Description: fmt.Sprintf("Account %s has exceeded daily limit: used %s, limit %s", account.AccountName, account.UsedAmount, account.DailyLimit),
			TableName:   "receive_accounts",
			RecordID:    account.ID,
			Details: map[string]interface{}{
				"daily_limit": account.DailyLimit,
				"used_amount": account.UsedAmount,
			},
			Repairable: false, // This requires manual intervention
		})
	}

	if len(result.Issues) > 0 {
		result.Status = "fail"
		result.Summary = fmt.Sprintf("Found %d accounts with exceeded daily limits", len(result.Issues))
	} else {
		result.Summary = "All account daily limits are consistent"
	}

	return result, nil
}

// repairAccountLimitConsistency repairs account limit consistency issues
func (cc *ConsistencyChecker) repairAccountLimitConsistency(ctx context.Context, issues []ConsistencyIssue) error {
	// Account limit issues typically require manual intervention
	// Log the issues for manual review
	for _, issue := range issues {
		cc.logger.WithFields(logrus.Fields{
			"account_id":   issue.RecordID,
			"description":  issue.Description,
			"details":      issue.Details,
		}).Warn("Account limit consistency issue requires manual review")
	}
	return nil
}