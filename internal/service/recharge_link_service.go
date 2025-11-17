package service

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// RechargeLinkService 充值链接服务接口
type RechargeLinkService interface {
	// 链接管理
	CreateLink(ctx context.Context, req *CreateRechargeLinkRequest) (*repository.RechargeLink, error)
	GetLink(ctx context.Context, id uuid.UUID) (*repository.RechargeLink, error)
	GetLinkByCode(ctx context.Context, shortCode string) (*repository.RechargeLink, error)
	UpdateLink(ctx context.Context, id uuid.UUID, req *UpdateRechargeLinkRequest) error
	DeleteLink(ctx context.Context, id uuid.UUID) error
	ListLinks(ctx context.Context, req *ListRechargeLinkRequest) (*ListRechargeLinkResponse, error)
	
	// 访问控制
	ValidateAndRecordAccess(ctx context.Context, shortCode, visitorIP, userAgent, referer string) (*RechargeLinkAccessResult, error)
	RecordOrderCreation(ctx context.Context, linkID, orderID uuid.UUID) error
	RecordOrderCompletion(ctx context.Context, linkID, orderID uuid.UUID, amount decimal.Decimal) error
	
	// 统计分析
	GetLinkStats(ctx context.Context, linkID uuid.UUID) (*RechargeLinkStats, error)
	GetLinkLogs(ctx context.Context, linkID uuid.UUID, req *GetRechargeLinkLogsRequest) (*GetRechargeLinkLogsResponse, error)
	
	// 工具方法
	GenerateShortLink(ctx context.Context, baseURL, shortCode string) string
	ExtractIPFromRequest(remoteAddr, forwardedFor string) string
}

// 请求和响应结构体
type CreateRechargeLinkRequest struct {
	MerchantID          *uuid.UUID       `json:"merchant_id"`
	LinkType            string           `json:"link_type"`
	Title               *string          `json:"title"`
	Description         *string          `json:"description"`
	PrefillMerchantName *string          `json:"prefill_merchant_name"`
	PrefillAdAccount    *string          `json:"prefill_ad_account"`
	PrefillAmount       *decimal.Decimal `json:"prefill_amount"`
	PrefillRemark       *string          `json:"prefill_remark"`
	ExpiresAt           *time.Time       `json:"expires_at"`
	MaxUses             *int             `json:"max_uses"`
	AllowedIPs          []string         `json:"allowed_ips"`
	RequireVerification bool             `json:"require_verification"`
	CreatedBy           *uuid.UUID       `json:"created_by"`
}

type UpdateRechargeLinkRequest struct {
	Title               *string          `json:"title"`
	Description         *string          `json:"description"`
	PrefillMerchantName *string          `json:"prefill_merchant_name"`
	PrefillAdAccount    *string          `json:"prefill_ad_account"`
	PrefillAmount       *decimal.Decimal `json:"prefill_amount"`
	PrefillRemark       *string          `json:"prefill_remark"`
	IsActive            *bool            `json:"is_active"`
	ExpiresAt           *time.Time       `json:"expires_at"`
	MaxUses             *int             `json:"max_uses"`
	AllowedIPs          []string         `json:"allowed_ips"`
	RequireVerification *bool            `json:"require_verification"`
	UpdatedBy           *uuid.UUID       `json:"updated_by"`
}

