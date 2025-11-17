-- 付款人验证系统相关表
-- 用于付款人身份验证、账户匹配验证和重复付款检测

-- 付款人身份验证记录表
CREATE TABLE payer_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- bank/alipay/wechat/other
    
    -- 身份验证信息
    verification_type VARCHAR(20) NOT NULL DEFAULT 'basic', -- basic/enhanced/manual
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/verified/failed/expired
    verification_method VARCHAR(50), -- api/manual/document/phone
    
    -- 验证数据
    identity_document_type VARCHAR(20), -- id_card/passport/business_license
    identity_document_number VARCHAR(50),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    
    -- 验证结果
    verification_score INTEGER, -- 0-100 验证分数
    risk_level VARCHAR(20) DEFAULT 'medium', -- low/medium/high/blocked
    verification_details JSONB, -- 详细验证信息
    failure_reason TEXT, -- 验证失败原因
    
    -- 账户信息验证
    account_holder_name VARCHAR(100), -- 账户持有人姓名
    account_holder_verified BOOLEAN DEFAULT false,
    bank_name VARCHAR(100),
    bank_branch VARCHAR(200),
    
    -- 时间信息
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- 验证过期时间
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 付款人黑名单表
CREATE TABLE payer_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_name VARCHAR(100),
    payer_account VARCHAR(100),
    account_type VARCHAR(20),
    
    -- 黑名单信息
    blacklist_type VARCHAR(20) NOT NULL, -- fraud/dispute/policy/manual
    reason TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- low/medium/high/critical
    
    -- 处理信息
    reported_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active', -- active/inactive/expired
    
    -- 时间信息
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 账户匹配验证表
CREATE TABLE account_match_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recharge_order_id UUID REFERENCES recharge_orders(id) ON DELETE CASCADE,
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_account VARCHAR(100) NOT NULL,
    
    -- 匹配验证结果
    match_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/matched/mismatched/manual_review
    match_score DECIMAL(5,2), -- 匹配得分 0.00-100.00
    match_details JSONB, -- 详细匹配信息
    
    -- 验证规则
    name_match_result BOOLEAN, -- 姓名匹配结果
    account_match_result BOOLEAN, -- 账号匹配结果
    bank_match_result BOOLEAN, -- 银行匹配结果
    amount_match_result BOOLEAN, -- 金额匹配结果
    
    -- 风险评估
    risk_flags TEXT[], -- 风险标记
    risk_score INTEGER DEFAULT 0, -- 0-100 风险分数
    
    -- 人工审核
    manual_review_required BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 重复付款检测表
CREATE TABLE duplicate_payment_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    receiver_account VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    
    -- 检测窗口
    check_window_hours INTEGER DEFAULT 24, -- 检测窗口（小时）
    
    -- 检测结果
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_count INTEGER DEFAULT 0,
    similar_transactions_count INTEGER DEFAULT 0,
    
    -- 相关订单
    original_order_id UUID REFERENCES recharge_orders(id),
    related_order_ids UUID[], -- 相关的重复订单ID列表
    
    -- 检测详情
    detection_method VARCHAR(50) NOT NULL, -- exact/fuzzy/pattern/ml
    detection_details JSONB,
    confidence_score DECIMAL(5,2), -- 置信度 0.00-100.00
    
    -- 处理状态
    status VARCHAR(20) DEFAULT 'detected', -- detected/reviewed/approved/rejected
    action_taken VARCHAR(50), -- block/warn/allow/manual_review
    
    -- 审核信息
    reviewed_by UUID REFERENCES users(id),
    review_decision VARCHAR(20), -- approve/reject/need_more_info
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 付款人信用评分表
CREATE TABLE payer_credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_name VARCHAR(100) NOT NULL,
    payer_account VARCHAR(100) NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    
    -- 信用评分
    credit_score INTEGER NOT NULL DEFAULT 50, -- 0-100 信用分数
    score_level VARCHAR(20) NOT NULL DEFAULT 'normal', -- excellent/good/normal/poor/blocked
    
    -- 评分因子
    successful_payments INTEGER DEFAULT 0, -- 成功付款次数
    failed_payments INTEGER DEFAULT 0, -- 失败付款次数
    disputed_payments INTEGER DEFAULT 0, -- 争议付款次数
    total_amount DECIMAL(20,2) DEFAULT 0, -- 累计交易金额
    
    -- 行为分析
    avg_payment_amount DECIMAL(15,2), -- 平均付款金额
    payment_frequency DECIMAL(10,2), -- 付款频率（次/月）
    last_payment_date DATE,
    
    -- 风险指标
    risk_incidents INTEGER DEFAULT 0, -- 风险事件次数
    blacklist_hits INTEGER DEFAULT 0, -- 黑名单命中次数
    verification_failures INTEGER DEFAULT 0, -- 验证失败次数
    
    -- 时间信息
    score_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_calculation_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_payer_verifications_name_account ON payer_verifications(payer_name, payer_account);
