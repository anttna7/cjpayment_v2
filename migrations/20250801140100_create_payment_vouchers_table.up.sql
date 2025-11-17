-- Create payment_vouchers table
CREATE TABLE payment_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recharge_order_id UUID NOT NULL REFERENCES recharge_orders(id) ON DELETE CASCADE,
    voucher_type VARCHAR(20) NOT NULL DEFAULT 'image', -- image, pdf, other
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_status VARCHAR(20) NOT NULL DEFAULT 'uploaded', -- uploaded, verified, rejected
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_payment_vouchers_recharge_order_id ON payment_vouchers(recharge_order_id);
CREATE INDEX idx_payment_vouchers_upload_status ON payment_vouchers(upload_status);
CREATE INDEX idx_payment_vouchers_created_at ON payment_vouchers(created_at);

-- Add comments
COMMENT ON TABLE payment_vouchers IS '付款凭证表';
COMMENT ON COLUMN payment_vouchers.id IS '凭证ID';
COMMENT ON COLUMN payment_vouchers.recharge_order_id IS '关联的充值订单ID';
COMMENT ON COLUMN payment_vouchers.voucher_type IS '凭证类型';
COMMENT ON COLUMN payment_vouchers.file_name IS '文件名';
COMMENT ON COLUMN payment_vouchers.file_path IS '文件路径';
COMMENT ON COLUMN payment_vouchers.file_size IS '文件大小（字节）';
COMMENT ON COLUMN payment_vouchers.mime_type IS '文件MIME类型';
COMMENT ON COLUMN payment_vouchers.upload_status IS '上传状态';
COMMENT ON COLUMN payment_vouchers.verification_notes IS '审核备注';