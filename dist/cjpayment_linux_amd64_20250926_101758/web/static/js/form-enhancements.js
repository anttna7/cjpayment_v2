/**
 * CJPayment Form Enhancements
 * Enhanced form handling utilities for better user experience
 */

window.CJFormEnhancements = (function() {
    'use strict';

    // ==========================================================================
    // Auto-complete and Search Enhancement
    // ==========================================================================

    class AutoComplete {
        constructor(input, options = {}) {
            this.input = typeof input === 'string' ? CJUtils.$(input) : input;
            this.options = {
                minLength: 1,
                maxResults: 10,
                delay: 300,
                source: [],
                onSelect: null,
                onSearch: null,
                template: null,
                ...options
            };

            this.isOpen = false;
            this.selectedIndex = -1;
            this.results = [];
            this.dropdown = null;

            this.init();
        }

        init() {
            this.createDropdown();
            this.bindEvents();
        }

        createDropdown() {
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'autocomplete-dropdown';
            this.dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-top: none;
                border-radius: 0 0 4px 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
            `;

            // Position relative to input
            const inputParent = this.input.parentNode;
            if (getComputedStyle(inputParent).position === 'static') {
                inputParent.style.position = 'relative';
            }
            inputParent.appendChild(this.dropdown);
        }

        bindEvents() {
            // Search on input
            const debouncedSearch = CJUtils.debounce((value) => {
                this.search(value);
            }, this.options.delay);

            CJUtils.on(this.input, 'input', (e) => {
                debouncedSearch(e.target.value);
            });

            // Keyboard navigation
            CJUtils.on(this.input, 'keydown', (e) => {
                this.handleKeydown(e);
            });

            // Close on blur
            CJUtils.on(this.input, 'blur', () => {
                setTimeout(() => this.close(), 150);
            });

            // Close on outside click
            CJUtils.on(document, 'click', (e) => {
                if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                    this.close();
                }
            });
        }

        async search(query) {
            if (query.length < this.options.minLength) {
                this.close();
                return;
            }

            let results = [];

            if (typeof this.options.source === 'function') {
                results = await this.options.source(query);
            } else if (Array.isArray(this.options.source)) {
                results = this.options.source.filter(item => {
                    const text = typeof item === 'string' ? item : item.text || item.name || '';
                    return text.toLowerCase().includes(query.toLowerCase());
                });
            }

            if (this.options.onSearch) {
                results = await this.options.onSearch(query, results);
            }

            this.results = results.slice(0, this.options.maxResults);
            this.render();
        }

        render() {
            if (this.results.length === 0) {
                this.close();
                return;
            }

            this.dropdown.innerHTML = '';
            this.selectedIndex = -1;

            this.results.forEach((item, index) => {
                const element = document.createElement('div');
                element.className = 'autocomplete-item';
                element.style.cssText = `
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                `;

                if (this.options.template) {
                    element.innerHTML = this.options.template(item);
                } else {
                    element.textContent = typeof item === 'string' ? item : item.text || item.name || '';
                }

                CJUtils.on(element, 'click', () => {
                    this.select(index);
                });

                CJUtils.on(element, 'mouseenter', () => {
                    this.highlight(index);
                });

                this.dropdown.appendChild(element);
            });

            this.open();
        }

        handleKeydown(e) {
            if (!this.isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.highlight(Math.min(this.selectedIndex + 1, this.results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.highlight(Math.max(this.selectedIndex - 1, -1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedIndex >= 0) {
                        this.select(this.selectedIndex);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
            }
        }

        highlight(index) {
            // Remove previous highlight
            const items = this.dropdown.querySelectorAll('.autocomplete-item');
            items.forEach(item => item.classList.remove('highlighted'));

            this.selectedIndex = index;

            if (index >= 0 && index < items.length) {
                items[index].classList.add('highlighted');
                items[index].style.backgroundColor = '#f8f9fa';
            }
        }

        select(index) {
            if (index < 0 || index >= this.results.length) return;

            const item = this.results[index];
            const value = typeof item === 'string' ? item : item.value || item.text || item.name || '';
            
            this.input.value = value;
            this.close();

            if (this.options.onSelect) {
                this.options.onSelect(item, index);
            }

            // Trigger change event
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        open() {
            this.dropdown.style.display = 'block';
            this.isOpen = true;
        }

        close() {
            this.dropdown.style.display = 'none';
            this.isOpen = false;
            this.selectedIndex = -1;
        }

        destroy() {
            if (this.dropdown && this.dropdown.parentNode) {
                this.dropdown.parentNode.removeChild(this.dropdown);
            }
        }
    }

    // ==========================================================================
    // Smart Form Validation
    // ==========================================================================

    class SmartValidator {
        constructor(form, options = {}) {
            this.form = typeof form === 'string' ? CJUtils.$(form) : form;
            this.options = {
                validateOnSubmit: true,
                validateOnBlur: true,
                validateOnInput: true,
                showSuccessIcon: true,
                showErrorIcon: true,
                realTimeValidation: true,
                apiValidation: false,
                apiEndpoint: null,
                ...options
            };

            this.validators = new Map();
            this.validationCache = new Map();
            this.debounceTimers = new Map();
            this.init();
        }

        init() {
            this.bindEvents();
            this.addStyles();
            this.setupBusinessRules();
        }

        bindEvents() {
            if (this.options.validateOnSubmit) {
                CJUtils.on(this.form, 'submit', (e) => {
                    if (!this.validateAll()) {
                        e.preventDefault();
                        this.focusFirstError();
                    }
                });
            }
        }

        setupBusinessRules() {
            // Add common business validation rules
            this.businessRules = {
                // Chinese name validation
                chineseName: {
                    test: (value) => /^[\u4e00-\u9fa5a-zA-Z\s]{2,50}$/.test(value),
                    message: '姓名格式无效，应为2-50个中文或英文字符'
                },
                
                // Phone number validation
                phoneNumber: {
                    test: (value) => /^1[3-9]\d{9}$/.test(value),
                    message: '请输入有效的手机号码'
                },
                
                // Email validation
                email: {
                    test: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
                    message: '请输入有效的邮箱地址'
                },
                
                // Amount validation
                amount: {
                    test: (value) => {
                        const num = parseFloat(value);
                        return !isNaN(num) && num > 0 && num <= 1000000 && /^\d+(\.\d{1,2})?$/.test(value);
                    },
                    message: '金额格式无效，应为正数且最多2位小数，最大100万'
                },
                
                // Bank account validation
                bankAccount: {
                    test: (value) => /^\d{10,30}$/.test(value),
                    message: '银行账号应为10-30位数字'
                },
                
                // Alipay account validation
                alipayAccount: {
                    test: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^1[3-9]\d{9}$/.test(value),
                    message: '支付宝账号应为邮箱或手机号格式'
                },
                
                // WeChat account validation
                wechatAccount: {
                    test: (value) => /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(value),
                    message: '微信账号应为6-20位字母数字组合，以字母开头'
                },
                
                // Merchant code validation
                merchantCode: {
                    test: (value) => /^[a-zA-Z0-9_]{3,20}$/.test(value),
                    message: '商户编码应为3-20位字母数字下划线组合'
                },
                
                // Order number validation
                orderNumber: {
                    test: (value) => /^[A-Z0-9]{10,32}$/.test(value),
                    message: '订单号应为10-32位大写字母和数字组合'
                }
            };
        }

        addField(selector, rules, options = {}) {
            const field = typeof selector === 'string' ? this.form.querySelector(selector) : selector;
            if (!field) return;

            const config = {
                showSuccess: this.options.showSuccessIcon,
                showError: this.options.showErrorIcon,
                realTime: this.options.realTimeValidation,
                apiValidation: this.options.apiValidation,
                businessRule: null,
                ...options
            };

            const validator = {
                field,
                rules,
                config,
                isValid: true,
                message: '',
                lastValue: ''
            };

            this.validators.set(field, validator);

            // Create message element
            this.createMessageElement(field);

            // Bind events
            if (this.options.validateOnBlur) {
                CJUtils.on(field, 'blur', () => this.validateField(field));
            }

            if (this.options.validateOnInput && config.realTime) {
                CJUtils.on(field, 'input', () => {
                    this.debounceValidation(field, 300);
                });
            }

            // Add business rule if specified
            if (config.businessRule && this.businessRules[config.businessRule]) {
                validator.rules.push(this.businessRules[config.businessRule]);
            }

            return validator;
        }

        debounceValidation(field, delay) {
            const fieldId = field.id || field.name || Math.random().toString();
            
            // Clear existing timer
            if (this.debounceTimers.has(fieldId)) {
                clearTimeout(this.debounceTimers.get(fieldId));
            }

            // Set new timer
            const timer = setTimeout(() => {
                this.validateField(field);
                this.debounceTimers.delete(fieldId);
            }, delay);

            this.debounceTimers.set(fieldId, timer);
        }

        createMessageElement(field) {
            let messageEl = field.parentNode.querySelector('.validation-message');
            if (!messageEl) {
                messageEl = document.createElement('div');
                messageEl.className = 'validation-message';
                field.parentNode.appendChild(messageEl);
            }
            return messageEl;
        }

        async validateField(field) {
            const validator = this.validators.get(field);
            if (!validator) return true;

            const value = field.value.trim();
            const errors = [];

            // Skip validation if value hasn't changed
            if (value === validator.lastValue && validator.isValid !== undefined) {
                return validator.isValid;
            }

            validator.lastValue = value;

            // Show loading state for real-time validation
            if (validator.config.realTime && value) {
                this.showLoadingState(field);
            }

            // Run client-side validation rules
            for (const rule of validator.rules) {
                let result;
                if (typeof rule === 'function') {
                    result = rule(value, field);
                } else if (rule.test) {
                    result = rule.test(value) ? true : rule.message;
                }

                if (result !== true) {
                    errors.push(result);
                    break; // Stop at first error
                }
            }

            // Run server-side validation if enabled and client-side passed
            if (errors.length === 0 && validator.config.apiValidation && this.options.apiEndpoint && value) {
                try {
                    const apiResult = await this.validateOnServer(field, value);
                    if (!apiResult.valid) {
                        errors.push(...apiResult.errors.map(e => e.message));
                    }
                } catch (error) {
                    console.warn('Server validation failed:', error);
                    // Don't show server errors in real-time validation
                }
            }

            // Update validator state
            validator.isValid = errors.length === 0;
            validator.message = errors[0] || '';

            // Update UI
            this.updateFieldUI(field, validator);

            return validator.isValid;
        }

        async validateOnServer(field, value) {
            const fieldName = field.name || field.id;
            const cacheKey = `${fieldName}:${value}`;

            // Check cache first
            if (this.validationCache.has(cacheKey)) {
                return this.validationCache.get(cacheKey);
            }

            const response = await fetch(this.options.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    field: fieldName,
                    value: value,
                    context: this.getFormData()
                })
            });

            const result = await response.json();
            
            // Cache result for 5 minutes
            this.validationCache.set(cacheKey, result);
            setTimeout(() => this.validationCache.delete(cacheKey), 5 * 60 * 1000);

            return result;
        }

        getFormData() {
            const formData = new FormData(this.form);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            return data;
        }

        showLoadingState(field) {
            const messageEl = field.parentNode.querySelector('.validation-message');
            if (messageEl) {
                messageEl.innerHTML = '<i class="loading-icon">⏳</i> 验证中...';
                messageEl.className = 'validation-message loading';
            }
        }

        updateFieldUI(field, validator) {
            const messageEl = field.parentNode.querySelector('.validation-message');
            
            // Reset classes
            field.classList.remove('valid', 'invalid');
            messageEl.textContent = '';
            messageEl.className = 'validation-message';

            if (!validator.isValid) {
                field.classList.add('invalid');
                messageEl.textContent = validator.message;
                messageEl.classList.add('error');
            } else if (field.value.trim()) {
                field.classList.add('valid');
                messageEl.classList.add('success');
            }
        }

        validateAll() {
            let isValid = true;
            
            for (const [field, validator] of this.validators) {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            }

            return isValid;
        }

        focusFirstError() {
            for (const [field, validator] of this.validators) {
                if (!validator.isValid) {
                    field.focus();
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    break;
                }
            }
        }

        addStyles() {
            if (CJUtils.$('#smart-validator-styles')) return;

            const style = document.createElement('style');
            style.id = 'smart-validator-styles';
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
                .autocomplete-item.highlighted {
                    background-color: #f8f9fa !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==========================================================================
    // Form Step Manager
    // ==========================================================================

    class StepManager {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? CJUtils.$(container) : container;
            this.options = {
                showProgress: true,
                allowSkip: false,
                validateOnNext: true,
                ...options
            };

            this.currentStep = 1;
            this.steps = [];
            this.validators = new Map();

            this.init();
        }

        init() {
            this.findSteps();
            this.createProgressIndicator();
            this.bindEvents();
            this.showStep(1);
        }

        findSteps() {
            const stepElements = this.container.querySelectorAll('[data-step]');
            stepElements.forEach(el => {
                const stepNumber = parseInt(el.dataset.step);
                this.steps[stepNumber] = {
                    element: el,
                    number: stepNumber,
                    title: el.dataset.title || `Step ${stepNumber}`,
                    isValid: true
                };
            });
        }

        createProgressIndicator() {
            if (!this.options.showProgress) return;

            let progressContainer = this.container.querySelector('.step-progress');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'step-progress';
                this.container.insertBefore(progressContainer, this.container.firstChild);
            }

            progressContainer.innerHTML = this.steps.map((step, index) => {
                if (!step) return '';
                return `
                    <div class="step-indicator" data-step="${step.number}">
                        <div class="step-number">${step.number}</div>
                        <div class="step-title">${step.title}</div>
                    </div>
                `;
            }).join('');

            this.addProgressStyles();
        }

        addProgressStyles() {
            if (CJUtils.$('#step-manager-styles')) return;

            const style = document.createElement('style');
            style.id = 'step-manager-styles';
            style.textContent = `
                .step-progress {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    padding: 20px 0;
                }
                .step-indicator {
                    flex: 1;
                    text-align: center;
                    position: relative;
                }
                .step-indicator:not(:last-child)::after {
                    content: '';
                    position: absolute;
                    top: 15px;
                    right: -50%;
                    width: 100%;
                    height: 2px;
                    background: #e9ecef;
                    z-index: 1;
                }
                .step-indicator.completed::after {
                    background: #28a745;
                }
                .step-number {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: #e9ecef;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 8px;
                    font-weight: bold;
                    position: relative;
                    z-index: 2;
                    transition: all 0.3s ease;
                }
                .step-indicator.active .step-number {
                    background: #007bff;
                    color: white;
                }
                .step-indicator.completed .step-number {
                    background: #28a745;
                    color: white;
                }
                .step-title {
                    font-size: 12px;
                    color: #6c757d;
                    font-weight: 500;
                }
                .step-indicator.active .step-title {
                    color: #007bff;
                    font-weight: 600;
                }
                .step-indicator.completed .step-title {
                    color: #28a745;
                }
            `;
            document.head.appendChild(style);
        }

        bindEvents() {
            // Handle step navigation buttons
            CJUtils.on(this.container, 'click', (e) => {
                if (e.target.matches('[data-step-action="next"]')) {
                    this.nextStep();
                } else if (e.target.matches('[data-step-action="prev"]')) {
                    this.prevStep();
                } else if (e.target.matches('[data-step-action="goto"]')) {
                    const step = parseInt(e.target.dataset.step);
                    this.goToStep(step);
                }
            });
        }

        showStep(stepNumber) {
            // Hide all steps
            this.steps.forEach(step => {
                if (step) {
                    step.element.style.display = 'none';
                }
            });

            // Show current step
            if (this.steps[stepNumber]) {
                this.steps[stepNumber].element.style.display = 'block';
                this.currentStep = stepNumber;
                this.updateProgress();
            }
        }

        updateProgress() {
            const indicators = this.container.querySelectorAll('.step-indicator');
            indicators.forEach((indicator, index) => {
                const stepNum = index + 1;
                indicator.classList.remove('active', 'completed');
                
                if (stepNum < this.currentStep) {
                    indicator.classList.add('completed');
                } else if (stepNum === this.currentStep) {
                    indicator.classList.add('active');
                }
            });
        }

        nextStep() {
            if (this.options.validateOnNext && !this.validateCurrentStep()) {
                return false;
            }

            if (this.currentStep < this.steps.length) {
                this.showStep(this.currentStep + 1);
                return true;
            }
            return false;
        }

        prevStep() {
            if (this.currentStep > 1) {
                this.showStep(this.currentStep - 1);
                return true;
            }
            return false;
        }

        goToStep(stepNumber) {
            if (stepNumber < 1 || stepNumber > this.steps.length) return false;
            
            if (!this.options.allowSkip && stepNumber > this.currentStep) {
                // Validate all steps up to target
                for (let i = this.currentStep; i < stepNumber; i++) {
                    if (!this.validateStep(i)) {
                        return false;
                    }
                }
            }

            this.showStep(stepNumber);
            return true;
        }

        validateCurrentStep() {
            return this.validateStep(this.currentStep);
        }

        validateStep(stepNumber) {
            const validator = this.validators.get(stepNumber);
            if (validator) {
                return validator.validateAll();
            }
            return true;
        }

        addStepValidator(stepNumber, validator) {
            this.validators.set(stepNumber, validator);
        }
    }

    // ==========================================================================
    // Enhanced Form Input Components
    // ==========================================================================

    class FormInputEnhancer {
        constructor(input, options = {}) {
            this.input = typeof input === 'string' ? CJUtils.$(input) : input;
            this.options = {
                enableFloatingLabel: true,
                enableRealTimeValidation: true,
                enableAutoResize: false,
                enableCharacterCount: false,
                maxLength: null,
                enableMask: false,
                mask: null,
                enableAutoComplete: false,
                autoCompleteSource: [],
                ...options
            };

            this.isEnhanced = false;
            this.init();
        }

        init() {
            if (this.isEnhanced) return;
            
            this.setupFloatingLabel();
            this.setupAutoResize();
            this.setupCharacterCount();
            this.setupInputMask();
            this.setupInteractionStates();
            this.bindEvents();
            
            this.isEnhanced = true;
        }

        setupFloatingLabel() {
            if (!this.options.enableFloatingLabel) return;

            const formGroup = this.input.closest('.form-group');
            if (!formGroup) return;

            const label = formGroup.querySelector('.form-label');
            if (!label) return;

            // Add floating label classes
            formGroup.classList.add('form-group--floating');
            
            // Move label after input for CSS positioning
            this.input.parentNode.insertBefore(label, this.input.nextSibling);
            
            // Set placeholder for floating label to work
            if (!this.input.placeholder) {
                this.input.placeholder = ' ';
            }
        }

        setupAutoResize() {
            if (!this.options.enableAutoResize || this.input.tagName !== 'TEXTAREA') return;

            this.input.classList.add('form-textarea--auto-resize');
            this.autoResize();
        }

        autoResize() {
            this.input.style.height = 'auto';
            this.input.style.height = this.input.scrollHeight + 'px';
        }

        setupCharacterCount() {
            if (!this.options.enableCharacterCount) return;

            const maxLength = this.options.maxLength || this.input.maxLength;
            if (!maxLength) return;

            const formGroup = this.input.closest('.form-group');
            if (!formGroup) return;

            // Create character count element
            this.characterCountEl = document.createElement('div');
            this.characterCountEl.className = 'form-character-count';
            this.characterCountEl.style.cssText = `
                font-size: var(--font-size-xs);
                color: var(--form-text-help);
                text-align: right;
                margin-top: var(--space-1);
                transition: color var(--duration-200) var(--ease-out);
            `;

            formGroup.appendChild(this.characterCountEl);
            this.updateCharacterCount();
        }

        updateCharacterCount() {
            if (!this.characterCountEl) return;

            const current = this.input.value.length;
            const max = this.options.maxLength || this.input.maxLength;
            const remaining = max - current;

            this.characterCountEl.textContent = `${current}/${max}`;

            // Change color based on remaining characters
            if (remaining < 10) {
                this.characterCountEl.style.color = 'var(--form-text-invalid)';
            } else if (remaining < 50) {
                this.characterCountEl.style.color = 'var(--warning-500)';
            } else {
                this.characterCountEl.style.color = 'var(--form-text-help)';
            }
        }

        setupInputMask() {
            if (!this.options.enableMask || !this.options.mask) return;

            this.mask = this.options.mask;
            this.applyMask();
        }

        applyMask() {
            const value = this.input.value.replace(/\D/g, '');
            let maskedValue = '';
            let valueIndex = 0;

            for (let i = 0; i < this.mask.length && valueIndex < value.length; i++) {
                if (this.mask[i] === '9') {
                    maskedValue += value[valueIndex];
                    valueIndex++;
                } else {
                    maskedValue += this.mask[i];
                }
            }

            this.input.value = maskedValue;
        }

        setupInteractionStates() {
            // Add CSS classes for enhanced styling
            this.input.classList.add('form-control--enhanced');
        }

        bindEvents() {
            // Auto-resize for textareas
            if (this.options.enableAutoResize && this.input.tagName === 'TEXTAREA') {
                CJUtils.on(this.input, 'input', () => this.autoResize());
            }

            // Character count updates
            if (this.options.enableCharacterCount) {
                CJUtils.on(this.input, 'input', () => this.updateCharacterCount());
            }

            // Input mask
            if (this.options.enableMask) {
                CJUtils.on(this.input, 'input', () => this.applyMask());
            }

            // Floating label value detection
            if (this.options.enableFloatingLabel) {
                CJUtils.on(this.input, 'input', () => {
                    if (this.input.value) {
                        this.input.classList.add('has-value');
                    } else {
                        this.input.classList.remove('has-value');
                    }
                });

                // Initial check
                if (this.input.value) {
                    this.input.classList.add('has-value');
                }
            }

            // Enhanced focus states
            CJUtils.on(this.input, 'focus', () => {
                this.input.classList.add('form-control--focused');
            });

            CJUtils.on(this.input, 'blur', () => {
                this.input.classList.remove('form-control--focused');
            });

            // Typing indicator
            let typingTimer;
            CJUtils.on(this.input, 'input', () => {
                this.input.classList.add('form-control--typing');
                
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    this.input.classList.remove('form-control--typing');
                }, 1000);
            });
        }

        destroy() {
            if (this.characterCountEl) {
                this.characterCountEl.remove();
            }
            
            this.input.classList.remove('form-control--enhanced', 'has-value', 'form-control--focused', 'form-control--typing');
            
            const formGroup = this.input.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('form-group--floating');
            }
        }
    }

    // ==========================================================================
    // Form Animation Controller
    // ==========================================================================

    class FormAnimationController {
        constructor() {
            this.observers = new Map();
            this.init();
        }

        init() {
            this.setupIntersectionObserver();
            this.setupMutationObserver();
        }

        setupIntersectionObserver() {
            if (!window.IntersectionObserver) return;

            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateFormEntry(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            // Observe all forms
            document.querySelectorAll('.form, form').forEach(form => {
                this.intersectionObserver.observe(form);
            });
        }

        setupMutationObserver() {
            if (!window.MutationObserver) return;

            this.mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const forms = node.matches?.('.form, form') ? [node] : 
                                         node.querySelectorAll?.('.form, form') || [];
                            
                            forms.forEach(form => {
                                this.intersectionObserver?.observe(form);
                            });
                        }
                    });
                });
            });

            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        animateFormEntry(form) {
            const formGroups = form.querySelectorAll('.form-group');
            
            formGroups.forEach((group, index) => {
                group.style.opacity = '0';
                group.style.transform = 'translateY(20px)';
                group.style.transition = 'all 0.4s ease-out';
                
                setTimeout(() => {
                    group.style.opacity = '1';
                    group.style.transform = 'translateY(0)';
                }, index * 100);
            });

            // Stop observing this form
            this.intersectionObserver?.unobserve(form);
        }

        animateValidationSuccess(input) {
            input.style.animation = 'form-success-bounce 0.6s ease-out';
            setTimeout(() => {
                input.style.animation = '';
            }, 600);
        }

        animateValidationError(input) {
            input.style.animation = 'form-error-shake 0.5s ease-out';
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        }

        destroy() {
            this.intersectionObserver?.disconnect();
            this.mutationObserver?.disconnect();
        }
    }

    // ==========================================================================
    // Form Accessibility Enhancer
    // ==========================================================================

    class FormAccessibilityEnhancer {
        constructor(form) {
            this.form = typeof form === 'string' ? CJUtils.$(form) : form;
            this.init();
        }

        init() {
            this.enhanceLabels();
            this.enhanceErrorMessages();
            this.enhanceFieldsets();
            this.enhanceKeyboardNavigation();
            this.enhanceScreenReaderSupport();
        }

        enhanceLabels() {
            const inputs = this.form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                if (!input.id) {
                    input.id = 'field_' + Math.random().toString(36).substr(2, 9);
                }

                const label = this.form.querySelector(`label[for="${input.id}"]`) ||
                             input.closest('.form-group')?.querySelector('.form-label');
                
                if (label && !label.getAttribute('for')) {
                    label.setAttribute('for', input.id);
                }

                // Add required indicator for screen readers
                if (input.required && label) {
                    const requiredText = document.createElement('span');
                    requiredText.className = 'sr-only';
                    requiredText.textContent = ' (必填)';
                    label.appendChild(requiredText);
                }
            });
        }

        enhanceErrorMessages() {
            const inputs = this.form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                const formGroup = input.closest('.form-group');
                if (!formGroup) return;

                let errorContainer = formGroup.querySelector('.form-feedback--invalid');
                if (!errorContainer) {
                    errorContainer = document.createElement('div');
                    errorContainer.className = 'form-feedback form-feedback--invalid';
                    errorContainer.style.display = 'none';
                    formGroup.appendChild(errorContainer);
                }

                const errorId = 'error_' + input.id;
                errorContainer.id = errorId;
                
                // Link input to error message
                const describedBy = input.getAttribute('aria-describedby') || '';
                const describedByIds = describedBy.split(' ').filter(id => id);
                if (!describedByIds.includes(errorId)) {
                    describedByIds.push(errorId);
                    input.setAttribute('aria-describedby', describedByIds.join(' '));
                }
            });
        }

        enhanceFieldsets() {
            const fieldsets = this.form.querySelectorAll('fieldset');
            
            fieldsets.forEach(fieldset => {
                const legend = fieldset.querySelector('legend');
                if (!legend) {
                    const title = fieldset.getAttribute('data-title') || 'Form Section';
                    const newLegend = document.createElement('legend');
                    newLegend.textContent = title;
                    newLegend.className = 'sr-only';
                    fieldset.insertBefore(newLegend, fieldset.firstChild);
                }
            });
        }

        enhanceKeyboardNavigation() {
            // Add skip links for long forms
            if (this.form.querySelectorAll('.form-group').length > 5) {
                const skipLink = document.createElement('a');
                skipLink.href = '#form-end';
                skipLink.className = 'skip-link';
                skipLink.textContent = '跳过表单';
                skipLink.style.cssText = `
                    position: absolute;
                    top: -40px;
                    left: 6px;
                    background: var(--color-interactive-primary);
                    color: white;
                    padding: 8px;
                    text-decoration: none;
                    border-radius: 4px;
                    z-index: 1000;
                    transition: top 0.3s;
                `;
                
                CJUtils.on(skipLink, 'focus', () => {
                    skipLink.style.top = '6px';
                });
                
                CJUtils.on(skipLink, 'blur', () => {
                    skipLink.style.top = '-40px';
                });

                this.form.insertBefore(skipLink, this.form.firstChild);

                // Add form end marker
                const formEnd = document.createElement('div');
                formEnd.id = 'form-end';
                formEnd.setAttribute('tabindex', '-1');
                this.form.appendChild(formEnd);
            }

            // Enhance tab navigation
            const inputs = this.form.querySelectorAll('input, select, textarea, button');
            inputs.forEach((input, index) => {
                if (!input.getAttribute('tabindex')) {
                    input.setAttribute('tabindex', index + 1);
                }
            });
        }

        enhanceScreenReaderSupport() {
            // Add form role and label
            if (!this.form.getAttribute('role')) {
                this.form.setAttribute('role', 'form');
            }

            const formTitle = this.form.querySelector('h1, h2, h3, .form-title');
            if (formTitle && !this.form.getAttribute('aria-labelledby')) {
                if (!formTitle.id) {
                    formTitle.id = 'form_title_' + Math.random().toString(36).substr(2, 9);
                }
                this.form.setAttribute('aria-labelledby', formTitle.id);
            }

            // Add live region for form status
            let liveRegion = this.form.querySelector('.form-live-region');
            if (!liveRegion) {
                liveRegion = document.createElement('div');
                liveRegion.className = 'form-live-region sr-only';
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.setAttribute('aria-atomic', 'true');
                this.form.appendChild(liveRegion);
            }

            this.liveRegion = liveRegion;
        }

        announceToScreenReader(message) {
            if (this.liveRegion) {
                this.liveRegion.textContent = message;
                setTimeout(() => {
                    this.liveRegion.textContent = '';
                }, 1000);
            }
        }
    }

    // ==========================================================================
    // Global Form Initialization
    // ==========================================================================

    const formAnimationController = new FormAnimationController();

    // Auto-enhance forms on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Enhance all form inputs
        document.querySelectorAll('.form-control').forEach(input => {
            new FormInputEnhancer(input);
        });

        // Enhance form accessibility
        document.querySelectorAll('form, .form').forEach(form => {
            new FormAccessibilityEnhancer(form);
        });
    });

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        AutoComplete,
        SmartValidator,
        StepManager,
        FormInputEnhancer,
        FormAnimationController,
        FormAccessibilityEnhancer,

        // Convenience methods
        createAutoComplete: (input, options) => new AutoComplete(input, options),
        createValidator: (form, options) => new SmartValidator(form, options),
        createStepManager: (container, options) => new StepManager(container, options),
        enhanceInput: (input, options) => new FormInputEnhancer(input, options),
        enhanceFormAccessibility: (form) => new FormAccessibilityEnhancer(form),

        // Global instances
        animationController: formAnimationController
    };
})();