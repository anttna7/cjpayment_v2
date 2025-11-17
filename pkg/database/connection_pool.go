package database

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"gorm.io/gorm"
)

// ConnectionPoolManager manages database connection pools
type ConnectionPoolManager struct {
	db     *gorm.DB
	config ConnectionPoolConfig
	stats  *PoolStats
	mu     sync.RWMutex
}

// ConnectionPoolConfig holds connection pool configuration
type ConnectionPoolConfig struct {
	MaxOpenConns        int           // Maximum number of open connections
	MaxIdleConns        int           // Maximum number of idle connections
	ConnMaxLifetime     time.Duration // Maximum lifetime of connections
	ConnMaxIdleTime     time.Duration // Maximum idle time of connections
	HealthCheckInterval time.Duration // Health check interval
	SlowQueryThreshold  time.Duration // Slow query threshold
	EnableMetrics       bool          // Enable metrics collection
}

// DefaultConnectionPoolConfig returns default connection pool configuration
func DefaultConnectionPoolConfig() ConnectionPoolConfig {
	return ConnectionPoolConfig{
		MaxOpenConns:        25,
		MaxIdleConns:        10,
		ConnMaxLifetime:     5 * time.Minute,
		ConnMaxIdleTime:     1 * time.Minute,
		HealthCheckInterval: 30 * time.Second,
		SlowQueryThreshold:  1 * time.Second,
		EnableMetrics:       true,
	}
}

// RechargeConnectionPoolConfig returns optimized config for recharge system
func RechargeConnectionPoolConfig() ConnectionPoolConfig {
	return ConnectionPoolConfig{
		MaxOpenConns:        30,  // Higher for concurrent recharge requests
		MaxIdleConns:        15,  // More idle connections for quick response
		ConnMaxLifetime:     10 * time.Minute,
		ConnMaxIdleTime:     2 * time.Minute,
		HealthCheckInterval: 15 * time.Second,
		SlowQueryThreshold:  500 * time.Millisecond,
		EnableMetrics:       true,
	}
}

// PoolStats holds connection pool statistics
type PoolStats struct {
	mu                    sync.RWMutex
	TotalConnections      int64
	ActiveConnections     int64
	IdleConnections       int64
	WaitCount             int64
	WaitDuration          time.Duration
	MaxIdleClosed         int64
	MaxIdleTimeClosed     int64
	MaxLifetimeClosed     int64
	SlowQueries           int64
	HealthCheckFailures   int64
	LastHealthCheck       time.Time
	LastHealthCheckStatus bool
}

// NewConnectionPoolManager creates a new connection pool manager
func NewConnectionPoolManager(db *gorm.DB, config ConnectionPoolConfig) *ConnectionPoolManager {
	manager := &ConnectionPoolManager{
		db:     db,
		config: config,
		stats:  &PoolStats{},
	}

	// Apply configuration
	if err := manager.ApplyConfiguration(); err != nil {
		// Log error but don't fail initialization
		fmt.Printf("Warning: Failed to apply connection pool configuration: %v\n", err)
	}

	// Start health check if enabled
	if config.HealthCheckInterval > 0 {
		go manager.startHealthCheck()
	}

	return manager
}

// ApplyConfiguration applies the connection pool configuration
func (cpm *ConnectionPoolManager) ApplyConfiguration() error {
	sqlDB, err := cpm.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Set maximum number of open connections
	sqlDB.SetMaxOpenConns(cpm.config.MaxOpenConns)

	// Set maximum number of idle connections
	sqlDB.SetMaxIdleConns(cpm.config.MaxIdleConns)

	// Set maximum lifetime of connections
	sqlDB.SetConnMaxLifetime(cpm.config.ConnMaxLifetime)

	// Set maximum idle time of connections
	sqlDB.SetConnMaxIdleTime(cpm.config.ConnMaxIdleTime)

	return nil
}

