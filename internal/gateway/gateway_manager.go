package gateway

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// PaymentGatewayConfig 支付网关配置结构体
type PaymentGatewayConfig struct {
	ID                    int                    `json:"id" db:"id"`
	GatewayName          string                 `json:"gateway_name" db:"gateway_name"`
	GatewayCode          string                 `json:"gateway_code" db:"gateway_code"`
	GatewayURL           string                 `json:"gateway_url" db:"gateway_url"`
	GatewayType          string                 `json:"gateway_type" db:"gateway_type"`
	IsActive             bool                   `json:"is_active" db:"is_active"`
	Priority             int                    `json:"priority" db:"priority"`
	Weight               int                    `json:"weight" db:"weight"`
	TimeoutSeconds       int                    `json:"timeout_seconds" db:"timeout_seconds"`
	RetryCount           int                    `json:"retry_count" db:"retry_count"`
	HealthCheckInterval  int                    `json:"health_check_interval" db:"health_check_interval"`
	FailureThreshold     int                    `json:"failure_threshold" db:"failure_threshold"`
	SuccessThreshold     int                    `json:"success_threshold" db:"success_threshold"`
	APIKey               string                 `json:"api_key,omitempty" db:"api_key"`
	APISecret            string                 `json:"api_secret,omitempty" db:"api_secret"`
	MerchantID           string                 `json:"merchant_id,omitempty" db:"merchant_id"`
	AppID                string                 `json:"app_id,omitempty" db:"app_id"`
	SupportedCurrencies  []string               `json:"supported_currencies" db:"supported_currencies"`
	MinAmount            float64                `json:"min_amount" db:"min_amount"`
	MaxAmount            float64                `json:"max_amount" db:"max_amount"`
	FeeRate              float64                `json:"fee_rate" db:"fee_rate"`
	LastCheckTime        time.Time              `json:"last_check_time" db:"last_check_time"`
	LastSuccessTime      *time.Time             `json:"last_success_time" db:"last_success_time"`
	ConsecutiveFailures  int                    `json:"consecutive_failures" db:"consecutive_failures"`
	ConsecutiveSuccesses int                    `json:"consecutive_successes" db:"consecutive_successes"`
	Status               string                 `json:"status" db:"status"`
	ResponseTimeMs       int                    `json:"response_time_ms" db:"response_time_ms"`
	SuccessRate          float64                `json:"success_rate" db:"success_rate"`
	TotalRequests        int                    `json:"total_requests" db:"total_requests"`
	SuccessfulRequests   int                    `json:"successful_requests" db:"successful_requests"`
	FailedRequests       int                    `json:"failed_requests" db:"failed_requests"`
	LastErrorMessage     string                 `json:"last_error_message,omitempty" db:"last_error_message"`
	Description          string                 `json:"description" db:"description"`
	CreatedAt            time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time              `json:"updated_at" db:"updated_at"`
}

// PaymentRequest 支付请求结构体
type PaymentRequest struct {
	OrderID      string  `json:"order_id"`
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	Description  string  `json:"description"`
	CallbackURL  string  `json:"callback_url"`
	ReturnURL    string  `json:"return_url"`
	UserID       string  `json:"user_id,omitempty"`
	ExtendedData map[string]interface{} `json:"extended_data,omitempty"`
}

// PaymentResponse 支付响应结构体
type PaymentResponse struct {
	Success       bool                   `json:"success"`
	PaymentID     string                 `json:"payment_id,omitempty"`
	PaymentURL    string                 `json:"payment_url,omitempty"`
	QRCode        string                 `json:"qr_code,omitempty"`
	ErrorCode     string                 `json:"error_code,omitempty"`
	ErrorMessage  string                 `json:"error_message,omitempty"`
	GatewayCode   string                 `json:"gateway_code"`
	GatewayName   string                 `json:"gateway_name"`
	ResponseTime  time.Duration          `json:"response_time"`
	ExtendedData  map[string]interface{} `json:"extended_data,omitempty"`
}

