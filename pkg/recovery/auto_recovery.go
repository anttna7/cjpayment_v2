package recovery

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/company/cjpayment/pkg/errors"
	"github.com/company/cjpayment/pkg/monitoring"
)

// RecoveryManager manages system fault recovery
type RecoveryManager struct {
	db           *gorm.DB
	redis        *redis.Client
	logger       *logrus.Logger
	config       *RecoveryConfig
	healthChecks map[string]HealthCheck
	mu           sync.RWMutex
	running      bool
	stopCh       chan struct{}
}

// RecoveryConfig holds recovery configuration
type RecoveryConfig struct {
	CheckInterval     time.Duration `yaml:"check_interval"`
	MaxRetryAttempts  int           `yaml:"max_retry_attempts"`
	RetryBackoff      time.Duration `yaml:"retry_backoff"`
	EnableAutoRestart bool          `yaml:"enable_auto_restart"`
	AlertThreshold    int           `yaml:"alert_threshold"`
}

// HealthCheck represents a health check function
type HealthCheck struct {
	Name        string
	CheckFunc   func(ctx context.Context) error
	RecoverFunc func(ctx context.Context) error
	Enabled     bool
	LastCheck   time.Time
	FailCount   int
	MaxFails    int
}

// HealthStatus represents the health status of a component
type HealthStatus struct {
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	LastCheck time.Time `json:"last_check"`
	Error     string    `json:"error,omitempty"`
	FailCount int       `json:"fail_count"`
}

// NewRecoveryManager creates a new recovery manager
func NewRecoveryManager(db *gorm.DB, redis *redis.Client, logger *logrus.Logger, config *RecoveryConfig) *RecoveryManager {
	if config == nil {
		config = &RecoveryConfig{
			CheckInterval:     30 * time.Second,
			MaxRetryAttempts:  3,
			RetryBackoff:      5 * time.Second,
			EnableAutoRestart: true,
			AlertThreshold:    3,
		}
	}

	rm := &RecoveryManager{
		db:           db,
		redis:        redis,
		logger:       logger,
		config:       config,
		healthChecks: make(map[string]HealthCheck),
		stopCh:       make(chan struct{}),
	}

	// Register default health checks
	rm.registerDefaultHealthChecks()

	return rm
}

// Start starts the recovery manager
func (rm *RecoveryManager) Start(ctx context.Context) error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if rm.running {
		return fmt.Errorf("recovery manager is already running")
	}

	rm.running = true
	go rm.runHealthChecks(ctx)

	rm.logger.Info("Recovery manager started")
	return nil
}

// Stop stops the recovery manager
func (rm *RecoveryManager) Stop() error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if !rm.running {
		return fmt.Errorf("recovery manager is not running")
	}

	close(rm.stopCh)
	rm.running = false

	rm.logger.Info("Recovery manager stopped")
	return nil
}

// RegisterHealthCheck registers a new health check
func (rm *RecoveryManager) RegisterHealthCheck(check HealthCheck) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	rm.healthChecks[check.Name] = check
	rm.logger.WithField("check_name", check.Name).Info("Health check registered")
}

// GetHealthStatus returns the health status of all components
func (rm *RecoveryManager) GetHealthStatus() []HealthStatus {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	var statuses []HealthStatus
	for name, check := range rm.healthChecks {
		status := "healthy"
		errorMsg := ""

		if check.FailCount > 0 {
			status = "unhealthy"
			errorMsg = fmt.Sprintf("Failed %d times", check.FailCount)
		}

		statuses = append(statuses, HealthStatus{
			Name:      name,
			Status:    status,
			LastCheck: check.LastCheck,
			Error:     errorMsg,
			FailCount: check.FailCount,
		})
	}

	return statuses
}

// runHealthChecks runs health checks periodically
func (rm *RecoveryManager) runHealthChecks(ctx context.Context) {
	ticker := time.NewTicker(rm.config.CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-rm.stopCh:
			return
		case <-ticker.C:
			rm.performHealthChecks(ctx)
		}
	}
}

// performHealthChecks performs all registered health checks
func (rm *RecoveryManager) performHealthChecks(ctx context.Context) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	for name, check := range rm.healthChecks {
		if !check.Enabled {
			continue
		}

		go rm.performSingleHealthCheck(ctx, name, check)
	}
}

