/**
 * Toast Notification Component
 * Modern toast notifications with animations, stacking, and batch management
 * 
 * Features:
 * - Multiple toast types (success, warning, error, info)
 * - Configurable positioning (top/bottom + left/center/right)
 * - Auto-dismiss with progress bar
 * - Manual close and batch management
 * - Stacking animations
 * - Accessibility support
 * - Theme-aware styling
 */

class ToastManager {
  constructor(options = {}) {
    this.options = {
      position: 'top-right', // top-right, top-left, top-center, bottom-right, bottom-left, bottom-center
      maxToasts: 5,
      defaultDuration: 5000,
      animationDuration: 300,
      stackLimit: 3,
      ...options
    };
    
    this.toasts = new Map();
    this.container = null;
    this.toastCounter = 0;
    
    this.init();
  }
  
  /**
   * Initialize the toast manager
   */
  init() {
    this.createContainer();
    this.bindEvents();
  }
  
  /**
   * Create the toast container
   */
  createContainer() {
    // Remove existing container if it exists
    const existingContainer = document.querySelector('.toast-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    this.container = document.createElement('div');
    this.container.className = `toast-container ${this.options.position}`;
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', '通知消息');
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Bind global events
   */
  bindEvents() {
    // Handle escape key to close all toasts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearAll();
      }
    });
    
