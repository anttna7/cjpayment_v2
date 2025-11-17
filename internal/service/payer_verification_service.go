package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// PayerVerificationService 付款人验证服务接口
type PayerVerificationService interface {
	// 身份验证
	VerifyPayer(ctx context.Context, req *PayerVerificationRequest) (*PayerVerificationResult, error)
	GetVerification(ctx context.Context, payerName, payerAccount string) (*repository.PayerVerification, error)
	UpdateVerificationStatus(ctx context.Context, verificationID uuid.UUID, status string, reason *string) error
	
	// 黑名单管理
	AddToBlacklist(ctx context.Context, req *AddBlacklistRequest) error
	RemoveFromBlacklist(ctx context.Context, id uuid.UUID) error
	CheckBlacklist(ctx context.Context, payerName, payerAccount string) (*BlacklistCheckResult, error)
	
	// 账户匹配验证
	VerifyAccountMatch(ctx context.Context, req *AccountMatchRequest) (*AccountMatchResult, error)
	GetAccountMatchVerification(ctx context.Context, orderID uuid.UUID) (*repository.AccountMatchVerification, error)
	
	// 重复付款检测
	CheckDuplicatePayment(ctx context.Context, req *DuplicateCheckRequest) (*DuplicateCheckResult, error)
	GetDuplicateChecks(ctx context.Context, payerName, payerAccount string, hours int) ([]*repository.DuplicatePaymentCheck, error)
	
	// 信用评分
	CalculateCreditScore(ctx context.Context, payerName, payerAccount string) (*PayerCreditScoreResult, error)
	UpdateCreditScore(ctx context.Context, payerName, payerAccount string, orderResult *OrderResult) error
	GetCreditScore(ctx context.Context, payerName, payerAccount string) (*repository.PayerCreditScore, error)
	
	// 综合风险评估
	AssessRisk(ctx context.Context, req *RiskAssessmentRequest) (*RiskAssessmentResult, error)
}

// 请求和响应结构体
type PayerVerificationRequest struct {
	PayerName             string  `json:"payer_name" validate:"required"`
	PayerAccount          string  `json:"payer_account" validate:"required"`
	AccountType           string  `json:"account_type" validate:"required"`
	VerificationType      string  `json:"verification_type,omitempty"` // basic/enhanced/manual
	IdentityDocumentType  *string `json:"identity_document_type,omitempty"`
	IdentityDocumentNumber *string `json:"identity_document_number,omitempty"`
	PhoneNumber           *string `json:"phone_number,omitempty"`
	Email                 *string `json:"email,omitempty"`
	BankName              *string `json:"bank_name,omitempty"`
	BankBranch            *string `json:"bank_branch,omitempty"`
	VerifiedBy            *uuid.UUID `json:"verified_by,omitempty"`
}

type PayerVerificationResult struct {
	Verification      *repository.PayerVerification `json:"verification"`
	IsVerified        bool                         `json:"is_verified"`
	VerificationScore int                          `json:"verification_score"`
	RiskLevel         string                       `json:"risk_level"`
	RiskFlags         []string                     `json:"risk_flags"`
	Recommendations   []string                     `json:"recommendations"`
}

type AddBlacklistRequest struct {
	PayerName     *string    `json:"payer_name"`
	PayerAccount  *string    `json:"payer_account"`
	AccountType   *string    `json:"account_type"`
	BlacklistType string     `json:"blacklist_type" validate:"required"` // fraud/dispute/policy/manual
	Reason        string     `json:"reason" validate:"required"`
	Severity      string     `json:"severity,omitempty"` // low/medium/high/critical
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	ReportedBy    *uuid.UUID `json:"reported_by,omitempty"`
}

type BlacklistCheckResult struct {
	IsBlacklisted   bool                    `json:"is_blacklisted"`
	BlacklistEntry  *repository.PayerBlacklist `json:"blacklist_entry,omitempty"`
	BlockReason     string                  `json:"block_reason,omitempty"`
	Severity        string                  `json:"severity,omitempty"`
}

type AccountMatchRequest struct {
	RechargeOrderID uuid.UUID `json:"recharge_order_id" validate:"required"`
	PayerName       string    `json:"payer_name" validate:"required"`
	PayerAccount    string    `json:"payer_account" validate:"required"`
	ReceiverName    string    `json:"receiver_name" validate:"required"`
	ReceiverAccount string    `json:"receiver_account" validate:"required"`
	Amount          decimal.Decimal `json:"amount" validate:"required"`
	BankName        *string   `json:"bank_name,omitempty"`
}

type AccountMatchResult struct {
	Verification      *repository.AccountMatchVerification `json:"verification"`
	MatchStatus       string                              `json:"match_status"`
	MatchScore        decimal.Decimal                     `json:"match_score"`
	MatchDetails      map[string]interface{}              `json:"match_details"`
	RiskFlags         []string                            `json:"risk_flags"`
	ReviewRequired    bool                                `json:"review_required"`
	Recommendations   []string                            `json:"recommendations"`
}

type DuplicateCheckRequest struct {
	PayerName       string          `json:"payer_name" validate:"required"`
	PayerAccount    string          `json:"payer_account" validate:"required"`
	ReceiverAccount string          `json:"receiver_account" validate:"required"`
	Amount          decimal.Decimal `json:"amount" validate:"required"`
	CheckWindowHours int            `json:"check_window_hours,omitempty"` // 默认24小时
}

