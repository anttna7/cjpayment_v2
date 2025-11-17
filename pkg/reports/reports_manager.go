package reports

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/360EntSecGroup-Skylar/excelize/v2"
	"github.com/pkg/errors"
)

// ReportsManager 报表管理器
type ReportsManager struct {
	db *sql.DB
}

// NewReportsManager 创建报表管理器
func NewReportsManager(db *sql.DB) *ReportsManager {
	return &ReportsManager{
		db: db,
	}
}

// OverviewData 概览数据
type OverviewData struct {
	TotalOrders      int     `json:"total_orders"`
	TotalAmount      float64 `json:"total_amount"`
	AvgAmount        float64 `json:"avg_amount"`
	SuccessOrders    int     `json:"success_orders"`
	SuccessRate      float64 `json:"success_rate"`
	FailedOrders     int     `json:"failed_orders"`
	BusinessPayments int     `json:"business_payments"`
	PersonalPayments int     `json:"personal_payments"`
	BusinessRatio    float64 `json:"business_ratio"`
	Growth           *GrowthData `json:"growth,omitempty"`
}

// GrowthData 增长数据
type GrowthData struct {
	RechargeGrowth     float64 `json:"recharge_growth"`
	SuccessRateChange  float64 `json:"success_rate_change"`
}

// TrendDataPoint 趋势数据点
type TrendDataPoint struct {
	Date   string  `json:"date"`
	Orders int     `json:"orders"`
	Amount float64 `json:"amount"`
}

// PaymentTypeData 支付方式数据
type PaymentTypeData struct {
	Business int `json:"business"`
	Personal int `json:"personal"`
}

// ChartData 图表数据
type ChartData struct {
	Trend        []TrendDataPoint `json:"trend"`
	PaymentTypes PaymentTypeData  `json:"payment_types"`
}

// TopMerchant 热门商户
type TopMerchant struct {
	CompanyName  string  `json:"company_name"`
	OrderCount   int     `json:"order_count"`
	TotalAmount  float64 `json:"total_amount"`
	Trend        float64 `json:"trend"`
}

// AccountEfficiency 账户效率
type AccountEfficiency struct {
	AccountName string  `json:"account_name"`
	UsageCount  int     `json:"usage_count"`
	SuccessRate float64 `json:"success_rate"`
	TotalAmount float64 `json:"total_amount"`
}

// TableData 表格数据
type TableData struct {
	TopMerchants       []TopMerchant       `json:"top_merchants"`
	AccountEfficiency  []AccountEfficiency `json:"account_efficiency"`
}

// LinkStats 链接统计
type LinkStats struct {
	LinkType      string  `json:"link_type"`
	CompanyName   string  `json:"company_name"`
	VisitCount    int     `json:"visit_count"`
	OrderCount    int     `json:"order_count"`
	SuccessCount  int     `json:"success_count"`
	TotalAmount   float64 `json:"total_amount"`
	SuccessAmount float64 `json:"success_amount"`
}

// GetOverviewData 获取概览数据
func (rm *ReportsManager) GetOverviewData(startDate, endDate time.Time) (*OverviewData, error) {
	data := &OverviewData{}
	
	// 基础统计查询
	baseQuery := `
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(SUM(payment_amount), 0) as total_amount,
			COALESCE(AVG(payment_amount), 0) as avg_amount,
			SUM(CASE WHEN order_status = 'success' THEN 1 ELSE 0 END) as success_orders,
			SUM(CASE WHEN order_status = 'failed' THEN 1 ELSE 0 END) as failed_orders,
			SUM(CASE WHEN payment_type = 'business' THEN 1 ELSE 0 END) as business_payments,
			SUM(CASE WHEN payment_type = 'personal' THEN 1 ELSE 0 END) as personal_payments
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
	`
	
	err := rm.db.QueryRow(baseQuery, startDate, endDate).Scan(
		&data.TotalOrders,
		&data.TotalAmount,
		&data.AvgAmount,
		&data.SuccessOrders,
		&data.FailedOrders,
		&data.BusinessPayments,
		&data.PersonalPayments,
	)
	
	if err != nil {
		return nil, errors.Wrap(err, "查询基础统计数据失败")
	}
	
	// 计算成功率和对公占比
	if data.TotalOrders > 0 {
		data.SuccessRate = float64(data.SuccessOrders) / float64(data.TotalOrders) * 100
		data.BusinessRatio = float64(data.BusinessPayments) / float64(data.TotalOrders) * 100
	}
	
	// 获取增长数据
	growth, err := rm.getGrowthData(startDate, endDate)
	if err == nil {
		data.Growth = growth
	}
	
	return data, nil
}

