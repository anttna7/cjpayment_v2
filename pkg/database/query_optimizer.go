package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// QueryOptimizer provides database query optimization utilities
type QueryOptimizer struct {
	db      *gorm.DB
	metrics *QueryMetrics
}

// QueryMetrics tracks query performance metrics
type QueryMetrics struct {
	SlowQueries     []SlowQuery
	QueryCount      int64
	TotalDuration   time.Duration
	AverageDuration time.Duration
}

// SlowQuery represents a slow query record
type SlowQuery struct {
	SQL       string
	Duration  time.Duration
	Timestamp time.Time
	Args      []interface{}
}

// NewQueryOptimizer creates a new query optimizer
func NewQueryOptimizer(db *gorm.DB) *QueryOptimizer {
	return &QueryOptimizer{
		db:      db,
		metrics: &QueryMetrics{},
	}
}

// OptimizedQuery represents an optimized query configuration
type OptimizedQuery struct {
	UseIndex     string
	ForceIndex   string
	Limit        int
	Offset       int
	Preload      []string
	Select       []string
	Joins        []string
	Where        []string
	OrderBy      string
	GroupBy      string
	Having       string
	UseCache     bool
	CacheTTL     time.Duration
}

// ApplyOptimizations applies optimizations to a GORM query
func (qo *QueryOptimizer) ApplyOptimizations(query *gorm.DB, opts OptimizedQuery) *gorm.DB {
	// Apply SELECT optimization
	if len(opts.Select) > 0 {
		query = query.Select(opts.Select)
	}

	// Apply JOIN optimizations
	for _, join := range opts.Joins {
		query = query.Joins(join)
	}

	// Apply WHERE conditions
	for _, where := range opts.Where {
		query = query.Where(where)
	}

	// Apply PRELOAD optimizations
	for _, preload := range opts.Preload {
		query = query.Preload(preload)
	}

	// Apply ORDER BY
	if opts.OrderBy != "" {
		query = query.Order(opts.OrderBy)
	}

	// Apply GROUP BY
	if opts.GroupBy != "" {
		query = query.Group(opts.GroupBy)
	}

	// Apply HAVING
	if opts.Having != "" {
		query = query.Having(opts.Having)
	}

	// Apply LIMIT and OFFSET
	if opts.Limit > 0 {
		query = query.Limit(opts.Limit)
	}
	if opts.Offset > 0 {
		query = query.Offset(opts.Offset)
	}

	// Apply index hints (MySQL specific)
	if opts.UseIndex != "" {
		query = query.Clauses(gorm.Expr(fmt.Sprintf("USE INDEX (%s)", opts.UseIndex)))
	}
	if opts.ForceIndex != "" {
		query = query.Clauses(gorm.Expr(fmt.Sprintf("FORCE INDEX (%s)", opts.ForceIndex)))
	}

	return query
}

// RechargeQueryOptimizations provides optimized queries for recharge system
type RechargeQueryOptimizations struct {
	optimizer *QueryOptimizer
}

// NewRechargeQueryOptimizations creates recharge-specific query optimizations
func NewRechargeQueryOptimizations(db *gorm.DB) *RechargeQueryOptimizations {
	return &RechargeQueryOptimizations{
		optimizer: NewQueryOptimizer(db),
	}
}

// OptimizedMerchantQuery returns optimized query for merchants
func (rqo *RechargeQueryOptimizations) OptimizedMerchantQuery() OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_merchants_status",
		Select:   []string{"id", "name", "status", "contact_name", "contact_phone", "email", "recharge_url", "created_at", "updated_at"},
		Where:    []string{"status = 'active'"},
		OrderBy:  "created_at DESC",
		UseCache: true,
		CacheTTL: 30 * time.Minute,
	}
}

// OptimizedAccountQuery returns optimized query for receive accounts
func (rqo *RechargeQueryOptimizations) OptimizedAccountQuery() OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_receive_accounts_status_type",
		Select:   []string{"id", "account_name", "account_number", "bank_name", "account_type", "status", "daily_limit", "used_amount", "priority"},
		Where:    []string{"status = 'active'"},
		OrderBy:  "priority ASC, used_amount ASC",
		UseCache: true,
		CacheTTL: 15 * time.Minute,
	}
}