// GatewayHealthResult 网关健康检查结果
type GatewayHealthResult struct {
	GatewayID        int           `json:"gateway_id"`
	GatewayCode      string        `json:"gateway_code"`
	IsSuccess        bool          `json:"is_success"`
	ResponseTimeMs   int           `json:"response_time_ms"`
	StatusCode       int           `json:"status_code"`
	ErrorMessage     string        `json:"error_message,omitempty"`
	CheckTime        time.Time     `json:"check_time"`
	AdditionalMetrics map[string]interface{} `json:"additional_metrics,omitempty"`
}

// LoadBalanceStrategy 负载均衡策略
type LoadBalanceStrategy string

const (
	RoundRobin     LoadBalanceStrategy = "round_robin"
	WeightedRandom LoadBalanceStrategy = "weighted_random"
	LeastConnections LoadBalanceStrategy = "least_connections"
	ResponseTime   LoadBalanceStrategy = "response_time"
)

// PaymentGatewayManager 支付网关管理器
type PaymentGatewayManager struct {
	db                   *sql.DB
	httpClient           *http.Client
	gateways             map[int]*PaymentGatewayConfig
	gatewaysMutex        sync.RWMutex
	strategy             LoadBalanceStrategy
	roundRobinIndex      int
	roundRobinMutex      sync.Mutex
	isRunning            bool
	stopChan             chan struct{}
	resultChan           chan *GatewayHealthResult
	onStatusChange       func(gateway *PaymentGatewayConfig, oldStatus, newStatus string)
	onFailoverTrigger    func(gateway *PaymentGatewayConfig, reason string)
	activeConnections    map[int]int
	connectionsMutex     sync.RWMutex
	logger               *log.Logger
}

// NewPaymentGatewayManager 创建新的支付网关管理器
func NewPaymentGatewayManager(db *sql.DB, logger *log.Logger) *PaymentGatewayManager {
	return &PaymentGatewayManager{
		db: db,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		gateways:          make(map[int]*PaymentGatewayConfig),
		strategy:          WeightedRandom,
		stopChan:          make(chan struct{}),
		resultChan:        make(chan *GatewayHealthResult, 100),
		activeConnections: make(map[int]int),
		logger:            logger,
	}
}

// SetLoadBalanceStrategy 设置负载均衡策略
func (pgm *PaymentGatewayManager) SetLoadBalanceStrategy(strategy LoadBalanceStrategy) {
	pgm.strategy = strategy
}

// SetStatusChangeCallback 设置状态变化回调
func (pgm *PaymentGatewayManager) SetStatusChangeCallback(callback func(gateway *PaymentGatewayConfig, oldStatus, newStatus string)) {
	pgm.onStatusChange = callback
}

// SetFailoverTriggerCallback 设置故障转移触发回调
func (pgm *PaymentGatewayManager) SetFailoverTriggerCallback(callback func(gateway *PaymentGatewayConfig, reason string)) {
	pgm.onFailoverTrigger = callback
}

