/**
 * 轮询规则模态框组件
 * 用于创建和编辑轮询规则
 */
class RotationRuleModal {
    constructor(options = {}) {
        this.options = {
            mode: 'create', // 'create' or 'edit'
            onSave: null,
            onCancel: null,
            ...options
        };
        
        this.modalId = 'rotationRuleModal_' + Date.now();
        this.currentRule = null;
        this.merchants = [];
        this.accounts = [];
        this.initialized = false;
        
        // 不在构造函数中调用init，而是在show方法中调用
    }

    async init() {
        if (this.initialized) {
            return;
        }
        
        console.log('初始化轮询规则模态框:', this.modalId);
        await this.loadMerchants();
        this.createModal();
        this.bindEvents();
        this.initialized = true;
        console.log('轮询规则模态框初始化完成:', this.modalId);
    }

    async loadMerchants() {
        try {
            const response = await fetch('/api/v1/merchants?limit=1000');
            if (response.ok) {
                const data = await response.json();
                this.merchants = data.data || [];
            }
        } catch (error) {
            console.error('加载商户列表失败:', error);
        }
    }

    async loadAccounts(merchantId) {
        if (!merchantId) {
            this.accounts = [];
            return;
        }
        
        try {
            const response = await fetch(`/api/v1/merchants/${merchantId}/accounts`);
            if (response.ok) {
                const data = await response.json();
                this.accounts = data.data || [];
            }
        } catch (error) {
            console.error('加载收款账户失败:', error);
            this.accounts = [];
        }
    }

