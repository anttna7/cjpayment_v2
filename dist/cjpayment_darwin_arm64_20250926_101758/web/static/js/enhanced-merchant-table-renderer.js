/**
 * 增强商户表格渲染器
 * 支持多账户展示、固定列滚动、响应式布局
 */

class EnhancedMerchantTableRenderer {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.getElementById('merchantTableBody');
        this.tableWrapper = null;
        this.isLoading = false;
        this.selectedMerchants = new Set();
        this.expandedRows = new Set();
        this.sortConfig = { column: null, direction: 'asc' };
        
        this.init();
    }
    
    /**
     * 初始化渲染器
     */
    init() {
        this.setupTableStructure();
        this.bindEvents();
        this.render();
    }
    
    /**
     * 设置表格结构
     */
    setupTableStructure() {
        const tableContainer = document.getElementById('merchantTableContainer');
        if (!tableContainer) {
            console.error('商户表格容器未找到');
            return;
        }
        
        // 使用现有的HTML表格结构，不需要重新生成
        this.container = document.getElementById('merchantTableBody');
        this.tableWrapper = document.querySelector('.table-responsive-wrapper');
        
        if (!this.container) {
            console.error('商户表格体未找到');
            return;
        }
        
        if (!this.tableWrapper) {
            console.error('表格响应式包装器未找到');
            return;
        }
        
        console.log('表格结构设置完成');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 排序事件
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                this.handleSort(header.dataset.column);
            });
        });
        
        // 全选事件
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAllChange(e.target.checked);
            });
        }
        
        // 滚动同步事件（用于固定列阴影效果）
        if (this.tableWrapper) {
            this.tableWrapper.addEventListener('scroll', () => {
                this.updateFixedColumnShadows();
            });
        }
    }
    
    /**
     * 渲染表格
     */
    render() {
        if (!this.container) {
            console.error('表格容器未找到');
            return;
        }
        
        this.showLoading();
        
        // 模拟数据加载延迟
        setTimeout(() => {
            this.renderRows();
            this.hideLoading();
            this.updatePagination();
            this.updateSelectAllCheckbox();
            this.updateFixedColumnShadows();
        }, 500);
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        this.container.innerHTML = `
            <tr class="table-loading-row">
                <td colspan="10" class="table-loading">
                    <div class="loading-spinner"></div>
                    <div>正在加载商户数据...</div>
                </td>
            </tr>
        `;
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.isLoading = false;
    }
    
    /**
     * 渲染表格行
     */
    renderRows() {
        const pageData = this.dataManager.getPagedMerchants();
        
        if (pageData.data.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        const startIndex = (pageData.currentPage - 1) * pageData.pageSize;
        const rowsHtml = pageData.data.map((merchant, index) => 
            this.createRowHtml(merchant, startIndex + index + 1)
        ).join('');
        
        this.container.innerHTML = rowsHtml;
        this.bindRowEvents();
    }
    
    /**
     * 创建表格行HTML
     * 新表格结构: 序号、账户ID、开户主体、代理商ID、代理商名称、返点政策、充值链接、账户状态、备注信息、操作
     */
    createRowHtml(merchant, rowIndex) {
        return `
            <tr class="merchant-row" data-merchant-id="${merchant.accountId}">
                <td class="col-fixed-left col-index">${rowIndex}</td>
                
                <td class="col-scrollable" title="${merchant.accountId}">
                    ${merchant.accountId}
                </td>
                
                <td class="col-scrollable" title="${merchant.accountEntity}">
                    ${merchant.accountEntity}
                </td>
                
                <td class="col-scrollable" title="${merchant.agentId || '-'}">
                    ${merchant.agentId || '-'}
                </td>
                
                <td class="col-scrollable" title="${merchant.agentName || '-'}">
                    ${merchant.agentName || '-'}
                </td>
                
                <td class="col-scrollable">
                    <div class="rebate-policy">
                        ${merchant.rebatePolicy}
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="recharge-link">
                        <span class="link-type ${merchant.linkType === 'merchant' ? 'link-type--merchant' : 'link-type--general'}">
                            ${merchant.linkType === 'merchant' ? '专用链接' : '通用链接'}
                        </span>
                    </div>
                </td>
                
                <td class="col-scrollable">
                    <div class="status-badge status-badge--${merchant.status}">
                        <span class="status-indicator"></span>
                        ${merchant.status === 'active' ? '启用' : '禁用'}
                    </div>
                </td>
                
                <td class="col-scrollable" title="${merchant.remarks || '-'}">
                    <div class="remarks-text">
                        ${this.truncateText(merchant.remarks || '-', 20)}
                    </div>
                </td>
                
                <td class="col-actions">
                    <div class="table-actions">
                        <button class="action-btn action-btn--view" 
                                onclick="viewMerchantDetails('${merchant.accountId}')"
                                title="查看商户详情">
                            详情
                        </button>
                        
                        <button class="action-btn action-btn--edit" 
                                onclick="editMerchant('${merchant.accountId}')"
                                title="编辑商户信息">
                            编辑
                        </button>
                        
                        <button class="action-btn action-btn--toggle" 
                                onclick="managePolling('${merchant.accountId}')"
                                title="管理轮询配置">
                            轮询
                        </button>
                    </div>
                </td>
            </tr>
        `;
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
     * 生成广告账户数据
     */
    generateAdAccounts(merchant) {
        // 基于现有数据生成多个广告账户
        const baseAdAccount = {
            id: merchant.adAccountId,
            name: merchant.adAccountName
        };
        
        const adAccounts = [baseAdAccount];
        
        // 随机生成额外的广告账户（1-3个）
        const additionalCount = Math.floor(Math.random() * 3);
        for (let i = 1; i <= additionalCount; i++) {
            adAccounts.push({
                id: `${merchant.adAccountId}-${i}`,
                name: `${merchant.adAccountName}-子账户${i}`
            });
        }
        
        return adAccounts;
    }
    
    /**
     * 生成付款账户数据
     */
    generatePaymentAccounts(merchant) {
        const banks = ['招商银行', '工商银行', '建设银行', '农业银行', '中国银行', '交通银行'];
        const accountTypes = ['对公账户', '收款账户', '备用账户'];
        
        const accounts = [];
        const accountCount = Math.floor(Math.random() * 3) + 1; // 1-3个账户
        
        for (let i = 0; i < accountCount; i++) {
            const bank = banks[Math.floor(Math.random() * banks.length)];
            const type = accountTypes[Math.floor(Math.random() * accountTypes.length)];
            const accountNumber = `6217${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
            
            accounts.push({
                name: `${bank}${type}`,
                number: accountNumber,
                bank: bank,
                institution: `${bank}${merchant.name.includes('北京') ? '北京' : '深圳'}分行`,
                type: type
            });
        }
        
        return accounts;
    }
    
    /**
     * 渲染广告账户单元格
     */
    renderAdAccountsCell(adAccounts, merchantId, isExpanded) {
        if (!adAccounts || adAccounts.length === 0) {
            return '<div class="no-accounts">暂无绑定</div>';
        }
        
        const accountsHtml = adAccounts.map(account => `
            <div class="account-item ad-account-item">
                <div class="account-primary">${account.id}</div>
                <div class="account-secondary">${account.name}</div>
            </div>
        `).join('');
        
        const displayAccounts = isExpanded ? accountsHtml : 
            adAccounts.slice(0, 2).map(account => `
                <div class="account-item ad-account-item">
                    <div class="account-primary">${account.id}</div>
                    <div class="account-secondary">${account.name}</div>
                </div>
            `).join('');
        
        return `
            <div class="multi-accounts-container">
                <div class="accounts-summary">
                    <span class="account-count-badge">
                        📢 <span class="count">${adAccounts.length}</span> 个广告账户
                    </span>
                </div>
                <div class="${isExpanded ? '' : 'accounts-collapsed'}">
                    ${displayAccounts}
                </div>
                ${adAccounts.length > 2 ? `
                    <div class="expand-toggle ${isExpanded ? 'expanded' : ''}" 
                         data-merchant-id="${merchantId}" 
                         data-type="ad">
                        ${isExpanded ? '收起' : `查看全部 (${adAccounts.length})`}
                        <span class="toggle-icon">▼</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 渲染付款账户单元格
     */
    renderPaymentAccountsCell(paymentAccounts, merchantId, isExpanded) {
        if (!paymentAccounts || paymentAccounts.length === 0) {
            return '<div class="no-accounts">暂无配置</div>';
        }
        
        const accountsHtml = paymentAccounts.map(account => `
            <div class="account-item payment-account-item">
                <div class="account-primary">${account.name}</div>
                <div class="account-secondary">
                    <span class="account-detail">账号: ${this.maskAccountNumber(account.number)}</span>
                    <span class="account-detail">开户行: ${account.institution}</span>
                </div>
            </div>
        `).join('');
        
        const displayAccounts = isExpanded ? accountsHtml : 
            paymentAccounts.slice(0, 1).map(account => `
                <div class="account-item payment-account-item">
                    <div class="account-primary">${account.name}</div>
                    <div class="account-secondary">
                        <span class="account-detail">账号: ${this.maskAccountNumber(account.number)}</span>
                        <span class="account-detail">开户行: ${account.institution}</span>
                    </div>
                </div>
            `).join('');
        
        return `
            <div class="multi-accounts-container">
                <div class="accounts-summary">
                    <span class="account-count-badge">
                        💳 <span class="count">${paymentAccounts.length}</span> 个付款账户
                    </span>
                </div>
                <div class="${isExpanded ? '' : 'accounts-collapsed'}">
                    ${displayAccounts}
                </div>
                ${paymentAccounts.length > 1 ? `
                    <div class="expand-toggle ${isExpanded ? 'expanded' : ''}" 
                         data-merchant-id="${merchantId}" 
                         data-type="payment">
                        ${isExpanded ? '收起' : `查看全部 (${paymentAccounts.length})`}
                        <span class="toggle-icon">▼</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 绑定行事件
     */
    bindRowEvents() {
        // 绑定复选框事件
        const checkboxes = this.container.querySelectorAll('.merchant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(e);
            });
        });
        
        // 绑定展开/折叠事件
        const expandToggles = this.container.querySelectorAll('.expand-toggle');
        expandToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                this.handleExpandToggle(e);
            });
        });
        
        // 绑定行点击事件
        const rows = this.container.querySelectorAll('.merchant-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox' || 
                    e.target.closest('button') || 
                    e.target.closest('.expand-toggle')) {
                    return;
                }
                this.handleRowClick(row);
            });
        });
    }
    
    /**
     * 处理展开/折叠
     */
    handleExpandToggle(e) {
        e.stopPropagation();
        const toggle = e.currentTarget;
        const merchantId = toggle.dataset.merchantId;
        const type = toggle.dataset.type;
        
        if (this.expandedRows.has(merchantId)) {
            this.expandedRows.delete(merchantId);
        } else {
            this.expandedRows.add(merchantId);
        }
        
        // 重新渲染该行
        this.render();
    }
    
    /**
     * 处理排序
     */
    handleSort(column) {
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.column = column;
            this.sortConfig.direction = 'asc';
        }
        
        // 更新排序图标
        this.updateSortIcons();
        
        // 重新渲染
        this.render();
    }
    
    /**
     * 更新排序图标
     */
    updateSortIcons() {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (header.dataset.column === this.sortConfig.column) {
                icon.textContent = this.sortConfig.direction === 'asc' ? '↑' : '↓';
            } else {
                icon.textContent = '↕️';
            }
        });
    }
    
    /**
     * 更新固定列阴影
     */
    updateFixedColumnShadows() {
        if (!this.tableWrapper) return;
        
        const scrollLeft = this.tableWrapper.scrollLeft;
        const scrollWidth = this.tableWrapper.scrollWidth;
        const clientWidth = this.tableWrapper.clientWidth;
        
        const leftCols = document.querySelectorAll('.col-fixed-left');
        const rightCols = document.querySelectorAll('.col-fixed-right');
        
        // 左侧固定列阴影
        leftCols.forEach(col => {
            if (scrollLeft > 0) {
                col.style.boxShadow = '2px 0 4px rgba(0, 0, 0, 0.1)';
            } else {
                col.style.boxShadow = 'none';
            }
        });
        
        // 右侧固定列阴影
        rightCols.forEach(col => {
            if (scrollLeft < scrollWidth - clientWidth) {
                col.style.boxShadow = '-2px 0 4px rgba(0, 0, 0, 0.1)';
            } else {
                col.style.boxShadow = 'none';
            }
        });
    }
    
    /**
     * 处理复选框变化
     */
    handleCheckboxChange(e) {
        const merchantId = e.target.dataset.merchantId;
        const isChecked = e.target.checked;
        
        if (isChecked) {
            this.selectedMerchants.add(merchantId);
        } else {
            this.selectedMerchants.delete(merchantId);
        }
        
        // 更新行样式
        const row = e.target.closest('.merchant-row');
        if (row) {
            row.classList.toggle('selected', isChecked);
        }
        
        // 更新全选复选框状态
        this.updateSelectAllCheckbox();
        
        // 触发选择变化事件
        this.onSelectionChange();
    }
    
    /**
     * 处理全选变化
     */
    handleSelectAllChange(checked) {
        const pageData = this.dataManager.getPagedMerchants();
        const currentPageIds = pageData.data.map(merchant => merchant.id);
        
        currentPageIds.forEach(id => {
            if (checked) {
                this.selectedMerchants.add(id);
            } else {
                this.selectedMerchants.delete(id);
            }
        });
        
        // 更新页面中的复选框状态
        const checkboxes = this.container.querySelectorAll('.merchant-checkbox');
        checkboxes.forEach(checkbox => {
            const merchantId = checkbox.dataset.merchantId;
            const shouldBeChecked = this.selectedMerchants.has(merchantId);
            checkbox.checked = shouldBeChecked;
            
            const row = checkbox.closest('.merchant-row');
            if (row) {
                row.classList.toggle('selected', shouldBeChecked);
            }
        });
        
        this.onSelectionChange();
    }
    
    /**
     * 更新全选复选框状态
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAll');
        if (!selectAllCheckbox) return;
        
        const pageData = this.dataManager.getPagedMerchants();
        const currentPageIds = pageData.data.map(merchant => merchant.id);
        const selectedInCurrentPage = currentPageIds.filter(id => this.selectedMerchants.has(id));
        
        if (selectedInCurrentPage.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedInCurrentPage.length === currentPageIds.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
    
    /**
     * 处理行点击
     */
    handleRowClick(row) {
        const checkbox = row.querySelector('.merchant-checkbox');
        if (checkbox) {
            checkbox.click();
        }
    }
    
    /**
     * 选择变化回调
     */
    onSelectionChange() {
        const selectedCount = this.selectedMerchants.size;
        
        // 触发自定义事件
        const event = new CustomEvent('merchantSelectionChange', {
            detail: {
                selectedCount: selectedCount,
                selectedIds: Array.from(this.selectedMerchants)
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 渲染空状态
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <tr class="table-empty-row">
                <td colspan="10" class="table-empty">
                    <div class="empty-icon">🏪</div>
                    <div class="empty-title">暂无商户数据</div>
                    <div class="empty-description">
                        ${this.dataManager.filters.search || this.dataManager.filters.status || this.dataManager.filters.type 
                            ? '没有找到符合筛选条件的商户，请调整筛选条件重试。' 
                            : '还没有添加任何商户，点击上方"添加商户"按钮开始添加。'}
                    </div>
                </td>
            </tr>
        `;
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
        if (url.length <= 40) return url;
        return url.substring(0, 20) + '...' + url.substring(url.length - 17);
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
     * 工具方法：格式化时间
     */
    formatTime(date) {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * 获取选中的商户ID列表
     */
    getSelectedMerchantIds() {
        return Array.from(this.selectedMerchants);
    }
    
    /**
     * 清除所有选择
     */
    clearSelection() {
        this.selectedMerchants.clear();
        this.updateSelectAllCheckbox();
        
        const checkboxes = this.container.querySelectorAll('.merchant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('.merchant-row');
            if (row) {
                row.classList.remove('selected');
            }
        });
        
        this.onSelectionChange();
    }
    
    /**
     * 刷新视图
     */
    refresh() {
        this.render();
    }
}

// 全局函数供HTML调用
window.copyRechargeUrl = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant && merchant.rechargeUrl) {
        navigator.clipboard.writeText(merchant.rechargeUrl).then(() => {
            if (window.showToast) {
                window.showToast('充值链接已复制到剪贴板', 'success');
            } else {
                alert('充值链接已复制到剪贴板');
            }
        }).catch(() => {
            alert('复制失败，请手动复制链接');
        });
    }
};

window.openPollingConfig = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('打开轮询配置:', merchant);
        alert(`配置商户"${merchant.name}"的轮询规则`);
    }
};

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedMerchantTableRenderer;
}