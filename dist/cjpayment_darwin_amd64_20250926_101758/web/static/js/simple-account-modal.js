/**
 * Simple Account Modal
 * 简单的账户模态框实现
 */

class SimpleAccountModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
    }

    static closeAll() {
        // 关闭所有现有的模态框
        const existingModals = document.querySelectorAll('.modal.show');
        existingModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        });
    }

    show(options = {}) {
        const { mode = 'create', accountData = null } = options;
        
        // 关闭现有模态框
        SimpleAccountModal.closeAll();
        
        // 创建模态框HTML
        const modalHtml = this.createModalHTML(mode, accountData);
        
        // 添加到页面
        const container = document.getElementById('accountModalContainer') || document.body;
        container.innerHTML = modalHtml;
        
        // 初始化Bootstrap模态框
        const modalElement = document.getElementById('accountModal');
        this.modal = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: true
        });
        
        // 绑定事件
        this.bindEvents(modalElement, mode, accountData);
        
        // 显示模态框
        this.modal.show();
        this.isOpen = true;
        
        // 无障碍访问由终极修复脚本处理
        
        return this.modal;
    }

    createModalHTML(mode, accountData) {
        const title = mode === 'create' ? '添加收款账户' : '编辑收款账户';
        const submitText = mode === 'create' ? '添加' : '保存';
        
        return `
            <div class="modal fade" id="accountModal" tabindex="-1" aria-labelledby="accountModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="accountModalLabel">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                        </div>
                        <div class="modal-body">
                            <form id="accountForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="accountName" class="form-label">账户名称 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="accountName" name="name" required 
                                                   value="${accountData?.name || ''}" placeholder="请输入账户名称">
                                            <div class="invalid-feedback"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="accountNumber" class="form-label">账户号码 <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="accountNumber" name="account_number" required 
                                                   value="${accountData?.account_number || ''}" placeholder="请输入账户号码">
                                            <div class="invalid-feedback"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="accountType" class="form-label">账户类型 <span class="text-danger">*</span></label>
                                            <select class="form-select" id="accountType" name="account_type" required>
                                                <option value="">请选择账户类型</option>
                                                <option value="alipay" ${accountData?.account_type === 'alipay' ? 'selected' : ''}>支付宝</option>
                                                <option value="wechat" ${accountData?.account_type === 'wechat' ? 'selected' : ''}>微信</option>
                                                <option value="bank" ${accountData?.account_type === 'bank' ? 'selected' : ''}>银行卡</option>
                                                <option value="other" ${accountData?.account_type === 'other' ? 'selected' : ''}>其他</option>
                                            </select>
                                            <div class="invalid-feedback"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="holderName" class="form-label">账户持有人</label>
                                            <input type="text" class="form-control" id="holderName" name="holder_name" 
                                                   value="${accountData?.holder_name || ''}" placeholder="请输入账户持有人姓名">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="paymentType" class="form-label">支付类型</label>
                                            <select class="form-select" id="paymentType" name="payment_type">
                                                <option value="收款码" ${accountData?.payment_type === '收款码' ? 'selected' : ''}>收款码</option>
                                                <option value="转账" ${accountData?.payment_type === '转账' ? 'selected' : ''}>转账</option>
                                                <option value="其他" ${accountData?.payment_type === '其他' ? 'selected' : ''}>其他</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="accountStatus" class="form-label">状态</label>
                                            <select class="form-select" id="accountStatus" name="status">
                                                <option value="active" ${accountData?.status === 'active' ? 'selected' : ''}>活跃</option>
                                                <option value="inactive" ${accountData?.status === 'inactive' ? 'selected' : ''}>停用</option>
                                                <option value="maintenance" ${accountData?.status === 'maintenance' ? 'selected' : ''}>维护中</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="dailyLimit" class="form-label">单日限额</label>
                                            <input type="number" class="form-control" id="dailyLimit" name="daily_limit" 
                                                   value="${accountData?.daily_limit || ''}" placeholder="请输入单日限额" min="0" step="0.01">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="singleLimit" class="form-label">单笔限额</label>
                                            <input type="number" class="form-control" id="singleLimit" name="single_limit" 
                                                   value="${accountData?.single_limit || ''}" placeholder="请输入单笔限额" min="0" step="0.01">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="remark" class="form-label">备注</label>
                                    <textarea class="form-control" id="remark" name="remark" rows="3" 
                                              placeholder="请输入备注信息">${accountData?.remark || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" id="saveAccountBtn">${submitText}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents(modalElement, mode, accountData) {
        const form = modalElement.querySelector('#accountForm');
        const saveBtn = modalElement.querySelector('#saveAccountBtn');
        
        // 保存按钮事件
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSave(form, mode, accountData);
        });
        
        // 表单提交事件
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave(form, mode, accountData);
        });
        
        // 模态框关闭事件由终极修复脚本处理
        
        // 输入验证
        this.setupValidation(form);
    }

    setupValidation(form) {
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => {
                this.validateField(field);
            });
            
            field.addEventListener('input', () => {
                if (field.classList.contains('is-invalid')) {
                    this.validateField(field);
                }
            });
        });
    }

    validateField(field) {
        const isValid = field.checkValidity();
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            if (feedback) feedback.textContent = '';
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
            if (feedback) {
                feedback.textContent = field.validationMessage || '此字段为必填项';
            }
        }
        
        return isValid;
    }

    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    async handleSave(form, mode, accountData) {
        if (!this.validateForm(form)) {
            this.showToast('请填写所有必填字段', 'error');
            return;
        }
        
        const saveBtn = form.parentNode.parentNode.querySelector('#saveAccountBtn');
        const originalText = saveBtn.textContent;
        
        try {
            // 显示加载状态
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>保存中...';
            
            // 收集表单数据
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // 发送请求
            const url = mode === 'create' ? '/api/accounts' : `/api/accounts/${accountData.id}`;
            const method = mode === 'create' ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // 成功处理
            this.showToast(mode === 'create' ? '账户添加成功' : '账户更新成功', 'success');
            this.modal.hide();
            
            // 刷新页面数据
            if (window.systemManagement && window.systemManagement.loadAccounts) {
                window.systemManagement.loadAccounts();
            }
            
        } catch (error) {
            console.error('保存账户失败:', error);
            this.showToast('保存失败，请重试', 'error');
        } finally {
            // 恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    showToast(message, type = 'info') {
        // 简单的toast实现
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    hide() {
        if (this.modal) {
            this.modal.hide();
        }
    }
}

// 全局注册
window.SimpleAccountModal = SimpleAccountModal;