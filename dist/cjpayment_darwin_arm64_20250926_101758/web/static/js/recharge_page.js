/**
 * 充值页面JavaScript功能
 * 包含表单验证、支付处理、文件上传等功能
 */

class RechargePage {
    constructor() {
        this.form = document.getElementById('rechargeForm');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.paymentModal = new bootstrap.Modal(document.getElementById('paymentInfoModal'));
        this.currentOrder = null;
        this.uploadedFile = null;
        
        this.init();
    }
    
    init() {
        this.setupFormValidation();
        this.setupEventListeners();
        this.setupFileUpload();
        this.setupCopyButtons();
        this.setupMobileOptimizations();
    }
    
    /**
     * 设置表单验证
     */
    setupFormValidation() {
        // 实时验证
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
        
        // 金额输入验证
        const amountInput = document.getElementById('amount');
        amountInput.addEventListener('input', (e) => {
            let value = e.target.value;
            // 限制小数点后两位
            if (value.includes('.')) {
                const parts = value.split('.');
                if (parts[1] && parts[1].length > 2) {
                    e.target.value = parts[0] + '.' + parts[1].substring(0, 2);
                }
            }
            this.validateAmount(e.target);
        });
        
        // 付款人姓名验证
        const payerNameInput = document.getElementById('payerName');
        payerNameInput.addEventListener('input', (e) => {
            // 只允许中文、英文和空格
            e.target.value = e.target.value.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '');
            this.validatePayerName(e.target);
        });
        
