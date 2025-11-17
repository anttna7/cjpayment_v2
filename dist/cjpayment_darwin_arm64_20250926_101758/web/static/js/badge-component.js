/**
 * Badge Component System
 * Handles status badges, tags, and notification badges with animations
 */

class BadgeComponent {
  constructor() {
    this.badges = new Map();
    this.animationQueue = [];
    this.isAnimating = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeExistingBadges();
    this.setupObserver();
  }

  /**
   * Bind global events
   */
  bindEvents() {
    // Handle removable tags
    document.addEventListener('click', (e) => {
      if (e.target.matches('.tag-remove') || e.target.closest('.tag-remove')) {
        this.handleTagRemove(e);
      }
    });

    // Handle badge clicks for interactive badges
    document.addEventListener('click', (e) => {
      const badge = e.target.closest('.badge[data-interactive="true"]');
      if (badge) {
        this.handleBadgeClick(badge, e);
      }
    });
  }

  /**
   * Initialize existing badges on page load
   */
  initializeExistingBadges() {
    const badges = document.querySelectorAll('.badge, .tag');
    badges.forEach(badge => this.initializeBadge(badge));
  }

  /**
   * Setup mutation observer for dynamically added badges
   */
  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is a badge
            if (node.matches('.badge, .tag')) {
              this.initializeBadge(node);
            }
            // Check for badges within the added node
            const badges = node.querySelectorAll('.badge, .tag');
            badges.forEach(badge => this.initializeBadge(badge));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Initialize a single badge
   */
  initializeBadge(badge) {
    const id = badge.id || this.generateBadgeId();
    badge.id = id;

    const config = {
      element: badge,
      type: badge.classList.contains('tag') ? 'tag' : 'badge',
      variant: this.getBadgeVariant(badge),
      size: this.getBadgeSize(badge),
      animated: badge.hasAttribute('data-animated'),
      interactive: badge.hasAttribute('data-interactive'),
      removable: badge.classList.contains('tag-removable'),
      count: badge.getAttribute('data-count'),
      status: badge.getAttribute('data-status'),
      priority: badge.getAttribute('data-priority')
    };

    this.badges.set(id, config);

    // Apply initial animations if specified
    if (config.animated) {
      this.applyAnimation(badge, badge.getAttribute('data-animation') || 'bounce');
    }

    // Setup notification badge if it has a count
    if (config.count !== null) {
      this.updateNotificationBadge(badge, config.count);
    }
  }

