package monitoring

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// PerformanceMonitor monitors system performance metrics
type PerformanceMonitor struct {
	config  PerformanceConfig
	metrics *PerformanceMetrics
	mu      sync.RWMutex
}

// PerformanceConfig holds performance monitoring configuration
type PerformanceConfig struct {
	CollectionInterval    time.Duration
	MetricsRetention      time.Duration
	SlowRequestThreshold  time.Duration
	HighMemoryThreshold   uint64
	HighCPUThreshold      float64
	EnableDetailedMetrics bool
	EnableProfiling       bool
}

// DefaultPerformanceConfig returns default performance monitoring configuration
func DefaultPerformanceConfig() PerformanceConfig {
	return PerformanceConfig{
		CollectionInterval:    10 * time.Second,
		MetricsRetention:      24 * time.Hour,
		SlowRequestThreshold:  1 * time.Second,
		HighMemoryThreshold:   1024 * 1024 * 1024, // 1GB
		HighCPUThreshold:      80.0,                // 80%
		EnableDetailedMetrics: true,
		EnableProfiling:       false,
	}
}

// PerformanceMetrics holds performance metrics
type PerformanceMetrics struct {
	// Request metrics
	RequestCount         prometheus.Counter
	RequestDuration      prometheus.Histogram
	SlowRequestCount     prometheus.Counter
	ErrorCount           prometheus.Counter
	
	// System metrics
	MemoryUsage          prometheus.Gauge
	CPUUsage             prometheus.Gauge
	GoroutineCount       prometheus.Gauge
	GCDuration           prometheus.Histogram
	
	// Database metrics
	DBConnectionsActive  prometheus.Gauge
	DBConnectionsIdle    prometheus.Gauge
	DBQueryDuration      prometheus.Histogram
	DBSlowQueryCount     prometheus.Counter
	
	// Cache metrics
	CacheHitRate         prometheus.Gauge
	CacheOperations      prometheus.Counter
	CacheSize            prometheus.Gauge
	
	// Recharge system specific metrics
	RechargeOrdersTotal     prometheus.Counter
	RechargeOrdersDuration  prometheus.Histogram
	AccountMatchingDuration prometheus.Histogram
	AccountMatchingErrors   prometheus.Counter
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(config PerformanceConfig) *PerformanceMonitor {
	metrics := &PerformanceMetrics{
		// Request metrics
		RequestCount: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_requests_total",
			Help: "Total number of requests processed",
		}),
		RequestDuration: promauto.NewHistogram(prometheus.HistogramOpts{
			Name:    "recharge_request_duration_seconds",
			Help:    "Request duration in seconds",
			Buckets: prometheus.DefBuckets,
		}),
		SlowRequestCount: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_slow_requests_total",
			Help: "Total number of slow requests",
		}),
		ErrorCount: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_errors_total",
			Help: "Total number of errors",
		}),
		
		// System metrics
		MemoryUsage: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_memory_usage_bytes",
			Help: "Current memory usage in bytes",
		}),
		CPUUsage: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_cpu_usage_percent",
			Help: "Current CPU usage percentage",
		}),
		GoroutineCount: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_goroutines_count",
			Help: "Current number of goroutines",
		}),
		GCDuration: promauto.NewHistogram(prometheus.HistogramOpts{
			Name: "recharge_gc_duration_seconds",
			Help: "Garbage collection duration in seconds",
		}),
		
		// Database metrics
		DBConnectionsActive: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_db_connections_active",
			Help: "Number of active database connections",
		}),
		DBConnectionsIdle: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_db_connections_idle",
			Help: "Number of idle database connections",
		}),
		DBQueryDuration: promauto.NewHistogram(prometheus.HistogramOpts{
			Name: "recharge_db_query_duration_seconds",
			Help: "Database query duration in seconds",
		}),
		DBSlowQueryCount: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_db_slow_queries_total",
			Help: "Total number of slow database queries",
		}),
		
		// Cache metrics
		CacheHitRate: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_cache_hit_rate",
			Help: "Cache hit rate percentage",
		}),
		CacheOperations: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_cache_operations_total",
			Help: "Total number of cache operations",
		}),
		CacheSize: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "recharge_cache_size_bytes",
			Help: "Current cache size in bytes",
		}),
		
		// Recharge system specific metrics
		RechargeOrdersTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_orders_total",
			Help: "Total number of recharge orders processed",
		}),
		RechargeOrdersDuration: promauto.NewHistogram(prometheus.HistogramOpts{
			Name: "recharge_orders_duration_seconds",
			Help: "Recharge order processing duration in seconds",
		}),
		AccountMatchingDuration: promauto.NewHistogram(prometheus.HistogramOpts{
			Name: "recharge_account_matching_duration_seconds",
			Help: "Account matching duration in seconds",
		}),
		AccountMatchingErrors: promauto.NewCounter(prometheus.CounterOpts{
			Name: "recharge_account_matching_errors_total",
			Help: "Total number of account matching errors",
		}),
	}

	monitor := &PerformanceMonitor{
		config:  config,
		metrics: metrics,
	}

	// Start monitoring
	go monitor.startMonitoring()

	return monitor
}