// LoadGateways 从数据库加载网关配置
func (pgm *PaymentGatewayManager) LoadGateways() error {
	query := `
		SELECT id, gateway_name, gateway_code, gateway_url, gateway_type, is_active,
		       priority, weight, timeout_seconds, retry_count, health_check_interval,
		       failure_threshold, success_threshold, api_key, api_secret, merchant_id,
		       app_id, supported_currencies, min_amount, max_amount, fee_rate,
		       last_check_time, last_success_time, consecutive_failures, consecutive_successes,
		       status, response_time_ms, success_rate, total_requests,
		       successful_requests, failed_requests, last_error_message,
		       description, created_at, updated_at
		FROM payment_gateway_config
		WHERE is_active = true
		ORDER BY priority ASC
	`

	rows, err := pgm.db.Query(query)
	if err != nil {
		return fmt.Errorf("查询支付网关配置失败: %w", err)
	}
	defer rows.Close()

	pgm.gatewaysMutex.Lock()
	defer pgm.gatewaysMutex.Unlock()

	pgm.gateways = make(map[int]*PaymentGatewayConfig)

	for rows.Next() {
		gateway := &PaymentGatewayConfig{}
		var currenciesJSON string

		err := rows.Scan(
			&gateway.ID, &gateway.GatewayName, &gateway.GatewayCode, &gateway.GatewayURL,
			&gateway.GatewayType, &gateway.IsActive, &gateway.Priority, &gateway.Weight,
			&gateway.TimeoutSeconds, &gateway.RetryCount, &gateway.HealthCheckInterval,
			&gateway.FailureThreshold, &gateway.SuccessThreshold, &gateway.APIKey,
			&gateway.APISecret, &gateway.MerchantID, &gateway.AppID, &currenciesJSON,
			&gateway.MinAmount, &gateway.MaxAmount, &gateway.FeeRate, &gateway.LastCheckTime,
			&gateway.LastSuccessTime, &gateway.ConsecutiveFailures, &gateway.ConsecutiveSuccesses,
			&gateway.Status, &gateway.ResponseTimeMs, &gateway.SuccessRate,
			&gateway.TotalRequests, &gateway.SuccessfulRequests, &gateway.FailedRequests,
			&gateway.LastErrorMessage, &gateway.Description, &gateway.CreatedAt, &gateway.UpdatedAt,
		)
		if err != nil {
			pgm.logger.Printf("扫描支付网关配置失败: %v", err)
			continue
		}

		// 解析支持的货币
		if currenciesJSON != "" {
			json.Unmarshal([]byte(currenciesJSON), &gateway.SupportedCurrencies)
		}

		pgm.gateways[gateway.ID] = gateway
	}

	pgm.logger.Printf("已加载 %d 个支付网关配置", len(pgm.gateways))
	return nil
}

// Start 启动网关管理器
func (pgm *PaymentGatewayManager) Start(ctx context.Context) error {
	if pgm.isRunning {
		return fmt.Errorf("支付网关管理器已在运行")
	}

	pgm.isRunning = true
	pgm.logger.Println("启动支付网关管理器...")

	// 加载网关配置
	if err := pgm.LoadGateways(); err != nil {
		return fmt.Errorf("加载支付网关配置失败: %w", err)
	}

	// 启动结果处理协程
	go pgm.processHealthResults(ctx)

	// 启动健康检查协程
	go pgm.runHealthChecks(ctx)

	// 启动定期重新加载配置协程
	go pgm.reloadConfigPeriodically(ctx)

	return nil
}

// Stop 停止网关管理器
func (pgm *PaymentGatewayManager) Stop() {
	if !pgm.isRunning {
		return
	}

	pgm.logger.Println("停止支付网关管理器...")
	pgm.isRunning = false
	close(pgm.stopChan)
}

// ProcessPayment 处理支付请求
func (pgm *PaymentGatewayManager) ProcessPayment(req *PaymentRequest) (*PaymentResponse, error) {
	// 选择最佳网关
	gateway := pgm.selectBestGateway(req)
	if gateway == nil {
		return nil, fmt.Errorf("没有可用的支付网关")
	}

	// 增加活跃连接计数
	pgm.incrementActiveConnections(gateway.ID)
	defer pgm.decrementActiveConnections(gateway.ID)

	// 执行支付请求
	response, err := pgm.executePayment(gateway, req)
	if err != nil {
		// 记录失败并尝试故障转移
		pgm.recordPaymentResult(gateway, false, err.Error())

		// 如果是主网关失败，尝试备用网关
		if gateway.GatewayType == "primary" {
			pgm.logger.Printf("主网关 %s 失败，尝试备用网关: %v", gateway.GatewayName, err)

			backupGateway := pgm.selectBackupGateway(req)
			if backupGateway != nil {
				pgm.incrementActiveConnections(backupGateway.ID)
				defer pgm.decrementActiveConnections(backupGateway.ID)

				response, err = pgm.executePayment(backupGateway, req)
				if err == nil {
					pgm.recordPaymentResult(backupGateway, true, "")
				} else {
					pgm.recordPaymentResult(backupGateway, false, err.Error())
				}
			}
		}

		if err != nil {
			return nil, fmt.Errorf("支付处理失败: %w", err)
		}
	} else {
		pgm.recordPaymentResult(gateway, true, "")
	}

	return response, nil
}

