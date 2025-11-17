-- Migration: create_invoices_table
-- Created at: 2025-11-17 14:00:00
-- Description: Create invoices table for financial management

BEGIN;

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES recharge_orders(id) ON DELETE SET NULL,

    -- 发票信息
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'vat_normal' CHECK (invoice_type IN ('vat_normal','vat_special','electronic','paper')),
    invoice_title VARCHAR(200) NOT NULL,
    tax_number VARCHAR(50) NOT NULL,

    -- 金额信息
    amount NUMERIC(20,2) NOT NULL,
    tax_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(20,2) NOT NULL,

    -- 发票状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','sent','confirmed','cancelled')),

    -- 发票文件
    file_url VARCHAR(255),
    file_name VARCHAR(255),
    file_size BIGINT,

    -- 申请和开具信息
    applicant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    issuer_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 收件信息
    recipient_name VARCHAR(100),
    recipient_phone VARCHAR(20),
    recipient_address TEXT,

    -- 备注
    notes TEXT,

    -- 时间戳
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    issued_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_applied_at ON invoices(applied_at);

COMMENT ON TABLE invoices IS '发票管理表';
COMMENT ON COLUMN invoices.invoice_type IS '发票类型：增值税普通发票、增值税专用发票、电子发票、纸质发票';
COMMENT ON COLUMN invoices.status IS '发票状态：待开具、已开具、已寄出、已确认、已作废';

COMMIT;