type DuplicateCheckResult struct {
	Check               *repository.DuplicatePaymentCheck `json:"check"`
	IsDuplicate         bool                              `json:"is_duplicate"`
	DuplicateCount      int                               `json:"duplicate_count"`
	SimilarTransactions int                               `json:"similar_transactions"`
	ConfidenceScore     decimal.Decimal                   `json:"confidence_score"`
	OriginalOrderID     *uuid.UUID                        `json:"original_order_id,omitempty"`
	ActionRecommended   string                            `json:"action_recommended"`
}

type PayerCreditScoreResult struct {
	CreditScore     *repository.PayerCreditScore `json:"credit_score"`
	Score           int                         `json:"score"`
	ScoreLevel      string                      `json:"score_level"`
	ScoreChange     int                         `json:"score_change"`
	RiskFactors     []string                    `json:"risk_factors"`
	PositiveFactors []string                    `json:"positive_factors"`
}

type OrderResult struct {
	Success           bool            `json:"success"`
	Amount            decimal.Decimal `json:"amount"`
	IsDisputed        bool            `json:"is_disputed"`
	CompletionTime    time.Duration   `json:"completion_time"`
	VerificationScore int             `json:"verification_score,omitempty"`
}

type RiskAssessmentRequest struct {
	PayerName       string          `json:"payer_name" validate:"required"`
	PayerAccount    string          `json:"payer_account" validate:"required"`
	ReceiverAccount string          `json:"receiver_account" validate:"required"`
	Amount          decimal.Decimal `json:"amount" validate:"required"`
	AccountType     string          `json:"account_type" validate:"required"`
	IPAddress       *string         `json:"ip_address,omitempty"`
	UserAgent       *string         `json:"user_agent,omitempty"`
}

type RiskAssessmentResult struct {
	RiskScore       int                     `json:"risk_score"` // 0-100
	RiskLevel       string                  `json:"risk_level"` // low/medium/high/critical
	RiskFactors     []RiskFactor            `json:"risk_factors"`
	Recommendations []string                `json:"recommendations"`
	ActionRequired  string                  `json:"action_required"` // allow/warn/review/block
	
	// 详细评估结果
	VerificationResult  *PayerVerificationResult `json:"verification_result,omitempty"`
	BlacklistResult     *BlacklistCheckResult    `json:"blacklist_result,omitempty"`
	DuplicateResult     *DuplicateCheckResult    `json:"duplicate_result,omitempty"`
	CreditScoreResult   *PayerCreditScoreResult  `json:"credit_score_result,omitempty"`
}

type RiskFactor struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	Impact      string `json:"impact"` // low/medium/high
	Weight      int    `json:"weight"`
}

// 服务实现
type payerVerificationService struct {
	verificationRepo      PayerVerificationRepository
	blacklistRepo         PayerBlacklistRepository
	accountMatchRepo      AccountMatchVerificationRepository
	duplicateCheckRepo    DuplicatePaymentCheckRepository
	creditScoreRepo       PayerCreditScoreRepository
	rechargeOrderRepo     repository.RechargeOrderRepository
}

// 为了编译通过，我们需要定义这些repository接口
type PayerVerificationRepository interface {
	Create(ctx context.Context, verification *repository.PayerVerification) error
	GetByPayerInfo(ctx context.Context, payerName, payerAccount string) (*repository.PayerVerification, error)
	Update(ctx context.Context, verification *repository.PayerVerification) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, reason *string) error
}

type PayerBlacklistRepository interface {
	Create(ctx context.Context, blacklist *repository.PayerBlacklist) error
	GetByPayerInfo(ctx context.Context, payerName, payerAccount string) (*repository.PayerBlacklist, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter map[string]interface{}) ([]*repository.PayerBlacklist, error)
}

type AccountMatchVerificationRepository interface {
	Create(ctx context.Context, match *repository.AccountMatchVerification) error
	GetByOrderID(ctx context.Context, orderID uuid.UUID) (*repository.AccountMatchVerification, error)
	Update(ctx context.Context, match *repository.AccountMatchVerification) error
}

type DuplicatePaymentCheckRepository interface {
	Create(ctx context.Context, check *repository.DuplicatePaymentCheck) error
	GetByPayerInfo(ctx context.Context, payerName, payerAccount string, hours int) ([]*repository.DuplicatePaymentCheck, error)
	CheckDuplicates(ctx context.Context, payerName, payerAccount, receiverAccount string, amount decimal.Decimal, hours int) ([]*repository.DuplicatePaymentCheck, error)
}

type PayerCreditScoreRepository interface {
	Create(ctx context.Context, score *repository.PayerCreditScore) error
	GetByPayerInfo(ctx context.Context, payerName, payerAccount string) (*repository.PayerCreditScore, error)
	Update(ctx context.Context, score *repository.PayerCreditScore) error
	UpdateScoreFactors(ctx context.Context, payerName, payerAccount string, factors map[string]interface{}) error
}

// NewPayerVerificationService 创建付款人验证服务实例
func NewPayerVerificationService(
	verificationRepo PayerVerificationRepository,
	blacklistRepo PayerBlacklistRepository,
	accountMatchRepo AccountMatchVerificationRepository,
	duplicateCheckRepo DuplicatePaymentCheckRepository,
	creditScoreRepo PayerCreditScoreRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
) PayerVerificationService {
	return &payerVerificationService{
		verificationRepo:   verificationRepo,
		blacklistRepo:      blacklistRepo,
		accountMatchRepo:   accountMatchRepo,
		duplicateCheckRepo: duplicateCheckRepo,
		creditScoreRepo:    creditScoreRepo,
		rechargeOrderRepo:  rechargeOrderRepo,
	}
}

