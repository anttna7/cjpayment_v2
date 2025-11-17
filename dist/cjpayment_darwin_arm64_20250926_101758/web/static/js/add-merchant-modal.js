/**
 * 添加商户模态框控制器
 * 负责处理添加商户的所有交互逻辑
 */

class AddMerchantModal {
    constructor() {
        this.modal = null;
        this.form = null;
        this.isOpen = false;
        this.paymentAccountCount = 0;
        this.adAccountCount = 0;
        this.maxPaymentAccounts = 5;
        this.maxAdAccounts = 10;
        
        this.init();
    }
    
    /**
     * 初始化模态框
     */
    init() {
        this.modal = document.getElementById('addMerchantModal');
        this.form = document.getElementById('addMerchantForm');
        
        if (!this.modal || !this.form) {
            console.error('添加商户模态框或表单元素未找到');
            return;
        }
        
        this.bindEvents();
        this.setupAutoGeneration();
        this.initializeForm();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭模态框事件
        const closeBtn = this.modal.querySelector('.modal-close');
        const cancelBtn = this.modal.querySelector('#cancelAddMerchant');
        const overlay = this.modal.querySelector('.modal-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            });
        }
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // 表单提交事件
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        
        // 商户名称变化时自动生成其他字段
        const merchantNameInput = this.form.querySelector('#merchantName');
        if (merchantNameInput) {
            merchantNameInput.addEventListener('input', () => {
                this.generateAutoFields();
            });
        }
        
        // 添加付款账户按钮
        const addPaymentAccountBtn = this.form.querySelector('#addPaymentAccount');
        if (addPaymentAccountBtn) {
            addPaymentAccountBtn.addEventListener('click', () => {
                this.addPaymentAccount();
            });
        }
        
        // 添加广告账户按钮
        const addAdAccountBtn = this.form.querySelector('#addAdAccount');
        if (addAdAccountBtn) {
            addAdAccountBtn.addEventListener('click', () => {
                this.addAdAccount();
            });
        }
        
        // 复制充值链接按钮
        const copyLinkBtn = this.form.querySelector('#copyRechargeUrl');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                this.copyRechargeLink();
            });
        }
        
        // 商户描述字符计数
        const merchantDescInput = this.form.querySelector('#merchantDescription');
        const charCounter = this.form.querySelector('#descriptionCounter');
        if (merchantDescInput && charCounter) {
            merchantDescInput.addEventListener('input', () => {
                this.updateCharacterCounter(merchantDescInput, charCounter);
            });
        }
    }
    
    /**
     * 设置自动生成逻辑
     */
    setupAutoGeneration() {
        // 监听商户名称变化，自动生成ID和充值链接
        const merchantNameInput = this.form.querySelector('#merchantName');
        if (merchantNameInput) {
            let debounceTimer;
            merchantNameInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.generateAutoFields();
                }, 300);
            });
        }
    }
    
    /**
     * 初始化表单
     */
    initializeForm() {
        // 清空所有输入
        this.form.reset();
        
        // 清除动态添加的账户
        this.clearDynamicAccounts();
        
        // 重置计数器
        this.paymentAccountCount = 0;
        this.adAccountCount = 0;
        
        // 生成初始的商户ID和充值链接
        this.generateAutoFields();
    }
    
    /**
     * 生成自动填充字段
     */
    generateAutoFields() {
        const merchantNameInput = this.form.querySelector('#merchantName');
        const merchantIdInput = this.form.querySelector('#merchantId');
        const rechargeLinkInput = this.form.querySelector('#rechargeUrl');
        
        if (!merchantNameInput || !merchantIdInput || !rechargeLinkInput) {
            return;
        }
        
        const merchantName = merchantNameInput.value.trim();
        
        // 生成商户ID (格式: M + 6位数字)
        const timestamp = Date.now().toString().slice(-6);
        const merchantId = `M${timestamp}`;
        
        // 生成充值链接
        const baseUrl = window.location.origin;
        const rechargeLink = merchantName 
            ? `${baseUrl}/recharge/${merchantId}` 
            : `${baseUrl}/recharge/[商户ID]`;
        
        merchantIdInput.value = merchantId;
        rechargeLinkInput.value = rechargeLink;
    }
    
    /**
     * 添加付款账户
     */
    addPaymentAccount() {
        if (this.paymentAccountCount >= this.maxPaymentAccounts) {
            this.showToast(`最多只能添加${this.maxPaymentAccounts}个付款账户`, 'warning');
            return;
        }
        
        this.paymentAccountCount++;
        const accountsContainer = this.form.querySelector('#paymentAccountsList');
        
        const accountHtml = `
            <div class="account-item" data-account-index="${this.paymentAccountCount}">
                <div class="account-item-header">
                    <div class="account-item-title">
                        <span class="section-icon">💳</span>
                        付款账户 ${this.paymentAccountCount}
                    </div>
                    <button type="button" class="account-remove-btn" onclick="removePaymentAccount(${this.paymentAccountCount})">
                        <span>🗑️</span> 移除
                    </button>
                </div>
                <div class="account-grid">
                    <div class="form-group">
                        <label class="form-label">账户名称</label>
                        <input type="text" class="form-input" name="paymentAccountName_${this.paymentAccountCount}" 
                               placeholder="请输入付款账户名称">
                        <div class="form-error"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">账户号码</label>
                        <input type="text" class="form-input" name="paymentAccountNumber_${this.paymentAccountCount}" 
                               placeholder="请输入账户号码">
                        <div class="form-error"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">开户银行</label>
                        <input type="text" class="form-input" name="paymentBank_${this.paymentAccountCount}" 
                               placeholder="请输入开户银行">
                        <div class="form-error"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">账户机构</label>
                        <input type="text" class="form-input" name="paymentInstitution_${this.paymentAccountCount}" 
                               placeholder="请输入账户机构">
                        <div class="form-error"></div>
                    </div>
                </div>
            </div>
        `;
        
        accountsContainer.insertAdjacentHTML('beforeend', accountHtml);
        this.updateAddPaymentAccountButton();
    }
    
    /**
     * 移除付款账户
     */
    removePaymentAccount(index) {
        const accountItem = this.form.querySelector(`[data-account-index="${index}"]`);
        if (accountItem) {
            accountItem.remove();
            this.paymentAccountCount--;
            this.updatePaymentAccountNumbers();
            this.updateAddPaymentAccountButton();
        }
    }
    
    /**
     * 更新付款账户编号
     */
    updatePaymentAccountNumbers() {
        const accountItems = this.form.querySelectorAll('#paymentAccountsList .account-item');
        accountItems.forEach((item, index) => {
            const newIndex = index + 1;
            const title = item.querySelector('.account-item-title');
            if (title) {
                title.innerHTML = `<span class="section-icon">💳</span>付款账户 ${newIndex}`;
            }
            
            const removeBtn = item.querySelector('.account-remove-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removePaymentAccount(${item.dataset.accountIndex})`);
            }
        });
    }
    
    /**
     * 更新添加付款账户按钮状态
     */
    updateAddPaymentAccountButton() {
        const addBtn = this.form.querySelector('#addPaymentAccount');
        if (addBtn) {
            if (this.paymentAccountCount >= this.maxPaymentAccounts) {
                addBtn.disabled = true;
                addBtn.innerHTML = `<span class="btn__icon">💳</span> 已达上限 (${this.paymentAccountCount}/${this.maxPaymentAccounts})`;
            } else {
                addBtn.disabled = false;
                addBtn.innerHTML = `<span class="btn__icon">➕</span> 添加付款账户 (${this.paymentAccountCount}/${this.maxPaymentAccounts})`;
            }
        }
    }
    
    /**
     * 添加广告账户
     */
    addAdAccount() {
        if (this.adAccountCount >= this.maxAdAccounts) {
            this.showToast(`最多只能添加${this.maxAdAccounts}个广告账户`, 'warning');
            return;
        }
        
        this.adAccountCount++;
        const accountsContainer = this.form.querySelector('#adAccountsList');
        
        const accountHtml = `
            <div class="account-item" data-ad-account-index="${this.adAccountCount}">
                <div class="account-item-header">
                    <div class="account-item-title">
                        <span class="section-icon">📢</span>
                        广告账户 ${this.adAccountCount}
                    </div>
                    <button type="button" class="account-remove-btn" onclick="removeAdAccount(${this.adAccountCount})">
                        <span>🗑️</span> 移除
                    </button>
                </div>
                <div class="account-grid">
                    <div class="form-group">
                        <label class="form-label">广告账户ID</label>
                        <input type="text" class="form-input" name="adAccountId_${this.adAccountCount}" 
                               placeholder="请输入广告账户ID">
                        <div class="form-error"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">广告账户名称</label>
                        <input type="text" class="form-input" name="adAccountName_${this.adAccountCount}" 
                               placeholder="请输入广告账户名称">
                        <div class="form-error"></div>
                    </div>
                </div>
            </div>
        `;
        
        accountsContainer.insertAdjacentHTML('beforeend', accountHtml);
        this.updateAddAdAccountButton();
    }
    
    /**
     * 移除广告账户
     */
    removeAdAccount(index) {
        const accountItem = this.form.querySelector(`[data-ad-account-index="${index}"]`);
        if (accountItem) {
            accountItem.remove();
            this.adAccountCount--;
            this.updateAdAccountNumbers();
            this.updateAddAdAccountButton();
        }
    }
    
    /**
     * 更新广告账户编号
     */
    updateAdAccountNumbers() {
        const accountItems = this.form.querySelectorAll('#adAccountsList .account-item');
        accountItems.forEach((item, index) => {
            const newIndex = index + 1;
            const title = item.querySelector('.account-item-title');
            if (title) {
                title.innerHTML = `<span class="section-icon">📢</span>广告账户 ${newIndex}`;
            }
            
            const removeBtn = item.querySelector('.account-remove-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeAdAccount(${item.dataset.adAccountIndex})`);
            }
        });
    }
    
    /**
     * 更新添加广告账户按钮状态
     */
    updateAddAdAccountButton() {
        const addBtn = this.form.querySelector('#addAdAccount');
        if (addBtn) {
            if (this.adAccountCount >= this.maxAdAccounts) {
                addBtn.disabled = true;
                addBtn.innerHTML = `<span class="btn__icon">📢</span> 已达上限 (${this.adAccountCount}/${this.maxAdAccounts})`;
            } else {
                addBtn.disabled = false;
                addBtn.innerHTML = `<span class="btn__icon">➕</span> 添加广告账户 (${this.adAccountCount}/${this.maxAdAccounts})`;
            }
        }
    }
    
    /**
     * 复制充值链接
     */
    async copyRechargeLink() {
        const rechargeLinkInput = this.form.querySelector('#rechargeUrl');
        if (!rechargeLinkInput || !rechargeLinkInput.value) {
            this.showToast('充值链接为空', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(rechargeLinkInput.value);
            this.showToast('充值链接已复制到剪贴板', 'success');
            
            // 视觉反馈
            const copyBtn = this.form.querySelector('#copyRechargeUrl');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span class="btn__icon">✅</span> 已复制';
                copyBtn.disabled = true;
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.disabled = false;
                }, 2000);
            }
        } catch (err) {
            // 降级处理：选择文本
            rechargeLinkInput.select();
            rechargeLinkInput.setSelectionRange(0, 99999);
            this.showToast('请手动复制充值链接', 'info');
        }
    }
    
    /**
     * 更新字符计数器
     */
    updateCharacterCounter(input, counter) {
        const current = input.value.length;
        const max = input.maxLength || 500;
        
        counter.textContent = `${current}/${max}`;
        
        // 更新样式
        counter.classList.remove('warning', 'error');
        if (current > max * 0.9) {
            counter.classList.add('warning');
        }
        if (current >= max) {
            counter.classList.add('error');
        }
    }
    
    /**
     * 清除动态账户
     */
    clearDynamicAccounts() {
        const paymentAccountsList = this.form.querySelector('#paymentAccountsList');
        const adAccountsList = this.form.querySelector('#adAccountsList');
        
        if (paymentAccountsList) {
            paymentAccountsList.innerHTML = '';
        }
        if (adAccountsList) {
            adAccountsList.innerHTML = '';
        }
    }
    
    /**
     * 表单验证
     */
    validateForm() {
        let isValid = true;
        const errors = [];
        
        // 清除之前的错误
        this.clearFormErrors();
        
        // 验证必填字段
        const merchantName = this.form.querySelector('#merchantName').value.trim();
        if (!merchantName) {
            this.showFieldError('merchantName', '商户名称不能为空');
            isValid = false;
        } else if (merchantName.length < 2) {
            this.showFieldError('merchantName', '商户名称至少需要2个字符');
            isValid = false;
        }
        
        // 验证联系方式格式
        const contactPhone = this.form.querySelector('#contactPhone').value.trim();
        if (contactPhone) {
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(contactPhone)) {
                this.showFieldError('contactPhone', '请输入有效的手机号码');
                isValid = false;
            }
        }
        
        const contactEmail = this.form.querySelector('#contactEmail').value.trim();
        if (contactEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contactEmail)) {
                this.showFieldError('contactEmail', '请输入有效的邮箱地址');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    /**
     * 显示字段错误
     */
    showFieldError(fieldName, message) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('form-input--error');
            const errorElement = field.parentNode.querySelector('.form-error');
            if (errorElement) {
                errorElement.textContent = message;
            }
        }
    }
    
    /**
     * 清除表单错误
     */
    clearFormErrors() {
        const errorInputs = this.form.querySelectorAll('.form-input--error');
        errorInputs.forEach(input => {
            input.classList.remove('form-input--error');
        });
        
        const errorMessages = this.form.querySelectorAll('.form-error');
        errorMessages.forEach(error => {
            error.textContent = '';
        });
    }
    
    /**
     * 收集表单数据
     */
    collectFormData() {
        const formData = new FormData(this.form);
        const data = {
            basicInfo: {},
            contactInfo: {},
            paymentAccounts: [],
            adAccounts: {}
        };
        
        // 基本信息
        data.basicInfo.merchantName = formData.get('merchantName');
        data.basicInfo.merchantId = formData.get('merchantId');
        data.basicInfo.rechargeLink = formData.get('rechargeLink');
        data.basicInfo.industry = formData.get('industry');
        data.basicInfo.description = formData.get('merchantDescription');
        
        // 联系信息
        data.contactInfo.contactName = formData.get('contactName');
        data.contactInfo.contactPhone = formData.get('contactPhone');
        data.contactInfo.contactEmail = formData.get('contactEmail');
        
        // 付款账户
        for (let i = 1; i <= this.paymentAccountCount; i++) {
            const accountName = formData.get(`paymentAccountName_${i}`);
            const accountNumber = formData.get(`paymentAccountNumber_${i}`);
            const bank = formData.get(`paymentBank_${i}`);
            const institution = formData.get(`paymentInstitution_${i}`);
            
            if (accountName || accountNumber) {
                data.paymentAccounts.push({
                    name: accountName,
                    number: accountNumber,
                    bank: bank,
                    institution: institution
                });
            }
        }
        
        // 广告账户
        for (let i = 1; i <= this.adAccountCount; i++) {
            const accountId = formData.get(`adAccountId_${i}`);
            const accountName = formData.get(`adAccountName_${i}`);
            
            if (accountId || accountName) {
                data.adAccounts[`account_${i}`] = {
                    id: accountId,
                    name: accountName
                };
            }
        }
        
        return data;
    }
    
    /**
     * 处理表单提交
     */
    async handleSubmit() {
        if (!this.validateForm()) {
            this.showToast('请检查表单中的错误信息', 'error');
            return;
        }
        
        const submitBtn = this.form.querySelector('#confirmAddMerchant');
        const originalText = submitBtn.innerHTML;
        
        try {
            // 显示提交状态
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> 提交中...';
            
            const formData = this.collectFormData();
            console.log('商户数据:', formData);
            
            // 模拟API请求
            await this.submitMerchantData(formData);
            
            this.showToast('商户添加成功！', 'success');
            this.close();
            
            // 刷新商户列表
            if (window.merchantCardRenderer) {
                window.merchantCardRenderer.refresh();
            }
            if (window.merchantTableRenderer) {
                window.merchantTableRenderer.refresh();
            }
            
        } catch (error) {
            console.error('提交商户数据失败:', error);
            this.showToast('添加商户失败，请重试', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
    
    /**
     * 提交商户数据（模拟API）
     */
    async submitMerchantData(data) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 这里应该是真实的API调用
        // const response = await fetch('/api/merchants', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(data)
        // });
        // 
        // if (!response.ok) {
        //     throw new Error('API请求失败');
        // }
        // 
        // return await response.json();
        
        // 模拟成功响应
        return { success: true, merchantId: data.basicInfo.merchantId };
    }
    
    /**
     * 显示提示信息
     */
    showToast(message, type = 'info') {
        // 使用现有的toast系统
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // 降级处理
            alert(message);
        }
    }
    
    /**
     * 打开模态框
     */
    open() {
        if (this.modal) {
            this.initializeForm();
            this.modal.classList.add('show');
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
            
            // 聚焦到商户名称输入框
            const merchantNameInput = this.form.querySelector('#merchantName');
            if (merchantNameInput) {
                setTimeout(() => merchantNameInput.focus(), 100);
            }
        }
    }
    
    /**
     * 关闭模态框
     */
    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            this.isOpen = false;
            document.body.style.overflow = '';
            this.initializeForm();
        }
    }
}

// 全局实例和函数
let addMerchantModal;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    addMerchantModal = new AddMerchantModal();
});

// 全局函数供HTML调用
window.addMerchant = function() {
    if (addMerchantModal) {
        addMerchantModal.open();
    }
};

window.removePaymentAccount = function(index) {
    if (addMerchantModal) {
        addMerchantModal.removePaymentAccount(index);
    }
};

window.removeAdAccount = function(index) {
    if (addMerchantModal) {
        addMerchantModal.removeAdAccount(index);
    }
};

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddMerchantModal;
}