package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// CreateAdAccountNotificationRequest 创建广告账户通知配置请求
type CreateAdAccountNotificationRequest struct {
	AdAccountName        string                 `json:"ad_account_name" binding:"required,min=1,max=100"`
	AdAccountID          string                 `json:"ad_account_id" binding:"required,min=1,max=100"`
	WebhookURL           string                 `json:"webhook_url" binding:"required,url"`
	WebhookSecret        *string                `json:"webhook_secret,omitempty"`
	BackupWebhookURL     *string                `json:"backup_webhook_url,omitempty" binding:"omitempty,url"`
	EnabledEvents        []string               `json:"enabled_events" binding:"required,min=1"`
	MaxRetries           int                    `json:"max_retries" binding:"min=0,max=10"`
	RetryIntervalSeconds int                    `json:"retry_interval_seconds" binding:"min=1,max=3600"`
	ExponentialBackoff   bool                   `json:"exponential_backoff"`
	MaxRetryIntervalSecs int                    `json:"max_retry_interval_seconds" binding:"min=60,max=86400"`
	TimeoutSeconds       int                    `json:"timeout_seconds" binding:"min=5,max=300"`
	NotificationFormat   string                 `json:"notification_format" binding:"oneof=json xml form"`
	CustomHeaders        map[string]interface{} `json:"custom_headers,omitempty"`
	IsActive             bool                   `json:"is_active"`
	HealthCheckEnabled   bool                   `json:"health_check_enabled"`
	HealthCheckURL       *string                `json:"health_check_url,omitempty" binding:"omitempty,url"`
	HealthCheckInterval  int                    `json:"health_check_interval_minutes" binding:"min=1,max=1440"`
	ContactEmail         *string                `json:"contact_email,omitempty" binding:"omitempty,email"`
	ContactPhone         *string                `json:"contact_phone,omitempty"`
}

// UpdateAdAccountNotificationRequest 更新广告账户通知配置请求
type UpdateAdAccountNotificationRequest struct {
	AdAccountName        *string                `json:"ad_account_name,omitempty" binding:"omitempty,min=1,max=100"`
	WebhookURL           *string                `json:"webhook_url,omitempty" binding:"omitempty,url"`
	WebhookSecret        *string                `json:"webhook_secret"`
	BackupWebhookURL     *string                `json:"backup_webhook_url" binding:"omitempty,url"`
	EnabledEvents        *[]string              `json:"enabled_events,omitempty" binding:"omitempty,min=1"`
	MaxRetries           *int                   `json:"max_retries,omitempty" binding:"omitempty,min=0,max=10"`
	RetryIntervalSeconds *int                   `json:"retry_interval_seconds,omitempty" binding:"omitempty,min=1,max=3600"`
	ExponentialBackoff   *bool                  `json:"exponential_backoff,omitempty"`
	MaxRetryIntervalSecs *int                   `json:"max_retry_interval_seconds,omitempty" binding:"omitempty,min=60,max=86400"`
	TimeoutSeconds       *int                   `json:"timeout_seconds,omitempty" binding:"omitempty,min=5,max=300"`
	NotificationFormat   *string                `json:"notification_format,omitempty" binding:"omitempty,oneof=json xml form"`
	CustomHeaders        *map[string]interface{} `json:"custom_headers"`
	IsActive             *bool                  `json:"is_active,omitempty"`
	HealthCheckEnabled   *bool                  `json:"health_check_enabled,omitempty"`
	HealthCheckURL       *string                `json:"health_check_url" binding:"omitempty,url"`
	HealthCheckInterval  *int                   `json:"health_check_interval_minutes,omitempty" binding:"omitempty,min=1,max=1440"`
	ContactEmail         *string                `json:"contact_email" binding:"omitempty,email"`
	ContactPhone         *string                `json:"contact_phone"`
}

// AdAccountNotificationFilter 广告账户通知配置过滤器
type AdAccountNotificationFilter struct {
	AdAccountID        *string `json:"ad_account_id,omitempty"`
	AdAccountName      *string `json:"ad_account_name,omitempty"`
	IsActive           *bool   `json:"is_active,omitempty"`
	HealthCheckEnabled *bool   `json:"health_check_enabled,omitempty"`
	HealthStatus       *string `json:"health_status,omitempty"`
	Limit              int     `json:"limit,omitempty"`
	Offset             int     `json:"offset,omitempty"`
	OrderBy            string  `json:"order_by,omitempty"`
	OrderDir           string  `json:"order_dir,omitempty"`
}

