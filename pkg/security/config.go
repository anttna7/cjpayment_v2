package security

import (
	"fmt"
	"time"
)

// SecurityConfig holds all security-related configuration
type SecurityConfig struct {
	// Encryption settings
	Encryption EncryptionConfig `mapstructure:"encryption"`
	
	// Authentication settings
	Auth AuthConfig `mapstructure:"auth"`
	
	// Rate limiting settings
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	
	// Audit logging settings
	Audit AuditConfig `mapstructure:"audit"`
	
	// Input validation settings
	Validation ValidationConfig `mapstructure:"validation"`
	
	// CORS settings
	CORS CORSConfig `mapstructure:"cors"`
	
	// TLS settings
	TLS TLSConfig `mapstructure:"tls"`
}

// EncryptionConfig holds encryption configuration
type EncryptionConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	SecretKey string `mapstructure:"secret_key"`
	Algorithm string `mapstructure:"algorithm"` // AES-256-GCM
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	// JWT settings
	JWTSecret           string        `mapstructure:"jwt_secret"`
	JWTExpiration       time.Duration `mapstructure:"jwt_expiration"`
	JWTRefreshExpiration time.Duration `mapstructure:"jwt_refresh_expiration"`
	
	// Session settings
	SessionTimeout      time.Duration `mapstructure:"session_timeout"`
	MaxConcurrentSessions int         `mapstructure:"max_concurrent_sessions"`
	
	// Password policy
	PasswordPolicy PasswordPolicyConfig `mapstructure:"password_policy"`
	
	// Account lockout
	AccountLockout AccountLockoutConfig `mapstructure:"account_lockout"`
	
	// Two-factor authentication
	TwoFactorAuth TwoFactorAuthConfig `mapstructure:"two_factor_auth"`
}

// PasswordPolicyConfig holds password policy configuration
type PasswordPolicyConfig struct {
	MinLength        int  `mapstructure:"min_length"`
	RequireUppercase bool `mapstructure:"require_uppercase"`
	RequireLowercase bool `mapstructure:"require_lowercase"`
	RequireDigits    bool `mapstructure:"require_digits"`
	RequireSpecial   bool `mapstructure:"require_special"`
	MaxAge           time.Duration `mapstructure:"max_age"`
	HistoryCount     int  `mapstructure:"history_count"`
}

// AccountLockoutConfig holds account lockout configuration
type AccountLockoutConfig struct {
	Enabled           bool          `mapstructure:"enabled"`
	MaxFailedAttempts int           `mapstructure:"max_failed_attempts"`
	LockoutDuration   time.Duration `mapstructure:"lockout_duration"`
	ResetWindow       time.Duration `mapstructure:"reset_window"`
}

// TwoFactorAuthConfig holds 2FA configuration
type TwoFactorAuthConfig struct {
	Enabled     bool     `mapstructure:"enabled"`
	Required    bool     `mapstructure:"required"`
	Methods     []string `mapstructure:"methods"` // totp, sms, email
	BackupCodes int      `mapstructure:"backup_codes"`
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Enabled bool `mapstructure:"enabled"`
	
	// Global rate limits
	Global RateLimitRule `mapstructure:"global"`
	
	// Per-endpoint rate limits
	Endpoints map[string]RateLimitRule `mapstructure:"endpoints"`
	
	// Per-user rate limits
	PerUser RateLimitRule `mapstructure:"per_user"`
	
	// IP-based rate limits
	PerIP RateLimitRule `mapstructure:"per_ip"`
}

// RateLimitRule defines a rate limiting rule
type RateLimitRule struct {
	Requests int           `mapstructure:"requests"`
	Window   time.Duration `mapstructure:"window"`
	Burst    int           `mapstructure:"burst"`
}

// AuditConfig holds audit logging configuration
type AuditConfig struct {
	Enabled bool `mapstructure:"enabled"`
	
	// Log levels
	LogLevel string `mapstructure:"log_level"` // debug, info, warn, error
	
	// Event types to log
	LogEvents []string `mapstructure:"log_events"` // auth, data_access, security, system
	
	// Storage settings
	Storage AuditStorageConfig `mapstructure:"storage"`
	
	// Retention settings
	Retention AuditRetentionConfig `mapstructure:"retention"`
	
	// Alert settings
	Alerts AuditAlertConfig `mapstructure:"alerts"`
}

// AuditStorageConfig holds audit storage configuration
type AuditStorageConfig struct {
	Type     string `mapstructure:"type"`     // database, file, syslog, elasticsearch
	Location string `mapstructure:"location"` // file path, database connection, etc.
	Format   string `mapstructure:"format"`   // json, csv, syslog
}