    createModal() {
        const modalHtml = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1" role="dialog" aria-labelledby="${this.modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.modalId}Label">
                                ${this.options.mode === 'create' ? '添加轮询规则' : '编辑轮询规则'}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                        </div>
                        <div class="modal-body">
                            <form id="${this.modalId}Form" class="rotation-rule-form">
                                <!-- 基本信息 -->
                                <div class="form-section">
                                    <h6 class="section-title">基本信息</h6>
                                    
                                    <div class="form-group">
                                        <label for="merchantId">商户 <span class="text-danger">*</span></label>
                                        <select class="form-control" id="merchantId" name="merchant_id" required>
                                            <option value="">请选择商户</option>
                                            ${this.merchants.map(merchant => 
                                                `<option value="${merchant.id}">${merchant.name} (${merchant.code})</option>`
                                            ).join('')}
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="ruleName">规则名称 <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="ruleName" name="rule_name" 
                                               placeholder="请输入规则名称" maxlength="100" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="strategyType">轮询策略 <span class="text-danger">*</span></label>
                                        <select class="form-control" id="strategyType" name="strategy_type" required>
                                            <option value="">请选择轮询策略</option>
                                            <option value="weighted">权重轮询</option>
                                            <option value="round_robin">轮询</option>
                                            <option value="time_based">时间段轮询</option>
                                            <option value="amount_tier">金额分层轮询</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="priority">优先级</label>
                                        <input type="number" class="form-control" id="priority" name="priority" 
                                               placeholder="数字越小优先级越高" min="1" value="1">
                                    </div>
                                </div>

                                <!-- 策略配置 -->
                                <div class="form-section">
                                    <h6 class="section-title">策略配置</h6>
                                    <div id="strategyConfig" class="strategy-config-container">
                                        <div class="alert alert-info">
                                            <i class="fas fa-info-circle"></i>
                                            请先选择轮询策略
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" id="${this.modalId}SaveBtn">
                                ${this.options.mode === 'create' ? '创建' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 移除已存在的模态框
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // 添加新模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    bindEvents() {
        const modal = document.getElementById(this.modalId);
        const form = document.getElementById(`${this.modalId}Form`);
        const saveBtn = document.getElementById(`${this.modalId}SaveBtn`);
        const merchantSelect = document.getElementById('merchantId');
        const strategySelect = document.getElementById('strategyType');

        // 商户选择变化事件
        merchantSelect.addEventListener('change', async (e) => {
            await this.loadAccounts(e.target.value);
            this.updateStrategyConfig();
        });

        // 策略类型变化事件
        strategySelect.addEventListener('change', () => {
            this.updateStrategyConfig();
        });

        // 保存按钮事件
        saveBtn.addEventListener('click', () => {
            this.handleSave();
        });

        // 模态框关闭事件
        if (typeof $ !== 'undefined' && $.fn.modal) {
            $(modal).on('hidden.bs.modal', () => {
                if (this.options.onCancel) {
                    this.options.onCancel();
                }
                modal.remove();
            });
        } else {
            // 原生JavaScript事件监听
            modal.addEventListener('hidden.bs.modal', () => {
                if (this.options.onCancel) {
                    this.options.onCancel();
                }
                modal.remove();
            });
        }
    }

    updateStrategyConfig() {
        const strategyType = document.getElementById('strategyType').value;
        const configContainer = document.getElementById('strategyConfig');
        
        if (!strategyType) {
            configContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    请先选择轮询策略
                </div>
            `;
            return;
        }

        let configHtml = '';
        
        switch (strategyType) {
            case 'weighted':
                configHtml = this.createWeightedConfig();
                break;
            case 'round_robin':
                configHtml = this.createRoundRobinConfig();
                break;
            case 'time_based':
                configHtml = this.createTimeBasedConfig();
                break;
            case 'amount_tier':
                configHtml = this.createAmountTierConfig();
                break;
        }

        configContainer.innerHTML = configHtml;
        this.bindStrategyEvents();
    }

    createWeightedConfig() {
        if (this.accounts.length === 0) {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    请先选择商户以加载收款账户
                </div>
            `;
        }

        return `
            <div class="weighted-config">
                <p class="text-muted">为每个收款账户设置权重，权重越高被选中的概率越大</p>
                <div class="account-weights">
                    ${this.accounts.map(account => `
                        <div class="form-group row">
                            <div class="col-md-8">
                                <label class="form-control-plaintext">
                                    ${account.account_name} (${account.account_number})
                                </label>
                            </div>
                            <div class="col-md-4">
                                <input type="number" class="form-control account-weight" 
                                       data-account-id="${account.id}" 
                                       placeholder="权重" min="1" value="1">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createRoundRobinConfig() {
        return `
            <div class="round-robin-config">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    轮询策略将按顺序选择收款账户，无需额外配置
                </div>
            </div>
        `;
    }

    createTimeBasedConfig() {
        if (this.accounts.length === 0) {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    请先选择商户以加载收款账户
                </div>
            `;
        }

        const hours = Array.from({length: 24}, (_, i) => i);
        
        return `
            <div class="time-based-config">
                <p class="text-muted">为不同时间段配置使用的收款账户</p>
                <div class="time-slots">
                    ${hours.map(hour => `
                        <div class="form-group">
                            <label>${hour}:00 - ${hour + 1}:00</label>
                            <select class="form-control time-slot-accounts" data-hour="${hour}" multiple>
                                ${this.accounts.map(account => 
                                    `<option value="${account.id}">${account.account_name} (${account.account_number})</option>`
                                ).join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createAmountTierConfig() {
        if (this.accounts.length === 0) {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    请先选择商户以加载收款账户
                </div>
            `;
        }

        return `
            <div class="amount-tier-config">
                <p class="text-muted">根据交易金额配置使用的收款账户</p>
                <div class="tiers-container">
                    <div class="tier-item" data-tier="0">
                        <div class="tier-header">
                            <h6>金额分层 1</h6>
                            <button type="button" class="btn btn-sm btn-danger remove-tier" style="display: none;">删除</button>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <label>最小金额</label>
                                <input type="number" class="form-control tier-min-amount" 
                                       placeholder="最小金额" min="0" step="0.01">
                            </div>
                            <div class="col-md-6">
                                <label>最大金额</label>
                                <input type="number" class="form-control tier-max-amount" 
                                       placeholder="最大金额" min="0" step="0.01">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>使用的收款账户</label>
                            <select class="form-control tier-accounts" multiple>
                                ${this.accounts.map(account => 
                                    `<option value="${account.id}">${account.account_name} (${account.account_number})</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary add-tier">
                    <i class="fas fa-plus"></i> 添加分层
                </button>
            </div>
        `;
    }

    bindStrategyEvents() {
        // 添加分层按钮事件
        const addTierBtn = document.querySelector('.add-tier');
        if (addTierBtn) {
            addTierBtn.addEventListener('click', () => {
                this.addTier();
            });
        }

        // 删除分层按钮事件
        document.querySelectorAll('.remove-tier').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeTier(e.target.closest('.tier-item'));
            });
        });

        this.updateTierButtons();
    }

    addTier() {
        const container = document.querySelector('.tiers-container');
        const tierCount = container.children.length;
        
        const tierHtml = `
            <div class="tier-item" data-tier="${tierCount}">
                <div class="tier-header">
                    <h6>金额分层 ${tierCount + 1}</h6>
                    <button type="button" class="btn btn-sm btn-danger remove-tier">删除</button>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label>最小金额</label>
                        <input type="number" class="form-control tier-min-amount" 
                               placeholder="最小金额" min="0" step="0.01">
                    </div>
                    <div class="col-md-6">
                        <label>最大金额</label>
                        <input type="number" class="form-control tier-max-amount" 
                               placeholder="最大金额" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>使用的收款账户</label>
                    <select class="form-control tier-accounts" multiple>
                        ${this.accounts.map(account => 
                            `<option value="${account.id}">${account.account_name} (${account.account_number})</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', tierHtml);
        
        // 重新绑定删除事件
        const newTier = container.lastElementChild;
        newTier.querySelector('.remove-tier').addEventListener('click', (e) => {
            this.removeTier(e.target.closest('.tier-item'));
        });
        
        this.updateTierButtons();
    }

    removeTier(tierElement) {
        tierElement.remove();
        this.updateTierButtons();
        this.updateTierNumbers();
    }

    updateTierButtons() {
        const tiers = document.querySelectorAll('.tier-item');
        tiers.forEach((tier, index) => {
            const removeBtn = tier.querySelector('.remove-tier');
            if (removeBtn) {
                removeBtn.style.display = tiers.length > 1 ? 'inline-block' : 'none';
            }
        });
    }

    updateTierNumbers() {
        const tiers = document.querySelectorAll('.tier-item');
        tiers.forEach((tier, index) => {
            tier.setAttribute('data-tier', index);
            tier.querySelector('h6').textContent = `金额分层 ${index + 1}`;
        });
    }

    buildStrategyConfig() {
        const strategyType = document.getElementById('strategyType').value;
        
        switch (strategyType) {
            case 'weighted':
                return this.buildWeightedConfig();
            case 'round_robin':
                return {};
            case 'time_based':
                return this.buildTimeBasedConfig();
            case 'amount_tier':
                return this.buildAmountTierConfig();
            default:
                return {};
        }
    }

    buildWeightedConfig() {
        const weights = {};
        document.querySelectorAll('.account-weight').forEach(input => {
            const accountId = input.getAttribute('data-account-id');
            const weight = parseInt(input.value) || 1;
            weights[accountId] = weight;
        });
        return { weights };
    }

    buildTimeBasedConfig() {
        const timeSlots = {};
        document.querySelectorAll('.time-slot-accounts').forEach(select => {
            const hour = select.getAttribute('data-hour');
            const selectedAccounts = Array.from(select.selectedOptions).map(option => option.value);
            if (selectedAccounts.length > 0) {
                timeSlots[hour] = selectedAccounts;
            }
        });
        return { time_slots: timeSlots };
    }

    buildAmountTierConfig() {
        const tiers = [];
        document.querySelectorAll('.tier-item').forEach(tierElement => {
            const minAmount = parseFloat(tierElement.querySelector('.tier-min-amount').value);
            const maxAmount = parseFloat(tierElement.querySelector('.tier-max-amount').value);
            const accountSelect = tierElement.querySelector('.tier-accounts');
            const selectedAccounts = Array.from(accountSelect.selectedOptions).map(option => option.value);
            
            if (selectedAccounts.length > 0) {
                const tier = { account_ids: selectedAccounts };
                if (!isNaN(minAmount)) tier.min_amount = minAmount;
                if (!isNaN(maxAmount)) tier.max_amount = maxAmount;
                tiers.push(tier);
            }
        });
        return { tiers };
    }

    async handleSave() {
        const form = document.getElementById(`${this.modalId}Form`);
        const formData = new FormData(form);
        
        // 验证表单
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const data = {
            merchant_id: formData.get('merchant_id'),
            rule_name: formData.get('rule_name'),
            strategy_type: formData.get('strategy_type'),
            strategy_config: this.buildStrategyConfig(),
            priority: parseInt(formData.get('priority')) || 1
        };

        try {
            const saveBtn = document.getElementById(`${this.modalId}SaveBtn`);
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';

            let response;
            if (this.options.mode === 'create') {
                response = await fetch('/api/v1/rotation-rules', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            } else {
                response = await fetch(`/api/v1/rotation-rules/${this.currentRule.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                const result = await response.json();
                if (this.options.onSave) {
                    this.options.onSave(result.data);
                }
                this.hide();
            } else {
                const error = await response.json();
                throw new Error(error.message || '保存失败');
            }
        } catch (error) {
            console.error('保存轮询规则失败:', error);
            alert('保存失败: ' + error.message);
        } finally {
            const saveBtn = document.getElementById(`${this.modalId}SaveBtn`);
            saveBtn.disabled = false;
            saveBtn.textContent = this.options.mode === 'create' ? '创建' : '保存';
        }
    }

    async show(rule = null) {
        console.log('开始显示轮询规则模态框, rule:', rule);
        
        // 确保模态框已初始化
        if (!this.initialized) {
            console.log('模态框未初始化，开始初始化...');
            await this.init();
        }
        
        this.currentRule = rule;
        
        // 显示模态框
        const modalElement = document.getElementById(this.modalId);
        if (!modalElement) {
            console.error('模态框元素不存在:', this.modalId);
            return;
        }

        console.log('模态框元素已找到，准备显示:', this.modalId);

        if (rule) {
            // 编辑模式，填充数据
            document.getElementById('merchantId').value = rule.merchant_id;
            document.getElementById('ruleName').value = rule.rule_name;
            document.getElementById('strategyType').value = rule.strategy_type;
            document.getElementById('priority').value = rule.priority;
            
            // 加载账户并更新配置
            await this.loadAccounts(rule.merchant_id);
            this.updateStrategyConfig();
            
            // 填充策略配置
            this.fillStrategyConfig(rule.strategy_config);
        }

        // 尝试多种显示方式
        if (typeof $ !== 'undefined' && $.fn.modal) {
            console.log('使用jQuery显示模态框');
            $(`#${this.modalId}`).modal('show');
        } else if (window.bootstrap && window.bootstrap.Modal) {
            console.log('使用Bootstrap 5显示模态框');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            console.log('使用手动方式显示模态框');
            // 手动显示模态框
            modalElement.style.display = 'block';
            modalElement.classList.add('show', 'fade');
            document.body.classList.add('modal-open');
            
            // 添加背景遮罩
            if (!document.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                backdrop.style.zIndex = '1040';
                document.body.appendChild(backdrop);
                
                // 点击背景关闭模态框
                backdrop.addEventListener('click', () => {
                    this.hide();
                });
            }
            
            // 设置模态框z-index
            modalElement.style.zIndex = '1050';
            
            // 添加淡入效果
            setTimeout(() => {
                modalElement.classList.add('show');
            }, 10);
        }

        console.log('模态框显示命令已执行');
    }

    fillStrategyConfig(config) {
        const strategyType = document.getElementById('strategyType').value;
        
        switch (strategyType) {
            case 'weighted':
                this.fillWeightedConfig(config);
                break;
            case 'time_based':
                this.fillTimeBasedConfig(config);
                break;
            case 'amount_tier':
                this.fillAmountTierConfig(config);
                break;
        }
    }

    fillWeightedConfig(config) {
        if (config.weights) {
            Object.entries(config.weights).forEach(([accountId, weight]) => {
                const input = document.querySelector(`[data-account-id="${accountId}"]`);
                if (input) {
                    input.value = weight;
                }
            });
        }
    }

    fillTimeBasedConfig(config) {
        if (config.time_slots) {
            Object.entries(config.time_slots).forEach(([hour, accountIds]) => {
                const select = document.querySelector(`[data-hour="${hour}"]`);
                if (select) {
                    Array.from(select.options).forEach(option => {
                        option.selected = accountIds.includes(option.value);
                    });
                }
            });
        }
    }

    fillAmountTierConfig(config) {
        if (config.tiers && config.tiers.length > 0) {
            const container = document.querySelector('.tiers-container');
            container.innerHTML = '';
            
            config.tiers.forEach((tier, index) => {
                this.addTier();
                const tierElement = container.children[index];
                
                if (tier.min_amount !== undefined) {
                    tierElement.querySelector('.tier-min-amount').value = tier.min_amount;
                }
                if (tier.max_amount !== undefined) {
                    tierElement.querySelector('.tier-max-amount').value = tier.max_amount;
                }
                
                const select = tierElement.querySelector('.tier-accounts');
                Array.from(select.options).forEach(option => {
                    option.selected = tier.account_ids.includes(option.value);
                });
            });
        }
    }

    hide() {
        const modalElement = document.getElementById(this.modalId);
        if (!modalElement) {
            return;
        }

        console.log('隐藏模态框:', this.modalId);

        // 尝试多种隐藏方式
        if (typeof $ !== 'undefined' && $.fn.modal) {
            console.log('使用jQuery隐藏模态框');
            $(`#${this.modalId}`).modal('hide');
        } else if (window.bootstrap && window.bootstrap.Modal) {
            console.log('使用Bootstrap 5隐藏模态框');
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        } else {
            console.log('使用手动方式隐藏模态框');
            // 手动隐藏模态框
            modalElement.classList.remove('show');
            
            // 添加淡出效果
            setTimeout(() => {
                modalElement.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                // 移除背景遮罩
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                
                // 移除模态框元素
                modalElement.remove();
            }, 300);
        }
    }
}

// 导出到全局作用域
window.RotationRuleModal = RotationRuleModal;