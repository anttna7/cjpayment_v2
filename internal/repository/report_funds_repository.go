package repository

import (
    "context"
    "time"
    "strings"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "github.com/shopspring/decimal"
)

// Funds credited aggregation implemented via ReportRepository

func (r *reportRepository) GetFundsCreditedToday(ctx context.Context, filter *FundsCreditedFilter) (*FundsCreditedTodayData, error) {
    now := time.Now()
    start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
    where := "account_type='funds' AND category='recharge' AND created_at >= $1 AND created_at <= $2"
    args := []interface{}{start, now}
    if filter != nil && filter.TenantID != nil {
        where += " AND customer_id IN (SELECT id FROM customers WHERE tenant_id=$3)"
        args = append(args, *filter.TenantID)
    }
    query := "SELECT COALESCE(source,'cash') as source, COALESCE(SUM(amount),0) FROM ledger_entries WHERE " + where + " GROUP BY source"
    rows, err := r.db.QueryxContext(ctx, query, args...)
    if err != nil { return nil, err }
    defer rows.Close()
    cash := decimal.Zero
    grant := decimal.Zero
    for rows.Next() {
        var src string
        var sum decimal.Decimal
        if err := rows.Scan(&src, &sum); err != nil { continue }
        if strings.ToLower(src) == "grant" { grant = grant.Add(sum) } else { cash = cash.Add(sum) }
    }
    return &FundsCreditedTodayData{ Date: start, Cash: cash, Grant: grant }, nil
}

func (r *reportRepository) GetFundsCreditedTrend(ctx context.Context, filter *FundsCreditedTrendFilter) ([]*FundsCreditedTrendData, error) {
    days := 14
    if filter != nil && filter.Days > 0 { days = filter.Days }
    if days > 60 { days = 60 }
    start := time.Now().AddDate(0,0,-days)
    where := "account_type='funds' AND category='recharge' AND created_at >= $1"
    args := []interface{}{start}
    if filter != nil && filter.TenantID != nil {
        where += " AND customer_id IN (SELECT id FROM customers WHERE tenant_id=$2)"
        args = append(args, *filter.TenantID)
    }
    query := "SELECT DATE(created_at) as day, COALESCE(source,'cash') as source, COALESCE(SUM(amount),0) FROM ledger_entries WHERE " + where + " GROUP BY day, source ORDER BY day ASC"
    rows, err := r.db.QueryxContext(ctx, query, args...)
    if err != nil { return nil, err }
    defer rows.Close()
    type agg struct{ cash decimal.Decimal; grant decimal.Decimal }
    m := map[string]agg{}
    order := []string{}
    for rows.Next() {
        var dayStr string
        var src string
        var sum decimal.Decimal
        if err := rows.Scan(&dayStr, &src, &sum); err != nil { continue }
        v := m[dayStr]
        if strings.ToLower(src) == "grant" { v.grant = v.grant.Add(sum) } else { v.cash = v.cash.Add(sum) }
        m[dayStr] = v
        order = append(order, dayStr)
    }
    uniq := []string{}; seen := map[string]bool{}
    for _, d := range order { if !seen[d] { seen[d]=true; uniq=append(uniq,d) } }
    out := make([]*FundsCreditedTrendData, 0, len(uniq))
    for _, d := range uniq {
        t, _ := time.Parse("2006-01-02", d)
        v := m[d]
        out = append(out, &FundsCreditedTrendData{ Day: t, Cash: v.cash, Grant: v.grant })
    }
    return out, nil
}

// Ensure reportRepository has db
type reportRepository struct {
    db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) ReportRepository {
    return &reportRepository{ db: db }
}
