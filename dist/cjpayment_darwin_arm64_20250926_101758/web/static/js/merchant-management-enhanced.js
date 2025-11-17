/**
 * 增强商户管理系统
 * 支持表格视图/卡片视图切换，完整的CRUD操作，模态框表单
 */

class MerchantManagement {
    constructor() {
        this.table = null;
        this.modal = null;
        this.currentMerchant = null;
        this.paymentAccounts = [];
        this.adAccounts = [];
        this.bankList = [];
        
        this.init();
    }
    
    init() {
        this.loadBankList();
        this.initTable();
        this.bindEvents();
        this.loadMerchants();
    }
    
    // 加载银行列表
    loadBankList() {
        this.bankList = [
            { code: 'ICBC', name: '中国工商银行' },
            { code: 'ABC', name: '中国农业银行' },
            { code: 'BOC', name: '中国银行' },
            { code: 'CCB', name: '中国建设银行' },
            { code: 'COMM', name: '交通银行' },
            { code: 'CMB', name: '招商银行' },
            { code: 'CITIC', name: '中信银行' },
            { code: 'CEB', name: '光大银行' },
            { code: 'CMBC', name: '中国民生银行' },
            { code: 'PAB', name: '平安银行' },
            { code: 'SPB', name: '上海浦东发展银行' },
            { code: 'CIB', name: '兴业银行' },
            { code: 'HXB', name: '华夏银行' },
            { code: 'GDB', name: '广发银行' }
        ];
    }
    
    // 初始化表格
    initTable() {
        const columns = [
            {
                key: 'index',
                title: '序号',
                width: '60px',
                className: 'column-index',
                render: (value, row, index) => index + 1,
                showInCard: false
            },
            {
                key: 'merchantId',
                title: '商户ID',
                width: '120px',
                cardTitle: true,
                sortable: true
            },
            {
                key: 'merchantName',
                title: '商户名称',
                width: '150px',
                sortable: true
            },
            {
                key: 'rechargeLink',
                title: '充值链接',
                width: '200px',
                render: (value) => value ? `
                    <a href="${value}" target="_blank" class="recharge-link" title="${value}">
                        ${value.length > 30 ? value.substring(0, 30) + '...' : value}
                    </a>
                ` : '-'
            },
            {
                key: 'adAccounts',
                title: '广告账户',
                width: '120px',
                render: (value) => value ? `${value.length} 个账户` : '0 个账户'
            },
            {
                key: 'paymentAccounts',
                title: '付款账户',
                width: '120px',
                render: (value) => value ? `${value.length} 个账户` : '0 个账户'
            },
            {
                key: 'status',
                title: '状态',
                width: '100px',
                cardStatus: true,
                sortable: true,
                filterable: true,
                render: (value) => {
                    const statusMap = {
                        'pending': { text: '待审核', class: 'status-pending' },
                        'active': { text: '启用', class: 'status-active' },
                        'disabled': { text: '禁用', class: 'status-disabled' }
                    };
                    const status = statusMap[value] || { text: value, class: 'status-pending' };
                    return `<span class="status-badge ${status.class}">${status.text}</span>`;
                }
            },
            {
                key: 'createdAt',
                title: '创建时间',
                width: '140px',
                sortable: true,
                className: 'mobile-hidden',
                render: (value) => value ? new Date(value).toLocaleString() : '-'
            },
            {
                key: 'actions',
                title: '操作',
                width: '150px',
                className: 'column-actions',
                render: (value, row) => `
                    <div class="action-buttons">
                        <button class="action-btn primary" onclick="merchantManager.viewMerchant('${row.id}')">
                            详情
                        </button>
                        <button class="action-btn secondary" onclick="merchantManager.editMerchant('${row.id}')">
                            编辑
                        </button>
                        <button class="action-btn secondary" onclick="merchantManager.managePolling('${row.id}')">
                            轮询
                        </button>
                    </div>
                `
            }
        ];
        
        this.table = new EnhancedTable('#merchantTable', {
            title: '商户信息列表',
            columns: columns,
            data: [],
            pageSize: 10,
            sortable: true,
            filterable: true,
            viewSwitchable: true,
            fixedColumns: {
                left: ['index'],
                right: ['actions']
            },
            actions: [
                {
                    key: 'refresh',
                    label: '刷新',
                    icon: '🔄',
                    type: 'secondary',
                    handler: () => this.loadMerchants()
                }
            ],
            emptyText: '暂无商户数据，点击"添加商户"开始添加',
            onRowClick: (row) => {
                console.log('Row clicked:', row);
            },
            onViewChange: (view) => {
                console.log('View changed to:', view);
            }
        });
    }
    