// GetStats returns current connection pool statistics
func (cpm *ConnectionPoolManager) GetStats() map[string]interface{} {
	sqlDB, err := cpm.db.DB()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	dbStats := sqlDB.Stats()
	
	cpm.stats.mu.RLock()
	defer cpm.stats.mu.RUnlock()

	return map[string]interface{}{
		"max_open_connections":     dbStats.MaxOpenConnections,
		"open_connections":         dbStats.OpenConnections,
		"in_use":                  dbStats.InUse,
		"idle":                    dbStats.Idle,
		"wait_count":              dbStats.WaitCount,
		"wait_duration":           dbStats.WaitDuration.String(),
		"max_idle_closed":         dbStats.MaxIdleClosed,
		"max_idle_time_closed":    dbStats.MaxIdleTimeClosed,
		"max_lifetime_closed":     dbStats.MaxLifetimeClosed,
		"slow_queries":            cpm.stats.SlowQueries,
		"health_check_failures":   cpm.stats.HealthCheckFailures,
		"last_health_check":       cpm.stats.LastHealthCheck.Format(time.RFC3339),
		"last_health_check_status": cpm.stats.LastHealthCheckStatus,
		"config": map[string]interface{}{
			"max_open_conns":        cpm.config.MaxOpenConns,
			"max_idle_conns":        cpm.config.MaxIdleConns,
			"conn_max_lifetime":     cpm.config.ConnMaxLifetime.String(),
			"conn_max_idle_time":    cpm.config.ConnMaxIdleTime.String(),
			"health_check_interval": cpm.config.HealthCheckInterval.String(),
			"slow_query_threshold":  cpm.config.SlowQueryThreshold.String(),
		},
	}
}

// HealthCheck performs a health check on the connection pool
func (cpm *ConnectionPoolManager) HealthCheck() error {
	sqlDB, err := cpm.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	start := time.Now()
	err = sqlDB.PingContext(ctx)
	duration := time.Since(start)

	cpm.stats.mu.Lock()
	cpm.stats.LastHealthCheck = time.Now()
	if err != nil {
		cpm.stats.HealthCheckFailures++
		cpm.stats.LastHealthCheckStatus = false
	} else {
		cpm.stats.LastHealthCheckStatus = true
	}
	cpm.stats.mu.Unlock()

	if err != nil {
		return fmt.Errorf("health check failed after %v: %w", duration, err)
	}

	return nil
}

// startHealthCheck starts periodic health checks
func (cpm *ConnectionPoolManager) startHealthCheck() {
	ticker := time.NewTicker(cpm.config.HealthCheckInterval)
	defer ticker.Stop()

	for range ticker.C {
		if err := cpm.HealthCheck(); err != nil {
			fmt.Printf("Connection pool health check failed: %v\n", err)
		}
	}
}

// OptimizeForWorkload optimizes connection pool for specific workload
func (cpm *ConnectionPoolManager) OptimizeForWorkload(workloadType WorkloadType) error {
	var config ConnectionPoolConfig

	switch workloadType {
	case WorkloadTypeReadHeavy:
		config = ConnectionPoolConfig{
			MaxOpenConns:        20,
			MaxIdleConns:        15,
			ConnMaxLifetime:     10 * time.Minute,
			ConnMaxIdleTime:     5 * time.Minute,
			HealthCheckInterval: 30 * time.Second,
			SlowQueryThreshold:  1 * time.Second,
			EnableMetrics:       true,
		}

	case WorkloadTypeWriteHeavy:
		config = ConnectionPoolConfig{
			MaxOpenConns:        35,
			MaxIdleConns:        10,
			ConnMaxLifetime:     5 * time.Minute,
			ConnMaxIdleTime:     1 * time.Minute,
			HealthCheckInterval: 15 * time.Second,
			SlowQueryThreshold:  500 * time.Millisecond,
			EnableMetrics:       true,
		}

	case WorkloadTypeMixed:
		config = ConnectionPoolConfig{
			MaxOpenConns:        30,
			MaxIdleConns:        12,
			ConnMaxLifetime:     8 * time.Minute,
			ConnMaxIdleTime:     2 * time.Minute,
			HealthCheckInterval: 20 * time.Second,
			SlowQueryThreshold:  750 * time.Millisecond,
			EnableMetrics:       true,
		}

	case WorkloadTypeRechargeSystem:
		config = RechargeConnectionPoolConfig()

	default:
		config = DefaultConnectionPoolConfig()
	}

	cpm.config = config
	return cpm.ApplyConfiguration()
}

