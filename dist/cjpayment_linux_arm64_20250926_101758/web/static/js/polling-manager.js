// 轮询规则管理系统
class PollingRuleManager {
    constructor() {
        this.currentRules = [];
        this.currentEditingRule = null;
        
        this.initEventListeners();
        this.loadStats();
        this.loadRules();
    }
    
    initEventListeners() {
        // 创建规则按钮 - 添加元素存在性检查
        const createRuleBtn = document.getElementById('createRuleBtn');
        if (createRuleBtn) {
            createRuleBtn.?.addEventListener && element.addEventListener('click', () => this.showCreateRuleModal());
        }
        
        const testRuleBtn = document.getElementById('testRuleBtn');
        if (testRuleBtn) {
            testRuleBtn.?.addEventListener && element.addEventListener('click', () => this.showTestModal());
        }
        
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.?.addEventListener && element.addEventListener('click', () => this.loadRules());
        }
        
        // 模态框关闭 - 添加元素存在性检查
        const closeRuleModal = document.getElementById('closeRuleModal');
        if (closeRuleModal) {
            closeRuleModal.?.addEventListener && element.addEventListener('click', () => this.hideModal('ruleModal'));
        }
        
        const closeTestModal = document.getElementById('closeTestModal');
        if (closeTestModal) {
            closeTestModal.?.addEventListener && element.addEventListener('click', () => this.hideModal('testModal'));
        }
        
        const cancelRuleModal = document.getElementById('cancelRuleModal');
        if (cancelRuleModal) {
            cancelRuleModal.?.addEventListener && element.addEventListener('click', () => this.hideModal('ruleModal'));
        }
        
        const closeTestModalBtn = document.getElementById('closeTestModalBtn');
        if (closeTestModalBtn) {
            closeTestModalBtn.?.addEventListener && element.addEventListener('click', () => this.hideModal('testModal'));
        }
        
        // 保存规则
        const saveRuleBtn = document.getElementById('saveRuleBtn');
        if (saveRuleBtn) {
            saveRuleBtn.?.addEventListener && element.addEventListener('click', () => this.saveRule());
        }
        
        // 规则类型选择
        const ruleTypeOptions = document.querySelectorAll('.rule-type-option');
        ruleTypeOptions.forEach(option => {
            option.?.addEventListener && element.addEventListener('click', () => this.selectRuleType(option.dataset.type));
        });
        
        // 添加分层按钮
        document.getElementById('addTierBtn').?.addEventListener && element.addEventListener('click', () => this.addAmountTier());
        
        // 运行测试
        document.getElementById('runTestBtn').?.addEventListener && element.addEventListener('click', () => this.runRuleTest());
        
        // 筛选器
        document.getElementById('paymentTypeFilter').addEventListener('change', () => this.filterRules());
        document.getElementById('ruleTypeFilter').addEventListener('change', () => this.filterRules());
        
        // 支付类型变化时重新加载账户
        document.getElementById('rulePaymentType').addEventListener('change', () => this.loadAvailableAccounts());
        
