package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitConfig represents rate limiting configuration
type RateLimitConfig struct {
	Requests int           `json:"requests"` // Number of requests allowed
	Window   time.Duration `json:"window"`   // Time window
	KeyFunc  func(*gin.Context) string       // Function to generate rate limit key
}

// RateLimiter handles API rate limiting
type RateLimiter struct {
	redis   *redis.Client
	configs map[string]RateLimitConfig
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redisClient *redis.Client) *RateLimiter {
	rl := &RateLimiter{
		redis:   redisClient,
		configs: make(map[string]RateLimitConfig),
	}
	
	// Initialize default rate limit configs
	rl.initializeDefaultConfigs()
	
	return rl
}

// initializeDefaultConfigs sets up default rate limiting rules
func (rl *RateLimiter) initializeDefaultConfigs() {
	// Global rate limit - per IP
	rl.configs["global"] = RateLimitConfig{
		Requests: 1000,
		Window:   time.Hour,
		KeyFunc: func(c *gin.Context) string {
			return fmt.Sprintf("rate_limit:global:%s", getClientIP(c))
		},
	}

	// Authentication endpoints - per IP
	rl.configs["auth"] = RateLimitConfig{
		Requests: 10,
		Window:   time.Minute * 15,
		KeyFunc: func(c *gin.Context) string {
			return fmt.Sprintf("rate_limit:auth:%s", getClientIP(c))
		},
	}

	// Recharge creation - per IP
	rl.configs["recharge_create"] = RateLimitConfig{
		Requests: 5,
		Window:   time.Minute,
		KeyFunc: func(c *gin.Context) string {
			return fmt.Sprintf("rate_limit:recharge_create:%s", getClientIP(c))
		},
	}

	// File upload - per IP
	rl.configs["upload"] = RateLimitConfig{
		Requests: 20,
		Window:   time.Minute * 5,
		KeyFunc: func(c *gin.Context) string {
			return fmt.Sprintf("rate_limit:upload:%s", getClientIP(c))
		},
	}

	// API calls - per user
	rl.configs["api_user"] = RateLimitConfig{
		Requests: 500,
		Window:   time.Hour,
		KeyFunc: func(c *gin.Context) string {
			userID, exists := c.Get("user_id")
			if !exists {
				return fmt.Sprintf("rate_limit:api_user:anonymous:%s", getClientIP(c))
			}
			return fmt.Sprintf("rate_limit:api_user:%v", userID)
		},
	}

	// Admin operations - per user
	rl.configs["admin"] = RateLimitConfig{
		Requests: 200,
		Window:   time.Hour,
		KeyFunc: func(c *gin.Context) string {
			userID, exists := c.Get("user_id")
			if !exists {
				return fmt.Sprintf("rate_limit:admin:anonymous:%s", getClientIP(c))
			}
			return fmt.Sprintf("rate_limit:admin:%v", userID)
		},
	}
}

