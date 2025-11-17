package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
	ErrInvalidClaims = errors.New("invalid token claims")
)

// JWTManager handles JWT token operations
type JWTManager struct {
	secretKey        string
	accessTokenTTL   time.Duration
	refreshTokenTTL  time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secretKey string, accessTokenTTL, refreshTokenTTL time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:       secretKey,
		accessTokenTTL:  accessTokenTTL,
		refreshTokenTTL: refreshTokenTTL,
	}
}

// CustomClaims represents the JWT claims
type CustomClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	Roles    []string  `json:"roles"`
	Type     string    `json:"type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// GenerateAccessToken generates an access token
func (j *JWTManager) GenerateAccessToken(userID uuid.UUID, username, email string, roles []string) (string, time.Time, error) {
	expiresAt := time.Now().Add(j.accessTokenTTL)
	
	claims := &CustomClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
		Roles:    roles,
		Type:     "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "cjpayment",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(j.secretKey))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// GenerateRefreshToken generates a refresh token
func (j *JWTManager) GenerateRefreshToken(userID uuid.UUID, username, email string) (string, time.Time, error) {
	expiresAt := time.Now().Add(j.refreshTokenTTL)
	
	claims := &CustomClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
		Type:     "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "cjpayment",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(j.secretKey))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

// ValidateToken validates and parses a JWT token
func (j *JWTManager) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return []byte(j.secretKey), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}

// ExtractTokenClaims extracts token claims without validation (for expired tokens)
func (j *JWTManager) ExtractTokenClaims(tokenString string) (*CustomClaims, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return nil, ErrInvalidClaims
	}

	return claims, nil
}