package monitoring

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/company/cjpayment/pkg/cache"
	"github.com/company/cjpayment/pkg/database"
)

// Service provides monitoring and metrics collection
type Service struct {
	mu              sync.RWMutex
	dbCollector     *database.MetricsCollector
	redisClient     *cache.RedisClient
	httpMetrics     *HTTPMetrics
	systemMetrics   *SystemMetrics
	customMetrics   map[string]interface{}
	startTime       time.Time
	config          Config
}

// Config holds monitoring configuration
type Config struct {
	Enabled           bool          `yaml:"enabled"`
	Port              string        `yaml:"port"`
	Path              string        `yaml:"path"`
	HealthPath        string        `yaml:"health_path"`
	CollectionInterval time.Duration `yaml:"collection_interval"`
}

// HTTPMetrics holds HTTP request metrics
type HTTPMetrics struct {
	mu                sync.RWMutex
	RequestCount      int64
	ErrorCount        int64
	TotalDuration     time.Duration
	RequestsByMethod  map[string]int64
	RequestsByStatus  map[int]int64
	RequestsByPath    map[string]int64
}

// SystemMetrics holds system performance metrics
type SystemMetrics struct {
	mu              sync.RWMutex
	CPUUsage        float64
	MemoryUsage     uint64
	MemoryTotal     uint64
	GoroutineCount  int
	GCCount         uint64
	LastGCTime      time.Time
	HeapAlloc       uint64
	HeapSys         uint64
	HeapInuse       uint64
}

// NewService creates a new monitoring service
func NewService(config Config, dbCollector *database.MetricsCollector, redisClient *cache.RedisClient) *Service {
	return &Service{
		dbCollector:   dbCollector,
		redisClient:   redisClient,
		httpMetrics:   &HTTPMetrics{
			RequestsByMethod: make(map[string]int64),
			RequestsByStatus: make(map[int]int64),
			RequestsByPath:   make(map[string]int64),
		},
		systemMetrics: &SystemMetrics{},
		customMetrics: make(map[string]interface{}),
		startTime:     time.Now(),
		config:        config,
	}
}

// Start begins the monitoring service
func (s *Service) Start() error {
	if !s.config.Enabled {
		return nil
	}

	// Start metrics collection
	go s.collectSystemMetrics()

	// Start HTTP server for metrics endpoint
	mux := http.NewServeMux()
	mux.HandleFunc(s.config.Path, s.handleMetrics)
	mux.HandleFunc(s.config.HealthPath, s.handleHealth)

	server := &http.Server{
		Addr:    ":" + s.config.Port,
		Handler: mux,
	}

	fmt.Printf("Monitoring service started on port %s\n", s.config.Port)
	return server.ListenAndServe()
}

// collectSystemMetrics collects system metrics periodically
func (s *Service) collectSystemMetrics() {
	ticker := time.NewTicker(s.config.CollectionInterval)
	defer ticker.Stop()

	for range ticker.C {
		s.updateSystemMetrics()
	}
}

// updateSystemMetrics updates system performance metrics
func (s *Service) updateSystemMetrics() {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	s.systemMetrics.mu.Lock()
	defer s.systemMetrics.mu.Unlock()

	s.systemMetrics.MemoryUsage = m.Alloc
	s.systemMetrics.MemoryTotal = m.Sys
	s.systemMetrics.GoroutineCount = runtime.NumGoroutine()
	s.systemMetrics.GCCount = m.NumGC
	s.systemMetrics.LastGCTime = time.Unix(0, int64(m.LastGC))
	s.systemMetrics.HeapAlloc = m.HeapAlloc
	s.systemMetrics.HeapSys = m.HeapSys
	s.systemMetrics.HeapInuse = m.HeapInuse
}

// RecordHTTPRequest records an HTTP request metric
func (s *Service) RecordHTTPRequest(method, path string, statusCode int, duration time.Duration) {
	s.httpMetrics.mu.Lock()
	defer s.httpMetrics.mu.Unlock()

	s.httpMetrics.RequestCount++
	s.httpMetrics.TotalDuration += duration
	s.httpMetrics.RequestsByMethod[method]++
	s.httpMetrics.RequestsByStatus[statusCode]++
	s.httpMetrics.RequestsByPath[path]++

	if statusCode >= 400 {
		s.httpMetrics.ErrorCount++
	}
}

// SetCustomMetric sets a custom metric value
func (s *Service) SetCustomMetric(name string, value interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.customMetrics[name] = value
}

// GetCustomMetric gets a custom metric value
func (s *Service) GetCustomMetric(name string) (interface{}, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	value, exists := s.customMetrics[name]
	return value, exists
}

