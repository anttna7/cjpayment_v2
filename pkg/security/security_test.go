package security

import (
	"context"
	"testing"
)

func TestEncryptionService_EncryptDecrypt(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	testCases := []string{
		"simple text",
		"text with special chars: !@#$%^&*()",
		"unicode text: 你好世界",
		"",
		"very long text that exceeds normal limits and should still work properly with encryption and decryption processes",
	}
	
	for _, plaintext := range testCases {
		// Test encryption
		encrypted, err := service.Encrypt(plaintext)
		if err != nil {
			t.Errorf("Failed to encrypt '%s': %v", plaintext, err)
			continue
		}
		
		// Test decryption
		decrypted, err := service.Decrypt(encrypted)
		if err != nil {
			t.Errorf("Failed to decrypt '%s': %v", encrypted, err)
			continue
		}
		
		// Verify result
		if decrypted != plaintext {
			t.Errorf("Decryption mismatch. Expected: '%s', Got: '%s'", plaintext, decrypted)
		}
	}
}

func TestEncryptionService_EncryptSensitiveData(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	testData := map[string]interface{}{
		"username":     "testuser",
		"password":     "secret123",
		"email":        "test@example.com",
		"phone":        "1234567890",
		"account_number": "9876543210",
		"normal_field": "not sensitive",
	}
	
	encrypted, err := service.EncryptSensitiveData(testData)
	if err != nil {
		t.Fatalf("Failed to encrypt sensitive data: %v", err)
	}
	
	// Check that sensitive fields are encrypted
	sensitiveFields := []string{"password", "email", "phone", "account_number"}
	for _, field := range sensitiveFields {
		if encrypted[field] == testData[field] {
			t.Errorf("Field '%s' was not encrypted", field)
		}
	}
	
	// Check that non-sensitive fields are unchanged
	if encrypted["username"] != testData["username"] {
		t.Error("Non-sensitive field 'username' was modified")
	}
	if encrypted["normal_field"] != testData["normal_field"] {
		t.Error("Non-sensitive field 'normal_field' was modified")
	}
	
	// Test decryption
	decrypted, err := service.DecryptSensitiveData(encrypted)
	if err != nil {
		t.Fatalf("Failed to decrypt sensitive data: %v", err)
	}
	
	// Verify all fields are restored
	for key, originalValue := range testData {
		if decrypted[key] != originalValue {
			t.Errorf("Field '%s' decryption failed. Expected: %v, Got: %v", key, originalValue, decrypted[key])
		}
	}
}

func TestMaskSensitiveData(t *testing.T) {
	testData := map[string]interface{}{
		"username":       "testuser",
		"password":       "secret123",
		"email":          "test@example.com",
		"phone":          "1234567890",
		"account_number": "9876543210",
		"short":          "ab",
	}
	
	masked := MaskSensitiveData(testData)
	
	// Check that sensitive fields are masked
	if masked["password"] == testData["password"] {
		t.Error("Password was not masked")
	}
	if masked["email"] == testData["email"] {
		t.Error("Email was not masked")
	}
	if masked["phone"] == testData["phone"] {
		t.Error("Phone was not masked")
	}
	
	// Check that non-sensitive fields are unchanged
	if masked["username"] != testData["username"] {
		t.Error("Username should not be masked")
	}
	
	// Check short field is not masked (not in sensitive patterns)
	if masked["short"] != "ab" {
		t.Errorf("Short field should not be masked, got: %v", masked["short"])
	}
}

func TestInputValidator_ValidateEmail(t *testing.T) {
	validator := NewInputValidator()
	
	testCases := []struct {
		email    string
		expected bool
	}{
		{"test@example.com", true},
		{"user.name+tag@domain.co.uk", true},
		{"invalid-email", false},
		{"@domain.com", false},
		{"user@", false},
		{"", false},
		{"user@domain", false},
	}
	
	for _, tc := range testCases {
		result := validator.ValidateEmail(tc.email)
		if result.Valid != tc.expected {
			t.Errorf("Email validation for '%s' failed. Expected: %v, Got: %v, Errors: %v", 
				tc.email, tc.expected, result.Valid, result.Errors)
		}
	}
}