// getGrowthData 获取增长数据
func (rm *ReportsManager) getGrowthData(startDate, endDate time.Time) (*GrowthData, error) {
	duration := endDate.Sub(startDate)
	prevStartDate := startDate.Add(-duration)
	prevEndDate := startDate
	
	// 当前期间数据
	currentData, err := rm.getPeriodData(startDate, endDate)
	if err != nil {
		return nil, err
	}
	
	// 上一期间数据
	prevData, err := rm.getPeriodData(prevStartDate, prevEndDate)
	if err != nil {
		return nil, err
	}
	
	growth := &GrowthData{}
	
	// 计算充值增长率
	if prevData.TotalAmount > 0 {
		growth.RechargeGrowth = (currentData.TotalAmount - prevData.TotalAmount) / prevData.TotalAmount * 100
	}
	
	// 计算成功率变化
	growth.SuccessRateChange = currentData.SuccessRate - prevData.SuccessRate
	
	return growth, nil
}

// getPeriodData 获取期间数据
func (rm *ReportsManager) getPeriodData(startDate, endDate time.Time) (*OverviewData, error) {
	data := &OverviewData{}
	
	query := `
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(SUM(payment_amount), 0) as total_amount,
			SUM(CASE WHEN order_status = 'success' THEN 1 ELSE 0 END) as success_orders
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
	`
	
	var totalOrders, successOrders int
	var totalAmount float64
	
	err := rm.db.QueryRow(query, startDate, endDate).Scan(
		&totalOrders,
		&totalAmount,
		&successOrders,
	)
	
	if err != nil {
		return nil, err
	}
	
	data.TotalAmount = totalAmount
	if totalOrders > 0 {
		data.SuccessRate = float64(successOrders) / float64(totalOrders) * 100
	}
	
	return data, nil
}

// GetChartData 获取图表数据
func (rm *ReportsManager) GetChartData(startDate, endDate time.Time) (*ChartData, error) {
	data := &ChartData{}
	
	// 获取趋势数据
	trendData, err := rm.getTrendData(startDate, endDate)
	if err != nil {
		return nil, err
	}
	data.Trend = trendData
	
	// 获取支付方式分布
	paymentTypes, err := rm.getPaymentTypeData(startDate, endDate)
	if err != nil {
		return nil, err
	}
	data.PaymentTypes = *paymentTypes
	
	return data, nil
}

// getTrendData 获取趋势数据
func (rm *ReportsManager) getTrendData(startDate, endDate time.Time) ([]TrendDataPoint, error) {
	query := `
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as orders,
			COALESCE(SUM(payment_amount), 0) as amount
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`
	
	rows, err := rm.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, errors.Wrap(err, "查询趋势数据失败")
	}
	defer rows.Close()
	
	var trendData []TrendDataPoint
	for rows.Next() {
		var point TrendDataPoint
		err := rows.Scan(&point.Date, &point.Orders, &point.Amount)
		if err != nil {
			continue
		}
		trendData = append(trendData, point)
	}
	
	return trendData, nil
}

// getPaymentTypeData 获取支付方式数据
func (rm *ReportsManager) getPaymentTypeData(startDate, endDate time.Time) (*PaymentTypeData, error) {
	query := `
		SELECT 
			payment_type,
			COUNT(*) as count
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
		GROUP BY payment_type
	`
	
	rows, err := rm.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, errors.Wrap(err, "查询支付方式数据失败")
	}
	defer rows.Close()
	
	data := &PaymentTypeData{}
	for rows.Next() {
		var paymentType string
		var count int
		
		err := rows.Scan(&paymentType, &count)
		if err != nil {
			continue
		}
		
		if paymentType == "business" {
			data.Business = count
		} else {
			data.Personal = count
		}
	}
	
	return data, nil
}

// GetTableData 获取表格数据
func (rm *ReportsManager) GetTableData(startDate, endDate time.Time) (*TableData, error) {
	data := &TableData{}
	
	// 获取热门商户排行
	topMerchants, err := rm.getTopMerchants(startDate, endDate)
	if err != nil {
		return nil, err
	}
	data.TopMerchants = topMerchants
	
	// 获取账户效率数据
	accountEfficiency, err := rm.getAccountEfficiency(startDate, endDate)
	if err != nil {
		return nil, err
	}
	data.AccountEfficiency = accountEfficiency
	
	return data, nil
}

// getTopMerchants 获取热门商户排行
func (rm *ReportsManager) getTopMerchants(startDate, endDate time.Time) ([]TopMerchant, error) {
	query := `
		SELECT 
			company_name,
			COUNT(*) as order_count,
			COALESCE(SUM(payment_amount), 0) as total_amount
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
		GROUP BY company_name
		ORDER BY total_amount DESC
		LIMIT 10
	`
	
	rows, err := rm.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, errors.Wrap(err, "查询热门商户失败")
	}
	defer rows.Close()
	
	var merchants []TopMerchant
	for rows.Next() {
		var merchant TopMerchant
		err := rows.Scan(&merchant.CompanyName, &merchant.OrderCount, &merchant.TotalAmount)
		if err != nil {
			continue
		}
		
		// 计算趋势（简化处理，实际应该对比上一期）
		merchant.Trend = float64(merchant.OrderCount) * 0.1 // 模拟趋势
		
		merchants = append(merchants, merchant)
	}
	
	return merchants, nil
}

