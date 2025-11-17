package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// CustomFormRepository 自定义表单数据访问接口
type CustomFormRepository interface {
	Create(ctx context.Context, form *CustomForm) error
	Update(ctx context.Context, form *CustomForm) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*CustomForm, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*CustomForm, error)
	List(ctx context.Context, filter CustomFormFilter) ([]*CustomForm, int, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID) ([]*CustomForm, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

// FormFieldRepository 表单字段数据访问接口
type FormFieldRepository interface {
	Create(ctx context.Context, field *FormField) error
	Update(ctx context.Context, field *FormField) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*FormField, error)
	GetByFormID(ctx context.Context, formID uuid.UUID) ([]*FormField, error)
	BatchCreate(ctx context.Context, fields []*FormField) error
	BatchDelete(ctx context.Context, formID uuid.UUID) error
}

// FormSubmissionRepository 表单提交数据访问接口
type FormSubmissionRepository interface {
	Create(ctx context.Context, submission *FormSubmission) error
	Update(ctx context.Context, submission *FormSubmission) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*FormSubmission, error)
	List(ctx context.Context, filter FormSubmissionFilter) ([]*FormSubmission, int, error)
	GetByFormID(ctx context.Context, formID uuid.UUID, limit, offset int) ([]*FormSubmission, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID, notes string) error

	// 文件管理
	AddFile(ctx context.Context, file *FormSubmissionFile) error
	GetFiles(ctx context.Context, submissionID uuid.UUID) ([]*FormSubmissionFile, error)
	DeleteFile(ctx context.Context, id uuid.UUID) error
}

// CustomFormFilter 表单过滤器
type CustomFormFilter struct {
	TenantID   *uuid.UUID
	Status     *string
	Category   *string
	IsTemplate *bool
	Limit      int
	Offset     int
}

// FormSubmissionFilter 表单提交过滤器
type FormSubmissionFilter struct {
	FormID      *uuid.UUID
	TenantID    *uuid.UUID
	Status      *string
	SubmittedBy *uuid.UUID
	StartDate   *time.Time
	EndDate     *time.Time
	Limit       int
	Offset      int
}

// CustomForm Repository 实现
type customFormRepository struct {
	db *sqlx.DB
}

func NewCustomFormRepository(db *sqlx.DB) CustomFormRepository {
	return &customFormRepository{db: db}
}

func (r *customFormRepository) Create(ctx context.Context, form *CustomForm) error {
	query := `
		INSERT INTO custom_forms (
			id, tenant_id, name, code, description, category, config,
			status, is_template, allowed_roles, allowed_departments,
			created_by, updated_by, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :name, :code, :description, :category, :config,
			:status, :is_template, :allowed_roles, :allowed_departments,
			:created_by, :updated_by, :created_at, :updated_at
		)
	`

	if form.ID == uuid.Nil {
		form.ID = uuid.New()
	}

	now := time.Now()
	form.CreatedAt = now
	form.UpdatedAt = now

	_, err := r.db.NamedExecContext(ctx, query, form)
	return err
}

func (r *customFormRepository) Update(ctx context.Context, form *CustomForm) error {
	query := `
		UPDATE custom_forms SET
			name = :name,
			description = :description,
			category = :category,
			config = :config,
			status = :status,
			allowed_roles = :allowed_roles,
			allowed_departments = :allowed_departments,
			updated_by = :updated_by,
			updated_at = :updated_at
		WHERE id = :id
	`

	form.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, form)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *customFormRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM custom_forms WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *customFormRepository) GetByID(ctx context.Context, id uuid.UUID) (*CustomForm, error) {
	query := `SELECT * FROM custom_forms WHERE id = $1`

	var form CustomForm
	err := r.db.GetContext(ctx, &form, query, id)
	if err != nil {
		return nil, err
	}

	return &form, nil
}

func (r *customFormRepository) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*CustomForm, error) {
	query := `SELECT * FROM custom_forms WHERE tenant_id = $1 AND code = $2`

	var form CustomForm
	err := r.db.GetContext(ctx, &form, query, tenantID, code)
	if err != nil {
		return nil, err
	}

	return &form, nil
}

