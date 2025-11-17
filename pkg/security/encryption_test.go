package security

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptionService_EncryptDecrypt(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name      string
		plaintext string
	}{
		{
			name:      "simple text",
			plaintext: "hello world",
		},
		{
			name:      "empty string",
			plaintext: "",
		},
		{
			name:      "special characters",
			plaintext: "!@#$%^&*()_+-=[]{}|;:,.<>?",
		},
		{
			name:      "unicode text",
			plaintext: "你好世界",
		},
		{
			name:      "long text",
			plaintext: strings.Repeat("a", 1000),
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Encrypt
			encrypted, err := service.Encrypt(tt.plaintext)
			require.NoError(t, err)
			
			if tt.plaintext == "" {
				assert.Equal(t, "", encrypted)
				return
			}
			
			assert.NotEmpty(t, encrypted)
			assert.NotEqual(t, tt.plaintext, encrypted)
			
			// Decrypt
			decrypted, err := service.Decrypt(encrypted)
			require.NoError(t, err)
			assert.Equal(t, tt.plaintext, decrypted)
		})
	}
}

func TestEncryptionService_HashPassword(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	password := "test-password-123"
	
	// Hash password
	hash, err := service.HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)
	
	// Verify correct password
	assert.True(t, service.VerifyPassword(password, hash))
	
	// Verify incorrect password
	assert.False(t, service.VerifyPassword("wrong-password", hash))
}

func TestEncryptionService_GenerateSecureToken(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name   string
		length int
	}{
		{name: "short token", length: 8},
		{name: "medium token", length: 16},
		{name: "long token", length: 32},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := service.GenerateSecureToken(tt.length)
			require.NoError(t, err)
			assert.Len(t, token, tt.length*2) // Hex encoding doubles the length
			
			// Generate another token and ensure they're different
			token2, err := service.GenerateSecureToken(tt.length)
			require.NoError(t, err)
			assert.NotEqual(t, token, token2)
		})
	}
}

func TestEncryptionService_HashSHA256(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	input := "test-input"
	hash := service.HashSHA256(input)
	
	assert.NotEmpty(t, hash)
	assert.Len(t, hash, 64) // SHA256 produces 64-character hex string
	assert.NotEqual(t, input, hash)
	
	// Same input should produce same hash
	hash2 := service.HashSHA256(input)
	assert.Equal(t, hash, hash2)
	
	// Different input should produce different hash
	hash3 := service.HashSHA256("different-input")
	assert.NotEqual(t, hash, hash3)
}

