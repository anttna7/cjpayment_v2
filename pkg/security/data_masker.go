package security

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
)

// MaskingLevel defines the level of data masking
type MaskingLevel int

const (
	MaskingLevelNone    MaskingLevel = 0 // No masking
	MaskingLevelPartial MaskingLevel = 1 // Partial masking
	MaskingLevelFull    MaskingLevel = 2 // Full masking
)

// FieldMaskingRule defines how a specific field should be masked
type FieldMaskingRule struct {
	FieldName    string       `json:"field_name"`
	MaskingType  MaskingType  `json:"masking_type"`
	MaskingLevel MaskingLevel `json:"masking_level"`
	CustomMask   string       `json:"custom_mask,omitempty"`
}

// MaskingType defines different types of masking strategies
type MaskingType string

const (
	MaskingTypeAccountNumber MaskingType = "account_number" // Bank account, card numbers
	MaskingTypePhone         MaskingType = "phone"          // Phone numbers
	MaskingTypeEmail         MaskingType = "email"          // Email addresses
	MaskingTypeName          MaskingType = "name"           // Personal names
	MaskingTypeAmount        MaskingType = "amount"         // Financial amounts
	MaskingTypeCustom        MaskingType = "custom"         // Custom masking pattern
	MaskingTypeRedact        MaskingType = "redact"         // Complete redaction
)

// DataMasker provides data masking functionality
type DataMasker struct {
	rules map[string]FieldMaskingRule
}

// NewDataMasker creates a new data masker with default rules
func NewDataMasker() *DataMasker {
	masker := &DataMasker{
		rules: make(map[string]FieldMaskingRule),
	}
	
	// Set up default masking rules for account-related fields
	masker.SetDefaultAccountRules()
	
	return masker
}

// SetDefaultAccountRules sets up default masking rules for account data
func (dm *DataMasker) SetDefaultAccountRules() {
	defaultRules := []FieldMaskingRule{
		{
			FieldName:    "account_number",
			MaskingType:  MaskingTypeAccountNumber,
			MaskingLevel: MaskingLevelPartial,
		},
		{
			FieldName:    "account_holder",
			MaskingType:  MaskingTypeName,
			MaskingLevel: MaskingLevelPartial,
		},
		{
			FieldName:    "contact_phone",
			MaskingType:  MaskingTypePhone,
			MaskingLevel: MaskingLevelPartial,
		},
		{
			FieldName:    "contact_email",
			MaskingType:  MaskingTypeEmail,
			MaskingLevel: MaskingLevelPartial,
		},
		{
			FieldName:    "daily_limit",
			MaskingType:  MaskingTypeAmount,
			MaskingLevel: MaskingLevelNone, // Usually not masked for operational purposes
		},
		{
			FieldName:    "single_limit",
			MaskingType:  MaskingTypeAmount,
			MaskingLevel: MaskingLevelNone,
		},
		{
			FieldName:    "daily_used",
			MaskingType:  MaskingTypeAmount,
			MaskingLevel: MaskingLevelPartial,
		},
		{
			FieldName:    "custom_payment_provider",
			MaskingType:  MaskingTypeCustom,
			MaskingLevel: MaskingLevelNone,
		},
	}
	
	for _, rule := range defaultRules {
		dm.rules[rule.FieldName] = rule
	}
}

// AddRule adds a custom masking rule
func (dm *DataMasker) AddRule(rule FieldMaskingRule) {
	dm.rules[rule.FieldName] = rule
}

// RemoveRule removes a masking rule
func (dm *DataMasker) RemoveRule(fieldName string) {
	delete(dm.rules, fieldName)
}

// MaskData masks data based on the specified masking level and user permissions
func (dm *DataMasker) MaskData(data interface{}, maskingLevel MaskingLevel) interface{} {
	return dm.maskValue(reflect.ValueOf(data), maskingLevel)
}

// MaskAccountData specifically masks account-related data structures
func (dm *DataMasker) MaskAccountData(accountData map[string]interface{}, maskingLevel MaskingLevel) map[string]interface{} {
	result := make(map[string]interface{})
	
	for key, value := range accountData {
		if rule, exists := dm.rules[key]; exists {
			// Apply masking based on rule and requested level
			effectiveLevel := maskingLevel
			if rule.MaskingLevel > effectiveLevel {
				effectiveLevel = rule.MaskingLevel
			}
			
			result[key] = dm.maskFieldValue(value, rule, effectiveLevel)
		} else {
			// No specific rule, apply default behavior
			result[key] = dm.maskDefaultField(key, value, maskingLevel)
		}
	}
	
	return result
}

