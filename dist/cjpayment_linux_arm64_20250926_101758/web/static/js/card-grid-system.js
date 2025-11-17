/**
 * Advanced Card Grid System
 * Responsive grid layout with drag-and-drop, filtering, and advanced features
 * 
 * Features:
 * - Responsive breakpoints
 * - Drag and drop sorting
 * - Card filtering and search
 * - Masonry layout support
 * - Virtual scrolling for large datasets
 * - Expand/collapse functionality
 * - Auto-save grid state
 */

class AdvancedCardGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? 
      document.querySelector(container) : container;
    
    this.options = {
      columns: 'auto', // auto, 1, 2, 3, 4, 6, 12
      gap: 'md', // sm, md, lg
      responsive: true,
      sortable: false,
      filterable: false,
      searchable: false,
      masonry: false,
      virtualScroll: false,
      autoSave: false,
      storageKey: 'card-grid-state',
      breakpoints: {
        sm: { maxWidth: 640, columns: 1 },
        md: { maxWidth: 768, columns: 2 },
        lg: { maxWidth: 1024, columns: 3 },
        xl: { maxWidth: 1280, columns: 4 }
      },
      ...options
    };
    
    this.cards = [];
    this.filteredCards = [];
    this.currentBreakpoint = null;
    this.draggedCard = null;
    this.dropZones = [];
    this.searchTerm = '';
    this.activeFilters = new Set();
    
    this.init();
  }

  /**
   * Initialize the grid system
   */
  init() {
    if (!this.container) {
      console.error('AdvancedCardGrid: Container not found');
      return;
    }
    
    this.setupGrid();
    this.setupResponsive();
    
    if (this.options.sortable) {
      this.enableSorting();
    }
    
    if (this.options.filterable) {
      this.enableFiltering();
    }
    
    if (this.options.searchable) {
      this.enableSearch();
    }
    
    if (this.options.masonry) {
      this.enableMasonry();
    }
    
    if (this.options.virtualScroll) {
      this.enableVirtualScroll();
    }
    
    if (this.options.autoSave) {
      this.loadState();
      this.enableAutoSave();
    }
    
    this.bindEvents();
  }

  /**
   * Setup basic grid structure
   */
  setupGrid() {
    this.container.classList.add('card-grid');
    this.applyGridStyles();
    
    // Create grid controls if needed
    if (this.options.filterable || this.options.searchable) {
      this.createControls();
    }
  }

  /**
   * Apply grid styling based on options
   */
  applyGridStyles() {
    // Remove existing grid classes
    this.container.classList.remove(
      'card-grid--sm', 'card-grid--lg',
      'card-grid--fixed-1', 'card-grid--fixed-2', 'card-grid--fixed-3',
      'card-grid--fixed-4', 'card-grid--fixed-6', 'card-grid--fixed-12',
      'card-grid--masonry', 'card-grid--sortable'
    );
    
    // Apply column classes
    if (this.options.columns !== 'auto') {
      this.container.classList.add(`card-grid--fixed-${this.options.columns}`);
    }
    
    // Apply gap classes
    if (this.options.gap !== 'md') {
      this.container.classList.add(`card-grid--${this.options.gap}`);
    }
    
    // Apply special layout classes
    if (this.options.masonry) {
      this.container.classList.add('card-grid--masonry');
    }
    
    if (this.options.sortable) {
      this.container.classList.add('card-grid--sortable');
    }
  }

  /**
   * Create control panel for filtering and search
   */
  createControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'card-grid-controls';
    controlsContainer.innerHTML = `
      <div class="card-grid-controls__row">
        ${this.options.searchable ? `
          <div class="card-grid-controls__search">
            <input type="text" 
                   class="card-grid-search" 
                   placeholder="Search cards..."
                   aria-label="Search cards">
            <button class="card-grid-search-clear" aria-label="Clear search">×</button>
          </div>
        ` : ''}
        
        ${this.options.filterable ? `
          <div class="card-grid-controls__filters">
            <select class="card-grid-filter" data-filter="type" aria-label="Filter by type">
              <option value="">All Types</option>
            </select>
            <select class="card-grid-filter" data-filter="status" aria-label="Filter by status">
              <option value="">All Status</option>
            </select>
            <button class="card-grid-filter-clear">Clear Filters</button>
          </div>
        ` : ''}
        
        <div class="card-grid-controls__actions">
          <button class="card-grid-view-toggle" data-view="grid" aria-label="Grid view">⊞</button>
          <button class="card-grid-view-toggle" data-view="list" aria-label="List view">☰</button>
          ${this.options.sortable ? `
            <button class="card-grid-sort-toggle" aria-label="Toggle sorting">⇅</button>
          ` : ''}
        </div>
      </div>
      
      <div class="card-grid-controls__info">
        <span class="card-grid-count">0 cards</span>
        <span class="card-grid-status"></span>
      </div>
    `;
    
    this.container.parentNode.insertBefore(controlsContainer, this.container);
    this.controlsContainer = controlsContainer;
  }

  /**
   * Setup responsive behavior
   */
  setupResponsive() {
    if (!this.options.responsive) return;
    
    this.mediaQueries = [];
    
    Object.entries(this.options.breakpoints).forEach(([name, config]) => {
      const mediaQuery = window.matchMedia(`(max-width: ${config.maxWidth}px)`);
      
      const handler = (e) => {
        if (e.matches) {
          this.currentBreakpoint = name;
          this.applyBreakpoint(config);
        }
      };
      
      mediaQuery.addListener(handler);
      handler(mediaQuery); // Check initial state
      
      this.mediaQueries.push({ mediaQuery, handler });
    });
  }

  /**
   * Apply breakpoint-specific settings
   */
  applyBreakpoint(config) {
    if (config.columns && this.options.columns === 'auto') {
      this.setColumns(config.columns);
    }
    
    if (config.gap) {
      this.setGap(config.gap);
    }
    
    // Disable masonry on mobile for better performance
    if (this.currentBreakpoint === 'sm' && this.options.masonry) {
      this.container.classList.remove('card-grid--masonry');
    } else if (this.options.masonry) {
      this.container.classList.add('card-grid--masonry');
    }
  }

  /**
   * Enable drag and drop sorting
   */
  enableSorting() {
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
    this.container.addEventListener('dragenter', this.handleDragEnter.bind(this));
    this.container.addEventListener('dragleave', this.handleDragLeave.bind(this));
    
    // Create drop zones
    this.createDropZones();
  }

  /**
   * Create visual drop zones for better UX
   */
  createDropZones() {
    const dropZone = document.createElement('div');
    dropZone.className = 'card-drop-zone';
    dropZone.innerHTML = '<span>Drop card here</span>';
    dropZone.style.display = 'none';
    
    this.container.appendChild(dropZone);
    this.dropZone = dropZone;
  }

  /**
   * Handle drag over event
   */
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientX, e.clientY);
    const draggedElement = document.querySelector('.card--dragging');
    
    if (afterElement == null) {
      this.container.appendChild(draggedElement);
    } else {
      this.container.insertBefore(draggedElement, afterElement);
    }
  }

  /**
   * Handle drop event
   */
  handleDrop(e) {
    e.preventDefault();
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedElement = document.getElementById(draggedId);
    
    if (draggedElement && this.container.contains(draggedElement)) {
      this.updateCardOrder();
      
      if (this.options.onSort) {
        this.options.onSort(this.getCardOrder());
      }
      
      if (this.options.autoSave) {
        this.saveState();
      }
    }
    
    this.hideDropZones();
  }

  /**
   * Handle drag enter event
   */
  handleDragEnter(e) {
    e.preventDefault();
    this.showDropZones();
  }

  /**
   * Handle drag leave event
   */
  handleDragLeave(e) {
    e.preventDefault();
    // Only hide if leaving the container entirely
    if (!this.container.contains(e.relatedTarget)) {
      this.hideDropZones();
    }
  }

  /**
   * Show drop zones
   */
  showDropZones() {
    if (this.dropZone) {
      this.dropZone.style.display = 'flex';
      this.dropZone.classList.add('card-drop-zone--active');
    }
  }

  /**
   * Hide drop zones
   */
  hideDropZones() {
    if (this.dropZone) {
      this.dropZone.style.display = 'none';
      this.dropZone.classList.remove('card-drop-zone--active');
    }
  }

  /**
   * Get the element after which the dragged element should be inserted
   */
  getDragAfterElement(x, y) {
    const draggableElements = [...this.container.querySelectorAll('.card:not(.card--dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offsetX = x - box.left - box.width / 2;
      const offsetY = y - box.top - box.height / 2;
      const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      
      if (offset < closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.POSITIVE_INFINITY }).element;
  }

  /**
   * Enable filtering functionality
   */
  enableFiltering() {
    if (!this.controlsContainer) return;
    
    const filterSelects = this.controlsContainer.querySelectorAll('.card-grid-filter');
    const clearButton = this.controlsContainer.querySelector('.card-grid-filter-clear');
    
    filterSelects.forEach(select => {
      select.addEventListener('change', this.handleFilter.bind(this));
    });
    
    if (clearButton) {
      clearButton.addEventListener('click', this.clearFilters.bind(this));
    }
    
    // Populate filter options based on existing cards
    this.updateFilterOptions();
  }

  /**
   * Handle filter change
   */
  handleFilter(e) {
    const filterType = e.target.dataset.filter;
    const filterValue = e.target.value;
    
    if (filterValue) {
      this.activeFilters.add(`${filterType}:${filterValue}`);
    } else {
      // Remove all filters of this type
      this.activeFilters.forEach(filter => {
        if (filter.startsWith(`${filterType}:`)) {
          this.activeFilters.delete(filter);
        }
      });
    }
    
    this.applyFilters();
  }

  /**
   * Apply active filters
   */
  applyFilters() {
    this.filteredCards = this.cards.filter(card => {
      if (this.activeFilters.size === 0 && !this.searchTerm) {
        return true;
      }
      
      // Apply search filter
      if (this.searchTerm) {
        const cardText = card.element.textContent.toLowerCase();
        if (!cardText.includes(this.searchTerm.toLowerCase())) {
          return false;
        }
      }
      
      // Apply category filters
      for (const filter of this.activeFilters) {
        const [type, value] = filter.split(':');
        const cardValue = card.element.dataset[type];
        
        if (cardValue !== value) {
          return false;
        }
      }
      
      return true;
    });
    
    this.renderFilteredCards();
    this.updateControlsInfo();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.activeFilters.clear();
    this.searchTerm = '';
    
    // Reset filter controls
    if (this.controlsContainer) {
      const filterSelects = this.controlsContainer.querySelectorAll('.card-grid-filter');
      const searchInput = this.controlsContainer.querySelector('.card-grid-search');
      
      filterSelects.forEach(select => select.value = '');
      if (searchInput) searchInput.value = '';
    }
    
    this.applyFilters();
  }

  /**
   * Enable search functionality
   */
  enableSearch() {
    if (!this.controlsContainer) return;
    
    const searchInput = this.controlsContainer.querySelector('.card-grid-search');
    const clearButton = this.controlsContainer.querySelector('.card-grid-search-clear');
    
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearch.bind(this));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.clearSearch();
        }
      });
    }
    
    if (clearButton) {
      clearButton.addEventListener('click', this.clearSearch.bind(this));
    }
  }

  /**
   * Handle search input
   */
  handleSearch(e) {
    this.searchTerm = e.target.value;
    this.applyFilters();
    
    // Show/hide clear button
    const clearButton = this.controlsContainer.querySelector('.card-grid-search-clear');
    if (clearButton) {
      clearButton.style.display = this.searchTerm ? 'block' : 'none';
    }
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchTerm = '';
    const searchInput = this.controlsContainer.querySelector('.card-grid-search');
    if (searchInput) {
      searchInput.value = '';
    }
    this.applyFilters();
  }

  /**
   * Enable masonry layout
   */
  enableMasonry() {
    // Use CSS columns for masonry effect
    this.container.style.columns = 'auto';
    this.container.style.columnWidth = '300px';
    this.container.style.columnGap = 'var(--card-gap)';
    this.container.style.columnFill = 'balance';
    
    // Prevent cards from breaking across columns
    this.cards.forEach(card => {
      card.element.style.breakInside = 'avoid';
      card.element.style.marginBottom = 'var(--card-gap)';
    });
  }

  /**
   * Enable virtual scrolling for large datasets
   */
  enableVirtualScroll() {
    // Implementation for virtual scrolling
    // This would be used for very large card collections
    console.log('Virtual scrolling enabled (implementation needed for large datasets)');
  }

  /**
   * Render filtered cards
   */
  renderFilteredCards() {
    // Hide all cards first
    this.cards.forEach(card => {
      card.element.style.display = 'none';
    });
    
    // Show filtered cards
    this.filteredCards.forEach(card => {
      card.element.style.display = '';
    });
    
    // Trigger layout recalculation for masonry
    if (this.options.masonry) {
      this.container.style.columns = 'auto';
      requestAnimationFrame(() => {
        this.container.style.columns = '';
      });
    }
  }

  /**
   * Update filter options based on current cards
   */
  updateFilterOptions() {
    if (!this.controlsContainer) return;
    
    const typeFilter = this.controlsContainer.querySelector('[data-filter="type"]');
    const statusFilter = this.controlsContainer.querySelector('[data-filter="status"]');
    
    if (typeFilter) {
      const types = new Set();
      this.cards.forEach(card => {
        const type = card.element.dataset.type;
        if (type) types.add(type);
      });
      
      // Clear existing options (except first)
      while (typeFilter.children.length > 1) {
        typeFilter.removeChild(typeFilter.lastChild);
      }
      
      // Add new options
      types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        typeFilter.appendChild(option);
      });
    }
    
    if (statusFilter) {
      const statuses = new Set();
      this.cards.forEach(card => {
        const status = card.element.dataset.status;
        if (status) statuses.add(status);
      });
      
      // Clear existing options (except first)
      while (statusFilter.children.length > 1) {
        statusFilter.removeChild(statusFilter.lastChild);
      }
      
      // Add new options
      statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusFilter.appendChild(option);
      });
    }
  }

  /**
   * Update controls info display
   */
  updateControlsInfo() {
    if (!this.controlsContainer) return;
    
    const countElement = this.controlsContainer.querySelector('.card-grid-count');
    const statusElement = this.controlsContainer.querySelector('.card-grid-status');
    
    if (countElement) {
      const total = this.cards.length;
      const visible = this.filteredCards.length;
      
      if (visible === total) {
        countElement.textContent = `${total} cards`;
      } else {
        countElement.textContent = `${visible} of ${total} cards`;
      }
    }
    
    if (statusElement) {
      if (this.activeFilters.size > 0 || this.searchTerm) {
        statusElement.textContent = 'Filtered';
        statusElement.className = 'card-grid-status card-grid-status--filtered';
      } else {
        statusElement.textContent = '';
        statusElement.className = 'card-grid-status';
      }
    }
  }

  /**
   * Bind additional events
   */
  bindEvents() {
    // View toggle buttons
    if (this.controlsContainer) {
      const viewToggles = this.controlsContainer.querySelectorAll('.card-grid-view-toggle');
      viewToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          const view = e.target.dataset.view;
          this.setView(view);
          
          // Update active state
          viewToggles.forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
        });
      });
      
      // Sort toggle
      const sortToggle = this.controlsContainer.querySelector('.card-grid-sort-toggle');
      if (sortToggle) {
        sortToggle.addEventListener('click', () => {
          this.options.sortable = !this.options.sortable;
          
          if (this.options.sortable) {
            this.enableSorting();
            sortToggle.classList.add('active');
          } else {
            this.disableSorting();
            sortToggle.classList.remove('active');
          }
        });
      }
    }
    
    // Window resize for responsive behavior
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.options.masonry) {
      // Recalculate masonry layout
      this.container.style.columns = 'auto';
      requestAnimationFrame(() => {
        this.container.style.columns = '';
      });
    }
  }

  /**
   * Set grid view mode
   */
  setView(view) {
    this.container.classList.remove('card-grid--list', 'card-grid--grid');
    this.container.classList.add(`card-grid--${view}`);
    
    if (this.options.onViewChange) {
      this.options.onViewChange(view);
    }
  }

  /**
   * Add a card to the grid
   */
  addCard(card) {
    if (card instanceof CardComponent) {
      this.cards.push(card);
      card.appendTo(this.container);
      
      // Update filtered cards if no filters active
      if (this.activeFilters.size === 0 && !this.searchTerm) {
        this.filteredCards.push(card);
      }
      
      this.updateFilterOptions();
      this.updateControlsInfo();
      
      if (this.options.autoSave) {
        this.saveState();
      }
    }
    
    return this;
  }

  /**
   * Remove a card from the grid
   */
  removeCard(card) {
    const index = this.cards.indexOf(card);
    if (index > -1) {
      this.cards.splice(index, 1);
      
      const filteredIndex = this.filteredCards.indexOf(card);
      if (filteredIndex > -1) {
        this.filteredCards.splice(filteredIndex, 1);
      }
      
      card.remove();
      this.updateFilterOptions();
      this.updateControlsInfo();
      
      if (this.options.autoSave) {
        this.saveState();
      }
    }
    
    return this;
  }

  /**
   * Clear all cards
   */
  clear() {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    this.filteredCards = [];
    this.container.innerHTML = '';
    
    if (this.dropZone) {
      this.container.appendChild(this.dropZone);
    }
    
    this.updateFilterOptions();
    this.updateControlsInfo();
    
    return this;
  }

  /**
   * Set grid columns
   */
  setColumns(columns) {
    // Remove existing column classes
    this.container.classList.remove(
      'card-grid--fixed-1', 'card-grid--fixed-2', 'card-grid--fixed-3',
      'card-grid--fixed-4', 'card-grid--fixed-6', 'card-grid--fixed-12'
    );
    
    this.options.columns = columns;
    
    if (columns !== 'auto') {
      this.container.classList.add(`card-grid--fixed-${columns}`);
    }
    
    return this;
  }

  /**
   * Set grid gap
   */
  setGap(gap) {
    this.container.classList.remove('card-grid--sm', 'card-grid--lg');
    this.options.gap = gap;
    
    if (gap !== 'md') {
      this.container.classList.add(`card-grid--${gap}`);
    }
    
    return this;
  }

  /**
   * Get current card order
   */
  getCardOrder() {
    return [...this.container.children]
      .filter(el => el.classList.contains('card'))
      .map(element => element.id || element.dataset.cardId);
  }

  /**
   * Update card order in internal array
   */
  updateCardOrder() {
    const order = this.getCardOrder();
    this.cards.sort((a, b) => {
      const aIndex = order.indexOf(a.element.id || a.element.dataset.cardId);
      const bIndex = order.indexOf(b.element.id || b.element.dataset.cardId);
      return aIndex - bIndex;
    });
  }

  /**
   * Save grid state to localStorage
   */
  saveState() {
    if (!this.options.autoSave) return;
    
    const state = {
      cardOrder: this.getCardOrder(),
      columns: this.options.columns,
      gap: this.options.gap,
      activeFilters: Array.from(this.activeFilters),
      searchTerm: this.searchTerm
    };
    
    localStorage.setItem(this.options.storageKey, JSON.stringify(state));
  }

  /**
   * Load grid state from localStorage
   */
  loadState() {
    if (!this.options.autoSave) return;
    
    try {
      const state = JSON.parse(localStorage.getItem(this.options.storageKey));
      if (state) {
        if (state.columns) this.setColumns(state.columns);
        if (state.gap) this.setGap(state.gap);
        if (state.activeFilters) {
          this.activeFilters = new Set(state.activeFilters);
        }
        if (state.searchTerm) {
          this.searchTerm = state.searchTerm;
        }
      }
    } catch (error) {
      console.warn('Failed to load grid state:', error);
    }
  }

  /**
   * Disable sorting
   */
  disableSorting() {
    this.container.classList.remove('card-grid--sortable');
    this.hideDropZones();
  }

  /**
   * Enable auto-save functionality
   */
  enableAutoSave() {
    // Save state on various events
    this.container.addEventListener('cardAdded', () => this.saveState());
    this.container.addEventListener('cardRemoved', () => this.saveState());
    this.container.addEventListener('cardMoved', () => this.saveState());
  }

  /**
   * Utility: Debounce function
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
   * Destroy the grid
   */
  destroy() {
    // Remove event listeners
    this.mediaQueries.forEach(({ mediaQuery, handler }) => {
      mediaQuery.removeListener(handler);
    });
    
    // Clear cards
    this.clear();
    
    // Remove controls
    if (this.controlsContainer) {
      this.controlsContainer.remove();
    }
    
    // Reset container
    this.container.className = '';
    this.container.style = '';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedCardGrid };
} else {
  // Make available globally
  window.AdvancedCardGrid = AdvancedCardGrid;
}