// selectBestGateway 选择最佳网关
func (pgm *PaymentGatewayManager) selectBestGateway(req *PaymentRequest) *PaymentGatewayConfig {
	pgm.gatewaysMutex.RLock()
	defer pgm.gatewaysMutex.RUnlock()

	// 过滤可用网关
	availableGateways := make([]*PaymentGatewayConfig, 0)
	for _, gateway := range pgm.gateways {
		if gateway.Status == "online" && pgm.supportsPayment(gateway, req) {
			availableGateways = append(availableGateways, gateway)
		}
	}

	if len(availableGateways) == 0 {
		return nil
	}

	// 根据策略选择网关
	switch pgm.strategy {
	case RoundRobin:
		return pgm.selectRoundRobin(availableGateways)
	case WeightedRandom:
		return pgm.selectWeightedRandom(availableGateways)
	case LeastConnections:
		return pgm.selectLeastConnections(availableGateways)
	case ResponseTime:
		return pgm.selectByResponseTime(availableGateways)
	default:
		return pgm.selectWeightedRandom(availableGateways)
	}
}

// selectBackupGateway 选择备用网关
func (pgm *PaymentGatewayManager) selectBackupGateway(req *PaymentRequest) *PaymentGatewayConfig {
	pgm.gatewaysMutex.RLock()
	defer pgm.gatewaysMutex.RUnlock()

	var bestBackup *PaymentGatewayConfig
	for _, gateway := range pgm.gateways {
		if gateway.GatewayType == "backup" && gateway.Status == "online" &&
		   pgm.supportsPayment(gateway, req) {
			if bestBackup == nil || gateway.Priority < bestBackup.Priority {
				bestBackup = gateway
			}
		}
	}

	return bestBackup
}

// supportsPayment 检查网关是否支持该支付请求
func (pgm *PaymentGatewayManager) supportsPayment(gateway *PaymentGatewayConfig, req *PaymentRequest) bool {
	// 检查金额范围
	if req.Amount < gateway.MinAmount || req.Amount > gateway.MaxAmount {
		return false
	}

	// 检查货币支持
	if len(gateway.SupportedCurrencies) > 0 {
		supported := false
		for _, currency := range gateway.SupportedCurrencies {
			if currency == req.Currency {
				supported = true
				break
			}
		}
		if !supported {
			return false
		}
	}

	return true
}

// selectRoundRobin 轮询选择
func (pgm *PaymentGatewayManager) selectRoundRobin(gateways []*PaymentGatewayConfig) *PaymentGatewayConfig {
	if len(gateways) == 0 {
		return nil
	}

	pgm.roundRobinMutex.Lock()
	defer pgm.roundRobinMutex.Unlock()

	gateway := gateways[pgm.roundRobinIndex%len(gateways)]
	pgm.roundRobinIndex++
	return gateway
}

// selectWeightedRandom 加权随机选择
func (pgm *PaymentGatewayManager) selectWeightedRandom(gateways []*PaymentGatewayConfig) *PaymentGatewayConfig {
	if len(gateways) == 0 {
		return nil
	}

	totalWeight := 0
	for _, gateway := range gateways {
		totalWeight += gateway.Weight
	}

	if totalWeight == 0 {
		return gateways[rand.Intn(len(gateways))]
	}

	randomWeight := rand.Intn(totalWeight)
	currentWeight := 0

	for _, gateway := range gateways {
		currentWeight += gateway.Weight
		if currentWeight > randomWeight {
			return gateway
		}
	}

	return gateways[0]
}

