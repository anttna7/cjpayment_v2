// Private Recharge JavaScript
class PrivateRechargeApp {
    constructor() {
        this.currentStep = 1;
        this.currentOrder = null;
        this.merchants = [];
        this.formAutoSave = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMerchants();
        this.initializeFormAutoSave();
        this.initializeValidation();
        this.initializeKeyboardShortcuts();
        this.optimizePerformance();
    }

    bindEvents() {
        // Form submission with enhanced feedback
        document.getElementById('rechargeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validator.validateAll()) {
                this.createRechargeOrder();
            } else {
                CJComponents.feedback.showError('请检查表单中的错误信息');
                this.validator.focusFirstError();
            }
        });

        // Voucher form submission
        document.getElementById('voucherForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadVoucher();
        });

        // Merchant name input handling (now handled by autocomplete)
        const merchantInput = document.getElementById('merchantName');
        merchantInput.addEventListener('input', (e) => {
            // Clear merchant ID when input changes
            if (!e.target.value.trim()) {
                document.getElementById('merchantId').value = '';
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group')) {
                this.hideMerchantSuggestions();
            }
        });

        // Enhanced file upload handling
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('voucherFile');

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    initializeFormAutoSave() {
        // Create auto-save indicator
        this.createAutoSaveIndicator();

        // Enable auto-save for the recharge form
        this.formAutoSave = CJUtils.enableFormAutoSave('#rechargeForm', 'private_recharge', {
            interval: 3000, // Save every 3 seconds
            onSave: (data) => {
                this.showAutoSaveIndicator('表单已自动保存');
                console.log('Form data auto-saved:', data);
            },
            onRestore: (data) => {
                CJComponents.feedback.showSuccess('已恢复之前填写的表单数据', {
                    duration: 4000
                });
                // Trigger merchant search if merchant name was restored
                if (data.merchant_name) {
                    setTimeout(() => {
                        this.loadMerchantById(data.merchant_id);
                    }, 500);
                }
            }
        });
    }

    createAutoSaveIndicator() {
        if (document.getElementById('autoSaveIndicator')) return;

        const indicator = document.createElement('div');
        indicator.id = 'autoSaveIndicator';
        indicator.className = 'form-auto-save-indicator';
        indicator.textContent = '表单已自动保存';
        document.body.appendChild(indicator);
    }

    showAutoSaveIndicator(message) {
        const indicator = document.getElementById('autoSaveIndicator');
        if (!indicator) return;

        indicator.textContent = message;
        indicator.classList.add('show');

        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    async loadMerchantById(merchantId) {
        if (!merchantId) return;

        const merchant = this.merchants.find(m => m.id === merchantId);
        if (merchant) {
            document.getElementById('merchantName').value = merchant.name;
            document.getElementById('merchantId').value = merchant.id;
        }
    }

    initializeValidation() {
        // Create smart validator for the form
        this.validator = CJFormEnhancements.createValidator('#rechargeForm', {
            validateOnBlur: true,
            validateOnInput: false,
            showSuccessIcon: true,
            showErrorIcon: true
        });

        // Add validation rules
        this.validator.addField('#payerName', [
            CJComponents.validation.rules.required,
            CJComponents.validation.rules.minLength(2),
            CJComponents.validation.rules.maxLength(50)
        ]);

        this.validator.addField('#payerAccount', [
            CJComponents.validation.rules.required,
            CJComponents.validation.rules.minLength(5),
            CJComponents.validation.rules.maxLength(30)
        ]);

        this.validator.addField('#amount', [
            CJComponents.validation.rules.required,
            CJComponents.validation.rules.decimal,
            (value) => parseFloat(value) > 0 || '金额必须大于0',
            (value) => parseFloat(value) <= 1000000 || '单笔金额不能超过100万'
        ]);

        this.validator.addField('#merchantName', [
            CJComponents.validation.rules.required,
            (value) => {
                const merchantId = document.getElementById('merchantId').value;
                return merchantId ? true : '请从下拉列表中选择有效的商户';
            }
        ]);

        this.validator.addField('#adAccount', [
            CJComponents.validation.rules.required,
            CJComponents.validation.rules.minLength(2),
            CJComponents.validation.rules.maxLength(100)
        ]);

        // Initialize merchant autocomplete
        this.initializeMerchantAutoComplete();
    }

    initializeMerchantAutoComplete() {
        this.merchantAutoComplete = CJFormEnhancements.createAutoComplete('#merchantName', {
            minLength: 1,
            maxResults: 8,
            delay: 200,
            source: (query) => {
                return this.merchants.filter(merchant =>
                    merchant.name.toLowerCase().includes(query.toLowerCase())
                ).map(merchant => ({
                    text: merchant.name,
                    value: merchant.name,
                    data: merchant
                }));
            },
            template: (item) => {
                return `
                    <div style="padding: 4px 0;">
                        <div style="font-weight: 500;">${CJUtils.escapeHtml(item.data.name)}</div>
                        <div style="font-size: 12px; color: #666;">ID: ${item.data.id}</div>
                    </div>
                `;
            },
            onSelect: (item) => {
                document.getElementById('merchantId').value = item.data.id;
                // Trigger validation
                this.validator.validateField(document.getElementById('merchantName'));
            }
        });
    }

    initializeKeyboardShortcuts() {
        // Initialize keyboard shortcuts
        CJUtils.shortcuts.init();

        // Register shortcuts
        CJUtils.shortcuts.register('ctrl+s', (e) => {
            if (this.currentStep === 1) {
                document.getElementById('rechargeForm').dispatchEvent(new Event('submit'));
            }
        }, { description: '提交充值表单' });

        CJUtils.shortcuts.register('ctrl+r', (e) => {
            if (this.currentStep === 4) {
                this.createNewOrder();
            }
        }, { description: '创建新订单' });

        CJUtils.shortcuts.register('escape', (e) => {
            this.hideMerchantSuggestions();
        }, { description: '关闭下拉菜单' });

        // Step navigation shortcuts
        CJUtils.shortcuts.register('ctrl+1', () => this.goToStep(1), { description: '跳转到第一步' });
        CJUtils.shortcuts.register('ctrl+2', () => this.goToStep(2), { description: '跳转到第二步' });
        CJUtils.shortcuts.register('ctrl+3', () => this.goToStep(3), { description: '跳转到第三步' });
        CJUtils.shortcuts.register('ctrl+4', () => this.goToStep(4), { description: '跳转到第四步' });
    }

    optimizePerformance() {
        // Preload critical resources
        CJUtils.preloadResources([
            '/static/css/private_recharge.css'
        ], 'style');

        // Lazy load images if any
        CJUtils.lazyLoadImages();

        // Throttle scroll events if needed
        const throttledScroll = CJUtils.throttle(() => {
            // Handle scroll events if needed
        }, 100);
        
        window.addEventListener('scroll', throttledScroll);
    }

    async loadMerchants() {
        try {
            const response = await fetch('/api/v1/merchants');
            if (response.ok) {
                const data = await response.json();
                this.merchants = data.data || [];
            }
        } catch (error) {
            console.error('Failed to load merchants:', error);
        }
    }

    handleMerchantSearch(query) {
        const suggestions = document.getElementById('merchantSuggestions');
        
        if (!query.trim()) {
            this.hideMerchantSuggestions();
            return;
        }

        const filteredMerchants = this.merchants.filter(merchant =>
            merchant.name.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredMerchants.length > 0) {
            suggestions.innerHTML = filteredMerchants
                .slice(0, 5) // Show max 5 suggestions
                .map(merchant => `
                    <div class="suggestion-item" data-merchant-id="${merchant.id}" data-merchant-name="${merchant.name}">
                        ${merchant.name}
                    </div>
                `).join('');

            // Add click handlers
            suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.getElementById('merchantName').value = item.dataset.merchantName;
                    document.getElementById('merchantId').value = item.dataset.merchantId;
                    this.hideMerchantSuggestions();
                });
            });

            suggestions.style.display = 'block';
        } else {
            this.hideMerchantSuggestions();
        }
    }

    hideMerchantSuggestions() {
        document.getElementById('merchantSuggestions').style.display = 'none';
    }

    async createRechargeOrder() {
        const formData = new FormData(document.getElementById('rechargeForm'));
        const merchantId = document.getElementById('merchantId').value;

        if (!merchantId) {
            CJComponents.feedback.showError('请选择有效的商户名称');
            return;
        }

        const orderData = {
            payer_name: formData.get('payer_name'),
            payer_account: formData.get('payer_account'),
            payment_type: 'private',
            amount: parseFloat(formData.get('amount')),
            merchant_id: merchantId,
            ad_account: formData.get('ad_account'),
            remark: formData.get('remark') || null
        };

        // Show progress
        CJUtils.showProgress(10, '正在创建订单...');
        CJComponents.loading.show('正在创建订单，请稍候...');

        try {
            CJUtils.showProgress(30, '发送请求中...');
            
            const response = await fetch('/api/v1/recharge/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            CJUtils.showProgress(60, '处理响应中...');
            const result = await response.json();

            if (response.ok && result.success) {
                CJUtils.showProgress(80, '加载收款信息...');
                this.currentOrder = result.data;
                await this.loadReceiveInfo();
                
                CJUtils.showProgress(100, '完成');
                CJComponents.feedback.showSuccess('订单创建成功！');
                this.goToStep(2);
            } else {
                CJComponents.feedback.showError(result.details || result.error || '创建订单失败');
            }
        } catch (error) {
            CJComponents.feedback.showError('网络错误，请稍后重试');
            console.error('Create order error:', error);
        } finally {
            CJComponents.loading.hide();
        }
    }

    async loadReceiveInfo() {
        if (!this.currentOrder) return;

        try {
            const response = await fetch(`/api/v1/recharge/${this.currentOrder.id}/receive-info`);
            const result = await response.json();

            if (response.ok && result.success) {
                const data = result.data;
                
                document.getElementById('receiverName').textContent = data.receiver_name;
                document.getElementById('receiverAccount').textContent = data.receiver_account;
                document.getElementById('accountType').textContent = this.getAccountTypeText(data.account_type);
                document.getElementById('transferAmount').textContent = `¥${data.amount}`;
                document.getElementById('orderNumber').textContent = data.order_number;

                // Show bank info if it's a bank account
                if (data.account_type === 'bank' && data.bank_name) {
                    document.getElementById('bankName').textContent = data.bank_name;
                    document.getElementById('bankInfo').style.display = 'block';
                }
            } else {
                this.showError('获取收款信息失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Load receive info error:', error);
        }
    }

    getAccountTypeText(type) {
        const types = {
            'alipay': '支付宝',
            'wechat': '微信',
            'bank': '银行卡',
            'other': '其他'
        };
        return types[type] || type;
    }

    handleFileSelect(file) {
        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

        if (file.size > maxSize) {
            CJComponents.feedback.showError('文件大小不能超过 10MB');
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            CJComponents.feedback.showError('只支持 JPG、PNG、PDF 格式的文件');
            return;
        }

        // Show file preview with animation
        const uploadArea = document.getElementById('uploadArea');
        const filePreview = document.getElementById('filePreview');
        
        uploadArea.style.display = 'none';
        filePreview.style.display = 'block';
        document.querySelector('.file-name').textContent = file.name;
        document.querySelector('.file-size').textContent = this.formatFileSize(file.size);
        document.getElementById('uploadBtn').disabled = false;

        // Store file for upload
        this.selectedFile = file;

        // Show success feedback
        CJComponents.feedback.showSuccess(`文件 "${file.name}" 已选择，可以上传了`);
    }

    removeFile() {
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('uploadBtn').disabled = true;
        document.getElementById('voucherFile').value = '';
        this.selectedFile = null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async uploadVoucher() {
        if (!this.selectedFile || !this.currentOrder) {
            CJComponents.feedback.showError('请选择要上传的文件');
            return;
        }

        const formData = new FormData();
        formData.append('voucher', this.selectedFile);

        // Show upload progress
        CJUtils.showProgress(0, '准备上传...');
        CJComponents.loading.show('正在上传凭证，请稍候...');

        try {
            CJUtils.showProgress(20, '开始上传...');
            
            const response = await fetch(`/api/v1/recharge/${this.currentOrder.id}/voucher`, {
                method: 'POST',
                body: formData
            });

            CJUtils.showProgress(80, '处理上传结果...');
            const result = await response.json();

            if (response.ok && result.success) {
                CJUtils.showProgress(100, '上传完成');
                CJComponents.feedback.showSuccess('凭证上传成功！');
                this.goToStep(4);
                this.showOrderSummary();
            } else {
                CJComponents.feedback.showError(result.details || result.error || '上传凭证失败');
            }
        } catch (error) {
            CJComponents.feedback.showError('网络错误，请稍后重试');
            console.error('Upload voucher error:', error);
        } finally {
            CJComponents.loading.hide();
        }
    }

    showOrderSummary() {
        if (!this.currentOrder) return;

        document.getElementById('finalOrderNumber').textContent = this.currentOrder.order_number;
        document.getElementById('finalAmount').textContent = `¥${this.currentOrder.amount}`;
    }

    goToStep(step) {
        // Hide all steps
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`step${i}`).style.display = 'none';
            document.querySelector(`[data-step="${i}"]`).classList.remove('active', 'completed');
        }

        // Show current step
        document.getElementById(`step${step}`).style.display = 'block';
        document.querySelector(`[data-step="${step}"]`).classList.add('active');

        // Mark previous steps as completed
        for (let i = 1; i < step; i++) {
            document.querySelector(`[data-step="${i}"]`).classList.add('completed');
        }

        this.currentStep = step;

        // Show step 3 button when reaching step 2
        if (step === 2) {
            setTimeout(() => {
                const continueBtn = document.createElement('button');
                continueBtn.className = 'btn btn-primary';
                continueBtn.textContent = '我已完成转账，上传凭证';
                continueBtn.onclick = () => this.goToStep(3);
                
                const receiveInfo = document.querySelector('.receive-info');
                receiveInfo.appendChild(continueBtn);
            }, 1000);
        }
    }

    showLoading() {
        CJComponents.loading.show();
    }

    hideLoading() {
        CJComponents.loading.hide();
    }

    showError(message) {
        CJComponents.feedback.showError(message);
    }

    async createNewOrder() {
        // Confirm before resetting
        const confirmed = await CJUtils.confirm('确定要创建新订单吗？当前填写的信息将被清空。', {
            title: '确认操作',
            type: 'warning'
        });

        if (!confirmed) return;

        // Reset form and go back to step 1
        document.getElementById('rechargeForm').reset();
        document.getElementById('merchantId').value = '';
        this.currentOrder = null;
        this.removeFile();
        
        // Clear auto-saved data
        if (this.formAutoSave) {
            this.formAutoSave.clear();
        }

        this.goToStep(1);
        CJComponents.feedback.showSuccess('已重置表单，可以创建新订单了');
    }

    checkOrderStatus() {
        if (this.currentOrder) {
            // Show order status in a better format
            const orderInfo = `
                订单号：${this.currentOrder.order_number}
                状态：待财务审核
                金额：¥${this.currentOrder.amount}
                
                请保存订单号以便后续查询。
            `;
            
            CJUtils.confirm(orderInfo, {
                title: '订单状态',
                confirmText: '我知道了',
                cancelText: '复制订单号',
                type: 'info'
            }).then((confirmed) => {
                if (!confirmed) {
                    // Copy order number to clipboard
                    copyToClipboard('finalOrderNumber');
                }
            });
        }
    }
}

// Utility functions
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess();
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess() {
    // Create a temporary success message
    const message = document.createElement('div');
    message.textContent = '已复制到剪贴板';
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10001;
        font-size: 14px;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        document.body.removeChild(message);
    }, 2000);
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

function removeFile() {
    app.removeFile();
}

// Initialize the application
const app = new PrivateRechargeApp();

// Make functions globally available
window.copyToClipboard = copyToClipboard;
window.closeErrorModal = closeErrorModal;
window.removeFile = removeFile;
window.createNewOrder = () => app.createNewOrder();
window.checkOrderStatus = () => app.checkOrderStatus();