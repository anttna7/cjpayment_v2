/**
 * 充值页面管理系统
 * 包含付款人信息提交、收款账户匹配展示、充值信息填写等功能
 */
class RechargePageManager {
    constructor() {
        this.currentStep = 1;
        this.selectedReceivingAccount = null;
        this.payerInfo = null;
        this.verificationManager = new RechargeVerificationManager();
        this.allReceivingAccounts = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        console.log('充值页面管理系统已初始化');
    }
    
    bindEvents() {
        // 充值表单提交事件
        const rechargeForm = document.getElementById('rechargeForm');
        if (rechargeForm) {
            rechargeForm.addEventListener('submit', (e) => this.handleRechargeSubmit(e));
        }
        
        // 付款人账号类型变化事件
        const payerAccountType = document.getElementById('payerAccountType');
        if (payerAccountType) {
            payerAccountType.addEventListener('change', () => this.togglePayerBankName());
        }
        
        console.log('充值页面事件绑定完成');
    }
    
    /**
     * 切换付款人银行名称字段显示
     */
    togglePayerBankName() {
        const accountTypeSelect = document.getElementById('payerAccountType');
        const bankNameGroup = document.getElementById('payerBankNameGroup');
        const bankNameInput = document.getElementById('payerBankName');
        
        if (accountTypeSelect && bankNameGroup) {
            const selectedType = accountTypeSelect.value;
            
            if (selectedType === '银行卡') {
                bankNameGroup.style.display = 'block';
                if (bankNameInput) {
                    bankNameInput.setAttribute('required', 'required');
                }
            } else {
                bankNameGroup.style.display = 'none';
                if (bankNameInput) {
                    bankNameInput.removeAttribute('required');
                    bankNameInput.value = '';
                }
            }
        }
    }
    
    /**
     * 下一步导航
     */
    nextStep(step) {
        if (step === 2) {
            // 验证付款人信息
            if (!this.validatePayerForm()) {
                return;
            }
            this.savePayerInfo();
            this.loadReceivingAccounts();
        } else if (step === 3) {
            // 验证是否选择了收款账户
            if (!this.selectedReceivingAccount) {
                this.showAlert('请选择一个收款账户', 'warning');
                return;
            }
        }
        
        // 更新步骤状态
        this.updateStepStatus(step);
    }
    
    /**
     * 上一步导航
     */
    prevStep(step) {
        document.getElementById(`step${this.currentStep}`).classList.remove('active');
        if (this.currentStep > 1) {
            document.getElementById(`step${this.currentStep}`).classList.remove('completed');
        }
        
        this.currentStep = step;
        document.getElementById(`step${this.currentStep}`).classList.remove('completed');
        document.getElementById(`step${this.currentStep}`).classList.add('active');
    }
    
    /**
     * 更新步骤状态
     */
    updateStepStatus(step) {
        document.getElementById(`step${this.currentStep}`).classList.remove('active');
        document.getElementById(`step${this.currentStep}`).classList.add('completed');
        
        this.currentStep = step;
        document.getElementById(`step${this.currentStep}`).classList.add('active');
    }
    
    /**
     * 保存付款人信息
     */
    savePayerInfo() {
        this.payerInfo = {
            payerName: document.getElementById('payerName').value,
            payerAccount: document.getElementById('payerAccount').value,
            payerAccountType: document.getElementById('payerAccountType').value,
            payerBankName: document.getElementById('payerBankName').value
        };
        
        console.log('付款人信息已保存：', this.payerInfo);
    }
    
    /**
     * 验证付款人表单
     */
    validatePayerForm() {
        const payerInfo = {
            payerName: document.getElementById('payerName').value.trim(),
            payerAccount: document.getElementById('payerAccount').value.trim(),
            payerAccountType: document.getElementById('payerAccountType').value,
            payerBankName: document.getElementById('payerBankName').value
        };
        
        this.clearErrors();
        
        // 使用验证管理器进行详细验证
        const validation = this.verificationManager.validatePayerInfo(payerInfo);
        
        if (!validation.isValid) {
            // 显示所有错误信息
            Object.keys(validation.errors).forEach(field => {
                this.showError(`${field}Error`, validation.errors[field]);
            });
            return false;
        }
        
        return true;
    }
    
