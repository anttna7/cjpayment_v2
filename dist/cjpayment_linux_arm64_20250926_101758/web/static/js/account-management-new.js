/**
 * 全新账户管理系统
 * 采用清晰的架构和现代化的代码组织
 */

class AccountsManager {
    constructor() {
        this.currentTab = 'receiving-accounts';
        this.paymentAccounts = [];
        this.receivingAccounts = [];
        this.pollingGroups = [];
        this.init();
    }

    /**
     * 初始化系统
     */
    async init() {
        try {
            console.log('初始化账户管理系统...');
            
            this.bindEvents();
            this.initializeTabs();
            this.setupFixedColumns();
            await this.loadInitialData();
            
            console.log('账户管理系统初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showToast('系统初始化失败', 'error');
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 标签切换事件
        document.querySelectorAll('.tab-nav__item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.tab-nav__item').dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 添加收款账户按钮
        const addReceivingAccountBtn = document.getElementById('addReceivingAccountBtn');
        if (addReceivingAccountBtn) {
            addReceivingAccountBtn.addEventListener('click', () => {
                this.openReceivingAccountModal();
            });
        }

        // 收款账户模态框事件
        const receivingAccountModalClose = document.getElementById('receivingAccountModalClose');
        if (receivingAccountModalClose) {
            receivingAccountModalClose.addEventListener('click', () => {
                this.closeReceivingAccountModal();
            });
        }
        
        const cancelReceivingAccountBtn = document.getElementById('cancelReceivingAccountBtn');
        if (cancelReceivingAccountBtn) {
            cancelReceivingAccountBtn.addEventListener('click', () => {
                this.closeReceivingAccountModal();
            });
        }
        
        const saveReceivingAccountBtn = document.getElementById('saveReceivingAccountBtn');
        if (saveReceivingAccountBtn) {
            saveReceivingAccountBtn.addEventListener('click', () => {
                this.saveReceivingAccount();
            });
        }

        // 轮询组模态框事件
        const createPollingGroupBtn = document.getElementById('createPollingGroupBtn');
        if (createPollingGroupBtn) {
            createPollingGroupBtn.addEventListener('click', () => {
                this.openPollingGroupModal();
            });
        }

        const pollingGroupModalClose = document.getElementById('pollingGroupModalClose');
        if (pollingGroupModalClose) {
            pollingGroupModalClose.addEventListener('click', () => {
                this.closePollingGroupModal();
            });
        }
        
        const cancelPollingGroupBtn = document.getElementById('cancelPollingGroupBtn');
        if (cancelPollingGroupBtn) {
            cancelPollingGroupBtn.addEventListener('click', () => {
                this.closePollingGroupModal();
            });
        }
        
        const savePollingGroupBtn = document.getElementById('savePollingGroupBtn');
        if (savePollingGroupBtn) {
            savePollingGroupBtn.addEventListener('click', () => {
                this.savePollingGroup();
            });
        }

        // 轮询模式卡片事件
        document.querySelectorAll('.polling-mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                this.configurePollingMode(mode);
            });
        });

