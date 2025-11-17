-- Create recharge_orders table
CREATE TABLE recharge_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) UNIQUE NOT NULL,
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('public', 'private')),
    amount DECIMAL(15,2) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    ad_account VARCHAR(100) NOT NULL,
    receiver_account_id UUID NOT NULL REFERENCES receive_accounts(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remark TEXT,
    voucher_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_recharge_orders_order_number ON recharge_orders(order_number);
CREATE INDEX idx_recharge_orders_merchant_id ON recharge_orders(merchant_id);
CREATE INDEX idx_recharge_orders_status ON recharge_orders(status);
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at);
CREATE INDEX idx_recharge_orders_receiver_account_id ON recharge_orders(receiver_account_id);

-- Add comments for documentation
COMMENT ON TABLE recharge_orders IS '充值订单表';
COMMENT ON COLUMN recharge_orders.id IS '订单ID';
COMMENT ON COLUMN recharge_orders.order_number IS '订单号';
COMMENT ON COLUMN recharge_orders.payer_name IS '付款人姓名';
COMMENT ON COLUMN recharge_orders.payer_account IS '付款账号';
COMMENT ON COLUMN recharge_orders.payment_type IS '付款类型：public-对公，private-对私';
COMMENT ON COLUMN recharge_orders.amount IS '充值金额';
COMMENT ON COLUMN recharge_orders.merchant_id IS '商户ID';
COMMENT ON COLUMN recharge_orders.ad_account IS '广告账户';
COMMENT ON COLUMN recharge_orders.receiver_account_id IS '收款账户ID';
COMMENT ON COLUMN recharge_orders.status IS '订单状态';
COMMENT ON COLUMN recharge_orders.remark IS '备注';
COMMENT ON COLUMN recharge_orders.voucher_url IS '付款凭证URL';