func (r *customFormRepository) List(ctx context.Context, filter CustomFormFilter) ([]*CustomForm, int, error) {
	conditions := []string{"1=1"}
	args := make(map[string]interface{})

	if filter.TenantID != nil {
		conditions = append(conditions, "tenant_id = :tenant_id")
		args["tenant_id"] = *filter.TenantID
	}

	if filter.Status != nil {
		conditions = append(conditions, "status = :status")
		args["status"] = *filter.Status
	}

	if filter.Category != nil {
		conditions = append(conditions, "category = :category")
		args["category"] = *filter.Category
	}

	if filter.IsTemplate != nil {
		conditions = append(conditions, "is_template = :is_template")
		args["is_template"] = *filter.IsTemplate
	}

	whereClause := ""
	for i, cond := range conditions {
		if i == 0 {
			whereClause = "WHERE " + cond
		} else {
			whereClause += " AND " + cond
		}
	}

	// 获取总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM custom_forms %s", whereClause)
	var total int
	countStmt, err := r.db.PrepareNamedContext(ctx, countQuery)
	if err != nil {
		return nil, 0, err
	}
	defer countStmt.Close()

	err = countStmt.GetContext(ctx, &total, args)
	if err != nil {
		return nil, 0, err
	}

	// 获取数据
	args["limit"] = filter.Limit
	args["offset"] = filter.Offset

	dataQuery := fmt.Sprintf(`
		SELECT * FROM custom_forms %s
		ORDER BY created_at DESC
		LIMIT :limit OFFSET :offset
	`, whereClause)

	dataStmt, err := r.db.PrepareNamedContext(ctx, dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer dataStmt.Close()

	var forms []*CustomForm
	err = dataStmt.SelectContext(ctx, &forms, args)
	if err != nil {
		return nil, 0, err
	}

	return forms, total, nil
}

func (r *customFormRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID) ([]*CustomForm, error) {
	query := `
		SELECT * FROM custom_forms
		WHERE tenant_id = $1
		ORDER BY name ASC
	`

	var forms []*CustomForm
	err := r.db.SelectContext(ctx, &forms, query, tenantID)
	if err != nil {
		return nil, err
	}

	return forms, nil
}

func (r *customFormRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `
		UPDATE custom_forms
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, status, time.Now(), id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// FormField Repository 实现
type formFieldRepository struct {
	db *sqlx.DB
}

func NewFormFieldRepository(db *sqlx.DB) FormFieldRepository {
	return &formFieldRepository{db: db}
}

func (r *formFieldRepository) Create(ctx context.Context, field *FormField) error {
	query := `
		INSERT INTO form_fields (
			id, form_id, field_name, field_label, field_type,
			placeholder, default_value, options, validation_rules,
			display_order, is_required, is_visible, is_readonly, width,
			depends_on, help_text, error_message,
			created_at, updated_at
		) VALUES (
			:id, :form_id, :field_name, :field_label, :field_type,
			:placeholder, :default_value, :options, :validation_rules,
			:display_order, :is_required, :is_visible, :is_readonly, :width,
			:depends_on, :help_text, :error_message,
			:created_at, :updated_at
		)
	`

	if field.ID == uuid.Nil {
		field.ID = uuid.New()
	}

	now := time.Now()
	field.CreatedAt = now
	field.UpdatedAt = now

	_, err := r.db.NamedExecContext(ctx, query, field)
	return err
}

func (r *formFieldRepository) Update(ctx context.Context, field *FormField) error {
	query := `
		UPDATE form_fields SET
			field_label = :field_label,
			field_type = :field_type,
			placeholder = :placeholder,
			default_value = :default_value,
			options = :options,
			validation_rules = :validation_rules,
			display_order = :display_order,
			is_required = :is_required,
			is_visible = :is_visible,
			is_readonly = :is_readonly,
			width = :width,
			depends_on = :depends_on,
			help_text = :help_text,
			error_message = :error_message,
			updated_at = :updated_at
		WHERE id = :id
	`

	field.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, field)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *formFieldRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM form_fields WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *formFieldRepository) GetByID(ctx context.Context, id uuid.UUID) (*FormField, error) {
	query := `SELECT * FROM form_fields WHERE id = $1`

	var field FormField
	err := r.db.GetContext(ctx, &field, query, id)
	if err != nil {
		return nil, err
	}

	return &field, nil
}

func (r *formFieldRepository) GetByFormID(ctx context.Context, formID uuid.UUID) ([]*FormField, error) {
	query := `
		SELECT * FROM form_fields
		WHERE form_id = $1
		ORDER BY display_order ASC
	`

	var fields []*FormField
	err := r.db.SelectContext(ctx, &fields, query, formID)
	if err != nil {
		return nil, err
	}

	return fields, nil
}

func (r *formFieldRepository) BatchCreate(ctx context.Context, fields []*FormField) error {
	if len(fields) == 0 {
		return nil
	}

	query := `
		INSERT INTO form_fields (
			id, form_id, field_name, field_label, field_type,
			placeholder, default_value, options, validation_rules,
			display_order, is_required, is_visible, is_readonly, width,
			depends_on, help_text, error_message,
			created_at, updated_at
		) VALUES (
			:id, :form_id, :field_name, :field_label, :field_type,
			:placeholder, :default_value, :options, :validation_rules,
			:display_order, :is_required, :is_visible, :is_readonly, :width,
			:depends_on, :help_text, :error_message,
			:created_at, :updated_at
		)
	`

	now := time.Now()
	for _, field := range fields {
		if field.ID == uuid.Nil {
			field.ID = uuid.New()
		}
		field.CreatedAt = now
		field.UpdatedAt = now
	}

	_, err := r.db.NamedExecContext(ctx, query, fields)
	return err
}

func (r *formFieldRepository) BatchDelete(ctx context.Context, formID uuid.UUID) error {
	query := `DELETE FROM form_fields WHERE form_id = $1`
	_, err := r.db.ExecContext(ctx, query, formID)
	return err
}

// FormSubmission Repository 实现
type formSubmissionRepository struct {
	db *sqlx.DB
}

func NewFormSubmissionRepository(db *sqlx.DB) FormSubmissionRepository {
	return &formSubmissionRepository{db: db}
}

func (r *formSubmissionRepository) Create(ctx context.Context, submission *FormSubmission) error {
	query := `
		INSERT INTO form_submissions (
			id, form_id, tenant_id, submission_data,
			related_type, related_id, status,
			reviewer_id, reviewed_at, review_notes,
			submitted_by, submitted_at,
			ip_address, user_agent,
			created_at, updated_at
		) VALUES (
			:id, :form_id, :tenant_id, :submission_data,
			:related_type, :related_id, :status,
			:reviewer_id, :reviewed_at, :review_notes,
			:submitted_by, :submitted_at,
			:ip_address, :user_agent,
			:created_at, :updated_at
		)
	`

	if submission.ID == uuid.Nil {
		submission.ID = uuid.New()
	}

	now := time.Now()
	submission.CreatedAt = now
	submission.UpdatedAt = now
	submission.SubmittedAt = now

	_, err := r.db.NamedExecContext(ctx, query, submission)
	return err
}

func (r *formSubmissionRepository) Update(ctx context.Context, submission *FormSubmission) error {
	query := `
		UPDATE form_submissions SET
			submission_data = :submission_data,
			status = :status,
			updated_at = :updated_at
		WHERE id = :id
	`

	submission.UpdatedAt = time.Now()

	result, err := r.db.NamedExecContext(ctx, query, submission)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *formSubmissionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM form_submissions WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *formSubmissionRepository) GetByID(ctx context.Context, id uuid.UUID) (*FormSubmission, error) {
	query := `SELECT * FROM form_submissions WHERE id = $1`

	var submission FormSubmission
	err := r.db.GetContext(ctx, &submission, query, id)
	if err != nil {
		return nil, err
	}

	return &submission, nil
}

func (r *formSubmissionRepository) List(ctx context.Context, filter FormSubmissionFilter) ([]*FormSubmission, int, error) {
	conditions := []string{"1=1"}
	args := make(map[string]interface{})

	if filter.FormID != nil {
		conditions = append(conditions, "form_id = :form_id")
		args["form_id"] = *filter.FormID
	}

	if filter.TenantID != nil {
		conditions = append(conditions, "tenant_id = :tenant_id")
		args["tenant_id"] = *filter.TenantID
	}

	if filter.Status != nil {
		conditions = append(conditions, "status = :status")
		args["status"] = *filter.Status
	}

	if filter.SubmittedBy != nil {
		conditions = append(conditions, "submitted_by = :submitted_by")
		args["submitted_by"] = *filter.SubmittedBy
	}

	if filter.StartDate != nil {
		conditions = append(conditions, "submitted_at >= :start_date")
		args["start_date"] = *filter.StartDate
	}

	if filter.EndDate != nil {
		conditions = append(conditions, "submitted_at <= :end_date")
		args["end_date"] = *filter.EndDate
	}

	whereClause := ""
	for i, cond := range conditions {
		if i == 0 {
			whereClause = "WHERE " + cond
		} else {
			whereClause += " AND " + cond
		}
	}

	// 获取总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM form_submissions %s", whereClause)
	var total int
	countStmt, err := r.db.PrepareNamedContext(ctx, countQuery)
	if err != nil {
		return nil, 0, err
	}
	defer countStmt.Close()

	err = countStmt.GetContext(ctx, &total, args)
	if err != nil {
		return nil, 0, err
	}

	// 获取数据
	args["limit"] = filter.Limit
	args["offset"] = filter.Offset

	dataQuery := fmt.Sprintf(`
		SELECT * FROM form_submissions %s
		ORDER BY submitted_at DESC
		LIMIT :limit OFFSET :offset
	`, whereClause)

	dataStmt, err := r.db.PrepareNamedContext(ctx, dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer dataStmt.Close()

	var submissions []*FormSubmission
	err = dataStmt.SelectContext(ctx, &submissions, args)
	if err != nil {
		return nil, 0, err
	}

	return submissions, total, nil
}

func (r *formSubmissionRepository) GetByFormID(ctx context.Context, formID uuid.UUID, limit, offset int) ([]*FormSubmission, int, error) {
	countQuery := `SELECT COUNT(*) FROM form_submissions WHERE form_id = $1`
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, formID)
	if err != nil {
		return nil, 0, err
	}

	dataQuery := `
		SELECT * FROM form_submissions
		WHERE form_id = $1
		ORDER BY submitted_at DESC
		LIMIT $2 OFFSET $3
	`

	var submissions []*FormSubmission
	err = r.db.SelectContext(ctx, &submissions, dataQuery, formID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return submissions, total, nil
}

func (r *formSubmissionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, reviewerID uuid.UUID, notes string) error {
	query := `
		UPDATE form_submissions
		SET status = $1,
		    reviewer_id = $2,
		    review_notes = $3,
		    reviewed_at = $4,
		    updated_at = $5
		WHERE id = $6
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, status, reviewerID, notes, now, now, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

func (r *formSubmissionRepository) AddFile(ctx context.Context, file *FormSubmissionFile) error {
	query := `
		INSERT INTO form_submission_files (
			id, submission_id, field_name,
			file_url, file_name, file_size, mime_type,
			uploaded_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
	`

	if file.ID == uuid.Nil {
		file.ID = uuid.New()
	}

	file.UploadedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		file.ID, file.SubmissionID, file.FieldName,
		file.FileURL, file.FileName, file.FileSize, file.MimeType,
		file.UploadedAt,
	)
	return err
}

func (r *formSubmissionRepository) GetFiles(ctx context.Context, submissionID uuid.UUID) ([]*FormSubmissionFile, error) {
	query := `
		SELECT * FROM form_submission_files
		WHERE submission_id = $1
		ORDER BY uploaded_at ASC
	`

	var files []*FormSubmissionFile
	err := r.db.SelectContext(ctx, &files, query, submissionID)
	if err != nil {
		return nil, err
	}

	return files, nil
}

func (r *formSubmissionRepository) DeleteFile(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM form_submission_files WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	return err
}
