package service

import (
	"context"
	"fmt"
	"time"

	"github.com/company/cjpayment/internal/repository"
	"github.com/shopspring/decimal"
)

// PaymentTypeMatchStrategy matches accounts based on payment type (private/business)
type PaymentTypeMatchStrategy struct{}

func NewPaymentTypeMatchStrategy() *PaymentTypeMatchStrategy {
	return &PaymentTypeMatchStrategy{}
}

func (s *PaymentTypeMatchStrategy) Name() string {
	return "PaymentTypeMatch"
}

func (s *PaymentTypeMatchStrategy) Priority() int {
	return 100 // Highest priority
}

func (s *PaymentTypeMatchStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	for _, account := range accounts {
		score := 0
		reason := ""
		confidence := 0.0

		// Exact payment type match gets highest score
		if account.PaymentType == req.PaymentType {
			score = 100
			reason = fmt.Sprintf("Exact payment type match (%s)", req.PaymentType)
			confidence = 1.0
		} else {
			// Partial score for different payment types
			score = 20
			reason = fmt.Sprintf("Payment type mismatch (account: %s, requested: %s)", account.PaymentType, req.PaymentType)
			confidence = 0.2
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// LimitCheckStrategy checks account limits and availability
type LimitCheckStrategy struct{}

func NewLimitCheckStrategy() *LimitCheckStrategy {
	return &LimitCheckStrategy{}
}

func (s *LimitCheckStrategy) Name() string {
	return "LimitCheck"
}

func (s *LimitCheckStrategy) Priority() int {
	return 90
}

func (s *LimitCheckStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	for _, account := range accounts {
		score := 0
		reason := ""
		confidence := 0.0

		// Check single transaction limit
		if req.Amount.LessThanOrEqual(account.SingleLimit) {
			score += 40
			reason += "Single limit OK"
			confidence += 0.4
		} else {
			// Account can't handle this amount
			score = 0
			reason = "Exceeds single limit"
			confidence = 0.0
		}

		// Check daily limit availability
		remainingDaily := account.DailyLimit.Sub(account.DailyUsed)
		if req.Amount.LessThanOrEqual(remainingDaily) {
			score += 40
			if reason != "" {
				reason += "; "
			}
			reason += "Daily limit OK"
			confidence += 0.4
		} else {
			score = 0
			reason = "Exceeds daily limit"
			confidence = 0.0
		}

		// Bonus points for accounts with high remaining capacity
		if score > 0 {
			utilizationRate := account.DailyUsed.Div(account.DailyLimit)
			if utilizationRate.LessThan(decimal.NewFromFloat(0.5)) {
				score += 20
				reason += "; Low utilization"
				confidence += 0.2
			} else if utilizationRate.LessThan(decimal.NewFromFloat(0.8)) {
				score += 10
				reason += "; Medium utilization"
				confidence += 0.1
			}
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// PriorityStrategy considers account priority/weight settings
type PriorityStrategy struct{}

func NewPriorityStrategy() *PriorityStrategy {
	return &PriorityStrategy{}
}

func (s *PriorityStrategy) Name() string {
	return "Priority"
}

func (s *PriorityStrategy) Priority() int {
	return 80
}

func (s *PriorityStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	// For this strategy, we would need access to merchant-account relationships
	// to get the weight/priority. For now, we'll use a simplified approach.
	
	for _, account := range accounts {
		score := 50 // Base score
		reason := "Default priority"
		confidence := 0.5

		// In a real implementation, we would:
		// 1. Get the merchant-account relationship
		// 2. Use the weight field to calculate priority score
		// 3. Higher weight = higher score

		// For now, we'll use account creation time as a proxy for priority
		// (newer accounts might be preferred)
		daysSinceCreation := time.Since(account.CreatedAt).Hours() / 24
		if daysSinceCreation < 30 {
			score += 20
			reason = "Recently added account"
			confidence = 0.7
		} else if daysSinceCreation < 90 {
			score += 10
			reason = "Moderately new account"
			confidence = 0.6
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// LoadBalancingStrategy distributes load across accounts
type LoadBalancingStrategy struct{}

func NewLoadBalancingStrategy() *LoadBalancingStrategy {
	return &LoadBalancingStrategy{}
}

func (s *LoadBalancingStrategy) Name() string {
	return "LoadBalancing"
}

func (s *LoadBalancingStrategy) Priority() int {
	return 70
}

func (s *LoadBalancingStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	if len(accounts) == 0 {
		return results, nil
	}

	// Calculate average utilization
	totalUtilization := decimal.Zero
	for _, account := range accounts {
		if account.DailyLimit.GreaterThan(decimal.Zero) {
			utilization := account.DailyUsed.Div(account.DailyLimit)
			totalUtilization = totalUtilization.Add(utilization)
		}
	}
	avgUtilization := totalUtilization.Div(decimal.NewFromInt(int64(len(accounts))))

	for _, account := range accounts {
		score := 30 // Base score
		reason := "Load balancing"
		confidence := 0.3

		if account.DailyLimit.GreaterThan(decimal.Zero) {
			utilization := account.DailyUsed.Div(account.DailyLimit)
			
			// Prefer accounts with lower utilization
			if utilization.LessThan(avgUtilization) {
				bonus := int(avgUtilization.Sub(utilization).Mul(decimal.NewFromInt(100)).IntPart())
				if bonus > 50 {
					bonus = 50 // Cap the bonus
				}
				score += bonus
				reason = fmt.Sprintf("Below average utilization (%.1f%%)", utilization.Mul(decimal.NewFromInt(100)).InexactFloat64())
				confidence = 0.8
			} else {
				penalty := int(utilization.Sub(avgUtilization).Mul(decimal.NewFromInt(50)).IntPart())
				if penalty > 25 {
					penalty = 25 // Cap the penalty
				}
				score -= penalty
				reason = fmt.Sprintf("Above average utilization (%.1f%%)", utilization.Mul(decimal.NewFromInt(100)).InexactFloat64())
				confidence = 0.4
			}
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// AvailabilityStrategy checks account availability and status
type AvailabilityStrategy struct{}

func NewAvailabilityStrategy() *AvailabilityStrategy {
	return &AvailabilityStrategy{}
}

func (s *AvailabilityStrategy) Name() string {
	return "Availability"
}

func (s *AvailabilityStrategy) Priority() int {
	return 60
}

func (s *AvailabilityStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	for _, account := range accounts {
		score := 0
		reason := ""
		confidence := 0.0

		// Check account status
		switch account.Status {
		case "active":
			score = 50
			reason = "Account active"
			confidence = 1.0
		case "inactive":
			score = 0
			reason = "Account inactive"
			confidence = 0.0
		case "suspended":
			score = 0
			reason = "Account suspended"
			confidence = 0.0
		case "closed":
			score = 0
			reason = "Account closed"
			confidence = 0.0
		default:
			score = 10
			reason = "Unknown account status"
			confidence = 0.1
		}

		// Check if account was recently reset (good sign)
		if account.LastResetDate.After(time.Now().AddDate(0, 0, -1)) {
			score += 10
			reason += "; Recently reset"
			confidence += 0.1
		}

		// Check account type specific availability
		switch account.AccountType {
		case "alipay", "wechat":
			// Digital payment accounts are generally more available
			score += 10
			reason += "; Digital payment"
			confidence += 0.1
		case "bank":
			// Bank accounts might have different availability patterns
			score += 5
			reason += "; Bank account"
			confidence += 0.05
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// RiskAssessmentStrategy assesses risk factors
type RiskAssessmentStrategy struct{}

func NewRiskAssessmentStrategy() *RiskAssessmentStrategy {
	return &RiskAssessmentStrategy{}
}

func (s *RiskAssessmentStrategy) Name() string {
	return "RiskAssessment"
}

func (s *RiskAssessmentStrategy) Priority() int {
	return 50
}

func (s *RiskAssessmentStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	for _, account := range accounts {
		score := 30 // Base score
		reason := "Risk assessment"
		confidence := 0.3

		// Large amounts might be riskier
		if req.Amount.GreaterThan(decimal.NewFromInt(10000)) {
			score -= 10
			reason += "; Large amount"
			confidence += 0.1
		}

		// Business payments might be less risky than private
		if account.PaymentType == "business" && req.PaymentType == "business" {
			score += 15
			reason += "; Business-to-business"
			confidence += 0.2
		}

		// Account age factor (older accounts might be more stable)
		accountAge := time.Since(account.CreatedAt)
		if accountAge > 365*24*time.Hour { // More than 1 year
			score += 20
			reason += "; Mature account"
			confidence += 0.2
		} else if accountAge > 90*24*time.Hour { // More than 3 months
			score += 10
			reason += "; Established account"
			confidence += 0.1
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}

// TimeBasedStrategy considers time-based factors
type TimeBasedStrategy struct{}

func NewTimeBasedStrategy() *TimeBasedStrategy {
	return &TimeBasedStrategy{}
}

func (s *TimeBasedStrategy) Name() string {
	return "TimeBased"
}

func (s *TimeBasedStrategy) Priority() int {
	return 40
}

func (s *TimeBasedStrategy) Match(ctx context.Context, req *MatchRequest, accounts []*repository.ReceiveAccount) ([]*ScoredAccount, error) {
	var results []*ScoredAccount

	now := time.Now()
	hour := now.Hour()

	for _, account := range accounts {
		score := 20 // Base score
		reason := "Time-based factors"
		confidence := 0.2

		// Different account types might be better at different times
		switch account.AccountType {
		case "alipay", "wechat":
			// Digital payments are available 24/7 but might be more active during day
			if hour >= 8 && hour <= 22 {
				score += 15
				reason += "; Peak hours for digital payments"
				confidence += 0.3
			} else {
				score += 5
				reason += "; Off-peak hours"
				confidence += 0.1
			}
		case "bank":
			// Bank transfers might be better during business hours
			if hour >= 9 && hour <= 17 {
				score += 20
				reason += "; Business hours for bank transfers"
				confidence += 0.4
			} else if hour >= 18 && hour <= 21 {
				score += 10
				reason += "; Extended hours"
				confidence += 0.2
			} else {
				score -= 5
				reason += "; Outside business hours"
				confidence += 0.1
			}
		}

		// Weekend considerations
		if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
			if account.AccountType == "bank" {
				score -= 10
				reason += "; Weekend (bank)"
			} else {
				score += 5
				reason += "; Weekend (digital)"
			}
		}

		results = append(results, &ScoredAccount{
			Account:    account,
			Score:      score,
			Reason:     reason,
			Confidence: confidence,
		})
	}

	return results, nil
}