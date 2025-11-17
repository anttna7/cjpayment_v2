package polling

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/pkg/errors"
)

// PollingRule 轮询规则接口
type PollingRule interface {
	SelectAccount(accounts []*PaymentAccount, amount float64) (*PaymentAccount, error)
	GetName() string
	GetType() string
}

// PaymentAccount 收款账户信息
type PaymentAccount struct {
	ID              int64   `json:"id"`
	AccountNumber   string  `json:"account_number"`
	InstitutionType string  `json:"institution_type"`
	InstitutionName string  `json:"institution_name"`
	AccountName     string  `json:"account_name"`
	PaymentType     string  `json:"payment_type"`
	DailyLimit      float64 `json:"daily_limit"`
	SingleLimit     float64 `json:"single_limit"`
	BankBranch      string  `json:"bank_branch,omitempty"`
	Status          string  `json:"status"`
	Weight          int     `json:"weight,omitempty"`
	Priority        int     `json:"priority,omitempty"`
}

// RoundRobinRule 轮询规则
type RoundRobinRule struct {
	name        string
	counter     int
	mutex       sync.Mutex
	lastAccount int64
}

// NewRoundRobinRule 创建轮询规则
func NewRoundRobinRule(name string) *RoundRobinRule {
	return &RoundRobinRule{
		name:    name,
		counter: 0,
	}
}

func (r *RoundRobinRule) GetName() string {
	return r.name
}

func (r *RoundRobinRule) GetType() string {
	return "round_robin"
}

func (r *RoundRobinRule) SelectAccount(accounts []*PaymentAccount, amount float64) (*PaymentAccount, error) {
	if len(accounts) == 0 {
		return nil, errors.New("没有可用的收款账户")
	}

	r.mutex.Lock()
	defer r.mutex.Unlock()

	// 过滤可用账户
	validAccounts := make([]*PaymentAccount, 0)
	for _, account := range accounts {
		if account.Status == "active" && 
		   account.SingleLimit >= amount {
			validAccounts = append(validAccounts, account)
		}
	}

	if len(validAccounts) == 0 {
		return nil, errors.New("没有满足条件的收款账户")
	}

	// 轮询选择
	selectedIndex := r.counter % len(validAccounts)
	r.counter++

	return validAccounts[selectedIndex], nil
}

// WeightedRule 加权规则
type WeightedRule struct {
	name string
}

func NewWeightedRule(name string) *WeightedRule {
	return &WeightedRule{name: name}
}

func (w *WeightedRule) GetName() string {
	return w.name
}

func (w *WeightedRule) GetType() string {
	return "weight"
}

func (w *WeightedRule) SelectAccount(accounts []*PaymentAccount, amount float64) (*PaymentAccount, error) {
	if len(accounts) == 0 {
		return nil, errors.New("没有可用的收款账户")
	}

	// 过滤可用账户
	validAccounts := make([]*PaymentAccount, 0)
	totalWeight := 0
	
	for _, account := range accounts {
		if account.Status == "active" && account.SingleLimit >= amount {
			weight := account.Weight
			if weight <= 0 {
				weight = 1
			}
			account.Weight = weight
			validAccounts = append(validAccounts, account)
			totalWeight += weight
		}
	}

	if len(validAccounts) == 0 {
		return nil, errors.New("没有满足条件的收款账户")
	}

	// 加权随机选择
	rand.Seed(time.Now().UnixNano())
	randomWeight := rand.Intn(totalWeight)
	currentWeight := 0

	for _, account := range validAccounts {
		currentWeight += account.Weight
		if currentWeight > randomWeight {
			return account, nil
		}
	}

	// 兜底返回第一个
	return validAccounts[0], nil
}

// AmountBasedRule 金额分层规则
type AmountBasedRule struct {
	name   string
	config *AmountBasedConfig
}

type AmountBasedConfig struct {
	Tiers []AmountTier `json:"tiers"`
}

type AmountTier struct {
	MinAmount  float64 `json:"min_amount"`
	MaxAmount  float64 `json:"max_amount"`
	AccountIDs []int64 `json:"account_ids"`
	RuleType   string  `json:"rule_type"` // round_robin, weight
}

