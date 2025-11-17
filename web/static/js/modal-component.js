/**
 * Modal and Dialog Component
 * Modern modal dialogs with animations, focus management, and accessibility
 * 
 * Features:
 * - Multiple modal types (default, confirm, alert, success, info)
 * - Configurable sizes and animations
 * - Focus management and keyboard navigation
 * - Accessibility support (ARIA, screen readers)
 * - Promise-based API for dialogs
 * - Form handling and validation
 * - Backdrop click and escape key handling
 */

class ModalManager {
  constructor(options = {}) {
    this.options = {
      backdrop: true, // Allow backdrop click to close
      keyboard: true, // Allow escape key to close
      focus: true, // Auto focus on modal
      animation: 'scale', // scale, slide-top, slide-bottom, slide-left, slide-right, fade
      size: 'md', // sm, md, lg, xl, fullscreen
      ...options
    };
    
    this.modals = new Map();
    this.modalStack = [];
    this.modalCounter = 0;
    this.focusStack = [];
    
    this.init();
  }
  
  /**
   * Initialize the modal manager
   */
  init() {
    this.bindGlobalEvents();
  }
  
  /**
   * Bind global events
   */
  bindGlobalEvents() {
    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.options.keyboard) {
        this.closeTop();
      }
    });
    
    // Handle focus management
    document.addEventListener('focusin', (e) => {
      this.handleFocusIn(e);
    });
  }
  
  /**
   * Show a modal
   * @param {Object} options - Modal configuration
   * @returns {Promise} Promise that resolves with result
   */
  show(options = {}) {
    return new Promise((resolve, reject) => {
      const config = {
        title: '',
        content: '',
        size: this.options.size,
        animation: this.options.animation,
        backdrop: this.options.backdrop,
        keyboard: this.options.keyboard,
        focus: this.options.focus,
        closable: true,
        buttons: [],
        onShow: null,
        onHide: null,
        ...options
      };
      
      // Generate unique ID
      const id = `modal-${++this.modalCounter}-${Date.now()}`;
      
      // Create modal element
      const modalElement = this.createModalElement(id, config);
      
      // Store modal data
      this.modals.set(id, {
        element: modalElement,
        config,
        resolve,
        reject
      });
      
      // Add to DOM
      document.body.appendChild(modalElement);
      
      // Add to stack
      this.modalStack.push(id);
      
      // Show modal
      this.showModal(id);
    });
  }
  
  /**
   * Create modal DOM element
   * @param {string} id - Modal ID
   * @param {Object} config - Modal configuration
   * @returns {HTMLElement} Modal element
   */
  createModalElement(id, config) {
    const modal = document.createElement('div');
    modal.className = `modal modal-${config.size} modal-${config.animation}`;
    modal.id = id;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${id}-title`);
    modal.setAttribute('aria-describedby', `${id}-body`);
    modal.setAttribute('tabindex', '-1');
    
    // Create modal structure
    const structure = this.createModalStructure(id, config);
    modal.innerHTML = structure;
    
    // Bind events
    this.bindModalEvents(modal, id);
    
    return modal;
  }
  
  /**
   * Create modal HTML structure
   * @param {string} id - Modal ID
   * @param {Object} config - Modal configuration
   * @returns {string} HTML string
   */
  createModalStructure(id, config) {
    const hasHeader = config.title || config.closable;
    const hasFooter = config.buttons && config.buttons.length > 0;
    
    let html = '<div class="modal-backdrop"></div>';
    html += '<div class="modal-content" tabindex="-1">';
    
    // Header
    if (hasHeader) {
      html += '<div class="modal-header">';
      if (config.icon) {
        html += `<div class="modal-icon">${config.icon}</div>`;
      }
      if (config.title) {
        html += `<h2 class="modal-title" id="${id}-title">${this.escapeHtml(config.title)}</h2>`;
      }
      if (config.closable) {
        html += '<button class="modal-close" type="button" aria-label="关闭对话框">';
        html += '<span aria-hidden="true">×</span>';
        html += '</button>';
      }
      html += '</div>';
    }
    
    // Body
    html += `<div class="modal-body" id="${id}-body">`;
    if (typeof config.content === 'string') {
      html += config.content;
    } else if (config.content instanceof HTMLElement) {
      html += config.content.outerHTML;
    }
    html += '</div>';
    
    // Footer
    if (hasFooter) {
      html += '<div class="modal-footer">';
      config.buttons.forEach(button => {
        const btnClass = button.variant ? `modal-btn-${button.variant}` : 'modal-btn-secondary';
        html += `<button class="modal-btn ${btnClass}" data-action="${button.action}" type="button"`;
        if (button.disabled) html += ' disabled';
        html += `>${this.escapeHtml(button.label)}</button>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Bind events to modal element
   * @param {HTMLElement} modal - Modal element
   * @param {string} id - Modal ID
   */
  bindModalEvents(modal, id) {
    const modalData = this.modals.get(id);
    if (!modalData) return;
    
    // Backdrop click
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop && modalData.config.backdrop) {
      backdrop.addEventListener('click', () => {
        this.hide(id, { reason: 'backdrop' });
      });
    }
    
    // Close button
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide(id, { reason: 'close' });
      });
    }
    
    // Action buttons
    const actionBtns = modal.querySelectorAll('.modal-btn[data-action]');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.hide(id, { reason: 'action', action });
      });
    });
    
    // Form handling
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        this.hide(id, { reason: 'submit', data });
      });
    });
  }
  
  /**
   * Show modal with animation
   * @param {string} id - Modal ID
   */
  showModal(id) {
    const modalData = this.modals.get(id);
    if (!modalData) return;
    
    const { element, config } = modalData;
    
    // Store current focus
    this.focusStack.push(document.activeElement);
    
    // Prevent body scroll
    this.preventBodyScroll();
    
    // Show modal
    requestAnimationFrame(() => {
      element.classList.add('show');
      
      // Focus management
      if (config.focus) {
        this.focusModal(element);
      }
      
      // Callback
      if (config.onShow) {
        config.onShow(id);
      }
    });
  }
  
  /**
   * Hide modal
   * @param {string} id - Modal ID
   * @param {Object} result - Result data
   */
  hide(id, result = {}) {
    const modalData = this.modals.get(id);
    if (!modalData) return;
    
    const { element, config, resolve } = modalData;
    
    // Remove from stack
    const stackIndex = this.modalStack.indexOf(id);
    if (stackIndex > -1) {
      this.modalStack.splice(stackIndex, 1);
    }
    
    // Hide animation
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Restore focus
      this.restoreFocus();
      
      // Restore body scroll if no more modals
      if (this.modalStack.length === 0) {
        this.restoreBodyScroll();
      }
      
      // Clean up
      this.modals.delete(id);
      
      // Callback
      if (config.onHide) {
        config.onHide(id, result);
      }
      
      // Resolve promise
      resolve(result);
    }, 300);
  }
  
  /**
   * Close the topmost modal
   */
  closeTop() {
    if (this.modalStack.length > 0) {
      const topId = this.modalStack[this.modalStack.length - 1];
      this.hide(topId, { reason: 'escape' });
    }
  }
  
  /**
   * Close all modals
   */
  closeAll() {
    const modalIds = [...this.modalStack];
    modalIds.forEach(id => {
      this.hide(id, { reason: 'closeAll' });
    });
  }
  
  /**
   * Focus management
   * @param {HTMLElement} modal - Modal element
   */
  focusModal(modal) {
    // Find first focusable element
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modal.querySelector('.modal-content').focus();
    }
  }
  
  /**
   * Handle focus in event for focus trapping
   * @param {Event} e - Focus event
   */
  handleFocusIn(e) {
    if (this.modalStack.length === 0) return;
    
    const topModalId = this.modalStack[this.modalStack.length - 1];
    const topModal = document.getElementById(topModalId);
    
    if (!topModal) return;
    
    // Check if focus is within modal
    if (!topModal.contains(e.target)) {
      // Redirect focus back to modal
      this.focusModal(topModal);
    }
  }
  
  /**
   * Prevent body scroll
   */
  preventBodyScroll() {
    if (!document.body.hasAttribute('data-modal-open')) {
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-modal-open', 'true');
    }
  }
  
  /**
   * Restore body scroll
   */
  restoreBodyScroll() {
    document.body.style.overflow = '';
    document.body.removeAttribute('data-modal-open');
  }
  
  /**
   * Restore focus to previous element
   */
  restoreFocus() {
    if (this.focusStack.length > 0) {
      const previousFocus = this.focusStack.pop();
      if (previousFocus && previousFocus.focus) {
        previousFocus.focus();
      }
    }
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Check if modal exists
   * @param {string} id - Modal ID
   * @returns {boolean} Whether modal exists
   */
  exists(id) {
    return this.modals.has(id);
  }
  
  /**
   * Get modal count
   * @returns {number} Number of active modals
   */
  getCount() {
    return this.modals.size;
  }
}

