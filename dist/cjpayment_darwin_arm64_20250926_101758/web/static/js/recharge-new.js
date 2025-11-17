/**
 * 新版充值页面JavaScript逻辑
 * 支持完整的充值流程：填写信息 -> 选择账户 -> 完成付款
 */

class RechargeSystem {
    constructor() {
        this.currentStep = 1;
        this.maxStep = 3;
        this.formData = {};
        this.banks = [];
        this.merchants = [];
        this.adAccounts = [];
        this.selectedAdAccount = null;
        this.receiveAccount = null;
        this.uploadedFile = null;
        
        this.init();
    }
    
    init() {
        this.loadBanks();
        this.bindEvents();
        this.updateStepDisplay();
    }
    
    // 加载银行列表
    async loadBanks() {
        try {
            // 模拟银行数据
            this.banks = [
                { code: 'ICBC', name: '中国工商银行', shortName: '工商银行' },
                { code: 'ABC', name: '中国农业银行', shortName: '农业银行' },
                { code: 'BOC', name: '中国银行', shortName: '中国银行' },
                { code: 'CCB', name: '中国建设银行', shortName: '建设银行' },
                { code: 'COMM', name: '交通银行', shortName: '交通银行' },
                { code: 'CMB', name: '招商银行', shortName: '招商银行' },
                { code: 'CITIC', name: '中信银行', shortName: '中信银行' },
                { code: 'CEB', name: '光大银行', shortName: '光大银行' },
                { code: 'CMBC', name: '中国民生银行', shortName: '民生银行' },
                { code: 'PAB', name: '平安银行', shortName: '平安银行' },
                { code: 'SPB', name: '上海浦东发展银行', shortName: '浦发银行' },
                { code: 'CIB', name: '兴业银行', shortName: '兴业银行' },
                { code: 'HXB', name: '华夏银行', shortName: '华夏银行' },
                { code: 'GDB', name: '广发银行', shortName: '广发银行' }
            ];
        } catch (error) {
            console.error('加载银行列表失败:', error);
            this.showToast('加载银行列表失败', 'error');
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 账户机构选择
        document.getElementById('accountType').addEventListener('change', (e) => {
            this.handleAccountTypeChange(e.target.value);
        });
        
        // 银行输入框
        const bankInput = document.getElementById('bankName');
        bankInput.addEventListener('input', (e) => {
            this.handleBankInput(e.target.value);
        });
        bankInput.addEventListener('focus', () => {
            this.showBankDropdown();
        });
        bankInput.addEventListener('blur', () => {
            setTimeout(() => this.hideBankDropdown(), 200);
        });
        
        // 商户名称输入
        document.getElementById('merchantName').addEventListener('blur', (e) => {
            this.handleMerchantNameInput(e.target.value);
        });
        
        // 步骤控制按钮
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextStep();
        });
        document.getElementById('prevBtn').addEventListener('click', () => {
            this.prevStep();
        });
        document.getElementById('submitBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.submitRecharge();
        });
        
        // 文件上传
        this.bindFileUploadEvents();
    }
    
    // 处理账户机构选择
    handleAccountTypeChange(type) {
        const bankSelection = document.getElementById('bankSelection');
        if (type === 'bank') {
            bankSelection.style.display = 'block';
            document.getElementById('bankName').required = true;
        } else {
            bankSelection.style.display = 'none';
            document.getElementById('bankName').required = false;
            document.getElementById('bankName').value = '';
        }
    }
    
    // 处理银行输入
    handleBankInput(value) {
        const filteredBanks = this.banks.filter(bank => 
            bank.name.includes(value) || bank.shortName.includes(value)
        );
        this.renderBankDropdown(filteredBanks);
    }
    
    // 显示银行下拉列表
    showBankDropdown() {
        document.getElementById('bankDropdown').style.display = 'block';
        this.renderBankDropdown(this.banks);
    }
    
    // 隐藏银行下拉列表
    hideBankDropdown() {
        document.getElementById('bankDropdown').style.display = 'none';
    }
    
    // 渲染银行下拉列表
    renderBankDropdown(banks) {
        const dropdown = document.getElementById('bankDropdown');
        dropdown.innerHTML = '';
        
        banks.forEach(bank => {
            const option = document.createElement('div');
            option.className = 'bank-option';
            option.textContent = bank.name;
            option.addEventListener('click', () => {
                document.getElementById('bankName').value = bank.name;
                this.hideBankDropdown();
            });
            dropdown.appendChild(option);
        });
        
        dropdown.style.display = 'block';
    }
    
    // 处理商户名称输入
    async handleMerchantNameInput(merchantName) {
        if (!merchantName.trim()) return;
        
        try {
            // 模拟API调用
            await this.delay(500);
            
            // 模拟商户数据
            const mockMerchant = {
                merchantId: 'M' + Date.now(),
                merchantName: merchantName,
                adAccounts: [
                    { id: 'AD001', name: `${merchantName}-推广账户1` },
                    { id: 'AD002', name: `${merchantName}-推广账户2` },
                    { id: 'AD003', name: `${merchantName}-推广账户3` }
                ]
            };
            
            // 验证商户是否存在
            if (Math.random() > 0.3) { // 70%概率存在
                this.adAccounts = mockMerchant.adAccounts;
                document.getElementById('merchantNameError').textContent = '';
                document.getElementById('merchantName').classList.remove('error');
            } else {
                document.getElementById('merchantNameError').textContent = '商户信息不存在，无法提供充值服务';
                document.getElementById('merchantName').classList.add('error');
                this.adAccounts = [];
            }
        } catch (error) {
            console.error('查询商户信息失败:', error);
            this.showToast('查询商户信息失败', 'error');
        }
    }
    
    // 下一步
    nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }
        
        if (this.currentStep < this.maxStep) {
            this.currentStep++;
            this.updateStepDisplay();
            
            if (this.currentStep === 2) {
                this.renderAdAccounts();
            } else if (this.currentStep === 3) {
                this.loadReceiveAccount();
            }
        }
    }
    
    // 上一步
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }
    
    // 验证当前步骤
    validateCurrentStep() {
        if (this.currentStep === 1) {
            return this.validateStep1();
        } else if (this.currentStep === 2) {
            return this.validateStep2();
        }
        return true;
    }
    
    // 验证步骤1
    validateStep1() {
        const requiredFields = ['payerName', 'payerAccount', 'businessType', 'accountType', 'amount', 'merchantName'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(fieldId + 'Error');
            
            if (!field.value.trim()) {
                errorElement.textContent = '此字段为必填项';
                field.classList.add('error');
                isValid = false;
            } else {
                errorElement.textContent = '';
                field.classList.remove('error');
            }
        });
        
        // 银行名称验证
        if (document.getElementById('accountType').value === 'bank') {
            const bankName = document.getElementById('bankName');
            const bankNameError = document.getElementById('bankNameError');
            
            if (!bankName.value.trim()) {
                bankNameError.textContent = '请选择银行名称';
                bankName.classList.add('error');
                isValid = false;
            } else {
                bankNameError.textContent = '';
                bankName.classList.remove('error');
            }
        }
        
        // 金额验证
        const amount = parseFloat(document.getElementById('amount').value);
        if (amount <= 0) {
            document.getElementById('amountError').textContent = '充值金额必须大于0';
            document.getElementById('amount').classList.add('error');
            isValid = false;
        }
        
        // 检查广告账户是否已加载
        if (this.adAccounts.length === 0) {
            this.showToast('请确认商户信息正确并已加载广告账户', 'error');
            isValid = false;
        }
        
        return isValid;
    }
    
    // 验证步骤2
    validateStep2() {
        if (!this.selectedAdAccount) {
            this.showToast('请选择要充值的广告账户', 'error');
            return false;
        }
        return true;
    }
    
    // 更新步骤显示
    updateStepDisplay() {
        // 更新步骤指示器
        for (let i = 1; i <= this.maxStep; i++) {
            const step = document.getElementById(`step${i}`);
            const stepContent = document.getElementById(`step${i}Content`);
            
            if (i < this.currentStep) {
                step.className = 'step completed';
                stepContent.style.display = 'none';
            } else if (i === this.currentStep) {
                step.className = 'step active';
                stepContent.style.display = 'block';
            } else {
                step.className = 'step';
                stepContent.style.display = 'none';
            }
        }
        
        // 更新按钮显示
        document.getElementById('prevBtn').style.display = this.currentStep > 1 ? 'block' : 'none';
        document.getElementById('nextBtn').style.display = this.currentStep < this.maxStep ? 'block' : 'none';
        document.getElementById('submitBtn').style.display = this.currentStep === this.maxStep ? 'block' : 'none';
    }
    
    // 渲染广告账户
    renderAdAccounts() {
        const container = document.getElementById('adAccountsSection');
        
        if (this.adAccounts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #718096;">暂无可用的广告账户</p>';
            return;
        }
        
        container.innerHTML = '';
        
        this.adAccounts.forEach((account, index) => {
            const accountItem = document.createElement('div');
            accountItem.className = 'ad-account-item';
            accountItem.innerHTML = `
                <input type="radio" class="ad-account-radio" name="adAccount" value="${account.id}" id="ad_${account.id}">
                <div class="ad-account-info">
                    <div class="ad-account-name">${account.name}</div>
                    <div class="ad-account-id">账户ID: ${account.id}</div>
                </div>
            `;
            
            accountItem.addEventListener('click', () => {
                document.getElementById(`ad_${account.id}`).checked = true;
                this.selectedAdAccount = account;
                
                // 更新选中状态
                document.querySelectorAll('.ad-account-item').forEach(item => {
                    item.classList.remove('selected');
                });
                accountItem.classList.add('selected');
            });
            
            container.appendChild(accountItem);
        });
    }
    
    // 加载收款账户
    async loadReceiveAccount() {
        try {
            this.showLoading('正在匹配收款账户...');
            
            // 模拟API调用
            await this.delay(1000);
            
            // 模拟收款账户数据
            this.receiveAccount = {
                accountName: '测试收款账户',
                accountNumber: '6222001234567890123',
                accountType: 'bank',
                bankName: '招商银行',
                bankBranch: '深圳分行营业部',
                amount: document.getElementById('amount').value
            };
            
            this.renderReceiveAccount();
            this.setupPaymentMethod();
            
            this.hideLoading();
        } catch (error) {
            console.error('加载收款账户失败:', error);
            this.showToast('加载收款账户失败', 'error');
            this.hideLoading();
        }
    }
    
    // 渲染收款账户信息
    renderReceiveAccount() {
        const card = document.getElementById('receiveAccountCard');
        const info = document.getElementById('receiveAccountInfo');
        
        info.innerHTML = `
            <div class="info-item">
                <span class="info-label">收款账户名称</span>
                <span class="info-value">${this.receiveAccount.accountName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">收款账号</span>
                <span class="info-value">${this.receiveAccount.accountNumber}</span>
            </div>
            <div class="info-item">
                <span class="info-label">开户银行</span>
                <span class="info-value">${this.receiveAccount.bankName}</span>
            </div>
            <div class="info-item">
                <span class="info-label">开户支行</span>
                <span class="info-value">${this.receiveAccount.bankBranch}</span>
            </div>
            <div class="info-item">
                <span class="info-label">转账金额</span>
                <span class="info-value" style="color: #e53e3e; font-size: 18px;">¥${this.receiveAccount.amount}</span>
            </div>
        `;
        
        card.style.display = 'block';
    }
    
    // 设置付款方式
    setupPaymentMethod() {
        const businessType = document.getElementById('businessType').value;
        const voucherSection = document.getElementById('voucherUploadSection');
        const processingSection = document.getElementById('bankProcessingSection');
        
        if (businessType === 'personal') {
            // 对私转账：需要上传凭证
            voucherSection.style.display = 'block';
            processingSection.style.display = 'none';
        } else {
            // 对公转账：银行处理
            voucherSection.style.display = 'none';
            processingSection.style.display = 'block';
        }
    }
    
    // 绑定文件上传事件
    bindFileUploadEvents() {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('voucherFile');
        
        // 点击上传
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 文件选择
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files[0]);
        });
        
        // 删除文件
        document.getElementById('removeFile').addEventListener('click', () => {
            this.removeUploadedFile();
        });
    }
    
    // 处理文件上传
    handleFileUpload(file) {
        if (!file) return;
        
        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('仅支持 JPG、PNG、PDF 格式文件', 'error');
            return;
        }
        
        // 验证文件大小
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('文件大小不能超过 10MB', 'error');
            return;
        }
        
        this.uploadedFile = file;
        this.showUploadedFile(file);
    }
    
    // 显示已上传文件
    showUploadedFile(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('uploadedFile').style.display = 'flex';
        document.getElementById('fileUploadArea').style.display = 'none';
    }
    
    // 删除已上传文件
    removeUploadedFile() {
        this.uploadedFile = null;
        document.getElementById('voucherFile').value = '';
        document.getElementById('uploadedFile').style.display = 'none';
        document.getElementById('fileUploadArea').style.display = 'block';
    }
    
    // 提交充值申请
    async submitRecharge() {
        try {
            this.showLoading('正在提交充值申请...');
            
            // 收集表单数据
            const formData = this.collectFormData();
            
            // 验证数据
            if (!this.validateSubmitData(formData)) {
                this.hideLoading();
                return;
            }
            
            // 提交数据
            await this.delay(2000); // 模拟API调用
            
            // 成功处理
            this.showSuccessPage(formData);
            
            this.hideLoading();
        } catch (error) {
            console.error('提交充值申请失败:', error);
            this.showToast('提交充值申请失败，请稍后重试', 'error');
            this.hideLoading();
        }
    }
    
    // 收集表单数据
    collectFormData() {
        return {
            payerName: document.getElementById('payerName').value,
            payerAccount: document.getElementById('payerAccount').value,
            businessType: document.getElementById('businessType').value,
            accountType: document.getElementById('accountType').value,
            bankName: document.getElementById('bankName').value,
            amount: document.getElementById('amount').value,
            merchantName: document.getElementById('merchantName').value,
            selectedAdAccount: this.selectedAdAccount,
            receiveAccount: this.receiveAccount,
            uploadedFile: this.uploadedFile
        };
    }
    
    // 验证提交数据
    validateSubmitData(data) {
        if (data.businessType === 'personal' && !data.uploadedFile) {
            this.showToast('请上传付款凭证', 'error');
            return false;
        }
        return true;
    }
    
    // 显示成功页面
    showSuccessPage(data) {
        const orderNumber = 'R' + Date.now();
        
        document.querySelector('.recharge-card').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h2 style="color: #22543d; margin-bottom: 16px;">充值申请提交成功</h2>
                <p style="color: #718096; margin-bottom: 32px;">您的充值申请已提交，我们将尽快处理</p>
                
                <div style="background: #f0fff4; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: left;">
                    <h3 style="color: #22543d; margin-bottom: 16px;">订单信息</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div><strong>订单号：</strong>${orderNumber}</div>
                        <div><strong>充值金额：</strong>¥${data.amount}</div>
                        <div><strong>商户名称：</strong>${data.merchantName}</div>
                        <div><strong>广告账户：</strong>${data.selectedAdAccount.name}</div>
                        <div><strong>付款方式：</strong>${data.businessType === 'personal' ? '对私转账' : '对公转账'}</div>
                        <div><strong>提交时间：</strong>${new Date().toLocaleString()}</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 16px; justify-content: center;">
                    <button class="btn btn-primary" onclick="window.location.reload()">继续充值</button>
                    <button class="btn btn-secondary" onclick="window.close()">关闭窗口</button>
                </div>
            </div>
        `;
        
        this.showToast('充值申请提交成功', 'success');
    }
    
    // 工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            alert(message);
        }
    }
    
    showLoading(message) {
        // 创建加载遮罩
        if (!document.getElementById('loadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            
            overlay.innerHTML = `
                <div style="background: white; padding: 32px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                    <div style="font-size: 16px; color: #4a5568;">${message}</div>
                </div>
            `;
            
            document.body.appendChild(overlay);
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

// 初始化充值系统
document.addEventListener('DOMContentLoaded', () => {
    new RechargeSystem();
});