    // 绑定事件
    bindEvents() {
        // 添加商户按钮
        document.getElementById('addMerchantBtn').addEventListener('click', () => {
            this.showMerchantModal();
        });
        
        // 导出按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });
        
        // 模态框事件
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideMerchantModal();
        });
        
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideMerchantModal();
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveMerchant();
        });
        
        // 动态列表按钮
        document.getElementById('addPaymentAccountBtn').addEventListener('click', () => {
            this.addPaymentAccount();
        });
        
        document.getElementById('addAdAccountBtn').addEventListener('click', () => {
            this.addAdAccount();
        });
        
        // 商户名称变化自动生成ID和链接
        document.getElementById('merchantName').addEventListener('input', (e) => {
            this.generateMerchantInfo(e.target.value);
        });
        
        // 模态框点击外部关闭
        document.getElementById('merchantModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideMerchantModal();
            }
        });
    }
    
    // 加载商户数据
    async loadMerchants() {
        this.table.setLoading(true);
        
        try {
            // 模拟API调用
            await this.delay(1000);
            
            // 模拟商户数据
            const merchants = [
                {
                    id: '1',
                    merchantId: 'M001',
                    merchantName: '测试商户A',
                    rechargeLink: 'https://pay.cjpayment.com/recharge/M001',
                    status: 'active',
                    industry: '电商',
                    contactPerson: '张三',
                    contactPhone: '13800138001',
                    description: '电商平台商户',
                    adAccounts: [
                        { id: 'AD001', name: '推广账户1' },
                        { id: 'AD002', name: '推广账户2' }
                    ],
                    paymentAccounts: [
                        { name: '张三', account: '6222001234567890', type: 'bank', bank: '招商银行' }
                    ],
                    createdAt: '2024-01-15T10:30:00Z'
                },
                {
                    id: '2',
                    merchantId: 'M002',
                    merchantName: '测试商户B',
                    rechargeLink: 'https://pay.cjpayment.com/recharge/M002',
                    status: 'pending',
                    industry: '游戏',
                    contactPerson: '李四',
                    contactPhone: '13800138002',
                    description: '游戏平台商户',
                    adAccounts: [
                        { id: 'AD003', name: '游戏推广账户' }
                    ],
                    paymentAccounts: [
                        { name: '李四', account: '6222009876543210', type: 'bank', bank: '工商银行' }
                    ],
                    createdAt: '2024-01-16T14:20:00Z'
                },
                {
                    id: '3',
                    merchantId: 'M003',
                    merchantName: '测试商户C',
                    rechargeLink: 'https://pay.cjpayment.com/recharge/M003',
                    status: 'disabled',
                    industry: '教育',
                    contactPerson: '王五',
                    contactPhone: '13800138003',
                    description: '在线教育平台',
                    adAccounts: [],
                    paymentAccounts: [],
                    createdAt: '2024-01-17T09:15:00Z'
                }
            ];
            
            this.table.setData(merchants);
        } catch (error) {
            console.error('加载商户数据失败:', error);
            this.showToast('加载商户数据失败', 'error');
        } finally {
            this.table.setLoading(false);
        }
    }
    
    // 显示商户模态框
    showMerchantModal(merchant = null) {
        this.currentMerchant = merchant;
        const modal = document.getElementById('merchantModal');
        const title = document.getElementById('modalTitle');
        
        if (merchant) {
            title.textContent = '编辑商户';
            this.fillMerchantForm(merchant);
        } else {
            title.textContent = '添加商户';
            this.resetMerchantForm();
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // 隐藏商户模态框
    hideMerchantModal() {
        const modal = document.getElementById('merchantModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentMerchant = null;
        this.resetMerchantForm();
    }
    
    // 重置表单
    resetMerchantForm() {
        document.getElementById('merchantForm').reset();
        document.getElementById('merchantId').value = '';
        document.getElementById('rechargeLink').value = '';
        this.paymentAccounts = [];
        this.adAccounts = [];
        this.renderPaymentAccounts();
        this.renderAdAccounts();
    }
    
    // 填充表单
    fillMerchantForm(merchant) {
        document.getElementById('merchantName').value = merchant.merchantName || '';
        document.getElementById('merchantId').value = merchant.merchantId || '';
        document.getElementById('rechargeLink').value = merchant.rechargeLink || '';
        document.getElementById('contactPerson').value = merchant.contactPerson || '';
        document.getElementById('contactPhone').value = merchant.contactPhone || '';
        document.getElementById('industry').value = merchant.industry || '';
        document.getElementById('description').value = merchant.description || '';
        
        this.paymentAccounts = merchant.paymentAccounts || [];
        this.adAccounts = merchant.adAccounts || [];
        
        this.renderPaymentAccounts();
        this.renderAdAccounts();
    }
    
    // 生成商户信息
    generateMerchantInfo(merchantName) {
        if (!merchantName.trim()) {
            document.getElementById('merchantId').value = '';
            document.getElementById('rechargeLink').value = '';
            return;
        }
        
        // 生成商户ID
        const timestamp = Date.now().toString().slice(-6);
        const merchantId = 'M' + timestamp;
        document.getElementById('merchantId').value = merchantId;
        
        // 生成充值链接
        const rechargeLink = `https://pay.cjpayment.com/recharge/${merchantId}`;
        document.getElementById('rechargeLink').value = rechargeLink;
    }
    
    // 添加付款账户
    addPaymentAccount() {
        this.paymentAccounts.push({
            id: Date.now(),
            name: '',
            account: '',
            type: 'bank',
            bank: '',
            branch: ''
        });
        this.renderPaymentAccounts();
    }
    
    // 渲染付款账户列表
    renderPaymentAccounts() {
        const container = document.getElementById('paymentAccountsList');
        container.innerHTML = this.paymentAccounts.map((account, index) => `
            <div class="dynamic-item" data-index="${index}">
                <div class="dynamic-item-fields">
                    <div class="form-group">
                        <label class="form-label">账户名称</label>
                        <input type="text" class="form-input" value="${account.name}" 
                               onchange="merchantManager.updatePaymentAccount(${index}, 'name', this.value)"
                               placeholder="请输入账户名称">
                    </div>
                    <div class="form-group">
                        <label class="form-label">账号</label>
                        <input type="text" class="form-input" value="${account.account}"
                               onchange="merchantManager.updatePaymentAccount(${index}, 'account', this.value)"
                               placeholder="请输入账号">
                    </div>
                    <div class="form-group">
                        <label class="form-label">账户机构</label>
                        <select class="form-select" onchange="merchantManager.updatePaymentAccount(${index}, 'type', this.value)">
                            <option value="bank" ${account.type === 'bank' ? 'selected' : ''}>银行卡</option>
                            <option value="alipay" ${account.type === 'alipay' ? 'selected' : ''}>支付宝</option>
                            <option value="wechat" ${account.type === 'wechat' ? 'selected' : ''}>微信</option>
                            <option value="other" ${account.type === 'other' ? 'selected' : ''}>其他</option>
                        </select>
                    </div>
                    ${account.type === 'bank' ? `
                        <div class="form-group">
                            <label class="form-label">银行名称</label>
                            <select class="form-select" onchange="merchantManager.updatePaymentAccount(${index}, 'bank', this.value)">
                                <option value="">请选择银行</option>
                                ${this.bankList.map(bank => `
                                    <option value="${bank.name}" ${account.bank === bank.name ? 'selected' : ''}>
                                        ${bank.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : '<div></div>'}
                </div>
                <button type="button" class="remove-item-btn" onclick="merchantManager.removePaymentAccount(${index})">
                    删除
                </button>
            </div>
        `).join('');
    }
    
    // 更新付款账户
    updatePaymentAccount(index, field, value) {
        if (this.paymentAccounts[index]) {
            this.paymentAccounts[index][field] = value;
            if (field === 'type') {
                // 重新渲染以显示/隐藏银行选择
                this.renderPaymentAccounts();
            }
        }
    }
    
    // 删除付款账户
    removePaymentAccount(index) {
        this.paymentAccounts.splice(index, 1);
        this.renderPaymentAccounts();
    }
    
    // 添加广告账户
    addAdAccount() {
        this.adAccounts.push({
            id: '',
            name: ''
        });
        this.renderAdAccounts();
    }
    
    // 渲染广告账户列表
    renderAdAccounts() {
        const container = document.getElementById('adAccountsList');
        container.innerHTML = this.adAccounts.map((account, index) => `
            <div class="dynamic-item" data-index="${index}">
                <div class="dynamic-item-fields">
                    <div class="form-group">
                        <label class="form-label">广告账户ID</label>
                        <input type="text" class="form-input" value="${account.id}"
                               onchange="merchantManager.updateAdAccount(${index}, 'id', this.value)"
                               placeholder="请输入广告账户ID">
                    </div>
                    <div class="form-group">
                        <label class="form-label">广告账户名称</label>
                        <input type="text" class="form-input" value="${account.name}"
                               onchange="merchantManager.updateAdAccount(${index}, 'name', this.value)"
                               placeholder="请输入广告账户名称">
                    </div>
                </div>
                <button type="button" class="remove-item-btn" onclick="merchantManager.removeAdAccount(${index})">
                    删除
                </button>
            </div>
        `).join('');
    }
    
    // 更新广告账户
    updateAdAccount(index, field, value) {
        if (this.adAccounts[index]) {
            this.adAccounts[index][field] = value;
        }
    }
    
    // 删除广告账户
    removeAdAccount(index) {
        this.adAccounts.splice(index, 1);
        this.renderAdAccounts();
    }
    
    // 保存商户
    async saveMerchant() {
        try {
            const formData = this.collectFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }
            
            this.showLoading('正在保存商户信息...');
            
            // 模拟API调用
            await this.delay(1500);
            
            if (this.currentMerchant) {
                // 更新商户
                this.showToast('商户信息更新成功', 'success');
            } else {
                // 创建商户
                this.showToast('商户创建成功', 'success');
            }
            
            this.hideMerchantModal();
            this.loadMerchants();
            
        } catch (error) {
            console.error('保存商户失败:', error);
            this.showToast('保存商户失败', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    // 收集表单数据
    collectFormData() {
        return {
            merchantName: document.getElementById('merchantName').value.trim(),
            merchantId: document.getElementById('merchantId').value.trim(),
            rechargeLink: document.getElementById('rechargeLink').value.trim(),
            contactPerson: document.getElementById('contactPerson').value.trim(),
            contactPhone: document.getElementById('contactPhone').value.trim(),
            industry: document.getElementById('industry').value,
            description: document.getElementById('description').value.trim(),
            paymentAccounts: this.paymentAccounts.filter(account => account.name && account.account),
            adAccounts: this.adAccounts.filter(account => account.id && account.name)
        };
    }
    
    // 验证表单数据
    validateFormData(data) {
        if (!data.merchantName) {
            this.showToast('请输入商户名称', 'error');
            document.getElementById('merchantName').focus();
            return false;
        }
        
        if (!data.merchantId) {
            this.showToast('商户ID不能为空', 'error');
            return false;
        }
        
        return true;
    }
    
    // 查看商户详情
    viewMerchant(id) {
        console.log('View merchant:', id);
        this.showToast('查看商户详情功能开发中', 'info');
    }
    
    // 编辑商户
    editMerchant(id) {
        const merchants = this.table.options.data;
        const merchant = merchants.find(m => m.id === id);
        if (merchant) {
            this.showMerchantModal(merchant);
        }
    }
    
    // 管理轮询规则
    managePolling(id) {
        console.log('Manage polling for merchant:', id);
        this.showToast('轮询规则管理功能开发中', 'info');
    }
    
    // 导出数据
    exportData() {
        this.showToast('数据导出功能开发中', 'info');
    }
    
    // 工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            alert(message);
        }
    }
    
    showLoading(message) {
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
                z-index: 10000;
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

// 初始化商户管理系统
let merchantManager;
document.addEventListener('DOMContentLoaded', () => {
    merchantManager = new MerchantManagement();
});

// 确保全局实例化
window.merchantManagement = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!window.merchantManagement) {
        try {
            window.merchantManagement = new MerchantManagement();
            console.log('✅ MerchantManagement 初始化成功');
        } catch (error) {
            console.error('❌ MerchantManagement 初始化失败:', error);
        }
    }
});