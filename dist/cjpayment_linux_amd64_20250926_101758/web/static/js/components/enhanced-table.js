/**
 * 增强表格组件 - 支持表格视图和卡片视图切换
 * 提供排序、筛选、分页、固定列等功能
 */

class EnhancedTable {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            title: '数据表格',
            data: [],
            columns: [],
            pageSize: 10,
            currentPage: 1,
            sortable: true,
            filterable: true,
            selectable: false,
            viewSwitchable: true,
            fixedColumns: {
                left: [],
                right: []
            },
            emptyText: '暂无数据',
            loadingText: '加载中...',
            actions: [],
            onRowClick: null,
            onSelectionChange: null,
            onViewChange: null,
            ...options
        };
        
        this.state = {
            currentView: 'table', // 'table' or 'card'
            sortColumn: null,
            sortDirection: 'asc',
            filters: {},
            selectedRows: new Set(),
            filteredData: [],
            paginatedData: [],
            loading: false
        };
        
        this.init();
    }
    
    init() {
        this.createStructure();
        this.bindEvents();
        this.updateData();
    }
    
    // 创建表格结构
    createStructure() {
        this.container.innerHTML = `
            <div class="enhanced-table-container">
                ${this.createToolbar()}
                ${this.createTableView()}
                ${this.createCardView()}
                ${this.createPagination()}
            </div>
        `;
        
        // 缓存重要元素
        this.elements = {
            toolbar: this.container.querySelector('.table-toolbar'),
            tableView: this.container.querySelector('.table-view'),
            cardView: this.container.querySelector('.card-view'),
            tableBody: this.container.querySelector('.table-body'),
            cardGrid: this.container.querySelector('.card-grid'),
            pagination: this.container.querySelector('.table-pagination'),
            viewToggle: this.container.querySelectorAll('.view-toggle-btn'),
            searchInput: this.container.querySelector('.search-input'),
            filterSelects: this.container.querySelectorAll('.filter-select')
        };
    }
    
    // 创建工具栏
    createToolbar() {
        const viewToggle = this.options.viewSwitchable ? `
            <div class="view-toggle">
                <button class="view-toggle-btn active" data-view="table">
                    <span>📋</span> 表格视图
                </button>
                <button class="view-toggle-btn" data-view="card">
                    <span>🃏</span> 卡片视图
                </button>
            </div>
        ` : '';
        
        const filters = this.options.filterable ? `
            <div class="table-filters">
                <input type="text" class="filter-input search-input" placeholder="搜索...">
                ${this.createFilterSelects()}
            </div>
        ` : '';
        
        const actions = this.options.actions.length > 0 ? `
            <div class="table-actions-group">
                ${this.options.actions.map(action => `
                    <button class="action-btn ${action.type || 'primary'}" data-action="${action.key}">
                        ${action.icon ? `<span>${action.icon}</span>` : ''} ${action.label}
                    </button>
                `).join('')}
            </div>
        ` : '';
        
        return `
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <h3 class="table-title">${this.options.title}</h3>
                    ${filters}
                </div>
                <div class="table-actions">
                    ${actions}
                    ${viewToggle}
                </div>
            </div>
        `;
    }
    
    // 创建筛选下拉框
    createFilterSelects() {
        const filterColumns = this.options.columns.filter(col => col.filterable);
        return filterColumns.map(col => {
            const uniqueValues = [...new Set(this.options.data.map(row => row[col.key]))];
            return `
                <select class="filter-select" data-column="${col.key}">
                    <option value="">全部${col.title}</option>
                    ${uniqueValues.map(value => `
                        <option value="${value}">${value}</option>
                    `).join('')}
                </select>
            `;
        }).join('');
    }
    
    // 创建表格视图
    createTableView() {
        const hasFixedColumns = this.options.fixedColumns.left.length > 0 || this.options.fixedColumns.right.length > 0;
        
        return `
            <div class="table-view">
                <div class="table-wrapper ${hasFixedColumns ? 'has-fixed-columns' : ''}">
                    <table class="enhanced-table">
                        <thead class="table-header">
                            <tr>
                                ${this.createTableHeaders()}
                            </tr>
                        </thead>
                        <tbody class="table-body">
                            <!-- 动态填充 -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    // 创建表格头部
    createTableHeaders() {
        return this.options.columns.map((col, index) => {
            const sortable = this.options.sortable && col.sortable !== false;
            const fixed = this.getFixedClass(col.key);
            
            return `
                <th class="table-header-cell ${sortable ? 'sortable' : ''} ${fixed} ${col.className || ''}"
                    data-column="${col.key}"
                    style="${col.width ? `width: ${col.width}` : ''}">
                    ${col.title}
                    ${sortable ? '<span class="sort-icon">↕️</span>' : ''}
                </th>
            `;
        }).join('');
    }
    
    // 创建卡片视图
    createCardView() {
        return `
            <div class="card-view">
                <div class="card-grid">
                    <!-- 动态填充 -->
                </div>
            </div>
        `;
    }
    
    // 创建分页
    createPagination() {
        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    <span class="total-info">共 <strong>0</strong> 条记录</span>
                </div>
                <div class="pagination-controls">
                    <button class="pagination-btn" data-action="first">首页</button>
                    <button class="pagination-btn" data-action="prev">上一页</button>
                    <span class="page-numbers"></span>
                    <button class="pagination-btn" data-action="next">下一页</button>
                    <button class="pagination-btn" data-action="last">末页</button>
                    <select class="pagination-select">
                        <option value="10">10条/页</option>
                        <option value="20">20条/页</option>
                        <option value="50">50条/页</option>
                        <option value="100">100条/页</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    // 绑定事件
    bindEvents() {
        // 视图切换
        if (this.options.viewSwitchable) {
            this.elements.viewToggle.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchView(e.target.dataset.view);
                });
            });
        }
        
        // 搜索
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // 筛选
        this.elements.filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilter(e.target.dataset.column, e.target.value);
            });
        });
        
        // 排序
        if (this.options.sortable) {
            this.container.addEventListener('click', (e) => {
                if (e.target.closest('.table-header-cell.sortable')) {
                    const column = e.target.closest('.table-header-cell').dataset.column;
                    this.handleSort(column);
                }
            });
        }
        
        // 行点击
        this.container.addEventListener('click', (e) => {
            const row = e.target.closest('.table-row, .data-card');
            if (row && this.options.onRowClick) {
                const index = parseInt(row.dataset.index);
                this.options.onRowClick(this.state.paginatedData[index], index);
            }
        });
        
        // 分页
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                this.handlePagination(e.target.dataset.action);
            }
        });
        
        // 页面大小改变
        const pageSizeSelect = this.container.querySelector('.pagination-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.options.pageSize = parseInt(e.target.value);
                this.state.currentPage = 1;
                this.updateData();
            });
        }
        
        // 表格操作按钮
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('.action-btn[data-action]')) {
                const action = e.target.dataset.action;
                const actionConfig = this.options.actions.find(a => a.key === action);
                if (actionConfig && actionConfig.handler) {
                    actionConfig.handler();
                }
            }
        });
    }
    
    // 切换视图
    switchView(view) {
        this.state.currentView = view;
        
        // 更新按钮状态
        this.elements.viewToggle.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 切换视图显示
        this.elements.tableView.classList.toggle('hidden', view !== 'table');
        this.elements.cardView.classList.toggle('active', view === 'card');
        
        // 回调
        if (this.options.onViewChange) {
            this.options.onViewChange(view);
        }
        
        this.render();
    }
    
    // 处理搜索
    handleSearch(query) {
        this.state.searchQuery = query.toLowerCase();
        this.state.currentPage = 1;
        this.updateData();
    }
    
    // 处理筛选
    handleFilter(column, value) {
        if (value) {
            this.state.filters[column] = value;
        } else {
            delete this.state.filters[column];
        }
        this.state.currentPage = 1;
        this.updateData();
    }
    
    // 处理排序
    handleSort(column) {
        if (this.state.sortColumn === column) {
            this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortColumn = column;
            this.state.sortDirection = 'asc';
        }
        
        this.updateSortIcons();
        this.updateData();
    }
    
    // 更新排序图标
    updateSortIcons() {
        this.container.querySelectorAll('.table-header-cell').forEach(header => {
            const column = header.dataset.column;
            const icon = header.querySelector('.sort-icon');
            
            if (icon) {
                if (column === this.state.sortColumn) {
                    icon.textContent = this.state.sortDirection === 'asc' ? '↑' : '↓';
                    header.classList.add('sorted');
                } else {
                    icon.textContent = '↕️';
                    header.classList.remove('sorted');
                }
            }
        });
    }
    
    // 处理分页
    handlePagination(action) {
        const totalPages = Math.ceil(this.state.filteredData.length / this.options.pageSize);
        
        switch (action) {
            case 'first':
                this.state.currentPage = 1;
                break;
            case 'prev':
                this.state.currentPage = Math.max(1, this.state.currentPage - 1);
                break;
            case 'next':
                this.state.currentPage = Math.min(totalPages, this.state.currentPage + 1);
                break;
            case 'last':
                this.state.currentPage = totalPages;
                break;
        }
        
        this.updateData();
    }
    
    // 更新数据
    updateData() {
        this.applyFilters();
        this.applySorting();
        this.applyPagination();
        this.render();
        this.updatePaginationInfo();
    }
    
    // 应用筛选
    applyFilters() {
        let filtered = [...this.options.data];
        
        // 搜索筛选
        if (this.state.searchQuery) {
            filtered = filtered.filter(row => {
                return this.options.columns.some(col => {
                    const value = this.getCellValue(row, col);
                    return String(value).toLowerCase().includes(this.state.searchQuery);
                });
            });
        }
        
        // 列筛选
        Object.entries(this.state.filters).forEach(([column, value]) => {
            filtered = filtered.filter(row => row[column] === value);
        });
        
        this.state.filteredData = filtered;
    }
    
    // 应用排序
    applySorting() {
        if (this.state.sortColumn) {
            const column = this.options.columns.find(col => col.key === this.state.sortColumn);
            
            this.state.filteredData.sort((a, b) => {
                let aVal = a[this.state.sortColumn];
                let bVal = b[this.state.sortColumn];
                
                // 自定义排序函数
                if (column && column.sortFunction) {
                    return column.sortFunction(aVal, bVal, this.state.sortDirection);
                }
                
                // 数字排序
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return this.state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                // 字符串排序
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                
                if (this.state.sortDirection === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            });
        }
    }
    
    // 应用分页
    applyPagination() {
        const start = (this.state.currentPage - 1) * this.options.pageSize;
        const end = start + this.options.pageSize;
        this.state.paginatedData = this.state.filteredData.slice(start, end);
    }
    
    // 渲染
    render() {
        if (this.state.loading) {
            this.renderLoading();
            return;
        }
        
        if (this.state.paginatedData.length === 0) {
            this.renderEmpty();
            return;
        }
        
        if (this.state.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderCardView();
        }
    }
    
    // 渲染表格视图
    renderTableView() {
        const tbody = this.elements.tableBody;
        tbody.innerHTML = this.state.paginatedData.map((row, index) => {
            const isSelected = this.state.selectedRows.has(row.id);
            return `
                <tr class="table-row ${isSelected ? 'selected' : ''}" data-index="${index}">
                    ${this.options.columns.map(col => {
                        const value = this.getCellValue(row, col);
                        const fixed = this.getFixedClass(col.key);
                        return `
                            <td class="table-cell ${fixed} ${col.className || ''}"
                                title="${value}">
                                ${this.formatCellValue(value, col, row)}
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        }).join('');
    }
    
    // 渲染卡片视图
    renderCardView() {
        const cardGrid = this.elements.cardGrid;
        cardGrid.innerHTML = this.state.paginatedData.map((row, index) => {
            const isSelected = this.state.selectedRows.has(row.id);
            return `
                <div class="data-card ${isSelected ? 'selected' : ''}" data-index="${index}">
                    ${this.renderCardContent(row)}
                </div>
            `;
        }).join('');
    }
    
    // 渲染卡片内容
    renderCardContent(row) {
        const titleColumn = this.options.columns.find(col => col.cardTitle) || this.options.columns[0];
        const statusColumn = this.options.columns.find(col => col.cardStatus);
        const fieldsToShow = this.options.columns.filter(col => !col.cardTitle && !col.cardStatus && col.showInCard !== false);
        
        return `
            <div class="card-header">
                <div class="card-title">${this.getCellValue(row, titleColumn)}</div>
                ${statusColumn ? `
                    <div class="card-badge ${this.getStatusClass(row[statusColumn.key])}">
                        ${this.formatCellValue(row[statusColumn.key], statusColumn, row)}
                    </div>
                ` : ''}
            </div>
            <div class="card-content">
                ${fieldsToShow.map(col => `
                    <div class="card-field">
                        <span class="card-field-label">${col.title}</span>
                        <span class="card-field-value">${this.formatCellValue(this.getCellValue(row, col), col, row)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="card-actions">
                ${this.renderRowActions(row)}
            </div>
        `;
    }
    
    // 渲染行操作按钮
    renderRowActions(row) {
        const actionColumn = this.options.columns.find(col => col.key === 'actions');
        if (actionColumn && actionColumn.render) {
            return actionColumn.render(row);
        }
        return '';
    }
    
    // 渲染加载状态
    renderLoading() {
        const content = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>${this.options.loadingText}</span>
            </div>
        `;
        
        if (this.state.currentView === 'table') {
            this.elements.tableBody.innerHTML = `
                <tr><td colspan="${this.options.columns.length}">${content}</td></tr>
            `;
        } else {
            this.elements.cardGrid.innerHTML = content;
        }
    }
    
    // 渲染空状态
    renderEmpty() {
        const content = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <div class="empty-title">暂无数据</div>
                <div class="empty-description">${this.options.emptyText}</div>
            </div>
        `;
        
        if (this.state.currentView === 'table') {
            this.elements.tableBody.innerHTML = `
                <tr><td colspan="${this.options.columns.length}">${content}</td></tr>
            `;
        } else {
            this.elements.cardGrid.innerHTML = content;
        }
    }
    
    // 更新分页信息
    updatePaginationInfo() {
        const totalPages = Math.ceil(this.state.filteredData.length / this.options.pageSize);
        const start = (this.state.currentPage - 1) * this.options.pageSize + 1;
        const end = Math.min(start + this.options.pageSize - 1, this.state.filteredData.length);
        
        // 更新总记录数
        const totalInfo = this.container.querySelector('.total-info');
        if (totalInfo) {
            totalInfo.innerHTML = `共 <strong>${this.state.filteredData.length}</strong> 条记录，显示第 <strong>${start}</strong> 到 <strong>${end}</strong> 条`;
        }
        
        // 更新分页按钮状态
        const firstBtn = this.container.querySelector('[data-action="first"]');
        const prevBtn = this.container.querySelector('[data-action="prev"]');
        const nextBtn = this.container.querySelector('[data-action="next"]');
        const lastBtn = this.container.querySelector('[data-action="last"]');
        
        if (firstBtn) firstBtn.disabled = this.state.currentPage === 1;
        if (prevBtn) prevBtn.disabled = this.state.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.state.currentPage === totalPages;
        if (lastBtn) lastBtn.disabled = this.state.currentPage === totalPages;
        
        // 更新页码
        this.renderPageNumbers(totalPages);
    }
    
    // 渲染页码
    renderPageNumbers(totalPages) {
        const pageNumbers = this.container.querySelector('.page-numbers');
        if (!pageNumbers) return;
        
        const maxVisible = 5;
        let start = Math.max(1, this.state.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(`
                <button class="pagination-btn ${i === this.state.currentPage ? 'active' : ''}"
                        onclick="this.closest('.enhanced-table-container').__table__.goToPage(${i})">
                    ${i}
                </button>
            `);
        }
        
        pageNumbers.innerHTML = pages.join('');
    }
    
    // 工具方法
    getCellValue(row, column) {
        if (column.render && typeof column.render === 'function') {
            return column.render(row[column.key], row);
        }
        return row[column.key];
    }
    
    formatCellValue(value, column, row) {
        if (column.format && typeof column.format === 'function') {
            return column.format(value, row);
        }
        
        if (value === null || value === undefined) {
            return '-';
        }
        
        return String(value);
    }
    
    getFixedClass(columnKey) {
        if (this.options.fixedColumns.left.includes(columnKey)) {
            return 'fixed-left';
        }
        if (this.options.fixedColumns.right.includes(columnKey)) {
            return 'fixed-right';
        }
        return '';
    }
    
    getStatusClass(status) {
        const statusMap = {
            'success': 'success',
            'active': 'success',
            'enabled': 'success',
            'completed': 'success',
            'warning': 'warning',
            'pending': 'warning',
            'processing': 'warning',
            'error': 'error',
            'failed': 'error',
            'disabled': 'error',
            'rejected': 'error'
        };
        
        return statusMap[String(status).toLowerCase()] || 'info';
    }
    
    // 公共API
    setData(data) {
        this.options.data = data;
        this.state.currentPage = 1;
        this.updateData();
    }
    
    addRow(row) {
        this.options.data.push(row);
        this.updateData();
    }
    
    removeRow(id) {
        this.options.data = this.options.data.filter(row => row.id !== id);
        this.updateData();
    }
    
    updateRow(id, updates) {
        const index = this.options.data.findIndex(row => row.id === id);
        if (index !== -1) {
            this.options.data[index] = { ...this.options.data[index], ...updates };
            this.updateData();
        }
    }
    
    goToPage(page) {
        this.state.currentPage = page;
        this.updateData();
    }
    
    setLoading(loading) {
        this.state.loading = loading;
        this.render();
    }
    
    getSelectedRows() {
        return this.options.data.filter(row => this.state.selectedRows.has(row.id));
    }
    
    selectAll() {
        this.state.filteredData.forEach(row => {
            this.state.selectedRows.add(row.id);
        });
        this.render();
    }
    
    clearSelection() {
        this.state.selectedRows.clear();
        this.render();
    }
    
    refresh() {
        this.updateData();
    }
    
    destroy() {
        this.container.innerHTML = '';
    }
}

// 导出为全局变量
window.EnhancedTable = EnhancedTable;