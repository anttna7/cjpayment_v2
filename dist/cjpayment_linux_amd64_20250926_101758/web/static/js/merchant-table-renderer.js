/**
 * 商户表格视图渲染器
 * 负责将商户数据渲染为表格格式
 */

class MerchantTableRenderer {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.container = document.getElementById('merchantTableBody');
        this.isLoading = false;
        this.selectedMerchants = new Set();
    }
    
    /**
     * 渲染商户表格
     */
    render() {
        // 重新获取容器，确保DOM已准备就绪
        this.container = document.getElementById('merchantTableBody');
        
        if (!this.container) {
            console.error('商户表格容器未找到，容器ID: merchantTableBody');
            
            // 检查表格容器父元素是否存在
            const tableContainer = document.getElementById('merchantTable');
            console.log('表格父容器状态:', tableContainer ? '存在' : '不存在');
            if (tableContainer) {
                console.log('表格父容器display:', tableContainer.style.display);
                console.log('表格父容器innerHTML长度:', tableContainer.innerHTML.length);
            }
            return;
        }
        
        this.showLoading();
        
        // 模拟数据加载延迟
        setTimeout(() => {
            this.renderRows();
            this.hideLoading();
            this.updatePagination();
            this.updateSelectAllCheckbox();
        }, 500);
    }
    
    /**
     * 显示加载状态
     */
    showLoading() {
        this.isLoading = true;
        this.container.innerHTML = `
            <tr class="table__loading-row">
                <td colspan="9" class="table__loading">
                    <div class="loading-spinner"></div>
                    <span>正在加载商户数据...</span>
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
        
        // 计算起始序号（支持分页）
        const startIndex = (pageData.currentPage - 1) * pageData.pageSize + 1;
        
        const rowsHtml = pageData.data.map((merchant, index) => 
            this.createRowHtml(merchant, startIndex + index)
        ).join('');
        
        this.container.innerHTML = rowsHtml;
        
        // 绑定表格事件
        this.bindTableEvents();
    }
    
    /**
     * 创建单个表格行HTML
     * 新表格结构: 序号、账户ID、开户主体、代理商ID、代理商名称、返点政策、充值链接、账户状态、备注信息、操作
     */
    createRowHtml(merchant, index) {
        return `
            <tr class="merchant-row" data-merchant-id="${merchant.accountId}">
                <td class="col-fixed col-index">${index}</td>
                
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
                
                <td class="col-fixed col-actions">
                    <div class="table-actions">
                        <button class="btn-action" 
                                onclick="viewMerchantDetails('${merchant.accountId}')"
                                title="详情">
                            详情
                        </button>
                        
                        <button class="btn-action" 
                                onclick="editMerchant('${merchant.accountId}')"
                                title="编辑">
                            编辑
                        </button>
                        
                        <button class="btn-action" 
                                onclick="managePolling('${merchant.accountId}')"
                                title="轮询">
                            轮询
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
     * 渲染空状态
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <tr class="table__empty-row">
                <td colspan="10" class="table__empty">
                    <div class="table-empty-state">
                        <div class="empty-state-icon">🏪</div>
                        <h3 class="empty-state-title">暂无商户数据</h3>
                        <p class="empty-state-description">
                            ${this.dataManager.filters.search || this.dataManager.filters.status || this.dataManager.filters.type 
                                ? '没有找到符合筛选条件的商户，请调整筛选条件重试。' 
                                : '还没有添加任何商户，点击上方"添加商户"按钮开始添加。'}
                        </p>
                        <div class="empty-state-actions">
                            ${this.dataManager.filters.search || this.dataManager.filters.status || this.dataManager.filters.type 
                                ? `<button class="btn btn-outline btn--sm" onclick="clearFilters()">清除筛选</button>`
                                : `<button class="btn btn-primary btn--sm" onclick="addMerchant()">
                                     <span class="btn__icon">➕</span>
                                     添加商户
                                   </button>`
                            }
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * 绑定表格事件
     */
    bindTableEvents() {
        // 绑定复选框事件
        const checkboxes = this.container.querySelectorAll('.merchant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleCheckboxChange(e);
            });
        });
        
        // 绑定下拉菜单事件
        const dropdownToggles = this.container.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(toggle);
            });
        });
        
        // 绑定行点击事件
        const rows = this.container.querySelectorAll('.merchant-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                // 如果点击的是复选框或按钮，不处理行点击
                if (e.target.type === 'checkbox' || e.target.closest('button') || e.target.closest('.dropdown')) {
                    return;
                }
                this.handleRowClick(row);
            });
        });
        
        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
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
            row.classList.toggle('merchant-row--selected', isChecked);
        }
        
        // 更新全选复选框状态
        this.updateSelectAllCheckbox();
        
        // 触发选择变化事件
        this.onSelectionChange();
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
        const openMenus = document.querySelectorAll('.dropdown-menu--show');
        openMenus.forEach(menu => {
            menu.classList.remove('dropdown-menu--show');
            const toggle = menu.previousElementSibling;
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
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
     * 处理全选复选框变化
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
                row.classList.toggle('merchant-row--selected', shouldBeChecked);
            }
        });
        
        this.onSelectionChange();
    }
    
    /**
     * 选择变化回调
     */
    onSelectionChange() {
        const selectedCount = this.selectedMerchants.size;
        
        // 可以在这里更新批量操作按钮状态
        console.log(`已选择 ${selectedCount} 个商户`);
        
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
        
        // 更新页面中的复选框状态
        const checkboxes = this.container.querySelectorAll('.merchant-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('.merchant-row');
            if (row) {
                row.classList.remove('merchant-row--selected');
            }
        });
        
        this.onSelectionChange();
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
window.viewMerchantTransactions = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('查看商户交易记录:', merchant);
        alert(`查看商户交易记录：${merchant.name}`);
    }
};

window.viewMerchantBalance = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant) {
        console.log('查看商户余额:', merchant);
        alert(`商户余额：${merchant.name}\n余额：¥${merchant.balance.toLocaleString()}`);
    }
};

window.resetMerchantPassword = function(merchantId) {
    const merchant = window.merchantDataManager.getMerchantById(merchantId);
    if (merchant && confirm(`确定要重置商户"${merchant.name}"的密码吗？`)) {
        console.log('重置商户密码:', merchant);
        alert(`已重置商户"${merchant.name}"的密码，新密码已发送到注册邮箱。`);
    }
};

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MerchantTableRenderer;
}