// startMonitoring starts the performance monitoring loop
func (pm *PerformanceMonitor) startMonitoring() {
	ticker := time.NewTicker(pm.config.CollectionInterval)
	defer ticker.Stop()

	for range ticker.C {
		pm.collectSystemMetrics()
	}
}

// collectSystemMetrics collects system performance metrics
func (pm *PerformanceMonitor) collectSystemMetrics() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Update memory metrics
	pm.metrics.MemoryUsage.Set(float64(m.Alloc))
	pm.metrics.GoroutineCount.Set(float64(runtime.NumGoroutine()))

	// Update GC metrics
	if m.NumGC > 0 {
		pm.metrics.GCDuration.Observe(float64(m.PauseNs[(m.NumGC+255)%256]) / 1e9)
	}
}

// RecordRequest records request metrics
func (pm *PerformanceMonitor) RecordRequest(duration time.Duration, success bool) {
	pm.metrics.RequestCount.Inc()
	pm.metrics.RequestDuration.Observe(duration.Seconds())

	if duration > pm.config.SlowRequestThreshold {
		pm.metrics.SlowRequestCount.Inc()
	}

	if !success {
		pm.metrics.ErrorCount.Inc()
	}
}

// RecordDBQuery records database query metrics
func (pm *PerformanceMonitor) RecordDBQuery(duration time.Duration, success bool) {
	pm.metrics.DBQueryDuration.Observe(duration.Seconds())

	if duration > pm.config.SlowRequestThreshold {
		pm.metrics.DBSlowQueryCount.Inc()
	}
}

// RecordRechargeOrder records recharge order metrics
func (pm *PerformanceMonitor) RecordRechargeOrder(duration time.Duration) {
	pm.metrics.RechargeOrdersTotal.Inc()
	pm.metrics.RechargeOrdersDuration.Observe(duration.Seconds())
}

// RecordAccountMatching records account matching metrics
func (pm *PerformanceMonitor) RecordAccountMatching(duration time.Duration, success bool) {
	pm.metrics.AccountMatchingDuration.Observe(duration.Seconds())

	if !success {
		pm.metrics.AccountMatchingErrors.Inc()
	}
}

// UpdateDBConnectionStats updates database connection statistics
func (pm *PerformanceMonitor) UpdateDBConnectionStats(active, idle int) {
	pm.metrics.DBConnectionsActive.Set(float64(active))
	pm.metrics.DBConnectionsIdle.Set(float64(idle))
}

// UpdateCacheStats updates cache statistics
func (pm *PerformanceMonitor) UpdateCacheStats(hitRate float64, operations int64, size int64) {
	pm.metrics.CacheHitRate.Set(hitRate)
	pm.metrics.CacheOperations.Add(float64(operations))
	pm.metrics.CacheSize.Set(float64(size))
}

// BottleneckAnalyzer analyzes system bottlenecks
type BottleneckAnalyzer struct {
	monitor     *PerformanceMonitor
	samples     []PerformanceSample
	mu          sync.RWMutex
	maxSamples  int
}

// PerformanceSample represents a performance sample
type PerformanceSample struct {
	Timestamp           time.Time
	MemoryUsage         uint64
	CPUUsage            float64
	GoroutineCount      int
	RequestsPerSecond   float64
	AverageResponseTime time.Duration
	ErrorRate           float64
	DBConnectionsActive int
	DBConnectionsIdle   int
	CacheHitRate        float64
}

// NewBottleneckAnalyzer creates a new bottleneck analyzer
func NewBottleneckAnalyzer(monitor *PerformanceMonitor) *BottleneckAnalyzer {
	analyzer := &BottleneckAnalyzer{
		monitor:    monitor,
		samples:    make([]PerformanceSample, 0),
		maxSamples: 1000, // Keep last 1000 samples
	}

	// Start analysis
	go analyzer.startAnalysis()

	return analyzer
}

