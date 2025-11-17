/* ==========================================================================
   CSS Loading Optimization
   Async CSS loading with critical CSS inlining strategy
   ========================================================================== */

class CSSLoader {
  constructor() {
    this.loadedStylesheets = new Set();
    this.loadingPromises = new Map();
    this.criticalCSSInlined = false;
  }

  /**
   * Load CSS file asynchronously
   * @param {string} href - CSS file path
   * @param {string} media - Media query for the CSS (optional)
   * @param {boolean} preload - Whether to preload the CSS
   * @returns {Promise} Promise that resolves when CSS is loaded
   */
  async loadCSS(href, media = 'all', preload = false) {
    // Return existing promise if already loading
    if (this.loadingPromises.has(href)) {
      return this.loadingPromises.get(href);
    }

    // Return resolved promise if already loaded
    if (this.loadedStylesheets.has(href)) {
      return Promise.resolve();
    }

    const loadPromise = new Promise((resolve, reject) => {
      // Check if stylesheet already exists
      const existingLink = document.querySelector(`link[href="${href}"]`);
      if (existingLink) {
        this.loadedStylesheets.add(href);
        resolve();
        return;
      }

      // Create link element
      const link = document.createElement('link');
      link.rel = preload ? 'preload' : 'stylesheet';
      link.href = href;
      link.media = media;
      
      if (preload) {
        link.as = 'style';
        link.onload = () => {
          // Convert preload to stylesheet
          link.rel = 'stylesheet';
          this.loadedStylesheets.add(href);
          resolve();
        };
      } else {
        link.onload = () => {
          this.loadedStylesheets.add(href);
          resolve();
        };
      }

      link.onerror = () => {
        console.error(`Failed to load CSS: ${href}`);
        reject(new Error(`Failed to load CSS: ${href}`));
      };

      // Insert into head
      document.head.appendChild(link);
    });

    this.loadingPromises.set(href, loadPromise);
    return loadPromise;
  }

  /**
   * Load multiple CSS files in parallel
   * @param {Array} cssFiles - Array of CSS file objects {href, media, preload}
   * @returns {Promise} Promise that resolves when all CSS files are loaded
   */
  async loadMultipleCSS(cssFiles) {
    const loadPromises = cssFiles.map(file => {
      const { href, media = 'all', preload = false } = file;
      return this.loadCSS(href, media, preload);
    });

    return Promise.all(loadPromises);
  }

  /**
   * Inline critical CSS
   * @param {string} css - Critical CSS content
   */
  inlineCriticalCSS(css) {
    if (this.criticalCSSInlined) {
      return;
    }

    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-critical', 'true');
    
    // Insert before any existing stylesheets
    const firstLink = document.querySelector('link[rel="stylesheet"]');
    if (firstLink) {
      document.head.insertBefore(style, firstLink);
    } else {
      document.head.appendChild(style);
    }

    this.criticalCSSInlined = true;
  }

  /**
   * Load CSS based on media queries
   * @param {Object} mediaQueries - Object with media queries as keys and CSS files as values
   */
  async loadResponsiveCSS(mediaQueries) {
    const loadPromises = [];

    for (const [media, cssFiles] of Object.entries(mediaQueries)) {
      if (window.matchMedia(media).matches) {
        const files = Array.isArray(cssFiles) ? cssFiles : [cssFiles];
        files.forEach(file => {
          const href = typeof file === 'string' ? file : file.href;
          const fileMedia = typeof file === 'string' ? 'all' : (file.media || 'all');
          loadPromises.push(this.loadCSS(href, fileMedia));
        });
      }
    }

    return Promise.all(loadPromises);
  }

  /**
   * Preload CSS files for better performance
   * @param {Array} cssFiles - Array of CSS file paths
   */
  preloadCSS(cssFiles) {
    cssFiles.forEach(href => {
      this.loadCSS(href, 'all', true);
    });
  }

  /**
   * Load CSS conditionally based on feature detection
   * @param {Object} conditions - Object with condition functions as keys and CSS files as values
   */
  async loadConditionalCSS(conditions) {
    const loadPromises = [];

    for (const [condition, cssFiles] of Object.entries(conditions)) {
      let shouldLoad = false;

      // Evaluate condition
      if (typeof condition === 'function') {
        shouldLoad = condition();
      } else if (typeof condition === 'string') {
        // Check for CSS feature support
        shouldLoad = CSS.supports(condition);
      }

      if (shouldLoad) {
        const files = Array.isArray(cssFiles) ? cssFiles : [cssFiles];
        files.forEach(file => {
          const href = typeof file === 'string' ? file : file.href;
          loadPromises.push(this.loadCSS(href));
        });
      }
    }

    return Promise.all(loadPromises);
  }

  /**
   * Remove unused CSS files
   * @param {Array} cssFiles - Array of CSS file paths to remove
   */
  removeCSS(cssFiles) {
    cssFiles.forEach(href => {
      const link = document.querySelector(`link[href="${href}"]`);
      if (link) {
        link.remove();
        this.loadedStylesheets.delete(href);
        this.loadingPromises.delete(href);
      }
    });
  }

  /**
   * Get loading status
   * @returns {Object} Object with loading statistics
   */
  getLoadingStatus() {
    return {
      loaded: Array.from(this.loadedStylesheets),
      loading: Array.from(this.loadingPromises.keys()),
      criticalInlined: this.criticalCSSInlined
    };
  }

  /**
   * Wait for all CSS to be loaded
   * @returns {Promise} Promise that resolves when all CSS is loaded
   */
  async waitForAllCSS() {
    const loadingPromises = Array.from(this.loadingPromises.values());
    return Promise.all(loadingPromises);
  }
}

// Create global CSS loader instance
window.CSSLoader = new CSSLoader();

// Auto-load CSS based on page configuration
document.addEventListener('DOMContentLoaded', async () => {
  const cssLoader = window.CSSLoader;

  try {
    // Load responsive CSS based on screen size
    await cssLoader.loadResponsiveCSS({
      '(max-width: 767px)': [
        '/static/css/mobile.css'
      ],
      '(min-width: 768px) and (max-width: 1023px)': [
        '/static/css/tablet.css'
      ],
      '(min-width: 1024px)': [
        '/static/css/desktop.css'
      ]
    });

    // Load conditional CSS based on feature support
    await cssLoader.loadConditionalCSS({
      'display: grid': '/static/css/grid-enhanced.css',
      'backdrop-filter: blur(10px)': '/static/css/backdrop-blur.css',
      '(--css: variables)': '/static/css/css-variables-enhanced.css'
    });

    // Preload CSS for likely next pages
    const currentPath = window.location.pathname;
    const preloadMap = {
      '/dashboard': ['/static/css/charts.css', '/static/css/widgets.css'],
      '/recharge': ['/static/css/forms-advanced.css', '/static/css/tables-enhanced.css'],
      '/reports': ['/static/css/charts.css', '/static/css/data-viz.css']
    };

    if (preloadMap[currentPath]) {
      cssLoader.preloadCSS(preloadMap[currentPath]);
    }

    console.log('CSS loading completed:', cssLoader.getLoadingStatus());
  } catch (error) {
    console.error('CSS loading failed:', error);
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSSLoader;
}