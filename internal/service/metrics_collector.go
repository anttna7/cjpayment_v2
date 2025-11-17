package service

import (
	"context"
	"time"

	"cjpayment/internal/repository"
	"cjpayment/pkg/logger"
	"cjpayment/pkg/monitoring"
)

// MetricsCollector 业务指标收集器
type MetricsCollector struct {
	merchantRepo        repository.MerchantRepository
	merchantAccountRepo repository.MerchantReceiveAccountRepository
	rechargeOrderRepo   repository.RechargeOrderRepository
	receiveAccountRepo  repository.ReceiveAccountRepository
	logger              *logger.StructuredLogger
}

// NewMetricsCollector 创建业务指标收集器
func NewMetricsCollector(
	merchantRepo repository.MerchantRepository,
	merchantAccountRepo repository.MerchantReceiveAccountRepository,
	rechargeOrderRepo repository.RechargeOrderRepository,
	receiveAccountRepo repository.ReceiveAccountRepository,
	logger *logger.StructuredLogger,
) *MetricsCollector {
	return &MetricsCollector{
		merchantRepo:        merchantRepo,
		merchantAccountRepo: merchantAccountRepo,
		rechargeOrderRepo:   rechargeOrderRepo,
		receiveAccountRepo:  receiveAccountRepo,
		logger:              logger,
	}
}

// CollectBusinessMetrics 收集业务指标
func (mc *MetricsCollector) CollectBusinessMetrics(ctx context.Context) error {
	mc.logger.WithFields(logger.LogFields{
		"component": "metrics_collector",
		"action":    "collect_business_metrics",
	}).Info("Starting business metrics collection")

	// 收集商户相关指标
	if err := mc.collectMerchantMetrics(ctx); err != nil {
		mc.logger.LogError(ctx, "metrics_collector", "collect_merchant_metrics", err, nil)
		return err
	}

	// 收集账号相关指标
	if err := mc.collectAccountMetrics(ctx); err != nil {
		mc.logger.LogError(ctx, "metrics_collector", "collect_account_metrics", err, nil)
		return err
	}

	// 收集订单相关指标
	if err := mc.collectOrderMetrics(ctx); err != nil {
		mc.logger.LogError(ctx, "metrics_collector", "collect_order_metrics", err, nil)
		return err
	}

	mc.logger.WithFields(logger.LogFields{
		"component": "metrics_collector",
		"action":    "collect_business_metrics",
	}).Info("Business metrics collection completed")

	return nil
}

// collectMerchantMetrics 收集商户指标
func (mc *MetricsCollector) collectMerchantMetrics(ctx context.Context) error {
	// 获取所有商户
	merchants, err := mc.merchantRepo.FindAll(ctx)
	if err != nil {
		return err
	}

	for _, merchant := range merchants {
		// 获取商户的活跃账号数量
		accounts, err := mc.merchantAccountRepo.FindByMerchantID(ctx, merchant.ID)
		if err != nil {
			mc.logger.LogError(ctx, "metrics_collector", "get_merchant_accounts", err, logger.LogFields{
				"merchant_id": merchant.ID,
			})
			continue
		}

		activeAccountCount := 0
		for _, account := range accounts {
			if account.Status == "active" {
				activeAccountCount++
			}
		}

		// 更新商户活跃账号数量指标
		monitoring.UpdateMerchantAccountsActive(string(rune(merchant.ID)), float64(activeAccountCount))

		// 记录业务指标日志
		mc.logger.LogBusinessMetric(ctx, "merchant_active_accounts", float64(activeAccountCount), map[string]string{
			"merchant_id": string(rune(merchant.ID)),
		})
	}

	return nil
}