// BatchNotificationRequest 批量通知请求
type BatchNotificationRequest struct {
	Notifications []BatchNotificationItem `json:"notifications" binding:"required,min=1,max=100"`
}

// BatchNotificationItem 批量通知项
type BatchNotificationItem struct {
	AdAccountID string    `json:"ad_account_id" binding:"required"`
	EventType   string    `json:"event_type" binding:"required"`
	OrderID     uuid.UUID `json:"order_id" binding:"required"`
}

// HealthCheckResult 健康检查结果
type HealthCheckResult struct {
	AdAccountID  string    `json:"ad_account_id"`
	Status       string    `json:"status"` // healthy, unhealthy, error, disabled
	StatusCode   int       `json:"status_code,omitempty"`
	Message      string    `json:"message"`
	ResponseTime int       `json:"response_time_ms"`
	ResponseBody string    `json:"response_body,omitempty"`
	CheckedAt    time.Time `json:"checked_at"`
}

// FailedNotificationFilter 失败通知过滤器
type FailedNotificationFilter struct {
	AdAccountID             *string    `json:"ad_account_id,omitempty"`
	EventType               *string    `json:"event_type,omitempty"`
	StartDate               *time.Time `json:"start_date,omitempty"`
	EndDate                 *time.Time `json:"end_date,omitempty"`
	MinRetryCount           *int       `json:"min_retry_count,omitempty"`
	MaxRetriesExceeded      *bool      `json:"max_retries_exceeded,omitempty"`
	Limit                   int        `json:"limit,omitempty"`
	Offset                  int        `json:"offset,omitempty"`
	OrderBy                 string     `json:"order_by,omitempty"`
	OrderDir                string     `json:"order_dir,omitempty"`
}

// CreateNotificationTemplateRequest 创建通知模板请求
type CreateNotificationTemplateRequest struct {
	Name              string                 `json:"name" binding:"required,min=1,max=100"`
	TemplateType      string                 `json:"template_type" binding:"required,oneof=webhook email sms realtime"`
	EventType         string                 `json:"event_type" binding:"required,min=1,max=50"`
	SubjectTemplate   *string                `json:"subject_template,omitempty"`
	BodyTemplate      string                 `json:"body_template" binding:"required,min=1"`
	ContentType       string                 `json:"content_type" binding:"required"`
	TemplateEngine    string                 `json:"template_engine" binding:"oneof=go_template mustache jinja2"`
	TemplateVariables map[string]interface{} `json:"template_variables,omitempty"`
	SampleData        map[string]interface{} `json:"sample_data,omitempty"`
	IsActive          bool                   `json:"is_active"`
	Version           string                 `json:"version" binding:"required"`
	ParentTemplateID  *uuid.UUID             `json:"parent_template_id,omitempty"`
}

// UpdateNotificationTemplateRequest 更新通知模板请求
type UpdateNotificationTemplateRequest struct {
	Name              *string                 `json:"name,omitempty" binding:"omitempty,min=1,max=100"`
	SubjectTemplate   *string                 `json:"subject_template"`
	BodyTemplate      *string                 `json:"body_template,omitempty" binding:"omitempty,min=1"`
	TemplateVariables *map[string]interface{} `json:"template_variables"`
	SampleData        *map[string]interface{} `json:"sample_data"`
	IsActive          *bool                   `json:"is_active,omitempty"`
}

// NotificationTemplateFilter 通知模板过滤器
type NotificationTemplateFilter struct {
	TemplateType     *string `json:"template_type,omitempty"`
	EventType        *string `json:"event_type,omitempty"`
	IsActive         *bool   `json:"is_active,omitempty"`
	IsSystemTemplate *bool   `json:"is_system_template,omitempty"`
	Limit            int     `json:"limit,omitempty"`
	Offset           int     `json:"offset,omitempty"`
	OrderBy          string  `json:"order_by,omitempty"`
	OrderDir         string  `json:"order_dir,omitempty"`
}

