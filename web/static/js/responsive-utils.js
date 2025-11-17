/**
 * Responsive Layout Utilities
 * JavaScript utilities for responsive behavior and container queries
 */

class ResponsiveUtils {
  constructor() {
    this.breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536
    };
    
    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.observers = new Map();
    
    this.init();
  }
  
  init() {
    this.setupBreakpointListener();
    this.setupContainerQueries();
    this.setupResizeObserver();
  }
  
  /**
   * Get current breakpoint based on window width
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width >= this.breakpoints['2xl']) return '2xl';
    if (width >= this.breakpoints.xl) return 'xl';
    if (width >= this.breakpoints.lg) return 'lg';
    if (width >= this.breakpoints.md) return 'md';
    if (width >= this.breakpoints.sm) return 'sm';
    return 'xs';
  }
  
  /**
   * Check if current viewport matches breakpoint
   */
  matches(breakpoint) {
    const width = window.innerWidth;
    
    if (breakpoint === 'xs') {
      return width < this.breakpoints.sm;
    }
    
    return width >= this.breakpoints[breakpoint];
  }
  
  /**
   * Setup breakpoint change listener
   */
  setupBreakpointListener() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();
        
        if (newBreakpoint !== this.currentBreakpoint) {
          const oldBreakpoint = this.currentBreakpoint;
          this.currentBreakpoint = newBreakpoint;
          
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('breakpointChange', {
            detail: {
              from: oldBreakpoint,
              to: newBreakpoint,
              width: window.innerWidth
            }
          }));
        }
      }, 100);
    });
  }
  
  /**
   * Setup container queries polyfill for older browsers
   */
  setupContainerQueries() {
    // Check if container queries are supported
    if (!CSS.supports('container-type: inline-size')) {
      this.polyfillContainerQueries();
    }
  }
  
  /**
   * Polyfill for container queries
   */
  polyfillContainerQueries() {
    const containerElements = document.querySelectorAll('.container-query, .container-query-size');
    
    containerElements.forEach(container => {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const element = entry.target;
          
          // Remove existing container query classes
          element.classList.forEach(className => {
            if (className.startsWith('cq-')) {
              element.classList.remove(className);
            }
          });
          
          // Add appropriate container query classes
          if (width >= 800) {
            element.classList.add('cq-xl');
          } else if (width >= 640) {
            element.classList.add('cq-lg');
          } else if (width >= 480) {
            element.classList.add('cq-md');
          } else if (width >= 320) {
            element.classList.add('cq-sm');
          }
        }
      });
      
      observer.observe(container);
      this.observers.set(container, observer);
    });
  }
  
  /**
   * Setup resize observer for responsive components
   */
  setupResizeObserver() {
    const responsiveElements = document.querySelectorAll('[data-responsive]');
    
    responsiveElements.forEach(element => {
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const height = entry.contentRect.height;
          const target = entry.target;
          
          // Dispatch resize event with dimensions
          target.dispatchEvent(new CustomEvent('elementResize', {
            detail: { width, height }
          }));
        }
      });
      
      observer.observe(element);
      this.observers.set(element, observer);
    });
  }
  
  /**
   * Apply responsive grid based on container width
   */
  applyResponsiveGrid(container, options = {}) {
    const {
      minItemWidth = 280,
      maxColumns = 6,
      gap = 'var(--space-4)'
    } = options;
    
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const availableWidth = containerWidth - (parseInt(gap) * 2);
        const columns = Math.min(
          Math.floor(availableWidth / minItemWidth),
          maxColumns
        );
        
        entry.target.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
        entry.target.style.gap = gap;
      }
    });
    
    observer.observe(container);
    this.observers.set(container, observer);
    
    return observer;
  }
  
  /**
   * Create responsive card grid
   */
  createResponsiveCardGrid(container, options = {}) {
    const {
      minCardWidth = 300,
      maxColumns = 4,
      gap = 'var(--space-6)'
    } = options;
    
    container.classList.add('grid');
    container.style.gap = gap;
    
    return this.applyResponsiveGrid(container, {
      minItemWidth: minCardWidth,
      maxColumns,
      gap
    });
  }
  
  /**
   * Toggle responsive classes based on breakpoint
   */
  toggleResponsiveClasses(element, classMap) {
    const currentBp = this.getCurrentBreakpoint();
    
    // Remove all responsive classes
    Object.values(classMap).flat().forEach(className => {
      element.classList.remove(className);
    });
    
    // Add classes for current breakpoint and smaller
    const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(currentBp);
    
    for (let i = 0; i <= currentIndex; i++) {
      const bp = breakpointOrder[i];
      if (classMap[bp]) {
        classMap[bp].forEach(className => {
          element.classList.add(className);
        });
      }
    }
  }
  
  /**
   * Get responsive value based on current breakpoint
   */
  getResponsiveValue(values) {
    const currentBp = this.getCurrentBreakpoint();
    const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    
    // Find the value for current breakpoint or closest smaller one
    for (let i = breakpointOrder.indexOf(currentBp); i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp] !== undefined) {
        return values[bp];
      }
    }
    
    // Fallback to first available value
    return Object.values(values)[0];
  }
  
  /**
   * Create responsive navigation
   */
  createResponsiveNavigation(nav, options = {}) {
    const {
      mobileBreakpoint = 'md',
      toggleSelector = '.nav-toggle',
      menuSelector = '.nav-menu'
    } = options;
    
    const toggle = nav.querySelector(toggleSelector);
    const menu = nav.querySelector(menuSelector);
    
    if (!toggle || !menu) return;
    
    const updateNavigation = () => {
      const isMobile = !this.matches(mobileBreakpoint);
      
      if (isMobile) {
        menu.classList.add('nav-mobile');
        toggle.style.display = 'block';
        menu.setAttribute('aria-hidden', 'true');
      } else {
        menu.classList.remove('nav-mobile', 'nav-open');
        toggle.style.display = 'none';
        menu.removeAttribute('aria-hidden');
      }
    };
    
    // Initial setup
    updateNavigation();
    
    // Listen for breakpoint changes
    window.addEventListener('breakpointChange', updateNavigation);
    
    // Toggle functionality
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.contains('nav-open');
      menu.classList.toggle('nav-open');
      menu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && menu.classList.contains('nav-open')) {
        menu.classList.remove('nav-open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
  
  /**
   * Destroy instance
   */
  destroy() {
    this.cleanup();
    window.removeEventListener('resize', this.handleResize);
  }
}

// Auto-initialize responsive utilities
let responsiveUtils;

document.addEventListener('DOMContentLoaded', () => {
  responsiveUtils = new ResponsiveUtils();
  
  // Make available globally
  window.ResponsiveUtils = ResponsiveUtils;
  window.responsiveUtils = responsiveUtils;
  
  // Auto-setup responsive grids
  document.querySelectorAll('[data-responsive-grid]').forEach(grid => {
    const options = JSON.parse(grid.dataset.responsiveGrid || '{}');
    responsiveUtils.createResponsiveCardGrid(grid, options);
  });
  
  // Auto-setup responsive navigation
  document.querySelectorAll('[data-responsive-nav]').forEach(nav => {
    const options = JSON.parse(nav.dataset.responsiveNav || '{}');
    responsiveUtils.createResponsiveNavigation(nav, options);
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResponsiveUtils;
}

/**
 * Utility functions for responsive design
 */
window.ResponsiveHelpers = {
  /**
   * Check if element is visible in viewport
   */
  isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= windowHeight + threshold &&
      rect.right <= windowWidth + threshold
    );
  },
  
  /**
   * Debounce function for performance
   */
  debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  /**
   * Throttle function for performance
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * Get element dimensions
   */
  getDimensions(element) {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    };
  },
  
  /**
   * Set CSS custom property
   */
  setCSSProperty(property, value, element = document.documentElement) {
    element.style.setProperty(property, value);
  },
  
  /**
   * Get CSS custom property
   */
  getCSSProperty(property, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(property).trim();
  }
};