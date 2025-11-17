package logger

import (
	"github.com/sirupsen/logrus"
)

// NewLogger creates a new logger instance
func NewLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	return logger
}