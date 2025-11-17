/**
 * Card Component System
 * Modern, flexible card component with variants and interactive features
 * 
 * Features:
 * - Multiple card variants (basic, stat, data, status)
 * - Interactive hover effects and animations
 * - Responsive design
 * - Accessibility support
 * - Theme-aware styling
 */

class CardComponent {
  constructor(options = {}) {
    this.options = {
      type: 'basic', // basic, stat, data, success, warning, error, info
      interactive: false,
      elevated: false,
      outlined: false,
      flat: false,
      loading: false,
      collapsible: false,
      draggable: false,
      ...options
    };
    
    this.element = null;
    this.isCollapsed = false;
    this.isDragging = false;
    
    this.init();
  }

  /**
   * Initialize the card component
   */
  init() {
    this.createElement();
    this.applyVariants();
    this.bindEvents();
    
    if (this.options.loading) {
      this.showLoading();
    }
  }

  /**
   * Create the basic card structure
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'card';
    
    // Add data attributes for styling and behavior
    this.element.setAttribute('data-card-type', this.options.type);
    this.element.setAttribute('role', 'article');
    
    // Create card structure
    if (this.options.header) {
      this.createHeader();
    }
    
    this.createBody();
    
    if (this.options.footer) {
      this.createFooter();
    }
    
    if (this.options.actions) {
      this.createActions();
    }
  }

  /**
   * Create card header
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'card__header';
    
    if (this.options.header.title) {
      const title = document.createElement('h3');
      title.className = 'card__title';
      title.textContent = this.options.header.title;
      header.appendChild(title);
    }
    
    if (this.options.header.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'card__subtitle';
      subtitle.textContent = this.options.header.subtitle;
      header.appendChild(subtitle);
    }
    
    if (this.options.collapsible) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'card__toggle';
      toggleButton.setAttribute('aria-label', 'Toggle card content');
      toggleButton.innerHTML = `
        <svg class="card__toggle-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4l-4 4h8l-4-4z"/>
        </svg>
      `;
      header.appendChild(toggleButton);
    }
    
    this.element.appendChild(header);
    this.headerElement = header;
  }

  /**
   * Create card body
   */
  createBody() {
    const body = document.createElement('div');
    body.className = 'card__body';
    
    if (this.options.content) {
      if (typeof this.options.content === 'string') {
        body.innerHTML = this.options.content;
      } else if (this.options.content instanceof HTMLElement) {
        body.appendChild(this.options.content);
      }
    }
    
    this.element.appendChild(body);
    this.bodyElement = body;
  }

  /**
   * Create card footer
   */
  createFooter() {
    const footer = document.createElement('div');
    footer.className = 'card__footer';
    
    if (this.options.footer.content) {
      if (typeof this.options.footer.content === 'string') {
        footer.innerHTML = this.options.footer.content;
      } else if (this.options.footer.content instanceof HTMLElement) {
        footer.appendChild(this.options.footer.content);
      }
    }
    
    this.element.appendChild(footer);
    this.footerElement = footer;
  }

  /**
   * Create card actions
   */
  createActions() {
    const actions = document.createElement('div');
    actions.className = 'card__actions';
    
    if (this.options.actions.align) {
      actions.classList.add(`card__actions--${this.options.actions.align}`);
    }
    
    this.options.actions.buttons.forEach(buttonConfig => {
      const button = document.createElement('button');
      button.className = `btn ${buttonConfig.variant || 'btn-primary'}`;
      button.textContent = buttonConfig.text;
      
      if (buttonConfig.onClick) {
        button.addEventListener('click', buttonConfig.onClick);
      }
      
      if (buttonConfig.disabled) {
        button.disabled = true;
      }
      
      actions.appendChild(button);
    });
    
    // Add actions to footer if footer exists, otherwise to body
    if (this.footerElement) {
      this.footerElement.appendChild(actions);
    } else {
      this.bodyElement.appendChild(actions);
    }
  }

