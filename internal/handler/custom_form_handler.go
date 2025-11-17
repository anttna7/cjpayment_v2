package handler

import (
	"net/http"
	"strconv"

	"github.com/company/cjpayment/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CustomFormHandler struct {
	formService service.CustomFormService
}

func NewCustomFormHandler(formService service.CustomFormService) *CustomFormHandler {
	return &CustomFormHandler{
		formService: formService,
	}
}

// POST /api/forms - 创建表单
func (h *CustomFormHandler) CreateForm(c *gin.Context) {
	var req service.CreateFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	tenantID, _ := c.Get("tenant_id")

	req.CreatedBy = userID.(uuid.UUID)
	req.TenantID = tenantID.(uuid.UUID)

	form, err := h.formService.CreateForm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Form created successfully",
		"data":    form,
	})
}

// GET /api/forms/:id - 获取表单详情（含字段）
func (h *CustomFormHandler) GetForm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	form, err := h.formService.GetFormByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": form})
}

// PUT /api/forms/:id - 更新表单
func (h *CustomFormHandler) UpdateForm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	var req service.UpdateFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	req.UpdatedBy = userID.(uuid.UUID)

	err = h.formService.UpdateForm(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Form updated successfully"})
}

// DELETE /api/forms/:id - 删除表单
func (h *CustomFormHandler) DeleteForm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	err = h.formService.DeleteForm(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Form deleted successfully"})
}

// GET /api/forms - 表单列表
func (h *CustomFormHandler) ListForms(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")

	var filter service.FormListFilter
	tid := tenantID.(uuid.UUID)
	filter.TenantID = &tid

	// 解析查询参数
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}
	if category := c.Query("category"); category != "" {
		filter.Category = &category
	}
	if isTemplate := c.Query("is_template"); isTemplate != "" {
		template := isTemplate == "true"
		filter.IsTemplate = &template
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Page = page
	filter.PageSize = pageSize

	forms, total, err := h.formService.ListForms(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      forms,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// POST /api/forms/:id/publish - 发布表单
func (h *CustomFormHandler) PublishForm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	err = h.formService.PublishForm(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Form published successfully"})
}

// POST /api/forms/:id/archive - 归档表单
func (h *CustomFormHandler) ArchiveForm(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	err = h.formService.ArchiveForm(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Form archived successfully"})
}

// POST /api/forms/:id/submissions - 提交表单
func (h *CustomFormHandler) SubmitForm(c *gin.Context) {
	formID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	var req service.SubmitFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if exists {
		uid := userID.(uuid.UUID)
		req.SubmittedBy = &uid
	}

	tenantID, _ := c.Get("tenant_id")
	req.FormID = formID
	req.TenantID = tenantID.(uuid.UUID)

	// 获取IP和UserAgent
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()
	req.IPAddress = &ipAddress
	req.UserAgent = &userAgent

	submission, err := h.formService.SubmitForm(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Form submitted successfully",
		"data":    submission,
	})
}

// GET /api/forms/:id/submissions - 获取表单提交记录列表
func (h *CustomFormHandler) ListSubmissions(c *gin.Context) {
	formID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form ID"})
		return
	}

	var filter service.SubmissionListFilter
	filter.FormID = &formID

	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Page = page
	filter.PageSize = pageSize

	submissions, total, err := h.formService.ListSubmissions(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      submissions,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GET /api/submissions/:id - 获取提交详情
func (h *CustomFormHandler) GetSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	submission, err := h.formService.GetSubmissionByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": submission})
}

// POST /api/submissions/:id/review - 审核提交
func (h *CustomFormHandler) ReviewSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission ID"})
		return
	}

	var req struct {
		Approved bool   `json:"approved"`
		Notes    string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	err = h.formService.ReviewSubmission(c.Request.Context(), id, userID.(uuid.UUID), req.Approved, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission reviewed successfully"})
}
