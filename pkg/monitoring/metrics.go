package monitoring

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// 充值订单相关指标
	RechargeOrdersTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recharge_orders_total",
			Help: "Total number of recharge orders created",
		},
		[]string{"merchant_id", "status", "payment_type"},
	)

	RechargeAmountTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recharge_amount_total",
			Help: "Total amount of recharge orders",
		},
		[]string{"merchant_id", "payment_type"},
	)

	RechargeOrderStatusChanges = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recharge_order_status_changes_total",
			Help: "Total number of recharge order status changes",
		},
		[]string{"merchant_id", "from_status", "to_status"},
	)

	// 账号匹配相关指标
	AccountMatchDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "account_match_duration_seconds",
			Help:    "Duration of account matching operations",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"merchant_id", "payment_type"},
	)

	AccountMatchSuccess = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "account_match_success_total",
			Help: "Total number of successful account matches",
		},
		[]string{"merchant_id", "payment_type", "account_id"},
	)

	AccountMatchFailures = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "account_match_failures_total",
			Help: "Total number of failed account matches",
		},
		[]string{"merchant_id", "payment_type", "reason"},
	)

	// 系统性能指标
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint", "status_code"},
	)

	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status_code"},
	)

	DatabaseConnectionsActive = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "database_connections_active",
			Help: "Number of active database connections",
		},
	)

	DatabaseQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "database_query_duration_seconds",
			Help:    "Duration of database queries",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation", "table"},
	)

	// 缓存相关指标
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"cache_type", "key_pattern"},
	)

	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"cache_type", "key_pattern"},
	)

	// 业务指标
	MerchantAccountsActive = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "merchant_accounts_active",
			Help: "Number of active merchant accounts",
		},
		[]string{"merchant_id"},
	)

	AccountLimitUtilization = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "account_limit_utilization_ratio",
			Help: "Account daily limit utilization ratio (0-1)",
		},
		[]string{"account_id", "account_type"},
	)

	NotificationsSent = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "notifications_sent_total",
			Help: "Total number of notifications sent",
		},
		[]string{"type", "channel", "status"},
	)

	// 错误和异常指标
	ErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "errors_total",
			Help: "Total number of errors",
		},
		[]string{"component", "error_type", "severity"},
	)

	PanicRecoveries = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "panic_recoveries_total",
			Help: "Total number of panic recoveries",
		},
		[]string{"component", "endpoint"},
	)
)

// RecordRechargeOrder 记录充值订单指标
func RecordRechargeOrder(merchantID, status, paymentType string, amount float64) {
	RechargeOrdersTotal.WithLabelValues(merchantID, status, paymentType).Inc()
	RechargeAmountTotal.WithLabelValues(merchantID, paymentType).Add(amount)
}

// RecordOrderStatusChange 记录订单状态变更
func RecordOrderStatusChange(merchantID, fromStatus, toStatus string) {
	RechargeOrderStatusChanges.WithLabelValues(merchantID, fromStatus, toStatus).Inc()
}

// RecordAccountMatch 记录账号匹配结果
func RecordAccountMatch(merchantID, paymentType, accountID string, duration float64, success bool, reason string) {
	AccountMatchDuration.WithLabelValues(merchantID, paymentType).Observe(duration)
	
	if success {
		AccountMatchSuccess.WithLabelValues(merchantID, paymentType, accountID).Inc()
	} else {
		AccountMatchFailures.WithLabelValues(merchantID, paymentType, reason).Inc()
	}
}

// RecordHTTPRequest 记录HTTP请求指标
func RecordHTTPRequest(method, endpoint, statusCode string, duration float64) {
	HTTPRequestsTotal.WithLabelValues(method, endpoint, statusCode).Inc()
	HTTPRequestDuration.WithLabelValues(method, endpoint, statusCode).Observe(duration)
}

// RecordDatabaseQuery 记录数据库查询指标
func RecordDatabaseQuery(operation, table string, duration float64) {
	DatabaseQueryDuration.WithLabelValues(operation, table).Observe(duration)
}

// RecordCacheOperation 记录缓存操作指标
func RecordCacheOperation(cacheType, keyPattern string, hit bool) {
	if hit {
		CacheHits.WithLabelValues(cacheType, keyPattern).Inc()
	} else {
		CacheMisses.WithLabelValues(cacheType, keyPattern).Inc()
	}
}

// RecordError 记录错误指标
func RecordError(component, errorType, severity string) {
	ErrorsTotal.WithLabelValues(component, errorType, severity).Inc()
}

// RecordPanicRecovery 记录panic恢复指标
func RecordPanicRecovery(component, endpoint string) {
	PanicRecoveries.WithLabelValues(component, endpoint).Inc()
}

// UpdateMerchantAccountsActive 更新商户活跃账号数量
func UpdateMerchantAccountsActive(merchantID string, count float64) {
	MerchantAccountsActive.WithLabelValues(merchantID).Set(count)
}

// UpdateAccountLimitUtilization 更新账号限额使用率
func UpdateAccountLimitUtilization(accountID, accountType string, ratio float64) {
	AccountLimitUtilization.WithLabelValues(accountID, accountType).Set(ratio)
}

// RecordNotification 记录通知发送指标
func RecordNotification(notificationType, channel, status string) {
	NotificationsSent.WithLabelValues(notificationType, channel, status).Inc()
}