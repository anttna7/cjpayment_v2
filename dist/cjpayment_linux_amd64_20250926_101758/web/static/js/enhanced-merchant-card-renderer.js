/**
 * 增强商户卡片渲染器
 * 支持多账户展示和响应式设计
 */

class EnhancedMerchantCardRenderer {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.getElementById('merchantGrid');
        this.isLoading = false;
        this.expandedCards = new Set();
    }
    
    /**
     * 渲染商户卡片
     */
    render() {
        if (!this.container) {
            console.error('商户卡片容器未找到');
            return;
        }
        
        this.showLoading();
        
        // 模拟数据加载延迟
        setTimeout(() => {
            this.renderCards();
            this.hideLoading();
            this.updatePagination();
        }, 500);
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        this.container.innerHTML = this.getLoadingSkeletons();
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
    }
    
    /**
     * 生成加载骨架屏
     */
    getLoadingSkeletons() {
        const skeletons = [];
        for (let i = 0; i < 6; i++) {
            skeletons.push(`
                <div class="merchant-card merchant-card--loading">
                    <div class="merchant-card__header">
                        <div class="merchant-card__info">
                            <div class="merchant-card__name loading-skeleton"></div>
                            <div class="merchant-card__id loading-skeleton"></div>
                        </div>
                        <div class="status-badge loading-skeleton" style="width: 60px; height: 24px;"></div>
                    </div>
                    <div class="merchant-card__content">
                        <div class="merchant-detail loading-skeleton" style="height: 20px; margin-bottom: 8px;"></div>
                        <div class="merchant-detail loading-skeleton" style="height: 20px; margin-bottom: 8px;"></div>
                        <div class="merchant-detail loading-skeleton" style="height: 20px;"></div>
                    </div>
                </div>
            `);
        }
        return skeletons.join('');
    }
    
    /**
     * 渲染卡片内容
     */
    renderCards() {
        const pageData = this.dataManager.getPagedMerchants();
        
        if (pageData.data.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        const cardsHtml = pageData.data.map(merchant => this.createCardHtml(merchant)).join('');
        this.container.innerHTML = cardsHtml;
        
        // 绑定卡片事件
        this.bindCardEvents();
    }
    
    /**
     * 创建单个卡片HTML
     */
    createCardHtml(merchant) {
        const isExpanded = this.expandedCards.has(merchant.id);
        
        return `
            <div class="merchant-card enhanced-card" data-merchant-id="${merchant.id}">
                <!-- 卡片头部 -->
                <div class="merchant-card__header">
                    <div class="merchant-card__info">
                        <h3 class="merchant-card__name" title="${merchant.name}">
                            ${merchant.name}
                        </h3>
                        <div class="merchant-card__meta">
                            <span class="merchant-card__id">ID: ${merchant.id}</span>
                            <span class="merchant-card__industry">${merchant.industry}</span>
                        </div>
                    </div>
                    <div class="status-badge status-badge--${merchant.status}">
                        <span class="status-dot"></span>
                        ${merchant.statusText}
                    </div>
                </div>
                
                <!-- 卡片主要内容 -->
                <div class="merchant-card__content">
                    <!-- 基础信息 -->
                    <div class="card-section">
                        <h4 class="section-title">
                            <span class="section-icon">📋</span>
                            基础信息
                        </h4>
                        <div class="merchant-details">
                            <div class="merchant-detail">
                                <span class="detail-label">
                                    <span class="detail-icon">👤</span>
                                    联系人
                                </span>
                                <span class="detail-value">${merchant.contact}</span>
                            </div>
                            <div class="merchant-detail">
                                <span class="detail-label">
                                    <span class="detail-icon">📱</span>
                                    联系电话
                                </span>
                                <span class="detail-value">${merchant.phone}</span>
                            </div>
                            <div class="merchant-detail">
                                <span class="detail-label">
                                    <span class="detail-icon">📧</span>
                                    邮箱
                                </span>
                                <span class="detail-value" title="${merchant.email}">${merchant.email}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 充值链接 -->
                    <div class="card-section">
                        <h4 class="section-title">
                            <span class="section-icon">🔗</span>
                            充值链接
                        </h4>
                        <div class="recharge-link-card">
                            <div class="recharge-link-text" title="${merchant.rechargeUrl}">
                                ${this.truncateUrl(merchant.rechargeUrl)}
                            </div>
                            <button class="copy-btn" onclick="copyRechargeUrl('${merchant.id}')" title="复制链接">
                                📋
                            </button>
                        </div>
                    </div>
                    
                    <!-- 广告账户 -->
                    <div class="card-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <span class="section-icon">📢</span>
                                广告账户
                                <span class="count-badge">${merchant.adAccounts?.length || 1}</span>
                            </h4>
                            ${(merchant.adAccounts?.length || 1) > 1 ? `
                                <button class="expand-btn ${isExpanded ? 'expanded' : ''}" 
                                        data-merchant-id="${merchant.id}" 
                                        data-section="ad">
                                    ${isExpanded ? '收起' : '展开'}
                                    <span class="expand-icon">▼</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="accounts-container ${isExpanded ? 'expanded' : ''}">
                            ${this.renderAdAccountsForCard(merchant.adAccounts || [{
                                id: merchant.adAccountId,
                                name: merchant.adAccountName,
                                status: 'active',
                                platform: 'Facebook'
                            }], isExpanded)}
                        </div>
                    </div>
                    
                    <!-- 付款账户 -->
                    <div class="card-section">
                        <div class="section-header">
                            <h4 class="section-title">
                                <span class="section-icon">💳</span>
                                付款账户
                                <span class="count-badge">${merchant.paymentAccounts?.length || 1}</span>
                            </h4>
                            ${(merchant.paymentAccounts?.length || 1) > 1 ? `
                                <button class="expand-btn ${isExpanded ? 'expanded' : ''}" 
                                        data-merchant-id="${merchant.id}" 
                                        data-section="payment">
                                    ${isExpanded ? '收起' : '展开'}
                                    <span class="expand-icon">▼</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="accounts-container ${isExpanded ? 'expanded' : ''}">
                            ${this.renderPaymentAccountsForCard(merchant.paymentAccounts || [{
                                name: '默认账户',
                                number: '6217001234567890',
                                bank: '招商银行',
                                institution: '招商银行深圳分行'
                            }], isExpanded)}
                        </div>
                    </div>
                    
                    <!-- 统计信息 -->
                    <div class="card-section">
                        <h4 class="section-title">
                            <span class="section-icon">📊</span>
                            充值统计
                        </h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-label">今日充值</div>
                                <div class="stat-value stat-value--primary">
                                    ¥${this.dataManager.formatAmount(merchant.dailyRecharge)}
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">本月充值</div>
                                <div class="stat-value stat-value--success">
                                    ¥${this.dataManager.formatAmount(merchant.monthlyRecharge)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 时间信息 -->
                    <div class="card-section card-section--compact">
                        <div class="time-info">
                            <div class="time-item">
                                <span class="time-label">
                                    <span class="detail-icon">🕒</span>
                                    创建时间
                                </span>
                                <span class="time-value">${this.dataManager.formatDate(merchant.createTime)}</span>
                            </div>
                            <div class="time-item">
                                <span class="time-label">
                                    <span class="detail-icon">👁️</span>
                                    最后登录
                                </span>
                                <span class="time-value">${this.dataManager.formatRelativeTime(merchant.lastLoginTime)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 备注 -->
                    ${merchant.remark ? `
                        <div class="card-section card-section--compact">
                            <div class="remark-content">
                                <span class="remark-label">
                                    <span class="detail-icon">📝</span>
                                    备注
                                </span>
                                <div class="remark-text">${merchant.remark}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- 卡片底部操作 -->
                <div class="merchant-card__actions">
                    <button class="btn btn--sm btn-outline" onclick="viewMerchantDetails('${merchant.id}')">
                        <span class="btn__icon">👁️</span>
                        查看详情
                    </button>
                    <button class="btn btn--sm btn-secondary" onclick="editMerchant('${merchant.id}')">
                        <span class="btn__icon">✏️</span>
                        编辑
                    </button>
                    <button class="btn btn--sm btn-primary" onclick="openPollingConfig('${merchant.id}')">
                        <span class="btn__icon">⚙️</span>
                        轮询配置
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 为卡片渲染广告账户
     */
    renderAdAccountsForCard(adAccounts, isExpanded) {
        const displayAccounts = isExpanded ? adAccounts : adAccounts.slice(0, 1);
        
        return displayAccounts.map(account => `
            <div class="account-card ad-account-card">
                <div class="account-header">
                    <div class="account-id">${account.id}</div>
                    <div class="account-status account-status--${account.status}">
                        ${account.status === 'active' ? '活跃' : '暂停'}
                    </div>
                </div>
                <div class="account-info">
                    <div class="account-name" title="${account.name}">${account.name}</div>
                    <div class="account-platform">${account.platform}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 为卡片渲染付款账户
     */
    renderPaymentAccountsForCard(paymentAccounts, isExpanded) {
        const displayAccounts = isExpanded ? paymentAccounts : paymentAccounts.slice(0, 1);
        
        return displayAccounts.map(account => `
            <div class="account-card payment-account-card">
                <div class="account-header">
                    <div class="account-name">${account.name}</div>
                    <div class="account-status account-status--${account.status || 'active'}">
                        ${account.isDefault ? '默认' : '备用'}
                    </div>
                </div>
                <div class="account-info">
                    <div class="account-number">
                        ${this.maskAccountNumber(account.number)}
                    </div>
                    <div class="account-bank">${account.institution}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 渲染空状态
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <div class="merchant-empty-state">
                <div class="empty-state-icon">🏪</div>
                <h3 class="empty-state-title">暂无商户数据</h3>
                <p class="empty-state-description">
                    ${this.dataManager.filters.search || this.dataManager.filters.status || this.dataManager.filters.type 
                        ? '没有找到符合筛选条件的商户，请调整筛选条件重试。' 
                        : '还没有添加任何商户，点击上方"添加商户"按钮开始添加。'}
                </p>
                <div class="empty-state-actions">
                    ${this.dataManager.filters.search || this.dataManager.filters.status || this.dataManager.filters.type 
                        ? `<button class="btn btn-outline" onclick="clearFilters()">清除筛选</button>`
                        : `<button class="btn btn-primary" onclick="addMerchant()">
                             <span class="btn__icon">➕</span>
                             添加商户
                           </button>`
                    }
                </div>
            </div>
        `;
    }
    
    /**
     * 绑定卡片事件
     */
    bindCardEvents() {
        // 绑定展开/收起按钮事件
        const expandBtns = this.container.querySelectorAll('.expand-btn');
        expandBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleExpandToggle(btn);
            });
        });
        
        // 绑定卡片悬停效果
        const cards = this.container.querySelectorAll('.merchant-card:not(.merchant-card--loading)');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.classList.add('merchant-card--hover');
            });
            
            card.addEventListener('mouseleave', () => {
                card.classList.remove('merchant-card--hover');
            });
        });
    }
    
    /**
     * 处理展开/收起切换
     */
    handleExpandToggle(btn) {
        const merchantId = btn.dataset.merchantId;
        const section = btn.dataset.section;
        
        if (this.expandedCards.has(merchantId)) {
            this.expandedCards.delete(merchantId);
        } else {
            this.expandedCards.add(merchantId);
        }
        
        // 重新渲染
        this.render();
    }
    
    /**
     * 更新分页信息
     */
    updatePagination() {
        const pageData = this.dataManager.getPagedMerchants();
        
        // 更新分页信息
        const pageStart = document.getElementById('pageStart');
        const pageEnd = document.getElementById('pageEnd');
        const totalRecords = document.getElementById('totalRecords');
        
        if (pageStart && pageEnd && totalRecords) {
            const start = pageData.total > 0 ? (pageData.currentPage - 1) * pageData.pageSize + 1 : 0;
            const end = Math.min(pageData.currentPage * pageData.pageSize, pageData.total);
            
            pageStart.textContent = start;
            pageEnd.textContent = end;
            totalRecords.textContent = pageData.total;
        }
    }
    
    /**
     * 工具方法：截断URL
     */
    truncateUrl(url) {
        if (!url) return '';
        if (url.length <= 30) return url;
        return url.substring(0, 15) + '...' + url.substring(url.length - 12);
    }
    
    /**
     * 工具方法：掩码账号
     */
    maskAccountNumber(accountNumber) {
        if (!accountNumber) return '';
        if (accountNumber.length <= 8) return accountNumber;
        return accountNumber.substring(0, 4) + '****' + accountNumber.substring(accountNumber.length - 4);
    }
    
    /**
     * 刷新视图
     */
    refresh() {
        this.render();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedMerchantCardRenderer;
}