// RenderedNotification 渲染后的通知
type RenderedNotification struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// QueueNotificationRequest 队列通知请求
type QueueNotificationRequest struct {
	QueueName        string                 `json:"queue_name" binding:"required"`
	Priority         int                    `json:"priority" binding:"min=1,max=10"`
	TargetType       string                 `json:"target_type" binding:"required,oneof=webhook email sms realtime"`
	TargetIdentifier string                 `json:"target_identifier" binding:"required"`
	NotificationType string                 `json:"notification_type" binding:"required"`
	EventType        string                 `json:"event_type" binding:"required"`
	Subject          *string                `json:"subject,omitempty"`
	Content          string                 `json:"content" binding:"required"`
	ContentType      string                 `json:"content_type" binding:"required"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	ReferenceID      *uuid.UUID             `json:"reference_id,omitempty"`
	ReferenceType    *string                `json:"reference_type,omitempty"`
	ScheduledAt      *time.Time             `json:"scheduled_at,omitempty"`
	DelaySeconds     int                    `json:"delay_seconds,omitempty"`
	MaxRetries       int                    `json:"max_retries" binding:"min=0,max=10"`
}

// QueueStats 队列统计信息
type QueueStats struct {
	QueueName            string    `json:"queue_name"`
	PendingCount         int       `json:"pending_count"`
	ProcessingCount      int       `json:"processing_count"`
	CompletedCount       int       `json:"completed_count"`
	FailedCount          int       `json:"failed_count"`
	AverageProcessingTime int      `json:"avg_processing_time_ms"`
	LastProcessedAt      *time.Time `json:"last_processed_at"`
	TotalThroughput      int       `json:"total_throughput"`
}

// NotificationStatsFilter 通知统计过滤器
type NotificationStatsFilter struct {
	AdAccountID *string    `json:"ad_account_id,omitempty"`
	EventType   *string    `json:"event_type,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	GroupBy     string     `json:"group_by,omitempty"` // hour, day, week, month
}

// NotificationStats 通知统计信息
type NotificationStats struct {
	TotalNotifications       int                    `json:"total_notifications"`
	SuccessfulNotifications  int                    `json:"successful_notifications"`
	FailedNotifications      int                    `json:"failed_notifications"`
	SuccessRate              decimal.Decimal        `json:"success_rate"`
	AverageResponseTime      decimal.Decimal        `json:"avg_response_time_ms"`
	EventTypeBreakdown       map[string]int         `json:"event_type_breakdown"`
	AdAccountBreakdown       map[string]int         `json:"ad_account_breakdown"`
	HourlyStats              []HourlyStats          `json:"hourly_stats,omitempty"`
	DailyStats               []DailyStats           `json:"daily_stats,omitempty"`
	ResponseTimeDistribution []ResponseTimeRange    `json:"response_time_distribution"`
}

// HourlyStats 小时统计
type HourlyStats struct {
	Hour           time.Time       `json:"hour"`
	Notifications  int             `json:"notifications"`
	Successes      int             `json:"successes"`
	Failures       int             `json:"failures"`
	AvgResponseTime decimal.Decimal `json:"avg_response_time_ms"`
}

// DailyStats 日统计
type DailyStats struct {
	Date           time.Time       `json:"date"`
	Notifications  int             `json:"notifications"`
	Successes      int             `json:"successes"`
	Failures       int             `json:"failures"`
	AvgResponseTime decimal.Decimal `json:"avg_response_time_ms"`
}

// ResponseTimeRange 响应时间范围
type ResponseTimeRange struct {
	MinTime int `json:"min_time_ms"`
	MaxTime int `json:"max_time_ms"`
	Count   int `json:"count"`
}

// NotificationLogFilter 通知日志过滤器
type NotificationLogFilter struct {
	AdAccountNotificationID *uuid.UUID `json:"ad_account_notification_id,omitempty"`
	RechargeOrderID         *uuid.UUID `json:"recharge_order_id,omitempty"`
	EventType               *string    `json:"event_type,omitempty"`
	Status                  *string    `json:"status,omitempty"`
	StartDate               *time.Time `json:"start_date,omitempty"`
	EndDate                 *time.Time `json:"end_date,omitempty"`
	MinResponseTime         *int       `json:"min_response_time_ms,omitempty"`
	MaxResponseTime         *int       `json:"max_response_time_ms,omitempty"`
	HasError                *bool      `json:"has_error,omitempty"`
	Limit                   int        `json:"limit,omitempty"`
	Offset                  int        `json:"offset,omitempty"`
	OrderBy                 string     `json:"order_by,omitempty"`
	OrderDir                string     `json:"order_dir,omitempty"`
}

