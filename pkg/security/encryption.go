package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
)

// EncryptionService handles data encryption and decryption
type EncryptionService struct {
	key []byte
}

// NewEncryptionService creates a new encryption service
func NewEncryptionService(secretKey string) *EncryptionService {
	// Derive a 32-byte key from the secret
	key := pbkdf2.Key([]byte(secretKey), []byte("recharge-system-salt"), 10000, 32, sha256.New)
	return &EncryptionService{key: key}
}

// Encrypt encrypts plaintext using AES-GCM
func (es *EncryptionService) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(es.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-GCM
func (es *EncryptionService) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	block, err := aes.NewCipher(es.key)
	if err != nil {
		return "", fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext_bytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}

// HashPassword hashes a password using bcrypt
func (es *EncryptionService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword verifies a password against its hash
func (es *EncryptionService) VerifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateSecureToken generates a secure random token
func (es *EncryptionService) GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// HashSHA256 creates a SHA256 hash of the input
func (es *EncryptionService) HashSHA256(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:])
}

// MaskSensitiveData masks sensitive data for logging/display
func (es *EncryptionService) MaskSensitiveData(data string, maskChar rune, visibleStart, visibleEnd int) string {
	if data == "" {
		return ""
	}

	dataRunes := []rune(data)
	length := len(dataRunes)

	if length <= visibleStart+visibleEnd {
		// If data is too short, mask everything except first and last character
		if length <= 2 {
			return strings.Repeat(string(maskChar), length)
		}
		return string(dataRunes[0]) + strings.Repeat(string(maskChar), length-2) + string(dataRunes[length-1])
	}

	// Mask middle part
	masked := make([]rune, length)
	copy(masked[:visibleStart], dataRunes[:visibleStart])
	for i := visibleStart; i < length-visibleEnd; i++ {
		masked[i] = maskChar
	}
	copy(masked[length-visibleEnd:], dataRunes[length-visibleEnd:])

	return string(masked)
}

// MaskPhone masks phone number
func (es *EncryptionService) MaskPhone(phone string) string {
	return es.MaskSensitiveData(phone, '*', 3, 4)
}

// MaskEmail masks email address
func (es *EncryptionService) MaskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return es.MaskSensitiveData(email, '*', 2, 2)
	}

	localPart := parts[0]
	domain := parts[1]

	if len(localPart) <= 2 {
		maskedLocal := strings.Repeat("*", len(localPart))
		return maskedLocal + "@" + domain
	}

	maskedLocal := es.MaskSensitiveData(localPart, '*', 1, 1)
	return maskedLocal + "@" + domain
}

// MaskBankAccount masks bank account number
func (es *EncryptionService) MaskBankAccount(account string) string {
	return es.MaskSensitiveData(account, '*', 4, 4)
}

// MaskIDCard masks ID card number
func (es *EncryptionService) MaskIDCard(idCard string) string {
	return es.MaskSensitiveData(idCard, '*', 4, 4)
}

// EncryptSensitiveFields encrypts sensitive fields in a struct
func (es *EncryptionService) EncryptSensitiveFields(data map[string]interface{}, sensitiveFields []string) error {
	for _, field := range sensitiveFields {
		if value, exists := data[field]; exists {
			if strValue, ok := value.(string); ok && strValue != "" {
				encrypted, err := es.Encrypt(strValue)
				if err != nil {
					return fmt.Errorf("failed to encrypt field %s: %w", field, err)
				}
				data[field] = encrypted
			}
		}
	}
	return nil
}

// DecryptSensitiveFields decrypts sensitive fields in a struct
func (es *EncryptionService) DecryptSensitiveFields(data map[string]interface{}, sensitiveFields []string) error {
	for _, field := range sensitiveFields {
		if value, exists := data[field]; exists {
			if strValue, ok := value.(string); ok && strValue != "" {
				decrypted, err := es.Decrypt(strValue)
				if err != nil {
					return fmt.Errorf("failed to decrypt field %s: %w", field, err)
				}
				data[field] = decrypted
			}
		}
	}
	return nil
}

// ValidatePasswordStrength validates password strength
func (es *EncryptionService) ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		case strings.ContainsRune("!@#$%^&*()_+-=[]{}|;:,.<>?", char):
			hasSpecial = true
		}
	}

	var missing []string
	if !hasUpper {
		missing = append(missing, "uppercase letter")
	}
	if !hasLower {
		missing = append(missing, "lowercase letter")
	}
	if !hasDigit {
		missing = append(missing, "digit")
	}
	if !hasSpecial {
		missing = append(missing, "special character")
	}

	if len(missing) > 0 {
		return fmt.Errorf("password must contain at least one: %s", strings.Join(missing, ", "))
	}

	return nil
}

// GenerateAPIKey generates a secure API key
func (es *EncryptionService) GenerateAPIKey() (string, error) {
	// Generate 32 random bytes
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate API key: %w", err)
	}

	// Encode as base64 and add prefix
	apiKey := "rts_" + base64.URLEncoding.EncodeToString(bytes)
	return apiKey, nil
}

// ValidateAPIKey validates API key format
func (es *EncryptionService) ValidateAPIKey(apiKey string) bool {
	if !strings.HasPrefix(apiKey, "rts_") {
		return false
	}

	keyPart := strings.TrimPrefix(apiKey, "rts_")
	decoded, err := base64.URLEncoding.DecodeString(keyPart)
	if err != nil {
		return false
	}

	return len(decoded) == 32
}

// SecureCompare performs constant-time string comparison
func (es *EncryptionService) SecureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}

	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}

	return result == 0
}