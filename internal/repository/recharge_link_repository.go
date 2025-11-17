package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/shopspring/decimal"
)

// RechargeLinkRepository 充值链接仓储接口
type RechargeLinkRepository interface {
	// 基础CRUD操作
	Create(ctx context.Context, link *RechargeLink) error
	GetByID(ctx context.Context, id uuid.UUID) (*RechargeLink, error)
	GetByShortCode(ctx context.Context, shortCode string) (*RechargeLink, error)
	Update(ctx context.Context, link *RechargeLink) error
	Delete(ctx context.Context, id uuid.UUID) error
	
	// 查询操作
	List(ctx context.Context, filter *RechargeLinkFilter) ([]*RechargeLink, int, error)
	GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*RechargeLink, error)
	
	// 统计操作
	IncrementVisit(ctx context.Context, id uuid.UUID, visitorIP string) error
	IncrementSuccess(ctx context.Context, id uuid.UUID, orderID uuid.UUID, amount decimal.Decimal) error
	
	// 访问日志
	CreateLog(ctx context.Context, log *RechargeLinkLog) error
	GetLogs(ctx context.Context, linkID uuid.UUID, filter *RechargeLinkLogFilter) ([]*RechargeLinkLog, int, error)
	
	// 工具方法
	GenerateUniqueShortCode(ctx context.Context) (string, error)
	ValidateAccess(ctx context.Context, shortCode, visitorIP string) (*RechargeLink, error)
}

// RechargeLinkFilter 充值链接查询过滤器
type RechargeLinkFilter struct {
	MerchantID *uuid.UUID `json:"merchant_id"`
	LinkType   *string    `json:"link_type"`
	IsActive   *bool      `json:"is_active"`
	Expired    *bool      `json:"expired"`
	CreatedBy  *uuid.UUID `json:"created_by"`
	
	// 分页参数
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	
	// 排序参数
	OrderBy   string `json:"order_by"`
	OrderDesc bool   `json:"order_desc"`
}

// RechargeLinkLogFilter 充值链接日志查询过滤器
type RechargeLinkLogFilter struct {
	Action     *string    `json:"action"`
	VisitorIP  *string    `json:"visitor_ip"`
	DateFrom   *time.Time `json:"date_from"`
	DateTo     *time.Time `json:"date_to"`
	
	// 分页参数
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

type rechargeLinkRepository struct {
	db *sqlx.DB
}

// NewRechargeLinkRepository 创建充值链接仓储实例
func NewRechargeLinkRepository(db *sqlx.DB) RechargeLinkRepository {
	return &rechargeLinkRepository{db: db}
}

// Create 创建充值链接
func (r *rechargeLinkRepository) Create(ctx context.Context, link *RechargeLink) error {
	if link.ID == uuid.Nil {
		link.ID = uuid.New()
	}
	
	link.CreatedAt = time.Now()
	link.UpdatedAt = time.Now()
	
	query := `
		INSERT INTO recharge_links (
			id, short_code, merchant_id, link_type, title, description,
			prefill_merchant_name, prefill_ad_account, prefill_amount, prefill_remark,
			is_active, expires_at, max_uses, current_uses, allowed_ips, require_verification,
			total_visits, successful_orders, total_amount, last_accessed_at,
			created_at, updated_at, created_by, updated_by
		) VALUES (
			:id, :short_code, :merchant_id, :link_type, :title, :description,
			:prefill_merchant_name, :prefill_ad_account, :prefill_amount, :prefill_remark,
			:is_active, :expires_at, :max_uses, :current_uses, :allowed_ips, :require_verification,
			:total_visits, :successful_orders, :total_amount, :last_accessed_at,
			:created_at, :updated_at, :created_by, :updated_by
		)`
	
	_, err := r.db.NamedExecContext(ctx, query, link)
	return err
}

// GetByID 根据ID获取充值链接
func (r *rechargeLinkRepository) GetByID(ctx context.Context, id uuid.UUID) (*RechargeLink, error) {
	var link RechargeLink
	query := `
		SELECT rl.*, m.name as merchant_name
		FROM recharge_links rl
		LEFT JOIN merchants m ON rl.merchant_id = m.id
		WHERE rl.id = $1`
	
	err := r.db.GetContext(ctx, &link, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	
	return &link, nil
}

// GetByShortCode 根据短码获取充值链接
func (r *rechargeLinkRepository) GetByShortCode(ctx context.Context, shortCode string) (*RechargeLink, error) {
	var link RechargeLink
	query := `
		SELECT rl.*, m.name as merchant_name
		FROM recharge_links rl
		LEFT JOIN merchants m ON rl.merchant_id = m.id
		WHERE rl.short_code = $1`
	
	err := r.db.GetContext(ctx, &link, query, shortCode)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	
	return &link, nil
}

// Update 更新充值链接
func (r *rechargeLinkRepository) Update(ctx context.Context, link *RechargeLink) error {
	link.UpdatedAt = time.Now()
	
	query := `
		UPDATE recharge_links SET
			merchant_id = :merchant_id,
			link_type = :link_type,
			title = :title,
			description = :description,
			prefill_merchant_name = :prefill_merchant_name,
			prefill_ad_account = :prefill_ad_account,
			prefill_amount = :prefill_amount,
			prefill_remark = :prefill_remark,
			is_active = :is_active,
			expires_at = :expires_at,
			max_uses = :max_uses,
			allowed_ips = :allowed_ips,
			require_verification = :require_verification,
			updated_at = :updated_at,
			updated_by = :updated_by
		WHERE id = :id`
	
	result, err := r.db.NamedExecContext(ctx, query, link)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return ErrNotFound
	}
	
	return nil
}

// Delete 删除充值链接
func (r *rechargeLinkRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM recharge_links WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return ErrNotFound
	}
	
	return nil
}