// getAccountEfficiency 获取账户效率数据
func (rm *ReportsManager) getAccountEfficiency(startDate, endDate time.Time) ([]AccountEfficiency, error) {
	query := `
		SELECT 
			pa.account_name,
			COUNT(ro.id) as usage_count,
			SUM(CASE WHEN ro.order_status = 'success' THEN 1 ELSE 0 END) as success_count,
			COALESCE(SUM(ro.payment_amount), 0) as total_amount
		FROM payment_accounts pa
		LEFT JOIN recharge_orders ro ON pa.id = ro.receiver_account_id 
			AND ro.created_at >= ? AND ro.created_at <= ?
		GROUP BY pa.id, pa.account_name
		HAVING usage_count > 0
		ORDER BY usage_count DESC
		LIMIT 10
	`
	
	rows, err := rm.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, errors.Wrap(err, "查询账户效率失败")
	}
	defer rows.Close()
	
	var accounts []AccountEfficiency
	for rows.Next() {
		var account AccountEfficiency
		var successCount int
		
		err := rows.Scan(&account.AccountName, &account.UsageCount, &successCount, &account.TotalAmount)
		if err != nil {
			continue
		}
		
		// 计算成功率
		if account.UsageCount > 0 {
			account.SuccessRate = float64(successCount) / float64(account.UsageCount) * 100
		}
		
		accounts = append(accounts, account)
	}
	
	return accounts, nil
}

// GetLinkStats 获取链接统计数据
func (rm *ReportsManager) GetLinkStats() ([]LinkStats, error) {
	query := `
		SELECT 
			link_type,
			COALESCE(company_name, '') as company_name,
			visit_count,
			order_count,
			success_count,
			total_amount,
			success_amount
		FROM recharge_link_stats
		ORDER BY success_amount DESC
	`
	
	rows, err := rm.db.Query(query)
	if err != nil {
		return nil, errors.Wrap(err, "查询链接统计失败")
	}
	defer rows.Close()
	
	var linkStats []LinkStats
	for rows.Next() {
		var stats LinkStats
		err := rows.Scan(
			&stats.LinkType,
			&stats.CompanyName,
			&stats.VisitCount,
			&stats.OrderCount,
			&stats.SuccessCount,
			&stats.TotalAmount,
			&stats.SuccessAmount,
		)
		if err != nil {
			continue
		}
		
		linkStats = append(linkStats, stats)
	}
	
	return linkStats, nil
}

// ExportData 导出数据
func (rm *ReportsManager) ExportData(format string, startDate, endDate time.Time) ([]byte, string, error) {
	switch strings.ToLower(format) {
	case "excel":
		return rm.exportExcel(startDate, endDate)
	case "csv":
		return rm.exportCSV(startDate, endDate)
	case "pdf":
		return rm.exportPDF(startDate, endDate)
	default:
		return nil, "", errors.New("不支持的导出格式")
	}
}