// maskValue recursively masks values based on their type
func (dm *DataMasker) maskValue(v reflect.Value, maskingLevel MaskingLevel) interface{} {
	if !v.IsValid() {
		return nil
	}
	
	switch v.Kind() {
	case reflect.Ptr:
		if v.IsNil() {
			return nil
		}
		return dm.maskValue(v.Elem(), maskingLevel)
		
	case reflect.Interface:
		if v.IsNil() {
			return nil
		}
		return dm.maskValue(v.Elem(), maskingLevel)
		
	case reflect.Map:
		result := make(map[string]interface{})
		for _, key := range v.MapKeys() {
			keyStr := fmt.Sprintf("%v", key.Interface())
			value := v.MapIndex(key)
			
			if rule, exists := dm.rules[keyStr]; exists {
				result[keyStr] = dm.maskFieldValue(value.Interface(), rule, maskingLevel)
			} else {
				result[keyStr] = dm.maskDefaultField(keyStr, value.Interface(), maskingLevel)
			}
		}
		return result
		
	case reflect.Struct:
		result := make(map[string]interface{})
		t := v.Type()
		for i := 0; i < v.NumField(); i++ {
			field := t.Field(i)
			fieldValue := v.Field(i)
			
			// Skip unexported fields
			if !fieldValue.CanInterface() {
				continue
			}
			
			fieldName := getJSONFieldName(field)
			if rule, exists := dm.rules[fieldName]; exists {
				result[fieldName] = dm.maskFieldValue(fieldValue.Interface(), rule, maskingLevel)
			} else {
				result[fieldName] = dm.maskDefaultField(fieldName, fieldValue.Interface(), maskingLevel)
			}
		}
		return result
		
	case reflect.Slice, reflect.Array:
		var result []interface{}
		for i := 0; i < v.Len(); i++ {
			result = append(result, dm.maskValue(v.Index(i), maskingLevel))
		}
		return result
		
	default:
		return v.Interface()
	}
}

// maskFieldValue masks a field value based on the specified rule
func (dm *DataMasker) maskFieldValue(value interface{}, rule FieldMaskingRule, requestedLevel MaskingLevel) interface{} {
	// Use the higher of the rule's level or requested level
	effectiveLevel := requestedLevel
	if rule.MaskingLevel > effectiveLevel {
		effectiveLevel = rule.MaskingLevel
	}
	
	if effectiveLevel == MaskingLevelNone {
		return value
	}
	
	str, ok := value.(string)
	if !ok {
		// For non-string values, apply basic masking if level is full
		if effectiveLevel == MaskingLevelFull {
			return "***"
		}
		return value
	}
	
	switch rule.MaskingType {
	case MaskingTypeAccountNumber:
		return dm.maskAccountNumber(str, effectiveLevel)
	case MaskingTypePhone:
		return dm.maskPhone(str, effectiveLevel)
	case MaskingTypeEmail:
		return dm.maskEmail(str, effectiveLevel)
	case MaskingTypeName:
		return dm.maskName(str, effectiveLevel)
	case MaskingTypeAmount:
		return dm.maskAmount(str, effectiveLevel)
	case MaskingTypeCustom:
		if rule.CustomMask != "" {
			return rule.CustomMask
		}
		return dm.maskGeneric(str, effectiveLevel)
	case MaskingTypeRedact:
		return "[REDACTED]"
	default:
		return dm.maskGeneric(str, effectiveLevel)
	}
}

// maskDefaultField applies default masking to fields without specific rules
func (dm *DataMasker) maskDefaultField(fieldName string, value interface{}, maskingLevel MaskingLevel) interface{} {
	if maskingLevel == MaskingLevelNone {
		return value
	}
	
	// Check if field name suggests sensitive data
	sensitivePatterns := []string{
		"password", "secret", "key", "token", "hash",
		"phone", "email", "account_number", "card_number", "bank_account",
	}
	
	fieldLower := strings.ToLower(fieldName)
	isSensitive := false
	for _, pattern := range sensitivePatterns {
		if strings.Contains(fieldLower, pattern) {
			isSensitive = true
			break
		}
	}
	
	if !isSensitive {
		return value
	}
	
	// Apply generic masking to sensitive fields
	if str, ok := value.(string); ok {
		return dm.maskGeneric(str, maskingLevel)
	}
	
	if maskingLevel == MaskingLevelFull {
		return "***"
	}
	
	return value
}

// Specific masking functions for different data types

func (dm *DataMasker) maskAccountNumber(accountNumber string, level MaskingLevel) string {
	if accountNumber == "" {
		return ""
	}
	
	switch level {
	case MaskingLevelPartial:
		if len(accountNumber) <= 4 {
			return strings.Repeat("*", len(accountNumber))
		}
		// Show first 2 and last 2 characters
		return accountNumber[:2] + strings.Repeat("*", len(accountNumber)-4) + accountNumber[len(accountNumber)-2:]
	case MaskingLevelFull:
		return strings.Repeat("*", min(len(accountNumber), 12))
	default:
		return accountNumber
	}
}