  /**
   * Apply card variants and modifiers
   */
  applyVariants() {
    // Type variants
    if (this.options.type !== 'basic') {
      this.element.classList.add(`card--${this.options.type}`);
    }
    
    // Style modifiers
    if (this.options.interactive) {
      this.element.classList.add('card--interactive');
      this.element.setAttribute('tabindex', '0');
      this.element.setAttribute('role', 'button');
    }
    
    if (this.options.elevated) {
      this.element.classList.add('card--elevated');
    }
    
    if (this.options.outlined) {
      this.element.classList.add('card--outlined');
    }
    
    if (this.options.flat) {
      this.element.classList.add('card--flat');
    }
    
    if (this.options.collapsible) {
      this.element.classList.add('card--collapsible');
      this.element.setAttribute('aria-expanded', 'true');
    }
    
    if (this.options.draggable) {
      this.element.classList.add('card--draggable');
      this.element.setAttribute('draggable', 'true');
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.options.interactive && this.options.onClick) {
      this.element.addEventListener('click', this.options.onClick);
      this.element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.options.onClick(e);
        }
      });
    }
    
    if (this.options.collapsible) {
      const toggleButton = this.element.querySelector('.card__toggle');
      if (toggleButton) {
        toggleButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle();
        });
      }
    }
    
    if (this.options.draggable) {
      this.bindDragEvents();
    }
    
    // Hover effects for interactive cards
    if (this.options.interactive) {
      this.element.addEventListener('mouseenter', () => {
        this.element.classList.add('card--hover');
      });
      
      this.element.addEventListener('mouseleave', () => {
        this.element.classList.remove('card--hover');
      });
    }
  }

  /**
   * Bind drag and drop events
   */
  bindDragEvents() {
    this.element.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      this.element.classList.add('card--dragging');
      
      // Set drag data
      e.dataTransfer.setData('text/plain', this.element.id || '');
      e.dataTransfer.effectAllowed = 'move';
      
      if (this.options.onDragStart) {
        this.options.onDragStart(e, this);
      }
    });
    
    this.element.addEventListener('dragend', (e) => {
      this.isDragging = false;
      this.element.classList.remove('card--dragging');
      
      if (this.options.onDragEnd) {
        this.options.onDragEnd(e, this);
      }
    });
  }

  /**
   * Toggle card collapse state
   */
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    
    if (this.isCollapsed) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Collapse the card
   */
  collapse() {
    this.element.classList.add('card--collapsed');
    this.element.setAttribute('aria-expanded', 'false');
    
    // Hide body content with animation
    if (this.bodyElement) {
      this.bodyElement.style.maxHeight = this.bodyElement.scrollHeight + 'px';
      requestAnimationFrame(() => {
        this.bodyElement.style.maxHeight = '0';
        this.bodyElement.style.overflow = 'hidden';
      });
    }
    
    // Rotate toggle icon
    const toggleIcon = this.element.querySelector('.card__toggle-icon');
    if (toggleIcon) {
      toggleIcon.style.transform = 'rotate(180deg)';
    }
    
    if (this.options.onCollapse) {
      this.options.onCollapse(this);
    }
  }

  /**
   * Expand the card
   */
  expand() {
    this.element.classList.remove('card--collapsed');
    this.element.setAttribute('aria-expanded', 'true');
    
    // Show body content with animation
    if (this.bodyElement) {
      this.bodyElement.style.maxHeight = this.bodyElement.scrollHeight + 'px';
      
      // Remove max-height after animation completes
      setTimeout(() => {
        this.bodyElement.style.maxHeight = '';
        this.bodyElement.style.overflow = '';
      }, 300);
    }
    
    // Rotate toggle icon back
    const toggleIcon = this.element.querySelector('.card__toggle-icon');
    if (toggleIcon) {
      toggleIcon.style.transform = 'rotate(0deg)';
    }
    
    if (this.options.onExpand) {
      this.options.onExpand(this);
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.element.classList.add('card--loading');
    
    // Create skeleton content if body is empty
    if (this.bodyElement && !this.bodyElement.hasChildNodes()) {
      this.bodyElement.innerHTML = `
        <div class="card__skeleton card__skeleton--title"></div>
        <div class="card__skeleton card__skeleton--text"></div>
        <div class="card__skeleton card__skeleton--text"></div>
        <div class="card__skeleton card__skeleton--text"></div>
      `;
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.element.classList.remove('card--loading');
    
    // Remove skeleton content
    const skeletons = this.element.querySelectorAll('.card__skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
  }

  /**
   * Update card content
   */
  updateContent(content) {
    if (this.bodyElement) {
      if (typeof content === 'string') {
        this.bodyElement.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.bodyElement.innerHTML = '';
        this.bodyElement.appendChild(content);
      }
    }
  }

  /**
   * Update card header
   */
  updateHeader(headerConfig) {
    if (this.headerElement) {
      const title = this.headerElement.querySelector('.card__title');
      const subtitle = this.headerElement.querySelector('.card__subtitle');
      
      if (title && headerConfig.title) {
        title.textContent = headerConfig.title;
      }
      
      if (subtitle && headerConfig.subtitle) {
        subtitle.textContent = headerConfig.subtitle;
      }
    }
  }

  /**
   * Add card to container
   */
  appendTo(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container instanceof HTMLElement) {
      container.appendChild(this.element);
    }
    
    return this;
  }

  /**
   * Remove card from DOM
   */
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /**
   * Destroy the card component
   */
  destroy() {
    this.remove();
    this.element = null;
    this.headerElement = null;
    this.bodyElement = null;
    this.footerElement = null;
  }
}

/**
 * Card Factory - Helper functions for creating specific card types
 */
class CardFactory {
  /**
   * Create a basic card
   */
  static createBasic(options) {
    return new CardComponent({
      type: 'basic',
      ...options
    });
  }

  /**
   * Create a statistics card
   */
  static createStat(options) {
    return new CardComponent({
      type: 'stat',
      ...options
    });
  }

  /**
   * Create a data card
   */
  static createData(options) {
    return new CardComponent({
      type: 'data',
      outlined: true,
      ...options
    });
  }

  /**
   * Create a success status card
   */
  static createSuccess(options) {
    return new CardComponent({
      type: 'success',
      ...options
    });
  }

  /**
   * Create a warning status card
   */
  static createWarning(options) {
    return new CardComponent({
      type: 'warning',
      ...options
    });
  }

  /**
   * Create an error status card
   */
  static createError(options) {
    return new CardComponent({
      type: 'error',
      ...options
    });
  }

  /**
   * Create an info status card
   */
  static createInfo(options) {
    return new CardComponent({
      type: 'info',
      ...options
    });
  }

  /**
   * Create an interactive card
   */
  static createInteractive(options) {
    return new CardComponent({
      interactive: true,
      elevated: true,
      ...options
    });
  }

  /**
   * Create a collapsible card
   */
  static createCollapsible(options) {
    return new CardComponent({
      collapsible: true,
      ...options
    });
  }

  /**
   * Create a draggable card
   */
  static createDraggable(options) {
    return new CardComponent({
      draggable: true,
      interactive: true,
      ...options
    });
  }
}

/**
 * Card Grid System
 * Manages layout and arrangement of multiple cards
 */
class CardGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? 
      document.querySelector(container) : container;
    
    this.options = {
      columns: 'auto', // auto, 1, 2, 3, 4, 6, 12
      gap: 'md', // sm, md, lg
      responsive: true,
      sortable: false,
      ...options
    };
    
    this.cards = [];
    this.init();
  }

  /**
   * Initialize the grid
   */
  init() {
    if (!this.container) {
      console.error('CardGrid: Container not found');
      return;
    }
    
    this.container.classList.add('card-grid');
    this.applyGridStyles();
    
    if (this.options.sortable) {
      this.enableSorting();
    }
  }

  /**
   * Apply grid styling
   */
  applyGridStyles() {
    // Apply column classes
    if (this.options.columns === 'auto') {
      // Use default auto-fill behavior
    } else {
      this.container.classList.add(`card-grid--fixed-${this.options.columns}`);
    }
    
    // Apply gap classes
    if (this.options.gap !== 'md') {
      this.container.classList.add(`card-grid--${this.options.gap}`);
    }
  }

  /**
   * Add a card to the grid
   */
  addCard(card) {
    if (card instanceof CardComponent) {
      this.cards.push(card);
      card.appendTo(this.container);
    } else {
      console.error('CardGrid: Invalid card component');
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
      card.remove();
    }
    
    return this;
  }

  /**
   * Clear all cards from the grid
   */
  clear() {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    this.container.innerHTML = '';
    
    return this;
  }

  /**
   * Enable drag and drop sorting
   */
  enableSorting() {
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    
    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      
      const draggedId = e.dataTransfer.getData('text/plain');
      const draggedElement = document.getElementById(draggedId);
      
      if (draggedElement && this.container.contains(draggedElement)) {
        const afterElement = this.getDragAfterElement(e.clientY);
        
        if (afterElement == null) {
          this.container.appendChild(draggedElement);
        } else {
          this.container.insertBefore(draggedElement, afterElement);
        }
        
        if (this.options.onSort) {
          this.options.onSort(this.getCardOrder());
        }
      }
    });
  }

  /**
   * Get the element after which the dragged element should be inserted
   */
  getDragAfterElement(y) {
    const draggableElements = [...this.container.querySelectorAll('.card:not(.card--dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * Get current card order
   */
  getCardOrder() {
    return [...this.container.children].map(element => element.id || element.dataset.cardId);
  }

  /**
   * Set grid columns
   */
  setColumns(columns) {
    // Remove existing column classes
    this.container.classList.remove(
      'card-grid--fixed-1',
      'card-grid--fixed-2',
      'card-grid--fixed-3',
      'card-grid--fixed-4',
      'card-grid--fixed-6',
      'card-grid--fixed-12'
    );
    
    this.options.columns = columns;
    
    if (columns !== 'auto') {
      this.container.classList.add(`card-grid--fixed-${columns}`);
    }
    
    return this;
  }

  /**
   * Get all cards in the grid
   */
  getCards() {
    return [...this.cards];
  }

  /**
   * Find a card by ID
   */
  findCard(id) {
    return this.cards.find(card => card.element.id === id);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardComponent, CardFactory, CardGrid };
} else {
  // Make available globally
  window.CardComponent = CardComponent;
  window.CardFactory = CardFactory;
  window.CardGrid = CardGrid;
}