/**
 * 收款账户展示系统
 * 提供收款账户的展示、筛选、匹配和管理功能
 */
class ReceivingAccountsDisplay {
    constructor() {
        this.accounts = [];
        this.filteredAccounts = [];
        this.currentFilters = {};
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadAccounts();
        console.log('收款账户展示系统已初始化');
    }
    
    bindEvents() {
        // 模态框事件
        const modal = document.getElementById('accountDetailsModal');
        const closeBtn = document.getElementById('accountDetailsModalClose');
        const closeFooterBtn = document.getElementById('closeDetailsBtn');
        const copyBtn = document.getElementById('copyAccountInfoBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (closeFooterBtn) {
            closeFooterBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyCurrentAccountInfo());
        }
        
        // 点击模态框背景关闭
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        console.log('收款账户展示系统事件绑定完成');
    }
    
    /**
     * 加载收款账户数据
     */
    async loadAccounts() {
        try {
            // 模拟从后端API获取数据
            await this.delay(500);
            
            this.accounts = this.getMockAccounts();
            this.filteredAccounts = [...this.accounts];
            
            this.renderAccounts();
            this.updateStats();
            
            console.log(`已加载 ${this.accounts.length} 个收款账户`);
        } catch (error) {
            console.error('加载收款账户失败：', error);
            this.showError('加载收款账户失败，请刷新重试');
        }
    }
    
    /**
     * 获取模拟收款账户数据
     */
    getMockAccounts() {
        return [
            {
                id: 'R001',
                accountName: '北京科技有限公司',
                accountNumber: '6214830012345678',
                accountType: '银行卡',
                bankName: '中国工商银行',
                businessType: '对公',
                singleLimit: 50000,
                dailyLimit: 200000,
                priority: 1,
                status: '启用',
                createTime: '2024-01-15',
                lastUsed: '2024-08-15',
                todayUsed: 15000,
                monthlyUsed: 280000,
                remark: '主要收款账户，优先使用',
                availableHours: '24小时',
                processingTime: '实时到账'
            },
            {
                id: 'R002',
                accountName: '张三',
                accountNumber: 'zhangsan@alipay.com',
                accountType: '支付宝',
                bankName: '',
                businessType: '对私',
                singleLimit: 10000,
                dailyLimit: 50000,
                priority: 2,
                status: '启用',
                createTime: '2024-02-01',
                lastUsed: '2024-08-16',
                todayUsed: 8000,
                monthlyUsed: 120000,
                remark: '个人支付宝账户',
                availableHours: '9:00-22:00',
                processingTime: '1分钟内'
            },
            {
                id: 'R003',
                accountName: '李四',
                accountNumber: 'wx_lisi_123',
                accountType: '微信',
                bankName: '',
                businessType: '对私',
                singleLimit: 5000,
                dailyLimit: 20000,
                priority: 3,
                status: '启用',
                createTime: '2024-02-10',
                lastUsed: '2024-08-14',
                todayUsed: 2000,
                monthlyUsed: 45000,
                remark: '个人微信账户',
                availableHours: '8:00-20:00',
                processingTime: '2分钟内'
            },
            {
                id: 'R004',
                accountName: '上海贸易公司',
                accountNumber: '6228480012345678',
                accountType: '银行卡',
                bankName: '招商银行',
                businessType: '对公',
                singleLimit: 100000,
                dailyLimit: 500000,
                priority: 1,
                status: '启用',
                createTime: '2024-01-20',
                lastUsed: '2024-08-17',
                todayUsed: 50000,
                monthlyUsed: 850000,
                remark: '高额收款账户',
                availableHours: '24小时',
                processingTime: '实时到账'
            },
            {
                id: 'R005',
                accountName: '王五',
                accountNumber: 'wangwu@qq.com',
                accountType: '其它',
                bankName: '',
                businessType: '对私',
                singleLimit: 3000,
                dailyLimit: 15000,
                priority: 3,
                status: '维护',
                createTime: '2024-03-01',
                lastUsed: '2024-08-10',
                todayUsed: 0,
                monthlyUsed: 25000,
                remark: '备用账户，当前维护中',
                availableHours: '暂停服务',
                processingTime: '维护中'
            },
            {
                id: 'R006',
                accountName: '深圳投资公司',
                accountNumber: '6225880087654321',
                accountType: '银行卡',
                bankName: '平安银行',
                businessType: '对公',
                singleLimit: 200000,
                dailyLimit: 1000000,
                priority: 1,
                status: '禁用',
                createTime: '2024-01-10',
                lastUsed: '2024-07-30',
                todayUsed: 0,
                monthlyUsed: 0,
                remark: '临时禁用，等待审核',
                availableHours: '已禁用',
                processingTime: '已禁用'
            }
        ];
    }
    
    /**
     * 渲染收款账户列表
     */
    renderAccounts() {
        const grid = document.getElementById('accountsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (this.filteredAccounts.length === 0) {
            this.renderEmptyState(grid);
            return;
        }
        
        this.filteredAccounts.forEach(account => {
            const accountCard = this.createAccountCard(account);
            grid.appendChild(accountCard);
        });
    }
    
    /**
     * 渲染空状态
     */
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏦</div>
                <h3>暂无匹配的收款账户</h3>
                <p>请调整筛选条件或刷新页面重试</p>
            </div>
        `;
    }
    
    /**
     * 创建收款账户卡片
     */
    createAccountCard(account) {
        const card = document.createElement('div');
        card.className = `account-card-display priority-${this.getPriorityLevel(account.priority)}`;
        card.dataset.accountId = account.id;
        
        const maskedNumber = this.maskAccountNumber(account.accountNumber);
        const usagePercent = ((account.todayUsed / account.dailyLimit) * 100).toFixed(1);
        
        card.innerHTML = `
            <div class="priority-indicator priority-${account.priority}">${account.priority}</div>
            
            <div class="account-header">
                <div class="account-type-badge type-${account.accountType}">${account.accountType}</div>
                <div class="account-status status-${account.status}">${account.status}</div>
            </div>
            
            <div class="account-main-info">
                <div class="account-name-display">${this.escapeHtml(account.accountName)}</div>
                <div class="account-number-display">${maskedNumber}</div>
                ${account.bankName ? `<div style="color: var(--dashboard-text-secondary); font-size: 0.9rem;">${this.escapeHtml(account.bankName)}</div>` : ''}
            </div>
            
            <div class="account-details">
                <div class="detail-item">
                    <div class="detail-label">单笔限额</div>
                    <div class="detail-value">¥${account.singleLimit.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">单日限额</div>
                    <div class="detail-value">¥${account.dailyLimit.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">今日已用</div>
                    <div class="detail-value">¥${account.todayUsed.toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">使用率</div>
                    <div class="detail-value">${usagePercent}%</div>
                </div>
            </div>
            
            <div class="account-actions">
                <button class="action-btn copy" onclick="copyAccountInfo('${account.id}')">
                    📋 复制
                </button>
                <button class="action-btn details" onclick="showAccountDetails('${account.id}')">
                    📄 详情
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 获取优先级等级
     */
    getPriorityLevel(priority) {
        if (priority === 1) return 'high';
        if (priority === 2) return 'medium';
        return 'low';
    }
    
    /**
     * 显示账户详情
     */
    showAccountDetails(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (!account) return;
        
        this.currentAccount = account;
        
        const modal = document.getElementById('accountDetailsModal');
        const body = document.getElementById('accountDetailsBody');
        
        if (!modal || !body) return;
        
        body.innerHTML = this.createAccountDetailsHTML(account);
        
        // 显示模态框
        modal.classList.add('active');
        modal.removeAttribute('aria-hidden');
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 创建账户详情HTML
     */
    createAccountDetailsHTML(account) {
        const maskedNumber = this.maskAccountNumber(account.accountNumber);
        const usagePercent = ((account.todayUsed / account.dailyLimit) * 100).toFixed(1);
        const remainingLimit = account.dailyLimit - account.todayUsed;
        
        return `
            <div class="account-details-content">
                <!-- 基本信息 -->
                <div class="detail-section">
                    <h4 class="detail-section-title">基本信息</h4>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">账户名称：</span>
                            <span class="detail-value">${this.escapeHtml(account.accountName)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">账户号码：</span>
                            <span class="detail-value">${maskedNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">账号类型：</span>
                            <span class="detail-value">${account.accountType}</span>
                        </div>
                        ${account.bankName ? `
                        <div class="detail-row">
                            <span class="detail-label">银行名称：</span>
                            <span class="detail-value">${this.escapeHtml(account.bankName)}</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <span class="detail-label">业务类型：</span>
                            <span class="detail-value">${account.businessType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">账户状态：</span>
                            <span class="detail-value status-${account.status}">${account.status}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">优先级：</span>
                            <span class="detail-value">级别 ${account.priority}</span>
                        </div>
                    </div>
                </div>
                
                <!-- 限额信息 -->
                <div class="detail-section">
                    <h4 class="detail-section-title">限额信息</h4>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">单笔限额：</span>
                            <span class="detail-value">¥${account.singleLimit.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">单日限额：</span>
                            <span class="detail-value">¥${account.dailyLimit.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">今日已用：</span>
                            <span class="detail-value">¥${account.todayUsed.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">剩余额度：</span>
                            <span class="detail-value">¥${remainingLimit.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">使用率：</span>
                            <span class="detail-value">${usagePercent}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- 使用统计 -->
                <div class="detail-section">
                    <h4 class="detail-section-title">使用统计</h4>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">本月使用：</span>
                            <span class="detail-value">¥${account.monthlyUsed.toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">上次使用：</span>
                            <span class="detail-value">${account.lastUsed}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">创建时间：</span>
                            <span class="detail-value">${account.createTime}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">可用时间：</span>
                            <span class="detail-value">${account.availableHours}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">到账时间：</span>
                            <span class="detail-value">${account.processingTime}</span>
                        </div>
                    </div>
                </div>
                
                <!-- 备注信息 -->
                ${account.remark ? `
                <div class="detail-section">
                    <h4 class="detail-section-title">备注信息</h4>
                    <div class="remark-content">
                        ${this.escapeHtml(account.remark)}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <style>
                .account-details-content {
                    max-height: 60vh;
                    overflow-y: auto;
                }
                
                .detail-section {
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--dashboard-border-primary);
                }
                
                .detail-section:last-child {
                    border-bottom: none;
                }
                
                .detail-section-title {
                    color: var(--account-primary);
                    margin-bottom: 1rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .detail-grid {
                    display: grid;
                    gap: 0.75rem;
                }
                
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.5rem;
                    background: var(--account-bg-tertiary);
                    border-radius: 6px;
                }
                
                .detail-label {
                    color: var(--dashboard-text-secondary);
                    font-weight: 500;
                }
                
                .detail-value {
                    color: var(--dashboard-text-primary);
                    font-weight: 600;
                }
                
                .remark-content {
                    background: var(--account-bg-tertiary);
                    padding: 1rem;
                    border-radius: 8px;
                    color: var(--dashboard-text-primary);
                    line-height: 1.5;
                }
            </style>
        `;
    }
    
    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('accountDetailsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            document.body.style.overflow = '';
        }
    }
    
    /**
     * 复制账户信息
     */
    copyAccountInfo(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        if (!account) return;
        
        const accountInfo = `账户信息：
账户名称：${account.accountName}
账户号码：${account.accountNumber}
账号类型：${account.accountType}
${account.bankName ? `银行名称：${account.bankName}\n` : ''}业务类型：${account.businessType}
单笔限额：¥${account.singleLimit.toLocaleString()}
单日限额：¥${account.dailyLimit.toLocaleString()}
账户状态：${account.status}`;
        
        this.copyToClipboard(accountInfo);
        this.showToast('账户信息已复制到剪贴板');
    }
    
    /**
     * 复制当前查看的账户信息
     */
    copyCurrentAccountInfo() {
        if (this.currentAccount) {
            this.copyAccountInfo(this.currentAccount.id);
        }
    }
    
    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }
    
    /**
     * 应用筛选条件
     */
    applyFilters() {
        const filters = {
            accountType: document.getElementById('filterAccountType')?.value || '',
            businessType: document.getElementById('filterBusinessType')?.value || '',
            status: document.getElementById('filterStatus')?.value || '',
            minAmount: parseFloat(document.getElementById('filterMinAmount')?.value || 0)
        };
        
        this.currentFilters = filters;
        
        this.filteredAccounts = this.accounts.filter(account => {
            // 账号类型筛选
            if (filters.accountType && account.accountType !== filters.accountType) {
                return false;
            }
            
            // 业务类型筛选
            if (filters.businessType && account.businessType !== filters.businessType) {
                return false;
            }
            
            // 状态筛选
            if (filters.status && account.status !== filters.status) {
                return false;
            }
            
            // 最小限额筛选
            if (filters.minAmount > 0 && account.singleLimit < filters.minAmount) {
                return false;
            }
            
            return true;
        });
        
        this.renderAccounts();
        this.updateStats();
        
        console.log(`筛选后显示 ${this.filteredAccounts.length} 个账户`);
    }
    
    /**
     * 清除筛选条件
     */
    clearFilters() {
        document.getElementById('filterAccountType').value = '';
        document.getElementById('filterBusinessType').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterMinAmount').value = '';
        
        this.currentFilters = {};
        this.filteredAccounts = [...this.accounts];
        
        this.renderAccounts();
        this.updateStats();
        
        console.log('已清除所有筛选条件');
    }
    
    /**
     * 刷新账户数据
     */
    refreshAccounts() {
        console.log('正在刷新账户数据...');
        this.loadAccounts();
        this.showToast('账户数据已刷新');
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        const total = this.filteredAccounts.length;
        const active = this.filteredAccounts.filter(acc => acc.status === '启用').length;
        const totalDailyLimit = this.filteredAccounts.reduce((sum, acc) => sum + acc.dailyLimit, 0);
        const avgPriority = total > 0 ? (this.filteredAccounts.reduce((sum, acc) => sum + acc.priority, 0) / total).toFixed(1) : 0;
        
        this.updateStatElement('totalAccounts', total);
        this.updateStatElement('activeAccounts', active);
        this.updateStatElement('totalDailyLimit', `¥${totalDailyLimit.toLocaleString()}`);
        this.updateStatElement('avgPriority', avgPriority);
    }
    
    /**
     * 更新统计元素
     */
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * 掩码显示账号
     */
    maskAccountNumber(accountNumber) {
        if (accountNumber.includes('@')) {
            // 邮箱格式（支付宝）
            const parts = accountNumber.split('@');
            const username = parts[0];
            const domain = parts[1];
            const maskedUsername = username.slice(0, 2) + '***' + username.slice(-2);
            return maskedUsername + '@' + domain;
        } else if (accountNumber.length > 8) {
            // 银行卡号
            return accountNumber.slice(0, 4) + ' **** **** ' + accountNumber.slice(-4);
        } else {
            // 其他格式
            return accountNumber.slice(0, 2) + '***' + accountNumber.slice(-2);
        }
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 显示提示信息
     */
    showToast(message) {
        // 简化版本的提示，实际项目中可以使用更美观的Toast组件
        console.log('Toast:', message);
        alert(message);
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        console.error('Error:', message);
        alert('错误: ' + message);
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 全局函数，供HTML中的onclick事件调用
let displayManager;

function applyFilters() {
    if (displayManager) {
        displayManager.applyFilters();
    }
}

function clearFilters() {
    if (displayManager) {
        displayManager.clearFilters();
    }
}

function refreshAccounts() {
    if (displayManager) {
        displayManager.refreshAccounts();
    }
}

function showAccountDetails(accountId) {
    if (displayManager) {
        displayManager.showAccountDetails(accountId);
    }
}

function copyAccountInfo(accountId) {
    if (displayManager) {
        displayManager.copyAccountInfo(accountId);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    displayManager = new ReceivingAccountsDisplay();
    console.log('收款账户展示系统已加载并初始化完成');
});