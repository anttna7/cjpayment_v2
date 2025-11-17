package security

import (
	"fmt"
	"net"
	"regexp"
	"strings"
	"unicode"
)

// InputValidator provides input validation and sanitization
type InputValidator struct {
	// Regex patterns for validation
	emailRegex    *regexp.Regexp
	phoneRegex    *regexp.Regexp
	usernameRegex *regexp.Regexp
	
	// Blacklisted patterns for SQL injection prevention
	sqlInjectionPatterns []*regexp.Regexp
	xssPatterns         []*regexp.Regexp
}

// NewInputValidator creates a new input validator
func NewInputValidator() *InputValidator {
	return &InputValidator{
		emailRegex:    regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`),
		phoneRegex:    regexp.MustCompile(`^[+]?[1-9]?[0-9]{7,15}$`),
		usernameRegex: regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`),
		
		sqlInjectionPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|execute)`),
			regexp.MustCompile(`(?i)(script|javascript|vbscript|onload|onerror|onclick)`),
			regexp.MustCompile(`['";\-\-]`),
		},
		
		xssPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
			regexp.MustCompile(`(?i)<iframe[^>]*>.*?</iframe>`),
			regexp.MustCompile(`(?i)javascript:`),
			regexp.MustCompile(`(?i)on\w+\s*=`),
		},
	}
}

// ValidationResult holds validation results
type ValidationResult struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}