// collectAccountMetrics 收集账号指标
func (mc *MetricsCollector) collectAccountMetrics(ctx context.Context) error {
	// 获取所有收款账号
	accounts, err := mc.receiveAccountRepo.FindAll(ctx)
	if err != nil {
		return err
	}

	for _, account := range accounts {
		// 计算账号限额使用率
		utilizationRatio := mc.calculateAccountUtilization(ctx, account.ID)
		
		// 更新账号限额使用率指标
		monitoring.UpdateAccountLimitUtilization(
			string(rune(account.ID)),
			account.AccountType,
			utilizationRatio,
		)

		// 记录业务指标日志
		mc.logger.LogBusinessMetric(ctx, "account_limit_utilization", utilizationRatio, map[string]string{
			"account_id":   string(rune(account.ID)),
			"account_type": account.AccountType,
		})

		// 如果使用率超过80%，记录警告
		if utilizationRatio > 0.8 {
			mc.logger.WithFields(logger.LogFields{
				"component":         "metrics_collector",
				"account_id":        account.ID,
				"account_type":      account.AccountType,
				"utilization_ratio": utilizationRatio,
			}).Warn("Account limit utilization is high")
		}
	}

	return nil
}

// collectOrderMetrics 收集订单指标
func (mc *MetricsCollector) collectOrderMetrics(ctx context.Context) error {
	// 获取今日订单统计
	today := time.Now().Format("2006-01-02")
	
	// 按状态统计今日订单
	statusCounts, err := mc.rechargeOrderRepo.CountByStatusAndDate(ctx, today)
	if err != nil {
		return err
	}

	for status, count := range statusCounts {
		mc.logger.LogBusinessMetric(ctx, "daily_orders_by_status", float64(count), map[string]string{
			"status": status,
			"date":   today,
		})
	}

	// 按商户统计今日订单金额
	merchantAmounts, err := mc.rechargeOrderRepo.SumAmountByMerchantAndDate(ctx, today)
	if err != nil {
		return err
	}

	for merchantID, amount := range merchantAmounts {
		mc.logger.LogBusinessMetric(ctx, "daily_amount_by_merchant", amount, map[string]string{
			"merchant_id": string(rune(merchantID)),
			"date":        today,
		})
	}

	// 计算成功率
	totalOrders := 0
	successfulOrders := 0
	for status, count := range statusCounts {
		totalOrders += count
		if status == "completed" {
			successfulOrders += count
		}
	}

	if totalOrders > 0 {
		successRate := float64(successfulOrders) / float64(totalOrders)
		mc.logger.LogBusinessMetric(ctx, "daily_success_rate", successRate, map[string]string{
			"date": today,
		})
	}

	return nil
}

// calculateAccountUtilization 计算账号限额使用率
func (mc *MetricsCollector) calculateAccountUtilization(ctx context.Context, accountID uint) float64 {
	// 获取账号信息
	account, err := mc.receiveAccountRepo.FindByID(ctx, accountID)
	if err != nil {
		mc.logger.LogError(ctx, "metrics_collector", "get_account", err, logger.LogFields{
			"account_id": accountID,
		})
		return 0
	}

	// 如果没有设置限额，返回0
	if account.DailyLimit <= 0 {
		return 0
	}

	// 获取今日已使用金额
	today := time.Now().Format("2006-01-02")
	usedAmount, err := mc.rechargeOrderRepo.SumAmountByAccountAndDate(ctx, accountID, today)
	if err != nil {
		mc.logger.LogError(ctx, "metrics_collector", "get_used_amount", err, logger.LogFields{
			"account_id": accountID,
			"date":       today,
		})
		return 0
	}

	// 计算使用率
	utilizationRatio := usedAmount / account.DailyLimit
	if utilizationRatio > 1.0 {
		utilizationRatio = 1.0
	}

	return utilizationRatio
}

// StartMetricsCollection 启动指标收集定时任务
func (mc *MetricsCollector) StartMetricsCollection(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	mc.logger.WithFields(logger.LogFields{
		"component": "metrics_collector",
		"interval":  interval.String(),
	}).Info("Starting metrics collection scheduler")

	for {
		select {
		case <-ctx.Done():
			mc.logger.WithFields(logger.LogFields{
				"component": "metrics_collector",
			}).Info("Metrics collection scheduler stopped")
			return
		case <-ticker.C:
			if err := mc.CollectBusinessMetrics(ctx); err != nil {
				mc.logger.LogError(ctx, "metrics_collector", "scheduled_collection", err, nil)
				monitoring.RecordError("metrics_collector", "scheduled_collection_failed", "error")
			}
		}
	}
}