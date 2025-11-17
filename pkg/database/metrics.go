package database

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// Metrics holds database performance metrics
type Metrics struct {
	mu                    sync.RWMutex
	ConnectionsOpen       int64
	ConnectionsIdle       int64
	ConnectionsInUse      int64
	ConnectionsWaitCount  int64
	ConnectionsWaitDuration time.Duration
	MaxOpenConnections    int64
	QueryCount            int64
	QueryDuration         time.Duration
	ErrorCount            int64
	LastError             error
	LastErrorTime         time.Time
}

// MetricsCollector collects database metrics
type MetricsCollector struct {
	db      *sql.DB
	dbx     *sqlx.DB
	metrics *Metrics
	ticker  *time.Ticker
	done    chan bool
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector(db *sql.DB) *MetricsCollector {
	return &MetricsCollector{
		db:      db,
		metrics: &Metrics{},
		done:    make(chan bool),
	}
}

// NewMetricsCollectorX creates a new metrics collector for sqlx
func NewMetricsCollectorX(db *sqlx.DB) *MetricsCollector {
	return &MetricsCollector{
		dbx:     db,
		db:      db.DB,
		metrics: &Metrics{},
		done:    make(chan bool),
	}
}

// Start begins collecting metrics at the specified interval
func (mc *MetricsCollector) Start(interval time.Duration) {
	mc.ticker = time.NewTicker(interval)
	go mc.collect()
}

// Stop stops collecting metrics
func (mc *MetricsCollector) Stop() {
	if mc.ticker != nil {
		mc.ticker.Stop()
	}
	close(mc.done)
}

// GetMetrics returns current metrics (thread-safe)
func (mc *MetricsCollector) GetMetrics() Metrics {
	mc.metrics.mu.RLock()
	defer mc.metrics.mu.RUnlock()
	return *mc.metrics
}

// collect runs the metrics collection loop
func (mc *MetricsCollector) collect() {
	for {
		select {
		case <-mc.ticker.C:
			mc.updateMetrics()
		case <-mc.done:
			return
		}
	}
}

// updateMetrics updates the current metrics
func (mc *MetricsCollector) updateMetrics() {
	if mc.db == nil {
		return
	}
	
	stats := mc.db.Stats()
	
	mc.metrics.mu.Lock()
	defer mc.metrics.mu.Unlock()
	
	mc.metrics.ConnectionsOpen = int64(stats.OpenConnections)
	mc.metrics.ConnectionsIdle = int64(stats.Idle)
	mc.metrics.ConnectionsInUse = int64(stats.InUse)
	mc.metrics.ConnectionsWaitCount = stats.WaitCount
	mc.metrics.ConnectionsWaitDuration = stats.WaitDuration
	mc.metrics.MaxOpenConnections = int64(stats.MaxOpenConnections)
}

// RecordQuery records a query execution
func (mc *MetricsCollector) RecordQuery(duration time.Duration, err error) {
	mc.metrics.mu.Lock()
	defer mc.metrics.mu.Unlock()
	
	mc.metrics.QueryCount++
	mc.metrics.QueryDuration += duration
	
	if err != nil {
		mc.metrics.ErrorCount++
		mc.metrics.LastError = err
		mc.metrics.LastErrorTime = time.Now()
	}
}

// GetConnectionPoolStatus returns connection pool status
func (mc *MetricsCollector) GetConnectionPoolStatus() map[string]interface{} {
	metrics := mc.GetMetrics()
	
	return map[string]interface{}{
		"connections_open":        metrics.ConnectionsOpen,
		"connections_idle":        metrics.ConnectionsIdle,
		"connections_in_use":      metrics.ConnectionsInUse,
		"connections_wait_count":  metrics.ConnectionsWaitCount,
		"connections_wait_duration_ms": metrics.ConnectionsWaitDuration.Milliseconds(),
		"max_open_connections":    metrics.MaxOpenConnections,
		"query_count":            metrics.QueryCount,
		"avg_query_duration_ms":  mc.getAverageQueryDuration().Milliseconds(),
		"error_count":            metrics.ErrorCount,
		"last_error":             mc.getLastErrorString(),
		"last_error_time":        metrics.LastErrorTime.Format(time.RFC3339),
	}
}

// getAverageQueryDuration calculates average query duration
func (mc *MetricsCollector) getAverageQueryDuration() time.Duration {
	mc.metrics.mu.RLock()
	defer mc.metrics.mu.RUnlock()
	
	if mc.metrics.QueryCount == 0 {
		return 0
	}
	
	return time.Duration(int64(mc.metrics.QueryDuration) / mc.metrics.QueryCount)
}

// getLastErrorString returns the last error as string
func (mc *MetricsCollector) getLastErrorString() string {
	mc.metrics.mu.RLock()
	defer mc.metrics.mu.RUnlock()
	
	if mc.metrics.LastError != nil {
		return mc.metrics.LastError.Error()
	}
	return ""
}

// HealthStatus represents database health status
type HealthStatus struct {
	Healthy           bool      `json:"healthy"`
	ConnectionsOpen   int       `json:"connections_open"`
	ConnectionsIdle   int       `json:"connections_idle"`
	ConnectionsInUse  int       `json:"connections_in_use"`
	ResponseTime      string    `json:"response_time"`
	LastChecked       time.Time `json:"last_checked"`
	Error             string    `json:"error,omitempty"`
}

// CheckHealth performs a comprehensive health check
func (mc *MetricsCollector) CheckHealth(ctx context.Context) HealthStatus {
	start := time.Now()
	
	status := HealthStatus{
		LastChecked: start,
	}
	
	// Test database connectivity
	err := mc.db.PingContext(ctx)
	if err != nil {
		status.Healthy = false
		status.Error = err.Error()
		status.ResponseTime = time.Since(start).String()
		return status
	}
	
	// Get connection stats
	stats := mc.db.Stats()
	status.ConnectionsOpen = stats.OpenConnections
	status.ConnectionsIdle = stats.Idle
	status.ConnectionsInUse = stats.InUse
	status.ResponseTime = time.Since(start).String()
	
	// Check if connection pool is healthy
	if stats.OpenConnections >= stats.MaxOpenConnections {
		status.Healthy = false
		status.Error = "connection pool exhausted"
		return status
	}
	
	status.Healthy = true
	return status
}

// QueryWithMetrics executes a query and records metrics
func (mc *MetricsCollector) QueryWithMetrics(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	
	rows, err := mc.db.QueryContext(ctx, query, args...)
	
	duration := time.Since(start)
	mc.RecordQuery(duration, err)
	
	return rows, err
}

// ExecWithMetrics executes a statement and records metrics
func (mc *MetricsCollector) ExecWithMetrics(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	
	result, err := mc.db.ExecContext(ctx, query, args...)
	
	duration := time.Since(start)
	mc.RecordQuery(duration, err)
	
	return result, err
}

// GetSlowQueryThreshold returns the threshold for slow queries
func GetSlowQueryThreshold() time.Duration {
	return 1 * time.Second
}

// LogSlowQuery logs slow queries for analysis
func LogSlowQuery(query string, duration time.Duration, args ...interface{}) {
	if duration > GetSlowQueryThreshold() {
		fmt.Printf("SLOW QUERY [%v]: %s (args: %v)\n", duration, query, args)
	}
}