// ValidateEmail validates email format
func (v *InputValidator) ValidateEmail(email string) ValidationResult {
	var errors []string
	
	if email == "" {
		errors = append(errors, "Email is required")
	} else if len(email) > 254 {
		errors = append(errors, "Email is too long")
	} else if !v.emailRegex.MatchString(email) {
		errors = append(errors, "Invalid email format")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidatePhone validates phone number format
func (v *InputValidator) ValidatePhone(phone string) ValidationResult {
	var errors []string
	
	if phone == "" {
		errors = append(errors, "Phone number is required")
	} else if !v.phoneRegex.MatchString(phone) {
		errors = append(errors, "Invalid phone number format")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateUsername validates username format
func (v *InputValidator) ValidateUsername(username string) ValidationResult {
	var errors []string
	
	if username == "" {
		errors = append(errors, "Username is required")
	} else if len(username) < 3 {
		errors = append(errors, "Username must be at least 3 characters")
	} else if len(username) > 30 {
		errors = append(errors, "Username must be at most 30 characters")
	} else if !v.usernameRegex.MatchString(username) {
		errors = append(errors, "Username can only contain letters, numbers, and underscores")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidatePassword validates password strength
func (v *InputValidator) ValidatePassword(password string) ValidationResult {
	var errors []string
	
	if password == "" {
		errors = append(errors, "Password is required")
	} else {
		if len(password) < 8 {
			errors = append(errors, "Password must be at least 8 characters")
		}
		if len(password) > 128 {
			errors = append(errors, "Password must be at most 128 characters")
		}
		
		var hasUpper, hasLower, hasDigit, hasSpecial bool
		for _, char := range password {
			switch {
			case unicode.IsUpper(char):
				hasUpper = true
			case unicode.IsLower(char):
				hasLower = true
			case unicode.IsDigit(char):
				hasDigit = true
			case unicode.IsPunct(char) || unicode.IsSymbol(char):
				hasSpecial = true
			}
		}
		
		if !hasUpper {
			errors = append(errors, "Password must contain at least one uppercase letter")
		}
		if !hasLower {
			errors = append(errors, "Password must contain at least one lowercase letter")
		}
		if !hasDigit {
			errors = append(errors, "Password must contain at least one digit")
		}
		if !hasSpecial {
			errors = append(errors, "Password must contain at least one special character")
		}
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateIPAddress validates IP address format
func (v *InputValidator) ValidateIPAddress(ip string) ValidationResult {
	var errors []string
	
	if ip == "" {
		errors = append(errors, "IP address is required")
	} else if net.ParseIP(ip) == nil {
		errors = append(errors, "Invalid IP address format")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// SanitizeInput sanitizes input to prevent injection attacks
func (v *InputValidator) SanitizeInput(input string) string {
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	// Remove control characters except tab, newline, and carriage return
	var result strings.Builder
	for _, r := range input {
		if r == '\t' || r == '\n' || r == '\r' || !unicode.IsControl(r) {
			result.WriteRune(r)
		}
	}
	
	return result.String()
}

// CheckSQLInjection checks for SQL injection patterns
func (v *InputValidator) CheckSQLInjection(input string) bool {
	input = strings.ToLower(input)
	
	for _, pattern := range v.sqlInjectionPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}
	
	return false
}

// CheckXSS checks for XSS patterns
func (v *InputValidator) CheckXSS(input string) bool {
	for _, pattern := range v.xssPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}
	
	return false
}

// ValidateAndSanitize validates and sanitizes input
func (v *InputValidator) ValidateAndSanitize(input string, fieldName string, required bool) ValidationResult {
	var errors []string
	
	// Check if required
	if required && strings.TrimSpace(input) == "" {
		errors = append(errors, fmt.Sprintf("%s is required", fieldName))
		return ValidationResult{Valid: false, Errors: errors}
	}
	
	// Sanitize input
	sanitized := v.SanitizeInput(input)
	
	// Check for injection attacks
	if v.CheckSQLInjection(sanitized) {
		errors = append(errors, fmt.Sprintf("%s contains potentially dangerous content", fieldName))
	}
	
	if v.CheckXSS(sanitized) {
		errors = append(errors, fmt.Sprintf("%s contains potentially dangerous content", fieldName))
	}
	
	// Check length
	if len(sanitized) > 1000 {
		errors = append(errors, fmt.Sprintf("%s is too long", fieldName))
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateAmount validates monetary amounts
func (v *InputValidator) ValidateAmount(amount string) ValidationResult {
	var errors []string
	
	if amount == "" {
		errors = append(errors, "Amount is required")
		return ValidationResult{Valid: false, Errors: errors}
	}
	
	// Check format (allow decimal numbers)
	amountRegex := regexp.MustCompile(`^\d+(\.\d{1,2})?$`)
	if !amountRegex.MatchString(amount) {
		errors = append(errors, "Invalid amount format")
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateOrderNumber validates order number format
func (v *InputValidator) ValidateOrderNumber(orderNumber string) ValidationResult {
	var errors []string
	
	if orderNumber == "" {
		errors = append(errors, "Order number is required")
	} else if len(orderNumber) < 10 || len(orderNumber) > 50 {
		errors = append(errors, "Order number must be between 10 and 50 characters")
	} else {
		// Order number should only contain alphanumeric characters and hyphens
		orderRegex := regexp.MustCompile(`^[a-zA-Z0-9\-]+$`)
		if !orderRegex.MatchString(orderNumber) {
			errors = append(errors, "Order number can only contain letters, numbers, and hyphens")
		}
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateBankAccount validates bank account number
func (v *InputValidator) ValidateBankAccount(accountNumber string) ValidationResult {
	var errors []string
	
	if accountNumber == "" {
		errors = append(errors, "Bank account number is required")
	} else if len(accountNumber) < 10 || len(accountNumber) > 30 {
		errors = append(errors, "Bank account number must be between 10 and 30 characters")
	} else {
		// Bank account should only contain digits
		bankRegex := regexp.MustCompile(`^\d+$`)
		if !bankRegex.MatchString(accountNumber) {
			errors = append(errors, "Bank account number can only contain digits")
		}
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// ValidateUUID validates UUID format
func (v *InputValidator) ValidateUUID(uuid string) ValidationResult {
	var errors []string
	
	if uuid == "" {
		errors = append(errors, "UUID is required")
	} else {
		uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
		if !uuidRegex.MatchString(strings.ToLower(uuid)) {
			errors = append(errors, "Invalid UUID format")
		}
	}
	
	return ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}