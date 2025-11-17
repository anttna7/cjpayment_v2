package service

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// EmailService handles email sending functionality
type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	fromEmail    string
	fromName     string
}

// NewEmailService creates a new email service
func NewEmailService(smtpHost, smtpPort, username, password, fromEmail, fromName string) *EmailService {
	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUsername: username,
		smtpPassword: password,
		fromEmail:    fromEmail,
		fromName:     fromName,
	}
}

// EmailMessage represents an email message
type EmailMessage struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

// SendEmail sends an email message
func (s *EmailService) SendEmail(ctx context.Context, message *EmailMessage) error {
	if len(message.To) == 0 {
		return fmt.Errorf("no recipients specified")
	}

	// Create SMTP authentication
	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)

	// Build email content
	content := s.buildEmailContent(message)

	// Send email
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)
	err := smtp.SendMail(addr, auth, s.fromEmail, message.To, []byte(content))
	if err != nil {
		log.Printf("Failed to send email: %v", err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	log.Printf("Email sent successfully to %s", strings.Join(message.To, ", "))
	return nil
}

// buildEmailContent builds the email content with proper headers
func (s *EmailService) buildEmailContent(message *EmailMessage) string {
	var content strings.Builder

	// Headers
	content.WriteString(fmt.Sprintf("From: %s <%s>\r\n", s.fromName, s.fromEmail))
	content.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(message.To, ", ")))
	content.WriteString(fmt.Sprintf("Subject: %s\r\n", message.Subject))
	content.WriteString("MIME-Version: 1.0\r\n")

	if message.IsHTML {
		content.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	} else {
		content.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	}

	content.WriteString("\r\n")

	// Body
	content.WriteString(message.Body)

	return content.String()
}

// SendNotificationEmail sends a notification email with predefined template
func (s *EmailService) SendNotificationEmail(ctx context.Context, to []string, title, content string) error {
	message := &EmailMessage{
		To:      to,
		Subject: title,
		Body:    content,
		IsHTML:  true,
	}

	return s.SendEmail(ctx, message)
}

// MockEmailService is a mock implementation for testing
type MockEmailService struct {
	SentEmails []EmailMessage
}

// NewMockEmailService creates a new mock email service
func NewMockEmailService() *MockEmailService {
	return &MockEmailService{
		SentEmails: make([]EmailMessage, 0),
	}
}

// SendEmail mock implementation that stores emails instead of sending them
func (m *MockEmailService) SendEmail(ctx context.Context, message *EmailMessage) error {
	m.SentEmails = append(m.SentEmails, *message)
	log.Printf("Mock email sent to %s: %s", strings.Join(message.To, ", "), message.Subject)
	return nil
}

// SendNotificationEmail mock implementation
func (m *MockEmailService) SendNotificationEmail(ctx context.Context, to []string, title, content string) error {
	message := EmailMessage{
		To:      to,
		Subject: title,
		Body:    content,
		IsHTML:  true,
	}
	return m.SendEmail(ctx, &message)
}

// GetSentEmails returns all sent emails (for testing)
func (m *MockEmailService) GetSentEmails() []EmailMessage {
	return m.SentEmails
}

// ClearSentEmails clears the sent emails list (for testing)
func (m *MockEmailService) ClearSentEmails() {
	m.SentEmails = make([]EmailMessage, 0)
}