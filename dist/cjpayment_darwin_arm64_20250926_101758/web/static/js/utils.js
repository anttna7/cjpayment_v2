/**
 * CJPayment Utility Functions
 * Common utility functions used across the application
 */

window.CJUtils = (function() {
    'use strict';

    // ==========================================================================
    // DOM Utilities
    // ==========================================================================

    /**
     * Query selector with optional context
     * @param {string} selector - CSS selector
     * @param {Element} context - Context element (default: document)
     * @returns {Element|null}
     */
    function $(selector, context = document) {
        return context.querySelector(selector);
    }

    /**
     * Query selector all with optional context
     * @param {string} selector - CSS selector
     * @param {Element} context - Context element (default: document)
     * @returns {NodeList}
     */
    function $$(selector, context = document) {
        return context.querySelectorAll(selector);
    }

    /**
     * Add event listener with optional delegation
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {string} delegate - Delegation selector (optional)
     */
    function on(target, event, handler, delegate) {
        const element = typeof target === 'string' ? $(target) : target;
        if (!element) return;

        if (delegate) {
            element.addEventListener(event, function(e) {
                if (e.target.matches(delegate)) {
                    handler.call(e.target, e);
                }
            });
        } else {
            element.addEventListener(event, handler);
        }
    }

    /**
     * Remove event listener
     * @param {Element|string} target - Target element or selector
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    function off(target, event, handler) {
        const element = typeof target === 'string' ? $(target) : target;
        if (!element) return;
        element.removeEventListener(event, handler);
    }

    // ==========================================================================
    // String Utilities
    // ==========================================================================

    /**
     * Escape HTML characters
     * @param {string} str - String to escape
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency symbol (default: ¥)
     * @returns {string}
     */
    function formatCurrency(amount, currency = '¥') {
        return `${currency}${Number(amount).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    /**
     * Format date
     * @param {Date|string} date - Date to format
     * @param {string} format - Format string (default: YYYY-MM-DD HH:mm:ss)
     * @returns {string}
     */
    function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // ==========================================================================
    // Validation Utilities
    // ==========================================================================

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // ==========================================================================
    // Storage Utilities
    // ==========================================================================

    /**
     * Local storage wrapper with JSON support
     */
    const storage = {
        set(key, value, type = 'session') {
            try {
                const storage = type === 'local' ? localStorage : sessionStorage;
                storage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        get(key, defaultValue = null, type = 'session') {
            try {
                const storage = type === 'local' ? localStorage : sessionStorage;
                const item = storage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },

        remove(key, type = 'session') {
            try {
                const storage = type === 'local' ? localStorage : sessionStorage;
                storage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        },

        clear(type = 'session') {
            try {
                const storage = type === 'local' ? localStorage : sessionStorage;
                storage.clear();
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    };

    // ==========================================================================
    // URL and Query Utilities
    // ==========================================================================

    /**
     * Parse query string to object
     * @param {string} queryString - Query string (optional, defaults to current URL)
     * @returns {Object}
     */
    function parseQuery(queryString = window.location.search) {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    // ==========================================================================
    // Form Auto-save and Recovery Utilities
    // ==========================================================================

    /**
     * Auto-save form data to storage
     * @param {string|Element} form - Form selector or element
     * @param {string} key - Storage key
     * @param {Object} options - Options
     */
    function enableFormAutoSave(form, key, options = {}) {
        const formElement = typeof form === 'string' ? $(form) : form;
        if (!formElement) return;

        const config = {
            interval: 5000, // Auto-save every 5 seconds
            storage: 'session', // 'session' or 'local'
            exclude: ['password', 'confirm_password'], // Fields to exclude
            onSave: null,
            onRestore: null,
            ...options
        };

        let saveTimer;
        let isDirty = false;

        // Save form data
        function saveFormData() {
            if (!isDirty) return;

            const formData = new FormData(formElement);
            const data = {};
            
            for (const [key, value] of formData.entries()) {
                if (!config.exclude.includes(key)) {
                    data[key] = value;
                }
            }

            storage.set(`form_${key}`, {
                data,
                timestamp: Date.now(),
                url: window.location.pathname
            }, config.storage);

            isDirty = false;
            if (config.onSave) config.onSave(data);
        }

        // Restore form data
        function restoreFormData() {
            const saved = storage.get(`form_${key}`, null, config.storage);
            if (!saved || saved.url !== window.location.pathname) return false;

            // Check if data is not too old (24 hours)
            if (Date.now() - saved.timestamp > 24 * 60 * 60 * 1000) {
                storage.remove(`form_${key}`, config.storage);
                return false;
            }

            let restored = false;
            Object.entries(saved.data).forEach(([fieldName, value]) => {
                const field = formElement.querySelector(`[name="${fieldName}"]`);
                if (field && field.value === '') {
                    field.value = value;
                    restored = true;
                }
            });

            if (restored && config.onRestore) {
                config.onRestore(saved.data);
            }

            return restored;
        }

        // Clear saved data
        function clearSavedData() {
            storage.remove(`form_${key}`, config.storage);
            isDirty = false;
        }

        // Listen for form changes
        on(formElement, 'input', () => {
            isDirty = true;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveFormData, config.interval);
        });

        on(formElement, 'change', () => {
            isDirty = true;
            clearTimeout(saveTimer);
            saveTimer = setTimeout(saveFormData, 1000); // Save faster on change events
        });

        // Save on form submit
        on(formElement, 'submit', () => {
            clearSavedData();
        });

        // Save on page unload
        on(window, 'beforeunload', () => {
            if (isDirty) saveFormData();
        });

        // Try to restore data on initialization
        const restored = restoreFormData();

        return {
            save: saveFormData,
            restore: restoreFormData,
            clear: clearSavedData,
            isRestored: restored
        };
    }

    // ==========================================================================
    // Performance Optimization Utilities
    // ==========================================================================

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately
     * @returns {Function}
     */
    function debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function}
     */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Lazy load images
     * @param {string} selector - Image selector
     * @param {Object} options - Options
     */
    function lazyLoadImages(selector = 'img[data-src]', options = {}) {
        const config = {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            }, config);

            $(selector).forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            $(selector).forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    /**
     * Preload critical resources
     * @param {Array} resources - Array of resource URLs
     * @param {string} type - Resource type ('script', 'style', 'image')
     */
    function preloadResources(resources, type = 'script') {
        resources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = url;
            
            switch (type) {
                case 'script':
                    link.as = 'script';
                    break;
                case 'style':
                    link.as = 'style';
                    break;
                case 'image':
                    link.as = 'image';
                    break;
            }
            
            document.head.appendChild(link);
        });
    }

    // ==========================================================================
    // Feedback and Notification Utilities
    // ==========================================================================

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - Options
     * @returns {Promise<boolean>}
     */
    function confirm(message, options = {}) {
        return new Promise((resolve) => {
            const config = {
                title: '确认操作',
                confirmText: '确定',
                cancelText: '取消',
                type: 'warning',
                ...options
            };

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.innerHTML = `
                <div class="confirm-overlay">
                    <div class="confirm-dialog">
                        <div class="confirm-header">
                            <h3>${escapeHtml(config.title)}</h3>
                        </div>
                        <div class="confirm-body">
                            <div class="confirm-icon ${config.type}">
                                ${config.type === 'warning' ? '⚠️' : config.type === 'danger' ? '❌' : 'ℹ️'}
                            </div>
                            <p>${escapeHtml(message)}</p>
                        </div>
                        <div class="confirm-footer">
                            <button class="btn btn-secondary cancel-btn">${escapeHtml(config.cancelText)}</button>
                            <button class="btn btn-primary confirm-btn">${escapeHtml(config.confirmText)}</button>
                        </div>
                    </div>
                </div>
            `;

            // Add styles
            if (!$('#confirm-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'confirm-modal-styles';
                style.textContent = `
                    .confirm-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10000;
                    }
                    .confirm-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .confirm-dialog {
                        background: white;
                        border-radius: 8px;
                        min-width: 300px;
                        max-width: 500px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    }
                    .confirm-header {
                        padding: 20px 20px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .confirm-header h3 {
                        margin: 0 0 15px 0;
                        font-size: 18px;
                    }
                    .confirm-body {
                        padding: 20px;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }
                    .confirm-icon {
                        font-size: 24px;
                        flex-shrink: 0;
                    }
                    .confirm-footer {
                        padding: 0 20px 20px;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }
                    .confirm-footer .btn {
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .confirm-footer .btn-secondary {
                        background: #6c757d;
                        color: white;
                    }
                    .confirm-footer .btn-primary {
                        background: #007bff;
                        color: white;
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(modal);

            // Handle clicks
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const overlay = modal.querySelector('.confirm-overlay');

            function cleanup() {
                document.body.removeChild(modal);
            }

            confirmBtn.onclick = () => {
                cleanup();
                resolve(true);
            };

            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            };

            // Focus confirm button
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    /**
     * Show progress indicator
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    function showProgress(progress, message = '') {
        let progressBar = $('#progress-indicator');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'progress-indicator';
            progressBar.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-message"></div>
            `;
            
            // Add styles
            if (!$('#progress-styles')) {
                const style = document.createElement('style');
                style.id = 'progress-styles';
                style.textContent = `
                    #progress-indicator {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        padding: 15px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        z-index: 9999;
                        min-width: 250px;
                    }
                    .progress-bar {
                        width: 100%;
                        height: 8px;
                        background: #e9ecef;
                        border-radius: 4px;
                        overflow: hidden;
                        margin-bottom: 10px;
                    }
                    .progress-fill {
                        height: 100%;
                        background: #007bff;
                        transition: width 0.3s ease;
                        border-radius: 4px;
                    }
                    .progress-message {
                        font-size: 14px;
                        color: #666;
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(progressBar);
        }

        const fill = progressBar.querySelector('.progress-fill');
        const messageEl = progressBar.querySelector('.progress-message');
        
        fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        messageEl.textContent = message;

        if (progress >= 100) {
            setTimeout(() => {
                if (progressBar.parentNode) {
                    progressBar.parentNode.removeChild(progressBar);
                }
            }, 1000);
        }
    }

    // ==========================================================================
    // Keyboard Shortcuts Utilities
    // ==========================================================================

    /**
     * Keyboard shortcut manager
     */
    const shortcuts = {
        bindings: new Map(),

        /**
         * Register a keyboard shortcut
         * @param {string} keys - Key combination (e.g., 'ctrl+s', 'alt+1')
         * @param {Function} handler - Handler function
         * @param {Object} options - Options
         */
        register(keys, handler, options = {}) {
            const config = {
                preventDefault: true,
                description: '',
                ...options
            };

            const normalizedKeys = this.normalizeKeys(keys);
            this.bindings.set(normalizedKeys, { handler, config });
        },

        /**
         * Unregister a keyboard shortcut
         * @param {string} keys - Key combination
         */
        unregister(keys) {
            const normalizedKeys = this.normalizeKeys(keys);
            this.bindings.delete(normalizedKeys);
        },

        /**
         * Normalize key combination string
         * @param {string} keys - Key combination
         * @returns {string}
         */
        normalizeKeys(keys) {
            return keys.toLowerCase()
                .replace(/\s+/g, '')
                .split('+')
                .sort()
                .join('+');
        },

        /**
         * Get current pressed keys
         * @param {KeyboardEvent} e - Keyboard event
         * @returns {string}
         */
        getCurrentKeys(e) {
            const keys = [];
            
            if (e.ctrlKey || e.metaKey) keys.push('ctrl');
            if (e.altKey) keys.push('alt');
            if (e.shiftKey) keys.push('shift');
            
            const key = e.key.toLowerCase();
            if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
                keys.push(key);
            }
            
            return keys.sort().join('+');
        },

        /**
         * Handle keydown event
         * @param {KeyboardEvent} e - Keyboard event
         */
        handleKeydown(e) {
            const currentKeys = this.getCurrentKeys(e);
            const binding = this.bindings.get(currentKeys);
            
            if (binding) {
                if (binding.config.preventDefault) {
                    e.preventDefault();
                }
                binding.handler(e);
            }
        },

        /**
         * Initialize keyboard shortcuts
         */
        init() {
            on(document, 'keydown', (e) => this.handleKeydown(e));
        },

        /**
         * Get all registered shortcuts
         * @returns {Array}
         */
        getAll() {
            return Array.from(this.bindings.entries()).map(([keys, binding]) => ({
                keys,
                description: binding.config.description
            }));
        }
    };

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        // DOM utilities
        $,
        $$,
        on,
        off,

        // String utilities
        escapeHtml,
        formatCurrency,
        formatDate,

        // Validation utilities
        isValidEmail,

        // Storage utilities
        storage,

        // URL utilities
        parseQuery,

        // Form utilities
        enableFormAutoSave,

        // Performance utilities
        debounce,
        throttle,
        lazyLoadImages,
        preloadResources,

        // Feedback utilities
        confirm,
        showProgress,

        // Keyboard shortcuts
        shortcuts
    };
})();