// OptimizedMerchantAccountQuery returns optimized query for merchant-account bindings
func (rqo *RechargeQueryOptimizations) OptimizedMerchantAccountQuery(merchantID uint) OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_merchant_accounts_merchant_id",
		Select:   []string{"id", "merchant_id", "receive_account_id", "priority", "status"},
		Preload:  []string{"ReceiveAccount"},
		Where:    []string{fmt.Sprintf("merchant_id = %d AND status = 'active'", merchantID)},
		OrderBy:  "priority ASC",
		UseCache: true,
		CacheTTL: 15 * time.Minute,
	}
}

// OptimizedOrderQuery returns optimized query for recharge orders
func (rqo *RechargeQueryOptimizations) OptimizedOrderQuery() OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_recharge_orders_created_at",
		Select:   []string{"id", "order_no", "merchant_id", "payer_name", "amount", "payment_type", "status", "created_at", "updated_at"},
		OrderBy:  "created_at DESC",
		UseCache: true,
		CacheTTL: 10 * time.Minute,
	}
}

// OptimizedOrdersByMerchantQuery returns optimized query for orders by merchant
func (rqo *RechargeQueryOptimizations) OptimizedOrdersByMerchantQuery(merchantID uint) OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_recharge_orders_merchant_status_date",
		Select:   []string{"id", "order_no", "merchant_id", "payer_name", "amount", "payment_type", "status", "created_at", "updated_at"},
		Where:    []string{fmt.Sprintf("merchant_id = %d", merchantID)},
		OrderBy:  "created_at DESC",
		UseCache: true,
		CacheTTL: 10 * time.Minute,
	}
}

// OptimizedOrdersByDateQuery returns optimized query for orders by date range
func (rqo *RechargeQueryOptimizations) OptimizedOrdersByDateQuery(startDate, endDate time.Time) OptimizedQuery {
	return OptimizedQuery{
		UseIndex: "idx_recharge_orders_date_status",
		Select:   []string{"id", "order_no", "merchant_id", "payer_name", "amount", "payment_type", "status", "created_at"},
		Where:    []string{fmt.Sprintf("created_at >= '%s' AND created_at <= '%s'", startDate.Format("2006-01-02 15:04:05"), endDate.Format("2006-01-02 15:04:05"))},
		OrderBy:  "created_at DESC",
		UseCache: true,
		CacheTTL: 5 * time.Minute,
	}
}

// OptimizedAccountUsageQuery returns optimized query for account usage statistics
func (rqo *RechargeQueryOptimizations) OptimizedAccountUsageQuery(accountID uint, date time.Time) OptimizedQuery {
	dateStr := date.Format("2006-01-02")
	return OptimizedQuery{
		Select:  []string{"SUM(amount) as total_amount", "COUNT(*) as order_count"},
		Where:   []string{fmt.Sprintf("receive_account_id = %d AND DATE(created_at) = '%s' AND status IN ('paid', 'completed')", accountID, dateStr)},
		GroupBy: "receive_account_id",
		UseCache: true,
		CacheTTL: 2 * time.Minute,
	}
}

// BatchQueryOptimizer handles batch operations efficiently
type BatchQueryOptimizer struct {
	db        *gorm.DB
	batchSize int
}

// NewBatchQueryOptimizer creates a new batch query optimizer
func NewBatchQueryOptimizer(db *gorm.DB, batchSize int) *BatchQueryOptimizer {
	if batchSize <= 0 {
		batchSize = 1000 // Default batch size
	}
	return &BatchQueryOptimizer{
		db:        db,
		batchSize: batchSize,
	}
}

// BatchInsert performs optimized batch insert
func (bqo *BatchQueryOptimizer) BatchInsert(ctx context.Context, tableName string, records []interface{}) error {
	if len(records) == 0 {
		return nil
	}

	// Process in batches
	for i := 0; i < len(records); i += bqo.batchSize {
		end := i + bqo.batchSize
		if end > len(records) {
			end = len(records)
		}

		batch := records[i:end]
		if err := bqo.db.WithContext(ctx).CreateInBatches(batch, len(batch)).Error; err != nil {
			return fmt.Errorf("batch insert failed at batch %d: %w", i/bqo.batchSize, err)
		}
	}

	return nil
}