func (dm *DataMasker) maskPhone(phone string, level MaskingLevel) string {
	if phone == "" {
		return ""
	}
	
	// Remove non-digit characters for processing
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(phone, "")
	
	switch level {
	case MaskingLevelPartial:
		if len(digits) <= 4 {
			return strings.Repeat("*", len(phone))
		}
		// Show last 4 digits
		masked := strings.Repeat("*", len(digits)-4) + digits[len(digits)-4:]
		// Preserve original formatting approximately
		if strings.Contains(phone, "-") {
			return formatPhoneWithDashes(masked)
		}
		return masked
	case MaskingLevelFull:
		return strings.Repeat("*", len(phone))
	default:
		return phone
	}
}

func (dm *DataMasker) maskEmail(email string, level MaskingLevel) string {
	if email == "" {
		return ""
	}
	
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return dm.maskGeneric(email, level)
	}
	
	username := parts[0]
	domain := parts[1]
	
	switch level {
	case MaskingLevelPartial:
		if len(username) <= 2 {
			return strings.Repeat("*", len(username)) + "@" + domain
		}
		// Show first character and mask the rest of username
		maskedUsername := string(username[0]) + strings.Repeat("*", len(username)-1)
		return maskedUsername + "@" + domain
	case MaskingLevelFull:
		return strings.Repeat("*", len(username)) + "@" + strings.Repeat("*", len(domain))
	default:
		return email
	}
}

func (dm *DataMasker) maskName(name string, level MaskingLevel) string {
	if name == "" {
		return ""
	}
	
	switch level {
	case MaskingLevelPartial:
		parts := strings.Fields(name)
		var maskedParts []string
		for _, part := range parts {
			if len(part) <= 1 {
				maskedParts = append(maskedParts, "*")
			} else {
				// Show first character, mask the rest
				maskedParts = append(maskedParts, string(part[0])+strings.Repeat("*", len(part)-1))
			}
		}
		return strings.Join(maskedParts, " ")
	case MaskingLevelFull:
		return strings.Repeat("*", min(len(name), 8))
	default:
		return name
	}
}

func (dm *DataMasker) maskAmount(amount string, level MaskingLevel) string {
	if amount == "" {
		return ""
	}
	
	switch level {
	case MaskingLevelPartial:
		// For amounts, we might want to show the magnitude but hide exact value
		if strings.Contains(amount, ".") {
			parts := strings.Split(amount, ".")
			if len(parts) == 2 {
				return strings.Repeat("*", len(parts[0])) + "." + parts[1]
			}
		}
		return strings.Repeat("*", len(amount))
	case MaskingLevelFull:
		return "***.**"
	default:
		return amount
	}
}

func (dm *DataMasker) maskGeneric(value string, level MaskingLevel) string {
	if value == "" {
		return ""
	}
	
	switch level {
	case MaskingLevelPartial:
		if len(value) <= 4 {
			return strings.Repeat("*", len(value))
		}
		// Show first and last character
		return string(value[0]) + strings.Repeat("*", len(value)-2) + string(value[len(value)-1])
	case MaskingLevelFull:
		return strings.Repeat("*", min(len(value), 8))
	default:
		return value
	}
}

// Helper functions

func getJSONFieldName(field reflect.StructField) string {
	tag := field.Tag.Get("json")
	if tag == "" {
		return strings.ToLower(field.Name)
	}
	
	// Handle json tag with options like "field_name,omitempty"
	parts := strings.Split(tag, ",")
	if parts[0] == "-" {
		return ""
	}
	
	if parts[0] != "" {
		return parts[0]
	}
	
	return strings.ToLower(field.Name)
}

func formatPhoneWithDashes(digits string) string {
	if len(digits) == 10 {
		return digits[:3] + "-" + digits[3:6] + "-" + digits[6:]
	}
	if len(digits) == 11 {
		return digits[:1] + "-" + digits[1:4] + "-" + digits[4:7] + "-" + digits[7:]
	}
	return digits
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// MaskAccountResponse masks account response data based on user permissions
func (dm *DataMasker) MaskAccountResponse(accounts []map[string]interface{}, maskingLevel MaskingLevel) []map[string]interface{} {
	var maskedAccounts []map[string]interface{}
	
	for _, account := range accounts {
		maskedAccount := dm.MaskAccountData(account, maskingLevel)
		maskedAccounts = append(maskedAccounts, maskedAccount)
	}
	
	return maskedAccounts
}

// GetMaskingLevelForUser determines the appropriate masking level based on user permissions
func GetMaskingLevelForUser(userRoles []string, operation string) MaskingLevel {
	// Admin users get no masking
	for _, role := range userRoles {
		if strings.EqualFold(role, "admin") || strings.EqualFold(role, "super_admin") {
			return MaskingLevelNone
		}
	}
	
	// Account managers get partial masking for read operations
	for _, role := range userRoles {
		if strings.EqualFold(role, "account_manager") {
			if operation == "read" {
				return MaskingLevelPartial
			}
			return MaskingLevelNone
		}
	}
	
	// Regular users get full masking
	return MaskingLevelFull
}