/**
 * Advanced Table Component
 * Extends the basic table with advanced features like filtering, search, virtual scrolling, and column management
 */

class AdvancedTable extends TableComponent {
  constructor(container, options = {}) {
    super(container, {
      ...options,
      filterable: true,
      searchable: true,
      virtualScroll: false,
      columnResizable: true,
      columnHideable: true,
      pageSize: 50,
      ...options
    });
    
    this.originalData = [];
    this.filteredData = [];
    this.searchTerm = '';
    this.filters = {};
    this.visibleColumns = new Set();
    this.columnWidths = {};
    this.virtualScrollTop = 0;
    this.virtualRowHeight = 48;
    this.virtualVisibleRows = 0;
    
    this.initAdvancedFeatures();
  }
  
  initAdvancedFeatures() {
    if (this.options.searchable || this.options.filterable) {
      this.createToolbar();
    }
    
    if (this.options.columnHideable) {
      this.createColumnManager();
    }
    
    if (this.options.virtualScroll) {
      this.setupVirtualScroll();
    }
    
    this.bindAdvancedEvents();
  }
  
  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'table-toolbar';
    this.toolbar.innerHTML = `
      <div class="table-toolbar-left">
        ${this.options.searchable ? `
          <div class="table-search">
            <input type="text" class="table-search-input" placeholder="搜索...">
            <button class="table-search-clear" title="清除搜索">×</button>
          </div>
        ` : ''}
        ${this.options.filterable ? `
          <div class="table-filters">
            <button class="btn btn-outline table-filter-toggle">
              <span class="icon">🔍</span>
              筛选
              <span class="filter-count" style="display: none;"></span>
            </button>
          </div>
        ` : ''}
      </div>
      <div class="table-toolbar-right">
        ${this.options.columnHideable ? `
          <button class="btn btn-outline table-columns-toggle">
            <span class="icon">⚙️</span>
            列设置
          </button>
        ` : ''}
        <button class="btn btn-outline table-export">
          <span class="icon">📥</span>
          导出
        </button>
      </div>
    `;
    
    this.container.insertBefore(this.toolbar, this.table);
    