// selectLeastConnections 最少连接选择
func (pgm *PaymentGatewayManager) selectLeastConnections(gateways []*PaymentGatewayConfig) *PaymentGatewayConfig {
	if len(gateways) == 0 {
		return nil
	}

	pgm.connectionsMutex.RLock()
	defer pgm.connectionsMutex.RUnlock()

	var bestGateway *PaymentGatewayConfig
	minConnections := int(^uint(0) >> 1) // 最大int值

	for _, gateway := range gateways {
		connections := pgm.activeConnections[gateway.ID]
		if connections < minConnections {
			minConnections = connections
			bestGateway = gateway
		}
	}

	return bestGateway
}

// selectByResponseTime 按响应时间选择
func (pgm *PaymentGatewayManager) selectByResponseTime(gateways []*PaymentGatewayConfig) *PaymentGatewayConfig {
	if len(gateways) == 0 {
		return nil
	}

	sort.Slice(gateways, func(i, j int) bool {
		return gateways[i].ResponseTimeMs < gateways[j].ResponseTimeMs
	})

	return gateways[0]
}

// executePayment 执行支付请求
func (pgm *PaymentGatewayManager) executePayment(gateway *PaymentGatewayConfig, req *PaymentRequest) (*PaymentResponse, error) {
	startTime := time.Now()

	// 构建支付请求
	paymentData, err := pgm.buildPaymentRequest(gateway, req)
	if err != nil {
		return nil, fmt.Errorf("构建支付请求失败: %w", err)
	}

	// 创建HTTP请求
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(gateway.TimeoutSeconds)*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(ctx, "POST", gateway.GatewayURL, strings.NewReader(paymentData))
	if err != nil {
		return nil, fmt.Errorf("创建HTTP请求失败: %w", err)
	}

	// 设置请求头
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "CJPayment-Gateway/1.0")

	// 添加认证信息
	if gateway.APIKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+gateway.APIKey)
	}

	// 执行请求
	var response *PaymentResponse
	var lastErr error

	for attempt := 0; attempt <= gateway.RetryCount; attempt++ {
		resp, err := pgm.httpClient.Do(httpReq)
		if err != nil {
			lastErr = err
			if attempt < gateway.RetryCount {
				time.Sleep(time.Duration(attempt+1) * time.Second)
				continue
			}
			break
		}

		defer resp.Body.Close()

		responseTime := time.Since(startTime)
		response, err = pgm.parsePaymentResponse(gateway, resp, responseTime)
		if err != nil {
			lastErr = err
			if attempt < gateway.RetryCount {
				time.Sleep(time.Duration(attempt+1) * time.Second)
				continue
			}
			break
		}

		// 成功
		lastErr = nil
		break
	}

	if lastErr != nil {
		return nil, lastErr
	}

	return response, nil
}

// buildPaymentRequest 构建支付请求
func (pgm *PaymentGatewayManager) buildPaymentRequest(gateway *PaymentGatewayConfig, req *PaymentRequest) (string, error) {
	requestData := map[string]interface{}{
		"merchant_id": gateway.MerchantID,
		"app_id":      gateway.AppID,
		"order_id":    req.OrderID,
		"amount":      req.Amount,
		"currency":    req.Currency,
		"description": req.Description,
		"callback_url": req.CallbackURL,
		"return_url":  req.ReturnURL,
		"timestamp":   time.Now().Unix(),
	}

	if req.UserID != "" {
		requestData["user_id"] = req.UserID
	}

	if req.ExtendedData != nil {
		for k, v := range req.ExtendedData {
			requestData[k] = v
		}
	}

	// 生成签名
	if gateway.APISecret != "" {
		signature := pgm.generateSignature(requestData, gateway.APISecret)
		requestData["signature"] = signature
	}

	jsonData, err := json.Marshal(requestData)
	if err != nil {
		return "", fmt.Errorf("序列化支付请求失败: %w", err)
	}

	return string(jsonData), nil
}

