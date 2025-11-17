/**
 * 商户数据初始化脚本
 * 为卡片视图和表格视图提供测试数据
 */

class MerchantDataManager {
    constructor() {
        this.merchants = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalRecords = 0;
        this.currentView = 'grid';
        this.filters = {
            search: '',
            status: '',
            type: ''
        };
        
        this.initializeMockData();
    }
    
    /**
     * 初始化模拟商户数据
     */
    initializeMockData() {
        const statuses = ['active', 'inactive', 'pending', 'suspended'];
        const statusTexts = {
            'active': '活跃',
            'inactive': '非活跃', 
            'pending': '待审核',
            'suspended': '已暂停'
        };
        const types = ['enterprise', 'individual', 'government'];
        const typeTexts = {
            'enterprise': '企业',
            'individual': '个人',
            'government': '政府机构'
        };
        
        const companyNames = [
            '北京科技有限公司', '上海贸易集团', '深圳创新科技', '广州电子商务',
            '杭州网络技术', '南京软件开发', '成都互联网', '武汉数据服务',
            '西安云计算', '重庆智能制造', '天津金融服务', '青岛海洋科技',
            '大连软件园', '沈阳重工业', '长春汽车制造', '哈尔滨农业科技',
            '郑州物流运输', '济南机械制造', '石家庄建筑工程', '太原能源开发',
            '兰州矿业集团', '银川新材料', '西宁环保科技', '拉萨旅游开发',
            '乌鲁木齐贸易', '呼和浩特畜牧业', '昆明生物科技', '贵阳大数据',
            '南宁电子科技', '海口旅游服务', '福州纺织工业', '厦门进出口'
        ];
        
        const contacts = [
            '张三', '李四', '王五', '赵六', '陈七', '刘八', '杨九', '黄十',
            '周明', '吴亮', '郑强', '马辉', '朱峰', '许涛', '何军', '邓超',
            '姚伟', '钱进', '孙磊', '李娟', '王芳', '张敏', '刘洋', '陈静',
            '杨丽', '黄勇', '周艳', '吴刚', '郑红', '马丽', '朱明', '许强'
        ];
        
        // 生成50条测试数据
        for (let i = 1; i <= 50; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
            const contact = contacts[Math.floor(Math.random() * contacts.length)];
            
            // 随机生成代理商信息
            const agentId = Math.random() > 0.3 ? `AGENT${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}` : null;
            const agentName = agentId ? `代理商${Math.floor(Math.random() * 20) + 1}` : null;
            const rebatePolicy = [`${(Math.random() * 2.5 + 0.5).toFixed(1)}%`, '自定义'][Math.floor(Math.random() * 2)];
            const linkType = ['general', 'merchant'][Math.floor(Math.random() * 2)];
            
            const merchant = {
                // 新表格结构需要的字段
                accountId: `ACC${String(i).padStart(6, '0')}`,
                accountEntity: companyName,
                agentId: agentId,
                agentName: agentName,
                rebatePolicy: rebatePolicy,
                linkType: linkType,
                status: status === 'active' ? 'active' : 'inactive',
                remarks: `${companyName}的备注信息，包含重要的商户合作细节和注意事项`,
                
                // 保留旧字段以兼容现有代码
                id: `M${String(i).padStart(6, '0')}`,
                name: companyName,
                contact: contact,
                phone: `1${Math.floor(Math.random() * 900000000 + 100000000)}`,
                email: `contact${i}@${companyName.replace(/有限公司|集团|科技|网络/g, '').toLowerCase()}.com`,
                type: type,
                typeText: typeTexts[type],
                statusText: statusTexts[status],
                adAccountId: `AD${String(Math.floor(Math.random() * 999999) + 100000).padStart(6, '0')}`,
                adAccountName: `${companyName}-广告账户`,
                dailyRecharge: Math.floor(Math.random() * 50000),
                monthlyRecharge: Math.floor(Math.random() * 1000000),
                totalRecharge: Math.floor(Math.random() * 10000000),
                balance: Math.floor(Math.random() * 100000),
                createTime: new Date(2023 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                lastLoginTime: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
                remark: `商户${i}的备注信息`,
                isActive: status === 'active',
                rechargeUrl: linkType === 'merchant' ? 
                    `https://payment.cjpayment.com/recharge?merchant_id=ACC${String(i).padStart(6, '0')}` :
                    'https://payment.cjpayment.com/recharge',
                industry: ['科技服务', '电子商务', '金融服务', '教育培训', '医疗健康', '游戏娱乐'][Math.floor(Math.random() * 6)],
                // 多个广告账户
                adAccounts: this.generateAdAccounts(i, companyName),
                // 多个付款账户
                paymentAccounts: this.generatePaymentAccounts(i, companyName)
            };
            
            this.merchants.push(merchant);
        }
        
        this.totalRecords = this.merchants.length;
        console.log('商户数据初始化完成:', this.merchants.length, '条记录');
    }
    
    /**
     * 生成多个广告账户
     */
    generateAdAccounts(index, companyName) {
        const adAccounts = [];
        const accountCount = Math.floor(Math.random() * 3) + 1; // 1-3个账户
        
        for (let i = 0; i < accountCount; i++) {
            adAccounts.push({
                id: `AD${String(Math.floor(Math.random() * 999999) + 100000 + i).padStart(6, '0')}`,
                name: i === 0 ? `${companyName}-主广告账户` : `${companyName}-广告账户${i + 1}`,
                status: Math.random() > 0.2 ? 'active' : 'inactive',
                dailyBudget: Math.floor(Math.random() * 10000) + 1000,
                platform: ['Facebook', 'Google Ads', '字节跳动', '腾讯广告'][Math.floor(Math.random() * 4)]
            });
        }
        
        return adAccounts;
    }
    
    /**
     * 生成多个付款账户
     */
    generatePaymentAccounts(index, companyName) {
        const banks = ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '浦发银行', '民生银行'];
        const accountTypes = ['对公账户', '收款账户', '备用账户', '专用账户'];
        
        const accounts = [];
        const accountCount = Math.floor(Math.random() * 3) + 1; // 1-3个账户
        
        for (let i = 0; i < accountCount; i++) {
            const bank = banks[Math.floor(Math.random() * banks.length)];
            const type = accountTypes[Math.floor(Math.random() * accountTypes.length)];
            const accountNumber = `6217${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
            
            accounts.push({
                name: i === 0 ? `${companyName}-主账户` : `${companyName}-${type}${i}`,
                number: accountNumber,
                bank: bank,
                institution: `${bank}${['北京', '上海', '深圳', '广州', '杭州'][Math.floor(Math.random() * 5)]}分行`,
                type: type,
                status: Math.random() > 0.1 ? 'active' : 'inactive',
                dailyLimit: Math.floor(Math.random() * 100000) + 10000,
                balance: Math.floor(Math.random() * 50000),
                isDefault: i === 0
            });
        }
        
        return accounts;
    }
    
    /**
     * 获取筛选后的商户数据
     */
    getFilteredMerchants() {
        let filtered = this.merchants;
        
        // 搜索筛选
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(merchant => 
                merchant.name.toLowerCase().includes(searchTerm) ||
                merchant.id.toLowerCase().includes(searchTerm) ||
                merchant.contact.toLowerCase().includes(searchTerm) ||
                merchant.phone.includes(searchTerm) ||
                merchant.email.toLowerCase().includes(searchTerm)
            );
        }
        
        // 状态筛选
        if (this.filters.status) {
            filtered = filtered.filter(merchant => merchant.status === this.filters.status);
        }
        
        // 类型筛选
        if (this.filters.type) {
            filtered = filtered.filter(merchant => merchant.type === this.filters.type);
        }
        
        return filtered;
    }
    
    /**
     * 获取分页数据
     */
    getPagedMerchants() {
        const filtered = this.getFilteredMerchants();
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, filtered.length);
        
        return {
            data: filtered.slice(startIndex, endIndex),
            total: filtered.length,
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            totalPages: Math.ceil(filtered.length / this.pageSize),
            hasNextPage: endIndex < filtered.length,
            hasPrevPage: this.currentPage > 1
        };
    }
    
    /**
     * 格式化金额显示
     */
    formatAmount(amount) {
        if (amount >= 10000) {
            return (amount / 10000).toFixed(1) + '万';
        }
        return amount.toLocaleString();
    }
    
    /**
     * 格式化日期显示
     */
    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    /**
     * 格式化时间显示（相对时间）
     */
    formatRelativeTime(date) {
        if (!date) return '-';
        const now = new Date();
        const diff = now - new Date(date);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return '今天';
        if (days === 1) return '昨天';
        if (days <= 7) return `${days}天前`;
        if (days <= 30) return `${Math.floor(days / 7)}周前`;
        if (days <= 365) return `${Math.floor(days / 30)}个月前`;
        return `${Math.floor(days / 365)}年前`;
    }
    
    /**
     * 获取状态样式类名
     */
    getStatusClass(status) {
        const statusClasses = {
            'active': 'status-success',
            'inactive': 'status-inactive', 
            'pending': 'status-warning',
            'suspended': 'status-danger'
        };
        return statusClasses[status] || 'status-default';
    }
    
    /**
     * 设置筛选条件
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.currentPage = 1; // 重置到第一页
    }
    
    /**
     * 设置当前页
     */
    setCurrentPage(page) {
        this.currentPage = Math.max(1, page);
    }
    
    /**
     * 设置视图模式
     */
    setView(view) {
        this.currentView = view;
    }
    
    /**
     * 获取商户详情
     */
    getMerchantById(id) {
        return this.merchants.find(merchant => merchant.id === id);
    }
    
    /**
     * 更新商户信息
     */
    updateMerchant(id, updates) {
        const index = this.merchants.findIndex(merchant => merchant.id === id);
        if (index !== -1) {
            this.merchants[index] = { ...this.merchants[index], ...updates };
            return true;
        }
        return false;
    }
    
    /**
     * 删除商户
     */
    deleteMerchant(id) {
        const index = this.merchants.findIndex(merchant => merchant.id === id);
        if (index !== -1) {
            this.merchants.splice(index, 1);
            this.totalRecords = this.merchants.length;
            return true;
        }
        return false;
    }
    
    /**
     * 批量操作商户
     */
    batchUpdateMerchants(ids, updates) {
        let updated = 0;
        ids.forEach(id => {
            if (this.updateMerchant(id, updates)) {
                updated++;
            }
        });
        return updated;
    }
}

// 全局实例
window.merchantDataManager = new MerchantDataManager();

// 导出类以便其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchantDataManager;
}