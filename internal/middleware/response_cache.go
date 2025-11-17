package middleware

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"cjpayment/pkg/cache"
)

// ResponseCacheConfig holds configuration for response caching
type ResponseCacheConfig struct {
	Cache                cache.Cache
	DefaultTTL           time.Duration
	IgnoreQueryParams    []string
	CacheableStatusCodes []int
	CacheableContentTypes []string
	SkipCacheHeader      string
	VaryHeaders          []string
}

// DefaultResponseCacheConfig returns default response cache configuration
func DefaultResponseCacheConfig(cache cache.Cache) ResponseCacheConfig {
	return ResponseCacheConfig{
		Cache:      cache,
		DefaultTTL: 5 * time.Minute,
		IgnoreQueryParams: []string{
			"_t", "_timestamp", "cache_bust", "cb",
		},
		CacheableStatusCodes: []int{
			http.StatusOK,
			http.StatusCreated,
			http.StatusAccepted,
		},
		CacheableContentTypes: []string{
			"application/json",
			"text/json",
		},
		SkipCacheHeader: "X-Skip-Cache",
		VaryHeaders: []string{
			"Authorization",
			"Accept-Language",
		},
	}
}

// CachedResponse represents a cached HTTP response
type CachedResponse struct {
	StatusCode int                 `json:"status_code"`
	Headers    map[string][]string `json:"headers"`
	Body       []byte              `json:"body"`
	Timestamp  time.Time           `json:"timestamp"`
	TTL        time.Duration       `json:"ttl"`
}

// ResponseCacheMiddleware creates a response caching middleware
func ResponseCacheMiddleware(config ResponseCacheConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip caching if explicitly requested
		if c.GetHeader(config.SkipCacheHeader) != "" {
			c.Next()
			return
		}

		// Skip caching for non-GET requests
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		// Generate cache key
		cacheKey := generateCacheKey(c, config)

		// Try to get cached response
		var cachedResp CachedResponse
		if err := config.Cache.Get(cacheKey, &cachedResp); err == nil {
			// Check if cached response is still valid
			if time.Since(cachedResp.Timestamp) < cachedResp.TTL {
				// Serve cached response
				serveCachedResponse(c, cachedResp)
				return
			}
		}

		// Create response writer wrapper to capture response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:          &bytes.Buffer{},
		}
		c.Writer = writer

		// Process request
		c.Next()

		// Cache response if conditions are met
		if shouldCacheResponse(c, writer, config) {
			cacheResponse(cacheKey, writer, config)
		}
	}
}

// responseWriter wraps gin.ResponseWriter to capture response body
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

// generateCacheKey generates a cache key for the request
func generateCacheKey(c *gin.Context, config ResponseCacheConfig) string {
	// Start with method and path
	key := fmt.Sprintf("%s:%s", c.Request.Method, c.Request.URL.Path)

	// Add query parameters (excluding ignored ones)
	if len(c.Request.URL.RawQuery) > 0 {
		params := c.Request.URL.Query()
		filteredParams := make(map[string][]string)

		for param, values := range params {
			if !contains(config.IgnoreQueryParams, param) {
				filteredParams[param] = values
			}
		}

		if len(filteredParams) > 0 {
			paramBytes, _ := json.Marshal(filteredParams)
			key += ":" + string(paramBytes)
		}
	}

	// Add vary headers
	for _, header := range config.VaryHeaders {
		if value := c.GetHeader(header); value != "" {
			key += ":" + header + "=" + value
		}
	}

	// Generate MD5 hash of the key to keep it short
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("response_cache:%x", hash)
}

// shouldCacheResponse determines if a response should be cached
func shouldCacheResponse(c *gin.Context, writer *responseWriter, config ResponseCacheConfig) bool {
	// Check status code
	if !contains(config.CacheableStatusCodes, writer.Status()) {
		return false
	}

	// Check content type
	contentType := writer.Header().Get("Content-Type")
	if contentType != "" {
		for _, cacheableType := range config.CacheableContentTypes {
			if strings.Contains(contentType, cacheableType) {
				return true
			}
		}
		return false
	}

	return true
}

// cacheResponse stores the response in cache
func cacheResponse(cacheKey string, writer *responseWriter, config ResponseCacheConfig) {
	// Determine TTL
	ttl := config.DefaultTTL
	if cacheControl := writer.Header().Get("Cache-Control"); cacheControl != "" {
		if maxAge := extractMaxAge(cacheControl); maxAge > 0 {
			ttl = time.Duration(maxAge) * time.Second
		}
	}

	// Create cached response
	cachedResp := CachedResponse{
		StatusCode: writer.Status(),
		Headers:    writer.Header(),
		Body:       writer.body.Bytes(),
		Timestamp:  time.Now(),
		TTL:        ttl,
	}

	// Store in cache
	config.Cache.Set(cacheKey, cachedResp, ttl)
}

// serveCachedResponse serves a cached response
func serveCachedResponse(c *gin.Context, cachedResp CachedResponse) {
	// Set headers
	for key, values := range cachedResp.Headers {
		for _, value := range values {
			c.Header(key, value)
		}
	}

	// Add cache hit header
	c.Header("X-Cache", "HIT")
	c.Header("X-Cache-Timestamp", cachedResp.Timestamp.Format(time.RFC3339))

	// Set status and body
	c.Data(cachedResp.StatusCode, c.GetHeader("Content-Type"), cachedResp.Body)
	c.Abort()
}

