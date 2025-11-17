/**
 * Modern Table Component System
 * Provides enhanced table functionality with sorting, selection, and loading states
 */

class TableComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      sortable: true,
      selectable: false,
      hoverable: true,
      striped: false,
      compact: false,
      bordered: false,
      emptyMessage: '暂无数据',
      loadingMessage: '加载中...',
      ...options
    };
    
    this.data = [];
    this.columns = [];
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.selectedRows = new Set();
    this.isLoading = false;
    
    this.init();
  }
  
  init() {
    if (!this.container) {
      console.error('Table container not found');
      return;
    }
    
    this.createTableStructure();
    this.bindEvents();
  }
  
  createTableStructure() {
    this.container.className = 'table-container';
    
    // Add table variants
    if (this.options.striped) this.container.classList.add('table-striped');
    if (this.options.compact) this.container.classList.add('table-compact');
    if (this.options.bordered) this.container.classList.add('table-bordered');
    
    this.table = document.createElement('table');
    this.table.className = 'table';
    
    this.thead = document.createElement('thead');
    this.tbody = document.createElement('tbody');
    
    this.table.appendChild(this.thead);
    this.table.appendChild(this.tbody);
    this.container.appendChild(this.table);
    
    // Create bulk actions bar if selectable
    if (this.options.selectable) {
      this.createBulkActionsBar();
    }
  }
  
  createBulkActionsBar() {
    this.bulkActionsBar = document.createElement('div');
    this.bulkActionsBar.className = 'table-bulk-actions';
    
    this.bulkActionsBar.innerHTML = `
      <div class="table-bulk-actions-info">
        <span class="selected-count">0</span> 项已选中
      </div>
      <div class="table-bulk-actions-buttons">
        <button class="btn" data-action="delete">删除</button>
        <button class="btn" data-action="export">导出</button>
        <button class="btn" data-action="clear">清除选择</button>
      </div>
    `;
    
    this.container.appendChild(this.bulkActionsBar);
  }
  
  setColumns(columns) {
    this.columns = columns;
    this.renderHeader();
    return this;
  }
  
  setData(data) {
    this.data = data;
    this.renderBody();
    return this;
  }
  
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
      
      if (column.width) {
        th.style.width = column.width;
      }
      
      headerRow.appendChild(th);
    });
    
    this.thead.innerHTML = '';
    this.thead.appendChild(headerRow);
  }
  
  renderBody() {
    if (this.isLoading) {
      this.renderLoadingState();
      return;
    }
    
    if (this.data.length === 0) {
      this.renderEmptyState();
      return;
    }
    
    const fragment = document.createDocumentFragment();
    
    this.data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.dataset.index = index;
      
      if (this.selectedRows.has(index)) {
        tr.classList.add('selected');
      }
      
      // Add selection column if selectable
      if (this.options.selectable) {
        const selectTd = document.createElement('td');
        selectTd.className = 'select-column';
        selectTd.innerHTML = `
          <input type="checkbox" class="select-checkbox select-row" 
                 ${this.selectedRows.has(index) ? 'checked' : ''}>
        `;
        tr.appendChild(selectTd);
      }
      
      this.columns.forEach(column => {
        const td = document.createElement('td');
        
        if (column.render) {
          td.innerHTML = column.render(row[column.key], row, index);
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
  
  renderLoadingState() {
    this.container.classList.add('table-loading');
    
    // Create skeleton rows
    const fragment = document.createDocumentFragment();
    const skeletonRowCount = 5;
    
    for (let i = 0; i < skeletonRowCount; i++) {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';
      
      // Add selection column skeleton if selectable
      if (this.options.selectable) {
        const selectTd = document.createElement('td');
        selectTd.className = 'select-column';
        selectTd.innerHTML = '<div class="skeleton-cell" style="width: 16px;"></div>';
        tr.appendChild(selectTd);
      }
      
      this.columns.forEach(column => {
        const td = document.createElement('td');
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-cell';
        skeleton.style.width = Math.random() * 50 + 50 + '%';
        td.appendChild(skeleton);
        tr.appendChild(td);
      });
      
      fragment.appendChild(tr);
    }
    
    this.tbody.innerHTML = '';
    this.tbody.appendChild(fragment);
  }
  
  renderEmptyState() {
    this.container.classList.remove('table-loading');
    
    const colSpan = this.columns.length + (this.options.selectable ? 1 : 0);
    
    this.tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="table-empty">
          <div class="table-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>
          </div>
          <div class="table-empty-title">暂无数据</div>
          <div class="table-empty-description">${this.options.emptyMessage}</div>
        </td>
      </tr>
    `;
  }
  
  bindEvents() {
    // Header click for sorting
    this.thead.addEventListener('click', (e) => {
      const th = e.target.closest('th');
      if (!th || !th.classList.contains('sortable')) return;
      
      const key = th.dataset.key;
      this.sort(key);
    });
    
    // Row selection
    if (this.options.selectable) {
      this.tbody.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-row')) {
          const row = e.target.closest('tr');
          const index = parseInt(row.dataset.index);
          
          if (e.target.checked) {
            this.selectedRows.add(index);
            row.classList.add('selected');
          } else {
            this.selectedRows.delete(index);
            row.classList.remove('selected');
          }
          
          this.updateBulkActions();
          this.updateSelectAllState();
        }
      });
      
      // Select all functionality
      this.thead.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-all')) {
          if (e.target.checked) {
            this.selectAll();
          } else {
            this.clearSelection();
          }
        }
      });
      
      // Bulk actions
      if (this.bulkActionsBar) {
        this.bulkActionsBar.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          if (!action) return;
          
          switch (action) {
            case 'clear':
              this.clearSelection();
              break;
            case 'delete':
              this.emit('bulkDelete', Array.from(this.selectedRows));
              break;
            case 'export':
              this.emit('bulkExport', Array.from(this.selectedRows));
              break;
          }
        });
      }
    }
    
    // Row hover effects
    if (this.options.hoverable) {
      this.tbody.addEventListener('mouseenter', (e) => {
        const row = e.target.closest('tr');
        if (row && !row.classList.contains('skeleton-row')) {
          this.emit('rowHover', {
            row: row,
            index: parseInt(row.dataset.index),
            data: this.data[parseInt(row.dataset.index)]
          });
        }
      }, true);
    }
    
    // Row click
    this.tbody.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (row && !row.classList.contains('skeleton-row') && !e.target.classList.contains('select-checkbox')) {
        this.emit('rowClick', {
          row: row,
          index: parseInt(row.dataset.index),
          data: this.data[parseInt(row.dataset.index)]
        });
      }
    });
  }
  
  sort(key, direction = null) {
    if (this.sortColumn === key && direction === null) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = key;
      this.sortDirection = direction || 'asc';
    }
    
    // Update header visual state
    this.thead.querySelectorAll('th').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.key === key) {
        th.classList.add(`sort-${this.sortDirection}`);
      }
    });
    
    // Sort data
    this.data.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      
      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.renderBody();
    this.emit('sort', { column: key, direction: this.sortDirection });
  }
  
  selectAll() {
    this.selectedRows.clear();
    this.data.forEach((_, index) => {
      this.selectedRows.add(index);
    });
    
    this.tbody.querySelectorAll('tr').forEach(row => {
      row.classList.add('selected');
      const checkbox = row.querySelector('.select-row');
      if (checkbox) checkbox.checked = true;
    });
    
    this.updateBulkActions();
    this.updateSelectAllState();
  }
  
  clearSelection() {
    this.selectedRows.clear();
    
    this.tbody.querySelectorAll('tr').forEach(row => {
      row.classList.remove('selected');
      const checkbox = row.querySelector('.select-row');
      if (checkbox) checkbox.checked = false;
    });
    
    this.updateBulkActions();
    this.updateSelectAllState();
  }
  
  updateSelectAllState() {
    const selectAllCheckbox = this.thead.querySelector('.select-all');
    if (!selectAllCheckbox) return;
    
    const totalRows = this.data.length;
    const selectedCount = this.selectedRows.size;
    
    selectAllCheckbox.checked = selectedCount === totalRows && totalRows > 0;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalRows;
  }
  
  updateBulkActions() {
    if (!this.bulkActionsBar) return;
    
    const selectedCount = this.selectedRows.size;
    const countElement = this.bulkActionsBar.querySelector('.selected-count');
    
    if (countElement) {
      countElement.textContent = selectedCount;
    }
    
    if (selectedCount > 0) {
      this.bulkActionsBar.classList.add('show');
    } else {
      this.bulkActionsBar.classList.remove('show');
    }
  }
  
  setLoading(loading) {
    this.isLoading = loading;
    
    if (loading) {
      this.renderLoadingState();
    } else {
      this.container.classList.remove('table-loading');
      this.renderBody();
    }
    
    return this;
  }
  
  refresh() {
    this.renderBody();
    return this;
  }
  
  getSelectedRows() {
    return Array.from(this.selectedRows).map(index => this.data[index]);
  }
  
  getSelectedIndices() {
    return Array.from(this.selectedRows);
  }
  
  // Event system
  on(event, callback) {
    if (!this.events) this.events = {};
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
    return this;
  }
  
  off(event, callback) {
    if (!this.events || !this.events[event]) return this;
    
    if (callback) {
      const index = this.events[event].indexOf(callback);
      if (index > -1) this.events[event].splice(index, 1);
    } else {
      this.events[event] = [];
    }
    
    return this;
  }
  
  emit(event, data) {
    if (!this.events || !this.events[event]) return this;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Table event callback error:', error);
      }
    });
    
    return this;
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.className = '';
    }
    
    this.events = {};
    this.data = [];
    this.columns = [];
    this.selectedRows.clear();
  }
}

// Status badge helper function
function createStatusBadge(status, text) {
  const statusMap = {
    success: 'success',
    completed: 'success',
    active: 'success',
    pending: 'warning',
    processing: 'warning',
    warning: 'warning',
    failed: 'error',
    error: 'error',
    cancelled: 'error',
    inactive: 'neutral',
    disabled: 'neutral'
  };
  
  const badgeType = statusMap[status] || 'neutral';
  return `<span class="status-badge ${badgeType}">${text || status}</span>`;
}

// Action buttons helper function
function createActionButtons(actions) {
  const buttons = actions.map(action => {
    const className = action.danger ? 'action-btn danger' : 'action-btn';
    const icon = action.icon ? `<span class="icon">${action.icon}</span>` : '';
    return `<button class="${className}" data-action="${action.key}" title="${action.title || action.text}">
      ${icon}${action.text}
    </button>`;
  }).join('');
  
  return `<div class="action-buttons">${buttons}</div>`;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TableComponent, createStatusBadge, createActionButtons };
} else {
  window.TableComponent = TableComponent;
  window.createStatusBadge = createStatusBadge;
  window.createActionButtons = createActionButtons;
}