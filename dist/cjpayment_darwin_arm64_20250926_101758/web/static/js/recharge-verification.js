/**
 * 充值信息验证和匹配系统
 * 负责付款人信息验证、收款账户匹配、充值金额校验等核心业务逻辑
 */
class RechargeVerificationManager {
    constructor() {
        this.verificationRules = this.initVerificationRules();
        this.matchingRules = this.initMatchingRules();
        this.businessRules = this.initBusinessRules();
        
        console.log('充值验证和匹配系统已初始化');
    }
    
    /**
     * 初始化验证规则
     */
    initVerificationRules() {
        return {
            payerName: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
                errorMessage: '付款人姓名必须为2-50个字符的中文或英文'
            },
            payerAccount: {
                required: true,
                minLength: 5,
                maxLength: 50,
                patterns: {
                    '银行卡': /^\d{12,19}$/,
                    '支付宝': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^\d{11}$/,
                    '微信': /^[a-zA-Z0-9_-]{6,20}$/,
                    '其它': /^.{5,50}$/
                },
                errorMessages: {
                    '银行卡': '银行卡号必须为12-19位数字',
                    '支付宝': '支付宝账号必须为邮箱或11位手机号',
                    '微信': '微信号必须为6-20位字母、数字、下划线或横线',
                    '其它': '账号长度必须为5-50个字符'
                }
            },
            bankName: {
                required: true, // 当账号类型为银行卡时
                validBanks: [
                    '中国工商银行', '中国建设银行', '中国农业银行', '中国银行',
                    '交通银行', '招商银行', '浦发银行', '中信银行',
                    '光大银行', '民生银行', '华夏银行', '平安银行',
                    '兴业银行', '其它银行'
                ]
            },
            rechargeAmount: {
                required: true,
                min: 0.01,
                max: 1000000,
                decimalPlaces: 2,
                errorMessage: '充值金额必须在0.01-1,000,000之间，最多保留2位小数'
            },
            adAccountId: {
                required: true,
                pattern: /^[a-zA-Z0-9_-]{3,50}$/,
                errorMessage: '广告账户ID必须为3-50位字母、数字、下划线或横线'
            }
        };
    }
    
    /**
     * 初始化匹配规则
     */
    initMatchingRules() {
        return {
            // 账号类型匹配规则
            accountTypeMatching: {
                '银行卡': ['银行卡'],
                '支付宝': ['支付宝', '银行卡'],
                '微信': ['微信', '银行卡'],
                '其它': ['其它', '银行卡']
            },
            
            // 业务类型匹配规则
            businessTypeMatching: {
                autoDetect: true, // 自动检测业务类型
                rules: {
                    '对公': ['.*公司$', '.*企业$', '.*集团$', '.*有限$'],
                    '对私': ['[\u4e00-\u9fa5]{2,4}$'] // 个人姓名模式
                }
            },
            
            // 优先级排序规则
            priorityRules: {
                // 基础优先级权重
                baseWeight: {
                    accountTypeMatch: 10,    // 账号类型匹配
                    businessTypeMatch: 8,    // 业务类型匹配
                    limitSufficient: 6,      // 限额充足
                    accountStatus: 5,        // 账户状态
                    usageRate: 4,           // 使用率
                    priority: 3              // 账户优先级
                },
                
                // 状态权重
                statusWeight: {
                    '启用': 10,
                    '维护': 2,
                    '禁用': 0
                },
                
                // 使用率权重（使用率越低权重越高）
                usageRateWeight: (usageRate) => Math.max(0, 10 - (usageRate / 10))
            }
        };
    }
    
    /**
     * 初始化业务规则
     */
    initBusinessRules() {
        return {
            // 时间限制规则
            timeRestrictions: {
                '24小时': { start: 0, end: 24 },
                '9:00-22:00': { start: 9, end: 22 },
                '8:00-20:00': { start: 8, end: 20 }
            },
            
            // 单日限额检查
            dailyLimitCheck: true,
            
            // 单笔限额检查
            singleLimitCheck: true,
            
            // 账户状态检查
            statusCheck: ['启用'],
            
            // 最小匹配数量
            minMatchingAccounts: 1,
            
            // 最大返回数量
            maxReturnAccounts: 10
        };
    }
    
    /**
     * 验证付款人信息
     */
    validatePayerInfo(payerInfo) {
        const errors = {};
        const { payerName, payerAccount, payerAccountType, payerBankName } = payerInfo;
        
        // 验证付款人姓名
        const nameValidation = this.validateField('payerName', payerName);
        if (!nameValidation.isValid) {
            errors.payerName = nameValidation.error;
        }
        
        // 验证付款账号
        const accountValidation = this.validatePayerAccount(payerAccount, payerAccountType);
        if (!accountValidation.isValid) {
            errors.payerAccount = accountValidation.error;
        }
        
        // 验证账号类型
        if (!payerAccountType) {
            errors.payerAccountType = '请选择付款账号类型';
        }
        
        // 验证银行名称（银行卡时必填）
        if (payerAccountType === '银行卡') {
            if (!payerBankName) {
                errors.payerBankName = '选择银行卡类型时必须选择银行名称';
            } else if (!this.verificationRules.bankName.validBanks.includes(payerBankName)) {
                errors.payerBankName = '请选择有效的银行名称';
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            payerInfo: this.normalizePayerInfo(payerInfo)
        };
    }
    
    /**
     * 验证付款账号
     */
    validatePayerAccount(account, accountType) {
        if (!account) {
            return { isValid: false, error: '请输入付款账号' };
        }
        
        if (!accountType) {
            return { isValid: false, error: '请先选择账号类型' };
        }
        
        const rule = this.verificationRules.payerAccount;
        const pattern = rule.patterns[accountType];
        
        if (pattern && !pattern.test(account)) {
            return {
                isValid: false,
                error: rule.errorMessages[accountType]
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * 验证充值信息
     */
    validateRechargeInfo(rechargeInfo) {
        const errors = {};
        const { rechargeAmount, adAccountId, rechargeRemark } = rechargeInfo;
        
        // 验证充值金额
        const amountValidation = this.validateAmount(rechargeAmount);
        if (!amountValidation.isValid) {
            errors.rechargeAmount = amountValidation.error;
        }
        
        // 验证广告账户ID
        const adAccountValidation = this.validateField('adAccountId', adAccountId);
        if (!adAccountValidation.isValid) {
            errors.adAccountId = adAccountValidation.error;
        }
        
        // 验证备注（可选）
        if (rechargeRemark && rechargeRemark.length > 200) {
            errors.rechargeRemark = '备注信息不能超过200个字符';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            rechargeInfo: this.normalizeRechargeInfo(rechargeInfo)
        };
    }
    
    /**
     * 验证字段
     */
    validateField(fieldName, value) {
        const rule = this.verificationRules[fieldName];
        if (!rule) {
            return { isValid: true };
        }
        
        // 必填验证
        if (rule.required && (!value || value.toString().trim() === '')) {
            return { isValid: false, error: `${fieldName}为必填项` };
        }
        
        if (!value) {
            return { isValid: true };
        }
        
        const stringValue = value.toString().trim();
        
        // 长度验证
        if (rule.minLength && stringValue.length < rule.minLength) {
            return { isValid: false, error: rule.errorMessage || `${fieldName}长度不能少于${rule.minLength}个字符` };
        }
        
        if (rule.maxLength && stringValue.length > rule.maxLength) {
            return { isValid: false, error: rule.errorMessage || `${fieldName}长度不能超过${rule.maxLength}个字符` };
        }
        
        // 正则验证
        if (rule.pattern && !rule.pattern.test(stringValue)) {
            return { isValid: false, error: rule.errorMessage || `${fieldName}格式不正确` };
        }
        
        return { isValid: true };
    }
    
    /**
     * 验证金额
     */
    validateAmount(amount) {
        const rule = this.verificationRules.rechargeAmount;
        
        if (!amount) {
            return { isValid: false, error: '请输入充值金额' };
        }
        
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount)) {
            return { isValid: false, error: '充值金额必须为数字' };
        }
        
        if (numAmount < rule.min) {
            return { isValid: false, error: `充值金额不能少于¥${rule.min}` };
        }
        
        if (numAmount > rule.max) {
            return { isValid: false, error: `充值金额不能超过¥${rule.max.toLocaleString()}` };
        }
        
        // 检查小数位数
        const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
        if (decimalPlaces > rule.decimalPlaces) {
            return { isValid: false, error: `充值金额最多保留${rule.decimalPlaces}位小数` };
        }
        
        return { isValid: true, amount: numAmount };
    }
    
    /**
     * 匹配收款账户
     */
    matchReceivingAccounts(payerInfo, rechargeAmount, availableAccounts) {
        console.log('开始匹配收款账户：', { payerInfo, rechargeAmount, accountCount: availableAccounts.length });
        
        // 第一步：基础筛选
        let candidateAccounts = this.filterCandidateAccounts(payerInfo, rechargeAmount, availableAccounts);
        
        // 第二步：业务规则检查
        candidateAccounts = this.applyBusinessRules(candidateAccounts, rechargeAmount);
        
        // 第三步：计算匹配分数和排序
        const scoredAccounts = this.calculateMatchingScores(candidateAccounts, payerInfo, rechargeAmount);
        
        // 第四步：应用最大返回数量限制
        const finalAccounts = scoredAccounts.slice(0, this.businessRules.maxReturnAccounts);
        
        console.log(`匹配完成，返回 ${finalAccounts.length} 个账户`);
        
        return {
            success: finalAccounts.length >= this.businessRules.minMatchingAccounts,
            accounts: finalAccounts,
            matchingSummary: this.generateMatchingSummary(finalAccounts, payerInfo, rechargeAmount)
        };
    }
    
    /**
     * 筛选候选账户
     */
    filterCandidateAccounts(payerInfo, rechargeAmount, availableAccounts) {
        return availableAccounts.filter(account => {
            // 检查账户状态
            if (!this.businessRules.statusCheck.includes(account.status)) {
                return false;
            }
            
            // 检查账号类型匹配
            const supportedTypes = this.matchingRules.accountTypeMatching[payerInfo.payerAccountType] || [];
            if (!supportedTypes.includes(account.accountType)) {
                return false;
            }
            
            // 检查单笔限额
            if (this.businessRules.singleLimitCheck && rechargeAmount > account.singleLimit) {
                return false;
            }
            
            // 检查单日限额
            if (this.businessRules.dailyLimitCheck) {
                const remainingLimit = account.dailyLimit - (account.todayUsed || 0);
                if (rechargeAmount > remainingLimit) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * 应用业务规则
     */
    applyBusinessRules(accounts, rechargeAmount) {
        const currentHour = new Date().getHours();
        
        return accounts.filter(account => {
            // 检查账户可用时间
            if (account.availableHours && account.availableHours !== '24小时') {
                const timeRestriction = this.businessRules.timeRestrictions[account.availableHours];
                if (timeRestriction) {
                    if (currentHour < timeRestriction.start || currentHour >= timeRestriction.end) {
                        return false;
                    }
                }
            }
            
            return true;
        });
    }
    
    /**
     * 计算匹配分数
     */
    calculateMatchingScores(accounts, payerInfo, rechargeAmount) {
        return accounts.map(account => {
            let score = 0;
            const weights = this.matchingRules.priorityRules.baseWeight;
            
            // 账号类型匹配分数
            if (account.accountType === payerInfo.payerAccountType) {
                score += weights.accountTypeMatch;
            } else {
                score += weights.accountTypeMatch * 0.5; // 部分匹配
            }
            
            // 业务类型匹配分数
            const detectedBusinessType = this.detectBusinessType(payerInfo.payerName);
            if (account.businessType === detectedBusinessType) {
                score += weights.businessTypeMatch;
            }
            
            // 限额充足分数
            const singleLimitRatio = rechargeAmount / account.singleLimit;
            if (singleLimitRatio <= 0.5) {
                score += weights.limitSufficient;
            } else if (singleLimitRatio <= 0.8) {
                score += weights.limitSufficient * 0.7;
            } else {
                score += weights.limitSufficient * 0.3;
            }
            
            // 账户状态分数
            const statusWeight = this.matchingRules.priorityRules.statusWeight[account.status] || 0;
            score += (statusWeight / 10) * weights.accountStatus;
            
            // 使用率分数
            const usageRate = ((account.todayUsed || 0) / account.dailyLimit) * 100;
            const usageRateWeight = this.matchingRules.priorityRules.usageRateWeight(usageRate);
            score += (usageRateWeight / 10) * weights.usageRate;
            
            // 账户优先级分数（优先级越小分数越高）
            const priorityScore = Math.max(0, 4 - account.priority);
            score += priorityScore * weights.priority;
            
            return {
                ...account,
                matchingScore: Math.round(score * 100) / 100,
                matchingDetails: {
                    accountTypeMatch: account.accountType === payerInfo.payerAccountType,
                    businessTypeMatch: account.businessType === detectedBusinessType,
                    limitSufficient: singleLimitRatio <= 0.8,
                    usageRate: Math.round(usageRate * 100) / 100,
                    detectedBusinessType
                }
            };
        }).sort((a, b) => b.matchingScore - a.matchingScore);
    }
    
    /**
     * 检测业务类型
     */
    detectBusinessType(payerName) {
        const rules = this.matchingRules.businessTypeMatching.rules;
        
        // 检查对公模式
        for (const pattern of rules['对公']) {
            if (new RegExp(pattern).test(payerName)) {
                return '对公';
            }
        }
        
        // 检查对私模式
        for (const pattern of rules['对私']) {
            if (new RegExp(pattern).test(payerName)) {
                return '对私';
            }
        }
        
        // 默认返回对私
        return '对私';
    }
    
    /**
     * 生成匹配摘要
     */
    generateMatchingSummary(accounts, payerInfo, rechargeAmount) {
        const summary = {
            totalMatched: accounts.length,
            averageScore: accounts.length > 0 ? 
                Math.round((accounts.reduce((sum, acc) => sum + acc.matchingScore, 0) / accounts.length) * 100) / 100 : 0,
            bestMatch: accounts[0] || null,
            matchingCriteria: {
                payerAccountType: payerInfo.payerAccountType,
                detectedBusinessType: this.detectBusinessType(payerInfo.payerName),
                rechargeAmount: rechargeAmount,
                currentTime: new Date().toLocaleString()
            },
            accountTypeDistribution: this.getAccountTypeDistribution(accounts),
            businessTypeDistribution: this.getBusinessTypeDistribution(accounts)
        };
        
        return summary;
    }
    
    /**
     * 获取账号类型分布
     */
    getAccountTypeDistribution(accounts) {
        const distribution = {};
        accounts.forEach(account => {
            distribution[account.accountType] = (distribution[account.accountType] || 0) + 1;
        });
        return distribution;
    }
    
    /**
     * 获取业务类型分布
     */
    getBusinessTypeDistribution(accounts) {
        const distribution = {};
        accounts.forEach(account => {
            distribution[account.businessType] = (distribution[account.businessType] || 0) + 1;
        });
        return distribution;
    }
    
    /**
     * 标准化付款人信息
     */
    normalizePayerInfo(payerInfo) {
        return {
            payerName: payerInfo.payerName?.trim(),
            payerAccount: payerInfo.payerAccount?.trim(),
            payerAccountType: payerInfo.payerAccountType,
            payerBankName: payerInfo.payerBankName || '',
            detectedBusinessType: this.detectBusinessType(payerInfo.payerName?.trim() || '')
        };
    }
    
    /**
     * 标准化充值信息
     */
    normalizeRechargeInfo(rechargeInfo) {
        return {
            rechargeAmount: parseFloat(rechargeInfo.rechargeAmount),
            adAccountId: rechargeInfo.adAccountId?.trim(),
            rechargeRemark: rechargeInfo.rechargeRemark?.trim() || ''
        };
    }
    
    /**
     * 验证完整的充值请求
     */
    validateCompleteRechargeRequest(payerInfo, rechargeInfo, selectedAccount) {
        const errors = {};
        
        // 验证付款人信息
        const payerValidation = this.validatePayerInfo(payerInfo);
        if (!payerValidation.isValid) {
            Object.assign(errors, payerValidation.errors);
        }
        
        // 验证充值信息
        const rechargeValidation = this.validateRechargeInfo(rechargeInfo);
        if (!rechargeValidation.isValid) {
            Object.assign(errors, rechargeValidation.errors);
        }
        
        // 验证选中的收款账户
        if (!selectedAccount) {
            errors.receivingAccount = '请选择收款账户';
        } else {
            const accountValidation = this.validateSelectedAccount(selectedAccount, rechargeInfo.rechargeAmount);
            if (!accountValidation.isValid) {
                errors.receivingAccount = accountValidation.error;
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            normalizedData: {
                payerInfo: payerValidation.isValid ? payerValidation.payerInfo : null,
                rechargeInfo: rechargeValidation.isValid ? rechargeValidation.rechargeInfo : null,
                selectedAccount
            }
        };
    }
    
    /**
     * 验证选中的收款账户
     */
    validateSelectedAccount(account, rechargeAmount) {
        // 检查账户状态
        if (account.status !== '启用') {
            return { isValid: false, error: '所选收款账户当前不可用' };
        }
        
        // 检查单笔限额
        if (rechargeAmount > account.singleLimit) {
            return { 
                isValid: false, 
                error: `充值金额超过账户单笔限额¥${account.singleLimit.toLocaleString()}` 
            };
        }
        
        // 检查单日限额
        const remainingLimit = account.dailyLimit - (account.todayUsed || 0);
        if (rechargeAmount > remainingLimit) {
            return { 
                isValid: false, 
                error: `充值金额超过账户剩余日限额¥${remainingLimit.toLocaleString()}` 
            };
        }
        
        // 检查可用时间
        const currentHour = new Date().getHours();
        if (account.availableHours && account.availableHours !== '24小时') {
            const timeRestriction = this.businessRules.timeRestrictions[account.availableHours];
            if (timeRestriction && (currentHour < timeRestriction.start || currentHour >= timeRestriction.end)) {
                return { 
                    isValid: false, 
                    error: `当前时间不在账户可用时间范围内（${account.availableHours}）` 
                };
            }
        }
        
        return { isValid: true };
    }
}

// 导出验证管理器类
window.RechargeVerificationManager = RechargeVerificationManager;

console.log('充值信息验证和匹配系统已加载');