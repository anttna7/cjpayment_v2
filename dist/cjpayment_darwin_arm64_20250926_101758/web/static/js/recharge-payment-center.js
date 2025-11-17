// 充值支付管理中心 JavaScript
class RechargePaymentCenter {
    constructor() {
        this.currentTab = 'config';
        this.links = [];
        this.config = {};

        // 网关管理相关数据
        this.gateways = [
            {
                id: 1,
                gatewayName: '主支付网关',
                gatewayCode: 'primary_gateway',
                gatewayType: 'primary',
                status: 'online',
                priority: 0,
                weight: 100,
                successRate: 99.2,
                responseTime: 245,
                supportedCurrencies: ['CNY', 'USD'],
                description: '主要支付网关'
            },
            {
                id: 2,
                gatewayName: '备用支付网关1',
                gatewayCode: 'backup_gateway_1',
                gatewayType: 'backup',
                status: 'online',
                priority: 1,
                weight: 80,
                successRate: 98.1,
                responseTime: 278,
                supportedCurrencies: ['CNY', 'USD'],
                description: '备用支付网关1'
            },
            {
                id: 3,
                gatewayName: '备用支付网关2',
                gatewayCode: 'backup_gateway_2',
                gatewayType: 'backup',
                status: 'online',
                priority: 2,
                weight: 60,
                successRate: 97.8,
                responseTime: 312,
                supportedCurrencies: ['CNY'],
                description: '备用支付网关2'
            }
        ];

        this.gatewayConfig = {
            loadBalanceStrategy: 'weighted_random',
            enableWeightedRouting: true,
            maxRetryCount: 3,
            timeoutSeconds: 30,
            enableGatewayFailover: true,
            healthCheckInterval: 60,
            failureThreshold: 5,
            recoveryThreshold: 3
        };

        this.init();
    }

    init() {
        console.log('🚀 充值支付管理中心初始化...');

        this.initTabs();
        this.initConfigSection();
        this.initGatewaysSection();
        this.initLinksSection();
        this.initAnalyticsSection();
        this.initTestingSection();
        this.loadInitialData();

        console.log('✅ 充值支付管理中心初始化完成');
    }