CREATE INDEX idx_payer_verifications_status ON payer_verifications(verification_status);
CREATE INDEX idx_payer_verifications_expires_at ON payer_verifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_payer_blacklist_name_account ON payer_blacklist(payer_name, payer_account);
CREATE INDEX idx_payer_blacklist_status ON payer_blacklist(status) WHERE status = 'active';

CREATE INDEX idx_account_match_order_id ON account_match_verifications(recharge_order_id);
CREATE INDEX idx_account_match_status ON account_match_verifications(match_status);
CREATE INDEX idx_account_match_review ON account_match_verifications(manual_review_required) WHERE manual_review_required = true;

CREATE INDEX idx_duplicate_payment_payer ON duplicate_payment_checks(payer_name, payer_account);
CREATE INDEX idx_duplicate_payment_amount_time ON duplicate_payment_checks(amount, created_at);
CREATE INDEX idx_duplicate_payment_status ON duplicate_payment_checks(status);

CREATE INDEX idx_payer_credit_name_account ON payer_credit_scores(payer_name, payer_account);
CREATE INDEX idx_payer_credit_score_level ON payer_credit_scores(score_level);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_payer_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payer_verifications_update_trigger
    BEFORE UPDATE ON payer_verifications
    FOR EACH ROW EXECUTE FUNCTION update_payer_verification_updated_at();

CREATE TRIGGER payer_blacklist_update_trigger
    BEFORE UPDATE ON payer_blacklist
    FOR EACH ROW EXECUTE FUNCTION update_payer_verification_updated_at();

CREATE TRIGGER account_match_verifications_update_trigger
    BEFORE UPDATE ON account_match_verifications
    FOR EACH ROW EXECUTE FUNCTION update_payer_verification_updated_at();

CREATE TRIGGER duplicate_payment_checks_update_trigger
    BEFORE UPDATE ON duplicate_payment_checks
    FOR EACH ROW EXECUTE FUNCTION update_payer_verification_updated_at();

CREATE TRIGGER payer_credit_scores_update_trigger
    BEFORE UPDATE ON payer_credit_scores
    FOR EACH ROW EXECUTE FUNCTION update_payer_verification_updated_at();

-- 添加注释
COMMENT ON TABLE payer_verifications IS '付款人身份验证记录表';
COMMENT ON COLUMN payer_verifications.verification_score IS '验证分数，0-100，分数越高表示验证可信度越高';
COMMENT ON COLUMN payer_verifications.risk_level IS '风险等级：low-低风险，medium-中等风险，high-高风险，blocked-已屏蔽';

COMMENT ON TABLE payer_blacklist IS '付款人黑名单表，记录被标记的风险付款人';
COMMENT ON COLUMN payer_blacklist.blacklist_type IS '黑名单类型：fraud-欺诈，dispute-争议，policy-违规，manual-人工添加';

COMMENT ON TABLE account_match_verifications IS '账户匹配验证表，验证付款账户与收款账户的匹配性';
COMMENT ON COLUMN account_match_verifications.match_score IS '匹配得分，0.00-100.00，分数越高表示匹配度越高';

COMMENT ON TABLE duplicate_payment_checks IS '重复付款检测表，检测和记录可能的重复付款';
COMMENT ON COLUMN duplicate_payment_checks.confidence_score IS '检测置信度，0.00-100.00，分数越高表示重复付款的可能性越大';

COMMENT ON TABLE payer_credit_scores IS '付款人信用评分表，基于历史交易记录计算信用分数';