package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"cjpayment/internal/service"
)

// DataExportHandler handles data export related HTTP requests
type DataExportHandler struct {
	dataExportService     *service.DataExportService
	scheduledExportService *service.ScheduledExportService
}

// NewDataExportHandler creates a new data export handler
func NewDataExportHandler(
	dataExportService *service.DataExportService,
	scheduledExportService *service.ScheduledExportService,
) *DataExportHandler {
	return &DataExportHandler{
		dataExportService:     dataExportService,
		scheduledExportService: scheduledExportService,
	}
}

// ExportTodayData exports today's order data
// @Summary Export today's order data
// @Description Export today's order data to Excel format
// @Tags data-export
// @Accept json
// @Produce json
// @Param request body service.ExportRequest true "Export request"
// @Success 200 {object} service.ExportResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/today [post]
func (h *DataExportHandler) ExportTodayData(c *gin.Context) {
	var req service.ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	result, err := h.dataExportService.ExportTodayData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "EXPORT_FAILED",
			Message: "Failed to export today's data",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ExportYesterdayData exports yesterday's order data
// @Summary Export yesterday's order data
// @Description Export yesterday's order data to Excel format
// @Tags data-export
// @Accept json
// @Produce json
// @Param request body service.ExportRequest true "Export request"
// @Success 200 {object} service.ExportResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/yesterday [post]
func (h *DataExportHandler) ExportYesterdayData(c *gin.Context) {
	var req service.ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	result, err := h.dataExportService.ExportYesterdayData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "EXPORT_FAILED",
			Message: "Failed to export yesterday's data",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ExportCustomRange exports order data for a custom date range
// @Summary Export order data for custom date range
// @Description Export order data for a specified date range to Excel format
// @Tags data-export
// @Accept json
// @Produce json
// @Param request body service.ExportRequest true "Export request"
// @Success 200 {object} service.ExportResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/custom [post]
func (h *DataExportHandler) ExportCustomRange(c *gin.Context) {
	var req service.ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	// Validate date range
	if req.StartDate.IsZero() || req.EndDate.IsZero() {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_DATE_RANGE",
			Message: "Start date and end date are required",
		})
		return
	}

	if req.EndDate.Before(req.StartDate) {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_DATE_RANGE",
			Message: "End date must be after start date",
		})
		return
	}

	result, err := h.dataExportService.ExportOrderData(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "EXPORT_FAILED",
			Message: "Failed to export data",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDailyReport gets daily report summary
// @Summary Get daily report summary
// @Description Get daily report summary with statistics
// @Tags data-export
// @Accept json
// @Produce json
// @Param date query string false "Date in YYYY-MM-DD format (default: today)"
// @Success 200 {object} service.DailyReportSummary
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/daily-report [get]
func (h *DataExportHandler) GetDailyReport(c *gin.Context) {
	dateStr := c.Query("date")
	var date time.Time
	var err error

	if dateStr == "" {
		date = time.Now()
	} else {
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Code:    "INVALID_DATE_FORMAT",
				Message: "Invalid date format. Use YYYY-MM-DD",
				Details: err.Error(),
			})
			return
		}
	}

	result, err := h.dataExportService.GetDailyReport(c.Request.Context(), date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "REPORT_FAILED",
			Message: "Failed to generate daily report",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// CreateExportSchedule creates a new export schedule
// @Summary Create export schedule
// @Description Create a new automated export schedule
// @Tags scheduled-export
// @Accept json
// @Produce json
// @Param request body service.ExportSchedule true "Export schedule"
// @Success 201 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/schedules [post]
func (h *DataExportHandler) CreateExportSchedule(c *gin.Context) {
	var schedule service.ExportSchedule
	if err := c.ShouldBindJSON(&schedule); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	err := h.scheduledExportService.CreateSchedule(c.Request.Context(), &schedule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "CREATE_SCHEDULE_FAILED",
			Message: "Failed to create export schedule",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Message: "Export schedule created successfully",
		Data:    schedule,
	})
}

