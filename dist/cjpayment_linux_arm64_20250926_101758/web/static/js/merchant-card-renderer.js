/**
 * 商户卡片视图渲染器
 * 负责将商户数据渲染为卡片格式
 */

class MerchantCardRenderer {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.getElementById('merchantGrid');
        this.isLoading = false;
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
                    <div class="merchant-card__details">
                        <div class="merchant-detail">
                            <div class="merchant-detail__label">联系人</div>
                            <div class="merchant-detail__value loading-skeleton"></div>
                        </div>
                        <div class="merchant-detail">
                            <div class="merchant-detail__label">创建时间</div>
                            <div class="merchant-detail__value loading-skeleton"></div>
                        </div>
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
        return `
            <div class="merchant-card" data-merchant-id="${merchant.id}">
                <div class="merchant-card__header">
                    <div class="merchant-card__info">
                        <h3 class="merchant-card__name" title="${merchant.name}">
                            ${merchant.name}
                        </h3>
                        <div class="merchant-card__id">
                            ID: ${merchant.id}
                        </div>
                    </div>
                    <div class="status-badge status-badge--${merchant.status}">
                        <span class="status-indicator"></span>
                        ${merchant.statusText}
                    </div>
                </div>
                
                <div class="merchant-card__details">
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">👤</span>
                            联系人
                        </div>
                        <div class="merchant-detail__value">${merchant.contact}</div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">📱</span>
                            联系电话
                        </div>
                        <div class="merchant-detail__value">${merchant.phone}</div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">📧</span>
                            邮箱
                        </div>
                        <div class="merchant-detail__value" title="${merchant.email}">
                            ${merchant.email}
                        </div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">🏢</span>
                            类型
                        </div>
                        <div class="merchant-detail__value">${merchant.typeText}</div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">💰</span>
                            今日充值
                        </div>
                        <div class="merchant-detail__value merchant-detail__value--amount">
                            ¥${this.dataManager.formatAmount(merchant.dailyRecharge)}
                        </div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">📊</span>
                            本月充值
                        </div>
                        <div class="merchant-detail__value merchant-detail__value--amount">
                            ¥${this.dataManager.formatAmount(merchant.monthlyRecharge)}
                        </div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">🕒</span>
                            创建时间
                        </div>
                        <div class="merchant-detail__value">
                            ${this.dataManager.formatDate(merchant.createTime)}
                        </div>
                    </div>
                    
                    <div class="merchant-detail">
                        <div class="merchant-detail__label">
                            <span class="merchant-detail__icon">👁️</span>
                            最后登录
                        </div>
                        <div class="merchant-detail__value">
                            ${this.dataManager.formatRelativeTime(merchant.lastLoginTime)}
                        </div>
                    </div>
                </div>
                
                <div class="merchant-card__actions">
                    <button class="btn btn--sm btn-outline" onclick="viewMerchantDetails('${merchant.id}')">
                        <span class="btn__icon">👁️</span>
                        查看
                    </button>
                    <button class="btn btn--sm btn-secondary" onclick="editMerchant('${merchant.id}')">
                        <span class="btn__icon">✏️</span>
                        编辑
                    </button>
                    <div class="btn-group">
                        <button class="btn btn--sm btn-outline dropdown-toggle" data-merchant-id="${merchant.id}">
                            <span class="btn__icon">⚙️</span>
                            更多
                            <span class="btn__arrow">▼</span>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" class="dropdown-item" onclick="toggleMerchantStatus('${merchant.id}')">
                                <span class="dropdown-item__icon">${merchant.isActive ? '⏸️' : '▶️'}</span>
                                ${merchant.isActive ? '暂停' : '启用'}
                            </a>
                            <a href="#" class="dropdown-item" onclick="viewMerchantTransactions('${merchant.id}')">
                                <span class="dropdown-item__icon">💳</span>
                                交易记录
                            </a>
                            <a href="#" class="dropdown-item" onclick="resetMerchantPassword('${merchant.id}')">
                                <span class="dropdown-item__icon">🔑</span>
                                重置密码
                            </a>
                            <div class="dropdown-divider"></div>
                            <a href="#" class="dropdown-item dropdown-item--danger" onclick="deleteMerchant('${merchant.id}')">
                                <span class="dropdown-item__icon">🗑️</span>
                                删除
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
        // 绑定下拉菜单事件
        const dropdownToggles = this.container.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(toggle);
            });
        });
        
        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
        
        // 卡片悬停效果
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
     * 切换下拉菜单
     */
    toggleDropdown(toggle) {
        const menu = toggle.nextElementSibling;
        const isOpen = menu.classList.contains('dropdown-menu--show');
        
        // 关闭所有下拉菜单
        this.closeAllDropdowns();
        
        // 如果当前菜单未打开，则打开它
        if (!isOpen) {
            menu.classList.add('dropdown-menu--show');
            toggle.setAttribute('aria-expanded', 'true');
        }
    }
    
    /**
     * 关闭所有下拉菜单
     */
    closeAllDropdowns() {
        const openMenus = this.container.querySelectorAll('.dropdown-menu--show');
        openMenus.forEach(menu => {
            menu.classList.remove('dropdown-menu--show');
            const toggle = menu.previousElementSibling;
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
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
     * 刷新视图
     */
    refresh() {
        this.render();
    }
}

// 全局函数供HTML调用
window.viewMerchantDetails = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('查看商户详情:', merchant);
        alert(`查看商户详情：${merchant.name}\nID：${merchant.id}`);
        // 这里可以打开详情模态框或跳转到详情页面
    }
};

window.editMerchant = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('编辑商户:', merchant);
        alert(`编辑商户：${merchant.name}`);
        // 这里可以打开编辑模态框
    }
};

window.managePolling = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('管理轮询配置:', merchant);
        alert(`配置商户"${merchant.name}"的轮询规则\n账户ID：${merchant.accountId}`);
        // 这里可以打开轮询配置模态框
    }
};

window.toggleMerchantStatus = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        const newStatus = merchant.isActive ? 'inactive' : 'active';
        const statusText = merchant.isActive ? '非活跃' : '活跃';
        
        if (window.merchantDataManager.updateMerchant(merchantId, { 
            status: newStatus, 
            statusText: statusText,
            isActive: !merchant.isActive 
        })) {
            console.log('状态切换成功:', merchantId, newStatus);
            window.merchantCardRenderer.refresh();
        }
    }
};

window.deleteMerchant = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant && confirm(`确定要删除商户"${merchant.name}"吗？此操作不可恢复。`)) {
        if (window.merchantDataManager.deleteMerchant(merchantId)) {
            console.log('商户删除成功:', merchantId);
            window.merchantCardRenderer.refresh();
        }
    }
};

window.clearFilters = function() {
    window.merchantDataManager.setFilters({ search: '', status: '', type: '' });
    
    // 清除筛选表单
    const searchInput = document.getElementById('merchantSearch');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    
    // 刷新视图
    window.merchantCardRenderer.refresh();
};

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchantCardRenderer;
}