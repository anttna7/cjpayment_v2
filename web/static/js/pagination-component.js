/**
 * 分页组件
 * 提供现代化的分页功能，支持键盘导航、页面跳转和页面大小选择
 */
class PaginationComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      throw new Error('Pagination container not found');
    }

    // 默认配置
    this.options = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      pageSize: 10,
      pageSizeOptions: [10, 20, 50, 100],
      showInfo: true,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: true,
      maxVisiblePages: 7,
      simple: false,
      compact: false,
      disabled: false,
      onChange: null,
      onPageSizeChange: null,
      ...options
    };

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.setupKeyboardNavigation();
  }

  render() {
    const { currentPage, totalPages, totalItems, pageSize, simple, compact } = this.options;
    
    let className = 'pagination';
    if (simple) className += ' simple';
    if (compact) className += ' compact';

    this.container.innerHTML = `
      <div class="${className}">
        ${this.renderInfo()}
        <div class="pagination-controls">
          ${this.renderNavigation()}
          ${this.renderSizeChanger()}
          ${this.renderQuickJumper()}
        </div>
      </div>
    `;
  }

  renderInfo() {
    if (!this.options.showInfo || this.options.simple) return '';
    
    const { currentPage, pageSize, totalItems } = this.options;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);
    
    return `
      <div class="pagination-info">
        <span>显示 ${start}-${end} 条，共 ${totalItems} 条</span>
      </div>
    `;
  }

  renderNavigation() {
    const { currentPage, totalPages, maxVisiblePages } = this.options;
    
    if (totalPages <= 1) return '';

    let pages = [];
    
    // 计算显示的页码范围
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 上一页按钮
    pages.push(`
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} 
              aria-label="上一页" title="上一页">
        <span class="page-btn-icon">‹</span>
      </button>
    `);

    // 第一页
    if (startPage > 1) {
      pages.push(`<button class="page-btn" data-page="1" aria-label="第1页">1</button>`);
      if (startPage > 2) {
        pages.push(`<span class="page-ellipsis" aria-hidden="true">...</span>`);
      }
    }

    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;
      pages.push(`
        <button class="page-btn ${isActive ? 'active' : ''}" 
                data-page="${i}" 
                aria-label="第${i}页" 
                ${isActive ? 'aria-current="page"' : ''}>
          ${i}
        </button>
      `);
    }

    // 最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(`<span class="page-ellipsis" aria-hidden="true">...</span>`);
      }
      pages.push(`<button class="page-btn" data-page="${totalPages}" aria-label="第${totalPages}页">${totalPages}</button>`);
    }

    // 下一页按钮
    pages.push(`
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} 
              aria-label="下一页" title="下一页">
        <span class="page-btn-icon">›</span>
      </button>
    `);

    return `<div class="pagination-nav" role="navigation" aria-label="分页导航">${pages.join('')}</div>`;
  }

  renderSizeChanger() {
    if (!this.options.showSizeChanger || this.options.simple) return '';
    
    const { pageSize, pageSizeOptions } = this.options;
    
    const options = pageSizeOptions.map(size => 
      `<option value="${size}" ${size === pageSize ? 'selected' : ''}>${size} 条/页</option>`
    ).join('');

    return `
      <div class="page-size-selector">
        <label for="page-size-select">每页显示</label>
        <select id="page-size-select" class="page-size-select" aria-label="选择每页显示条数">
          ${options}
        </select>
      </div>
    `;
  }

  renderQuickJumper() {
    if (!this.options.showQuickJumper || this.options.simple) return '';
    
    return `
      <div class="page-jump">
        <label for="page-jump-input">跳至</label>
        <input type="number" 
               id="page-jump-input" 
               class="page-jump-input" 
               min="1" 
               max="${this.options.totalPages}"
               aria-label="输入页码"
               placeholder="页码">
        <button class="page-jump-btn" type="button" aria-label="跳转到指定页">跳转</button>
      </div>
    `;
  }

  bindEvents() {
    // 页码按钮点击
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('page-btn') && !e.target.disabled) {
        const page = parseInt(e.target.dataset.page);
        if (page && page !== this.options.currentPage) {
          this.goToPage(page);
        }
      }
      
      // 快速跳转按钮
      if (e.target.classList.contains('page-jump-btn')) {
        this.handleQuickJump();
      }
    });

    // 页面大小改变
    const sizeSelect = this.container.querySelector('.page-size-select');
    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value);
        this.changePageSize(newSize);
      });
    }

    // 快速跳转输入框回车
    const jumpInput = this.container.querySelector('.page-jump-input');
    if (jumpInput) {
      jumpInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleQuickJump();
        }
      });
    }
  }

  setupKeyboardNavigation() {
    this.container.addEventListener('keydown', (e) => {
      if (e.target.classList.contains('page-btn')) {
        this.handleKeyNavigation(e);
      }
    });
  }

  handleKeyNavigation(e) {
    const buttons = Array.from(this.container.querySelectorAll('.page-btn:not([disabled])'));
    const currentIndex = buttons.indexOf(e.target);
    
    let targetIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = Math.min(buttons.length - 1, currentIndex + 1);
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = buttons.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.target.click();
        return;
    }
    
    if (targetIndex !== currentIndex && buttons[targetIndex]) {
      buttons[targetIndex].focus();
    }
  }

  handleQuickJump() {
    const input = this.container.querySelector('.page-jump-input');
    if (!input) return;
    
    const page = parseInt(input.value);
    if (page && page >= 1 && page <= this.options.totalPages && page !== this.options.currentPage) {
      this.goToPage(page);
      input.value = '';
    }
  }

  goToPage(page) {
    if (page < 1 || page > this.options.totalPages || page === this.options.currentPage) {
      return;
    }
    
    this.options.currentPage = page;
    this.render();
    
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(page, this.options.pageSize);
    }
    
    // 触发自定义事件
    this.container.dispatchEvent(new CustomEvent('pageChange', {
      detail: { page, pageSize: this.options.pageSize }
    }));
  }

  changePageSize(newSize) {
    if (newSize === this.options.pageSize) return;
    
    const oldSize = this.options.pageSize;
    this.options.pageSize = newSize;
    
    // 重新计算总页数
    this.options.totalPages = Math.ceil(this.options.totalItems / newSize);
    
    // 调整当前页码，保持大致相同的数据位置
    const currentItem = (this.options.currentPage - 1) * oldSize + 1;
    this.options.currentPage = Math.ceil(currentItem / newSize);
    this.options.currentPage = Math.max(1, Math.min(this.options.currentPage, this.options.totalPages));
    
    this.render();
    
    if (typeof this.options.onPageSizeChange === 'function') {
      this.options.onPageSizeChange(newSize, this.options.currentPage);
    }
    
    // 触发自定义事件
    this.container.dispatchEvent(new CustomEvent('pageSizeChange', {
      detail: { pageSize: newSize, page: this.options.currentPage }
    }));
  }

  // 公共方法
  setPage(page) {
    this.goToPage(page);
  }

  setTotal(total) {
    this.options.totalItems = total;
    this.options.totalPages = Math.ceil(total / this.options.pageSize);
    this.options.currentPage = Math.max(1, Math.min(this.options.currentPage, this.options.totalPages));
    this.render();
  }

  setPageSize(size) {
    this.changePageSize(size);
  }

  setLoading(loading) {
    const pagination = this.container.querySelector('.pagination');
    if (pagination) {
      pagination.classList.toggle('loading', loading);
    }
  }

  disable() {
    this.options.disabled = true;
    const buttons = this.container.querySelectorAll('.page-btn, .page-size-select, .page-jump-btn, .page-jump-input');
    buttons.forEach(btn => btn.disabled = true);
  }

  enable() {
    this.options.disabled = false;
    this.render();
  }

  destroy() {
    this.container.innerHTML = '';
  }

  // 获取当前状态
  getCurrentPage() {
    return this.options.currentPage;
  }

  getPageSize() {
    return this.options.pageSize;
  }

  getTotalPages() {
    return this.options.totalPages;
  }

  getTotalItems() {
    return this.options.totalItems;
  }
}

// 工厂函数
window.createPagination = function(container, options) {
  return new PaginationComponent(container, options);
};

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaginationComponent;
}