// handleMetrics handles the metrics endpoint
func (s *Service) handleMetrics(w http.ResponseWriter, r *http.Request) {
	metrics := s.GetAllMetrics()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// handleHealth handles the health check endpoint
func (s *Service) handleHealth(w http.ResponseWriter, r *http.Request) {
	health := s.GetHealthStatus()
	
	w.Header().Set("Content-Type", "application/json")
	
	if health["healthy"].(bool) {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	
	json.NewEncoder(w).Encode(health)
}

// GetAllMetrics returns all collected metrics
func (s *Service) GetAllMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})
	
	// System metrics
	s.systemMetrics.mu.RLock()
	metrics["system"] = map[string]interface{}{
		"uptime_seconds":    time.Since(s.startTime).Seconds(),
		"memory_usage":      s.systemMetrics.MemoryUsage,
		"memory_total":      s.systemMetrics.MemoryTotal,
		"memory_usage_pct":  float64(s.systemMetrics.MemoryUsage) / float64(s.systemMetrics.MemoryTotal) * 100,
		"goroutine_count":   s.systemMetrics.GoroutineCount,
		"gc_count":          s.systemMetrics.GCCount,
		"last_gc_time":      s.systemMetrics.LastGCTime.Format(time.RFC3339),
		"heap_alloc":        s.systemMetrics.HeapAlloc,
		"heap_sys":          s.systemMetrics.HeapSys,
		"heap_inuse":        s.systemMetrics.HeapInuse,
	}
	s.systemMetrics.mu.RUnlock()
	
	// HTTP metrics
	s.httpMetrics.mu.RLock()
	avgDuration := float64(0)
	if s.httpMetrics.RequestCount > 0 {
		avgDuration = float64(s.httpMetrics.TotalDuration.Nanoseconds()) / float64(s.httpMetrics.RequestCount) / 1e6 // ms
	}
	
	metrics["http"] = map[string]interface{}{
		"request_count":       s.httpMetrics.RequestCount,
		"error_count":         s.httpMetrics.ErrorCount,
		"error_rate":          float64(s.httpMetrics.ErrorCount) / float64(s.httpMetrics.RequestCount),
		"avg_duration_ms":     avgDuration,
		"requests_by_method":  s.httpMetrics.RequestsByMethod,
		"requests_by_status":  s.httpMetrics.RequestsByStatus,
		"requests_by_path":    s.httpMetrics.RequestsByPath,
	}
	s.httpMetrics.mu.RUnlock()
	
	// Database metrics
	if s.dbCollector != nil {
		metrics["database"] = s.dbCollector.GetConnectionPoolStatus()
	}
	
	// Redis metrics
	if s.redisClient != nil {
		metrics["redis"] = s.redisClient.GetMetrics()
	}
	
	// Custom metrics
	s.mu.RLock()
	if len(s.customMetrics) > 0 {
		metrics["custom"] = s.customMetrics
	}
	s.mu.RUnlock()
	
	return metrics
}

// GetHealthStatus returns overall system health status
func (s *Service) GetHealthStatus() map[string]interface{} {
	health := map[string]interface{}{
		"healthy":   true,
		"timestamp": time.Now().Format(time.RFC3339),
		"uptime":    time.Since(s.startTime).String(),
		"checks":    make(map[string]interface{}),
	}
	
	checks := health["checks"].(map[string]interface{})
	
	// Database health check
	if s.dbCollector != nil {
		dbHealth := s.dbCollector.CheckHealth(context.Background())
		checks["database"] = dbHealth
		if !dbHealth.Healthy {
			health["healthy"] = false
		}
	}
	
	// Redis health check
	if s.redisClient != nil {
		redisHealth := s.redisClient.HealthCheck()
		checks["redis"] = redisHealth
		if !redisHealth["healthy"].(bool) {
			health["healthy"] = false
		}
	}
	
	// System health checks
	s.systemMetrics.mu.RLock()
	memoryUsagePct := float64(s.systemMetrics.MemoryUsage) / float64(s.systemMetrics.MemoryTotal) * 100
	s.systemMetrics.mu.RUnlock()
	
	systemHealthy := true
	systemErrors := []string{}
	
	if memoryUsagePct > 90 {
		systemHealthy = false
		systemErrors = append(systemErrors, "high memory usage")
	}
	
	if s.systemMetrics.GoroutineCount > 10000 {
		systemHealthy = false
		systemErrors = append(systemErrors, "high goroutine count")
	}
	
	checks["system"] = map[string]interface{}{
		"healthy":           systemHealthy,
		"memory_usage_pct":  memoryUsagePct,
		"goroutine_count":   s.systemMetrics.GoroutineCount,
		"errors":           systemErrors,
	}
	
	if !systemHealthy {
		health["healthy"] = false
	}
	
	return health
}

// Middleware returns HTTP middleware for request monitoring
func (s *Service) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			
			// Wrap response writer to capture status code
			wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
			
			next.ServeHTTP(wrapped, r)
			
			duration := time.Since(start)
			s.RecordHTTPRequest(r.Method, r.URL.Path, wrapped.statusCode, duration)
		})
	}
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}