-- Migration: create_custom_forms_system
-- Created at: 2025-11-17 14:20:00
-- Description: Create dynamic custom forms management system

BEGIN;

-- 自定义表单定义表
CREATE TABLE IF NOT EXISTS custom_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- 表单基本信息
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(50),

    -- 表单配置
    config JSONB DEFAULT '{}'::jsonb,

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
    is_template BOOLEAN DEFAULT false,

    -- 权限控制
    allowed_roles JSONB DEFAULT '[]'::jsonb,
    allowed_departments JSONB DEFAULT '[]'::jsonb,

    -- 创建和更新信息
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_custom_forms_tenant_id ON custom_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_forms_status ON custom_forms(status);
CREATE INDEX IF NOT EXISTS idx_custom_forms_category ON custom_forms(category);

-- 表单字段定义表
CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,

    -- 字段基本信息
    field_name VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type VARCHAR(30) NOT NULL CHECK (field_type IN (
        'text','textarea','number','email','phone','url',
        'date','datetime','time',
        'select','multiselect','radio','checkbox',
        'file','image',
        'switch','slider','rate',
        'custom'
    )),

    -- 字段配置
    placeholder VARCHAR(200),
    default_value TEXT,
    options JSONB DEFAULT '[]'::jsonb,
    validation_rules JSONB DEFAULT '{}'::jsonb,

    -- 显示配置
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    is_readonly BOOLEAN DEFAULT false,
    width VARCHAR(20) DEFAULT 'full',

    -- 高级配置
    depends_on JSONB DEFAULT '[]'::jsonb,
    help_text TEXT,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_order ON form_fields(form_id, display_order);

-- 表单提交记录表
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- 提交数据
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- 关联对象（可选）
    related_type VARCHAR(50),
    related_id UUID,

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','approved','rejected')),

    -- 审核信息
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- 提交信息
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- IP和用户代理
    ip_address VARCHAR(50),
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id ON form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_related ON form_submissions(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by ON form_submissions(submitted_by);

-- 表单提交附件表
CREATE TABLE IF NOT EXISTS form_submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,

    -- 文件信息
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),

    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submission_files_submission_id ON form_submission_files(submission_id);

COMMENT ON TABLE custom_forms IS '自定义表单定义表';
COMMENT ON TABLE form_fields IS '表单字段定义表';
COMMENT ON TABLE form_submissions IS '表单提交记录表';
COMMENT ON TABLE form_submission_files IS '表单提交附件表';

COMMENT ON COLUMN form_fields.field_type IS '字段类型：文本、文本域、数字、邮箱、电话、URL、日期、日期时间、时间、单选、多选、单选按钮、复选框、文件、图片、开关、滑块、评分、自定义';
COMMENT ON COLUMN form_fields.validation_rules IS '验证规则JSON：{required, min, max, pattern, custom}';
COMMENT ON COLUMN form_fields.depends_on IS '依赖条件JSON：[{field, operator, value}]';

COMMIT;
