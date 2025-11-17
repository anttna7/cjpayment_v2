// 简洁充值页面JavaScript逻辑
class SimpleRechargeManager {
    constructor() {
        this.form = document.getElementById('simpleRechargeForm');
        this.submitButton = document.getElementById('submitButton');
        this.matchedAccountInfo = document.getElementById('matchedAccountInfo');
        this.successMessage = document.getElementById('successMessage');

        this.currentPaymentType = null;
        this.isSubmitting = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupAmountSuggestions();
        console.log('💰 简洁充值管理器初始化完成');
    }

    bindEvents() {
        // 表单提交事件
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // 账户ID输入事件
        const accountIdInput = document.getElementById('accountId');
        accountIdInput.addEventListener('blur', () => {
            this.validateAccountId();
            this.fetchAccountInfo();
        });

        // 转账类型选择事件
        const paymentTypes = document.querySelectorAll('.payment-type-option');
        paymentTypes.forEach(type => {
            type.addEventListener('click', (e) => {
                this.selectPaymentType(e.currentTarget);
            });
        });

        // 实时验证
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // 充值金额变化时重新计算
        const amountInput = document.getElementById('rechargeAmount');
        amountInput.addEventListener('input', () => {
            this.updateMatchedAccountInfo();
        });
    }

    setupAmountSuggestions() {
        const suggestions = document.querySelectorAll('.amount-suggestion');
        const amountInput = document.getElementById('rechargeAmount');

        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const amount = suggestion.getAttribute('data-amount');
                amountInput.value = amount;
                amountInput.focus();

                // 触发输入事件以更新匹配信息
                amountInput.dispatchEvent(new Event('input'));

                // 添加点击效果
                suggestion.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    suggestion.style.transform = '';
                }, 150);
            });
        });
    }

    selectPaymentType(element) {
        // 移除其他选中状态
        document.querySelectorAll('.payment-type-option').forEach(type => {
            type.classList.remove('selected');
        });

        // 添加选中状态
        element.classList.add('selected');
        this.currentPaymentType = element.getAttribute('data-type');

        // 清除错误信息
        this.clearError(document.getElementById('paymentTypeError'));

        // 更新匹配账户信息
        this.updateMatchedAccountInfo();

        console.log(`选择转账类型: ${this.currentPaymentType}`);
    }

    async validateAccountId() {
        const accountIdInput = document.getElementById('accountId');
        const accountId = accountIdInput.value.trim();

        if (!accountId) {
            this.showError('accountIdError', '请输入账户ID');
            return false;
        }

        // 账户ID格式验证 (简单验证，可根据实际需求调整)
        if (!/^[A-Za-z0-9_-]+$/.test(accountId)) {
            this.showError('accountIdError', '账户ID格式不正确');
            return false;
        }

        return true;
    }

    async fetchAccountInfo() {
        const accountId = document.getElementById('accountId').value.trim();
        if (!accountId) return;

        try {
            // 真实API调用获取账户信息
            const response = await fetch(`/api/account/info?accountId=${encodeURIComponent(accountId)}`);
            const result = await response.json();

            if (result.success) {
                console.log('✅ 账户信息获取成功', result.data);
                // 这里可以根据实际API响应更新UI
            } else {
                this.showError('accountIdError', result.message || '账户ID不存在');
            }
        } catch (error) {
            console.error('获取账户信息失败:', error);
            // 不显示错误，避免影响用户体验
        }
    }

    updateMatchedAccountInfo() {
        const accountId = document.getElementById('accountId').value.trim();
        const amount = document.getElementById('rechargeAmount').value;

        if (!accountId || !amount || !this.currentPaymentType) {
            this.matchedAccountInfo.classList.remove('show');
            return;
        }

        // 根据转账类型和金额匹配收款账户信息
        const mockAccountInfo = this.generateMockAccountInfo();

        document.getElementById('receiverBank').textContent = mockAccountInfo.bank;
        document.getElementById('receiverAccount').textContent = mockAccountInfo.account;
        document.getElementById('receiverName').textContent = mockAccountInfo.name;
        document.getElementById('estimatedFee').textContent = mockAccountInfo.fee;

        this.matchedAccountInfo.classList.add('show');
    }

    generateMockAccountInfo() {
        const amount = parseFloat(document.getElementById('rechargeAmount').value) || 0;
        const isBusinessType = this.currentPaymentType === 'business';

        return {
            bank: isBusinessType ? '中国工商银行' : '招商银行',
            account: isBusinessType ? '6222 **** **** 1234' : '6225 **** **** 5678',
            name: isBusinessType ? 'CJPayment科技有限公司' : '张三',
            fee: `¥${(amount * (isBusinessType ? 0.001 : 0.002)).toFixed(2)}`
        };
    }

    validateField(field) {
        const fieldName = field.name || field.id;
        const value = field.value.trim();

        switch (fieldName) {
            case 'accountId':
                return this.validateAccountId();
            case 'accountHolder':
                if (!value) {
                    this.showError('accountHolderError', '请输入卡户主体名称');
                    return false;
                }
                break;
            case 'rechargeAmount':
                const amount = parseFloat(value);
                if (!value || amount <= 0) {
                    this.showError('rechargeAmountError', '请输入有效的充值金额');
                    return false;
                }
                if (amount < 1) {
                    this.showError('rechargeAmountError', '最小充值金额为1元');
                    return false;
                }
                break;
        }

        this.clearError(field);
        return true;
    }

    validateForm() {
        let isValid = true;

        // 验证所有输入字段
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // 验证转账类型
        if (!this.currentPaymentType) {
            this.showError('paymentTypeError', '请选择转账类型');
            isValid = false;
        }

        return isValid;
    }

    async handleSubmit() {
        if (this.isSubmitting) return;

        // 验证表单
        if (!this.validateForm()) {
            this.showError('submitError', '请填写完整信息');
            return;
        }

        this.isSubmitting = true;
        this.updateSubmitButton(true);

        try {
            const formData = this.getFormData();
            const response = await this.submitRecharge(formData);

            if (response.success) {
                this.showSuccess();
                this.resetForm();
            } else {
                this.showError('submitError', response.message || '提交失败，请重试');
            }
        } catch (error) {
            console.error('提交充值申请失败:', error);
            this.showError('submitError', '网络错误，请检查连接后重试');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    getFormData() {
        return {
            accountId: document.getElementById('accountId').value.trim(),
            accountHolder: document.getElementById('accountHolder').value.trim(),
            rechargeAmount: parseFloat(document.getElementById('rechargeAmount').value),
            paymentType: this.currentPaymentType,
            timestamp: new Date().toISOString()
        };
    }

    async submitRecharge(data) {
        console.log('📤 提交充值申请:', data);

        try {
            const response = await fetch('/api/simple-recharge/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('提交充值申请失败:', error);
            throw error;
        }
    }

    showSuccess() {
        this.successMessage.classList.add('show');
        this.form.style.display = 'none';

        // 3秒后隐藏成功消息并重置表单
        setTimeout(() => {
            this.successMessage.classList.remove('show');
            this.form.style.display = 'block';
        }, 3000);
    }

    resetForm() {
        this.form.reset();
        this.currentPaymentType = null;

        // 移除所有选中状态
        document.querySelectorAll('.payment-type-option').forEach(type => {
            type.classList.remove('selected');
        });

        // 隐藏匹配信息
        this.matchedAccountInfo.classList.remove('show');

        // 清除所有错误信息
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.remove('show');
        });
    }

    updateSubmitButton(loading) {
        if (loading) {
            this.submitButton.disabled = true;
            this.submitButton.innerHTML = '<div class="loading-spinner"></div>处理中...';
        } else {
            this.submitButton.disabled = false;
            this.submitButton.innerHTML = '提交充值申请';
        }
    }

    showError(errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');

            // 对应输入框添加错误样式
            const inputId = errorId.replace('Error', '');
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }
    }

    clearError(fieldOrErrorElement) {
        let errorElement;
        let inputElement;

        if (typeof fieldOrErrorElement === 'string') {
            errorElement = document.getElementById(fieldOrErrorElement);
        } else if (fieldOrErrorElement.classList && fieldOrErrorElement.classList.contains('error-message')) {
            errorElement = fieldOrErrorElement;
        } else {
            // 是输入字段
            inputElement = fieldOrErrorElement;
            const errorId = fieldOrErrorElement.id + 'Error';
            errorElement = document.getElementById(errorId);
        }

        if (errorElement) {
            errorElement.classList.remove('show');
        }

        if (inputElement) {
            inputElement.classList.remove('error');
        } else {
            // 从errorElement推断输入字段
            const inputId = errorElement?.id?.replace('Error', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.remove('error');
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.simpleRechargeManager = new SimpleRechargeManager();
});