// BatchUpdate performs optimized batch update
func (bqo *BatchQueryOptimizer) BatchUpdate(ctx context.Context, tableName string, updates map[string]interface{}, whereClause string, args ...interface{}) error {
	query := bqo.db.WithContext(ctx).Table(tableName)
	
	if whereClause != "" {
		query = query.Where(whereClause, args...)
	}

	return query.Updates(updates).Error
}

// ConnectionPoolOptimizer optimizes database connection pool settings
type ConnectionPoolOptimizer struct {
	db *gorm.DB
}

// NewConnectionPoolOptimizer creates a new connection pool optimizer
func NewConnectionPoolOptimizer(db *gorm.DB) *ConnectionPoolOptimizer {
	return &ConnectionPoolOptimizer{db: db}
}

// OptimizeConnectionPool applies optimal connection pool settings
func (cpo *ConnectionPoolOptimizer) OptimizeConnectionPool() error {
	sqlDB, err := cpo.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Set maximum number of open connections
	sqlDB.SetMaxOpenConns(25)

	// Set maximum number of idle connections
	sqlDB.SetMaxIdleConns(10)

	// Set maximum lifetime of connections
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Set maximum idle time of connections
	sqlDB.SetConnMaxIdleTime(1 * time.Minute)

	return nil
}

// GetConnectionStats returns connection pool statistics
func (cpo *ConnectionPoolOptimizer) GetConnectionStats() map[string]interface{} {
	sqlDB, err := cpo.db.DB()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"max_open_connections":     stats.MaxOpenConnections,
		"open_connections":         stats.OpenConnections,
		"in_use":                  stats.InUse,
		"idle":                    stats.Idle,
		"wait_count":              stats.WaitCount,
		"wait_duration":           stats.WaitDuration.String(),
		"max_idle_closed":         stats.MaxIdleClosed,
		"max_idle_time_closed":    stats.MaxIdleTimeClosed,
		"max_lifetime_closed":     stats.MaxLifetimeClosed,
	}
}

// QueryAnalyzer analyzes query performance
type QueryAnalyzer struct {
	db *gorm.DB
}

// NewQueryAnalyzer creates a new query analyzer
func NewQueryAnalyzer(db *gorm.DB) *QueryAnalyzer {
	return &QueryAnalyzer{db: db}
}

// AnalyzeQuery analyzes a query and provides optimization suggestions
func (qa *QueryAnalyzer) AnalyzeQuery(query string, args ...interface{}) (*QueryAnalysis, error) {
	analysis := &QueryAnalysis{
		Query:       query,
		Args:        args,
		Timestamp:   time.Now(),
		Suggestions: []string{},
	}

	// Execute EXPLAIN to get query execution plan
	explainQuery := fmt.Sprintf("EXPLAIN %s", query)
	rows, err := qa.db.Raw(explainQuery, args...).Rows()
	if err != nil {
		return analysis, fmt.Errorf("failed to execute EXPLAIN: %w", err)
	}
	defer rows.Close()

	// Parse EXPLAIN results
	for rows.Next() {
		var explain ExplainResult
		if err := qa.db.ScanRows(rows, &explain); err != nil {
			continue
		}
		analysis.ExplainResults = append(analysis.ExplainResults, explain)
	}

	// Generate optimization suggestions
	analysis.Suggestions = qa.generateSuggestions(analysis.ExplainResults)

	return analysis, nil
}

// QueryAnalysis represents query analysis results
type QueryAnalysis struct {
	Query          string
	Args           []interface{}
	Timestamp      time.Time
	ExplainResults []ExplainResult
	Suggestions    []string
}

// ExplainResult represents EXPLAIN query result
type ExplainResult struct {
	ID           int    `gorm:"column:id"`
	SelectType   string `gorm:"column:select_type"`
	Table        string `gorm:"column:table"`
	Partitions   string `gorm:"column:partitions"`
	Type         string `gorm:"column:type"`
	PossibleKeys string `gorm:"column:possible_keys"`
	Key          string `gorm:"column:key"`
	KeyLen       string `gorm:"column:key_len"`
	Ref          string `gorm:"column:ref"`
	Rows         int    `gorm:"column:rows"`
	Filtered     string `gorm:"column:filtered"`
	Extra        string `gorm:"column:Extra"`
}