        // 点击模态框背景关闭
        document.getElementById('ruleModal').?.addEventListener && element.addEventListener('click', (e) => {
            if (e.target.id === 'ruleModal') this.hideModal('ruleModal');
        });
        document.getElementById('testModal').?.addEventListener && element.addEventListener('click', (e) => {
            if (e.target.id === 'testModal') this.hideModal('testModal');
        });
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/polling/stats');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('totalRulesCount').textContent = data.data.total_rules || 0;
                document.getElementById('activeRulesCount').textContent = data.data.active_rules || 0;
                document.getElementById('businessRulesCount').textContent = data.data.business_rules || 0;
                document.getElementById('personalRulesCount').textContent = data.data.personal_rules || 0;
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }
    
    async loadRules() {
        try {
            const response = await fetch('/api/polling/rules');
            const data = await response.json();
            
            if (data.success) {
                this.currentRules = data.data.rules || [];
                this.renderRules();
            } else {
                this.showError('加载规则失败: ' + data.message);
            }
        } catch (error) {
            console.error('加载规则失败:', error);
            this.showError('网络错误，请稍后重试');
        }
    }
    
    renderRules() {
        const grid = document.getElementById('rulesGrid');
        
        if (this.currentRules.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div>暂无轮询规则</div>
                    <button class="btn btn-primary" onclick="pollingManager.showCreateRuleModal()">
                        创建第一个规则
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.currentRules.map(rule => this.renderRuleCard(rule)).join('');
    }
    
    renderRuleCard(rule) {
        const typeClass = `type-${rule.rule_type.replace('_', '-')}`;
        const statusClass = `status-${rule.status}`;
        const paymentTypeClass = `payment-${rule.payment_type}`;
        
        return `
            <div class="rule-card ${rule.status === 'disabled' ? 'disabled' : ''}">
                <div class="rule-header">
                    <div>
                        <div class="rule-title">${rule.rule_name}</div>
                        <span class="rule-type-badge ${typeClass}">${this.getRuleTypeText(rule.rule_type)}</span>
                    </div>
                    <span class="rule-status ${statusClass}">${rule.status === 'active' ? '活跃' : '禁用'}</span>
                </div>
                
                <div class="rule-info">
                    <div class="info-row">
                        <span class="info-label">支付类型:</span>
                        <span class="payment-type-badge ${paymentTypeClass}">
                            ${rule.payment_type === 'business' ? '对公' : '对私'}
                        </span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">创建时间:</span>
                        <span class="info-value">${this.formatDateTime(rule.created_at)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">更新时间:</span>
                        <span class="info-value">${this.formatDateTime(rule.updated_at)}</span>
                    </div>
                </div>
                
                <div class="rule-stats">
                    <div class="stats-row">
                        <div class="stat-item">
                            <div class="stat-item-value">${rule.account_count || 0}</div>
                            <div class="stat-item-label">关联账户</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">${rule.order_count || 0}</div>
                            <div class="stat-item-label">30日订单</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-item-value">¥${(rule.total_amount || 0).toLocaleString()}</div>
                            <div class="stat-item-label">30日金额</div>
                        </div>
                    </div>
                </div>
                
                <div class="rule-actions">
                    <button class="btn btn-sm btn-secondary" onclick="pollingManager.testSingleRule(${rule.id})">
                        🧪 测试
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="pollingManager.editRule(${rule.id})">
                        ✏️ 编辑
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="pollingManager.toggleRuleStatus(${rule.id})">
                        ${rule.status === 'active' ? '🔒 禁用' : '🔓 启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="pollingManager.deleteRule(${rule.id})">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `;
    }
    
    getRuleTypeText(ruleType) {
        const types = {
            'round_robin': '🔄 轮询',
            'weight': '⚖️ 加权',
            'amount_based': '📊 分层'
        };
        return types[ruleType] || ruleType;
    }
    
    showCreateRuleModal() {
        this.currentEditingRule = null;
        this.resetRuleForm();
        document.getElementById('ruleModalTitle').textContent = '新建轮询规则';
        this.showModal('ruleModal');
    }
    
    resetRuleForm() {
        document.getElementById('ruleForm').reset();
        document.getElementById('ruleId').value = '';
        
        // 重置规则类型选择
        document.querySelectorAll('.rule-type-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 隐藏所有配置区域
        document.querySelectorAll('.config-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // 清空分层配置
        document.getElementById('amountTiers').innerHTML = '';
        
        // 清除错误信息
        document.querySelectorAll('.error-message').forEach(elem => {
            elem.textContent = '';
        });
    }
    
    selectRuleType(ruleType) {
        // 更新选择状态
        document.querySelectorAll('.rule-type-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-type="${ruleType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        const radioInput = document.querySelector(`input[value="${ruleType}"]`);
        if (radioInput) {
            radioInput.checked = true;
        }
        
        // 显示对应配置区域
        document.querySelectorAll('.config-section').forEach(section => {
            section.style.display = 'none';
        });
        
        const configMap = {
            'round_robin': 'roundRobinConfig',
            'weight': 'weightConfig',
            'amount_based': 'amountBasedConfig'
        };
        
        const configSection = document.getElementById(configMap[ruleType]);
        if (configSection) {
            configSection.style.display = 'block';
        }
        
        // 特殊处理
        if (ruleType === 'amount_based' && !document.querySelectorAll('.amount-tier').length) {
            this.addAmountTier();
        }
        
        // 加载对应的账户选择器
        this.loadAvailableAccounts();
    }
    
    addAmountTier(tierData = null, index = null) {
        const tiersContainer = document.getElementById('amountTiers');
        const tierIndex = index !== null ? index : tiersContainer.children.length;
        
        const tierDiv = document.createElement('div');
        tierDiv.className = 'amount-tier';
        tierDiv.innerHTML = `
            <div class="tier-header">
                <div class="tier-title">金额分层 ${tierIndex + 1}</div>
                <button type="button" class="tier-remove" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="tier-config">
                <div class="form-group">
                    <label class="form-label">最小金额</label>
                    <input type="number" class="form-input amount-input" name="minAmount" 
                           placeholder="0.01" step="0.01" min="0" 
                           value="${tierData ? tierData.min_amount || '' : ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">最大金额</label>
                    <input type="number" class="form-input amount-input" name="maxAmount" 
                           placeholder="10000" step="0.01" min="0.01" 
                           value="${tierData ? tierData.max_amount || '' : ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">分层规则</label>
                    <select class="form-select" name="tierRuleType" required>
                        <option value="round_robin" ${tierData && tierData.rule_type === 'round_robin' ? 'selected' : ''}>轮询</option>
                        <option value="weight" ${tierData && tierData.rule_type === 'weight' ? 'selected' : ''}>加权</option>
                    </select>
                </div>
            </div>
        `;
        
        tiersContainer.appendChild(tierDiv);
    }
    
    async loadAvailableAccounts() {
        try {
            const paymentType = document.getElementById('rulePaymentType').value;
            if (!paymentType) return;
            
            const response = await fetch(`/api/payment-accounts?payment_type=${paymentType}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderAccountsSelector(data.data || []);
            }
        } catch (error) {
            console.error('加载可用账户失败:', error);
        }
    }
    
    renderAccountsSelector(accounts) {
        const selector = document.getElementById('accountsSelector');
        if (!selector) return;
        
        selector.innerHTML = accounts.map(account => `
            <div class="account-option">
                <input type="checkbox" class="account-checkbox" value="${account.id}" id="account_${account.id}">
                <label for="account_${account.id}" class="account-info">
                    <div class="account-name">${account.account_name}</div>
                    <div class="account-details">
                        ${account.account_number} - ${this.getInstitutionName(account.institution_type, account.institution_name)}
                    </div>
                </label>
            </div>
        `).join('');
    }
    
    async saveRule() {
        if (!this.validateRuleForm()) return;
        
        const formData = this.collectRuleFormData();
        
        try {
            const url = this.currentEditingRule ? 
                `/api/polling/rules/${this.currentEditingRule.id}` : 
                '/api/polling/rules';
            
            const method = this.currentEditingRule ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideModal('ruleModal');
                this.showSuccess(data.message || '规则保存成功');
                this.loadRules();
                this.loadStats();
            } else {
                this.showError(data.message || '保存失败');
            }
        } catch (error) {
            console.error('保存规则失败:', error);
            this.showError('网络错误，请稍后重试');
        }
    }
    
    validateRuleForm() {
        // 清除之前的错误信息
        document.querySelectorAll('.error-message').forEach(elem => {
            elem.textContent = '';
        });
        
        const ruleName = document.getElementById('ruleName').value.trim();
        const paymentType = document.getElementById('rulePaymentType').value;
        const ruleType = document.querySelector('input[name="ruleType"]:checked')?.value;
        
        let isValid = true;
        
        if (!ruleName) {
            this.showFormError('ruleNameError', '请输入规则名称');
            isValid = false;
        }
        
        if (!paymentType) {
            this.showFormError('paymentTypeError', '请选择支付类型');
            isValid = false;
        }
        
        if (!ruleType) {
            this.showFormError('ruleTypeError', '请选择规则类型');
            isValid = false;
        }
        
        return isValid;
    }
    
    collectRuleFormData() {
        const ruleName = document.getElementById('ruleName').value.trim();
        const paymentType = document.getElementById('rulePaymentType').value;
        const ruleType = document.querySelector('input[name="ruleType"]:checked').value;
        
        const formData = {
            rule_name: ruleName,
            payment_type: paymentType,
            rule_type: ruleType,
            rule_config: this.collectRuleConfig(ruleType),
            account_ids: this.getSelectedAccountIds()
        };
        
        return formData;
    }
    
    collectRuleConfig(ruleType) {
        const config = {};
        
        switch (ruleType) {
            case 'amount_based':
                config.tiers = [];
                document.querySelectorAll('.amount-tier').forEach((tier, index) => {
                    const minAmount = parseFloat(tier.querySelector('[name="minAmount"]').value);
                    const maxAmount = parseFloat(tier.querySelector('[name="maxAmount"]').value);
                    const tierRuleType = tier.querySelector('[name="tierRuleType"]').value;
                    
                    config.tiers.push({
                        min_amount: minAmount,
                        max_amount: maxAmount,
                        rule_type: tierRuleType,
                        account_ids: []
                    });
                });
                break;
        }
        
        return config;
    }
    
    getSelectedAccountIds() {
        const selectedIds = [];
        document.querySelectorAll('.account-checkbox:checked').forEach(checkbox => {
            selectedIds.push(parseInt(checkbox.value));
        });
        return selectedIds;
    }
    
    async toggleRuleStatus(ruleId) {
        const rule = this.currentRules.find(r => r.id === ruleId);
        if (!rule) return;
        
        const newStatus = rule.status === 'active' ? 'disabled' : 'active';
        const action = newStatus === 'active' ? '启用' : '禁用';
        
        if (!confirm(`确定要${action}此规则吗？`)) return;
        
        try {
            const response = await fetch(`/api/polling/rules/${ruleId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`规则已${action}`);
                this.loadRules();
                this.loadStats();
            } else {
                this.showError(data.message || `${action}失败`);
            }
        } catch (error) {
            console.error('更新规则状态失败:', error);
            this.showError('操作失败，请稍后重试');
        }
    }
    
    async deleteRule(ruleId) {
        if (!confirm('确定要删除此规则吗？删除后不可恢复。')) return;
        
        try {
            const response = await fetch(`/api/polling/rules/${ruleId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('规则已删除');
                this.loadRules();
                this.loadStats();
            } else {
                this.showError(data.message || '删除失败');
            }
        } catch (error) {
            console.error('删除规则失败:', error);
            this.showError('删除失败，请稍后重试');
        }
    }
    
    showTestModal() {
        this.showModal('testModal');
        document.getElementById('testResults').style.display = 'none';
    }
    
    async runRuleTest() {
        const paymentType = document.getElementById('testPaymentType').value;
        const amount = parseFloat(document.getElementById('testAmount').value);
        const testCount = parseInt(document.getElementById('testCount').value);
        
        if (!paymentType || !amount || !testCount) {
            this.showError('请填写完整的测试参数');
            return;
        }
        
        try {
            const response = await fetch('/api/polling/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_type: paymentType,
                    amount: amount,
                    test_count: testCount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderTestResults(data.data);
            } else {
                this.showError(data.message || '测试失败');
            }
        } catch (error) {
            console.error('运行测试失败:', error);
            this.showError('测试失败，请稍后重试');
        }
    }
    
    renderTestResults(testData) {
        const resultsDiv = document.getElementById('testResults');
        const contentDiv = document.getElementById('testResultsContent');
        
        let resultsHTML = `
            <div class="test-summary">
                <p><strong>测试结果</strong>: ${testData.success_count}/${testData.test_count} 次成功</p>
                <p><strong>成功率</strong>: ${((testData.success_count / testData.test_count) * 100).toFixed(1)}%</p>
            </div>
        `;
        
        if (testData.results && Object.keys(testData.results).length > 0) {
            resultsHTML += '<div class="account-distribution"><h4>账户分配情况:</h4>';
            
            Object.entries(testData.results).forEach(([accountId, count]) => {
                const percentage = testData.success_count > 0 ? 
                    ((count / testData.success_count) * 100).toFixed(1) : 0;
                resultsHTML += `
                    <div class="test-result-item">
                        <div class="result-account">账户 ${accountId}</div>
                        <div>
                            <span class="result-count">${count}次</span>
                            <span class="result-percentage">${percentage}%</span>
                        </div>
                    </div>
                `;
            });
            
            resultsHTML += '</div>';
        }
        
        if (testData.errors && testData.errors.length > 0) {
            resultsHTML += '<div class="test-errors"><h4>错误信息:</h4>';
            testData.errors.forEach(error => {
                resultsHTML += `<div class="error-item">• ${error}</div>`;
            });
            resultsHTML += '</div>';
        }
        
        contentDiv.innerHTML = resultsHTML;
        resultsDiv.style.display = 'block';
    }
    
    filterRules() {
        const paymentTypeFilter = document.getElementById('paymentTypeFilter').value;
        const ruleTypeFilter = document.getElementById('ruleTypeFilter').value;
        
        let filteredRules = this.currentRules;
        
        if (paymentTypeFilter) {
            filteredRules = filteredRules.filter(rule => rule.payment_type === paymentTypeFilter);
        }
        
        if (ruleTypeFilter) {
            filteredRules = filteredRules.filter(rule => rule.rule_type === ruleTypeFilter);
        }
        
        const grid = document.getElementById('rulesGrid');
        if (filteredRules.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <div>未找到符合条件的规则</div>
                </div>
            `;
        } else {
            grid.innerHTML = filteredRules.map(rule => this.renderRuleCard(rule)).join('');
        }
    }
    
    // 工具方法
    getInstitutionName(type, name) {
        const typeNames = {
            'bank': '银行',
            'alipay': '支付宝',
            'wechat': '微信',
            'other': '其他'
        };
        return name || typeNames[type] || type;
    }
    
    formatDateTime(datetime) {
        if (!datetime) return '-';
        const date = new Date(datetime);
        return date.toLocaleString('zh-CN');
    }
    
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    showSuccess(message) {
        alert('✅ ' + message);
    }
    
    showError(message) {
        alert('❌ ' + message);
    }
    
    showFormError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
}

// 初始化轮询规则管理器
const pollingManager = new PollingRuleManager();
// 添加轮询管理器错误处理
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 检查必要元素是否存在
        const requiredElements = [
            'pollingRulesTable',
            'addPollingRuleBtn'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.warn('⚠️ 轮询管理器：缺少必要元素', missingElements);
            return;
        }
        
        // 安全初始化轮询管理器
        if (typeof PollingRuleManager !== 'undefined') {
            window.pollingManager = new PollingRuleManager();
            console.log('✅ 轮询管理器初始化成功');
        }
        
    } catch (error) {
        console.error('❌ 轮询管理器初始化错误:', error);
    }
});