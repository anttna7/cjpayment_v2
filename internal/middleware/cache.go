package middleware

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/company/cjpayment/pkg/cache"
)

// CacheConfig defines cache configuration for HTTP responses
type CacheConfig struct {
	TTL           time.Duration
	KeyGenerator  func(*gin.Context) string
	ShouldCache   func(*gin.Context) bool
	SkipMethods   []string
	SkipPaths     []string
}

// DefaultCacheConfig returns default cache configuration
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		TTL:         5 * time.Minute,
		KeyGenerator: DefaultKeyGenerator,
		ShouldCache:  DefaultShouldCache,
		SkipMethods:  []string{"POST", "PUT", "DELETE", "PATCH"},
		SkipPaths:    []string{"/health", "/metrics"},
	}
}

// DefaultKeyGenerator generates cache key from request
func DefaultKeyGenerator(c *gin.Context) string {
	// Include method, path, and query parameters
	key := fmt.Sprintf("%s:%s", c.Request.Method, c.Request.URL.Path)
	
	if c.Request.URL.RawQuery != "" {
		key += "?" + c.Request.URL.RawQuery
	}
	
	// Add user context if available
	if userID, exists := c.Get("user_id"); exists {
		key += fmt.Sprintf(":user:%v", userID)
	}
	
	// Hash the key to keep it short
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("http_cache:%x", hash)
}

// DefaultShouldCache determines if response should be cached
func DefaultShouldCache(c *gin.Context) bool {
	// Don't cache error responses
	if c.Writer.Status() >= 400 {
		return false
	}
	
	// Don't cache if response is too large (>1MB)
	if c.Writer.Size() > 1024*1024 {
		return false
	}
	
	return true
}

// CacheMiddleware creates a cache middleware
func CacheMiddleware(cacheClient cache.Cache, config ...CacheConfig) gin.HandlerFunc {
	cfg := DefaultCacheConfig()
	if len(config) > 0 {
		cfg = config[0]
	}
	
	return func(c *gin.Context) {
		// Skip caching for certain methods
		if contains(cfg.SkipMethods, c.Request.Method) {
			c.Next()
			return
		}
		
		// Skip caching for certain paths
		for _, path := range cfg.SkipPaths {
			if strings.HasPrefix(c.Request.URL.Path, path) {
				c.Next()
				return
			}
		}
		
		// Generate cache key
		cacheKey := cfg.KeyGenerator(c)
		
		// Try to get from cache
		var cachedResponse CachedResponse
		err := cacheClient.Get(cacheKey, &cachedResponse)
		if err == nil {
			// Cache hit - return cached response
			c.Header("X-Cache", "HIT")
			c.Header("X-Cache-Key", cacheKey)
			
			// Set headers
			for key, value := range cachedResponse.Headers {
				c.Header(key, value)
			}
			
			c.Data(cachedResponse.StatusCode, cachedResponse.ContentType, cachedResponse.Body)
			c.Abort()
			return
		}
		
		// Cache miss - continue with request
		c.Header("X-Cache", "MISS")
		c.Header("X-Cache-Key", cacheKey)
		
		// Capture response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:          &bytes.Buffer{},
		}
		c.Writer = writer
		
		c.Next()
		
		// Check if response should be cached
		if cfg.ShouldCache(c) {
			// Cache the response
			cachedResponse := CachedResponse{
				StatusCode:  writer.Status(),
				ContentType: writer.Header().Get("Content-Type"),
				Headers:     make(map[string]string),
				Body:        writer.body.Bytes(),
				CachedAt:    time.Now(),
			}
			
			// Copy important headers
			for _, header := range []string{"Content-Type", "Content-Encoding", "Cache-Control"} {
				if value := writer.Header().Get(header); value != "" {
					cachedResponse.Headers[header] = value
				}
			}
			
			// Store in cache
			if err := cacheClient.Set(cacheKey, cachedResponse, cfg.TTL); err != nil {
				// Log error but don't fail the request
			}
		}
	}
}

// CachedResponse represents a cached HTTP response
type CachedResponse struct {
	StatusCode  int               `json:"status_code"`
	ContentType string            `json:"content_type"`
	Headers     map[string]string `json:"headers"`
	Body        []byte            `json:"body"`
	CachedAt    time.Time         `json:"cached_at"`
}

// responseWriter captures response data for caching
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(data []byte) (int, error) {
	w.body.Write(data)
	return w.ResponseWriter.Write(data)
}

func (w *responseWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

// RateLimitMiddleware creates a rate limiting middleware using cache
func RateLimitMiddleware(cacheClient cache.Cache, limit int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client identifier (IP or user ID)
		identifier := c.ClientIP()
		if userID, exists := c.Get("user_id"); exists {
			identifier = fmt.Sprintf("user:%v", userID)
		}
		
		// Create rate limit key
		key := fmt.Sprintf("rate_limit:%s:%s", c.Request.URL.Path, identifier)
		
		// Check current count
		count, err := cacheClient.IncrementBy(key, 1)
		if err != nil {
			// If cache fails, allow the request
			c.Next()
			return
		}
		
		// Set expiration on first increment
		if count == 1 {
			cacheClient.Expire(key, window)
		}
		
		// Check if limit exceeded
		if count > limit {
			c.Header("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(window).Unix(), 10))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			c.Abort()
			return
		}
		
		// Add rate limit headers
		remaining := limit - count
		if remaining < 0 {
			remaining = 0
		}
		
		c.Header("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(window).Unix(), 10))
		
		c.Next()
	}
}

// CacheInvalidationMiddleware invalidates cache on write operations
func CacheInvalidationMiddleware(cacheClient cache.Cache) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only process write operations
		if !contains([]string{"POST", "PUT", "DELETE", "PATCH"}, c.Request.Method) {
			c.Next()
			return
		}
		
		c.Next()
		
		// Invalidate related cache after successful operations
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			// Determine what to invalidate based on the path
			path := c.Request.URL.Path
			
			switch {
			case strings.Contains(path, "/users"):
				cacheClient.DeletePattern("user:*")
				cacheClient.DeletePattern("http_cache:*users*")
			case strings.Contains(path, "/merchants"):
				cacheClient.DeletePattern("merchant:*")
				cacheClient.DeletePattern("http_cache:*merchants*")
			case strings.Contains(path, "/accounts"):
				cacheClient.DeletePattern("account:*")
				cacheClient.DeletePattern("http_cache:*accounts*")
			case strings.Contains(path, "/orders"):
				cacheClient.DeletePattern("recharge_order:*")
				cacheClient.DeletePattern("stats:*")
				cacheClient.DeletePattern("http_cache:*orders*")
			case strings.Contains(path, "/reports"):
				cacheClient.DeletePattern("report:*")
				cacheClient.DeletePattern("stats:*")
				cacheClient.DeletePattern("http_cache:*reports*")
			}
		}
	}
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}