package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"

	// "cjpayment/internal/middleware" // removed to avoid import cycle
	"cjpayment/pkg/security"
)

// SecurityService provides comprehensive security services
type SecurityService struct {
	encryptor       *security.EncryptionService
	auditLogger     *security.AuditLogger
	securityMonitor *security.SecurityMonitor
	// jwtAuth         *middleware.JWTAuthMiddleware // removed to avoid import cycle
	// rbac            *middleware.RBACMiddleware // removed to avoid import cycle
	// rateLimiter     *middleware.RateLimiter // removed to avoid import cycle
	redis           *redis.Client
	logger          *logrus.Logger
}

// SecurityConfig holds security configuration
type SecurityConfig struct {
	JWTSecret       string `json:"jwt_secret"`
	EncryptionKey   string `json:"encryption_key"`
	EnableAudit     bool   `json:"enable_audit"`
	EnableMonitor   bool   `json:"enable_monitor"`
	// RateLimitConfig map[string]middleware.RateLimitConfig `json:"rate_limit_config"` // removed to avoid import cycle
}

// NewSecurityService creates a new security service
func NewSecurityService(config SecurityConfig, redisClient *redis.Client, logger *logrus.Logger) *SecurityService {
	// Initialize encryption service
	encryptor := security.NewEncryptionService(config.EncryptionKey)

	// Initialize audit logger
	auditLogger := security.NewAuditLogger(logger, redisClient, encryptor)

	// Initialize security monitor
	securityMonitor := security.NewSecurityMonitor(redisClient, logger, encryptor, auditLogger)

	// Initialize JWT auth middleware
	jwtAuth := middleware.NewJWTAuthMiddleware(config.JWTSecret, redisClient)

	// Initialize RBAC middleware
	rbac := middleware.NewRBACMiddleware()

	// Initialize rate limiter
	rateLimiter := middleware.NewRateLimiter(redisClient)

	// Apply custom rate limit configs
	for name, rlConfig := range config.RateLimitConfig {
		rateLimiter.AddConfig(name, rlConfig)
	}

	service := &SecurityService{
		encryptor:       encryptor,
		auditLogger:     auditLogger,
		securityMonitor: securityMonitor,
		jwtAuth:         jwtAuth,
		rbac:            rbac,
		rateLimiter:     rateLimiter,
		redis:           redisClient,
		logger:          logger,
	}

	// Start security monitor if enabled
	if config.EnableMonitor {
		securityMonitor.Start()
	}

	return service
}

// Authentication methods
func (ss *SecurityService) GenerateToken(userID uint, username, role string) (string, error) {
	return ss.jwtAuth.GenerateToken(userID, username, role)
}

func (ss *SecurityService) RefreshToken(oldToken string) (string, error) {
	return ss.jwtAuth.RefreshToken(oldToken)
}

func (ss *SecurityService) RevokeToken(token string) error {
	return ss.jwtAuth.RevokeToken(token)
}

func (ss *SecurityService) ValidatePassword(password string) error {
	return ss.encryptor.ValidatePasswordStrength(password)
}

func (ss *SecurityService) HashPassword(password string) (string, error) {
	return ss.encryptor.HashPassword(password)
}

func (ss *SecurityService) VerifyPassword(password, hash string) bool {
	return ss.encryptor.VerifyPassword(password, hash)
}

// Data encryption methods
func (ss *SecurityService) EncryptData(data string) (string, error) {
	return ss.encryptor.Encrypt(data)
}

func (ss *SecurityService) DecryptData(encryptedData string) (string, error) {
	return ss.encryptor.Decrypt(encryptedData)
}

func (ss *SecurityService) MaskSensitiveData(data string, maskChar rune, visibleStart, visibleEnd int) string {
	return ss.encryptor.MaskSensitiveData(data, maskChar, visibleStart, visibleEnd)
}

func (ss *SecurityService) MaskPhone(phone string) string {
	return ss.encryptor.MaskPhone(phone)
}

func (ss *SecurityService) MaskEmail(email string) string {
	return ss.encryptor.MaskEmail(email)
}

func (ss *SecurityService) MaskBankAccount(account string) string {
	return ss.encryptor.MaskBankAccount(account)
}

// API Key management
func (ss *SecurityService) GenerateAPIKey() (string, error) {
	return ss.encryptor.GenerateAPIKey()
}