    /**
     * 显示错误信息
     */
    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    /**
     * 清除所有错误信息
     */
    clearErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }
    
    /**
     * 加载收款账户（从后端获取并使用验证管理器匹配）
     */
    async loadReceivingAccounts() {
        try {
            // 显示加载状态
            this.showLoadingAccounts(true);
            
            // 模拟API调用延迟
            await this.delay(500);
            
            // 获取所有可用收款账户
            this.allReceivingAccounts = this.getAllReceivingAccounts();
            
            // 使用验证管理器进行智能匹配
            const rechargeAmount = 10000; // 默认匹配金额，实际应用中可以动态设置
            const matchingResult = this.verificationManager.matchReceivingAccounts(
                this.payerInfo, 
                rechargeAmount, 
                this.allReceivingAccounts
            );
            
            console.log('账户匹配结果：', matchingResult);
            
            if (matchingResult.success) {
                this.renderReceivingAccounts(matchingResult.accounts, matchingResult.matchingSummary);
            } else {
                this.renderNoMatchingAccounts();
            }
            
        } catch (error) {
            console.error('加载收款账户失败：', error);
            this.showAlert('加载收款账户失败，请重试', 'error');
        } finally {
            this.showLoadingAccounts(false);
        }
    }
    
    /**
     * 获取所有收款账户数据
     */
    getAllReceivingAccounts() {
        return [
            {
                id: 'R001',
                accountName: '北京科技有限公司',
                accountNumber: '6214830012345678',
                accountType: '银行卡',
                bankName: '中国工商银行',
                businessType: '对公',
                singleLimit: 50000,
                dailyLimit: 200000,
                priority: 1,
                status: '启用',
                todayUsed: 15000,
                availableHours: '24小时',
                processingTime: '实时到账'
            },
            {
                id: 'R002',
                accountName: '张三',
                accountNumber: 'zhangsan@alipay.com',
                accountType: '支付宝',
                bankName: '',
                businessType: '对私',
                singleLimit: 10000,
                dailyLimit: 50000,
                priority: 2,
                status: '启用',
                todayUsed: 8000,
                availableHours: '9:00-22:00',
                processingTime: '1分钟内'
            },
            {
                id: 'R003',
                accountName: '李四',
                accountNumber: 'wx_lisi_123',
                accountType: '微信',
                bankName: '',
                businessType: '对私',
                singleLimit: 5000,
                dailyLimit: 20000,
                priority: 3,
                status: '启用',
                todayUsed: 2000,
                availableHours: '8:00-20:00',
                processingTime: '2分钟内'
            },
            {
                id: 'R004',
                accountName: '上海贸易公司',
                accountNumber: '6228480012345678',
                accountType: '银行卡',
                bankName: '招商银行',
                businessType: '对公',
                singleLimit: 100000,
                dailyLimit: 500000,
                priority: 1,
                status: '启用',
                todayUsed: 50000,
                availableHours: '24小时',
                processingTime: '实时到账'
            },
            {
                id: 'R005',
                accountName: '王五',
                accountNumber: 'wangwu@qq.com',
                accountType: '其它',
                bankName: '',
                businessType: '对私',
                singleLimit: 3000,
                dailyLimit: 15000,
                priority: 3,
                status: '维护',
                todayUsed: 0,
                availableHours: '暂停服务',
                processingTime: '维护中'
            }
        ];
    }
    
    /**
     * 渲染收款账户列表
     */
    renderReceivingAccounts(accounts, matchingSummary = null) {
        const grid = document.getElementById('receivingAccountsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // 添加匹配摘要信息
        if (matchingSummary) {
            const summaryElement = this.createMatchingSummary(matchingSummary);
            grid.appendChild(summaryElement);
        }
        
        if (accounts.length === 0) {
            this.renderNoMatchingAccounts();
            return;
        }
        
        accounts.forEach(account => {
            const accountCard = this.createAccountCard(account);
            grid.appendChild(accountCard);
        });
        
        console.log(`已加载 ${accounts.length} 个匹配的收款账户`);
    }
    
    /**
     * 渲染无匹配账户状态
     */
    renderNoMatchingAccounts() {
        const grid = document.getElementById('receivingAccountsGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--dashboard-text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🏦</div>
                <h3>暂无匹配的收款账户</h3>
                <p>根据您的付款信息，当前没有可用的收款账户</p>
                <p>建议：</p>
                <ul style="text-align: left; display: inline-block; margin-top: 1rem;">
                    <li>检查付款账号类型是否正确</li>
                    <li>联系客服获取更多收款方式</li>
                    <li>稍后重试或选择其他充值方式</li>
                </ul>
            </div>
        `;
    }
    
    /**
     * 创建匹配摘要
     */
    createMatchingSummary(summary) {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'matching-summary';
        summaryDiv.style.cssText = `
            grid-column: 1 / -1;
            background: rgba(34, 197, 94, 0.05);
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            color: var(--dashboard-text-primary);
        `;
        
        summaryDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="color: var(--rule-active); font-weight: 600;">🎯 智能匹配结果</span>
                <span style="background: var(--rule-active); color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem;">
                    ${summary.totalMatched} 个账户
                </span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.8rem;">
                <div>平均匹配度：<strong>${summary.averageScore}分</strong></div>
                <div>检测业务类型：<strong>${summary.matchingCriteria.detectedBusinessType}</strong></div>
                <div>付款方式：<strong>${summary.matchingCriteria.payerAccountType}</strong></div>
                ${summary.bestMatch ? `<div>推荐账户：<strong>${summary.bestMatch.accountName}</strong></div>` : ''}
            </div>
        `;
        
        return summaryDiv;
    }
    
    /**
     * 创建收款账户卡片
     */
    createAccountCard(account) {
        const card = document.createElement('div');
        card.className = 'receiving-account-card';
        card.dataset.accountId = account.id;
        
        const maskedNumber = this.maskAccountNumber(account.accountNumber);
        
        const usagePercent = ((account.todayUsed / account.dailyLimit) * 100).toFixed(1);
        const remainingLimit = account.dailyLimit - account.todayUsed;
        
        // 添加匹配分数显示（如果有的话）
        const matchingScoreDisplay = account.matchingScore ? 
            `<div class="matching-score" style="position: absolute; top: 0.5rem; left: 0.5rem; background: var(--rule-active); color: white; border-radius: 12px; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-weight: bold;">
                ${account.matchingScore}分
            </div>` : '';
        
        card.innerHTML = `
            ${matchingScoreDisplay}
            <div class="account-type-badge type-${account.accountType}">${account.accountType}</div>
            <div class="account-info">
                <div class="account-name">${this.escapeHtml(account.accountName)}</div>
                <div class="account-number">${maskedNumber}</div>
                ${account.bankName ? `<div class="bank-name" style="color: var(--dashboard-text-secondary); font-size: 0.9rem; margin-top: 0.25rem;">${this.escapeHtml(account.bankName)}</div>` : ''}
            </div>
            <div class="account-limits">
                <div class="limit-item">
                    <div class="limit-label">单笔限额</div>
                    <div class="limit-value">¥${account.singleLimit.toLocaleString()}</div>
                </div>
                <div class="limit-item">
                    <div class="limit-label">剩余额度</div>
                    <div class="limit-value">¥${remainingLimit.toLocaleString()}</div>
                </div>
            </div>
            <div class="account-usage" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--dashboard-border-primary);">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--dashboard-text-secondary);">
                    <span>今日使用率</span>
                    <span>${usagePercent}%</span>
                </div>
                <div style="background: var(--dashboard-border-primary); height: 4px; border-radius: 2px; margin-top: 0.25rem;">
                    <div style="background: ${usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : 'var(--rule-active)'}; height: 100%; width: ${usagePercent}%; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
            </div>
            <div class="account-details" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--dashboard-text-secondary);">
                <div>到账时间: ${account.processingTime}</div>
                <div>可用时间: ${account.availableHours}</div>
            </div>
            <div class="account-priority" style="position: absolute; top: 0.5rem; right: 0.5rem; background: var(--account-primary); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold;">
                ${account.priority}
            </div>
        `;
        
        card.addEventListener('click', () => this.selectReceivingAccount(account, card));
        
        return card;
    }
    
    /**
     * 选择收款账户
     */
    selectReceivingAccount(account, cardElement) {
        // 清除其他选中状态
        document.querySelectorAll('.receiving-account-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 选中当前账户
        cardElement.classList.add('selected');
        this.selectedReceivingAccount = account;
        
        // 启用下一步按钮
        const selectAccountBtn = document.getElementById('selectAccountBtn');
        if (selectAccountBtn) {
            selectAccountBtn.disabled = false;
        }
        
        console.log('已选择收款账户：', account);
    }
    
    /**
     * 掩码显示账号
     */
    maskAccountNumber(accountNumber) {
        if (accountNumber.includes('@')) {
            // 邮箱格式（支付宝）
            const parts = accountNumber.split('@');
            const username = parts[0];
            const domain = parts[1];
            const maskedUsername = username.slice(0, 2) + '***' + username.slice(-2);
            return maskedUsername + '@' + domain;
        } else if (accountNumber.length > 8) {
            // 银行卡号
            return accountNumber.slice(0, 4) + ' **** **** ' + accountNumber.slice(-4);
        } else {
            // 其他格式
            return accountNumber.slice(0, 2) + '***' + accountNumber.slice(-2);
        }
    }
    
    /**
     * 处理充值表单提交
     */
    handleRechargeSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const rechargeInfo = {
            rechargeAmount: formData.get('rechargeAmount'),
            adAccountId: formData.get('adAccountId'),
            rechargeRemark: formData.get('rechargeRemark') || ''
        };
        
        // 使用验证管理器进行完整验证
        const validation = this.verificationManager.validateCompleteRechargeRequest(
            this.payerInfo,
            rechargeInfo,
            this.selectedReceivingAccount
        );
        
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // 构建完整的充值申请数据
        const rechargeData = {
            payerInfo: validation.normalizedData.payerInfo,
            receivingAccount: validation.normalizedData.selectedAccount,
            rechargeInfo: validation.normalizedData.rechargeInfo,
            submitTime: new Date().toISOString(),
            orderNumber: this.generateOrderNumber(),
            matchingDetails: this.selectedReceivingAccount.matchingDetails || null
        };
        
        console.log('充值申请数据验证通过：', rechargeData);
        
        // 提交到后端
        this.submitRechargeRequest(rechargeData);
    }
    
    /**
     * 验证充值金额
     */
    validateRechargeAmount(amount) {
        if (!this.selectedReceivingAccount) {
            this.showAlert('请先选择收款账户', 'warning');
            return false;
        }
        
        const { singleLimit, dailyLimit } = this.selectedReceivingAccount;
        
        if (amount > singleLimit) {
            this.showAlert(`充值金额不能超过单笔限额 ¥${singleLimit.toLocaleString()}`, 'warning');
            return false;
        }
        
        // 这里可以加入日限额检查逻辑
        // if (todayTotal + amount > dailyLimit) { ... }
        
        return true;
    }
    
    /**
     * 提交充值请求
     */
    async submitRechargeRequest(rechargeData) {
        try {
            // 模拟API调用
            await this.delay(1000);
            
            // 模拟提交成功
            this.showRechargeSuccess(rechargeData);
            
        } catch (error) {
            console.error('充值申请提交失败：', error);
            this.showAlert('充值申请提交失败，请重试', 'error');
        }
    }
    
    /**
     * 显示充值成功信息
     */
    showRechargeSuccess(rechargeData) {
        const message = `✅ 充值申请提交成功！
        
订单号：${rechargeData.orderNumber}
充值金额：¥${rechargeData.rechargeAmount.toLocaleString()}
广告账户：${rechargeData.adAccountId}
收款账户：${rechargeData.receivingAccount.accountName}
账户类型：${rechargeData.receivingAccount.accountType}

请按照页面提示完成付款操作。`;
        
        this.showAlert(message, 'success');
    }
    
    /**
     * 生成订单号
     */
    generateOrderNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `CJ${year}${month}${day}${hour}${minute}${second}${random}`;
    }
    
    /**
     * 显示提示信息
     */
    showAlert(message, type = 'info') {
        alert(message); // 简化版本，实际项目中可以使用更美观的弹框组件
    }
    
    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 显示验证错误信息
     */
    showValidationErrors(errors) {
        // 清除之前的错误
        this.clearErrors();
        
        // 显示所有错误信息
        Object.keys(errors).forEach(field => {
            if (field === 'receivingAccount') {
                this.showAlert(`收款账户错误：${errors[field]}`, 'error');
            } else {
                this.showError(`${field}Error`, errors[field]);
            }
        });
        
        // 如果有付款人信息错误，返回第一步
        const payerFields = ['payerName', 'payerAccount', 'payerAccountType', 'payerBankName'];
        if (payerFields.some(field => errors[field])) {
            this.prevStep(1);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoadingAccounts(isLoading) {
        const grid = document.getElementById('receivingAccountsGrid');
        if (!grid) return;
        
        if (isLoading) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--dashboard-text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 1rem; animation: spin 1s linear infinite;">⚡</div>
                    <h3>正在匹配收款账户...</h3>
                    <p>系统正在根据您的付款信息智能匹配最佳收款账户</p>
                    <style>
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    </style>
                </div>
            `;
        }
    }
    
    /**
     * 重新匹配收款账户（根据充值金额动态匹配）
     */
    async rematchReceivingAccounts(rechargeAmount) {
        if (!this.payerInfo || !this.allReceivingAccounts.length) return;
        
        try {
            this.showLoadingAccounts(true);
            
            const matchingResult = this.verificationManager.matchReceivingAccounts(
                this.payerInfo,
                parseFloat(rechargeAmount) || 10000,
                this.allReceivingAccounts
            );
            
            if (matchingResult.success) {
                this.renderReceivingAccounts(matchingResult.accounts, matchingResult.matchingSummary);
            } else {
                this.renderNoMatchingAccounts();
            }
            
            // 重新选择之前选中的账户（如果仍然可用）
            if (this.selectedReceivingAccount) {
                const stillAvailable = matchingResult.accounts.find(acc => acc.id === this.selectedReceivingAccount.id);
                if (stillAvailable) {
                    const cardElement = document.querySelector(`[data-account-id="${this.selectedReceivingAccount.id}"]`);
                    if (cardElement) {
                        this.selectReceivingAccount(stillAvailable, cardElement);
                    }
                } else {
                    this.selectedReceivingAccount = null;
                    const selectBtn = document.getElementById('selectAccountBtn');
                    if (selectBtn) selectBtn.disabled = true;
                }
            }
            
        } catch (error) {
            console.error('重新匹配收款账户失败：', error);
        } finally {
            this.showLoadingAccounts(false);
        }
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 全局函数，供HTML中的onclick事件调用
let rechargeManager;

function nextStep(step) {
    if (rechargeManager) {
        rechargeManager.nextStep(step);
    }
}

function prevStep(step) {
    if (rechargeManager) {
        rechargeManager.prevStep(step);
    }
}

function togglePayerBankName() {
    if (rechargeManager) {
        rechargeManager.togglePayerBankName();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    rechargeManager = new RechargePageManager();
    console.log('充值页面已加载并初始化完成');
});