func NewAmountBasedRule(name string, configData map[string]interface{}) (*AmountBasedRule, error) {
	configJSON, err := json.Marshal(configData)
	if err != nil {
		return nil, errors.Wrap(err, "序列化配置失败")
	}

	var config AmountBasedConfig
	if err := json.Unmarshal(configJSON, &config); err != nil {
		return nil, errors.Wrap(err, "解析配置失败")
	}

	return &AmountBasedRule{
		name:   name,
		config: &config,
	}, nil
}

func (a *AmountBasedRule) GetName() string {
	return a.name
}

func (a *AmountBasedRule) GetType() string {
	return "amount_based"
}

func (a *AmountBasedRule) SelectAccount(accounts []*PaymentAccount, amount float64) (*PaymentAccount, error) {
	if len(accounts) == 0 {
		return nil, errors.New("没有可用的收款账户")
	}

	// 找到匹配的金额分层
	var matchedTier *AmountTier
	for i := range a.config.Tiers {
		tier := &a.config.Tiers[i]
		if amount >= tier.MinAmount && amount <= tier.MaxAmount {
			matchedTier = tier
			break
		}
	}

	if matchedTier == nil {
		return nil, errors.New("金额不在配置的分层范围内")
	}

	// 过滤指定的账户
	var filteredAccounts []*PaymentAccount
	for _, account := range accounts {
		for _, accountID := range matchedTier.AccountIDs {
			if account.ID == accountID && 
			   account.Status == "active" && 
			   account.SingleLimit >= amount {
				filteredAccounts = append(filteredAccounts, account)
				break
			}
		}
	}

	if len(filteredAccounts) == 0 {
		return nil, errors.New("没有满足条件的收款账户")
	}

	// 根据分层配置的规则选择账户
	switch matchedTier.RuleType {
	case "weight":
		weightedRule := NewWeightedRule(a.name + "_weighted")
		return weightedRule.SelectAccount(filteredAccounts, amount)
	default: // round_robin
		roundRobinRule := NewRoundRobinRule(a.name + "_round_robin")
		return roundRobinRule.SelectAccount(filteredAccounts, amount)
	}
}

// PollingManager 轮询管理器
type PollingManager struct {
	db    *sql.DB
	rules map[string]PollingRule
	mutex sync.RWMutex
}

// NewPollingManager 创建轮询管理器
func NewPollingManager(db *sql.DB) *PollingManager {
	return &PollingManager{
		db:    db,
		rules: make(map[string]PollingRule),
	}
}

// LoadRules 从数据库加载轮询规则
func (pm *PollingManager) LoadRules() error {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	query := `
		SELECT id, rule_name, payment_type, rule_type, rule_config 
		FROM polling_rules 
		WHERE status = 'active'
	`

	rows, err := pm.db.Query(query)
	if err != nil {
		return errors.Wrap(err, "查询轮询规则失败")
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var ruleName, paymentType, ruleType string
		var configJSON string

		if err := rows.Scan(&id, &ruleName, &paymentType, &ruleType, &configJSON); err != nil {
			continue
		}

		ruleKey := fmt.Sprintf("%s_%s", paymentType, ruleName)

		switch ruleType {
		case "round_robin":
			pm.rules[ruleKey] = NewRoundRobinRule(ruleName)
		case "weight":
			pm.rules[ruleKey] = NewWeightedRule(ruleName)
		case "amount_based":
			var config map[string]interface{}
			if err := json.Unmarshal([]byte(configJSON), &config); err == nil {
				if rule, err := NewAmountBasedRule(ruleName, config); err == nil {
					pm.rules[ruleKey] = rule
				}
			}
		}
	}

	return nil
}

// SelectPaymentAccount 选择收款账户
func (pm *PollingManager) SelectPaymentAccount(paymentType string, amount float64) (*PaymentAccount, error) {
	// 获取可用收款账户
	accounts, err := pm.getAvailableAccounts(paymentType)
	if err != nil {
		return nil, err
	}

	if len(accounts) == 0 {
		return nil, errors.New("没有可用的收款账户")
	}

	// 查找匹配的轮询规则
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	// 优先查找专用规则
	for ruleKey, rule := range pm.rules {
		if fmt.Sprintf("%s_", paymentType) == ruleKey[:len(paymentType)+1] {
			if selectedAccount, err := rule.SelectAccount(accounts, amount); err == nil {
				return selectedAccount, nil
			}
		}
	}

	// 回退到默认轮询
	defaultRule := NewRoundRobinRule("default")
	return defaultRule.SelectAccount(accounts, amount)
}