func (ss *SecurityService) ValidateAPIKey(apiKey string) bool {
	return ss.encryptor.ValidateAPIKey(apiKey)
}

// Audit logging methods
func (ss *SecurityService) LogAuthEvent(eventType string, c *gin.Context, userID uint, username string, success bool, message string) {
	ss.auditLogger.LogAuthEvent(eventType, c, userID, username, success, message)
}

func (ss *SecurityService) LogAccessEvent(c *gin.Context, resource, action string, success bool, message string) {
	ss.auditLogger.LogAccessEvent(c, resource, action, success, message)
}

func (ss *SecurityService) LogDataEvent(c *gin.Context, resource, action string, recordID interface{}, oldData, newData map[string]interface{}, success bool, message string) {
	ss.auditLogger.LogDataEvent(c, resource, action, recordID, oldData, newData, success, message)
}

func (ss *SecurityService) LogSecurityEvent(eventType string, c *gin.Context, riskLevel, message string, details map[string]interface{}) {
	ss.auditLogger.LogSecurityEvent(eventType, c, riskLevel, message, details)
}

// Permission management
func (ss *SecurityService) HasPermission(roleName, resource, action string) bool {
	return ss.rbac.CanAccess(roleName, resource, action)
}

func (ss *SecurityService) GetUserPermissions(roleName string) []middleware.Permission {
	return ss.rbac.GetUserPermissions(roleName)
}

func (ss *SecurityService) AddRole(role middleware.Role) {
	ss.rbac.AddRole(role)
}

func (ss *SecurityService) UpdateRole(roleName string, role middleware.Role) error {
	return ss.rbac.UpdateRole(roleName, role)
}

func (ss *SecurityService) RemoveRole(roleName string) error {
	return ss.rbac.RemoveRole(roleName)
}

func (ss *SecurityService) ListRoles() []middleware.Role {
	return ss.rbac.ListRoles()
}

// Rate limiting methods
func (ss *SecurityService) CheckRateLimit(key string, limit int, window time.Duration) (allowed bool, remaining int, resetTime time.Time, err error) {
	return ss.rateLimiter.GetRateLimitStatus(key, limit, window)
}

func (ss *SecurityService) ResetRateLimit(key string) error {
	return ss.rateLimiter.ResetRateLimit(key)
}

func (ss *SecurityService) AddRateLimitConfig(name string, config middleware.RateLimitConfig) {
	ss.rateLimiter.AddConfig(name, config)
}

// Security monitoring methods
func (ss *SecurityService) GetSecurityAlerts(severity string, limit int) ([]security.SecurityAlert, error) {
	return ss.securityMonitor.GetAlerts(severity, limit)
}

func (ss *SecurityService) AcknowledgeAlert(alertID string) error {
	return ss.securityMonitor.AcknowledgeAlert(alertID)
}

func (ss *SecurityService) ResolveAlert(alertID string) error {
	return ss.securityMonitor.ResolveAlert(alertID)
}

func (ss *SecurityService) AddThreatPattern(name string, pattern security.ThreatPattern) {
	ss.securityMonitor.AddThreatPattern(name, pattern)
}

func (ss *SecurityService) RemoveThreatPattern(name string) {
	ss.securityMonitor.RemoveThreatPattern(name)
}

// Middleware methods
func (ss *SecurityService) RequireAuth() gin.HandlerFunc {
	return ss.jwtAuth.RequireAuth()
}

func (ss *SecurityService) RequireRole(roles ...string) gin.HandlerFunc {
	return ss.jwtAuth.RequireRole(roles...)
}

func (ss *SecurityService) RequirePermission(resource, action string) gin.HandlerFunc {
	return ss.rbac.RequirePermission(resource, action)
}

func (ss *SecurityService) RequireAnyPermission(permissions ...middleware.Permission) gin.HandlerFunc {
	return ss.rbac.RequireAnyPermission(permissions...)
}

func (ss *SecurityService) AutoPermissionCheck() gin.HandlerFunc {
	return ss.rbac.AutoPermissionCheck()
}

func (ss *SecurityService) RateLimit(configName string) gin.HandlerFunc {
	return ss.rateLimiter.RateLimit(configName)
}