/**
 * Convenience class for different modal types
 */
class Modal {
  static manager = null;
  
  /**
   * Initialize modal manager
   * @param {Object} options - Manager options
   */
  static init(options = {}) {
    if (!Modal.manager) {
      Modal.manager = new ModalManager(options);
    }
    return Modal.manager;
  }
  
  /**
   * Show a basic modal
   * @param {Object} options - Modal options
   * @returns {Promise} Promise that resolves with result
   */
  static show(options = {}) {
    if (!Modal.manager) Modal.init();
    return Modal.manager.show(options);
  }
  
  /**
   * Show confirmation dialog
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves with boolean
   */
  static confirm(message, options = {}) {
    if (!Modal.manager) Modal.init();
    
    const config = typeof message === 'string' 
      ? { content: message, ...options } 
      : { ...message, ...options };
    
    return Modal.manager.show({
      title: '确认操作',
      icon: '⚠',
      size: 'sm',
      animation: 'scale',
      buttons: [
        { label: '取消', action: 'cancel', variant: 'secondary' },
        { label: '确认', action: 'confirm', variant: 'primary' }
      ],
      ...config
    }).then(result => {
      return result.action === 'confirm';
    });
  }
  
  /**
   * Show alert dialog
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves when closed
   */
  static alert(message, options = {}) {
    if (!Modal.manager) Modal.init();
    
    const config = typeof message === 'string' 
      ? { content: message, ...options } 
      : { ...message, ...options };
    
    return Modal.manager.show({
      title: '提示',
      icon: '⚠',
      size: 'sm',
      animation: 'scale',
      buttons: [
        { label: '确定', action: 'ok', variant: 'primary' }
      ],
      ...config
    });
  }
  