func TestInputValidator_ValidatePassword(t *testing.T) {
	validator := NewInputValidator()
	
	testCases := []struct {
		password string
		expected bool
	}{
		{"Password123!", true},
		{"StrongP@ss1", true},
		{"weak", false},           // too short
		{"password", false},       // no uppercase, no digit, no special
		{"PASSWORD", false},       // no lowercase, no digit, no special
		{"Password", false},       // no digit, no special
		{"Password123", false},    // no special character
		{"", false},               // empty
	}
	
	for _, tc := range testCases {
		result := validator.ValidatePassword(tc.password)
		if result.Valid != tc.expected {
			t.Errorf("Password validation for '%s' failed. Expected: %v, Got: %v, Errors: %v", 
				tc.password, tc.expected, result.Valid, result.Errors)
		}
	}
}

func TestInputValidator_CheckSQLInjection(t *testing.T) {
	validator := NewInputValidator()
	
	testCases := []struct {
		input    string
		expected bool
	}{
		{"normal input", false},
		{"SELECT * FROM users", true},
		{"'; DROP TABLE users; --", true},
		{"UNION SELECT password FROM users", true},
		{"<script>alert('xss')</script>", true},
		{"user input with 'quotes'", true},
		{"safe input", false},
	}
	
	for _, tc := range testCases {
		result := validator.CheckSQLInjection(tc.input)
		if result != tc.expected {
			t.Errorf("SQL injection check for '%s' failed. Expected: %v, Got: %v", 
				tc.input, tc.expected, result)
		}
	}
}

func TestInputValidator_CheckXSS(t *testing.T) {
	validator := NewInputValidator()
	
	testCases := []struct {
		input    string
		expected bool
	}{
		{"normal input", false},
		{"<script>alert('xss')</script>", true},
		{"<iframe src='evil.com'></iframe>", true},
		{"javascript:alert('xss')", true},
		{"onclick='alert(1)'", true},
		{"safe input", false},
		{"<p>safe html</p>", false},
	}
	
	for _, tc := range testCases {
		result := validator.CheckXSS(tc.input)
		if result != tc.expected {
			t.Errorf("XSS check for '%s' failed. Expected: %v, Got: %v", 
				tc.input, tc.expected, result)
		}
	}
}

func TestInputValidator_ValidateAmount(t *testing.T) {
	validator := NewInputValidator()
	
	testCases := []struct {
		amount   string
		expected bool
	}{
		{"100", true},
		{"100.50", true},
		{"0.99", true},
		{"1000.00", true},
		{"", false},
		{"abc", false},
		{"100.123", false}, // too many decimal places
		{"-100", false},    // negative
		{"100.", false},    // trailing dot
	}
	
	for _, tc := range testCases {
		result := validator.ValidateAmount(tc.amount)
		if result.Valid != tc.expected {
			t.Errorf("Amount validation for '%s' failed. Expected: %v, Got: %v, Errors: %v", 
				tc.amount, tc.expected, result.Valid, result.Errors)
		}
	}
}

func TestDatabaseAuditLogger_LogEvent(t *testing.T) {
	logger := NewDatabaseAuditLogger()
	ctx := context.Background()
	
	userID := "user123"
	event := &AuditEvent{
		UserID:    &userID,
		IPAddress: "192.168.1.1",
		Action:    "login",
		Resource:  "authentication",
		Success:   true,
		Risk:      RiskMedium,
	}
	
	err := logger.LogEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to log event: %v", err)
	}
	
	// Check that event was stored
	events := logger.GetEvents()
	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}
	
	storedEvent := events[0]
	if storedEvent.Action != "login" {
		t.Errorf("Expected action 'login', got '%s'", storedEvent.Action)
	}
	if storedEvent.IPAddress != "192.168.1.1" {
		t.Errorf("Expected IP '192.168.1.1', got '%s'", storedEvent.IPAddress)
	}
	if storedEvent.ID == "" {
		t.Error("Event ID should be generated")
	}
	if storedEvent.Timestamp.IsZero() {
		t.Error("Event timestamp should be set")
	}
}

