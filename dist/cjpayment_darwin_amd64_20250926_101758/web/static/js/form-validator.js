/**
 * Form Validator Component
 * Advanced form validation with real-time feedback and custom rules
 * 
 * Features:
 * - Real-time field validation
 * - Custom validation rules
 * - Async validation support
 * - Accessibility compliance
 * - Multiple validation strategies
 * - Internationalization support
 */

class FormValidator {
    constructor(options = {}) {
        this.options = {
            realTimeValidation: true,
            showSuccessStates: false,
            validateOnBlur: true,
            validateOnInput: false,
            debounceDelay: 300,
            customRules: {},
            messages: {},
            ...options
        };
        
        this.forms = new Map();
        this.validationTimers = new Map();
        this.asyncValidators = new Map();
        
        // Default validation rules
        this.rules = {
            required: this.validateRequired.bind(this),
            email: this.validateEmail.bind(this),
            url: this.validateUrl.bind(this),
            number: this.validateNumber.bind(this),
            integer: this.validateInteger.bind(this),
            decimal: this.validateDecimal.bind(this),
            minLength: this.validateMinLength.bind(this),
            maxLength: this.validateMaxLength.bind(this),
            min: this.validateMin.bind(this),
            max: this.validateMax.bind(this),
            pattern: this.validatePattern.bind(this),
            phone: this.validatePhone.bind(this),
            idCard: this.validateIdCard.bind(this),
            bankCard: this.validateBankCard.bind(this),
            currency: this.validateCurrency.bind(this),
            accountNumber: this.validateAccountNumber.bind(this),
            ...this.options.customRules
        };
        
        // Default error messages
        this.messages = {
            required: '此字段为必填项',
            email: '请输入有效的邮箱地址',
            url: '请输入有效的网址',
            number: '请输入有效的数字',
            integer: '请输入有效的整数',
            decimal: '请输入有效的小数',
            minLength: '至少需要 {0} 个字符',
            maxLength: '最多允许 {0} 个字符',
            min: '值不能小于 {0}',
            max: '值不能大于 {0}',
            pattern: '格式不正确',
            phone: '请输入有效的手机号码',
            idCard: '请输入有效的身份证号码',
            bankCard: '请输入有效的银行卡号',
            currency: '请输入有效的金额',
            accountNumber: '账户号码格式不正确',
            ...this.options.messages
        };
        
        this.init();
    }
    
    /**
     * Initialize validator
     */
    init() {
        // Auto-bind forms with validation attributes
        this.autoBindForms();
    }
    
    /**
     * Auto-bind forms with validation attributes
     */
    autoBindForms() {
        const forms = document.querySelectorAll('form[data-validate]');
        forms.forEach(form => this.bindForm(form));
    }
    