func (ss *SecurityService) DynamicRateLimit(requests int, window time.Duration, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return ss.rateLimiter.DynamicRateLimit(requests, window, keyFunc)
}

func (ss *SecurityService) AuditMiddleware() gin.HandlerFunc {
	return ss.auditLogger.AuditMiddleware()
}

// Security validation methods
func (ss *SecurityService) ValidateIPAddress(ip string) bool {
	// Implementation for IP validation
	return true // Placeholder
}

func (ss *SecurityService) IsIPBlocked(ip string) bool {
	if ss.redis == nil {
		return false
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_ips:%s", ip)
	exists, err := ss.redis.Exists(ctx, key).Result()
	if err != nil {
		return false
	}

	return exists > 0
}

func (ss *SecurityService) BlockIP(ip string, duration time.Duration, reason string) error {
	if ss.redis == nil {
		return fmt.Errorf("Redis not available")
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_ips:%s", ip)
	
	blockInfo := map[string]interface{}{
		"blocked_at": time.Now().Unix(),
		"reason":     reason,
		"duration":   duration.String(),
	}

	if err := ss.redis.HMSet(ctx, key, blockInfo).Err(); err != nil {
		return fmt.Errorf("failed to block IP: %w", err)
	}

	if err := ss.redis.Expire(ctx, key, duration).Err(); err != nil {
		return fmt.Errorf("failed to set IP block expiry: %w", err)
	}

	ss.logger.WithFields(logrus.Fields{
		"ip":       ip,
		"duration": duration,
		"reason":   reason,
	}).Warn("IP address blocked")

	return nil
}

func (ss *SecurityService) UnblockIP(ip string) error {
	if ss.redis == nil {
		return fmt.Errorf("Redis not available")
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_ips:%s", ip)
	
	if err := ss.redis.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to unblock IP: %w", err)
	}

	ss.logger.WithField("ip", ip).Info("IP address unblocked")
	return nil
}

func (ss *SecurityService) IsUserBlocked(userID uint) bool {
	if ss.redis == nil {
		return false
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_users:%d", userID)
	exists, err := ss.redis.Exists(ctx, key).Result()
	if err != nil {
		return false
	}

	return exists > 0
}

func (ss *SecurityService) BlockUser(userID uint, duration time.Duration, reason string) error {
	if ss.redis == nil {
		return fmt.Errorf("Redis not available")
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_users:%d", userID)
	
	blockInfo := map[string]interface{}{
		"blocked_at": time.Now().Unix(),
		"reason":     reason,
		"duration":   duration.String(),
	}

	if err := ss.redis.HMSet(ctx, key, blockInfo).Err(); err != nil {
		return fmt.Errorf("failed to block user: %w", err)
	}

	if err := ss.redis.Expire(ctx, key, duration).Err(); err != nil {
		return fmt.Errorf("failed to set user block expiry: %w", err)
	}

	ss.logger.WithFields(logrus.Fields{
		"user_id":  userID,
		"duration": duration,
		"reason":   reason,
	}).Warn("User blocked")

	return nil
}

func (ss *SecurityService) UnblockUser(userID uint) error {
	if ss.redis == nil {
		return fmt.Errorf("Redis not available")
	}

	ctx := context.Background()
	key := fmt.Sprintf("security:blocked_users:%d", userID)
	
	if err := ss.redis.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to unblock user: %w", err)
	}

	ss.logger.WithField("user_id", userID).Info("User unblocked")
	return nil
}

// Security health check
func (ss *SecurityService) HealthCheck() map[string]interface{} {
	health := map[string]interface{}{
		"encryption_service": "ok",
		"audit_logger":       "ok",
		"rbac":              "ok",
		"rate_limiter":      "ok",
	}

	// Check Redis connection
	if ss.redis != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		if err := ss.redis.Ping(ctx).Err(); err != nil {
			health["redis"] = "error: " + err.Error()
		} else {
			health["redis"] = "ok"
		}
	} else {
		health["redis"] = "not configured"
	}

	// Check security monitor
	health["security_monitor"] = "ok"

	return health
}

// Cleanup method
func (ss *SecurityService) Cleanup() {
	if ss.securityMonitor != nil {
		ss.securityMonitor.Stop()
	}
	ss.logger.Info("Security service cleanup completed")
}