// UpdateExportSchedule updates an existing export schedule
// @Summary Update export schedule
// @Description Update an existing automated export schedule
// @Tags scheduled-export
// @Accept json
// @Produce json
// @Param id path int true "Schedule ID"
// @Param request body service.ExportSchedule true "Export schedule updates"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/schedules/{id} [put]
func (h *DataExportHandler) UpdateExportSchedule(c *gin.Context) {
	scheduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_SCHEDULE_ID",
			Message: "Invalid schedule ID",
		})
		return
	}

	var updates service.ExportSchedule
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_REQUEST",
			Message: "Invalid request format",
			Details: err.Error(),
		})
		return
	}

	err = h.scheduledExportService.UpdateSchedule(c.Request.Context(), uint(scheduleID), &updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "UPDATE_SCHEDULE_FAILED",
			Message: "Failed to update export schedule",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Export schedule updated successfully",
	})
}

// DeleteExportSchedule deletes an export schedule
// @Summary Delete export schedule
// @Description Delete an automated export schedule
// @Tags scheduled-export
// @Accept json
// @Produce json
// @Param id path int true "Schedule ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/schedules/{id} [delete]
func (h *DataExportHandler) DeleteExportSchedule(c *gin.Context) {
	scheduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_SCHEDULE_ID",
			Message: "Invalid schedule ID",
		})
		return
	}

	err = h.scheduledExportService.DeleteSchedule(c.Request.Context(), uint(scheduleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "DELETE_SCHEDULE_FAILED",
			Message: "Failed to delete export schedule",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Export schedule deleted successfully",
	})
}

// ListExportSchedules lists all export schedules
// @Summary List export schedules
// @Description List all automated export schedules
// @Tags scheduled-export
// @Accept json
// @Produce json
// @Success 200 {array} service.ExportSchedule
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/schedules [get]
func (h *DataExportHandler) ListExportSchedules(c *gin.Context) {
	schedules, err := h.scheduledExportService.ListSchedules(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "LIST_SCHEDULES_FAILED",
			Message: "Failed to list export schedules",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, schedules)
}

// ExecuteSchedule manually executes an export schedule
// @Summary Execute export schedule
// @Description Manually execute an automated export schedule
// @Tags scheduled-export
// @Accept json
// @Produce json
// @Param id path int true "Schedule ID"
// @Success 200 {object} service.ScheduledExportResult
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/exports/schedules/{id}/execute [post]
func (h *DataExportHandler) ExecuteSchedule(c *gin.Context) {
	scheduleID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_SCHEDULE_ID",
			Message: "Invalid schedule ID",
		})
		return
	}

	result, err := h.scheduledExportService.ExecuteSchedule(c.Request.Context(), uint(scheduleID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "EXECUTE_SCHEDULE_FAILED",
			Message: "Failed to execute export schedule",
			Details: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DownloadExportFile serves exported files for download
// @Summary Download export file
// @Description Download an exported file
// @Tags data-export
// @Param filename path string true "File name"
// @Success 200 {file} file
// @Failure 404 {object} ErrorResponse
// @Router /api/exports/download/{filename} [get]
func (h *DataExportHandler) DownloadExportFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Code:    "INVALID_FILENAME",
			Message: "Filename is required",
		})
		return
	}

	// In a real implementation, you would:
	// 1. Validate the filename and check permissions
	// 2. Retrieve the file from storage (filesystem, S3, etc.)
	// 3. Set appropriate headers and serve the file
	
	// For now, return a placeholder response
	c.JSON(http.StatusNotImplemented, ErrorResponse{
		Code:    "NOT_IMPLEMENTED",
		Message: "File download not implemented yet",
	})
}

// RegisterRoutes registers all data export routes
func (h *DataExportHandler) RegisterRoutes(r *gin.RouterGroup) {
	exports := r.Group("/exports")
	{
		// Data export endpoints
		exports.POST("/today", h.ExportTodayData)
		exports.POST("/yesterday", h.ExportYesterdayData)
		exports.POST("/custom", h.ExportCustomRange)
		exports.GET("/daily-report", h.GetDailyReport)
		exports.GET("/download/:filename", h.DownloadExportFile)

		// Scheduled export endpoints
		schedules := exports.Group("/schedules")
		{
			schedules.GET("", h.ListExportSchedules)
			schedules.POST("", h.CreateExportSchedule)
			schedules.PUT("/:id", h.UpdateExportSchedule)
			schedules.DELETE("/:id", h.DeleteExportSchedule)
			schedules.POST("/:id/execute", h.ExecuteSchedule)
		}
	}
}