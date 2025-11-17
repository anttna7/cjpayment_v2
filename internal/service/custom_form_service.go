package service

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/company/cjpayment/internal/repository"
	"github.com/google/uuid"
)

// CustomFormService 自定义表单服务接口
type CustomFormService interface {
	// 表单管理
	CreateForm(ctx context.Context, req CreateFormRequest) (*repository.CustomForm, error)
	UpdateForm(ctx context.Context, id uuid.UUID, req UpdateFormRequest) error
	DeleteForm(ctx context.Context, id uuid.UUID) error
	GetFormByID(ctx context.Context, id uuid.UUID) (*FormDetail, error)
	ListForms(ctx context.Context, filter FormListFilter) ([]*repository.CustomForm, int, error)
	PublishForm(ctx context.Context, id uuid.UUID) error
	ArchiveForm(ctx context.Context, id uuid.UUID) error

	// 表单提交
	SubmitForm(ctx context.Context, req SubmitFormRequest) (*repository.FormSubmission, error)
	GetSubmissionByID(ctx context.Context, id uuid.UUID) (*SubmissionDetail, error)
	ListSubmissions(ctx context.Context, filter SubmissionListFilter) ([]*repository.FormSubmission, int, error)
	ReviewSubmission(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, approved bool, notes string) error

	// 字段管理
	AddField(ctx context.Context, formID uuid.UUID, field repository.FormField) error
	UpdateField(ctx context.Context, fieldID uuid.UUID, field repository.FormField) error
	DeleteField(ctx context.Context, fieldID uuid.UUID) error

	// 验证
	ValidateSubmission(ctx context.Context, formID uuid.UUID, data map[string]interface{}) error
}

// CreateFormRequest 创建表单请求
type CreateFormRequest struct {
	TenantID           uuid.UUID                      `json:"tenant_id"`
	Name               string                         `json:"name"`
	Code               string                         `json:"code"`
	Description        *string                        `json:"description"`
	Category           *string                        `json:"category"`
	Config             map[string]interface{}         `json:"config"`
	AllowedRoles       []uuid.UUID                    `json:"allowed_roles"`
	AllowedDepartments []uuid.UUID                    `json:"allowed_departments"`
	Fields             []repository.FormField         `json:"fields"`
	CreatedBy          uuid.UUID                      `json:"created_by"`
}

// UpdateFormRequest 更新表单请求
type UpdateFormRequest struct {
	Name               *string                        `json:"name"`
	Description        *string                        `json:"description"`
	Category           *string                        `json:"category"`
	Config             *map[string]interface{}        `json:"config"`
	AllowedRoles       *[]uuid.UUID                   `json:"allowed_roles"`
	AllowedDepartments *[]uuid.UUID                   `json:"allowed_departments"`
	UpdatedBy          uuid.UUID                      `json:"updated_by"`
}

// SubmitFormRequest 提交表单请求
type SubmitFormRequest struct {
	FormID         uuid.UUID              `json:"form_id"`
	TenantID       uuid.UUID              `json:"tenant_id"`
	SubmissionData map[string]interface{} `json:"submission_data"`
	RelatedType    *string                `json:"related_type"`
	RelatedID      *uuid.UUID             `json:"related_id"`
	SubmittedBy    *uuid.UUID             `json:"submitted_by"`
	IPAddress      *string                `json:"ip_address"`
	UserAgent      *string                `json:"user_agent"`
}

// FormDetail 表单详情（含字段）
type FormDetail struct {
	Form   *repository.CustomForm   `json:"form"`
	Fields []*repository.FormField  `json:"fields"`
}

// SubmissionDetail 提交详情（含文件）
type SubmissionDetail struct {
	Submission *repository.FormSubmission     `json:"submission"`
	Files      []*repository.FormSubmissionFile `json:"files"`
}