// getAvailableAccounts 获取可用收款账户
func (pm *PollingManager) getAvailableAccounts(paymentType string) ([]*PaymentAccount, error) {
	query := `
		SELECT pa.id, pa.account_number, pa.institution_type, pa.institution_name, 
		       pa.account_name, pa.payment_type, pa.daily_limit, pa.single_limit, 
		       pa.bank_branch, pa.account_status,
		       COALESCE(pra.weight, 1) as weight,
		       COALESCE(pra.priority, 0) as priority
		FROM payment_accounts pa
		LEFT JOIN polling_rule_accounts pra ON pa.id = pra.account_id AND pra.status = 'active'
		WHERE pa.account_status = 'active' 
		AND pa.payment_type = ?
		ORDER BY COALESCE(pra.priority, 0) DESC, pa.id ASC
	`

	rows, err := pm.db.Query(query, paymentType)
	if err != nil {
		return nil, errors.Wrap(err, "查询收款账户失败")
	}
	defer rows.Close()

	var accounts []*PaymentAccount
	for rows.Next() {
		account := &PaymentAccount{}
		var bankBranch sql.NullString

		if err := rows.Scan(
			&account.ID,
			&account.AccountNumber,
			&account.InstitutionType,
			&account.InstitutionName,
			&account.AccountName,
			&account.PaymentType,
			&account.DailyLimit,
			&account.SingleLimit,
			&bankBranch,
			&account.Status,
			&account.Weight,
			&account.Priority,
		); err != nil {
			continue
		}

		if bankBranch.Valid {
			account.BankBranch = bankBranch.String
		}

		accounts = append(accounts, account)
	}

	return accounts, nil
}

// CreateRule 创建轮询规则
func (pm *PollingManager) CreateRule(ruleName, paymentType, ruleType string, config map[string]interface{}) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return errors.Wrap(err, "序列化配置失败")
	}

	query := `
		INSERT INTO polling_rules (rule_name, payment_type, rule_type, rule_config, status) 
		VALUES (?, ?, ?, ?, 'active')
	`

	_, err = pm.db.Exec(query, ruleName, paymentType, ruleType, string(configJSON))
	if err != nil {
		return errors.Wrap(err, "创建轮询规则失败")
	}

	// 重新加载规则
	return pm.LoadRules()
}

// UpdateRule 更新轮询规则
func (pm *PollingManager) UpdateRule(ruleID int64, config map[string]interface{}) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return errors.Wrap(err, "序列化配置失败")
	}

	query := `UPDATE polling_rules SET rule_config = ?, updated_at = NOW() WHERE id = ?`
	
	_, err = pm.db.Exec(query, string(configJSON), ruleID)
	if err != nil {
		return errors.Wrap(err, "更新轮询规则失败")
	}

	// 重新加载规则
	return pm.LoadRules()
}