func TestEncryptionService_MaskSensitiveData(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name         string
		data         string
		maskChar     rune
		visibleStart int
		visibleEnd   int
		expected     string
	}{
		{
			name:         "phone number",
			data:         "13800138000",
			maskChar:     '*',
			visibleStart: 3,
			visibleEnd:   4,
			expected:     "138****8000",
		},
		{
			name:         "short data",
			data:         "ab",
			maskChar:     '*',
			visibleStart: 3,
			visibleEnd:   4,
			expected:     "a*",
		},
		{
			name:         "empty data",
			data:         "",
			maskChar:     '*',
			visibleStart: 3,
			visibleEnd:   4,
			expected:     "",
		},
		{
			name:         "single character",
			data:         "a",
			maskChar:     '*',
			visibleStart: 3,
			visibleEnd:   4,
			expected:     "*",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.MaskSensitiveData(tt.data, tt.maskChar, tt.visibleStart, tt.visibleEnd)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEncryptionService_MaskPhone(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name     string
		phone    string
		expected string
	}{
		{
			name:     "normal phone",
			phone:    "13800138000",
			expected: "138****8000",
		},
		{
			name:     "short phone",
			phone:    "123456",
			expected: "12**56",
		},
		{
			name:     "empty phone",
			phone:    "",
			expected: "",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.MaskPhone(tt.phone)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEncryptionService_MaskEmail(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name     string
		email    string
		expected string
	}{
		{
			name:     "normal email",
			email:    "test@example.com",
			expected: "t**t@example.com",
		},
		{
			name:     "short local part",
			email:    "ab@example.com",
			expected: "**@example.com",
		},
		{
			name:     "single char local part",
			email:    "a@example.com",
			expected: "*@example.com",
		},
		{
			name:     "invalid email",
			email:    "invalid-email",
			expected: "in**id",
		},
		{
			name:     "empty email",
			email:    "",
			expected: "",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.MaskEmail(tt.email)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEncryptionService_MaskBankAccount(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name     string
		account  string
		expected string
	}{
		{
			name:     "normal account",
			account:  "1234567890123456",
			expected: "1234********3456",
		},
		{
			name:     "short account",
			account:  "123456",
			expected: "1***56",
		},
		{
			name:     "empty account",
			account:  "",
			expected: "",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.MaskBankAccount(tt.account)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEncryptionService_ValidatePasswordStrength(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name        string
		password    string
		expectError bool
	}{
		{
			name:        "strong password",
			password:    "StrongP@ssw0rd!",
			expectError: false,
		},
		{
			name:        "too short",
			password:    "Short1!",
			expectError: true,
		},
		{
			name:        "no uppercase",
			password:    "lowercase123!",
			expectError: true,
		},
		{
			name:        "no lowercase",
			password:    "UPPERCASE123!",
			expectError: true,
		},
		{
			name:        "no digit",
			password:    "NoDigitPassword!",
			expectError: true,
		},
		{
			name:        "no special character",
			password:    "NoSpecialChar123",
			expectError: true,
		},
		{
			name:        "minimum valid password",
			password:    "MinPass1!",
			expectError: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidatePasswordStrength(tt.password)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestEncryptionService_GenerateAPIKey(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	apiKey, err := service.GenerateAPIKey()
	require.NoError(t, err)
	assert.NotEmpty(t, apiKey)
	assert.True(t, strings.HasPrefix(apiKey, "rts_"))
	
	// Generate another key and ensure they're different
	apiKey2, err := service.GenerateAPIKey()
	require.NoError(t, err)
	assert.NotEqual(t, apiKey, apiKey2)
	
	// Validate the generated key
	assert.True(t, service.ValidateAPIKey(apiKey))
	assert.True(t, service.ValidateAPIKey(apiKey2))
}

func TestEncryptionService_ValidateAPIKey(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{
			name: "valid API key",
			apiKey: func() string {
				key, _ := service.GenerateAPIKey()
				return key
			}(),
			expected: true,
		},
		{
			name:     "invalid prefix",
			apiKey:   "invalid_prefix_key",
			expected: false,
		},
		{
			name:     "no prefix",
			apiKey:   "no-prefix-key",
			expected: false,
		},
		{
			name:     "empty key",
			apiKey:   "",
			expected: false,
		},
		{
			name:     "invalid base64",
			apiKey:   "rts_invalid-base64!",
			expected: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ValidateAPIKey(tt.apiKey)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestEncryptionService_SecureCompare(t *testing.T) {
	service := NewEncryptionService("test-secret-key")
	
	tests := []struct {
		name     string
		a        string
		b        string
		expected bool
	}{
		{
			name:     "identical strings",
			a:        "test-string",
			b:        "test-string",
			expected: true,
		},
		{
			name:     "different strings",
			a:        "test-string-1",
			b:        "test-string-2",
			expected: false,
		},
		{
			name:     "different lengths",
			a:        "short",
			b:        "longer-string",
			expected: false,
		},
		{
			name:     "empty strings",
			a:        "",
			b:        "",
			expected: true,
		},
		{
			name:     "one empty",
			a:        "test",
			b:        "",
			expected: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.SecureCompare(tt.a, tt.b)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func BenchmarkEncryptionService_Encrypt(b *testing.B) {
	service := NewEncryptionService("test-secret-key")
	plaintext := "test data for encryption benchmark"
	
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
	plaintext := "test data for decryption benchmark"
	encrypted, _ := service.Encrypt(plaintext)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.Decrypt(encrypted)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkEncryptionService_HashPassword(b *testing.B) {
	service := NewEncryptionService("test-secret-key")
	password := "test-password-123"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.HashPassword(password)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkEncryptionService_VerifyPassword(b *testing.B) {
	service := NewEncryptionService("test-secret-key")
	password := "test-password-123"
	hash, _ := service.HashPassword(password)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.VerifyPassword(password, hash)
	}
}