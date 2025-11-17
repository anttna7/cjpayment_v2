/**
 * Enhanced System Management Module
 * Handles merchants, accounts, rotation rules, and limits management
 * Uses the new design system and component architecture
 */

window.SystemManagement = (function() {
    'use strict';

    class SystemManagement {
        constructor() {
            this.currentTab = 'merchants';
            this.data = {
                merchants: [],
                accounts: [],
                rotationRules: [],
                limits: []
            };
            this.pagination = {
                merchants: {
                    currentPage: 1,
                    pageSize: 20,
                    totalPages: 1,
                    totalItems: 0
                },
                accounts: {
                    currentPage: 1,
                    pageSize: 20,
                    totalPages: 1,
                    totalItems: 0
                }
            };
            this.filters = {
                merchants: { search: '' },
                accounts: { type: '', status: '' },
                rotation: { merchant: '' },
                limits: { type: '' }
            };
            this.viewModes = {
                merchants: 'cards',
                accounts: 'cards'
            };
            this.selectedItems = {
                merchants: new Set(),
                accounts: new Set()
            };
            this.isLoading = false;
            
            // Initialize components
            this.components = {
                toast: null,
                modal: null,
                loading: null,
                pagination: {
                    merchants: null,
                    accounts: null
                }
            };
            
            // Initialize modals
            this.accountModal = null;
            
            // Initialize rotation rules management
            this.rotationRulesManagement = null;
        }

        // ==========================================================================
        // Initialization
        // ==========================================================================

        async init() {
            try {
                this.initializeComponents();
                this.bindEvents();
                this.setupTabNavigation();
                await this.loadInitialData();
                this.updateTabBadges();
                
                // Show success message
                this.showToast('系统管理模块已加载', 'success');
                
                // 添加调试功能
                window.debugAccountModal = () => {
                    console.log('Debug: Testing account modal...');
                    this.openAccountForm();
                };
            } catch (error) {
                console.error('Failed to initialize system management:', error);
                // Don't show error toast - the system can still work
                console.warn('系统管理初始化部分失败，但核心功能仍可使用');
            }
        }

        initializeComponents() {
            // Initialize toast component
            if (window.CJComponents && window.CJComponents.Toast) {
                this.components.toast = new window.CJComponents.Toast();
            }
            
            // Initialize modal component
            if (window.CJComponents && window.CJComponents.Modal) {
                this.components.modal = new window.CJComponents.Modal();
            }
            
            // Initialize loading component
            if (window.CJComponents && window.CJComponents.Loading) {
                this.components.loading = new window.CJComponents.Loading();
            }
            
            // Initialize pagination components
            this.initializePagination();
        }

        initializePagination() {
            // Initialize merchants pagination
            const merchantsPaginationContainer = document.getElementById('merchantsPagination');
            if (merchantsPaginationContainer && window.createPagination) {
                this.components.pagination.merchants = window.createPagination(merchantsPaginationContainer, {
                    currentPage: this.pagination.merchants.currentPage,
                    totalPages: this.pagination.merchants.totalPages,
                    totalItems: this.pagination.merchants.totalItems,
                    pageSize: this.pagination.merchants.pageSize,
                    pageSizeOptions: [10, 20, 50, 100],
                    showInfo: true,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    onChange: (page, pageSize) => {
                        this.pagination.merchants.currentPage = page;
                        this.pagination.merchants.pageSize = pageSize;
                        this.loadMerchants();
                    },
                    onPageSizeChange: (pageSize, page) => {
                        this.pagination.merchants.pageSize = pageSize;
                        this.pagination.merchants.currentPage = page;
                        this.loadMerchants();
                    }
                });
            }

            // Initialize accounts pagination
            const accountsPaginationContainer = document.getElementById('accountsPagination');
            if (accountsPaginationContainer && window.createPagination) {
                this.components.pagination.accounts = window.createPagination(accountsPaginationContainer, {
                    currentPage: this.pagination.accounts.currentPage,
                    totalPages: this.pagination.accounts.totalPages,
                    totalItems: this.pagination.accounts.totalItems,
                    pageSize: this.pagination.accounts.pageSize,
                    pageSizeOptions: [10, 20, 50, 100],
                    showInfo: true,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    onChange: (page, pageSize) => {
                        this.pagination.accounts.currentPage = page;
                        this.pagination.accounts.pageSize = pageSize;
                        this.loadAccounts();
                    },
                    onPageSizeChange: (pageSize, page) => {
                        this.pagination.accounts.pageSize = pageSize;
                        this.pagination.accounts.currentPage = page;
                        this.loadAccounts();
                    }
                });
            }
        }

        bindEvents() {
            // Tab navigation
            this.bindTabEvents();
            
            // Header actions
            this.bindHeaderActions();
            
            // Search and filters
            this.bindSearchAndFilters();
            
            // View toggles
            this.bindViewToggles();
            
            // Form submissions
            this.bindFormEvents();
            
            // Bulk actions
            this.bindBulkActions();
        }

        bindTabEvents() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.currentTarget.dataset.tab;
                    if (tab && tab !== this.currentTab) {
                        this.switchTab(tab);
                    }
                });
            });
        }



        bindHeaderActions() {
            // Refresh data button
            const refreshBtn = document.getElementById('refreshDataBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.refreshCurrentTabData();
                });
            }
            
            // System settings button
            const settingsBtn = document.getElementById('systemSettingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    this.openSystemSettings();
                });
            }
        }

        bindSearchAndFilters() {
            // Merchant search
            const merchantSearch = document.getElementById('merchantSearch');
            if (merchantSearch) {
                let searchTimeout;
                merchantSearch.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.merchants.search = e.target.value;
                        this.resetPagination('merchants'); // Reset to first page when searching
                        this.loadMerchants();
                    }, 300);
                });
            }
            
            // Account filters
            const accountTypeFilter = document.getElementById('accountTypeFilter');
            if (accountTypeFilter) {
                accountTypeFilter.addEventListener('change', (e) => {
                    this.filters.accounts.type = e.target.value;
                    this.resetPagination('accounts'); // Reset to first page when filtering
                    this.loadAccounts();
                });
            }
            
            const accountStatusFilter = document.getElementById('accountStatusFilter');
            if (accountStatusFilter) {
                accountStatusFilter.addEventListener('change', (e) => {
                    this.filters.accounts.status = e.target.value;
                    this.resetPagination('accounts'); // Reset to first page when filtering
                    this.loadAccounts();
                });
            }

            // Add clear filters functionality
            const clearMerchantFilters = document.getElementById('clearMerchantFilters');
            if (clearMerchantFilters) {
                clearMerchantFilters.addEventListener('click', () => {
                    this.clearMerchantFilters();
                });
            }

            const clearAccountFilters = document.getElementById('clearAccountFilters');
            if (clearAccountFilters) {
                clearAccountFilters.addEventListener('click', () => {
                    this.clearAccountFilters();
                });
            }
        }

        clearMerchantFilters() {
            this.filters.merchants.search = '';
            const merchantSearch = document.getElementById('merchantSearch');
            if (merchantSearch) {
                merchantSearch.value = '';
            }
            this.resetPagination('merchants');
            this.loadMerchants();
        }

        clearAccountFilters() {
            this.filters.accounts.type = '';
            this.filters.accounts.status = '';
            
            const accountTypeFilter = document.getElementById('accountTypeFilter');
            if (accountTypeFilter) {
                accountTypeFilter.value = '';
            }
            
            const accountStatusFilter = document.getElementById('accountStatusFilter');
            if (accountStatusFilter) {
                accountStatusFilter.value = '';
            }
            
            this.resetPagination('accounts');
            this.loadAccounts();
        }

        bindViewToggles() {
            const viewBtns = document.querySelectorAll('.view-btn');
            viewBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const view = e.currentTarget.dataset.view;
                    const parentSection = e.currentTarget.closest('.tab-content');
                    const tabId = parentSection.id.replace('Tab', '');
                    
                    if (view && this.viewModes[tabId] !== view) {
                        this.switchView(tabId, view);
                    }
                });
            });
        }

        bindFormEvents() {
            // Add merchant button
            const addMerchantBtn = document.getElementById('addMerchantBtn');
            if (addMerchantBtn) {
                addMerchantBtn.addEventListener('click', () => {
                    this.openMerchantForm();
                });
            }
            
            // Add account button
            const addAccountBtn = document.getElementById('addAccountBtn');
            if (addAccountBtn) {
                console.log('Account button found and binding event');
                addAccountBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Add account button clicked');
                    this.openAccountForm();
                });
            } else {
                console.warn('Add account button not found');
            }
            
            // Add rotation rule button
            const addRotationRuleBtn = document.getElementById('addRotationRuleBtn');
            if (addRotationRuleBtn) {
                addRotationRuleBtn.addEventListener('click', () => {
                    this.openRotationRuleForm();
                });
            }
        }

        bindBulkActions() {
            // Select all checkboxes
            const selectAllMerchants = document.getElementById('selectAllMerchants');
            if (selectAllMerchants) {
                selectAllMerchants.addEventListener('change', (e) => {
                    this.toggleSelectAll('merchants', e.target.checked);
                });
            }
            
            const selectAllAccounts = document.getElementById('selectAllAccounts');
            if (selectAllAccounts) {
                selectAllAccounts.addEventListener('change', (e) => {
                    this.toggleSelectAll('accounts', e.target.checked);
                });
            }
        }

        // ==========================================================================
        // Tab Management
        // ==========================================================================

        setupTabNavigation() {
            // Check URL for tab parameter
            const urlParams = new URLSearchParams(window.location.search);
            const tabFromUrl = urlParams.get('tab');
            
            if (tabFromUrl && ['merchants', 'accounts', 'rotation', 'limits'].includes(tabFromUrl)) {
                this.currentTab = tabFromUrl;
            }
            
            // Set initial active tab
            this.switchTab(this.currentTab);
        }

        async switchTab(tabName) {
            if (this.isLoading) return;
            
            try {
                // Update UI
                this.updateTabUI(tabName);
                
                // Update current tab
                this.currentTab = tabName;
                
                // Load tab data
                await this.loadTabData(tabName);
                
                // Update URL without page reload
                this.updateURL(tabName);
                
            } catch (error) {
                console.error(`Failed to switch to tab ${tabName}:`, error);
                this.showToast(`切换到${tabName}失败`, 'error');
            }
        }

        updateTabUI(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                }
            });
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(`${tabName}Tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        }

        async loadTabData(tabName) {
            switch (tabName) {
                case 'merchants':
                    await this.loadMerchants();
                    break;
                case 'accounts':
                    await this.loadAccounts();
                    break;
                case 'rotation':
                    await this.loadRotationRules();
                    break;
                case 'limits':
                    await this.loadLimits();
                    break;
            }
        }

        updateURL(tabName) {
            const url = new URL(window.location);
            url.searchParams.set('tab', tabName);
            window.history.replaceState({}, '', url);
        }

        // ==========================================================================
        // Data Loading
        // ==========================================================================

        async loadInitialData() {
            this.setLoading(true);
            
            try {
                // Load all data in parallel, but don't fail if some APIs are not implemented
                const results = await Promise.allSettled([
                    this.loadMerchants(),
                    this.loadAccounts(),
                    this.loadRotationRules(),
                    this.loadLimits()
                ]);
                
                // Log any failures but don't throw
                results.forEach((result, index) => {
                    const names = ['merchants', 'accounts', 'rotation rules', 'limits'];
                    if (result.status === 'rejected') {
                        console.warn(`Failed to load ${names[index]}:`, result.reason);
                    }
                });
                
            } catch (error) {
                console.error('Failed to load initial data:', error);
                // Don't throw - allow the system to continue working
            } finally {
                this.setLoading(false);
            }
        }

        async loadMerchants() {
            try {
                // Show loading state
                this.setLoadingState('merchants', true);
                
                const params = new URLSearchParams({
                    page: this.pagination.merchants.currentPage,
                    size: this.pagination.merchants.pageSize,
                    search: this.filters.merchants.search
                });
                
                const response = await fetch(`/api/v1/merchants?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to load merchants');
                }
                
                const data = await response.json();
                this.data.merchants = data.merchants || [];
                this.pagination.merchants.totalItems = data.total || 0;
                this.pagination.merchants.totalPages = Math.ceil(this.pagination.merchants.totalItems / this.pagination.merchants.pageSize);
                
                // Update pagination component
                if (this.components.pagination.merchants) {
                    this.components.pagination.merchants.setTotal(this.pagination.merchants.totalItems);
                }
                
                this.renderMerchants();
                this.updateTabBadge('merchants', this.pagination.merchants.totalItems);
                
            } catch (error) {
                console.error('Failed to load merchants:', error);
                this.data.merchants = this.getMockMerchants(); // Fallback to mock data
                this.renderMerchants();
                this.showToast('加载商户数据失败，显示模拟数据', 'warning');
            } finally {
                this.setLoadingState('merchants', false);
            }
        }

        async loadAccounts() {
            try {
                // Show loading state
                this.setLoadingState('accounts', true);
                
                const params = new URLSearchParams({
                    page: this.pagination.accounts.currentPage,
                    size: this.pagination.accounts.pageSize,
                    type: this.filters.accounts.type,
                    status: this.filters.accounts.status
                });
                
                const response = await fetch(`/api/v1/accounts?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to load accounts');
                }
                
                const data = await response.json();
                this.data.accounts = data.accounts || [];
                this.pagination.accounts.totalItems = data.total || 0;
                this.pagination.accounts.totalPages = Math.ceil(this.pagination.accounts.totalItems / this.pagination.accounts.pageSize);
                
                // Update pagination component
                if (this.components.pagination.accounts) {
                    this.components.pagination.accounts.setTotal(this.pagination.accounts.totalItems);
                }
                
                this.renderAccounts();
                this.updateTabBadge('accounts', this.pagination.accounts.totalItems);
                
            } catch (error) {
                console.error('Failed to load accounts:', error);
                this.data.accounts = this.getMockAccounts(); // Fallback to mock data
                this.renderAccounts();
                this.showToast('加载账户数据失败，显示模拟数据', 'warning');
            } finally {
                this.setLoadingState('accounts', false);
            }
        }

        async loadRotationRules() {
            try {
                // 检查轮询规则管理组件是否可用
                if (typeof RotationRulesManagement === 'undefined') {
                    console.warn('RotationRulesManagement 组件未加载，显示占位内容');
                    this.showRotationRulesPlaceholder();
                    return;
                }

                // 初始化轮询规则管理组件
                if (!this.rotationRulesManagement) {
                    console.log('初始化轮询规则管理组件...');
                    this.rotationRulesManagement = new RotationRulesManagement('rotationRulesContainer');
                }
            } catch (error) {
                console.error('加载轮询规则失败:', error);
                this.showRotationRulesError(error.message);
            }
        }

        showRotationRulesPlaceholder() {
            const container = document.getElementById('rotationRulesContainer');
            if (container) {
                container.innerHTML = `
                    <div class="rotation-rules-placeholder" style="padding: 2rem; text-align: center;">
                        <div class="alert alert-info">
                            <h5><i class="fas fa-info-circle"></i> 轮询规则功能</h5>
                            <p>轮询规则管理组件正在加载中...</p>
                            <button type="button" class="btn btn-primary" onclick="window.systemManagement.loadRotationRules()">
                                <i class="fas fa-redo"></i> 重试加载
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        showRotationRulesError(message) {
            const container = document.getElementById('rotationRulesContainer');
            if (container) {
                container.innerHTML = `
                    <div class="rotation-rules-error" style="padding: 2rem; text-align: center;">
                        <div class="alert alert-danger">
                            <h5><i class="fas fa-exclamation-triangle"></i> 加载失败</h5>
                            <p>轮询规则管理组件加载失败: ${message}</p>
                            <button type="button" class="btn btn-outline-primary" onclick="window.systemManagement.loadRotationRules()">
                                <i class="fas fa-redo"></i> 重试
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        async loadLimits() {
            try {
                const response = await fetch('/api/v1/limits');
                if (!response.ok) {
                    throw new Error('Failed to load limits');
                }
                
                const data = await response.json();
                this.data.limits = data.limits || [];
                
                this.renderLimits();
                this.updateTabBadge('limits', this.data.limits.filter(l => l.isNearLimit).length);
                
            } catch (error) {
                console.error('Failed to load limits:', error);
                this.data.limits = this.getMockLimits(); // Fallback to mock data
                this.renderLimits();
            }
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        setLoadingState(section, loading) {
            const paginationComponent = this.components.pagination[section];
            if (paginationComponent) {
                paginationComponent.setLoading(loading);
            }
            
            // Also set loading state on the content container
            const container = document.getElementById(`${section}Grid`) || document.getElementById(`${section}Table`);
            if (container) {
                container.classList.toggle('loading', loading);
            }
        }

        resetPagination(section) {
            if (this.pagination[section]) {
                this.pagination[section].currentPage = 1;
                if (this.components.pagination[section]) {
                    this.components.pagination[section].setPage(1);
                }
            }
        }

        // ==========================================================================
        // Rendering Methods
        // ==========================================================================

        renderMerchants() {
            const viewMode = this.viewModes.merchants;
            
            if (viewMode === 'cards') {
                this.renderMerchantsCards();
            } else {
                this.renderMerchantsTable();
            }
        }

        renderMerchantsCards() {
            const container = document.getElementById('merchantsGrid');
            if (!container) return;
            
            if (this.data.merchants.length === 0) {
                container.innerHTML = this.getEmptyState('merchants');
                return;
            }
            
            const cardsHTML = this.data.merchants.map(merchant => `
                <div class="merchant-card" data-id="${merchant.id}">
                    <div class="card-header">
                        <h3 class="card-title">${merchant.name}</h3>
                        <span class="card-status ${merchant.status}">${this.getStatusText(merchant.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <div class="info-row">
                                <span class="info-label">商户代码:</span>
                                <span class="info-value">${merchant.code}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">联系人:</span>
                                <span class="info-value">${merchant.contactPerson || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">联系方式:</span>
                                <span class="info-value">${merchant.contactPhone || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">单日限额:</span>
                                <span class="info-value">¥${this.formatAmount(merchant.dailyLimit)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline" onclick="window.systemManagement.editMerchant('${merchant.id}')">
                            编辑
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="window.systemManagement.viewMerchantDetails('${merchant.id}')">
                            详情
                        </button>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = cardsHTML;
        }

        renderAccounts() {
            const viewMode = this.viewModes.accounts;
            
            if (viewMode === 'cards') {
                this.renderAccountsCards();
            } else {
                this.renderAccountsTable();
            }
        }

        renderAccountsCards() {
            const container = document.getElementById('accountsGrid');
            if (!container) return;
            
            if (this.data.accounts.length === 0) {
                container.innerHTML = this.getEmptyState('accounts');
                return;
            }
            
            const cardsHTML = this.data.accounts.map(account => `
                <div class="account-card" data-id="${account.id}">
                    <div class="card-header">
                        <h3 class="card-title">${account.accountName}</h3>
                        <span class="card-status ${account.status}">${this.getStatusText(account.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <div class="info-row">
                                <span class="info-label">账户号码:</span>
                                <span class="info-value">${this.maskAccountNumber(account.accountNumber)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">账户类型:</span>
                                <span class="info-value">${this.getAccountTypeText(account.accountType)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">持有人:</span>
                                <span class="info-value">${account.accountHolder}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">今日已用:</span>
                                <span class="info-value">¥${this.formatAmount(account.todayUsed || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline" onclick="systemManagement.editAccount('${account.id}')">
                            编辑
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="systemManagement.viewAccountDetails('${account.id}')">
                            详情
                        </button>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = cardsHTML;
        }

        renderRotationRules() {
            const container = document.getElementById('rotationRulesGrid');
            if (!container) return;
            
            if (this.data.rotationRules.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔄</div>
                        <div class="empty-state-title">暂无轮询规则</div>
                        <div class="empty-state-description">点击"添加规则"按钮创建第一个轮询规则</div>
                    </div>
                `;
                return;
            }
            
            const rulesHTML = this.data.rotationRules.map(rule => `
                <div class="rotation-rule-card" data-id="${rule.id}">
                    <div class="card-header">
                        <h3 class="card-title">${rule.name}</h3>
                        <span class="card-status ${rule.status}">${this.getStatusText(rule.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <div class="info-row">
                                <span class="info-label">商户:</span>
                                <span class="info-value">${rule.merchantName || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">规则类型:</span>
                                <span class="info-value">${rule.type || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">权重:</span>
                                <span class="info-value">${rule.weight || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-outline" onclick="systemManagement.editRotationRule('${rule.id}')">
                            编辑
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="systemManagement.viewRotationRuleDetails('${rule.id}')">
                            详情
                        </button>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = rulesHTML;
        }

        renderLimits() {
            const container = document.getElementById('limitsTableBody');
            if (!container) return;
            
            if (this.data.limits.length === 0) {
                const tableContainer = document.getElementById('limitsTableContainer');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <div class="empty-state-title">暂无限额数据</div>
                            <div class="empty-state-description">系统将自动收集限额使用情况</div>
                        </div>
                    `;
                }
                return;
            }
            
            const limitsHTML = this.data.limits.map(limit => `
                <tr>
                    <td>${limit.type}</td>
                    <td>${limit.name}</td>
                    <td>¥${this.formatAmount(limit.dailyLimit)}</td>
                    <td>¥${this.formatAmount(limit.singleLimit)}</td>
                    <td>¥${this.formatAmount(limit.todayUsed)}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${limit.usagePercent}%"></div>
                        </div>
                        ${limit.usagePercent}%
                    </td>
                    <td>
                        <span class="card-status ${limit.isNearLimit ? 'warning' : 'active'}">
                            ${limit.isNearLimit ? '接近限额' : '正常'}
                        </span>
                    </td>
                    <td>${limit.lastReset || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="systemManagement.resetLimit('${limit.id}')">
                            重置
                        </button>
                    </td>
                </tr>
            `).join('');
            
            container.innerHTML = limitsHTML;
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        setLoading(loading) {
            this.isLoading = loading;
            
            if (this.components.loading) {
                if (loading) {
                    this.components.loading.show();
                } else {
                    this.components.loading.hide();
                }
            }
        }

        showToast(message, type = 'info') {
            if (this.components.toast) {
                this.components.toast.show(message, type);
            } else {
                // Fallback to console
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        }

        updateTabBadges() {
            this.updateTabBadge('merchants', this.data.merchants.length);
            this.updateTabBadge('accounts', this.data.accounts.length);
            this.updateTabBadge('rotation', this.data.rotationRules.length);
            this.updateTabBadge('limits', this.data.limits.filter(l => l.isNearLimit).length);
        }

        updateTabBadge(tabName, count) {
            const badge = document.getElementById(`${tabName}Count`) || 
                         document.querySelector(`[data-tab="${tabName}"] .tab-badge`);
            if (badge) {
                badge.textContent = count;
                
                // Add warning class for limits
                if (tabName === 'limits' && count > 0) {
                    badge.classList.add('warning');
                } else {
                    badge.classList.remove('warning');
                }
            }
        }

        formatAmount(amount) {
            if (!amount) return '0.00';
            return parseFloat(amount).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        getStatusText(status) {
            const statusMap = {
                'active': '活跃',
                'inactive': '停用',
                'maintenance': '维护中'
            };
            return statusMap[status] || status;
        }

        getAccountTypeText(type) {
            const typeMap = {
                'alipay': '支付宝',
                'wechat': '微信',
                'bank': '银行卡',
                'other': '其他'
            };
            return typeMap[type] || type;
        }

        maskAccountNumber(number) {
            if (!number) return '';
            if (number.length <= 8) return number;
            return number.substring(0, 4) + '****' + number.substring(number.length - 4);
        }

        getEmptyState(type) {
            const emptyStates = {
                merchants: {
                    icon: '🏢',
                    title: '暂无商户',
                    description: '点击"添加商户"按钮创建第一个商户'
                },
                accounts: {
                    icon: '💳',
                    title: '暂无账户',
                    description: '点击"添加账户"按钮创建第一个收款账户'
                }
            };
            
            const state = emptyStates[type];
            if (!state) return '<div class="empty-state">暂无数据</div>';
            
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">${state.icon}</div>
                    <div class="empty-state-title">${state.title}</div>
                    <div class="empty-state-description">${state.description}</div>
                </div>
            `;
        }

        // ==========================================================================
        // Mock Data (for development/fallback)
        // ==========================================================================

        getMockMerchants() {
            return [
                {
                    id: '1',
                    name: '示例商户A',
                    code: 'MERCHANT_A',
                    contactPerson: '张三',
                    contactPhone: '13800138000',
                    status: 'active',
                    dailyLimit: 100000,
                    singleLimit: 5000
                },
                {
                    id: '2',
                    name: '示例商户B',
                    code: 'MERCHANT_B',
                    contactPerson: '李四',
                    contactPhone: '13800138001',
                    status: 'active',
                    dailyLimit: 50000,
                    singleLimit: 2000
                }
            ];
        }

        getMockAccounts() {
            return [
                {
                    id: '1',
                    accountName: '支付宝收款账户',
                    accountNumber: '13800138000',
                    accountType: 'alipay',
                    accountHolder: '张三',
                    status: 'active',
                    dailyLimit: 50000,
                    todayUsed: 12000
                },
                {
                    id: '2',
                    accountName: '微信收款账户',
                    accountNumber: 'wx_13800138001',
                    accountType: 'wechat',
                    accountHolder: '李四',
                    status: 'active',
                    dailyLimit: 30000,
                    todayUsed: 8000
                }
            ];
        }

        getMockRotationRules() {
            return [];
        }

        getMockLimits() {
            return [];
        }

        // ==========================================================================
        // Action Methods (to be implemented)
        // ==========================================================================

        async refreshCurrentTabData() {
            await this.loadTabData(this.currentTab);
            this.showToast('数据已刷新', 'success');
        }

        openSystemSettings() {
            this.showToast('系统设置功能开发中', 'info');
        }

        switchView(tabId, view) {
            this.viewModes[tabId] = view;
            
            // Update view buttons
            const parentSection = document.getElementById(`${tabId}Tab`);
            if (parentSection) {
                parentSection.querySelectorAll('.view-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.view === view) {
                        btn.classList.add('active');
                    }
                });
                
                // Re-render with new view
                if (tabId === 'merchants') {
                    this.renderMerchants();
                } else if (tabId === 'accounts') {
                    this.renderAccounts();
                }
            }
        }

        async openMerchantForm(merchantId = null) {
            try {
                // 确保先关闭任何现有的模态框
                if (typeof SimpleMerchantModal !== 'undefined' && SimpleMerchantModal.closeAll) {
                    SimpleMerchantModal.closeAll();
                }
                
                // 使用SimpleMerchantModal
                if (typeof SimpleMerchantModal === 'undefined') {
                    throw new Error('SimpleMerchantModal未加载');
                }
                
                // 如果是编辑模式，先加载商户数据
                let merchantData = null;
                if (merchantId) {
                    merchantData = await this.loadMerchantData(merchantId);
                }
                
                // 创建并显示模态框
                const merchantModal = new SimpleMerchantModal();
                merchantModal.show({
                    mode: merchantId ? 'edit' : 'create',
                    merchantData: merchantData
                });
                
            } catch (error) {
                console.error('Failed to open merchant form:', error);
                this.showToast('无法打开商户表单', 'error');
            }
        }

        async loadMerchantData(merchantId) {
            try {
                const response = await fetch(`/api/v1/merchants/${merchantId}`);
                if (!response.ok) {
                    throw new Error('Failed to load merchant data');
                }
                return await response.json();
            } catch (error) {
                console.error('Failed to load merchant data:', error);
                // 返回模拟数据作为后备
                const mockMerchant = this.data.merchants.find(m => m.id === merchantId);
                if (mockMerchant) {
                    return mockMerchant;
                }
                throw error;
            }
        }

        // 刷新商户列表（在模态框保存后调用）
        async refreshMerchantsList() {
            try {
                await this.loadMerchants();
                this.updateTabBadge('merchants', this.data.merchants.length);
            } catch (error) {
                console.error('Failed to refresh merchants list:', error);
                this.showToast('刷新商户列表失败', 'error');
            }
        }

        // 处理商户编辑
        async editMerchant(merchantId) {
            await this.openMerchantForm(merchantId);
        }

        // 处理商户详情查看
        viewMerchantDetails(merchantId) {
            const merchant = this.data.merchants.find(m => m.id === merchantId);
            if (merchant) {
                // 可以在这里实现详情查看功能
                this.showToast(`查看商户详情: ${merchant.name}`, 'info');
            } else {
                this.showToast('商户不存在', 'error');
            }
        }

        /**
         * Open account form modal
         * @param {string} accountId - Account ID for editing (null for create)
         */
        async openAccountForm(accountId = null) {
            console.log('openAccountForm called with accountId:', accountId);
            
            try {
                // 确保先关闭任何现有的模态框
                if (typeof SimpleAccountModal !== 'undefined' && SimpleAccountModal.closeAll) {
                    SimpleAccountModal.closeAll();
                }
                
                // 使用SimpleAccountModal
                if (typeof SimpleAccountModal === 'undefined') {
                    throw new Error('SimpleAccountModal未加载');
                }
                
                // 如果是编辑模式，先加载账户数据
                let accountData = null;
                if (accountId) {
                    accountData = this.data.accounts.find(a => a.id === accountId);
                    if (!accountData) {
                        console.error('Account not found:', accountId);
                        this.showToast('账户不存在', 'error');
                        return;
                    }
                }
                
                // 创建并显示模态框
                const accountModal = new SimpleAccountModal();
                accountModal.show({
                    mode: accountId ? 'edit' : 'create',
                    accountData: accountData
                });
                
            } catch (error) {
                console.error('Failed to open account form:', error);
                this.showToast('无法打开账户表单', 'error');
            }
        }
        
        /**
         * Handle account form success
         * @param {Object} result - Form result
         * @param {string} mode - Form mode (create/edit)
         */
        handleAccountFormSuccess(result, mode) {
            const action = mode === 'edit' ? '更新' : '创建';
            this.showToast(`账户${action}成功`, 'success');
            
            // Refresh accounts data
            this.loadAccounts();
        }
        
        /**
         * Handle account form error
         * @param {Error} error - Error object
         * @param {string} mode - Form mode (create/edit)
         */
        handleAccountFormError(error, mode) {
            const action = mode === 'edit' ? '更新' : '创建';
            console.error(`Account ${mode} error:`, error);
            this.showToast(`账户${action}失败: ${error.message}`, 'error');
        }
        
        /**
         * Edit account
         * @param {string} accountId - Account ID
         */
        editAccount(accountId) {
            this.openAccountForm(accountId);
        }
        
        /**
         * View account details
         * @param {string} accountId - Account ID
         */
        viewAccountDetails(accountId) {
            const account = this.data.accounts.find(a => a.id === accountId);
            if (account) {
                // For now, just show a toast. Could be expanded to show a details modal
                this.showToast(`查看账户详情: ${account.accountName}`, 'info');
            } else {
                this.showToast('账户不存在', 'error');
            }
        }
        
        /**
         * Delete account
         * @param {string} accountId - Account ID
         */
        async deleteAccount(accountId) {
            const account = this.data.accounts.find(a => a.id === accountId);
            if (!account) {
                this.showToast('账户不存在', 'error');
                return;
            }
            
            try {
                // Show confirmation dialog
                const confirmed = await window.Modal.confirm(
                    `确定要删除账户 "${account.accountName}" 吗？此操作不可撤销。`,
                    {
                        title: '确认删除',
                        size: 'sm'
                    }
                );
                
                if (!confirmed) return;
                
                // Show loading
                this.setLoading(true);
                
                // Delete account via API
                const response = await fetch(`/api/v1/accounts/${accountId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                this.showToast('账户删除成功', 'success');
                
                // Refresh accounts data
                await this.loadAccounts();
                
            } catch (error) {
                console.error('Delete account error:', error);
                this.showToast(`删除账户失败: ${error.message}`, 'error');
            } finally {
                this.setLoading(false);
            }
        }

        openRotationRuleForm(ruleId = null) {
            this.showToast('轮询规则表单功能开发中', 'info');
        }

        toggleSelectAll(type, checked) {
            if (checked) {
                this.data[type].forEach(item => {
                    this.selectedItems[type].add(item.id);
                });
            } else {
                this.selectedItems[type].clear();
            }
            
            this.updateBulkActions(type);
        }

        updateBulkActions(type) {
            const bulkActions = document.getElementById(`${type}BulkActions`);
            if (bulkActions) {
                const hasSelected = this.selectedItems[type].size > 0;
                bulkActions.style.display = hasSelected ? 'flex' : 'none';
            }
        }

        /**
         * Edit rotation rule
         * @param {string} ruleId - Rule ID
         */
        editRotationRule(ruleId) {
            this.showToast('轮询规则编辑功能开发中', 'info');
        }
        
        /**
         * View rotation rule details
         * @param {string} ruleId - Rule ID
         */
        viewRotationRuleDetails(ruleId) {
            this.showToast('轮询规则详情功能开发中', 'info');
        }
        
        /**
         * Reset limit
         * @param {string} limitId - Limit ID
         */
        async resetLimit(limitId) {
            try {
                const confirmed = await window.Modal.confirm(
                    '确定要重置此限额吗？',
                    {
                        title: '确认重置',
                        size: 'sm'
                    }
                );
                
                if (!confirmed) return;
                
                this.showToast('限额重置成功', 'success');
                await this.loadLimits();
                
            } catch (error) {
                console.error('Reset limit error:', error);
                this.showToast('限额重置失败', 'error');
            }
        }
        
        /**
         * Open rotation rule form
         */
        openRotationRuleForm() {
            this.showToast('轮询规则创建功能开发中', 'info');
        }
        
        /**
         * Mask account number for display
         * @param {string} accountNumber - Account number
         * @returns {string} Masked account number
         */
        maskAccountNumber(accountNumber) {
            if (!accountNumber) return '';
            
            if (accountNumber.length <= 4) {
                return accountNumber;
            }
            
            const start = accountNumber.substring(0, 3);
            const end = accountNumber.substring(accountNumber.length - 4);
            const middle = '*'.repeat(Math.min(4, accountNumber.length - 7));
            
            return `${start}${middle}${end}`;
        }
    }

    return SystemManagement;
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.SystemManagement !== 'undefined') {
        window.systemManagement = new window.SystemManagement();
        window.systemManagement.init();
    }
});