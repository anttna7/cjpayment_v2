package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"cjpayment/internal/repository"
)

// ScheduledExportService handles automated data exports
type ScheduledExportService struct {
	dataExportService *DataExportService
	notificationService *NotificationService
	repoManager       *repository.Manager
}

// NewScheduledExportService creates a new scheduled export service
func NewScheduledExportService(
	dataExportService *DataExportService,
	notificationService *NotificationService,
	repoManager *repository.Manager,
) *ScheduledExportService {
	return &ScheduledExportService{
		dataExportService:   dataExportService,
		notificationService: notificationService,
		repoManager:        repoManager,
	}
}

// ExportSchedule represents an export schedule configuration
type ExportSchedule struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	ExportType  string    `json:"export_type" gorm:"size:50;not null"` // daily, weekly, monthly
	Schedule    string    `json:"schedule" gorm:"size:100;not null"`   // cron expression
	MerchantID  *uint     `json:"merchant_id"`
	Status      string    `json:"status" gorm:"size:20;default:active"`
	EmailList   string    `json:"email_list" gorm:"size:1000"` // comma-separated emails
	LastRunAt   *time.Time `json:"last_run_at"`
	NextRunAt   *time.Time `json:"next_run_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	Merchant *repository.Merchant `json:"merchant,omitempty" gorm:"foreignKey:MerchantID"`
}

// ScheduledExportResult represents the result of a scheduled export
type ScheduledExportResult struct {
	ScheduleID   uint      `json:"schedule_id"`
	ScheduleName string    `json:"schedule_name"`
	ExportResult *ExportResponse `json:"export_result"`
	Success      bool      `json:"success"`
	ErrorMessage string    `json:"error_message,omitempty"`
	ExecutedAt   time.Time `json:"executed_at"`
}

// RunDailyExport executes daily export for all active schedules
func (s *ScheduledExportService) RunDailyExport(ctx context.Context) error {
	log.Println("Starting daily export job...")

	// Get all active daily export schedules
	schedules, err := s.getActiveSchedules(ctx, "daily")
	if err != nil {
		return fmt.Errorf("failed to get active schedules: %w", err)
	}

	var results []ScheduledExportResult
	
	for _, schedule := range schedules {
		result := s.executeScheduledExport(ctx, &schedule)
		results = append(results, result)
		
		// Update schedule last run time
		now := time.Now()
		schedule.LastRunAt = &now
		nextRun := s.calculateNextRun(schedule.Schedule)
		schedule.NextRunAt = &nextRun
		
		err := s.updateSchedule(ctx, &schedule)
		if err != nil {
			log.Printf("Failed to update schedule %d: %v", schedule.ID, err)
		}
	}

	// Send summary notification
	err = s.sendExportSummary(ctx, results)
	if err != nil {
		log.Printf("Failed to send export summary: %v", err)
	}

	log.Printf("Daily export job completed. Processed %d schedules", len(schedules))
	return nil
}

// ExecuteSchedule executes a specific export schedule
func (s *ScheduledExportService) ExecuteSchedule(ctx context.Context, scheduleID uint) (*ScheduledExportResult, error) {
	schedule, err := s.getScheduleByID(ctx, scheduleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedule: %w", err)
	}

	result := s.executeScheduledExport(ctx, schedule)
	
	// Update schedule last run time
	now := time.Now()
	schedule.LastRunAt = &now
	nextRun := s.calculateNextRun(schedule.Schedule)
	schedule.NextRunAt = &nextRun
	
	err = s.updateSchedule(ctx, schedule)
	if err != nil {
		log.Printf("Failed to update schedule %d: %v", schedule.ID, err)
	}

	return &result, nil
}

// CreateSchedule creates a new export schedule
func (s *ScheduledExportService) CreateSchedule(ctx context.Context, schedule *ExportSchedule) error {
	// Validate schedule
	if err := s.validateSchedule(schedule); err != nil {
		return fmt.Errorf("invalid schedule: %w", err)
	}

	// Calculate next run time
	nextRun := s.calculateNextRun(schedule.Schedule)
	schedule.NextRunAt = &nextRun
	schedule.Status = "active"

	return s.repoManager.DB.WithContext(ctx).Create(schedule).Error
}

// UpdateSchedule updates an existing export schedule
func (s *ScheduledExportService) UpdateSchedule(ctx context.Context, scheduleID uint, updates *ExportSchedule) error {
	schedule, err := s.getScheduleByID(ctx, scheduleID)
	if err != nil {
		return err
	}

	// Update fields
	if updates.Name != "" {
		schedule.Name = updates.Name
	}
	if updates.Description != "" {
		schedule.Description = updates.Description
	}
	if updates.Schedule != "" {
		schedule.Schedule = updates.Schedule
		nextRun := s.calculateNextRun(schedule.Schedule)
		schedule.NextRunAt = &nextRun
	}
	if updates.EmailList != "" {
		schedule.EmailList = updates.EmailList
	}
	if updates.Status != "" {
		schedule.Status = updates.Status
	}

	return s.updateSchedule(ctx, schedule)
}

// DeleteSchedule deletes an export schedule
func (s *ScheduledExportService) DeleteSchedule(ctx context.Context, scheduleID uint) error {
	return s.repoManager.DB.WithContext(ctx).Delete(&ExportSchedule{}, scheduleID).Error
}

// ListSchedules lists all export schedules
func (s *ScheduledExportService) ListSchedules(ctx context.Context) ([]ExportSchedule, error) {
	var schedules []ExportSchedule
	err := s.repoManager.DB.WithContext(ctx).
		Preload("Merchant").
		Order("created_at DESC").
		Find(&schedules).Error
	return schedules, err
}

// executeScheduledExport executes a single scheduled export
func (s *ScheduledExportService) executeScheduledExport(ctx context.Context, schedule *ExportSchedule) ScheduledExportResult {
	result := ScheduledExportResult{
		ScheduleID:   schedule.ID,
		ScheduleName: schedule.Name,
		ExecutedAt:   time.Now(),
	}

	// Determine export date range based on schedule type
	var req *ExportRequest
	switch schedule.ExportType {
	case "daily":
		req = &ExportRequest{
			MerchantID:       schedule.MerchantID,
			IncludeSensitive: false, // Default to masked data for scheduled exports
			Format:          "excel",
		}
	default:
		result.Success = false
		result.ErrorMessage = fmt.Sprintf("unsupported export type: %s", schedule.ExportType)
		return result
	}

	// Execute export
	exportResult, err := s.dataExportService.ExportYesterdayData(ctx, req)
	if err != nil {
		result.Success = false
		result.ErrorMessage = err.Error()
		return result
	}

	result.Success = true
	result.ExportResult = exportResult

	// Send email notification if email list is configured
	if schedule.EmailList != "" {
		err = s.sendExportNotification(ctx, schedule, exportResult)
		if err != nil {
			log.Printf("Failed to send export notification for schedule %d: %v", schedule.ID, err)
		}
	}

	return result
}

// sendExportNotification sends email notification for completed export
func (s *ScheduledExportService) sendExportNotification(ctx context.Context, schedule *ExportSchedule, exportResult *ExportResponse) error {
	subject := fmt.Sprintf("数据导出完成 - %s", schedule.Name)
	
	content := fmt.Sprintf(`
		<h3>数据导出完成通知</h3>
		<p><strong>导出任务：</strong>%s</p>
		<p><strong>导出时间：</strong>%s</p>
		<p><strong>文件名：</strong>%s</p>
		<p><strong>记录数量：</strong>%d</p>
		<p><strong>文件大小：</strong>%.2f KB</p>
		<p><strong>下载链接：</strong><a href="%s">点击下载</a></p>
		<br>
		<p>此邮件由系统自动发送，请勿回复。</p>
	`,
		schedule.Name,
		exportResult.ExportedAt.Format("2006-01-02 15:04:05"),
		exportResult.FileName,
		exportResult.RecordCount,
		float64(exportResult.FileSize)/1024,
		exportResult.DownloadURL,
	)

	notification := &repository.Notification{
		Type:      "export_completed",
		Title:     subject,
		Content:   content,
		Recipient: schedule.EmailList,
		Channel:   "email",
		Status:    "pending",
	}

	return s.notificationService.SendNotification(ctx, notification)
}

// sendExportSummary sends daily export summary
func (s *ScheduledExportService) sendExportSummary(ctx context.Context, results []ScheduledExportResult) error {
	if len(results) == 0 {
		return nil
	}

	successCount := 0
	failureCount := 0
	totalRecords := 0

	for _, result := range results {
		if result.Success {
			successCount++
			if result.ExportResult != nil {
				totalRecords += result.ExportResult.RecordCount
			}
		} else {
			failureCount++
		}
	}

	subject := fmt.Sprintf("每日数据导出汇总 - %s", time.Now().Format("2006-01-02"))
	
	content := fmt.Sprintf(`
		<h3>每日数据导出汇总</h3>
		<p><strong>执行时间：</strong>%s</p>
		<p><strong>总任务数：</strong>%d</p>
		<p><strong>成功任务：</strong>%d</p>
		<p><strong>失败任务：</strong>%d</p>
		<p><strong>导出记录总数：</strong>%d</p>
		<br>
		<h4>任务详情：</h4>
		<table border="1" style="border-collapse: collapse; width: 100%%;">
			<tr>
				<th>任务名称</th>
				<th>状态</th>
				<th>记录数</th>
				<th>错误信息</th>
			</tr>
	`,
		time.Now().Format("2006-01-02 15:04:05"),
		len(results),
		successCount,
		failureCount,
		totalRecords,
	)

	for _, result := range results {
		status := "成功"
		recordCount := 0
		errorMsg := ""
		
		if !result.Success {
			status = "失败"
			errorMsg = result.ErrorMessage
		} else if result.ExportResult != nil {
			recordCount = result.ExportResult.RecordCount
		}

		content += fmt.Sprintf(`
			<tr>
				<td>%s</td>
				<td>%s</td>
				<td>%d</td>
				<td>%s</td>
			</tr>
		`, result.ScheduleName, status, recordCount, errorMsg)
	}

	content += `
		</table>
		<br>
		<p>此邮件由系统自动发送，请勿回复。</p>
	`

	// Send to system administrators (this should be configurable)
	notification := &repository.Notification{
		Type:      "export_summary",
		Title:     subject,
		Content:   content,
		Recipient: "admin@example.com", // This should be configurable
		Channel:   "email",
		Status:    "pending",
	}

	return s.notificationService.SendNotification(ctx, notification)
}

// getActiveSchedules gets all active schedules of a specific type
func (s *ScheduledExportService) getActiveSchedules(ctx context.Context, exportType string) ([]ExportSchedule, error) {
	var schedules []ExportSchedule
	err := s.repoManager.DB.WithContext(ctx).
		Preload("Merchant").
		Where("export_type = ? AND status = ?", exportType, "active").
		Find(&schedules).Error
	return schedules, err
}

// getScheduleByID gets a schedule by ID
func (s *ScheduledExportService) getScheduleByID(ctx context.Context, scheduleID uint) (*ExportSchedule, error) {
	var schedule ExportSchedule
	err := s.repoManager.DB.WithContext(ctx).
		Preload("Merchant").
		First(&schedule, scheduleID).Error
	return &schedule, err
}

// updateSchedule updates a schedule in the database
func (s *ScheduledExportService) updateSchedule(ctx context.Context, schedule *ExportSchedule) error {
	return s.repoManager.DB.WithContext(ctx).Save(schedule).Error
}

// validateSchedule validates schedule configuration
func (s *ScheduledExportService) validateSchedule(schedule *ExportSchedule) error {
	if schedule.Name == "" {
		return fmt.Errorf("schedule name is required")
	}
	if schedule.ExportType == "" {
		return fmt.Errorf("export type is required")
	}
	if schedule.Schedule == "" {
		return fmt.Errorf("schedule expression is required")
	}
	return nil
}

// calculateNextRun calculates the next run time based on schedule expression
// This is a simplified implementation. In production, you might want to use a proper cron library
func (s *ScheduledExportService) calculateNextRun(schedule string) time.Time {
	now := time.Now()
	
	switch schedule {
	case "daily":
		// Run at 2 AM every day
		next := time.Date(now.Year(), now.Month(), now.Day()+1, 2, 0, 0, 0, now.Location())
		return next
	case "weekly":
		// Run at 2 AM every Monday
		daysUntilMonday := (7 - int(now.Weekday()) + 1) % 7
		if daysUntilMonday == 0 {
			daysUntilMonday = 7
		}
		next := time.Date(now.Year(), now.Month(), now.Day()+daysUntilMonday, 2, 0, 0, 0, now.Location())
		return next
	case "monthly":
		// Run at 2 AM on the 1st of next month
		next := time.Date(now.Year(), now.Month()+1, 1, 2, 0, 0, 0, now.Location())
		return next
	default:
		// Default to next day
		return now.Add(24 * time.Hour)
	}
}