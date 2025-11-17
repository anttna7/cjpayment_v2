package domain

import (
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"
)

// DomainConfig 域名配置结构体
type DomainConfig struct {
	ID                    int       `json:"id" db:"id"`
	DomainName           string    `json:"domain_name" db:"domain_name"`
	DomainType           string    `json:"domain_type" db:"domain_type"`
	IsActive             bool      `json:"is_active" db:"is_active"`
	Priority             int       `json:"priority" db:"priority"`
	HealthCheckURL       string    `json:"health_check_url" db:"health_check_url"`
	HealthCheckInterval  int       `json:"health_check_interval" db:"health_check_interval"`
	TimeoutSeconds       int       `json:"timeout_seconds" db:"timeout_seconds"`
	FailureThreshold     int       `json:"failure_threshold" db:"failure_threshold"`
	SuccessThreshold     int       `json:"success_threshold" db:"success_threshold"`
	LastCheckTime        time.Time `json:"last_check_time" db:"last_check_time"`
	LastSuccessTime      *time.Time `json:"last_success_time" db:"last_success_time"`
	ConsecutiveFailures  int       `json:"consecutive_failures" db:"consecutive_failures"`
	ConsecutiveSuccesses int       `json:"consecutive_successes" db:"consecutive_successes"`
	Status               string    `json:"status" db:"status"`
	SSLCheck             bool      `json:"ssl_check" db:"ssl_check"`
	SSLExpiryDate        *time.Time `json:"ssl_expiry_date" db:"ssl_expiry_date"`
	ResponseTimeMs       int       `json:"response_time_ms" db:"response_time_ms"`
	Description          string    `json:"description" db:"description"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

// HealthCheckResult 健康检查结果
type HealthCheckResult struct {
	DomainID              int           `json:"domain_id"`
	DomainName           string        `json:"domain_name"`
	IsSuccess            bool          `json:"is_success"`
	ResponseTimeMs       int           `json:"response_time_ms"`
	StatusCode           int           `json:"status_code"`
	ErrorMessage         string        `json:"error_message,omitempty"`
	DNSResolutionTimeMs  int           `json:"dns_resolution_time_ms"`
	TCPConnectionTimeMs  int           `json:"tcp_connection_time_ms"`
	SSLHandshakeTimeMs   int           `json:"ssl_handshake_time_ms"`
	ResponseSize         int           `json:"response_size"`
	SSLInfo              *SSLInfo      `json:"ssl_info,omitempty"`
	CheckTime            time.Time     `json:"check_time"`
	AdditionalMetrics    map[string]interface{} `json:"additional_metrics,omitempty"`
}

// SSLInfo SSL证书信息
type SSLInfo struct {
	IsValid     bool      `json:"is_valid"`
	ExpiryDate  time.Time `json:"expiry_date"`
	DaysToExpiry int      `json:"days_to_expiry"`
	Issuer      string    `json:"issuer"`
	Subject     string    `json:"subject"`
}

// DomainHealthChecker 域名健康检查器
type DomainHealthChecker struct {
	db                *sql.DB
	httpClient        *http.Client
	domains           map[int]*DomainConfig
	domainsMutex      sync.RWMutex
	isRunning         bool
	stopChan          chan struct{}
	resultChan        chan *HealthCheckResult
	onStatusChange    func(domain *DomainConfig, oldStatus, newStatus string)
	onFailoverTrigger func(domain *DomainConfig, reason string)
	logger            *log.Logger
}

// NewDomainHealthChecker 创建新的域名健康检查器
func NewDomainHealthChecker(db *sql.DB, logger *log.Logger) *DomainHealthChecker {
	return &DomainHealthChecker{
		db: db,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     30 * time.Second,
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: false,
				},
				DialContext: (&net.Dialer{
					Timeout:   10 * time.Second,
					KeepAlive: 30 * time.Second,
				}).DialContext,
			},
		},
		domains:    make(map[int]*DomainConfig),
		stopChan:   make(chan struct{}),
		resultChan: make(chan *HealthCheckResult, 100),
		logger:     logger,
	}
}

// SetStatusChangeCallback 设置状态变化回调
func (dhc *DomainHealthChecker) SetStatusChangeCallback(callback func(domain *DomainConfig, oldStatus, newStatus string)) {
	dhc.onStatusChange = callback
}

// SetFailoverTriggerCallback 设置故障转移触发回调
func (dhc *DomainHealthChecker) SetFailoverTriggerCallback(callback func(domain *DomainConfig, reason string)) {
	dhc.onFailoverTrigger = callback
}

// LoadDomains 从数据库加载域名配置
func (dhc *DomainHealthChecker) LoadDomains() error {
	query := `
		SELECT id, domain_name, domain_type, is_active, priority, health_check_url,
		       health_check_interval, timeout_seconds, failure_threshold, success_threshold,
		       last_check_time, last_success_time, consecutive_failures, consecutive_successes,
		       status, ssl_check, ssl_expiry_date, response_time_ms, description,
		       created_at, updated_at
		FROM domain_config
		WHERE is_active = true
		ORDER BY priority ASC
	`

	rows, err := dhc.db.Query(query)
	if err != nil {
		return fmt.Errorf("查询域名配置失败: %w", err)
	}
	defer rows.Close()

	dhc.domainsMutex.Lock()
	defer dhc.domainsMutex.Unlock()

	// 清空现有配置
	dhc.domains = make(map[int]*DomainConfig)

	for rows.Next() {
		domain := &DomainConfig{}
		err := rows.Scan(
			&domain.ID, &domain.DomainName, &domain.DomainType, &domain.IsActive,
			&domain.Priority, &domain.HealthCheckURL, &domain.HealthCheckInterval,
			&domain.TimeoutSeconds, &domain.FailureThreshold, &domain.SuccessThreshold,
			&domain.LastCheckTime, &domain.LastSuccessTime, &domain.ConsecutiveFailures,
			&domain.ConsecutiveSuccesses, &domain.Status, &domain.SSLCheck,
			&domain.SSLExpiryDate, &domain.ResponseTimeMs, &domain.Description,
			&domain.CreatedAt, &domain.UpdatedAt,
		)
		if err != nil {
			dhc.logger.Printf("扫描域名配置失败: %v", err)
			continue
		}

		dhc.domains[domain.ID] = domain
	}

	dhc.logger.Printf("已加载 %d 个域名配置", len(dhc.domains))
	return nil
}

// Start 启动健康检查器
func (dhc *DomainHealthChecker) Start(ctx context.Context) error {
	if dhc.isRunning {
		return fmt.Errorf("健康检查器已在运行")
	}

	dhc.isRunning = true
	dhc.logger.Println("启动域名健康检查器...")

	// 加载域名配置
	if err := dhc.LoadDomains(); err != nil {
		return fmt.Errorf("加载域名配置失败: %w", err)
	}

	// 启动结果处理协程
	go dhc.processResults(ctx)

	// 启动健康检查协程
	go dhc.runHealthChecks(ctx)

	// 启动定期重新加载配置协程
	go dhc.reloadConfigPeriodically(ctx)

	return nil
}

// Stop 停止健康检查器
func (dhc *DomainHealthChecker) Stop() {
	if !dhc.isRunning {
		return
	}

	dhc.logger.Println("停止域名健康检查器...")
	dhc.isRunning = false
	close(dhc.stopChan)
}

// runHealthChecks 运行健康检查
func (dhc *DomainHealthChecker) runHealthChecks(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second) // 每10秒检查一次
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-dhc.stopChan:
			return
		case <-ticker.C:
			dhc.performHealthChecks()
		}
	}
}

// performHealthChecks 执行健康检查
func (dhc *DomainHealthChecker) performHealthChecks() {
	dhc.domainsMutex.RLock()
	domains := make([]*DomainConfig, 0, len(dhc.domains))
	for _, domain := range dhc.domains {
		domains = append(domains, domain)
	}
	dhc.domainsMutex.RUnlock()

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5) // 限制并发数

	for _, domain := range domains {
		// 检查是否需要进行健康检查
		if time.Since(domain.LastCheckTime) < time.Duration(domain.HealthCheckInterval)*time.Second {
			continue
		}

		wg.Add(1)
		go func(d *DomainConfig) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			result := dhc.checkDomainHealth(d)
			select {
			case dhc.resultChan <- result:
			default:
				dhc.logger.Printf("结果通道已满，丢弃域名 %s 的检查结果", d.DomainName)
			}
		}(domain)
	}

	wg.Wait()
}

// checkDomainHealth 检查单个域名的健康状态
func (dhc *DomainHealthChecker) checkDomainHealth(domain *DomainConfig) *HealthCheckResult {
	startTime := time.Now()
	result := &HealthCheckResult{
		DomainID:          domain.ID,
		DomainName:        domain.DomainName,
		CheckTime:         startTime,
		AdditionalMetrics: make(map[string]interface{}),
	}

	// 构建检查URL
	checkURL := domain.HealthCheckURL
	if checkURL == "" {
		checkURL = fmt.Sprintf("https://%s/health", domain.DomainName)
	}

	// 创建请求
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(domain.TimeoutSeconds)*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", checkURL, nil)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("创建请求失败: %v", err)
		return result
	}

	req.Header.Set("User-Agent", "CJPayment-HealthChecker/1.0")

	// DNS解析时间测量
	dnsStartTime := time.Now()

	// 执行请求
	resp, err := dhc.httpClient.Do(req)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("请求失败: %v", err)
		result.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
		return result
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode
	result.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
	result.DNSResolutionTimeMs = int(time.Since(dnsStartTime).Milliseconds())

	// 检查响应状态
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		result.IsSuccess = true
	}

	// 读取响应体大小
	if resp.ContentLength > 0 {
		result.ResponseSize = int(resp.ContentLength)
	}

	// SSL证书检查
	if domain.SSLCheck && resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
		cert := resp.TLS.PeerCertificates[0]
		result.SSLInfo = &SSLInfo{
			IsValid:      time.Now().Before(cert.NotAfter),
			ExpiryDate:   cert.NotAfter,
			DaysToExpiry: int(time.Until(cert.NotAfter).Hours() / 24),
			Issuer:       cert.Issuer.String(),
			Subject:      cert.Subject.String(),
		}
	}

	// 添加额外指标
	result.AdditionalMetrics["tls_version"] = resp.TLS.Version
	result.AdditionalMetrics["content_type"] = resp.Header.Get("Content-Type")
	result.AdditionalMetrics["server"] = resp.Header.Get("Server")

	return result
}

// processResults 处理健康检查结果
func (dhc *DomainHealthChecker) processResults(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-dhc.stopChan:
			return
		case result := <-dhc.resultChan:
			dhc.handleHealthCheckResult(result)
		}
	}
}

// handleHealthCheckResult 处理健康检查结果
func (dhc *DomainHealthChecker) handleHealthCheckResult(result *HealthCheckResult) {
	// 保存检查记录
	dhc.saveHealthCheckRecord(result)

	// 更新域名状态
	dhc.updateDomainStatus(result)
}

// saveHealthCheckRecord 保存健康检查记录
func (dhc *DomainHealthChecker) saveHealthCheckRecord(result *HealthCheckResult) {
	metricsJSON, _ := json.Marshal(result.AdditionalMetrics)

	query := `
		INSERT INTO health_check_records (
			target_type, target_id, target_name, check_time, response_time_ms,
			status_code, is_success, error_message, response_size,
			dns_resolution_time_ms, tcp_connection_time_ms, ssl_handshake_time_ms,
			additional_metrics
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := dhc.db.Exec(query,
		"domain", result.DomainID, result.DomainName, result.CheckTime,
		result.ResponseTimeMs, result.StatusCode, result.IsSuccess,
		result.ErrorMessage, result.ResponseSize, result.DNSResolutionTimeMs,
		result.TCPConnectionTimeMs, result.SSLHandshakeTimeMs, string(metricsJSON),
	)

	if err != nil {
		dhc.logger.Printf("保存健康检查记录失败: %v", err)
	}
}

// updateDomainStatus 更新域名状态
func (dhc *DomainHealthChecker) updateDomainStatus(result *HealthCheckResult) {
	dhc.domainsMutex.Lock()
	defer dhc.domainsMutex.Unlock()

	domain, exists := dhc.domains[result.DomainID]
	if !exists {
		return
	}

	oldStatus := domain.Status

	// 更新检查时间和响应时间
	domain.LastCheckTime = result.CheckTime
	domain.ResponseTimeMs = result.ResponseTimeMs

	if result.IsSuccess {
		domain.ConsecutiveSuccesses++
		domain.ConsecutiveFailures = 0

		if domain.LastSuccessTime == nil {
			domain.LastSuccessTime = &result.CheckTime
		} else {
			*domain.LastSuccessTime = result.CheckTime
		}

		// 如果连续成功次数达到阈值，标记为在线
		if domain.ConsecutiveSuccesses >= domain.SuccessThreshold {
			domain.Status = "online"
		}
	} else {
		domain.ConsecutiveFailures++
		domain.ConsecutiveSuccesses = 0

		// 如果连续失败次数达到阈值，标记为离线
		if domain.ConsecutiveFailures >= domain.FailureThreshold {
			domain.Status = "offline"

			// 触发故障转移
			if domain.DomainType == "primary" && dhc.onFailoverTrigger != nil {
				reason := fmt.Sprintf("主域名连续失败 %d 次", domain.ConsecutiveFailures)
				dhc.onFailoverTrigger(domain, reason)
			}
		}
	}

	// 更新SSL信息
	if result.SSLInfo != nil {
		domain.SSLExpiryDate = &result.SSLInfo.ExpiryDate
	}

	// 保存到数据库
	dhc.saveDomainStatus(domain)

	// 触发状态变化回调
	if oldStatus != domain.Status && dhc.onStatusChange != nil {
		dhc.onStatusChange(domain, oldStatus, domain.Status)
	}
}

// saveDomainStatus 保存域名状态到数据库
func (dhc *DomainHealthChecker) saveDomainStatus(domain *DomainConfig) {
	query := `
		UPDATE domain_config SET
			last_check_time = ?, last_success_time = ?, consecutive_failures = ?,
			consecutive_successes = ?, status = ?, ssl_expiry_date = ?,
			response_time_ms = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := dhc.db.Exec(query,
		domain.LastCheckTime, domain.LastSuccessTime, domain.ConsecutiveFailures,
		domain.ConsecutiveSuccesses, domain.Status, domain.SSLExpiryDate,
		domain.ResponseTimeMs, domain.ID,
	)

	if err != nil {
		dhc.logger.Printf("保存域名状态失败: %v", err)
	}
}

// reloadConfigPeriodically 定期重新加载配置
func (dhc *DomainHealthChecker) reloadConfigPeriodically(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute) // 每5分钟重新加载一次
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-dhc.stopChan:
			return
		case <-ticker.C:
			if err := dhc.LoadDomains(); err != nil {
				dhc.logger.Printf("重新加载域名配置失败: %v", err)
			}
		}
	}
}

// GetDomainStatus 获取域名状态
func (dhc *DomainHealthChecker) GetDomainStatus() map[int]*DomainConfig {
	dhc.domainsMutex.RLock()
	defer dhc.domainsMutex.RUnlock()

	result := make(map[int]*DomainConfig)
	for id, domain := range dhc.domains {
		// 创建副本避免并发访问问题
		domainCopy := *domain
		result[id] = &domainCopy
	}

	return result
}

// GetPrimaryDomain 获取当前可用的主域名
func (dhc *DomainHealthChecker) GetPrimaryDomain() *DomainConfig {
	dhc.domainsMutex.RLock()
	defer dhc.domainsMutex.RUnlock()

	// 首先查找状态为online的primary域名
	for _, domain := range dhc.domains {
		if domain.DomainType == "primary" && domain.Status == "online" {
			domainCopy := *domain
			return &domainCopy
		}
	}

	// 如果没有online的primary域名，查找最高优先级的backup域名
	var bestBackup *DomainConfig
	for _, domain := range dhc.domains {
		if domain.DomainType == "backup" && domain.Status == "online" {
			if bestBackup == nil || domain.Priority < bestBackup.Priority {
				bestBackup = domain
			}
		}
	}

	if bestBackup != nil {
		domainCopy := *bestBackup
		return &domainCopy
	}

	return nil
}

// TriggerImmediateCheck 立即触发指定域名的健康检查
func (dhc *DomainHealthChecker) TriggerImmediateCheck(domainID int) error {
	dhc.domainsMutex.RLock()
	domain, exists := dhc.domains[domainID]
	dhc.domainsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("域名 ID %d 不存在", domainID)
	}

	go func() {
		result := dhc.checkDomainHealth(domain)
		select {
		case dhc.resultChan <- result:
		default:
			dhc.logger.Printf("结果通道已满，丢弃域名 %s 的立即检查结果", domain.DomainName)
		}
	}()

	return nil
}

// GetHealthCheckHistory 获取健康检查历史记录
func (dhc *DomainHealthChecker) GetHealthCheckHistory(domainID int, limit int) ([]HealthCheckResult, error) {
	query := `
		SELECT target_id, target_name, check_time, response_time_ms, status_code,
		       is_success, error_message, response_size, dns_resolution_time_ms,
		       tcp_connection_time_ms, ssl_handshake_time_ms, additional_metrics
		FROM health_check_records
		WHERE target_type = 'domain' AND target_id = ?
		ORDER BY check_time DESC
		LIMIT ?
	`

	rows, err := dhc.db.Query(query, domainID, limit)
	if err != nil {
		return nil, fmt.Errorf("查询健康检查历史失败: %w", err)
	}
	defer rows.Close()

	var results []HealthCheckResult
	for rows.Next() {
		var result HealthCheckResult
		var metricsJSON string

		err := rows.Scan(
			&result.DomainID, &result.DomainName, &result.CheckTime,
			&result.ResponseTimeMs, &result.StatusCode, &result.IsSuccess,
			&result.ErrorMessage, &result.ResponseSize, &result.DNSResolutionTimeMs,
			&result.TCPConnectionTimeMs, &result.SSLHandshakeTimeMs, &metricsJSON,
		)
		if err != nil {
			continue
		}

		if metricsJSON != "" {
			json.Unmarshal([]byte(metricsJSON), &result.AdditionalMetrics)
		}

		results = append(results, result)
	}

	return results, nil
}