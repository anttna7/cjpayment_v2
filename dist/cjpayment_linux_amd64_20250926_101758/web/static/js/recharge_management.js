/**
 * Recharge Management Module
 * Handles recharge order creation, status query, and financial audit
 */

window.RechargeManagement = (function() {
    'use strict';

    class RechargeManagement {
        constructor() {
            this.currentTab = 'orders';
            this.orders = [];
            this.filteredOrders = [];
            this.auditOrders = [];
            this.merchants = [];
            this.currentPage = 1;
            this.pageSize = 20;
            this.totalPages = 1;
            this.filters = {
                search: '',
                status: '',
                type: '',
                date: ''
            };
            this.auditFilters = {
                status: 'pending',
                type: '',
                dateFrom: '',
                dateTo: ''
            };
            this.selectedOrders = new Set();
            this.selectedAuditOrders = new Set();
            this.isLoading = false;
            this.viewMode = 'card'; // 'card' or 'list'
            this.sortBy = 'createdAt';
            this.sortOrder = 'desc';
        }

        // ==========================================================================
        // Initialization
        // ==========================================================================

        init() {
            this.bindEvents();
            this.loadOrders();
            this.loadMerchants();
            this.loadStats();
        }

        bindEvents() {
            // Tab switching
            const tabBtns = CJUtils.$('.tab-btn');
            tabBtns.forEach(btn => {
                CJUtils.on(btn, 'click', (e) => {
                    const tab = e.target.dataset.tab;
                    this.switchTab(tab);
                });
            });

            // Create recharge button
            const createBtn = CJUtils.$('#createRechargeBtn');
            if (createBtn) {
                CJUtils.on(createBtn, 'click', () => {
                    this.switchTab('create');
                });
            }

            this.bindOrdersEvents();
            this.bindCreateEvents();
            this.bindAuditEvents();
            this.bindModalEvents();
        }

        bindOrdersEvents() {
            // Search functionality
            const searchInput = CJUtils.$('#orderSearch');
            if (searchInput) {
                let searchTimeout;
                CJUtils.on(searchInput, 'input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value.trim();
                        this.currentPage = 1;
                        this.applyFiltersAndSort();
                        this.updateSearchClearButton();
                    }, 300);
                });
            }

            // Search clear button
            const searchClear = CJUtils.$('#searchClear');
            if (searchClear) {
                CJUtils.on(searchClear, 'click', () => {
                    searchInput.value = '';
                    this.filters.search = '';
                    this.applyFiltersAndSort();
                    this.updateSearchClearButton();
                });
            }

            // Filter controls
            const statusFilter = CJUtils.$('#statusFilter');
            if (statusFilter) {
                CJUtils.on(statusFilter, 'change', (e) => {
                    this.filters.status = e.target.value;
                    this.currentPage = 1;
                    this.applyFiltersAndSort();
                });
            }

            const typeFilter = CJUtils.$('#typeFilter');
            if (typeFilter) {
                CJUtils.on(typeFilter, 'change', (e) => {
                    this.filters.type = e.target.value;
                    this.currentPage = 1;
                    this.applyFiltersAndSort();
                });
            }

            const dateFilter = CJUtils.$('#dateFilter');
            if (dateFilter) {
                CJUtils.on(dateFilter, 'change', (e) => {
                    this.filters.date = e.target.value;
                    this.currentPage = 1;
                    this.applyFiltersAndSort();
                });
            }

            // Clear filters button
            const clearFilters = CJUtils.$('#clearFilters');
            if (clearFilters) {
                CJUtils.on(clearFilters, 'click', () => {
                    this.clearAllFilters();
                });
            }

            // View toggle buttons
            const cardViewToggle = CJUtils.$('#cardViewToggle');
            const listViewToggle = CJUtils.$('#listViewToggle');
            
            if (cardViewToggle) {
                CJUtils.on(cardViewToggle, 'click', () => {
                    this.setViewMode('card');
                });
            }
            
            if (listViewToggle) {
                CJUtils.on(listViewToggle, 'click', () => {
                    this.setViewMode('list');
                });
            }

            // Sort toggle
            const sortToggle = CJUtils.$('#sortToggle');
            if (sortToggle) {
                CJUtils.on(sortToggle, 'click', () => {
                    this.toggleSortDropdown();
                });
            }

            // Action buttons
            const exportBtn = CJUtils.$('#exportOrdersBtn');
            if (exportBtn) {
                CJUtils.on(exportBtn, 'click', () => {
                    this.exportOrders();
                });
            }

            const refreshBtn = CJUtils.$('#refreshOrdersBtn');
            if (refreshBtn) {
                CJUtils.on(refreshBtn, 'click', () => {
                    this.loadOrders();
                });
            }

            // Bulk action buttons
            const bulkExportBtn = CJUtils.$('#bulkExportBtn');
            const bulkCancelBtn = CJUtils.$('#bulkCancelBtn');
            const deselectAllBtn = CJUtils.$('#deselectAllBtn');

            if (bulkExportBtn) {
                CJUtils.on(bulkExportBtn, 'click', () => {
                    this.bulkExportOrders();
                });
            }

            if (bulkCancelBtn) {
                CJUtils.on(bulkCancelBtn, 'click', () => {
                    this.bulkCancelOrders();
                });
            }

            if (deselectAllBtn) {
                CJUtils.on(deselectAllBtn, 'click', () => {
                    this.deselectAllOrders();
                });
            }

            // Select all checkbox
            const selectAll = CJUtils.$('#selectAllOrders');
            if (selectAll) {
                CJUtils.on(selectAll, 'change', (e) => {
                    this.toggleSelectAllOrders(e.target.checked);
                });
            }
        }

        bindCreateEvents() {
            // Initialize recharge creation wizard when create tab is shown
            // This will be handled in switchTab method
        }

        bindAuditEvents() {
            // Audit filters
            const auditStatusFilter = CJUtils.$('#auditStatusFilter');
            if (auditStatusFilter) {
                CJUtils.on(auditStatusFilter, 'change', (e) => {
                    this.auditFilters.status = e.target.value;
                    this.loadAuditOrders();
                });
            }

            const auditTypeFilter = CJUtils.$('#auditTypeFilter');
            if (auditTypeFilter) {
                CJUtils.on(auditTypeFilter, 'change', (e) => {
                    this.auditFilters.type = e.target.value;
                    this.loadAuditOrders();
                });
            }

            const auditDateFrom = CJUtils.$('#auditDateFrom');
            if (auditDateFrom) {
                CJUtils.on(auditDateFrom, 'change', (e) => {
                    this.auditFilters.dateFrom = e.target.value;
                    this.loadAuditOrders();
                });
            }

            const auditDateTo = CJUtils.$('#auditDateTo');
            if (auditDateTo) {
                CJUtils.on(auditDateTo, 'change', (e) => {
                    this.auditFilters.dateTo = e.target.value;
                    this.loadAuditOrders();
                });
            }

            // Batch actions
            const batchApproveBtn = CJUtils.$('#batchApproveBtn');
            if (batchApproveBtn) {
                CJUtils.on(batchApproveBtn, 'click', () => {
                    this.handleBatchApprove();
                });
            }

            const batchRejectBtn = CJUtils.$('#batchRejectBtn');
            if (batchRejectBtn) {
                CJUtils.on(batchRejectBtn, 'click', () => {
                    this.handleBatchReject();
                });
            }

            // Select all audit checkbox
            const selectAllAudit = CJUtils.$('#selectAllAudit');
            if (selectAllAudit) {
                CJUtils.on(selectAllAudit, 'change', (e) => {
                    this.toggleSelectAllAudit(e.target.checked);
                });
            }
        }

        bindModalEvents() {
            // Order detail modal
            const orderDetailModal = CJUtils.$('#orderDetailModal');
            const orderDetailClose = CJUtils.$('#orderDetailClose');
            const orderDetailCancel = CJUtils.$('#orderDetailCancel');

            if (orderDetailClose) {
                CJUtils.on(orderDetailClose, 'click', () => {
                    this.hideOrderDetailModal();
                });
            }

            if (orderDetailCancel) {
                CJUtils.on(orderDetailCancel, 'click', () => {
                    this.hideOrderDetailModal();
                });
            }

            if (orderDetailModal) {
                CJUtils.on(orderDetailModal, 'click', (e) => {
                    if (e.target === orderDetailModal) {
                        this.hideOrderDetailModal();
                    }
                });
            }

            // Audit action buttons
            const approveOrderBtn = CJUtils.$('#approveOrderBtn');
            const rejectOrderBtn = CJUtils.$('#rejectOrderBtn');

            if (approveOrderBtn) {
                CJUtils.on(approveOrderBtn, 'click', () => {
                    this.showAuditActionModal('approve');
                });
            }

            if (rejectOrderBtn) {
                CJUtils.on(rejectOrderBtn, 'click', () => {
                    this.showAuditActionModal('reject');
                });
            }

            // Audit action modal
            const auditActionModal = CJUtils.$('#auditActionModal');
            const auditActionClose = CJUtils.$('#auditActionClose');
            const auditActionCancel = CJUtils.$('#auditActionCancel');
            const auditActionForm = CJUtils.$('#auditActionForm');

            if (auditActionClose) {
                CJUtils.on(auditActionClose, 'click', () => {
                    this.hideAuditActionModal();
                });
            }

            if (auditActionCancel) {
                CJUtils.on(auditActionCancel, 'click', () => {
                    this.hideAuditActionModal();
                });
            }

            if (auditActionModal) {
                CJUtils.on(auditActionModal, 'click', (e) => {
                    if (e.target === auditActionModal) {
                        this.hideAuditActionModal();
                    }
                });
            }

            if (auditActionForm) {
                CJUtils.on(auditActionForm, 'submit', (e) => {
                    e.preventDefault();
                    this.handleAuditAction();
                });
            }
        }

        // ==========================================================================
        // Tab Management
        // ==========================================================================

        switchTab(tab) {
            if (this.currentTab === tab) return;

            // Update tab buttons
            const tabBtns = CJUtils.$('.tab-btn');
            tabBtns.forEach(btn => {
                if (btn.dataset.tab === tab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update tab content
            const tabContents = CJUtils.$('.tab-content');
            tabContents.forEach(content => {
                if (content.id === `${tab}Tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            this.currentTab = tab;

            // Load data for the active tab
            switch (tab) {
                case 'orders':
                    this.loadOrders();
                    break;
                case 'create':
                    this.initializeRechargeWizard();
                    break;
                case 'audit':
                    this.loadAuditOrders();
                    this.loadAuditStats();
                    break;
            }
        }

        initializeRechargeWizard() {
            // Destroy existing wizard if it exists
            if (this.rechargeWizard) {
                this.rechargeWizard.destroy();
            }

            // Initialize new wizard
            const wizardContainer = CJUtils.$('#rechargeCreationWizard');
            if (wizardContainer && typeof CJRechargeCreationWizard !== 'undefined') {
                this.rechargeWizard = CJRechargeCreationWizard.create(wizardContainer, {
                    autoSave: true,
                    autoSaveInterval: 15000,
                    saveKey: 'recharge_creation_wizard',
                    onComplete: (data) => {
                        console.log('Recharge order created:', data);
                        // Refresh orders list
                        this.loadOrders();
                        // Switch back to orders tab
                        setTimeout(() => {
                            this.switchTab('orders');
                        }, 2000);
                    },
                    onSave: (data) => {
                        console.log('Form data auto-saved:', data);
                    },
                    onStepChange: (step, formData) => {
                        console.log('Step changed:', step, formData);
                    },
                    onValidationError: (step, errors) => {
                        console.log('Validation errors:', step, errors);
                    }
                });
            }
        }

        // ==========================================================================
        // Data Loading
        // ==========================================================================

        async loadOrders() {
            if (this.isLoading) return;

            this.setLoading(true);

            try {
                const params = {
                    page: this.currentPage,
                    limit: this.pageSize
                };

                const response = await CJApi.get('/api/recharge/orders', { params });

                if (response.success) {
                    this.orders = response.data.orders || [];
                    this.totalPages = response.data.totalPages || 1;
                    this.applyFiltersAndSort();
                    this.renderOrdersPagination();
                } else {
                    CJComponents.toast.error('加载订单列表失败');
                }
            } catch (error) {
                console.error('Load orders error:', error);
                CJComponents.toast.error('加载订单列表失败');
            } finally {
                this.setLoading(false);
            }
        }

        async loadAuditOrders() {
            try {
                const params = {
                    page: this.currentPage,
                    limit: this.pageSize,
                    ...this.auditFilters
                };

                const response = await CJApi.get('/api/recharge/audit', { params });

                if (response.success) {
                    this.auditOrders = response.data.orders || [];
                    this.renderAuditTable();
                    this.renderAuditPagination();
                }
            } catch (error) {
                console.error('Load audit orders error:', error);
                CJComponents.toast.error('加载审核订单失败');
            }
        }

        async loadMerchants() {
            try {
                const response = await CJApi.get('/api/merchants');
                if (response.success) {
                    this.merchants = response.data.merchants || [];
                }
            } catch (error) {
                console.error('Load merchants error:', error);
            }
        }

        async loadStats() {
            try {
                const response = await CJApi.get('/api/recharge/stats');
                if (response.success) {
                    this.updateStats(response.data);
                }
            } catch (error) {
                console.error('Load stats error:', error);
            }
        }

        async loadAuditStats() {
            try {
                const response = await CJApi.get('/api/recharge/audit/stats');
                if (response.success) {
                    this.updateAuditStats(response.data);
                }
            } catch (error) {
                console.error('Load audit stats error:', error);
            }
        }

        // ==========================================================================
        // Filtering and Sorting
        // ==========================================================================

        applyFiltersAndSort() {
            // Start with all orders
            let filtered = [...this.orders];

            // Apply search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                filtered = filtered.filter(order => 
                    order.orderNumber.toLowerCase().includes(searchTerm) ||
                    order.payerName.toLowerCase().includes(searchTerm) ||
                    order.merchantName.toLowerCase().includes(searchTerm) ||
                    order.adAccount.toLowerCase().includes(searchTerm)
                );
            }

            // Apply status filter
            if (this.filters.status) {
                filtered = filtered.filter(order => order.status === this.filters.status);
            }

            // Apply type filter
            if (this.filters.type) {
                filtered = filtered.filter(order => order.type === this.filters.type);
            }

            // Apply date filter
            if (this.filters.date) {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt);
                    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                    
                    switch (this.filters.date) {
                        case 'today':
                            return orderDay.getTime() === today.getTime();
                        case 'yesterday':
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            return orderDay.getTime() === yesterday.getTime();
                        case 'week':
                            const weekAgo = new Date(today);
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return orderDay >= weekAgo;
                        case 'month':
                            const monthAgo = new Date(today);
                            monthAgo.setMonth(monthAgo.getMonth() - 1);
                            return orderDay >= monthAgo;
                        default:
                            return true;
                    }
                });
            }

            // Apply sorting
            filtered.sort((a, b) => {
                let aValue = a[this.sortBy];
                let bValue = b[this.sortBy];

                // Handle different data types
                if (this.sortBy === 'amount') {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                } else if (this.sortBy === 'createdAt') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                } else {
                    aValue = String(aValue).toLowerCase();
                    bValue = String(bValue).toLowerCase();
                }

                if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            this.filteredOrders = filtered;
            this.updateOrdersDisplay();
            this.updateFilterInfo();
        }

        clearAllFilters() {
            this.filters = {
                search: '',
                status: '',
                type: '',
                date: ''
            };

            // Reset form controls
            const searchInput = CJUtils.$('#orderSearch');
            const statusFilter = CJUtils.$('#statusFilter');
            const typeFilter = CJUtils.$('#typeFilter');
            const dateFilter = CJUtils.$('#dateFilter');

            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (typeFilter) typeFilter.value = '';
            if (dateFilter) dateFilter.value = '';

            this.applyFiltersAndSort();
            this.updateSearchClearButton();
        }

        updateSearchClearButton() {
            const searchClear = CJUtils.$('#searchClear');
            if (searchClear) {
                searchClear.style.display = this.filters.search ? 'flex' : 'none';
            }
        }

        updateFilterInfo() {
            const totalCount = CJUtils.$('#totalOrdersCount');
            const filteredInfo = CJUtils.$('#filteredOrdersInfo');
            const filteredCount = CJUtils.$('#filteredOrdersCount');

            if (totalCount) {
                totalCount.textContent = this.orders.length;
            }

            if (filteredInfo && filteredCount) {
                const isFiltered = this.filteredOrders.length !== this.orders.length;
                filteredInfo.style.display = isFiltered ? 'inline' : 'none';
                filteredCount.textContent = this.filteredOrders.length;
            }
        }

        // ==========================================================================
        // View Mode Management
        // ==========================================================================

        setViewMode(mode) {
            this.viewMode = mode;
            
            const cardViewToggle = CJUtils.$('#cardViewToggle');
            const listViewToggle = CJUtils.$('#listViewToggle');
            const ordersSection = CJUtils.$('.orders-section');

            // Update toggle buttons
            if (cardViewToggle && listViewToggle) {
                if (mode === 'card') {
                    cardViewToggle.classList.add('active');
                    listViewToggle.classList.remove('active');
                } else {
                    cardViewToggle.classList.remove('active');
                    listViewToggle.classList.add('active');
                }
            }

            // Update section class
            if (ordersSection) {
                ordersSection.classList.remove('card-view', 'list-view');
                ordersSection.classList.add(`${mode}-view`);
            }

            this.updateOrdersDisplay();
        }

        // ==========================================================================
        // Display Rendering
        // ==========================================================================

        updateOrdersDisplay() {
            if (this.viewMode === 'card') {
                this.renderOrdersCards();
            } else {
                this.renderOrdersTable();
            }
        }

        renderOrdersCards() {
            const cardGrid = CJUtils.$('#ordersCardGrid');
            if (!cardGrid) return;

            if (this.filteredOrders.length === 0) {
                cardGrid.innerHTML = this.renderEmptyState();
                return;
            }

            cardGrid.innerHTML = this.filteredOrders.map(order => this.renderOrderCard(order)).join('');
            this.bindOrderCardEvents();
            this.updateBulkActionsVisibility();
        }

        renderOrderCard(order) {
            const typeClass = order.type === 'private' ? 'private' : 'public';
            const typeText = order.type === 'private' ? '对私充值' : '对公充值';
            const statusClass = this.getStatusClass(order.status);
            const statusText = this.getStatusText(order.status);
            const isSelected = this.selectedOrders.has(order.id);
            const isUrgent = this.isOrderUrgent(order);
            const isPriority = this.isOrderPriority(order);
            
            // Calculate relative time
            const relativeTime = this.getRelativeTime(order.createdAt);
            const lastUpdated = order.updatedAt ? this.getRelativeTime(order.updatedAt) : null;

            return `
                <div class="order-card ${isSelected ? 'selected' : ''} ${isUrgent ? 'order-card--urgent' : ''} ${isPriority ? 'order-card--priority' : ''}" 
                     data-order-id="${order.id}" 
                     data-type="${order.type}" 
                     data-status="${order.status}"
                     data-amount="${order.amount}">
                    <div class="order-card__header">
                        <input type="checkbox" class="order-card__select order-checkbox" 
                               value="${order.id}" ${isSelected ? 'checked' : ''}>
                        <div class="order-card__title">
                            <div class="order-card__number" title="订单号: ${order.orderNumber}">
                                ${order.orderNumber}
                            </div>
                            <span class="order-card__type order-card__type--${typeClass}">${typeText}</span>
                        </div>
                        <span class="order-card__status order-card__status--${statusClass}" 
                              title="状态: ${statusText}">${statusText}</span>
                    </div>
                    
                    <div class="order-card__body">
                        <div class="order-card__amount" title="充值金额">
                            <span class="order-card__amount-currency">¥</span>
                            ${CJUtils.formatNumber(order.amount, 2)}
                            ${this.getAmountTrend(order) ? `
                                <span class="order-card__amount-trend order-card__amount-trend--${this.getAmountTrend(order).direction}">
                                    ${this.getAmountTrend(order).text}
                                </span>
                            ` : ''}
                        </div>
                        
                        <div class="order-card__details">
                            <div class="order-card__detail">
                                <span class="order-card__detail-label">付款人</span>
                                <div class="order-card__detail-value">
                                    <div class="order-card__payer">
                                        <div class="order-card__payer-name" title="付款人: ${order.payerName}">
                                            ${order.payerName}
                                        </div>
                                        <div class="order-card__payer-account" title="付款账号: ${order.payerAccount}">
                                            ${this.maskAccount(order.payerAccount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="order-card__detail">
                                <span class="order-card__detail-label">商户</span>
                                <span class="order-card__detail-value" title="商户: ${order.merchantName}">
                                    ${order.merchantName}
                                </span>
                            </div>
                            
                            <div class="order-card__detail">
                                <span class="order-card__detail-label">广告账户</span>
                                <span class="order-card__detail-value" title="广告账户: ${order.adAccount}">
                                    ${order.adAccount}
                                </span>
                            </div>
                            
                            ${order.receiverName ? `
                                <div class="order-card__detail">
                                    <span class="order-card__detail-label">收款人</span>
                                    <span class="order-card__detail-value" title="收款人: ${order.receiverName}">
                                        ${order.receiverName}
                                    </span>
                                </div>
                            ` : ''}
                            
                            ${order.remark ? `
                                <div class="order-card__detail">
                                    <span class="order-card__detail-label">备注</span>
                                    <span class="order-card__detail-value" title="备注: ${order.remark}">
                                        ${this.truncateText(order.remark, 30)}
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="order-card__footer">
                        <div class="order-card__time">
                            <div class="order-card__time-created" title="创建时间: ${CJUtils.formatDate(order.createdAt)}">
                                ${CJUtils.formatDate(order.createdAt, 'MM-DD HH:mm')}
                            </div>
                            ${lastUpdated ? `
                                <div class="order-card__time-updated" title="更新时间: ${CJUtils.formatDate(order.updatedAt)}">
                                    更新: ${lastUpdated}
                                </div>
                            ` : ''}
                            <div class="order-card__time-relative">${relativeTime}</div>
                        </div>
                        <div class="order-card__actions">
                            <button class="order-card__action order-card__action--primary" 
                                    data-action="view" data-order-id="${order.id}"
                                    title="查看订单详情">
                                <span class="order-card__action-icon">👁</span>
                                查看详情
                            </button>
                            ${this.getOrderActions(order).map(action => `
                                <button class="order-card__action order-card__action--${action.variant}" 
                                        data-action="${action.action}" data-order-id="${order.id}"
                                        title="${action.title}"
                                        ${action.disabled ? 'disabled' : ''}>
                                    <span class="order-card__action-icon">${action.icon}</span>
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // ==========================================================================
        // Enhanced Order Card Helper Methods
        // ==========================================================================

        /**
         * Check if order is urgent (created more than 2 hours ago and still pending)
         */
        isOrderUrgent(order) {
            if (order.status !== 'pending') return false;
            const createdTime = new Date(order.createdAt);
            const now = new Date();
            const hoursDiff = (now - createdTime) / (1000 * 60 * 60);
            return hoursDiff > 2;
        }

        /**
         * Check if order is priority (high amount or VIP merchant)
         */
        isOrderPriority(order) {
            return order.amount > 10000 || order.merchantType === 'vip';
        }

        /**
         * Get relative time string
         */
        getRelativeTime(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) return '刚刚';
            if (diffMins < 60) return `${diffMins}分钟前`;
            if (diffHours < 24) return `${diffHours}小时前`;
            if (diffDays < 7) return `${diffDays}天前`;
            return CJUtils.formatDate(date, 'MM-DD');
        }

        /**
         * Mask account number for security
         */
        maskAccount(account) {
            if (!account || account.length < 8) return account;
            const start = account.substring(0, 4);
            const end = account.substring(account.length - 4);
            const middle = '*'.repeat(Math.min(account.length - 8, 8));
            return `${start}${middle}${end}`;
        }

        /**
         * Truncate text with ellipsis
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        /**
         * Get amount trend information (if available)
         */
        getAmountTrend(order) {
            // This would be calculated based on historical data
            // For now, return null as we don't have trend data
            return null;
        }

        /**
         * Get available actions for an order based on its status
         */
        getOrderActions(order) {
            const actions = [];

            switch (order.status) {
                case 'pending':
                    actions.push({
                        action: 'approve',
                        text: '审核通过',
                        icon: '✅',
                        variant: 'success',
                        title: '审核通过此订单',
                        disabled: false
                    });
                    actions.push({
                        action: 'reject',
                        text: '拒绝',
                        icon: '❌',
                        variant: 'danger',
                        title: '拒绝此订单',
                        disabled: false
                    });
                    break;

                case 'processing':
                    actions.push({
                        action: 'complete',
                        text: '完成',
                        icon: '✅',
                        variant: 'success',
                        title: '标记为完成',
                        disabled: false
                    });
                    actions.push({
                        action: 'cancel',
                        text: '取消',
                        icon: '🚫',
                        variant: 'warning',
                        title: '取消此订单',
                        disabled: false
                    });
                    break;

                case 'completed':
                    actions.push({
                        action: 'receipt',
                        text: '收据',
                        icon: '🧾',
                        variant: 'secondary',
                        title: '查看收据',
                        disabled: false
                    });
                    break;

                case 'failed':
                    actions.push({
                        action: 'retry',
                        text: '重试',
                        icon: '🔄',
                        variant: 'warning',
                        title: '重新处理订单',
                        disabled: false
                    });
                    break;
            }

            return actions;
        }

        /**
         * Get status class for styling
         */
        getStatusClass(status) {
            const statusMap = {
                'pending': 'pending',
                'processing': 'processing',
                'completed': 'completed',
                'failed': 'failed',
                'cancelled': 'cancelled'
            };
            return statusMap[status] || 'pending';
        }

        /**
         * Get human-readable status text
         */
        getStatusText(status) {
            const statusMap = {
                'pending': '待处理',
                'processing': '处理中',
                'completed': '已完成',
                'failed': '失败',
                'cancelled': '已取消'
            };
            return statusMap[status] || '未知';
        }

        renderEmptyState() {
            const hasFilters = this.filters.search || this.filters.status || this.filters.type || this.filters.date;
            
            return `
                <div class="orders-empty-state">
                    <div class="orders-empty-state__icon">📋</div>
                    <div class="orders-empty-state__title">
                        ${hasFilters ? '未找到匹配的订单' : '暂无订单数据'}
                    </div>
                    <div class="orders-empty-state__description">
                        ${hasFilters ? '请尝试调整筛选条件或清除筛选' : '还没有创建任何充值订单'}
                    </div>
                    ${hasFilters ? `
                        <button class="btn btn-secondary" onclick="window.rechargeManagement.clearAllFilters()">
                            清除筛选条件
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="window.rechargeManagement.switchTab('create')">
                            创建第一个订单
                        </button>
                    `}
                </div>
            `;
        }

        bindOrderCardEvents() {
            // Card checkboxes
            const orderCheckboxes = CJUtils.$('.order-checkbox');
            orderCheckboxes.forEach(checkbox => {
                CJUtils.on(checkbox, 'change', (e) => {
                    const orderId = e.target.value;
                    const card = e.target.closest('.order-card');
                    
                    if (e.target.checked) {
                        this.selectedOrders.add(orderId);
                        card.classList.add('selected');
                    } else {
                        this.selectedOrders.delete(orderId);
                        card.classList.remove('selected');
                    }
                    
                    this.updateSelectAllOrdersState();
                    this.updateBulkActionsBar();
                });
            });

            // Card action buttons
            const actionButtons = CJUtils.$('.order-card__action');
            actionButtons.forEach(button => {
                CJUtils.on(button, 'click', (e) => {
                    const action = e.target.dataset.action;
                    const orderId = e.target.dataset.orderId;
                    this.handleOrderAction(action, orderId);
                });
            });
        }

        // ==========================================================================
        // Table Rendering (List View)
        // ==========================================================================

        renderOrdersTable() {
            const tbody = CJUtils.$('#ordersTableBody');
            if (!tbody) return;

            if (this.filteredOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-center">
                            <div class="empty-state">
                                <p>暂无订单数据</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.filteredOrders.map(order => this.renderOrderRow(order)).join('');
            this.bindOrderRowEvents();
        }

        renderOrderRow(order) {
            const typeClass = order.type === 'private' ? 'private' : 'public';
            const typeText = order.type === 'private' ? '对私充值' : '对公充值';
            const statusClass = this.getStatusClass(order.status);
            const statusText = this.getStatusText(order.status);

            return `
                <tr data-order-id="${order.id}">
                    <td>
                        <input type="checkbox" class="checkbox-input order-checkbox" 
                               value="${order.id}" ${this.selectedOrders.has(order.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <span class="order-number">${order.orderNumber}</span>
                    </td>
                    <td>
                        <span class="type-badge ${typeClass}">${typeText}</span>
                    </td>
                    <td>
                        <div class="payer-info">
                            <div class="payer-name">${order.payerName}</div>
                            <div class="payer-account">${order.payerAccount}</div>
                        </div>
                    </td>
                    <td>
                        <span class="amount">¥${CJUtils.formatNumber(order.amount, 2)}</span>
                    </td>
                    <td>${order.merchantName}</td>
                    <td>${order.adAccount}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td>${CJUtils.formatDate(order.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" data-action="view" data-order-id="${order.id}">
                                查看
                            </button>
                            ${order.status === 'pending' ? `
                                <button class="action-btn cancel" data-action="cancel" data-order-id="${order.id}">
                                    取消
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }

        renderAuditTable() {
            const tbody = CJUtils.$('#auditTableBody');
            if (!tbody) return;

            if (this.auditOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center">
                            <div class="empty-state">
                                <p>暂无审核订单</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.auditOrders.map(order => this.renderAuditRow(order)).join('');
            this.bindAuditRowEvents();
        }

        renderAuditRow(order) {
            const typeClass = order.type === 'private' ? 'private' : 'public';
            const typeText = order.type === 'private' ? '对私充值' : '对公充值';
            const statusClass = this.getStatusClass(order.status);
            const statusText = this.getStatusText(order.status);

            return `
                <tr data-order-id="${order.id}">
                    <td>
                        <input type="checkbox" class="checkbox-input audit-checkbox" 
                               value="${order.id}" ${this.selectedAuditOrders.has(order.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <span class="order-number">${order.orderNumber}</span>
                    </td>
                    <td>
                        <span class="type-badge ${typeClass}">${typeText}</span>
                    </td>
                    <td>
                        <div class="payer-info">
                            <div class="payer-name">${order.payerName}</div>
                            <div class="payer-account">${order.payerAccount}</div>
                        </div>
                    </td>
                    <td>
                        <span class="amount">¥${CJUtils.formatNumber(order.amount, 2)}</span>
                    </td>
                    <td>${order.merchantName}</td>
                    <td>
                        <div class="receiver-info">
                            <div class="receiver-name">${order.receiverName}</div>
                            <div class="receiver-account">${order.receiverAccount}</div>
                        </div>
                    </td>
                    <td>
                        ${order.voucherUrl ? `
                            <button class="action-btn view" onclick="window.open('${order.voucherUrl}', '_blank')">
                                查看凭证
                            </button>
                        ` : '<span class="no-voucher">无凭证</span>'}
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td>${CJUtils.formatDate(order.createdAt)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" data-action="view" data-order-id="${order.id}">
                                详情
                            </button>
                            ${order.status === 'pending' ? `
                                <button class="action-btn approve" data-action="approve" data-order-id="${order.id}">
                                    通过
                                </button>
                                <button class="action-btn reject" data-action="reject" data-order-id="${order.id}">
                                    拒绝
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }

        bindOrderRowEvents() {
            // Order checkboxes
            const orderCheckboxes = CJUtils.$('.order-checkbox');
            orderCheckboxes.forEach(checkbox => {
                CJUtils.on(checkbox, 'change', (e) => {
                    const orderId = e.target.value;
                    if (e.target.checked) {
                        this.selectedOrders.add(orderId);
                    } else {
                        this.selectedOrders.delete(orderId);
                    }
                    this.updateSelectAllOrdersState();
                });
            });

            // Action buttons
            const actionButtons = CJUtils.$('.action-btn');
            actionButtons.forEach(button => {
                CJUtils.on(button, 'click', (e) => {
                    const action = e.target.dataset.action;
                    const orderId = e.target.dataset.orderId;
                    this.handleOrderAction(action, orderId);
                });
            });
        }

        bindAuditRowEvents() {
            // Audit checkboxes
            const auditCheckboxes = CJUtils.$('.audit-checkbox');
            auditCheckboxes.forEach(checkbox => {
                CJUtils.on(checkbox, 'change', (e) => {
                    const orderId = e.target.value;
                    if (e.target.checked) {
                        this.selectedAuditOrders.add(orderId);
                    } else {
                        this.selectedAuditOrders.delete(orderId);
                    }
                    this.updateSelectAllAuditState();
                    this.updateBatchActionButtons();
                });
            });

            // Action buttons
            const actionButtons = CJUtils.$('.action-btn');
            actionButtons.forEach(button => {
                CJUtils.on(button, 'click', (e) => {
                    const action = e.target.dataset.action;
                    const orderId = e.target.dataset.orderId;
                    this.handleAuditOrderAction(action, orderId);
                });
            });
        }

        // ==========================================================================
        // Create Recharge
        // ==========================================================================

        selectRechargeType(type) {
            // Update UI
            const typeOptions = CJUtils.$('.type-option');
            typeOptions.forEach(option => {
                if (option.dataset.type === type) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });

            // Set form type
            const rechargeTypeInput = CJUtils.$('#rechargeType');
            if (rechargeTypeInput) {
                rechargeTypeInput.value = type;
            }

            // Show form
            const formContainer = CJUtils.$('#createFormContainer');
            if (formContainer) {
                formContainer.style.display = 'block';
            }
        }

        async handleCreateRecharge() {
            const form = CJUtils.$('#createRechargeForm');
            if (!form) return;

            const formData = new FormData(form);
            const rechargeData = {
                type: formData.get('type'),
                payerName: formData.get('payerName'),
                payerAccount: formData.get('payerAccount'),
                amount: parseFloat(formData.get('amount')),
                merchantId: formData.get('merchantId'),
                merchantName: formData.get('merchantName'),
                adAccount: formData.get('adAccount'),
                remark: formData.get('remark')
            };

            // Validate form
            if (!this.validateCreateForm(rechargeData)) {
                return;
            }

            this.setCreateFormLoading(true);

            try {
                const response = await CJApi.post('/api/recharge/orders', rechargeData);

                if (response.success) {
                    CJComponents.toast.success('充值订单创建成功');
                    
                    // Redirect based on type
                    if (rechargeData.type === 'private') {
                        window.location.href = `/recharge/private?order=${response.data.orderNumber}`;
                    } else {
                        window.location.href = `/recharge/public?order=${response.data.orderNumber}`;
                    }
                } else {
                    CJComponents.toast.error(response.message || '创建订单失败');
                }
            } catch (error) {
                console.error('Create recharge error:', error);
                CJComponents.toast.error('创建订单失败，请稍后重试');
            } finally {
                this.setCreateFormLoading(false);
            }
        }

        validateCreateForm(data) {
            let isValid = true;

            // Validate type
            if (!data.type) {
                CJComponents.toast.error('请选择充值类型');
                return false;
            }

            // Validate payer name
            if (!data.payerName || data.payerName.trim().length < 2) {
                this.showFieldError('payerName', '付款人姓名至少需要2个字符');
                isValid = false;
            }

            // Validate payer account
            if (!data.payerAccount || data.payerAccount.trim().length < 6) {
                this.showFieldError('payerAccount', '付款账号格式不正确');
                isValid = false;
            }

            // Validate amount
            if (!data.amount || data.amount <= 0) {
                this.showFieldError('amount', '充值金额必须大于0');
                isValid = false;
            }

            // Validate merchant
            if (!data.merchantId) {
                this.showFieldError('merchantName', '请选择有效的商户');
                isValid = false;
            }

            // Validate ad account
            if (!data.adAccount || data.adAccount.trim().length < 2) {
                this.showFieldError('adAccount', '广告账户名称至少需要2个字符');
                isValid = false;
            }

            return isValid;
        }

        validateCreateFormField(input) {
            const value = input.value.trim();
            const name = input.name;

            switch (name) {
                case 'payerName':
                    if (!value) {
                        this.showFieldError(name, '请输入付款人姓名');
                        return false;
                    } else if (value.length < 2) {
                        this.showFieldError(name, '付款人姓名至少需要2个字符');
                        return false;
                    }
                    break;

                case 'payerAccount':
                    if (!value) {
                        this.showFieldError(name, '请输入付款账号');
                        return false;
                    } else if (value.length < 6) {
                        this.showFieldError(name, '付款账号格式不正确');
                        return false;
                    }
                    break;

                case 'amount':
                    const amount = parseFloat(value);
                    if (!value || isNaN(amount) || amount <= 0) {
                        this.showFieldError(name, '充值金额必须大于0');
                        return false;
                    }
                    break;

                case 'merchantName':
                    if (!value) {
                        this.showFieldError(name, '请输入商户名称');
                        return false;
                    }
                    break;

                case 'adAccount':
                    if (!value) {
                        this.showFieldError(name, '请输入广告账户名称');
                        return false;
                    } else if (value.length < 2) {
                        this.showFieldError(name, '广告账户名称至少需要2个字符');
                        return false;
                    }
                    break;
            }

            this.clearFieldError(name);
            return true;
        }

        resetCreateForm() {
            const form = CJUtils.$('#createRechargeForm');
            if (form) {
                form.reset();
            }

            // Reset type selection
            const typeOptions = CJUtils.$('.type-option');
            typeOptions.forEach(option => {
                option.classList.remove('selected');
            });

            // Hide form
            const formContainer = CJUtils.$('#createFormContainer');
            if (formContainer) {
                formContainer.style.display = 'none';
            }

            // Clear errors
            this.clearAllFieldErrors();
        }

        // ==========================================================================
        // Merchant Search
        // ==========================================================================

        handleMerchantSearch(query) {
            if (!query || query.length < 2) {
                this.hideMerchantSuggestions();
                return;
            }

            const filteredMerchants = this.merchants.filter(merchant => 
                merchant.name.toLowerCase().includes(query.toLowerCase()) ||
                merchant.code.toLowerCase().includes(query.toLowerCase())
            );

            this.showMerchantSuggestions(filteredMerchants);
        }

        showMerchantSuggestions(merchants) {
            const suggestions = CJUtils.$('#merchantSuggestions');
            if (!suggestions) return;

            if (merchants.length === 0) {
                suggestions.innerHTML = '<div class="suggestion-item">未找到匹配的商户</div>';
            } else {
                suggestions.innerHTML = merchants.map(merchant => `
                    <div class="suggestion-item" data-merchant-id="${merchant.id}" data-merchant-name="${merchant.name}">
                        <div class="suggestion-name">${merchant.name}</div>
                        <div class="suggestion-code">${merchant.code}</div>
                    </div>
                `).join('');

                // Bind click events
                const suggestionItems = suggestions.querySelectorAll('.suggestion-item');
                suggestionItems.forEach(item => {
                    CJUtils.on(item, 'click', () => {
                        this.selectMerchant(item.dataset.merchantId, item.dataset.merchantName);
                    });
                });
            }

            suggestions.classList.add('show');
        }

        hideMerchantSuggestions() {
            const suggestions = CJUtils.$('#merchantSuggestions');
            if (suggestions) {
                suggestions.classList.remove('show');
            }
        }

        selectMerchant(merchantId, merchantName) {
            const merchantInput = CJUtils.$('#merchantName');
            const merchantIdInput = CJUtils.$('#merchantId');

            if (merchantInput) {
                merchantInput.value = merchantName;
            }

            if (merchantIdInput) {
                merchantIdInput.value = merchantId;
            }

            this.hideMerchantSuggestions();
            this.clearFieldError('merchantName');
        }

        // ==========================================================================
        // Order Actions
        // ==========================================================================

        async handleOrderAction(action, orderId) {
            const order = this.orders.find(o => o.id === orderId);
            if (!order) return;

            switch (action) {
                case 'view':
                    this.showOrderDetail(order);
                    break;
                case 'cancel':
                    await this.cancelOrder(order);
                    break;
            }
        }

        async handleAuditOrderAction(action, orderId) {
            const order = this.auditOrders.find(o => o.id === orderId);
            if (!order) return;

            switch (action) {
                case 'view':
                    this.showOrderDetail(order, true);
                    break;
                case 'approve':
                    this.currentAuditOrder = order;
                    this.showAuditActionModal('approve');
                    break;
                case 'reject':
                    this.currentAuditOrder = order;
                    this.showAuditActionModal('reject');
                    break;
            }
        }

        async cancelOrder(order) {
            const confirmed = await CJComponents.Modal.confirm(
                `确定要取消订单 "${order.orderNumber}" 吗？`,
                '取消后订单将无法恢复。'
            );

            if (!confirmed) return;

            try {
                const response = await CJApi.post(`/api/recharge/orders/${order.id}/cancel`);
                
                if (response.success) {
                    CJComponents.toast.success('订单取消成功');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error(response.message || '订单取消失败');
                }
            } catch (error) {
                console.error('Cancel order error:', error);
                CJComponents.toast.error('订单取消失败');
            }
        }

        // ==========================================================================
        // Order Detail Modal
        // ==========================================================================

        showOrderDetail(order, showAuditActions = false) {
            const modal = CJUtils.$('#orderDetailModal');
            if (!modal) return;

            // Populate order details
            this.populateOrderDetail(order);

            // Show/hide audit actions
            const auditActions = CJUtils.$('#orderAuditActions');
            if (auditActions) {
                auditActions.style.display = showAuditActions && order.status === 'pending' ? 'flex' : 'none';
            }

            // Store current order for audit actions
            this.currentAuditOrder = order;

            // Show modal
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        }

        hideOrderDetailModal() {
            const modal = CJUtils.$('#orderDetailModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        }

        populateOrderDetail(order) {
            CJUtils.$('#detailOrderNumber').textContent = order.orderNumber || '';
            CJUtils.$('#detailType').textContent = order.type === 'private' ? '对私充值' : '对公充值';
            CJUtils.$('#detailPayerName').textContent = order.payerName || '';
            CJUtils.$('#detailPayerAccount').textContent = order.payerAccount || '';
            CJUtils.$('#detailAmount').textContent = `¥${CJUtils.formatNumber(order.amount, 2)}`;
            CJUtils.$('#detailMerchantName').textContent = order.merchantName || '';
            CJUtils.$('#detailAdAccount').textContent = order.adAccount || '';
            CJUtils.$('#detailReceiverName').textContent = order.receiverName || '';
            CJUtils.$('#detailReceiverAccount').textContent = order.receiverAccount || '';
            CJUtils.$('#detailStatus').textContent = this.getStatusText(order.status);
            CJUtils.$('#detailStatus').className = `status status-badge ${this.getStatusClass(order.status)}`;
            CJUtils.$('#detailCreatedAt').textContent = CJUtils.formatDate(order.createdAt);
            CJUtils.$('#detailUpdatedAt').textContent = CJUtils.formatDate(order.updatedAt);
            CJUtils.$('#detailRemark').textContent = order.remark || '无备注';

            // Load voucher if exists
            this.loadOrderVoucher(order);

            // Load status logs
            this.loadOrderStatusLogs(order.id);
        }

        loadOrderVoucher(order) {
            const voucherPreview = CJUtils.$('#voucherPreview');
            const voucherSection = CJUtils.$('#voucherSection');
            
            if (!voucherPreview || !voucherSection) return;

            if (order.voucherUrl) {
                voucherSection.style.display = 'block';
                
                if (order.voucherUrl.toLowerCase().includes('.pdf')) {
                    voucherPreview.innerHTML = `
                        <div class="pdf-preview">
                            <p>PDF 文件</p>
                            <button class="btn btn-secondary" onclick="window.open('${order.voucherUrl}', '_blank')">
                                查看PDF
                            </button>
                        </div>
                    `;
                } else {
                    voucherPreview.innerHTML = `
                        <img src="${order.voucherUrl}" alt="付款凭证" onclick="window.open('${order.voucherUrl}', '_blank')" style="cursor: pointer;">
                    `;
                }
            } else {
                voucherSection.style.display = 'none';
            }
        }

        async loadOrderStatusLogs(orderId) {
            try {
                const response = await CJApi.get(`/api/recharge/orders/${orderId}/logs`);
                
                if (response.success) {
                    this.renderStatusLogs(response.data.logs || []);
                }
            } catch (error) {
                console.error('Load status logs error:', error);
            }
        }

        renderStatusLogs(logs) {
            const statusLogs = CJUtils.$('#statusLogs');
            if (!statusLogs) return;

            if (logs.length === 0) {
                statusLogs.innerHTML = '<p class="no-logs">暂无状态变更记录</p>';
                return;
            }

            statusLogs.innerHTML = logs.map(log => `
                <div class="status-log-item">
                    <div class="status-log-icon ${log.status}">
                        ${this.getStatusIcon(log.status)}
                    </div>
                    <div class="status-log-content">
                        <div class="status-log-title">${this.getStatusText(log.status)}</div>
                        <div class="status-log-time">${CJUtils.formatDate(log.createdAt)}</div>
                        ${log.remark ? `<div class="status-log-remark">${log.remark}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }

        // ==========================================================================
        // Audit Actions
        // ==========================================================================

        showAuditActionModal(action) {
            const modal = CJUtils.$('#auditActionModal');
            const title = CJUtils.$('#auditActionTitle');
            const submitBtn = CJUtils.$('#auditActionSubmit');
            const actionInput = CJUtils.$('#auditAction');
            const orderIdInput = CJUtils.$('#auditOrderId');

            if (!modal || !this.currentAuditOrder) return;

            // Set action
            if (actionInput) {
                actionInput.value = action;
            }

            if (orderIdInput) {
                orderIdInput.value = this.currentAuditOrder.id;
            }

            // Update UI based on action
            if (action === 'approve') {
                title.textContent = '审核通过';
                submitBtn.textContent = '确认通过';
                submitBtn.className = 'btn btn-success';
            } else {
                title.textContent = '审核拒绝';
                submitBtn.textContent = '确认拒绝';
                submitBtn.className = 'btn btn-danger';
            }

            // Show modal
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
        }

        hideAuditActionModal() {
            const modal = CJUtils.$('#auditActionModal');
            const form = CJUtils.$('#auditActionForm');
            
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }

            if (form) {
                form.reset();
            }
        }

        async handleAuditAction() {
            const form = CJUtils.$('#auditActionForm');
            if (!form) return;

            const formData = new FormData(form);
            const auditData = {
                orderId: formData.get('orderId'),
                action: formData.get('action'),
                remark: formData.get('remark')
            };

            this.setAuditActionLoading(true);

            try {
                const response = await CJApi.post('/api/recharge/audit', auditData);

                if (response.success) {
                    CJComponents.toast.success(auditData.action === 'approve' ? '审核通过成功' : '审核拒绝成功');
                    this.hideAuditActionModal();
                    this.hideOrderDetailModal();
                    this.loadAuditOrders();
                    this.loadAuditStats();
                } else {
                    CJComponents.toast.error(response.message || '审核操作失败');
                }
            } catch (error) {
                console.error('Audit action error:', error);
                CJComponents.toast.error('审核操作失败');
            } finally {
                this.setAuditActionLoading(false);
            }
        }

        async handleBatchApprove() {
            if (this.selectedAuditOrders.size === 0) {
                CJComponents.toast.warning('请选择要批量通过的订单');
                return;
            }

            const confirmed = await CJComponents.Modal.confirm(
                `确定要批量通过选中的 ${this.selectedAuditOrders.size} 个订单吗？`,
                '批量通过后将自动为对应广告账户充值。'
            );

            if (!confirmed) return;

            try {
                const response = await CJApi.post('/api/recharge/audit/batch', {
                    action: 'approve',
                    orderIds: Array.from(this.selectedAuditOrders)
                });

                if (response.success) {
                    CJComponents.toast.success('批量审核通过成功');
                    this.selectedAuditOrders.clear();
                    this.loadAuditOrders();
                    this.loadAuditStats();
                    this.updateBatchActionButtons();
                } else {
                    CJComponents.toast.error(response.message || '批量审核失败');
                }
            } catch (error) {
                console.error('Batch approve error:', error);
                CJComponents.toast.error('批量审核失败');
            }
        }

        async handleBatchReject() {
            if (this.selectedAuditOrders.size === 0) {
                CJComponents.toast.warning('请选择要批量拒绝的订单');
                return;
            }

            const reason = await CJComponents.Modal.prompt(
                '批量拒绝原因',
                '请输入拒绝原因：',
                '订单信息不符合要求'
            );

            if (!reason) return;

            try {
                const response = await CJApi.post('/api/recharge/audit/batch', {
                    action: 'reject',
                    orderIds: Array.from(this.selectedAuditOrders),
                    remark: reason
                });

                if (response.success) {
                    CJComponents.toast.success('批量审核拒绝成功');
                    this.selectedAuditOrders.clear();
                    this.loadAuditOrders();
                    this.loadAuditStats();
                    this.updateBatchActionButtons();
                } else {
                    CJComponents.toast.error(response.message || '批量审核失败');
                }
            } catch (error) {
                console.error('Batch reject error:', error);
                CJComponents.toast.error('批量审核失败');
            }
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        updateStats(stats) {
            CJUtils.$('#totalOrders').textContent = stats.totalOrders || 0;
            CJUtils.$('#totalAmount').textContent = `¥${CJUtils.formatNumber(stats.totalAmount || 0, 2)}`;
            CJUtils.$('#pendingOrders').textContent = stats.pendingOrders || 0;
            CJUtils.$('#completedOrders').textContent = stats.completedOrders || 0;
        }

        updateAuditStats(stats) {
            CJUtils.$('#pendingAuditCount').textContent = stats.pendingCount || 0;
            CJUtils.$('#pendingAuditAmount').textContent = `¥${CJUtils.formatNumber(stats.pendingAmount || 0, 2)}`;
            CJUtils.$('#todayAuditCount').textContent = stats.todayCount || 0;
            CJUtils.$('#todayAuditAmount').textContent = `¥${CJUtils.formatNumber(stats.todayAmount || 0, 2)}`;
        }

        renderOrdersPagination() {
            // Implementation similar to user management pagination
            // ... (pagination logic)
        }

        renderAuditPagination() {
            // Implementation similar to user management pagination
            // ... (pagination logic)
        }

        toggleSelectAllOrders(checked) {
            const orderCheckboxes = CJUtils.$('.order-checkbox');
            orderCheckboxes.forEach(checkbox => {
                checkbox.checked = checked;
                const orderId = checkbox.value;
                if (checked) {
                    this.selectedOrders.add(orderId);
                } else {
                    this.selectedOrders.delete(orderId);
                }
            });
        }

        toggleSelectAllAudit(checked) {
            const auditCheckboxes = CJUtils.$('.audit-checkbox');
            auditCheckboxes.forEach(checkbox => {
                checkbox.checked = checked;
                const orderId = checkbox.value;
                if (checked) {
                    this.selectedAuditOrders.add(orderId);
                } else {
                    this.selectedAuditOrders.delete(orderId);
                }
            });
            this.updateBatchActionButtons();
        }

        updateSelectAllOrdersState() {
            const selectAll = CJUtils.$('#selectAllOrders');
            const orderCheckboxes = CJUtils.$('.order-checkbox');
            
            if (selectAll && orderCheckboxes.length > 0) {
                const checkedCount = orderCheckboxes.filter(cb => cb.checked).length;
                selectAll.checked = checkedCount === orderCheckboxes.length;
                selectAll.indeterminate = checkedCount > 0 && checkedCount < orderCheckboxes.length;
            }
        }

        updateSelectAllAuditState() {
            const selectAll = CJUtils.$('#selectAllAudit');
            const auditCheckboxes = CJUtils.$('.audit-checkbox');
            
            if (selectAll && auditCheckboxes.length > 0) {
                const checkedCount = auditCheckboxes.filter(cb => cb.checked).length;
                selectAll.checked = checkedCount === auditCheckboxes.length;
                selectAll.indeterminate = checkedCount > 0 && checkedCount < auditCheckboxes.length;
            }
        }

        updateBatchActionButtons() {
            const batchApproveBtn = CJUtils.$('#batchApproveBtn');
            const batchRejectBtn = CJUtils.$('#batchRejectBtn');
            const hasSelection = this.selectedAuditOrders.size > 0;

            if (batchApproveBtn) {
                batchApproveBtn.disabled = !hasSelection;
            }

            if (batchRejectBtn) {
                batchRejectBtn.disabled = !hasSelection;
            }
        }

        async exportOrders() {
            try {
                const response = await CJApi.get('/api/recharge/orders/export', {
                    params: this.filters,
                    responseType: 'blob'
                });

                // Create download link
                const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `recharge_orders_${CJUtils.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                CJComponents.toast.success('订单数据导出成功');
            } catch (error) {
                console.error('Export orders error:', error);
                CJComponents.toast.error('导出失败');
            }
        }

        getStatusClass(status) {
            const statusMap = {
                'pending': 'pending',
                'processing': 'processing',
                'completed': 'completed',
                'failed': 'failed',
                'cancelled': 'cancelled'
            };
            return statusMap[status] || 'pending';
        }

        getStatusText(status) {
            const statusMap = {
                'pending': '待处理',
                'processing': '处理中',
                'completed': '已完成',
                'failed': '失败',
                'cancelled': '已取消'
            };
            return statusMap[status] || status;
        }

        getStatusIcon(status) {
            const iconMap = {
                'pending': '⏳',
                'processing': '⚙️',
                'completed': '✅',
                'failed': '❌',
                'cancelled': '🚫'
            };
            return iconMap[status] || '❓';
        }

        showFieldError(fieldName, message) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = message;
            }
            
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }

        clearFieldError(fieldName) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = '';
            }
            
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }

        clearAllFieldErrors() {
            const errorElements = CJUtils.$('.form-error');
            const inputElements = CJUtils.$('.form-input.error');
            
            errorElements.forEach(el => el.textContent = '');
            inputElements.forEach(el => el.classList.remove('error'));
        }

        setLoading(loading) {
            this.isLoading = loading;
            const tableContainer = CJUtils.$('#ordersTableContainer');
            
            if (tableContainer) {
                if (loading) {
                    tableContainer.classList.add('loading');
                } else {
                    tableContainer.classList.remove('loading');
                }
            }
        }

        setCreateFormLoading(loading) {
            const submitBtn = CJUtils.$('#submitCreateBtn');
            
            if (submitBtn) {
                if (loading) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                } else {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        }

        setAuditActionLoading(loading) {
            const submitBtn = CJUtils.$('#auditActionSubmit');
            
            if (submitBtn) {
                if (loading) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                } else {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        }
    }

        // ==========================================================================
        // Enhanced Card Event Binding
        // ==========================================================================

        /**
         * Bind events to order cards
         */
        bindOrderCardEvents() {
            const orderCards = document.querySelectorAll('.order-card');
            
            orderCards.forEach(card => {
                // Card selection
                const checkbox = card.querySelector('.order-checkbox');
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        const orderId = e.target.value;
                        if (e.target.checked) {
                            this.selectedOrders.add(orderId);
                            card.classList.add('selected');
                        } else {
                            this.selectedOrders.delete(orderId);
                            card.classList.remove('selected');
                        }
                        this.updateBulkActionsVisibility();
                        this.updateSelectAllState();
                    });
                }

                // Card actions
                const actionButtons = card.querySelectorAll('.order-card__action');
                actionButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const action = button.dataset.action;
                        const orderId = button.dataset.orderId;
                        this.handleOrderAction(action, orderId);
                    });
                });

                // Card click for selection (optional)
                card.addEventListener('click', (e) => {
                    // Only select if clicking on the card itself, not on buttons
                    if (e.target === card || e.target.closest('.order-card__detail')) {
                        const checkbox = card.querySelector('.order-checkbox');
                        if (checkbox) {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change'));
                        }
                    }
                });

                // Hover effects for better UX
                card.addEventListener('mouseenter', () => {
                    if (!card.classList.contains('selected')) {
                        card.style.transform = 'translateY(-2px)';
                    }
                });

                card.addEventListener('mouseleave', () => {
                    if (!card.classList.contains('selected')) {
                        card.style.transform = '';
                    }
                });
            });
        }

        /**
         * Handle order actions
         */
        handleOrderAction(action, orderId) {
            const order = this.orders.find(o => o.id === orderId);
            if (!order) return;

            switch (action) {
                case 'view':
                    this.showOrderDetail(order, false);
                    break;
                case 'approve':
                    this.approveOrder(orderId);
                    break;
                case 'reject':
                    this.rejectOrder(orderId);
                    break;
                case 'cancel':
                    this.cancelOrder(orderId);
                    break;
                case 'complete':
                    this.completeOrder(orderId);
                    break;
                case 'retry':
                    this.retryOrder(orderId);
                    break;
                case 'receipt':
                    this.showReceipt(orderId);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        }

        /**
         * Update bulk actions visibility
         */
        updateBulkActionsVisibility() {
            const bulkActionsBar = document.getElementById('bulkActionsBar');
            const selectedCount = document.getElementById('selectedOrdersCount');
            
            if (bulkActionsBar && selectedCount) {
                const hasSelected = this.selectedOrders.size > 0;
                bulkActionsBar.style.display = hasSelected ? 'flex' : 'none';
                selectedCount.textContent = this.selectedOrders.size;
            }
        }

        /**
         * Update select all checkbox state
         */
        updateSelectAllState() {
            const selectAllCheckbox = document.getElementById('selectAllOrders');
            if (selectAllCheckbox) {
                const visibleOrders = this.filteredOrders.length;
                const selectedVisible = this.filteredOrders.filter(order => 
                    this.selectedOrders.has(order.id)
                ).length;

                if (selectedVisible === 0) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                } else if (selectedVisible === visibleOrders) {
                    selectAllCheckbox.checked = true;
                    selectAllCheckbox.indeterminate = false;
                } else {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = true;
                }
            }
        }

        /**
         * Toggle select all orders
         */
        toggleSelectAllOrders(checked) {
            this.filteredOrders.forEach(order => {
                if (checked) {
                    this.selectedOrders.add(order.id);
                } else {
                    this.selectedOrders.delete(order.id);
                }
            });

            // Update card visual states
            const orderCards = document.querySelectorAll('.order-card');
            orderCards.forEach(card => {
                const checkbox = card.querySelector('.order-checkbox');
                const orderId = checkbox?.value;
                
                if (orderId && this.filteredOrders.some(order => order.id === orderId)) {
                    checkbox.checked = checked;
                    if (checked) {
                        card.classList.add('selected');
                    } else {
                        card.classList.remove('selected');
                    }
                }
            });

            this.updateBulkActionsVisibility();
        }

        /**
         * Deselect all orders
         */
        deselectAllOrders() {
            this.selectedOrders.clear();
            
            const orderCards = document.querySelectorAll('.order-card');
            orderCards.forEach(card => {
                const checkbox = card.querySelector('.order-checkbox');
                if (checkbox) {
                    checkbox.checked = false;
                }
                card.classList.remove('selected');
            });

            this.updateBulkActionsVisibility();
            this.updateSelectAllState();
        }

        // ==========================================================================
        // Order Action Methods
        // ==========================================================================

        async approveOrder(orderId) {
            try {
                const response = await CJApi.post(`/api/recharge/orders/${orderId}/approve`);
                if (response.success) {
                    CJComponents.toast.success('订单审核通过');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error('审核失败: ' + response.message);
                }
            } catch (error) {
                console.error('Approve order error:', error);
                CJComponents.toast.error('审核失败');
            }
        }

        async rejectOrder(orderId) {
            try {
                const response = await CJApi.post(`/api/recharge/orders/${orderId}/reject`);
                if (response.success) {
                    CJComponents.toast.success('订单已拒绝');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error('拒绝失败: ' + response.message);
                }
            } catch (error) {
                console.error('Reject order error:', error);
                CJComponents.toast.error('拒绝失败');
            }
        }

        async cancelOrder(orderId) {
            if (!confirm('确定要取消这个订单吗？')) return;

            try {
                const response = await CJApi.post(`/api/recharge/orders/${orderId}/cancel`);
                if (response.success) {
                    CJComponents.toast.success('订单已取消');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error('取消失败: ' + response.message);
                }
            } catch (error) {
                console.error('Cancel order error:', error);
                CJComponents.toast.error('取消失败');
            }
        }

        async completeOrder(orderId) {
            try {
                const response = await CJApi.post(`/api/recharge/orders/${orderId}/complete`);
                if (response.success) {
                    CJComponents.toast.success('订单已完成');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error('完成失败: ' + response.message);
                }
            } catch (error) {
                console.error('Complete order error:', error);
                CJComponents.toast.error('完成失败');
            }
        }

        async retryOrder(orderId) {
            try {
                const response = await CJApi.post(`/api/recharge/orders/${orderId}/retry`);
                if (response.success) {
                    CJComponents.toast.success('订单重新处理中');
                    this.loadOrders();
                } else {
                    CJComponents.toast.error('重试失败: ' + response.message);
                }
            } catch (error) {
                console.error('Retry order error:', error);
                CJComponents.toast.error('重试失败');
            }
        }

        showReceipt(orderId) {
            // Open receipt in new window or modal
            window.open(`/api/recharge/orders/${orderId}/receipt`, '_blank');
        }

        showOrderDetailModal(order) {
            // Use existing modal functionality - there's already a showOrderDetail method
            // Call the existing method with the order parameter
            if (typeof this.showOrderDetail === 'function') {
                this.showOrderDetail(order, false);
            }
        }

        /**
         * Set loading state
         */
        setLoading(loading) {
            this.isLoading = loading;
            const cardGrid = document.getElementById('ordersCardGrid');
            
            if (loading && cardGrid) {
                cardGrid.innerHTML = this.renderLoadingCards();
            }
        }

        /**
         * Render loading skeleton cards
         */
        renderLoadingCards() {
            const skeletonCards = Array(6).fill(0).map(() => `
                <div class="order-card-skeleton">
                    <div class="order-card-skeleton__header">
                        <div class="order-card-skeleton__title"></div>
                        <div class="order-card-skeleton__type"></div>
                    </div>
                    <div class="order-card-skeleton__body">
                        <div class="order-card-skeleton__amount"></div>
                        <div class="order-card-skeleton__detail"></div>
                        <div class="order-card-skeleton__detail"></div>
                        <div class="order-card-skeleton__detail"></div>
                        <div class="order-card-skeleton__detail"></div>
                    </div>
                </div>
            `).join('');

            return `<div class="orders-loading">${skeletonCards}</div>`;
        }

    return RechargeManagement;
})();