// List 获取充值链接列表
func (r *rechargeLinkRepository) List(ctx context.Context, filter *RechargeLinkFilter) ([]*RechargeLink, int, error) {
	var conditions []string
	var args []interface{}
	var argIndex int
	
	// 构建WHERE条件
	if filter.MerchantID != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("rl.merchant_id = $%d", argIndex))
		args = append(args, *filter.MerchantID)
	}
	
	if filter.LinkType != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("rl.link_type = $%d", argIndex))
		args = append(args, *filter.LinkType)
	}
	
	if filter.IsActive != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("rl.is_active = $%d", argIndex))
		args = append(args, *filter.IsActive)
	}
	
	if filter.Expired != nil && *filter.Expired {
		conditions = append(conditions, "rl.expires_at IS NOT NULL AND rl.expires_at < NOW()")
	} else if filter.Expired != nil && !*filter.Expired {
		conditions = append(conditions, "(rl.expires_at IS NULL OR rl.expires_at >= NOW())")
	}
	
	if filter.CreatedBy != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("rl.created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
	}
	
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}
	
	// 构建排序
	orderBy := "rl.created_at"
	if filter.OrderBy != "" {
		orderBy = "rl." + filter.OrderBy
	}
	orderDirection := "DESC"
	if !filter.OrderDesc {
		orderDirection = "ASC"
	}
	
	// 获取总数
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM recharge_links rl
		LEFT JOIN merchants m ON rl.merchant_id = m.id
		%s`, whereClause)
	
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	
	// 构建分页
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize
	
	// 获取数据
	dataQuery := fmt.Sprintf(`
		SELECT rl.*, m.name as merchant_name
		FROM recharge_links rl
		LEFT JOIN merchants m ON rl.merchant_id = m.id
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, orderDirection, argIndex+1, argIndex+2)
	
	args = append(args, pageSize, offset)
	
	var links []*RechargeLink
	err = r.db.SelectContext(ctx, &links, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	
	return links, total, nil
}

// GetByMerchantID 获取指定商户的充值链接
func (r *rechargeLinkRepository) GetByMerchantID(ctx context.Context, merchantID uuid.UUID) ([]*RechargeLink, error) {
	var links []*RechargeLink
	query := `
		SELECT rl.*, m.name as merchant_name
		FROM recharge_links rl
		LEFT JOIN merchants m ON rl.merchant_id = m.id
		WHERE rl.merchant_id = $1 AND rl.is_active = true
		ORDER BY rl.created_at DESC`
	
	err := r.db.SelectContext(ctx, &links, query, merchantID)
	if err != nil {
		return nil, err
	}
	
	return links, nil
}