    /**
     * Bind form for validation
     * @param {HTMLFormElement} form - Form element
     * @param {Object} options - Form-specific options
     */
    bindForm(form, options = {}) {
        if (!form || form.tagName !== 'FORM') {
            console.warn('Invalid form element provided to FormValidator');
            return;
        }
        
        const formId = form.id || `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (!form.id) form.id = formId;
        
        const formOptions = {
            ...this.options,
            ...options
        };
        
        this.forms.set(formId, {
            element: form,
            options: formOptions,
            fields: new Map(),
            isValid: false
        });
        
        // Bind form events
        this.bindFormEvents(form, formId);
        
        // Initialize fields
        this.initializeFormFields(form, formId);
    }
    
    /**
     * Unbind form from validation
     * @param {HTMLFormElement} form - Form element
     */
    unbindForm(form) {
        if (!form) return;
        
        const formId = form.id;
        if (!formId || !this.forms.has(formId)) return;
        
        // Clear timers
        this.clearValidationTimers(formId);
        
        // Remove event listeners
        this.unbindFormEvents(form);
        
        // Remove from forms map
        this.forms.delete(formId);
    }
    
    /**
     * Bind form events
     * @param {HTMLFormElement} form - Form element
     * @param {string} formId - Form ID
     */
    bindFormEvents(form, formId) {
        const formData = this.forms.get(formId);
        if (!formData) return;
        
        // Submit event
        const submitHandler = (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                e.stopPropagation();
                
                // Focus first invalid field
                const firstInvalid = form.querySelector('.is-invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        };
        
        form.addEventListener('submit', submitHandler);
        formData.submitHandler = submitHandler;
        
        // Field events
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            this.bindFieldEvents(field, formId);
        });
    }
    
    /**
     * Unbind form events
     * @param {HTMLFormElement} form - Form element
     */
    unbindFormEvents(form) {
        const formData = this.forms.get(form.id);
        if (!formData) return;
        
        // Remove submit handler
        if (formData.submitHandler) {
            form.removeEventListener('submit', formData.submitHandler);
        }
        
        // Remove field handlers
        formData.fields.forEach((fieldData, fieldName) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field && fieldData.handlers) {
                Object.entries(fieldData.handlers).forEach(([event, handler]) => {
                    field.removeEventListener(event, handler);
                });
            }
        });
    }
    
    /**
     * Initialize form fields
     * @param {HTMLFormElement} form - Form element
     * @param {string} formId - Form ID
     */
    initializeFormFields(form, formId) {
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            this.initializeField(field, formId);
        });
    }
    
    /**
     * Initialize field
     * @param {HTMLElement} field - Field element
     * @param {string} formId - Form ID
     */
    initializeField(field, formId) {
        const formData = this.forms.get(formId);
        if (!formData) return;
        
        const fieldName = field.name;
        if (!fieldName) return;
        
        const validationRules = this.parseValidationRules(field);
        
        formData.fields.set(fieldName, {
            element: field,
            rules: validationRules,
            isValid: false,
            lastValue: field.value,
            handlers: {}
        });
    }
    
    /**
     * Bind field events
     * @param {HTMLElement} field - Field element
     * @param {string} formId - Form ID
     */
    bindFieldEvents(field, formId) {
        const formData = this.forms.get(formId);
        if (!formData || !field.name) return;
        
        const fieldData = formData.fields.get(field.name);
        if (!fieldData) return;
        
        const { options } = formData;
        
        // Blur event
        if (options.validateOnBlur) {
            const blurHandler = () => {
                this.validateField(field);
            };
            field.addEventListener('blur', blurHandler);
            fieldData.handlers.blur = blurHandler;
        }
        
        // Input event
        if (options.validateOnInput || options.realTimeValidation) {
            const inputHandler = () => {
                this.debouncedValidateField(field, formId);
            };
            field.addEventListener('input', inputHandler);
            fieldData.handlers.input = inputHandler;
        }
        
        // Change event for selects and checkboxes
        if (field.type === 'select-one' || field.type === 'select-multiple' || 
            field.type === 'checkbox' || field.type === 'radio') {
            const changeHandler = () => {
                this.validateField(field);
            };
            field.addEventListener('change', changeHandler);
            fieldData.handlers.change = changeHandler;
        }
        
        // Focus event for accessibility
        const focusHandler = () => {
            this.clearFieldValidationState(field);
        };
        field.addEventListener('focus', focusHandler);
        fieldData.handlers.focus = focusHandler;
    }
    
    /**
     * Parse validation rules from field attributes
     * @param {HTMLElement} field - Field element
     * @returns {Array} Validation rules
     */
    parseValidationRules(field) {
        const rules = [];
        
        // HTML5 validation attributes
        if (field.required) {
            rules.push({ rule: 'required' });
        }
        
        if (field.type === 'email') {
            rules.push({ rule: 'email' });
        }
        
        if (field.type === 'url') {
            rules.push({ rule: 'url' });
        }
        
        if (field.type === 'number') {
            rules.push({ rule: 'number' });
        }
        
        if (field.minLength) {
            rules.push({ rule: 'minLength', params: [field.minLength] });
        }
        
        if (field.maxLength) {
            rules.push({ rule: 'maxLength', params: [field.maxLength] });
        }
        
        if (field.min !== '') {
            rules.push({ rule: 'min', params: [field.min] });
        }
        
        if (field.max !== '') {
            rules.push({ rule: 'max', params: [field.max] });
        }
        
        if (field.pattern) {
            rules.push({ rule: 'pattern', params: [field.pattern] });
        }
        
        // Custom validation attribute
        const validateAttr = field.getAttribute('data-validate');
        if (validateAttr) {
            const customRules = validateAttr.split(',').map(rule => {
                const [ruleName, ...params] = rule.split(':');
                return {
                    rule: ruleName.trim(),
                    params: params.length > 0 ? params.join(':').split(',').map(p => p.trim()) : []
                };
            });
            rules.push(...customRules);
        }
        
        return rules;
    }
    
    /**
     * Validate field with debouncing
     * @param {HTMLElement} field - Field element
     * @param {string} formId - Form ID
     */
    debouncedValidateField(field, formId) {
        const timerId = `${formId}-${field.name}`;
        
        // Clear existing timer
        if (this.validationTimers.has(timerId)) {
            clearTimeout(this.validationTimers.get(timerId));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            this.validateField(field);
            this.validationTimers.delete(timerId);
        }, this.options.debounceDelay);
        
        this.validationTimers.set(timerId, timer);
    }
    
    /**
     * Validate single field
     * @param {HTMLElement} field - Field element
     * @returns {boolean} Whether field is valid
     */
    async validateField(field) {
        if (!field || !field.name) return true;
        
        const form = field.closest('form');
        if (!form || !this.forms.has(form.id)) return true;
        
        const formData = this.forms.get(form.id);
        const fieldData = formData.fields.get(field.name);
        if (!fieldData) return true;
        
        const value = this.getFieldValue(field);
        const rules = fieldData.rules;
        
        // Clear previous validation state
        this.clearFieldValidationState(field);
        
        // Show loading state for async validation
        if (this.hasAsyncValidation(rules)) {
            this.setFieldLoadingState(field, true);
        }
        
        try {
            // Validate each rule
            for (const ruleConfig of rules) {
                const isValid = await this.validateRule(value, ruleConfig, field);
                if (!isValid) {
                    const message = this.getErrorMessage(ruleConfig, field);
                    this.setFieldInvalid(field, message);
                    fieldData.isValid = false;
                    return false;
                }
            }
            
            // All rules passed
            this.setFieldValid(field);
            fieldData.isValid = true;
            return true;
            
        } catch (error) {
            console.error('Field validation error:', error);
            this.setFieldInvalid(field, '验证过程中发生错误');
            fieldData.isValid = false;
            return false;
            
        } finally {
            this.setFieldLoadingState(field, false);
        }
    }
    
    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @returns {boolean} Whether form is valid
     */
    async validateForm(form) {
        if (!form || !this.forms.has(form.id)) return false;
        
        const formData = this.forms.get(form.id);
        const fields = Array.from(formData.fields.keys());
        
        // Validate all fields
        const validationPromises = fields.map(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            return field ? this.validateField(field) : Promise.resolve(true);
        });
        
        const results = await Promise.all(validationPromises);
        const isValid = results.every(result => result === true);
        
        formData.isValid = isValid;
        
        // Update form validation state
        this.setFormValidationState(form, isValid);
        
        return isValid;
    }
    
    /**
     * Validate single rule
     * @param {*} value - Field value
     * @param {Object} ruleConfig - Rule configuration
     * @param {HTMLElement} field - Field element
     * @returns {Promise<boolean>} Whether rule is valid
     */
    async validateRule(value, ruleConfig, field) {
        const { rule, params = [] } = ruleConfig;
        
        if (!this.rules[rule]) {
            console.warn(`Unknown validation rule: ${rule}`);
            return true;
        }
        
        const validator = this.rules[rule];
        
        try {
            const result = await validator(value, field, ...params);
            return result === true;
        } catch (error) {
            console.error(`Validation rule '${rule}' error:`, error);
            return false;
        }
    }
    
    /**
     * Get field value
     * @param {HTMLElement} field - Field element
     * @returns {*} Field value
     */
    getFieldValue(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'radio') {
            const form = field.closest('form');
            const radioGroup = form.querySelectorAll(`input[name="${field.name}"]`);
            const checked = Array.from(radioGroup).find(radio => radio.checked);
            return checked ? checked.value : '';
        } else if (field.type === 'select-multiple') {
            return Array.from(field.selectedOptions).map(option => option.value);
        } else {
            return field.value;
        }
    }
    
    /**
     * Check if rules contain async validation
     * @param {Array} rules - Validation rules
     * @returns {boolean} Whether has async validation
     */
    hasAsyncValidation(rules) {
        return rules.some(ruleConfig => {
            const validator = this.rules[ruleConfig.rule];
            return validator && validator.constructor.name === 'AsyncFunction';
        });
    }
    
    /**
     * Get error message for rule
     * @param {Object} ruleConfig - Rule configuration
     * @param {HTMLElement} field - Field element
     * @returns {string} Error message
     */
    getErrorMessage(ruleConfig, field) {
        const { rule, params = [] } = ruleConfig;
        
        // Check for custom message on field
        const customMessage = field.getAttribute(`data-${rule}-message`);
        if (customMessage) {
            return this.formatMessage(customMessage, params);
        }
        
        // Use default message
        const defaultMessage = this.messages[rule] || '验证失败';
        return this.formatMessage(defaultMessage, params);
    }
    
    /**
     * Format message with parameters
     * @param {string} message - Message template
     * @param {Array} params - Parameters
     * @returns {string} Formatted message
     */
    formatMessage(message, params) {
        return message.replace(/\{(\d+)\}/g, (match, index) => {
            return params[index] !== undefined ? params[index] : match;
        });
    }
    
    /**
     * Set field validation state
     */
    setFieldValid(field) {
        field.classList.remove('is-invalid', 'is-loading');
        field.classList.add('is-valid');
        
        this.setFieldFeedback(field, '', 'valid');
        
        if (this.options.showSuccessStates) {
            this.showFieldSuccess(field);
        }
    }
    
    setFieldInvalid(field, message) {
        field.classList.remove('is-valid', 'is-loading');
        field.classList.add('is-invalid');
        
        this.setFieldFeedback(field, message, 'invalid');
        this.showFieldError(field, message);
    }
    
    setFieldLoadingState(field, loading) {
        if (loading) {
            field.classList.add('is-loading');
            this.setFieldFeedback(field, '验证中...', 'loading');
        } else {
            field.classList.remove('is-loading');
        }
    }
    
    clearFieldValidationState(field) {
        field.classList.remove('is-valid', 'is-invalid', 'is-loading');
        this.setFieldFeedback(field, '', '');
    }
    
    /**
     * Set field feedback message
     * @param {HTMLElement} field - Field element
     * @param {string} message - Feedback message
     * @param {string} type - Feedback type
     */
    setFieldFeedback(field, message, type) {
        const feedbackId = `${field.name}-error`;
        let feedback = document.getElementById(feedbackId);
        
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = feedbackId;
            feedback.className = 'form-feedback';
            
            // Insert after field or field group
            const fieldGroup = field.closest('.form-group') || field.closest('.input-group');
            if (fieldGroup) {
                fieldGroup.appendChild(feedback);
            } else {
                field.parentNode.insertBefore(feedback, field.nextSibling);
            }
        }
        
        feedback.textContent = message;
        feedback.className = `form-feedback ${type ? `form-feedback--${type}` : ''}`;
        feedback.style.display = message ? 'block' : 'none';
        
        // Update ARIA attributes
        if (message && type === 'invalid') {
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-describedby', feedbackId);
        } else {
            field.removeAttribute('aria-invalid');
            field.removeAttribute('aria-describedby');
        }
    }
    
    /**
     * Show field error with animation
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        // Trigger error animation
        field.style.animation = 'none';
        field.offsetHeight; // Trigger reflow
        field.style.animation = 'form-error-shake 0.5s ease-out';
        
        setTimeout(() => {
            field.style.animation = '';
        }, 500);
    }
    
    /**
     * Show field success with animation
     * @param {HTMLElement} field - Field element
     */
    showFieldSuccess(field) {
        // Trigger success animation
        field.style.animation = 'none';
        field.offsetHeight; // Trigger reflow
        field.style.animation = 'form-success-bounce 0.6s ease-out';
        
        setTimeout(() => {
            field.style.animation = '';
        }, 600);
    }
    
    /**
     * Set form validation state
     * @param {HTMLFormElement} form - Form element
     * @param {boolean} isValid - Whether form is valid
     */
    setFormValidationState(form, isValid) {
        if (isValid) {
            form.classList.remove('form-invalid');
            form.classList.add('form-valid');
        } else {
            form.classList.remove('form-valid');
            form.classList.add('form-invalid');
        }
    }
    
    /**
     * Clear validation timers
     * @param {string} formId - Form ID
     */
    clearValidationTimers(formId) {
        const timersToDelete = [];
        
        this.validationTimers.forEach((timer, timerId) => {
            if (timerId.startsWith(formId)) {
                clearTimeout(timer);
                timersToDelete.push(timerId);
            }
        });
        
        timersToDelete.forEach(timerId => {
            this.validationTimers.delete(timerId);
        });
    }
    
    // ==========================================================================
    // Built-in Validation Rules
    // ==========================================================================
    
    validateRequired(value, field) {
        if (field.type === 'checkbox') {
            return value === true;
        } else if (Array.isArray(value)) {
            return value.length > 0;
        } else {
            return value !== null && value !== undefined && String(value).trim() !== '';
        }
    }
    
    validateEmail(value, field) {
        if (!value) return true; // Allow empty unless required
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }
    
    validateUrl(value, field) {
        if (!value) return true;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }
    
    validateNumber(value, field) {
        if (!value) return true;
        return !isNaN(value) && !isNaN(parseFloat(value));
    }
    
    validateInteger(value, field) {
        if (!value) return true;
        return Number.isInteger(Number(value));
    }
    
    validateDecimal(value, field) {
        if (!value) return true;
        return /^\d+(\.\d+)?$/.test(value);
    }
    
    validateMinLength(value, field, minLength) {
        if (!value) return true;
        return String(value).length >= parseInt(minLength);
    }
    
    validateMaxLength(value, field, maxLength) {
        if (!value) return true;
        return String(value).length <= parseInt(maxLength);
    }
    
    validateMin(value, field, min) {
        if (!value) return true;
        return parseFloat(value) >= parseFloat(min);
    }
    
    validateMax(value, field, max) {
        if (!value) return true;
        return parseFloat(value) <= parseFloat(max);
    }
    
    validatePattern(value, field, pattern) {
        if (!value) return true;
        const regex = new RegExp(pattern);
        return regex.test(value);
    }
    
    validatePhone(value, field) {
        if (!value) return true;
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(value);
    }
    
    validateIdCard(value, field) {
        if (!value) return true;
        const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
        return idCardRegex.test(value);
    }
    
    validateBankCard(value, field) {
        if (!value) return true;
        const bankCardRegex = /^\d{16,19}$/;
        return bankCardRegex.test(value.replace(/\s/g, ''));
    }
    
    validateCurrency(value, field) {
        if (!value) return true;
        const currencyRegex = /^\d+(\.\d{1,2})?$/;
        return currencyRegex.test(value) && parseFloat(value) >= 0;
    }
    
    validateAccountNumber(value, field) {
        if (!value) return true;
        
        // Get account type from form
        const form = field.closest('form');
        const accountTypeField = form?.querySelector('[name="accountType"]');
        const accountType = accountTypeField?.value;
        
        if (!accountType) return true;
        
        switch (accountType) {
            case 'alipay':
                // Email or phone number
                return /^[\w.-]+@[\w.-]+\.\w+$/.test(value) || /^1[3-9]\d{9}$/.test(value);
            case 'wechat':
                // WeChat ID format
                return /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(value);
            case 'bank':
                // Bank card number
                return /^\d{16,19}$/.test(value.replace(/\s/g, ''));
            default:
                return value.length >= 3;
        }
    }
    
    /**
     * Add custom validation rule
     * @param {string} name - Rule name
     * @param {Function} validator - Validator function
     * @param {string} message - Default error message
     */
    addRule(name, validator, message) {
        this.rules[name] = validator;
        if (message) {
            this.messages[name] = message;
        }
    }
    
    /**
     * Remove validation rule
     * @param {string} name - Rule name
     */
    removeRule(name) {
        delete this.rules[name];
        delete this.messages[name];
    }
    
    /**
     * Get form validation status
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Validation status
     */
    getFormStatus(form) {
        if (!form || !this.forms.has(form.id)) {
            return { isValid: false, fields: {} };
        }
        
        const formData = this.forms.get(form.id);
        const fieldStatus = {};
        
        formData.fields.forEach((fieldData, fieldName) => {
            fieldStatus[fieldName] = {
                isValid: fieldData.isValid,
                element: fieldData.element
            };
        });
        
        return {
            isValid: formData.isValid,
            fields: fieldStatus
        };
    }
    
    /**
     * Reset form validation
     * @param {HTMLFormElement} form - Form element
     */
    resetForm(form) {
        if (!form || !this.forms.has(form.id)) return;
        
        const formData = this.forms.get(form.id);
        
        // Reset form state
        formData.isValid = false;
        form.classList.remove('form-valid', 'form-invalid');
        
        // Reset field states
        formData.fields.forEach((fieldData, fieldName) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                this.clearFieldValidationState(field);
                fieldData.isValid = false;
                fieldData.lastValue = field.value;
            }
        });
    }
    
    /**
     * Destroy validator
     */
    destroy() {
        // Clear all timers
        this.validationTimers.forEach(timer => clearTimeout(timer));
        this.validationTimers.clear();
        
        // Unbind all forms
        this.forms.forEach((formData, formId) => {
            this.unbindForm(formData.element);
        });
        
        this.forms.clear();
        this.asyncValidators.clear();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidator;
}

// Global registration
if (typeof window !== 'undefined') {
    window.FormValidator = FormValidator;
}