// startAnalysis starts the bottleneck analysis loop
func (ba *BottleneckAnalyzer) startAnalysis() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ba.collectSample()
		ba.analyzeBottlenecks()
	}
}

// collectSample collects a performance sample
func (ba *BottleneckAnalyzer) collectSample() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	sample := PerformanceSample{
		Timestamp:      time.Now(),
		MemoryUsage:    m.Alloc,
		GoroutineCount: runtime.NumGoroutine(),
		// Other metrics would be collected from the monitor
	}

	ba.mu.Lock()
	ba.samples = append(ba.samples, sample)
	
	// Keep only the last maxSamples
	if len(ba.samples) > ba.maxSamples {
		ba.samples = ba.samples[1:]
	}
	ba.mu.Unlock()
}

// analyzeBottlenecks analyzes performance samples for bottlenecks
func (ba *BottleneckAnalyzer) analyzeBottlenecks() {
	ba.mu.RLock()
	defer ba.mu.RUnlock()

	if len(ba.samples) < 10 {
		return // Not enough samples
	}

	// Analyze recent samples (last 10)
	recentSamples := ba.samples[len(ba.samples)-10:]
	
	// Check for memory bottlenecks
	avgMemory := ba.calculateAverageMemory(recentSamples)
	if avgMemory > ba.monitor.config.HighMemoryThreshold {
		fmt.Printf("WARNING: High memory usage detected: %d bytes\n", avgMemory)
	}

	// Check for goroutine leaks
	avgGoroutines := ba.calculateAverageGoroutines(recentSamples)
	if avgGoroutines > 1000 {
		fmt.Printf("WARNING: High goroutine count detected: %d\n", avgGoroutines)
	}
}

// calculateAverageMemory calculates average memory usage
func (ba *BottleneckAnalyzer) calculateAverageMemory(samples []PerformanceSample) uint64 {
	var total uint64
	for _, sample := range samples {
		total += sample.MemoryUsage
	}
	return total / uint64(len(samples))
}

// calculateAverageGoroutines calculates average goroutine count
func (ba *BottleneckAnalyzer) calculateAverageGoroutines(samples []PerformanceSample) int {
	var total int
	for _, sample := range samples {
		total += sample.GoroutineCount
	}
	return total / len(samples)
}

// GetBottleneckReport generates a bottleneck analysis report
func (ba *BottleneckAnalyzer) GetBottleneckReport() BottleneckReport {
	ba.mu.RLock()
	defer ba.mu.RUnlock()

	report := BottleneckReport{
		Timestamp:    time.Now(),
		SampleCount:  len(ba.samples),
		Bottlenecks:  []Bottleneck{},
		Recommendations: []string{},
	}

	if len(ba.samples) < 10 {
		report.Recommendations = append(report.Recommendations, "Insufficient data for analysis")
		return report
	}

	// Analyze last 50 samples or all if less
	sampleCount := min(50, len(ba.samples))
	recentSamples := ba.samples[len(ba.samples)-sampleCount:]

	// Memory analysis
	avgMemory := ba.calculateAverageMemory(recentSamples)
	maxMemory := ba.getMaxMemory(recentSamples)
	
	if avgMemory > ba.monitor.config.HighMemoryThreshold {
		report.Bottlenecks = append(report.Bottlenecks, Bottleneck{
			Type:        "Memory",
			Severity:    "High",
			Description: fmt.Sprintf("Average memory usage: %d MB", avgMemory/1024/1024),
			Impact:      "May cause GC pressure and slow response times",
		})
		report.Recommendations = append(report.Recommendations, "Consider optimizing memory usage or increasing available memory")
	}

	// Goroutine analysis
	avgGoroutines := ba.calculateAverageGoroutines(recentSamples)
	maxGoroutines := ba.getMaxGoroutines(recentSamples)
	
	if avgGoroutines > 1000 {
		report.Bottlenecks = append(report.Bottlenecks, Bottleneck{
			Type:        "Goroutines",
			Severity:    "Medium",
			Description: fmt.Sprintf("Average goroutines: %d, Max: %d", avgGoroutines, maxGoroutines),
			Impact:      "May indicate goroutine leaks or excessive concurrency",
		})
		report.Recommendations = append(report.Recommendations, "Review goroutine usage and check for leaks")
	}

	return report
}

// BottleneckReport represents a bottleneck analysis report
type BottleneckReport struct {
	Timestamp       time.Time
	SampleCount     int
	Bottlenecks     []Bottleneck
	Recommendations []string
}

// Bottleneck represents a performance bottleneck
type Bottleneck struct {
	Type        string
	Severity    string
	Description string
	Impact      string
}