// IncrementVisit 增加访问统计
func (r *rechargeLinkRepository) IncrementVisit(ctx context.Context, id uuid.UUID, visitorIP string) error {
	query := `
		UPDATE recharge_links 
		SET total_visits = total_visits + 1,
		    current_uses = current_uses + 1,
		    last_accessed_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1`
	
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// IncrementSuccess 增加成功订单统计
func (r *rechargeLinkRepository) IncrementSuccess(ctx context.Context, id uuid.UUID, orderID uuid.UUID, amount decimal.Decimal) error {
	query := `
		UPDATE recharge_links 
		SET successful_orders = successful_orders + 1,
		    total_amount = total_amount + $2,
		    updated_at = NOW()
		WHERE id = $1`
	
	_, err := r.db.ExecContext(ctx, query, id, amount)
	return err
}

// CreateLog 创建访问日志
func (r *rechargeLinkRepository) CreateLog(ctx context.Context, log *RechargeLinkLog) error {
	if log.ID == uuid.Nil {
		log.ID = uuid.New()
	}
	log.CreatedAt = time.Now()
	
	query := `
		INSERT INTO recharge_link_logs (
			id, link_id, visitor_ip, user_agent, referer,
			action, order_id, country, region, city, created_at
		) VALUES (
			:id, :link_id, :visitor_ip, :user_agent, :referer,
			:action, :order_id, :country, :region, :city, :created_at
		)`
	
	_, err := r.db.NamedExecContext(ctx, query, log)
	return err
}

// GetLogs 获取访问日志
func (r *rechargeLinkRepository) GetLogs(ctx context.Context, linkID uuid.UUID, filter *RechargeLinkLogFilter) ([]*RechargeLinkLog, int, error) {
	var conditions []string
	var args []interface{}
	argIndex := 0
	
	// 基础条件
	argIndex++
	conditions = append(conditions, fmt.Sprintf("link_id = $%d", argIndex))
	args = append(args, linkID)
	
	// 构建WHERE条件
	if filter.Action != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, *filter.Action)
	}
	
	if filter.VisitorIP != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("visitor_ip = $%d", argIndex))
		args = append(args, *filter.VisitorIP)
	}
	
	if filter.DateFrom != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, *filter.DateFrom)
	}
	
	if filter.DateTo != nil {
		argIndex++
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, *filter.DateTo)
	}
	
	whereClause := "WHERE " + strings.Join(conditions, " AND ")
	
	// 获取总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM recharge_link_logs %s", whereClause)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	
	// 分页
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize
	
	// 获取数据
	dataQuery := fmt.Sprintf(`
		SELECT * FROM recharge_link_logs 
		%s 
		ORDER BY created_at DESC 
		LIMIT $%d OFFSET $%d`,
		whereClause, argIndex+1, argIndex+2)
	
	args = append(args, pageSize, offset)
	
	var logs []*RechargeLinkLog
	err = r.db.SelectContext(ctx, &logs, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	
	return logs, total, nil
}

// GenerateUniqueShortCode 生成唯一的短链接代码
func (r *rechargeLinkRepository) GenerateUniqueShortCode(ctx context.Context) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const codeLength = 8
	
	for attempts := 0; attempts < 10; attempts++ {
		code := generateRandomString(charset, codeLength)
		
		// 检查是否已存在
		var exists bool
		err := r.db.GetContext(ctx, &exists, 
			"SELECT EXISTS(SELECT 1 FROM recharge_links WHERE short_code = $1)", code)
		if err != nil {
			return "", err
		}
		
		if !exists {
			return code, nil
		}
	}
	
	return "", fmt.Errorf("无法生成唯一的短链接代码")
}

// ValidateAccess 验证访问权限
func (r *rechargeLinkRepository) ValidateAccess(ctx context.Context, shortCode, visitorIP string) (*RechargeLink, error) {
	link, err := r.GetByShortCode(ctx, shortCode)
	if err != nil {
		return nil, err
	}
	
	// 检查是否激活
	if !link.IsActive {
		return nil, fmt.Errorf("链接已被禁用")
	}
	
	// 检查是否过期
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("链接已过期")
	}
	
	// 检查使用次数限制
	if link.MaxUses != nil && link.CurrentUses >= *link.MaxUses {
		return nil, fmt.Errorf("链接使用次数已达上限")
	}
	
	// 检查IP限制
	if len(link.AllowedIPs) > 0 {
		allowed := false
		for _, allowedIP := range link.AllowedIPs {
			if allowedIP == visitorIP {
				allowed = true
				break
			}
		}
		if !allowed {
			return nil, fmt.Errorf("IP地址不在允许列表中")
		}
	}
	
	return link, nil
}

// generateRandomString 生成随机字符串
func generateRandomString(charset string, length int) string {
	result := make([]byte, length)
	max := big.NewInt(int64(len(charset)))
	
	for i := range result {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			// 如果随机数生成失败，使用时间戳作为后备方案
			result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
		} else {
			result[i] = charset[n.Int64()]
		}
	}
	return string(result)
}