        // 广告账户验证
        const adAccountInput = document.getElementById('adAccount');
        adAccountInput.addEventListener('input', (e) => {
            this.validateAdAccount(e.target);
        });
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 表单提交
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // 付款方式选择
        const paymentTypeInputs = document.querySelectorAll('input[name="paymentType"]');
        paymentTypeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updatePaymentTypeInfo();
            });
        });
        
        // 模态框按钮事件
        document.getElementById('checkStatusBtn').addEventListener('click', () => {
            this.checkOrderStatus();
        });
        
        document.getElementById('uploadProofBtn').addEventListener('click', () => {
            this.uploadPaymentProof();
        });
        
        // 键盘导航支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.paymentModal._isShown) {
                this.paymentModal.hide();
            }
        });
    }
    
    /**
     * 设置文件上传功能
     */
    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('proofFile');
        const uploadBtn = document.getElementById('uploadProofBtn');
        
        // 点击上传区域
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 文件选择
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSelect(file);
            }
        });
        
        // 拖拽上传
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
        
        // 移除图片
        document.querySelector('.remove-image').addEventListener('click', () => {
            this.removeUploadedFile();
        });
    }
    
    /**
     * 设置复制按钮功能
     */
    setupCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const textElement = btn.parentElement.querySelector('.info-text');
                if (textElement) {
                    this.copyToClipboard(textElement.textContent);
                }
            });
        });
    }
    
    /**
     * 设置移动端优化
     */
    setupMobileOptimizations() {
        // 检测移动设备
        if (this.isMobileDevice()) {
            document.body.classList.add('mobile-device');
            
            // 移动端表单优化
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                if (input.type === 'number') {
                    input.setAttribute('inputmode', 'decimal');
                }
                if (input.type === 'text') {
                    input.setAttribute('autocomplete', 'off');
                }
            });
            
            // 移动端模态框优化
            const modal = document.getElementById('paymentInfoModal');
            modal.classList.add('mobile-modal');
        }
        
        // 视口变化处理
        window.addEventListener('resize', () => {
            this.handleViewportChange();
        });
        
        // 屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleViewportChange();
            }, 100);
        });
    }
    
    /**
     * 验证单个字段
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = '此字段为必填项';
        }
        
        // 特定字段验证
        switch (field.id) {
            case 'payerName':
                isValid = this.validatePayerName(field);
                break;
            case 'amount':
                isValid = this.validateAmount(field);
                break;
            case 'adAccount':
                isValid = this.validateAdAccount(field);
                break;
        }
        
        this.setFieldValidation(field, isValid, errorMessage);
        return isValid;
    }
    
    /**
     * 验证付款人姓名
     */
    validatePayerName(field) {
        const value = field.value.trim();
        const nameRegex = /^[\u4e00-\u9fa5a-zA-Z\s]{2,20}$/;
        
        if (!value) {
            this.setFieldValidation(field, false, '请输入付款人姓名');
            return false;
        }
        
        if (!nameRegex.test(value)) {
            this.setFieldValidation(field, false, '姓名格式不正确，请输入2-20个字符');
            return false;
        }
        
        this.setFieldValidation(field, true);
        return true;
    }
    
    /**
     * 验证充值金额
     */
    validateAmount(field) {
        const value = parseFloat(field.value);
        
        if (!value || isNaN(value)) {
            this.setFieldValidation(field, false, '请输入有效的金额');
            return false;
        }
        
        if (value < 1) {
            this.setFieldValidation(field, false, '充值金额不能少于1元');
            return false;
        }
        
        if (value > 999999) {
            this.setFieldValidation(field, false, '充值金额不能超过999,999元');
            return false;
        }
        
        this.setFieldValidation(field, true);
        return true;
    }
    
    /**
     * 验证广告账户
     */
    validateAdAccount(field) {
        const value = field.value.trim();
        
        if (!value) {
            this.setFieldValidation(field, false, '请输入广告账户');
            return false;
        }
        
        if (value.length < 3) {
            this.setFieldValidation(field, false, '广告账户至少需要3个字符');
            return false;
        }
        
        this.setFieldValidation(field, true);
        return true;
    }
    
    /**
     * 设置字段验证状态
     */
    setFieldValidation(field, isValid, errorMessage = '') {
        const feedbackElement = field.parentElement.querySelector('.invalid-feedback');
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
            if (feedbackElement && errorMessage) {
                feedbackElement.textContent = errorMessage;
            }
        }
    }
    
    /**
     * 清除字段错误状态
     */
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        field.classList.remove('is-valid');
    }
    
    /**
     * 更新付款方式信息
     */
    updatePaymentTypeInfo() {
        const selectedType = document.querySelector('input[name="paymentType"]:checked');
        if (selectedType) {
            // 移除验证错误状态
            const paymentSection = document.querySelector('.payment-type-selection');
            paymentSection.classList.remove('is-invalid');
        }
    }
    
    /**
     * 处理表单提交
     */
    async handleFormSubmit() {
        // 验证所有字段
        const isFormValid = this.validateForm();
        
        if (!isFormValid) {
            this.showError('请检查并填写所有必填字段');
            return;
        }
        
        // 显示加载状态
        this.showLoading(true);
        
        try {
            // 收集表单数据
            const formData = this.collectFormData();
            
            // 提交充值申请
            const response = await this.submitRechargeRequest(formData);
            
            if (response.success) {
                this.currentOrder = response.data;
                this.showPaymentInfo(response.data);
            } else {
                this.showError(response.message || '提交失败，请重试');
            }
        } catch (error) {
            console.error('提交充值申请失败:', error);
            this.showError('网络错误，请检查网络连接后重试');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * 验证整个表单
     */
    validateForm() {
        let isValid = true;
        
        // 验证所有必填字段
        const requiredFields = this.form.querySelectorAll('input[required]');
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        // 验证付款方式选择
        const paymentType = document.querySelector('input[name="paymentType"]:checked');
        if (!paymentType) {
            const paymentSection = document.querySelector('.payment-type-selection');
            paymentSection.classList.add('is-invalid');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * 收集表单数据
     */
    collectFormData() {
        return {
            merchantId: document.getElementById('merchantId').value,
            payerName: document.getElementById('payerName').value.trim(),
            amount: parseFloat(document.getElementById('amount').value),
            adAccount: document.getElementById('adAccount').value.trim(),
            paymentType: document.querySelector('input[name="paymentType"]:checked').value
        };
    }
    
    /**
     * 提交充值请求
     */
    async submitRechargeRequest(formData) {
        const response = await fetch('/api/recharge/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * 显示付款信息
     */
    showPaymentInfo(orderData) {
        // 更新订单号
        document.getElementById('orderNumber').textContent = orderData.orderNo;
        
        // 更新收款账号信息
        document.querySelector('#accountName .info-text').textContent = orderData.receiveAccount.accountName;
        document.querySelector('#bankName .info-text').textContent = orderData.receiveAccount.bankName;
        document.querySelector('#accountNumber .info-text').textContent = orderData.receiveAccount.accountNumber;
        document.getElementById('transferAmount').textContent = `¥${orderData.amount.toFixed(2)}`;
        
        // 显示模态框
        this.paymentModal.show();
        
        // 重置表单
        this.resetForm();
    }
    
    /**
     * 处理文件选择
     */
    handleFileSelect(file) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showError('请选择图片文件');
            return;
        }
        
        // 验证文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('文件大小不能超过5MB');
            return;
        }
        
        this.uploadedFile = file;
        
        // 显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            previewImage.src = e.target.result;
            
            document.querySelector('.upload-placeholder').classList.add('d-none');
            document.querySelector('.upload-preview').classList.remove('d-none');
            
            document.getElementById('uploadProofBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    /**
     * 移除上传的文件
     */
    removeUploadedFile() {
        this.uploadedFile = null;
        document.getElementById('proofFile').value = '';
        document.getElementById('previewImage').src = '';
        
        document.querySelector('.upload-placeholder').classList.remove('d-none');
        document.querySelector('.upload-preview').classList.add('d-none');
        
        document.getElementById('uploadProofBtn').disabled = true;
    }
    
    /**
     * 上传付款凭证
     */
    async uploadPaymentProof() {
        if (!this.uploadedFile || !this.currentOrder) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('orderNo', this.currentOrder.orderNo);
            formData.append('proofFile', this.uploadedFile);
            
            const response = await fetch('/api/recharge/upload-proof', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('付款凭证上传成功！');
                document.getElementById('uploadProofBtn').textContent = '已上传';
                document.getElementById('uploadProofBtn').disabled = true;
                document.getElementById('uploadProofBtn').classList.remove('btn-success');
                document.getElementById('uploadProofBtn').classList.add('btn-secondary');
            } else {
                this.showError(result.message || '上传失败，请重试');
            }
        } catch (error) {
            console.error('上传付款凭证失败:', error);
            this.showError('上传失败，请检查网络连接后重试');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * 查看订单状态
     */
    async checkOrderStatus() {
        if (!this.currentOrder) {
            return;
        }
        
        try {
            const response = await fetch(`/api/recharge/status/${this.currentOrder.orderNo}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                const status = result.data.status;
                let statusText = '';
                let statusClass = '';
                
                switch (status) {
                    case 'pending':
                        statusText = '待付款';
                        statusClass = 'text-warning';
                        break;
                    case 'paid':
                        statusText = '已付款，待确认';
                        statusClass = 'text-info';
                        break;
                    case 'confirmed':
                        statusText = '已确认';
                        statusClass = 'text-success';
                        break;
                    case 'completed':
                        statusText = '已完成';
                        statusClass = 'text-success';
                        break;
                    case 'cancelled':
                        statusText = '已取消';
                        statusClass = 'text-danger';
                        break;
                    default:
                        statusText = '未知状态';
                        statusClass = 'text-muted';
                }
                
                this.showInfo(`订单状态：<span class="${statusClass}">${statusText}</span>`);
            } else {
                this.showError('查询失败，请重试');
            }
        } catch (error) {
            console.error('查询订单状态失败:', error);
            this.showError('查询失败，请检查网络连接后重试');
        }
    }
    
    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            
            this.showCopySuccess();
        } catch (error) {
            console.error('复制失败:', error);
            this.showError('复制失败，请手动复制');
        }
    }
    
    /**
     * 显示复制成功提示
     */
    showCopySuccess() {
        const toast = document.createElement('div');
        toast.className = 'copy-success';
        toast.innerHTML = '<i class="fas fa-check me-2"></i>已复制到剪贴板';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
    
    /**
     * 重置表单
     */
    resetForm() {
        this.form.reset();
        this.form.classList.remove('was-validated');
        
        // 清除验证状态
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // 清除付款方式选择状态
        const paymentSection = document.querySelector('.payment-type-selection');
        paymentSection.classList.remove('is-invalid');
    }
    
    /**
     * 显示加载状态
     */
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.remove('d-none');
            document.getElementById('submitBtn').disabled = true;
        } else {
            this.loadingOverlay.classList.add('d-none');
            document.getElementById('submitBtn').disabled = false;
        }
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * 显示成功消息
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    /**
     * 显示信息消息
     */
    showInfo(message) {
        this.showToast(message, 'info');
    }
    
    /**
     * 显示Toast消息
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
        
        let icon = '';
        switch (type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'info':
                icon = 'fas fa-info-circle';
                break;
        }
        
        toast.innerHTML = `
            <i class="${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    /**
     * 检测是否为移动设备
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }
    
    /**
     * 处理视口变化
     */
    handleViewportChange() {
        // 移动端模态框调整
        if (this.isMobileDevice()) {
            const modal = document.getElementById('paymentInfoModal');
            if (modal) {
                modal.classList.add('mobile-modal');
            }
        }
        
        // 重新计算上传区域大小
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea && window.innerWidth <= 576) {
            uploadArea.style.padding = '1rem';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new RechargePage();
});

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RechargePage;
}