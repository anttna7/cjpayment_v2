-- 充值链接管理表
-- 用于管理商户专属充值链接、短链接生成和访问统计

CREATE TABLE recharge_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(20) UNIQUE NOT NULL, -- 短链接码
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    link_type VARCHAR(20) NOT NULL DEFAULT 'merchant' CHECK (link_type IN ('merchant', 'general')),
    title VARCHAR(200), -- 链接标题
    description TEXT, -- 链接描述
    
    -- 预填充信息
    prefill_merchant_name VARCHAR(100),
    prefill_ad_account VARCHAR(100),
    prefill_amount DECIMAL(15,2),
    prefill_remark TEXT,
    
    -- 访问控制
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE, -- 链接过期时间
    max_uses INTEGER, -- 最大使用次数
    current_uses INTEGER DEFAULT 0, -- 当前使用次数
    
    -- 访问限制
    allowed_ips TEXT[], -- 允许访问的IP列表
    require_verification BOOLEAN DEFAULT false, -- 是否需要验证
    
    -- 统计信息
    total_visits INTEGER DEFAULT 0, -- 总访问次数
    successful_orders INTEGER DEFAULT 0, -- 成功订单数
    total_amount DECIMAL(20,2) DEFAULT 0, -- 总充值金额
    last_accessed_at TIMESTAMP WITH TIME ZONE, -- 最后访问时间
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_recharge_links_short_code ON recharge_links(short_code);
CREATE INDEX idx_recharge_links_merchant_id ON recharge_links(merchant_id);
CREATE INDEX idx_recharge_links_active ON recharge_links(is_active) WHERE is_active = true;
CREATE INDEX idx_recharge_links_expires_at ON recharge_links(expires_at) WHERE expires_at IS NOT NULL;

-- 链接访问日志表
CREATE TABLE recharge_link_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES recharge_links(id) ON DELETE CASCADE,
    visitor_ip INET,
    user_agent TEXT,
    referer TEXT,
    
    -- 访问结果
    action VARCHAR(50) NOT NULL, -- visited, order_created, order_completed
    order_id UUID REFERENCES recharge_orders(id),
    
    -- 地理位置信息
    country VARCHAR(50),
    region VARCHAR(100),
    city VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_recharge_link_logs_link_id ON recharge_link_logs(link_id);
CREATE INDEX idx_recharge_link_logs_created_at ON recharge_link_logs(created_at);
CREATE INDEX idx_recharge_link_logs_action ON recharge_link_logs(action);

-- 更新触发器
CREATE OR REPLACE FUNCTION update_recharge_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recharge_links_update_trigger
    BEFORE UPDATE ON recharge_links
    FOR EACH ROW EXECUTE FUNCTION update_recharge_links_updated_at();

-- 添加注释
COMMENT ON TABLE recharge_links IS '充值链接管理表，用于生成和管理商户专属充值链接';
COMMENT ON COLUMN recharge_links.short_code IS '短链接代码，用于生成短URL';
COMMENT ON COLUMN recharge_links.link_type IS '链接类型：merchant-商户专用，general-通用';
COMMENT ON COLUMN recharge_links.prefill_merchant_name IS '预填充的商户名称';
COMMENT ON COLUMN recharge_links.max_uses IS '最大使用次数，NULL表示无限制';
COMMENT ON COLUMN recharge_links.allowed_ips IS '允许访问的IP地址列表';

COMMENT ON TABLE recharge_link_logs IS '充值链接访问日志表';
COMMENT ON COLUMN recharge_link_logs.action IS '访问行为：visited-访问，order_created-创建订单，order_completed-完成订单';