// generateSignature 生成签名
func (pgm *PaymentGatewayManager) generateSignature(data map[string]interface{}, secret string) string {
	// 对参数进行排序
	keys := make([]string, 0, len(data))
	for k := range data {
		if k != "signature" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	// 构建签名字符串
	var parts []string
	for _, k := range keys {
		if v := data[k]; v != nil {
			parts = append(parts, fmt.Sprintf("%s=%v", k, v))
		}
	}

	signString := strings.Join(parts, "&") + "&key=" + secret

	// 计算HMAC-SHA256
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(signString))

	return hex.EncodeToString(h.Sum(nil))
}

// parsePaymentResponse 解析支付响应
func (pgm *PaymentGatewayManager) parsePaymentResponse(gateway *PaymentGatewayConfig, resp *http.Response, responseTime time.Duration) (*PaymentResponse, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应体失败: %w", err)
	}

	var responseData map[string]interface{}
	if err := json.Unmarshal(body, &responseData); err != nil {
		return nil, fmt.Errorf("解析响应JSON失败: %w", err)
	}

	response := &PaymentResponse{
		GatewayCode:  gateway.GatewayCode,
		GatewayName:  gateway.GatewayName,
		ResponseTime: responseTime,
		ExtendedData: make(map[string]interface{}),
	}

	// 解析标准字段
	if success, ok := responseData["success"].(bool); ok {
		response.Success = success
	}

	if paymentID, ok := responseData["payment_id"].(string); ok {
		response.PaymentID = paymentID
	}

	if paymentURL, ok := responseData["payment_url"].(string); ok {
		response.PaymentURL = paymentURL
	}

	if qrCode, ok := responseData["qr_code"].(string); ok {
		response.QRCode = qrCode
	}

	if errorCode, ok := responseData["error_code"].(string); ok {
		response.ErrorCode = errorCode
	}

	if errorMessage, ok := responseData["error_message"].(string); ok {
		response.ErrorMessage = errorMessage
	}

	// 复制扩展数据
	for k, v := range responseData {
		switch k {
		case "success", "payment_id", "payment_url", "qr_code", "error_code", "error_message":
			// 跳过标准字段
		default:
			response.ExtendedData[k] = v
		}
	}

	return response, nil
}

// recordPaymentResult 记录支付结果
func (pgm *PaymentGatewayManager) recordPaymentResult(gateway *PaymentGatewayConfig, success bool, errorMessage string) {
	pgm.gatewaysMutex.Lock()
	defer pgm.gatewaysMutex.Unlock()

	gateway.TotalRequests++
	if success {
		gateway.SuccessfulRequests++
	} else {
		gateway.FailedRequests++
		gateway.LastErrorMessage = errorMessage
	}

	// 计算成功率
	if gateway.TotalRequests > 0 {
		gateway.SuccessRate = float64(gateway.SuccessfulRequests) / float64(gateway.TotalRequests) * 100
	}

	// 保存到数据库
	pgm.saveGatewayStats(gateway)
}

// incrementActiveConnections 增加活跃连接
func (pgm *PaymentGatewayManager) incrementActiveConnections(gatewayID int) {
	pgm.connectionsMutex.Lock()
	defer pgm.connectionsMutex.Unlock()
	pgm.activeConnections[gatewayID]++
}

// decrementActiveConnections 减少活跃连接
func (pgm *PaymentGatewayManager) decrementActiveConnections(gatewayID int) {
	pgm.connectionsMutex.Lock()
	defer pgm.connectionsMutex.Unlock()
	if pgm.activeConnections[gatewayID] > 0 {
		pgm.activeConnections[gatewayID]--
	}
}

// runHealthChecks 运行健康检查
func (pgm *PaymentGatewayManager) runHealthChecks(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second) // 每30秒检查一次
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-pgm.stopChan:
			return
		case <-ticker.C:
			pgm.performHealthChecks()
		}
	}
}