// WorkloadType represents different types of database workloads
type WorkloadType string

const (
	WorkloadTypeReadHeavy      WorkloadType = "read_heavy"
	WorkloadTypeWriteHeavy     WorkloadType = "write_heavy"
	WorkloadTypeMixed          WorkloadType = "mixed"
	WorkloadTypeRechargeSystem WorkloadType = "recharge_system"
)

// ConnectionMonitor monitors connection usage and provides insights
type ConnectionMonitor struct {
	manager *ConnectionPoolManager
	metrics []ConnectionMetric
	mu      sync.RWMutex
}

// ConnectionMetric represents a connection usage metric
type ConnectionMetric struct {
	Timestamp         time.Time
	OpenConnections   int
	IdleConnections   int
	InUseConnections  int
	WaitCount         int64
	WaitDuration      time.Duration
}

// NewConnectionMonitor creates a new connection monitor
func NewConnectionMonitor(manager *ConnectionPoolManager) *ConnectionMonitor {
	monitor := &ConnectionMonitor{
		manager: manager,
		metrics: make([]ConnectionMetric, 0),
	}

	// Start monitoring
	go monitor.startMonitoring()

	return monitor
}

// startMonitoring starts connection monitoring
func (cm *ConnectionMonitor) startMonitoring() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		cm.collectMetrics()
	}
}

// collectMetrics collects connection metrics
func (cm *ConnectionMonitor) collectMetrics() {
	sqlDB, err := cm.manager.db.DB()
	if err != nil {
		return
	}

	stats := sqlDB.Stats()
	
	metric := ConnectionMetric{
		Timestamp:         time.Now(),
		OpenConnections:   stats.OpenConnections,
		IdleConnections:   stats.Idle,
		InUseConnections:  stats.InUse,
		WaitCount:         stats.WaitCount,
		WaitDuration:      stats.WaitDuration,
	}

	cm.mu.Lock()
	cm.metrics = append(cm.metrics, metric)
	
	// Keep only last 100 metrics
	if len(cm.metrics) > 100 {
		cm.metrics = cm.metrics[1:]
	}
	cm.mu.Unlock()
}

// GetMetrics returns collected metrics
func (cm *ConnectionMonitor) GetMetrics() []ConnectionMetric {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	
	// Return a copy to avoid race conditions
	metrics := make([]ConnectionMetric, len(cm.metrics))
	copy(metrics, cm.metrics)
	
	return metrics
}

// GetInsights provides insights based on collected metrics
func (cm *ConnectionMonitor) GetInsights() ConnectionInsights {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	if len(cm.metrics) == 0 {
		return ConnectionInsights{}
	}

	insights := ConnectionInsights{
		TotalSamples: len(cm.metrics),
	}

	// Calculate averages and peaks
	var totalOpen, totalIdle, totalInUse int
	var maxOpen, maxInUse int
	var totalWaitCount int64
	var totalWaitDuration time.Duration

	for _, metric := range cm.metrics {
		totalOpen += metric.OpenConnections
		totalIdle += metric.IdleConnections
		totalInUse += metric.InUseConnections
		totalWaitCount += metric.WaitCount
		totalWaitDuration += metric.WaitDuration

		if metric.OpenConnections > maxOpen {
			maxOpen = metric.OpenConnections
		}
		if metric.InUseConnections > maxInUse {
			maxInUse = metric.InUseConnections
		}
	}

	samples := len(cm.metrics)
	insights.AverageOpenConnections = float64(totalOpen) / float64(samples)
	insights.AverageIdleConnections = float64(totalIdle) / float64(samples)
	insights.AverageInUseConnections = float64(totalInUse) / float64(samples)
	insights.PeakOpenConnections = maxOpen
	insights.PeakInUseConnections = maxInUse
	insights.TotalWaitCount = totalWaitCount
	insights.TotalWaitDuration = totalWaitDuration

	// Generate recommendations
	insights.Recommendations = cm.generateRecommendations(insights)

	return insights
}