// RateLimit middleware with specific configuration
func (rl *RateLimiter) RateLimit(configName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, exists := rl.configs[configName]
		if !exists {
			// If config doesn't exist, use global config
			config = rl.configs["global"]
		}

		key := config.KeyFunc(c)
		allowed, remaining, resetTime, err := rl.checkRateLimit(key, config.Requests, config.Window)
		
		if err != nil {
			// Log error but don't block request if Redis is down
			c.Header("X-RateLimit-Error", "Rate limit check failed")
			c.Next()
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(config.Requests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    4291,
					"message": "Rate limit exceeded",
					"details": fmt.Sprintf("Too many requests. Limit: %d per %v", config.Requests, config.Window),
				},
				"retry_after": int(time.Until(resetTime).Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// DynamicRateLimit middleware with custom configuration
func (rl *RateLimiter) DynamicRateLimit(requests int, window time.Duration, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := keyFunc(c)
		allowed, remaining, resetTime, err := rl.checkRateLimit(key, requests, window)
		
		if err != nil {
			c.Header("X-RateLimit-Error", "Rate limit check failed")
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(requests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    4291,
					"message": "Rate limit exceeded",
					"details": fmt.Sprintf("Too many requests. Limit: %d per %v", requests, window),
				},
				"retry_after": int(time.Until(resetTime).Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// checkRateLimit checks if request is within rate limit
func (rl *RateLimiter) checkRateLimit(key string, limit int, window time.Duration) (allowed bool, remaining int, resetTime time.Time, err error) {
	if rl.redis == nil {
		return true, limit, time.Now().Add(window), nil
	}

	ctx := context.Background()
	now := time.Now()
	windowStart := now.Add(-window)

	// Use sliding window log algorithm
	pipe := rl.redis.Pipeline()
	
	// Remove expired entries
	pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart.UnixNano(), 10))
	
	// Count current requests
	countCmd := pipe.ZCard(ctx, key)
	
	// Add current request
	pipe.ZAdd(ctx, key, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})
	
	// Set expiry
	pipe.Expire(ctx, key, window)
	
	_, err = pipe.Exec(ctx)
	if err != nil {
		return false, 0, time.Time{}, err
	}

	currentCount := int(countCmd.Val())
	
	// Check if within limit (subtract 1 because we already added current request)
	if currentCount > limit {
		// Remove the request we just added since it exceeds limit
		rl.redis.ZRem(ctx, key, fmt.Sprintf("%d", now.UnixNano()))
		return false, 0, now.Add(window), nil
	}

	remaining = limit - currentCount
	if remaining < 0 {
		remaining = 0
	}

	return true, remaining, now.Add(window), nil
}

// AddConfig adds a new rate limit configuration
func (rl *RateLimiter) AddConfig(name string, config RateLimitConfig) {
	rl.configs[name] = config
}

// UpdateConfig updates an existing rate limit configuration
func (rl *RateLimiter) UpdateConfig(name string, config RateLimitConfig) error {
	if _, exists := rl.configs[name]; !exists {
		return fmt.Errorf("rate limit config %s does not exist", name)
	}
	
	rl.configs[name] = config
	return nil
}

// RemoveConfig removes a rate limit configuration
func (rl *RateLimiter) RemoveConfig(name string) error {
	if _, exists := rl.configs[name]; !exists {
		return fmt.Errorf("rate limit config %s does not exist", name)
	}
	
	delete(rl.configs, name)
	return nil
}

// GetConfig returns a rate limit configuration
func (rl *RateLimiter) GetConfig(name string) (RateLimitConfig, error) {
	config, exists := rl.configs[name]
	if !exists {
		return RateLimitConfig{}, fmt.Errorf("rate limit config %s does not exist", name)
	}
	
	return config, nil
}

// ResetRateLimit resets rate limit for a specific key
func (rl *RateLimiter) ResetRateLimit(key string) error {
	if rl.redis == nil {
		return nil
	}
	
	return rl.redis.Del(context.Background(), key).Err()
}

// GetRateLimitStatus returns current rate limit status for a key
func (rl *RateLimiter) GetRateLimitStatus(key string, limit int, window time.Duration) (current int, remaining int, resetTime time.Time, err error) {
	if rl.redis == nil {
		return 0, limit, time.Now().Add(window), nil
	}

	ctx := context.Background()
	now := time.Now()
	windowStart := now.Add(-window)

	// Count current requests in window
	count, err := rl.redis.ZCount(ctx, key, strconv.FormatInt(windowStart.UnixNano(), 10), "+inf").Result()
	if err != nil {
		return 0, 0, time.Time{}, err
	}

	current = int(count)
	remaining = limit - current
	if remaining < 0 {
		remaining = 0
	}

	// Get the oldest entry to calculate reset time
	oldestEntries, err := rl.redis.ZRangeWithScores(ctx, key, 0, 0).Result()
	if err != nil || len(oldestEntries) == 0 {
		resetTime = now.Add(window)
	} else {
		oldestTime := time.Unix(0, int64(oldestEntries[0].Score))
		resetTime = oldestTime.Add(window)
	}

	return current, remaining, resetTime, nil
}

// getClientIP extracts client IP from request
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// Check CF-Connecting-IP header (Cloudflare)
	if cfip := c.GetHeader("CF-Connecting-IP"); cfip != "" {
		return cfip
	}

	// Fall back to RemoteAddr
	return c.ClientIP()
}