// DeleteRule 删除轮询规则
func (pm *PollingManager) DeleteRule(ruleID int64) error {
	tx, err := pm.db.Begin()
	if err != nil {
		return errors.Wrap(err, "开始事务失败")
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 删除规则关联的账户
	_, err = tx.Exec("DELETE FROM polling_rule_accounts WHERE rule_id = ?", ruleID)
	if err != nil {
		return errors.Wrap(err, "删除规则账户关联失败")
	}

	// 删除规则
	_, err = tx.Exec("DELETE FROM polling_rules WHERE id = ?", ruleID)
	if err != nil {
		return errors.Wrap(err, "删除轮询规则失败")
	}

	if err = tx.Commit(); err != nil {
		return errors.Wrap(err, "提交事务失败")
	}

	// 重新加载规则
	return pm.LoadRules()
}

// AddAccountToRule 添加账户到规则
func (pm *PollingManager) AddAccountToRule(ruleID, accountID int64, weight, priority int) error {
	query := `
		INSERT INTO polling_rule_accounts (rule_id, account_id, weight, priority, status) 
		VALUES (?, ?, ?, ?, 'active')
		ON DUPLICATE KEY UPDATE weight = ?, priority = ?, status = 'active'
	`

	_, err := pm.db.Exec(query, ruleID, accountID, weight, priority, weight, priority)
	if err != nil {
		return errors.Wrap(err, "添加账户到规则失败")
	}

	return nil
}

// RemoveAccountFromRule 从规则中移除账户
func (pm *PollingManager) RemoveAccountFromRule(ruleID, accountID int64) error {
	query := `DELETE FROM polling_rule_accounts WHERE rule_id = ? AND account_id = ?`
	
	_, err := pm.db.Exec(query, ruleID, accountID)
	if err != nil {
		return errors.Wrap(err, "从规则中移除账户失败")
	}

	return nil
}

// GetRuleStats 获取规则统计信息
func (pm *PollingManager) GetRuleStats(ruleID int64) (*RuleStats, error) {
	query := `
		SELECT 
			COUNT(DISTINCT pra.account_id) as account_count,
			COUNT(DISTINCT ro.id) as order_count,
			COALESCE(SUM(ro.payment_amount), 0) as total_amount
		FROM polling_rules pr
		LEFT JOIN polling_rule_accounts pra ON pr.id = pra.rule_id
		LEFT JOIN recharge_orders ro ON pra.account_id = ro.receiver_account_id 
		    AND ro.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		WHERE pr.id = ?
		GROUP BY pr.id
	`

	var stats RuleStats
	err := pm.db.QueryRow(query, ruleID).Scan(
		&stats.AccountCount,
		&stats.OrderCount,
		&stats.TotalAmount,
	)

	if err != nil && err != sql.ErrNoRows {
		return nil, errors.Wrap(err, "查询规则统计失败")
	}

	stats.RuleID = ruleID
	return &stats, nil
}

// RuleStats 规则统计信息
type RuleStats struct {
	RuleID       int64   `json:"rule_id"`
	AccountCount int     `json:"account_count"`
	OrderCount   int     `json:"order_count"`
	TotalAmount  float64 `json:"total_amount"`
}

// GetAllRules 获取所有规则
func (pm *PollingManager) GetAllRules() ([]*RuleInfo, error) {
	query := `
		SELECT id, rule_name, payment_type, rule_type, rule_config, status, created_at, updated_at
		FROM polling_rules
		ORDER BY created_at DESC
	`

	rows, err := pm.db.Query(query)
	if err != nil {
		return nil, errors.Wrap(err, "查询轮询规则失败")
	}
	defer rows.Close()

	var rules []*RuleInfo
	for rows.Next() {
		rule := &RuleInfo{}
		if err := rows.Scan(
			&rule.ID,
			&rule.RuleName,
			&rule.PaymentType,
			&rule.RuleType,
			&rule.RuleConfig,
			&rule.Status,
			&rule.CreatedAt,
			&rule.UpdatedAt,
		); err != nil {
			continue
		}

		rules = append(rules, rule)
	}

	return rules, nil
}

// RuleInfo 规则信息
type RuleInfo struct {
	ID          int64     `json:"id"`
	RuleName    string    `json:"rule_name"`
	PaymentType string    `json:"payment_type"`
	RuleType    string    `json:"rule_type"`
	RuleConfig  string    `json:"rule_config"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TestRuleSelection 测试规则选择
func (pm *PollingManager) TestRuleSelection(paymentType string, amount float64, testCount int) (*TestResult, error) {
	result := &TestResult{
		PaymentType: paymentType,
		Amount:      amount,
		TestCount:   testCount,
		Results:     make(map[int64]int),
	}

	for i := 0; i < testCount; i++ {
		account, err := pm.SelectPaymentAccount(paymentType, amount)
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}

		result.Results[account.ID]++
		result.SuccessCount++
	}

	return result, nil
}

// TestResult 测试结果
type TestResult struct {
	PaymentType  string            `json:"payment_type"`
	Amount       float64           `json:"amount"`
	TestCount    int               `json:"test_count"`
	SuccessCount int               `json:"success_count"`
	Results      map[int64]int     `json:"results"`
	Errors       []string          `json:"errors"`
}