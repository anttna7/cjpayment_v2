-- Migration: create_settlement_orders_table
-- Created at: 2025-11-17 14:10:00
-- Description: Create settlement orders table for financial settlement management

BEGIN;

CREATE TABLE IF NOT EXISTS settlement_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- 订单编号
    order_number VARCHAR(50) UNIQUE NOT NULL,

    -- 结算信息
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    total_amount NUMERIC(20,2) NOT NULL,
    settled_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
    outstanding_amount NUMERIC(20,2) NOT NULL DEFAULT 0,

    -- 关联的充值订单（JSON数组，存储order_id列表）
    related_recharge_orders JSONB DEFAULT '[]'::jsonb,

    -- 结算状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected','settled','cancelled')),

    -- 审批信息
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- 结算完成信息
    settler_id UUID REFERENCES users(id) ON DELETE SET NULL,
    settled_at TIMESTAMPTZ,
    settlement_notes TEXT,

    -- 附件
    attachment_url VARCHAR(255),
    attachment_name VARCHAR(255),

    -- 备注
    notes TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_settlement_orders_tenant_id ON settlement_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_orders_customer_id ON settlement_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_orders_status ON settlement_orders(status);
CREATE INDEX IF NOT EXISTS idx_settlement_orders_order_number ON settlement_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_settlement_orders_period ON settlement_orders(settlement_period_start, settlement_period_end);

COMMENT ON TABLE settlement_orders IS '结算订单表';
COMMENT ON COLUMN settlement_orders.status IS '结算状态：待处理、审核中、已批准、已拒绝、已结算、已取消';
COMMENT ON COLUMN settlement_orders.related_recharge_orders IS '关联的充值订单ID列表（JSON数组）';

COMMIT;