  /**
   * Generate unique badge ID
   */
  generateBadgeId() {
    return `badge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get badge variant from classes
   */
  getBadgeVariant(badge) {
    const variants = ['default', 'primary', 'success', 'warning', 'error', 'info'];
    for (const variant of variants) {
      if (badge.classList.contains(`badge-${variant}`) || badge.classList.contains(`tag-${variant}`)) {
        return variant;
      }
    }
    return 'default';
  }

  /**
   * Get badge size from classes
   */
  getBadgeSize(badge) {
    if (badge.classList.contains('badge-sm') || badge.classList.contains('tag-sm')) return 'sm';
    if (badge.classList.contains('badge-lg') || badge.classList.contains('tag-lg')) return 'lg';
    return 'md';
  }

  /**
   * Create a new badge element
   */
  createBadge(options = {}) {
    const {
      text = '',
      variant = 'default',
      size = 'md',
      type = 'badge',
      icon = null,
      removable = false,
      animated = false,
      animation = 'bounce',
      interactive = false,
      count = null,
      status = null,
      priority = null,
      className = '',
      attributes = {}
    } = options;

    const badge = document.createElement('span');
    
    // Base classes
    badge.className = `${type} ${type}-${variant} ${type}-${size} ${className}`.trim();
    
    // Add modifiers
    if (type === 'badge' && variant !== 'default') {
      // Badge-specific modifiers can be added here
    }
    
    if (removable && type === 'tag') {
      badge.classList.add('tag-removable');
    }

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      badge.setAttribute(key, value);
    });

    if (animated) {
      badge.setAttribute('data-animated', 'true');
      badge.setAttribute('data-animation', animation);
    }

    if (interactive) {
      badge.setAttribute('data-interactive', 'true');
    }

    if (count !== null) {
      badge.setAttribute('data-count', count);
    }

    if (status) {
      badge.setAttribute('data-status', status);
      badge.classList.add(`${type}-status-${status}`);
    }

    if (priority) {
      badge.setAttribute('data-priority', priority);
      badge.classList.add(`${type}-priority-${priority}`);
    }

    // Build content
    let content = '';
    
    if (icon) {
      content += `<span class="${type}-icon">${icon}</span>`;
    }
    
    content += text;
    
    if (removable && type === 'tag') {
      content += '<span class="tag-remove" aria-label="Remove tag">×</span>';
    }

    badge.innerHTML = content;

    // Initialize the badge
    this.initializeBadge(badge);

    return badge;
  }

  /**
   * Create status badge with predefined styling
   */
  createStatusBadge(status, text = null) {
    const statusConfig = {
      pending: { variant: 'warning', text: text || '待处理', icon: '⏳' },
      processing: { variant: 'info', text: text || '处理中', icon: '⚡', animated: true, animation: 'pulse' },
      completed: { variant: 'success', text: text || '已完成', icon: '✓' },
      failed: { variant: 'error', text: text || '失败', icon: '✗' },
      cancelled: { variant: 'default', text: text || '已取消', icon: '⊘' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return this.createBadge({
      ...config,
      status: status,
      className: `badge-status-${status}`
    });
  }

  /**
   * Create user status badge
   */
  createUserStatusBadge(status, text = null) {
    const statusConfig = {
      online: { variant: 'success', text: text || '在线', className: 'badge-user-online' },
      offline: { variant: 'default', text: text || '离线', className: 'badge-user-offline' },
      away: { variant: 'warning', text: text || '离开', className: 'badge-user-away' }
    };

    const config = statusConfig[status] || statusConfig.offline;
    
    return this.createBadge({
      ...config,
      status: status
    });
  }

  /**
   * Create priority badge
   */
  createPriorityBadge(priority, text = null) {
    const priorityConfig = {
      low: { variant: 'default', text: text || '低', className: 'badge-priority-low' },
      medium: { variant: 'warning', text: text || '中', className: 'badge-priority-medium' },
      high: { variant: 'error', text: text || '高', className: 'badge-priority-high' },
      urgent: { variant: 'error', text: text || '紧急', className: 'badge-priority-urgent', animated: true, animation: 'pulse' }
    };

    const config = priorityConfig[priority] || priorityConfig.low;
    
    return this.createBadge({
      ...config,
      priority: priority
    });
  }

  /**
   * Create notification badge (typically for counts)
   */
  createNotificationBadge(count, size = 'md') {
    const badge = document.createElement('span');
    badge.className = `notification-badge notification-badge-${size}`;
    badge.setAttribute('data-count', count);
    badge.textContent = count > 99 ? '99+' : count.toString();
    
    if (count === 0) {
      badge.style.display = 'none';
    }

    return badge;
  }

  /**
   * Update notification badge count
   */
  updateNotificationBadge(badge, count) {
    const numCount = parseInt(count, 10);
    badge.setAttribute('data-count', numCount);
    
    if (badge.classList.contains('notification-badge')) {
      badge.textContent = numCount > 99 ? '99+' : numCount.toString();
      badge.style.display = numCount === 0 ? 'none' : '';
      
      if (numCount > 0) {
        this.applyAnimation(badge, 'bounce');
      }
    }
  }

  /**
   * Apply animation to badge
   */
  applyAnimation(badge, animationType = 'bounce') {
    // Remove existing animation classes
    badge.classList.remove('badge-pulse', 'badge-bounce', 'badge-shimmer');
    
    // Add new animation class
    badge.classList.add(`badge-${animationType}`);
    
    // For one-time animations, remove the class after completion
    if (animationType === 'bounce') {
      setTimeout(() => {
        badge.classList.remove('badge-bounce');
      }, 1000);
    }
  }

  /**
   * Handle tag removal
   */
  handleTagRemove(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const tag = e.target.closest('.tag');
    if (!tag) return;

    const tagId = tag.id;
    const config = this.badges.get(tagId);

    // Trigger custom event before removal
    const removeEvent = new CustomEvent('tagRemove', {
      detail: { tag, config },
      cancelable: true
    });
    
    tag.dispatchEvent(removeEvent);
    
    if (removeEvent.defaultPrevented) {
      return;
    }

    // Animate removal
    tag.style.transition = 'all 0.3s ease-out';
    tag.style.transform = 'scale(0)';
    tag.style.opacity = '0';
    
    setTimeout(() => {
      if (tag.parentNode) {
        tag.parentNode.removeChild(tag);
      }
      this.badges.delete(tagId);
      
      // Trigger removed event
      document.dispatchEvent(new CustomEvent('tagRemoved', {
        detail: { tagId, config }
      }));
    }, 300);
  }

  /**
   * Handle interactive badge clicks
   */
  handleBadgeClick(badge, e) {
    const config = this.badges.get(badge.id);
    
    // Trigger custom event
    const clickEvent = new CustomEvent('badgeClick', {
      detail: { badge, config, originalEvent: e },
      cancelable: true
    });
    
    badge.dispatchEvent(clickEvent);
    
    if (!clickEvent.defaultPrevented) {
      // Default click behavior - apply bounce animation
      this.applyAnimation(badge, 'bounce');
    }
  }

  /**
   * Update badge text
   */
  updateBadgeText(badgeId, newText) {
    const config = this.badges.get(badgeId);
    if (!config) return;

    const badge = config.element;
    const removeButton = badge.querySelector('.tag-remove');
    const icon = badge.querySelector('.badge-icon, .tag-icon');
    
    let content = '';
    if (icon) {
      content += icon.outerHTML;
    }
    content += newText;
    if (removeButton) {
      content += removeButton.outerHTML;
    }
    
    badge.innerHTML = content;
  }

  /**
   * Update badge variant
   */
  updateBadgeVariant(badgeId, newVariant) {
    const config = this.badges.get(badgeId);
    if (!config) return;

    const badge = config.element;
    const oldVariant = config.variant;
    
    // Remove old variant class
    badge.classList.remove(`${config.type}-${oldVariant}`);
    
    // Add new variant class
    badge.classList.add(`${config.type}-${newVariant}`);
    
    // Update config
    config.variant = newVariant;
  }

  /**
   * Get badge by ID
   */
  getBadge(badgeId) {
    return this.badges.get(badgeId);
  }

  /**
   * Remove badge
   */
  removeBadge(badgeId) {
    const config = this.badges.get(badgeId);
    if (!config) return;

    const badge = config.element;
    if (badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
    
    this.badges.delete(badgeId);
  }

  /**
   * Get all badges of a specific type
   */
  getBadgesByType(type) {
    return Array.from(this.badges.values()).filter(config => config.type === type);
  }

  /**
   * Get all badges with a specific variant
   */
  getBadgesByVariant(variant) {
    return Array.from(this.badges.values()).filter(config => config.variant === variant);
  }

  /**
   * Get all badges with a specific status
   */
  getBadgesByStatus(status) {
    return Array.from(this.badges.values()).filter(config => config.status === status);
  }

  /**
   * Batch update badges
   */
  batchUpdateBadges(updates) {
    updates.forEach(({ badgeId, text, variant, count }) => {
      if (text !== undefined) {
        this.updateBadgeText(badgeId, text);
      }
      if (variant !== undefined) {
        this.updateBadgeVariant(badgeId, variant);
      }
      if (count !== undefined) {
        this.updateNotificationBadge(this.badges.get(badgeId)?.element, count);
      }
    });
  }

  /**
   * Create badge group container
   */
  createBadgeGroup(badges, options = {}) {
    const { size = 'md', className = '', type = 'badge' } = options;
    
    const group = document.createElement('div');
    group.className = `${type}-group ${type}-group-${size} ${className}`.trim();
    
    badges.forEach(badgeOptions => {
      const badge = this.createBadge({ ...badgeOptions, type });
      group.appendChild(badge);
    });
    
    return group;
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    this.badges.clear();
    // Remove event listeners if needed
  }
}

// Utility functions for common badge operations
const BadgeUtils = {
  /**
   * Create order status badge
   */
  orderStatus(status, orderId = null) {
    const badge = window.badgeComponent.createStatusBadge(status);
    if (orderId) {
      badge.setAttribute('data-order-id', orderId);
    }
    return badge;
  },

  /**
   * Create payment status badge
   */
  paymentStatus(status, amount = null) {
    const statusMap = {
      'pending': { text: '待支付', variant: 'warning' },
      'paid': { text: '已支付', variant: 'success' },
      'failed': { text: '支付失败', variant: 'error' },
      'refunded': { text: '已退款', variant: 'info' },
      'cancelled': { text: '已取消', variant: 'default' }
    };

    const config = statusMap[status] || statusMap.pending;
    let text = config.text;
    
    if (amount) {
      text += ` ¥${amount}`;
    }

    return window.badgeComponent.createBadge({
      text,
      variant: config.variant,
      status: status,
      className: `badge-payment-${status}`
    });
  },

  /**
   * Create merchant status badge
   */
  merchantStatus(status) {
    const statusMap = {
      'active': { text: '活跃', variant: 'success' },
      'inactive': { text: '未激活', variant: 'warning' },
      'suspended': { text: '已暂停', variant: 'error' },
      'pending': { text: '待审核', variant: 'info' }
    };

    const config = statusMap[status] || statusMap.pending;
    
    return window.badgeComponent.createBadge({
      text: config.text,
      variant: config.variant,
      status: status,
      className: `badge-merchant-${status}`
    });
  }
};

// Initialize component when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.badgeComponent = new BadgeComponent();
    window.BadgeUtils = BadgeUtils;
  });
} else {
  window.badgeComponent = new BadgeComponent();
  window.BadgeUtils = BadgeUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BadgeComponent, BadgeUtils };
}