// VerifyPayer 验证付款人身份
func (s *payerVerificationService) VerifyPayer(ctx context.Context, req *PayerVerificationRequest) (*PayerVerificationResult, error) {
	// 检查是否已有验证记录
	existingVerification, err := s.verificationRepo.GetByPayerInfo(ctx, req.PayerName, req.PayerAccount)
	if err != nil && err != repository.ErrNotFound {
		return nil, fmt.Errorf("查询验证记录失败: %v", err)
	}
	
	// 如果已有有效的验证记录，返回结果
	if existingVerification != nil && existingVerification.VerificationStatus == "verified" {
		if existingVerification.ExpiresAt == nil || existingVerification.ExpiresAt.After(time.Now()) {
			return &PayerVerificationResult{
				Verification:      existingVerification,
				IsVerified:        true,
				VerificationScore: *existingVerification.VerificationScore,
				RiskLevel:         existingVerification.RiskLevel,
				RiskFlags:         []string{},
				Recommendations:   []string{"验证通过，可以正常交易"},
			}, nil
		}
	}
	
	// 创建新的验证记录
	verification := &repository.PayerVerification{
		ID:                    uuid.New(),
		PayerName:             req.PayerName,
		PayerAccount:          req.PayerAccount,
		AccountType:           req.AccountType,
		VerificationType:      req.VerificationType,
		VerificationStatus:    "pending",
		IdentityDocumentType:  req.IdentityDocumentType,
		IdentityDocumentNumber: req.IdentityDocumentNumber,
		PhoneNumber:           req.PhoneNumber,
		Email:                 req.Email,
		BankName:              req.BankName,
		BankBranch:            req.BankBranch,
		RiskLevel:             "medium",
		CreatedBy:             req.VerifiedBy,
		CreatedAt:             time.Now(),
		UpdatedAt:             time.Now(),
	}
	
	// 执行验证逻辑
	score, riskLevel, riskFlags := s.performVerification(ctx, req)
	
	verification.VerificationScore = &score
	verification.RiskLevel = riskLevel
	
	// 根据验证分数决定状态
	if score >= 80 {
		verification.VerificationStatus = "verified"
		verification.VerifiedAt = &verification.CreatedAt
		// 设置过期时间（30天后）
		expiresAt := time.Now().AddDate(0, 0, 30)
		verification.ExpiresAt = &expiresAt
	} else if score >= 60 {
		verification.VerificationStatus = "pending"
		verification.FailureReason = stringPtr("需要人工审核")
	} else {
		verification.VerificationStatus = "failed"
		verification.FailureReason = stringPtr("验证分数过低")
	}
	
	// 保存验证记录
	if existingVerification != nil {
		verification.ID = existingVerification.ID
		err = s.verificationRepo.Update(ctx, verification)
	} else {
		err = s.verificationRepo.Create(ctx, verification)
	}
	
	if err != nil {
		return nil, fmt.Errorf("保存验证记录失败: %v", err)
	}
	
	recommendations := s.generateRecommendations(score, riskLevel, riskFlags)
	
	return &PayerVerificationResult{
		Verification:      verification,
		IsVerified:        verification.VerificationStatus == "verified",
		VerificationScore: score,
		RiskLevel:         riskLevel,
		RiskFlags:         riskFlags,
		Recommendations:   recommendations,
	}, nil
}

// performVerification 执行具体的验证逻辑
func (s *payerVerificationService) performVerification(ctx context.Context, req *PayerVerificationRequest) (int, string, []string) {
	score := 50 // 基础分数
	var riskFlags []string
	
	// 1. 账户格式验证
	if s.validateAccountFormat(req.PayerAccount, req.AccountType) {
		score += 10
	} else {
		riskFlags = append(riskFlags, "账户格式不正确")
		score -= 15
	}
	
	// 2. 姓名格式验证
	if s.validateNameFormat(req.PayerName) {
		score += 5
	} else {
		riskFlags = append(riskFlags, "姓名格式异常")
		score -= 10
	}
	
	// 3. 身份证件验证
	if req.IdentityDocumentNumber != nil && req.IdentityDocumentType != nil {
		if s.validateIdentityDocument(*req.IdentityDocumentType, *req.IdentityDocumentNumber) {
			score += 15
		} else {
			riskFlags = append(riskFlags, "身份证件格式错误")
			score -= 10
		}
	}
	
	// 4. 手机号验证
	if req.PhoneNumber != nil {
		if s.validatePhoneNumber(*req.PhoneNumber) {
			score += 10
		} else {
			riskFlags = append(riskFlags, "手机号格式错误")
			score -= 5
		}
	}
	
	// 5. 邮箱验证
	if req.Email != nil {
		if s.validateEmail(*req.Email) {
			score += 5
		} else {
			riskFlags = append(riskFlags, "邮箱格式错误")
			score -= 5
		}
	}
	
	// 确保分数在合理范围内
	if score > 100 {
		score = 100
	} else if score < 0 {
		score = 0
	}
	
	// 确定风险等级
	riskLevel := "medium"
	if score >= 85 {
		riskLevel = "low"
	} else if score <= 40 {
		riskLevel = "high"
	}
	
	if score <= 20 {
		riskLevel = "blocked"
		riskFlags = append(riskFlags, "验证分数过低，建议屏蔽")
	}
	
	return score, riskLevel, riskFlags
}

