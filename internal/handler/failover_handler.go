package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// FailoverHandler 故障转移处理器
type FailoverHandler struct {
	domainChecker    *DomainHealthChecker
	gatewayManager   *PaymentGatewayManager
	failoverController *FailoverController
	upgrader         websocket.Upgrader
	wsConnections    map[string]*websocket.Conn
}

// NewFailoverHandler 创建故障转移处理器
func NewFailoverHandler(
	domainChecker *DomainHealthChecker,
	gatewayManager *PaymentGatewayManager,
	failoverController *FailoverController,
) *FailoverHandler {
	return &FailoverHandler{
		domainChecker:      domainChecker,
		gatewayManager:     gatewayManager,
		failoverController: failoverController,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 在生产环境中应该添加适当的检查
			},
		},
		wsConnections: make(map[string]*websocket.Conn),
	}
}

// WebSocket相关结构
type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type StatusUpdate struct {
	Timestamp string      `json:"timestamp"`
	Type      string      `json:"type"` // "domain" or "gateway"
	Status    interface{} `json:"status"`
}

// 域名管理相关API

// GetDomains 获取所有域名配置
func (h *FailoverHandler) GetDomains(c *gin.Context) {
	domains, err := h.domainChecker.GetAllDomains()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, domains)
}

// AddDomain 添加域名配置
func (h *FailoverHandler) AddDomain(c *gin.Context) {
	var domain DomainConfig
	if err := c.ShouldBindJSON(&domain); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置创建时间
	domain.CreatedAt = time.Now()
	domain.UpdatedAt = time.Now()

	if err := h.domainChecker.AddDomain(&domain); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播更新
	h.broadcastStatusUpdate("domain", domain)

	c.JSON(http.StatusCreated, domain)
}

// UpdateDomain 更新域名配置
func (h *FailoverHandler) UpdateDomain(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	var domain DomainConfig
	if err := c.ShouldBindJSON(&domain); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	domain.ID = id
	domain.UpdatedAt = time.Now()

	if err := h.domainChecker.UpdateDomain(&domain); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播更新
	h.broadcastStatusUpdate("domain", domain)

	c.JSON(http.StatusOK, domain)
}