// performHealthChecks 执行健康检查
func (pgm *PaymentGatewayManager) performHealthChecks() {
	pgm.gatewaysMutex.RLock()
	gateways := make([]*PaymentGatewayConfig, 0, len(pgm.gateways))
	for _, gateway := range pgm.gateways {
		gateways = append(gateways, gateway)
	}
	pgm.gatewaysMutex.RUnlock()

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 3) // 限制并发数

	for _, gateway := range gateways {
		// 检查是否需要进行健康检查
		if time.Since(gateway.LastCheckTime) < time.Duration(gateway.HealthCheckInterval)*time.Second {
			continue
		}

		wg.Add(1)
		go func(g *PaymentGatewayConfig) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			result := pgm.checkGatewayHealth(g)
			select {
			case pgm.resultChan <- result:
			default:
				pgm.logger.Printf("结果通道已满，丢弃网关 %s 的检查结果", g.GatewayName)
			}
		}(gateway)
	}

	wg.Wait()
}

// checkGatewayHealth 检查单个网关的健康状态
func (pgm *PaymentGatewayManager) checkGatewayHealth(gateway *PaymentGatewayConfig) *GatewayHealthResult {
	startTime := time.Now()
	result := &GatewayHealthResult{
		GatewayID:         gateway.ID,
		GatewayCode:       gateway.GatewayCode,
		CheckTime:         startTime,
		AdditionalMetrics: make(map[string]interface{}),
	}

	// 构建健康检查请求
	healthURL := gateway.GatewayURL + "/health"
	if strings.Contains(gateway.GatewayURL, "/health") {
		healthURL = gateway.GatewayURL
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(gateway.TimeoutSeconds)*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("创建健康检查请求失败: %v", err)
		return result
	}

	req.Header.Set("User-Agent", "CJPayment-HealthChecker/1.0")

	// 执行请求
	resp, err := pgm.httpClient.Do(req)
	if err != nil {
		result.ErrorMessage = fmt.Sprintf("健康检查请求失败: %v", err)
		result.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
		return result
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode
	result.ResponseTimeMs = int(time.Since(startTime).Milliseconds())

	// 检查响应状态
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		result.IsSuccess = true
	}

	// 添加额外指标
	result.AdditionalMetrics["content_type"] = resp.Header.Get("Content-Type")
	result.AdditionalMetrics["server"] = resp.Header.Get("Server")

	return result
}

// processHealthResults 处理健康检查结果
func (pgm *PaymentGatewayManager) processHealthResults(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-pgm.stopChan:
			return
		case result := <-pgm.resultChan:
			pgm.handleHealthCheckResult(result)
		}
	}
}

// handleHealthCheckResult 处理健康检查结果
func (pgm *PaymentGatewayManager) handleHealthCheckResult(result *GatewayHealthResult) {
	// 保存检查记录
	pgm.saveHealthCheckRecord(result)

	// 更新网关状态
	pgm.updateGatewayStatus(result)
}