// ExportDataRequest 导出数据请求
type ExportDataRequest struct {
	ExportType   string                 `json:"export_type" binding:"required,oneof=csv json xlsx"`
	StartDate    time.Time              `json:"start_date" binding:"required"`
	EndDate      time.Time              `json:"end_date" binding:"required"`
	AdAccountIDs []string               `json:"ad_account_ids,omitempty"`
	EventTypes   []string               `json:"event_types,omitempty"`
	Status       []string               `json:"status,omitempty"`
	Fields       []string               `json:"fields,omitempty"`
	Filters      map[string]interface{} `json:"filters,omitempty"`
	Compression  bool                   `json:"compression,omitempty"`
}

// ExportResult 导出结果
type ExportResult struct {
	ExportID     uuid.UUID `json:"export_id"`
	Status       string    `json:"status"` // pending, processing, completed, failed
	RecordCount  int       `json:"record_count"`
	FileSize     int64     `json:"file_size"`
	DownloadURL  string    `json:"download_url"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	ErrorMessage *string   `json:"error_message,omitempty"`
}

// MonitoringMetrics 监控指标
type MonitoringMetrics struct {
	TargetID                 uuid.UUID       `json:"target_id"`
	TargetName               string          `json:"target_name"`
	TargetType               string          `json:"target_type"`
	TotalNotifications       int             `json:"total_notifications"`
	SuccessfulNotifications  int             `json:"successful_notifications"`
	FailedNotifications      int             `json:"failed_notifications"`
	SuccessRate              decimal.Decimal `json:"success_rate"`
	AvgResponseTime          decimal.Decimal `json:"avg_response_time_ms"`
	RecentNotifications24h   int             `json:"recent_notifications_24h"`
	RecentSuccesses24h       int             `json:"recent_successes_24h"`
	RecentFailures24h        int             `json:"recent_failures_24h"`
	CurrentStatus            string          `json:"current_status"`
	ConsecutiveFailures      int             `json:"consecutive_failures"`
	LastNotificationAt       *time.Time      `json:"last_notification_at"`
	LastSuccessAt            *time.Time      `json:"last_success_at"`
	LastFailureAt            *time.Time      `json:"last_failure_at"`
	HealthCheckStatus        string          `json:"health_check_status"`
	LastHealthCheckAt        *time.Time      `json:"last_health_check_at"`
	HealthCheckResponseTime  *int            `json:"health_check_response_time_ms"`
	IsAlerting               bool            `json:"is_alerting"`
	LastAlertSentAt          *time.Time      `json:"last_alert_sent_at"`
}

// AlertRule 告警规则
type AlertRule struct {
	ID                    uuid.UUID `json:"id"`
	Name                  string    `json:"name"`
	TargetType            string    `json:"target_type"`
	TargetIDs             []uuid.UUID `json:"target_ids,omitempty"` // 如果为空则适用于所有目标
	MetricType            string    `json:"metric_type"` // failure_rate, response_time, consecutive_failures
	Threshold             decimal.Decimal `json:"threshold"`
	ComparisonOperator    string    `json:"comparison_operator"` // gt, gte, lt, lte, eq
	EvaluationWindow      int       `json:"evaluation_window_minutes"`
	AlertChannels         []string  `json:"alert_channels"` // email, webhook, slack
	AlertRecipients       []string  `json:"alert_recipients"`
	CooldownPeriod        int       `json:"cooldown_period_minutes"`
	IsActive              bool      `json:"is_active"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// AlertEvent 告警事件
type AlertEvent struct {
	ID               uuid.UUID              `json:"id"`
	AlertRuleID      uuid.UUID              `json:"alert_rule_id"`
	TargetID         uuid.UUID              `json:"target_id"`
	TargetName       string                 `json:"target_name"`
	MetricType       string                 `json:"metric_type"`
	CurrentValue     decimal.Decimal        `json:"current_value"`
	ThresholdValue   decimal.Decimal        `json:"threshold_value"`
	Severity         string                 `json:"severity"` // low, medium, high, critical
	Status           string                 `json:"status"` // firing, resolved
	Message          string                 `json:"message"`
	AdditionalData   map[string]interface{} `json:"additional_data,omitempty"`
	TriggeredAt      time.Time              `json:"triggered_at"`
	ResolvedAt       *time.Time             `json:"resolved_at,omitempty"`
	LastNotifiedAt   *time.Time             `json:"last_notified_at,omitempty"`
	NotificationCount int                   `json:"notification_count"`
}

// SystemHealth 系统健康状态
type SystemHealth struct {
	OverallStatus         string                `json:"overall_status"` // healthy, warning, critical
	TotalAdAccounts       int                   `json:"total_ad_accounts"`
	ActiveAdAccounts      int                   `json:"active_ad_accounts"`
	HealthyAdAccounts     int                   `json:"healthy_ad_accounts"`
	UnhealthyAdAccounts   int                   `json:"unhealthy_ad_accounts"`
	TotalNotifications24h int                   `json:"total_notifications_24h"`
	SuccessRate24h        decimal.Decimal       `json:"success_rate_24h"`
	AvgResponseTime24h    decimal.Decimal       `json:"avg_response_time_24h"`
	ActiveAlerts          int                   `json:"active_alerts"`
	QueueBacklog          int                   `json:"queue_backlog"`
	ProcessingCapacity    int                   `json:"processing_capacity"`
	ComponentStatuses     map[string]string     `json:"component_statuses"`
	LastUpdatedAt         time.Time             `json:"last_updated_at"`
}

// Performance metrics structures

// PerformanceMetrics 性能指标
type PerformanceMetrics struct {
	ThroughputPerSecond   decimal.Decimal       `json:"throughput_per_second"`
	AverageLatency        decimal.Decimal       `json:"average_latency_ms"`
	P95Latency            decimal.Decimal       `json:"p95_latency_ms"`
	P99Latency            decimal.Decimal       `json:"p99_latency_ms"`
	ErrorRate             decimal.Decimal       `json:"error_rate"`
	ConcurrentRequests    int                   `json:"concurrent_requests"`
	QueueDepth            int                   `json:"queue_depth"`
	ResourceUtilization   map[string]decimal.Decimal `json:"resource_utilization"`
	MeasurementWindow     time.Duration         `json:"measurement_window"`
	TimestampRange        TimeRange             `json:"timestamp_range"`
}

// TimeRange 时间范围
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// WebhookTestRequest Webhook测试请求
type WebhookTestRequest struct {
	URL             string                 `json:"url" binding:"required,url"`
	Method          string                 `json:"method" binding:"required,oneof=GET POST PUT PATCH DELETE"`
	Headers         map[string]string      `json:"headers,omitempty"`
	Body            string                 `json:"body,omitempty"`
	TimeoutSeconds  int                    `json:"timeout_seconds" binding:"min=1,max=60"`
	FollowRedirects bool                   `json:"follow_redirects"`
	ValidateSSL     bool                   `json:"validate_ssl"`
	ExpectedStatus  []int                  `json:"expected_status,omitempty"`
}

// WebhookTestResult Webhook测试结果
type WebhookTestResult struct {
	Success           bool                   `json:"success"`
	StatusCode        int                    `json:"status_code"`
	ResponseHeaders   map[string]string      `json:"response_headers"`
	ResponseBody      string                 `json:"response_body"`
	ResponseTime      int                    `json:"response_time_ms"`
	Error             *string                `json:"error,omitempty"`
	Redirects         []string               `json:"redirects,omitempty"`
	SSLInfo           map[string]interface{} `json:"ssl_info,omitempty"`
	DNSResolutionTime int                    `json:"dns_resolution_time_ms"`
	ConnectionTime    int                    `json:"connection_time_ms"`
	TLSHandshakeTime  int                    `json:"tls_handshake_time_ms"`
	TestedAt          time.Time              `json:"tested_at"`
}