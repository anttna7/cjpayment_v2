/**
 * Account Modal Component
 * Handles account creation and editing modal dialogs
 * 
 * Features:
 * - Create and edit account forms
 * - Real-time form validation
 * - Data binding and submission
 * - Error handling and user feedback
 * - Accessibility support
 */

class AccountModal {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/v1/accounts',
            onSuccess: null,
            onError: null,
            onCancel: null,
            ...options
        };
        
        this.modal = null;
        this.form = null;
        this.validator = null;
        this.isSubmitting = false;
        this.currentAccount = null;
        this.mode = 'create'; // 'create' or 'edit'
        
        this.init();
    }
    
    /**
     * Initialize the modal component
     */
    init() {
        // Initialize modal manager if not already done
        if (!window.Modal) {
            console.error('Modal component not found. Please include modal-component.js');
            return;
        }
        
        // Initialize form validator
        this.initValidator();
    }
    
    /**
     * Initialize form validator
     */
    initValidator() {
        if (window.FormValidator) {
            this.validator = new window.FormValidator({
                realTimeValidation: true,
                showSuccessStates: true,
                customRules: this.getCustomValidationRules()
            });
        }
    }
    
    /**
     * Show create account modal
     * @param {Object} defaultData - Default form data
     * @returns {Promise} Promise that resolves with created account
     */
    async showCreate(defaultData = {}) {
        this.mode = 'create';
        this.currentAccount = null;
        
        return this.showModal({
            title: '添加收款账户',
            submitText: '创建账户',
            data: {
                accountName: '',
                accountNumber: '',
                accountType: 'alipay',
                accountHolder: '',
                paymentType: 'alipay',
                status: 'active',
                dailyLimit: '10000.00',
                singleLimit: '5000.00',
                customPaymentProvider: '',
                ...defaultData
            }
        });
    }
    
    /**
     * Show edit account modal
     * @param {Object} account - Account data to edit
     * @returns {Promise} Promise that resolves with updated account
     */
    async showEdit(account) {
        if (!account || !account.id) {
            throw new Error('Account data is required for editing');
        }
        
        this.mode = 'edit';
        this.currentAccount = account;
        
        return this.showModal({
            title: '编辑收款账户',
            submitText: '保存更改',
            data: {
                accountName: account.accountName || '',
                accountNumber: account.accountNumber || '',
                accountType: account.accountType || 'alipay',
                accountHolder: account.accountHolder || '',
                paymentType: account.paymentType || 'alipay',
                status: account.status || 'active',
                dailyLimit: account.dailyLimit || '10000.00',
                singleLimit: account.singleLimit || '5000.00',
                customPaymentProvider: account.customPaymentProvider || ''
            }
        });
    }
    
    /**
     * Show modal with form
     * @param {Object} config - Modal configuration
     * @returns {Promise} Promise that resolves with form result
     */
    async showModal(config) {
        const formHtml = this.createFormHtml(config.data);
        
        try {
            // Create modal element directly for better control
            const modalId = 'account-modal-' + Date.now();
            const modalHtml = this.createModalHtml(modalId, config.title, formHtml, config.submitText);
            
            // Add to DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById(modalId);
            if (!modal) {
                throw new Error('Failed to create modal');
            }
            
            // Set up modal
            this.onModalShow(modalId);
            
            // Return promise that resolves when modal is closed
            return new Promise((resolve, reject) => {
                // Handle form submission
                const form = modal.querySelector('#accountForm');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        try {
                            const result = await this.handleSubmit();
                            this.closeModal(modal);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    });
                }
                
                // Handle cancel/close
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                const closeBtn = modal.querySelector('.modal-close');
                
                const handleCancel = () => {
                    this.closeModal(modal);
                    reject(new Error('User cancelled'));
                };
                
                if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
                if (closeBtn) closeBtn.addEventListener('click', handleCancel);
                
                // Handle submit button
                const submitBtn = modal.querySelector('[data-action="submit"]');
                if (submitBtn) {
                    submitBtn.addEventListener('click', () => {
                        if (form) {
                            form.dispatchEvent(new Event('submit'));
                        }
                    });
                }
                
                // Handle backdrop click
                const backdrop = modal.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.addEventListener('click', handleCancel);
                }
                
                // Handle escape key
                const handleEscape = (e) => {
                    if (e.key === 'Escape') {
                        handleCancel();
                        document.removeEventListener('keydown', handleEscape);
                    }
                };
                document.addEventListener('keydown', handleEscape);
                
                // Show modal
                setTimeout(() => {
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                    document.body.setAttribute('data-modal-open', 'true');
                }, 10);
            });
            
        } catch (error) {
            console.error('Account modal error:', error);
            throw error;
        }
    }
    
    /**
     * Create modal HTML structure
     * @param {string} modalId - Modal ID
     * @param {string} title - Modal title
     * @param {string} formHtml - Form HTML
     * @param {string} submitText - Submit button text
     * @returns {string} Modal HTML
     */
    createModalHtml(modalId, title, formHtml, submitText) {
        return `
            <div class="modal" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="${modalId}-title">${this.escapeHtml(title)}</h2>
                        <button class="modal-close" type="button" aria-label="关闭">
                            <span aria-hidden="true">×</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${formHtml}
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-secondary" data-action="cancel" type="button">
                            取消
                        </button>
                        <button class="modal-btn modal-btn-primary" data-action="submit" type="button">
                            ${this.escapeHtml(submitText)}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Close modal
     * @param {HTMLElement} modal - Modal element
     */
    closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            
            // Restore body scroll
            document.body.style.overflow = '';
            document.body.removeAttribute('data-modal-open');
        }, 300);
    }
    
    /**
     * Create form HTML
     * @param {Object} data - Form data
     * @returns {string} Form HTML
     */
    createFormHtml(data) {
        return `
            <form class="account-form" id="accountForm" novalidate>
                <div class="form-row">
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="accountName">
                                账户名称
                                <span class="sr-only">必填</span>
                            </label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="accountName" 
                                name="accountName" 
                                value="${this.escapeHtml(data.accountName)}"
                                placeholder="请输入账户名称"
                                required
                                maxlength="100"
                                data-validate="required,maxLength:100"
                            >
                            <div class="form-feedback form-feedback--invalid" id="accountName-error"></div>
                        </div>
                    </div>
                    
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="accountType">
                                账户类型
                                <span class="sr-only">必填</span>
                            </label>
                            <select 
                                class="form-control form-select" 
                                id="accountType" 
                                name="accountType" 
                                required
                                data-validate="required"
                            >
                                <option value="alipay" ${data.accountType === 'alipay' ? 'selected' : ''}>支付宝</option>
                                <option value="wechat" ${data.accountType === 'wechat' ? 'selected' : ''}>微信支付</option>
                                <option value="bank" ${data.accountType === 'bank' ? 'selected' : ''}>银行卡</option>
                                <option value="other" ${data.accountType === 'other' ? 'selected' : ''}>其他</option>
                            </select>
                            <div class="form-feedback form-feedback--invalid" id="accountType-error"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="accountNumber">
                                账户号码
                                <span class="sr-only">必填</span>
                            </label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="accountNumber" 
                                name="accountNumber" 
                                value="${this.escapeHtml(data.accountNumber)}"
                                placeholder="请输入账户号码"
                                required
                                maxlength="50"
                                data-validate="required,accountNumber,maxLength:50"
                            >
                            <div class="form-feedback form-feedback--invalid" id="accountNumber-error"></div>
                            <div class="form-help">支持支付宝账号、微信号、银行卡号等</div>
                        </div>
                    </div>
                    
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="accountHolder">
                                账户持有人
                                <span class="sr-only">必填</span>
                            </label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="accountHolder" 
                                name="accountHolder" 
                                value="${this.escapeHtml(data.accountHolder)}"
                                placeholder="请输入账户持有人姓名"
                                required
                                maxlength="100"
                                data-validate="required,maxLength:100"
                            >
                            <div class="form-feedback form-feedback--invalid" id="accountHolder-error"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="paymentType">
                                支付类型
                                <span class="sr-only">必填</span>
                            </label>
                            <select 
                                class="form-control form-select" 
                                id="paymentType" 
                                name="paymentType" 
                                required
                                data-validate="required"
                            >
                                <option value="alipay" ${data.paymentType === 'alipay' ? 'selected' : ''}>支付宝</option>
                                <option value="wechat" ${data.paymentType === 'wechat' ? 'selected' : ''}>微信支付</option>
                                <option value="bank" ${data.paymentType === 'bank' ? 'selected' : ''}>银行转账</option>
                                <option value="other" ${data.paymentType === 'other' ? 'selected' : ''}>其他</option>
                            </select>
                            <div class="form-feedback form-feedback--invalid" id="paymentType-error"></div>
                        </div>
                    </div>
                    
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="status">
                                账户状态
                                <span class="sr-only">必填</span>
                            </label>
                            <select 
                                class="form-control form-select" 
                                id="status" 
                                name="status" 
                                required
                                data-validate="required"
                            >
                                <option value="active" ${data.status === 'active' ? 'selected' : ''}>活跃</option>
                                <option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>停用</option>
                                <option value="maintenance" ${data.status === 'maintenance' ? 'selected' : ''}>维护中</option>
                            </select>
                            <div class="form-feedback form-feedback--invalid" id="status-error"></div>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="dailyLimit">
                                单日限额 (元)
                                <span class="sr-only">必填</span>
                            </label>
                            <div class="input-group">
                                <span class="input-group-text">¥</span>
                                <input 
                                    type="number" 
                                    class="form-control" 
                                    id="dailyLimit" 
                                    name="dailyLimit" 
                                    value="${data.dailyLimit}"
                                    placeholder="10000.00"
                                    required
                                    min="0"
                                    max="999999.99"
                                    step="0.01"
                                    data-validate="required,currency,min:0,max:999999.99"
                                >
                            </div>
                            <div class="form-feedback form-feedback--invalid" id="dailyLimit-error"></div>
                            <div class="form-help">设置账户每日最大收款限额</div>
                        </div>
                    </div>
                    
                    <div class="form-col-6">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="singleLimit">
                                单笔限额 (元)
                                <span class="sr-only">必填</span>
                            </label>
                            <div class="input-group">
                                <span class="input-group-text">¥</span>
                                <input 
                                    type="number" 
                                    class="form-control" 
                                    id="singleLimit" 
                                    name="singleLimit" 
                                    value="${data.singleLimit}"
                                    placeholder="5000.00"
                                    required
                                    min="0"
                                    max="999999.99"
                                    step="0.01"
                                    data-validate="required,currency,min:0,max:999999.99"
                                >
                            </div>
                            <div class="form-feedback form-feedback--invalid" id="singleLimit-error"></div>
                            <div class="form-help">设置账户单笔最大收款限额</div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label form-label--optional" for="customPaymentProvider">
                        自定义支付提供商
                    </label>
                    <input 
                        type="text" 
                        class="form-control" 
                        id="customPaymentProvider" 
                        name="customPaymentProvider" 
                        value="${this.escapeHtml(data.customPaymentProvider)}"
                        placeholder="如有特殊支付提供商，请填写"
                        maxlength="50"
                        data-validate="maxLength:50"
                    >
                    <div class="form-feedback form-feedback--invalid" id="customPaymentProvider-error"></div>
                    <div class="form-help">可选字段，用于特殊支付渠道标识</div>
                </div>
                
                <!-- Hidden fields for edit mode -->
                ${this.mode === 'edit' && this.currentAccount ? `
                    <input type="hidden" name="id" value="${this.currentAccount.id}">
                ` : ''}
            </form>
        `;
    }
    
    /**
     * Handle modal show event
     * @param {string} modalId - Modal ID
     */
    onModalShow(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        this.form = modal.querySelector('#accountForm');
        if (!this.form) return;
        
        // Initialize form validation
        if (this.validator) {
            this.validator.bindForm(this.form);
        }
        
        // Bind form events
        this.bindFormEvents();
        
        // Focus first input
        const firstInput = this.form.querySelector('input:not([type="hidden"])');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Set up dynamic field interactions
        this.setupFieldInteractions();
    }
    
    /**
     * Handle modal hide event
     * @param {string} modalId - Modal ID
     * @param {Object} result - Modal result
     */
    onModalHide(modalId, result) {
        // Clean up form validation
        if (this.validator && this.form) {
            this.validator.unbindForm(this.form);
        }
        
        this.form = null;
        this.isSubmitting = false;
    }
    
    /**
     * Bind form events
     */
    bindFormEvents() {
        if (!this.form) return;
        
        // Handle form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // Handle real-time validation
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (this.validator) {
                    this.validator.validateField(input);
                }
            });
            
            input.addEventListener('input', () => {
                // Clear previous validation state on input
                input.classList.remove('is-valid', 'is-invalid');
                const feedback = document.getElementById(`${input.name}-error`);
                if (feedback) {
                    feedback.textContent = '';
                }
            });
        });
    }
    
    /**
     * Setup dynamic field interactions
     */
    setupFieldInteractions() {
        if (!this.form) return;
        
        const accountTypeSelect = this.form.querySelector('#accountType');
        const paymentTypeSelect = this.form.querySelector('#paymentType');
        const accountNumberInput = this.form.querySelector('#accountNumber');
        
        // Sync account type with payment type
        if (accountTypeSelect && paymentTypeSelect) {
            accountTypeSelect.addEventListener('change', (e) => {
                paymentTypeSelect.value = e.target.value;
                this.updateAccountNumberPlaceholder(e.target.value, accountNumberInput);
            });
        }
        
        // Update placeholder based on account type
        if (accountTypeSelect && accountNumberInput) {
            this.updateAccountNumberPlaceholder(accountTypeSelect.value, accountNumberInput);
        }
        
        // Validate single limit against daily limit
        const dailyLimitInput = this.form.querySelector('#dailyLimit');
        const singleLimitInput = this.form.querySelector('#singleLimit');
        
        if (dailyLimitInput && singleLimitInput) {
            const validateLimits = () => {
                const dailyLimit = parseFloat(dailyLimitInput.value) || 0;
                const singleLimit = parseFloat(singleLimitInput.value) || 0;
                
                if (singleLimit > dailyLimit && dailyLimit > 0) {
                    this.showFieldError(singleLimitInput, '单笔限额不能超过单日限额');
                } else {
                    this.clearFieldError(singleLimitInput);
                }
            };
            
            dailyLimitInput.addEventListener('input', validateLimits);
            singleLimitInput.addEventListener('input', validateLimits);
        }
    }
    
    /**
     * Update account number placeholder based on type
     * @param {string} accountType - Account type
     * @param {HTMLElement} input - Input element
     */
    updateAccountNumberPlaceholder(accountType, input) {
        if (!input) return;
        
        const placeholders = {
            'alipay': '请输入支付宝账号（手机号或邮箱）',
            'wechat': '请输入微信号',
            'bank': '请输入银行卡号',
            'other': '请输入账户号码'
        };
        
        input.placeholder = placeholders[accountType] || '请输入账户号码';
    }
    
    /**
     * Handle modal result
     * @param {Object} result - Modal result
     * @returns {Promise} Promise that resolves with processed result
     */
    async handleModalResult(result) {
        if (result.reason === 'submit' || result.action === 'submit') {
            return await this.handleSubmit();
        } else if (result.reason === 'cancel' || result.action === 'cancel') {
            if (this.options.onCancel) {
                this.options.onCancel();
            }
            throw new Error('User cancelled');
        } else {
            throw new Error('Modal closed');
        }
    }
    
    /**
     * Handle form submission
     * @returns {Promise} Promise that resolves with submission result
     */
    async handleSubmit() {
        if (this.isSubmitting || !this.form) return;
        
        try {
            this.isSubmitting = true;
            this.setSubmitButtonLoading(true);
            
            // Validate form
            if (this.validator && !this.validator.validateForm(this.form)) {
                throw new Error('表单验证失败，请检查输入内容');
            }
            
            // Get form data
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            
            // Additional validation
            this.validateFormData(data);
            
            // Submit data
            const result = await this.submitData(data);
            
            // Success callback
            if (this.options.onSuccess) {
                this.options.onSuccess(result, this.mode);
            }
            
            return result;
            
        } catch (error) {
            console.error('Form submission error:', error);
            
            // Show error message
            this.showSubmissionError(error.message || '提交失败，请重试');
            
            // Error callback
            if (this.options.onError) {
                this.options.onError(error, this.mode);
            }
            
            throw error;
            
        } finally {
            this.isSubmitting = false;
            this.setSubmitButtonLoading(false);
        }
    }
    
    /**
     * Validate form data
     * @param {Object} data - Form data
     */
    validateFormData(data) {
        const errors = [];
        
        // Required fields
        const requiredFields = ['accountName', 'accountNumber', 'accountType', 'accountHolder', 'paymentType', 'status', 'dailyLimit', 'singleLimit'];
        requiredFields.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                errors.push(`${this.getFieldLabel(field)}不能为空`);
            }
        });
        
        // Numeric validation
        const dailyLimit = parseFloat(data.dailyLimit);
        const singleLimit = parseFloat(data.singleLimit);
        
        if (isNaN(dailyLimit) || dailyLimit < 0) {
            errors.push('单日限额必须是有效的正数');
        }
        
        if (isNaN(singleLimit) || singleLimit < 0) {
            errors.push('单笔限额必须是有效的正数');
        }
        
        if (!isNaN(dailyLimit) && !isNaN(singleLimit) && singleLimit > dailyLimit) {
            errors.push('单笔限额不能超过单日限额');
        }
        
        // Account number validation
        if (data.accountNumber && !this.validateAccountNumber(data.accountNumber, data.accountType)) {
            errors.push('账户号码格式不正确');
        }
        
        if (errors.length > 0) {
            throw new Error(errors.join('；'));
        }
    }
    
    /**
     * Validate account number format
     * @param {string} accountNumber - Account number
     * @param {string} accountType - Account type
     * @returns {boolean} Whether valid
     */
    validateAccountNumber(accountNumber, accountType) {
        if (!accountNumber) return false;
        
        switch (accountType) {
            case 'alipay':
                // Email or phone number
                return /^[\w.-]+@[\w.-]+\.\w+$/.test(accountNumber) || /^1[3-9]\d{9}$/.test(accountNumber);
            case 'wechat':
                // WeChat ID format
                return /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/.test(accountNumber);
            case 'bank':
                // Bank card number (simplified)
                return /^\d{16,19}$/.test(accountNumber.replace(/\s/g, ''));
            default:
                return accountNumber.length >= 3;
        }
    }
    
    /**
     * Submit form data to API
     * @param {Object} data - Form data
     * @returns {Promise} Promise that resolves with API response
     */
    async submitData(data) {
        const url = this.mode === 'edit' 
            ? `${this.options.apiEndpoint}/${this.currentAccount.id}`
            : this.options.apiEndpoint;
            
        const method = this.mode === 'edit' ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Show field error
     * @param {HTMLElement} field - Field element
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        if (!field) return;
        
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        const feedback = document.getElementById(`${field.name}-error`);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }
    
    /**
     * Clear field error
     * @param {HTMLElement} field - Field element
     */
    clearFieldError(field) {
        if (!field) return;
        
        field.classList.remove('is-invalid');
        
        const feedback = document.getElementById(`${field.name}-error`);
        if (feedback) {
            feedback.textContent = '';
            feedback.style.display = 'none';
        }
    }
    
    /**
     * Show submission error
     * @param {string} message - Error message
     */
    showSubmissionError(message) {
        // Try to use toast component
        if (window.Toast) {
            window.Toast.error(message);
        } else {
            alert(message);
        }
    }
    
    /**
     * Set submit button loading state
     * @param {boolean} loading - Loading state
     */
    setSubmitButtonLoading(loading) {
        const submitBtn = document.querySelector('.modal-btn[data-action="submit"]');
        if (!submitBtn) return;
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-spinner"></span> 提交中...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = this.mode === 'edit' ? '保存更改' : '创建账户';
        }
    }
    
    /**
     * Get field label for error messages
     * @param {string} fieldName - Field name
     * @returns {string} Field label
     */
    getFieldLabel(fieldName) {
        const labels = {
            accountName: '账户名称',
            accountNumber: '账户号码',
            accountType: '账户类型',
            accountHolder: '账户持有人',
            paymentType: '支付类型',
            status: '账户状态',
            dailyLimit: '单日限额',
            singleLimit: '单笔限额',
            customPaymentProvider: '自定义支付提供商'
        };
        
        return labels[fieldName] || fieldName;
    }
    
    /**
     * Get custom validation rules
     * @returns {Object} Custom validation rules
     */
    getCustomValidationRules() {
        return {
            accountNumber: (value, element) => {
                const accountType = element.form.querySelector('#accountType')?.value;
                if (!accountType) return true;
                
                return this.validateAccountNumber(value, accountType);
            },
            currency: (value) => {
                return /^\d+(\.\d{1,2})?$/.test(value) && parseFloat(value) >= 0;
            }
        };
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Destroy the modal component
     */
    destroy() {
        if (this.validator) {
            this.validator.destroy();
        }
        
        this.modal = null;
        this.form = null;
        this.validator = null;
        this.currentAccount = null;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccountModal;
}

// Global registration
if (typeof window !== 'undefined') {
    window.AccountModal = AccountModal;
}