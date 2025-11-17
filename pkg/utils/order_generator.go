package utils

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	"github.com/pkg/errors"
)

// OrderNumberGenerator 订单号生成器
type OrderNumberGenerator struct {
	db    *sql.DB
	mutex sync.Mutex
}

// NewOrderNumberGenerator 创建订单号生成器实例
func NewOrderNumberGenerator(db *sql.DB) *OrderNumberGenerator {
	return &OrderNumberGenerator{
		db: db,
	}
}

// GenerateOrderNumber 生成订单号
// 规则: cj+公私识别码(0=私,1=公)+年月日(YYMMDD)+时间(HHMMSS)+序列号(5位数字)
// 总长度: 18位
// 示例: 
// - 2025年8月8日晚上9点9分对公第8笔充值: cj1250808210900008
// - 2025年8月8日上午9点9分对私第8笔充值: cj0250808090900008
func (g *OrderNumberGenerator) GenerateOrderNumber(isPublic bool) (string, error) {
	g.mutex.Lock()
	defer g.mutex.Unlock()

	now := time.Now()
	
	// 公私识别码
	businessType := "0" // 对私
	if isPublic {
		businessType = "1" // 对公
	}
	
	// 日期格式: YYMMDD
	dateKey := now.Format("060102") // 250808
	
	// 时间格式: HHMMSS  
	timeStr := now.Format("150405") // 210900
	
	// 获取当日序列号
	sequenceNum, err := g.getNextSequenceNumber(dateKey)
	if err != nil {
		return "", errors.Wrap(err, "获取序列号失败")
	}
	
	// 组合订单号: cj + 公私码 + 日期 + 时间 + 序列号(5位)
	orderNumber := fmt.Sprintf("cj%s%s%s%05d", businessType, dateKey, timeStr, sequenceNum)
	
	return orderNumber, nil
}