// 格式验证方法
func (s *payerVerificationService) validateAccountFormat(account, accountType string) bool {
	switch accountType {
	case "bank":
		// 银行卡号验证：16-19位数字
		matched, _ := regexp.MatchString(`^\d{16,19}$`, account)
		return matched
	case "alipay":
		// 支付宝账号：手机号或邮箱
		phoneMatched, _ := regexp.MatchString(`^1[3-9]\d{9}$`, account)
		emailMatched, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, account)
		return phoneMatched || emailMatched
	case "wechat":
		// 微信号验证：6-20位字母、数字、下划线
		matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]{6,20}$`, account)
		return matched
	default:
		return true // 其他类型暂不验证
	}
}

func (s *payerVerificationService) validateNameFormat(name string) bool {
	// 姓名验证：2-10位中文或英文
	name = strings.TrimSpace(name)
	if len(name) < 2 || len(name) > 30 {
		return false
	}
	
	// 检查是否包含中文字符
	chineseMatched, _ := regexp.MatchString(`^[\p{Han}]{2,10}$`, name)
	// 检查是否为英文姓名
	englishMatched, _ := regexp.MatchString(`^[a-zA-Z\s]{2,30}$`, name)
	
	return chineseMatched || englishMatched
}

func (s *payerVerificationService) validateIdentityDocument(docType, docNumber string) bool {
	switch docType {
	case "id_card":
		// 身份证号验证：18位
		matched, _ := regexp.MatchString(`^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$`, docNumber)
		return matched
	case "passport":
		// 护照号验证：字母+数字组合，6-12位
		matched, _ := regexp.MatchString(`^[A-Za-z0-9]{6,12}$`, docNumber)
		return matched
	case "business_license":
		// 营业执照号验证：统一社会信用代码18位
		matched, _ := regexp.MatchString(`^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$`, docNumber)
		return matched
	default:
		return false
	}
}

func (s *payerVerificationService) validatePhoneNumber(phone string) bool {
	// 中国手机号验证
	matched, _ := regexp.MatchString(`^1[3-9]\d{9}$`, phone)
	return matched
}

func (s *payerVerificationService) validateEmail(email string) bool {
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, email)
	return matched
}

func (s *payerVerificationService) generateRecommendations(score int, riskLevel string, riskFlags []string) []string {
	var recommendations []string
	
	if score >= 80 {
		recommendations = append(recommendations, "验证通过，可以正常处理交易")
	} else if score >= 60 {
		recommendations = append(recommendations, "建议人工审核后再处理")
		if len(riskFlags) > 0 {
			recommendations = append(recommendations, "注意风险点："+strings.Join(riskFlags, "、"))
		}
	} else {
		recommendations = append(recommendations, "建议拒绝交易或要求提供更多验证信息")
		recommendations = append(recommendations, "主要问题："+strings.Join(riskFlags, "、"))
	}
	
	// 根据风险等级提供建议
	switch riskLevel {
	case "high":
		recommendations = append(recommendations, "高风险交易，建议加强监控")
	case "blocked":
		recommendations = append(recommendations, "建议暂时屏蔽该付款人")
	}
	
	return recommendations
}

// GetVerification 获取验证记录
func (s *payerVerificationService) GetVerification(ctx context.Context, payerName, payerAccount string) (*repository.PayerVerification, error) {
	return s.verificationRepo.GetByPayerInfo(ctx, payerName, payerAccount)
}

// UpdateVerificationStatus 更新验证状态
func (s *payerVerificationService) UpdateVerificationStatus(ctx context.Context, verificationID uuid.UUID, status string, reason *string) error {
	return s.verificationRepo.UpdateStatus(ctx, verificationID, status, reason)
}

// AddToBlacklist 添加到黑名单
func (s *payerVerificationService) AddToBlacklist(ctx context.Context, req *AddBlacklistRequest) error {
	blacklist := &repository.PayerBlacklist{
		ID:            uuid.New(),
		PayerName:     req.PayerName,
		PayerAccount:  req.PayerAccount,
		AccountType:   req.AccountType,
		BlacklistType: req.BlacklistType,
		Reason:        req.Reason,
		Severity:      req.Severity,
		ReportedBy:    req.ReportedBy,
		Status:        "active",
		EffectiveFrom: time.Now(),
		ExpiresAt:     req.ExpiresAt,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	
	if blacklist.Severity == "" {
		blacklist.Severity = "medium"
	}
	
	return s.blacklistRepo.Create(ctx, blacklist)
}

// RemoveFromBlacklist 从黑名单移除
func (s *payerVerificationService) RemoveFromBlacklist(ctx context.Context, id uuid.UUID) error {
	return s.blacklistRepo.Delete(ctx, id)
}

// CheckBlacklist 检查黑名单
func (s *payerVerificationService) CheckBlacklist(ctx context.Context, payerName, payerAccount string) (*BlacklistCheckResult, error) {
	blacklistEntry, err := s.blacklistRepo.GetByPayerInfo(ctx, payerName, payerAccount)
	if err != nil {
		if err == repository.ErrNotFound {
			return &BlacklistCheckResult{
				IsBlacklisted: false,
			}, nil
		}
		return nil, fmt.Errorf("查询黑名单失败: %v", err)
	}
	
	// 检查黑名单是否有效
	if blacklistEntry.Status != "active" {
		return &BlacklistCheckResult{
			IsBlacklisted: false,
		}, nil
	}
	
	// 检查是否过期
	if blacklistEntry.ExpiresAt != nil && blacklistEntry.ExpiresAt.Before(time.Now()) {
		return &BlacklistCheckResult{
			IsBlacklisted: false,
		}, nil
	}
	
	return &BlacklistCheckResult{
		IsBlacklisted:  true,
		BlacklistEntry: blacklistEntry,
		BlockReason:    blacklistEntry.Reason,
		Severity:       blacklistEntry.Severity,
	}, nil
}

// VerifyAccountMatch 验证账户匹配
func (s *payerVerificationService) VerifyAccountMatch(ctx context.Context, req *AccountMatchRequest) (*AccountMatchResult, error) {
	// 检查是否已有验证记录
	existingMatch, err := s.accountMatchRepo.GetByOrderID(ctx, req.RechargeOrderID)
	if err != nil && err != repository.ErrNotFound {
		return nil, fmt.Errorf("查询匹配验证记录失败: %v", err)
	}
	
	// 执行匹配验证
	matchScore, matchDetails, riskFlags := s.performAccountMatch(req)
	
	// 确定匹配状态
	matchStatus := "pending"
	reviewRequired := false
	
	if matchScore.GreaterThan(decimal.NewFromFloat(85.0)) {
		matchStatus = "matched"
	} else if matchScore.LessThan(decimal.NewFromFloat(60.0)) {
		matchStatus = "mismatched"
		reviewRequired = true
	} else {
		matchStatus = "manual_review"
		reviewRequired = true
	}
	
	// 创建或更新验证记录
	verification := &repository.AccountMatchVerification{
		ID:                   uuid.New(),
		RechargeOrderID:      req.RechargeOrderID,
		PayerName:            req.PayerName,
		PayerAccount:         req.PayerAccount,
		ReceiverName:         req.ReceiverName,
		ReceiverAccount:      req.ReceiverAccount,
		MatchStatus:          matchStatus,
		MatchScore:           &matchScore,
		MatchDetails:         matchDetails,
		RiskFlags:            riskFlags,
		RiskScore:            s.calculateRiskScore(riskFlags),
		ManualReviewRequired: reviewRequired,
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
	
	// 设置具体的匹配结果
	if nameMatch, ok := matchDetails["name_match"].(bool); ok {
		verification.NameMatchResult = &nameMatch
	}
	if accountMatch, ok := matchDetails["account_match"].(bool); ok {
		verification.AccountMatchResult = &accountMatch
	}
	if bankMatch, ok := matchDetails["bank_match"].(bool); ok {
		verification.BankMatchResult = &bankMatch
	}
	if amountMatch, ok := matchDetails["amount_match"].(bool); ok {
		verification.AmountMatchResult = &amountMatch
	}
	
	// 保存验证记录
	if existingMatch != nil {
		verification.ID = existingMatch.ID
		err = s.accountMatchRepo.Update(ctx, verification)
	} else {
		err = s.accountMatchRepo.Create(ctx, verification)
	}
	
	if err != nil {
		return nil, fmt.Errorf("保存匹配验证记录失败: %v", err)
	}
	
	recommendations := s.generateMatchRecommendations(matchScore, matchStatus, riskFlags)
	
	return &AccountMatchResult{
		Verification:    verification,
		MatchStatus:     matchStatus,
		MatchScore:      matchScore,
		MatchDetails:    matchDetails,
		RiskFlags:       riskFlags,
		ReviewRequired:  reviewRequired,
		Recommendations: recommendations,
	}, nil
}

// performAccountMatch 执行账户匹配验证
func (s *payerVerificationService) performAccountMatch(req *AccountMatchRequest) (decimal.Decimal, map[string]interface{}, []string) {
	score := decimal.NewFromFloat(0.0)
	details := make(map[string]interface{})
	var riskFlags []string
	
	// 1. 姓名匹配验证
	nameMatch := s.matchNames(req.PayerName, req.ReceiverName)
	details["name_match"] = nameMatch
	details["name_similarity"] = s.calculateNameSimilarity(req.PayerName, req.ReceiverName)
	
	if nameMatch {
		score = score.Add(decimal.NewFromFloat(40.0))
	} else {
		riskFlags = append(riskFlags, "付款人与收款人姓名不匹配")
		details["name_mismatch_reason"] = "姓名完全不匹配"
	}
	
	// 2. 账户匹配验证
	accountMatch := s.matchAccounts(req.PayerAccount, req.ReceiverAccount)
	details["account_match"] = accountMatch
	
	if accountMatch {
		score = score.Add(decimal.NewFromFloat(30.0))
	} else {
		score = score.Add(decimal.NewFromFloat(10.0)) // 不同账户也给一些基础分
		details["account_match_note"] = "不同账户间转账"
	}
	
	// 3. 银行匹配验证（如果提供了银行信息）
	if req.BankName != nil {
		bankMatch := s.matchBanks(*req.BankName, req.ReceiverAccount)
		details["bank_match"] = bankMatch
		
		if bankMatch {
			score = score.Add(decimal.NewFromFloat(20.0))
		} else {
			riskFlags = append(riskFlags, "银行信息不匹配")
		}
	}
	
	// 4. 金额合理性验证
	amountReasonable := s.validateAmountReasonableness(req.Amount)
	details["amount_match"] = amountReasonable
	details["amount_check"] = map[string]interface{}{
		"amount":     req.Amount,
		"reasonable": amountReasonable,
	}
	
	if amountReasonable {
		score = score.Add(decimal.NewFromFloat(10.0))
	} else {
		riskFlags = append(riskFlags, "金额异常")
	}
	
	// 确保分数在合理范围内
	if score.GreaterThan(decimal.NewFromFloat(100.0)) {
		score = decimal.NewFromFloat(100.0)
	} else if score.LessThan(decimal.NewFromFloat(0.0)) {
		score = decimal.NewFromFloat(0.0)
	}
	
	details["total_score"] = score
	details["calculation_details"] = "基于姓名、账户、银行、金额等因素综合计算"
	
	return score, details, riskFlags
}

// 匹配验证的辅助方法
func (s *payerVerificationService) matchNames(payer, receiver string) bool {
	// 简单的姓名匹配：去除空格后比较
	payer = strings.ReplaceAll(strings.TrimSpace(payer), " ", "")
	receiver = strings.ReplaceAll(strings.TrimSpace(receiver), " ", "")
	
	return strings.EqualFold(payer, receiver)
}

func (s *payerVerificationService) calculateNameSimilarity(payer, receiver string) float64 {
	// 简单的相似度计算（实际项目中可以使用更复杂的算法）
	if payer == receiver {
		return 100.0
	}
	
	// 计算最长公共子序列长度
	minLen := len(payer)
	if len(receiver) < minLen {
		minLen = len(receiver)
	}
	
	if minLen == 0 {
		return 0.0
	}
	
	common := 0
	for i := 0; i < minLen; i++ {
		if payer[i] == receiver[i] {
			common++
		}
	}
	
	return float64(common) / float64(minLen) * 100.0
}

func (s *payerVerificationService) matchAccounts(payerAccount, receiverAccount string) bool {
	return payerAccount == receiverAccount
}

func (s *payerVerificationService) matchBanks(bankName, receiverAccount string) bool {
	// 这里可以实现银行信息匹配逻辑
	// 例如根据收款账户的前缀判断银行类型
	return true // 简单实现，总是返回true
}

func (s *payerVerificationService) validateAmountReasonableness(amount decimal.Decimal) bool {
	// 验证金额是否合理
	minAmount := decimal.NewFromFloat(0.01)
	maxAmount := decimal.NewFromFloat(1000000.00)
	
	return amount.GreaterThanOrEqual(minAmount) && amount.LessThanOrEqual(maxAmount)
}

func (s *payerVerificationService) calculateRiskScore(riskFlags []string) int {
	return len(riskFlags) * 10 // 每个风险标记10分
}

func (s *payerVerificationService) generateMatchRecommendations(score decimal.Decimal, status string, riskFlags []string) []string {
	var recommendations []string
	
	switch status {
	case "matched":
		recommendations = append(recommendations, "账户匹配验证通过，可以继续处理")
	case "mismatched":
		recommendations = append(recommendations, "账户匹配度低，建议人工审核")
		if len(riskFlags) > 0 {
			recommendations = append(recommendations, "风险点："+strings.Join(riskFlags, "、"))
		}
	case "manual_review":
		recommendations = append(recommendations, "需要人工审核确认")
	}
	
	return recommendations
}

// GetAccountMatchVerification 获取账户匹配验证记录
func (s *payerVerificationService) GetAccountMatchVerification(ctx context.Context, orderID uuid.UUID) (*repository.AccountMatchVerification, error) {
	return s.accountMatchRepo.GetByOrderID(ctx, orderID)
}

// CheckDuplicatePayment 检查重复付款
func (s *payerVerificationService) CheckDuplicatePayment(ctx context.Context, req *DuplicateCheckRequest) (*DuplicateCheckResult, error) {
	windowHours := req.CheckWindowHours
	if windowHours <= 0 {
		windowHours = 24 // 默认24小时
	}
	
	// 查找可能的重复交易
	duplicates, err := s.duplicateCheckRepo.CheckDuplicates(
		ctx, 
		req.PayerName, 
		req.PayerAccount, 
		req.ReceiverAccount, 
		req.Amount, 
		windowHours,
	)
	if err != nil {
		return nil, fmt.Errorf("检查重复付款失败: %v", err)
	}
	
	// 分析重复情况
	isDuplicate := len(duplicates) > 0
	duplicateCount := len(duplicates)
	
	// 计算置信度
	confidenceScore := s.calculateDuplicateConfidence(duplicates, req)
	
	// 确定推荐动作
	actionRecommended := "allow"
	if isDuplicate {
		if confidenceScore.GreaterThan(decimal.NewFromFloat(80.0)) {
			actionRecommended = "block"
		} else if confidenceScore.GreaterThan(decimal.NewFromFloat(60.0)) {
			actionRecommended = "warn"
		} else {
			actionRecommended = "manual_review"
		}
	}
	
	// 创建检查记录
	check := &repository.DuplicatePaymentCheck{
		ID:                       uuid.New(),
		PayerName:                req.PayerName,
		PayerAccount:             req.PayerAccount,
		ReceiverAccount:          req.ReceiverAccount,
		Amount:                   req.Amount,
		CheckWindowHours:         windowHours,
		IsDuplicate:              isDuplicate,
		DuplicateCount:           duplicateCount,
		SimilarTransactionsCount: len(duplicates),
		DetectionMethod:          "exact",
		ConfidenceScore:          &confidenceScore,
		Status:                   "detected",
		ActionTaken:              &actionRecommended,
		CreatedAt:                time.Now(),
		UpdatedAt:                time.Now(),
	}
	
	// 设置原始订单ID
	if len(duplicates) > 0 {
		check.OriginalOrderID = duplicates[0].OriginalOrderID
		var relatedIDs []uuid.UUID
		for _, dup := range duplicates {
			if dup.OriginalOrderID != nil {
				relatedIDs = append(relatedIDs, *dup.OriginalOrderID)
			}
		}
		check.RelatedOrderIDs = relatedIDs
	}
	
	// 设置检测详情
	check.DetectionDetails = map[string]interface{}{
		"window_hours":     windowHours,
		"matches_found":    duplicateCount,
		"confidence":       confidenceScore,
		"detection_time":   time.Now(),
		"check_criteria": map[string]interface{}{
			"payer_name":       req.PayerName,
			"payer_account":    req.PayerAccount,
			"receiver_account": req.ReceiverAccount,
			"amount":           req.Amount,
		},
	}
	
	// 保存检查记录
	err = s.duplicateCheckRepo.Create(ctx, check)
	if err != nil {
		return nil, fmt.Errorf("保存重复付款检查记录失败: %v", err)
	}
	
	return &DuplicateCheckResult{
		Check:               check,
		IsDuplicate:         isDuplicate,
		DuplicateCount:      duplicateCount,
		SimilarTransactions: len(duplicates),
		ConfidenceScore:     confidenceScore,
		OriginalOrderID:     check.OriginalOrderID,
		ActionRecommended:   actionRecommended,
	}, nil
}

func (s *payerVerificationService) calculateDuplicateConfidence(duplicates []*repository.DuplicatePaymentCheck, req *DuplicateCheckRequest) decimal.Decimal {
	if len(duplicates) == 0 {
		return decimal.NewFromFloat(0.0)
	}
	
	confidence := decimal.NewFromFloat(50.0) // 基础置信度
	
	// 时间因素：越近的重复置信度越高
	for _, dup := range duplicates {
		timeDiff := time.Since(dup.CreatedAt)
		if timeDiff < time.Hour {
			confidence = confidence.Add(decimal.NewFromFloat(30.0))
		} else if timeDiff < 6*time.Hour {
			confidence = confidence.Add(decimal.NewFromFloat(20.0))
		} else {
			confidence = confidence.Add(decimal.NewFromFloat(10.0))
		}
	}
	
	// 数量因素：重复次数越多置信度越高
	if len(duplicates) > 1 {
		confidence = confidence.Add(decimal.NewFromFloat(float64(len(duplicates)-1) * 15.0))
	}
	
	// 确保置信度在合理范围内
	if confidence.GreaterThan(decimal.NewFromFloat(100.0)) {
		confidence = decimal.NewFromFloat(100.0)
	}
	
	return confidence
}

// GetDuplicateChecks 获取重复付款检查记录
func (s *payerVerificationService) GetDuplicateChecks(ctx context.Context, payerName, payerAccount string, hours int) ([]*repository.DuplicatePaymentCheck, error) {
	return s.duplicateCheckRepo.GetByPayerInfo(ctx, payerName, payerAccount, hours)
}

// CalculateCreditScore 计算信用评分
func (s *payerVerificationService) CalculateCreditScore(ctx context.Context, payerName, payerAccount string) (*PayerCreditScoreResult, error) {
	// 获取现有的信用评分记录
	existingScore, err := s.creditScoreRepo.GetByPayerInfo(ctx, payerName, payerAccount)
	if err != nil && err != repository.ErrNotFound {
		return nil, fmt.Errorf("查询信用评分失败: %v", err)
	}
	
	// TODO: 这里需要根据历史交易记录计算信用评分
	// 现在使用简单的实现
	
	score := 50 // 默认分数
	scoreLevel := "normal"
	var riskFactors []string
	var positiveFactors []string
	
	if existingScore != nil {
		// 基于现有记录计算
		if existingScore.SuccessfulPayments > existingScore.FailedPayments*2 {
			score += 20
			positiveFactors = append(positiveFactors, "成功交易比例高")
		}
		
		if existingScore.DisputedPayments == 0 {
			score += 10
			positiveFactors = append(positiveFactors, "无争议记录")
		} else {
			score -= existingScore.DisputedPayments * 5
			riskFactors = append(riskFactors, "存在争议交易")
		}
		
		if existingScore.RiskIncidents > 0 {
			score -= existingScore.RiskIncidents * 10
			riskFactors = append(riskFactors, "存在风险事件")
		}
	}
	
	// 确保分数在合理范围内
	if score > 100 {
		score = 100
	} else if score < 0 {
		score = 0
	}
	
	// 确定评分等级
	if score >= 90 {
		scoreLevel = "excellent"
	} else if score >= 75 {
		scoreLevel = "good"
	} else if score >= 50 {
		scoreLevel = "normal"
	} else if score >= 25 {
		scoreLevel = "poor"
	} else {
		scoreLevel = "blocked"
	}
	
	// 更新或创建信用评分记录
	now := time.Now()
	nextCalc := now.AddDate(0, 0, 7) // 一周后重新计算
	
	creditScore := &repository.PayerCreditScore{
		PayerName:            payerName,
		PayerAccount:         payerAccount,
		AccountType:          "unknown", // TODO: 从验证记录中获取
		CreditScore:          score,
		ScoreLevel:           scoreLevel,
		ScoreCalculatedAt:    now,
		NextCalculationAt:    &nextCalc,
		UpdatedAt:            now,
	}
	
	var scoreChange int
	if existingScore != nil {
		scoreChange = score - existingScore.CreditScore
		creditScore.ID = existingScore.ID
		creditScore.CreatedAt = existingScore.CreatedAt
		// 保留现有的统计数据
		creditScore.SuccessfulPayments = existingScore.SuccessfulPayments
		creditScore.FailedPayments = existingScore.FailedPayments
		creditScore.DisputedPayments = existingScore.DisputedPayments
		creditScore.TotalAmount = existingScore.TotalAmount
		creditScore.RiskIncidents = existingScore.RiskIncidents
		creditScore.BlacklistHits = existingScore.BlacklistHits
		creditScore.VerificationFailures = existingScore.VerificationFailures
		
		err = s.creditScoreRepo.Update(ctx, creditScore)
	} else {
		creditScore.ID = uuid.New()
		creditScore.CreatedAt = now
		err = s.creditScoreRepo.Create(ctx, creditScore)
	}
	
	if err != nil {
		return nil, fmt.Errorf("保存信用评分失败: %v", err)
	}
	
	return &PayerCreditScoreResult{
		CreditScore:     creditScore,
		Score:           score,
		ScoreLevel:      scoreLevel,
		ScoreChange:     scoreChange,
		RiskFactors:     riskFactors,
		PositiveFactors: positiveFactors,
	}, nil
}

// UpdateCreditScore 根据订单结果更新信用评分
func (s *payerVerificationService) UpdateCreditScore(ctx context.Context, payerName, payerAccount string, orderResult *OrderResult) error {
	factors := make(map[string]interface{})
	
	if orderResult.Success {
		factors["successful_payments"] = 1
		factors["total_amount"] = orderResult.Amount
	} else {
		factors["failed_payments"] = 1
	}
	
	if orderResult.IsDisputed {
		factors["disputed_payments"] = 1
		factors["risk_incidents"] = 1
	}
	
	return s.creditScoreRepo.UpdateScoreFactors(ctx, payerName, payerAccount, factors)
}

// GetCreditScore 获取信用评分
func (s *payerVerificationService) GetCreditScore(ctx context.Context, payerName, payerAccount string) (*repository.PayerCreditScore, error) {
	return s.creditScoreRepo.GetByPayerInfo(ctx, payerName, payerAccount)
}

// AssessRisk 综合风险评估
func (s *payerVerificationService) AssessRisk(ctx context.Context, req *RiskAssessmentRequest) (*RiskAssessmentResult, error) {
	var riskFactors []RiskFactor
	var recommendations []string
	totalRiskScore := 0
	
	// 1. 身份验证评估
	verificationReq := &PayerVerificationRequest{
		PayerName:    req.PayerName,
		PayerAccount: req.PayerAccount,
		AccountType:  req.AccountType,
	}
	
	verificationResult, err := s.VerifyPayer(ctx, verificationReq)
	if err == nil {
		if verificationResult.VerificationScore < 60 {
			riskFactors = append(riskFactors, RiskFactor{
				Type:        "verification",
				Description: "身份验证分数过低",
				Impact:      "high",
				Weight:      25,
			})
			totalRiskScore += 25
		}
		
		if verificationResult.RiskLevel == "high" || verificationResult.RiskLevel == "blocked" {
			riskFactors = append(riskFactors, RiskFactor{
				Type:        "verification",
				Description: "身份验证风险等级高",
				Impact:      "high",
				Weight:      30,
			})
			totalRiskScore += 30
		}
	}
	
	// 2. 黑名单检查
	blacklistResult, err := s.CheckBlacklist(ctx, req.PayerName, req.PayerAccount)
	if err == nil && blacklistResult.IsBlacklisted {
		riskFactors = append(riskFactors, RiskFactor{
			Type:        "blacklist",
			Description: "用户在黑名单中: " + blacklistResult.BlockReason,
			Impact:      "critical",
			Weight:      50,
		})
		totalRiskScore += 50
	}
	
	// 3. 重复付款检查
	duplicateReq := &DuplicateCheckRequest{
		PayerName:        req.PayerName,
		PayerAccount:     req.PayerAccount,
		ReceiverAccount:  req.ReceiverAccount,
		Amount:           req.Amount,
		CheckWindowHours: 24,
	}
	
	duplicateResult, err := s.CheckDuplicatePayment(ctx, duplicateReq)
	if err == nil && duplicateResult.IsDuplicate {
		if duplicateResult.ConfidenceScore.GreaterThan(decimal.NewFromFloat(80.0)) {
			riskFactors = append(riskFactors, RiskFactor{
				Type:        "duplicate",
				Description: "高置信度重复付款",
				Impact:      "high",
				Weight:      20,
			})
			totalRiskScore += 20
		} else if duplicateResult.DuplicateCount > 1 {
			riskFactors = append(riskFactors, RiskFactor{
				Type:        "duplicate",
				Description: "多次重复付款",
				Impact:      "medium",
				Weight:      15,
			})
			totalRiskScore += 15
		}
	}
	
	// 4. 信用评分检查
	creditResult, err := s.CalculateCreditScore(ctx, req.PayerName, req.PayerAccount)
	if err == nil {
		if creditResult.Score < 30 {
			riskFactors = append(riskFactors, RiskFactor{
				Type:        "credit",
				Description: "信用评分过低",
				Impact:      "high",
				Weight:      25,
			})
			totalRiskScore += 25
		}
	}
	
	// 确保风险分数在合理范围内
	if totalRiskScore > 100 {
		totalRiskScore = 100
	}
	
	// 确定风险等级
	riskLevel := "low"
	actionRequired := "allow"
	
	if totalRiskScore >= 80 {
		riskLevel = "critical"
		actionRequired = "block"
		recommendations = append(recommendations, "风险过高，建议拒绝交易")
	} else if totalRiskScore >= 60 {
		riskLevel = "high"
		actionRequired = "review"
		recommendations = append(recommendations, "高风险交易，需要人工审核")
	} else if totalRiskScore >= 40 {
		riskLevel = "medium"
		actionRequired = "warn"
		recommendations = append(recommendations, "中等风险，建议加强监控")
	} else {
		riskLevel = "low"
		actionRequired = "allow"
		recommendations = append(recommendations, "风险较低，可以正常处理")
	}
	
	return &RiskAssessmentResult{
		RiskScore:          totalRiskScore,
		RiskLevel:          riskLevel,
		RiskFactors:        riskFactors,
		Recommendations:    recommendations,
		ActionRequired:     actionRequired,
		VerificationResult: verificationResult,
		BlacklistResult:    blacklistResult,
		DuplicateResult:    duplicateResult,
		CreditScoreResult:  creditResult,
	}, nil
}

// 工具函数
func stringPtr(s string) *string {
	return &s
}