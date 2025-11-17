// 订单管理JavaScript功能

class OrderManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 0;
        this.orders = [];
        this.filteredOrders = [];
        this.merchants = [];
        this.selectedOrders = new Set();
        this.currentOrder = null;
        this.viewMode = 'table'; // table or card
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadMerchants();
        this.loadOrders();
        this.initDateInputs();
    }
    
    bindEvents() {
        // 搜索表单
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSearch();
        });
        
        // 重置按钮
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetFilters();
        });
        
        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadOrders();
        });
        
        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportOrders();
        });
        
        // 视图切换
        document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.viewMode = e.target.id === 'tableView' ? 'table' : 'card';
                this.renderOrders();
            });
        });
        
        // 全选/取消全选
        document.getElementById('selectAllOrders').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });
        
        // 状态更新表单
        document.getElementById('statusUpdateForm').addEventListener('submit', (e) => {
            this.handleStatusUpdateSubmit(e);
        });
        
        // 订单详情模态框中的操作按钮
        document.getElementById('confirmOrderBtn').addEventListener('click', () => {
            this.quickUpdateStatus('confirmed');
        });
        
        document.getElementById('rejectOrderBtn').addEventListener('click', () => {
            this.quickUpdateStatus('cancelled');
        });
        
        document.getElementById('cancelOrderBtn').addEventListener('click', () => {
            this.quickUpdateStatus('cancelled');
        });
    }
    
    initDateInputs() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 默认显示今天的数据
        document.getElementById('dateFrom').value = today.toISOString().split('T')[0];
        document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    }
    
    async loadMerchants() {
        try {
            const response = await fetch('/api/merchants');
            if (!response.ok) {
                throw new Error('Failed to load merchants');
            }
            
            const data = await response.json();
            this.merchants = data.merchants || [];
            
            this.populateMerchantFilter();
        } catch (error) {
            console.error('Error loading merchants:', error);
            this.showError('加载商户列表失败');
        }
    }
    
    populateMerchantFilter() {
        const select = document.getElementById('merchantFilter');
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
    }
    
    async loadOrders() {
        try {
            this.showLoading();
            
            const params = this.buildSearchParams();
            const response = await fetch(`/api/recharge-orders?${params}`);
            
            if (!response.ok) {
                throw new Error('Failed to load orders');
            }
            
            const data = await response.json();
            this.orders = data.orders || [];
            this.filteredOrders = [...this.orders];
            this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
            
            this.renderOrders();
            this.renderPagination();
            this.updateStatistics();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading orders:', error);
            this.showError('加载订单数据失败');
            this.hideLoading();
        }
    }
    
    buildSearchParams() {
        const params = new URLSearchParams();
        
        // 获取搜索条件
        const orderNo = document.getElementById('orderNoSearch').value.trim();
        const merchantId = document.getElementById('merchantFilter').value;
        const status = document.getElementById('statusFilter').value;
        const paymentType = document.getElementById('paymentTypeFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const amountMin = document.getElementById('amountMin').value;
        const amountMax = document.getElementById('amountMax').value;
        
        if (orderNo) params.append('order_no', orderNo);
        if (merchantId) params.append('merchant_id', merchantId);
        if (status) params.append('status', status);
        if (paymentType) params.append('payment_type', paymentType);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (amountMin) params.append('amount_min', amountMin);
        if (amountMax) params.append('amount_max', amountMax);
        
        // 分页参数
        params.append('page', this.currentPage);
        params.append('page_size', this.pageSize);
        
        return params.toString();
    }
    
    handleSearch() {
        this.currentPage = 1;
        this.loadOrders();
    }
    
    resetFilters() {
        document.getElementById('searchForm').reset();
        this.initDateInputs();
        this.currentPage = 1;
        this.loadOrders();
    }
    
    renderOrders() {
        if (this.viewMode === 'table') {
            this.renderTableView();
            document.getElementById('tableViewContainer').style.display = 'block';
            document.getElementById('cardViewContainer').style.display = 'none';
        } else {
            this.renderCardView();
            document.getElementById('tableViewContainer').style.display = 'none';
            document.getElementById('cardViewContainer').style.display = 'block';
        }
        
        this.updateOrderCount();
    }
    
    renderTableView() {
        const tbody = document.getElementById('ordersTableBody');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredOrders.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-list-alt"></i>
                            <p>暂无订单数据</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = pageData.map(order => `
            <tr class="fade-in">
                <td>
                    <input type="checkbox" class="form-check-input order-checkbox" 
                           value="${order.order_no}" 
                           ${this.selectedOrders.has(order.order_no) ? 'checked' : ''}>
                </td>
                <td>
                    <a href="#" class="order-no" onclick="orderManagement.viewOrderDetail('${order.order_no}')">${order.order_no}</a>
                </td>
                <td>${this.escapeHtml(order.merchant?.name || '-')}</td>
                <td>${this.escapeHtml(order.payer_name || '-')}</td>
                <td>
                    <span class="amount-display ${parseFloat(order.amount) > 10000 ? 'amount-large' : ''}">
                        ${this.formatAmount(order.amount)}
                    </span>
                </td>
                <td>
                    <span class="payment-type-badge payment-type-${order.payment_type}">
                        ${order.payment_type === 'corporate' ? '对公' : '对私'}
                    </span>
                </td>
                <td>
                    ${order.receive_account ? 
                        `${this.escapeHtml(order.receive_account.bank_name)}<br>
                         <small class="text-muted masked-account">${this.maskAccountNumber(order.receive_account.account_number)}</small>` 
                        : '-'}
                </td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <small class="text-muted">${this.formatDateTime(order.created_at)}</small>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-primary btn-action" 
                                onclick="orderManagement.viewOrderDetail('${order.order_no}')" 
                                title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning btn-action" 
                                onclick="orderManagement.updateOrderStatus('${order.order_no}')" 
                                title="更新状态">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${order.status === 'pending' || order.status === 'paid' ? `
                            <button type="button" class="btn btn-sm btn-outline-success btn-action" 
                                    onclick="orderManagement.quickUpdateStatus('confirmed', '${order.order_no}')" 
                                    title="确认订单">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${order.status !== 'cancelled' && order.status !== 'completed' ? `
                            <button type="button" class="btn btn-sm btn-outline-danger btn-action" 
                                    onclick="orderManagement.quickUpdateStatus('cancelled', '${order.order_no}')" 
                                    title="取消订单">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
        // 绑定复选框事件
        this.bindOrderCheckboxEvents();
    }
    
    renderCardView() {
        const container = document.getElementById('ordersCardContainer');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredOrders.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-list-alt"></i>
                        <p>暂无订单数据</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pageData.map(order => `
            <div class="col-md-6 col-lg-4">
                <div class="order-card fade-in">
                    <div class="order-header">
                        <div>
                            <input type="checkbox" class="form-check-input order-checkbox me-2" 
                                   value="${order.order_no}" 
                                   ${this.selectedOrders.has(order.order_no) ? 'checked' : ''}>
                            <span class="order-no">${order.order_no}</span>
                        </div>
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                    
                    <div class="order-info">
                        <div>
                            <small class="text-muted">商户</small><br>
                            <span>${this.escapeHtml(order.merchant?.name || '-')}</span>
                        </div>
                        <div>
                            <small class="text-muted">付款人</small><br>
                            <span>${this.escapeHtml(order.payer_name || '-')}</span>
                        </div>
                        <div>
                            <small class="text-muted">金额</small><br>
                            <span class="order-amount">${this.formatAmount(order.amount)}</span>
                        </div>
                        <div>
                            <small class="text-muted">付款类型</small><br>
                            <span class="payment-type-badge payment-type-${order.payment_type}">
                                ${order.payment_type === 'corporate' ? '对公' : '对私'}
                            </span>
                        </div>
                        <div>
                            <small class="text-muted">收款账号</small><br>
                            <span>${order.receive_account ? 
                                `${this.escapeHtml(order.receive_account.bank_name)}` : '-'}</span>
                        </div>
                        <div>
                            <small class="text-muted">创建时间</small><br>
                            <span>${this.formatDateTime(order.created_at)}</span>
                        </div>
                    </div>
                    
                    <div class="order-actions">
                        <button type="button" class="btn btn-sm btn-outline-primary" 
                                onclick="orderManagement.viewOrderDetail('${order.order_no}')">
                            <i class="fas fa-eye"></i> 详情
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning" 
                                onclick="orderManagement.updateOrderStatus('${order.order_no}')">
                            <i class="fas fa-edit"></i> 状态
                        </button>
                        ${order.status === 'pending' || order.status === 'paid' ? `
                            <button type="button" class="btn btn-sm btn-outline-success" 
                                    onclick="orderManagement.quickUpdateStatus('confirmed', '${order.order_no}')">
                                <i class="fas fa-check"></i> 确认
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // 绑定复选框事件
        this.bindOrderCheckboxEvents();
    }
    
    bindOrderCheckboxEvents() {
        const checkboxes = document.querySelectorAll('.order-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const orderNo = e.target.value;
                if (e.target.checked) {
                    this.selectedOrders.add(orderNo);
                } else {
                    this.selectedOrders.delete(orderNo);
                }
                this.updateSelectionUI();
            });
        });
    }
    
    updateSelectionUI() {
        const selectedCount = this.selectedOrders.size;
        const selectAllCheckbox = document.getElementById('selectAllOrders');
        const totalCheckboxes = document.querySelectorAll('.order-checkbox').length;
        
        // 更新全选复选框状态
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
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.order-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const orderNo = checkbox.value;
            if (checked) {
                this.selectedOrders.add(orderNo);
            } else {
                this.selectedOrders.delete(orderNo);
            }
        });
        this.updateSelectionUI();
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // 上一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="orderManagement.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="orderManagement.goToPage(1)">1</a></li>`;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="orderManagement.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="orderManagement.goToPage(${this.totalPages})">${this.totalPages}</a></li>`;
        }
        
        // 下一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="orderManagement.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHtml;
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.loadOrders();
    }
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        
        document.getElementById('totalOrders').textContent = stats.total;
        document.getElementById('completedOrders').textContent = stats.completed;
        document.getElementById('pendingOrders').textContent = stats.pending;
        document.getElementById('totalAmount').textContent = this.formatAmount(stats.totalAmount);
    }
    
    calculateStatistics() {
        const stats = {
            total: this.orders.length,
            completed: 0,
            pending: 0,
            totalAmount: 0
        };
        
        this.orders.forEach(order => {
            if (order.status === 'completed') {
                stats.completed++;
            } else if (order.status === 'pending' || order.status === 'paid') {
                stats.pending++;
            }
            
            stats.totalAmount += parseFloat(order.amount || 0);
        });
        
        return stats;
    }
    
    updateOrderCount() {
        const countElement = document.getElementById('orderCount');
        countElement.textContent = `共 ${this.filteredOrders.length} 条记录`;
    }
    
    async viewOrderDetail(orderNo) {
        try {
            const response = await fetch(`/api/recharge-orders/${orderNo}`);
            if (!response.ok) {
                throw new Error('Failed to load order detail');
            }
            
            const data = await response.json();
            const order = data.order;
            
            this.currentOrder = order;
            this.populateOrderDetail(order);
            
            // 加载操作日志
            await this.loadOrderLogs(orderNo);
            
            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading order detail:', error);
            this.showError('加载订单详情失败');
        }
    }
    
    populateOrderDetail(order) {
        document.getElementById('detailOrderNo').textContent = order.order_no;
        document.getElementById('detailMerchant').textContent = order.merchant?.name || '-';
        document.getElementById('detailPayerName').textContent = order.payer_name || '-';
        document.getElementById('detailAmount').textContent = this.formatAmount(order.amount);
        document.getElementById('detailAdAccount').textContent = order.ad_account || '-';
        document.getElementById('detailPaymentType').innerHTML = `
            <span class="payment-type-badge payment-type-${order.payment_type}">
                ${order.payment_type === 'corporate' ? '对公' : '对私'}
            </span>
        `;
        document.getElementById('detailStatus').innerHTML = `
            <span class="status-badge status-${order.status}">
                ${this.getStatusText(order.status)}
            </span>
        `;
        document.getElementById('detailCreatedAt').textContent = this.formatDateTime(order.created_at);
        document.getElementById('detailUpdatedAt').textContent = this.formatDateTime(order.updated_at);
        
        // 收款账号信息
        if (order.receive_account) {
            document.getElementById('detailBankName').textContent = order.receive_account.bank_name;
            document.getElementById('detailAccountNumber').textContent = this.maskAccountNumber(order.receive_account.account_number);
            document.getElementById('detailAccountName').textContent = order.receive_account.account_name;
            document.getElementById('detailAccountType').innerHTML = `
                <span class="account-type-badge account-type-${order.receive_account.account_type}">
                    ${order.receive_account.account_type === 'corporate' ? '对公账号' : '对私账号'}
                </span>
            `;
        } else {
            document.getElementById('detailBankName').textContent = '-';
            document.getElementById('detailAccountNumber').textContent = '-';
            document.getElementById('detailAccountName').textContent = '-';
            document.getElementById('detailAccountType').textContent = '-';
        }
        
        // 付款凭证
        const proofContainer = document.getElementById('paymentProofContainer');
        if (order.payment_proof) {
            proofContainer.innerHTML = `
                <img src="${order.payment_proof}" class="payment-proof-image" alt="付款凭证">
            `;
        } else {
            proofContainer.innerHTML = `
                <div class="payment-proof-placeholder">
                    <i class="fas fa-image fa-2x"></i>
                    <p class="mt-2 mb-0">暂无付款凭证</p>
                </div>
            `;
        }
        
        // 备注信息
        document.getElementById('detailRemark').textContent = order.remark || '无备注';
        
        // 更新操作按钮状态
        this.updateDetailActionButtons(order);
    }
    
    updateDetailActionButtons(order) {
        const confirmBtn = document.getElementById('confirmOrderBtn');
        const rejectBtn = document.getElementById('rejectOrderBtn');
        const cancelBtn = document.getElementById('cancelOrderBtn');
        
        // 根据订单状态显示/隐藏按钮
        if (order.status === 'pending' || order.status === 'paid') {
            confirmBtn.style.display = 'inline-block';
            rejectBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'inline-block';
        } else if (order.status === 'confirmed') {
            confirmBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
            cancelBtn.style.display = 'inline-block';
        } else {
            confirmBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }
    
    async loadOrderLogs(orderNo) {
        try {
            const response = await fetch(`/api/recharge-orders/${orderNo}/logs`);
            if (!response.ok) {
                throw new Error('Failed to load order logs');
            }
            
            const data = await response.json();
            const logs = data.logs || [];
            
            const tbody = document.getElementById('orderLogsTableBody');
            if (logs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">暂无操作日志</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td>${this.formatDateTime(log.created_at)}</td>
                    <td>${this.escapeHtml(log.action)}</td>
                    <td>${this.escapeHtml(log.user?.name || 'System')}</td>
                    <td>${this.escapeHtml(log.remark || '-')}</td>
                </tr>
            `).join('');
            
        } catch (error) {
            console.error('Error loading order logs:', error);
            const tbody = document.getElementById('orderLogsTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">加载日志失败</td>
                </tr>
            `;
        }
    }
    
    updateOrderStatus(orderNo) {
        const order = this.orders.find(o => o.order_no === orderNo);
        if (!order) {
            this.showError('订单不存在');
            return;
        }
        
        // 填充状态更新表单
        document.getElementById('updateOrderNo').value = orderNo;
        document.getElementById('updateOrderNoDisplay').value = orderNo;
        document.getElementById('newStatus').value = '';
        document.getElementById('statusRemark').value = '';
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('statusUpdateModal'));
        modal.show();
    }
    
    async handleStatusUpdateSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const updateData = Object.fromEntries(formData.entries());
        
        try {
            this.setStatusUpdateLoading(true);
            
            const response = await fetch(`/api/recharge-orders/${updateData.order_no}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: updateData.status,
                    remark: updateData.remark
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Status update failed');
            }
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal'));
            modal.hide();
            
            this.showSuccess('订单状态更新成功');
            
            // 重新加载数据
            await this.loadOrders();
            
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError(error.message || '状态更新失败');
        } finally {
            this.setStatusUpdateLoading(false);
        }
    }
    
    async quickUpdateStatus(status, orderNo = null) {
        const targetOrderNo = orderNo || (this.currentOrder ? this.currentOrder.order_no : null);
        
        if (!targetOrderNo) {
            this.showError('订单不存在');
            return;
        }
        
        const statusText = this.getStatusText(status);
        if (!confirm(`确定要将订单状态更新为"${statusText}"吗？`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/recharge-orders/${targetOrderNo}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: status,
                    remark: `快速操作：${statusText}`
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Status update failed');
            }
            
            this.showSuccess(`订单状态已更新为"${statusText}"`);
            
            // 如果是在详情模态框中操作，关闭模态框
            if (this.currentOrder && this.currentOrder.order_no === targetOrderNo) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'));
                if (modal) {
                    modal.hide();
                }
            }
            
            // 重新加载数据
            await this.loadOrders();
            
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError(error.message || '状态更新失败');
        }
    }
    
    async exportOrders() {
        try {
            const params = this.buildSearchParams();
            const response = await fetch(`/api/recharge-orders/export?${params}`);
            
            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            // 创建下载链接
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess('订单导出成功');
            
        } catch (error) {
            console.error('Error exporting orders:', error);
            this.showError('导出失败');
        }
    }
    
    // 工具方法
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatAmount(amount) {
        if (!amount) return '¥0.00';
        return `¥${parseFloat(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour12: false });
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
    
    getStatusText(status) {
        const statusMap = {
            'pending': '待付款',
            'paid': '已付款',
            'confirmed': '已确认',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }
    
    showLoading() {
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <div class="loading">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mt-2">加载中...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    hideLoading() {
        // Loading will be replaced by renderOrders()
    }
    
    setStatusUpdateLoading(loading) {
        const submitBtn = document.getElementById('statusUpdateSubmitBtn');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 更新中...';
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.innerHTML = '更新状态';
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
let orderManagement;
document.addEventListener('DOMContentLoaded', () => {
    orderManagement = new OrderManagement();
});

// 防止页面刷新时丢失事件绑定
window.orderManagement = orderManagement;