// ConnectionInsights provides insights about connection usage
type ConnectionInsights struct {
	TotalSamples             int
	AverageOpenConnections   float64
	AverageIdleConnections   float64
	AverageInUseConnections  float64
	PeakOpenConnections      int
	PeakInUseConnections     int
	TotalWaitCount           int64
	TotalWaitDuration        time.Duration
	Recommendations          []string
}

// generateRecommendations generates optimization recommendations
func (cm *ConnectionMonitor) generateRecommendations(insights ConnectionInsights) []string {
	recommendations := []string{}

	// Check if we're hitting connection limits
	if insights.PeakOpenConnections >= cm.manager.config.MaxOpenConns {
		recommendations = append(recommendations, 
			fmt.Sprintf("Consider increasing MaxOpenConns from %d to %d", 
				cm.manager.config.MaxOpenConns, 
				cm.manager.config.MaxOpenConns+10))
	}

	// Check for excessive waiting
	if insights.TotalWaitCount > 0 {
		recommendations = append(recommendations, 
			"Connections are waiting for availability. Consider increasing MaxOpenConns or optimizing query performance")
	}

	// Check idle connection usage
	if insights.AverageIdleConnections > float64(cm.manager.config.MaxIdleConns)*0.8 {
		recommendations = append(recommendations, 
			"High idle connection usage. Consider increasing MaxIdleConns for better performance")
	}

	// Check for underutilization
	if insights.AverageOpenConnections < float64(cm.manager.config.MaxOpenConns)*0.3 {
		recommendations = append(recommendations, 
			"Low connection utilization. Consider reducing MaxOpenConns to save resources")
	}

	return recommendations
}

// AdaptiveConnectionPool provides adaptive connection pool management
type AdaptiveConnectionPool struct {
	manager     *ConnectionPoolManager
	monitor     *ConnectionMonitor
	lastAdjust  time.Time
	adjustments int
}

// NewAdaptiveConnectionPool creates a new adaptive connection pool
func NewAdaptiveConnectionPool(db *gorm.DB) *AdaptiveConnectionPool {
	config := DefaultConnectionPoolConfig()
	manager := NewConnectionPoolManager(db, config)
	monitor := NewConnectionMonitor(manager)

	return &AdaptiveConnectionPool{
		manager:    manager,
		monitor:    monitor,
		lastAdjust: time.Now(),
	}
}

// AutoTune automatically tunes the connection pool based on usage patterns
func (acp *AdaptiveConnectionPool) AutoTune() error {
	// Only adjust every 5 minutes to avoid thrashing
	if time.Since(acp.lastAdjust) < 5*time.Minute {
		return nil
	}

	insights := acp.monitor.GetInsights()
	if insights.TotalSamples < 10 {
		return nil // Not enough data
	}

	config := acp.manager.config
	adjusted := false

	// Adjust MaxOpenConns based on peak usage
	if insights.PeakInUseConnections > int(float64(config.MaxOpenConns)*0.8) {
		config.MaxOpenConns = min(config.MaxOpenConns+5, 50) // Cap at 50
		adjusted = true
	} else if insights.AverageInUseConnections < float64(config.MaxOpenConns)*0.3 {
		config.MaxOpenConns = max(config.MaxOpenConns-5, 10) // Minimum 10
		adjusted = true
	}

	// Adjust MaxIdleConns based on idle usage
	if insights.AverageIdleConnections > float64(config.MaxIdleConns)*0.8 {
		config.MaxIdleConns = min(config.MaxIdleConns+2, config.MaxOpenConns/2)
		adjusted = true
	}

	if adjusted {
		acp.manager.config = config
		acp.lastAdjust = time.Now()
		acp.adjustments++
		return acp.manager.ApplyConfiguration()
	}

	return nil
}

// GetAdaptiveStats returns adaptive pool statistics
func (acp *AdaptiveConnectionPool) GetAdaptiveStats() map[string]interface{} {
	stats := acp.manager.GetStats()
	insights := acp.monitor.GetInsights()

	stats["adaptive"] = map[string]interface{}{
		"adjustments_made":    acp.adjustments,
		"last_adjustment":     acp.lastAdjust.Format(time.RFC3339),
		"insights":           insights,
	}

	return stats
}

// Helper functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}