    // Handle visibility change to pause/resume timers
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });
  }
  
  /**
   * Show a toast notification
   * @param {Object} options - Toast configuration
   * @returns {string} Toast ID
   */
  show(options = {}) {
    const config = {
      type: 'info', // success, warning, error, info
      title: '',
      message: '',
      duration: this.options.defaultDuration,
      closable: true,
      actions: [],
      icon: null,
      progress: true,
      ...options
    };
    
    // Validate required message
    if (!config.message && !config.title) {
      console.warn('Toast message or title is required');
      return null;
    }
    
    // Generate unique ID
    const id = `toast-${++this.toastCounter}-${Date.now()}`;
    
    // Create toast element
    const toastElement = this.createToastElement(id, config);
    
    // Store toast data
    this.toasts.set(id, {
      element: toastElement,
      config,
      timer: null,
      startTime: null,
      remainingTime: config.duration,
      paused: false
    });
    
    // Add to container
    this.container.appendChild(toastElement);
    
    // Trigger show animation
    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });
    
    // Start auto-dismiss timer
    if (config.duration > 0) {
      this.startTimer(id);
    }
    
    // Manage toast limit
    this.enforceLimit();
    
    // Announce to screen readers
    this.announceToast(config);
    
    return id;
  }
  
  /**
   * Create toast DOM element
   * @param {string} id - Toast ID
   * @param {Object} config - Toast configuration
   * @returns {HTMLElement} Toast element
   */
  createToastElement(id, config) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${config.type}`;
    toast.id = id;
    toast.setAttribute('role', config.type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', config.type === 'error' ? 'assertive' : 'polite');
    
    // Create toast structure
    const structure = this.createToastStructure(config);
    toast.innerHTML = structure;
    
    // Add progress bar if enabled
    if (config.progress && config.duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = 'toast-progress';
      progressBar.style.width = '100%';
      toast.appendChild(progressBar);
    }
    
    // Bind events
    this.bindToastEvents(toast, id);
    
    return toast;
  }
  
  /**
   * Create toast HTML structure
   * @param {Object} config - Toast configuration
   * @returns {string} HTML string
   */
  createToastStructure(config) {
    const hasHeader = config.title || config.closable;
    const hasFooter = config.actions && config.actions.length > 0;
    const icon = this.getToastIcon(config.type, config.icon);
    
    let html = '';
    
    // Header
    if (hasHeader) {
      html += '<div class="toast-header">';
      html += `<div class="toast-icon">${icon}</div>`;
      html += '<div class="toast-content">';
      if (config.title) {
        html += `<div class="toast-title">${this.escapeHtml(config.title)}</div>`;
      }
      html += '</div>';
      if (config.closable) {
        html += '<button class="toast-close" type="button" aria-label="关闭通知">';
        html += '<span aria-hidden="true">×</span>';
        html += '</button>';
      }
      html += '</div>';
    }
    
    // Body
    html += '<div class="toast-body">';
    if (!hasHeader) {
      html += `<div class="toast-icon">${icon}</div>`;
      html += '<div class="toast-content">';
    }
    html += `<div class="toast-message">${this.escapeHtml(config.message)}</div>`;
    if (!hasHeader) {
      html += '</div>';
      if (config.closable) {
        html += '<div class="toast-actions">';
        html += '<button class="toast-close" type="button" aria-label="关闭通知">';
        html += '<span aria-hidden="true">×</span>';
        html += '</button>';
        html += '</div>';
      }
    }
    html += '</div>';
    
    // Footer
    if (hasFooter) {
      html += '<div class="toast-footer">';
      config.actions.forEach(action => {
        html += `<button class="toast-action-btn" data-action="${action.action}" type="button">`;
        html += this.escapeHtml(action.label);
        html += '</button>';
      });
      html += '</div>';
    }
    
    return html;
  }
  
  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @param {string} customIcon - Custom icon
   * @returns {string} Icon HTML
   */
  getToastIcon(type, customIcon) {
    if (customIcon) {
      return customIcon;
    }
    
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };
    
    return icons[type] || icons.info;
  }
  
  /**
   * Bind events to toast element
   * @param {HTMLElement} toast - Toast element
   * @param {string} id - Toast ID
   */
  bindToastEvents(toast, id) {
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide(id);
      });
    }
    
    // Action buttons
    const actionBtns = toast.querySelectorAll('.toast-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const toastData = this.toasts.get(id);
        if (toastData && toastData.config.onAction) {
          toastData.config.onAction(action, id);
        }
        this.hide(id);
      });
    });
    
    // Hover to pause/resume timer
    toast.addEventListener('mouseenter', () => {
      this.pauseTimer(id);
    });
    
    toast.addEventListener('mouseleave', () => {
      this.resumeTimer(id);
    });
    
    // Focus management
    toast.addEventListener('focusin', () => {
      this.pauseTimer(id);
    });
    
    toast.addEventListener('focusout', () => {
      this.resumeTimer(id);
    });
  }
  
  /**
   * Hide a toast
   * @param {string} id - Toast ID
   */
  hide(id) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;
    
    const { element } = toastData;
    
    // Clear timer
    this.clearTimer(id);
    
    // Add hide animation
    element.classList.add('hide');
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(id);
      
      // Callback
      if (toastData.config.onClose) {
        toastData.config.onClose(id);
      }
    }, this.options.animationDuration);
  }
  
  /**
   * Start auto-dismiss timer
   * @param {string} id - Toast ID
   */
  startTimer(id) {
    const toastData = this.toasts.get(id);
    if (!toastData || toastData.config.duration <= 0) return;
    
    toastData.startTime = Date.now();
    toastData.timer = setTimeout(() => {
      this.hide(id);
    }, toastData.remainingTime);
    
    // Update progress bar
    this.updateProgress(id);
  }
  
  /**
   * Clear timer
   * @param {string} id - Toast ID
   */
  clearTimer(id) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;
    
    if (toastData.timer) {
      clearTimeout(toastData.timer);
      toastData.timer = null;
    }
  }
  
  /**
   * Pause timer
   * @param {string} id - Toast ID
   */
  pauseTimer(id) {
    const toastData = this.toasts.get(id);
    if (!toastData || toastData.paused) return;
    
    this.clearTimer(id);
    
    if (toastData.startTime) {
      const elapsed = Date.now() - toastData.startTime;
      toastData.remainingTime = Math.max(0, toastData.remainingTime - elapsed);
    }
    
    toastData.paused = true;
  }
  
  /**
   * Resume timer
   * @param {string} id - Toast ID
   */
  resumeTimer(id) {
    const toastData = this.toasts.get(id);
    if (!toastData || !toastData.paused) return;
    
    toastData.paused = false;
    
    if (toastData.remainingTime > 0) {
      this.startTimer(id);
    }
  }
  
  /**
   * Update progress bar
   * @param {string} id - Toast ID
   */
  updateProgress(id) {
    const toastData = this.toasts.get(id);
    if (!toastData || !toastData.config.progress) return;
    
    const progressBar = toastData.element.querySelector('.toast-progress');
    if (!progressBar) return;
    
    const updateInterval = 50; // Update every 50ms
    const totalDuration = toastData.config.duration;
    
    const updateProgressBar = () => {
      if (!toastData.startTime || toastData.paused) {
        setTimeout(updateProgressBar, updateInterval);
        return;
      }
      
      const elapsed = Date.now() - toastData.startTime;
      const remaining = Math.max(0, toastData.remainingTime - elapsed);
      const progress = (remaining / totalDuration) * 100;
      
      progressBar.style.width = `${progress}%`;
      
      if (remaining > 0 && this.toasts.has(id)) {
        setTimeout(updateProgressBar, updateInterval);
      }
    };
    
    updateProgressBar();
  }
  
  /**
   * Pause all timers
   */
  pauseAll() {
    this.toasts.forEach((_, id) => {
      this.pauseTimer(id);
    });
  }
  
  /**
   * Resume all timers
   */
  resumeAll() {
    this.toasts.forEach((_, id) => {
      this.resumeTimer(id);
    });
  }
  
  /**
   * Clear all toasts
   */
  clearAll() {
    const toastIds = Array.from(this.toasts.keys());
    toastIds.forEach(id => {
      this.hide(id);
    });
  }
  
  /**
   * Enforce maximum toast limit
   */
  enforceLimit() {
    const toastIds = Array.from(this.toasts.keys());
    if (toastIds.length > this.options.maxToasts) {
      const toastsToRemove = toastIds.slice(0, toastIds.length - this.options.maxToasts);
      toastsToRemove.forEach(id => {
        this.hide(id);
      });
    }
  }
  
  /**
   * Announce toast to screen readers
   * @param {Object} config - Toast configuration
   */
  announceToast(config) {
    const message = config.title ? `${config.title}: ${config.message}` : config.message;
    
    // Create temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', config.type === 'error' ? 'assertive' : 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
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
   * Update position
   * @param {string} position - New position
   */
  setPosition(position) {
    this.options.position = position;
    this.container.className = `toast-container ${position}`;
  }
  
  /**
   * Get current toast count
   * @returns {number} Number of active toasts
   */
  getCount() {
    return this.toasts.size;
  }
  
  /**
   * Check if toast exists
   * @param {string} id - Toast ID
   * @returns {boolean} Whether toast exists
   */
  exists(id) {
    return this.toasts.has(id);
  }
  
  /**
   * Update toast content
   * @param {string} id - Toast ID
   * @param {Object} updates - Updates to apply
   */
  update(id, updates) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;
    
    // Update config
    Object.assign(toastData.config, updates);
    
    // Update DOM
    const newStructure = this.createToastStructure(toastData.config);
    const progressBar = toastData.element.querySelector('.toast-progress');
    
    toastData.element.innerHTML = newStructure;
    
    // Restore progress bar
    if (progressBar && toastData.config.progress) {
      toastData.element.appendChild(progressBar);
    }
    
    // Re-bind events
    this.bindToastEvents(toastData.element, id);
  }
}

/**
 * Convenience methods for different toast types
 */
class Toast {
  static manager = null;
  
  /**
   * Initialize toast manager
   * @param {Object} options - Manager options
   */
  static init(options = {}) {
    if (!Toast.manager) {
      Toast.manager = new ToastManager(options);
    }
    return Toast.manager;
  }
  
  /**
   * Show success toast
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {string} Toast ID
   */
  static success(message, options = {}) {
    if (!Toast.manager) Toast.init();
    
    const config = typeof message === 'string' 
      ? { message, ...options } 
      : { ...message, ...options };
    
    return Toast.manager.show({ type: 'success', ...config });
  }
  
  /**
   * Show warning toast
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {string} Toast ID
   */
  static warning(message, options = {}) {
    if (!Toast.manager) Toast.init();
    
    const config = typeof message === 'string' 
      ? { message, ...options } 
      : { ...message, ...options };
    
    return Toast.manager.show({ type: 'warning', ...config });
  }
  
  /**
   * Show error toast
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {string} Toast ID
   */
  static error(message, options = {}) {
    if (!Toast.manager) Toast.init();
    
    const config = typeof message === 'string' 
      ? { message, ...options } 
      : { ...message, ...options };
    
    return Toast.manager.show({ 
      type: 'error', 
      duration: 0, // Error toasts don't auto-dismiss by default
      ...config 
    });
  }
  
  /**
   * Show info toast
   * @param {string|Object} message - Message or options object
   * @param {Object} options - Additional options
   * @returns {string} Toast ID
   */
  static info(message, options = {}) {
    if (!Toast.manager) Toast.init();
    
    const config = typeof message === 'string' 
      ? { message, ...options } 
      : { ...message, ...options };
    
    return Toast.manager.show({ type: 'info', ...config });
  }
  
  /**
   * Hide specific toast
   * @param {string} id - Toast ID
   */
  static hide(id) {
    if (Toast.manager) {
      Toast.manager.hide(id);
    }
  }
  
  /**
   * Clear all toasts
   */
  static clear() {
    if (Toast.manager) {
      Toast.manager.clearAll();
    }
  }
  
  /**
   * Set position for future toasts
   * @param {string} position - Position
   */
  static setPosition(position) {
    if (!Toast.manager) Toast.init();
    Toast.manager.setPosition(position);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Toast, ToastManager };
}

// Global registration
if (typeof window !== 'undefined') {
  window.Toast = Toast;
  window.ToastManager = ToastManager;
}