// FormListFilter 表单列表过滤器
type FormListFilter struct {
	TenantID   *uuid.UUID `json:"tenant_id"`
	Status     *string    `json:"status"`
	Category   *string    `json:"category"`
	IsTemplate *bool      `json:"is_template"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
}

// SubmissionListFilter 提交列表过滤器
type SubmissionListFilter struct {
	FormID      *uuid.UUID `json:"form_id"`
	TenantID    *uuid.UUID `json:"tenant_id"`
	Status      *string    `json:"status"`
	SubmittedBy *uuid.UUID `json:"submitted_by"`
	Page        int        `json:"page"`
	PageSize    int        `json:"page_size"`
}

type customFormService struct {
	formRepo       repository.CustomFormRepository
	fieldRepo      repository.FormFieldRepository
	submissionRepo repository.FormSubmissionRepository
}

// NewCustomFormService 创建表单服务实例
func NewCustomFormService(
	formRepo repository.CustomFormRepository,
	fieldRepo repository.FormFieldRepository,
	submissionRepo repository.FormSubmissionRepository,
) CustomFormService {
	return &customFormService{
		formRepo:       formRepo,
		fieldRepo:      fieldRepo,
		submissionRepo: submissionRepo,
	}
}

func (s *customFormService) CreateForm(ctx context.Context, req CreateFormRequest) (*repository.CustomForm, error) {
	// 检查code是否已存在
	_, err := s.formRepo.GetByCode(ctx, req.TenantID, req.Code)
	if err == nil {
		return nil, fmt.Errorf("form code already exists")
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check form code: %w", err)
	}

	form := &repository.CustomForm{
		TenantID:           req.TenantID,
		Name:               req.Name,
		Code:               req.Code,
		Description:        req.Description,
		Category:           req.Category,
		Config:             req.Config,
		Status:             "draft",
		IsTemplate:         false,
		AllowedRoles:       repository.JSONBArray(req.AllowedRoles),
		AllowedDepartments: repository.JSONBArray(req.AllowedDepartments),
		CreatedBy:          &req.CreatedBy,
		UpdatedBy:          &req.CreatedBy,
	}

	err = s.formRepo.Create(ctx, form)
	if err != nil {
		return nil, fmt.Errorf("failed to create form: %w", err)
	}

	// 创建字段
	if len(req.Fields) > 0 {
		for i := range req.Fields {
			req.Fields[i].FormID = form.ID
		}
		err = s.fieldRepo.BatchCreate(ctx, ptrSliceToSlice(req.Fields))
		if err != nil {
			return nil, fmt.Errorf("failed to create form fields: %w", err)
		}
	}

	return form, nil
}

func (s *customFormService) UpdateForm(ctx context.Context, id uuid.UUID, req UpdateFormRequest) error {
	// 获取现有表单
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get form: %w", err)
	}

	// 只能更新draft状态的表单
	if form.Status != "draft" {
		return fmt.Errorf("can only update draft forms")
	}

	// 更新字段
	if req.Name != nil {
		form.Name = *req.Name
	}
	if req.Description != nil {
		form.Description = req.Description
	}
	if req.Category != nil {
		form.Category = req.Category
	}
	if req.Config != nil {
		form.Config = *req.Config
	}
	if req.AllowedRoles != nil {
		form.AllowedRoles = repository.JSONBArray(*req.AllowedRoles)
	}
	if req.AllowedDepartments != nil {
		form.AllowedDepartments = repository.JSONBArray(*req.AllowedDepartments)
	}
	form.UpdatedBy = &req.UpdatedBy

	err = s.formRepo.Update(ctx, form)
	if err != nil {
		return fmt.Errorf("failed to update form: %w", err)
	}

	return nil
}

func (s *customFormService) DeleteForm(ctx context.Context, id uuid.UUID) error {
	// 获取现有表单
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get form: %w", err)
	}

	// 只能删除draft状态的表单
	if form.Status != "draft" {
		return fmt.Errorf("can only delete draft forms")
	}

	// 删除所有字段
	err = s.fieldRepo.BatchDelete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete form fields: %w", err)
	}

	err = s.formRepo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete form: %w", err)
	}

	return nil
}

func (s *customFormService) GetFormByID(ctx context.Context, id uuid.UUID) (*FormDetail, error) {
	form, err := s.formRepo.GetByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("form not found")
		}
		return nil, fmt.Errorf("failed to get form: %w", err)
	}

	fields, err := s.fieldRepo.GetByFormID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get form fields: %w", err)
	}

	return &FormDetail{
		Form:   form,
		Fields: fields,
	}, nil
}

func (s *customFormService) ListForms(ctx context.Context, filter FormListFilter) ([]*repository.CustomForm, int, error) {
	// 设置默认分页
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize

	repoFilter := repository.CustomFormFilter{
		TenantID:   filter.TenantID,
		Status:     filter.Status,
		Category:   filter.Category,
		IsTemplate: filter.IsTemplate,
		Limit:      filter.PageSize,
		Offset:     offset,
	}

	forms, total, err := s.formRepo.List(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list forms: %w", err)
	}

	return forms, total, nil
}

func (s *customFormService) PublishForm(ctx context.Context, id uuid.UUID) error {
	err := s.formRepo.UpdateStatus(ctx, id, "active")
	if err != nil {
		return fmt.Errorf("failed to publish form: %w", err)
	}

	return nil
}

func (s *customFormService) ArchiveForm(ctx context.Context, id uuid.UUID) error {
	err := s.formRepo.UpdateStatus(ctx, id, "archived")
	if err != nil {
		return fmt.Errorf("failed to archive form: %w", err)
	}

	return nil
}

// 表单提交
func (s *customFormService) SubmitForm(ctx context.Context, req SubmitFormRequest) (*repository.FormSubmission, error) {
	// 验证表单是否存在且为active状态
	form, err := s.formRepo.GetByID(ctx, req.FormID)
	if err != nil {
		return nil, fmt.Errorf("form not found: %w", err)
	}

	if form.Status != "active" {
		return nil, fmt.Errorf("form is not active")
	}

	// 验证提交数据
	err = s.ValidateSubmission(ctx, req.FormID, req.SubmissionData)
	if err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	submission := &repository.FormSubmission{
		FormID:         req.FormID,
		TenantID:       req.TenantID,
		SubmissionData: req.SubmissionData,
		RelatedType:    req.RelatedType,
		RelatedID:      req.RelatedID,
		Status:         "submitted",
		SubmittedBy:    req.SubmittedBy,
		IPAddress:      req.IPAddress,
		UserAgent:      req.UserAgent,
	}

	err = s.submissionRepo.Create(ctx, submission)
	if err != nil {
		return nil, fmt.Errorf("failed to create submission: %w", err)
	}

	return submission, nil
}

func (s *customFormService) GetSubmissionByID(ctx context.Context, id uuid.UUID) (*SubmissionDetail, error) {
	submission, err := s.submissionRepo.GetByID(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("submission not found")
		}
		return nil, fmt.Errorf("failed to get submission: %w", err)
	}

	files, err := s.submissionRepo.GetFiles(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get submission files: %w", err)
	}

	return &SubmissionDetail{
		Submission: submission,
		Files:      files,
	}, nil
}

func (s *customFormService) ListSubmissions(ctx context.Context, filter SubmissionListFilter) ([]*repository.FormSubmission, int, error) {
	// 设置默认分页
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	offset := (filter.Page - 1) * filter.PageSize

	repoFilter := repository.FormSubmissionFilter{
		FormID:      filter.FormID,
		TenantID:    filter.TenantID,
		Status:      filter.Status,
		SubmittedBy: filter.SubmittedBy,
		Limit:       filter.PageSize,
		Offset:      offset,
	}

	submissions, total, err := s.submissionRepo.List(ctx, repoFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list submissions: %w", err)
	}

	return submissions, total, nil
}

func (s *customFormService) ReviewSubmission(ctx context.Context, id uuid.UUID, reviewerID uuid.UUID, approved bool, notes string) error {
	status := "rejected"
	if approved {
		status = "approved"
	}

	err := s.submissionRepo.UpdateStatus(ctx, id, status, reviewerID, notes)
	if err != nil {
		return fmt.Errorf("failed to review submission: %w", err)
	}

	return nil
}

// 字段管理
func (s *customFormService) AddField(ctx context.Context, formID uuid.UUID, field repository.FormField) error {
	// 验证表单存在且为draft状态
	form, err := s.formRepo.GetByID(ctx, formID)
	if err != nil {
		return fmt.Errorf("form not found: %w", err)
	}

	if form.Status != "draft" {
		return fmt.Errorf("can only add fields to draft forms")
	}

	field.FormID = formID
	err = s.fieldRepo.Create(ctx, &field)
	if err != nil {
		return fmt.Errorf("failed to add field: %w", err)
	}

	return nil
}

func (s *customFormService) UpdateField(ctx context.Context, fieldID uuid.UUID, field repository.FormField) error {
	// 获取现有字段
	existingField, err := s.fieldRepo.GetByID(ctx, fieldID)
	if err != nil {
		return fmt.Errorf("field not found: %w", err)
	}

	// 验证表单状态
	form, err := s.formRepo.GetByID(ctx, existingField.FormID)
	if err != nil {
		return fmt.Errorf("form not found: %w", err)
	}

	if form.Status != "draft" {
		return fmt.Errorf("can only update fields of draft forms")
	}

	field.ID = fieldID
	field.FormID = existingField.FormID
	err = s.fieldRepo.Update(ctx, &field)
	if err != nil {
		return fmt.Errorf("failed to update field: %w", err)
	}

	return nil
}

func (s *customFormService) DeleteField(ctx context.Context, fieldID uuid.UUID) error {
	// 获取字段
	field, err := s.fieldRepo.GetByID(ctx, fieldID)
	if err != nil {
		return fmt.Errorf("field not found: %w", err)
	}

	// 验证表单状态
	form, err := s.formRepo.GetByID(ctx, field.FormID)
	if err != nil {
		return fmt.Errorf("form not found: %w", err)
	}

	if form.Status != "draft" {
		return fmt.Errorf("can only delete fields from draft forms")
	}

	err = s.fieldRepo.Delete(ctx, fieldID)
	if err != nil {
		return fmt.Errorf("failed to delete field: %w", err)
	}

	return nil
}

// 验证提交数据
func (s *customFormService) ValidateSubmission(ctx context.Context, formID uuid.UUID, data map[string]interface{}) error {
	// 获取表单字段
	fields, err := s.fieldRepo.GetByFormID(ctx, formID)
	if err != nil {
		return fmt.Errorf("failed to get form fields: %w", err)
	}

	// 验证必填字段
	for _, field := range fields {
		if field.IsRequired {
			value, exists := data[field.FieldName]
			if !exists || value == nil || value == "" {
				return fmt.Errorf("field %s is required", field.FieldLabel)
			}
		}

		// TODO: 添加更多验证规则
		// - 字段类型验证
		// - 正则表达式验证
		// - 数值范围验证
		// - 字符长度验证
	}

	return nil
}

// 辅助函数：将值切片转换为指针切片
func ptrSliceToSlice(fields []repository.FormField) []*repository.FormField {
	result := make([]*repository.FormField, len(fields))
	for i := range fields {
		result[i] = &fields[i]
	}
	return result
}
