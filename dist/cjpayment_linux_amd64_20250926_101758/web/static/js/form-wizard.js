/**
 * CJPayment Form Wizard Component
 * Advanced multi-step form wizard with validation, auto-save, and accessibility
 */

window.CJFormWizard = (function() {
    'use strict';

    // ==========================================================================
    // Form Wizard Class
    // ==========================================================================

    class FormWizard {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? CJUtils.$(container) : container;
            this.options = {
                showProgress: true,
                allowSkip: false,
                validateOnNext: true,
                autoSave: true,
                autoSaveInterval: 30000, // 30 seconds
                saveKey: 'form_wizard_data',
                showStepNumbers: true,
                showStepTitles: true,
                enableKeyboardNavigation: true,
                animateTransitions: true,
                onStepChange: null,
                onComplete: null,
                onSave: null,
                onLoad: null,
                ...options
            };

            this.currentStep = 1;
            this.totalSteps = 0;
            this.steps = [];
            this.validators = new Map();
            this.formData = {};
            this.autoSaveTimer = null;
            this.isInitialized = false;

            this.init();
        }

        init() {
            if (this.isInitialized) return;

            this.findSteps();
            this.createProgressIndicator();
            this.createNavigation();
            this.setupAutoSave();
            this.bindEvents();
            this.loadSavedData();
            this.showStep(1);
            this.updateProgress();

            this.isInitialized = true;
            console.log('Form Wizard initialized with', this.totalSteps, 'steps');
        }

        findSteps() {
            const stepElements = this.container.querySelectorAll('[data-step]');
            this.totalSteps = stepElements.length;

            stepElements.forEach((el, index) => {
                const stepNumber = parseInt(el.dataset.step) || (index + 1);
                const stepData = {
                    element: el,
                    number: stepNumber,
                    title: el.dataset.title || el.querySelector('.step-title')?.textContent || `步骤 ${stepNumber}`,
                    description: el.dataset.description || el.querySelector('.step-description')?.textContent || '',
                    isValid: false,
                    isCompleted: false,
                    isOptional: el.hasAttribute('data-optional'),
                    fields: []
                };

                // Find form fields in this step
                const fields = el.querySelectorAll('input, select, textarea');
                fields.forEach(field => {
                    stepData.fields.push({
                        element: field,
                        name: field.name || field.id,
                        required: field.required,
                        type: field.type
                    });
                });

                this.steps[stepNumber] = stepData;
                
                // Hide all steps initially
                el.style.display = 'none';
                el.classList.add('wizard-step');
                el.setAttribute('role', 'tabpanel');
                el.setAttribute('aria-labelledby', `step-${stepNumber}-tab`);
            });
        }

        createProgressIndicator() {
            if (!this.options.showProgress) return;

            let progressContainer = this.container.querySelector('.wizard-progress');
            if (!progressContainer) {
                progressContainer = document.createElement('div');
                progressContainer.className = 'wizard-progress';
                progressContainer.setAttribute('role', 'tablist');
                progressContainer.setAttribute('aria-label', '表单步骤');
                this.container.insertBefore(progressContainer, this.container.firstChild);
            }

            const progressHTML = this.steps.map((step, index) => {
                if (!step) return '';
                
                return `
                    <div class="wizard-step-indicator" 
                         data-step="${step.number}"
                         role="tab"
                         id="step-${step.number}-tab"
                         aria-controls="step-${step.number}"
                         aria-selected="${step.number === 1 ? 'true' : 'false'}"
                         tabindex="${step.number === 1 ? '0' : '-1'}">
                        ${this.options.showStepNumbers ? `<div class="wizard-step-number">${step.number}</div>` : ''}
                        ${this.options.showStepTitles ? `<div class="wizard-step-title">${step.title}</div>` : ''}
                        ${step.description ? `<div class="wizard-step-description">${step.description}</div>` : ''}
                        <div class="wizard-step-status" aria-hidden="true"></div>
                    </div>
                `;
            }).join('');

            progressContainer.innerHTML = progressHTML;
            this.addProgressStyles();
        }

        createNavigation() {
            let navContainer = this.container.querySelector('.wizard-navigation');
            if (!navContainer) {
                navContainer = document.createElement('div');
                navContainer.className = 'wizard-navigation';
                this.container.appendChild(navContainer);
            }

            navContainer.innerHTML = `
                <button type="button" class="btn btn--secondary wizard-btn-prev" disabled>
                    <span class="btn__icon">←</span>
                    <span class="btn__text">上一步</span>
                </button>
                <div class="wizard-step-info">
                    <span class="wizard-current-step">1</span> / <span class="wizard-total-steps">${this.totalSteps}</span>
                </div>
                <button type="button" class="btn btn--primary wizard-btn-next">
                    <span class="btn__text">下一步</span>
                    <span class="btn__icon">→</span>
                </button>
                <button type="button" class="btn btn--success wizard-btn-submit" style="display: none;">
                    <span class="btn__icon">✓</span>
                    <span class="btn__text">提交</span>
                </button>
            `;

            this.prevBtn = navContainer.querySelector('.wizard-btn-prev');
            this.nextBtn = navContainer.querySelector('.wizard-btn-next');
            this.submitBtn = navContainer.querySelector('.wizard-btn-submit');
            this.stepInfo = navContainer.querySelector('.wizard-step-info');
        }

        setupAutoSave() {
            if (!this.options.autoSave) return;

            // Auto-save on form input
            CJUtils.on(this.container, 'input', CJUtils.debounce(() => {
                this.saveFormData();
            }, 1000));

            // Auto-save on interval
            this.autoSaveTimer = setInterval(() => {
                this.saveFormData();
            }, this.options.autoSaveInterval);

            // Save before page unload
            CJUtils.on(window, 'beforeunload', () => {
                this.saveFormData();
            });
        }

        bindEvents() {
            // Navigation buttons
            CJUtils.on(this.prevBtn, 'click', () => this.prevStep());
            CJUtils.on(this.nextBtn, 'click', () => this.nextStep());
            CJUtils.on(this.submitBtn, 'click', () => this.submit());

            // Progress indicator clicks
            if (this.options.showProgress) {
                CJUtils.on(this.container, 'click', (e) => {
                    const indicator = e.target.closest('.wizard-step-indicator');
                    if (indicator) {
                        const step = parseInt(indicator.dataset.step);
                        this.goToStep(step);
                    }
                });
            }

            // Keyboard navigation
            if (this.options.enableKeyboardNavigation) {
                CJUtils.on(this.container, 'keydown', (e) => {
                    this.handleKeyboardNavigation(e);
                });

                // Tab navigation for progress indicators
                CJUtils.on(this.container, 'keydown', (e) => {
                    if (e.target.classList.contains('wizard-step-indicator')) {
                        this.handleProgressKeyboard(e);
                    }
                });
            }

            // Form submission prevention
            CJUtils.on(this.container, 'submit', (e) => {
                e.preventDefault();
                if (this.currentStep === this.totalSteps) {
                    this.submit();
                } else {
                    this.nextStep();
                }
            });
        }

        handleKeyboardNavigation(e) {
            switch (e.key) {
                case 'ArrowLeft':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.prevStep();
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.nextStep();
                    }
                    break;
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (this.currentStep === this.totalSteps) {
                            this.submit();
                        } else {
                            this.nextStep();
                        }
                    }
                    break;
            }
        }

        handleProgressKeyboard(e) {
            const indicators = Array.from(this.container.querySelectorAll('.wizard-step-indicator'));
            const currentIndex = indicators.findIndex(ind => ind === e.target);

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        indicators[currentIndex - 1].focus();
                    }
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    if (currentIndex < indicators.length - 1) {
                        indicators[currentIndex + 1].focus();
                    }
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    const step = parseInt(e.target.dataset.step);
                    this.goToStep(step);
                    break;
                case 'Home':
                    e.preventDefault();
                    indicators[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    indicators[indicators.length - 1].focus();
                    break;
            }
        }

        showStep(stepNumber) {
            if (stepNumber < 1 || stepNumber > this.totalSteps) return false;

            // Hide all steps
            this.steps.forEach(step => {
                if (step) {
                    step.element.style.display = 'none';
                    step.element.setAttribute('aria-hidden', 'true');
                }
            });

            // Show current step
            const currentStepData = this.steps[stepNumber];
            if (currentStepData) {
                if (this.options.animateTransitions) {
                    this.animateStepTransition(currentStepData.element);
                } else {
                    currentStepData.element.style.display = 'block';
                }
                
                currentStepData.element.setAttribute('aria-hidden', 'false');
                this.currentStep = stepNumber;
                
                // Focus first input in step
                const firstInput = currentStepData.element.querySelector('input, select, textarea');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
                
                this.updateNavigation();
                this.updateProgress();
                
                // Trigger callback
                if (this.options.onStepChange) {
                    this.options.onStepChange(stepNumber, currentStepData);
                }
                
                return true;
            }
            
            return false;
        }

        animateStepTransition(stepElement) {
            stepElement.style.display = 'block';
            stepElement.style.opacity = '0';
            stepElement.style.transform = 'translateX(20px)';
            stepElement.style.transition = 'all 0.3s ease-out';
            
            requestAnimationFrame(() => {
                stepElement.style.opacity = '1';
                stepElement.style.transform = 'translateX(0)';
            });
        }

        updateNavigation() {
            // Update step info
            this.stepInfo.querySelector('.wizard-current-step').textContent = this.currentStep;
            
            // Update button states
            this.prevBtn.disabled = this.currentStep === 1;
            
            if (this.currentStep === this.totalSteps) {
                this.nextBtn.style.display = 'none';
                this.submitBtn.style.display = 'inline-flex';
            } else {
                this.nextBtn.style.display = 'inline-flex';
                this.submitBtn.style.display = 'none';
            }
            
            // Update button text based on validation
            const currentStepData = this.steps[this.currentStep];
            if (currentStepData && !currentStepData.isOptional) {
                const isValid = this.validateStep(this.currentStep);
                this.nextBtn.disabled = this.options.validateOnNext && !isValid;
            }
        }

        updateProgress() {
            const indicators = this.container.querySelectorAll('.wizard-step-indicator');
            
            indicators.forEach((indicator, index) => {
                const stepNum = index + 1;
                const stepData = this.steps[stepNum];
                
                indicator.classList.remove('active', 'completed', 'invalid');
                indicator.setAttribute('aria-selected', 'false');
                indicator.setAttribute('tabindex', '-1');
                
                if (stepNum < this.currentStep) {
                    indicator.classList.add('completed');
                    indicator.setAttribute('aria-label', `${stepData.title} - 已完成`);
                } else if (stepNum === this.currentStep) {
                    indicator.classList.add('active');
                    indicator.setAttribute('aria-selected', 'true');
                    indicator.setAttribute('tabindex', '0');
                    indicator.setAttribute('aria-label', `${stepData.title} - 当前步骤`);
                } else {
                    indicator.setAttribute('aria-label', `${stepData.title} - 未完成`);
                }
                
                // Show validation state
                if (stepData && !stepData.isValid && stepNum < this.currentStep) {
                    indicator.classList.add('invalid');
                }
            });
        }

        nextStep() {
            if (this.options.validateOnNext && !this.validateCurrentStep()) {
                this.showValidationErrors();
                return false;
            }
            
            this.markStepCompleted(this.currentStep);
            
            if (this.currentStep < this.totalSteps) {
                this.showStep(this.currentStep + 1);
                this.saveFormData();
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
            if (stepNumber < 1 || stepNumber > this.totalSteps) return false;
            
            // Check if we can skip to this step
            if (!this.options.allowSkip && stepNumber > this.currentStep) {
                // Validate all steps up to target
                for (let i = this.currentStep; i < stepNumber; i++) {
                    if (!this.validateStep(i)) {
                        this.showStep(i);
                        this.showValidationErrors();
                        return false;
                    }
                    this.markStepCompleted(i);
                }
            }
            
            this.showStep(stepNumber);
            return true;
        }

        validateCurrentStep() {
            return this.validateStep(this.currentStep);
        }

        validateStep(stepNumber) {
            const stepData = this.steps[stepNumber];
            if (!stepData) return false;
            
            // If step is optional, it's always valid
            if (stepData.isOptional) {
                stepData.isValid = true;
                return true;
            }
            
            let isValid = true;
            const errors = [];
            
            // Validate each field in the step
            stepData.fields.forEach(fieldData => {
                const field = fieldData.element;
                const value = field.value.trim();
                
                // Required field validation
                if (fieldData.required && !value) {
                    isValid = false;
                    errors.push({
                        field: field,
                        message: '此字段为必填项'
                    });
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                    
                    // Type-specific validation
                    if (value) {
                        const typeValidation = this.validateFieldType(field, value);
                        if (!typeValidation.valid) {
                            isValid = false;
                            errors.push({
                                field: field,
                                message: typeValidation.message
                            });
                            field.classList.add('is-invalid');
                        } else {
                            field.classList.add('is-valid');
                        }
                    }
                }
            });
            
            // Custom validator if exists
            const validator = this.validators.get(stepNumber);
            if (validator) {
                const customValidation = validator();
                if (!customValidation.valid) {
                    isValid = false;
                    errors.push(...customValidation.errors);
                }
            }
            
            stepData.isValid = isValid;
            stepData.errors = errors;
            
            return isValid;
        }

        validateFieldType(field, value) {
            switch (field.type) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return {
                        valid: emailRegex.test(value),
                        message: '请输入有效的邮箱地址'
                    };
                    
                case 'tel':
                    const phoneRegex = /^1[3-9]\d{9}$/;
                    return {
                        valid: phoneRegex.test(value),
                        message: '请输入有效的手机号码'
                    };
                    
                case 'number':
                    const num = parseFloat(value);
                    const min = parseFloat(field.min);
                    const max = parseFloat(field.max);
                    
                    if (isNaN(num)) {
                        return { valid: false, message: '请输入有效的数字' };
                    }
                    
                    if (!isNaN(min) && num < min) {
                        return { valid: false, message: `数值不能小于 ${min}` };
                    }
                    
                    if (!isNaN(max) && num > max) {
                        return { valid: false, message: `数值不能大于 ${max}` };
                    }
                    
                    return { valid: true };
                    
                case 'url':
                    try {
                        new URL(value);
                        return { valid: true };
                    } catch {
                        return { valid: false, message: '请输入有效的网址' };
                    }
                    
                default:
                    return { valid: true };
            }
        }

        showValidationErrors() {
            const stepData = this.steps[this.currentStep];
            if (!stepData || !stepData.errors) return;
            
            // Clear previous error messages
            stepData.element.querySelectorAll('.form-feedback--invalid').forEach(el => {
                el.textContent = '';
                el.style.display = 'none';
            });
            
            // Show new error messages
            stepData.errors.forEach(error => {
                const field = error.field;
                const formGroup = field.closest('.form-group');
                if (formGroup) {
                    let feedback = formGroup.querySelector('.form-feedback--invalid');
                    if (!feedback) {
                        feedback = document.createElement('div');
                        feedback.className = 'form-feedback form-feedback--invalid';
                        formGroup.appendChild(feedback);
                    }
                    feedback.textContent = error.message;
                    feedback.style.display = 'block';
                }
            });
            
            // Focus first invalid field
            const firstInvalidField = stepData.element.querySelector('.is-invalid');
            if (firstInvalidField) {
                firstInvalidField.focus();
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        markStepCompleted(stepNumber) {
            const stepData = this.steps[stepNumber];
            if (stepData) {
                stepData.isCompleted = true;
            }
        }

        addStepValidator(stepNumber, validatorFn) {
            this.validators.set(stepNumber, validatorFn);
        }

        saveFormData() {
            if (!this.options.autoSave) return;
            
            const formData = this.getFormData();
            const saveData = {
                currentStep: this.currentStep,
                formData: formData,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem(this.options.saveKey, JSON.stringify(saveData));
                
                // Trigger save callback
                if (this.options.onSave) {
                    this.options.onSave(saveData);
                }
                
                this.showSaveIndicator();
            } catch (error) {
                console.warn('Failed to save form data:', error);
            }
        }

        loadSavedData() {
            if (!this.options.autoSave) return;
            
            try {
                const savedData = localStorage.getItem(this.options.saveKey);
                if (savedData) {
                    const data = JSON.parse(savedData);
                    
                    // Check if data is not too old (24 hours)
                    const maxAge = 24 * 60 * 60 * 1000;
                    if (Date.now() - data.timestamp < maxAge) {
                        this.restoreFormData(data.formData);
                        
                        // Ask user if they want to continue from saved step
                        if (data.currentStep > 1) {
                            const shouldRestore = confirm('检测到未完成的表单数据，是否继续填写？');
                            if (shouldRestore) {
                                this.currentStep = data.currentStep;
                            }
                        }
                        
                        // Trigger load callback
                        if (this.options.onLoad) {
                            this.options.onLoad(data);
                        }
                    } else {
                        // Clear old data
                        localStorage.removeItem(this.options.saveKey);
                    }
                }
            } catch (error) {
                console.warn('Failed to load saved form data:', error);
            }
        }

        getFormData() {
            const formData = {};
            const formElements = this.container.querySelectorAll('input, select, textarea');
            
            formElements.forEach(element => {
                const name = element.name || element.id;
                if (name) {
                    if (element.type === 'checkbox') {
                        formData[name] = element.checked;
                    } else if (element.type === 'radio') {
                        if (element.checked) {
                            formData[name] = element.value;
                        }
                    } else {
                        formData[name] = element.value;
                    }
                }
            });
            
            return formData;
        }

        restoreFormData(formData) {
            Object.keys(formData).forEach(name => {
                const elements = this.container.querySelectorAll(`[name="${name}"], #${name}`);
                
                elements.forEach(element => {
                    if (element.type === 'checkbox') {
                        element.checked = formData[name];
                    } else if (element.type === 'radio') {
                        element.checked = element.value === formData[name];
                    } else {
                        element.value = formData[name];
                    }
                    
                    // Trigger input event to update any enhancements
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        }

        showSaveIndicator() {
            // Create or update save indicator
            let indicator = this.container.querySelector('.wizard-save-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'wizard-save-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    top: var(--space-4);
                    right: var(--space-4);
                    background: var(--color-status-success);
                    color: white;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-base);
                    font-size: var(--font-size-sm);
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                    z-index: 1000;
                    pointer-events: none;
                `;
                document.body.appendChild(indicator);
            }
            
            indicator.textContent = '✓ 已自动保存';
            indicator.style.opacity = '1';
            
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 2000);
        }

        submit() {
            // Validate all steps
            let allValid = true;
            for (let i = 1; i <= this.totalSteps; i++) {
                if (!this.validateStep(i)) {
                    allValid = false;
                    this.goToStep(i);
                    this.showValidationErrors();
                    break;
                }
            }
            
            if (!allValid) return false;
            
            const formData = this.getFormData();
            
            // Clear saved data on successful submit
            if (this.options.autoSave) {
                localStorage.removeItem(this.options.saveKey);
            }
            
            // Trigger complete callback
            if (this.options.onComplete) {
                this.options.onComplete(formData);
            }
            
            return true;
        }

        reset() {
            // Reset form data
            this.container.querySelectorAll('input, select, textarea').forEach(element => {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = false;
                } else {
                    element.value = '';
                }
                element.classList.remove('is-valid', 'is-invalid');
            });
            
            // Reset step states
            this.steps.forEach(step => {
                if (step) {
                    step.isValid = false;
                    step.isCompleted = false;
                    step.errors = [];
                }
            });
            
            // Clear validation messages
            this.container.querySelectorAll('.form-feedback').forEach(feedback => {
                feedback.textContent = '';
                feedback.style.display = 'none';
            });
            
            // Go to first step
            this.showStep(1);
            
            // Clear saved data
            if (this.options.autoSave) {
                localStorage.removeItem(this.options.saveKey);
            }
        }

        destroy() {
            // Clear auto-save timer
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }
            
            // Remove save indicator
            const indicator = document.querySelector('.wizard-save-indicator');
            if (indicator) {
                indicator.remove();
            }
            
            // Reset container
            this.container.classList.remove('form-wizard');
            
            // Show all steps
            this.steps.forEach(step => {
                if (step) {
                    step.element.style.display = 'block';
                    step.element.classList.remove('wizard-step');
                }
            });
            
            // Remove wizard elements
            const progress = this.container.querySelector('.wizard-progress');
            const navigation = this.container.querySelector('.wizard-navigation');
            
            if (progress) progress.remove();
            if (navigation) navigation.remove();
        }

        addProgressStyles() {
            if (CJUtils.$('#wizard-styles')) return;

            const style = document.createElement('style');
            style.id = 'wizard-styles';
            style.textContent = `
                .wizard-progress {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--space-8);
                    padding: var(--space-6) 0;
                    position: relative;
                }
                
                .wizard-progress::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--color-border-primary);
                    z-index: 1;
                    transform: translateY(-50%);
                }
                
                .wizard-step-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                    z-index: 2;
                    cursor: pointer;
                    padding: var(--space-2);
                    border-radius: var(--radius-base);
                    transition: all var(--duration-200) var(--ease-out);
                    background: var(--color-bg-surface);
                }
                
                .wizard-step-indicator:hover {
                    background: var(--color-bg-secondary);
                }
                
                .wizard-step-indicator:focus {
                    outline: 2px solid var(--color-border-focus);
                    outline-offset: 2px;
                }
                
                .wizard-step-number {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--color-bg-tertiary);
                    color: var(--color-text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: var(--font-weight-semibold);
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--space-2);
                    transition: all var(--duration-200) var(--ease-out);
                    border: 2px solid var(--color-border-primary);
                }
                
                .wizard-step-title {
                    font-size: var(--font-size-sm);
                    font-weight: var(--font-weight-medium);
                    color: var(--color-text-secondary);
                    margin-bottom: var(--space-1);
                    transition: color var(--duration-200) var(--ease-out);
                }
                
                .wizard-step-description {
                    font-size: var(--font-size-xs);
                    color: var(--color-text-tertiary);
                    max-width: 120px;
                    line-height: var(--line-height-tight);
                }
                
                .wizard-step-indicator.active .wizard-step-number {
                    background: var(--color-interactive-primary);
                    color: var(--color-text-inverse);
                    border-color: var(--color-interactive-primary);
                    transform: scale(1.1);
                }
                
                .wizard-step-indicator.active .wizard-step-title {
                    color: var(--color-interactive-primary);
                    font-weight: var(--font-weight-semibold);
                }
                
                .wizard-step-indicator.completed .wizard-step-number {
                    background: var(--color-status-success);
                    color: var(--color-text-inverse);
                    border-color: var(--color-status-success);
                }
                
                .wizard-step-indicator.completed .wizard-step-number::before {
                    content: '✓';
                    font-size: var(--font-size-xs);
                }
                
                .wizard-step-indicator.completed .wizard-step-title {
                    color: var(--color-status-success);
                }
                
                .wizard-step-indicator.invalid .wizard-step-number {
                    background: var(--color-status-error);
                    color: var(--color-text-inverse);
                    border-color: var(--color-status-error);
                }
                
                .wizard-step-indicator.invalid .wizard-step-number::before {
                    content: '!';
                    font-size: var(--font-size-xs);
                }
                
                .wizard-step-indicator.invalid .wizard-step-title {
                    color: var(--color-status-error);
                }
                
                .wizard-navigation {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: var(--space-8);
                    padding-top: var(--space-6);
                    border-top: 1px solid var(--color-border-primary);
                }
                
                .wizard-step-info {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    font-weight: var(--font-weight-medium);
                }
                
                .wizard-save-indicator {
                    position: fixed;
                    top: var(--space-4);
                    right: var(--space-4);
                    background: var(--color-status-success);
                    color: white;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-base);
                    font-size: var(--font-size-sm);
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                    z-index: 1000;
                    pointer-events: none;
                }
                
                @media (max-width: 767px) {
                    .wizard-progress {
                        flex-direction: column;
                        gap: var(--space-4);
                    }
                    
                    .wizard-progress::before {
                        display: none;
                    }
                    
                    .wizard-step-indicator {
                        flex-direction: row;
                        text-align: left;
                        padding: var(--space-3);
                        background: var(--color-bg-secondary);
                        border-radius: var(--radius-md);
                    }
                    
                    .wizard-step-number {
                        margin-bottom: 0;
                        margin-right: var(--space-3);
                        flex-shrink: 0;
                    }
                    
                    .wizard-step-title {
                        margin-bottom: 0;
                    }
                    
                    .wizard-navigation {
                        flex-direction: column;
                        gap: var(--space-4);
                    }
                    
                    .wizard-navigation .btn {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==========================================================================
    // Auto-complete with Smart Suggestions
    // ==========================================================================

    class SmartAutoComplete {
        constructor(input, options = {}) {
            this.input = typeof input === 'string' ? CJUtils.$(input) : input;
            this.options = {
                minLength: 1,
                maxResults: 10,
                delay: 300,
                source: [],
                enableHistory: true,
                enablePrediction: true,
                historyKey: 'autocomplete_history',
                maxHistoryItems: 50,
                onSelect: null,
                onSearch: null,
                template: null,
                groupBy: null,
                ...options
            };

            this.isOpen = false;
            this.selectedIndex = -1;
            this.results = [];
            this.history = [];
            this.dropdown = null;
            this.cache = new Map();

            this.init();
        }

        init() {
            this.loadHistory();
            this.createDropdown();
            this.bindEvents();
        }

        loadHistory() {
            if (!this.options.enableHistory) return;

            try {
                const saved = localStorage.getItem(this.options.historyKey);
                if (saved) {
                    this.history = JSON.parse(saved);
                }
            } catch (error) {
                console.warn('Failed to load autocomplete history:', error);
            }
        }

        saveHistory() {
            if (!this.options.enableHistory) return;

            try {
                localStorage.setItem(this.options.historyKey, JSON.stringify(this.history));
            } catch (error) {
                console.warn('Failed to save autocomplete history:', error);
            }
        }

        addToHistory(item) {
            if (!this.options.enableHistory) return;

            const value = typeof item === 'string' ? item : item.text || item.name || '';
            if (!value) return;

            // Remove if already exists
            this.history = this.history.filter(h => h !== value);
            
            // Add to beginning
            this.history.unshift(value);
            
            // Limit history size
            if (this.history.length > this.options.maxHistoryItems) {
                this.history = this.history.slice(0, this.options.maxHistoryItems);
            }
            
            this.saveHistory();
        }

        createDropdown() {
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'smart-autocomplete-dropdown';
            this.dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--color-bg-surface);
                border: 1px solid var(--color-border-primary);
                border-top: none;
                border-radius: 0 0 var(--radius-md) var(--radius-md);
                box-shadow: var(--shadow-lg);
                max-height: 300px;
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

            // Show history on focus
            CJUtils.on(this.input, 'focus', () => {
                if (!this.input.value && this.history.length > 0) {
                    this.showHistory();
                }
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

            // Check cache first
            if (this.cache.has(query)) {
                this.results = this.cache.get(query);
                this.render();
                return;
            }

            let results = [];

            // Search in history first
            if (this.options.enableHistory) {
                const historyResults = this.history
                    .filter(item => item.toLowerCase().includes(query.toLowerCase()))
                    .slice(0, 3)
                    .map(item => ({ text: item, type: 'history' }));
                results.push(...historyResults);
            }

            // Search in provided source
            if (typeof this.options.source === 'function') {
                const sourceResults = await this.options.source(query);
                results.push(...sourceResults.map(item => ({ ...item, type: 'source' })));
            } else if (Array.isArray(this.options.source)) {
                const sourceResults = this.options.source.filter(item => {
                    const text = typeof item === 'string' ? item : item.text || item.name || '';
                    return text.toLowerCase().includes(query.toLowerCase());
                });
                results.push(...sourceResults.map(item => ({ ...item, type: 'source' })));
            }

            // Add predictions if enabled
            if (this.options.enablePrediction) {
                const predictions = this.generatePredictions(query);
                results.push(...predictions.map(item => ({ text: item, type: 'prediction' })));
            }

            // Custom search callback
            if (this.options.onSearch) {
                const customResults = await this.options.onSearch(query, results);
                results = customResults || results;
            }

            // Limit results
            this.results = results.slice(0, this.options.maxResults);
            
            // Cache results
            this.cache.set(query, this.results);
            
            this.render();
        }

        generatePredictions(query) {
            // Simple prediction based on common patterns
            const predictions = [];
            
            // Email predictions
            if (query.includes('@') && !query.includes('.')) {
                const commonDomains = ['gmail.com', '163.com', 'qq.com', 'sina.com', 'hotmail.com'];
                commonDomains.forEach(domain => {
                    predictions.push(query + domain.substring(query.split('@')[1]?.length || 0));
                });
            }
            
            // URL predictions
            if (query.startsWith('http') || query.startsWith('www')) {
                if (!query.includes('.')) {
                    predictions.push(query + '.com');
                    predictions.push(query + '.cn');
                }
            }
            
            return predictions.slice(0, 2);
        }

        showHistory() {
            if (this.history.length === 0) return;

            this.results = this.history.slice(0, 5).map(item => ({
                text: item,
                type: 'history'
            }));
            
            this.render();
        }

        render() {
            if (this.results.length === 0) {
                this.close();
                return;
            }

            this.dropdown.innerHTML = '';
            this.selectedIndex = -1;

            // Group results if groupBy is specified
            if (this.options.groupBy) {
                const grouped = this.groupResults();
                this.renderGrouped(grouped);
            } else {
                this.renderFlat();
            }

            this.open();
        }

        groupResults() {
            const groups = {};
            
            this.results.forEach(item => {
                const groupKey = this.options.groupBy(item);
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(item);
            });
            
            return groups;
        }

        renderGrouped(groups) {
            Object.keys(groups).forEach(groupName => {
                // Group header
                const groupHeader = document.createElement('div');
                groupHeader.className = 'autocomplete-group-header';
                groupHeader.style.cssText = `
                    padding: var(--space-2) var(--space-3);
                    font-size: var(--font-size-xs);
                    font-weight: var(--font-weight-semibold);
                    color: var(--color-text-secondary);
                    background: var(--color-bg-secondary);
                    border-bottom: 1px solid var(--color-border-primary);
                `;
                groupHeader.textContent = groupName;
                this.dropdown.appendChild(groupHeader);

                // Group items
                groups[groupName].forEach((item, index) => {
                    this.renderItem(item, index);
                });
            });
        }

        renderFlat() {
            this.results.forEach((item, index) => {
                this.renderItem(item, index);
            });
        }

        renderItem(item, index) {
            const element = document.createElement('div');
            element.className = 'autocomplete-item';
            element.style.cssText = `
                padding: var(--space-3) var(--space-4);
                cursor: pointer;
                border-bottom: 1px solid var(--color-border-primary);
                display: flex;
                align-items: center;
                gap: var(--space-2);
                transition: background-color var(--duration-150) var(--ease-out);
            `;

            // Add type icon
            const icon = document.createElement('span');
            icon.className = 'autocomplete-icon';
            icon.style.cssText = `
                font-size: var(--font-size-sm);
                opacity: 0.6;
            `;
            
            switch (item.type) {
                case 'history':
                    icon.textContent = '🕒';
                    break;
                case 'prediction':
                    icon.textContent = '💡';
                    break;
                default:
                    icon.textContent = '🔍';
            }
            
            element.appendChild(icon);

            // Add content
            const content = document.createElement('div');
            content.className = 'autocomplete-content';
            content.style.flex = '1';
            
            if (this.options.template) {
                content.innerHTML = this.options.template(item);
            } else {
                content.textContent = typeof item === 'string' ? item : item.text || item.name || '';
            }
            
            element.appendChild(content);

            // Event handlers
            CJUtils.on(element, 'click', () => {
                this.select(index);
            });

            CJUtils.on(element, 'mouseenter', () => {
                this.highlight(index);
            });

            this.dropdown.appendChild(element);
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
                case 'Tab':
                    if (this.selectedIndex >= 0) {
                        e.preventDefault();
                        this.select(this.selectedIndex);
                    }
                    break;
            }
        }

        highlight(index) {
            // Remove previous highlight
            const items = this.dropdown.querySelectorAll('.autocomplete-item');
            items.forEach(item => {
                item.style.backgroundColor = '';
                item.classList.remove('highlighted');
            });

            this.selectedIndex = index;

            if (index >= 0 && index < items.length) {
                const item = items[index];
                item.style.backgroundColor = 'var(--color-bg-secondary)';
                item.classList.add('highlighted');
                
                // Scroll into view if needed
                item.scrollIntoView({ block: 'nearest' });
            }
        }

        select(index) {
            if (index < 0 || index >= this.results.length) return;

            const item = this.results[index];
            const value = typeof item === 'string' ? item : item.text || item.name || '';
            
            this.input.value = value;
            this.close();
            
            // Add to history
            this.addToHistory(item);
            
            // Trigger callbacks
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
            this.cache.clear();
        }
    }

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        FormWizard,
        SmartAutoComplete,

        // Convenience methods
        createWizard: (container, options) => new FormWizard(container, options),
        createSmartAutoComplete: (input, options) => new SmartAutoComplete(input, options)
    };
})();