  /**
   * Show success dialog
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves when closed
   */
  static success(message, options = {}) {
    if (!Modal.manager) Modal.init();
    
    const config = typeof message === 'string' 
      ? { content: message, ...options } 
      : { ...message, ...options };
    
    return Modal.manager.show({
      title: '成功',
      icon: '✓',
      size: 'sm',
      animation: 'scale',
      buttons: [
        { label: '确定', action: 'ok', variant: 'success' }
      ],
      ...config
    });
  }
  
  /**
   * Show error dialog
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves when closed
   */
  static error(message, options = {}) {
    if (!Modal.manager) Modal.init();
    
    const config = typeof message === 'string' 
      ? { content: message, ...options } 
      : { ...message, ...options };
    
    return Modal.manager.show({
      title: '错误',
      icon: '✕',
      size: 'sm',
      animation: 'scale',
      buttons: [
        { label: '确定', action: 'ok', variant: 'danger' }
      ],
      ...config
    });
  }
  
  /**
   * Show info dialog
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {Promise} Promise that resolves when closed
   */
  static info(message, options = {}) {
    if (!Modal.manager) Modal.init();
    
    const config = typeof message === 'string' 
      ? { content: message, ...options } 
      : { ...message, ...options };
    
    return Modal.manager.show({
      title: '信息',
      icon: 'ℹ',
      size: 'sm',
      animation: 'scale',
      buttons: [
        { label: '确定', action: 'ok', variant: 'primary' }
      ],
      ...config
    });
  }
  
  /**
   * Show form dialog
   * @param {Object} options - Form options
   * @returns {Promise} Promise that resolves with form data
   */
  static form(options = {}) {
    if (!Modal.manager) Modal.init();
    
    const formHtml = Modal.createFormHtml(options.fields || []);
    
    return Modal.manager.show({
      title: options.title || '表单',
      content: formHtml,
      size: options.size || 'md',
      buttons: [
        { label: '取消', action: 'cancel', variant: 'secondary' },
        { label: '提交', action: 'submit', variant: 'primary' }
      ],
      ...options
    }).then(result => {
      if (result.reason === 'submit' || result.action === 'submit') {
        return result.data || {};
      }
      throw new Error('Form cancelled');
    });
  }
  
  /**
   * Create form HTML
   * @param {Array} fields - Form fields
   * @returns {string} Form HTML
   */
  static createFormHtml(fields) {
    let html = '<form class="modal-form">';
    
    fields.forEach(field => {
      html += '<div class="form-group">';
      html += `<label class="form-label" for="${field.name}">${field.label}</label>`;
      
      switch (field.type) {
        case 'textarea':
          html += `<textarea class="form-textarea" id="${field.name}" name="${field.name}"`;
          if (field.placeholder) html += ` placeholder="${field.placeholder}"`;
          if (field.required) html += ' required';
          html += `>${field.value || ''}</textarea>`;
          break;
        case 'select':
          html += `<select class="form-select" id="${field.name}" name="${field.name}"`;
          if (field.required) html += ' required';
          html += '>';
          if (field.options) {
            field.options.forEach(option => {
              html += `<option value="${option.value}"`;
              if (option.value === field.value) html += ' selected';
              html += `>${option.label}</option>`;
            });
          }
          html += '</select>';
          break;
        default:
          html += `<input class="form-input" type="${field.type || 'text'}" id="${field.name}" name="${field.name}"`;
          if (field.placeholder) html += ` placeholder="${field.placeholder}"`;
          if (field.value) html += ` value="${field.value}"`;
          if (field.required) html += ' required';
          html += '>';
      }
      
      html += '</div>';
    });
    
    html += '</form>';
    return html;
  }
  
  /**
   * Close all modals
   */
  static closeAll() {
    if (Modal.manager) {
      Modal.manager.closeAll();
    }
  }
  
  /**
   * Get modal count
   * @returns {number} Number of active modals
   */
  static getCount() {
    return Modal.manager ? Modal.manager.getCount() : 0;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Modal, ModalManager };
}

// Global registration
if (typeof window !== 'undefined') {
  window.Modal = Modal;
  window.ModalManager = ModalManager;
}