// 收款账号绑定管理JavaScript功能

class AccountBinding {
    constructor() {
        this.merchants = [];
        this.boundAccounts = [];
        this.availableAccounts = [];
        this.selectedMerchantId = null;
        this.selectedAccounts = new Set();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadMerchants();
        this.loadAvailableAccounts();
    }
    
    bindEvents() {
        // 商户选择
        document.getElementById('merchantSelect').addEventListener('change', (e) => {
            this.selectedMerchantId = e.target.value;
            this.loadBoundAccounts();
            this.filterAvailableAccounts();
        });
        
        // 账号类型筛选
        document.getElementById('accountTypeFilter').addEventListener('change', () => {
            this.filterAvailableAccounts();
        });
        
        // 搜索可绑定账号
        document.getElementById('searchAvailableBtn').addEventListener('click', () => {
            this.searchAvailableAccounts();
        });
        
        document.getElementById('availableAccountSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchAvailableAccounts();
            }
        });
        
        // 全选/取消全选
        document.getElementById('selectAllAvailable').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });
        
        // 批量绑定
        document.getElementById('batchBindBtn').addEventListener('click', () => {
            this.batchBindAccounts();
        });
        
        // 绑定表单
        document.getElementById('bindAccountForm').addEventListener('submit', (e) => {
            this.handleBindFormSubmit(e);
        });
        
        // 优先级表单
        document.getElementById('priorityForm').addEventListener('submit', (e) => {
            this.handlePriorityFormSubmit(e);
        });
        
        // 商户选择变化时更新可绑定账号
        document.getElementById('bindMerchantSelect').addEventListener('change', (e) => {
            this.loadAvailableAccountsForBind(e.target.value);
        });
        
        // 账号选择变化时显示预览
        document.getElementById('bindAccountSelect').addEventListener('change', (e) => {
            this.showAccountPreview(e.target.value);
        });
    }
    
    async loadMerchants() {
        try {
            const response = await fetch('/api/merchants');
            if (!response.ok) {
                throw new Error('Failed to load merchants');
            }
            
            const data = await response.json();
            this.merchants = data.merchants || [];
            
            this.populateMerchantSelects();
        } catch (error) {
            console.error('Error loading merchants:', error);
            this.showError('加载商户列表失败');
        }
    }
    
    populateMerchantSelects() {
        const selects = ['merchantSelect', 'bindMerchantSelect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            
            // 保留第一个选项
            const firstOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (firstOption) {
                select.appendChild(firstOption);
            }
            
            this.merchants.forEach(merchant => {
                const option = document.createElement('option');
                option.value = merchant.id;
                option.textContent = merchant.name;
                select.appendChild(option);
            });
            
            // 恢复之前的选择
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }
    
    async loadBoundAccounts() {
        if (!this.selectedMerchantId) {
            this.boundAccounts = [];
            this.renderBoundAccountsTable();
            return;
        }
        
        try {
            const response = await fetch(`/api/merchants/${this.selectedMerchantId}/accounts`);
            if (!response.ok) {
                throw new Error('Failed to load bound accounts');
            }
            
            const data = await response.json();
            this.boundAccounts = data.accounts || [];
            
            this.renderBoundAccountsTable();
            this.updateBoundAccountCount();
        } catch (error) {
            console.error('Error loading bound accounts:', error);
            this.showError('加载已绑定账号失败');
        }
    }
    
    async loadAvailableAccounts() {
        try {
            const response = await fetch('/api/receive-accounts/available');
            if (!response.ok) {
                throw new Error('Failed to load available accounts');
            }
            
            const data = await response.json();
            this.availableAccounts = data.accounts || [];
            
            this.renderAvailableAccountsTable();
        } catch (error) {
            console.error('Error loading available accounts:', error);
            this.showError('加载可绑定账号失败');
        }
    }
    
    async loadAvailableAccountsForBind(merchantId) {
        const select = document.getElementById('bindAccountSelect');
        select.innerHTML = '<option value="">加载中...</option>';
        
        if (!merchantId) {
            select.innerHTML = '<option value="">请先选择商户</option>';
            return;
        }
        
        try {
            const response = await fetch(`/api/merchants/${merchantId}/available-accounts`);
            if (!response.ok) {
                throw new Error('Failed to load available accounts');
            }
            
            const data = await response.json();
            const accounts = data.accounts || [];
            
            select.innerHTML = '<option value="">请选择收款账号</option>';
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.bank_name} - ${this.maskAccountNumber(account.account_number)} (${account.account_name})`;
                option.dataset.account = JSON.stringify(account);
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading available accounts for bind:', error);
            select.innerHTML = '<option value="">加载失败</option>';
        }
    }
    
    renderBoundAccountsTable() {
        const tbody = document.getElementById('boundAccountsTableBody');
        
        if (this.boundAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-credit-card"></i>
                            <p>该商户暂未绑定收款账号</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.boundAccounts.map(account => `
            <tr class="fade-in sortable-row" data-account-id="${account.receive_account_id}">
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-grip-vertical drag-handle me-2" title="拖拽调整优先级"></i>
                        <span class="priority-badge priority-${Math.min(account.priority, 5)}">${account.priority}</span>
                    </div>
                </td>
                <td>
                    <span class="account-type-badge account-type-${account.receive_account.account_type}">
                        ${account.receive_account.account_type === 'corporate' ? '对公' : '对私'}
                    </span>
                </td>
                <td>${this.escapeHtml(account.receive_account.bank_name)}</td>
                <td class="masked-account">${this.maskAccountNumber(account.receive_account.account_number)}</td>
                <td>${this.escapeHtml(account.receive_account.account_name)}</td>
                <td>
                    <div class="limit-progress">
                        <div class="limit-progress-bar ${this.getLimitProgressClass(account.receive_account.used_amount, account.receive_account.daily_limit)}" 
                             style="width: ${this.getLimitPercentage(account.receive_account.used_amount, account.receive_account.daily_limit)}%"></div>
                    </div>
                    <div class="limit-text">
                        ${this.formatAmount(account.receive_account.used_amount)} / ${this.formatAmount(account.receive_account.daily_limit)}
                    </div>
                </td>
                <td>${this.formatAmount(account.receive_account.used_amount)}</td>
                <td>
                    <span class="status-badge ${account.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${account.status === 'active' ? '启用' : '禁用'}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-primary btn-action" 
                                onclick="accountBinding.adjustPriority(${account.receive_account_id})" 
                                title="调整优先级">
                            <i class="fas fa-sort"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning btn-action" 
                                onclick="accountBinding.toggleAccountStatus(${account.receive_account_id})" 
                                title="${account.status === 'active' ? '禁用' : '启用'}">
                            <i class="fas fa-power-off"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-action" 
                                onclick="accountBinding.unbindAccount(${account.receive_account_id})" 
                                title="解绑">
                            <i class="fas fa-unlink"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // 初始化拖拽排序
        this.initSortable();
    }
    
    renderAvailableAccountsTable() {
        const tbody = document.getElementById('availableAccountsTableBody');
        const filteredAccounts = this.getFilteredAvailableAccounts();
        
        if (filteredAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>没有找到可绑定的账号</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredAccounts.map(account => `
            <tr class="fade-in">
                <td>
                    <input type="checkbox" class="form-check-input account-checkbox" 
                           value="${account.id}" 
                           ${this.selectedAccounts.has(account.id) ? 'checked' : ''}>
                </td>
                <td>
                    <span class="account-type-badge account-type-${account.account_type}">
                        ${account.account_type === 'corporate' ? '对公' : '对私'}
                    </span>
                </td>
                <td>${this.escapeHtml(account.bank_name)}</td>
                <td class="masked-account">${this.maskAccountNumber(account.account_number)}</td>
                <td>${this.escapeHtml(account.account_name)}</td>
                <td>
                    <div class="limit-progress">
                        <div class="limit-progress-bar ${this.getLimitProgressClass(account.used_amount, account.daily_limit)}" 
                             style="width: ${this.getLimitPercentage(account.used_amount, account.daily_limit)}%"></div>
                    </div>
                    <div class="limit-text">
                        ${this.formatAmount(account.used_amount)} / ${this.formatAmount(account.daily_limit)}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${account.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${account.status === 'active' ? '启用' : '禁用'}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-success btn-action" 
                            onclick="accountBinding.quickBindAccount(${account.id})" 
                            title="快速绑定"
                            ${!this.selectedMerchantId ? 'disabled' : ''}>
                        <i class="fas fa-link"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // 绑定复选框事件
        this.bindCheckboxEvents();
    }
    
    bindCheckboxEvents() {
        const checkboxes = document.querySelectorAll('.account-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const accountId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedAccounts.add(accountId);
                } else {
                    this.selectedAccounts.delete(accountId);
                }
                this.updateSelectionUI();
            });
        });
    }
    
    updateSelectionUI() {
        const selectedCount = this.selectedAccounts.size;
        const selectAllCheckbox = document.getElementById('selectAllAvailable');
        const batchBindBtn = document.getElementById('batchBindBtn');
        const selectedCountSpan = document.getElementById('selectedCount');
        
        // 更新全选复选框状态
        const totalCheckboxes = document.querySelectorAll('.account-checkbox').length;
        if (selectedCount === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (selectedCount === totalCheckboxes) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }
        
        // 更新批量操作按钮
        batchBindBtn.disabled = selectedCount === 0 || !this.selectedMerchantId;
        
        // 更新选择计数
        selectedCountSpan.textContent = `已选择 ${selectedCount} 个账号`;
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.account-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const accountId = parseInt(checkbox.value);
            if (checked) {
                this.selectedAccounts.add(accountId);
            } else {
                this.selectedAccounts.delete(accountId);
            }
        });
        this.updateSelectionUI();
    }
    
    getFilteredAvailableAccounts() {
        let filtered = [...this.availableAccounts];
        
        // 账号类型筛选
        const accountTypeFilter = document.getElementById('accountTypeFilter').value;
        if (accountTypeFilter) {
            filtered = filtered.filter(account => account.account_type === accountTypeFilter);
        }
        
        // 搜索筛选
        const searchTerm = document.getElementById('availableAccountSearch').value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(account => 
                account.bank_name.toLowerCase().includes(searchTerm) ||
                account.account_number.includes(searchTerm) ||
                account.account_name.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }
    
    searchAvailableAccounts() {
        this.renderAvailableAccountsTable();
    }
    
    filterAvailableAccounts() {
        this.selectedAccounts.clear();
        this.renderAvailableAccountsTable();
    }
    
    async handleBindFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const bindData = Object.fromEntries(formData.entries());
        
        try {
            this.setBindSubmitLoading(true);
            
            const response = await fetch('/api/merchant-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bindData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Bind failed');
            }
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('bindAccountModal'));
            modal.hide();
            
            this.showSuccess('账号绑定成功');
            
            // 重新加载数据
            await this.loadBoundAccounts();
            await this.loadAvailableAccounts();
            
        } catch (error) {
            console.error('Error binding account:', error);
            this.showError(error.message || '绑定失败');
        } finally {
            this.setBindSubmitLoading(false);
        }
    }
    
    async quickBindAccount(accountId) {
        if (!this.selectedMerchantId) {
            this.showWarning('请先选择商户');
            return;
        }
        
        const account = this.availableAccounts.find(a => a.id === accountId);
        if (!account) {
            this.showError('账号不存在');
            return;
        }
        
        if (!confirm(`确定要将账号 ${account.bank_name} - ${this.maskAccountNumber(account.account_number)} 绑定到当前商户吗？`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/merchant-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchant_id: this.selectedMerchantId,
                    receive_account_id: accountId,
                    priority: this.getNextPriority(),
                    status: 'active'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Bind failed');
            }
            
            this.showSuccess('账号绑定成功');
            
            // 重新加载数据
            await this.loadBoundAccounts();
            await this.loadAvailableAccounts();
            
        } catch (error) {
            console.error('Error quick binding account:', error);
            this.showError(error.message || '绑定失败');
        }
    }
    
    async batchBindAccounts() {
        if (this.selectedAccounts.size === 0) {
            this.showWarning('请选择要绑定的账号');
            return;
        }
        
        if (!this.selectedMerchantId) {
            this.showWarning('请先选择商户');
            return;
        }
        
        if (!confirm(`确定要批量绑定 ${this.selectedAccounts.size} 个账号吗？`)) {
            return;
        }
        
        try {
            const bindPromises = Array.from(this.selectedAccounts).map((accountId, index) => {
                return fetch('/api/merchant-accounts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        merchant_id: this.selectedMerchantId,
                        receive_account_id: accountId,
                        priority: this.getNextPriority() + index,
                        status: 'active'
                    })
                });
            });
            
            const results = await Promise.allSettled(bindPromises);
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
            const failCount = results.length - successCount;
            
            if (successCount > 0) {
                this.showSuccess(`成功绑定 ${successCount} 个账号${failCount > 0 ? `，${failCount} 个失败` : ''}`);
            } else {
                this.showError('批量绑定失败');
            }
            
            // 清空选择
            this.selectedAccounts.clear();
            
            // 重新加载数据
            await this.loadBoundAccounts();
            await this.loadAvailableAccounts();
            
        } catch (error) {
            console.error('Error batch binding accounts:', error);
            this.showError('批量绑定失败');
        }
    }
    
    adjustPriority(accountId) {
        const account = this.boundAccounts.find(a => a.receive_account_id === accountId);
        if (!account) {
            this.showError('账号不存在');
            return;
        }
        
        // 填充优先级调整表单
        document.getElementById('priorityMerchantId').value = this.selectedMerchantId;
        document.getElementById('priorityAccountId').value = accountId;
        document.getElementById('priorityBankName').textContent = account.receive_account.bank_name;
        document.getElementById('priorityAccountNumber').textContent = this.maskAccountNumber(account.receive_account.account_number);
        document.getElementById('newPriority').value = account.priority;
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('priorityModal'));
        modal.show();
    }
    
    async handlePriorityFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const merchantId = formData.get('merchant_id');
        const accountId = formData.get('account_id');
        const priority = formData.get('priority');
        
        try {
            this.setPrioritySubmitLoading(true);
            
            const response = await fetch(`/api/merchant-accounts/${merchantId}/${accountId}/priority`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ priority: parseInt(priority) })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Priority update failed');
            }
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('priorityModal'));
            modal.hide();
            
            this.showSuccess('优先级调整成功');
            
            // 重新加载数据
            await this.loadBoundAccounts();
            
        } catch (error) {
            console.error('Error updating priority:', error);
            this.showError(error.message || '优先级调整失败');
        } finally {
            this.setPrioritySubmitLoading(false);
        }
    }
    
    async toggleAccountStatus(accountId) {
        const account = this.boundAccounts.find(a => a.receive_account_id === accountId);
        if (!account) {
            this.showError('账号不存在');
            return;
        }
        
        const newStatus = account.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? '启用' : '禁用';
        
        if (!confirm(`确定要${action}该账号绑定吗？`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/merchant-accounts/${this.selectedMerchantId}/${accountId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) {
                throw new Error('Status update failed');
            }
            
            this.showSuccess(`账号绑定${action}成功`);
            await this.loadBoundAccounts();
            
        } catch (error) {
            console.error('Error updating account status:', error);
            this.showError(`${action}失败`);
        }
    }
    
    async unbindAccount(accountId) {
        const account = this.boundAccounts.find(a => a.receive_account_id === accountId);
        if (!account) {
            this.showError('账号不存在');
            return;
        }
        
        if (!confirm(`确定要解绑账号 ${account.receive_account.bank_name} - ${this.maskAccountNumber(account.receive_account.account_number)} 吗？`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/merchant-accounts/${this.selectedMerchantId}/${accountId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Unbind failed');
            }
            
            this.showSuccess('账号解绑成功');
            
            // 重新加载数据
            await this.loadBoundAccounts();
            await this.loadAvailableAccounts();
            
        } catch (error) {
            console.error('Error unbinding account:', error);
            this.showError('解绑失败');
        }
    }
    
    showAccountPreview(accountId) {
        const preview = document.getElementById('accountPreview');
        
        if (!accountId) {
            preview.style.display = 'none';
            return;
        }
        
        const select = document.getElementById('bindAccountSelect');
        const option = select.querySelector(`option[value="${accountId}"]`);
        
        if (!option || !option.dataset.account) {
            preview.style.display = 'none';
            return;
        }
        
        const account = JSON.parse(option.dataset.account);
        
        document.getElementById('previewAccountType').textContent = account.account_type === 'corporate' ? '对公账号' : '对私账号';
        document.getElementById('previewBankName').textContent = account.bank_name;
        document.getElementById('previewAccountName').textContent = account.account_name;
        document.getElementById('previewAccountNumber').textContent = this.maskAccountNumber(account.account_number);
        document.getElementById('previewDailyLimit').textContent = this.formatAmount(account.daily_limit);
        document.getElementById('previewStatus').textContent = account.status === 'active' ? '启用' : '禁用';
        
        preview.style.display = 'block';
    }
    
    initSortable() {
        // 这里可以集成拖拽排序库，如SortableJS
        // 暂时使用简单的实现
        const tbody = document.getElementById('boundAccountsTableBody');
        const rows = tbody.querySelectorAll('.sortable-row');
        
        rows.forEach(row => {
            const dragHandle = row.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.addEventListener('mousedown', (e) => {
                    // 简单的拖拽提示
                    this.showInfo('拖拽排序功能开发中...');
                });
            }
        });
    }
    
    getNextPriority() {
        if (this.boundAccounts.length === 0) {
            return 1;
        }
        return Math.max(...this.boundAccounts.map(a => a.priority)) + 1;
    }
    
    updateBoundAccountCount() {
        const countBadge = document.getElementById('boundAccountCount');
        countBadge.textContent = this.boundAccounts.length;
    }
    
    // 工具方法
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    maskAccountNumber(accountNumber) {
        if (!accountNumber || accountNumber.length < 8) {
            return accountNumber;
        }
        const start = accountNumber.substring(0, 4);
        const end = accountNumber.substring(accountNumber.length - 4);
        const middle = '*'.repeat(Math.max(4, accountNumber.length - 8));
        return `${start}${middle}${end}`;
    }
    
    formatAmount(amount) {
        if (!amount) return '¥0.00';
        return `¥${parseFloat(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    getLimitPercentage(used, limit) {
        if (!limit || limit <= 0) return 0;
        return Math.min(100, (used / limit) * 100);
    }
    
    getLimitProgressClass(used, limit) {
        const percentage = this.getLimitPercentage(used, limit);
        if (percentage >= 90) return 'bg-danger';
        if (percentage >= 70) return 'bg-warning';
        return 'bg-success';
    }
    
    setBindSubmitLoading(loading) {
        const submitBtn = document.getElementById('bindSubmitBtn');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 绑定中...';
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.innerHTML = '绑定';
        }
    }
    
    setPrioritySubmitLoading(loading) {
        const submitBtn = document.getElementById('prioritySubmitBtn');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.innerHTML = '保存';
        }
    }
    
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    showError(message) {
        this.showAlert(message, 'danger');
    }
    
    showWarning(message) {
        this.showAlert(message, 'warning');
    }
    
    showInfo(message) {
        this.showAlert(message, 'info');
    }
    
    showAlert(message, type) {
        // 移除现有的alert
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // 创建新的alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // 插入到主内容区顶部
        const main = document.querySelector('main');
        main.insertBefore(alert, main.firstChild);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }
}

// 初始化
let accountBinding;
document.addEventListener('DOMContentLoaded', () => {
    accountBinding = new AccountBinding();
});

// 防止页面刷新时丢失事件绑定
window.accountBinding = accountBinding;