// saveHealthCheckRecord 保存健康检查记录
func (pgm *PaymentGatewayManager) saveHealthCheckRecord(result *GatewayHealthResult) {
	metricsJSON, _ := json.Marshal(result.AdditionalMetrics)

	query := `
		INSERT INTO health_check_records (
			target_type, target_id, target_name, check_time, response_time_ms,
			status_code, is_success, error_message, additional_metrics
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := pgm.db.Exec(query,
		"gateway", result.GatewayID, result.GatewayCode, result.CheckTime,
		result.ResponseTimeMs, result.StatusCode, result.IsSuccess,
		result.ErrorMessage, string(metricsJSON),
	)

	if err != nil {
		pgm.logger.Printf("保存网关健康检查记录失败: %v", err)
	}
}

// updateGatewayStatus 更新网关状态
func (pgm *PaymentGatewayManager) updateGatewayStatus(result *GatewayHealthResult) {
	pgm.gatewaysMutex.Lock()
	defer pgm.gatewaysMutex.Unlock()

	gateway, exists := pgm.gateways[result.GatewayID]
	if !exists {
		return
	}

	oldStatus := gateway.Status

	// 更新检查时间和响应时间
	gateway.LastCheckTime = result.CheckTime
	gateway.ResponseTimeMs = result.ResponseTimeMs

	if result.IsSuccess {
		gateway.ConsecutiveSuccesses++
		gateway.ConsecutiveFailures = 0

		if gateway.LastSuccessTime == nil {
			gateway.LastSuccessTime = &result.CheckTime
		} else {
			*gateway.LastSuccessTime = result.CheckTime
		}

		// 如果连续成功次数达到阈值，标记为在线
		if gateway.ConsecutiveSuccesses >= gateway.SuccessThreshold {
			gateway.Status = "online"
		}
	} else {
		gateway.ConsecutiveFailures++
		gateway.ConsecutiveSuccesses = 0
		gateway.LastErrorMessage = result.ErrorMessage

		// 如果连续失败次数达到阈值，标记为离线
		if gateway.ConsecutiveFailures >= gateway.FailureThreshold {
			gateway.Status = "offline"

			// 触发故障转移
			if gateway.GatewayType == "primary" && pgm.onFailoverTrigger != nil {
				reason := fmt.Sprintf("主网关连续失败 %d 次", gateway.ConsecutiveFailures)
				pgm.onFailoverTrigger(gateway, reason)
			}
		}
	}

	// 保存到数据库
	pgm.saveGatewayStatus(gateway)

	// 触发状态变化回调
	if oldStatus != gateway.Status && pgm.onStatusChange != nil {
		pgm.onStatusChange(gateway, oldStatus, gateway.Status)
	}
}

// saveGatewayStatus 保存网关状态到数据库
func (pgm *PaymentGatewayManager) saveGatewayStatus(gateway *PaymentGatewayConfig) {
	query := `
		UPDATE payment_gateway_config SET
			last_check_time = ?, last_success_time = ?, consecutive_failures = ?,
			consecutive_successes = ?, status = ?, response_time_ms = ?,
			last_error_message = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := pgm.db.Exec(query,
		gateway.LastCheckTime, gateway.LastSuccessTime, gateway.ConsecutiveFailures,
		gateway.ConsecutiveSuccesses, gateway.Status, gateway.ResponseTimeMs,
		gateway.LastErrorMessage, gateway.ID,
	)

	if err != nil {
		pgm.logger.Printf("保存网关状态失败: %v", err)
	}
}

// saveGatewayStats 保存网关统计信息到数据库
func (pgm *PaymentGatewayManager) saveGatewayStats(gateway *PaymentGatewayConfig) {
	query := `
		UPDATE payment_gateway_config SET
			success_rate = ?, total_requests = ?, successful_requests = ?,
			failed_requests = ?, last_error_message = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err := pgm.db.Exec(query,
		gateway.SuccessRate, gateway.TotalRequests, gateway.SuccessfulRequests,
		gateway.FailedRequests, gateway.LastErrorMessage, gateway.ID,
	)

	if err != nil {
		pgm.logger.Printf("保存网关统计信息失败: %v", err)
	}
}

// reloadConfigPeriodically 定期重新加载配置
func (pgm *PaymentGatewayManager) reloadConfigPeriodically(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute) // 每5分钟重新加载一次
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-pgm.stopChan:
			return
		case <-ticker.C:
			if err := pgm.LoadGateways(); err != nil {
				pgm.logger.Printf("重新加载网关配置失败: %v", err)
			}
		}
	}
}

// GetGatewayStatus 获取网关状态
func (pgm *PaymentGatewayManager) GetGatewayStatus() map[int]*PaymentGatewayConfig {
	pgm.gatewaysMutex.RLock()
	defer pgm.gatewaysMutex.RUnlock()

	result := make(map[int]*PaymentGatewayConfig)
	for id, gateway := range pgm.gateways {
		// 创建副本避免并发访问问题
		gatewayCopy := *gateway
		result[id] = &gatewayCopy
	}

	return result
}

// GetActiveConnections 获取活跃连接数
func (pgm *PaymentGatewayManager) GetActiveConnections() map[int]int {
	pgm.connectionsMutex.RLock()
	defer pgm.connectionsMutex.RUnlock()

	result := make(map[int]int)
	for id, count := range pgm.activeConnections {
		result[id] = count
	}

	return result
}