// getNextSequenceNumber 获取下一个序列号
func (g *OrderNumberGenerator) getNextSequenceNumber(dateKey string) (int, error) {
	// 使用事务确保原子性
	tx, err := g.db.Begin()
	if err != nil {
		return 0, errors.Wrap(err, "开始事务失败")
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 查询当日序列号
	var sequenceNum int
	query := `
		SELECT sequence_number 
		FROM order_sequences 
		WHERE date_key = ? 
		FOR UPDATE`
	
	err = tx.QueryRow(query, dateKey).Scan(&sequenceNum)
	
	if err != nil {
		if err == sql.ErrNoRows {
			// 如果当天没有记录，插入新记录
			sequenceNum = 1
			insertQuery := `
				INSERT INTO order_sequences (date_key, sequence_number, created_at, updated_at) 
				VALUES (?, ?, NOW(), NOW())`
			
			_, err = tx.Exec(insertQuery, dateKey, sequenceNum)
			if err != nil {
				return 0, errors.Wrap(err, "插入序列号记录失败")
			}
		} else {
			return 0, errors.Wrap(err, "查询序列号失败")
		}
	} else {
		// 更新序列号
		sequenceNum++
		updateQuery := `
			UPDATE order_sequences 
			SET sequence_number = ?, updated_at = NOW() 
			WHERE date_key = ?`
		
		_, err = tx.Exec(updateQuery, sequenceNum, dateKey)
		if err != nil {
			return 0, errors.Wrap(err, "更新序列号失败")
		}
	}
	
	// 提交事务
	err = tx.Commit()
	if err != nil {
		return 0, errors.Wrap(err, "提交事务失败")
	}
	
	return sequenceNum, nil
}

// ValidateOrderNumber 验证订单号格式
func ValidateOrderNumber(orderNumber string) error {
	if len(orderNumber) != 18 {
		return errors.New("订单号长度必须为18位")
	}
	
	if orderNumber[:2] != "cj" {
		return errors.New("订单号必须以'cj'开头")
	}
	
	businessType := orderNumber[2:3]
	if businessType != "0" && businessType != "1" {
		return errors.New("公私识别码必须为0(对私)或1(对公)")
	}
	
	// 验证日期部分 (位置3-8: YYMMDD)
	dateStr := orderNumber[3:9]
	_, err := time.Parse("060102", dateStr)
	if err != nil {
		return errors.New("订单号中日期格式无效")
	}
	
	// 验证时间部分 (位置9-14: HHMMSS)  
	timeStr := orderNumber[9:15]
	_, err = time.Parse("150405", timeStr)
	if err != nil {
		return errors.New("订单号中时间格式无效")
	}
	
	return nil
}

// ParseOrderNumber 解析订单号信息
func ParseOrderNumber(orderNumber string) (*OrderInfo, error) {
	if err := ValidateOrderNumber(orderNumber); err != nil {
		return nil, err
	}
	
	info := &OrderInfo{
		OrderNumber: orderNumber,
		Prefix:      orderNumber[:2],
	}
	
	// 解析公私类型
	if orderNumber[2:3] == "1" {
		info.PaymentType = "business" // 对公
		info.IsPublic = true
	} else {
		info.PaymentType = "personal" // 对私
		info.IsPublic = false
	}
	
	// 解析日期
	dateStr := orderNumber[3:9]
	date, err := time.Parse("060102", dateStr)
	if err != nil {
		return nil, errors.Wrap(err, "解析日期失败")
	}
	info.Date = date
	info.DateKey = dateStr
	
	// 解析时间
	timeStr := orderNumber[9:15]
	timeOfDay, err := time.Parse("150405", timeStr)
	if err != nil {
		return nil, errors.Wrap(err, "解析时间失败")
	}
	info.Time = timeOfDay.Format("15:04:05")
	
	// 解析序列号
	sequenceStr := orderNumber[15:18]
	var sequenceNum int
	_, err = fmt.Sscanf(sequenceStr, "%05d", &sequenceNum)
	if err != nil {
		return nil, errors.Wrap(err, "解析序列号失败")
	}
	info.SequenceNumber = sequenceNum
	
	return info, nil
}

// OrderInfo 订单号信息结构
type OrderInfo struct {
	OrderNumber    string    `json:"order_number"`    // 完整订单号
	Prefix         string    `json:"prefix"`          // 前缀 (cj)
	PaymentType    string    `json:"payment_type"`    // 支付类型 (business/personal)
	IsPublic       bool      `json:"is_public"`       // 是否对公
	Date           time.Time `json:"date"`            // 日期
	DateKey        string    `json:"date_key"`        // 日期键
	Time           string    `json:"time"`            // 时间
	SequenceNumber int       `json:"sequence_number"` // 序列号
}

// GetTodayOrderCount 获取今日订单数量
func (g *OrderNumberGenerator) GetTodayOrderCount() (int, error) {
	today := time.Now().Format("060102")
	
	query := `SELECT sequence_number FROM order_sequences WHERE date_key = ?`
	
	var count int
	err := g.db.QueryRow(query, today).Scan(&count)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, nil
		}
		return 0, errors.Wrap(err, "查询今日订单数量失败")
	}
	
	return count, nil
}

// GetOrderStatsByDate 获取指定日期的订单统计
func (g *OrderNumberGenerator) GetOrderStatsByDate(date time.Time) (*OrderStats, error) {
	dateKey := date.Format("060102")
	
	query := `SELECT sequence_number FROM order_sequences WHERE date_key = ?`
	
	var sequenceNum int
	err := g.db.QueryRow(query, dateKey).Scan(&sequenceNum)
	if err != nil {
		if err == sql.ErrNoRows {
			return &OrderStats{
				Date:       date,
				DateKey:    dateKey,
				TotalCount: 0,
			}, nil
		}
		return nil, errors.Wrap(err, "查询订单统计失败")
	}
	
	return &OrderStats{
		Date:       date,
		DateKey:    dateKey,
		TotalCount: sequenceNum,
	}, nil
}

// OrderStats 订单统计信息
type OrderStats struct {
	Date       time.Time `json:"date"`        // 日期
	DateKey    string    `json:"date_key"`    // 日期键
	TotalCount int       `json:"total_count"` // 总订单数
}

// CleanupOldSequences 清理旧的序列号记录(可选的定期清理任务)
func (g *OrderNumberGenerator) CleanupOldSequences(daysToKeep int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysToKeep).Format("060102")
	
	query := `DELETE FROM order_sequences WHERE date_key < ?`
	
	result, err := g.db.Exec(query, cutoffDate)
	if err != nil {
		return errors.Wrap(err, "清理旧序列号记录失败")
	}
	
	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("已清理 %d 条旧序列号记录\n", rowsAffected)
	
	return nil
}