// generateSuggestions generates optimization suggestions based on EXPLAIN results
func (qa *QueryAnalyzer) generateSuggestions(results []ExplainResult) []string {
	suggestions := []string{}

	for _, result := range results {
		// Check for full table scans
		if result.Type == "ALL" {
			suggestions = append(suggestions, fmt.Sprintf("Consider adding an index to table '%s' to avoid full table scan", result.Table))
		}

		// Check for missing indexes
		if result.Key == "" && result.PossibleKeys != "" {
			suggestions = append(suggestions, fmt.Sprintf("Consider using one of the possible keys: %s for table '%s'", result.PossibleKeys, result.Table))
		}

		// Check for high row count
		if result.Rows > 10000 {
			suggestions = append(suggestions, fmt.Sprintf("Query examines %d rows in table '%s', consider adding more selective WHERE conditions", result.Rows, result.Table))
		}

		// Check for filesort
		if strings.Contains(result.Extra, "Using filesort") {
			suggestions = append(suggestions, fmt.Sprintf("Query uses filesort for table '%s', consider adding an index that matches the ORDER BY clause", result.Table))
		}

		// Check for temporary table
		if strings.Contains(result.Extra, "Using temporary") {
			suggestions = append(suggestions, fmt.Sprintf("Query uses temporary table for table '%s', consider optimizing GROUP BY or DISTINCT clauses", result.Table))
		}
	}

	return suggestions
}

// IndexOptimizer provides index optimization utilities
type IndexOptimizer struct {
	db *gorm.DB
}

// NewIndexOptimizer creates a new index optimizer
func NewIndexOptimizer(db *gorm.DB) *IndexOptimizer {
	return &IndexOptimizer{db: db}
}

// SuggestIndexes suggests indexes based on query patterns
func (io *IndexOptimizer) SuggestIndexes(tableName string) ([]IndexSuggestion, error) {
	suggestions := []IndexSuggestion{}

	// Analyze existing indexes
	existingIndexes, err := io.getExistingIndexes(tableName)
	if err != nil {
		return suggestions, err
	}

	// Generate suggestions based on table and common query patterns
	switch tableName {
	case "merchants":
		suggestions = append(suggestions, IndexSuggestion{
			TableName:   tableName,
			IndexName:   "idx_merchants_status_created_at",
			Columns:     []string{"status", "created_at"},
			IndexType:   "BTREE",
			Reason:      "Optimize queries filtering by status and ordering by created_at",
			Existing:    io.indexExists(existingIndexes, "idx_merchants_status_created_at"),
		})

	case "recharge_orders":
		suggestions = append(suggestions, IndexSuggestion{
			TableName:   tableName,
			IndexName:   "idx_recharge_orders_merchant_status_date",
			Columns:     []string{"merchant_id", "status", "created_at"},
			IndexType:   "BTREE",
			Reason:      "Optimize merchant order queries with status filtering",
			Existing:    io.indexExists(existingIndexes, "idx_recharge_orders_merchant_status_date"),
		})

	case "receive_accounts":
		suggestions = append(suggestions, IndexSuggestion{
			TableName:   tableName,
			IndexName:   "idx_receive_accounts_status_type_priority",
			Columns:     []string{"status", "account_type", "priority"},
			IndexType:   "BTREE",
			Reason:      "Optimize account matching queries",
			Existing:    io.indexExists(existingIndexes, "idx_receive_accounts_status_type_priority"),
		})
	}

	return suggestions, nil
}

// IndexSuggestion represents an index optimization suggestion
type IndexSuggestion struct {
	TableName string
	IndexName string
	Columns   []string
	IndexType string
	Reason    string
	Existing  bool
}

// getExistingIndexes retrieves existing indexes for a table
func (io *IndexOptimizer) getExistingIndexes(tableName string) ([]string, error) {
	var indexes []string
	
	query := `
		SELECT DISTINCT INDEX_NAME 
		FROM INFORMATION_SCHEMA.STATISTICS 
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
	`
	
	rows, err := io.db.Raw(query, tableName).Rows()
	if err != nil {
		return indexes, err
	}
	defer rows.Close()

	for rows.Next() {
		var indexName string
		if err := rows.Scan(&indexName); err != nil {
			continue
		}
		indexes = append(indexes, indexName)
	}

	return indexes, nil
}

// indexExists checks if an index exists in the list
func (io *IndexOptimizer) indexExists(indexes []string, indexName string) bool {
	for _, idx := range indexes {
		if idx == indexName {
			return true
		}
	}
	return false
}