// Helper functions
func (ba *BottleneckAnalyzer) getMaxMemory(samples []PerformanceSample) uint64 {
	var max uint64
	for _, sample := range samples {
		if sample.MemoryUsage > max {
			max = sample.MemoryUsage
		}
	}
	return max
}

func (ba *BottleneckAnalyzer) getMaxGoroutines(samples []PerformanceSample) int {
	var max int
	for _, sample := range samples {
		if sample.GoroutineCount > max {
			max = sample.GoroutineCount
		}
	}
	return max
}

// PerformanceOptimizer provides performance optimization suggestions
type PerformanceOptimizer struct {
	analyzer *BottleneckAnalyzer
	monitor  *PerformanceMonitor
}

// NewPerformanceOptimizer creates a new performance optimizer
func NewPerformanceOptimizer(monitor *PerformanceMonitor) *PerformanceOptimizer {
	analyzer := NewBottleneckAnalyzer(monitor)
	
	return &PerformanceOptimizer{
		analyzer: analyzer,
		monitor:  monitor,
	}
}

// GetOptimizationSuggestions returns performance optimization suggestions
func (po *PerformanceOptimizer) GetOptimizationSuggestions() []OptimizationSuggestion {
	report := po.analyzer.GetBottleneckReport()
	suggestions := []OptimizationSuggestion{}

	for _, bottleneck := range report.Bottlenecks {
		switch bottleneck.Type {
		case "Memory":
			suggestions = append(suggestions, OptimizationSuggestion{
				Category:    "Memory",
				Priority:    "High",
				Description: "Optimize memory usage",
				Actions: []string{
					"Enable memory profiling to identify memory leaks",
					"Implement object pooling for frequently allocated objects",
					"Optimize data structures to reduce memory footprint",
					"Increase garbage collection frequency if needed",
				},
			})

		case "Goroutines":
			suggestions = append(suggestions, OptimizationSuggestion{
				Category:    "Concurrency",
				Priority:    "Medium",
				Description: "Optimize goroutine usage",
				Actions: []string{
					"Review goroutine lifecycle management",
					"Implement proper goroutine cleanup",
					"Use worker pools to limit concurrent goroutines",
					"Add goroutine monitoring and alerting",
				},
			})
		}
	}

	// Add general suggestions
	suggestions = append(suggestions, OptimizationSuggestion{
		Category:    "Caching",
		Priority:    "Medium",
		Description: "Improve caching strategy",
		Actions: []string{
			"Implement response caching for frequently accessed endpoints",
			"Optimize cache TTL values based on data change frequency",
			"Use cache warming for critical data",
			"Monitor cache hit rates and adjust strategies",
		},
	})

	return suggestions
}

// OptimizationSuggestion represents a performance optimization suggestion
type OptimizationSuggestion struct {
	Category    string
	Priority    string
	Description string
	Actions     []string
}

// GetPerformanceReport generates a comprehensive performance report
func (po *PerformanceOptimizer) GetPerformanceReport() PerformanceReport {
	bottleneckReport := po.analyzer.GetBottleneckReport()
	suggestions := po.GetOptimizationSuggestions()

	return PerformanceReport{
		Timestamp:           time.Now(),
		BottleneckReport:    bottleneckReport,
		OptimizationSuggestions: suggestions,
		SystemMetrics:       po.getSystemMetrics(),
	}
}

// PerformanceReport represents a comprehensive performance report
type PerformanceReport struct {
	Timestamp               time.Time
	BottleneckReport        BottleneckReport
	OptimizationSuggestions []OptimizationSuggestion
	SystemMetrics           map[string]interface{}
}

// getSystemMetrics returns current system metrics
func (po *PerformanceOptimizer) getSystemMetrics() map[string]interface{} {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return map[string]interface{}{
		"memory": map[string]interface{}{
			"alloc":         m.Alloc,
			"total_alloc":   m.TotalAlloc,
			"sys":          m.Sys,
			"heap_alloc":   m.HeapAlloc,
			"heap_sys":     m.HeapSys,
			"heap_idle":    m.HeapIdle,
			"heap_inuse":   m.HeapInuse,
			"stack_inuse":  m.StackInuse,
			"stack_sys":    m.StackSys,
		},
		"gc": map[string]interface{}{
			"num_gc":        m.NumGC,
			"pause_total":   m.PauseTotalNs,
			"gc_cpu_fraction": m.GCCPUFraction,
		},
		"goroutines": runtime.NumGoroutine(),
		"num_cpu":    runtime.NumCPU(),
	}
}