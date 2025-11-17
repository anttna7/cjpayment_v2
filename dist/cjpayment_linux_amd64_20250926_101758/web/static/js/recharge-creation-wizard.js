/**
 * CJPayment Recharge Creation Wizard
 * Enhanced multi-step recharge creation form with real-time validation and progress indicators
 */

window.CJRechargeCreationWizard = (function() {
    'use strict';

    // ==========================================================================
    // Recharge Creation Wizard Class
    // ==========================================================================

    class RechargeCreationWizard {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? CJUtils.$(container) : container;
            this.options = {
                autoSave: true,
                autoSaveInterval: 15000, // 15 seconds
                saveKey: 'recharge_creation_wizard',
                showProgress: true,
                animateTransitions: true,
                validateOnNext: true,
                enableSmartSuggestions: true,
                onStepChange: null,
                onComplete: null,
                onSave: null,
                onValidationError: null,
                ...options
            };

            this.currentStep = 1;
            this.totalSteps = 4;
            this.formData = {};
            this.validationErrors = {};
            this.merchants = [];
            this.receiveAccounts = [];
            this.autoSaveTimer = null;
            this.validationTimer = null;
            this.isSubmitting = false;

            this.init();
        }

        init() {
            this.createWizardStructure();
            this.bindEvents();
            this.loadMerchants();
            this.loadReceiveAccounts();
            this.setupAutoSave();
            this.loadSavedData();
            this.showStep(1);
            this.updateProgress();
            
            console.log('Recharge Creation Wizard initialized');
        }

        createWizardStructure() {
            this.container.innerHTML = `
                <div class="recharge-wizard">
                    <!-- Progress Indicator -->
                    <div class="wizard-progress" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="${this.totalSteps}">
                        <div class="wizard-progress__track">
                            <div class="wizard-progress__fill"></div>
                        </div>
                        <div class="wizard-steps">
                            <div class="wizard-step active" data-step="1">
                                <div class="wizard-step__indicator">
                                    <span class="wizard-step__number">1</span>
                                    <div class="wizard-step__status"></div>
                                </div>
                                <div class="wizard-step__content">
                                    <div class="wizard-step__title">选择充值类型</div>
                                    <div class="wizard-step__description">选择对私或对公充值</div>
                                </div>
                            </div>
                            <div class="wizard-step" data-step="2">
                                <div class="wizard-step__indicator">
                                    <span class="wizard-step__number">2</span>
                                    <div class="wizard-step__status"></div>
                                </div>
                                <div class="wizard-step__content">
                                    <div class="wizard-step__title">付款信息</div>
                                    <div class="wizard-step__description">填写付款人信息</div>
                                </div>
                            </div>
                            <div class="wizard-step" data-step="3">
                                <div class="wizard-step__indicator">
                                    <span class="wizard-step__number">3</span>
                                    <div class="wizard-step__status"></div>
                                </div>
                                <div class="wizard-step__content">
                                    <div class="wizard-step__title">充值详情</div>
                                    <div class="wizard-step__description">设置充值金额和商户</div>
                                </div>
                            </div>
                            <div class="wizard-step" data-step="4">
                                <div class="wizard-step__indicator">
                                    <span class="wizard-step__number">4</span>
                                    <div class="wizard-step__status"></div>
                                </div>
                                <div class="wizard-step__content">
                                    <div class="wizard-step__title">确认提交</div>
                                    <div class="wizard-step__description">检查信息并提交</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step Content -->
                    <div class="wizard-content">
                        <!-- Step 1: Type Selection -->
                        <div class="wizard-step-content active" data-step="1">
                            <div class="step-header">
                                <h3 class="step-title">选择充值类型</h3>
                                <p class="step-description">请选择适合的充值方式</p>
                            </div>
                            <div class="recharge-type-selection">
                                <div class="type-option" data-type="private">
                                    <div class="type-option__icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                    <div class="type-option__content">
                                        <h4 class="type-option__title">对私充值</h4>
                                        <p class="type-option__description">个人账户转账，需要上传付款凭证</p>
                                        <ul class="type-option__features">
                                            <li>✓ 支持个人银行卡转账</li>
                                            <li>✓ 需要上传付款凭证</li>
                                            <li>✓ 人工审核确认</li>
                                        </ul>
                                    </div>
                                    <div class="type-option__action">
                                        <button type="button" class="btn btn--primary">选择</button>
                                    </div>
                                </div>
                                <div class="type-option" data-type="public">
                                    <div class="type-option__icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 21h18"></path>
                                            <path d="M5 21V7l8-4v18"></path>
                                            <path d="M19 21V11l-6-4"></path>
                                        </svg>
                                    </div>
                                    <div class="type-option__content">
                                        <h4 class="type-option__title">对公充值</h4>
                                        <p class="type-option__description">企业账户转账，通过银行接口处理</p>
                                        <ul class="type-option__features">
                                            <li>✓ 支持企业对公账户</li>
                                            <li>✓ 银行接口自动处理</li>
                                            <li>✓ 快速到账确认</li>
                                        </ul>
                                    </div>
                                    <div class="type-option__action">
                                        <button type="button" class="btn btn--primary">选择</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Payer Information -->
                        <div class="wizard-step-content" data-step="2">
                            <div class="step-header">
                                <h3 class="step-title">付款信息</h3>
                                <p class="step-description">请填写付款人相关信息</p>
                            </div>
                            <form class="wizard-form">
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="payerName" class="form-label required">付款人姓名</label>
                                        <input type="text" id="payerName" name="payerName" class="form-input" 
                                               placeholder="请输入付款人姓名" required>
                                        <div class="form-feedback"></div>
                                        <div class="form-hint">请输入与银行账户一致的姓名</div>
                                    </div>
                                    <div class="form-group">
                                        <label for="payerPhone" class="form-label">联系电话</label>
                                        <input type="tel" id="payerPhone" name="payerPhone" class="form-input" 
                                               placeholder="请输入联系电话">
                                        <div class="form-feedback"></div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="payerAccount" class="form-label required">付款账号</label>
                                    <input type="text" id="payerAccount" name="payerAccount" class="form-input" 
                                           placeholder="请输入银行卡号或支付宝账号" required>
                                    <div class="form-feedback"></div>
                                    <div class="form-hint">支持银行卡号、支付宝账号等</div>
                                </div>
                                <div class="form-group" id="bankNameGroup" style="display: none;">
                                    <label for="bankName" class="form-label">开户银行</label>
                                    <input type="text" id="bankName" name="bankName" class="form-input" 
                                           placeholder="请输入开户银行名称">
                                    <div class="form-feedback"></div>
                                </div>
                            </form>
                        </div>

                        <!-- Step 3: Recharge Details -->
                        <div class="wizard-step-content" data-step="3">
                            <div class="step-header">
                                <h3 class="step-title">充值详情</h3>
                                <p class="step-description">设置充值金额和目标商户</p>
                            </div>
                            <form class="wizard-form">
                                <div class="form-group">
                                    <label for="amount" class="form-label required">充值金额</label>
                                    <div class="amount-input-group">
                                        <div class="amount-input-wrapper">
                                            <input type="number" id="amount" name="amount" class="form-input amount-input" 
                                                   placeholder="0.00" step="0.01" min="0.01" required>
                                            <span class="amount-currency">元</span>
                                        </div>
                                        <div class="amount-suggestions">
                                            <button type="button" class="amount-suggestion" data-amount="1000">1,000</button>
                                            <button type="button" class="amount-suggestion" data-amount="5000">5,000</button>
                                            <button type="button" class="amount-suggestion" data-amount="10000">10,000</button>
                                            <button type="button" class="amount-suggestion" data-amount="50000">50,000</button>
                                        </div>
                                    </div>
                                    <div class="form-feedback"></div>
                                    <div class="amount-info">
                                        <div class="amount-words" id="amountWords"></div>
                                        <div class="amount-limits">单笔限额：¥0.01 - ¥1,000,000</div>
                                    </div>
                                </div>
                                
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="merchantName" class="form-label required">商户名称</label>
                                        <div class="merchant-input-wrapper">
                                            <input type="text" id="merchantName" name="merchantName" class="form-input" 
                                                   placeholder="请输入或选择商户名称" autocomplete="off" required>
                                            <div class="merchant-suggestions" id="merchantSuggestions"></div>
                                        </div>
                                        <input type="hidden" id="merchantId" name="merchantId">
                                        <div class="form-feedback"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="receiveAccount" class="form-label required">收款账户</label>
                                        <select id="receiveAccount" name="receiveAccount" class="form-select" required>
                                            <option value="">请选择收款账户</option>
                                        </select>
                                        <div class="form-feedback"></div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="adAccount" class="form-label required">广告账户</label>
                                    <input type="text" id="adAccount" name="adAccount" class="form-input" 
                                           placeholder="请输入广告账户名称" required>
                                    <div class="form-feedback"></div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="remark" class="form-label">备注信息</label>
                                    <textarea id="remark" name="remark" class="form-textarea" rows="3" 
                                              placeholder="请输入备注信息（可选）" maxlength="500"></textarea>
                                    <div class="form-feedback"></div>
                                    <div class="form-hint">
                                        <span class="char-count">0</span>/500 字符
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- Step 4: Confirmation -->
                        <div class="wizard-step-content" data-step="4">
                            <div class="step-header">
                                <h3 class="step-title">确认提交</h3>
                                <p class="step-description">请仔细检查以下信息，确认无误后提交</p>
                            </div>
                            <div class="confirmation-summary">
                                <div class="summary-section">
                                    <h4 class="summary-title">充值类型</h4>
                                    <div class="summary-content">
                                        <div class="summary-item">
                                            <span class="summary-label">类型：</span>
                                            <span class="summary-value" id="summaryType"></span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <h4 class="summary-title">付款信息</h4>
                                    <div class="summary-content">
                                        <div class="summary-item">
                                            <span class="summary-label">付款人：</span>
                                            <span class="summary-value" id="summaryPayerName"></span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">付款账号：</span>
                                            <span class="summary-value" id="summaryPayerAccount"></span>
                                        </div>
                                        <div class="summary-item" id="summaryBankNameItem" style="display: none;">
                                            <span class="summary-label">开户银行：</span>
                                            <span class="summary-value" id="summaryBankName"></span>
                                        </div>
                                        <div class="summary-item" id="summaryPayerPhoneItem" style="display: none;">
                                            <span class="summary-label">联系电话：</span>
                                            <span class="summary-value" id="summaryPayerPhone"></span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="summary-section">
                                    <h4 class="summary-title">充值详情</h4>
                                    <div class="summary-content">
                                        <div class="summary-item highlight">
                                            <span class="summary-label">充值金额：</span>
                                            <span class="summary-value amount" id="summaryAmount"></span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">商户名称：</span>
                                            <span class="summary-value" id="summaryMerchantName"></span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">收款账户：</span>
                                            <span class="summary-value" id="summaryReceiveAccount"></span>
                                        </div>
                                        <div class="summary-item">
                                            <span class="summary-label">广告账户：</span>
                                            <span class="summary-value" id="summaryAdAccount"></span>
                                        </div>
                                        <div class="summary-item" id="summaryRemarkItem" style="display: none;">
                                            <span class="summary-label">备注信息：</span>
                                            <span class="summary-value" id="summaryRemark"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="confirmation-notice">
                                <div class="notice-icon">⚠️</div>
                                <div class="notice-content">
                                    <p><strong>重要提醒：</strong></p>
                                    <ul>
                                        <li>请确保付款信息准确无误，提交后无法修改</li>
                                        <li>对私充值需要上传付款凭证，请准备好相关材料</li>
                                        <li>充值订单提交后将进入审核流程，请耐心等待</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <div class="wizard-navigation">
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
                            <span class="btn__text">提交订单</span>
                            <span class="btn__loading" style="display: none;">
                                <span class="spinner"></span>
                                提交中...
                            </span>
                        </button>
                    </div>

                    <!-- Auto-save Indicator -->
                    <div class="wizard-save-indicator" style="display: none;">
                        <span class="save-icon">💾</span>
                        <span class="save-text">已自动保存</span>
                    </div>
                </div>
            `;

            // Cache DOM elements
            this.progressBar = this.container.querySelector('.wizard-progress__fill');
            this.stepIndicators = this.container.querySelectorAll('.wizard-step');
            this.stepContents = this.container.querySelectorAll('.wizard-step-content');
            this.prevBtn = this.container.querySelector('.wizard-btn-prev');
            this.nextBtn = this.container.querySelector('.wizard-btn-next');
            this.submitBtn = this.container.querySelector('.wizard-btn-submit');
            this.stepInfo = this.container.querySelector('.wizard-step-info');
            this.saveIndicator = this.container.querySelector('.wizard-save-indicator');
        }

        bindEvents() {
            // Navigation buttons
            CJUtils.on(this.prevBtn, 'click', () => this.prevStep());
            CJUtils.on(this.nextBtn, 'click', () => this.nextStep());
            CJUtils.on(this.submitBtn, 'click', () => this.submit());

            // Type selection
            CJUtils.on(this.container, 'click', (e) => {
                const typeOption = e.target.closest('.type-option');
                if (typeOption) {
                    this.selectRechargeType(typeOption.dataset.type);
                }
            });

            // Amount suggestions
            CJUtils.on(this.container, 'click', (e) => {
                const suggestion = e.target.closest('.amount-suggestion');
                if (suggestion) {
                    const amount = suggestion.dataset.amount;
                    const amountInput = this.container.querySelector('#amount');
                    amountInput.value = amount;
                    this.updateAmountWords(amount);
                    this.validateField(amountInput);
                }
            });

            // Form inputs
            CJUtils.on(this.container, 'input', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.handleInputChange(e.target);
                }
            });

            // Merchant search
            const merchantInput = this.container.querySelector('#merchantName');
            if (merchantInput) {
                CJUtils.on(merchantInput, 'input', CJUtils.debounce((e) => {
                    this.handleMerchantSearch(e.target.value);
                }, 300));

                CJUtils.on(merchantInput, 'blur', () => {
                    setTimeout(() => this.hideMerchantSuggestions(), 200);
                });
            }

            // Merchant suggestions
            CJUtils.on(this.container, 'click', (e) => {
                const suggestion = e.target.closest('.merchant-suggestion');
                if (suggestion) {
                    this.selectMerchant(suggestion.dataset);
                }
            });

            // Character count for textarea
            const remarkTextarea = this.container.querySelector('#remark');
            if (remarkTextarea) {
                CJUtils.on(remarkTextarea, 'input', (e) => {
                    this.updateCharCount(e.target);
                });
            }

            // Keyboard navigation
            CJUtils.on(this.container, 'keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });

            // Progress step clicks
            CJUtils.on(this.container, 'click', (e) => {
                const stepIndicator = e.target.closest('.wizard-step');
                if (stepIndicator && stepIndicator.classList.contains('completed')) {
                    const step = parseInt(stepIndicator.dataset.step);
                    this.goToStep(step);
                }
            });
        }

        selectRechargeType(type) {
            // Update form data
            this.formData.type = type;

            // Update UI
            const typeOptions = this.container.querySelectorAll('.type-option');
            typeOptions.forEach(option => {
                if (option.dataset.type === type) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });

            // Show/hide bank name field based on type
            const bankNameGroup = this.container.querySelector('#bankNameGroup');
            if (type === 'private') {
                bankNameGroup.style.display = 'block';
                this.container.querySelector('#bankName').required = true;
            } else {
                bankNameGroup.style.display = 'none';
                this.container.querySelector('#bankName').required = false;
            }

            // Enable next button
            this.nextBtn.disabled = false;
            this.markStepValid(1);
        }

        handleInputChange(input) {
            // Update form data
            this.formData[input.name] = input.value;

            // Real-time validation
            clearTimeout(this.validationTimer);
            this.validationTimer = setTimeout(() => {
                this.validateField(input);
                this.updateNavigationState();
            }, 300);

            // Special handling for amount input
            if (input.name === 'amount') {
                this.updateAmountWords(input.value);
            }

            // Auto-save
            this.scheduleAutoSave();
        }

        validateField(field) {
            const value = field.value.trim();
            const fieldName = field.name;
            let isValid = true;
            let errorMessage = '';

            // Clear previous validation state
            field.classList.remove('is-valid', 'is-invalid');
            this.clearFieldError(fieldName);

            // Required field validation
            if (field.required && !value) {
                isValid = false;
                errorMessage = '此字段为必填项';
            } else if (value) {
                // Type-specific validation
                switch (field.type) {
                    case 'email':
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            isValid = false;
                            errorMessage = '请输入有效的邮箱地址';
                        }
                        break;

                    case 'tel':
                        const phoneRegex = /^1[3-9]\d{9}$/;
                        if (!phoneRegex.test(value)) {
                            isValid = false;
                            errorMessage = '请输入有效的手机号码';
                        }
                        break;

                    case 'number':
                        const num = parseFloat(value);
                        const min = parseFloat(field.min);
                        const max = parseFloat(field.max);

                        if (isNaN(num)) {
                            isValid = false;
                            errorMessage = '请输入有效的数字';
                        } else if (!isNaN(min) && num < min) {
                            isValid = false;
                            errorMessage = `数值不能小于 ${min}`;
                        } else if (!isNaN(max) && num > max) {
                            isValid = false;
                            errorMessage = `数值不能大于 ${max}`;
                        }
                        break;
                }

                // Custom validation for specific fields
                if (isValid) {
                    switch (fieldName) {
                        case 'payerAccount':
                            if (value.length < 6) {
                                isValid = false;
                                errorMessage = '账号长度不能少于6位';
                            }
                            break;

                        case 'amount':
                            const amount = parseFloat(value);
                            if (amount > 1000000) {
                                isValid = false;
                                errorMessage = '单笔充值金额不能超过100万元';
                            } else if (amount < 0.01) {
                                isValid = false;
                                errorMessage = '充值金额不能少于0.01元';
                            }
                            break;
                    }
                }
            }

            // Update validation state
            if (isValid) {
                field.classList.add('is-valid');
                delete this.validationErrors[fieldName];
            } else {
                field.classList.add('is-invalid');
                this.validationErrors[fieldName] = errorMessage;
                this.showFieldError(fieldName, errorMessage);
            }

            return isValid;
        }

        showFieldError(fieldName, message) {
            const field = this.container.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const formGroup = field.closest('.form-group');
            if (!formGroup) return;

            let feedback = formGroup.querySelector('.form-feedback');
            if (!feedback) {
                feedback = document.createElement('div');
                feedback.className = 'form-feedback';
                field.parentNode.insertBefore(feedback, field.nextSibling);
            }

            feedback.textContent = message;
            feedback.className = 'form-feedback form-feedback--invalid';
        }

        clearFieldError(fieldName) {
            const field = this.container.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const formGroup = field.closest('.form-group');
            if (!formGroup) return;

            const feedback = formGroup.querySelector('.form-feedback');
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'form-feedback';
            }
        }

        updateAmountWords(amount) {
            const amountWords = this.container.querySelector('#amountWords');
            if (!amountWords) return;

            const num = parseFloat(amount);
            if (isNaN(num) || num <= 0) {
                amountWords.textContent = '';
                return;
            }

            // Convert number to Chinese words (simplified version)
            const words = this.numberToChinese(num);
            amountWords.textContent = `大写：${words}`;
        }

        numberToChinese(num) {
            const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
            const units = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿'];
            
            if (num === 0) return '零元整';
            
            const integerPart = Math.floor(num);
            const decimalPart = Math.round((num - integerPart) * 100);
            
            let result = '';
            let intStr = integerPart.toString();
            
            // Convert integer part
            for (let i = 0; i < intStr.length; i++) {
                const digit = parseInt(intStr[i]);
                const unitIndex = intStr.length - i - 1;
                
                if (digit !== 0) {
                    result += digits[digit] + units[unitIndex];
                } else if (result && !result.endsWith('零')) {
                    result += '零';
                }
            }
            
            result += '元';
            
            // Convert decimal part
            if (decimalPart > 0) {
                const jiao = Math.floor(decimalPart / 10);
                const fen = decimalPart % 10;
                
                if (jiao > 0) {
                    result += digits[jiao] + '角';
                }
                if (fen > 0) {
                    result += digits[fen] + '分';
                }
            } else {
                result += '整';
            }
            
            return result;
        }

        handleMerchantSearch(query) {
            if (!query || query.length < 2) {
                this.hideMerchantSuggestions();
                return;
            }

            const suggestions = this.merchants.filter(merchant => 
                merchant.name.toLowerCase().includes(query.toLowerCase()) ||
                merchant.code.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 10);

            this.showMerchantSuggestions(suggestions);
        }

        showMerchantSuggestions(suggestions) {
            const suggestionsContainer = this.container.querySelector('#merchantSuggestions');
            if (!suggestionsContainer) return;

            if (suggestions.length === 0) {
                this.hideMerchantSuggestions();
                return;
            }

            const html = suggestions.map(merchant => `
                <div class="merchant-suggestion" 
                     data-id="${merchant.id}" 
                     data-name="${merchant.name}" 
                     data-code="${merchant.code}">
                    <div class="merchant-suggestion__name">${merchant.name}</div>
                    <div class="merchant-suggestion__code">${merchant.code}</div>
                </div>
            `).join('');

            suggestionsContainer.innerHTML = html;
            suggestionsContainer.classList.add('show');
        }

        hideMerchantSuggestions() {
            const suggestionsContainer = this.container.querySelector('#merchantSuggestions');
            if (suggestionsContainer) {
                suggestionsContainer.classList.remove('show');
            }
        }

        selectMerchant(merchantData) {
            const merchantInput = this.container.querySelector('#merchantName');
            const merchantIdInput = this.container.querySelector('#merchantId');

            merchantInput.value = merchantData.name;
            merchantIdInput.value = merchantData.id;

            this.formData.merchantName = merchantData.name;
            this.formData.merchantId = merchantData.id;

            this.hideMerchantSuggestions();
            this.validateField(merchantInput);
            this.loadReceiveAccountsForMerchant(merchantData.id);
        }

        updateCharCount(textarea) {
            const charCount = this.container.querySelector('.char-count');
            if (charCount) {
                charCount.textContent = textarea.value.length;
            }
        }

        handleKeyboardNavigation(e) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prevStep();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextStep();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (this.currentStep === this.totalSteps) {
                            this.submit();
                        } else {
                            this.nextStep();
                        }
                        break;
                }
            }
        }

        showStep(stepNumber) {
            if (stepNumber < 1 || stepNumber > this.totalSteps) return false;

            // Hide all step contents
            this.stepContents.forEach(content => {
                content.classList.remove('active');
            });

            // Show current step content
            const currentContent = this.container.querySelector(`[data-step="${stepNumber}"]`);
            if (currentContent) {
                currentContent.classList.add('active');
                
                if (this.options.animateTransitions) {
                    this.animateStepTransition(currentContent);
                }
            }

            this.currentStep = stepNumber;
            this.updateProgress();
            this.updateNavigationState();

            // Focus first input in step
            setTimeout(() => {
                const firstInput = currentContent?.querySelector('input, select, textarea');
                if (firstInput && !firstInput.disabled) {
                    firstInput.focus();
                }
            }, 100);

            // Update summary if on confirmation step
            if (stepNumber === 4) {
                this.updateConfirmationSummary();
            }

            // Trigger callback
            if (this.options.onStepChange) {
                this.options.onStepChange(stepNumber, this.formData);
            }

            return true;
        }

        animateStepTransition(element) {
            element.style.opacity = '0';
            element.style.transform = 'translateX(20px)';
            element.style.transition = 'all 0.3s ease-out';

            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateX(0)';
            });
        }

        updateProgress() {
            const progress = (this.currentStep / this.totalSteps) * 100;
            this.progressBar.style.width = `${progress}%`;

            // Update progress bar aria attributes
            const progressContainer = this.container.querySelector('.wizard-progress');
            progressContainer.setAttribute('aria-valuenow', this.currentStep);

            // Update step indicators
            this.stepIndicators.forEach((indicator, index) => {
                const stepNum = index + 1;
                indicator.classList.remove('active', 'completed');

                if (stepNum < this.currentStep) {
                    indicator.classList.add('completed');
                } else if (stepNum === this.currentStep) {
                    indicator.classList.add('active');
                }
            });

            // Update step info
            this.stepInfo.querySelector('.wizard-current-step').textContent = this.currentStep;
        }

        updateNavigationState() {
            // Update previous button
            this.prevBtn.disabled = this.currentStep === 1;

            // Update next/submit button
            if (this.currentStep === this.totalSteps) {
                this.nextBtn.style.display = 'none';
                this.submitBtn.style.display = 'inline-flex';
                this.submitBtn.disabled = !this.isFormValid();
            } else {
                this.nextBtn.style.display = 'inline-flex';
                this.submitBtn.style.display = 'none';
                this.nextBtn.disabled = !this.isCurrentStepValid();
            }
        }

        isCurrentStepValid() {
            switch (this.currentStep) {
                case 1:
                    return !!this.formData.type;
                case 2:
                    return this.validateStepFields(2);
                case 3:
                    return this.validateStepFields(3);
                case 4:
                    return this.isFormValid();
                default:
                    return false;
            }
        }

        validateStepFields(stepNumber) {
            const stepContent = this.container.querySelector(`[data-step="${stepNumber}"]`);
            if (!stepContent) return false;

            const requiredFields = stepContent.querySelectorAll('input[required], select[required], textarea[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            return isValid && Object.keys(this.validationErrors).length === 0;
        }

        isFormValid() {
            return this.formData.type &&
                   this.formData.payerName &&
                   this.formData.payerAccount &&
                   this.formData.amount &&
                   this.formData.merchantId &&
                   this.formData.receiveAccount &&
                   this.formData.adAccount &&
                   Object.keys(this.validationErrors).length === 0;
        }

        markStepValid(stepNumber) {
            const stepIndicator = this.stepIndicators[stepNumber - 1];
            if (stepIndicator) {
                stepIndicator.classList.add('valid');
            }
        }

        nextStep() {
            if (!this.isCurrentStepValid()) {
                this.showStepValidationErrors();
                return false;
            }

            this.markStepValid(this.currentStep);

            if (this.currentStep < this.totalSteps) {
                this.showStep(this.currentStep + 1);
                this.scheduleAutoSave();
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
            
            // Only allow going to completed steps or the next step
            if (stepNumber > this.currentStep + 1) return false;
            
            this.showStep(stepNumber);
            return true;
        }

        showStepValidationErrors() {
            const stepContent = this.container.querySelector(`[data-step="${this.currentStep}"]`);
            if (!stepContent) return;

            const invalidFields = stepContent.querySelectorAll('.is-invalid');
            if (invalidFields.length > 0) {
                invalidFields[0].focus();
                invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Trigger validation error callback
            if (this.options.onValidationError) {
                this.options.onValidationError(this.currentStep, this.validationErrors);
            }
        }

        updateConfirmationSummary() {
            // Update type
            const typeText = this.formData.type === 'private' ? '对私充值' : '对公充值';
            this.container.querySelector('#summaryType').textContent = typeText;

            // Update payer info
            this.container.querySelector('#summaryPayerName').textContent = this.formData.payerName || '';
            this.container.querySelector('#summaryPayerAccount').textContent = this.maskAccount(this.formData.payerAccount || '');

            // Show/hide optional fields
            if (this.formData.bankName) {
                this.container.querySelector('#summaryBankName').textContent = this.formData.bankName;
                this.container.querySelector('#summaryBankNameItem').style.display = 'flex';
            }

            if (this.formData.payerPhone) {
                this.container.querySelector('#summaryPayerPhone').textContent = this.formData.payerPhone;
                this.container.querySelector('#summaryPayerPhoneItem').style.display = 'flex';
            }

            // Update recharge details
            this.container.querySelector('#summaryAmount').textContent = `¥${CJUtils.formatNumber(this.formData.amount, 2)}`;
            this.container.querySelector('#summaryMerchantName').textContent = this.formData.merchantName || '';
            
            const receiveAccountSelect = this.container.querySelector('#receiveAccount');
            const selectedOption = receiveAccountSelect.options[receiveAccountSelect.selectedIndex];
            this.container.querySelector('#summaryReceiveAccount').textContent = selectedOption?.text || '';
            
            this.container.querySelector('#summaryAdAccount').textContent = this.formData.adAccount || '';

            if (this.formData.remark) {
                this.container.querySelector('#summaryRemark').textContent = this.formData.remark;
                this.container.querySelector('#summaryRemarkItem').style.display = 'flex';
            }
        }

        maskAccount(account) {
            if (!account || account.length < 6) return account;
            
            const start = account.substring(0, 3);
            const end = account.substring(account.length - 3);
            const middle = '*'.repeat(Math.min(account.length - 6, 8));
            
            return start + middle + end;
        }

        async loadMerchants() {
            try {
                const response = await CJApi.get('/api/merchants');
                if (response.success) {
                    this.merchants = response.data.merchants || [];
                }
            } catch (error) {
                console.error('Failed to load merchants:', error);
            }
        }

        async loadReceiveAccounts() {
            try {
                const response = await CJApi.get('/api/receive-accounts');
                if (response.success) {
                    this.receiveAccounts = response.data.accounts || [];
                    this.updateReceiveAccountOptions();
                }
            } catch (error) {
                console.error('Failed to load receive accounts:', error);
            }
        }

        async loadReceiveAccountsForMerchant(merchantId) {
            try {
                const response = await CJApi.get(`/api/merchants/${merchantId}/receive-accounts`);
                if (response.success) {
                    const accounts = response.data.accounts || [];
                    this.updateReceiveAccountOptions(accounts);
                }
            } catch (error) {
                console.error('Failed to load merchant receive accounts:', error);
                // Fallback to all accounts
                this.updateReceiveAccountOptions();
            }
        }

        updateReceiveAccountOptions(accounts = null) {
            const select = this.container.querySelector('#receiveAccount');
            if (!select) return;

            const accountsToShow = accounts || this.receiveAccounts;
            
            select.innerHTML = '<option value="">请选择收款账户</option>';
            
            accountsToShow.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.accountName} (${this.maskAccount(account.accountNumber)})`;
                select.appendChild(option);
            });
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

        scheduleAutoSave() {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                this.saveFormData();
            }, 2000);
        }

        saveFormData() {
            if (!this.options.autoSave) return;

            const saveData = {
                currentStep: this.currentStep,
                formData: { ...this.formData },
                timestamp: Date.now()
            };

            try {
                localStorage.setItem(this.options.saveKey, JSON.stringify(saveData));
                this.showSaveIndicator();

                // Trigger save callback
                if (this.options.onSave) {
                    this.options.onSave(saveData);
                }
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
                        this.formData = { ...data.formData };
                        this.restoreFormData();

                        // Ask user if they want to continue from saved step
                        if (data.currentStep > 1) {
                            const shouldRestore = confirm('检测到未完成的充值订单，是否继续填写？');
                            if (shouldRestore) {
                                this.currentStep = data.currentStep;
                            }
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

        restoreFormData() {
            Object.keys(this.formData).forEach(key => {
                const element = this.container.querySelector(`[name="${key}"]`);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = this.formData[key];
                    } else if (element.type === 'radio') {
                        element.checked = element.value === this.formData[key];
                    } else {
                        element.value = this.formData[key];
                    }

                    // Trigger input event
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            // Restore type selection
            if (this.formData.type) {
                this.selectRechargeType(this.formData.type);
            }
        }

        showSaveIndicator() {
            this.saveIndicator.style.display = 'flex';
            this.saveIndicator.style.opacity = '1';

            setTimeout(() => {
                this.saveIndicator.style.opacity = '0';
                setTimeout(() => {
                    this.saveIndicator.style.display = 'none';
                }, 300);
            }, 2000);
        }

        async submit() {
            if (this.isSubmitting) return false;

            if (!this.isFormValid()) {
                this.showStepValidationErrors();
                return false;
            }

            this.isSubmitting = true;
            this.updateSubmitButtonState(true);

            try {
                const response = await CJApi.post('/api/recharge/orders', this.formData);

                if (response.success) {
                    // Clear saved data
                    if (this.options.autoSave) {
                        localStorage.removeItem(this.options.saveKey);
                    }

                    // Show success message
                    CJComponents.toast.success('充值订单创建成功！');

                    // Trigger complete callback
                    if (this.options.onComplete) {
                        this.options.onComplete(response.data);
                    }

                    // Reset form or redirect
                    setTimeout(() => {
                        this.reset();
                    }, 2000);

                    return true;
                } else {
                    CJComponents.toast.error(response.message || '创建订单失败');
                    return false;
                }
            } catch (error) {
                console.error('Submit error:', error);
                CJComponents.toast.error('网络错误，请稍后重试');
                return false;
            } finally {
                this.isSubmitting = false;
                this.updateSubmitButtonState(false);
            }
        }

        updateSubmitButtonState(isLoading) {
            const btnText = this.submitBtn.querySelector('.btn__text');
            const btnLoading = this.submitBtn.querySelector('.btn__loading');

            if (isLoading) {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-flex';
                this.submitBtn.disabled = true;
            } else {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                this.submitBtn.disabled = false;
            }
        }

        reset() {
            // Reset form data
            this.formData = {};
            this.validationErrors = {};

            // Reset form elements
            this.container.querySelectorAll('input, select, textarea').forEach(element => {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    element.checked = false;
                } else {
                    element.value = '';
                }
                element.classList.remove('is-valid', 'is-invalid');
            });

            // Clear validation messages
            this.container.querySelectorAll('.form-feedback').forEach(feedback => {
                feedback.textContent = '';
                feedback.className = 'form-feedback';
            });

            // Reset type selection
            this.container.querySelectorAll('.type-option').forEach(option => {
                option.classList.remove('selected');
            });

            // Reset step indicators
            this.stepIndicators.forEach(indicator => {
                indicator.classList.remove('active', 'completed', 'valid');
            });

            // Go to first step
            this.currentStep = 1;
            this.showStep(1);

            // Clear saved data
            if (this.options.autoSave) {
                localStorage.removeItem(this.options.saveKey);
            }
        }

        destroy() {
            // Clear timers
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer);
            }
            if (this.validationTimer) {
                clearTimeout(this.validationTimer);
            }

            // Remove event listeners (handled by CJUtils.on cleanup)
            
            // Clear saved data
            if (this.options.autoSave) {
                localStorage.removeItem(this.options.saveKey);
            }
        }
    }

    // ==========================================================================
    // Public API
    // ==========================================================================

    return {
        create: function(container, options) {
            return new RechargeCreationWizard(container, options);
        }
    };

})();