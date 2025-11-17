/**
 * Enhanced Financial Audit - Modern Workflow Management
 * 
 * 提供现代化的财务审核流程管理，包括订单处理、批量操作、
 * 智能筛选和实时数据更新功能
 */

class FinancialAuditEnhanced {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/audit',
            pageSize: 20,
            enableRealTime: true,
            autoRefresh: 30000,
            enableNotifications: true,
            ...options
        };

        // 状态管理
        this.state = {
            orders: [],
            selectedOrders: new Set(),
            currentPage: 1,
            totalPages: 1,
            totalRecords: 0,
            currentFilter: 'pending',
            sortBy: 'created_at',
            sortOrder: 'desc',
            viewMode: 'table', // table or cards
            filters: {
                paymentType: '',
                amountRange: '',
                dateRange: 'today',
                status: 'pending'
            },
            statistics: {
                pendingCount: 0,
                pendingAmount: 0,
                todayProcessed: 0,
                approvalRate: 98.5
            }
        };

        // DOM元素缓存
        this.elements = {};
        
        // 事件监听器集合
        this.listeners = [];
        
        // 初始化
        this.init();
    }

    /**
     * 初始化财务审核系统
     */
    async init() {
        try {
            this.cacheElements();
            this.bindEvents();
            await this.loadStatistics();
            await this.loadOrders();
            this.setupAutoRefresh();
            this.restoreViewPreference();
            
            // 确保初始视图正确显示
            this.initializeDefaultView();
            
            console.log('Enhanced financial audit initialized successfully');
        } catch (error) {
            console.error('Failed to initialize financial audit:', error);
            this.showToast('系统初始化失败', 'error');
        }
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        console.log('Caching DOM elements for financial audit...');
        // 统计元素
        this.elements.stats = {
            pendingCount: document.getElementById('pendingCount'),
            pendingAmount: document.getElementById('pendingAmount'),
            todayProcessed: document.getElementById('todayProcessed'),
            approvalRate: document.getElementById('approvalRate'),
            pendingTabCount: document.getElementById('pendingTabCount'),
            urgentTabCount: document.getElementById('urgentTabCount'),
            largeTabCount: document.getElementById('largeTabCount')
        };

        // 筛选相关元素
        this.elements.filters = {
            tabs: document.querySelectorAll('.filter-tab'),
            paymentType: document.getElementById('paymentTypeFilter'),
            amountRange: document.getElementById('amountRangeFilter'),
            dateRange: document.getElementById('dateRangeFilter'),
            applyBtn: document.getElementById('applyFiltersBtn'),
            resetBtn: document.getElementById('resetFiltersBtn')
        };

        // 订单列表相关元素
        this.elements.orders = {
            tableView: document.getElementById('tableView'),
            cardsView: document.getElementById('cardsView'),
            table: document.getElementById('ordersTable'),
            tableBody: document.getElementById('ordersTableBody'),
            grid: document.getElementById('ordersGrid'),
            selectAll: document.getElementById('selectAll'),
            viewButtons: document.querySelectorAll('.view-btn')
        };
        
        // 修复元素引用 - 确保视图切换正常工作
        if (!this.elements.orders.tableView) {
            console.warn('FinancialAudit: tableView element not found, searching by class');
            this.elements.orders.tableView = document.querySelector('.orders-table-view');
        }
        if (!this.elements.orders.cardsView) {
            console.warn('FinancialAudit: cardsView element not found, searching by class');
            this.elements.orders.cardsView = document.querySelector('.orders-cards-view');
        }

        // 批量操作元素
        this.elements.bulk = {
            actions: document.getElementById('bulkActions'),
            approveBtn: document.getElementById('bulkApproveBtn'),
            rejectBtn: document.getElementById('bulkRejectBtn'),
            selectedCount: document.getElementById('selectedCount')
        };

        // 分页相关元素
        this.elements.pagination = {
            container: document.getElementById('ordersPagination'),
            info: {
                start: document.getElementById('pageStart'),
                end: document.getElementById('pageEnd'),
                total: document.getElementById('totalRecords')
            },
            controls: {
                first: document.getElementById('firstPageBtn'),
                prev: document.getElementById('prevPageBtn'),
                next: document.getElementById('nextPageBtn'),
                last: document.getElementById('lastPageBtn'),
                numbers: document.getElementById('paginationNumbers')
            },
            sizeSelect: document.getElementById('pageSizeSelect')
        };

        // 模态框相关元素
        this.elements.modals = {
            orderDetail: document.getElementById('orderDetailModal'),
            approval: document.getElementById('approvalModal'),
            rejection: document.getElementById('rejectionModal')
        };

        // 其他控制元素
        this.elements.controls = {
            refreshBtn: document.getElementById('refreshDataBtn'),
            exportBtn: document.getElementById('exportAuditBtn')
        };
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 筛选Tab切换
        this.elements.filters.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget; // 使用currentTarget确保获取到正确的元素
                this.switchFilterTab(target.dataset.filter);
            });
        });

        // 筛选条件应用和重置
        if (this.elements.filters.applyBtn) {
            this.elements.filters.applyBtn.addEventListener('click', () => this.applyFilters());
        }
        
        if (this.elements.filters.resetBtn) {
            this.elements.filters.resetBtn.addEventListener('click', () => this.resetFilters());
        }

        // 视图切换
        this.elements.orders.viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // 全选功能
        if (this.elements.orders.selectAll) {
            this.elements.orders.selectAll.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // 批量操作
        if (this.elements.bulk.approveBtn) {
            this.elements.bulk.approveBtn.addEventListener('click', () => this.showBulkApprovalModal());
        }
        
        if (this.elements.bulk.rejectBtn) {
            this.elements.bulk.rejectBtn.addEventListener('click', () => this.showBulkRejectionModal());
        }

        // 分页控制
        if (this.elements.pagination.controls.first) {
            this.elements.pagination.controls.first.addEventListener('click', () => this.goToPage(1));
        }
        if (this.elements.pagination.controls.prev) {
            this.elements.pagination.controls.prev.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        if (this.elements.pagination.controls.next) {
            this.elements.pagination.controls.next.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
        if (this.elements.pagination.controls.last) {
            this.elements.pagination.controls.last.addEventListener('click', () => this.goToPage(this.state.totalPages));
        }

        // 分页大小改变
        if (this.elements.pagination.sizeSelect) {
            this.elements.pagination.sizeSelect.addEventListener('change', (e) => {
                this.options.pageSize = parseInt(e.target.value);
                this.state.currentPage = 1;
                this.loadOrders();
            });
        }

        // 刷新和导出
        if (this.elements.controls.refreshBtn) {
            this.elements.controls.refreshBtn.addEventListener('click', () => this.refreshData());
        }
        
        if (this.elements.controls.exportBtn) {
            this.elements.controls.exportBtn.addEventListener('click', () => this.exportData());
        }

        // 表头排序
        this.elements.orders.table.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => this.handleSort(th.dataset.sort));
        });
    }

    /**
     * 切换筛选Tab
     */
    switchFilterTab(filter) {
        if (this.state.currentFilter === filter) return;

        // 更新Tab状态
        this.elements.filters.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        this.state.currentFilter = filter;
        this.state.currentPage = 1;
        
        // 更新筛选条件
        this.state.filters.status = filter === 'processed' ? 'approved,rejected' : filter;
        
        // 如果新的FinancialAuditTable实例存在，使用它来切换筛选
        if (window.financialAuditTable && typeof window.financialAuditTable.applyFilters === 'function') {
            console.log('FinancialAuditEnhanced: 使用新的表格管理器切换筛选标签', filter);
            const tabFilterStats = window.financialAuditTable.applyFilters({ status: filter });
            
            // 更新统计数据
            if (tabFilterStats) {
                this.updateStatistics({
                    pendingCount: tabFilterStats.pending,
                    urgentCount: tabFilterStats.urgent,
                    largeCount: tabFilterStats.large,
                    filteredCount: tabFilterStats.filtered,
                    totalCount: tabFilterStats.total
                });
            }
        } else {
            // 使用旧的加载方法作为备用
            this.loadOrders();
        }
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        this.state.filters = {
            paymentType: this.elements.filters.paymentType?.value || '',
            amountRange: this.elements.filters.amountRange?.value || '',
            dateRange: this.elements.filters.dateRange?.value || 'today',
            status: this.state.currentFilter
        };
        
        this.state.currentPage = 1;
        
        // 如果新的FinancialAuditTable实例存在，使用它来应用筛选
        if (window.financialAuditTable && typeof window.financialAuditTable.applyFilters === 'function') {
            console.log('FinancialAuditEnhanced: 使用新的表格管理器应用筛选');
            const filterStats = window.financialAuditTable.applyFilters(this.state.filters);
            
            // 更新统计数据
            if (filterStats) {
                this.updateStatistics({
                    pendingCount: filterStats.pending,
                    urgentCount: filterStats.urgent,
                    largeCount: filterStats.large,
                    filteredCount: filterStats.filtered,
                    totalCount: filterStats.total
                });
            }
            
            this.showToast(`筛选完成，显示 ${filterStats?.filtered || 0} 条记录`, 'success');
        } else {
            // 使用旧的加载方法作为备用
            this.loadOrders();
            this.showToast('筛选条件已应用', 'success');
        }
    }

    /**
     * 重置筛选条件
     */
    resetFilters() {
        // 重置表单
        if (this.elements.filters.paymentType) this.elements.filters.paymentType.value = '';
        if (this.elements.filters.amountRange) this.elements.filters.amountRange.value = '';
        if (this.elements.filters.dateRange) this.elements.filters.dateRange.value = 'today';
        
        // 重置状态
        this.state.filters = {
            paymentType: '',
            amountRange: '',
            dateRange: 'today',
            status: 'pending'
        };
        
        this.state.currentPage = 1;
        
        // 如果新的FinancialAuditTable实例存在，使用它来重置筛选
        if (window.financialAuditTable && typeof window.financialAuditTable.applyFilters === 'function') {
            console.log('FinancialAuditEnhanced: 使用新的表格管理器重置筛选');
            const resetStats = window.financialAuditTable.applyFilters({ status: 'pending' });
            
            // 更新统计数据
            if (resetStats) {
                this.updateStatistics({
                    pendingCount: resetStats.pending,
                    urgentCount: resetStats.urgent,
                    largeCount: resetStats.large,
                    filteredCount: resetStats.filtered,
                    totalCount: resetStats.total
                });
            }
            
            this.showToast('筛选条件已重置', 'info');
        } else {
            // 使用旧的加载方法作为备用
            this.loadOrders();
            this.showToast('筛选条件已重置', 'info');
        }
    }

    /**
     * 切换视图模式
     */
    switchView(viewMode) {
        if (this.state.viewMode === viewMode) return;
        
        console.log(`FinancialAudit: 切换视图模式从 ${this.state.viewMode} 到 ${viewMode}`);
        
        // 验证元素存在
        if (!this.elements.orders.tableView || !this.elements.orders.cardsView) {
            console.error('FinancialAudit: 视图元素不存在，无法切换视图');
            return;
        }
        
        this.state.viewMode = viewMode;
        
        // 更新按钮状态
        this.elements.orders.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        
        // 添加切换动画类
        const tableView = this.elements.orders.tableView;
        const cardsView = this.elements.orders.cardsView;
        
        // 先添加切换中的类
        document.body.classList.add('view-switching');
        
        // 切换视图（使用更可靠的方式）
        if (viewMode === 'table') {
            cardsView.classList.remove('active');
            setTimeout(() => {
                tableView.classList.add('active');
                this.renderOrders();
                document.body.classList.remove('view-switching');
            }, 100);
        } else {
            tableView.classList.remove('active');
            setTimeout(() => {
                cardsView.classList.add('active');
                this.renderOrders();
                document.body.classList.remove('view-switching');
            }, 100);
        }
        
        // 保存用户偏好
        localStorage.setItem('audit-view-mode', viewMode);
        
        console.log(`FinancialAudit: 视图切换完成，当前模式: ${viewMode}`);
    }
    
    /**
     * 恢复用户的视图偏好
     */
    restoreViewPreference() {
        const savedViewMode = localStorage.getItem('audit-view-mode');
        if (savedViewMode && savedViewMode !== this.state.viewMode) {
            console.log(`FinancialAudit: 恢复保存的视图偏好: ${savedViewMode}`);
            this.switchView(savedViewMode);
        }
    }
    
    /**
     * 初始化默认视图
     */
    initializeDefaultView() {
        console.log(`FinancialAudit: 初始化默认视图模式: ${this.state.viewMode}`);
        
        // 确保DOM元素正确初始化
        if (!this.elements.orders.tableView || !this.elements.orders.cardsView) {
            console.error('FinancialAudit: 关键视图元素未找到');
            return;
        }
        
        // 清除所有active类，然后设置正确的视图
        this.elements.orders.tableView.classList.remove('active');
        this.elements.orders.cardsView.classList.remove('active');
        
        // 设置按钮状态
        this.elements.orders.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.state.viewMode);
        });
        
        // 激活正确的视图
        if (this.state.viewMode === 'table') {
            this.elements.orders.tableView.classList.add('active');
        } else {
            this.elements.orders.cardsView.classList.add('active');
        }
        
        // 重新渲染订单
        this.renderOrders();
        
        console.log(`FinancialAudit: 默认视图初始化完成`);
    }

    /**
     * 处理排序
     */
    handleSort(sortField) {
        if (this.state.sortBy === sortField) {
            // 切换排序方向
            this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortBy = sortField;
            this.state.sortOrder = 'desc';
        }

        // 更新排序指示器
        this.elements.orders.table.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sorted');
            const indicator = th.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = '↕️';
            }
        });

        const currentTh = this.elements.orders.table.querySelector(`th[data-sort="${sortField}"]`);
        if (currentTh) {
            currentTh.classList.add('sorted');
            const indicator = currentTh.querySelector('.sort-indicator');
            if (indicator) {
                indicator.textContent = this.state.sortOrder === 'asc' ? '↑' : '↓';
            }
        }

        this.loadOrders();
    }

    /**
     * 全选/取消全选
     */
    toggleSelectAll(checked) {
        const checkboxes = this.elements.orders.tableBody.querySelectorAll('input[type="checkbox"][data-order-id]');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const orderId = checkbox.dataset.orderId;
            if (checked) {
                this.state.selectedOrders.add(orderId);
            } else {
                this.state.selectedOrders.delete(orderId);
            }
        });

        this.updateBulkActions();
    }

    /**
     * 更新批量操作显示
     */
    updateBulkActions() {
        const selectedCount = this.state.selectedOrders.size;
        
        if (selectedCount > 0) {
            this.elements.bulk.actions.style.display = 'flex';
            if (this.elements.bulk.selectedCount) {
                this.elements.bulk.selectedCount.textContent = selectedCount;
            }
        } else {
            this.elements.bulk.actions.style.display = 'none';
        }

        // 更新全选状态
        if (this.elements.orders.selectAll) {
            const totalCheckboxes = this.elements.orders.tableBody.querySelectorAll('input[type="checkbox"][data-order-id]').length;
            this.elements.orders.selectAll.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
            this.elements.orders.selectAll.checked = selectedCount === totalCheckboxes && totalCheckboxes > 0;
        }
    }

    /**
     * 页面跳转
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages || page === this.state.currentPage) return;
        
        this.state.currentPage = page;
        this.loadOrders();
    }

    /**
     * 更新分页控件
     */
    updatePagination() {
        const { currentPage, totalPages, totalRecords } = this.state;
        const { pageSize } = this.options;

        // 更新信息显示
        const startRecord = (currentPage - 1) * pageSize + 1;
        const endRecord = Math.min(currentPage * pageSize, totalRecords);
        
        if (this.elements.pagination.info.start) this.elements.pagination.info.start.textContent = startRecord;
        if (this.elements.pagination.info.end) this.elements.pagination.info.end.textContent = endRecord;
        if (this.elements.pagination.info.total) this.elements.pagination.info.total.textContent = totalRecords;

        // 更新按钮状态
        if (this.elements.pagination.controls.first) {
            this.elements.pagination.controls.first.disabled = currentPage === 1;
        }
        if (this.elements.pagination.controls.prev) {
            this.elements.pagination.controls.prev.disabled = currentPage === 1;
        }
        if (this.elements.pagination.controls.next) {
            this.elements.pagination.controls.next.disabled = currentPage === totalPages;
        }
        if (this.elements.pagination.controls.last) {
            this.elements.pagination.controls.last.disabled = currentPage === totalPages;
        }

        // 生成页码
        this.generatePageNumbers();
    }

    /**
     * 生成页码按钮
     */
    generatePageNumbers() {
        if (!this.elements.pagination.controls.numbers) return;

        const { currentPage, totalPages } = this.state;
        const container = this.elements.pagination.controls.numbers;
        
        container.innerHTML = '';

        // 计算显示范围
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        // 生成页码按钮
        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = 'pagination-btn';
            button.textContent = i;
            button.addEventListener('click', () => this.goToPage(i));
            
            if (i === currentPage) {
                button.classList.add('active');
            }
            
            container.appendChild(button);
        }
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            // 模拟API调用
            const mockStats = {
                pendingCount: 23,
                pendingAmount: 125680.50,
                todayProcessed: 47,
                approvalRate: 98.5,
                urgentCount: 5,
                largeAmountCount: 8
            };

            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 100));

            this.state.statistics = mockStats;
            this.updateStatisticsDisplay();

        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    /**
     * 更新统计数据
     */
    updateStatistics(newStats) {
        // 更新内部状态
        if (newStats.pendingCount !== undefined) {
            this.state.statistics.pendingCount = newStats.pendingCount;
        }
        if (newStats.urgentCount !== undefined) {
            this.state.statistics.urgentCount = newStats.urgentCount;
        }
        if (newStats.largeCount !== undefined) {
            this.state.statistics.largeAmountCount = newStats.largeCount;
        }
        
        console.log('FinancialAuditEnhanced: 统计数据已更新', this.state.statistics);
        
        // 立即更新显示
        this.updateStatisticsDisplay();
    }

    /**
     * 更新统计显示
     */
    updateStatisticsDisplay() {
        const stats = this.state.statistics;

        if (this.elements.stats.pendingCount) {
            this.elements.stats.pendingCount.textContent = stats.pendingCount;
        }
        if (this.elements.stats.pendingAmount) {
            this.elements.stats.pendingAmount.textContent = `¥${stats.pendingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
        }
        if (this.elements.stats.todayProcessed) {
            this.elements.stats.todayProcessed.textContent = stats.todayProcessed;
        }
        if (this.elements.stats.approvalRate) {
            this.elements.stats.approvalRate.textContent = `${stats.approvalRate}%`;
        }

        // 更新Tab计数
        if (this.elements.stats.pendingTabCount) {
            this.elements.stats.pendingTabCount.textContent = stats.pendingCount;
        }
        if (this.elements.stats.urgentTabCount) {
            this.elements.stats.urgentTabCount.textContent = stats.urgentCount || 0;
        }
        if (this.elements.stats.largeTabCount) {
            this.elements.stats.largeTabCount.textContent = stats.largeAmountCount || 0;
        }
    }

    /**
     * 加载订单列表
     */
    async loadOrders() {
        try {
            this.showLoading();

            // 构建查询参数
            const params = {
                page: this.state.currentPage,
                pageSize: this.options.pageSize,
                sortBy: this.state.sortBy,
                sortOrder: this.state.sortOrder,
                ...this.state.filters
            };

            // 模拟API调用
            const mockOrders = this.generateMockOrders();
            
            // 模拟延迟 - 减少延迟时间
            await new Promise(resolve => setTimeout(resolve, 200));

            this.state.orders = mockOrders.data;
            this.state.totalRecords = mockOrders.total;
            this.state.totalPages = Math.ceil(mockOrders.total / this.options.pageSize);

            this.renderOrders();
            this.updatePagination();
            this.hideLoading();

        } catch (error) {
            console.error('Failed to load orders:', error);
            this.hideLoading();
            this.showError('加载订单失败，请重试');
        }
    }

    /**
     * 生成模拟订单数据
     */
    generateMockOrders() {
        const mockData = [];
        const total = this.state.currentFilter === 'pending' ? 23 : 156;
        const pageSize = this.options.pageSize;
        const startIndex = (this.state.currentPage - 1) * pageSize;
        
        console.log(`FinancialAudit: 生成模拟数据 - 总数: ${total}, 页大小: ${pageSize}, 当前页: ${this.state.currentPage}, 起始索引: ${startIndex}`);
        
        for (let i = 0; i < Math.min(pageSize, total - startIndex); i++) {
            const orderId = `ORD${String(Date.now() + i).slice(-6)}`;
            const amount = Math.floor(Math.random() * 50000) + 1000;
            const businessType = Math.random() > 0.5 ? 'corporate' : 'personal';
            const status = this.state.currentFilter === 'processed' ? (Math.random() > 0.8 ? 'rejected' : 'approved') : 'pending';
            const transactionStatus = Math.random() > 0.3 ? 'success' : (Math.random() > 0.5 ? 'pending' : 'failed');
            
            mockData.push({
                id: orderId,
                orderNumber: orderId,
                bankVoucherNumber: `BK${String(Date.now() + i).slice(-8)}`,
                amount: amount,
                payerName: `付款人${i + 1}`,
                payerAccountName: `${businessType === 'corporate' ? '企业' : '个人'}付款账户${i + 1}`,
                payerAccount: `6214**********${String(Math.random()).slice(-4)}`,
                payerBank: ['中国工商银行', '中国建设银行', '招商银行', '中国农业银行'][i % 4],
                merchantName: `商户${i + 1}`,
                adAccount: `AD${String(Math.random()).slice(-6)}`,
                receiverName: `收款人${i + 1}`,
                receiverAccountName: `${businessType === 'corporate' ? '企业' : '个人'}收款账户${i + 1}`,
                receiverAccount: `收款账户${i + 1}`,
                businessType: businessType,
                status: status,
                transactionStatus: transactionStatus,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                successAt: transactionStatus === 'success' ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null,
                priority: Math.random() > 0.7 ? 'urgent' : (Math.random() > 0.5 ? 'high' : 'normal'),
                paymentType: businessType === 'corporate' ? 'public' : 'private',
                voucher: '/static/images/voucher-sample.jpg'
            });
        }

        console.log(`FinancialAudit: 生成了 ${mockData.length} 条模拟数据`);
        
        return {
            data: mockData,
            total: total,
            page: this.state.currentPage,
            pageSize: pageSize
        };
    }

    /**
     * 渲染订单列表
     */
    renderOrders() {
        if (this.state.viewMode === 'table') {
            this.renderTableView();
        } else {
            this.renderCardsView();
        }

        // 清空选择
        this.state.selectedOrders.clear();
        this.updateBulkActions();
    }

    /**
     * 渲染表格视图
     */
    renderTableView() {
        if (!this.elements.orders.tableBody) {
            console.warn('TableBody element not found, rendering fallback');
            this.renderFallbackView();
            return;
        }

        // 检查是否有订单数据
        if (!this.state.orders || this.state.orders.length === 0) {
            this.elements.orders.tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="15" class="empty-cell">
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <h3>暂无审核订单</h3>
                            <p>当前筛选条件下没有找到需要审核的订单</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const html = this.state.orders.map((order, index) => `
            <tr data-order-id="${order.id}">
                <td class="fixed-column fixed-column--left checkbox-column">
                    <input type="checkbox" data-order-id="${order.id}" 
                           onchange="window.auditManager.toggleOrderSelection('${order.id}', this.checked)">
                </td>
                <td class="fixed-column fixed-column--left sequence-column">
                    ${index + 1}
                </td>
                <td>
                    <div class="order-number-cell">
                        <span class="order-number">${order.orderNumber}</span>
                        ${order.priority === 'urgent' ? '<span class="priority urgent">🚨</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="bank-voucher">${order.bankVoucherNumber || '-'}</span>
                </td>
                <td>
                    <span class="amount-display ${order.amount > 100000 ? 'amount-display--large' : ''}">
                        ¥${order.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </span>
                </td>
                <td>
                    <div class="merchant-name">
                        <span class="merchant-text">${order.merchantName}</span>
                    </div>
                </td>
                <td>
                    <div class="payer-name">${order.payerName || order.payerAccountName}</div>
                </td>
                <td>
                    <div class="payer-account">${this.maskAccount(order.payerAccount)}</div>
                </td>
                <td>
                    <div class="receiver-name">${order.receiverName || order.receiverAccountName}</div>
                </td>
                <td>
                    <div class="receiver-account">${this.maskAccount(order.receiverAccount)}</div>
                </td>
                <td>
                    <span class="business-type-badge ${order.businessType === 'corporate' ? 'business-type-badge--corporate' : 'business-type-badge--personal'}">
                        ${order.businessType === 'corporate' ? '对公' : '对私'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-badge--${order.transactionStatus || order.status}">
                        ${this.getTransactionStatusText(order.transactionStatus || order.status)}
                    </span>
                </td>
                <td>
                    <div class="submit-time">
                        ${this.formatDateTime(order.createdAt)}
                    </div>
                </td>
                <td>
                    <div class="success-time">
                        ${order.successAt ? this.formatDateTime(order.successAt) : '-'}
                    </div>
                </td>
                <td class="fixed-column fixed-column--right operations-column">
                    <div class="action-buttons">
                        <button class="action-btn action-btn--view" onclick="window.auditManager.showOrderDetail('${order.id}')" title="查看详情">
                            <span>👁️</span>
                        </button>
                        <button class="action-btn action-btn--approve" onclick="window.auditManager.markAsArrived('${order.id}')" title="已到账">
                            <span>✅</span>
                        </button>
                        <button class="action-btn action-btn--reject" onclick="window.auditManager.markAsNotArrived('${order.id}')" title="未到账">
                            <span>❌</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.elements.orders.tableBody.innerHTML = html;
    }

    /**
     * 渲染fallback视图（当DOM元素不存在时）
     */
    renderFallbackView() {
        const container = document.querySelector('.orders-container') || document.querySelector('.audit-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #f8f9fa; border-radius: 8px; margin: 1rem 0;">
                    <h3>📋 财务审核列表</h3>
                    <p>系统正在加载审核数据...</p>
                    <div style="margin-top: 1rem;">
                        <span style="background: #007bff; color: white; padding: 0.5rem 1rem; border-radius: 4px;">
                            待审核: ${this.state.orders.length} 笔
                        </span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 渲染卡片视图
     */
    renderCardsView() {
        if (!this.elements.orders.grid) {
            console.warn('Cards grid element not found');
            return;
        }

        // 检查是否有订单数据
        if (!this.state.orders || this.state.orders.length === 0) {
            this.elements.orders.grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>暂无审核订单</h3>
                    <p>当前筛选条件下没有找到需要审核的订单</p>
                </div>
            `;
            return;
        }

        const html = this.state.orders.map(order => `
            <div class="order-card ${order.priority === 'urgent' ? 'urgent' : ''}" data-order-id="${order.id}">
                <div class="order-card__header">
                    <div class="order-card__info">
                        <div class="order-card__number">${order.orderNumber}</div>
                        <div class="order-card__status">
                            <span class="status-badge status-badge--${order.transactionStatus || order.status}">
                                ${this.getTransactionStatusText(order.transactionStatus || order.status)}
                            </span>
                        </div>
                    </div>
                    <div class="order-card__amount ${order.amount > 100000 ? 'amount-large' : ''}">
                        ¥${order.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                
                <div class="order-card__details">
                    <div class="order-detail">
                        <div class="order-detail__label">银行凭证号</div>
                        <div class="order-detail__value">${order.bankVoucherNumber || '-'}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail__label">商户名称</div>
                        <div class="order-detail__value">${order.merchantName}</div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail__label">付款账户</div>
                        <div class="order-detail__value">
                            <div class="account-info">
                                <div class="account-name">${order.payerName || order.payerAccountName}</div>
                                <div class="account-number">${this.maskAccount(order.payerAccount)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail__label">收款账户</div>
                        <div class="order-detail__value">
                            <div class="account-info">
                                <div class="account-name">${order.receiverName || order.receiverAccountName}</div>
                                <div class="account-number">${this.maskAccount(order.receiverAccount)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail__label">业务类别</div>
                        <div class="order-detail__value">
                            <span class="business-type-badge ${order.businessType === 'corporate' ? 'business-type-badge--corporate' : 'business-type-badge--personal'}">
                                ${order.businessType === 'corporate' ? '对公' : '对私'}
                            </span>
                        </div>
                    </div>
                    <div class="order-detail">
                        <div class="order-detail__label">创建时间</div>
                        <div class="order-detail__value">${this.formatDateTime(order.createdAt)}</div>
                    </div>
                    ${order.successAt ? `
                        <div class="order-detail">
                            <div class="order-detail__label">成功时间</div>
                            <div class="order-detail__value">${this.formatDateTime(order.successAt)}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="order-card__actions">
                    <button class="action-btn action-btn--view" onclick="window.auditManager.showOrderDetail('${order.id}')">
                        <span>👁️</span> 查看详情
                    </button>
                    <button class="action-btn action-btn--approve" onclick="window.auditManager.markAsArrived('${order.id}')">
                        <span>✅</span> 已到账
                    </button>
                    <button class="action-btn action-btn--reject" onclick="window.auditManager.markAsNotArrived('${order.id}')">
                        <span>❌</span> 未到账
                    </button>
                </div>
            </div>
        `).join('');

        this.elements.orders.grid.innerHTML = html;
    }

    /**
     * 切换订单选择状态
     */
    toggleOrderSelection(orderId, checked) {
        if (checked) {
            this.state.selectedOrders.add(orderId);
        } else {
            this.state.selectedOrders.delete(orderId);
        }
        this.updateBulkActions();
    }

    /**
     * 显示订单详情
     */
    showOrderDetail(orderId) {
        const order = this.state.orders.find(o => o.id === orderId);
        if (!order) return;

        // TODO: 实现订单详情模态框
        this.showToast(`查看订单详情: ${order.orderNumber}`, 'info');
    }

    /**
     * 快速通过审核
     */
    async quickApprove(orderId) {
        try {
            this.showLoading();
            
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 更新订单状态
            const order = this.state.orders.find(o => o.id === orderId);
            if (order) {
                order.status = 'approved';
                this.renderOrders();
                await this.loadStatistics();
            }
            
            this.hideLoading();
            this.showToast('审核通过成功', 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('操作失败，请重试', 'error');
        }
    }

    /**
     * 快速拒绝审核
     */
    async quickReject(orderId) {
        try {
            const reason = prompt('请输入拒绝原因：');
            if (!reason) return;

            this.showLoading();
            
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 更新订单状态
            const order = this.state.orders.find(o => o.id === orderId);
            if (order) {
                order.status = 'rejected';
                this.renderOrders();
                await this.loadStatistics();
            }
            
            this.hideLoading();
            this.showToast('审核拒绝成功', 'success');
        } catch (error) {
            this.hideLoading();
            this.showToast('操作失败，请重试', 'error');
        }
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        await Promise.all([
            this.loadStatistics(),
            this.loadOrders()
        ]);
        this.showToast('数据刷新成功', 'success');
    }

    /**
     * 导出数据
     */
    exportData() {
        // TODO: 实现数据导出功能
        this.showToast('导出功能开发中...', 'info');
    }

    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
        if (this.options.autoRefresh > 0) {
            setInterval(() => {
                if (document.visibilityState === 'visible' && this.state.currentFilter === 'pending') {
                    this.loadStatistics();
                }
            }, this.options.autoRefresh);
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loading = document.getElementById('globalLoading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        this.hideLoading();
        
        if (this.elements.orders.tableBody) {
            this.elements.orders.tableBody.innerHTML = `
                <tr>
                    <td colspan="15" class="error-cell" style="text-align: center; padding: 2rem; color: var(--status-rejected);">
                        <span style="margin-right: 0.5rem;">⚠️</span>
                        ${message}
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 显示Toast提示
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        if (!date) return '-';
        
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;

        return d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 隐藏账户信息，保护隐私
     */
    maskAccount(account) {
        if (!account) return '-';
        
        const str = account.toString();
        if (str.length <= 4) return str;
        
        // 银行卡号格式 (通常16-19位)
        if (str.length >= 12) {
            return str.substring(0, 4) + '****' + str.substring(str.length - 4);
        }
        
        // 其他账号格式
        const start = Math.ceil(str.length * 0.3);
        const end = Math.floor(str.length * 0.7);
        
        return str.substring(0, start) + '****' + str.substring(end);
    }

    /**
     * 获取交易状态文本
     */
    getTransactionStatusText(status) {
        const statusMap = {
            'pending': '待处理',
            'success': '交易成功', 
            'failed': '交易失败',
            'processing': '处理中',
            'approved': '已通过',
            'rejected': '已拒绝',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    /**
     * 标记订单已到账
     */
    async markAsArrived(orderId) {
        try {
            await this.updateOrderStatus(orderId, 'arrived');
            this.showToast('订单已标记为到账', 'success');
        } catch (error) {
            this.showToast('操作失败，请重试', 'error');
        }
    }

    /**
     * 标记订单未到账
     */
    async markAsNotArrived(orderId) {
        try {
            await this.updateOrderStatus(orderId, 'not_arrived');
            this.showToast('订单已标记为未到账', 'warning');
        } catch (error) {
            this.showToast('操作失败，请重试', 'error');
        }
    }

    /**
     * 更新订单状态
     */
    async updateOrderStatus(orderId, status) {
        // 模拟API调用
        return new Promise((resolve) => {
            setTimeout(() => {
                // 更新本地数据
                const order = this.state.orders.find(o => o.id === orderId);
                if (order) {
                    order.status = status;
                    if (status === 'arrived') {
                        order.successAt = new Date().toISOString();
                    }
                }
                this.renderOrders();
                resolve();
            }, 500);
        });
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 清理事件监听器
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        
        // 清理定时器
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        // 重置状态
        this.state = {};
        this.elements = {};
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialAuditEnhanced;
} else {
    window.FinancialAuditEnhanced = FinancialAuditEnhanced;
}