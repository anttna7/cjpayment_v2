/**
 * CJPayment UI Components
 * Reusable UI components and widgets
 */

window.CJComponents = (function() {
    'use strict';

    // ==========================================================================
    // Toast Component
    // ==========================================================================

    const toast = {
        show(message, type = 'info', duration = 3000) {
            // Create toast container if it doesn't exist
            let container = CJUtils.$('#toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    max-width: 350px;
                `;
                document.body.appendChild(container);
            }

            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.style.cssText = `
                background: ${this.getBackgroundColor(type)};
                color: white;
                padding: 12px 16px;
                border-radius: 4px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateX(100%);
                transition: transform 0.3s ease;
                cursor: pointer;
            `;
            toast.textContent = message;

            // Add to container
            container.appendChild(toast);

            // Animate in
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 10);

            // Auto remove
            setTimeout(() => {
                this.remove(toast);
            }, duration);

            // Click to remove
            CJUtils.on(toast, 'click', () => {
                this.remove(toast);
            });

            return toast;
        },

        success(message, duration = 3000) {
            return this.show(message, 'success', duration);
        },

        error(message, duration = 5000) {
            return this.show(message, 'error', duration);
        },

        warning(message, duration = 4000) {
            return this.show(message, 'warning', duration);
        },

        info(message, duration = 3000) {
            return this.show(message, 'info', duration);
        },

        remove(toast) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        },

        getBackgroundColor(type) {
            const colors = {
                success: '#28a745',
                error: '#dc3545',
                warning: '#ffc107',
                info: '#17a2b8'
            };
            return colors[type] || colors.info;
        }
    };

    // ==========================================================================
    // Loading Component
    // ==========================================================================

    const loading = {
        show(message = '加载中...') {
            // Remove existing loading
            this.hide();

            // Create loading overlay
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            // Create loading content
            const content = document.createElement('div');
            content.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                min-width: 200px;
            `;

            // Create spinner
            const spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            `;

            // Add CSS animation
            if (!CJUtils.$('#loading-styles')) {
                const style = document.createElement('style');
                style.id = 'loading-styles';
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            // Create message
            const messageEl = document.createElement('div');
            messageEl.textContent = message;
            messageEl.style.color = '#333';

            // Assemble
            content.appendChild(spinner);
            content.appendChild(messageEl);
            overlay.appendChild(content);
            document.body.appendChild(overlay);

            return overlay;
        },

        hide() {
            const overlay = CJUtils.$('#loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        },

        toggle(show, message = '加载中...') {
            if (show) {
                this.show(message);
            } else {
                this.hide();
            }
        }
    };

    // ==========================================================================
    // Enhanced Feedback Components
    // ==========================================================================

    const feedback = {
        /**
         * Show success feedback with animation
         * @param {string} message - Success message
         * @param {Object} options - Options
         */
        showSuccess(message, options = {}) {
            const config = {
                duration: 3000,
                showIcon: true,
                position: 'top-right',
                ...options
            };

            const successEl = document.createElement('div');
            successEl.className = 'feedback-success';
            successEl.innerHTML = `
                ${config.showIcon ? '<div class="feedback-icon">✅</div>' : ''}
                <div class="feedback-message">${CJUtils.escapeHtml(message)}</div>
            `;

            this.showFeedback(successEl, config);
        },

        /**
         * Show error feedback with animation
         * @param {string} message - Error message
         * @param {Object} options - Options
         */
        showError(message, options = {}) {
            const config = {
                duration: 5000,
                showIcon: true,
                position: 'top-right',
                ...options
            };

            const errorEl = document.createElement('div');
            errorEl.className = 'feedback-error';
            errorEl.innerHTML = `
                ${config.showIcon ? '<div class="feedback-icon">❌</div>' : ''}
                <div class="feedback-message">${CJUtils.escapeHtml(message)}</div>
            `;

            this.showFeedback(errorEl, config);
        },

        /**
         * Show warning feedback with animation
         * @param {string} message - Warning message
         * @param {Object} options - Options
         */
        showWarning(message, options = {}) {
            const config = {
                duration: 4000,
                showIcon: true,
                position: 'top-right',
                ...options
            };

            const warningEl = document.createElement('div');
            warningEl.className = 'feedback-warning';
            warningEl.innerHTML = `
                ${config.showIcon ? '<div class="feedback-icon">⚠️</div>' : ''}
                <div class="feedback-message">${CJUtils.escapeHtml(message)}</div>
            `;

            this.showFeedback(warningEl, config);
        },

        /**
         * Show generic feedback
         * @param {Element} element - Feedback element
         * @param {Object} config - Configuration
         */
        showFeedback(element, config) {
            // Add styles if not exists
            this.ensureStyles();

            // Get or create container
            let container = CJUtils.$('#feedback-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'feedback-container';
                container.className = `feedback-container ${config.position}`;
                document.body.appendChild(container);
            }

            // Add feedback element
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            container.appendChild(element);

            // Animate in
            setTimeout(() => {
                element.style.transform = 'translateX(0)';
                element.style.opacity = '1';
            }, 10);

            // Auto remove
            setTimeout(() => {
                this.removeFeedback(element);
            }, config.duration);

            // Click to remove
            CJUtils.on(element, 'click', () => {
                this.removeFeedback(element);
            });
        },

        /**
         * Remove feedback element
         * @param {Element} element - Feedback element
         */
        removeFeedback(element) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        },

        /**
         * Ensure feedback styles are loaded
         */
        ensureStyles() {
            if (CJUtils.$('#feedback-styles')) return;

            const style = document.createElement('style');
            style.id = 'feedback-styles';
            style.textContent = `
                .feedback-container {
                    position: fixed;
                    z-index: 9999;
                    max-width: 350px;
                    pointer-events: none;
                }
                .feedback-container.top-right {
                    top: 20px;
                    right: 20px;
                }
                .feedback-container.top-left {
                    top: 20px;
                    left: 20px;
                }
                .feedback-container.bottom-right {
                    bottom: 20px;
                    right: 20px;
                }
                .feedback-container.bottom-left {
                    bottom: 20px;
                    left: 20px;
                }
                .feedback-success,
                .feedback-error,
                .feedback-warning {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    margin-bottom: 10px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    cursor: pointer;
                    pointer-events: auto;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(10px);
                }
                .feedback-success {
                    background: rgba(40, 167, 69, 0.95);
                    color: white;
                    border-left: 4px solid #28a745;
                }
                .feedback-error {
                    background: rgba(220, 53, 69, 0.95);
                    color: white;
                    border-left: 4px solid #dc3545;
                }
                .feedback-warning {
                    background: rgba(255, 193, 7, 0.95);
                    color: #212529;
                    border-left: 4px solid #ffc107;
                }
                .feedback-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                .feedback-message {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .feedback-success:hover,
                .feedback-error:hover,
                .feedback-warning:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
            `;
            document.head.appendChild(style);
        }
    };

    // ==========================================================================
    // Form Validation Component
    // ==========================================================================

    const validation = {
        /**
         * Add real-time validation to form field
         * @param {string|Element} field - Field selector or element
         * @param {Array} rules - Validation rules
         * @param {Object} options - Options
         */
        addFieldValidation(field, rules, options = {}) {
            const fieldElement = typeof field === 'string' ? CJUtils.$(field) : field;
            if (!fieldElement) return;

            const config = {
                showSuccess: true,
                showError: true,
                validateOnInput: true,
                validateOnBlur: true,
                ...options
            };

            // Create validation message element
            let messageEl = fieldElement.parentNode.querySelector('.validation-message');
            if (!messageEl) {
                messageEl = document.createElement('div');
                messageEl.className = 'validation-message';
                fieldElement.parentNode.appendChild(messageEl);
            }

            // Validation function
            const validate = () => {
                const value = fieldElement.value.trim();
                const errors = [];

                rules.forEach(rule => {
                    if (typeof rule === 'function') {
                        const result = rule(value, fieldElement);
                        if (result !== true) {
                            errors.push(result);
                        }
                    } else if (rule.test && !rule.test(value)) {
                        errors.push(rule.message);
                    }
                });

                // Update field appearance
                fieldElement.classList.remove('valid', 'invalid');
                messageEl.textContent = '';
                messageEl.className = 'validation-message';

                if (errors.length > 0) {
                    if (config.showError) {
                        fieldElement.classList.add('invalid');
                        messageEl.textContent = errors[0];
                        messageEl.classList.add('error');
                    }
                    return false;
                } else if (value) {
                    if (config.showSuccess) {
                        fieldElement.classList.add('valid');
                        messageEl.classList.add('success');
                    }
                    return true;
                }

                return true;
            };

            // Add event listeners
            if (config.validateOnInput) {
                CJUtils.on(fieldElement, 'input', CJUtils.debounce(validate, 300));
            }

            if (config.validateOnBlur) {
                CJUtils.on(fieldElement, 'blur', validate);
            }

            // Add validation styles
            this.ensureValidationStyles();

            return { validate, element: fieldElement, messageElement: messageEl };
        },

        /**
         * Validate entire form
         * @param {string|Element} form - Form selector or element
         * @returns {boolean}
         */
        validateForm(form) {
            const formElement = typeof form === 'string' ? CJUtils.$(form) : form;
            if (!formElement) return false;

            const fields = formElement.querySelectorAll('[data-validation]');
            let isValid = true;

            fields.forEach(field => {
                const validator = field._validator;
                if (validator && !validator.validate()) {
                    isValid = false;
                }
            });

            return isValid;
        },

        /**
         * Common validation rules
         */
        rules: {
            required: (value) => value.length > 0 || '此字段为必填项',
            email: (value) => !value || CJUtils.isValidEmail(value) || '请输入有效的邮箱地址',
            minLength: (min) => (value) => !value || value.length >= min || `最少需要${min}个字符`,
            maxLength: (max) => (value) => !value || value.length <= max || `最多允许${max}个字符`,
            numeric: (value) => !value || /^\d+$/.test(value) || '只能输入数字',
            decimal: (value) => !value || /^\d+(\.\d+)?$/.test(value) || '请输入有效的数字',
            phone: (value) => !value || /^1[3-9]\d{9}$/.test(value) || '请输入有效的手机号码'
        },

        /**
         * Ensure validation styles are loaded
         */
        ensureValidationStyles() {
            if (CJUtils.$('#validation-styles')) return;

            const style = document.createElement('style');
            style.id = 'validation-styles';
            style.textContent = `
                .validation-message {
                    font-size: 12px;
                    margin-top: 4px;
                    min-height: 16px;
                    transition: all 0.3s ease;
                }
                .validation-message.error {
                    color: #dc3545;
                }
                .validation-message.success {
                    color: #28a745;
                }
                input.valid,
                textarea.valid,
                select.valid {
                    border-color: #28a745;
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
                }
                input.invalid,
                textarea.invalid,
                select.invalid {
                    border-color: #dc3545;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
                }
            `;
            document.head.appendChild(style);
        }
    };

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        toast,
        loading,
        feedback,
        validation
    };
})();