    if (this.options.filterable) {
      this.createFilterPanel();
    }
  }
  
  createFilterPanel() {
    this.filterPanel = document.createElement('div');
    this.filterPanel.className = 'table-filter-panel';
    this.filterPanel.style.display = 'none';
    
    this.container.insertBefore(this.filterPanel, this.table);
  }
  
  createColumnManager() {
    this.columnManager = document.createElement('div');
    this.columnManager.className = 'table-column-manager';
    this.columnManager.style.display = 'none';
    this.columnManager.innerHTML = `
      <div class="column-manager-header">
        <h3>列设置</h3>
        <button class="column-manager-close">×</button>
      </div>
      <div class="column-manager-body">
        <div class="column-list"></div>
      </div>
      <div class="column-manager-footer">
        <button class="btn btn-outline" data-action="reset">重置</button>
        <button class="btn btn-primary" data-action="apply">应用</button>
      </div>
    `;
    
    this.container.appendChild(this.columnManager);
  }
  
  setupVirtualScroll() {
    this.virtualContainer = document.createElement('div');
    this.virtualContainer.className = 'table-virtual-container';
    this.virtualContainer.style.height = '400px';
    this.virtualContainer.style.overflow = 'auto';
    
    this.virtualSpacer = document.createElement('div');
    this.virtualSpacer.className = 'table-virtual-spacer';
    
    this.container.appendChild(this.virtualContainer);
    this.virtualContainer.appendChild(this.virtualSpacer);
    this.virtualContainer.appendChild(this.table);
  }
  
  bindAdvancedEvents() {
    if (this.toolbar) {
      // Search functionality
      const searchInput = this.toolbar.querySelector('.table-search-input');
      const searchClear = this.toolbar.querySelector('.table-search-clear');
      
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            this.search(e.target.value);
          }, 300);
        });
        
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.clearSearch();
          }
        });
      }
      
      if (searchClear) {
        searchClear.addEventListener('click', () => {
          this.clearSearch();
        });
      }
      
      // Filter toggle
      const filterToggle = this.toolbar.querySelector('.table-filter-toggle');
      if (filterToggle) {
        filterToggle.addEventListener('click', () => {
          this.toggleFilterPanel();
        });
      }
      
      // Column manager toggle
      const columnsToggle = this.toolbar.querySelector('.table-columns-toggle');
      if (columnsToggle) {
        columnsToggle.addEventListener('click', () => {
          this.toggleColumnManager();
        });
      }
      
      // Export button
      const exportBtn = this.toolbar.querySelector('.table-export');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          this.exportData();
        });
      }
    }
    
    // Column resizing
    if (this.options.columnResizable) {
      this.bindColumnResizing();
    }
    
    // Virtual scrolling
    if (this.options.virtualScroll && this.virtualContainer) {
      this.virtualContainer.addEventListener('scroll', () => {
        this.handleVirtualScroll();
      });
    }
  }
  
  bindColumnResizing() {
    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;
    
    this.thead.addEventListener('mousedown', (e) => {
      const th = e.target.closest('th');
      if (!th) return;
      
      const rect = th.getBoundingClientRect();
      const isNearRightEdge = e.clientX > rect.right - 10;
      
      if (isNearRightEdge) {
        isResizing = true;
        currentColumn = th;
        startX = e.clientX;
        startWidth = th.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) {
        // Show resize cursor when near column edge
        const th = e.target.closest('th');
        if (th) {
          const rect = th.getBoundingClientRect();
          const isNearRightEdge = e.clientX > rect.right - 10;
          th.style.cursor = isNearRightEdge ? 'col-resize' : 'default';
        }
        return;
      }
      
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      
      currentColumn.style.width = newWidth + 'px';
      this.columnWidths[currentColumn.dataset.key] = newWidth;
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        currentColumn = null;
        document.body.style.cursor = 'default';
      }
    });
  }
  
  setData(data) {
    this.originalData = [...data];
    this.applyFiltersAndSearch();
    return this;
  }
  
  applyFiltersAndSearch() {
    let filtered = [...this.originalData];
    
    // Apply search
    if (this.searchTerm) {
      filtered = filtered.filter(row => {
        return this.columns.some(column => {
          const value = row[column.key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(this.searchTerm.toLowerCase());
        });
      });
    }
    
    // Apply filters
    Object.keys(this.filters).forEach(key => {
      const filterValue = this.filters[key];
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter(row => {
          const value = row[key];
          if (value == null) return false;
          
          if (Array.isArray(filterValue)) {
            return filterValue.includes(value);
          } else {
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          }
        });
      }
    });
    
    this.filteredData = filtered;
    this.data = filtered;
    
    if (this.options.virtualScroll) {
      this.updateVirtualScroll();
    } else {
      this.renderBody();
    }
    
    this.updateFilterCount();
    return this;
  }
  
  search(term) {
    this.searchTerm = term;
    this.applyFiltersAndSearch();
    
    const searchInput = this.toolbar?.querySelector('.table-search-input');
    const searchClear = this.toolbar?.querySelector('.table-search-clear');
    
    if (searchClear) {
      searchClear.style.display = term ? 'block' : 'none';
    }
    
    this.emit('search', { term, results: this.filteredData.length });
  }
  
  clearSearch() {
    this.searchTerm = '';
    const searchInput = this.toolbar?.querySelector('.table-search-input');
    const searchClear = this.toolbar?.querySelector('.table-search-clear');
    
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';
    
    this.applyFiltersAndSearch();
  }
  
  addFilter(column, value) {
    this.filters[column] = value;
    this.applyFiltersAndSearch();
    this.emit('filter', { column, value, filters: this.filters });
  }
  
  removeFilter(column) {
    delete this.filters[column];
    this.applyFiltersAndSearch();
    this.emit('filter', { column, value: null, filters: this.filters });
  }
  
  clearFilters() {
    this.filters = {};
    this.applyFiltersAndSearch();
    this.emit('filter', { filters: this.filters });
  }
  
  toggleFilterPanel() {
    if (!this.filterPanel) return;
    
    const isVisible = this.filterPanel.style.display !== 'none';
    this.filterPanel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.renderFilterPanel();
    }
  }
  
  renderFilterPanel() {
    if (!this.filterPanel) return;
    
    const filterControls = this.columns.map(column => {
      if (column.filterable === false) return '';
      
      const uniqueValues = [...new Set(this.originalData.map(row => row[column.key]))]
        .filter(value => value != null)
        .sort();
      
      return `
        <div class="filter-control">
          <label class="filter-label">${column.title}</label>
          ${uniqueValues.length <= 10 ? `
            <select class="filter-select" data-column="${column.key}">
              <option value="">全部</option>
              ${uniqueValues.map(value => `
                <option value="${value}" ${this.filters[column.key] === value ? 'selected' : ''}>
                  ${value}
                </option>
              `).join('')}
            </select>
          ` : `
            <input type="text" class="filter-input" data-column="${column.key}" 
                   placeholder="筛选 ${column.title}" 
                   value="${this.filters[column.key] || ''}">
          `}
        </div>
      `;
    }).join('');
    
    this.filterPanel.innerHTML = `
      <div class="filter-panel-header">
        <h3>筛选条件</h3>
        <button class="filter-clear-all">清除全部</button>
      </div>
      <div class="filter-panel-body">
        ${filterControls}
      </div>
    `;
    
    // Bind filter events
    this.filterPanel.addEventListener('change', (e) => {
      if (e.target.classList.contains('filter-select')) {
        const column = e.target.dataset.column;
        const value = e.target.value;
        
        if (value) {
          this.addFilter(column, value);
        } else {
          this.removeFilter(column);
        }
      }
    });
    
    this.filterPanel.addEventListener('input', (e) => {
      if (e.target.classList.contains('filter-input')) {
        const column = e.target.dataset.column;
        const value = e.target.value;
        
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
          if (value) {
            this.addFilter(column, value);
          } else {
            this.removeFilter(column);
          }
        }, 300);
      }
    });
    
    this.filterPanel.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-clear-all')) {
        this.clearFilters();
        this.renderFilterPanel();
      }
    });
  }
  
  updateFilterCount() {
    const filterCount = this.toolbar?.querySelector('.filter-count');
    if (!filterCount) return;
    
    const activeFilters = Object.keys(this.filters).length;
    
    if (activeFilters > 0) {
      filterCount.textContent = activeFilters;
      filterCount.style.display = 'inline';
    } else {
      filterCount.style.display = 'none';
    }
  }
  
  toggleColumnManager() {
    if (!this.columnManager) return;
    
    const isVisible = this.columnManager.style.display !== 'none';
    this.columnManager.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.renderColumnManager();
    }
  }
  
  renderColumnManager() {
    if (!this.columnManager) return;
    
    const columnList = this.columnManager.querySelector('.column-list');
    
    columnList.innerHTML = this.columns.map(column => `
      <div class="column-item" data-key="${column.key}">
        <label class="column-checkbox">
          <input type="checkbox" ${this.visibleColumns.has(column.key) ? 'checked' : ''}>
          <span class="column-title">${column.title}</span>
        </label>
        <div class="column-controls">
          <button class="column-move-up" title="上移">↑</button>
          <button class="column-move-down" title="下移">↓</button>
        </div>
      </div>
    `).join('');
    
    // Bind column manager events
    this.columnManager.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const columnKey = e.target.closest('.column-item').dataset.key;
        
        if (e.target.checked) {
          this.visibleColumns.add(columnKey);
        } else {
          this.visibleColumns.delete(columnKey);
        }
      }
    });
    
    this.columnManager.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'reset':
          this.resetColumns();
          break;
        case 'apply':
          this.applyColumnSettings();
          break;
      }
      
      if (e.target.classList.contains('column-manager-close')) {
        this.columnManager.style.display = 'none';
      }
    });
  }
  
  resetColumns() {
    this.visibleColumns.clear();
    this.columns.forEach(column => {
      this.visibleColumns.add(column.key);
    });
    this.renderColumnManager();
    this.renderHeader();
    this.renderBody();
  }
  
  applyColumnSettings() {
    this.renderHeader();
    this.renderBody();
    this.columnManager.style.display = 'none';
    this.emit('columnsChanged', { visibleColumns: Array.from(this.visibleColumns) });
  }
  
  updateVirtualScroll() {
    if (!this.options.virtualScroll || !this.virtualContainer) return;
    
    const totalHeight = this.filteredData.length * this.virtualRowHeight;
    this.virtualSpacer.style.height = totalHeight + 'px';
    
    this.handleVirtualScroll();
  }
  
  handleVirtualScroll() {
    if (!this.options.virtualScroll) return;
    
    const scrollTop = this.virtualContainer.scrollTop;
    const containerHeight = this.virtualContainer.clientHeight;
    
    const startIndex = Math.floor(scrollTop / this.virtualRowHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / this.virtualRowHeight) + 5,
      this.filteredData.length
    );
    
    this.virtualVisibleRows = endIndex - startIndex;
    
    // Render only visible rows
    const visibleData = this.filteredData.slice(startIndex, endIndex);
    this.renderVirtualRows(visibleData, startIndex);
    
    // Update table position
    this.table.style.transform = `translateY(${startIndex * this.virtualRowHeight}px)`;
  }
  
  renderVirtualRows(data, startIndex) {
    const fragment = document.createDocumentFragment();
    
    data.forEach((row, index) => {
      const actualIndex = startIndex + index;
      const tr = document.createElement('tr');
      tr.dataset.index = actualIndex;
      tr.style.height = this.virtualRowHeight + 'px';
      
      if (this.selectedRows.has(actualIndex)) {
        tr.classList.add('selected');
      }
      
      // Add selection column if selectable
      if (this.options.selectable) {
        const selectTd = document.createElement('td');
        selectTd.className = 'select-column';
        selectTd.innerHTML = `
          <input type="checkbox" class="select-checkbox select-row" 
                 ${this.selectedRows.has(actualIndex) ? 'checked' : ''}>
        `;
        tr.appendChild(selectTd);
      }
      
      this.columns.forEach(column => {
        if (!this.visibleColumns.has(column.key) && this.visibleColumns.size > 0) {
          return;
        }
        
        const td = document.createElement('td');
        
        if (column.render) {
          td.innerHTML = column.render(row[column.key], row, actualIndex);
        } else {
          td.textContent = row[column.key] || '';
        }
        
        if (column.align) {
          td.style.textAlign = column.align;
        }
        
        if (column.className) {
          td.className = column.className;
        }
        
        tr.appendChild(td);
      });
      
      fragment.appendChild(tr);
    });
    
    this.tbody.innerHTML = '';
    this.tbody.appendChild(fragment);
  }
  
  exportData(format = 'csv') {
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.originalData;
    
    switch (format) {
      case 'csv':
        this.exportCSV(dataToExport);
        break;
      case 'json':
        this.exportJSON(dataToExport);
        break;
      default:
        this.exportCSV(dataToExport);
    }
    
    this.emit('export', { format, data: dataToExport });
  }
  
  exportCSV(data) {
    const headers = this.columns.map(col => col.title).join(',');
    const rows = data.map(row => 
      this.columns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `table-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
  
  exportJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `table-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }
  
  // Override parent methods to handle visible columns
  renderHeader() {
    const headerRow = document.createElement('tr');
    
    // Add selection column if selectable
    if (this.options.selectable) {
      const selectTh = document.createElement('th');
      selectTh.className = 'select-column';
      selectTh.innerHTML = `
        <input type="checkbox" class="select-checkbox select-all" title="全选">
      `;
      headerRow.appendChild(selectTh);
    }
    
    this.columns.forEach(column => {
      // Skip hidden columns
      if (!this.visibleColumns.has(column.key) && this.visibleColumns.size > 0) {
        return;
      }
      
      const th = document.createElement('th');
      th.textContent = column.title;
      th.dataset.key = column.key;
      
      if (column.sortable !== false && this.options.sortable) {
        th.classList.add('sortable');
        th.title = `点击排序 ${column.title}`;
      }
      
      if (column.align) {
        th.style.textAlign = column.align;
      }
      
      if (this.columnWidths[column.key]) {
        th.style.width = this.columnWidths[column.key] + 'px';
      } else if (column.width) {
        th.style.width = column.width;
      }
      
      headerRow.appendChild(th);
    });
    
    this.thead.innerHTML = '';
    this.thead.appendChild(headerRow);
  }
  
  setColumns(columns) {
    this.columns = columns;
    
    // Initialize visible columns
    if (this.visibleColumns.size === 0) {
      columns.forEach(column => {
        this.visibleColumns.add(column.key);
      });
    }
    
    this.renderHeader();
    return this;
  }
  
  destroy() {
    super.destroy();
    
    if (this.toolbar) {
      this.toolbar.remove();
    }
    
    if (this.filterPanel) {
      this.filterPanel.remove();
    }
    
    if (this.columnManager) {
      this.columnManager.remove();
    }
    
    if (this.virtualContainer) {
      this.virtualContainer.remove();
    }
    
    this.originalData = [];
    this.filteredData = [];
    this.filters = {};
    this.visibleColumns.clear();
    this.columnWidths = {};
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedTable;
} else {
  window.AdvancedTable = AdvancedTable;
}