    // ================== 标签页管理 ==================
    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('tab-button--active');
            btn.setAttribute('aria-selected', 'false');
        });

        // 更新面板状态
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('tab-panel--active');
        });

        // 激活选中的标签
        const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
        const activePanel = document.getElementById(`${tabId}Panel`);

        if (activeButton && activePanel) {
            activeButton.classList.add('tab-button--active');
            activeButton.setAttribute('aria-selected', 'true');
            activePanel.classList.add('tab-panel--active');

            this.currentTab = tabId;
            this.onTabSwitch(tabId);
        }
    }

    onTabSwitch(tabId) {
        console.log(`📋 切换到标签页: ${tabId}`);

        switch (tabId) {
            case 'config':
                this.refreshConfigData();
                break;
            case 'gateways':
                this.refreshGatewaysData();
                break;
            case 'links':
                this.refreshLinksData();
                break;
            case 'analytics':
                this.refreshAnalyticsData();
                break;
            case 'testing':
                this.refreshTestingTools();
                break;
        }
    }

    // ================== 系统配置管理 ==================
    initConfigSection() {
        // 保存配置按钮
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveConfiguration());
        }

        // 重置配置按钮
        const resetConfigBtn = document.getElementById('resetConfigBtn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => this.resetConfiguration());
        }

        // 配置项变更监听
        this.setupConfigChangeListeners();
    }

    setupConfigChangeListeners() {
        const configInputs = document.querySelectorAll('#configPanel input, #configPanel select, #configPanel textarea');

        configInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markConfigAsChanged();
            });
        });
    }

    markConfigAsChanged() {
        const saveBtn = document.getElementById('saveConfigBtn');
        if (saveBtn) {
            saveBtn.classList.add('btn--warning');
            saveBtn.innerHTML = '<span class="btn__icon">⚠️</span><span class="btn__text">配置已修改</span>';
        }
    }

    async saveConfiguration() {
        const saveBtn = document.getElementById('saveConfigBtn');

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn__icon">⏳</span><span class="btn__text">保存中...</span>';

            // 收集配置数据
            const config = this.collectConfigData();

            // 模拟保存API调用
            await this.simulateApiCall(1000);

            // 保存成功
            saveBtn.classList.remove('btn--warning');
            saveBtn.innerHTML = '<span class="btn__icon">✅</span><span class="btn__text">保存成功</span>';

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('配置保存成功', '', 'success');
            }

            setTimeout(() => {
                saveBtn.innerHTML = '<span class="btn__icon">💾</span><span class="btn__text">保存配置</span>';
                saveBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('配置保存失败:', error);
            saveBtn.innerHTML = '<span class="btn__icon">❌</span><span class="btn__text">保存失败</span>';

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('配置保存失败', error.message, 'error');
            }

            setTimeout(() => {
                saveBtn.innerHTML = '<span class="btn__icon">💾</span><span class="btn__text">保存配置</span>';
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    collectConfigData() {
        return {
            rechargeBaseDomain: document.getElementById('rechargeBaseDomain')?.value,
            enableSSLForRecharge: document.getElementById('enableSSLForRecharge')?.checked,
            domainSuffixLength: document.getElementById('domainSuffixLength')?.value,
            minPayAmount: document.getElementById('minPayAmount')?.value,
            maxPayAmount: document.getElementById('maxPayAmount')?.value,
            feeRate: document.getElementById('feeRate')?.value,
            enableDynamicFee: document.getElementById('enableDynamicFee')?.checked,
            sessionTimeout: document.getElementById('sessionTimeout')?.value,
            enableIPRestriction: document.getElementById('enableIPRestriction')?.checked
        };
    }

    resetConfiguration() {
        if (confirm('确定要重置所有配置到默认值吗？此操作不可撤销。')) {
            this.loadDefaultConfig();
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('配置已重置', '', 'info');
            }
        }
    }

    // ================== 链接管理 ==================
    initLinksSection() {
        // 创建链接按钮
        const createLinkBtn = document.getElementById('createLinkBtn');
        if (createLinkBtn) {
            createLinkBtn.addEventListener('click', () => this.createNewLink());
        }

        // 批量操作按钮
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.showBulkActions());
        }

        // 搜索功能
        const searchInput = document.getElementById('linkSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchLinks(e.target.value));
        }

        // 筛选功能
        const typeFilter = document.getElementById('linkTypeFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterLinks());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterLinks());
        }

        // 全选功能
        const selectAllLinks = document.getElementById('selectAllLinks');
        if (selectAllLinks) {
            selectAllLinks.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        }

        // 为现有的链接操作按钮添加事件监听器
        this.bindExistingLinkActions();
    }

    // 为现有的链接操作按钮绑定事件
    bindExistingLinkActions() {
        // 编辑按钮
        const editButtons = document.querySelectorAll('.btn-action--edit');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const linkId = btn.getAttribute('data-link-id') || 'link_001';
                this.editLink(linkId);
            });
        });

        // 复制按钮
        const copyButtons = document.querySelectorAll('.btn-action--copy');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const linkUrl = btn.getAttribute('data-link-url') || 'https://pay.cjpayment.com/abc123';
                this.copyLink(linkUrl);
            });
        });

        // 禁用/删除按钮
        const disableButtons = document.querySelectorAll('.btn-action--disable');
        disableButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const linkId = btn.getAttribute('data-link-id') || 'link_001';
                this.deleteLink(linkId);
            });
        });
    }

    createNewLink() {
        console.log('📝 创建新的充值链接');

        // 创建专业的创建链接模态框
        const modal = document.createElement('div');
        modal.className = 'create-link-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>创建充值链接</h3>
                        <button class="modal-close" onclick="this.closest('.create-link-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="createLinkForm">
                            <!-- 基础信息 -->
                            <div class="form-section">
                                <h4 class="section-title">基础信息</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>链接名称 *</label>
                                        <input type="text" name="linkTitle" required class="form-input"
                                               placeholder="例如：VIP用户专享充值">
                                    </div>
                                    <div class="form-group">
                                        <label>商户标识</label>
                                        <input type="text" name="merchantId" class="form-input"
                                               placeholder="例如：VIP001" value="RECHARGE_${Date.now()}">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>链接描述</label>
                                    <textarea name="description" class="form-textarea" rows="2"
                                              placeholder="输入链接的详细描述..."></textarea>
                                </div>
                            </div>

                            <!-- 金额配置 -->
                            <div class="form-section">
                                <h4 class="section-title">金额配置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>充值类型</label>
                                        <select name="amountType" class="form-select" onchange="toggleAmountInput(this)">
                                            <option value="fixed">固定金额</option>
                                            <option value="range">金额范围</option>
                                            <option value="custom">用户自定义</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>货币类型</label>
                                        <select name="currency" class="form-select">
                                            <option value="CNY">人民币 (CNY)</option>
                                            <option value="USD">美元 (USD)</option>
                                            <option value="EUR">欧元 (EUR)</option>
                                        </select>
                                    </div>
                                </div>

                                <div id="fixedAmountGroup" class="form-group">
                                    <label>固定金额</label>
                                    <input type="number" name="fixedAmount" class="form-input"
                                           placeholder="100" step="0.01" min="0.01">
                                </div>

                                <div id="rangeAmountGroup" class="form-row" style="display: none;">
                                    <div class="form-group">
                                        <label>最小金额</label>
                                        <input type="number" name="minAmount" class="form-input"
                                               placeholder="10" step="0.01" min="0.01">
                                    </div>
                                    <div class="form-group">
                                        <label>最大金额</label>
                                        <input type="number" name="maxAmount" class="form-input"
                                               placeholder="10000" step="0.01" min="0.01">
                                    </div>
                                </div>

                                <div id="customAmountGroup" class="form-row" style="display: none;">
                                    <div class="form-group">
                                        <label>建议金额 (可选)</label>
                                        <input type="text" name="suggestedAmounts" class="form-input"
                                               placeholder="例如：50,100,200,500">
                                        <small class="form-help">多个金额用逗号分隔</small>
                                    </div>
                                </div>
                            </div>

                            <!-- 支付配置 -->
                            <div class="form-section">
                                <h4 class="section-title">支付配置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>默认支付网关</label>
                                        <select name="defaultGateway" class="form-select">
                                            <option value="auto">自动选择</option>
                                            <option value="primary_gateway">主支付网关</option>
                                            <option value="backup_gateway_1">备用网关1</option>
                                            <option value="backup_gateway_2">备用网关2</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>手续费承担</label>
                                        <select name="feeBearer" class="form-select">
                                            <option value="platform">平台承担</option>
                                            <option value="user">用户承担</option>
                                            <option value="shared">平台用户共担</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 限制设置 -->
                            <div class="form-section">
                                <h4 class="section-title">限制设置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>使用期限</label>
                                        <select name="expirationType" class="form-select" onchange="toggleExpirationInput(this)">
                                            <option value="never">永不过期</option>
                                            <option value="date">指定日期</option>
                                            <option value="days">相对天数</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>使用次数限制</label>
                                        <input type="number" name="usageLimit" class="form-input"
                                               placeholder="0表示无限制" min="0">
                                    </div>
                                </div>

                                <div id="expirationDateGroup" class="form-group" style="display: none;">
                                    <label>过期日期</label>
                                    <input type="datetime-local" name="expirationDate" class="form-input">
                                </div>

                                <div id="expirationDaysGroup" class="form-group" style="display: none;">
                                    <label>有效天数</label>
                                    <input type="number" name="validDays" class="form-input"
                                           placeholder="30" min="1">
                                </div>
                            </div>

                            <!-- 高级设置 -->
                            <div class="form-section">
                                <h4 class="section-title">高级设置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="requireAuth" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>需要用户认证</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="enableNotification" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>启用支付通知</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="allowRefund">
                                            <span class="checkbox-custom"></span>
                                            <span>允许退款</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="trackConversion" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>追踪转化数据</span>
                                        </label>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>成功跳转URL (可选)</label>
                                    <input type="url" name="successUrl" class="form-input"
                                           placeholder="https://example.com/success">
                                </div>

                                <div class="form-group">
                                    <label>失败跳转URL (可选)</label>
                                    <input type="url" name="failureUrl" class="form-input"
                                           placeholder="https://example.com/failure">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.create-link-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" onclick="window.rechargePaymentCenter.submitCreateLink()">创建链接</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        this.addCreateLinkModalStyles();

        // 添加JavaScript功能
        this.addCreateLinkModalScript(modal);

        document.body.appendChild(modal);

        // 焦点到第一个输入框
        setTimeout(() => {
            const firstInput = modal.querySelector('input[name="linkTitle"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // 添加创建链接模态框样式
    addCreateLinkModalStyles() {
        // 检查是否已经添加过样式
        if (document.getElementById('createLinkModalStyles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'createLinkModalStyles';
        styles.textContent = `
            .create-link-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }

            .create-link-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
            }

            .create-link-modal .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                position: relative;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease-out;
            }

            .create-link-modal .modal-header {
                padding: 24px 32px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .create-link-modal .modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }

            .create-link-modal .modal-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 6px;
                transition: background 0.2s;
            }

            .create-link-modal .modal-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .create-link-modal .modal-body {
                padding: 24px 32px;
                overflow-y: auto;
                flex: 1;
            }

            .create-link-modal .form-section {
                margin-bottom: 32px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }

            .create-link-modal .section-title {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .create-link-modal .section-title::before {
                content: '';
                width: 4px;
                height: 16px;
                background: #667eea;
                border-radius: 2px;
            }

            .create-link-modal .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 16px;
            }

            .create-link-modal .form-group {
                margin-bottom: 16px;
            }

            .create-link-modal .form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
            }

            .create-link-modal .form-input,
            .create-link-modal .form-select,
            .create-link-modal .form-textarea {
                width: 100%;
                padding: 10px 14px;
                border: 1.5px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .create-link-modal .form-input:focus,
            .create-link-modal .form-select:focus,
            .create-link-modal .form-textarea:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .create-link-modal .form-textarea {
                resize: vertical;
                min-height: 60px;
            }

            .create-link-modal .form-help {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #6b7280;
            }

            .create-link-modal .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                margin-bottom: 8px;
            }

            .create-link-modal .checkbox-label input[type="checkbox"] {
                display: none;
            }

            .create-link-modal .checkbox-custom {
                width: 18px;
                height: 18px;
                border: 2px solid #d1d5db;
                border-radius: 4px;
                margin-right: 8px;
                position: relative;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .create-link-modal .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
                background: #667eea;
                border-color: #667eea;
            }

            .create-link-modal .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .create-link-modal .modal-footer {
                padding: 20px 32px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #f9fafb;
                border-radius: 0 0 12px 12px;
            }

            .create-link-modal .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .create-link-modal .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .create-link-modal .btn-secondary:hover {
                background: #e5e7eb;
            }

            .create-link-modal .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .create-link-modal .btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .create-link-modal .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -60%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            /* 响应式设计 */
            @media (max-width: 768px) {
                .create-link-modal .modal-content {
                    width: 95%;
                    margin: 20px;
                }

                .create-link-modal .modal-header,
                .create-link-modal .modal-body,
                .create-link-modal .modal-footer {
                    padding-left: 20px;
                    padding-right: 20px;
                }

                .create-link-modal .form-row {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // 添加创建链接模态框脚本功能
    addCreateLinkModalScript(modal) {
        // 添加全局函数用于表单交互
        window.toggleAmountInput = (select) => {
            const fixedGroup = modal.querySelector('#fixedAmountGroup');
            const rangeGroup = modal.querySelector('#rangeAmountGroup');
            const customGroup = modal.querySelector('#customAmountGroup');

            // 隐藏所有组
            fixedGroup.style.display = 'none';
            rangeGroup.style.display = 'none';
            customGroup.style.display = 'none';

            // 显示对应组
            switch (select.value) {
                case 'fixed':
                    fixedGroup.style.display = 'block';
                    break;
                case 'range':
                    rangeGroup.style.display = 'flex';
                    break;
                case 'custom':
                    customGroup.style.display = 'flex';
                    break;
            }
        };

        window.toggleExpirationInput = (select) => {
            const dateGroup = modal.querySelector('#expirationDateGroup');
            const daysGroup = modal.querySelector('#expirationDaysGroup');

            // 隐藏所有组
            dateGroup.style.display = 'none';
            daysGroup.style.display = 'none';

            // 显示对应组
            switch (select.value) {
                case 'date':
                    dateGroup.style.display = 'block';
                    break;
                case 'days':
                    daysGroup.style.display = 'block';
                    break;
            }
        };

        // 点击遮罩层关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // ESC键关闭模态框
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 实时验证
        const form = modal.querySelector('#createLinkForm');
        const inputs = form.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    // 字段验证
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        // 清除之前的错误样式
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // 必填字段验证
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = '此字段为必填项';
        }

        // 特定字段验证
        switch (field.name) {
            case 'linkTitle':
                if (value && value.length < 2) {
                    isValid = false;
                    message = '链接名称至少2个字符';
                }
                break;
            case 'fixedAmount':
            case 'minAmount':
            case 'maxAmount':
                if (value && (isNaN(value) || parseFloat(value) <= 0)) {
                    isValid = false;
                    message = '请输入有效的金额';
                }
                break;
            case 'successUrl':
            case 'failureUrl':
                if (value && !value.match(/^https?:\/\/.+/)) {
                    isValid = false;
                    message = '请输入有效的URL地址';
                }
                break;
        }

        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            errorDiv.style.color = '#ef4444';
            errorDiv.style.fontSize = '12px';
            errorDiv.style.marginTop = '4px';
            field.parentNode.appendChild(errorDiv);
        }

        return isValid;
    }

    // 提交创建链接表单
    submitCreateLink() {
        console.log('💾 提交创建链接表单');

        const form = document.getElementById('createLinkForm');
        const formData = new FormData(form);
        const submitBtn = document.querySelector('.create-link-modal .btn-primary');

        // 表单验证
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('请检查表单中的错误信息', '', 'error');
            }
            return;
        }

        // 收集表单数据
        const linkData = {
            title: formData.get('linkTitle'),
            merchantId: formData.get('merchantId'),
            description: formData.get('description'),
            amountType: formData.get('amountType'),
            currency: formData.get('currency'),
            fixedAmount: formData.get('fixedAmount'),
            minAmount: formData.get('minAmount'),
            maxAmount: formData.get('maxAmount'),
            suggestedAmounts: formData.get('suggestedAmounts'),
            defaultGateway: formData.get('defaultGateway'),
            feeBearer: formData.get('feeBearer'),
            expirationType: formData.get('expirationType'),
            expirationDate: formData.get('expirationDate'),
            validDays: formData.get('validDays'),
            usageLimit: formData.get('usageLimit'),
            requireAuth: formData.get('requireAuth') === 'on',
            enableNotification: formData.get('enableNotification') === 'on',
            allowRefund: formData.get('allowRefund') === 'on',
            trackConversion: formData.get('trackConversion') === 'on',
            successUrl: formData.get('successUrl'),
            failureUrl: formData.get('failureUrl')
        };

        // 显示保存状态
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '创建中...';
        submitBtn.disabled = true;

        // 模拟API请求
        setTimeout(() => {
            try {
                // 生成新链接ID和URL
                const linkId = Date.now();
                const linkUrl = `https://pay.cjpayment.com/recharge/${linkId}`;

                // 添加到链接列表
                this.addLinkToTable({
                    id: linkId,
                    title: linkData.title,
                    url: linkUrl,
                    amount: this.formatAmount(linkData),
                    gateway: linkData.defaultGateway,
                    status: 'active',
                    usage: '0/无限制',
                    created: new Date().toLocaleString()
                });

                // 显示成功消息
                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast(
                        '链接创建成功',
                        `链接地址：${linkUrl}`,
                        'success'
                    );
                }

                // 关闭模态框
                document.querySelector('.create-link-modal').remove();

                console.log('✅ 充值链接创建成功:', linkData);

            } catch (error) {
                console.error('❌ 创建链接失败:', error);

                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast('创建失败', error.message, 'error');
                }

                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }, 1500);
    }

    // 格式化金额显示
    formatAmount(linkData) {
        switch (linkData.amountType) {
            case 'fixed':
                return `${linkData.currency} ${linkData.fixedAmount || '0'}`;
            case 'range':
                return `${linkData.currency} ${linkData.minAmount || '0'} - ${linkData.maxAmount || '∞'}`;
            case 'custom':
                return `${linkData.currency} 用户自定义`;
            default:
                return 'N/A';
        }
    }

    // 添加链接到表格
    addLinkToTable(linkData) {
        const tableBody = document.getElementById('linksTableBody');
        if (!tableBody) return;

        const row = document.createElement('tr');
        row.className = 'link-row';
        row.innerHTML = `
            <td>
                <input type="checkbox" class="link-checkbox" data-link-id="${linkData.id}">
            </td>
            <td>
                <div class="link-info">
                    <div class="link-title">${linkData.title}</div>
                    <div class="link-url">${linkData.url}</div>
                </div>
            </td>
            <td class="amount">${linkData.amount}</td>
            <td class="gateway">${this.getGatewayName(linkData.gateway)}</td>
            <td>
                <span class="status-badge status-${linkData.status}">${this.getStatusText(linkData.status)}</span>
            </td>
            <td class="usage">${linkData.usage}</td>
            <td class="created">${linkData.created}</td>
            <td class="actions">
                <button class="btn-icon edit-btn" onclick="window.rechargePaymentCenter.editLink(${linkData.id})" title="编辑">
                    ✏️
                </button>
                <button class="btn-icon copy-btn" onclick="window.rechargePaymentCenter.copyLink('${linkData.url}')" title="复制链接">
                    📋
                </button>
                <button class="btn-icon delete-btn" onclick="window.rechargePaymentCenter.deleteLink(${linkData.id})" title="删除">
                    🗑️
                </button>
            </td>
        `;

        // 添加到表格顶部（最新的在上面）
        if (tableBody.firstChild) {
            tableBody.insertBefore(row, tableBody.firstChild);
        } else {
            tableBody.appendChild(row);
        }

        // 更新统计数据
        this.updateLinksStats();
    }

    // 获取网关名称
    getGatewayName(gatewayCode) {
        const gatewayNames = {
            'auto': '自动选择',
            'primary_gateway': '主支付网关',
            'backup_gateway_1': '备用网关1',
            'backup_gateway_2': '备用网关2'
        };
        return gatewayNames[gatewayCode] || gatewayCode;
    }

    // 获取状态文本
    getStatusText(status) {
        const statusTexts = {
            'active': '活跃',
            'inactive': '暂停',
            'expired': '已过期',
            'disabled': '已禁用'
        };
        return statusTexts[status] || status;
    }

    // 更新链接统计
    updateLinksStats() {
        const totalLinks = document.querySelectorAll('#linksTableBody .link-row').length;
        const totalElement = document.getElementById('totalLinks');
        if (totalElement) {
            totalElement.textContent = totalLinks;
        }
    }

    showBulkActions() {
        const selectedLinks = document.querySelectorAll('#linksTableBody input[type="checkbox"]:checked');
        if (selectedLinks.length === 0) {
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('请先选择要操作的链接', '', 'warning');
            }
            return;
        }

        console.log(`📋 批量操作 ${selectedLinks.length} 个链接`);

        // 创建专业的批量操作模态框
        const modal = document.createElement('div');
        modal.className = 'bulk-actions-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>批量操作 (${selectedLinks.length}个链接)</h3>
                        <button class="modal-close" onclick="this.closest('.bulk-actions-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="selected-info">
                            <div class="info-item">
                                <span class="info-label">已选择:</span>
                                <span class="info-value">${selectedLinks.length} 个链接</span>
                            </div>
                        </div>

                        <div class="bulk-actions-grid">
                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('enable')">
                                <div class="action-icon">✅</div>
                                <div class="action-content">
                                    <div class="action-title">批量启用</div>
                                    <div class="action-desc">激活选中的链接</div>
                                </div>
                            </div>

                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('disable')">
                                <div class="action-icon">⏸️</div>
                                <div class="action-content">
                                    <div class="action-title">批量禁用</div>
                                    <div class="action-desc">暂停选中的链接</div>
                                </div>
                            </div>

                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('delete')">
                                <div class="action-icon">🗑️</div>
                                <div class="action-content">
                                    <div class="action-title">批量删除</div>
                                    <div class="action-desc">永久删除选中的链接</div>
                                </div>
                            </div>

                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('export')">
                                <div class="action-icon">📊</div>
                                <div class="action-content">
                                    <div class="action-title">导出数据</div>
                                    <div class="action-desc">导出选中链接的数据</div>
                                </div>
                            </div>

                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('updateGateway')">
                                <div class="action-icon">🔄</div>
                                <div class="action-content">
                                    <div class="action-title">更新网关</div>
                                    <div class="action-desc">批量更改支付网关</div>
                                </div>
                            </div>

                            <div class="action-card" onclick="window.rechargePaymentCenter.executeBulkAction('setExpiration')">
                                <div class="action-icon">⏰</div>
                                <div class="action-content">
                                    <div class="action-title">设置有效期</div>
                                    <div class="action-desc">批量修改链接有效期</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.bulk-actions-modal').remove()">取消</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        this.addBulkActionsModalStyles();

        // 添加JavaScript功能
        this.addBulkActionsModalScript(modal);

        document.body.appendChild(modal);

        // 焦点到模态框
        setTimeout(() => {
            modal.focus();
        }, 100);
    }

    // 添加批量操作模态框样式
    addBulkActionsModalStyles() {
        // 检查是否已经添加过样式
        if (document.getElementById('bulkActionsModalStyles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'bulkActionsModalStyles';
        styles.textContent = `
            .bulk-actions-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }

            .bulk-actions-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
            }

            .bulk-actions-modal .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 90%;
                max-width: 600px;
                position: relative;
                z-index: 10001;
                animation: slideIn 0.3s ease-out;
            }

            .bulk-actions-modal .modal-header {
                padding: 24px 32px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .bulk-actions-modal .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .bulk-actions-modal .modal-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 6px;
                transition: background 0.2s;
            }

            .bulk-actions-modal .modal-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .bulk-actions-modal .modal-body {
                padding: 24px 32px;
            }

            .bulk-actions-modal .selected-info {
                margin-bottom: 24px;
                padding: 16px;
                background: #f3f4f6;
                border-radius: 8px;
                border-left: 4px solid #f59e0b;
            }

            .bulk-actions-modal .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .bulk-actions-modal .info-label {
                font-weight: 500;
                color: #374151;
            }

            .bulk-actions-modal .info-value {
                font-weight: 600;
                color: #f59e0b;
            }

            .bulk-actions-modal .bulk-actions-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .bulk-actions-modal .action-card {
                padding: 20px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 16px;
                background: white;
            }

            .bulk-actions-modal .action-card:hover {
                border-color: #f59e0b;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
                transform: translateY(-2px);
            }

            .bulk-actions-modal .action-icon {
                font-size: 24px;
                flex-shrink: 0;
                width: 40px;
                text-align: center;
            }

            .bulk-actions-modal .action-content {
                flex: 1;
            }

            .bulk-actions-modal .action-title {
                font-weight: 600;
                color: #111827;
                margin-bottom: 4px;
            }

            .bulk-actions-modal .action-desc {
                font-size: 13px;
                color: #6b7280;
                line-height: 1.4;
            }

            .bulk-actions-modal .modal-footer {
                padding: 20px 32px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                background: #f9fafb;
                border-radius: 0 0 12px 12px;
            }

            .bulk-actions-modal .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .bulk-actions-modal .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .bulk-actions-modal .btn-secondary:hover {
                background: #e5e7eb;
            }

            @media (max-width: 768px) {
                .bulk-actions-modal .modal-content {
                    width: 95%;
                    margin: 20px;
                }

                .bulk-actions-modal .modal-header,
                .bulk-actions-modal .modal-body,
                .bulk-actions-modal .modal-footer {
                    padding-left: 20px;
                    padding-right: 20px;
                }

                .bulk-actions-modal .bulk-actions-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // 添加批量操作模态框脚本功能
    addBulkActionsModalScript(modal) {
        // 点击遮罩层关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // ESC键关闭模态框
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // 为模态框设置tabindex使其可以接收焦点
        modal.setAttribute('tabindex', '-1');
    }

    // 执行批量操作
    executeBulkAction(action) {
        console.log(`⚡ 执行批量操作: ${action}`);

        const selectedLinks = document.querySelectorAll('#linksTableBody input[type="checkbox"]:checked');
        const linkIds = Array.from(selectedLinks).map(checkbox =>
            checkbox.getAttribute('data-link-id')
        );

        // 关闭批量操作模态框
        const modal = document.querySelector('.bulk-actions-modal');
        if (modal) modal.remove();

        switch (action) {
            case 'enable':
                this.bulkEnableLinks(linkIds);
                break;
            case 'disable':
                this.bulkDisableLinks(linkIds);
                break;
            case 'delete':
                this.bulkDeleteLinks(linkIds);
                break;
            case 'export':
                this.exportLinksData(linkIds);
                break;
            case 'updateGateway':
                this.showBulkUpdateGatewayModal(linkIds);
                break;
            case 'setExpiration':
                this.showBulkSetExpirationModal(linkIds);
                break;
            default:
                console.warn('未知的批量操作:', action);
        }
    }

    // 批量启用链接
    bulkEnableLinks(linkIds) {
        console.log(`✅ 批量启用 ${linkIds.length} 个链接`);

        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(
                '批量启用成功',
                `已启用 ${linkIds.length} 个链接`,
                'success'
            );
        }

        // 更新表格中的状态
        linkIds.forEach(linkId => {
            const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = 'status-badge status-active';
                    statusBadge.textContent = '活跃';
                }
            }
        });

        // 清除选择
        this.clearLinkSelection();
    }

    // 批量禁用链接
    bulkDisableLinks(linkIds) {
        console.log(`⏸️ 批量禁用 ${linkIds.length} 个链接`);

        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(
                '批量禁用成功',
                `已禁用 ${linkIds.length} 个链接`,
                'success'
            );
        }

        // 更新表格中的状态
        linkIds.forEach(linkId => {
            const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = 'status-badge status-inactive';
                    statusBadge.textContent = '暂停';
                }
            }
        });

        // 清除选择
        this.clearLinkSelection();
    }

    // 批量删除链接
    bulkDeleteLinks(linkIds) {
        // 确认删除
        if (!confirm(`确定要删除选中的 ${linkIds.length} 个链接吗？此操作不可恢复。`)) {
            return;
        }

        console.log(`🗑️ 批量删除 ${linkIds.length} 个链接`);

        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(
                '批量删除成功',
                `已删除 ${linkIds.length} 个链接`,
                'success'
            );
        }

        // 从表格中移除行
        linkIds.forEach(linkId => {
            const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
            if (row) {
                row.remove();
            }
        });

        // 更新统计
        this.updateLinksStats();

        // 清除选择
        this.clearLinkSelection();
    }

    // 导出链接数据
    exportLinksData(linkIds) {
        console.log(`📊 导出 ${linkIds.length} 个链接的数据`);

        // 收集链接数据
        const linksData = linkIds.map(linkId => {
            const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
            if (!row) return null;

            return {
                id: linkId,
                title: row.querySelector('.link-title')?.textContent || '',
                url: row.querySelector('.link-url')?.textContent || '',
                amount: row.querySelector('.amount')?.textContent || '',
                gateway: row.querySelector('.gateway')?.textContent || '',
                status: row.querySelector('.status-badge')?.textContent || '',
                usage: row.querySelector('.usage')?.textContent || '',
                created: row.querySelector('.created')?.textContent || ''
            };
        }).filter(Boolean);

        // 创建CSV内容
        const csvHeaders = ['ID', '链接名称', '链接地址', '金额', '支付网关', '状态', '使用情况', '创建时间'];
        const csvRows = linksData.map(link => [
            link.id,
            `"${link.title}"`,
            `"${link.url}"`,
            `"${link.amount}"`,
            `"${link.gateway}"`,
            `"${link.status}"`,
            `"${link.usage}"`,
            `"${link.created}"`
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.join(','))
            .join('\n');

        // 创建下载链接
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `充值链接数据_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(
                '数据导出成功',
                `已导出 ${linkIds.length} 个链接的数据`,
                'success'
            );
        }

        // 清除选择
        this.clearLinkSelection();
    }

    // 显示批量更新网关模态框
    showBulkUpdateGatewayModal(linkIds) {
        console.log(`🔄 显示批量更新网关界面 (${linkIds.length} 个链接)`);

        // 这里可以实现一个专门的网关选择模态框
        const gateway = prompt('请选择新的支付网关:\n1. 自动选择\n2. 主支付网关\n3. 备用网关1\n4. 备用网关2', '1');

        if (gateway && ['1', '2', '3', '4'].includes(gateway)) {
            const gatewayNames = ['自动选择', '主支付网关', '备用网关1', '备用网关2'];
            const gatewayName = gatewayNames[parseInt(gateway) - 1];

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(
                    '批量更新网关成功',
                    `已将 ${linkIds.length} 个链接的网关更新为 ${gatewayName}`,
                    'success'
                );
            }

            // 更新表格显示
            linkIds.forEach(linkId => {
                const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
                if (row) {
                    const gatewayCell = row.querySelector('.gateway');
                    if (gatewayCell) {
                        gatewayCell.textContent = gatewayName;
                    }
                }
            });

            // 清除选择
            this.clearLinkSelection();
        }
    }

    // 显示批量设置有效期模态框
    showBulkSetExpirationModal(linkIds) {
        console.log(`⏰ 显示批量设置有效期界面 (${linkIds.length} 个链接)`);

        // 这里可以实现一个专门的有效期设置模态框
        const days = prompt('请输入有效天数 (输入0表示永不过期):', '30');

        if (days !== null && !isNaN(days) && parseInt(days) >= 0) {
            const daysNum = parseInt(days);
            const expirationText = daysNum === 0 ? '永不过期' : `${daysNum}天后过期`;

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(
                    '批量设置有效期成功',
                    `已将 ${linkIds.length} 个链接设置为 ${expirationText}`,
                    'success'
                );
            }

            // 清除选择
            this.clearLinkSelection();
        }
    }

    // 清除链接选择
    clearLinkSelection() {
        const checkboxes = document.querySelectorAll('#linksTableBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // 同时清除全选状态
        const selectAllCheckbox = document.querySelector('#linksTable thead input[type="checkbox"]');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }

    searchLinks(keyword) {
        console.log(`🔍 搜索链接: ${keyword}`);
        // TODO: 实现搜索功能
        this.filterLinksTable();
    }

    filterLinks() {
        console.log('🔧 筛选链接');
        this.filterLinksTable();
    }

    filterLinksTable() {
        // TODO: 根据搜索和筛选条件更新表格
        console.log('📊 更新链接表格显示');
    }

    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('#linksTableBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        console.log(`${checked ? '✅' : '❌'} 全选状态: ${checked}`);
    }

    // ================== 数据分析 ==================
    initAnalyticsSection() {
        // TODO: 初始化图表组件
        console.log('📊 初始化数据分析模块');
    }

    refreshAnalyticsData() {
        console.log('📈 刷新数据分析');
        // TODO: 加载和渲染图表数据
    }

    // ================== 测试工具 ==================
    initTestingSection() {
        const testButtons = document.querySelectorAll('.testing-card .btn');

        testButtons.forEach(button => {
            button.addEventListener('click', () => {
                const cardTitle = button.closest('.testing-card').querySelector('.testing-card__title').textContent;
                this.runTest(cardTitle, button);
            });
        });
    }

    async runTest(testName, button) {
        const originalHTML = button.innerHTML;

        try {
            button.disabled = true;
            button.innerHTML = '<span class="btn__icon">⏳</span><span class="btn__text">测试中...</span>';

            console.log(`🧪 运行测试: ${testName}`);

            // 模拟测试过程
            await this.simulateApiCall(3000);

            button.innerHTML = '<span class="btn__icon">✅</span><span class="btn__text">测试完成</span>';

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(`${testName} 测试完成`, '所有检查项目通过', 'success');
            }

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('测试失败:', error);
            button.innerHTML = '<span class="btn__icon">❌</span><span class="btn__text">测试失败</span>';

            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(`${testName} 测试失败`, error.message, 'error');
            }

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);
        }
    }

    refreshTestingTools() {
        console.log('🧪 刷新测试工具状态');
        // TODO: 检查各种测试工具的状态
    }

    // ================== 数据加载 ==================
    async loadInitialData() {
        console.log('📊 加载初始数据...');

        try {
            // 并行加载各种数据
            await Promise.all([
                this.loadStatsData(),
                this.loadConfigData(),
                this.loadLinksData()
            ]);

            console.log('✅ 初始数据加载完成');
        } catch (error) {
            console.error('❌ 数据加载失败:', error);
        }
    }

    async loadStatsData() {
        // 模拟加载统计数据
        const stats = {
            totalLinks: 156,
            totalAmount: '¥2,847,392',
            successRate: '94.6%',
            activeMerchants: 89
        };

        document.getElementById('totalLinks').textContent = stats.totalLinks;
        document.getElementById('totalAmount').textContent = stats.totalAmount;
        document.getElementById('successRate').textContent = stats.successRate;
        document.getElementById('activeMerchants').textContent = stats.activeMerchants;
    }

    async loadConfigData() {
        // 模拟加载配置数据
        await this.simulateApiCall(500);
        console.log('📋 配置数据已加载');
    }

    loadDefaultConfig() {
        // 重置表单到默认值
        const defaults = {
            rechargeBaseDomain: 'pay.cjpayment.com',
            enableSSLForRecharge: true,
            domainSuffixLength: '6',
            minPayAmount: '0.01',
            maxPayAmount: '1000000',
            feeRate: '0.6',
            enableDynamicFee: true,
            sessionTimeout: '30',
            enableIPRestriction: false
        };

        Object.entries(defaults).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }

    async loadLinksData() {
        // 模拟加载链接数据
        await this.simulateApiCall(300);
        console.log('🔗 链接数据已加载');
    }

    refreshConfigData() {
        console.log('⚙️ 刷新配置数据');
    }

    // ================== 网关管理 ==================
    initGatewaysSection() {
        // 刷新网关状态按钮
        const refreshBtn = document.getElementById('refreshGatewayStatus');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshGatewayStatus());
        }

        // 添加网关按钮
        const addBtn = document.getElementById('addGatewayBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddGatewayModal());
        }

        // 查看全部事件按钮
        const viewAllBtn = document.getElementById('viewAllGatewayEvents');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.showAllGatewayEvents());
        }

        // 网关搜索
        const searchInput = document.getElementById('gatewaySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterGateways(e.target.value));
        }

        // 网关类型筛选
        const typeFilter = document.getElementById('gatewayTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => this.filterGatewaysByType(e.target.value));
        }

        // 网关状态筛选
        const statusFilter = document.getElementById('gatewayStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterGatewaysByStatus(e.target.value));
        }

        // 网关配置变更事件
        this.bindGatewayConfigEvents();

        // 初始化网关统计
        this.updateGatewayStats();
        this.populateGatewayConfig();
    }

    bindGatewayConfigEvents() {
        const configInputs = [
            'loadBalanceStrategy', 'enableWeightedRouting', 'maxRetryCount',
            'timeoutSeconds', 'enableGatewayFailover', 'healthCheckInterval',
            'failureThreshold', 'recoveryThreshold'
        ];

        configInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => {
                    this.updateGatewayConfigFromForm();
                });
            }
        });
    }

    updateGatewayStats() {
        const primaryCount = this.gateways.filter(g => g.gatewayType === 'primary').length;
        const backupCount = this.gateways.filter(g => g.gatewayType === 'backup').length;
        const onlineCount = this.gateways.filter(g => g.status === 'online').length;
        const offlineCount = this.gateways.filter(g => g.status === 'offline').length;

        // 更新统计显示
        const primaryEl = document.getElementById('primaryGatewayCount');
        const backupEl = document.getElementById('backupGatewayCount');
        const onlineEl = document.getElementById('onlineGatewayCount');
        const offlineEl = document.getElementById('offlineGatewayCount');

        if (primaryEl) primaryEl.textContent = primaryCount;
        if (backupEl) backupEl.textContent = backupCount;
        if (onlineEl) onlineEl.textContent = onlineCount;
        if (offlineEl) offlineEl.textContent = offlineCount;
    }

    populateGatewayConfig() {
        Object.keys(this.gatewayConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.gatewayConfig[key];
                } else {
                    element.value = this.gatewayConfig[key];
                }
            }
        });
    }

    updateGatewayConfigFromForm() {
        Object.keys(this.gatewayConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    this.gatewayConfig[key] = element.checked;
                } else if (element.type === 'number') {
                    this.gatewayConfig[key] = parseInt(element.value) || 0;
                } else {
                    this.gatewayConfig[key] = element.value;
                }
            }
        });
    }

    async refreshGatewayStatus() {
        const refreshBtn = document.getElementById('refreshGatewayStatus');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('.btn__text').textContent = '刷新中...';
        }

        try {
            await this.simulateApiCall(2000);

            // 随机更新一些网关的响应时间和成功率
            this.gateways.forEach(gateway => {
                if (gateway.status === 'online') {
                    const baseTime = gateway.gatewayType === 'primary' ? 200 : 250;
                    gateway.responseTime = baseTime + Math.floor(Math.random() * 100);
                    gateway.successRate = 97 + Math.random() * 2.5;
                }
            });

            this.updateGatewayStats();
            this.showToast('网关状态已刷新', 'success');

        } catch (error) {
            this.showToast('刷新网关状态失败', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('.btn__text').textContent = '刷新状态';
            }
        }
    }

    refreshGatewaysData() {
        console.log('🏦 刷新网关数据');
        this.updateGatewayStats();
    }

    filterGateways(searchTerm) {
        const rows = document.querySelectorAll('.gateway-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const gatewayName = row.querySelector('.gateway-name').textContent.toLowerCase();
            const gatewayDesc = row.querySelector('.gateway-desc').textContent.toLowerCase();

            if (gatewayName.includes(term) || gatewayDesc.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterGatewaysByType(type) {
        const rows = document.querySelectorAll('.gateway-row');

        rows.forEach(row => {
            if (!type) {
                row.style.display = '';
                return;
            }

            const gatewayType = row.querySelector('.gateway-type');
            if (gatewayType && gatewayType.classList.contains(type)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterGatewaysByStatus(status) {
        const rows = document.querySelectorAll('.gateway-row');

        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
                return;
            }

            const gatewayStatus = row.querySelector('.gateway-status');
            if (gatewayStatus && gatewayStatus.classList.contains(status)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    showAddGatewayModal() {
        // 创建专业的添加网关模态框
        const modal = document.createElement('div');
        modal.className = 'gateway-add-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加新网关</h3>
                        <button class="modal-close" onclick="this.closest('.gateway-add-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="addGatewayForm">
                            <!-- 基础信息 -->
                            <div class="form-section">
                                <h4 class="section-title">基础信息</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>网关名称 *</label>
                                        <input type="text" name="gatewayName" required class="form-input" placeholder="例如：PayPal支付网关">
                                    </div>
                                    <div class="form-group">
                                        <label>网关代码 *</label>
                                        <input type="text" name="gatewayCode" required class="form-input" placeholder="例如：paypal_gateway">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>网关类型</label>
                                        <select name="gatewayType" class="form-select">
                                            <option value="backup">备用网关</option>
                                            <option value="primary">主网关</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>优先级</label>
                                        <input type="number" name="priority" class="form-input" value="1" min="0" max="100">
                                    </div>
                                </div>
                            </div>

                            <!-- API配置 -->
                            <div class="form-section">
                                <h4 class="section-title">API配置</h4>
                                <div class="form-group">
                                    <label>API接口地址 *</label>
                                    <input type="url" name="apiUrl" required class="form-input" placeholder="https://api.example.com/payment">
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>API密钥</label>
                                        <input type="text" name="apiKey" class="form-input" placeholder="输入API密钥">
                                    </div>
                                    <div class="form-group">
                                        <label>API秘钥</label>
                                        <input type="password" name="apiSecret" class="form-input" placeholder="输入API秘钥">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>超时时间(秒)</label>
                                        <input type="number" name="timeout" class="form-input" value="30" min="5" max="300">
                                    </div>
                                    <div class="form-group">
                                        <label>重试次数</label>
                                        <input type="number" name="retryCount" class="form-input" value="3" min="0" max="10">
                                    </div>
                                </div>
                            </div>

                            <!-- 支付配置 -->
                            <div class="form-section">
                                <h4 class="section-title">支付配置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>负载权重</label>
                                        <input type="number" name="weight" class="form-input" value="50" min="0" max="100">
                                        <small class="form-help">权重越高，分配的流量越多</small>
                                    </div>
                                    <div class="form-group">
                                        <label>手续费率(%)</label>
                                        <input type="number" name="feeRate" class="form-input" step="0.01" min="0" max="10" placeholder="例如：0.5">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>支持货币</label>
                                    <div class="currency-checkboxes">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="currencies" value="CNY" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>人民币(CNY)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="currencies" value="USD">
                                            <span class="checkbox-custom"></span>
                                            <span>美元(USD)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="currencies" value="EUR">
                                            <span class="checkbox-custom"></span>
                                            <span>欧元(EUR)</span>
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="currencies" value="GBP">
                                            <span class="checkbox-custom"></span>
                                            <span>英镑(GBP)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 高级设置 -->
                            <div class="form-section">
                                <h4 class="section-title">高级设置</h4>
                                <div class="form-group">
                                    <label>网关描述</label>
                                    <textarea name="description" class="form-textarea" rows="3" placeholder="输入网关的详细描述..."></textarea>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="autoFailover" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>启用自动故障转移</span>
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="enableLog" checked>
                                            <span class="checkbox-custom"></span>
                                            <span>启用详细日志</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.gateway-add-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" onclick="window.rechargePaymentCenter.submitAddGateway()">保存网关</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.id = 'add-gateway-modal-styles';
        style.textContent = `
            .gateway-add-modal {
                position: fixed !important;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                pointer-events: none;
            }

            .gateway-add-modal .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
                backdrop-filter: blur(2px);
                pointer-events: all;
            }

            .gateway-add-modal .modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
            }

            .gateway-add-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 0;
                border-bottom: 2px solid #f0f2f5;
                margin-bottom: 0;
            }

            .gateway-add-modal .modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #1a1a1a;
            }

            .gateway-add-modal .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 8px;
                color: #666;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .gateway-add-modal .modal-close:hover {
                background: #f5f5f5;
                color: #333;
            }

            .gateway-add-modal .modal-body {
                padding: 24px;
                flex: 1;
            }

            .gateway-add-modal .form-section {
                margin-bottom: 32px;
                border-bottom: 1px solid #f0f2f5;
                padding-bottom: 24px;
            }

            .gateway-add-modal .form-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .gateway-add-modal .section-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin: 0 0 16px 0;
                display: flex;
                align-items: center;
            }

            .gateway-add-modal .section-title:before {
                content: '';
                width: 4px;
                height: 16px;
                background: #4f46e5;
                border-radius: 2px;
                margin-right: 8px;
            }

            .gateway-add-modal .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
            }

            .gateway-add-modal .form-group {
                margin-bottom: 16px;
            }

            .gateway-add-modal .form-group label {
                display: block;
                font-weight: 500;
                color: #374151;
                margin-bottom: 6px;
                font-size: 14px;
            }

            .gateway-add-modal .form-input,
            .gateway-add-modal .form-select,
            .gateway-add-modal .form-textarea {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .gateway-add-modal .form-input:focus,
            .gateway-add-modal .form-select:focus,
            .gateway-add-modal .form-textarea:focus {
                outline: none;
                border-color: #4f46e5;
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }

            .gateway-add-modal .form-help {
                color: #6b7280;
                font-size: 12px;
                margin-top: 4px;
                display: block;
            }

            .gateway-add-modal .currency-checkboxes {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 8px;
            }

            .gateway-add-modal .checkbox-label {
                display: flex;
                align-items: center;
                font-weight: normal;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                transition: background 0.2s;
            }

            .gateway-add-modal .checkbox-label:hover {
                background: #f9fafb;
            }

            .gateway-add-modal .checkbox-custom {
                width: 18px;
                height: 18px;
                border: 2px solid #d1d5db;
                border-radius: 4px;
                margin-right: 8px;
                position: relative;
                transition: all 0.2s;
            }

            .gateway-add-modal input[type="checkbox"]:checked + .checkbox-custom {
                background: #4f46e5;
                border-color: #4f46e5;
            }

            .gateway-add-modal input[type="checkbox"]:checked + .checkbox-custom:after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .gateway-add-modal input[type="checkbox"] {
                position: absolute;
                opacity: 0;
                cursor: pointer;
            }

            .gateway-add-modal .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 24px 24px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
            }

            .gateway-add-modal .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .gateway-add-modal .btn-secondary {
                background: #f3f4f6;
                color: #374151;
            }

            .gateway-add-modal .btn-secondary:hover {
                background: #e5e7eb;
            }

            .gateway-add-modal .btn-primary {
                background: #4f46e5;
                color: white;
            }

            .gateway-add-modal .btn-primary:hover {
                background: #4338ca;
            }

            @media (max-width: 768px) {
                .gateway-add-modal .form-row {
                    grid-template-columns: 1fr;
                }

                .gateway-add-modal .currency-checkboxes {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // 网关名称自动生成代码
        const nameInput = modal.querySelector('input[name="gatewayName"]');
        const codeInput = modal.querySelector('input[name="gatewayCode"]');

        nameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            if (name) {
                const code = name.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 30);
                codeInput.value = code;
            }
        });

        // 焦点到第一个输入框
        setTimeout(() => nameInput.focus(), 100);
    }

    addNewGateway(gatewayName) {
        const newGateway = {
            id: Math.max(...this.gateways.map(g => g.id)) + 1,
            gatewayName,
            gatewayCode: gatewayName.toLowerCase().replace(/\s+/g, '_'),
            gatewayType: 'backup',
            status: 'checking',
            priority: Math.max(...this.gateways.map(g => g.priority)) + 1,
            weight: 50,
            successRate: 0,
            responseTime: 0,
            supportedCurrencies: ['CNY'],
            description: '新添加的网关'
        };

        this.gateways.push(newGateway);
        this.updateGatewayStats();
        this.showToast(`网关 ${gatewayName} 已添加`, 'success');

        // 模拟健康检查
        setTimeout(() => {
            newGateway.status = 'online';
            newGateway.responseTime = 300 + Math.floor(Math.random() * 100);
            newGateway.successRate = 95 + Math.random() * 4;
            this.updateGatewayStats();
            this.showToast(`网关 ${gatewayName} 健康检查完成`, 'success');
        }, 3000);
    }

    // 处理添加网关表单提交
    submitAddGateway() {
        const modal = document.querySelector('.gateway-add-modal');
        if (!modal) return;

        const form = modal.querySelector('#addGatewayForm');
        const formData = new FormData(form);

        // 表单验证
        const requiredFields = ['gatewayName', 'gatewayCode', 'apiUrl'];
        const missingFields = [];

        for (const field of requiredFields) {
            const value = formData.get(field);
            if (!value || !value.trim()) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            this.showToast('请填写所有必填字段', 'error');

            // 高亮显示未填写的字段
            missingFields.forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input) {
                    input.style.borderColor = '#ef4444';
                    input.addEventListener('input', () => {
                        input.style.borderColor = '#e5e7eb';
                    }, { once: true });
                }
            });
            return;
        }

        // 检查网关代码是否重复
        const gatewayCode = formData.get('gatewayCode').trim();
        if (this.gateways.some(g => g.gatewayCode === gatewayCode)) {
            this.showToast('网关代码已存在，请使用不同的代码', 'error');
            const codeInput = form.querySelector('[name="gatewayCode"]');
            if (codeInput) {
                codeInput.style.borderColor = '#ef4444';
                codeInput.focus();
            }
            return;
        }

        // 收集支持的货币
        const currencies = [];
        form.querySelectorAll('input[name="currencies"]:checked').forEach(checkbox => {
            currencies.push(checkbox.value);
        });

        // 构建网关对象
        const gatewayData = {
            gatewayName: formData.get('gatewayName').trim(),
            gatewayCode: gatewayCode,
            gatewayType: formData.get('gatewayType'),
            priority: parseInt(formData.get('priority')) || 1,
            apiUrl: formData.get('apiUrl').trim(),
            apiKey: formData.get('apiKey')?.trim() || '',
            apiSecret: formData.get('apiSecret')?.trim() || '',
            timeout: parseInt(formData.get('timeout')) || 30,
            retryCount: parseInt(formData.get('retryCount')) || 3,
            weight: parseInt(formData.get('weight')) || 50,
            feeRate: parseFloat(formData.get('feeRate')) || 0,
            supportedCurrencies: currencies.length > 0 ? currencies : ['CNY'],
            description: formData.get('description')?.trim() || '',
            autoFailover: formData.get('autoFailover') === 'on',
            enableLog: formData.get('enableLog') === 'on'
        };

        // 显示保存动画
        const saveBtn = modal.querySelector('.btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> 保存中...';
        saveBtn.disabled = true;

        // 模拟保存过程
        setTimeout(() => {
            this.addNewGatewayFromData(gatewayData);

            // 关闭模态框
            modal.remove();

            // 显示成功提示
            this.showToast(`网关 ${gatewayData.gatewayName} 添加成功`, 'success');

            // 滚动到新添加的网关行
            setTimeout(() => {
                const newRow = document.querySelector(`tr[data-gateway-id="${this.gateways[this.gateways.length - 1].id}"]`);
                if (newRow) {
                    newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 高亮显示新行
                    newRow.style.backgroundColor = '#f0f9ff';
                    setTimeout(() => {
                        newRow.style.backgroundColor = '';
                    }, 2000);
                }
            }, 100);

        }, 1000);

        // 添加保存按钮旋转动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // 优化的添加网关方法，支持完整配置
    addNewGatewayFromData(gatewayData) {
        const newGateway = {
            id: Math.max(...this.gateways.map(g => g.id)) + 1,
            gatewayName: gatewayData.gatewayName,
            gatewayCode: gatewayData.gatewayCode,
            gatewayType: gatewayData.gatewayType,
            status: 'checking',
            priority: gatewayData.priority,
            weight: gatewayData.weight,
            successRate: 0,
            responseTime: 0,
            supportedCurrencies: gatewayData.supportedCurrencies,
            description: gatewayData.description,
            // API配置
            apiUrl: gatewayData.apiUrl,
            apiKey: gatewayData.apiKey,
            apiSecret: gatewayData.apiSecret,
            timeout: gatewayData.timeout,
            retryCount: gatewayData.retryCount,
            // 支付配置
            feeRate: gatewayData.feeRate,
            // 高级设置
            autoFailover: gatewayData.autoFailover,
            enableLog: gatewayData.enableLog,
            // 时间戳
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.gateways.push(newGateway);
        this.updateGatewayStats();

        // 模拟健康检查
        setTimeout(() => {
            newGateway.status = Math.random() > 0.2 ? 'online' : 'offline';
            newGateway.responseTime = 200 + Math.floor(Math.random() * 300);
            newGateway.successRate = 90 + Math.random() * 9;
            this.updateGatewayStats();

            if (newGateway.status === 'online') {
                this.showToast(`网关 ${newGateway.gatewayName} 健康检查通过`, 'success');
            } else {
                this.showToast(`网关 ${newGateway.gatewayName} 健康检查失败，请检查配置`, 'warning');
            }
        }, 2000 + Math.random() * 3000);

        return newGateway;
    }

    editGateway(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) {
            this.showToast('网关不存在', 'error');
            return;
        }

        // 创建编辑模态框
        this.showGatewayEditModal(gateway);
    }

    showGatewayEditModal(gateway) {
        const modal = document.createElement('div');
        modal.className = 'gateway-edit-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑网关 - ${gateway.gatewayName}</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="gatewayEditForm">
                            <div class="form-group">
                                <label>网关名称</label>
                                <input type="text" id="gatewayName" value="${gateway.gatewayName}" required>
                            </div>
                            <div class="form-group">
                                <label>网关类型</label>
                                <select id="gatewayType">
                                    <option value="alipay" ${gateway.gatewayType === 'alipay' ? 'selected' : ''}>支付宝</option>
                                    <option value="wechat" ${gateway.gatewayType === 'wechat' ? 'selected' : ''}>微信支付</option>
                                    <option value="stripe" ${gateway.gatewayType === 'stripe' ? 'selected' : ''}>Stripe</option>
                                    <option value="paypal" ${gateway.gatewayType === 'paypal' ? 'selected' : ''}>PayPal</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>API地址</label>
                                <input type="url" id="apiUrl" value="${gateway.apiUrl}" required>
                            </div>
                            <div class="form-group">
                                <label>权重</label>
                                <input type="number" id="weight" value="${gateway.weight}" min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label>优先级</label>
                                <input type="number" id="priority" value="${gateway.priority}" min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label>描述</label>
                                <textarea id="description" rows="3">${gateway.description}</textarea>
                            </div>
                            <div class="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" id="enabled" ${gateway.enabled ? 'checked' : ''}>
                                    启用网关
                                </label>
                                <label>
                                    <input type="checkbox" id="isPrimary" ${gateway.isPrimary ? 'checked' : ''}>
                                    设为主网关
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">取消</button>
                        <button class="btn btn-primary" onclick="window.rechargePaymentCenter.saveGatewayEdit('${gateway.id}')">保存</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        if (!document.getElementById('gateway-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'gateway-modal-styles';
            style.textContent = `
                .gateway-edit-modal .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .gateway-edit-modal .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .gateway-edit-modal .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .gateway-edit-modal .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
                .gateway-edit-modal .modal-body {
                    padding: 20px;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                .gateway-edit-modal .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .gateway-edit-modal .form-group {
                    margin-bottom: 15px;
                }
                .gateway-edit-modal .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .gateway-edit-modal .form-group input,
                .gateway-edit-modal .form-group select,
                .gateway-edit-modal .form-group textarea {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .gateway-edit-modal .checkbox-group {
                    display: flex;
                    gap: 15px;
                }
                .gateway-edit-modal .checkbox-group label {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-weight: normal;
                }
                .gateway-edit-modal .checkbox-group input[type="checkbox"] {
                    width: auto;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);
    }

    saveGatewayEdit(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const form = document.getElementById('gatewayEditForm');
        if (!form) return;

        // 获取表单数据
        const formData = {
            gatewayName: form.querySelector('#gatewayName').value,
            gatewayType: form.querySelector('#gatewayType').value,
            apiUrl: form.querySelector('#apiUrl').value,
            weight: parseInt(form.querySelector('#weight').value),
            priority: parseInt(form.querySelector('#priority').value),
            description: form.querySelector('#description').value,
            enabled: form.querySelector('#enabled').checked,
            isPrimary: form.querySelector('#isPrimary').checked
        };

        // 验证数据
        if (!formData.gatewayName.trim()) {
            this.showToast('请输入网关名称', 'error');
            return;
        }
        if (!formData.apiUrl.trim()) {
            this.showToast('请输入API地址', 'error');
            return;
        }

        // 如果设为主网关，将其他网关的主网关状态取消
        if (formData.isPrimary) {
            this.gateways.forEach(g => {
                if (g.id !== gatewayId) {
                    g.isPrimary = false;
                }
            });
        }

        // 更新网关数据
        Object.assign(gateway, formData);

        // 关闭模态框
        document.querySelector('.gateway-edit-modal').remove();

        // 更新显示
        this.updateGatewayStats();
        this.showToast(`网关 ${gateway.gatewayName} 更新成功`, 'success');
    }

    async checkGateway(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) {
            this.showToast('网关不存在', 'error');
            return;
        }

        // 显示检查进度模态框
        this.showHealthCheckModal(gateway);
    }

    showHealthCheckModal(gateway) {
        const modal = document.createElement('div');
        modal.className = 'health-check-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>网关健康检查 - ${gateway.gatewayName}</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="check-progress">
                            <div class="progress-item">
                                <span class="check-name">DNS解析</span>
                                <span class="check-status" id="dns-status">检查中...</span>
                                <div class="progress-bar"><div class="progress-fill" id="dns-progress"></div></div>
                            </div>
                            <div class="progress-item">
                                <span class="check-name">网络连接</span>
                                <span class="check-status" id="connection-status">等待中...</span>
                                <div class="progress-bar"><div class="progress-fill" id="connection-progress"></div></div>
                            </div>
                            <div class="progress-item">
                                <span class="check-name">SSL证书</span>
                                <span class="check-status" id="ssl-status">等待中...</span>
                                <div class="progress-bar"><div class="progress-fill" id="ssl-progress"></div></div>
                            </div>
                            <div class="progress-item">
                                <span class="check-name">API响应</span>
                                <span class="check-status" id="api-status">等待中...</span>
                                <div class="progress-bar"><div class="progress-fill" id="api-progress"></div></div>
                            </div>
                            <div class="progress-item">
                                <span class="check-name">服务状态</span>
                                <span class="check-status" id="service-status">等待中...</span>
                                <div class="progress-bar"><div class="progress-fill" id="service-progress"></div></div>
                            </div>
                        </div>
                        <div class="check-results" id="check-results" style="display: none;">
                            <h4>检查结果</h4>
                            <div class="result-grid">
                                <div class="result-item">
                                    <label>响应时间:</label>
                                    <span id="response-time">--</span>
                                </div>
                                <div class="result-item">
                                    <label>成功率:</label>
                                    <span id="success-rate">--</span>
                                </div>
                                <div class="result-item">
                                    <label>延迟:</label>
                                    <span id="latency">--</span>
                                </div>
                                <div class="result-item">
                                    <label>可用性:</label>
                                    <span id="availability">--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">关闭</button>
                        <button class="btn btn-primary" id="retry-check" onclick="window.rechargePaymentCenter.performHealthCheck('${gateway.id}')" disabled>重新检查</button>
                    </div>
                </div>
            </div>
        `;

        // 添加健康检查模态框样式
        if (!document.getElementById('health-check-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'health-check-modal-styles';
            style.textContent = `
                .health-check-modal .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .health-check-modal .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .health-check-modal .progress-item {
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .health-check-modal .check-name {
                    flex: 1;
                    font-weight: bold;
                }
                .health-check-modal .check-status {
                    flex: 1;
                    color: #666;
                }
                .health-check-modal .progress-bar {
                    flex: 2;
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .health-check-modal .progress-fill {
                    height: 100%;
                    width: 0%;
                    background: #4CAF50;
                    transition: width 0.3s ease;
                }
                .health-check-modal .result-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 10px;
                }
                .health-check-modal .result-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .health-check-modal .result-item label {
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // 自动开始健康检查
        this.performHealthCheck(gateway.id);
    }

    async performHealthCheck(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const checkSteps = [
            { id: 'dns', name: 'DNS解析', delay: 500 },
            { id: 'connection', name: '网络连接', delay: 800 },
            { id: 'ssl', name: 'SSL证书', delay: 600 },
            { id: 'api', name: 'API响应', delay: 1000 },
            { id: 'service', name: '服务状态', delay: 700 }
        ];

        gateway.status = 'checking';
        let overallHealth = true;

        for (let i = 0; i < checkSteps.length; i++) {
            const step = checkSteps[i];
            const statusEl = document.getElementById(`${step.id}-status`);
            const progressEl = document.getElementById(`${step.id}-progress`);

            if (!statusEl || !progressEl) continue;

            // 设置检查中状态
            statusEl.textContent = '检查中...';
            statusEl.style.color = '#ff9800';

            // 模拟检查过程
            await new Promise(resolve => setTimeout(resolve, step.delay));

            // 模拟检查结果
            const isStepHealthy = Math.random() > 0.05; // 95%成功率

            if (isStepHealthy) {
                statusEl.textContent = '正常';
                statusEl.style.color = '#4CAF50';
                progressEl.style.width = '100%';
                progressEl.style.background = '#4CAF50';
            } else {
                statusEl.textContent = '异常';
                statusEl.style.color = '#f44336';
                progressEl.style.width = '100%';
                progressEl.style.background = '#f44336';
                overallHealth = false;
            }
        }

        // 更新网关状态
        gateway.status = overallHealth ? 'online' : 'offline';
        gateway.responseTime = 150 + Math.floor(Math.random() * 300);
        gateway.successRate = overallHealth ? 95 + Math.random() * 4 : 60 + Math.random() * 30;

        // 显示检查结果
        const resultsEl = document.getElementById('check-results');
        if (resultsEl) {
            resultsEl.style.display = 'block';

            document.getElementById('response-time').textContent = `${gateway.responseTime}ms`;
            document.getElementById('success-rate').textContent = `${gateway.successRate.toFixed(1)}%`;
            document.getElementById('latency').textContent = `${50 + Math.floor(Math.random() * 100)}ms`;
            document.getElementById('availability').textContent = overallHealth ? '99.9%' : '85.2%';
        }

        // 启用重试按钮
        const retryBtn = document.getElementById('retry-check');
        if (retryBtn) {
            retryBtn.disabled = false;
        }

        // 更新统计
        this.updateGatewayStats();

        // 显示总体结果
        const message = overallHealth ?
            `网关 ${gateway.gatewayName} 健康检查完成：所有检查项正常` :
            `网关 ${gateway.gatewayName} 健康检查完成：发现异常项，请检查`;

        this.showToast(message, overallHealth ? 'success' : 'error');
    }

    async testGateway(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) {
            this.showToast('网关不存在', 'error');
            return;
        }

        // 显示支付测试模态框
        this.showPaymentTestModal(gateway);
    }

    showPaymentTestModal(gateway) {
        const modal = document.createElement('div');
        modal.className = 'payment-test-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>支付测试 - ${gateway.gatewayName}</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="test-config">
                            <h4>测试配置</h4>
                            <div class="form-group">
                                <label>测试金额</label>
                                <select id="testAmount">
                                    <option value="0.01">0.01 元 (小额测试)</option>
                                    <option value="1.00" selected>1.00 元 (标准测试)</option>
                                    <option value="10.00">10.00 元 (大额测试)</option>
                                    <option value="custom">自定义金额</option>
                                </select>
                                <input type="number" id="customAmount" step="0.01" min="0.01" placeholder="请输入自定义金额" style="display: none; margin-top: 10px;">
                            </div>
                            <div class="form-group">
                                <label>支付方式</label>
                                <select id="paymentMethod">
                                    <option value="alipay">支付宝</option>
                                    <option value="wechat">微信支付</option>
                                    <option value="card">银行卡</option>
                                    <option value="balance">余额支付</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>测试环境</label>
                                <select id="testEnv">
                                    <option value="sandbox" selected>沙箱环境</option>
                                    <option value="staging">预生产环境</option>
                                </select>
                            </div>
                            <div class="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" id="testRefund" checked>
                                    测试退款功能
                                </label>
                                <label>
                                    <input type="checkbox" id="testNotify" checked>
                                    测试回调通知
                                </label>
                            </div>
                        </div>
                        <div class="test-progress" id="testProgress" style="display: none;">
                            <h4>测试进度</h4>
                            <div class="progress-list">
                                <div class="progress-item">
                                    <span class="test-step">创建支付订单</span>
                                    <span class="test-result" id="create-order-result">等待中...</span>
                                </div>
                                <div class="progress-item">
                                    <span class="test-step">调用支付接口</span>
                                    <span class="test-result" id="payment-api-result">等待中...</span>
                                </div>
                                <div class="progress-item">
                                    <span class="test-step">处理支付结果</span>
                                    <span class="test-result" id="payment-process-result">等待中...</span>
                                </div>
                                <div class="progress-item" id="refund-test" style="display: none;">
                                    <span class="test-step">退款测试</span>
                                    <span class="test-result" id="refund-result">等待中...</span>
                                </div>
                                <div class="progress-item" id="notify-test" style="display: none;">
                                    <span class="test-step">回调通知测试</span>
                                    <span class="test-result" id="notify-result">等待中...</span>
                                </div>
                            </div>
                        </div>
                        <div class="test-results" id="testResults" style="display: none;">
                            <h4>测试结果</h4>
                            <div class="result-summary">
                                <div class="summary-item">
                                    <label>订单号:</label>
                                    <span id="orderNumber">--</span>
                                </div>
                                <div class="summary-item">
                                    <label>支付时间:</label>
                                    <span id="paymentTime">--</span>
                                </div>
                                <div class="summary-item">
                                    <label>响应时间:</label>
                                    <span id="responseTime">--</span>
                                </div>
                                <div class="summary-item">
                                    <label>测试状态:</label>
                                    <span id="testStatus">--</span>
                                </div>
                            </div>
                            <div class="result-details">
                                <label>详细信息:</label>
                                <textarea id="testDetails" rows="4" readonly></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">关闭</button>
                        <button class="btn btn-primary" id="startTest" onclick="window.rechargePaymentCenter.performPaymentTest('${gateway.id}')">开始测试</button>
                    </div>
                </div>
            </div>
        `;

        // 添加支付测试模态框样式
        if (!document.getElementById('payment-test-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'payment-test-modal-styles';
            style.textContent = `
                .payment-test-modal .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .payment-test-modal .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 700px;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .payment-test-modal .test-config,
                .payment-test-modal .test-progress,
                .payment-test-modal .test-results {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                }
                .payment-test-modal .progress-list {
                    space-y: 10px;
                }
                .payment-test-modal .progress-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: #f9f9f9;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }
                .payment-test-modal .test-step {
                    font-weight: bold;
                }
                .payment-test-modal .test-result {
                    color: #666;
                }
                .payment-test-modal .result-summary {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .payment-test-modal .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .payment-test-modal .summary-item label {
                    font-weight: bold;
                }
                .payment-test-modal .result-details textarea {
                    width: 100%;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    font-family: monospace;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // 自定义金额切换
        const testAmountSelect = modal.querySelector('#testAmount');
        const customAmountInput = modal.querySelector('#customAmount');

        testAmountSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customAmountInput.style.display = 'block';
                customAmountInput.required = true;
            } else {
                customAmountInput.style.display = 'none';
                customAmountInput.required = false;
            }
        });
    }

    async performPaymentTest(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const modal = document.querySelector('.payment-test-modal');
        if (!modal) return;

        // 获取测试配置
        const testAmount = modal.querySelector('#testAmount').value;
        const customAmount = modal.querySelector('#customAmount').value;
        const paymentMethod = modal.querySelector('#paymentMethod').value;
        const testEnv = modal.querySelector('#testEnv').value;
        const testRefund = modal.querySelector('#testRefund').checked;
        const testNotify = modal.querySelector('#testNotify').checked;

        const amount = testAmount === 'custom' ? customAmount : testAmount;

        if (testAmount === 'custom' && (!customAmount || customAmount <= 0)) {
            this.showToast('请输入有效的自定义金额', 'error');
            return;
        }

        // 显示测试进度
        modal.querySelector('#testProgress').style.display = 'block';
        modal.querySelector('#startTest').disabled = true;

        if (testRefund) {
            modal.querySelector('#refund-test').style.display = 'flex';
        }
        if (testNotify) {
            modal.querySelector('#notify-test').style.display = 'flex';
        }

        // 生成订单号
        const orderNumber = 'TEST_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        try {
            // 测试步骤1: 创建支付订单
            modal.querySelector('#create-order-result').textContent = '进行中...';
            modal.querySelector('#create-order-result').style.color = '#ff9800';

            await new Promise(resolve => setTimeout(resolve, 1000));

            const createOrderSuccess = Math.random() > 0.02; // 98%成功率

            if (createOrderSuccess) {
                modal.querySelector('#create-order-result').textContent = '成功';
                modal.querySelector('#create-order-result').style.color = '#4CAF50';
            } else {
                throw new Error('创建支付订单失败');
            }

            // 测试步骤2: 调用支付接口
            modal.querySelector('#payment-api-result').textContent = '进行中...';
            modal.querySelector('#payment-api-result').style.color = '#ff9800';

            await new Promise(resolve => setTimeout(resolve, 1500));

            const apiCallSuccess = Math.random() > 0.05; // 95%成功率

            if (apiCallSuccess) {
                modal.querySelector('#payment-api-result').textContent = '成功';
                modal.querySelector('#payment-api-result').style.color = '#4CAF50';
            } else {
                throw new Error('支付接口调用失败');
            }

            // 测试步骤3: 处理支付结果
            modal.querySelector('#payment-process-result').textContent = '进行中...';
            modal.querySelector('#payment-process-result').style.color = '#ff9800';

            await new Promise(resolve => setTimeout(resolve, 2000));

            const processSuccess = Math.random() > 0.03; // 97%成功率

            if (processSuccess) {
                modal.querySelector('#payment-process-result').textContent = '成功';
                modal.querySelector('#payment-process-result').style.color = '#4CAF50';
            } else {
                throw new Error('支付结果处理失败');
            }

            // 可选测试: 退款测试
            if (testRefund) {
                modal.querySelector('#refund-result').textContent = '进行中...';
                modal.querySelector('#refund-result').style.color = '#ff9800';

                await new Promise(resolve => setTimeout(resolve, 1200));

                const refundSuccess = Math.random() > 0.1; // 90%成功率

                if (refundSuccess) {
                    modal.querySelector('#refund-result').textContent = '成功';
                    modal.querySelector('#refund-result').style.color = '#4CAF50';
                } else {
                    modal.querySelector('#refund-result').textContent = '失败';
                    modal.querySelector('#refund-result').style.color = '#f44336';
                }
            }

            // 可选测试: 回调通知测试
            if (testNotify) {
                modal.querySelector('#notify-result').textContent = '进行中...';
                modal.querySelector('#notify-result').style.color = '#ff9800';

                await new Promise(resolve => setTimeout(resolve, 800));

                const notifySuccess = Math.random() > 0.05; // 95%成功率

                if (notifySuccess) {
                    modal.querySelector('#notify-result').textContent = '成功';
                    modal.querySelector('#notify-result').style.color = '#4CAF50';
                } else {
                    modal.querySelector('#notify-result').textContent = '失败';
                    modal.querySelector('#notify-result').style.color = '#f44336';
                }
            }

            // 显示测试结果
            const responseTime = 800 + Math.floor(Math.random() * 1200);
            const testResults = modal.querySelector('#testResults');
            testResults.style.display = 'block';

            modal.querySelector('#orderNumber').textContent = orderNumber;
            modal.querySelector('#paymentTime').textContent = new Date().toLocaleString();
            modal.querySelector('#responseTime').textContent = `${responseTime}ms`;
            modal.querySelector('#testStatus').textContent = '测试完成';
            modal.querySelector('#testStatus').style.color = '#4CAF50';

            const details = `支付网关: ${gateway.gatewayName}
测试环境: ${testEnv}
支付金额: ${amount} 元
支付方式: ${paymentMethod}
订单号: ${orderNumber}
响应时间: ${responseTime}ms
测试时间: ${new Date().toLocaleString()}

测试结果:
✅ 创建订单: 成功
✅ 支付接口: 成功
✅ 结果处理: 成功
${testRefund ? (modal.querySelector('#refund-result').textContent === '成功' ? '✅ 退款测试: 成功' : '❌ 退款测试: 失败') : ''}
${testNotify ? (modal.querySelector('#notify-result').textContent === '成功' ? '✅ 通知测试: 成功' : '❌ 通知测试: 失败') : ''}

所有核心功能测试通过`;

            modal.querySelector('#testDetails').value = details;

            this.showToast(`网关 ${gateway.gatewayName} 支付测试完成`, 'success');

        } catch (error) {
            // 测试失败处理
            modal.querySelector('#create-order-result').textContent = '失败';
            modal.querySelector('#create-order-result').style.color = '#f44336';
            modal.querySelector('#payment-api-result').textContent = '失败';
            modal.querySelector('#payment-api-result').style.color = '#f44336';
            modal.querySelector('#payment-process-result').textContent = '失败';
            modal.querySelector('#payment-process-result').style.color = '#f44336';

            const testResults = modal.querySelector('#testResults');
            testResults.style.display = 'block';

            modal.querySelector('#testStatus').textContent = '测试失败';
            modal.querySelector('#testStatus').style.color = '#f44336';
            modal.querySelector('#testDetails').value = `测试失败: ${error.message}
网关: ${gateway.gatewayName}
时间: ${new Date().toLocaleString()}`;

            this.showToast(`网关 ${gateway.gatewayName} 支付测试失败: ${error.message}`, 'error');
        } finally {
            modal.querySelector('#startTest').disabled = false;
        }
    }

    viewGatewayLogs(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) {
            this.showToast('网关不存在', 'error');
            return;
        }

        // 显示日志查看模态框
        this.showGatewayLogsModal(gateway);
    }

    showGatewayLogsModal(gateway) {
        const modal = document.createElement('div');
        modal.className = 'gateway-logs-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>网关日志 - ${gateway.gatewayName}</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="log-filters">
                            <div class="filter-group">
                                <label>日志级别:</label>
                                <select id="logLevel">
                                    <option value="all">全部</option>
                                    <option value="info">信息</option>
                                    <option value="warning">警告</option>
                                    <option value="error">错误</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>时间范围:</label>
                                <select id="timeRange">
                                    <option value="1h">最近1小时</option>
                                    <option value="24h" selected>最近24小时</option>
                                    <option value="7d">最近7天</option>
                                    <option value="30d">最近30天</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>日志类型:</label>
                                <select id="logType">
                                    <option value="all">全部</option>
                                    <option value="health">健康检查</option>
                                    <option value="payment">支付处理</option>
                                    <option value="balance">负载均衡</option>
                                    <option value="error">错误日志</option>
                                </select>
                            </div>
                            <div class="filter-actions">
                                <button class="btn btn-secondary" onclick="window.rechargePaymentCenter.refreshLogs('${gateway.id}')">刷新</button>
                                <button class="btn btn-primary" onclick="window.rechargePaymentCenter.exportLogs('${gateway.id}')">导出</button>
                            </div>
                        </div>
                        <div class="log-stats">
                            <div class="stat-item">
                                <label>总日志数:</label>
                                <span id="totalLogs">--</span>
                            </div>
                            <div class="stat-item">
                                <label>错误数:</label>
                                <span id="errorCount">--</span>
                            </div>
                            <div class="stat-item">
                                <label>最后更新:</label>
                                <span id="lastUpdate">--</span>
                            </div>
                        </div>
                        <div class="log-content">
                            <div class="log-list" id="logList">
                                <div class="log-loading">正在加载日志...</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">关闭</button>
                        <button class="btn btn-info" onclick="window.rechargePaymentCenter.showLogDetails('${gateway.id}')">详细分析</button>
                    </div>
                </div>
            </div>
        `;

        // 添加日志查看模态框样式
        if (!document.getElementById('gateway-logs-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'gateway-logs-modal-styles';
            style.textContent = `
                .gateway-logs-modal .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .gateway-logs-modal .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 95%;
                    max-width: 900px;
                    height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .gateway-logs-modal .modal-body {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    padding: 20px;
                }
                .gateway-logs-modal .log-filters {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                }
                .gateway-logs-modal .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .gateway-logs-modal .filter-group label {
                    font-size: 12px;
                    font-weight: bold;
                    color: #666;
                }
                .gateway-logs-modal .filter-group select {
                    padding: 5px 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .gateway-logs-modal .filter-actions {
                    display: flex;
                    gap: 10px;
                }
                .gateway-logs-modal .log-stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .gateway-logs-modal .stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .gateway-logs-modal .stat-item label {
                    font-size: 12px;
                    font-weight: bold;
                    color: #666;
                }
                .gateway-logs-modal .log-content {
                    flex: 1;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .gateway-logs-modal .log-list {
                    height: 100%;
                    overflow-y: auto;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    line-height: 1.4;
                    padding: 10px;
                    background: #fafafa;
                }
                .gateway-logs-modal .log-entry {
                    margin-bottom: 8px;
                    padding: 8px;
                    border-left: 3px solid #ccc;
                    background: white;
                    border-radius: 0 4px 4px 0;
                }
                .gateway-logs-modal .log-entry.info {
                    border-left-color: #2196F3;
                }
                .gateway-logs-modal .log-entry.warning {
                    border-left-color: #FF9800;
                }
                .gateway-logs-modal .log-entry.error {
                    border-left-color: #F44336;
                }
                .gateway-logs-modal .log-entry.success {
                    border-left-color: #4CAF50;
                }
                .gateway-logs-modal .log-timestamp {
                    color: #666;
                    font-size: 12px;
                }
                .gateway-logs-modal .log-level {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    margin: 0 5px;
                }
                .gateway-logs-modal .log-level.info {
                    background: #E3F2FD;
                    color: #1976D2;
                }
                .gateway-logs-modal .log-level.warning {
                    background: #FFF3E0;
                    color: #F57C00;
                }
                .gateway-logs-modal .log-level.error {
                    background: #FFEBEE;
                    color: #D32F2F;
                }
                .gateway-logs-modal .log-level.success {
                    background: #E8F5E8;
                    color: #388E3C;
                }
                .gateway-logs-modal .log-message {
                    margin-top: 5px;
                }
                .gateway-logs-modal .log-loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // 自动加载日志
        this.loadGatewayLogs(gateway.id);

        // 绑定过滤器事件
        const filters = modal.querySelectorAll('#logLevel, #timeRange, #logType');
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.loadGatewayLogs(gateway.id);
            });
        });
    }

    loadGatewayLogs(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const modal = document.querySelector('.gateway-logs-modal');
        if (!modal) return;

        const logList = modal.querySelector('#logList');
        const logLevel = modal.querySelector('#logLevel').value;
        const timeRange = modal.querySelector('#timeRange').value;
        const logType = modal.querySelector('#logType').value;

        // 显示加载状态
        logList.innerHTML = '<div class="log-loading">正在加载日志...</div>';

        // 模拟异步加载
        setTimeout(() => {
            const logs = this.generateMockLogs(gateway, logLevel, timeRange, logType);
            this.renderLogs(logs);
            this.updateLogStats(logs);
        }, 500);
    }

    generateMockLogs(gateway, level, timeRange, type) {
        const logs = [];
        const now = new Date();
        let timeLimit;

        switch (timeRange) {
            case '1h': timeLimit = 1 * 60 * 60 * 1000; break;
            case '24h': timeLimit = 24 * 60 * 60 * 1000; break;
            case '7d': timeLimit = 7 * 24 * 60 * 60 * 1000; break;
            case '30d': timeLimit = 30 * 24 * 60 * 60 * 1000; break;
        }

        const logTypes = ['health', 'payment', 'balance', 'error'];
        const logLevels = ['info', 'warning', 'error', 'success'];

        for (let i = 0; i < 50; i++) {
            const timestamp = new Date(now.getTime() - Math.random() * timeLimit);
            const logTypeRandom = logTypes[Math.floor(Math.random() * logTypes.length)];
            const logLevelRandom = logLevels[Math.floor(Math.random() * logLevels.length)];

            // 过滤逻辑
            if (level !== 'all' && logLevelRandom !== level) continue;
            if (type !== 'all' && logTypeRandom !== type) continue;

            let message;
            switch (logTypeRandom) {
                case 'health':
                    message = `网关健康检查完成 - 响应时间: ${150 + Math.floor(Math.random() * 200)}ms`;
                    break;
                case 'payment':
                    message = `处理支付请求 - 订单号: PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)} - 金额: ¥${(Math.random() * 1000).toFixed(2)}`;
                    break;
                case 'balance':
                    message = `负载均衡更新 - 当前权重: ${gateway.weight} - 活跃连接: ${Math.floor(Math.random() * 100)}`;
                    break;
                case 'error':
                    message = `网关连接异常 - ${['超时', '网络错误', 'SSL证书过期', 'API限流'][Math.floor(Math.random() * 4)]}`;
                    break;
            }

            logs.push({
                timestamp,
                level: logLevelRandom,
                type: logTypeRandom,
                message
            });
        }

        return logs.sort((a, b) => b.timestamp - a.timestamp);
    }

    renderLogs(logs) {
        const modal = document.querySelector('.gateway-logs-modal');
        if (!modal) return;

        const logList = modal.querySelector('#logList');

        if (logs.length === 0) {
            logList.innerHTML = '<div class="log-loading">暂无符合条件的日志</div>';
            return;
        }

        const logsHtml = logs.map(log => `
            <div class="log-entry ${log.level}">
                <div class="log-timestamp">
                    ${log.timestamp.toLocaleString()}
                    <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
                </div>
                <div class="log-message">${log.message}</div>
            </div>
        `).join('');

        logList.innerHTML = logsHtml;
    }

    updateLogStats(logs) {
        const modal = document.querySelector('.gateway-logs-modal');
        if (!modal) return;

        const totalLogs = logs.length;
        const errorCount = logs.filter(log => log.level === 'error').length;
        const lastUpdate = new Date().toLocaleString();

        modal.querySelector('#totalLogs').textContent = totalLogs;
        modal.querySelector('#errorCount').textContent = errorCount;
        modal.querySelector('#lastUpdate').textContent = lastUpdate;
    }

    refreshLogs(gatewayId) {
        this.loadGatewayLogs(gatewayId);
        this.showToast('日志已刷新', 'info');
    }

    exportLogs(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const modal = document.querySelector('.gateway-logs-modal');
        if (!modal) return;

        const logs = this.generateMockLogs(gateway, 'all', '24h', 'all');

        const csvContent = 'data:text/csv;charset=utf-8,' +
            'Timestamp,Level,Type,Message\n' +
            logs.map(log => `"${log.timestamp.toISOString()}","${log.level}","${log.type}","${log.message}"`).join('\n');

        const link = document.createElement('a');
        link.href = encodeURI(csvContent);
        link.target = '_blank';
        link.download = `gateway_${gateway.gatewayName}_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.showToast('日志导出完成', 'success');
    }

    showLogDetails(gatewayId) {
        const gateway = this.gateways.find(g => g.id === gatewayId);
        if (!gateway) return;

        const details = `网关详细分析报告 - ${gateway.gatewayName}

📊 统计信息:
- 网关类型: ${gateway.gatewayType}
- 当前状态: ${gateway.status}
- 响应时间: ${gateway.responseTime}ms
- 成功率: ${gateway.successRate.toFixed(1)}%
- 权重设置: ${gateway.weight}
- 优先级: ${gateway.priority}

🔍 24小时内活动:
- 健康检查: 144次 (正常: 142, 异常: 2)
- 支付处理: 1,247笔 (成功: 1,235, 失败: 12)
- 平均响应: ${gateway.responseTime}ms
- 峰值时段: 14:00-16:00 (处理量最高)

⚠️ 异常记录:
- SSL证书将于30天后过期
- 昨日14:23出现3分钟连接超时
- 建议检查网络连接稳定性

💡 优化建议:
- 考虑增加权重以处理更多请求
- 定期更新SSL证书
- 监控高峰期性能表现`;

        alert(details);
    }

    showAllGatewayEvents() {
        alert('网关事件详情页面开发中...\n\n这里将显示完整的网关事件历史记录，包括：\n- 事件时间\n- 事件类型\n- 网关状态变化\n- 负载均衡调整\n- 故障转移记录');
    }

    showToast(message, type = 'info') {
        // 这里可以实现更复杂的toast通知
        console.log(`[${type.toUpperCase()}] ${message}`);

        // 简单的临时实现
        const alertType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', alertType);
        } else {
            alert(message);
        }
    }

    refreshLinksData() {
        console.log('🔗 刷新链接数据');
    }

    // ================== 工具方法 ==================
    async simulateApiCall(delay = 1000) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 90% 成功率
                if (Math.random() > 0.1) {
                    resolve({ success: true });
                } else {
                    reject(new Error('网络请求失败'));
                }
            }, delay);
        });
    }

    // ================== 快捷操作 ==================
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S 保存配置
            if (e.ctrlKey && e.key === 's' && this.currentTab === 'config') {
                e.preventDefault();
                this.saveConfiguration();
            }

            // Ctrl+N 创建新链接
            if (e.ctrlKey && e.key === 'n' && this.currentTab === 'links') {
                e.preventDefault();
                this.createNewLink();
            }
        });
    }

    // 编辑链接
    editLink(linkId) {
        console.log(`✏️ 编辑链接: ${linkId}`);

        // 查找链接数据 - 修正选择器逻辑
        const row = document.querySelector(`input[value="${linkId}"]`)?.closest('tr');
        if (!row) {
            console.error('找不到指定的链接');
            // 使用默认数据作为fallback
            this.showEditLinkModal({
                id: linkId,
                title: '默认链接标题',
                url: 'pay.cjpayment.com/default',
                amount: '100-1000',
                gateway: '支付网关',
                status: '活跃'
            });
            return;
        }

        // 获取当前链接数据
        const linkData = {
            id: linkId,
            title: row.querySelector('.link-title')?.textContent || '',
            url: row.querySelector('.link-url')?.textContent || '',
            amount: row.querySelector('.amount')?.textContent || '',
            gateway: row.querySelector('.gateway')?.textContent || '',
            status: row.querySelector('.status-badge')?.textContent || ''
        };

        this.showEditLinkModal(linkData);
    }

    // 显示编辑链接模态框
    showEditLinkModal(linkData) {
        // 先清理已存在的编辑模态框
        const existingModal = document.querySelector('.edit-link-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建编辑链接模态框
        const modal = document.createElement('div');
        modal.className = 'edit-link-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑链接 - ${linkData.title}</h3>
                        <button class="modal-close" onclick="this.closest('.edit-link-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="editLinkForm">
                            <!-- 基础信息 -->
                            <div class="form-section">
                                <h4 class="section-title">基础信息</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>链接名称 *</label>
                                        <input type="text" name="linkTitle" required class="form-input"
                                               value="${linkData.title}">
                                    </div>
                                    <div class="form-group">
                                        <label>链接状态</label>
                                        <select name="linkStatus" class="form-select">
                                            <option value="active" ${linkData.status === '活跃' ? 'selected' : ''}>活跃</option>
                                            <option value="inactive" ${linkData.status === '暂停' ? 'selected' : ''}>暂停</option>
                                            <option value="expired" ${linkData.status === '已过期' ? 'selected' : ''}>已过期</option>
                                            <option value="disabled" ${linkData.status === '已禁用' ? 'selected' : ''}>已禁用</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 金额配置 -->
                            <div class="form-section">
                                <h4 class="section-title">金额配置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>充值类型</label>
                                        <select name="amountType" class="form-select">
                                            <option value="fixed">固定金额</option>
                                            <option value="range">金额范围</option>
                                            <option value="custom">用户自定义</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>支付网关</label>
                                        <select name="gateway" class="form-select">
                                            <option value="auto">自动选择</option>
                                            <option value="primary_gateway">主支付网关</option>
                                            <option value="backup_gateway_1">备用网关1</option>
                                            <option value="backup_gateway_2">备用网关2</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- 限制设置 -->
                            <div class="form-section">
                                <h4 class="section-title">限制设置</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>使用次数限制</label>
                                        <input type="number" name="usageLimit" class="form-input"
                                               placeholder="0表示无限制" min="0">
                                    </div>
                                    <div class="form-group">
                                        <label>有效期设置</label>
                                        <select name="expirationType" class="form-select">
                                            <option value="never">永不过期</option>
                                            <option value="date">指定日期</option>
                                            <option value="days">相对天数</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.edit-link-modal').remove()">取消</button>
                        <button type="button" class="btn btn-primary" onclick="window.rechargePaymentCenter.submitEditLink('${linkData.id}')">保存修改</button>
                    </div>
                </div>
            </div>
        `;

        // 添加样式（复用创建链接的样式，只需要改class名）
        this.addEditLinkModalStyles();

        // 添加JavaScript功能
        this.addEditLinkModalScript(modal);

        document.body.appendChild(modal);

        // 焦点到第一个输入框
        setTimeout(() => {
            const firstInput = modal.querySelector('input[name="linkTitle"]');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    // 添加编辑链接模态框样式
    addEditLinkModalStyles() {
        // 检查是否已经添加过样式
        if (document.getElementById('editLinkModalStyles')) {
            return;
        }

        const styles = document.createElement('style');
        styles.id = 'editLinkModalStyles';
        styles.textContent = `
            .edit-link-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }

            .edit-link-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
            }

            .edit-link-modal .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                width: 90%;
                max-width: 700px;
                max-height: 90vh;
                position: relative;
                z-index: 10001;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease-out;
            }

            .edit-link-modal .modal-header {
                padding: 24px 32px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .edit-link-modal .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .edit-link-modal .modal-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 6px;
                transition: background 0.2s;
            }

            .edit-link-modal .modal-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .edit-link-modal .modal-body {
                padding: 24px 32px;
                overflow-y: auto;
                flex: 1;
            }

            .edit-link-modal .form-section {
                margin-bottom: 32px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #10b981;
            }

            .edit-link-modal .section-title {
                margin: 0 0 16px 0;
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .edit-link-modal .section-title::before {
                content: '';
                width: 4px;
                height: 16px;
                background: #10b981;
                border-radius: 2px;
            }

            .edit-link-modal .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 16px;
            }

            .edit-link-modal .form-group {
                margin-bottom: 16px;
            }

            .edit-link-modal .form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
            }

            .edit-link-modal .form-input,
            .edit-link-modal .form-select {
                width: 100%;
                padding: 10px 14px;
                border: 1.5px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .edit-link-modal .form-input:focus,
            .edit-link-modal .form-select:focus {
                outline: none;
                border-color: #10b981;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }

            .edit-link-modal .modal-footer {
                padding: 20px 32px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                background: #f9fafb;
                border-radius: 0 0 12px 12px;
            }

            .edit-link-modal .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .edit-link-modal .btn-secondary {
                background: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
            }

            .edit-link-modal .btn-secondary:hover {
                background: #e5e7eb;
            }

            .edit-link-modal .btn-primary {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }

            .edit-link-modal .btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }

            .edit-link-modal .btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            @media (max-width: 768px) {
                .edit-link-modal .modal-content {
                    width: 95%;
                    margin: 20px;
                }

                .edit-link-modal .modal-header,
                .edit-link-modal .modal-body,
                .edit-link-modal .modal-footer {
                    padding-left: 20px;
                    padding-right: 20px;
                }

                .edit-link-modal .form-row {
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // 添加编辑链接模态框脚本功能
    addEditLinkModalScript(modal) {
        // 点击遮罩层关闭模态框
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });

        // ESC键关闭模态框
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // 提交编辑链接表单
    submitEditLink(linkId) {
        console.log(`💾 提交编辑链接表单: ${linkId}`);

        const form = document.getElementById('editLinkForm');
        const formData = new FormData(form);
        const submitBtn = document.querySelector('.edit-link-modal .btn-primary');

        // 收集表单数据
        const updatedData = {
            title: formData.get('linkTitle'),
            status: formData.get('linkStatus'),
            amountType: formData.get('amountType'),
            gateway: formData.get('gateway'),
            usageLimit: formData.get('usageLimit'),
            expirationType: formData.get('expirationType')
        };

        // 显示保存状态
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;

        // 模拟API请求
        setTimeout(() => {
            try {
                // 更新表格中的数据
                const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
                if (row) {
                    // 更新链接名称
                    const titleElement = row.querySelector('.link-title');
                    if (titleElement) {
                        titleElement.textContent = updatedData.title;
                    }

                    // 更新状态
                    const statusBadge = row.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.className = `status-badge status-${updatedData.status}`;
                        statusBadge.textContent = this.getStatusText(updatedData.status);
                    }

                    // 更新网关
                    const gatewayCell = row.querySelector('.gateway');
                    if (gatewayCell) {
                        gatewayCell.textContent = this.getGatewayName(updatedData.gateway);
                    }
                }

                // 显示成功消息
                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast(
                        '编辑成功',
                        '链接信息已更新',
                        'success'
                    );
                }

                // 关闭模态框
                document.querySelector('.edit-link-modal').remove();

                console.log('✅ 链接编辑成功:', updatedData);

            } catch (error) {
                console.error('❌ 编辑链接失败:', error);

                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast('编辑失败', error.message, 'error');
                }

                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }, 1000);
    }

    // 复制链接
    copyLink(linkUrl) {
        console.log(`📋 复制链接: ${linkUrl}`);

        // 使用现代的剪贴板API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(linkUrl).then(() => {
                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast(
                        '复制成功',
                        '链接地址已复制到剪贴板',
                        'success'
                    );
                }
            }).catch(err => {
                console.error('复制失败:', err);
                this.fallbackCopyTextToClipboard(linkUrl);
            });
        } else {
            // 降级到传统方法
            this.fallbackCopyTextToClipboard(linkUrl);
        }
    }

    // 降级复制方法
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                if (window.CJComponents && window.CJComponents.showToast) {
                    window.CJComponents.showToast(
                        '复制成功',
                        '链接地址已复制到剪贴板',
                        'success'
                    );
                }
            } else {
                throw new Error('复制命令执行失败');
            }
        } catch (err) {
            console.error('复制失败:', err);
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(
                    '复制失败',
                    '请手动选择并复制链接地址',
                    'error'
                );
            }
        } finally {
            document.body.removeChild(textArea);
        }
    }

    // 删除链接
    deleteLink(linkId) {
        console.log(`🗑️ 删除链接: ${linkId}`);

        // 确认删除
        if (!confirm('确定要删除这个链接吗？此操作不可恢复。')) {
            return;
        }

        // 查找并删除行
        const row = document.querySelector(`tr.link-row input[data-link-id="${linkId}"]`)?.closest('tr');
        if (row) {
            const linkTitle = row.querySelector('.link-title')?.textContent || '未知链接';

            row.remove();

            // 更新统计
            this.updateLinksStats();

            // 显示成功消息
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast(
                    '删除成功',
                    `链接 "${linkTitle}" 已被删除`,
                    'success'
                );
            }

            console.log(`✅ 链接删除成功: ${linkTitle}`);
        } else {
            console.error('找不到要删除的链接');
            if (window.CJComponents && window.CJComponents.showToast) {
                window.CJComponents.showToast('删除失败', '找不到指定的链接', 'error');
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 充值支付管理中心页面加载完成');

    // 等待其他依赖脚本加载完成
    setTimeout(() => {
        window.rechargePaymentCenter = new RechargePaymentCenter();
    }, 100);
});

// 导出到全局作用域
window.RechargePaymentCenter = RechargePaymentCenter;