// exportExcel 导出Excel格式
func (rm *ReportsManager) exportExcel(startDate, endDate time.Time) ([]byte, string, error) {
	f := excelize.NewFile()
	
	// 创建概览数据工作表
	overview, err := rm.GetOverviewData(startDate, endDate)
	if err != nil {
		return nil, "", err
	}
	
	// 设置概览数据
	f.SetCellValue("Sheet1", "A1", "数据项")
	f.SetCellValue("Sheet1", "B1", "数值")
	f.SetCellValue("Sheet1", "A2", "总订单数")
	f.SetCellValue("Sheet1", "B2", overview.TotalOrders)
	f.SetCellValue("Sheet1", "A3", "总金额")
	f.SetCellValue("Sheet1", "B3", overview.TotalAmount)
	f.SetCellValue("Sheet1", "A4", "平均金额")
	f.SetCellValue("Sheet1", "B4", overview.AvgAmount)
	f.SetCellValue("Sheet1", "A5", "成功订单")
	f.SetCellValue("Sheet1", "B5", overview.SuccessOrders)
	f.SetCellValue("Sheet1", "A6", "成功率")
	f.SetCellValue("Sheet1", "B6", fmt.Sprintf("%.2f%%", overview.SuccessRate))
	
	// 创建详细数据工作表
	f.NewSheet("订单详情")
	
	// 查询详细订单数据
	detailQuery := `
		SELECT 
			order_number, company_name, payment_amount, payment_type, 
			order_status, created_at, paid_at
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
		ORDER BY created_at DESC
		LIMIT 1000
	`
	
	rows, err := rm.db.Query(detailQuery, startDate, endDate)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	
	// 设置表头
	headers := []string{"订单号", "开户主体", "金额", "支付类型", "状态", "创建时间", "付款时间"}
	for i, header := range headers {
		f.SetCellValue("订单详情", fmt.Sprintf("%s1", string(rune('A'+i))), header)
	}
	
	// 写入数据
	row := 2
	for rows.Next() {
		var orderNumber, companyName, paymentType, orderStatus string
		var paymentAmount float64
		var createdAt, paidAt sql.NullTime
		
		err := rows.Scan(&orderNumber, &companyName, &paymentAmount, &paymentType, &orderStatus, &createdAt, &paidAt)
		if err != nil {
			continue
		}
		
		f.SetCellValue("订单详情", fmt.Sprintf("A%d", row), orderNumber)
		f.SetCellValue("订单详情", fmt.Sprintf("B%d", row), companyName)
		f.SetCellValue("订单详情", fmt.Sprintf("C%d", row), paymentAmount)
		f.SetCellValue("订单详情", fmt.Sprintf("D%d", row), paymentType)
		f.SetCellValue("订单详情", fmt.Sprintf("E%d", row), orderStatus)
		
		if createdAt.Valid {
			f.SetCellValue("订单详情", fmt.Sprintf("F%d", row), createdAt.Time.Format("2006-01-02 15:04:05"))
		}
		
		if paidAt.Valid {
			f.SetCellValue("订单详情", fmt.Sprintf("G%d", row), paidAt.Time.Format("2006-01-02 15:04:05"))
		}
		
		row++
	}
	
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", errors.Wrap(err, "生成Excel文件失败")
	}
	
	return buf.Bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", nil
}

// exportCSV 导出CSV格式
func (rm *ReportsManager) exportCSV(startDate, endDate time.Time) ([]byte, string, error) {
	var buf strings.Builder
	writer := csv.NewWriter(&buf)
	
	// 写入表头
	headers := []string{"订单号", "开户主体", "金额", "支付类型", "状态", "创建时间", "付款时间"}
	writer.Write(headers)
	
	// 查询数据
	query := `
		SELECT 
			order_number, company_name, payment_amount, payment_type, 
			order_status, created_at, paid_at
		FROM recharge_orders 
		WHERE created_at >= ? AND created_at <= ?
		ORDER BY created_at DESC
	`
	
	rows, err := rm.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	
	for rows.Next() {
		var orderNumber, companyName, paymentType, orderStatus string
		var paymentAmount float64
		var createdAt, paidAt sql.NullTime
		
		err := rows.Scan(&orderNumber, &companyName, &paymentAmount, &paymentType, &orderStatus, &createdAt, &paidAt)
		if err != nil {
			continue
		}
		
		record := []string{
			orderNumber,
			companyName,
			fmt.Sprintf("%.2f", paymentAmount),
			paymentType,
			orderStatus,
		}
		
		if createdAt.Valid {
			record = append(record, createdAt.Time.Format("2006-01-02 15:04:05"))
		} else {
			record = append(record, "")
		}
		
		if paidAt.Valid {
			record = append(record, paidAt.Time.Format("2006-01-02 15:04:05"))
		} else {
			record = append(record, "")
		}
		
		writer.Write(record)
	}
	
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, "", errors.Wrap(err, "生成CSV文件失败")
	}
	
	return []byte(buf.String()), "text/csv", nil
}

// exportPDF 导出PDF格式（简化实现）
func (rm *ReportsManager) exportPDF(startDate, endDate time.Time) ([]byte, string, error) {
	// 这里应该使用PDF库生成PDF，简化为返回错误
	return nil, "", errors.New("PDF导出功能开发中")
}

// UpdateLinkStats 更新链接统计
func (rm *ReportsManager) UpdateLinkStats(linkType, linkIdentifier, companyName string, visitCount, orderCount, successCount int, totalAmount, successAmount float64) error {
	query := `
		INSERT INTO recharge_link_stats 
		(link_type, link_identifier, company_name, visit_count, order_count, success_count, total_amount, success_amount, last_visit, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE 
		visit_count = visit_count + VALUES(visit_count),
		order_count = order_count + VALUES(order_count), 
		success_count = success_count + VALUES(success_count),
		total_amount = total_amount + VALUES(total_amount),
		success_amount = success_amount + VALUES(success_amount),
		last_visit = NOW(),
		updated_at = NOW()
	`
	
	_, err := rm.db.Exec(query, linkType, linkIdentifier, companyName, visitCount, orderCount, successCount, totalAmount, successAmount)
	if err != nil {
		return errors.Wrap(err, "更新链接统计失败")
	}
	
	return nil
}