type ListRechargeLinkRequest struct {
	MerchantID *uuid.UUID `json:"merchant_id"`
	LinkType   *string    `json:"link_type"`
	IsActive   *bool      `json:"is_active"`
	Expired    *bool      `json:"expired"`
	CreatedBy  *uuid.UUID `json:"created_by"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
	OrderBy    string     `json:"order_by"`
	OrderDesc  bool       `json:"order_desc"`
}

type ListRechargeLinkResponse struct {
	Links []*repository.RechargeLink `json:"links"`
	Total int                        `json:"total"`
	Page  int                        `json:"page"`
	Size  int                        `json:"size"`
}

type RechargeLinkAccessResult struct {
	Link            *repository.RechargeLink `json:"link"`
	AccessAllowed   bool                     `json:"access_allowed"`
	ErrorMessage    string                   `json:"error_message,omitempty"`
	PrefillData     *PrefillData             `json:"prefill_data,omitempty"`
}

type PrefillData struct {
	MerchantName *string          `json:"merchant_name,omitempty"`
	AdAccount    *string          `json:"ad_account,omitempty"`
	Amount       *decimal.Decimal `json:"amount,omitempty"`
	Remark       *string          `json:"remark,omitempty"`
}

type RechargeLinkStats struct {
	LinkID           uuid.UUID       `json:"link_id"`
	TotalVisits      int             `json:"total_visits"`
	SuccessfulOrders int             `json:"successful_orders"`
	TotalAmount      decimal.Decimal `json:"total_amount"`
	ConversionRate   float64         `json:"conversion_rate"`
	LastAccessedAt   *time.Time      `json:"last_accessed_at"`
	CreatedAt        time.Time       `json:"created_at"`
}

type GetRechargeLinkLogsRequest struct {
	Action    *string    `json:"action"`
	VisitorIP *string    `json:"visitor_ip"`
	DateFrom  *time.Time `json:"date_from"`
	DateTo    *time.Time `json:"date_to"`
	Page      int        `json:"page"`
	PageSize  int        `json:"page_size"`
}

type GetRechargeLinkLogsResponse struct {
	Logs  []*repository.RechargeLinkLog `json:"logs"`
	Total int                           `json:"total"`
	Page  int                           `json:"page"`
	Size  int                           `json:"size"`
}

type rechargeLinkService struct {
	linkRepo     repository.RechargeLinkRepository
	merchantRepo repository.MerchantRepository
}

// NewRechargeLinkService 创建充值链接服务实例
func NewRechargeLinkService(
	linkRepo repository.RechargeLinkRepository,
	merchantRepo repository.MerchantRepository,
) RechargeLinkService {
	return &rechargeLinkService{
		linkRepo:     linkRepo,
		merchantRepo: merchantRepo,
	}
}

// CreateLink 创建充值链接
func (s *rechargeLinkService) CreateLink(ctx context.Context, req *CreateRechargeLinkRequest) (*repository.RechargeLink, error) {
	// 验证商户是否存在
	if req.MerchantID != nil {
		_, err := s.merchantRepo.GetByID(ctx, *req.MerchantID)
		if err != nil {
			return nil, fmt.Errorf("商户不存在: %v", err)
		}
	}
	
	// 生成唯一短码
	shortCode, err := s.linkRepo.GenerateUniqueShortCode(ctx)
	if err != nil {
		return nil, fmt.Errorf("生成短码失败: %v", err)
	}
	
	// 验证链接类型
	if req.LinkType != "merchant" && req.LinkType != "general" {
		return nil, fmt.Errorf("无效的链接类型: %s", req.LinkType)
	}
	
	// 如果是商户专用链接，必须指定商户ID
	if req.LinkType == "merchant" && req.MerchantID == nil {
		return nil, fmt.Errorf("商户专用链接必须指定商户ID")
	}
	
	link := &repository.RechargeLink{
		ID:                  uuid.New(),
		ShortCode:          shortCode,
		MerchantID:         req.MerchantID,
		LinkType:           req.LinkType,
		Title:              req.Title,
		Description:        req.Description,
		PrefillMerchantName: req.PrefillMerchantName,
		PrefillAdAccount:   req.PrefillAdAccount,
		PrefillAmount:      req.PrefillAmount,
		PrefillRemark:      req.PrefillRemark,
		IsActive:           true,
		ExpiresAt:          req.ExpiresAt,
		MaxUses:            req.MaxUses,
		CurrentUses:        0,
		AllowedIPs:         req.AllowedIPs,
		RequireVerification: req.RequireVerification,
		TotalVisits:        0,
		SuccessfulOrders:   0,
		TotalAmount:        decimal.Zero,
		CreatedBy:          req.CreatedBy,
	}
	
	err = s.linkRepo.Create(ctx, link)
	if err != nil {
		return nil, fmt.Errorf("创建充值链接失败: %v", err)
	}
	
	return link, nil
}

// GetLink 获取充值链接
func (s *rechargeLinkService) GetLink(ctx context.Context, id uuid.UUID) (*repository.RechargeLink, error) {
	return s.linkRepo.GetByID(ctx, id)
}

// GetLinkByCode 通过短码获取充值链接
func (s *rechargeLinkService) GetLinkByCode(ctx context.Context, shortCode string) (*repository.RechargeLink, error) {
	return s.linkRepo.GetByShortCode(ctx, shortCode)
}

// UpdateLink 更新充值链接
func (s *rechargeLinkService) UpdateLink(ctx context.Context, id uuid.UUID, req *UpdateRechargeLinkRequest) error {
	// 获取现有链接
	link, err := s.linkRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("获取充值链接失败: %v", err)
	}
	
	// 更新字段
	if req.Title != nil {
		link.Title = req.Title
	}
	if req.Description != nil {
		link.Description = req.Description
	}
	if req.PrefillMerchantName != nil {
		link.PrefillMerchantName = req.PrefillMerchantName
	}
	if req.PrefillAdAccount != nil {
		link.PrefillAdAccount = req.PrefillAdAccount
	}
	if req.PrefillAmount != nil {
		link.PrefillAmount = req.PrefillAmount
	}
	if req.PrefillRemark != nil {
		link.PrefillRemark = req.PrefillRemark
	}
	if req.IsActive != nil {
		link.IsActive = *req.IsActive
	}
	if req.ExpiresAt != nil {
		link.ExpiresAt = req.ExpiresAt
	}
	if req.MaxUses != nil {
		link.MaxUses = req.MaxUses
	}
	if req.AllowedIPs != nil {
		link.AllowedIPs = req.AllowedIPs
	}
	if req.RequireVerification != nil {
		link.RequireVerification = *req.RequireVerification
	}
	link.UpdatedBy = req.UpdatedBy
	
	return s.linkRepo.Update(ctx, link)
}

// DeleteLink 删除充值链接
func (s *rechargeLinkService) DeleteLink(ctx context.Context, id uuid.UUID) error {
	return s.linkRepo.Delete(ctx, id)
}

// ListLinks 获取充值链接列表
func (s *rechargeLinkService) ListLinks(ctx context.Context, req *ListRechargeLinkRequest) (*ListRechargeLinkResponse, error) {
	filter := &repository.RechargeLinkFilter{
		MerchantID: req.MerchantID,
		LinkType:   req.LinkType,
		IsActive:   req.IsActive,
		Expired:    req.Expired,
		CreatedBy:  req.CreatedBy,
		Page:       req.Page,
		PageSize:   req.PageSize,
		OrderBy:    req.OrderBy,
		OrderDesc:  req.OrderDesc,
	}
	
	links, total, err := s.linkRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("获取充值链接列表失败: %v", err)
	}
	
	return &ListRechargeLinkResponse{
		Links: links,
		Total: total,
		Page:  req.Page,
		Size:  len(links),
	}, nil
}

// ValidateAndRecordAccess 验证并记录访问
func (s *rechargeLinkService) ValidateAndRecordAccess(ctx context.Context, shortCode, visitorIP, userAgent, referer string) (*RechargeLinkAccessResult, error) {
	// 验证访问权限
	link, err := s.linkRepo.ValidateAccess(ctx, shortCode, visitorIP)
	if err != nil {
		// 即使验证失败，也要记录访问日志
		if tempLink, getErr := s.linkRepo.GetByShortCode(ctx, shortCode); getErr == nil {
			s.recordAccessLog(ctx, tempLink.ID, visitorIP, userAgent, referer, "access_denied", nil)
		}
		
		return &RechargeLinkAccessResult{
			AccessAllowed: false,
			ErrorMessage:  err.Error(),
		}, nil
	}
	
	// 记录访问
	err = s.linkRepo.IncrementVisit(ctx, link.ID, visitorIP)
	if err != nil {
		return nil, fmt.Errorf("记录访问失败: %v", err)
	}
	
	// 记录访问日志
	err = s.recordAccessLog(ctx, link.ID, visitorIP, userAgent, referer, "visited", nil)
	if err != nil {
		// 日志记录失败不影响主流程
		fmt.Printf("记录访问日志失败: %v\n", err)
	}
	
	// 准备预填充数据
	prefillData := &PrefillData{
		MerchantName: link.PrefillMerchantName,
		AdAccount:    link.PrefillAdAccount,
		Amount:       link.PrefillAmount,
		Remark:       link.PrefillRemark,
	}
	
	return &RechargeLinkAccessResult{
		Link:          link,
		AccessAllowed: true,
		PrefillData:   prefillData,
	}, nil
}

// RecordOrderCreation 记录订单创建
func (s *rechargeLinkService) RecordOrderCreation(ctx context.Context, linkID, orderID uuid.UUID) error {
	return s.recordAccessLog(ctx, linkID, "", "", "", "order_created", &orderID)
}

// RecordOrderCompletion 记录订单完成
func (s *rechargeLinkService) RecordOrderCompletion(ctx context.Context, linkID, orderID uuid.UUID, amount decimal.Decimal) error {
	// 更新链接统计
	err := s.linkRepo.IncrementSuccess(ctx, linkID, orderID, amount)
	if err != nil {
		return fmt.Errorf("更新链接统计失败: %v", err)
	}
	
	// 记录日志
	return s.recordAccessLog(ctx, linkID, "", "", "", "order_completed", &orderID)
}

// GetLinkStats 获取链接统计
func (s *rechargeLinkService) GetLinkStats(ctx context.Context, linkID uuid.UUID) (*RechargeLinkStats, error) {
	link, err := s.linkRepo.GetByID(ctx, linkID)
	if err != nil {
		return nil, fmt.Errorf("获取链接信息失败: %v", err)
	}
	
	conversionRate := 0.0
	if link.TotalVisits > 0 {
		conversionRate = float64(link.SuccessfulOrders) / float64(link.TotalVisits) * 100
	}
	
	return &RechargeLinkStats{
		LinkID:           linkID,
		TotalVisits:      link.TotalVisits,
		SuccessfulOrders: link.SuccessfulOrders,
		TotalAmount:      link.TotalAmount,
		ConversionRate:   conversionRate,
		LastAccessedAt:   link.LastAccessedAt,
		CreatedAt:        link.CreatedAt,
	}, nil
}

// GetLinkLogs 获取链接日志
func (s *rechargeLinkService) GetLinkLogs(ctx context.Context, linkID uuid.UUID, req *GetRechargeLinkLogsRequest) (*GetRechargeLinkLogsResponse, error) {
	filter := &repository.RechargeLinkLogFilter{
		Action:    req.Action,
		VisitorIP: req.VisitorIP,
		DateFrom:  req.DateFrom,
		DateTo:    req.DateTo,
		Page:      req.Page,
		PageSize:  req.PageSize,
	}
	
	logs, total, err := s.linkRepo.GetLogs(ctx, linkID, filter)
	if err != nil {
		return nil, fmt.Errorf("获取链接日志失败: %v", err)
	}
	
	return &GetRechargeLinkLogsResponse{
		Logs:  logs,
		Total: total,
		Page:  req.Page,
		Size:  len(logs),
	}, nil
}

// GenerateShortLink 生成完整短链接URL
func (s *rechargeLinkService) GenerateShortLink(ctx context.Context, baseURL, shortCode string) string {
	return fmt.Sprintf("%s/r/%s", strings.TrimSuffix(baseURL, "/"), shortCode)
}

// ExtractIPFromRequest 从请求中提取真实IP
func (s *rechargeLinkService) ExtractIPFromRequest(remoteAddr, forwardedFor string) string {
	// 优先使用 X-Forwarded-For 头部
	if forwardedFor != "" {
		// X-Forwarded-For 可能包含多个IP，取第一个
		ips := strings.Split(forwardedFor, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}
	
	// 从 RemoteAddr 中提取IP
	if remoteAddr != "" {
		host, _, err := net.SplitHostPort(remoteAddr)
		if err == nil {
			return host
		}
		// 如果没有端口，直接返回
		if net.ParseIP(remoteAddr) != nil {
			return remoteAddr
		}
	}
	
	return "unknown"
}

// recordAccessLog 记录访问日志的私有方法
func (s *rechargeLinkService) recordAccessLog(ctx context.Context, linkID uuid.UUID, visitorIP, userAgent, referer, action string, orderID *uuid.UUID) error {
	log := &repository.RechargeLinkLog{
		ID:        uuid.New(),
		LinkID:    linkID,
		VisitorIP: nil,
		UserAgent: nil,
		Referer:   nil,
		Action:    action,
		OrderID:   orderID,
	}
	
	if visitorIP != "" {
		log.VisitorIP = &visitorIP
	}
	if userAgent != "" {
		log.UserAgent = &userAgent
	}
	if referer != "" {
		log.Referer = &referer
	}
	
	return s.linkRepo.CreateLog(ctx, log)
}