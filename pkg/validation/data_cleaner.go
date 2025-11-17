package validation

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/shopspring/decimal"
)

// DataCleaner provides data standardization and cleaning utilities
type DataCleaner struct {
	// Regex patterns for cleaning
	phoneCleanRegex    *regexp.Regexp
	amountCleanRegex   *regexp.Regexp
	accountCleanRegex  *regexp.Regexp
	nameCleanRegex     *regexp.Regexp
}

// NewDataCleaner creates a new data cleaner
func NewDataCleaner() *DataCleaner {
	return &DataCleaner{
		phoneCleanRegex:   regexp.MustCompile(`[^\d]`),
		amountCleanRegex:  regexp.MustCompile(`[^\d.]`),
		accountCleanRegex: regexp.MustCompile(`\s+`),
		nameCleanRegex:    regexp.MustCompile(`\s+`),
	}
}

// CleanedData represents cleaned and standardized data
type CleanedData struct {
	Original string `json:"original"`
	Cleaned  string `json:"cleaned"`
	Changed  bool   `json:"changed"`
}

// CleanPhoneNumber cleans and standardizes phone number
func (c *DataCleaner) CleanPhoneNumber(phone string) CleanedData {
	original := phone
	
	// Remove all non-digit characters
	cleaned := c.phoneCleanRegex.ReplaceAllString(phone, "")
	
	// Handle different phone number formats
	if strings.HasPrefix(cleaned, "86") && len(cleaned) == 13 {
		// Remove country code +86
		cleaned = cleaned[2:]
	} else if strings.HasPrefix(cleaned, "086") && len(cleaned) == 14 {
		// Remove country code 086
		cleaned = cleaned[3:]
	}
	
	// Ensure it starts with 1 for Chinese mobile numbers
	if len(cleaned) == 11 && !strings.HasPrefix(cleaned, "1") {
		// This might be an invalid number, keep as is
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanAmount cleans and standardizes amount
func (c *DataCleaner) CleanAmount(amount string) CleanedData {
	original := amount
	
	// Remove currency symbols and spaces
	cleaned := strings.TrimSpace(amount)
	cleaned = strings.ReplaceAll(cleaned, "¥", "")
	cleaned = strings.ReplaceAll(cleaned, "￥", "")
	cleaned = strings.ReplaceAll(cleaned, "元", "")
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.ReplaceAll(cleaned, "，", "")
	cleaned = strings.TrimSpace(cleaned)
	
	// Handle Chinese number characters
	chineseNumbers := map[string]string{
		"零": "0", "一": "1", "二": "2", "三": "3", "四": "4",
		"五": "5", "六": "6", "七": "7", "八": "8", "九": "9",
		"十": "10", "百": "00", "千": "000", "万": "0000",
	}
	
	for chinese, arabic := range chineseNumbers {
		cleaned = strings.ReplaceAll(cleaned, chinese, arabic)
	}
	
	// Validate decimal format
	if cleaned != "" {
		if decimal, err := decimal.NewFromString(cleaned); err == nil {
			// Format to standard decimal with max 2 decimal places
			cleaned = decimal.StringFixed(2)
			// Remove trailing zeros after decimal point
			if strings.Contains(cleaned, ".") {
				cleaned = strings.TrimRight(cleaned, "0")
				cleaned = strings.TrimRight(cleaned, ".")
			}
		}
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanAccountNumber cleans and standardizes account number
func (c *DataCleaner) CleanAccountNumber(account string) CleanedData {
	original := account
	
	// Remove spaces and special characters
	cleaned := strings.TrimSpace(account)
	cleaned = c.accountCleanRegex.ReplaceAllString(cleaned, "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, "_", "")
	
	// Convert to uppercase for consistency (for non-numeric accounts)
	if !isNumeric(cleaned) {
		cleaned = strings.ToUpper(cleaned)
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanName cleans and standardizes name
func (c *DataCleaner) CleanName(name string) CleanedData {
	original := name
	
	// Trim spaces
	cleaned := strings.TrimSpace(name)
	
	// Replace multiple spaces with single space
	cleaned = c.nameCleanRegex.ReplaceAllString(cleaned, " ")
	
	// Remove control characters
	var result strings.Builder
	for _, r := range cleaned {
		if !unicode.IsControl(r) {
			result.WriteRune(r)
		}
	}
	cleaned = result.String()
	
	// Capitalize first letter of each word for English names
	if isEnglishName(cleaned) {
		words := strings.Fields(cleaned)
		for i, word := range words {
			if len(word) > 0 {
				words[i] = strings.ToUpper(string(word[0])) + strings.ToLower(word[1:])
			}
		}
		cleaned = strings.Join(words, " ")
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanEmail cleans and standardizes email
func (c *DataCleaner) CleanEmail(email string) CleanedData {
	original := email
	
	// Trim spaces and convert to lowercase
	cleaned := strings.TrimSpace(strings.ToLower(email))
	
	// Remove dots from Gmail addresses (Gmail ignores dots)
	if strings.Contains(cleaned, "@gmail.com") {
		parts := strings.Split(cleaned, "@")
		if len(parts) == 2 {
			localPart := strings.ReplaceAll(parts[0], ".", "")
			cleaned = localPart + "@" + parts[1]
		}
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanBankAccount cleans and standardizes bank account
func (c *DataCleaner) CleanBankAccount(account string) CleanedData {
	original := account
	
	// Remove all non-digit characters for bank accounts
	cleaned := c.phoneCleanRegex.ReplaceAllString(account, "")
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanMerchantCode cleans and standardizes merchant code
func (c *DataCleaner) CleanMerchantCode(code string) CleanedData {
	original := code
	
	// Trim spaces and convert to uppercase
	cleaned := strings.TrimSpace(strings.ToUpper(code))
	
	// Remove invalid characters, keep only alphanumeric and underscore
	var result strings.Builder
	for _, r := range cleaned {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' {
			result.WriteRune(r)
		}
	}
	cleaned = result.String()
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanOrderNumber cleans and standardizes order number
func (c *DataCleaner) CleanOrderNumber(orderNumber string) CleanedData {
	original := orderNumber
	
	// Trim spaces and convert to uppercase
	cleaned := strings.TrimSpace(strings.ToUpper(orderNumber))
	
	// Remove invalid characters, keep only alphanumeric
	var result strings.Builder
	for _, r := range cleaned {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			result.WriteRune(r)
		}
	}
	cleaned = result.String()
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanRemark cleans and standardizes remark text
func (c *DataCleaner) CleanRemark(remark string) CleanedData {
	original := remark
	
	// Trim spaces
	cleaned := strings.TrimSpace(remark)
	
	// Replace multiple spaces with single space
	cleaned = c.nameCleanRegex.ReplaceAllString(cleaned, " ")
	
	// Remove control characters except newlines and tabs
	var result strings.Builder
	for _, r := range cleaned {
		if r == '\n' || r == '\t' || !unicode.IsControl(r) {
			result.WriteRune(r)
		}
	}
	cleaned = result.String()
	
	// Limit length
	if len(cleaned) > 500 {
		cleaned = cleaned[:500]
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// StandardizePaymentType standardizes payment type values
func (c *DataCleaner) StandardizePaymentType(paymentType string) CleanedData {
	original := paymentType
	cleaned := strings.TrimSpace(strings.ToLower(paymentType))
	
	// Map various inputs to standard values
	switch cleaned {
	case "对公", "公对公", "bank", "银行", "银行转账":
		cleaned = "public"
	case "对私", "私对私", "个人", "personal":
		cleaned = "private"
	default:
		// Keep original if not recognized
		cleaned = original
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// StandardizeAccountType standardizes account type values
func (c *DataCleaner) StandardizeAccountType(accountType string) CleanedData {
	original := accountType
	cleaned := strings.TrimSpace(strings.ToLower(accountType))
	
	// Map various inputs to standard values
	switch cleaned {
	case "支付宝", "alipay", "zfb":
		cleaned = "alipay"
	case "微信", "微信支付", "wechat", "weixin", "wx":
		cleaned = "wechat"
	case "银行", "银行卡", "bank", "bankcard":
		cleaned = "bank"
	case "其他", "other":
		cleaned = "other"
	default:
		// Keep original if not recognized
		cleaned = original
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// StandardizeStatus standardizes status values
func (c *DataCleaner) StandardizeStatus(status string) CleanedData {
	original := status
	cleaned := strings.TrimSpace(strings.ToLower(status))
	
	// Map various inputs to standard values
	statusMap := map[string]string{
		"待处理": "pending",
		"处理中": "pending",
		"已支付": "paid",
		"已付款": "paid",
		"已确认": "confirmed",
		"确认":   "confirmed",
		"已拒绝": "rejected",
		"拒绝":   "rejected",
		"已退款": "refunded",
		"退款":   "refunded",
		"已取消": "cancelled",
		"取消":   "cancelled",
		"激活":   "active",
		"活跃":   "active",
		"停用":   "inactive",
		"禁用":   "inactive",
	}
	
	if standardValue, exists := statusMap[cleaned]; exists {
		cleaned = standardValue
	}
	
	return CleanedData{
		Original: original,
		Cleaned:  cleaned,
		Changed:  original != cleaned,
	}
}

// CleanAndValidateRechargeOrder cleans all fields in a recharge order
func (c *DataCleaner) CleanAndValidateRechargeOrder(req *RechargeOrderCleanRequest) *RechargeOrderCleanResult {
	return &RechargeOrderCleanResult{
		PayerName:    c.CleanName(req.PayerName),
		PayerAccount: c.CleanAccountNumber(req.PayerAccount),
		PaymentType:  c.StandardizePaymentType(req.PaymentType),
		Amount:       c.CleanAmount(req.Amount),
		MerchantName: c.CleanName(req.MerchantName),
		AdAccount:    c.CleanAccountNumber(req.AdAccount),
		Remark:       c.CleanRemark(req.Remark),
	}
}

// CleanAndValidateMerchant cleans all fields in a merchant
func (c *DataCleaner) CleanAndValidateMerchant(req *MerchantCleanRequest) *MerchantCleanResult {
	return &MerchantCleanResult{
		Name:          c.CleanName(req.Name),
		Code:          c.CleanMerchantCode(req.Code),
		ContactPerson: c.CleanName(req.ContactPerson),
		ContactPhone:  c.CleanPhoneNumber(req.ContactPhone),
		ContactEmail:  c.CleanEmail(req.ContactEmail),
		DailyLimit:    c.CleanAmount(req.DailyLimit),
		SingleLimit:   c.CleanAmount(req.SingleLimit),
		Status:        c.StandardizeStatus(req.Status),
	}
}

// CleanAndValidateReceiveAccount cleans all fields in a receive account
func (c *DataCleaner) CleanAndValidateReceiveAccount(req *ReceiveAccountCleanRequest) *ReceiveAccountCleanResult {
	return &ReceiveAccountCleanResult{
		AccountName:   c.CleanName(req.AccountName),
		AccountNumber: c.CleanAccountNumber(req.AccountNumber),
		AccountType:   c.StandardizeAccountType(req.AccountType),
		BankName:      c.CleanName(req.BankName),
		BankBranch:    c.CleanName(req.BankBranch),
		AccountHolder: c.CleanName(req.AccountHolder),
		PaymentType:   c.StandardizePaymentType(req.PaymentType),
		DailyLimit:    c.CleanAmount(req.DailyLimit),
		SingleLimit:   c.CleanAmount(req.SingleLimit),
		Status:        c.StandardizeStatus(req.Status),
	}
}

// Helper functions

func isNumeric(s string) bool {
	for _, r := range s {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return len(s) > 0
}

func isEnglishName(s string) bool {
	for _, r := range s {
		if !unicode.IsLetter(r) && !unicode.IsSpace(r) {
			return false
		}
		if r > 127 { // Non-ASCII character
			return false
		}
	}
	return true
}

// Request and result types

type RechargeOrderCleanRequest struct {
	PayerName    string `json:"payer_name"`
	PayerAccount string `json:"payer_account"`
	PaymentType  string `json:"payment_type"`
	Amount       string `json:"amount"`
	MerchantName string `json:"merchant_name"`
	AdAccount    string `json:"ad_account"`
	Remark       string `json:"remark"`
}

type RechargeOrderCleanResult struct {
	PayerName    CleanedData `json:"payer_name"`
	PayerAccount CleanedData `json:"payer_account"`
	PaymentType  CleanedData `json:"payment_type"`
	Amount       CleanedData `json:"amount"`
	MerchantName CleanedData `json:"merchant_name"`
	AdAccount    CleanedData `json:"ad_account"`
	Remark       CleanedData `json:"remark"`
}

type MerchantCleanRequest struct {
	Name          string `json:"name"`
	Code          string `json:"code"`
	ContactPerson string `json:"contact_person"`
	ContactPhone  string `json:"contact_phone"`
	ContactEmail  string `json:"contact_email"`
	DailyLimit    string `json:"daily_limit"`
	SingleLimit   string `json:"single_limit"`
	Status        string `json:"status"`
}

type MerchantCleanResult struct {
	Name          CleanedData `json:"name"`
	Code          CleanedData `json:"code"`
	ContactPerson CleanedData `json:"contact_person"`
	ContactPhone  CleanedData `json:"contact_phone"`
	ContactEmail  CleanedData `json:"contact_email"`
	DailyLimit    CleanedData `json:"daily_limit"`
	SingleLimit   CleanedData `json:"single_limit"`
	Status        CleanedData `json:"status"`
}

type ReceiveAccountCleanRequest struct {
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
	AccountType   string `json:"account_type"`
	BankName      string `json:"bank_name"`
	BankBranch    string `json:"bank_branch"`
	AccountHolder string `json:"account_holder"`
	PaymentType   string `json:"payment_type"`
	DailyLimit    string `json:"daily_limit"`
	SingleLimit   string `json:"single_limit"`
	Status        string `json:"status"`
}

type ReceiveAccountCleanResult struct {
	AccountName   CleanedData `json:"account_name"`
	AccountNumber CleanedData `json:"account_number"`
	AccountType   CleanedData `json:"account_type"`
	BankName      CleanedData `json:"bank_name"`
	BankBranch    CleanedData `json:"bank_branch"`
	AccountHolder CleanedData `json:"account_holder"`
	PaymentType   CleanedData `json:"payment_type"`
	DailyLimit    CleanedData `json:"daily_limit"`
	SingleLimit   CleanedData `json:"single_limit"`
	Status        CleanedData `json:"status"`
}