// DeleteDomain 删除域名配置
func (h *FailoverHandler) DeleteDomain(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	if err := h.domainChecker.DeleteDomain(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播删除事件
	h.broadcastStatusUpdate("domain_deleted", gin.H{"id": id})

	c.JSON(http.StatusOK, gin.H{"message": "Domain deleted successfully"})
}

// CheckDomain 手动检查域名健康状态
func (h *FailoverHandler) CheckDomain(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	result, err := h.domainChecker.CheckSingleDomain(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播检查结果
	h.broadcastStatusUpdate("domain_check", result)

	c.JSON(http.StatusOK, result)
}

// GetDomainLogs 获取域名检查日志
func (h *FailoverHandler) GetDomainLogs(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid domain ID"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.domainChecker.GetDomainLogs(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// 支付网关管理相关API

// GetGateways 获取所有支付网关配置
func (h *FailoverHandler) GetGateways(c *gin.Context) {
	gateways, err := h.gatewayManager.GetAllGateways()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gateways)
}

// AddGateway 添加支付网关配置
func (h *FailoverHandler) AddGateway(c *gin.Context) {
	var gateway PaymentGatewayConfig
	if err := c.ShouldBindJSON(&gateway); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置创建时间
	gateway.CreatedAt = time.Now()
	gateway.UpdatedAt = time.Now()

	if err := h.gatewayManager.AddGateway(&gateway); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播更新
	h.broadcastStatusUpdate("gateway", gateway)

	c.JSON(http.StatusCreated, gateway)
}

// UpdateGateway 更新支付网关配置
func (h *FailoverHandler) UpdateGateway(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway ID"})
		return
	}

	var gateway PaymentGatewayConfig
	if err := c.ShouldBindJSON(&gateway); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	gateway.ID = id
	gateway.UpdatedAt = time.Now()

	if err := h.gatewayManager.UpdateGateway(&gateway); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播更新
	h.broadcastStatusUpdate("gateway", gateway)

	c.JSON(http.StatusOK, gateway)
}

// DeleteGateway 删除支付网关配置
func (h *FailoverHandler) DeleteGateway(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway ID"})
		return
	}

	if err := h.gatewayManager.DeleteGateway(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播删除事件
	h.broadcastStatusUpdate("gateway_deleted", gin.H{"id": id})

	c.JSON(http.StatusOK, gin.H{"message": "Gateway deleted successfully"})
}

// CheckGateway 手动检查支付网关健康状态
func (h *FailoverHandler) CheckGateway(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway ID"})
		return
	}

	result, err := h.gatewayManager.CheckSingleGateway(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播检查结果
	h.broadcastStatusUpdate("gateway_check", result)

	c.JSON(http.StatusOK, result)
}

// TestGateway 测试支付网关
func (h *FailoverHandler) TestGateway(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway ID"})
		return
	}

	result, err := h.gatewayManager.TestGateway(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播测试结果
	h.broadcastStatusUpdate("gateway_test", result)

	c.JSON(http.StatusOK, result)
}

// GetGatewayLogs 获取支付网关日志
func (h *FailoverHandler) GetGatewayLogs(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid gateway ID"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.gatewayManager.GetGatewayLogs(id, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// 故障转移配置相关API

// GetFailoverConfig 获取故障转移配置
func (h *FailoverHandler) GetFailoverConfig(c *gin.Context) {
	config, err := h.failoverController.GetConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

// UpdateFailoverConfig 更新故障转移配置
func (h *FailoverHandler) UpdateFailoverConfig(c *gin.Context) {
	var config FailoverConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.failoverController.UpdateConfig(&config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 广播配置更新
	h.broadcastStatusUpdate("failover_config", config)

	c.JSON(http.StatusOK, config)
}

// GetFailoverLogs 获取故障转移日志
func (h *FailoverHandler) GetFailoverLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)

	logs, err := h.failoverController.GetLogs(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// WebSocket相关方法

// HandleWebSocket 处理WebSocket连接
func (h *FailoverHandler) HandleWebSocket(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// 生成连接ID
	connID := fmt.Sprintf("%d", time.Now().UnixNano())
	h.wsConnections[connID] = conn

	// 发送初始状态
	h.sendInitialStatus(conn)

	// 处理连接
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		defer func() {
			delete(h.wsConnections, connID)
			cancel()
		}()

		for {
			var msg WSMessage
			if err := conn.ReadJSON(&msg); err != nil {
				log.Printf("WebSocket read error: %v", err)
				break
			}

			// 处理客户端消息
			h.handleWSMessage(conn, &msg)
		}
	}()

	// 保持连接
	<-ctx.Done()
}

// sendInitialStatus 发送初始状态
func (h *FailoverHandler) sendInitialStatus(conn *websocket.Conn) {
	// 发送域名状态
	domains, err := h.domainChecker.GetAllDomains()
	if err == nil {
		conn.WriteJSON(WSMessage{
			Type: "initial_domains",
			Data: domains,
		})
	}

	// 发送网关状态
	gateways, err := h.gatewayManager.GetAllGateways()
	if err == nil {
		conn.WriteJSON(WSMessage{
			Type: "initial_gateways",
			Data: gateways,
		})
	}

	// 发送故障转移配置
	config, err := h.failoverController.GetConfig()
	if err == nil {
		conn.WriteJSON(WSMessage{
			Type: "initial_config",
			Data: config,
		})
	}
}

// handleWSMessage 处理WebSocket消息
func (h *FailoverHandler) handleWSMessage(conn *websocket.Conn, msg *WSMessage) {
	switch msg.Type {
	case "ping":
		conn.WriteJSON(WSMessage{Type: "pong", Data: nil})
	case "request_status":
		h.sendInitialStatus(conn)
	default:
		log.Printf("Unknown WebSocket message type: %s", msg.Type)
	}
}

// broadcastStatusUpdate 广播状态更新
func (h *FailoverHandler) broadcastStatusUpdate(updateType string, data interface{}) {
	update := StatusUpdate{
		Timestamp: time.Now().Format(time.RFC3339),
		Type:      updateType,
		Status:    data,
	}

	message := WSMessage{
		Type: "status_update",
		Data: update,
	}

	for connID, conn := range h.wsConnections {
		if err := conn.WriteJSON(message); err != nil {
			log.Printf("Failed to send WebSocket message to %s: %v", connID, err)
			conn.Close()
			delete(h.wsConnections, connID)
		}
	}
}

// StartPeriodicStatusBroadcast 启动定期状态广播
func (h *FailoverHandler) StartPeriodicStatusBroadcast(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.broadcastCurrentStatus()
		case <-ctx.Done():
			return
		}
	}
}

// broadcastCurrentStatus 广播当前状态
func (h *FailoverHandler) broadcastCurrentStatus() {
	// 广播域名状态
	if domains, err := h.domainChecker.GetAllDomains(); err == nil {
		h.broadcastStatusUpdate("domains_status", domains)
	}

	// 广播网关状态
	if gateways, err := h.gatewayManager.GetAllGateways(); err == nil {
		h.broadcastStatusUpdate("gateways_status", gateways)
	}
}

// RegisterRoutes 注册路由
func (h *FailoverHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/failover")

	// 域名管理路由
	domains := api.Group("/domains")
	{
		domains.GET("", h.GetDomains)
		domains.POST("", h.AddDomain)
		domains.PUT("/:id", h.UpdateDomain)
		domains.DELETE("/:id", h.DeleteDomain)
		domains.POST("/:id/check", h.CheckDomain)
		domains.GET("/:id/logs", h.GetDomainLogs)
	}

	// 支付网关管理路由
	gateways := api.Group("/gateways")
	{
		gateways.GET("", h.GetGateways)
		gateways.POST("", h.AddGateway)
		gateways.PUT("/:id", h.UpdateGateway)
		gateways.DELETE("/:id", h.DeleteGateway)
		gateways.POST("/:id/check", h.CheckGateway)
		gateways.POST("/:id/test", h.TestGateway)
		gateways.GET("/:id/logs", h.GetGatewayLogs)
	}

	// 故障转移配置路由
	failover := api.Group("/config")
	{
		failover.GET("", h.GetFailoverConfig)
		failover.PUT("", h.UpdateFailoverConfig)
		failover.GET("/logs", h.GetFailoverLogs)
	}

	// WebSocket路由
	r.GET("/ws/failover", h.HandleWebSocket)
}