/**
 * API管理系统增强版
 * 负责API接口管理、密钥配置和调用监控
 * 优化版本包含更强大的功能和用户体验
 */
class APIManagement {
    constructor(options = {}) {
        this.currentTab = 'endpoints';
        this.options = {
            autoRefresh: true,
            refreshInterval: 30000,
            enableRealTimeUpdates: true,
            ...options
        };
        
        // 扩展的API接口数据
        this.endpoints = [
            // 支付相关接口
            {
                id: 'pay_create',
                method: 'POST',
                path: '/api/v1/payment/create',
                description: '创建支付订单',
                status: 'active',
                category: 'payment',
                calls: 12543,
                avgResponseTime: 128,
                successRate: 99.8,
                lastCall: new Date(),
                version: 'v1',
                tags: ['核心', '高频'],
                rateLimit: '1000/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/payment/create'
            },
            {
                id: 'pay_query',
                method: 'GET',
                path: '/api/v1/payment/query',
                description: '查询支付状态',
                status: 'active',
                category: 'payment',
                calls: 8765,
                avgResponseTime: 95,
                successRate: 99.9,
                lastCall: new Date(),
                version: 'v1',
                tags: ['核心', '高频', '查询'],
                rateLimit: '2000/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/payment/query'
            },
            {
                id: 'pay_refund',
                method: 'POST',
                path: '/api/v1/payment/refund',
                description: '申请退款',
                status: 'active',
                category: 'payment',
                calls: 432,
                avgResponseTime: 156,
                successRate: 98.5,
                lastCall: new Date(),
                version: 'v1',
                tags: ['核心', '低频'],
                rateLimit: '100/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/payment/refund'
            },
            {
                id: 'pay_callback',
                method: 'POST',
                path: '/api/v1/payment/callback',
                description: '支付回调通知',
                status: 'active',
                category: 'payment',
                calls: 9876,
                avgResponseTime: 45,
                successRate: 99.7,
                lastCall: new Date(),
                version: 'v1',
                tags: ['核心', '回调'],
                rateLimit: '5000/min',
                authentication: 'signature',
                deprecated: false,
                documentationUrl: '/docs/api/payment/callback'
            },
            
            // 商户相关接口
            {
                id: 'merchant_info',
                method: 'GET',
                path: '/api/v1/merchant/info',
                description: '获取商户信息',
                status: 'active',
                category: 'merchant',
                calls: 2341,
                avgResponseTime: 78,
                successRate: 99.6,
                lastCall: new Date(),
                version: 'v1',
                tags: ['商户', '查询'],
                rateLimit: '1000/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/merchant/info'
            },
            {
                id: 'merchant_balance',
                method: 'GET',
                path: '/api/v1/merchant/balance',
                description: '查询商户余额',
                status: 'active',
                category: 'merchant',
                calls: 1876,
                avgResponseTime: 65,
                successRate: 99.9,
                lastCall: new Date(),
                version: 'v1',
                tags: ['商户', '查询', '财务'],
                rateLimit: '500/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/merchant/balance'
            },
            {
                id: 'merchant_create',
                method: 'POST',
                path: '/api/v1/merchant/create',
                description: '创建商户账户',
                status: 'active',
                category: 'merchant',
                calls: 156,
                avgResponseTime: 234,
                successRate: 97.8,
                lastCall: new Date(Date.now() - 86400000),
                version: 'v1',
                tags: ['商户', '创建', '低频'],
                rateLimit: '50/min',
                authentication: 'admin_required',
                deprecated: false,
                documentationUrl: '/docs/api/merchant/create'
            },
            {
                id: 'merchant_update',
                method: 'PUT',
                path: '/api/v1/merchant/update',
                description: '更新商户信息',
                status: 'active',
                category: 'merchant',
                calls: 567,
                avgResponseTime: 189,
                successRate: 98.9,
                lastCall: new Date(Date.now() - 3600000),
                version: 'v1',
                tags: ['商户', '更新'],
                rateLimit: '100/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/merchant/update'
            },
            
            // 用户相关接口
            {
                id: 'user_auth',
                method: 'POST',
                path: '/api/v1/user/auth',
                description: '用户认证登录',
                status: 'active',
                category: 'user',
                calls: 5432,
                avgResponseTime: 145,
                successRate: 96.5,
                lastCall: new Date(),
                version: 'v1',
                tags: ['用户', '认证', '安全'],
                rateLimit: '100/min',
                authentication: 'none',
                deprecated: false,
                documentationUrl: '/docs/api/user/auth'
            },
            {
                id: 'user_profile',
                method: 'GET',
                path: '/api/v1/user/profile',
                description: '获取用户资料',
                status: 'active',
                category: 'user',
                calls: 3456,
                avgResponseTime: 89,
                successRate: 99.4,
                lastCall: new Date(),
                version: 'v1',
                tags: ['用户', '查询'],
                rateLimit: '1000/min',
                authentication: 'required',
                deprecated: false,
                documentationUrl: '/docs/api/user/profile'
            },
            
            // 系统相关接口
            {
                id: 'system_health',
                method: 'GET',
                path: '/api/v1/system/health',
                description: '系统健康检查',
                status: 'deprecated',
                category: 'system',
                calls: 5432,
                avgResponseTime: 25,
                successRate: 99.9,
                lastCall: new Date(),
                version: 'v1',
                tags: ['系统', '监控', '已弃用'],
                rateLimit: '5000/min',
                authentication: 'none',
                deprecated: true,
                documentationUrl: '/docs/api/system/health'
            },
            {
                id: 'system_status',
                method: 'GET',
                path: '/api/v2/system/status',
                description: '系统状态检查（新版）',
                status: 'active',
                category: 'system',
                calls: 8765,
                avgResponseTime: 35,
                successRate: 99.9,
                lastCall: new Date(),
                version: 'v2',
                tags: ['系统', '监控', '新版'],
                rateLimit: '10000/min',
                authentication: 'api_key',
                deprecated: false,
                documentationUrl: '/docs/api/system/status'
            },
            {
                id: 'system_metrics',
                method: 'GET',
                path: '/api/v1/system/metrics',
                description: '系统性能指标',
                status: 'maintenance',
                category: 'system',
                calls: 2143,
                avgResponseTime: 156,
                successRate: 95.6,
                lastCall: new Date(Date.now() - 1800000),
                version: 'v1',
                tags: ['系统', '监控', '维护中'],
                rateLimit: '200/min',
                authentication: 'admin_required',
                deprecated: false,
                documentationUrl: '/docs/api/system/metrics'
            }
        ];
        
        this.apiKeys = [
            {
                id: 'key_001',
                name: '生产环境主密钥',
                description: '用于生产环境的主要API密钥',
                key: 'sk_live_1234567890abcdef1234567890abcdef',
                status: 'active',
                permissions: ['payment', 'merchant', 'query'],
                created: new Date('2024-01-15'),
                lastUsed: new Date(),
                callsToday: 8765,
                rateLimit: '1000/min'
            },
            {
                id: 'key_002',
                name: '测试环境密钥',
                description: '用于开发和测试的API密钥',
                key: 'sk_test_abcdef1234567890abcdef1234567890',
                status: 'active',
                permissions: ['payment', 'query'],
                created: new Date('2024-02-01'),
                lastUsed: new Date(Date.now() - 3600000),
                callsToday: 234,
                rateLimit: '100/min'
            },
            {
                id: 'key_003',
                name: '只读权限密钥',
                description: '仅用于数据查询的只读权限密钥',
                key: 'sk_readonly_9876543210fedcba9876543210fedcba',
                status: 'active',
                permissions: ['query'],
                created: new Date('2024-03-10'),
                lastUsed: new Date(Date.now() - 86400000),
                callsToday: 123,
                rateLimit: '500/min'
            }
        ];
        
        this.logs = [];
        this.currentLogPage = 1;
        this.logsPerPage = 50;
        this.filters = {
            status: '',
            category: '',
            logLevel: '',
            timeRange: '24h',
            search: ''
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.initTabs();
        this.loadStatistics();
        this.renderEndpoints();
        this.renderApiKeys();
        this.generateMockLogs();
        this.renderLogs();
        
        console.log('API管理系统已初始化');
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 标签页切换
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 刷新数据按钮
        document.getElementById('refreshApiData')?.addEventListener('click', () => {
            this.refreshData();
        });
        
        // 导出日志按钮
        document.getElementById('exportApiLogs')?.addEventListener('click', () => {
            this.exportLogs();
        });
        
        // 创建API密钥按钮
        document.getElementById('createApiKey')?.addEventListener('click', () => {
            this.showCreateKeyModal();
        });
        
        // 过滤器
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderEndpoints();
        });
        
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderEndpoints();
        });
        
        document.getElementById('logLevelFilter')?.addEventListener('change', (e) => {
            this.filters.logLevel = e.target.value;
            this.renderLogs();
        });
        
        document.getElementById('timeRangeFilter')?.addEventListener('change', (e) => {
            this.filters.timeRange = e.target.value;
            this.loadStatistics();
        });
        
        document.getElementById('logTimeFilter')?.addEventListener('change', (e) => {
            this.filters.timeRange = e.target.value;
            this.renderLogs();
        });
        
        document.getElementById('logSearch')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderLogs();
        });
        
        // 分页按钮
        document.getElementById('prevLogsPage')?.addEventListener('click', () => {
            if (this.currentLogPage > 1) {
                this.currentLogPage--;
                this.renderLogs();
            }
        });
        
        document.getElementById('nextLogsPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.getFilteredLogs().length / this.logsPerPage);
            if (this.currentLogPage < totalPages) {
                this.currentLogPage++;
                this.renderLogs();
            }
        });
        
        // 模态框事件
        this.bindModalEvents();
    }
    
    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        const modal = document.getElementById('apiKeyModal');
        const closeBtn = document.getElementById('apiKeyModalClose');
        const cancelBtn = document.getElementById('cancelApiKeyBtn');
        const form = document.getElementById('apiKeyForm');
        
        // 关闭模态框
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.hideModal();
            });
        });
        
        // 点击遮罩关闭
        modal?.querySelector('.modal__overlay')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        // 表单提交
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createApiKey();
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                this.hideModal();
            }
        });
    }
    
    /**
     * 初始化标签页
     */
    initTabs() {
        this.switchTab('endpoints');
    }
    
    /**
     * 切换标签页
     */
    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('tab-button--active');
            button.setAttribute('aria-selected', 'false');
        });
        
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.add('tab-button--active');
            activeButton.setAttribute('aria-selected', 'true');
        }
        
        // 更新面板显示
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('tab-panel--active');
        });
        
        const activePanel = document.getElementById(`${tabName}Panel`);
        if (activePanel) {
            activePanel.classList.add('tab-panel--active');
        }
        
        this.currentTab = tabName;
        
        // 根据当前标签页加载相应内容
        switch (tabName) {
            case 'monitoring':
                this.loadMonitoringCharts();
                break;
            case 'logs':
                this.renderLogs();
                break;
        }
    }
    
    /**
     * 加载统计数据
     */
    loadStatistics() {
        // 模拟统计数据
        const stats = {
            todayApiCalls: this.formatNumber(12543),
            successRate: '99.2%',
            avgResponseTime: '128ms',
            activeKeys: this.apiKeys.filter(key => key.status === 'active').length
        };
        
        // 更新DOM
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });
    }
    
    /**
     * 渲染API接口列表 - 增强版
     */
    renderEndpoints() {
        const container = document.getElementById('endpointsGrid');
        if (!container) return;
        
        const filteredEndpoints = this.getFilteredEndpoints();
        
        container.innerHTML = '';
        
        if (filteredEndpoints.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">没有找到匹配的API接口</div>
                    <div class="empty-state-description">尝试调整筛选条件或清空搜索内容</div>
                    <button class="btn btn-outline" onclick="apiManagement.clearFilters()">清空筛选</button>
                </div>
            `;
            return;
        }
        
        filteredEndpoints.forEach(endpoint => {
            const card = document.createElement('div');
            card.className = `endpoint-card endpoint-card--${endpoint.status}`;
            
            // 计算健康度分数
            const healthScore = this.calculateEndpointHealth(endpoint);
            const healthClass = healthScore >= 95 ? 'excellent' : healthScore >= 85 ? 'good' : healthScore >= 70 ? 'warning' : 'danger';
            
            card.innerHTML = `
                <div class="endpoint-card-header">
                    <div class="endpoint-header-left">
                        <div class="endpoint-method-badge endpoint-method-badge--${endpoint.method.toLowerCase()}">${endpoint.method}</div>
                        <div class="endpoint-path-container">
                            <div class="endpoint-path" title="${endpoint.path}">${endpoint.path}</div>
                            <div class="endpoint-version">API ${endpoint.version}</div>
                        </div>
                    </div>
                    <div class="endpoint-header-right">
                        <div class="endpoint-status-badge endpoint-status-badge--${endpoint.status}">
                            ${this.getStatusIcon(endpoint.status)} ${this.getStatusText(endpoint.status)}
                        </div>
                        <div class="endpoint-health-score endpoint-health-score--${healthClass}">
                            <span class="health-score-value">${healthScore}</span>
                            <span class="health-score-label">健康度</span>
                        </div>
                    </div>
                </div>
                
                <div class="endpoint-card-body">
                    <div class="endpoint-description">${endpoint.description}</div>
                    
                    ${endpoint.tags && endpoint.tags.length > 0 ? `
                        <div class="endpoint-tags">
                            ${endpoint.tags.map(tag => `<span class="endpoint-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="endpoint-metrics-grid">
                        <div class="endpoint-metric">
                            <div class="metric-icon">📊</div>
                            <div class="metric-content">
                                <div class="metric-value">${this.formatNumber(endpoint.calls)}</div>
                                <div class="metric-label">今日调用</div>
                            </div>
                        </div>
                        <div class="endpoint-metric">
                            <div class="metric-icon">⚡</div>
                            <div class="metric-content">
                                <div class="metric-value">${endpoint.avgResponseTime}ms</div>
                                <div class="metric-label">平均响应</div>
                            </div>
                        </div>
                        <div class="endpoint-metric">
                            <div class="metric-icon">✅</div>
                            <div class="metric-content">
                                <div class="metric-value">${endpoint.successRate}%</div>
                                <div class="metric-label">成功率</div>
                            </div>
                        </div>
                        <div class="endpoint-metric">
                            <div class="metric-icon">🔒</div>
                            <div class="metric-content">
                                <div class="metric-value">${this.getAuthIcon(endpoint.authentication)}</div>
                                <div class="metric-label">${this.getAuthText(endpoint.authentication)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="endpoint-additional-info">
                        <div class="endpoint-rate-limit">
                            <span class="rate-limit-icon">⚡</span>
                            <span class="rate-limit-text">限流: ${endpoint.rateLimit}</span>
                        </div>
                        <div class="endpoint-last-call">
                            <span class="last-call-icon">🕒</span>
                            <span class="last-call-text">最后调用: ${this.formatRelativeTime(endpoint.lastCall)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="endpoint-card-footer">
                    <div class="endpoint-actions">
                        <button class="endpoint-action-btn endpoint-action-btn--primary" 
                                onclick="apiManagement.testEndpoint('${endpoint.id}')" 
                                title="测试此接口">
                            <span class="btn-icon">🧪</span>
                            <span class="btn-text">测试</span>
                        </button>
                        <button class="endpoint-action-btn endpoint-action-btn--outline" 
                                onclick="apiManagement.viewEndpointDocs('${endpoint.id}')" 
                                title="查看接口文档">
                            <span class="btn-icon">📚</span>
                            <span class="btn-text">文档</span>
                        </button>
                        <button class="endpoint-action-btn endpoint-action-btn--outline" 
                                onclick="apiManagement.viewEndpointAnalytics('${endpoint.id}')" 
                                title="查看接口分析">
                            <span class="btn-icon">📈</span>
                            <span class="btn-text">分析</span>
                        </button>
                        <div class="endpoint-action-dropdown">
                            <button class="endpoint-action-btn endpoint-action-btn--ghost endpoint-dropdown-trigger" 
                                    onclick="apiManagement.toggleEndpointDropdown('${endpoint.id}')">
                                <span class="btn-icon">⋯</span>
                            </button>
                            <div class="endpoint-dropdown-menu" id="dropdown-${endpoint.id}">
                                <a class="dropdown-item" href="#" onclick="apiManagement.copyEndpointUrl('${endpoint.id}')">
                                    <span class="dropdown-icon">📋</span>
                                    复制链接
                                </a>
                                <a class="dropdown-item" href="#" onclick="apiManagement.exportEndpointData('${endpoint.id}')">
                                    <span class="dropdown-icon">📊</span>
                                    导出数据
                                </a>
                                ${endpoint.deprecated ? '' : `
                                    <div class="dropdown-divider"></div>
                                    <a class="dropdown-item" href="#" onclick="apiManagement.editEndpoint('${endpoint.id}')">
                                        <span class="dropdown-icon">✏️</span>
                                        编辑接口
                                    </a>
                                `}
                                <a class="dropdown-item dropdown-item--danger" href="#" onclick="apiManagement.toggleEndpointStatus('${endpoint.id}')">
                                    <span class="dropdown-icon">${endpoint.status === 'active' ? '⏸️' : '▶️'}</span>
                                    ${endpoint.status === 'active' ? '禁用接口' : '启用接口'}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        // 添加统计信息
        this.renderEndpointsSummary(filteredEndpoints);
    }
    
    /**
     * 渲染接口统计摘要
     */
    renderEndpointsSummary(endpoints) {
        const existingSummary = document.querySelector('.endpoints-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        const container = document.getElementById('endpointsGrid');
        const summary = document.createElement('div');
        summary.className = 'endpoints-summary';
        
        const totalCalls = endpoints.reduce((sum, ep) => sum + ep.calls, 0);
        const avgResponseTime = Math.round(endpoints.reduce((sum, ep) => sum + ep.avgResponseTime, 0) / endpoints.length);
        const avgSuccessRate = (endpoints.reduce((sum, ep) => sum + ep.successRate, 0) / endpoints.length).toFixed(1);
        
        summary.innerHTML = `
            <div class="summary-header">
                <h4 class="summary-title">接口统计摘要</h4>
                <span class="summary-count">${endpoints.length} 个接口</span>
            </div>
            <div class="summary-metrics">
                <div class="summary-metric">
                    <span class="summary-metric-value">${this.formatNumber(totalCalls)}</span>
                    <span class="summary-metric-label">总调用量</span>
                </div>
                <div class="summary-metric">
                    <span class="summary-metric-value">${avgResponseTime}ms</span>
                    <span class="summary-metric-label">平均响应时间</span>
                </div>
                <div class="summary-metric">
                    <span class="summary-metric-value">${avgSuccessRate}%</span>
                    <span class="summary-metric-label">平均成功率</span>
                </div>
            </div>
        `;
        
        container.parentElement.insertBefore(summary, container);
    }
    }
    
    /**
     * 渲染API密钥列表
     */
    renderApiKeys() {
        const container = document.getElementById('keysList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.apiKeys.forEach(key => {
            const keyItem = document.createElement('div');
            keyItem.className = 'key-item';
            keyItem.innerHTML = `
                <div class="key-header">
                    <div class="key-info">
                        <h4 class="key-name">${key.name}</h4>
                        <div class="key-description">${key.description}</div>
                        <div class="key-created">创建于: ${this.formatDate(key.created)}</div>
                    </div>
                    <span class="key-status ${key.status}">${this.getStatusText(key.status)}</span>
                </div>
                <div class="key-details">
                    <div class="key-detail">
                        <div class="key-detail-label">密钥</div>
                        <div class="key-detail-value">${this.maskKey(key.key)}</div>
                    </div>
                    <div class="key-detail">
                        <div class="key-detail-label">今日调用</div>
                        <div class="key-detail-value">${this.formatNumber(key.callsToday)}</div>
                    </div>
                    <div class="key-detail">
                        <div class="key-detail-label">限制</div>
                        <div class="key-detail-value">${key.rateLimit}</div>
                    </div>
                </div>
                <div class="key-secret masked" data-key="${key.key}" onclick="apiManagement.toggleKeyVisibility(this)">
                    ${key.key}
                </div>
                <div class="key-actions">
                    <button class="key-action-btn key-action-btn--primary" onclick="apiManagement.regenerateKey('${key.id}')">
                        重新生成
                    </button>
                    <button class="key-action-btn key-action-btn--outline" onclick="apiManagement.editKey('${key.id}')">
                        编辑
                    </button>
                    <button class="key-action-btn key-action-btn--danger" onclick="apiManagement.deleteKey('${key.id}')">
                        删除
                    </button>
                </div>
            `;
            container.appendChild(keyItem);
        });
    }
    
    /**
     * 生成模拟日志数据
     */
    generateMockLogs() {
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const paths = [
            '/api/v1/payment/create',
            '/api/v1/payment/query',
            '/api/v1/payment/refund',
            '/api/v1/merchant/info',
            '/api/v1/merchant/balance'
        ];
        const statusCodes = [200, 201, 400, 401, 403, 404, 500];
        const ips = ['192.168.1.100', '203.208.60.15', '110.242.68.3', '59.152.193.11'];
        
        this.logs = [];
        
        for (let i = 0; i < 1234; i++) {
            const method = methods[Math.floor(Math.random() * methods.length)];
            const path = paths[Math.floor(Math.random() * paths.length)];
            const status = statusCodes[Math.floor(Math.random() * statusCodes.length)];
            const ip = ips[Math.floor(Math.random() * ips.length)];
            const responseTime = Math.floor(Math.random() * 500) + 50;
            const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            
            this.logs.push({
                id: `log_${i}`,
                timestamp,
                method,
                path,
                status,
                responseTime,
                ip,
                userAgent: 'API Client/1.0',
                level: status >= 400 ? 'error' : 'info'
            });
        }
        
        // 按时间倒序排列
        this.logs.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    /**
     * 渲染日志列表
     */
    renderLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;
        
        const filteredLogs = this.getFilteredLogs();
        const startIndex = (this.currentLogPage - 1) * this.logsPerPage;
        const endIndex = startIndex + this.logsPerPage;
        const pageData = filteredLogs.slice(startIndex, endIndex);
        
        container.innerHTML = '';
        
        pageData.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <div class="log-time">${this.formatTime(log.timestamp)}</div>
                <div class="log-method ${log.method.toLowerCase()}">${log.method}</div>
                <div class="log-path">${log.path}</div>
                <div class="log-status ${log.status >= 400 ? 'error' : 'success'}">${log.status}</div>
                <div class="log-response-time">${log.responseTime}ms</div>
            `;
            container.appendChild(logItem);
        });
        
        // 更新分页信息
        this.updatePagination(filteredLogs.length);
    }
    
    /**
     * 更新分页信息
     */
    updatePagination(totalLogs) {
        const startIndex = (this.currentLogPage - 1) * this.logsPerPage + 1;
        const endIndex = Math.min(this.currentLogPage * this.logsPerPage, totalLogs);
        
        document.getElementById('logsStart').textContent = startIndex;
        document.getElementById('logsEnd').textContent = endIndex;
        document.getElementById('logsTotal').textContent = this.formatNumber(totalLogs);
        
        // 更新按钮状态
        document.getElementById('prevLogsPage').disabled = this.currentLogPage === 1;
        document.getElementById('nextLogsPage').disabled = endIndex >= totalLogs;
    }
    
    /**
     * 加载监控图表
     */
    loadMonitoringCharts() {
        // 这里应该集成真实的图表库（如Chart.js, ECharts等）
        const chartContainers = document.querySelectorAll('.chart-placeholder');
        
        chartContainers.forEach(container => {
            if (!container.dataset.loaded) {
                container.innerHTML = '<div class="chart-mock">📊 图表数据加载中...</div>';
                
                // 模拟加载时间
                setTimeout(() => {
                    container.innerHTML = '<div class="chart-mock">📈 监控图表已加载</div>';
                    container.dataset.loaded = 'true';
                }, 1000);
            }
        });
    }
    
    /**
     * 获取过滤后的API接口
     */
    getFilteredEndpoints() {
        return this.endpoints.filter(endpoint => {
            if (this.filters.status && endpoint.status !== this.filters.status) {
                return false;
            }
            if (this.filters.category && endpoint.category !== this.filters.category) {
                return false;
            }
            return true;
        });
    }
    
    /**
     * 获取过滤后的日志
     */
    getFilteredLogs() {
        return this.logs.filter(log => {
            if (this.filters.logLevel && log.level !== this.filters.logLevel) {
                return false;
            }
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                if (!log.path.toLowerCase().includes(searchTerm) && 
                    !log.ip.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });
    }
    
    /**
     * 显示创建密钥模态框
     */
    showCreateKeyModal() {
        const modal = document.getElementById('apiKeyModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // 重置表单
            document.getElementById('apiKeyForm').reset();
        }
    }
    
    /**
     * 隐藏模态框
     */
    hideModal() {
        const modal = document.getElementById('apiKeyModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * 创建API密钥
     */
    createApiKey() {
        const form = document.getElementById('apiKeyForm');
        const formData = new FormData(form);
        
        const keyName = formData.get('keyName') || document.getElementById('keyName').value;
        const keyDescription = formData.get('keyDescription') || document.getElementById('keyDescription').value;
        const keyExpiry = formData.get('keyExpiry') || document.getElementById('keyExpiry').value;
        
        // 获取选中的权限
        const permissions = [];
        document.querySelectorAll('input[name="permissions"]:checked').forEach(checkbox => {
            permissions.push(checkbox.value);
        });
        
        if (!keyName) {
            this.showToast('请输入密钥名称', 'error');
            return;
        }
        
        if (permissions.length === 0) {
            this.showToast('请至少选择一个权限', 'error');
            return;
        }
        
        // 生成新密钥
        const newKey = {
            id: `key_${Date.now()}`,
            name: keyName,
            description: keyDescription || '无描述',
            key: this.generateApiKey(),
            status: 'active',
            permissions: permissions,
            created: new Date(),
            lastUsed: null,
            callsToday: 0,
            rateLimit: '1000/min'
        };
        
        this.apiKeys.unshift(newKey);
        this.renderApiKeys();
        this.hideModal();
        
        this.showToast('API密钥创建成功', 'success');
    }
    
    /**
     * 生成API密钥
     */
    generateApiKey() {
        const prefix = 'sk_live_';
        const chars = 'abcdef0123456789';
        let key = prefix;
        
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return key;
    }
    
    /**
     * 切换密钥显示/隐藏
     */
    toggleKeyVisibility(element) {
        if (element.classList.contains('masked')) {
            element.classList.remove('masked');
            element.textContent = element.dataset.key;
        } else {
            element.classList.add('masked');
            element.textContent = this.maskKey(element.dataset.key);
        }
    }
    
    /**
     * 掩码显示密钥
     */
    maskKey(key) {
        if (key.length <= 8) return key;
        return key.substring(0, 8) + '•'.repeat(key.length - 16) + key.substring(key.length - 8);
    }
    
    /**
     * 重新生成密钥
     */
    regenerateKey(keyId) {
        if (confirm('确定要重新生成此密钥吗？旧密钥将立即失效。')) {
            const key = this.apiKeys.find(k => k.id === keyId);
            if (key) {
                key.key = this.generateApiKey();
                key.lastUsed = null;
                key.callsToday = 0;
                
                this.renderApiKeys();
                this.showToast('API密钥已重新生成', 'success');
            }
        }
    }
    
    /**
     * 编辑密钥
     */
    editKey(keyId) {
        this.showToast('编辑功能正在开发中', 'info');
    }
    
    /**
     * 删除密钥
     */
    deleteKey(keyId) {
        if (confirm('确定要删除此API密钥吗？此操作不可恢复。')) {
            const index = this.apiKeys.findIndex(k => k.id === keyId);
            if (index !== -1) {
                this.apiKeys.splice(index, 1);
                this.renderApiKeys();
                this.showToast('API密钥已删除', 'success');
            }
        }
    }
    
    /**
     * 测试API接口
     */
    testEndpoint(endpointId) {
        this.showToast('API测试功能正在开发中', 'info');
    }
    
    /**
     * 查看接口文档
     */
    viewEndpointDocs(endpointId) {
        this.switchTab('documentation');
    }
    
    /**
     * 刷新数据
     */
    refreshData() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        // 模拟刷新过程
        setTimeout(() => {
            this.loadStatistics();
            this.renderEndpoints();
            this.renderApiKeys();
            this.renderLogs();
            
            document.getElementById('globalLoading').style.display = 'none';
            this.showToast('数据已刷新', 'success');
        }, 1500);
    }
    
    /**
     * 导出日志
     */
    exportLogs() {
        const filteredLogs = this.getFilteredLogs();
        const csvContent = this.convertLogsToCSV(filteredLogs);
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `api-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        
        this.showToast('日志导出成功', 'success');
    }
    
    /**
     * 转换日志为CSV格式
     */
    convertLogsToCSV(logs) {
        const headers = ['时间', '方法', '路径', '状态码', '响应时间', 'IP地址'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                this.formatTime(log.timestamp),
                log.method,
                log.path,
                log.status,
                `${log.responseTime}ms`,
                log.ip
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'active': '正常',
            'deprecated': '已弃用',
            'maintenance': '维护中',
            'expired': '已过期'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 格式化数字
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    /**
     * 格式化日期
     */
    formatDate(date) {
        return date.toLocaleDateString('zh-CN');
    }
    
    /**
     * 格式化时间
     */
    formatTime(date) {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', type);
        } else {
            alert(message);
        }
    }
    
    // ===== 新增的辅助方法 =====
    
    /**
     * 计算接口健康度分数
     */
    calculateEndpointHealth(endpoint) {
        let score = 100;
        
        // 成功率权重 40%
        if (endpoint.successRate < 99) score -= (99 - endpoint.successRate) * 0.4;
        
        // 响应时间权重 30%
        if (endpoint.avgResponseTime > 200) {
            score -= Math.min((endpoint.avgResponseTime - 200) / 10, 30) * 0.3;
        }
        
        // 状态权重 20%
        if (endpoint.status === 'deprecated') score -= 20;
        else if (endpoint.status === 'maintenance') score -= 15;
        
        // 最后调用时间权重 10%
        const hoursSinceLastCall = (Date.now() - endpoint.lastCall.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastCall > 24) {
            score -= Math.min(hoursSinceLastCall - 24, 100) * 0.1;
        }
        
        return Math.max(0, Math.round(score));
    }
    
    /**
     * 获取状态图标
     */
    getStatusIcon(status) {
        const iconMap = {
            'active': '🟢',
            'deprecated': '🟠',
            'maintenance': '🟡',
            'expired': '🔴'
        };
        return iconMap[status] || '⚫';
    }
    
    /**
     * 获取认证类型图标
     */
    getAuthIcon(auth) {
        const iconMap = {
            'none': '🔓',
            'required': '🔒',
            'api_key': '🔑',
            'signature': '📝',
            'admin_required': '👑'
        };
        return iconMap[auth] || '❓';
    }
    
    /**
     * 获取认证类型文本
     */
    getAuthText(auth) {
        const textMap = {
            'none': '无需认证',
            'required': '需要认证',
            'api_key': 'API密钥',
            'signature': '签名验证',
            'admin_required': '管理员权限'
        };
        return textMap[auth] || auth;
    }
    
    /**
     * 格式化相对时间
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 小于1分钟
            return '刚刚';
        } else if (diff < 3600000) { // 小于1小时
            const minutes = Math.floor(diff / 60000);
            return `${minutes}分钟前`;
        } else if (diff < 86400000) { // 小于1天
            const hours = Math.floor(diff / 3600000);
            return `${hours}小时前`;
        } else { // 大于1天
            const days = Math.floor(diff / 86400000);
            return `${days}天前`;
        }
    }
    
    /**
     * 清空筛选条件
     */
    clearFilters() {
        this.filters = {
            status: '',
            category: '',
            logLevel: '',
            timeRange: '24h',
            search: ''
        };
        
        // 重置UI筛选器
        const statusFilter = document.getElementById('statusFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        if (statusFilter) statusFilter.value = '';
        if (categoryFilter) categoryFilter.value = '';
        
        this.renderEndpoints();
        this.showToast('已清空筛选条件', 'info');
    }
    
    /**
     * 测试接口
     */
    testEndpoint(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        this.showToast(`正在测试接口: ${endpoint.path}`, 'info');
        
        // 模拟测试请求
        setTimeout(() => {
            const success = Math.random() > 0.1; // 90% 成功率
            if (success) {
                this.showToast(`接口测试成功 - ${endpoint.path}`, 'success');
            } else {
                this.showToast(`接口测试失败 - ${endpoint.path}`, 'error');
            }
        }, 1000);
    }
    
    /**
     * 查看接口文档
     */
    viewEndpointDocs(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        if (endpoint.documentationUrl) {
            window.open(endpoint.documentationUrl, '_blank');
        } else {
            this.showToast('该接口暂无文档', 'warning');
        }
    }
    
    /**
     * 查看接口分析
     */
    viewEndpointAnalytics(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        // 这里可以打开分析页面或模态框
        this.showToast(`正在打开 ${endpoint.path} 的分析数据`, 'info');
    }
    
    /**
     * 切换下拉菜单
     */
    toggleEndpointDropdown(endpointId) {
        const dropdown = document.getElementById(`dropdown-${endpointId}`);
        if (!dropdown) return;
        
        // 关闭其他下拉菜单
        document.querySelectorAll('.endpoint-dropdown-menu.show').forEach(menu => {
            if (menu.id !== `dropdown-${endpointId}`) {
                menu.classList.remove('show');
            }
        });
        
        dropdown.classList.toggle('show');
        
        // 点击外部关闭下拉菜单
        setTimeout(() => {
            const handleClickOutside = (e) => {
                if (!dropdown.contains(e.target) && !e.target.closest('.endpoint-dropdown-trigger')) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            document.addEventListener('click', handleClickOutside);
        }, 0);
    }
    
    /**
     * 复制接口链接
     */
    copyEndpointUrl(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        const url = `${window.location.origin}${endpoint.path}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('接口链接已复制到剪贴板', 'success');
            }).catch(() => {
                this.showToast('复制失败，请手动复制', 'error');
            });
        } else {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('接口链接已复制到剪贴板', 'success');
        }
        
        // 关闭下拉菜单
        document.getElementById(`dropdown-${endpointId}`).classList.remove('show');
    }
    
    /**
     * 导出接口数据
     */
    exportEndpointData(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        const data = {
            id: endpoint.id,
            method: endpoint.method,
            path: endpoint.path,
            description: endpoint.description,
            status: endpoint.status,
            category: endpoint.category,
            version: endpoint.version,
            calls: endpoint.calls,
            avgResponseTime: endpoint.avgResponseTime,
            successRate: endpoint.successRate,
            rateLimit: endpoint.rateLimit,
            authentication: endpoint.authentication,
            tags: endpoint.tags,
            lastCall: endpoint.lastCall.toISOString(),
            exportTime: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api-endpoint-${endpoint.id}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('接口数据已导出', 'success');
        document.getElementById(`dropdown-${endpointId}`).classList.remove('show');
    }
    
    /**
     * 编辑接口
     */
    editEndpoint(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        this.showToast(`打开编辑界面: ${endpoint.path}`, 'info');
        document.getElementById(`dropdown-${endpointId}`).classList.remove('show');
        
        // 这里可以打开编辑模态框
    }
    
    /**
     * 切换接口状态
     */
    toggleEndpointStatus(endpointId) {
        const endpoint = this.endpoints.find(ep => ep.id === endpointId);
        if (!endpoint) return;
        
        const newStatus = endpoint.status === 'active' ? 'maintenance' : 'active';
        const actionText = newStatus === 'active' ? '启用' : '禁用';
        
        if (confirm(`确定要${actionText}接口 ${endpoint.path} 吗？`)) {
            endpoint.status = newStatus;
            this.renderEndpoints();
            this.showToast(`接口已${actionText}`, 'success');
        }
        
        document.getElementById(`dropdown-${endpointId}`).classList.remove('show');
    }
}

// 全局实例
let apiManagement;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    apiManagement = new APIManagement();
    console.log('API管理系统已加载并初始化完成');
});