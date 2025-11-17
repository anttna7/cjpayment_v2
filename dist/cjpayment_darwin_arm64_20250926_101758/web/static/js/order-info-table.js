/**
 * 订单信息表管理器
 * 功能：加载数据、序号固定滚动、排序、筛选
 */

class OrderInfoTable {
    constructor() {
        this.tableElement = document.getElementById('advancedDataTable');
        this.tableBody = document.getElementById('advancedDataTableBody');
        this.originalData = [];
        this.currentData = [];
        this.filteredData = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentPage = 1;
        this.pageSize = 50;
        
        // 筛选状态
        this.activeFilters = {
            search: '',
            quickFilter: 'all',
            dateRange: null
        };
        
        // 视图状态
        this.currentView = 'table';
        this.currentDensity = 'default';
        
        this.init();
    }

    init() {
        console.log('OrderInfoTable: 开始初始化...');
        this.bindEvents();
        this.loadOrderData();
        this.setupFixedColumns();
        console.log('OrderInfoTable: 初始化完成');
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 绑定排序事件
        const sortableHeaders = document.querySelectorAll('.col-sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const column = header.getAttribute('data-column');
                this.handleSort(column);
            });
        });

        // 绑定滚动事件以保持序号列固定
        const tableWrapper = document.querySelector('.table-wrapper-advanced');
        if (tableWrapper) {
            tableWrapper.addEventListener('scroll', this.handleScroll.bind(this));
        }
        
        // 绑定toolbar事件
        this.bindToolbarEvents();
    }

    /**
     * 处理表格滚动事件
     */
    handleScroll(event) {
        const scrollLeft = event.target.scrollLeft;
        const maxScrollLeft = event.target.scrollWidth - event.target.clientWidth;
        
        // 更新序号列的阴影效果
        const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
        serialCells.forEach(cell => {
            if (scrollLeft > 0) {
                cell.style.boxShadow = '4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });

        // 更新审核列的阴影效果
        const auditCells = document.querySelectorAll('.col-audit.col-fixed-right, .col-audit-cell.col-fixed-right');
        auditCells.forEach(cell => {
            if (scrollLeft < maxScrollLeft) {
                cell.style.boxShadow = '-4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });
    }

    /**
     * 设置固定列功能
     */
    setupFixedColumns() {
        // 确保固定列在页面加载时正确设置
        setTimeout(() => {
            // 设置左侧固定列（序号列）
            const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
            serialCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.left = '0';
                cell.style.zIndex = cell.classList.contains('col-serial') ? '101' : '99';
                cell.style.background = '#ffffff';
                cell.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.1)';
            });

            // 设置右侧固定列（审核列）
            const auditCells = document.querySelectorAll('.col-audit.col-fixed-right, .col-audit-cell.col-fixed-right');
            auditCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.right = '0';
                cell.style.zIndex = cell.classList.contains('col-audit') ? '101' : '99';
                cell.style.background = '#ffffff';
                cell.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
            });

            // 确保订单号列等其他列可以正常滚动（移除任何固定样式）
            const scrollableCells = document.querySelectorAll('[data-column="order_number"]');
            scrollableCells.forEach(cell => {
                cell.style.position = '';
                cell.style.left = '';
                cell.style.right = '';
                cell.style.zIndex = '';
                cell.style.boxShadow = '';
            });

            // 确保所有非固定列都可以正常滚动
            const allCells = document.querySelectorAll('td:not(.col-serial-cell):not(.col-audit-cell)');
            allCells.forEach(cell => {
                // 只清除可能被意外设置的固定样式，不影响其他样式
                if (cell.style.position === 'sticky') {
                    cell.style.position = '';
                    cell.style.left = '';
                    cell.style.right = '';
                    cell.style.zIndex = '';
                }
            });
        }, 100);
    }

    /**
     * 强制确保非固定列可以滚动
     */
    enforceScrollableColumns() {
        // 获取所有非固定列的单元格
        const scrollableCells = document.querySelectorAll(`
            td[data-column="order_number"],
            td[data-column="bank_voucher"],
            td[data-column="amount"],
            td[data-column="merchant_name"],
            td[data-column="payer_account_name"],
            td[data-column="payer_account_number"],
            td[data-column="receiver_account_name"],
            td[data-column="receiver_account_number"],
            td[data-column="business_type"],
            td[data-column="status"],
            td[data-column="created_time"],
            td[data-column="success_time"]
        `);

        scrollableCells.forEach(cell => {
            // 强制移除任何可能的固定定位
            cell.style.position = 'static';
            cell.style.left = 'auto';
            cell.style.right = 'auto';
            cell.style.zIndex = 'auto';
            
            // 移除可能被错误添加的固定列类
            cell.classList.remove('col-fixed-left', 'col-fixed-right', 'col-serial-cell', 'col-audit-cell');
        });

        console.log(`OrderInfoTable: 已强制设置 ${scrollableCells.length} 个单元格为可滚动`);
    }

    /**
     * 处理排序
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // 更新排序指示器
        this.updateSortIndicators();

        // 重新渲染数据
        this.renderTableData(this.sortData(this.currentData));
    }

    /**
     * 更新排序指示器
     */
    updateSortIndicators() {
        // 重置所有排序指示器
        const indicators = document.querySelectorAll('.sort-indicator-enhanced');
        indicators.forEach(indicator => {
            indicator.textContent = '↕️';
            indicator.style.opacity = '0.6';
        });

        // 设置当前排序列的指示器
        if (this.sortColumn) {
            const currentHeader = document.querySelector(`[data-column="${this.sortColumn}"] .sort-indicator-enhanced`);
            if (currentHeader) {
                currentHeader.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
                currentHeader.style.opacity = '1';
                currentHeader.style.color = '#3b82f6';
            }
        }
    }

    /**
     * 排序数据
     */
    sortData(data) {
        if (!this.sortColumn) return data;

        return [...data].sort((a, b) => {
            let valueA = a[this.sortColumn];
            let valueB = b[this.sortColumn];

            // 处理不同数据类型的排序
            if (this.sortColumn === 'amount') {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            } else if (this.sortColumn === 'created_time' || this.sortColumn === 'success_time') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = String(valueA || '').toLowerCase();
                valueB = String(valueB || '').toLowerCase();
            }

            if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    /**
     * 加载订单数据
     */
    async loadOrderData() {
        try {
            console.log('OrderInfoTable: 开始加载订单数据...');
            
            // 显示加载状态
            this.showLoadingState();

            // 模拟API调用 - 在实际项目中替换为真实API
            const mockData = this.generateMockOrderData();
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.originalData = mockData;
            this.currentData = mockData;
            this.filteredData = mockData;
            this.renderTableData(mockData);
            
            console.log(`OrderInfoTable: 成功加载 ${mockData.length} 条订单记录`);
        } catch (error) {
            console.error('OrderInfoTable: 加载数据失败:', error);
            this.showErrorState();
        }
    }

    /**
     * 生成模拟订单数据
     */
    generateMockOrderData() {
        const merchants = ['阿里巴巴', '腾讯科技', '字节跳动', '美团', '拼多多', '京东', '百度', '网易', '小米科技', '华为技术'];
        const banks = ['中国银行', '工商银行', '建设银行', '农业银行', '招商银行', '交通银行', '浦发银行', '民生银行'];
        const businessTypes = ['对公', '对私'];
        const statuses = ['交易成功', '交易失败'];
        const auditStatuses = ['已到账', '未到账', '未审核'];
        
        const data = [];
        const now = new Date();
        
        for (let i = 1; i <= 150; i++) {
            const isSuccess = Math.random() > 0.1; // 90% 成功率
            const hasSuccessTime = isSuccess && Math.random() > 0.3;
            const createdTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            const successTime = hasSuccessTime ? new Date(createdTime.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
            
            const merchant = merchants[Math.floor(Math.random() * merchants.length)];
            const payerBank = banks[Math.floor(Math.random() * banks.length)];
            const receiverBank = banks[Math.floor(Math.random() * banks.length)];
            
            data.push({
                serial: i,
                order_number: `CJP${String(20250101 + i).padStart(8, '0')}`,
                bank_voucher: `BV${String(Date.now() + i).slice(-10)}`,
                amount: (Math.random() * 999999 + 100).toFixed(2),
                merchant_name: merchant,
                payer_account_name: `${merchant}账户${i}`,
                payer_account_number: `${payerBank.slice(0,2)}****${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
                receiver_account_name: `收款方账户${i}`,
                receiver_account_number: `${receiverBank.slice(0,2)}****${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
                business_type: businessTypes[Math.floor(Math.random() * businessTypes.length)],
                status: isSuccess ? '交易成功' : '交易失败',
                created_time: this.formatDateTime(createdTime),
                success_time: successTime ? this.formatDateTime(successTime) : '-',
                audit_status: isSuccess ? auditStatuses[Math.floor(Math.random() * auditStatuses.length)] : '未审核',
                audit_time: isSuccess && Math.random() > 0.5 ? this.formatDateTime(new Date(createdTime.getTime() + Math.random() * 24 * 60 * 60 * 1000)) : null
            });
        }
        
        return data;
    }

    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        if (!date) return '-';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * 渲染表格数据
     */
    renderTableData(data) {
        if (!this.tableBody) {
            console.error('OrderInfoTable: 未找到表格主体元素');
            return;
        }

        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }

        const html = data.map((row, index) => `
            <tr class="table-row-enhanced">
                <td class="col-serial-cell">
                    <div class="serial-number">${row.serial}</div>
                </td>
                <td data-column="order_number">
                    <code class="order-code">${row.order_number}</code>
                </td>
                <td data-column="bank_voucher">
                    <span class="voucher-number">${row.bank_voucher}</span>
                </td>
                <td data-column="amount">
                    <span class="amount-value">¥${parseFloat(row.amount).toLocaleString()}</span>
                </td>
                <td data-column="merchant_name">
                    <span class="merchant-name">${row.merchant_name}</span>
                </td>
                <td data-column="payer_account_name">
                    <span class="account-name">${row.payer_account_name}</span>
                </td>
                <td data-column="payer_account_number">
                    <span class="account-number">${row.payer_account_number}</span>
                </td>
                <td data-column="receiver_account_name">
                    <span class="account-name">${row.receiver_account_name}</span>
                </td>
                <td data-column="receiver_account_number">
                    <span class="account-number">${row.receiver_account_number}</span>
                </td>
                <td data-column="business_type">
                    <span class="business-type">${row.business_type}</span>
                </td>
                <td data-column="status">
                    <span class="status-badge ${row.status === '交易成功' ? 'status-badge--success' : 'status-badge--failed'}">
                        ${row.status === '交易成功' ? '✅' : '❌'} ${row.status}
                    </span>
                </td>
                <td data-column="created_time">
                    <span class="time-value">${row.created_time}</span>
                </td>
                <td data-column="success_time">
                    <span class="time-value">${row.success_time}</span>
                </td>
                <td class="col-audit-cell col-fixed-right" data-column="audit_status">
                    <span class="audit-badge ${this.getAuditBadgeClass(row.audit_status)}">
                        ${this.getAuditStatusIcon(row.audit_status)} ${row.audit_status}
                    </span>
                </td>
            </tr>
        `).join('');

        this.tableBody.innerHTML = html;

        // 重新设置固定列
        this.setupFixedColumns();

        // 强制确保非固定列可以滚动
        this.enforceScrollableColumns();

        console.log(`OrderInfoTable: 已渲染 ${data.length} 行数据`);
    }

    /**
     * 获取审核状态的CSS类
     */
    getAuditBadgeClass(status) {
        switch (status) {
            case '已到账':
                return 'audit-badge--arrived';
            case '未到账':
                return 'audit-badge--not-arrived';
            case '未审核':
                return 'audit-badge--pending';
            default:
                return 'audit-badge--pending';
        }
    }

    /**
     * 获取审核状态图标
     */
    getAuditStatusIcon(status) {
        switch (status) {
            case '已到账':
                return '✅';
            case '未到账':
                return '❌';
            case '未审核':
                return '⏳';
            default:
                return '⏳';
        }
    }

    /**
     * 显示加载状态
     */
    showLoadingState() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="14" style="text-align: center; padding: 60px 20px;">
                        <div class="loading-spinner"></div>
                        <div style="margin-top: 12px; color: #6b7280;">正在加载订单数据...</div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="14" style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                        <div style="color: #6b7280; font-size: 16px;">暂无订单数据</div>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 显示错误状态
     */
    showErrorState() {
        if (this.tableBody) {
            this.tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="14" style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <div style="color: #dc2626; font-size: 16px; margin-bottom: 16px;">数据加载失败</div>
                        <button onclick="window.orderInfoTable.loadOrderData()" class="btn btn-primary">
                            重新加载
                        </button>
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 绑定toolbar事件处理
     */
    bindToolbarEvents() {
        // toolbar-left: 搜索功能
        const searchInput = document.getElementById('advancedTableSearch');
        const searchBtn = document.getElementById('searchBtn');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e.target.value);
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value;
                this.handleSearch(query);
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.handleSearch('');
            });
        }
        
        // toolbar-left: 快速筛选按钮
        const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
        quickFilterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.handleQuickFilter(filter, e.target);
            });
        });
        
        // toolbar-right: 视图切换按钮
        const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
        viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.handleViewToggle(view, e.target);
            });
        });
        
        // toolbar-right: 密度控制按钮
        const densityBtns = document.querySelectorAll('.density-btn');
        densityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const density = e.target.getAttribute('data-density');
                this.handleDensityChange(density, e.target);
            });
        });
        
        // toolbar-right: 高级筛选按钮 - 绑定两个可能的按钮ID
        const advancedFiltersToggle = document.getElementById('advancedFiltersToggle');
        if (advancedFiltersToggle) {
            advancedFiltersToggle.addEventListener('click', () => {
                console.log('OrderInfoTable: advancedFiltersToggle 按钮被点击');
                this.toggleAdvancedFilters();
            });
        }
        
        // 也绑定OrderInfoTable区域的高级筛选按钮
        const toggleAdvancedFilters = document.getElementById('toggleAdvancedFilters');
        if (toggleAdvancedFilters) {
            toggleAdvancedFilters.addEventListener('click', () => {
                console.log('OrderInfoTable: toggleAdvancedFilters 按钮被点击');
                this.toggleAdvancedFilters();
            });
        }
        
        // toolbar-right: 列设置按钮 (由advanced-data-table.js处理)
        
        // toolbar-right: 刷新按钮
        const refreshBtn = document.getElementById('refreshAdvancedTableBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh();
            });
        }
        
        // toolbar-right: 导出下拉菜单
        const exportBtn = document.getElementById('exportAdvancedBtn');
        const exportDropdown = document.getElementById('exportDropdownMenu');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(exportDropdown);
            });
        }
        
        // 导出选项
        const exportItems = document.querySelectorAll('[data-export]');
        exportItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const exportType = e.target.getAttribute('data-export');
                this.handleExport(exportType);
                this.closeAllDropdowns();
            });
        });
        
        // 全局点击关闭下拉菜单
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * 处理搜索
     */
    handleSearch(query) {
        console.log('OrderInfoTable: 执行搜索:', query);
        
        this.activeFilters.search = query.toLowerCase();
        
        // 显示/隐藏清除按钮
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        this.applyFilters();
    }
    
    /**
     * 处理快速筛选
     */
    handleQuickFilter(filter, buttonElement) {
        console.log('OrderInfoTable: 应用快速筛选:', filter);
        
        this.activeFilters.quickFilter = filter;
        
        // 更新按钮状态
        document.querySelectorAll('.quick-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');
        
        this.applyFilters();
    }
    
    /**
     * 处理视图切换
     */
    handleViewToggle(view, buttonElement) {
        console.log('OrderInfoTable: 切换视图:', view);
        
        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');
        
        // 切换视图显示
        this.switchView(view);
    }
    
    /**
     * 处理密度变化
     */
    handleDensityChange(density, buttonElement) {
        console.log('OrderInfoTable: 更改密度:', density);
        
        this.currentDensity = density;
        
        // 更新按钮状态
        document.querySelectorAll('.density-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');
        
        // 应用密度样式
        this.applyDensity(density);
    }
    
    /**
     * 应用筛选条件
     */
    applyFilters() {
        let filteredData = [...this.originalData];
        
        // 应用搜索筛选
        if (this.activeFilters.search) {
            const searchTerm = this.activeFilters.search;
            filteredData = filteredData.filter(row => {
                return Object.values(row).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                );
            });
        }
        
        // 应用快速筛选
        if (this.activeFilters.quickFilter !== 'all') {
            const filter = this.activeFilters.quickFilter;
            filteredData = filteredData.filter(row => {
                switch (filter) {
                    case 'today':
                        const today = new Date().toDateString();
                        return new Date(row.created_time).toDateString() === today;
                    case 'success':
                        return row.status === '交易成功';
                    case 'failed':
                        return row.status === '交易失败';
                    case 'large':
                        return parseFloat(row.amount) > 10000;
                    default:
                        return true;
                }
            });
        }
        
        this.filteredData = filteredData;
        this.currentData = this.sortData(filteredData);
        this.renderTableData(this.currentData);
        
        // 更新统计信息
        this.updateFilterStats();
    }
    
    /**
     * 切换视图
     */
    switchView(view) {
        console.log(`OrderInfoTable: 切换到${view}视图`);
        
        // 隐藏所有视图
        const tableView = document.getElementById('tableView');
        const cardView = document.getElementById('cardView');
        const timelineView = document.getElementById('timelineView');
        
        if (tableView) tableView.style.display = 'none';
        if (cardView) cardView.style.display = 'none';
        if (timelineView) timelineView.style.display = 'none';
        
        // 显示选中的视图
        switch (view) {
            case 'table':
                if (tableView) {
                    tableView.style.display = 'block';
                    this.renderTableData(this.currentData);
                }
                break;
            case 'cards':
                if (cardView) {
                    cardView.style.display = 'block';
                    this.renderCardsView(this.currentData);
                }
                break;
            case 'timeline':
                if (timelineView) {
                    timelineView.style.display = 'block';
                    this.renderTimelineView(this.currentData);
                }
                break;
        }
        
        this.showNotification(`已切换到${this.getViewName(view)}`, 'success');
    }
    
    /**
     * 获取视图中文名称
     */
    getViewName(view) {
        switch (view) {
            case 'table': return '表格视图';
            case 'cards': return '卡片视图';
            case 'timeline': return '时间轴视图';
            default: return '未知视图';
        }
    }
    
    /**
     * 应用密度样式
     */
    applyDensity(density) {
        const tableElement = this.tableElement;
        if (!tableElement) return;
        
        // 移除现有密度类
        tableElement.classList.remove('table-compact', 'table-default', 'table-spacious');
        
        // 添加新密度类
        tableElement.classList.add(`table-${density}`);
        
        // 更新CSS变量
        const root = document.documentElement;
        switch (density) {
            case 'compact':
                root.style.setProperty('--table-row-height', '32px');
                root.style.setProperty('--table-cell-padding', '4px 8px');
                break;
            case 'spacious':
                root.style.setProperty('--table-row-height', '56px');
                root.style.setProperty('--table-cell-padding', '12px 16px');
                break;
            default: // default
                root.style.setProperty('--table-row-height', '44px');
                root.style.setProperty('--table-cell-padding', '8px 12px');
                break;
        }
    }
    
    /**
     * 切换高级筛选面板
     */
    toggleAdvancedFilters() {
        console.log('OrderInfoTable: 切换高级筛选面板 - 使用新架构');
        
        // 使用新的backdrop和container架构
        const backdrop = document.getElementById('advancedFiltersBackdrop');
        const container = document.getElementById('advancedFiltersContainer');
        
        if (!backdrop || !container) {
            this.showNotification('筛选面板组件未找到', 'error');
            return;
        }
        
        // 关键修复: 确保backdrop在body根级别，不受父容器影响
        if (backdrop.parentNode !== document.body) {
            console.log('OrderInfoTable: 移动backdrop到body根级别');
            document.body.appendChild(backdrop);
        }
        
        const isVisible = backdrop.classList.contains('show');
        
        if (isVisible) {
            // 隐藏面板 - 关键修复：立即设置visibility和display
            console.log('OrderInfoTable: 开始关闭模态框');
            backdrop.classList.remove('show');
            backdrop.setAttribute('aria-hidden', 'true');
            backdrop.style.visibility = 'hidden';
            backdrop.style.display = 'none';
            container.removeAttribute('aria-modal');
            
            // 清理事件监听器
            if (this._globalClickHandler) {
                document.removeEventListener('click', this._globalClickHandler);
            }
            if (this._containerClickHandler) {
                container.removeEventListener('click', this._containerClickHandler);
            }
            
        } else {
            // 显示面板 - 关键修复：确保visibility和display同步
            console.log('OrderInfoTable: 开始显示模态框');
            backdrop.style.display = 'flex';
            backdrop.style.visibility = 'visible';
            backdrop.removeAttribute('aria-hidden');
            container.setAttribute('aria-modal', 'true');
            
            // 立即添加show类
            backdrop.classList.add('show');
            
            setTimeout(() => {
                // 如果页面存在AdvancedDataTable实例，调用其方法
                if (window.advancedDataTable && window.advancedDataTable.setupEnhancedFilterEvents) {
                    console.log('OrderInfoTable: 调用AdvancedDataTable设置事件');
                    window.advancedDataTable.setupEnhancedFilterEvents();
                }
                
                // 焦点管理
                this.manageFocus(container);
                
                // 设置backdrop点击关闭功能
                this.setupBackdropClose(backdrop, container);
                
                // ESC键关闭功能
                this.setupEscapeClose();
            }, 100);
        }
    }
    
    /**
     * 设置backdrop点击关闭功能
     */
    setupBackdropClose(backdrop, container) {
        // 修复：防止按钮点击事件的误判，添加延迟和更严格的检查
        let isInitializing = true;
        
        // 设置初始化保护期，防止按钮点击事件被误判
        setTimeout(() => {
            isInitializing = false;
        }, 300); // 增加保护期到300ms
        
        const handleGlobalClick = (e) => {
            // 关键修复：跳过初始化期间的点击事件
            if (isInitializing) {
                console.log('OrderInfoTable: 跳过初始化期间的点击事件');
                return;
            }
            
            // 检查点击是否在container外部，并且不是筛选按钮
            const isOutsideContainer = !container.contains(e.target);
            const isNotFilterButton = !e.target.closest('#toggleAdvancedFilters, #advancedFiltersToggle');
            const modalIsVisible = backdrop.classList.contains('show');
            
            if (isOutsideContainer && isNotFilterButton && modalIsVisible) {
                console.log('OrderInfoTable: 外部点击关闭模态框');
                e.preventDefault();
                e.stopPropagation();
                this.toggleAdvancedFilters();
            }
        };
        
        // 阻止container内部点击关闭模态框
        const handleContainerClick = (e) => {
            e.stopPropagation();
        };
        
        // 移除之前的事件监听器
        document.removeEventListener('click', this._globalClickHandler);
        container.removeEventListener('click', this._containerClickHandler);
        
        // 使用延迟绑定避免立即触发
        setTimeout(() => {
            this._globalClickHandler = handleGlobalClick;
            this._containerClickHandler = handleContainerClick;
            
            document.addEventListener('click', handleGlobalClick);
            container.addEventListener('click', handleContainerClick);
        }, 100);
    }
    
    /**
     * 设置ESC键关闭功能
     */
    setupEscapeClose() {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                console.log('OrderInfoTable: ESC键关闭');
                this.toggleAdvancedFilters();
                document.removeEventListener('keydown', handleEscapeKey);
            }
        };
        
        document.addEventListener('keydown', handleEscapeKey);
    }
    
    /**
     * 管理焦点
     */
    manageFocus(container) {
        // 找到第一个可聚焦元素
        const focusableElements = container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    
    /**
     * 显示列设置
     */
    showColumnSettings() {
        console.log('OrderInfoTable: 显示列设置');
        
        const modal = document.getElementById('columnSettingsModal');
        if (modal) {
            // 修复可访问性问题 - 移除aria-hidden并显示模态框
            modal.removeAttribute('aria-hidden');
            modal.setAttribute('aria-modal', 'true');
            modal.style.display = 'flex';
            
            // 聚焦到模态框内的第一个可聚焦元素
            setTimeout(() => {
                const focusableElements = modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }, 100);
            
            // 绑定模态框关闭事件
            this.bindColumnModalEvents();
        } else {
            this.showNotification('列设置面板未找到', 'error');
        }
    }
    
    /**
     * 绑定列设置模态框事件
     */
    bindColumnModalEvents() {
        const modal = document.getElementById('columnSettingsModal');
        if (!modal) return;
        
        // 关闭按钮事件
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-cancel');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeColumnModal();
            });
        });
        
        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeColumnModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeColumnModal();
            }
        });
    }
    
    /**
     * 关闭列设置模态框
     */
    closeColumnModal() {
        const modal = document.getElementById('columnSettingsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
            
            // 恢复焦点到触发按钮
            const columnSettingsBtn = document.getElementById('columnSettingsBtn');
            if (columnSettingsBtn) {
                columnSettingsBtn.focus();
            }
        }
    }
    
    /**
     * 切换下拉菜单
     */
    toggleDropdown(dropdown) {
        if (!dropdown) return;
        
        const isVisible = dropdown.style.display === 'block';
        
        // 关闭所有下拉菜单
        this.closeAllDropdowns();
        
        // 如果之前是隐藏的，则显示
        if (!isVisible) {
            dropdown.style.display = 'block';
            dropdown.style.visibility = 'visible';
            dropdown.style.opacity = '1';
            // 强制重排以确保样式生效
            dropdown.offsetHeight;
        }
    }
    
    /**
     * 关闭所有下拉菜单
     */
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
            dropdown.style.visibility = 'hidden';
            dropdown.style.opacity = '0';
        });
    }
    
    /**
     * 处理导出
     */
    handleExport(type) {
        console.log('OrderInfoTable: 导出数据:', type);
        
        let dataToExport = [];
        
        switch (type) {
            case 'current':
                dataToExport = this.currentData;
                break;
            case 'filtered':
                dataToExport = this.filteredData;
                break;
            case 'all':
                dataToExport = this.originalData;
                break;
            case 'template':
                this.downloadTemplate();
                return;
        }
        
        this.exportToCSV(dataToExport, type);
    }
    
    /**
     * 导出CSV文件
     */
    exportToCSV(data, type) {
        if (!data || data.length === 0) {
            this.showNotification('没有可导出的数据', 'warning');
            return;
        }
        
        // CSV表头
        const headers = [
            '序号', '订单号', '银行凭证号', '交易金额', '商户名称',
            '付款账户名称', '付款账号', '收款账户名称', '收款账号',
            '业务类别', '状态', '创建时间', '成功时间', '审核状态', '审核时间'
        ];
        
        // 转换数据为CSV格式
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.serial,
                `"${row.order_number}"`,
                `"${row.bank_voucher}"`,
                row.amount,
                `"${row.merchant_name}"`,
                `"${row.payer_account_name}"`,
                `"${row.payer_account_number}"`,
                `"${row.receiver_account_name}"`,
                `"${row.receiver_account_number}"`,
                `"${row.business_type}"`,
                `"${row.status}"`,
                `"${row.created_time}"`,
                `"${row.success_time}"`,
                `"${row.audit_status}"`,
                `"${row.audit_time || ''}"`
            ].join(','))
        ].join('\n');
        
        // 创建并下载文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `订单数据_${type}_${this.formatDate(new Date())}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`成功导出${data.length}条记录`, 'success');
        }
    }
    
    /**
     * 下载模板
     */
    downloadTemplate() {
        const headers = [
            '序号', '订单号', '银行凭证号', '交易金额', '商户名称',
            '付款账户名称', '付款账号', '收款账户名称', '收款账号',
            '业务类别', '状态', '创建时间', '成功时间', '审核状态', '审核时间'
        ];
        
        const csvContent = headers.join(',') + '\n';
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', '订单数据模板.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('模板下载成功', 'success');
        }
    }
    
    /**
     * 卡片视图渲染
     */
    renderCardsView(data) {
        console.log('OrderInfoTable: 渲染卡片视图');
        
        const cardsGrid = document.getElementById('cardsGrid');
        if (!cardsGrid) {
            console.error('OrderInfoTable: 未找到卡片容器');
            return;
        }
        
        if (!data || data.length === 0) {
            cardsGrid.innerHTML = `
                <div class="cards-empty">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">暂无数据</div>
                </div>
            `;
            return;
        }
        
        const cardsHtml = data.map(row => `
            <div class="order-card" data-order-id="${row.order_number}">
                <div class="card-header">
                    <div class="card-title">
                        <span class="card-icon">📋</span>
                        <span class="order-number">${row.order_number}</span>
                    </div>
                    <div class="card-status">
                        <span class="status-badge ${row.status === '交易成功' ? 'status-success' : 'status-failed'}">
                            ${row.status === '交易成功' ? '✅' : '❌'} ${row.status}
                        </span>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="card-row">
                        <div class="card-field">
                            <span class="field-label">💰 交易金额</span>
                            <span class="field-value amount-large">¥${parseFloat(row.amount).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="card-row">
                        <div class="card-field">
                            <span class="field-label">🏪 商户名称</span>
                            <span class="field-value">${row.merchant_name}</span>
                        </div>
                    </div>
                    
                    <div class="card-row">
                        <div class="card-field half">
                            <span class="field-label">🏦 银行凭证</span>
                            <span class="field-value voucher-code">${row.bank_voucher}</span>
                        </div>
                        <div class="card-field half">
                            <span class="field-label">📊 业务类型</span>
                            <span class="field-value">${row.business_type}</span>
                        </div>
                    </div>
                    
                    <div class="card-row">
                        <div class="card-field half">
                            <span class="field-label">📅 创建时间</span>
                            <span class="field-value time-value">${row.created_time}</span>
                        </div>
                        <div class="card-field half">
                            <span class="field-label">🔍 审核状态</span>
                            <span class="field-value">
                                <span class="audit-badge ${this.getAuditBadgeClass(row.audit_status)}">
                                    ${this.getAuditStatusIcon(row.audit_status)} ${row.audit_status}
                                </span>
                            </span>
                        </div>
                    </div>
                    
                    <div class="card-accounts">
                        <div class="account-row">
                            <div class="account-field">
                                <span class="account-label">付款方</span>
                                <div class="account-info">
                                    <div class="account-name">${row.payer_account_name}</div>
                                    <div class="account-number">${row.payer_account_number}</div>
                                </div>
                            </div>
                            <div class="transfer-arrow">→</div>
                            <div class="account-field">
                                <span class="account-label">收款方</span>
                                <div class="account-info">
                                    <div class="account-name">${row.receiver_account_name}</div>
                                    <div class="account-number">${row.receiver_account_number}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="card-actions">
                        <button class="card-action-btn" onclick="window.orderInfoTable.viewOrderDetails('${row.order_number}')">
                            <span class="action-icon">👁️</span>
                            查看详情
                        </button>
                        <button class="card-action-btn" onclick="window.orderInfoTable.exportSingleOrder('${row.order_number}')">
                            <span class="action-icon">📤</span>
                            导出
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        cardsGrid.innerHTML = cardsHtml;
        console.log(`OrderInfoTable: 卡片视图已渲染 ${data.length} 张卡片`);
    }
    
    /**
     * 时间线视图渲染
     */
    renderTimelineView(data) {
        console.log('OrderInfoTable: 渲染时间线视图');
        
        const timelineContainer = document.getElementById('timelineContainer');
        if (!timelineContainer) {
            console.error('OrderInfoTable: 未找到时间线容器');
            return;
        }
        
        if (!data || data.length === 0) {
            timelineContainer.innerHTML = `
                <div class="timeline-empty">
                    <div class="empty-icon">📅</div>
                    <div class="empty-text">暂无时间线数据</div>
                </div>
            `;
            return;
        }
        
        // 按创建时间分组数据
        const groupedData = this.groupDataByDate(data);
        
        const timelineHtml = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a)).map(dateKey => {
            const dayData = groupedData[dateKey];
            const dayStats = {
                total: dayData.length,
                success: dayData.filter(item => item.status === '交易成功').length,
                failed: dayData.filter(item => item.status === '交易失败').length,
                amount: dayData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
            };
            
            return `
                <div class="timeline-day" data-date="${dateKey}">
                    <div class="timeline-date-header">
                        <div class="date-info">
                            <div class="date-primary">${this.formatTimelineDate(dateKey)}</div>
                            <div class="date-stats">
                                <span class="stat-item">📊 ${dayStats.total}笔</span>
                                <span class="stat-item success">✅ ${dayStats.success}</span>
                                <span class="stat-item failed">❌ ${dayStats.failed}</span>
                                <span class="stat-item amount">💰 ¥${dayStats.amount.toLocaleString()}</span>
                            </div>
                        </div>
                        <button class="toggle-day-btn" onclick="window.orderInfoTable.toggleTimelineDay('${dateKey}')">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    
                    <div class="timeline-day-content" id="timeline-${dateKey.replace(/[-\s:]/g, '')}">
                        ${dayData.map((item, index) => `
                            <div class="timeline-item ${item.status === '交易成功' ? 'success' : 'failed'}">
                                <div class="timeline-marker">
                                    <div class="marker-dot"></div>
                                    <div class="marker-time">${this.extractTime(item.created_time)}</div>
                                </div>
                                
                                <div class="timeline-content">
                                    <div class="timeline-header">
                                        <div class="timeline-title">
                                            <span class="order-number">${item.order_number}</span>
                                            <span class="status-badge ${item.status === '交易成功' ? 'status-success' : 'status-failed'}">
                                                ${item.status === '交易成功' ? '✅' : '❌'} ${item.status}
                                            </span>
                                        </div>
                                        <div class="timeline-amount">¥${parseFloat(item.amount).toLocaleString()}</div>
                                    </div>
                                    
                                    <div class="timeline-details">
                                        <div class="detail-row">
                                            <span class="detail-label">商户</span>
                                            <span class="detail-value">${item.merchant_name}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">凭证号</span>
                                            <span class="detail-value voucher-code">${item.bank_voucher}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="detail-label">类型</span>
                                            <span class="detail-value">${item.business_type}</span>
                                        </div>
                                        ${item.success_time && item.success_time !== '-' ? `
                                            <div class="detail-row">
                                                <span class="detail-label">完成时间</span>
                                                <span class="detail-value">${item.success_time}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <div class="timeline-actions">
                                        <button class="timeline-action-btn" onclick="window.orderInfoTable.viewOrderDetails('${item.order_number}')">
                                            查看详情
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        timelineContainer.innerHTML = timelineHtml;
        console.log(`OrderInfoTable: 时间线视图已渲染 ${Object.keys(groupedData).length} 天的数据`);
    }
    
    /**
     * 更新筛选统计
     */
    updateFilterStats() {
        const stats = {
            total: this.originalData.length,
            filtered: this.currentData.length,
            success: this.currentData.filter(row => row.status === '交易成功').length,
            failed: this.currentData.filter(row => row.status === '交易失败').length
        };
        
        console.log('OrderInfoTable: 筛选统计更新:', stats);
        
        // 可以在这里更新UI显示统计信息
    }
    
    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `table-notification table-notification--${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动消失
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return 'ℹ️';
        }
    }
    
    /**
     * 格式化日期
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}`;
    }
    
    /**
     * 刷新数据
     */
    refresh() {
        console.log('OrderInfoTable: 刷新数据...');
        this.showNotification('正在刷新数据...', 'info');
        this.loadOrderData();
    }
    
    /**
     * 按日期分组数据
     */
    groupDataByDate(data) {
        return data.reduce((groups, item) => {
            const date = item.created_time.split(' ')[0]; // 获取日期部分
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(item);
            return groups;
        }, {});
    }
    
    /**
     * 格式化时间线日期显示
     */
    formatTimelineDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const dateString = date.toDateString();
        const todayString = today.toDateString();
        const yesterdayString = yesterday.toDateString();
        
        if (dateString === todayString) {
            return `今天 (${dateStr})`;
        } else if (dateString === yesterdayString) {
            return `昨天 (${dateStr})`;
        } else {
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const weekday = weekdays[date.getDay()];
            return `${weekday} (${dateStr})`;
        }
    }
    
    /**
     * 提取时间部分
     */
    extractTime(dateTimeStr) {
        return dateTimeStr.split(' ')[1] || '';
    }
    
    /**
     * 切换时间线日期展开/收起
     */
    toggleTimelineDay(dateKey) {
        const contentId = `timeline-${dateKey.replace(/[-\s:]/g, '')}`;
        const content = document.getElementById(contentId);
        const toggleBtn = document.querySelector(`[onclick*="toggleTimelineDay('${dateKey}')"] .toggle-icon`);
        
        if (content && toggleBtn) {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggleBtn.textContent = '▼';
            } else {
                content.style.display = 'none';
                toggleBtn.textContent = '▶';
            }
        }
    }
    
    /**
     * 查看订单详情
     */
    viewOrderDetails(orderNumber) {
        console.log('OrderInfoTable: 查看订单详情:', orderNumber);
        this.showNotification(`正在查看订单 ${orderNumber} 的详情...`, 'info');
        // TODO: 实现订单详情弹窗
    }
    
    /**
     * 导出单个订单
     */
    exportSingleOrder(orderNumber) {
        console.log('OrderInfoTable: 导出单个订单:', orderNumber);
        const orderData = this.originalData.find(item => item.order_number === orderNumber);
        if (orderData) {
            this.exportToCSV([orderData], `single_order_${orderNumber}`);
        } else {
            this.showNotification('订单数据未找到', 'error');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('advancedDataTable')) {
        window.orderInfoTable = new OrderInfoTable();
        console.log('OrderInfoTable 全局实例已创建');
    }
});

// 暴露给全局使用
window.OrderInfoTable = OrderInfoTable;