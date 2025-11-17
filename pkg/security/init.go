package security

import (
	"fmt"
)

// SecuritySystem holds all security components
type SecuritySystem struct {
	Config         SecurityConfig
	Encryption     *EncryptionService
	Validator      *InputValidator
	AuditLogger    AuditLogger
	Monitor        *SecurityMonitor
	Reporter       *AuditReporter
}

// InitializeSecuritySystem initializes the complete security system
func InitializeSecuritySystem(config SecurityConfig) (*SecuritySystem, error) {
	// Validate configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid security configuration: %w", err)
	}
	
	// Initialize encryption service
	var encryption *EncryptionService
	if config.Encryption.Enabled {
		encryption = NewEncryptionService(config.Encryption.SecretKey)
	}
	
	// Initialize input validator
	validator := NewInputValidator()
	
	// Initialize audit logger
	auditLogger := NewDatabaseAuditLogger()
	
	// Initialize security monitor
	monitor := NewSecurityMonitor(auditLogger)
	
	// Initialize audit reporter
	reporter := NewAuditReporter(auditLogger)
	
	return &SecuritySystem{
		Config:      config,
		Encryption:  encryption,
		Validator:   validator,
		AuditLogger: auditLogger,
		Monitor:     monitor,
		Reporter:    reporter,
	}, nil
}

// IsEnabled checks if the security system is enabled
func (ss *SecuritySystem) IsEnabled() bool {
	return ss.Config.Validation.Enabled || ss.Config.Audit.Enabled || ss.Config.Encryption.Enabled
}

// GetEncryption returns the encryption service (can be nil if disabled)
func (ss *SecuritySystem) GetEncryption() *EncryptionService {
	return ss.Encryption
}

// GetValidator returns the input validator
func (ss *SecuritySystem) GetValidator() *InputValidator {
	return ss.Validator
}

// GetAuditLogger returns the audit logger
func (ss *SecuritySystem) GetAuditLogger() AuditLogger {
	return ss.AuditLogger
}

// GetMonitor returns the security monitor
func (ss *SecuritySystem) GetMonitor() *SecurityMonitor {
	return ss.Monitor
}

// GetReporter returns the audit reporter
func (ss *SecuritySystem) GetReporter() *AuditReporter {
	return ss.Reporter
}

// ValidateAndSanitizeInput validates and sanitizes input using the configured validator
func (ss *SecuritySystem) ValidateAndSanitizeInput(input string, fieldName string, required bool) ValidationResult {
	if !ss.Config.Validation.Enabled {
		return ValidationResult{Valid: true}
	}
	
	return ss.Validator.ValidateAndSanitize(input, fieldName, required)
}

// EncryptSensitiveData encrypts sensitive data if encryption is enabled
func (ss *SecuritySystem) EncryptSensitiveData(data map[string]interface{}) (map[string]interface{}, error) {
	if !ss.Config.Encryption.Enabled || ss.Encryption == nil {
		return data, nil
	}
	
	return ss.Encryption.EncryptSensitiveData(data)
}

// DecryptSensitiveData decrypts sensitive data if encryption is enabled
func (ss *SecuritySystem) DecryptSensitiveData(data map[string]interface{}) (map[string]interface{}, error) {
	if !ss.Config.Encryption.Enabled || ss.Encryption == nil {
		return data, nil
	}
	
	return ss.Encryption.DecryptSensitiveData(data)
}

// CheckPasswordPolicy validates password against the configured policy
func (ss *SecuritySystem) CheckPasswordPolicy(password string) ValidationResult {
	policy := ss.Config.Auth.PasswordPolicy
	
	var errors []string
	
	if len(password) < policy.MinLength {
		errors = append(errors, fmt.Sprintf("Password must be at least %d characters", policy.MinLength))
	}
	
	if policy.RequireUppercase && !hasUppercase(password) {
		errors = append(errors, "Password must contain at least one uppercase letter")
	}
	
	if policy.RequireLowercase && !hasLowercase(password) {
		errors = append(errors, "Password must contain at least one lowercase letter")
	}
	
	if policy.RequireDigits && !hasDigit(password) {
		errors = append(errors, "Password must contain at least one digit")
	}
	
	if policy.RequireSpecial && !hasSpecialChar(password) {
		errors = append(errors, "Password must contain at least one special character")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// GetRateLimitRule returns the rate limit rule for a specific endpoint
func (ss *SecuritySystem) GetRateLimitRule(endpoint string) *RateLimitRule {
	if !ss.Config.RateLimit.Enabled {
		return nil
	}
	
	// Check for endpoint-specific rule
	if rule, exists := ss.Config.RateLimit.Endpoints[endpoint]; exists {
		return &rule
	}
	
	// Return global rule
	return &ss.Config.RateLimit.Global
}

// ShouldLogEvent checks if an event should be logged based on configuration
func (ss *SecuritySystem) ShouldLogEvent(eventType string) bool {
	if !ss.Config.Audit.Enabled {
		return false
	}
	
	for _, loggedType := range ss.Config.Audit.LogEvents {
		if loggedType == eventType {
			return true
		}
	}
	
	return false
}

// GetSecurityHeaders returns security headers based on configuration
func (ss *SecuritySystem) GetSecurityHeaders() map[string]string {
	headers := make(map[string]string)
	
	// Always set basic security headers
	headers["X-Content-Type-Options"] = "nosniff"
	headers["X-Frame-Options"] = "DENY"
	headers["X-XSS-Protection"] = "1; mode=block"
	headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
	
	// Add HSTS if TLS is enabled
	if ss.Config.TLS.Enabled {
		headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
	}
	
	// Add CSP header
	headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
	
	return headers
}

// GetCORSConfig returns CORS configuration
func (ss *SecuritySystem) GetCORSConfig() CORSConfig {
	return ss.Config.CORS
}

// IsAccountLockoutEnabled checks if account lockout is enabled
func (ss *SecuritySystem) IsAccountLockoutEnabled() bool {
	return ss.Config.Auth.AccountLockout.Enabled
}

// GetAccountLockoutConfig returns account lockout configuration
func (ss *SecuritySystem) GetAccountLockoutConfig() AccountLockoutConfig {
	return ss.Config.Auth.AccountLockout
}

// IsTwoFactorAuthEnabled checks if 2FA is enabled
func (ss *SecuritySystem) IsTwoFactorAuthEnabled() bool {
	return ss.Config.Auth.TwoFactorAuth.Enabled
}

// GetTwoFactorAuthConfig returns 2FA configuration
func (ss *SecuritySystem) GetTwoFactorAuthConfig() TwoFactorAuthConfig {
	return ss.Config.Auth.TwoFactorAuth
}

// Helper functions for password validation
func hasUppercase(s string) bool {
	for _, r := range s {
		if r >= 'A' && r <= 'Z' {
			return true
		}
	}
	return false
}

func hasLowercase(s string) bool {
	for _, r := range s {
		if r >= 'a' && r <= 'z' {
			return true
		}
	}
	return false
}

func hasDigit(s string) bool {
	for _, r := range s {
		if r >= '0' && r <= '9' {
			return true
		}
	}
	return false
}

func hasSpecialChar(s string) bool {
	specialChars := "!@#$%^&*()_+-=[]{}|;:,.<>?"
	for _, r := range s {
		for _, special := range specialChars {
			if r == special {
				return true
			}
		}
	}
	return false
}