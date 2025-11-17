/**
 * Order Number Rules Manager
 * 订单号规则管理增强版 - 完整的规则管理功能
 */

class OrderNumberRulesManager {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/order-rules',
            pageSize: 20,
            autoRefresh: 30000,
            enableRealTimePreview: true,
            ...options
        };
        
        this.state = {
            rules: [],
            currentRules: [],
            selectedRules: new Set(),
            currentPage: 1,
            totalPages: 1,
            totalRecords: 0,
            filters: {
                search: '',
                status: ''
            },
            isLoading: false,
            editingRule: null
        };
        
        this.elements = {};
        this.autoRefreshTimer = null;
        this.previewTimer = null;
        
        this.init();
    }
    
    /**
     * 初始化订单号规则管理系统
     */
    init() {
        console.log('Initializing Order Number Rules Manager...');
        this.initializeElements();
        this.bindEvents();
        this.loadRules();
        this.loadCurrentRules();
        this.updateStatistics();
        this.setupAutoRefresh();
        console.log('Order Number Rules Manager initialized successfully');
    }
    
    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.elements = {
            // 统计卡片
            totalRulesCount: document.getElementById('totalRulesCount'),
            activeRulesCount: document.getElementById('activeRulesCount'),
            todayGeneratedCount: document.getElementById('todayGeneratedCount'),
            successRate: document.getElementById('successRate'),
            
            // 当前规则网格
            currentRulesGrid: document.getElementById('currentRulesGrid'),
            
            // 操作按钮
            testOrderNumberBtn: document.getElementById('testOrderNumberBtn'),
            createRuleBtn: document.getElementById('createRuleBtn'),
            refreshRulesBtn: document.getElementById('refreshRulesBtn'),
            
            // 搜索和筛选
            rulesSearch: document.getElementById('rulesSearch'),
            ruleStatusFilter: document.getElementById('ruleStatusFilter'),
            
            // 表格和分页
            rulesTableBody: document.getElementById('rulesTableBody'),
            selectAllRules: document.getElementById('selectAllRules'),
            
            pageStart: document.getElementById('pageStart'),
            pageEnd: document.getElementById('pageEnd'),
            totalRules: document.getElementById('totalRules'),
            paginationNumbers: document.getElementById('paginationNumbers'),
            firstPage: document.getElementById('firstPage'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            lastPage: document.getElementById('lastPage'),
            
            // 模态框
            ruleModal: document.getElementById('ruleModal'),
            testModal: document.getElementById('testModal'),
            deleteRuleModal: document.getElementById('deleteRuleModal')
        };
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 页面操作按钮
        if (this.elements.testOrderNumberBtn) {
            this.elements.testOrderNumberBtn.addEventListener('click', () => this.showTestModal());
        }
        
        if (this.elements.createRuleBtn) {
            this.elements.createRuleBtn.addEventListener('click', () => this.showCreateRuleModal());
        }
        
        if (this.elements.refreshRulesBtn) {
            this.elements.refreshRulesBtn.addEventListener('click', () => this.refreshRules());
        }
        
        // 搜索和筛选
        if (this.elements.rulesSearch) {
            this.elements.rulesSearch.addEventListener('input', (e) => {
                this.debounce(() => this.handleSearch(e.target.value), 300);
            });
        }
        
        if (this.elements.ruleStatusFilter) {
            this.elements.ruleStatusFilter.addEventListener('change', (e) => this.handleStatusFilter(e.target.value));
        }
        
        // 全选操作
        if (this.elements.selectAllRules) {
            this.elements.selectAllRules.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }
        
        // 分页事件
        this.bindPaginationEvents();
        
        // 模态框事件
        this.bindModalEvents();
    }
    
    /**
     * 绑定分页事件
     */
    bindPaginationEvents() {
        if (this.elements.firstPage) {
            this.elements.firstPage.addEventListener('click', () => this.goToPage(1));
        }
        
        if (this.elements.prevPage) {
            this.elements.prevPage.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        
        if (this.elements.nextPage) {
            this.elements.nextPage.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
        
        if (this.elements.lastPage) {
            this.elements.lastPage.addEventListener('click', () => this.goToPage(this.state.totalPages));
        }
    }
    
    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        // 规则创建/编辑模态框
        const ruleModal = this.elements.ruleModal;
        if (ruleModal) {
            const closeBtn = ruleModal.querySelector('#ruleModalClose');
            const cancelBtn = ruleModal.querySelector('#cancelRuleBtn');
            const testBtn = ruleModal.querySelector('#testRuleBtn');
            const saveBtn = ruleModal.querySelector('#saveRuleBtn');
            const form = ruleModal.querySelector('#ruleForm');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(ruleModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(ruleModal));
            if (testBtn) testBtn.addEventListener('click', () => this.testCurrentRule());
            if (form) form.addEventListener('submit', (e) => this.handleSaveRule(e));
            
            // 表单实时预览
            if (this.options.enableRealTimePreview) {
                this.bindFormPreviewEvents(ruleModal);
            }
            
            ruleModal.addEventListener('click', (e) => {
                if (e.target === ruleModal) this.hideModal(ruleModal);
            });
        }
        
        // 测试模态框
        const testModal = this.elements.testModal;
        if (testModal) {
            const closeBtn = testModal.querySelector('#testModalClose');
            const cancelBtn = testModal.querySelector('#cancelTestBtn');
            const startBtn = testModal.querySelector('#startTestBtn');
            const clearBtn = testModal.querySelector('#clearTestBtn');
            const exportBtn = testModal.querySelector('#exportTestBtn');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(testModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(testModal));
            if (startBtn) startBtn.addEventListener('click', () => this.startTest());
            if (clearBtn) clearBtn.addEventListener('click', () => this.clearTestResults());
            if (exportBtn) exportBtn.addEventListener('click', () => this.exportTestResults());
            
            testModal.addEventListener('click', (e) => {
                if (e.target === testModal) this.hideModal(testModal);
            });
        }
        
        // 删除确认模态框
        const deleteModal = this.elements.deleteRuleModal;
        if (deleteModal) {
            const closeBtn = deleteModal.querySelector('#deleteRuleModalClose');
            const cancelBtn = deleteModal.querySelector('#cancelDeleteRule');
            const confirmBtn = deleteModal.querySelector('#confirmDeleteRule');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(deleteModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(deleteModal));
            if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleDeleteRule());
            
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) this.hideModal(deleteModal);
            });
        }
    }
    
    /**
     * 绑定表单预览事件
     */
    bindFormPreviewEvents(modal) {
        const inputs = modal.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.updatePreview());
            input.addEventListener('change', () => this.updatePreview());
        });
    }
    
    /**
     * 加载规则列表
     */
    async loadRules() {
        try {
            this.state.isLoading = true;
            this.showLoadingState();
            
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // 生成演示数据
            const demoRules = this.generateDemoRules();
            this.state.rules = demoRules;
            this.state.totalRecords = demoRules.length;
            this.state.totalPages = Math.ceil(this.state.totalRecords / this.options.pageSize);
            
            this.renderRules();
            this.updatePagination();
            this.updateStatistics();
            
            console.log('Rules loaded successfully');
            
        } catch (error) {
            console.error('Failed to load rules:', error);
            this.showToast('加载规则列表失败', 'error');
        } finally {
            this.state.isLoading = false;
        }
    }
    
    /**
     * 加载当前活跃规则
     */
    async loadCurrentRules() {
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 400));
            
            const currentRules = this.state.rules.filter(rule => rule.status === 'active');
            this.state.currentRules = currentRules;
            
            this.renderCurrentRules();
            
        } catch (error) {
            console.error('Failed to load current rules:', error);
            this.showToast('加载当前规则失败', 'error');
        }
    }
    
    /**
     * 生成演示规则数据
     */
    generateDemoRules() {
        const businessTypes = ['recharge', 'withdrawal', 'transfer', 'refund'];
        const statuses = ['active', 'inactive', 'draft'];
        const prefixes = ['CJ', 'RO', 'WD', 'TF', 'RF'];
        
        const rules = [];
        
        for (let i = 1; i <= 15; i++) {
            const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
            const status = i <= 8 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60));
            
            rules.push({
                id: `rule_${i.toString().padStart(3, '0')}`,
                name: `${this.getBusinessTypeText(businessType)}规则_${i.toString().padStart(2, '0')}`,
                businessType: businessType,
                prefixType: 'fixed',
                prefixValue: prefix,
                dateFormat: Math.random() > 0.5 ? 'YYYYMMDD' : '',
                numberLength: Math.floor(Math.random() * 5) + 6,
                generationStrategy: Math.random() > 0.5 ? 'sequential' : 'random',
                resetCycle: Math.random() > 0.7 ? 'daily' : 'never',
                startNumber: 1,
                separator: Math.random() > 0.7 ? '-' : '',
                status: status,
                description: `${this.getBusinessTypeText(businessType)}订单号生成规则`,
                createdAt: createdDate,
                updatedAt: createdDate,
                createdBy: '系统管理员',
                usageCount: Math.floor(Math.random() * 10000),
                lastUsed: status === 'active' ? new Date(Date.now() - Math.random() * 86400000) : null
            });
        }
        
        return rules.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }
    
    /**
     * 渲染当前规则网格
     */
    renderCurrentRules() {
        if (!this.elements.currentRulesGrid) return;
        
        if (this.state.currentRules.length === 0) {
            this.elements.currentRulesGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📝</div>
                    <h3>暂无活跃规则</h3>
                    <p>请创建并启用订单号生成规则</p>
                </div>
            `;
            return;
        }
        
        this.elements.currentRulesGrid.innerHTML = this.state.currentRules.map(rule => `
            <div class="current-rule-card" data-rule-id="${rule.id}">
                <div class="rule-card-header">
                    <h3 class="rule-card-title">${this.escapeHtml(rule.name)}</h3>
                    <span class="rule-card-status rule-card-status--${rule.status}">
                        ${this.getStatusText(rule.status)}
                    </span>
                </div>
                
                <div class="rule-card-details">
                    <div class="rule-detail">
                        <span class="rule-detail-label">业务类型</span>
                        <span class="rule-detail-value">${this.getBusinessTypeText(rule.businessType)}</span>
                    </div>
                    <div class="rule-detail">
                        <span class="rule-detail-label">前缀格式</span>
                        <span class="rule-detail-value">${rule.prefixValue}</span>
                    </div>
                    <div class="rule-detail">
                        <span class="rule-detail-label">编号长度</span>
                        <span class="rule-detail-value">${rule.numberLength}位</span>
                    </div>
                    <div class="rule-detail">
                        <span class="rule-detail-label">使用次数</span>
                        <span class="rule-detail-value">${rule.usageCount.toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="rule-card-preview">
                    <div class="rule-preview-label">示例订单号</div>
                    <div class="rule-preview-example">
                        ${this.generateExampleOrderNumber(rule)}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 渲染规则表格
     */
    renderRules() {
        if (!this.elements.rulesTableBody) return;
        
        const filteredRules = this.getFilteredRules();
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageRules = filteredRules.slice(startIndex, endIndex);
        
        if (pageRules.length === 0) {
            this.elements.rulesTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                            <p>暂无规则数据</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.elements.rulesTableBody.innerHTML = pageRules.map(rule => `
            <tr data-rule-id="${rule.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="rule-checkbox" value="${rule.id}" 
                           onchange="window.orderRulesManager.handleRuleSelection('${rule.id}', this.checked)">
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="font-weight: 500; color: var(--color-text-primary);">${this.escapeHtml(rule.name)}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">
                            ${rule.description}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="business-type-badge business-type-badge--${rule.businessType}">
                        ${this.getBusinessTypeText(rule.businessType)}
                    </span>
                </td>
                <td>
                    <span style="font-family: 'Courier New', monospace; font-weight: 500;">
                        ${this.formatRulePattern(rule)}
                    </span>
                </td>
                <td>
                    <span style="font-weight: 500;">${rule.numberLength}位</span>
                </td>
                <td>
                    <span class="status-badge status-badge--${rule.status}">
                        ${this.getStatusText(rule.status)}
                    </span>
                </td>
                <td>
                    <div style="font-size: 0.875rem;">
                        <div>${this.formatDate(rule.updatedAt)}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">
                            ${rule.createdBy}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="rule-actions">
                        <button class="rule-action-btn" 
                                onclick="window.orderRulesManager.showEditRuleModal('${rule.id}')"
                                title="编辑规则">
                            <span>✏️</span>
                        </button>
                        <button class="rule-action-btn" 
                                onclick="window.orderRulesManager.duplicateRule('${rule.id}')"
                                title="复制规则">
                            <span>📋</span>
                        </button>
                        ${rule.status === 'active' ? `
                            <button class="rule-action-btn" 
                                    onclick="window.orderRulesManager.toggleRuleStatus('${rule.id}', 'inactive')"
                                    title="禁用规则">
                                <span>⏸️</span>
                            </button>
                        ` : `
                            <button class="rule-action-btn rule-action-btn--primary" 
                                    onclick="window.orderRulesManager.toggleRuleStatus('${rule.id}', 'active')"
                                    title="启用规则">
                                <span>▶️</span>
                            </button>
                        `}
                        <button class="rule-action-btn rule-action-btn--danger" 
                                onclick="window.orderRulesManager.showDeleteModal('${rule.id}')"
                                title="删除规则">
                            <span>🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    /**
     * 获取过滤后的规则列表
     */
    getFilteredRules() {
        let filteredRules = [...this.state.rules];
        
        // 搜索过滤
        if (this.state.filters.search) {
            const searchTerm = this.state.filters.search.toLowerCase();
            filteredRules = filteredRules.filter(rule => 
                rule.name.toLowerCase().includes(searchTerm) ||
                rule.description.toLowerCase().includes(searchTerm) ||
                rule.prefixValue.toLowerCase().includes(searchTerm)
            );
        }
        
        // 状态过滤
        if (this.state.filters.status) {
            filteredRules = filteredRules.filter(rule => rule.status === this.state.filters.status);
        }
        
        return filteredRules;
    }
    
    /**
     * 显示创建规则模态框
     */
    showCreateRuleModal() {
        const modal = this.elements.ruleModal;
        if (modal) {
            this.state.editingRule = null;
            
            // 重置表单
            const form = modal.querySelector('#ruleForm');
            if (form) form.reset();
            
            // 更新标题
            const title = modal.querySelector('#ruleModalTitle');
            if (title) title.textContent = '创建订单号规则';
            
            // 设置默认值
            this.setFormDefaults(modal);
            
            this.showModal(modal);
            this.updatePreview();
        }
    }
    
    /**
     * 显示编辑规则模态框
     */
    showEditRuleModal(ruleId) {
        const rule = this.state.rules.find(r => r.id === ruleId);
        if (!rule) return;
        
        const modal = this.elements.ruleModal;
        if (modal) {
            this.state.editingRule = rule;
            
            // 更新标题
            const title = modal.querySelector('#ruleModalTitle');
            if (title) title.textContent = '编辑订单号规则';
            
            // 填充表单数据
            this.populateForm(modal, rule);
            
            this.showModal(modal);
            this.updatePreview();
        }
    }
    
    /**
     * 设置表单默认值
     */
    setFormDefaults(modal) {
        const defaults = {
            prefixType: 'fixed',
            prefixValue: 'CJ',
            numberLength: 8,
            generationStrategy: 'sequential',
            resetCycle: 'never',
            startNumber: 1
        };
        
        Object.keys(defaults).forEach(key => {
            const input = modal.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'radio') {
                    const radio = modal.querySelector(`[name="${key}"][value="${defaults[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = defaults[key];
                }
            }
        });
    }
    
    /**
     * 填充表单数据
     */
    populateForm(modal, rule) {
        const fields = [
            'ruleName', 'businessType', 'ruleDescription', 
            'prefixType', 'prefixValue', 'dateFormat', 
            'numberLength', 'startNumber', 'separator'
        ];
        
        fields.forEach(field => {
            const input = modal.querySelector(`[name="${field}"]`);
            if (input && rule[field] !== undefined) {
                input.value = rule[field];
            }
        });
        
        // 处理单选按钮
        const radioFields = ['generationStrategy', 'resetCycle'];
        radioFields.forEach(field => {
            if (rule[field]) {
                const radio = modal.querySelector(`[name="${field}"][value="${rule[field]}"]`);
                if (radio) radio.checked = true;
            }
        });
    }
    
    /**
     * 实时更新预览
     */
    updatePreview() {
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
        }
        
        this.previewTimer = setTimeout(() => {
            const modal = this.elements.ruleModal;
            if (!modal || !modal.classList.contains('show')) return;
            
            const formData = this.getFormData(modal);
            const previewResult = modal.querySelector('#previewResult');
            const previewExamples = modal.querySelector('#previewExamples');
            
            if (formData.prefixValue && formData.numberLength) {
                const exampleNumber = this.generateExampleFromForm(formData);
                
                if (previewResult) {
                    previewResult.innerHTML = `<span style="color: var(--color-primary); font-weight: 600;">${exampleNumber}</span>`;
                }
                
                if (previewExamples) {
                    const examples = this.generateMultipleExamples(formData, 6);
                    previewExamples.innerHTML = examples.map(example => `
                        <div class="preview-example">${example}</div>
                    `).join('');
                }
            } else {
                if (previewResult) {
                    previewResult.innerHTML = '<span class="preview-placeholder">请完善规则配置以查看预览</span>';
                }
                if (previewExamples) {
                    previewExamples.innerHTML = '';
                }
            }
        }, 200);
    }
    
    /**
     * 获取表单数据
     */
    getFormData(modal) {
        const formData = {};
        const inputs = modal.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.type === 'radio') {
                if (input.checked) {
                    formData[input.name] = input.value;
                }
            } else if (input.type === 'checkbox') {
                formData[input.name] = input.checked;
            } else {
                formData[input.name] = input.value;
            }
        });
        
        return formData;
    }
    
    /**
     * 根据表单数据生成示例订单号
     */
    generateExampleFromForm(formData) {
        let orderNumber = formData.prefixValue || '';
        
        if (formData.separator && formData.dateFormat) {
            orderNumber += formData.separator;
        }
        
        if (formData.dateFormat) {
            const now = new Date();
            switch (formData.dateFormat) {
                case 'YYYYMMDD':
                    orderNumber += now.toISOString().slice(0, 10).replace(/-/g, '');
                    break;
                case 'YYMMDD':
                    orderNumber += now.toISOString().slice(2, 10).replace(/-/g, '');
                    break;
                case 'YYYYMM':
                    orderNumber += now.toISOString().slice(0, 7).replace(/-/g, '');
                    break;
                case 'YYMM':
                    orderNumber += now.toISOString().slice(2, 7).replace(/-/g, '');
                    break;
            }
            
            if (formData.separator) {
                orderNumber += formData.separator;
            }
        } else if (formData.separator) {
            orderNumber += formData.separator;
        }
        
        const numberLength = parseInt(formData.numberLength) || 6;
        const startNumber = parseInt(formData.startNumber) || 1;
        
        if (formData.generationStrategy === 'random') {
            const randomNum = Math.floor(Math.random() * Math.pow(10, numberLength));
            orderNumber += randomNum.toString().padStart(numberLength, '0');
        } else if (formData.generationStrategy === 'timestamp') {
            const timestamp = Date.now().toString().slice(-numberLength);
            orderNumber += timestamp.padStart(numberLength, '0');
        } else {
            orderNumber += startNumber.toString().padStart(numberLength, '0');
        }
        
        return orderNumber;
    }
    
    /**
     * 生成多个示例
     */
    generateMultipleExamples(formData, count = 6) {
        const examples = [];
        const originalStrategy = formData.generationStrategy;
        
        for (let i = 0; i < count; i++) {
            if (originalStrategy === 'sequential') {
                formData.startNumber = (parseInt(formData.startNumber) || 1) + i;
            }
            examples.push(this.generateExampleFromForm(formData));
        }
        
        return examples;
    }
    
    /**
     * 根据规则生成示例订单号
     */
    generateExampleOrderNumber(rule) {
        let orderNumber = rule.prefixValue;
        
        if (rule.separator && rule.dateFormat) {
            orderNumber += rule.separator;
        }
        
        if (rule.dateFormat) {
            const now = new Date();
            switch (rule.dateFormat) {
                case 'YYYYMMDD':
                    orderNumber += now.toISOString().slice(0, 10).replace(/-/g, '');
                    break;
                case 'YYMMDD':
                    orderNumber += now.toISOString().slice(2, 10).replace(/-/g, '');
                    break;
                case 'YYYYMM':
                    orderNumber += now.toISOString().slice(0, 7).replace(/-/g, '');
                    break;
                case 'YYMM':
                    orderNumber += now.toISOString().slice(2, 7).replace(/-/g, '');
                    break;
            }
            
            if (rule.separator) {
                orderNumber += rule.separator;
            }
        } else if (rule.separator) {
            orderNumber += rule.separator;
        }
        
        if (rule.generationStrategy === 'random') {
            const randomNum = Math.floor(Math.random() * Math.pow(10, rule.numberLength));
            orderNumber += randomNum.toString().padStart(rule.numberLength, '0');
        } else if (rule.generationStrategy === 'timestamp') {
            const timestamp = Date.now().toString().slice(-rule.numberLength);
            orderNumber += timestamp.padStart(rule.numberLength, '0');
        } else {
            const currentNumber = rule.usageCount || rule.startNumber;
            orderNumber += currentNumber.toString().padStart(rule.numberLength, '0');
        }
        
        return orderNumber;
    }
    
    /**
     * 格式化规则模式
     */
    formatRulePattern(rule) {
        let pattern = rule.prefixValue;
        
        if (rule.dateFormat) {
            if (rule.separator) pattern += rule.separator;
            pattern += `{${rule.dateFormat}}`;
            if (rule.separator) pattern += rule.separator;
        } else if (rule.separator) {
            pattern += rule.separator;
        }
        
        pattern += `{${rule.numberLength}位编号}`;
        
        return pattern;
    }
    
    /**
     * 显示测试模态框
     */
    showTestModal() {
        const modal = this.elements.testModal;
        if (modal) {
            // 填充规则选择器
            const ruleSelect = modal.querySelector('#testRuleSelect');
            if (ruleSelect) {
                const activeRules = this.state.rules.filter(rule => rule.status === 'active');
                ruleSelect.innerHTML = '<option value="">选择要测试的规则</option>' +
                    activeRules.map(rule => `<option value="${rule.id}">${rule.name}</option>`).join('');
            }
            
            // 清空测试结果
            this.clearTestResults();
            
            this.showModal(modal);
        }
    }
    
    /**
     * 开始测试
     */
    async startTest() {
        const modal = this.elements.testModal;
        const ruleSelect = modal.querySelector('#testRuleSelect');
        const testCount = modal.querySelector('#testCount');
        const testUniqueness = modal.querySelector('#testUniqueness');
        const testValidation = modal.querySelector('#testValidation');
        const resultsBody = modal.querySelector('#testResultsBody');
        const stats = modal.querySelector('#testStats');
        
        if (!ruleSelect.value) {
            this.showToast('请选择要测试的规则', 'warning');
            return;
        }
        
        const rule = this.state.rules.find(r => r.id === ruleSelect.value);
        const count = parseInt(testCount.value) || 10;
        
        try {
            // 显示测试进度
            resultsBody.innerHTML = `
                <div class="test-placeholder">
                    <div class="loading-spinner"></div>
                    正在生成测试数据...
                </div>
            `;
            
            // 模拟测试延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const results = [];
            const uniqueNumbers = new Set();
            let duplicateCount = 0;
            let validationErrors = 0;
            
            // 生成测试订单号
            for (let i = 0; i < count; i++) {
                const orderNumber = this.generateExampleOrderNumber(rule);
                let status = 'success';
                let error = null;
                
                // 唯一性测试
                if (testUniqueness.checked) {
                    if (uniqueNumbers.has(orderNumber)) {
                        status = 'error';
                        error = '重复订单号';
                        duplicateCount++;
                    } else {
                        uniqueNumbers.add(orderNumber);
                    }
                }
                
                // 格式验证测试
                if (testValidation.checked && status === 'success') {
                    if (!this.validateOrderNumberFormat(orderNumber, rule)) {
                        status = 'error';
                        error = '格式验证失败';
                        validationErrors++;
                    }
                }
                
                results.push({
                    index: i + 1,
                    orderNumber,
                    status,
                    error
                });
            }
            
            // 渲染结果
            resultsBody.innerHTML = results.map(result => `
                <div class="test-result-item">
                    <span class="test-result-number">${result.orderNumber}</span>
                    <span class="test-result-status test-result-status--${result.status}">
                        ${result.status === 'success' ? '通过' : result.error}
                    </span>
                </div>
            `).join('');
            
            // 更新统计信息
            const successCount = results.filter(r => r.status === 'success').length;
            const successRate = ((successCount / count) * 100).toFixed(1);
            
            stats.innerHTML = `
                <span>成功: ${successCount}</span>
                <span>失败: ${count - successCount}</span>
                <span>成功率: ${successRate}%</span>
                ${duplicateCount > 0 ? `<span>重复: ${duplicateCount}</span>` : ''}
                ${validationErrors > 0 ? `<span>格式错误: ${validationErrors}</span>` : ''}
            `;
            
        } catch (error) {
            console.error('Test failed:', error);
            this.showToast('测试执行失败', 'error');
        }
    }
    
    /**
     * 验证订单号格式
     */
    validateOrderNumberFormat(orderNumber, rule) {
        // 基本格式验证
        if (!orderNumber || orderNumber.length < rule.prefixValue.length) {
            return false;
        }
        
        // 前缀验证
        if (!orderNumber.startsWith(rule.prefixValue)) {
            return false;
        }
        
        // 长度验证（简化）
        const expectedMinLength = rule.prefixValue.length + rule.numberLength + 
            (rule.dateFormat ? this.getDateFormatLength(rule.dateFormat) : 0) +
            (rule.separator ? rule.separator.length * (rule.dateFormat ? 2 : 1) : 0);
        
        return orderNumber.length >= expectedMinLength - 2; // 允许一定误差
    }
    
    /**
     * 获取日期格式长度
     */
    getDateFormatLength(format) {
        switch (format) {
            case 'YYYYMMDD': return 8;
            case 'YYMMDD': return 6;
            case 'YYYYMM': return 6;
            case 'YYMM': return 4;
            default: return 0;
        }
    }
    
    /**
     * 清空测试结果
     */
    clearTestResults() {
        const modal = this.elements.testModal;
        const resultsBody = modal.querySelector('#testResultsBody');
        const stats = modal.querySelector('#testStats');
        
        if (resultsBody) {
            resultsBody.innerHTML = `
                <div class="test-placeholder">
                    点击"开始测试"按钮进行测试
                </div>
            `;
        }
        
        if (stats) {
            stats.innerHTML = '';
        }
    }
    
    /**
     * 导出测试结果
     */
    exportTestResults() {
        const modal = this.elements.testModal;
        const resultItems = modal.querySelectorAll('.test-result-item');
        
        if (resultItems.length === 0) {
            this.showToast('没有测试结果可导出', 'warning');
            return;
        }
        
        const results = Array.from(resultItems).map(item => {
            const number = item.querySelector('.test-result-number').textContent;
            const status = item.querySelector('.test-result-status').textContent;
            return `${number}\t${status}`;
        });
        
        const content = '订单号\t状态\n' + results.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `order_number_test_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('测试结果已导出', 'success');
    }
    
    /**
     * 处理保存规则
     */
    async handleSaveRule(e) {
        e.preventDefault();
        
        const modal = this.elements.ruleModal;
        const form = e.target;
        const formData = this.getFormData(modal);
        const saveBtn = modal.querySelector('#saveRuleBtn');
        
        try {
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.querySelector('.btn__text').style.display = 'none';
                saveBtn.querySelector('.btn__loading').style.display = 'flex';
            }
            
            // 表单验证
            if (!formData.ruleName || !formData.businessType || !formData.prefixValue) {
                this.showToast('请填写必填字段', 'warning');
                return;
            }
            
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const ruleData = {
                id: this.state.editingRule ? this.state.editingRule.id : `rule_${Date.now()}`,
                name: formData.ruleName,
                businessType: formData.businessType,
                description: formData.ruleDescription || '',
                prefixType: formData.prefixType,
                prefixValue: formData.prefixValue,
                dateFormat: formData.dateFormat || '',
                numberLength: parseInt(formData.numberLength) || 6,
                generationStrategy: formData.generationStrategy || 'sequential',
                resetCycle: formData.resetCycle || 'never',
                startNumber: parseInt(formData.startNumber) || 1,
                separator: formData.separator || '',
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: '系统管理员',
                usageCount: 0,
                lastUsed: null
            };
            
            if (this.state.editingRule) {
                // 更新现有规则
                const index = this.state.rules.findIndex(r => r.id === this.state.editingRule.id);
                if (index !== -1) {
                    this.state.rules[index] = { ...this.state.rules[index], ...ruleData };
                }
                this.showToast('规则更新成功', 'success');
            } else {
                // 创建新规则
                this.state.rules.unshift(ruleData);
                this.showToast('规则创建成功', 'success');
            }
            
            this.hideModal(modal);
            this.renderRules();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Save rule failed:', error);
            this.showToast('保存规则失败，请重试', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn__text').style.display = 'inline';
                saveBtn.querySelector('.btn__loading').style.display = 'none';
            }
        }
    }
    
    /**
     * 切换规则状态
     */
    async toggleRuleStatus(ruleId, newStatus) {
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const rule = this.state.rules.find(r => r.id === ruleId);
            if (rule) {
                rule.status = newStatus;
                rule.updatedAt = new Date();
                
                this.showToast(`规则已${newStatus === 'active' ? '启用' : '禁用'}`, 'success');
                
                this.renderRules();
                this.loadCurrentRules();
                this.updateStatistics();
            }
            
        } catch (error) {
            console.error('Toggle rule status failed:', error);
            this.showToast('操作失败，请重试', 'error');
        }
    }
    
    /**
     * 复制规则
     */
    async duplicateRule(ruleId) {
        try {
            const rule = this.state.rules.find(r => r.id === ruleId);
            if (!rule) return;
            
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const newRule = {
                ...rule,
                id: `rule_${Date.now()}`,
                name: `${rule.name}_副本`,
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
                usageCount: 0,
                lastUsed: null
            };
            
            this.state.rules.unshift(newRule);
            
            this.showToast('规则复制成功', 'success');
            this.renderRules();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Duplicate rule failed:', error);
            this.showToast('复制规则失败，请重试', 'error');
        }
    }
    
    /**
     * 显示删除模态框
     */
    showDeleteModal(ruleId) {
        const rule = this.state.rules.find(r => r.id === ruleId);
        if (!rule) return;
        
        const modal = this.elements.deleteRuleModal;
        if (modal) {
            const nameEl = modal.querySelector('#deleteRuleName');
            if (nameEl) nameEl.textContent = rule.name;
            
            modal.dataset.ruleId = ruleId;
            this.showModal(modal);
        }
    }
    
    /**
     * 处理删除规则
     */
    async handleDeleteRule() {
        const modal = this.elements.deleteRuleModal;
        const ruleId = modal.dataset.ruleId;
        const confirmBtn = modal.querySelector('#confirmDeleteRule');
        
        if (!ruleId) return;
        
        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.querySelector('.btn__text').style.display = 'none';
                confirmBtn.querySelector('.btn__loading').style.display = 'flex';
            }
            
            // 模拟删除操作
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // 从列表中移除
            this.state.rules = this.state.rules.filter(r => r.id !== ruleId);
            
            this.hideModal(modal);
            this.showToast('规则已删除', 'success');
            
            // 重新渲染
            this.renderRules();
            this.loadCurrentRules();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Delete rule failed:', error);
            this.showToast('删除规则失败，请重试', 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.querySelector('.btn__text').style.display = 'inline';
                confirmBtn.querySelector('.btn__loading').style.display = 'none';
            }
        }
    }
    
    /**
     * 处理搜索
     */
    handleSearch(searchTerm) {
        this.state.filters.search = searchTerm;
        this.state.currentPage = 1;
        this.renderRules();
        this.updatePagination();
    }
    
    /**
     * 处理状态筛选
     */
    handleStatusFilter(status) {
        this.state.filters.status = status;
        this.state.currentPage = 1;
        this.renderRules();
        this.updatePagination();
    }
    
    /**
     * 处理规则选择
     */
    handleRuleSelection(ruleId, isSelected) {
        if (isSelected) {
            this.state.selectedRules.add(ruleId);
        } else {
            this.state.selectedRules.delete(ruleId);
        }
        
        this.updateBatchOperationsState();
    }
    
    /**
     * 处理全选
     */
    handleSelectAll(isSelected) {
        const checkboxes = document.querySelectorAll('.rule-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isSelected;
            const ruleId = checkbox.value;
            if (isSelected) {
                this.state.selectedRules.add(ruleId);
            } else {
                this.state.selectedRules.delete(ruleId);
            }
        });
        
        this.updateBatchOperationsState();
    }
    
    /**
     * 更新批量操作按钮状态
     */
    updateBatchOperationsState() {
        // 更新全选复选框状态
        if (this.elements.selectAllRules) {
            const allCheckboxes = document.querySelectorAll('.rule-checkbox');
            const checkedCheckboxes = document.querySelectorAll('.rule-checkbox:checked');
            
            if (checkedCheckboxes.length === 0) {
                this.elements.selectAllRules.indeterminate = false;
                this.elements.selectAllRules.checked = false;
            } else if (checkedCheckboxes.length === allCheckboxes.length) {
                this.elements.selectAllRules.indeterminate = false;
                this.elements.selectAllRules.checked = true;
            } else {
                this.elements.selectAllRules.indeterminate = true;
                this.elements.selectAllRules.checked = false;
            }
        }
    }
    
    /**
     * 刷新规则
     */
    refreshRules() {
        this.showToast('正在刷新规则列表...', 'info');
        this.loadRules();
        this.loadCurrentRules();
    }
    
    /**
     * 更新统计数据
     */
    updateStatistics() {
        const stats = {
            totalCount: this.state.rules.length,
            activeCount: this.state.rules.filter(r => r.status === 'active').length,
            todayGenerated: Math.floor(Math.random() * 5000) + 1000,
            successRate: 99.8
        };
        
        if (this.elements.totalRulesCount) {
            this.elements.totalRulesCount.textContent = stats.totalCount;
        }
        
        if (this.elements.activeRulesCount) {
            this.elements.activeRulesCount.textContent = stats.activeCount;
        }
        
        if (this.elements.todayGeneratedCount) {
            this.elements.todayGeneratedCount.textContent = stats.todayGenerated.toLocaleString();
        }
        
        if (this.elements.successRate) {
            this.elements.successRate.textContent = `${stats.successRate}%`;
        }
    }
    
    /**
     * 更新分页
     */
    updatePagination() {
        const filteredRules = this.getFilteredRules();
        this.state.totalRecords = filteredRules.length;
        this.state.totalPages = Math.ceil(this.state.totalRecords / this.options.pageSize);
        
        // 更新分页信息
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize + 1;
        const endIndex = Math.min(this.state.currentPage * this.options.pageSize, this.state.totalRecords);
        
        if (this.elements.pageStart) this.elements.pageStart.textContent = startIndex;
        if (this.elements.pageEnd) this.elements.pageEnd.textContent = endIndex;
        if (this.elements.totalRules) this.elements.totalRules.textContent = this.state.totalRecords;
        
        // 更新分页按钮状态
        if (this.elements.firstPage) this.elements.firstPage.disabled = this.state.currentPage === 1;
        if (this.elements.prevPage) this.elements.prevPage.disabled = this.state.currentPage === 1;
        if (this.elements.nextPage) this.elements.nextPage.disabled = this.state.currentPage === this.state.totalPages;
        if (this.elements.lastPage) this.elements.lastPage.disabled = this.state.currentPage === this.state.totalPages;
        
        // 生成页码
        this.generatePaginationNumbers();
    }
    
    /**
     * 生成分页页码
     */
    generatePaginationNumbers() {
        if (!this.elements.paginationNumbers) return;
        
        const currentPage = this.state.currentPage;
        const totalPages = this.state.totalPages;
        const delta = 2;
        
        let pages = [];
        
        const startPage = Math.max(1, currentPage - delta);
        const endPage = Math.min(totalPages, currentPage + delta);
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        this.elements.paginationNumbers.innerHTML = pages.map(page => `
            <button class="pagination-number ${page === currentPage ? 'active' : ''}" 
                    onclick="window.orderRulesManager.goToPage(${page})">
                ${page}
            </button>
        `).join('');
    }
    
    /**
     * 跳转到指定页
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages) return;
        
        this.state.currentPage = page;
        this.renderRules();
        this.updatePagination();
    }
    
    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
        if (this.options.autoRefresh && this.options.autoRefresh > 0) {
            this.autoRefreshTimer = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.loadRules();
                    this.loadCurrentRules();
                }
            }, this.options.autoRefresh);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoadingState() {
        if (this.elements.rulesTableBody) {
            this.elements.rulesTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="8">
                        <div class="loading-spinner"></div>
                        <span>正在加载规则列表...</span>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * 显示模态框
     */
    showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * 隐藏模态框
     */
    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
        }
    }
    
    /**
     * 显示消息提示
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
    
    /**
     * 工具方法
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN');
    }
    
    getBusinessTypeText(type) {
        const typeMap = {
            'recharge': '充值订单',
            'withdrawal': '提现订单',
            'transfer': '转账订单',
            'refund': '退款订单'
        };
        return typeMap[type] || type;
    }
    
    getStatusText(status) {
        const statusMap = {
            'active': '启用',
            'inactive': '禁用',
            'draft': '草稿'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
        }
    }
}

// 导出到全局
window.OrderNumberRulesManager = OrderNumberRulesManager;

// 模块导出支持
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderNumberRulesManager;
}