// AuditRetentionConfig holds audit retention configuration
type AuditRetentionConfig struct {
	Days        int  `mapstructure:"days"`
	Compress    bool `mapstructure:"compress"`
	Archive     bool `mapstructure:"archive"`
	ArchivePath string `mapstructure:"archive_path"`
}

// AuditAlertConfig holds audit alert configuration
type AuditAlertConfig struct {
	Enabled   bool                    `mapstructure:"enabled"`
	Channels  []string                `mapstructure:"channels"` // email, slack, webhook
	Rules     map[string]AlertRule    `mapstructure:"rules"`
	Webhooks  []WebhookConfig         `mapstructure:"webhooks"`
}

// AlertRule defines when to trigger an alert
type AlertRule struct {
	EventType   string        `mapstructure:"event_type"`
	RiskLevel   string        `mapstructure:"risk_level"`
	Threshold   int           `mapstructure:"threshold"`
	TimeWindow  time.Duration `mapstructure:"time_window"`
	Enabled     bool          `mapstructure:"enabled"`
}

// WebhookConfig holds webhook configuration for alerts
type WebhookConfig struct {
	Name    string            `mapstructure:"name"`
	URL     string            `mapstructure:"url"`
	Method  string            `mapstructure:"method"`
	Headers map[string]string `mapstructure:"headers"`
	Timeout time.Duration     `mapstructure:"timeout"`
}

// ValidationConfig holds input validation configuration
type ValidationConfig struct {
	Enabled bool `mapstructure:"enabled"`
	
	// SQL injection protection
	SQLInjection SQLInjectionConfig `mapstructure:"sql_injection"`
	
	// XSS protection
	XSS XSSConfig `mapstructure:"xss"`
	
	// Input sanitization
	Sanitization SanitizationConfig `mapstructure:"sanitization"`
	
	// File upload validation
	FileUpload FileUploadConfig `mapstructure:"file_upload"`
}

// SQLInjectionConfig holds SQL injection protection configuration
type SQLInjectionConfig struct {
	Enabled  bool     `mapstructure:"enabled"`
	Patterns []string `mapstructure:"patterns"`
	Action   string   `mapstructure:"action"` // block, log, alert
}

// XSSConfig holds XSS protection configuration
type XSSConfig struct {
	Enabled  bool     `mapstructure:"enabled"`
	Patterns []string `mapstructure:"patterns"`
	Action   string   `mapstructure:"action"` // block, log, alert
}

// SanitizationConfig holds input sanitization configuration
type SanitizationConfig struct {
	Enabled           bool `mapstructure:"enabled"`
	RemoveControlChars bool `mapstructure:"remove_control_chars"`
	TrimWhitespace    bool `mapstructure:"trim_whitespace"`
	MaxLength         int  `mapstructure:"max_length"`
}

// FileUploadConfig holds file upload validation configuration
type FileUploadConfig struct {
	Enabled         bool     `mapstructure:"enabled"`
	MaxSize         int64    `mapstructure:"max_size"`
	AllowedTypes    []string `mapstructure:"allowed_types"`
	ScanForMalware  bool     `mapstructure:"scan_for_malware"`
	QuarantinePath  string   `mapstructure:"quarantine_path"`
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	Enabled          bool     `mapstructure:"enabled"`
	AllowedOrigins   []string `mapstructure:"allowed_origins"`
	AllowedMethods   []string `mapstructure:"allowed_methods"`
	AllowedHeaders   []string `mapstructure:"allowed_headers"`
	ExposedHeaders   []string `mapstructure:"exposed_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials"`
	MaxAge           int      `mapstructure:"max_age"`
}

// TLSConfig holds TLS configuration
type TLSConfig struct {
	Enabled    bool   `mapstructure:"enabled"`
	CertFile   string `mapstructure:"cert_file"`
	KeyFile    string `mapstructure:"key_file"`
	MinVersion string `mapstructure:"min_version"` // 1.2, 1.3
	CipherSuites []string `mapstructure:"cipher_suites"`
}