        // 模态框背景点击关闭
        const receivingAccountModalOverlay = document.getElementById('receivingAccountModalOverlay');
        if (receivingAccountModalOverlay) {
            receivingAccountModalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeReceivingAccountModal();
                }
            });
        }

        const pollingGroupModalOverlay = document.getElementById('pollingGroupModalOverlay');
        if (pollingGroupModalOverlay) {
            pollingGroupModalOverlay.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closePollingGroupModal();
                }
            });
        }

        // 轮询模式变化监听
        const pollingModeSelect = document.getElementById('pollingMode');
        if (pollingModeSelect) {
            pollingModeSelect.addEventListener('change', (e) => {
                this.handlePollingModeChange(e.target.value);
            });
        }
        
        // 添加金额区间按钮
        const addAmountRangeBtn = document.getElementById('addAmountRangeBtn');
        if (addAmountRangeBtn) {
            addAmountRangeBtn.addEventListener('click', () => {
                this.addAmountRange();
            });
        }

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeReceivingAccountModal();
                this.closePollingGroupModal();
            }
        });
    }

    /**
     * 初始化标签页
     */
    initializeTabs() {
        // 检查是否已有激活的面板
        const activePanel = document.querySelector('.tab-panel--active');
        if (activePanel) {
            const tabName = activePanel.getAttribute('data-tab');
            this.currentTab = tabName;
            console.log(`检测到已激活的面板: ${tabName}`);
            
            // 加载对应数据
            if (tabName === 'receiving-accounts') {
                this.loadReceivingAccounts();
            } else if (tabName === 'payment-accounts') {
                this.loadPaymentAccounts();
            }
        } else {
            // 默认激活收款账户标签（根据优化要求）
            this.switchTab('receiving-accounts');
        }
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        console.log(`切换到标签: ${tabName}`);

        // 更新标签导航状态
        document.querySelectorAll('.tab-nav__item').forEach(tab => {
            tab.classList.remove('tab-nav__item--active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('tab-nav__item--active');

        // 更新标签页内容
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('tab-panel--active');
        });
        
        // 正确的ID映射
        const panelIdMap = {
            'payment-accounts': 'paymentAccountsPanel',
            'receiving-accounts': 'receivingAccountsPanel', 
            'polling-rules': 'pollingRulesPanel'
        };
        
        const targetPanelId = panelIdMap[tabName];
        const targetPanel = document.getElementById(targetPanelId);
        
        if (targetPanel) {
            targetPanel.classList.add('tab-panel--active');
            console.log(`激活面板: ${targetPanelId}`);
        } else {
            console.error(`找不到面板: ${targetPanelId}`);
        }

        // 根据标签页加载对应数据
        switch (tabName) {
            case 'payment-accounts':
                this.loadPaymentAccounts();
                break;
            case 'receiving-accounts':
                this.loadReceivingAccounts();
                break;
            case 'polling-rules':
                this.loadPollingRules();
                break;
        }
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        // 只加载当前页面存在的数据
        const promises = [];
        
        // 检查付款账户表格是否存在
        if (document.getElementById('paymentAccountsTableBody')) {
            promises.push(this.loadPaymentAccounts());
        }
        
        // 检查收款账户表格是否存在  
        if (document.getElementById('receivingAccountsTableBody')) {
            promises.push(this.loadReceivingAccounts());
        }
        
        // 轮询规则总是加载
        promises.push(this.loadPollingRules());
        
        await Promise.all(promises);
    }

    /**
     * 加载付款账户数据（来自商户管理）
     */
    async loadPaymentAccounts() {
        try {
            console.log('开始加载付款账户数据...');
            
            // 模拟从商户管理获取付款账户数据
            const mockPaymentAccounts = [
                {
                    id: 'PAY001',
                    accountNumber: '6228480012345678901',
                    accountName: '北京科技有限公司',
                    accountType: '企业银行账户',
                    bankName: '中国工商银行',
                    merchantId: 'MERCHANT_001',
                    merchantName: '演示商户A',
                    adAccountId: 'AD123456',
                    adAccountName: '广告主账户A',
                    balance: 156780.50,
                    status: 'active',
                    createdAt: '2024-01-15',
                    lastUpdated: '2024-02-10'
                },
                {
                    id: 'PAY002', 
                    accountNumber: '6228480087654321098',
                    accountName: '上海贸易公司',
                    accountType: '企业银行账户',
                    bankName: '中国建设银行',
                    merchantId: 'MERCHANT_002',
                    merchantName: '演示商户B',
                    adAccountId: 'AD789012',
                    adAccountName: '广告主账户B',
                    balance: 89650.30,
                    status: 'active',
                    createdAt: '2024-01-20',
                    lastUpdated: '2024-02-08'
                },
                {
                    id: 'PAY003',
                    accountNumber: '2088123456789012',
                    accountName: '深圳电商有限公司',
                    accountType: '支付宝商户',
                    bankName: '支付宝',
                    merchantId: 'MERCHANT_003',
                    merchantName: '演示商户C',
                    adAccountId: 'AD345678',
                    adAccountName: '广告主账户C',
                    balance: 245680.75,
                    status: 'pending',
                    createdAt: '2024-02-01',
                    lastUpdated: '2024-02-05'
                }
            ];

            this.paymentAccounts = mockPaymentAccounts;
            console.log('付款账户数据已设置，开始渲染表格');
            this.renderPaymentAccountsTable();
            console.log('付款账户数据加载完成');
            
        } catch (error) {
            console.error('加载付款账户失败:', error);
            this.showToast('加载付款账户失败', 'error');
        }
    }

    /**
     * 渲染付款账户表格
     */
    renderPaymentAccountsTable() {
        const tbody = document.getElementById('paymentAccountsTableBody');
        if (!tbody) {
            console.error('未找到付款账户表格tbody元素');
            return;
        }
        
        console.log('开始渲染付款账户表格，数据条数:', this.paymentAccounts.length);

        if (this.paymentAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="table__loading">
                        <span>暂无付款账户数据</span>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.paymentAccounts.map((account, index) => `
            <tr>
                <td class="col-serial-cell">
                    <div class="serial-number">${index + 1}</div>
                </td>
                <td>${account.accountNumber}</td>
                <td>
                    <div style="font-weight: 500;">${account.accountName}</div>
                </td>
                <td>${account.accountType}</td>
                <td>${account.bankName || account.institution}</td>
                <td>
                    <div style="font-size: 0.8rem;">
                        <div style="font-weight: 500;">${account.merchantName || '未关联'}</div>
                        <div style="color: #64748b;">${account.merchantId || ''}</div>
                    </div>
                </td>
                <td>${account.adAccountId}</td>
                <td>${account.adAccountName}</td>
                <td class="col-highlight">
                    <div style="font-weight: 600; color: var(--account-primary);">¥${(account.balance || 0).toLocaleString()}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">可用</div>
                </td>
                <td>
                    <span class="status-badge status-badge--${account.status}">
                        ${this.getStatusText(account.status)}
                    </span>
                </td>
                <td style="font-size: 0.8rem; color: #64748b;">${account.createdAt}</td>
                <td style="font-size: 0.8rem; color: #64748b;">${account.lastUpdated || account.createdAt}</td>
                <td class="col-actions-cell">
                    <div class="table-actions">
                        <button class="action-btn action-btn--view" onclick="accountsManager.viewPaymentAccount('${account.id}')" title="查看">👁</button>
                        <button class="action-btn action-btn--edit" onclick="accountsManager.editPaymentAccount('${account.id}')" title="编辑">✏️</button>
                        <button class="action-btn action-btn--test" onclick="accountsManager.testPaymentAccount('${account.id}')" title="测试">🔧</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        console.log('付款账户表格渲染完成，共渲染', this.paymentAccounts.length, '条记录');
    }

    /**
     * 加载收款账户数据
     */
    async loadReceivingAccounts() {
        try {
            console.log('加载收款账户数据...');
            
            // 模拟收款账户数据
            const mockReceivingAccounts = [
                {
                    id: 'REC001',
                    accountName: '工商银行收款账户',
                    accountNumber: '6228480098765432100',
                    accountType: 'corporate', // 对公/对私
                    institution: 'bank', // 账户机构
                    bankName: '中国工商银行',
                    dailyLimit: 50000,
                    singleLimit: 10000,
                    status: 'active',
                    createdAt: '2024-01-10',
                    remark: '主要收款账户，用于大额收款'
                },
                {
                    id: 'REC002',
                    accountName: '支付宝收款账户',
                    accountNumber: 'merchant@alipay.com',
                    accountType: 'personal', // 对公/对私
                    institution: 'alipay', // 账户机构
                    bankName: '支付宝',
                    dailyLimit: 20000,
                    singleLimit: 5000,
                    status: 'active',
                    createdAt: '2024-01-12',
                    remark: '支付宝收款专用账户'
                },
                {
                    id: 'REC003',
                    accountName: '微信收款账户',
                    accountNumber: 'WX2024001',
                    accountType: 'corporate', // 对公/对私
                    institution: 'wechat', // 账户机构
                    bankName: '微信支付',
                    dailyLimit: 30000,
                    singleLimit: 8000,
                    status: 'active',
                    createdAt: '2024-01-05',
                    remark: '微信支付专用账户'
                },
                {
                    id: 'REC004',
                    accountName: '招商银行收款账户',
                    accountNumber: '6214830012345678',
                    accountType: 'personal', // 对公/对私
                    institution: 'bank', // 账户机构
                    bankName: '招商银行',
                    dailyLimit: 40000,
                    singleLimit: 12000,
                    status: 'inactive',
                    createdAt: '2024-02-01',
                    remark: '备用收款账户，暂停使用'
                }
            ];

            this.receivingAccounts = mockReceivingAccounts;
            this.renderReceivingAccountsTable();
            
        } catch (error) {
            console.error('加载收款账户失败:', error);
            this.showToast('加载收款账户失败', 'error');
        }
    }

    /**
     * 渲染收款账户表格
     */
    renderReceivingAccountsTable() {
        const tbody = document.getElementById('receivingAccountsTableBody');
        if (!tbody) {
            console.error('未找到收款账户表格tbody元素');
            return;
        }
        
        console.log('开始渲染收款账户表格，数据条数:', this.receivingAccounts.length);

        if (this.receivingAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="table__loading">
                        <span>暂无收款账户数据</span>
                    </td>
                </tr>
            `;
            return;
        }

        // 新表格结构: 序号、收款账号、账户名称、账户机构、收款类型、日限额、单笔限额、账户状态、备注、操作
        tbody.innerHTML = this.receivingAccounts.map((account, index) => `
            <tr class="merchant-row" data-account-id="${account.id}">
                <td class="col-fixed-left col-index">${index + 1}</td>
                
                <td class="col-scrollable" title="${account.accountNumber}">
                    <div class="account-number">
                        ${account.accountNumber}
                    </div>
                </td>
                
                <td class="col-scrollable" title="${account.accountName}">
                    <div class="account-name">
                        ${account.accountName}
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="institution-type">
                        ${this.getInstitutionText(account.institution, account.bankName)}
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="account-type">
                        <span class="type-badge type-badge--${account.accountType}">
                            ${this.getAccountTypeText(account.accountType)}
                        </span>
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="limit-amount" title="日限额: ¥${account.dailyLimit?.toLocaleString() || '无限制'}">
                        ¥${account.dailyLimit?.toLocaleString() || '无限制'}
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="limit-amount" title="单笔限额: ¥${account.singleLimit?.toLocaleString() || '无限制'}">
                        ¥${account.singleLimit?.toLocaleString() || '无限制'}
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="status-badge status-badge--${account.status}">
                        <span class="status-indicator"></span>
                        ${this.getStatusText(account.status)}
                    </div>
                </td>
                
                <td class="col-scrollable" title="${account.remark || '暂无备注'}">
                    <div class="remarks-text">
                        ${this.truncateText(account.remark || '暂无备注', 15)}
                    </div>
                </td>
                
                <td class="col-actions">
                    <div class="table-actions">
                        <button class="action-btn action-btn--edit" 
                                onclick="accountsManager.editReceivingAccount('${account.id}')"
                                title="编辑账户">
                            编辑
                        </button>
                        
                        ${account.status === 'active' ? 
                            `<button class="action-btn action-btn--disable" 
                                    onclick="accountsManager.toggleReceivingAccountStatus('${account.id}')"
                                    title="禁用账户">
                                禁用
                            </button>` :
                            `<button class="action-btn action-btn--enable" 
                                    onclick="accountsManager.toggleReceivingAccountStatus('${account.id}')"
                                    title="启用账户">
                                启用
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
        
        console.log('收款账户表格渲染完成，共渲染', this.receivingAccounts.length, '条记录');
    }
    
    /**
     * 获取机构类型文本
     */
    getInstitutionText(institution, bankName) {
        const institutionMap = {
            'bank': '银行',
            'alipay': '支付宝',
            'wechat': '微信',
            'other': '其他'
        };
        
        // 如果是银行类型且有银行名称，显示具体银行名称
        if (institution === 'bank' && bankName) {
            return `${bankName}`;
        }
        
        // 返回机构类型或手动输入的名称
        return institutionMap[institution] || institution;
    }
    
    /**
     * 文本截断辅助函数
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 加载轮询规则数据
     */
    async loadPollingRules() {
        try {
            console.log('加载轮询规则数据...');
            
            // 模拟轮询组数据
            const mockPollingGroups = [
                {
                    id: 'PG001',
                    name: '高额收款组',
                    pollingMode: 'amount',
                    accounts: ['REC001', 'REC002'],
                    config: {
                        minAmount: 10000,
                        maxAmount: 50000
                    },
                    status: 'active',
                    createdAt: '2024-01-15'
                }
            ];

            this.pollingGroups = mockPollingGroups;
            this.renderPollingGroups();
            
        } catch (error) {
            console.error('加载轮询规则失败:', error);
            this.showToast('加载轮询规则失败', 'error');
        }
    }

    /**
     * 渲染轮询组
     */
    renderPollingGroups() {
        const container = document.getElementById('pollingGroupsContainer');
        if (!container) return;

        if (this.pollingGroups.length === 0) {
            container.innerHTML = `
                <div class="polling-group-placeholder">
                    <span>暂无轮询组，点击上方按钮创建</span>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pollingGroups.map(group => `
            <div class="polling-group-card" data-group-id="${group.id}">
                <div class="polling-group-header">
                    <div class="polling-group-title-section">
                        <h4 class="polling-group-title">${group.name}</h4>
                        <div class="polling-group-meta">
                            <span class="polling-mode-badge">${this.getPollingModeText(group.pollingMode)}</span>
                            <span class="status-badge status-badge--${group.status}">${this.getStatusText(group.status)}</span>
                        </div>
                    </div>
                    <div class="polling-group-stats">
                        <div class="stat-item">
                            <span class="stat-value">${group.accounts.length}</span>
                            <span class="stat-label">关联账户</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.getGroupUsageStats(group.id)}</span>
                            <span class="stat-label">今日使用</span>
                        </div>
                    </div>
                </div>
                
                <div class="polling-group-body">
                    <div class="polling-group-info">
                        <div class="info-section">
                            <h5>账户列表</h5>
                            <div class="accounts-preview">
                                ${group.accounts.map(accountId => {
                                    const account = this.receivingAccounts.find(a => a.id === accountId);
                                    return account ? `
                                        <div class="account-preview-item">
                                            <span class="account-preview-name">${account.accountName}</span>
                                            <span class="account-preview-type">${this.getAccountTypeText(account.accountType)}</span>
                                        </div>
                                    ` : '';
                                }).join('')}
                            </div>
                        </div>
                        
                        ${group.pollingMode === 'weight' && group.config ? `
                            <div class="info-section">
                                <h5>权重配置</h5>
                                <div class="weight-distribution-chart">
                                    ${group.config.accounts.map(acc => {
                                        const account = this.receivingAccounts.find(a => a.id === acc.accountId);
                                        return `
                                            <div class="weight-distribution-item">
                                                <div class="weight-bar-container">
                                                    <div class="weight-bar" style="width: ${acc.weight}%"></div>
                                                    <span class="weight-text">${account?.accountName || acc.accountId} (${acc.probability})</span>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${group.pollingMode === 'sequence' ? `
                            <div class="info-section">
                                <h5>轮询顺序</h5>
                                <div class="sequence-flow">
                                    ${group.accounts.map((accountId, index) => {
                                        const account = this.receivingAccounts.find(a => a.id === accountId);
                                        return `
                                            <div class="sequence-item">
                                                <span class="sequence-number">${index + 1}</span>
                                                <span class="sequence-account">${account?.accountName || accountId}</span>
                                                ${index < group.accounts.length - 1 ? '<span class="sequence-arrow">→</span>' : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${group.remark ? `
                            <div class="info-section">
                                <h5>备注信息</h5>
                                <p class="group-remark">${group.remark}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="polling-group-footer">
                    <div class="polling-group-actions">
                        <button class="action-btn action-btn--view" onclick="accountsManager.viewPollingGroupDetails('${group.id}')" title="查看详情">
                            <span class="action-icon">👁</span>
                            <span class="action-text">查看</span>
                        </button>
                        ${group.pollingMode === 'weight' ? `
                            <button class="action-btn action-btn--test" onclick="accountsManager.demonstrateWeightPolling('${group.id}')" title="测试权重轮询">
                                <span class="action-icon">🎯</span>
                                <span class="action-text">测试</span>
                            </button>
                        ` : ''}
                        <button class="action-btn action-btn--edit" onclick="accountsManager.editPollingGroupEnhanced('${group.id}')" title="编辑配置">
                            <span class="action-icon">✏️</span>
                            <span class="action-text">编辑</span>
                        </button>
                        <button class="action-btn action-btn--toggle" onclick="accountsManager.togglePollingGroupStatus('${group.id}')" title="切换状态">
                            <span class="action-icon">${group.status === 'active' ? '⏸️' : '▶️'}</span>
                            <span class="action-text">${group.status === 'active' ? '暂停' : '启用'}</span>
                        </button>
                        <button class="action-btn action-btn--delete" onclick="accountsManager.deletePollingGroup('${group.id}')" title="删除">
                            <span class="action-icon">🗑️</span>
                            <span class="action-text">删除</span>
                        </button>
                    </div>
                    <div class="polling-group-timestamp">
                        <small>创建于 ${group.createdAt}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 收款账户相关操作
     */
    openReceivingAccountModal(accountId = null) {
        const modal = document.getElementById('receivingAccountModalOverlay');
        const title = document.querySelector('#receivingAccountModalOverlay .account-modal-title');
        const form = document.getElementById('receivingAccountForm');
        
        if (accountId) {
            if (title) title.innerHTML = '<span class="account-modal-icon">💳</span>编辑收款账户';
            this.fillReceivingAccountForm(accountId);
        } else {
            if (title) title.innerHTML = '<span class="account-modal-icon">💳</span>添加收款账户';
            form.reset();
            this.clearFormErrors();
        }
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeReceivingAccountModal() {
        const modal = document.getElementById('receivingAccountModalOverlay');
        modal.classList.remove('show');
        document.body.style.overflow = '';
        // 清除表单错误状态
        this.clearFormErrors();
    }

    /**
     * 清除表单错误状态
     */
    clearFormErrors() {
        const errorElements = document.querySelectorAll('.account-form-error');
        errorElements.forEach(error => {
            error.textContent = '';
            error.parentElement.classList.remove('account-form-group--error');
        });
    }

    /**
     * 显示表单错误
     */
    showFormError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            const formGroup = field.closest('.account-form-group');
            const errorElement = formGroup.querySelector('.account-form-error');
            
            if (formGroup) formGroup.classList.add('account-form-group--error');
            if (errorElement) errorElement.textContent = message;
        }
    }

    /**
     * 验证收款账户表单
     */
    validateReceivingAccountForm(formData) {
        const errors = {};
        
        // 必填字段验证
        if (!formData.get('accountName')?.trim()) {
            errors.receivingAccountName = '账户名称不能为空';
        }
        
        if (!formData.get('accountNumber')?.trim()) {
            errors.receivingAccountNumber = '账户号码不能为空';
        }
        
        if (!formData.get('accountType')) {
            errors.receivingAccountType = '请选择账户类型';
        }
        
        if (!formData.get('accountInstitution')) {
            errors.receivingAccountInstitution = '请选择账户机构';
        }
        
        // 如果选择了银行，银行名称必填
        if (formData.get('accountInstitution') === 'bank' && !formData.get('bankName')) {
            errors.receivingBankName = '请选择银行名称';
        }
        
        // 账户号码格式验证
        const accountNumber = formData.get('accountNumber')?.trim();
        if (accountNumber) {
            const institution = formData.get('accountInstitution');
            if (institution === 'bank' && !/^\d{10,25}$/.test(accountNumber)) {
                errors.receivingAccountNumber = '银行账户号码格式不正确（应为10-25位数字）';
            } else if (institution === 'alipay' && !/^1[3-9]\d{9}$/.test(accountNumber)) {
                errors.receivingAccountNumber = '支付宝账户格式不正确（请输入手机号）';
            }
        }
        
        // 限额验证
        const dailyLimit = formData.get('dailyLimit');
        if (dailyLimit && (isNaN(dailyLimit) || parseFloat(dailyLimit) < 0)) {
            errors.receivingDailyLimit = '单日限额必须为有效的非负数';
        }
        
        const singleLimit = formData.get('singleLimit');
        if (singleLimit && (isNaN(singleLimit) || parseFloat(singleLimit) < 0)) {
            errors.receivingSingleLimit = '单笔限额必须为有效的非负数';
        }
        
        return errors;
    }

    /**
     * 账户机构切换处理
     */
    toggleBankFields(institution) {
        const bankSection = document.getElementById('bankSection');
        const bankNameField = document.getElementById('receivingBankName');
        
        if (institution === 'bank') {
            bankSection.style.display = 'block';
            if (bankNameField) bankNameField.setAttribute('required', '');
        } else {
            bankSection.style.display = 'none';
            if (bankNameField) {
                bankNameField.removeAttribute('required');
                bankNameField.value = '';
            }
        }
    }

    fillReceivingAccountForm(accountId) {
        const account = this.receivingAccounts.find(acc => acc.id === accountId);
        if (!account) return;

        document.getElementById('receivingAccountName').value = account.accountName;
        document.getElementById('receivingAccountNumber').value = account.accountNumber;
        document.getElementById('receivingAccountType').value = account.accountType;
        document.getElementById('receivingAccountInstitution').value = account.accountInstitution || '';
        document.getElementById('receivingBankName').value = account.bankName || '';
        document.getElementById('receivingBranchInfo').value = account.branchInfo || '';
        document.getElementById('receivingDailyLimit').value = account.dailyLimit || '';
        document.getElementById('receivingSingleLimit').value = account.singleLimit || '';
        document.getElementById('receivingRemark').value = account.remark || '';
        
        // 触发机构切换
        if (account.accountInstitution) {
            this.toggleBankFields(account.accountInstitution);
        }
    }

    async saveReceivingAccount() {
        const form = document.getElementById('receivingAccountForm');
        const formData = new FormData(form);
        const saveBtn = document.getElementById('saveReceivingAccountBtn');
        const spinner = saveBtn.querySelector('.account-loading-spinner');
        
        // 清除之前的错误状态
        this.clearFormErrors();
        
        // 验证表单
        const errors = this.validateReceivingAccountForm(formData);
        
        if (Object.keys(errors).length > 0) {
            // 显示验证错误
            Object.entries(errors).forEach(([fieldId, message]) => {
                this.showFormError(fieldId, message);
            });
            return;
        }
        
        // 显示加载状态
        saveBtn.disabled = true;
        if (spinner) spinner.style.display = 'inline-block';
        
        const accountData = {
            id: `REC${Date.now()}`,
            accountName: formData.get('accountName').trim(),
            accountNumber: formData.get('accountNumber').trim(),
            accountType: formData.get('accountType'),
            accountInstitution: formData.get('accountInstitution'),
            bankName: formData.get('bankName') || '',
            branchInfo: formData.get('branchInfo') || '',
            dailyLimit: parseFloat(formData.get('dailyLimit')) || 0,
            singleLimit: parseFloat(formData.get('singleLimit')) || 0,
            currentBalance: 0,
            todayCollection: 0,
            monthlyCollection: 0,
            totalCollection: 0,
            successfulTransactions: 0,
            totalTransactions: 0,
            pollingGroup: '',
            status: 'active',
            createdAt: new Date().toISOString().split('T')[0],
            remark: formData.get('remark') || ''
        };

        try {
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 800));
            
            this.receivingAccounts.push(accountData);
            this.renderReceivingAccountsTable();
            this.closeReceivingAccountModal();
            this.showToast('收款账户保存成功', 'success');
        } catch (error) {
            console.error('保存收款账户失败:', error);
            this.showToast('保存失败，请重试', 'error');
        } finally {
            // 隐藏加载状态
            saveBtn.disabled = false;
            if (spinner) spinner.style.display = 'none';
        }
    }

    viewReceivingAccount(accountId) {
        const account = this.receivingAccounts.find(acc => acc.id === accountId);
        if (account) {
            alert(`账户详情:\n账户名称: ${account.accountName}\n账户号码: ${account.accountNumber}\n账户类型: ${account.accountType}`);
        }
    }

    editReceivingAccount(accountId) {
        this.openReceivingAccountModal(accountId);
    }

    toggleReceivingAccountStatus(accountId) {
        const account = this.receivingAccounts.find(acc => acc.id === accountId);
        if (account) {
            account.status = account.status === 'active' ? 'inactive' : 'active';
            this.renderReceivingAccountsTable();
            this.showToast('状态更新成功', 'success');
        }
    }

    deleteReceivingAccount(accountId) {
        if (confirm('确定要删除这个收款账户吗？')) {
            this.receivingAccounts = this.receivingAccounts.filter(acc => acc.id !== accountId);
            this.renderReceivingAccountsTable();
            this.showToast('删除成功', 'success');
        }
    }

    /**
     * 轮询组相关操作
     */
    openPollingGroupModal() {
        const modal = document.getElementById('pollingGroupModalOverlay');
        const title = document.querySelector('#pollingGroupModal .account-modal-title');
        const form = document.getElementById('pollingGroupForm');
        const saveButton = document.getElementById('savePollingGroupBtn');
        
        // 重置为创建模式
        if (title) {
            title.innerHTML = `<span class="account-modal-icon">⚙️</span>创建轮询组`;
        }
        
        // 重置按钮文本为创建模式
        if (saveButton) {
            saveButton.innerHTML = `
                <span class="account-loading-spinner" style="display: none;"></span>
                创建轮询组
            `;
        }
        
        // 清空编辑模式标记
        if (form) {
            delete form.dataset.editingGroupId;
        }
        
        modal.classList.add('account-modal-overlay--active');
        this.populateAccountSelector();
    }

    closePollingGroupModal() {
        const modal = document.getElementById('pollingGroupModalOverlay');
        modal.classList.remove('account-modal-overlay--active');
        
        // 清空表单
        const form = document.getElementById('pollingGroupForm');
        if (form) {
            form.reset();
            delete form.dataset.editingGroupId;
        }
    }

    /**
     * 处理轮询模式变化
     */
    handlePollingModeChange(mode) {
        // 更新模式描述
        this.updatePollingModeDescription(mode);
        
        // 更新账户选择器
        this.populateAccountSelector(mode);
        
        // 显示/隐藏对应的配置区域
        this.showPollingConfigSection(mode);
        
        // 清空之前的配置
        this.clearPollingConfig();
    }
    
    /**
     * 更新轮询模式描述
     */
    updatePollingModeDescription(mode) {
        const descriptions = {
            'weight': '根据账户权重按比例分配，权重越高使用概率越大',
            'amount': '根据金额大小选择不同账户，不同金额区间使用不同账户',
            'sequence': '按预设顺序依次使用账户，实现轮流分配',
            'priority': '按优先级顺序使用账户，优先使用高优先级账户'
        };
        
        const descElement = document.getElementById('pollingModeDescription');
        if (descElement) {
            descElement.textContent = descriptions[mode] || '请选择适合的轮询模式';
        }
    }
    
    /**
     * 显示轮询配置区域
     */
    showPollingConfigSection(mode) {
        console.log(`显示轮询配置区域，模式: ${mode}`);
        const configSection = document.getElementById('pollingConfigSection');
        if (!configSection) {
            console.error('找不到pollingConfigSection元素');
            return;
        }
        
        const allConfigs = [
            'sequencePollingConfig',
            'amountPollingConfig', 
            'weightPollingConfig',
            'priorityPollingConfig'
        ];
        
        // 隐藏所有配置区域
        allConfigs.forEach(configId => {
            const config = document.getElementById(configId);
            if (config) {
                config.style.display = 'none';
                console.log(`隐藏配置区域: ${configId}`);
            }
        });
        
        if (!mode) {
            configSection.style.display = 'none';
            console.log('没有选择模式，隐藏配置区域');
            return;
        }
        
        configSection.style.display = 'block';
        console.log('显示pollingConfigSection');
        
        // 显示对应的配置区域
        const configMap = {
            'sequence': 'sequencePollingConfig',
            'amount': 'amountPollingConfig',
            'weight': 'weightPollingConfig', 
            'priority': 'priorityPollingConfig'
        };
        
        const targetConfigId = configMap[mode];
        if (targetConfigId) {
            const targetConfig = document.getElementById(targetConfigId);
            if (targetConfig) {
                targetConfig.style.display = 'block';
                console.log(`显示目标配置区域: ${targetConfigId}`);
            } else {
                console.error(`找不到目标配置区域: ${targetConfigId}`);
            }
        } else {
            console.error(`未知的轮询模式: ${mode}`);
        }
    }
    
    /**
     * 清空轮询配置
     */
    clearPollingConfig() {
        // 清空顺序列表
        const sequenceList = document.getElementById('sequenceOrderList');
        if (sequenceList) sequenceList.innerHTML = '';
        
        // 清空金额区间列表
        const amountList = document.getElementById('amountRangesList');
        if (amountList) amountList.innerHTML = '';
        
        // 清空权重列表
        const weightList = document.getElementById('pollingGroupWeightAccountsList');
        if (weightList) weightList.innerHTML = '';
        
        // 清空优先级列表
        const priorityList = document.getElementById('pollingGroupPriorityAccountsList');
        if (priorityList) priorityList.innerHTML = '';
    }
    
    populateAccountSelector(mode = null) {
        const selector = document.getElementById('accountSelector');
        if (!selector) return;

        const currentPollingMode = mode || document.getElementById('pollingMode')?.value;
        
        // 根据模式显示不同的账户选择器
        selector.innerHTML = this.receivingAccounts.map(account => `
            <div class="account-selector-item">
                <input type="checkbox" class="account-selector-checkbox" value="${account.id}" id="acc_${account.id}" onchange="accountsManager.handleAccountSelection('${account.id}', this.checked)">
                <label for="acc_${account.id}" class="account-label">
                    <div class="account-name">${account.accountName}</div>
                    <div class="account-details">${account.accountNumber} | 日限额: ¥${account.dailyLimit.toLocaleString()}</div>
                </label>
            </div>
        `).join('');
    }
    
    /**
     * 处理账户选择
     */
    handleAccountSelection(accountId, isSelected) {
        const mode = document.getElementById('pollingMode')?.value;
        console.log('处理账户选择:', { accountId, isSelected, mode });
        
        if (!mode) {
            console.warn('没有选择轮询模式');
            this.showToast('请先选择轮询模式', 'warning');
            return;
        }
        
        if (isSelected) {
            console.log(`添加账户 ${accountId} 到 ${mode} 配置`);
            try {
                this.addAccountToPollingConfig(accountId, mode);
                console.log(`账户 ${accountId} 添加到 ${mode} 配置成功`);
            } catch (error) {
                console.error(`添加账户到 ${mode} 配置失败:`, error);
                this.showToast(`添加账户失败: ${error.message}`, 'error');
            }
        } else {
            console.log(`从 ${mode} 配置中移除账户 ${accountId}`);
            try {
                this.removeAccountFromPollingConfig(accountId, mode);
                console.log(`账户 ${accountId} 从 ${mode} 配置移除成功`);
            } catch (error) {
                console.error(`从 ${mode} 配置移除账户失败:`, error);
            }
        }
    }
    
    /**
     * 将账户添加到轮询配置
     */
    addAccountToPollingConfig(accountId, mode) {
        const account = this.receivingAccounts.find(acc => acc.id === accountId);
        if (!account) return;
        
        switch (mode) {
            case 'sequence':
                this.addAccountToSequence(account);
                break;
            case 'weight':
                this.addAccountToWeight(account);
                break;
            case 'priority':
                this.addAccountToPriority(account);
                break;
            case 'amount':
                // 金额指定模式不需要在选择时添加，由用户手动配置区间
                break;
        }
    }
    
    /**
     * 从轮询配置中移除账户
     */
    removeAccountFromPollingConfig(accountId, mode) {
        switch (mode) {
            case 'sequence':
                this.removeAccountFromSequence(accountId);
                break;
            case 'weight':
                this.removeAccountFromWeight(accountId);
                break;
            case 'priority':
                this.removeAccountFromPriority(accountId);
                break;
        }
    }

    async savePollingGroup() {
        console.log('开始保存轮询组...');
        
        // 添加详细的DOM元素检查
        const form = document.getElementById('pollingGroupForm');
        if (!form) {
            console.error('找不到轮询组表单元素');
            this.showToast('表单初始化错误，请刷新页面重试', 'error');
            return;
        }
        
        const formData = new FormData(form);
        const selectedAccounts = Array.from(document.querySelectorAll('.account-selector-checkbox:checked')).map(cb => cb.value);
        const pollingMode = formData.get('pollingMode');
        
        console.log('收集到的基础数据:', {
            groupName: formData.get('groupName'),
            pollingMode: pollingMode,
            selectedAccounts: selectedAccounts,
            remark: formData.get('remark'),
            formDataEntries: Array.from(formData.entries())
        });
        
        // 检查是否是编辑模式
        const editingGroupId = form.dataset.editingGroupId;
        const isEditMode = Boolean(editingGroupId);
        
        // 基础验证
        if (!formData.get('groupName')) {
            this.showToast('请填写轮询组名称', 'error');
            return;
        }
        
        if (!pollingMode) {
            this.showToast('请选择轮询模式', 'error');
            return;
        }
        
        if (selectedAccounts.length === 0) {
            this.showToast('请至少选择一个收款账户', 'error');
            return;
        }
        
        // 收集详细配置信息
        let detailedConfig;
        try {
            console.log(`开始收集${pollingMode}模式的详细配置...`);
            detailedConfig = this.collectDetailedConfig(pollingMode, selectedAccounts);
            console.log('收集到的详细配置:', detailedConfig);
            
            // 验证配置数据结构
            if (!detailedConfig || typeof detailedConfig !== 'object') {
                throw new Error('配置数据结构无效');
            }
        } catch (error) {
            console.error('收集配置信息失败:', error);
            console.error('错误堆栈:', error.stack);
            this.showToast(`配置信息收集失败：${error.message}`, 'error');
            return;
        }
        
        // 根据模式进行特殊验证
        console.log('开始验证配置...');
        const validation = this.validatePollingConfig(pollingMode, detailedConfig);
        if (!validation.isValid) {
            console.log('配置验证失败:', validation.message);
            this.showToast(validation.message, 'error');
            return;
        }
        console.log('配置验证通过');
        
        const groupData = {
            id: isEditMode ? editingGroupId : `PG${Date.now()}`,
            name: formData.get('groupName'),
            pollingMode: pollingMode,
            accounts: selectedAccounts,
            detailedConfig: detailedConfig, // 存储详细配置信息
            config: this.generatePollingConfig(pollingMode, detailedConfig),
            status: isEditMode ? this.pollingGroups.find(g => g.id === editingGroupId)?.status || 'active' : 'active',
            createdAt: isEditMode ? this.pollingGroups.find(g => g.id === editingGroupId)?.createdAt : new Date().toISOString().split('T')[0],
            remark: formData.get('remark')
        };

        try {
            console.log('准备保存轮询组数据:', groupData);
            
            if (isEditMode) {
                // 编辑模式：替换现有轮询组
                const index = this.pollingGroups.findIndex(g => g.id === editingGroupId);
                if (index !== -1) {
                    this.pollingGroups[index] = groupData;
                    console.log('轮询组编辑成功');
                    this.showToast(`轮询组修改成功！${this.getPollingModeText(pollingMode)}配置已更新`, 'success');
                } else {
                    throw new Error('找不到要编辑的轮询组');
                }
            } else {
                // 创建模式：添加新轮询组
                this.pollingGroups.push(groupData);
                console.log('轮询组创建成功');
                
                let successMessage = `轮询组"${groupData.name}"创建成功！`;
                
                // 根据模式添加具体的配置信息
                switch (pollingMode) {
                    case 'amount':
                        successMessage += ` 已配置${detailedConfig.ranges.length}个金额区间`;
                        break;
                    case 'weight':
                        const totalWeight = detailedConfig.accounts.reduce((sum, acc) => sum + acc.weight, 0);
                        successMessage += ` 已配置权重分配，总权重${totalWeight}`;
                        break;
                    case 'sequence':
                        successMessage += ` 已配置${detailedConfig.sequence.length}个账户的轮询顺序`;
                        break;
                    case 'priority':
                        successMessage += ` 已配置${detailedConfig.accounts.length}个账户的优先级`;
                        break;
                }
                
                this.showToast(successMessage, 'success');
            }
            
            // 更新界面
            this.renderPollingGroups();
            this.closePollingGroupModal();
            
            // 清理编辑状态
            delete form.dataset.editingGroupId;
            
            console.log('轮询组保存完成');
            
        } catch (error) {
            console.error(`${isEditMode ? '编辑' : '创建'}轮询组失败:`, error);
            this.showToast(`保存失败：${error.message}`, 'error');
        }
    }
    
    /**
     * 收集详细配置信息
     */
    collectDetailedConfig(mode, selectedAccounts) {
        switch (mode) {
            case 'sequence':
                return this.collectSequenceConfig();
            case 'weight':
                return this.collectWeightConfig();
            case 'priority':
                return this.collectPriorityConfig();
            case 'amount':
                return this.collectAmountConfig();
            default:
                return { accounts: selectedAccounts };
        }
    }
    
    collectSequenceConfig() {
        console.log('开始收集顺序轮询配置...');
        const sequenceList = document.getElementById('sequenceOrderList');
        if (!sequenceList) {
            console.error('找不到sequenceOrderList元素');
            throw new Error('顺序配置区域未找到');
        }
        
        const sequenceItems = sequenceList.querySelectorAll('.sequence-account-item');
        console.log(`找到${sequenceItems.length}个顺序项`);
        
        const sequence = Array.from(sequenceItems).map(item => {
            const accountId = item.getAttribute('data-account-id');
            console.log(`顺序项账户ID: ${accountId}`);
            return accountId;
        });
        
        // 如果没有配置顺序，但有选中的账户，使用选中账户的顺序
        if (sequence.length === 0) {
            const selectedAccounts = Array.from(document.querySelectorAll('.account-selector-checkbox:checked')).map(cb => cb.value);
            console.log('没有手动配置顺序，使用选中账户的默认顺序:', selectedAccounts);
            return { sequence: selectedAccounts };
        }
        
        console.log('顺序轮询配置收集完成:', { sequence });
        return { sequence };
    }
    
    collectWeightConfig() {
        console.log('开始收集权重轮询配置...');
        const weightList = document.getElementById('pollingGroupWeightAccountsList');
        if (!weightList) {
            console.error('找不到pollingGroupWeightAccountsList元素');
            throw new Error('权重配置区域未找到');
        }
        
        const weightItems = weightList.querySelectorAll('.weight-account-item');
        console.log(`找到${weightItems.length}个权重项`);
        
        const accounts = Array.from(weightItems).map(item => {
            const accountId = item.getAttribute('data-account-id');
            const weightInput = item.querySelector('.weight-input');
            const weight = parseInt(weightInput.value) || 1;
            console.log(`权重项 - 账户ID: ${accountId}, 权重: ${weight}`);
            return { accountId, weight };
        });
        
        // 如果没有配置权重，但有选中的账户，给所有账户默认权重1
        if (accounts.length === 0) {
            const selectedAccounts = Array.from(document.querySelectorAll('.account-selector-checkbox:checked')).map(cb => cb.value);
            const defaultAccounts = selectedAccounts.map(accountId => ({ accountId, weight: 1 }));
            console.log('没有手动配置权重，使用选中账户的默认权重:', defaultAccounts);
            return { accounts: defaultAccounts };
        }
        
        console.log('权重轮询配置收集完成:', { accounts });
        return { accounts };
    }
    
    collectPriorityConfig() {
        console.log('开始收集优先级轮询配置...');
        const priorityList = document.getElementById('pollingGroupPriorityAccountsList');
        if (!priorityList) {
            console.error('找不到pollingGroupPriorityAccountsList元素');
            throw new Error('优先级配置区域未找到');
        }
        
        const priorityItems = priorityList.querySelectorAll('.priority-account-item');
        console.log(`找到${priorityItems.length}个优先级项`);
        
        const accounts = Array.from(priorityItems).map(item => {
            const accountId = item.getAttribute('data-account-id');
            const priorityInput = item.querySelector('.priority-input');
            const priority = parseInt(priorityInput.value) || 1;
            console.log(`优先级项 - 账户ID: ${accountId}, 优先级: ${priority}`);
            return { accountId, priority };
        });
        
        // 如果没有配置优先级，但有选中的账户，给所有账户默认优先级
        if (accounts.length === 0) {
            const selectedAccounts = Array.from(document.querySelectorAll('.account-selector-checkbox:checked')).map(cb => cb.value);
            const defaultAccounts = selectedAccounts.map((accountId, index) => ({ accountId, priority: index + 1 }));
            console.log('没有手动配置优先级，使用选中账户的默认优先级:', defaultAccounts);
            return { accounts: defaultAccounts };
        }
        
        // 按优先级排序
        accounts.sort((a, b) => a.priority - b.priority);
        console.log('优先级轮询配置收集完成:', { accounts });
        return { accounts };
    }
    
    collectAmountConfig() {
        console.log('开始收集金额指定轮询配置...');
        const amountList = document.getElementById('amountRangesList');
        if (!amountList) {
            console.error('找不到amountRangesList元素');
            throw new Error('金额配置区域未找到');
        }
        
        const rangeItems = amountList.querySelectorAll('.amount-range-item');
        console.log('找到金额区间项数量:', rangeItems.length);
        
        const ranges = Array.from(rangeItems).map((item, index) => {
            const inputs = item.querySelectorAll('.amount-input');
            const select = item.querySelector('.form-select');
            
            console.log(`区间${index + 1}:`, {
                minValue: inputs[0]?.value,
                maxValue: inputs[1]?.value,
                selectedAccount: select?.value
            });
            
            return {
                minAmount: parseFloat(inputs[0]?.value) || 0,
                maxAmount: inputs[1]?.value ? parseFloat(inputs[1].value) : null,
                accountId: select?.value
            };
        });
        
        // 金额指定模式必须手动配置区间，不允许默认配置
        if (ranges.length === 0) {
            console.log('金额指定模式下没有配置任何金额区间');
            throw new Error('金额指定模式需要至少添加一个金额区间，请点击"添加金额区间"按钮');
        }
        
        console.log('收集到的金额区间配置:', ranges);
        return { ranges };
    }
    
    /**
     * 验证轮询配置
     */
    validatePollingConfig(mode, config) {
        switch (mode) {
            case 'weight':
                if (!config.accounts || config.accounts.length === 0) {
                    return { isValid: false, message: '权重模式下请至少配置一个账户的权重' };
                }
                const totalWeight = config.accounts.reduce((sum, acc) => sum + acc.weight, 0);
                if (totalWeight === 0) {
                    return { isValid: false, message: '权重模式下至少需要设置一个账户的权重大于0' };
                }
                break;
                
            case 'sequence':
                if (!config.sequence || config.sequence.length === 0) {
                    return { isValid: false, message: '顺序模式下请设置账户的轮询顺序' };
                }
                break;
                
            case 'priority':
                if (!config.accounts || config.accounts.length === 0) {
                    return { isValid: false, message: '优先级模式下请至少配置一个账户的优先级' };
                }
                break;
                
            case 'amount':
                if (!config.ranges || config.ranges.length === 0) {
                    return { isValid: false, message: '金额指定模式下请至少配置一个金额区间' };
                }
                
                // 验证金额区间是否合理
                for (let i = 0; i < config.ranges.length; i++) {
                    const range = config.ranges[i];
                    
                    // 检查单个区间的逻辑性
                    if (range.maxAmount && range.minAmount >= range.maxAmount) {
                        return { isValid: false, message: `第${i + 1}个金额区间配置错误：最小金额不能大于等于最大金额` };
                    }
                    
                    // 检查必填字段
                    if (!range.accountId) {
                        return { isValid: false, message: `第${i + 1}个金额区间未选择账户` };
                    }
                }
                
                // 检查金额区间重叠
                const overlapValidation = this.validateAmountRangeOverlaps(config.ranges);
                if (!overlapValidation.isValid) {
                    return overlapValidation;
                }
                break;
        }
        
        return { isValid: true };
    }
    
    /**
     * 验证金额区间重叠
     */
    validateAmountRangeOverlaps(ranges) {
        // 按最小金额排序
        const sortedRanges = ranges.slice().sort((a, b) => a.minAmount - b.minAmount);
        
        for (let i = 0; i < sortedRanges.length - 1; i++) {
            const currentRange = sortedRanges[i];
            const nextRange = sortedRanges[i + 1];
            
            // 当前区间的最大值（如果为null表示无限制）
            const currentMax = currentRange.maxAmount;
            const nextMin = nextRange.minAmount;
            
            // 情况1：当前区间无上限，且还有下一个区间
            if (currentMax === null || currentMax === undefined) {
                return { 
                    isValid: false, 
                    message: `金额区间重叠：第${i + 1}个区间设置为无上限，不能再添加更高金额的区间` 
                };
            }
            
            // 情况2：当前区间的最大值 >= 下一个区间的最小值
            if (currentMax >= nextMin) {
                const currentAccount = this.receivingAccounts.find(acc => acc.id === currentRange.accountId);
                const nextAccount = this.receivingAccounts.find(acc => acc.id === nextRange.accountId);
                
                // 如果是同一个账户，给出建议合并
                if (currentRange.accountId === nextRange.accountId) {
                    return { 
                        isValid: false, 
                        message: `金额区间重叠：${currentAccount?.accountName || '账户'}的两个区间可以合并为 ${currentRange.minAmount}-${nextRange.maxAmount || '无限制'}` 
                    };
                } else {
                    return { 
                        isValid: false, 
                        message: `金额区间重叠：${currentAccount?.accountName || '账户1'}(${currentRange.minAmount}-${currentMax}) 与 ${nextAccount?.accountName || '账户2'}(${nextMin}-${nextRange.maxAmount || '无限制'}) 存在重叠` 
                    };
                }
            }
        }
        
        return { isValid: true };
    }
    
    /**
     * 智能处理金额区间重叠
     */
    handleAmountRangeOverlap(ranges) {
        // 自动合并相同账户的连续区间
        const mergedRanges = [];
        const sortedRanges = ranges.slice().sort((a, b) => a.minAmount - b.minAmount);
        
        for (const range of sortedRanges) {
            const lastMerged = mergedRanges[mergedRanges.length - 1];
            
            // 如果是相同账户且区间连续或重叠，则合并
            if (lastMerged && 
                lastMerged.accountId === range.accountId && 
                (lastMerged.maxAmount === null || lastMerged.maxAmount >= range.minAmount)) {
                
                lastMerged.maxAmount = range.maxAmount || null;
            } else {
                mergedRanges.push({...range});
            }
        }
        
        return mergedRanges;
    }
    
    /**
     * 生成轮询配置
     */
    generatePollingConfig(mode, configData) {
        console.log(`生成轮询配置，模式: ${mode}，数据:`, configData);
        
        switch (mode) {
            case 'weight':
                // 权重模式：configData 是 {accounts: [{accountId, weight}, ...]}
                const accountsWithWeights = configData.accounts || configData;
                if (!Array.isArray(accountsWithWeights)) {
                    console.error('权重模式配置数据格式错误:', configData);
                    return { mode: 'weight', accounts: [] };
                }
                const totalWeight = accountsWithWeights.reduce((sum, acc) => sum + acc.weight, 0);
                return {
                    mode: 'weight',
                    totalWeight: totalWeight,
                    accounts: accountsWithWeights.map(acc => ({
                        ...acc,
                        probability: (acc.weight / totalWeight * 100).toFixed(2) + '%'
                    }))
                };
            case 'amount':
                // 金额模式：configData 是 {ranges: [{minAmount, maxAmount, accountId}, ...]}
                const ranges = configData.ranges || configData;
                return {
                    mode: 'amount',
                    ranges: ranges
                };
            case 'sequence':
                // 顺序模式：configData 是 {sequence: [accountId1, accountId2, ...]}
                const sequence = configData.sequence || configData;
                return {
                    mode: 'sequence',
                    sequence: sequence,
                    currentIndex: 0
                };
            case 'priority':
                // 优先级模式：configData 是 {accounts: [{accountId, priority}, ...]}
                const accountsWithPriority = configData.accounts || configData;
                return {
                    mode: 'priority',
                    accounts: accountsWithPriority
                };
            default:
                return { mode: mode };
        }
    }

    configurePollingMode(mode) {
        this.showToast(`配置${this.getPollingModeText(mode)}模式`, 'info');
    }

    /**
     * 查看轮询规则详情
     */
    viewPollingRule(mode) {
        console.log(`查看${this.getPollingModeText(mode)}规则`);
        
        let ruleDetails = '';
        switch (mode) {
            case 'weight':
                ruleDetails = `
                    权重轮询规则详情：
                    
                    配置账户：
                    • 收款账户1 - 权重: 50 (50%)
                    • 收款账户2 - 权重: 30 (30%) 
                    • 微信收款账户 - 权重: 20 (20%)
                    
                    规则说明：
                    - 系统根据设置的权重随机选择收款账户
                    - 权重越高的账户被选中概率越大
                    - 权重总和为100，按比例分配流量
                    
                    适用场景：
                    - 需要按比例控制各账户收款量时
                    - 有主次账户区分，主账户承担更多收款
                `;
                break;
            case 'sequence':
                ruleDetails = `
                    顺序轮询规则详情：
                    
                    轮询顺序：
                    1. 收款账户1 (6228480098765432100)
                    2. 收款账户2 (zhangsan@alipay.com)  
                    3. 微信收款账户 (wechat_merchant_001)
                    
                    规则说明：
                    - 按照预设顺序依次使用账户收款
                    - 每笔订单轮流分配到下一个账户
                    - 到达末尾后重新从第一个账户开始
                    
                    适用场景：
                    - 需要平均分配收款流量时
                    - 确保所有账户使用频率相等
                `;
                break;
            default:
                ruleDetails = `${this.getPollingModeText(mode)}规则详情暂不可用`;
        }
        
        alert(ruleDetails);
    }

    /**
     * 编辑轮询规则
     */
    editPollingRule(mode) {
        console.log(`编辑${this.getPollingModeText(mode)}规则`);
        
        switch (mode) {
            case 'weight':
                this.editWeightPollingRule();
                break;
            case 'sequence':
                this.editSequencePollingRule();
                break;
            default:
                this.showToast(`${this.getPollingModeText(mode)}规则编辑功能开发中`, 'info');
        }
    }

    /**
     * 配置轮询规则
     */
    configurePollingRule(mode) {
        console.log(`配置${this.getPollingModeText(mode)}规则`);
        
        switch (mode) {
            case 'amount':
                this.configureAmountPollingRule();
                break;
            case 'priority':
                this.configurePriorityPollingRule();
                break;
            default:
                this.showToast(`${this.getPollingModeText(mode)}规则配置功能开发中`, 'info');
        }
    }

    /**
     * 编辑权重轮询规则
     */
    editWeightPollingRule() {
        const currentConfig = {
            accounts: [
                { id: 'REC001', name: '收款账户1', weight: 50 },
                { id: 'REC002', name: '收款账户2', weight: 30 },
                { id: 'REC003', name: '微信收款账户', weight: 20 }
            ]
        };
        
        let configHtml = '编辑权重轮询配置:\n\n';
        currentConfig.accounts.forEach((acc, index) => {
            configHtml += `${index + 1}. ${acc.name}: 权重 ${acc.weight}\n`;
        });
        configHtml += '\n是否要修改权重配置？';
        
        if (confirm(configHtml)) {
            this.showToast('权重配置修改功能开发中', 'info');
        }
    }

    /**
     * 编辑顺序轮询规则  
     */
    editSequencePollingRule() {
        const currentSequence = ['收款账户1', '收款账户2', '微信收款账户'];
        
        let sequenceText = '当前轮询顺序:\n\n';
        currentSequence.forEach((name, index) => {
            sequenceText += `${index + 1}. ${name}\n`;
        });
        sequenceText += '\n是否要修改轮询顺序？';
        
        if (confirm(sequenceText)) {
            this.showToast('顺序配置修改功能开发中', 'info');
        }
    }

    /**
     * 配置金额指定规则
     */
    configureAmountPollingRule() {
        const configText = `配置金额指定规则:
        
设置不同金额范围使用不同收款账户：

建议配置：
• 小额 (≤1000元): 使用支付宝/微信账户
• 中额 (1000-10000元): 使用银行对私账户  
• 大额 (>10000元): 使用银行对公账户

是否开始配置金额区间？`;
        
        if (confirm(configText)) {
            this.showToast('金额指定规则配置功能开发中', 'info');
        }
    }


    /**
     * 配置优先级规则
     */
    configurePriorityPollingRule() {
        const configText = `配置优先级轮询规则:
        
按优先级顺序使用收款账户：

建议配置：
• 优先级1 (高): 主要银行账户
• 优先级2 (中): 备用银行账户
• 优先级3 (低): 第三方支付账户

规则：优先使用高优先级账户，超限时使用低优先级账户

是否开始配置优先级规则？`;
        
        if (confirm(configText)) {
            this.showToast('优先级规则配置功能开发中', 'info');
        }
    }

    /**
     * 获取轮询组使用统计
     */
    getGroupUsageStats(groupId) {
        // 模拟今日使用次数
        const usageStats = {
            'PG001': 156,
            'PG002': 89,
            'PG003': 234
        };
        return usageStats[groupId] || 0;
    }

    /**
     * 查看轮询组详情
     */
    viewPollingGroupDetails(groupId) {
        const group = this.pollingGroups.find(g => g.id === groupId);
        if (!group) {
            this.showToast('轮询组不存在', 'error');
            return;
        }

        let detailsText = `轮询组详情 - ${group.name}\n\n`;
        detailsText += `轮询模式: ${this.getPollingModeText(group.pollingMode)}\n`;
        detailsText += `状态: ${this.getStatusText(group.status)}\n`;
        detailsText += `关联账户数: ${group.accounts.length}个\n`;
        detailsText += `创建时间: ${group.createdAt}\n\n`;

        detailsText += `关联账户列表:\n`;
        group.accounts.forEach((accountId, index) => {
            const account = this.receivingAccounts.find(a => a.id === accountId);
            if (account) {
                detailsText += `${index + 1}. ${account.accountName} (${account.accountNumber})\n`;
            }
        });

        if (group.pollingMode === 'weight' && group.config) {
            detailsText += `\n权重配置:\n`;
            group.config.accounts.forEach(acc => {
                const account = this.receivingAccounts.find(a => a.id === acc.accountId);
                detailsText += `• ${account?.accountName || acc.accountId}: 权重${acc.weight} (${acc.probability})\n`;
            });
        }

        if (group.remark) {
            detailsText += `\n备注: ${group.remark}`;
        }

        alert(detailsText);
    }

    /**
     * 增强版编辑轮询组
     */
    editPollingGroupEnhanced(groupId) {
        const group = this.pollingGroups.find(g => g.id === groupId);
        if (!group) {
            this.showToast('轮询组不存在', 'error');
            return;
        }

        console.log(`编辑轮询组: ${group.name} (${this.getPollingModeText(group.pollingMode)})`);
        
        // 根据轮询模式提供不同的编辑选项
        let editOptions = `编辑轮询组 - ${group.name}\n\n`;
        editOptions += `当前配置:\n`;
        editOptions += `• 轮询模式: ${this.getPollingModeText(group.pollingMode)}\n`;
        editOptions += `• 关联账户: ${group.accounts.length}个\n`;
        editOptions += `• 状态: ${this.getStatusText(group.status)}\n\n`;
        
        editOptions += `可编辑的配置项:\n`;
        editOptions += `1. 修改轮询组名称\n`;
        editOptions += `2. 调整关联账户\n`;
        
        if (group.pollingMode === 'weight') {
            editOptions += `3. 重新分配权重\n`;
        } else if (group.pollingMode === 'sequence') {
            editOptions += `3. 调整轮询顺序\n`;
        }
        
        editOptions += `4. 修改备注信息\n`;
        editOptions += `5. 切换启用状态\n\n`;
        editOptions += `是否要编辑此轮询组？`;

        if (confirm(editOptions)) {
            this.openPollingGroupEditModal(groupId);
        }
    }

    /**
     * 打开轮询组编辑模态框
     */
    openPollingGroupEditModal(groupId) {
        // 这里可以复用创建模态框，但填充现有数据
        const group = this.pollingGroups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('pollingGroupModalOverlay');
        const title = document.querySelector('#pollingGroupModal .account-modal-title');
        const form = document.getElementById('pollingGroupForm');
        
        if (title) {
            title.innerHTML = `<span class="account-modal-icon">⚙️</span>编辑轮询组 - ${group.name}`;
        }
        
        // 填充表单数据
        document.getElementById('pollingGroupName').value = group.name;
        document.getElementById('pollingMode').value = group.pollingMode;
        document.getElementById('pollingGroupRemark').value = group.remark || '';
        
        // 设置当前编辑的组ID
        form.dataset.editingGroupId = groupId;
        
        // 更改提交按钮文本为编辑模式
        const saveButton = document.getElementById('savePollingGroupBtn');
        if (saveButton) {
            saveButton.innerHTML = `
                <span class="account-loading-spinner" style="display: none;"></span>
                保存修改
            `;
        }
        
        // 使用正确的CSS类名显示模态框
        modal.classList.add('account-modal-overlay--active');
        this.populateAccountSelector();
        
        // 选中已关联的账户
        group.accounts.forEach(accountId => {
            const checkbox = document.querySelector(`input[value="${accountId}"]`);
            if (checkbox) {
                checkbox.checked = true;
                
                // 触发账户选择事件，确保配置区域正确显示
                checkbox.dispatchEvent(new Event('change'));
                
                // 如果是权重模式，设置权重值
                if (group.pollingMode === 'weight' && group.accountsConfig) {
                    const accountConfig = group.accountsConfig.find(acc => acc.accountId === accountId);
                    if (accountConfig) {
                        setTimeout(() => {
                            const weightInput = document.querySelector(`input[data-account-id="${accountId}"]`);
                            if (weightInput) {
                                weightInput.value = accountConfig.weight;
                            }
                        }, 100);
                    }
                }
                
                // 如果是优先级模式，设置优先级值
                if (group.pollingMode === 'priority' && group.accountsConfig) {
                    const accountConfig = group.accountsConfig.find(acc => acc.accountId === accountId);
                    if (accountConfig) {
                        setTimeout(() => {
                            const priorityInput = document.querySelector(`.priority-input[data-account-id="${accountId}"]`);
                            if (priorityInput) {
                                priorityInput.value = accountConfig.priority;
                            }
                        }, 100);
                    }
                }
            }
        });
        
        // 触发轮询模式变更事件，确保配置区域正确显示
        setTimeout(() => {
            const pollingModeSelect = document.getElementById('pollingMode');
            if (pollingModeSelect) {
                pollingModeSelect.dispatchEvent(new Event('change'));
            }
        }, 200);
    }

    /**
     * 切换轮询组状态
     */
    togglePollingGroupStatus(groupId) {
        const group = this.pollingGroups.find(g => g.id === groupId);
        if (!group) return;

        const newStatus = group.status === 'active' ? 'inactive' : 'active';
        const actionText = newStatus === 'active' ? '启用' : '暂停';
        
        if (confirm(`确定要${actionText}轮询组 "${group.name}" 吗？`)) {
            group.status = newStatus;
            this.renderPollingGroups();
            this.showToast(`轮询组已${actionText}`, 'success');
        }
    }

    editPollingGroup(groupId) {
        // 保留原有简单编辑功能作为备用
        this.editPollingGroupEnhanced(groupId);
    }

    deletePollingGroup(groupId) {
        if (confirm('确定要删除这个轮询组吗？')) {
            this.pollingGroups = this.pollingGroups.filter(g => g.id !== groupId);
            this.renderPollingGroups();
            this.showToast('删除成功', 'success');
        }
    }

    /**
     * 权重轮询算法 - 根据权重选择收款账户
     */
    selectAccountByWeight(pollingGroup, amount = 0) {
        if (!pollingGroup || pollingGroup.pollingMode !== 'weight' || !pollingGroup.config) {
            return null;
        }

        const { accounts } = pollingGroup.config;
        if (!accounts || accounts.length === 0) {
            return null;
        }

        // 过滤可用账户（状态为活跃且未达到限额）
        const availableAccounts = accounts.filter(acc => {
            const account = this.receivingAccounts.find(a => a.id === acc.accountId);
            if (!account || account.status !== 'active') return false;
            
            // 检查单笔限额
            if (amount > 0 && account.singleLimit > 0 && amount > account.singleLimit) {
                return false;
            }
            
            // 检查日限额（这里简化处理，实际应该检查今日已用额度）
            // if (account.currentBalance + amount > account.dailyLimit) return false;
            
            return true;
        });

        if (availableAccounts.length === 0) {
            console.warn('没有可用的收款账户');
            return null;
        }

        // 权重轮盘算法
        const totalWeight = availableAccounts.reduce((sum, acc) => sum + acc.weight, 0);
        const random = Math.random() * totalWeight;
        
        let currentWeight = 0;
        for (const acc of availableAccounts) {
            currentWeight += acc.weight;
            if (random <= currentWeight) {
                const selectedAccount = this.receivingAccounts.find(a => a.id === acc.accountId);
                console.log(`权重轮询选中账户: ${selectedAccount?.accountName}, 权重: ${acc.weight}, 概率: ${acc.probability}`);
                return selectedAccount;
            }
        }

        // 兜底返回第一个可用账户
        const fallbackAccount = this.receivingAccounts.find(a => a.id === availableAccounts[0].accountId);
        console.log(`权重轮询兜底选择: ${fallbackAccount?.accountName}`);
        return fallbackAccount;
    }

    /**
     * 演示权重轮询算法
     */
    demonstrateWeightPolling(pollingGroupId, testAmount = 1000) {
        const group = this.pollingGroups.find(g => g.id === pollingGroupId);
        if (!group) {
            this.showToast('轮询组不存在', 'error');
            return;
        }

        console.log(`\n=== 权重轮询演示 (测试金额: ¥${testAmount}) ===`);
        
        // 模拟100次选择，统计分布
        const results = {};
        const testCount = 100;
        
        for (let i = 0; i < testCount; i++) {
            const selectedAccount = this.selectAccountByWeight(group, testAmount);
            if (selectedAccount) {
                results[selectedAccount.id] = (results[selectedAccount.id] || 0) + 1;
            }
        }

        console.log('100次模拟结果:');
        Object.entries(results).forEach(([accountId, count]) => {
            const account = this.receivingAccounts.find(a => a.id === accountId);
            const percentage = (count / testCount * 100).toFixed(1);
            console.log(`  ${account?.accountName}: ${count}次 (${percentage}%)`);
        });

        this.showToast(`权重轮询演示完成，请查看控制台输出`, 'info');
    }

    /**
     * 工具函数
     */
    getStatusText(status) {
        const statusMap = {
            'active': '活跃',
            'inactive': '停用',
            'pending': '待审',
            'suspended': '暂停'
        };
        return statusMap[status] || status;
    }

    getAccountTypeText(type) {
        const typeMap = {
            'corporate': '对公',
            'personal': '对私',
            'bank': '银行账户',
            'alipay': '支付宝',
            'wechat': '微信支付',
            'other': '其他支付',
            'digital': '数字钱包'
        };
        return typeMap[type] || type;
    }

    getPollingModeText(mode) {
        const modeMap = {
            'weight': '权重轮询',
            'amount': '金额指定',
            'sequence': '顺序轮询',
            'priority': '优先级轮询'
        };
        return modeMap[mode] || mode;
    }

    /**
     * 顺序轮询配置方法
     */
    addAccountToSequence(account) {
        console.log('添加账户到顺序配置:', account);
        const sequenceList = document.getElementById('sequenceOrderList');
        if (!sequenceList) {
            console.error('找不到顺序账户列表元素 #sequenceOrderList');
            throw new Error('顺序配置区域未找到，请确保已选择顺序轮询模式');
        }
        
        // 检查是否已存在
        if (sequenceList.querySelector(`[data-account-id="${account.id}"]`)) return;
        
        const orderIndex = sequenceList.children.length + 1;
        const sequenceItem = document.createElement('div');
        sequenceItem.className = 'sequence-account-item';
        sequenceItem.setAttribute('data-account-id', account.id);
        sequenceItem.draggable = true;
        
        sequenceItem.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="sequence-number">${orderIndex}</div>
            <div class="account-info">
                <div class="account-name">${account.accountName}</div>
                <div class="account-details">${account.accountNumber}</div>
            </div>
            <button type="button" class="remove-account-btn" onclick="accountsManager.removeAccountFromSequence('${account.id}')">
                🗑️
            </button>
        `;
        
        sequenceList.appendChild(sequenceItem);
        this.initSequenceDragAndDrop();
    }
    
    removeAccountFromSequence(accountId) {
        const sequenceList = document.getElementById('sequenceOrderList');
        const item = sequenceList?.querySelector(`[data-account-id="${accountId}"]`);
        if (item) {
            item.remove();
            this.updateSequenceNumbers();
        }
        
        // 取消勾选对应的账户
        const checkbox = document.getElementById(`acc_${accountId}`);
        if (checkbox) checkbox.checked = false;
    }
    
    updateSequenceNumbers() {
        const sequenceList = document.getElementById('sequenceOrderList');
        if (!sequenceList) return;
        
        Array.from(sequenceList.children).forEach((item, index) => {
            const numberEl = item.querySelector('.sequence-number');
            if (numberEl) numberEl.textContent = index + 1;
        });
    }
    
    initSequenceDragAndDrop() {
        // 简单的拖拽排序实现
        const sequenceList = document.getElementById('sequenceOrderList');
        if (!sequenceList) return;
        
        let draggedElement = null;
        
        sequenceList.addEventListener('dragstart', (e) => {
            draggedElement = e.target.closest('.sequence-account-item');
            if (draggedElement) {
                e.dataTransfer.effectAllowed = 'move';
                draggedElement.classList.add('dragging');
            }
        });
        
        sequenceList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        sequenceList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetElement = e.target.closest('.sequence-account-item');
            
            if (targetElement && draggedElement && targetElement !== draggedElement) {
                const parent = targetElement.parentNode;
                const draggedIndex = Array.from(parent.children).indexOf(draggedElement);
                const targetIndex = Array.from(parent.children).indexOf(targetElement);
                
                if (draggedIndex < targetIndex) {
                    parent.insertBefore(draggedElement, targetElement.nextSibling);
                } else {
                    parent.insertBefore(draggedElement, targetElement);
                }
                
                this.updateSequenceNumbers();
            }
        });
        
        sequenceList.addEventListener('dragend', () => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });
    }
    
    /**
     * 权重轮询配置方法
     */
    addAccountToWeight(account) {
        console.log('添加账户到权重配置:', account);
        const weightList = document.getElementById('pollingGroupWeightAccountsList');
        if (!weightList) {
            console.error('找不到权重账户列表元素 #pollingGroupWeightAccountsList');
            throw new Error('权重配置区域未找到，请确保已选择权重轮询模式');
        }
        
        // 检查是否已存在
        if (weightList.querySelector(`[data-account-id="${account.id}"]`)) {
            console.log('账户已存在于权重列表中');
            return;
        }
        
        const weightItem = document.createElement('div');
        weightItem.className = 'weight-account-item';
        weightItem.setAttribute('data-account-id', account.id);
        
        weightItem.innerHTML = `
            <div class="account-info">
                <div class="account-name">${account.accountName}</div>
                <div class="account-details">${account.accountNumber}</div>
            </div>
            <div class="weight-input-group">
                <input type="number" class="weight-input" value="1" min="1" max="100" 
                       onchange="accountsManager.updateWeightTotal()" data-account-id="${account.id}">
                <span class="weight-percentage" id="weight-percentage-${account.id}">0%</span>
            </div>
            <button type="button" class="remove-account-btn" onclick="accountsManager.removeAccountFromWeight('${account.id}')">
                🗑️
            </button>
        `;
        
        weightList.appendChild(weightItem);
        console.log('权重账户项已添加');
        this.updateWeightTotal();
    }
    
    removeAccountFromWeight(accountId) {
        const weightList = document.getElementById('pollingGroupWeightAccountsList');
        const item = weightList?.querySelector(`[data-account-id="${accountId}"]`);
        if (item) {
            item.remove();
            this.updateWeightTotal();
        }
        
        // 取消勾选对应的账户
        const checkbox = document.getElementById(`acc_${accountId}`);
        if (checkbox) checkbox.checked = false;
    }
    
    updateWeightTotal() {
        const weightInputs = document.querySelectorAll('#pollingGroupWeightAccountsList .weight-input');
        let totalWeight = 0;
        
        weightInputs.forEach(input => {
            const weight = parseInt(input.value) || 0;
            totalWeight += weight;
        });
        
        // 更新总权重显示
        const totalDisplay = document.getElementById('totalWeightDisplay');
        if (totalDisplay) totalDisplay.textContent = totalWeight;
        
        // 更新各账户百分比
        weightInputs.forEach(input => {
            const weight = parseInt(input.value) || 0;
            const percentage = totalWeight > 0 ? (weight / totalWeight * 100).toFixed(1) : 0;
            const accountId = input.getAttribute('data-account-id');
            const percentageEl = document.getElementById(`weight-percentage-${accountId}`);
            if (percentageEl) percentageEl.textContent = `${percentage}%`;
        });
    }
    
    /**
     * 优先级轮询配置方法
     */
    addAccountToPriority(account) {
        console.log('添加账户到优先级配置:', account);
        const priorityList = document.getElementById('pollingGroupPriorityAccountsList');
        if (!priorityList) {
            console.error('找不到优先级账户列表元素 #pollingGroupPriorityAccountsList');
            return;
        }
        
        // 检查是否已存在
        if (priorityList.querySelector(`[data-account-id="${account.id}"]`)) {
            console.log('账户已存在于优先级列表中');
            return;
        }
        
        const nextPriority = priorityList.children.length + 1;
        const priorityItem = document.createElement('div');
        priorityItem.className = 'priority-account-item';
        priorityItem.setAttribute('data-account-id', account.id);
        
        priorityItem.innerHTML = `
            <div class="priority-account-info">
                <div class="priority-account-name">${account.accountName}</div>
                <div class="priority-account-details">${account.accountNumber} | ${account.accountType === 'corporate' ? '对公' : '对私'} | ${account.institution || '银行'}</div>
            </div>
            <div class="priority-input-section">
                <span class="priority-label">优先级：</span>
                <input type="number" 
                       class="priority-input" 
                       value="${nextPriority}" 
                       min="1" 
                       max="99" 
                       data-account-id="${account.id}"
                       onchange="window.accountsManager.handlePriorityChange(this)"
                       placeholder="1">
                <button type="button" 
                        class="priority-remove-btn" 
                        onclick="window.accountsManager.removeAccountFromPriority('${account.id}')"
                        title="移除账户">
                    ×
                </button>
            </div>
        `;
        
        priorityList.appendChild(priorityItem);
        console.log('优先级账户项已添加，当前优先级:', nextPriority);
        this.updatePriorityOrder();
    }
    
    removeAccountFromPriority(accountId) {
        const priorityList = document.getElementById('pollingGroupPriorityAccountsList');
        const item = priorityList?.querySelector(`[data-account-id="${accountId}"]`);
        if (item) {
            item.remove();
            this.updatePriorityOrder();
        }
        
        // 取消勾选对应的账户
        const checkbox = document.getElementById(`acc_${accountId}`);
        if (checkbox) checkbox.checked = false;
    }
    
    updatePriorityOrder() {
        const priorityItems = document.querySelectorAll('#pollingGroupPriorityAccountsList .priority-account-item');
        console.log('更新优先级顺序，共有', priorityItems.length, '个账户');
        
        // 获取所有输入框的值并排序
        const priorityData = Array.from(priorityItems).map(item => {
            const input = item.querySelector('.priority-input');
            const accountId = item.dataset.accountId;
            const priority = parseInt(input.value) || 1;
            return { item, accountId, priority, input };
        });
        
        // 按优先级排序（数字小的优先级高）
        priorityData.sort((a, b) => a.priority - b.priority);
        
        // 重新排列DOM元素
        const priorityList = document.getElementById('pollingGroupPriorityAccountsList');
        priorityData.forEach(({ item }, index) => {
            priorityList.appendChild(item);
        });
        
        console.log('优先级顺序已更新');
    }
    
    /**
     * 处理优先级变更
     */
    handlePriorityChange(input) {
        const accountId = input.dataset.accountId;
        const newPriority = parseInt(input.value);
        
        console.log('优先级变更:', { accountId, newPriority });
        
        // 验证输入值
        if (isNaN(newPriority) || newPriority < 1) {
            input.value = 1;
            this.showToast('优先级必须是大于0的数字', 'warning');
            return;
        }
        
        if (newPriority > 99) {
            input.value = 99;
            this.showToast('优先级不能超过99', 'warning');
            return;
        }
        
        // 检查是否有重复的优先级
        const allInputs = document.querySelectorAll('#pollingGroupPriorityAccountsList .priority-input');
        const priorities = Array.from(allInputs).map(inp => parseInt(inp.value)).filter(p => !isNaN(p));
        const duplicates = priorities.filter((priority, index) => priorities.indexOf(priority) !== index);
        
        if (duplicates.length > 0) {
            console.log('检测到重复优先级，自动调整顺序');
        }
        
        // 更新排序
        this.updatePriorityOrder();
        
        // 显示提示
        this.showToast(`账户优先级已更新为 ${newPriority}`, 'success');
    }
    
    /**
     * 金额指定配置方法
     */
    addAmountRange() {
        console.log('点击添加金额区间按钮');
        const amountList = document.getElementById('amountRangesList');
        if (!amountList) {
            console.error('找不到amountRangesList元素');
            this.showToast('金额配置区域未找到，请确保已选择金额指定模式', 'error');
            return;
        }
        
        const selectedAccounts = Array.from(document.querySelectorAll('.account-selector-checkbox:checked'));
        if (selectedAccounts.length === 0) {
            this.showToast('请先选择账户', 'warning');
            return;
        }
        
        // 智能建议下一个金额区间
        let existingRanges = [];
        try {
            const config = this.collectAmountConfig();
            existingRanges = config.ranges || [];
        } catch (error) {
            console.log('收集现有区间失败，使用空数组:', error.message);
            existingRanges = [];
        }
        const suggestedRange = this.suggestNextAmountRange(existingRanges);
        
        const rangeIndex = amountList.children.length + 1;
        const rangeItem = document.createElement('div');
        rangeItem.className = 'amount-range-item';
        rangeItem.setAttribute('data-range-index', rangeIndex);
        
        rangeItem.innerHTML = `
            <div class="amount-input-group">
                <label>最小金额</label>
                <input type="number" class="form-input amount-input" min="0" step="0.01" 
                       value="${suggestedRange.minAmount}" placeholder="0.00"
                       onchange="accountsManager.validateAmountRangeInput(this)">
            </div>
            <div class="amount-input-group">
                <label>最大金额</label>
                <input type="number" class="form-input amount-input" min="0" step="0.01" 
                       value="${suggestedRange.maxAmount || ''}" placeholder="无限制"
                       onchange="accountsManager.validateAmountRangeInput(this)">
            </div>
            <div class="amount-input-group">
                <label>使用账户</label>
                <select class="form-select" onchange="accountsManager.validateAmountRangeInput(this)">
                    ${selectedAccounts.map(cb => {
                        const account = this.receivingAccounts.find(acc => acc.id === cb.value);
                        return `<option value="${account.id}">${account.accountName}</option>`;
                    }).join('')}
                </select>
            </div>
            <button type="button" class="remove-range-btn" onclick="accountsManager.removeAmountRange(${rangeIndex})">
                🗑️
            </button>
        `;
        
        amountList.appendChild(rangeItem);
        
        // 如果有建议，显示提示
        if (suggestedRange.suggestion) {
            this.showToast(suggestedRange.suggestion, 'info');
        }
    }
    
    removeAmountRange(rangeIndex) {
        const amountList = document.getElementById('amountRangesList');
        const item = amountList?.querySelector(`[data-range-index="${rangeIndex}"]`);
        if (item) {
            item.remove();
        }
    }
    
    /**
     * 智能建议下一个金额区间
     */
    suggestNextAmountRange(existingRanges) {
        if (existingRanges.length === 0) {
            return {
                minAmount: 0,
                maxAmount: 1000,
                suggestion: '建议从0-1000元开始配置小额交易区间'
            };
        }
        
        // 找到最大的金额上限
        let maxAmount = 0;
        for (const range of existingRanges) {
            if (range.maxAmount === null) {
                // 已经有无上限的区间
                return {
                    minAmount: 0,
                    maxAmount: null,
                    suggestion: '已存在无上限区间，建议检查是否需要添加更多区间'
                };
            }
            if (range.maxAmount > maxAmount) {
                maxAmount = range.maxAmount;
            }
        }
        
        // 建议下一个区间从最大值开始
        const nextMin = maxAmount + 0.01;
        let nextMax = null;
        let suggestion = null;
        
        if (maxAmount < 1000) {
            nextMax = 5000;
            suggestion = `建议配置中额区间 ${nextMin}-${nextMax}元`;
        } else if (maxAmount < 10000) {
            nextMax = 50000;
            suggestion = `建议配置大额区间 ${nextMin}-${nextMax}元`;
        } else {
            suggestion = `建议配置超大额区间 ${nextMin}元以上`;
        }
        
        return {
            minAmount: nextMin,
            maxAmount: nextMax,
            suggestion: suggestion
        };
    }
    
    /**
     * 实时验证金额区间输入
     */
    validateAmountRangeInput(element) {
        const rangeItem = element.closest('.amount-range-item');
        const inputs = rangeItem.querySelectorAll('.amount-input');
        const minInput = inputs[0];
        const maxInput = inputs[1];
        
        const minAmount = parseFloat(minInput.value) || 0;
        const maxAmount = maxInput.value ? parseFloat(maxInput.value) : null;
        
        // 清除之前的错误状态
        minInput.classList.remove('error');
        maxInput.classList.remove('error');
        
        // 验证单个区间逻辑
        if (maxAmount && minAmount >= maxAmount) {
            minInput.classList.add('error');
            maxInput.classList.add('error');
            this.showToast('最小金额不能大于等于最大金额', 'warning');
            return false;
        }
        
        // 验证与其他区间的重叠
        const allRanges = this.collectAmountConfig().ranges;
        const currentRangeIndex = Array.from(rangeItem.parentNode.children).indexOf(rangeItem);
        
        for (let i = 0; i < allRanges.length; i++) {
            if (i === currentRangeIndex) continue; // 跳过当前区间
            
            const otherRange = allRanges[i];
            if (this.isRangeOverlap(
                { minAmount, maxAmount }, 
                { minAmount: otherRange.minAmount, maxAmount: otherRange.maxAmount }
            )) {
                minInput.classList.add('error');
                maxInput.classList.add('error');
                this.showToast(`与其他金额区间存在重叠`, 'warning');
                return false;
            }
        }
        
        // 验证通过，添加成功样式
        minInput.classList.add('success');
        if (maxInput.value) {
            maxInput.classList.add('success');
        }
        
        return true;
    }
    
    /**
     * 检查两个金额区间是否重叠
     */
    isRangeOverlap(range1, range2) {
        const r1Min = range1.minAmount;
        const r1Max = range1.maxAmount;
        const r2Min = range2.minAmount;
        const r2Max = range2.maxAmount;
        
        // 如果任一区间无上限
        if (r1Max === null && r2Max === null) {
            return true; // 两个都无上限，肯定重叠
        }
        
        if (r1Max === null) {
            return r1Min <= (r2Max || Infinity);
        }
        
        if (r2Max === null) {
            return r2Min <= r1Max;
        }
        
        // 检查普通区间重叠
        return !(r1Max < r2Min || r2Max < r1Min);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toastNotification');
        const messageEl = toast.querySelector('.toast-message');
        const iconEl = toast.querySelector('.toast-icon');
        
        messageEl.textContent = message;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        iconEl.textContent = icons[type] || icons.info;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
        
        // 点击关闭按钮
        toast.querySelector('.toast-close').onclick = () => {
            toast.classList.remove('show');
        };
    }

    /**
     * 设置固定列样式 - 复用财务审核页面逻辑
     */
    setupFixedColumns() {
        // 确保固定列在页面加载时正确设置
        setTimeout(() => {
            const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
            const actionCells = document.querySelectorAll('.col-actions, .col-actions-cell');
            
            serialCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.left = '0';
                cell.style.zIndex = cell.classList.contains('col-serial') ? '101' : '99';
                cell.style.background = '#ffffff';
            });

            actionCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.right = '0';
                cell.style.zIndex = cell.classList.contains('col-actions') ? '101' : '99';
                cell.style.background = '#ffffff';
            });
        }, 100);

        // 绑定表格滚动事件 - 添加null检查
        const paymentTable = document.querySelector('#paymentAccountsTable');
        const receivingTable = document.querySelector('#receivingAccountsTable');
        
        const paymentTableWrapper = paymentTable ? paymentTable.closest('.unified-table-wrapper') : null;
        const receivingTableWrapper = receivingTable ? receivingTable.closest('.unified-table-wrapper') : null;
        
        if (paymentTableWrapper) {
            paymentTableWrapper.addEventListener('scroll', this.handleScroll.bind(this));
        }
        if (receivingTableWrapper) {
            receivingTableWrapper.addEventListener('scroll', this.handleScroll.bind(this));
        }
    }

    /**
     * 处理表格滚动事件 - 复用财务审核页面逻辑
     */
    handleScroll(event) {
        const scrollLeft = event.target.scrollLeft;
        
        // 更新固定列的阴影效果
        const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
        const actionCells = document.querySelectorAll('.col-actions, .col-actions-cell');
        
        serialCells.forEach(cell => {
            if (scrollLeft > 0) {
                cell.style.boxShadow = '4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });

        actionCells.forEach(cell => {
            const maxScroll = event.target.scrollWidth - event.target.clientWidth;
            if (scrollLeft < maxScroll) {
                cell.style.boxShadow = '-4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });
    }
}

/**
 * 全局函数：切换银行字段显示
 * 当选择银行作为账户机构时，显示银行相关字段
 */
function toggleBankFields(institutionValue) {
    const bankSection = document.getElementById('bankSection');
    const bankNameField = document.getElementById('receivingBankName');
    const branchInfoField = document.getElementById('receivingBranchInfo');
    
    if (!bankSection) return;
    
    if (institutionValue === 'bank') {
        // 显示银行信息部分
        bankSection.style.display = 'block';
        
        // 设置银行字段为必填
        if (bankNameField) {
            bankNameField.required = true;
            const bankLabel = bankSection.querySelector('label[for="receivingBankName"]');
            if (bankLabel && !bankLabel.classList.contains('required')) {
                bankLabel.classList.add('required');
            }
        }
        
        // 清除之前可能的错误状态
        if (bankNameField) bankNameField.classList.remove('error');
        const bankNameError = document.getElementById('bankNameError');
        if (bankNameError) bankNameError.textContent = '';
        
    } else {
        // 隐藏银行信息部分
        bankSection.style.display = 'none';
        
        // 移除银行字段的必填要求
        if (bankNameField) {
            bankNameField.required = false;
            bankNameField.value = ''; // 清空值
            bankNameField.classList.remove('error');
            
            const bankLabel = bankSection.querySelector('label[for="receivingBankName"]');
            if (bankLabel) {
                bankLabel.classList.remove('required');
            }
        }
        
        // 清空并重置分行信息
        if (branchInfoField) {
            branchInfoField.value = '';
        }
        
        // 清除错误信息
        const bankNameError = document.getElementById('bankNameError');
        if (bankNameError) bankNameError.textContent = '';
    }
}

// 全局实例
let accountsManager;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    accountsManager = new AccountsManager();
    window.accountsManager = accountsManager; // 供HTML内联事件使用
});
// 添加错误处理和默认激活收款账户tab
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 确保收款账户tab默认激活
        const receivingTab = document.querySelector('[data-tab="receivingAccounts"]');
        const receivingPane = document.getElementById('receivingAccounts');
        
        if (receivingTab && receivingPane) {
            // 移除其他tab的active类
            document.querySelectorAll('.nav-link').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active', 'show');
            });
            
            // 激活收款账户tab
            receivingTab.classList.add('active');
            receivingPane.classList.add('active', 'show');
            
            console.log('✅ 收款账户tab已默认激活');
        }
        
        // 添加表格元素检查
        const paymentAccountsTbody = document.querySelector('#paymentAccountsTable tbody');
        if (!paymentAccountsTbody) {
            console.warn('⚠️ 付款账户表格tbody元素不存在，跳过相关功能');
        }
        
    } catch (error) {
        console.error('❌ 账户管理页面初始化错误:', error);
    }
});