// performSingleHealthCheck performs a single health check
func (rm *RecoveryManager) performSingleHealthCheck(ctx context.Context, name string, check HealthCheck) {
	defer func() {
		if r := recover(); r != nil {
			rm.logger.WithFields(logrus.Fields{
				"check_name": name,
				"panic":      r,
			}).Error("Health check panicked")
		}
	}()

	checkCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	err := check.CheckFunc(checkCtx)
	
	rm.mu.Lock()
	check.LastCheck = time.Now()
	
	if err != nil {
		check.FailCount++
		rm.logger.WithFields(logrus.Fields{
			"check_name":  name,
			"error":       err,
			"fail_count":  check.FailCount,
		}).Warn("Health check failed")

		// Record metrics
		monitoring.RecordHealthCheckFailure(name)

		// Attempt recovery if failure count exceeds threshold
		if check.FailCount >= check.MaxFails && check.RecoverFunc != nil {
			rm.attemptRecovery(ctx, name, check)
		}

		// Send alert if failure count exceeds alert threshold
		if check.FailCount >= rm.config.AlertThreshold {
			rm.sendHealthAlert(name, check, err)
		}
	} else {
		if check.FailCount > 0 {
			rm.logger.WithField("check_name", name).Info("Health check recovered")
			monitoring.RecordHealthCheckRecovery(name)
		}
		check.FailCount = 0
	}

	rm.healthChecks[name] = check
	rm.mu.Unlock()
}

// attemptRecovery attempts to recover from a failed health check
func (rm *RecoveryManager) attemptRecovery(ctx context.Context, name string, check HealthCheck) {
	rm.logger.WithField("check_name", name).Info("Attempting recovery")

	for attempt := 1; attempt <= rm.config.MaxRetryAttempts; attempt++ {
		recoveryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		
		err := check.RecoverFunc(recoveryCtx)
		cancel()

		if err == nil {
			rm.logger.WithFields(logrus.Fields{
				"check_name": name,
				"attempt":    attempt,
			}).Info("Recovery successful")
			
			// Reset fail count after successful recovery
			check.FailCount = 0
			rm.healthChecks[name] = check
			monitoring.RecordRecoverySuccess(name)
			return
		}

		rm.logger.WithFields(logrus.Fields{
			"check_name": name,
			"attempt":    attempt,
			"error":      err,
		}).Warn("Recovery attempt failed")

		if attempt < rm.config.MaxRetryAttempts {
			time.Sleep(rm.config.RetryBackoff * time.Duration(attempt))
		}
	}

	rm.logger.WithField("check_name", name).Error("All recovery attempts failed")
	monitoring.RecordRecoveryFailure(name)
}

// sendHealthAlert sends an alert for health check failures
func (rm *RecoveryManager) sendHealthAlert(name string, check HealthCheck, err error) {
	// This would integrate with your alerting system
	rm.logger.WithFields(logrus.Fields{
		"check_name":  name,
		"fail_count":  check.FailCount,
		"error":       err,
		"alert_level": "critical",
	}).Error("Health check alert triggered")
}

// registerDefaultHealthChecks registers default health checks
func (rm *RecoveryManager) registerDefaultHealthChecks() {
	// Database health check
	rm.RegisterHealthCheck(HealthCheck{
		Name:    "database",
		Enabled: true,
		MaxFails: 3,
		CheckFunc: func(ctx context.Context) error {
			if rm.db == nil {
				return fmt.Errorf("database connection is nil")
			}
			
			sqlDB, err := rm.db.DB()
			if err != nil {
				return err
			}
			
			return sqlDB.PingContext(ctx)
		},
		RecoverFunc: func(ctx context.Context) error {
			if rm.db == nil {
				return fmt.Errorf("cannot recover nil database connection")
			}
			
			sqlDB, err := rm.db.DB()
			if err != nil {
				return err
			}
			
			// Close and reopen connections
			sqlDB.Close()
			return sqlDB.PingContext(ctx)
		},
	})

	// Redis health check
	rm.RegisterHealthCheck(HealthCheck{
		Name:    "redis",
		Enabled: true,
		MaxFails: 3,
		CheckFunc: func(ctx context.Context) error {
			if rm.redis == nil {
				return fmt.Errorf("redis client is nil")
			}
			
			return rm.redis.Ping(ctx).Err()
		},
		RecoverFunc: func(ctx context.Context) error {
			if rm.redis == nil {
				return fmt.Errorf("cannot recover nil redis client")
			}
			
			// Reset redis connection
			return rm.redis.Ping(ctx).Err()
		},
	})

	// Memory health check
	rm.RegisterHealthCheck(HealthCheck{
		Name:    "memory",
		Enabled: true,
		MaxFails: 5,
		CheckFunc: func(ctx context.Context) error {
			// Check memory usage
			memStats := monitoring.GetMemoryStats()
			if memStats.UsagePercent > 90 {
				return fmt.Errorf("memory usage too high: %.2f%%", memStats.UsagePercent)
			}
			return nil
		},
		RecoverFunc: func(ctx context.Context) error {
			// Trigger garbage collection
			monitoring.ForceGC()
			return nil
		},
	})

	// Disk space health check
	rm.RegisterHealthCheck(HealthCheck{
		Name:    "disk_space",
		Enabled: true,
		MaxFails: 5,
		CheckFunc: func(ctx context.Context) error {
			diskStats := monitoring.GetDiskStats()
			if diskStats.UsagePercent > 85 {
				return fmt.Errorf("disk usage too high: %.2f%%", diskStats.UsagePercent)
			}
			return nil
		},
		RecoverFunc: func(ctx context.Context) error {
			// Clean up temporary files
			return monitoring.CleanupTempFiles()
		},
	})
}