// extractMaxAge extracts max-age value from Cache-Control header
func extractMaxAge(cacheControl string) int {
	parts := strings.Split(cacheControl, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "max-age=") {
			if maxAge, err := strconv.Atoi(part[8:]); err == nil {
				return maxAge
			}
		}
	}
	return 0
}

// contains checks if a slice contains a value
func contains[T comparable](slice []T, value T) bool {
	for _, item := range slice {
		if item == value {
			return true
		}
	}
	return false
}

// RechargeResponseCacheMiddleware creates response cache middleware for recharge system
func RechargeResponseCacheMiddleware(cache cache.Cache) gin.HandlerFunc {
	config := ResponseCacheConfig{
		Cache:      cache,
		DefaultTTL: 5 * time.Minute,
		IgnoreQueryParams: []string{
			"_t", "_timestamp", "cache_bust", "cb", "nocache",
		},
		CacheableStatusCodes: []int{
			http.StatusOK,
		},
		CacheableContentTypes: []string{
			"application/json",
		},
		SkipCacheHeader: "X-Skip-Cache",
		VaryHeaders: []string{
			"Authorization",
		},
	}

	return ResponseCacheMiddleware(config)
}

// CacheInvalidationMiddleware provides cache invalidation functionality
type CacheInvalidationMiddleware struct {
	cache cache.Cache
}

// NewCacheInvalidationMiddleware creates a new cache invalidation middleware
func NewCacheInvalidationMiddleware(cache cache.Cache) *CacheInvalidationMiddleware {
	return &CacheInvalidationMiddleware{
		cache: cache,
	}
}

// InvalidateOnWrite invalidates cache on write operations
func (cim *CacheInvalidationMiddleware) InvalidateOnWrite() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Store original method
		method := c.Request.Method

		// Process request
		c.Next()

		// Invalidate cache on successful write operations
		if method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions {
			if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
				// Determine what to invalidate based on the endpoint
				cim.invalidateRelatedCache(c)
			}
		}
	}
}

// invalidateRelatedCache invalidates cache based on the endpoint
func (cim *CacheInvalidationMiddleware) invalidateRelatedCache(c *gin.Context) {
	path := c.Request.URL.Path

	switch {
	case strings.Contains(path, "/merchants"):
		// Invalidate merchant-related cache
		cim.cache.DeletePattern("response_cache:*merchants*")
		cim.cache.DeletePattern("recharge:merchant:*")
		cim.cache.DeletePattern("recharge:merchant_accounts:*")

	case strings.Contains(path, "/accounts"):
		// Invalidate account-related cache
		cim.cache.DeletePattern("response_cache:*accounts*")
		cim.cache.DeletePattern("recharge:account:*")
		cim.cache.DeletePattern("recharge:account_status:*")

	case strings.Contains(path, "/orders"):
		// Invalidate order-related cache
		cim.cache.DeletePattern("response_cache:*orders*")
		cim.cache.DeletePattern("recharge:order:*")
		cim.cache.DeletePattern("recharge:stats:*")

	case strings.Contains(path, "/recharge"):
		// Invalidate recharge-related cache
		cim.cache.DeletePattern("response_cache:*recharge*")
		cim.cache.DeletePattern("recharge:matching:*")
	}
}

// ConditionalCacheMiddleware provides conditional caching based on request parameters
func ConditionalCacheMiddleware(cache cache.Cache) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if caching should be enabled for this request
		if !shouldEnableCache(c) {
			c.Next()
			return
		}

		// Determine TTL based on endpoint
		ttl := determineTTL(c)

		// Create custom config
		config := ResponseCacheConfig{
			Cache:      cache,
			DefaultTTL: ttl,
			IgnoreQueryParams: []string{
				"_t", "_timestamp", "cache_bust", "cb", "nocache",
			},
			CacheableStatusCodes: []int{
				http.StatusOK,
			},
			CacheableContentTypes: []string{
				"application/json",
			},
			SkipCacheHeader: "X-Skip-Cache",
			VaryHeaders: []string{
				"Authorization",
			},
		}

		// Apply caching middleware
		ResponseCacheMiddleware(config)(c)
	}
}

// shouldEnableCache determines if caching should be enabled for the request
func shouldEnableCache(c *gin.Context) bool {
	// Don't cache if explicitly disabled
	if c.Query("nocache") != "" || c.GetHeader("X-Skip-Cache") != "" {
		return false
	}

	// Only cache GET requests
	if c.Request.Method != http.MethodGet {
		return false
	}

	// Don't cache authenticated requests with sensitive data
	path := c.Request.URL.Path
	if strings.Contains(path, "/admin") || strings.Contains(path, "/private") {
		return false
	}

	return true
}

// determineTTL determines cache TTL based on the endpoint
func determineTTL(c *gin.Context) time.Duration {
	path := c.Request.URL.Path

	switch {
	case strings.Contains(path, "/merchants"):
		return 30 * time.Minute // Merchants change infrequently

	case strings.Contains(path, "/accounts"):
		return 15 * time.Minute // Account status changes moderately

	case strings.Contains(path, "/orders"):
		return 5 * time.Minute // Orders change frequently

	case strings.Contains(path, "/stats"):
		return 2 * time.Minute // Statistics change very frequently

	case strings.Contains(path, "/recharge"):
		return 1 * time.Minute // Recharge data changes rapidly

	default:
		return 5 * time.Minute // Default TTL
	}
}