func TestDatabaseAuditLogger_LogAuthEvent(t *testing.T) {
	logger := NewDatabaseAuditLogger()
	ctx := context.Background()
	
	err := logger.LogAuthEvent(ctx, "user123", "testuser", "192.168.1.1", "Mozilla/5.0", "login", true, nil)
	if err != nil {
		t.Fatalf("Failed to log auth event: %v", err)
	}
	
	events := logger.GetEvents()
	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "login" {
		t.Errorf("Expected action 'login', got '%s'", event.Action)
	}
	if event.Resource != "authentication" {
		t.Errorf("Expected resource 'authentication', got '%s'", event.Resource)
	}
	if !event.Success {
		t.Error("Expected success to be true")
	}
}

func TestSecurityMonitor_MonitorFailedLogin(t *testing.T) {
	logger := NewDatabaseAuditLogger()
	monitor := NewSecurityMonitor(logger)
	ctx := context.Background()
	
	err := monitor.MonitorFailedLogin(ctx, "192.168.1.1", "testuser")
	if err != nil {
		t.Fatalf("Failed to monitor failed login: %v", err)
	}
	
	events := logger.GetEvents()
	if len(events) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(events))
	}
	
	event := events[0]
	if event.Action != "login_failed" {
		t.Errorf("Expected action 'login_failed', got '%s'", event.Action)
	}
	if event.Risk != RiskHigh {
		t.Errorf("Expected risk 'high', got '%s'", event.Risk)
	}
}

func TestAuditReporter_GenerateSecurityReport(t *testing.T) {
	logger := NewDatabaseAuditLogger()
	reporter := NewAuditReporter(logger)
	ctx := context.Background()
	
	// Add some test events
	userID := "user123"
	events := []*AuditEvent{
		{
			UserID:    &userID,
			IPAddress: "192.168.1.1",
			Action:    "login",
			Resource:  "authentication",
			Success:   true,
			Risk:      RiskMedium,
		},
		{
			UserID:    &userID,
			IPAddress: "192.168.1.1",
			Action:    "login_failed",
			Resource:  "authentication",
			Success:   false,
			Risk:      RiskHigh,
		},
		{
			UserID:    &userID,
			IPAddress: "192.168.1.2",
			Action:    "data_access",
			Resource:  "users",
			Success:   true,
			Risk:      RiskLow,
		},
	}
	
	for _, event := range events {
		logger.LogEvent(ctx, event)
	}
	
	// Generate report
	filter := AuditEventFilter{}
	report, err := reporter.GenerateSecurityReport(filter)
	if err != nil {
		t.Fatalf("Failed to generate security report: %v", err)
	}
	
	// Check report contents
	if report["total_events"] != 3 {
		t.Errorf("Expected 3 total events, got %v", report["total_events"])
	}
	if report["success_count"] != 2 {
		t.Errorf("Expected 2 successful events, got %v", report["success_count"])
	}
	if report["failure_count"] != 1 {
		t.Errorf("Expected 1 failed event, got %v", report["failure_count"])
	}
	
	// Check risk breakdown
	riskBreakdown := report["risk_breakdown"].(map[RiskLevel]int)
	if riskBreakdown[RiskLow] != 1 {
		t.Errorf("Expected 1 low risk event, got %d", riskBreakdown[RiskLow])
	}
	if riskBreakdown[RiskMedium] != 1 {
		t.Errorf("Expected 1 medium risk event, got %d", riskBreakdown[RiskMedium])
	}
	if riskBreakdown[RiskHigh] != 1 {
		t.Errorf("Expected 1 high risk event, got %d", riskBreakdown[RiskHigh])
	}
}

func BenchmarkEncryptionService_Encrypt(b *testing.B) {
	service := NewEncryptionService("test-secret-key")
	plaintext := "This is a test string for encryption benchmarking"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.Encrypt(plaintext)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkEncryptionService_Decrypt(b *testing.B) {
	service := NewEncryptionService("test-secret-key")
	plaintext := "This is a test string for encryption benchmarking"
	
	encrypted, err := service.Encrypt(plaintext)
	if err != nil {
		b.Fatal(err)
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.Decrypt(encrypted)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkInputValidator_ValidateEmail(b *testing.B) {
	validator := NewInputValidator()
	email := "test@example.com"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validator.ValidateEmail(email)
	}
}

func BenchmarkInputValidator_CheckSQLInjection(b *testing.B) {
	validator := NewInputValidator()
	input := "SELECT * FROM users WHERE id = 1"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		validator.CheckSQLInjection(input)
	}
}