// DefaultSecurityConfig returns default security configuration
func DefaultSecurityConfig() SecurityConfig {
	return SecurityConfig{
		Encryption: EncryptionConfig{
			Enabled:   true,
			Algorithm: "AES-256-GCM",
		},
		Auth: AuthConfig{
			JWTExpiration:        24 * time.Hour,
			JWTRefreshExpiration: 7 * 24 * time.Hour,
			SessionTimeout:       30 * time.Minute,
			MaxConcurrentSessions: 5,
			PasswordPolicy: PasswordPolicyConfig{
				MinLength:        8,
				RequireUppercase: true,
				RequireLowercase: true,
				RequireDigits:    true,
				RequireSpecial:   true,
				MaxAge:           90 * 24 * time.Hour,
				HistoryCount:     5,
			},
			AccountLockout: AccountLockoutConfig{
				Enabled:           true,
				MaxFailedAttempts: 5,
				LockoutDuration:   15 * time.Minute,
				ResetWindow:       time.Hour,
			},
			TwoFactorAuth: TwoFactorAuthConfig{
				Enabled:     false,
				Required:    false,
				Methods:     []string{"totp"},
				BackupCodes: 10,
			},
		},
		RateLimit: RateLimitConfig{
			Enabled: true,
			Global: RateLimitRule{
				Requests: 1000,
				Window:   time.Hour,
				Burst:    100,
			},
			PerUser: RateLimitRule{
				Requests: 100,
				Window:   time.Hour,
				Burst:    20,
			},
			PerIP: RateLimitRule{
				Requests: 200,
				Window:   time.Hour,
				Burst:    50,
			},
			Endpoints: map[string]RateLimitRule{
				"/auth/login": {
					Requests: 10,
					Window:   time.Hour,
					Burst:    5,
				},
				"/auth/register": {
					Requests: 5,
					Window:   time.Hour,
					Burst:    2,
				},
			},
		},
		Audit: AuditConfig{
			Enabled:   true,
			LogLevel:  "info",
			LogEvents: []string{"auth", "data_access", "security", "system"},
			Storage: AuditStorageConfig{
				Type:   "database",
				Format: "json",
			},
			Retention: AuditRetentionConfig{
				Days:     365,
				Compress: true,
				Archive:  true,
			},
			Alerts: AuditAlertConfig{
				Enabled:  true,
				Channels: []string{"email"},
				Rules: map[string]AlertRule{
					"failed_login": {
						EventType:  "login_failed",
						RiskLevel:  "high",
						Threshold:  5,
						TimeWindow: 15 * time.Minute,
						Enabled:    true,
					},
					"sql_injection": {
						EventType:  "sql_injection",
						RiskLevel:  "critical",
						Threshold:  1,
						TimeWindow: time.Hour,
						Enabled:    true,
					},
				},
			},
		},
		Validation: ValidationConfig{
			Enabled: true,
			SQLInjection: SQLInjectionConfig{
				Enabled: true,
				Action:  "block",
			},
			XSS: XSSConfig{
				Enabled: true,
				Action:  "block",
			},
			Sanitization: SanitizationConfig{
				Enabled:           true,
				RemoveControlChars: true,
				TrimWhitespace:    true,
				MaxLength:         10000,
			},
			FileUpload: FileUploadConfig{
				Enabled:        true,
				MaxSize:        10 * 1024 * 1024, // 10MB
				AllowedTypes:   []string{"image/jpeg", "image/png", "application/pdf"},
				ScanForMalware: false,
			},
		},
		CORS: CORSConfig{
			Enabled:          true,
			AllowedOrigins:   []string{"http://localhost:3000"},
			AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Requested-With"},
			ExposedHeaders:   []string{"X-Total-Count"},
			AllowCredentials: true,
			MaxAge:           86400,
		},
		TLS: TLSConfig{
			Enabled:    false,
			MinVersion: "1.2",
		},
	}
}

// Validate validates the security configuration
func (sc *SecurityConfig) Validate() error {
	// Validate encryption config
	if sc.Encryption.Enabled && sc.Encryption.SecretKey == "" {
		return fmt.Errorf("encryption secret key is required when encryption is enabled")
	}
	
	// Validate auth config
	if sc.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT secret is required")
	}
	
	if sc.Auth.PasswordPolicy.MinLength < 8 {
		return fmt.Errorf("minimum password length must be at least 8")
	}
	
	// Validate rate limit config
	if sc.RateLimit.Enabled {
		if sc.RateLimit.Global.Requests <= 0 {
			return fmt.Errorf("global rate limit requests must be positive")
		}
		if sc.RateLimit.Global.Window <= 0 {
			return fmt.Errorf("global rate limit window must be positive")
		}
	}
	
	// Validate TLS config
	if sc.TLS.Enabled {
		if sc.TLS.CertFile == "" || sc.TLS.KeyFile == "" {
			return fmt.Errorf("TLS cert and key files are required when TLS is enabled")
		}
	}
	
	return nil
}

// IsFeatureEnabled checks if a security feature is enabled
func (sc *SecurityConfig) IsFeatureEnabled(feature string) bool {
	switch feature {
	case "encryption":
		return sc.Encryption.Enabled
	case "rate_limit":
		return sc.RateLimit.Enabled
	case "audit":
		return sc.Audit.Enabled
	case "validation":
		return sc.Validation.Enabled
	case "cors":
		return sc.CORS.Enabled
	case "tls":
		return sc.TLS.Enabled
	case "two_factor_auth":
		return sc.Auth.TwoFactorAuth.Enabled
	case "account_lockout":
		return sc.Auth.AccountLockout.Enabled
	default:
		return false
	}
}