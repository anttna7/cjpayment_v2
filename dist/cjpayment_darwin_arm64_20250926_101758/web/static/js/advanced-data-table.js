/**
 * Advanced Data Table - 高级数据表管理器
 * 提供多视图模式、高级筛选、排序和分页功能
 */

class AdvancedDataTable {
    constructor(options = {}) {
        this.options = {
            containerId: 'advancedDataTableContainer',
            apiEndpoint: '/api/advanced-data',
            pageSize: 50,
            enableSearch: true,
            enableFilters: true,
            enableSorting: true,
            enablePagination: true,
            defaultView: 'table', // table, cards, timeline
            autoRefresh: false,
            refreshInterval: 30000,
            ...options
        };

        this.state = {
            data: [],
            filteredData: [],
            currentPage: 1,
            totalPages: 0,
            totalRecords: 0,
            sortBy: 'created_at',
            sortOrder: 'desc',
            filters: {},
            customRules: [],
            searchQuery: '',
            currentView: this.options.defaultView,
            loading: false,
            activeTab: 'basic',
            filterHistory: [],
            presets: {},
            itemCounts: {},
            columnSettings: {
                visible: {
                    orderId: true,
                    merchantName: true,
                    amount: true,
                    transactionStatus: true,
                    paymentType: true,
                    auditStatus: true,
                    createdAt: true,
                    actions: true
                },
                order: ['orderId', 'merchantName', 'amount', 'transactionStatus', 'paymentType', 'auditStatus', 'createdAt', 'actions']
            }
        };

        this.elements = {};
        this.init();
    }

    /**
     * 初始化高级数据表
     */
    init() {
        console.log('初始化高级数据表...');
        this.initializeElements();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupAutoRefresh();
        console.log('高级数据表初始化完成');
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        const container = document.getElementById(this.options.containerId);
        if (!container) {
            console.error(`容器元素未找到: ${this.options.containerId}`);
            return;
        }

        this.elements = {
            container,
            searchInput: container.querySelector('.search-input-advanced'),
            quickFilters: container.querySelectorAll('.filter-chip'),
            viewButtons: container.querySelectorAll('.view-btn'),
            advancedFiltersPanel: container.querySelector('.advanced-filters-panel'),
            toggleFiltersBtn: container.querySelector('.toggle-filters-btn'),
            applyFiltersBtn: container.querySelector('.apply-filters-btn'),
            resetFiltersBtn: container.querySelector('.reset-filters-btn'),
            tableView: container.querySelector('.table-view-advanced'),
            cardsView: container.querySelector('.cards-view-advanced'),
            timelineView: container.querySelector('.timeline-view-advanced'),
            dataTable: container.querySelector('.data-table-advanced'),
            tableBody: container.querySelector('.data-table-advanced tbody'),
            paginationInfo: container.querySelector('.pagination-info-advanced'),
            paginationControls: container.querySelector('.pagination-controls-advanced'),
            pageInput: container.querySelector('.page-input-advanced'),
            advancedFiltersToggle: document.getElementById('advancedFiltersToggle'),
            columnSettingsBtn: document.getElementById('columnSettingsBtn')
        };
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 搜索框
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 快速筛选
        this.elements.quickFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                this.handleQuickFilter(filter);
            });
        });

        // 视图切换
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // 高级筛选
        if (this.elements.toggleFiltersBtn) {
            this.elements.toggleFiltersBtn.addEventListener('click', () => {
                this.toggleAdvancedFilters();
            });
        }

        if (this.elements.applyFiltersBtn) {
            this.elements.applyFiltersBtn.addEventListener('click', () => {
                this.applyAdvancedFilters();
            });
        }

        if (this.elements.resetFiltersBtn) {
            this.elements.resetFiltersBtn.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }

        // 表格排序
        if (this.elements.dataTable) {
            this.setupTableSorting();
        }

        // 分页控制
        if (this.elements.paginationControls) {
            this.setupPaginationControls();
        }

        // 页面跳转
        if (this.elements.pageInput) {
            this.elements.pageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.jumpToPage(parseInt(e.target.value));
                }
            });
        }

        // 高级筛选切换按钮 - 由OrderInfoTable统一处理，避免重复绑定
        // Note: advancedFiltersToggle 按钮的事件绑定已在 order-info-table.js 中处理

        // 增强筛选面板事件监听
        this.setupEnhancedFilterEvents();

        // 列设置按钮 - 添加调试日志
        console.log('AdvancedDataTable: 检查列设置按钮:', this.elements.columnSettingsBtn);
        if (this.elements.columnSettingsBtn) {
            console.log('AdvancedDataTable: 绑定列设置按钮点击事件');
            this.elements.columnSettingsBtn.addEventListener('click', (e) => {
                console.log('AdvancedDataTable: 列设置按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.showColumnSettings();
            });
            // 确保按钮可点击
            this.elements.columnSettingsBtn.style.pointerEvents = 'auto';
            this.elements.columnSettingsBtn.style.cursor = 'pointer';
        } else {
            console.error('AdvancedDataTable: 列设置按钮未找到');
        }

        // 高级筛选按钮事件绑定
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const applyAdvancedFilters = document.getElementById('applyAdvancedFilters');
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');  
        const resetAdvancedFilters = document.getElementById('resetAdvancedFilters');
        const closeAdvancedFilters = document.getElementById('closeAdvancedFilters');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyAdvancedFilters();
            });
        }
        
        if (applyAdvancedFilters) {
            applyAdvancedFilters.addEventListener('click', () => {
                this.applyAdvancedFilters();
            });
        }

        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }
        
        if (resetAdvancedFilters) {
            resetAdvancedFilters.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }

        if (closeAdvancedFilters) {
            console.log('AdvancedDataTable: 绑定关闭按钮事件');
            closeAdvancedFilters.addEventListener('click', (e) => {
                console.log('AdvancedDataTable: 关闭按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                this.toggleAdvancedFilters();
            });
            // 确保关闭按钮可点击
            closeAdvancedFilters.style.pointerEvents = 'auto';
            closeAdvancedFilters.style.cursor = 'pointer';
        }
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            this.showLoading();
            
            // 使用模拟数据进行演示
            const data = this.generateSampleData();
            
            this.state.data = data;
            this.state.filteredData = [...data];
            this.updatePaginationState();
            this.renderCurrentView();
            
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请刷新页面重试');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 生成示例数据 - 15列结构
     * 复用财务审核表的数据结构和字段
     */
    generateSampleData() {
        const data = [];
        const merchants = ['阿里巴巴集团控股有限公司', '腾讯科技(深圳)有限公司', '字节跳动有限公司', '美团', '上海寻梦信息技术有限公司', '京东', '百度在线网络技术(北京)有限公司', '网易', '北京小米科技有限责任公司', '华为技术有限公司'];
        const banks = ['中国银行', '工商银行', '建设银行', '农业银行', '招商银行', '交通银行', '浦发银行', '民生银行'];
        const businessTypes = ['对公', '对私'];
        const statuses = ['交易成功', '交易失败'];
        const auditStatuses = ['已到账', '未到账', '未审核'];
        
        const now = new Date();
        
        for (let i = 1; i <= 100; i++) {
            const isSuccess = Math.random() > 0.15; // 85% 成功率
            const hasPaymentTime = isSuccess && Math.random() > 0.3;
            const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
            const merchant = merchants[Math.floor(Math.random() * merchants.length)];
            const payerBank = banks[Math.floor(Math.random() * banks.length)];
            const receiverBank = banks[Math.floor(Math.random() * banks.length)];
            const amount = (Math.random() * 999999 + 100).toFixed(2);
            
            const createdTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const paymentTime = hasPaymentTime ? new Date(createdTime.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
            
            // 审核状态逻辑：确保有足够的未审核数据用于测试
            let auditStatus;
            if (isSuccess) {
                // 成功的订单：60%已到账，20%未到账，20%未审核
                const auditRand = Math.random();
                if (auditRand > 0.4) {
                    auditStatus = '已到账';
                } else if (auditRand > 0.2) {
                    auditStatus = '未到账';
                } else {
                    auditStatus = '未审核';
                }
            } else {
                // 失败的订单：70%未审核，30%未到账
                auditStatus = Math.random() > 0.3 ? '未审核' : '未到账';
            }
            
            // 生成完整账号
            const fullPayerAccountNumber = `${payerBank.slice(0,2)}${String(Math.floor(Math.random() * 100000000000000)).padStart(14, '0')}`;
            const fullReceiverAccountNumber = `${receiverBank.slice(0,2)}${String(Math.floor(Math.random() * 100000000000000)).padStart(14, '0')}`;
            
            // 生成脱敏账号
            const maskedPayerAccountNumber = `${fullPayerAccountNumber.slice(0,4)}****${fullPayerAccountNumber.slice(-4)}`;
            const maskedReceiverAccountNumber = `${fullReceiverAccountNumber.slice(0,4)}****${fullReceiverAccountNumber.slice(-4)}`;
            
            data.push({
                serial: i,
                order_number: `CJP${String(20250101 + i).padStart(8, '0')}`,
                payment_voucher: `PV${String(Date.now() + i).slice(-10)}`, // 付款凭证
                amount: amount,
                payer_account_number: maskedPayerAccountNumber, // 付款账号
                payer_account_name: `${merchant}账户${i}`, // 付款账户名称
                payer_bank: payerBank, // 付款账户机构
                business_type: businessType, // 付款类型（对公/对私）
                receiver_account_number: maskedReceiverAccountNumber, // 收款账号
                receiver_account_name: `收款方账户${i}`, // 收款账户名称
                receiver_bank: receiverBank, // 收款账户机构
                status: isSuccess ? '交易成功' : '交易失败', // 订单状态（交易成功、交易失败）
                created_time: this.formatDateTime(createdTime), // 创建时间
                payment_time: paymentTime ? this.formatDateTime(paymentTime) : '-', // 付款时间
                audit_status: auditStatus, // 审核状态（已到账、未到账、未审核）
                
                // 保留原有字段以确保兼容性
                id: `CJP${String(20250101 + i).padStart(8, '0')}`,
                orderNumber: `CJP${String(20250101 + i).padStart(8, '0')}`,
                merchant: merchant,
                createdAt: createdTime,
                updatedAt: paymentTime || createdTime,
                
                // 内部数据字段
                payer_account_number_full: fullPayerAccountNumber,
                receiver_account_number_full: fullReceiverAccountNumber
            });
        }
        
        return data.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
    }
    
    /**
     * 格式化日期时间
     */
    formatDateTime(date) {
        if (!date) return '-';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    /**
     * 截断文本
     */
    truncateText(text, maxLength = 20) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    /**
     * 获取审核状态徽章样式类
     */
    getAuditBadgeClass(status) {
        switch (status) {
            case '已到账': return 'arrived';
            case '未到账': return 'not-arrived';
            case '未审核': return 'pending';
            default: return 'pending';
        }
    }
    
    /**
     * 获取审核状态图标
     */
    getAuditStatusIcon(status) {
        switch (status) {
            case '已到账': return '✅';
            case '未到账': return '❌';
            case '未审核': return '⏳';
            default: return '⏳';
        }
    }
    
    /**
     * 设置内容交互功能 - 复用财务审核表的交互机制
     */
    setupContentInteraction() {
        const tableBody = document.getElementById('advancedDataTableBody');
        if (!tableBody) return;
        
        // 可复制单元格 - 双击复制
        const copyableCells = tableBody.querySelectorAll('.copyable-cell');
        copyableCells.forEach(cell => {
            cell.addEventListener('dblclick', () => {
                const content = cell.getAttribute('data-full-content') || cell.textContent;
                this.copyToClipboard(content);
                this.showCopySuccess(cell);
            });
            
            // 鼠标悬停提示
            cell.style.cursor = 'copy';
            cell.title = cell.title || '双击复制';
        });
        
        // 可展开单元格 - 双击展开/收缩
        const expandableCells = tableBody.querySelectorAll('.expandable-cell');
        expandableCells.forEach(cell => {
            cell.addEventListener('dblclick', () => {
                this.toggleCellExpansion(cell);
            });
            
            cell.style.cursor = 'pointer';
            cell.title = cell.title || '双击查看完整内容';
        });
        
        console.log(`AdvancedDataTable: 已设置 ${copyableCells.length} 个可复制单元格，${expandableCells.length} 个可展开单元格的交互功能`);
    }
    
    /**
     * 复制到剪贴板
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('复制成功:', text);
            }).catch(err => {
                console.error('复制失败:', err);
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }
    
    /**
     * 备用复制方法
     */
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('备用复制成功:', text);
        } catch (err) {
            console.error('备用复制失败:', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    /**
     * 显示复制成功提示
     */
    showCopySuccess(element) {
        const originalBg = element.style.backgroundColor;
        element.style.backgroundColor = '#dcfce7';
        element.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBg;
        }, 1000);
    }
    
    /**
     * 切换单元格展开状态
     */
    toggleCellExpansion(cell) {
        const isExpanded = cell.classList.contains('expanded');
        const fullContent = cell.getAttribute('data-full-content');
        
        if (!fullContent) return;
        
        if (isExpanded) {
            // 收缩
            cell.textContent = this.truncateText(fullContent, 12);
            cell.classList.remove('expanded');
        } else {
            // 展开
            cell.textContent = fullContent;
            cell.classList.add('expanded');
        }
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        this.state.searchQuery = query.toLowerCase();
        this.applyFiltersAndSearch();
    }

    /**
     * 处理快速筛选
     */
    handleQuickFilter(filterElement) {
        const isActive = filterElement.classList.contains('active');
        const filterType = filterElement.dataset.filter;
        const filterValue = filterElement.dataset.value;

        // 清除其他同类筛选
        this.elements.quickFilters.forEach(f => {
            if (f.dataset.filter === filterType && f !== filterElement) {
                f.classList.remove('active');
            }
        });

        // 切换当前筛选状态
        if (isActive) {
            filterElement.classList.remove('active');
            delete this.state.filters[filterType];
        } else {
            filterElement.classList.add('active');
            this.state.filters[filterType] = filterValue;
        }

        this.applyFiltersAndSearch();
    }

    /**
     * 应用筛选和搜索
     */
    applyFiltersAndSearch() {
        let filtered = [...this.state.data];

        // 应用搜索
        if (this.state.searchQuery) {
            filtered = filtered.filter(item => 
                Object.values(item).some(value => 
                    String(value).toLowerCase().includes(this.state.searchQuery)
                )
            );
        }

        // 应用筛选
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (value) {
                filtered = filtered.filter(item => {
                    switch (key) {
                        case 'status':
                            return item.status === value;
                        case 'paymentMethod':
                            return item.paymentMethod === value;
                        case 'merchant':
                            return item.merchant === value;
                        case 'amount':
                            return this.filterByAmount(item.amount, value);
                        case 'date':
                            return this.filterByDate(item.createdAt, value);
                        default:
                            return true;
                    }
                });
            }
        });

        this.state.filteredData = filtered;
        this.state.currentPage = 1;
        this.updatePaginationState();
        this.renderCurrentView();
    }

    /**
     * 金额筛选
     */
    filterByAmount(amount, range) {
        const numAmount = parseFloat(amount);
        switch (range) {
            case 'small': return numAmount < 1000;
            case 'medium': return numAmount >= 1000 && numAmount < 10000;
            case 'large': return numAmount >= 10000;
            default: return true;
        }
    }

    /**
     * 日期筛选
     */
    filterByDate(date, range) {
        const now = new Date();
        const itemDate = new Date(date);
        const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);

        switch (range) {
            case 'today': return diffDays < 1;
            case 'week': return diffDays < 7;
            case 'month': return diffDays < 30;
            default: return true;
        }
    }

    /**
     * 切换视图模式
     */
    switchView(viewType) {
        this.state.currentView = viewType;

        // 更新按钮状态
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewType);
        });

        this.renderCurrentView();
    }

    /**
     * 渲染当前视图
     */
    renderCurrentView() {
        // 隐藏所有视图
        if (this.elements.tableView) this.elements.tableView.style.display = 'none';
        if (this.elements.cardsView) this.elements.cardsView.classList.remove('active');
        if (this.elements.timelineView) this.elements.timelineView.classList.remove('active');

        // 显示当前视图
        switch (this.state.currentView) {
            case 'table':
                this.renderTableView();
                break;
            case 'cards':
                this.renderCardsView();
                break;
            case 'timeline':
                this.renderTimelineView();
                break;
        }

        this.updatePaginationInfo();
    }

    /**
     * 渲染表格视图
     */
    renderTableView() {
        const tableBody = document.getElementById('advancedDataTableBody');
        if (!tableBody) {
            console.error('AdvancedDataTable: 未找到表格主体元素');
            return;
        }

        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageData = this.state.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="15" class="table-empty">
                        <div class="table-empty-icon">📊</div>
                        <div class="table-empty-message">暂无数据</div>
                        <div class="table-empty-help">请尝试调整筛选条件</div>
                    </td>
                </tr>
            `;
            return;
        }

        const html = pageData.map(item => `
            <tr class="audit-table-row">
                <!-- 序号 -->
                <td class="col-serial-cell">
                    <div class="serial-number">${item.serial}</div>
                </td>
                
                <!-- 订单号 -->
                <td data-column="order_number">
                    <span class="order-number-cell copyable-cell" data-full-content="${item.order_number}" title="双击复制完整订单号">${item.order_number}</span>
                </td>
                
                <!-- 付款凭证 -->
                <td data-column="payment_voucher">
                    <span class="payment-voucher-cell copyable-cell" data-full-content="${item.payment_voucher}" title="双击复制付款凭证号">${item.payment_voucher}</span>
                </td>
                
                <!-- 付款金额 -->
                <td data-column="amount">
                    <span class="amount-cell ${parseFloat(item.amount) > 10000 ? 'amount-large' : ''}">¥${parseFloat(item.amount).toLocaleString()}</span>
                </td>
                
                <!-- 付款账号 -->
                <td data-column="payer_account">
                    <span class="account-number-cell copyable-cell privacy-protected" data-full-content="${item.payer_account_number}" data-masked-content="${item.payer_account_number}" title="双击复制完整付款账号">${item.payer_account_number}</span>
                </td>
                
                <!-- 付款账户名称 -->
                <td data-column="payer_name">
                    <span class="account-name-cell copyable-cell expandable-cell" data-full-content="${item.payer_account_name}" data-display-content="${this.truncateText(item.payer_account_name, 8)}" title="悬停查看完整内容，双击复制">${this.truncateText(item.payer_account_name, 8)}</span>
                </td>
                
                <!-- 付款账户机构 -->
                <td data-column="payer_bank">
                    <span class="bank-name-cell">${item.payer_bank || '未知银行'}</span>
                </td>
                
                <!-- 付款类型（对公/对私） -->
                <td data-column="payment_type">
                    <span class="business-type-badge ${item.business_type === '对公' ? 'business-type-public' : 'business-type-private'}">${item.business_type}</span>
                </td>
                
                <!-- 收款账号 -->
                <td data-column="receiver_account">
                    <span class="account-number-cell copyable-cell privacy-protected" data-full-content="${item.receiver_account_number}" data-masked-content="${item.receiver_account_number}" title="双击复制完整收款账号">${item.receiver_account_number}</span>
                </td>
                
                <!-- 收款账户名称 -->
                <td data-column="receiver_name">
                    <span class="account-name-cell copyable-cell expandable-cell" data-full-content="${item.receiver_account_name}" data-display-content="${this.truncateText(item.receiver_account_name, 8)}" title="悬停查看完整内容，双击复制">${this.truncateText(item.receiver_account_name, 8)}</span>
                </td>
                
                <!-- 收款账户机构 -->
                <td data-column="receiver_bank">
                    <span class="bank-name-cell">${item.receiver_bank || '未知银行'}</span>
                </td>
                
                <!-- 订单状态（交易成功、交易失败） -->
                <td data-column="status" class="status-cell">
                    <span class="status-badge status-${item.status === '交易成功' ? 'success' : 'failed'}">${item.status}</span>
                </td>
                
                <!-- 创建时间 -->
                <td data-column="created_time">
                    <span class="time-cell">${item.created_time}</span>
                </td>
                
                <!-- 付款时间 -->
                <td data-column="payment_time">
                    <span class="time-cell">${item.payment_time}</span>
                </td>
                
                <!-- 审核状态（已到账、未到账、未审核） -->
                <td data-column="audit_status" class="col-actions-cell col-fixed-right">
                    <div class="audit-actions">
                        <span class="audit-status-badge audit-status-${this.getAuditBadgeClass(item.audit_status)}">
                            ${this.getAuditStatusIcon(item.audit_status)} ${item.audit_status}
                        </span>
                    </div>
                </td>
            </tr>
        `).join('');

        tableBody.innerHTML = html;
        
        // 设置内容查看和复制功能 - 复用财务审核表的交互功能
        this.setupContentInteraction();
    }

    /**
     * 渲染卡片视图
     */
    renderCardsView() {
        if (!this.elements.cardsView) return;

        this.elements.cardsView.classList.add('active');
        
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageData = this.state.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            this.elements.cardsView.innerHTML = `
                <div class="table-empty" style="grid-column: 1 / -1;">
                    <div class="table-empty-icon">📊</div>
                    <div class="table-empty-message">暂无数据</div>
                    <div class="table-empty-help">请尝试调整筛选条件</div>
                </div>
            `;
            return;
        }

        const html = pageData.map(item => `
            <div class="data-card-advanced">
                <div class="card-header-advanced">
                    <h4 class="card-title-advanced">${item.orderNumber}</h4>
                    <span class="status-badge-advanced status-${item.status}">
                        ${this.getStatusText(item.status)}
                    </span>
                </div>
                
                <div class="card-body-advanced">
                    <div class="card-field-advanced">
                        <div class="field-label-advanced">交易金额</div>
                        <div class="field-value-advanced amount-display amount-${parseFloat(item.amount) > 0 ? 'positive' : 'negative'}">
                            ¥${parseFloat(item.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    
                    <div class="card-field-advanced">
                        <div class="field-label-advanced">商户</div>
                        <div class="field-value-advanced">${item.merchant}</div>
                    </div>
                    
                    <div class="card-field-advanced">
                        <div class="field-label-advanced">支付方式</div>
                        <div class="field-value-advanced">${item.paymentMethod}</div>
                    </div>
                    
                    <div class="card-field-advanced">
                        <div class="field-label-advanced">付款人</div>
                        <div class="field-value-advanced">${item.payer}</div>
                    </div>
                    
                    <div class="card-field-advanced" style="grid-column: 1 / -1;">
                        <div class="field-label-advanced">创建时间</div>
                        <div class="field-value-advanced">${this.formatDateTime(item.createdAt)}</div>
                    </div>
                    
                    <div class="card-field-advanced" style="grid-column: 1 / -1;">
                        <div class="field-label-advanced">描述</div>
                        <div class="field-value-advanced">${item.description}</div>
                    </div>
                </div>
                
                <div class="card-actions-advanced">
                    <button class="action-btn-small action-btn-primary" 
                            onclick="advancedTable.viewDetails('${item.id}')">
                        查看详情
                    </button>
                    <button class="action-btn-small" 
                            onclick="advancedTable.editRecord('${item.id}')">
                        编辑
                    </button>
                </div>
            </div>
        `).join('');

        this.elements.cardsView.innerHTML = html;
    }

    /**
     * 渲染时间线视图
     */
    renderTimelineView() {
        if (!this.elements.timelineView) return;

        this.elements.timelineView.classList.add('active');
        
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageData = this.state.filteredData.slice(startIndex, endIndex);

        const timelineContainer = this.elements.timelineView.querySelector('.timeline-container-advanced') || 
            this.createElement('div', 'timeline-container-advanced');

        if (pageData.length === 0) {
            timelineContainer.innerHTML = `
                <div class="table-empty">
                    <div class="table-empty-icon">📊</div>
                    <div class="table-empty-message">暂无数据</div>
                    <div class="table-empty-help">请尝试调整筛选条件</div>
                </div>
            `;
            this.elements.timelineView.innerHTML = '';
            this.elements.timelineView.appendChild(timelineContainer);
            return;
        }

        const html = pageData.map(item => `
            <div class="timeline-item-advanced">
                <div class="timeline-dot-advanced"></div>
                <div class="timeline-content-advanced">
                    <h4 class="timeline-title-advanced">
                        ${item.orderNumber} - ${item.merchant}
                    </h4>
                    <div class="timeline-meta-advanced">
                        ${this.formatDateTime(item.createdAt)} • 
                        ${item.paymentMethod} • 
                        <span class="status-badge-advanced status-${item.status}">
                            ${this.getStatusText(item.status)}
                        </span>
                    </div>
                    <div class="timeline-details-advanced">
                        <p><strong>交易金额:</strong> 
                           <span class="amount-display amount-${parseFloat(item.amount) > 0 ? 'positive' : 'negative'}">
                               ¥${parseFloat(item.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                           </span>
                        </p>
                        <p><strong>付款人:</strong> ${item.payer}</p>
                        <p><strong>描述:</strong> ${item.description}</p>
                        <div class="action-btn-group" style="margin-top: 1rem;">
                            <button class="action-btn-small action-btn-primary" 
                                    onclick="advancedTable.viewDetails('${item.id}')">
                                查看详情
                            </button>
                            <button class="action-btn-small" 
                                    onclick="advancedTable.editRecord('${item.id}')">
                                编辑
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        timelineContainer.innerHTML = html;
        
        if (!this.elements.timelineView.contains(timelineContainer)) {
            this.elements.timelineView.appendChild(timelineContainer);
        }
    }

    /**
     * 设置表格排序
     */
    setupTableSorting() {
        const headers = this.elements.dataTable.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.dataset.sort;
                this.handleSort(sortField);
            });
        });
    }

    /**
     * 处理排序
     */
    handleSort(field) {
        if (this.state.sortBy === field) {
            this.state.sortOrder = this.state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortBy = field;
            this.state.sortOrder = 'asc';
        }

        // 更新排序指示器
        const headers = this.elements.dataTable.querySelectorAll('th.sortable');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === field) {
                header.classList.add(`sort-${this.state.sortOrder}`);
            }
        });

        // 执行排序
        this.state.filteredData.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];

            // 特殊处理不同类型的字段
            if (field === 'amount') {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            } else if (field === 'createdAt' || field === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return this.state.sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.state.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderCurrentView();
    }

    /**
     * 设置分页控制
     */
    setupPaginationControls() {
        const prevBtn = this.elements.paginationControls.querySelector('.pagination-prev');
        const nextBtn = this.elements.paginationControls.querySelector('.pagination-next');
        const firstBtn = this.elements.paginationControls.querySelector('.pagination-first');
        const lastBtn = this.elements.paginationControls.querySelector('.pagination-last');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
        if (firstBtn) {
            firstBtn.addEventListener('click', () => this.goToPage(1));
        }
        if (lastBtn) {
            lastBtn.addEventListener('click', () => this.goToPage(this.state.totalPages));
        }
    }

    /**
     * 跳转到指定页面
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages) return;
        this.state.currentPage = page;
        this.renderCurrentView();
        this.updatePaginationInfo();
    }

    /**
     * 跳转页面
     */
    jumpToPage(page) {
        if (page >= 1 && page <= this.state.totalPages) {
            this.goToPage(page);
        }
    }

    /**
     * 更新分页状态
     */
    updatePaginationState() {
        this.state.totalRecords = this.state.filteredData.length;
        this.state.totalPages = Math.ceil(this.state.totalRecords / this.options.pageSize);
        
        if (this.state.currentPage > this.state.totalPages) {
            this.state.currentPage = Math.max(1, this.state.totalPages);
        }
    }

    /**
     * 更新分页信息
     */
    updatePaginationInfo() {
        if (!this.elements.paginationInfo) return;

        const start = (this.state.currentPage - 1) * this.options.pageSize + 1;
        const end = Math.min(start + this.options.pageSize - 1, this.state.totalRecords);
        
        this.elements.paginationInfo.innerHTML = `
            显示 <strong>${start}-${end}</strong> 
            共 <strong>${this.state.totalRecords}</strong> 条记录
        `;

        // 更新分页按钮状态
        const prevBtn = this.elements.paginationControls?.querySelector('.pagination-prev');
        const nextBtn = this.elements.paginationControls?.querySelector('.pagination-next');
        const firstBtn = this.elements.paginationControls?.querySelector('.pagination-first');
        const lastBtn = this.elements.paginationControls?.querySelector('.pagination-last');

        if (prevBtn) prevBtn.disabled = this.state.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
        if (firstBtn) firstBtn.disabled = this.state.currentPage <= 1;
        if (lastBtn) lastBtn.disabled = this.state.currentPage >= this.state.totalPages;

        // 更新页面输入框
        if (this.elements.pageInput) {
            this.elements.pageInput.value = this.state.currentPage;
        }
    }

    /**
     * 切换高级筛选面板
     */
    toggleAdvancedFilters() {
        // 优先使用 OrderInfoTable 的统一实现（新架构）
        if (window.orderInfoTable && window.orderInfoTable.toggleAdvancedFilters) {
            window.orderInfoTable.toggleAdvancedFilters();
            return;
        }
        
        // 备用实现 - 使用新的backdrop/container架构
        console.log('AdvancedDataTable: toggleAdvancedFilters - 使用新架构备用实现');
        
        const backdrop = document.getElementById('advancedFiltersBackdrop');
        const container = document.getElementById('advancedFiltersContainer');
        
        if (!backdrop || !container) {
            console.error('AdvancedDataTable: 筛选面板组件未找到');
            return;
        }
        
        const isVisible = backdrop.classList.contains('show');
        
        if (isVisible) {
            // 隐藏面板
            backdrop.classList.remove('show');
            backdrop.setAttribute('aria-hidden', 'true');
            container.removeAttribute('aria-modal');
            
            setTimeout(() => {
                if (!backdrop.classList.contains('show')) {
                    backdrop.style.display = 'none';
                }
            }, 300);
        } else {
            // 显示面板
            backdrop.style.display = 'flex';
            backdrop.removeAttribute('aria-hidden');
            container.setAttribute('aria-modal', 'true');
            
            setTimeout(() => {
                backdrop.classList.add('show');
                
                // 初始化筛选计数和预览
                this.updateFilterCounts();
                this.updateFilterPreview();
            }, 10);
        }
        
        // 更新按钮状态
        const toggleBtn = document.getElementById('advancedFiltersToggle');
        if (toggleBtn) {
            if (isVisible) {
                toggleBtn.innerHTML = `<span class="btn__icon">🔧</span> 高级筛选`;
                toggleBtn.classList.remove('has-filters');
            } else {
                const filterCount = Object.keys(this.state.filters).length;
                if (filterCount > 0) {
                    toggleBtn.innerHTML = `<span class="btn__icon">🔧</span> 高级筛选 <span class="filter-count">(${filterCount})</span>`;
                    toggleBtn.classList.add('has-filters');
                }
            }
        }
    }

    /**
     * 应用高级筛选
     */
    applyAdvancedFilters() {
        const panel = this.elements.advancedFiltersPanel;
        if (!panel) return;

        // 清空之前的筛选条件
        this.state.filters = {};

        // 处理选择框筛选
        const selectFilters = panel.querySelectorAll('select[id$="Filter"]');
        selectFilters.forEach(select => {
            if (select.value) {
                const filterKey = select.id.replace('Filter', '');
                this.state.filters[filterKey] = select.value;
            }
        });

        // 处理复选框筛选（如交易状态、支付类型）
        const checkboxGroups = panel.querySelectorAll('.checkbox-group');
        checkboxGroups.forEach(group => {
            const groupLabel = group.closest('.filter-group').querySelector('.filter-label').textContent;
            const checkedBoxes = group.querySelectorAll('input[type="checkbox"]:checked');
            
            if (checkedBoxes.length > 0) {
                const values = Array.from(checkedBoxes).map(cb => cb.value);
                let filterKey;
                
                // 根据标签确定筛选键
                switch(groupLabel) {
                    case '交易状态':
                        filterKey = 'transactionStatus';
                        break;
                    case '支付类型':
                        filterKey = 'paymentType';
                        break;
                    case '审核状态':
                        filterKey = 'auditStatus';
                        break;
                    default:
                        filterKey = groupLabel.toLowerCase();
                }
                
                this.state.filters[filterKey] = values;
            }
        });

        // 处理金额范围
        const minAmount = panel.querySelector('#minAmount')?.value;
        const maxAmount = panel.querySelector('#maxAmount')?.value;
        if (minAmount || maxAmount) {
            this.state.filters.amountRange = {
                min: minAmount ? parseFloat(minAmount) : null,
                max: maxAmount ? parseFloat(maxAmount) : null
            };
        }

        // 处理时间范围
        const startDate = panel.querySelector('#filterStartDate')?.value;
        const endDate = panel.querySelector('#filterEndDate')?.value;
        if (startDate || endDate) {
            this.state.filters.dateRange = {
                start: startDate || null,
                end: endDate || null
            };
        }

        // 应用筛选并更新显示
        this.applyFiltersAndColumnSettings();
        this.updateFilterSummary();
        this.toggleAdvancedFilters();
    }

    /**
     * 重置高级筛选
     */
    resetAdvancedFilters() {
        this.state.filters = {};
        this.state.searchQuery = '';
        
        // 重置筛选输入
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        if (this.elements.advancedFiltersPanel) {
            const filterInputs = this.elements.advancedFiltersPanel.querySelectorAll('input, select');
            filterInputs.forEach(input => input.value = '');
        }

        // 重置快速筛选
        this.elements.quickFilters.forEach(filter => {
            filter.classList.remove('active');
        });

        this.applyFiltersAndSearch();
    }

    /**
     * 工具方法
     */
    getStatusText(status) {
        const statusMap = {
            'success': '成功',
            'pending': '待处理',
            'failed': '失败',
            'processing': '处理中'
        };
        return statusMap[status] || status;
    }

    formatDateTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * 操作方法
     */
    viewDetails(id) {
        const item = this.state.data.find(item => item.id === id);
        if (item) {
            console.log('查看详情:', item);
            // 这里可以打开详情模态框或跳转到详情页面
            this.showToast(`查看交易详情: ${item.orderNumber}`, 'info');
        }
    }

    editRecord(id) {
        const item = this.state.data.find(item => item.id === id);
        if (item) {
            console.log('编辑记录:', item);
            // 这里可以打开编辑模态框
            this.showToast(`编辑交易: ${item.orderNumber}`, 'info');
        }
    }

    /**
     * 自动刷新设置
     */
    setupAutoRefresh() {
        if (this.options.autoRefresh && this.options.refreshInterval > 0) {
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.refreshData();
                }
            }, this.options.refreshInterval);
        }
    }

    /**
     * 刷新数据
     */
    async refreshData() {
        await this.loadInitialData();
        this.showToast('数据已刷新', 'success');
    }

    /**
     * 显示/隐藏加载状态
     */
    showLoading() {
        this.state.loading = true;
        const loadingElement = this.elements.container.querySelector('.table-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        } else {
            const loading = this.createElement('div', 'table-loading');
            loading.innerHTML = `
                <div class="loading-spinner-table"></div>
                <div>正在加载数据...</div>
            `;
            this.elements.container.appendChild(loading);
        }
    }

    hideLoading() {
        this.state.loading = false;
        const loadingElement = this.elements.container.querySelector('.table-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }

    /**
     * 更新筛选摘要
     */
    updateFilterSummary() {
        const filterCount = Object.keys(this.state.filters).length;
        const filterBtn = document.getElementById('advancedFiltersToggle');
        
        if (filterBtn) {
            if (filterCount > 0) {
                filterBtn.innerHTML = `
                    <span class="btn__icon">🔧</span>
                    高级筛选 <span class="filter-count">(${filterCount})</span>
                `;
                filterBtn.classList.add('has-filters');
            } else {
                filterBtn.innerHTML = `
                    <span class="btn__icon">🔧</span>
                    高级筛选
                `;
                filterBtn.classList.remove('has-filters');
            }
        }
    }

    /**
     * 显示列设置面板
     */
    showColumnSettings() {
        console.log('AdvancedDataTable: showColumnSettings() 被调用');
        
        // 使用现有的静态模态框
        const modal = document.getElementById('columnSettingsModal');
        if (!modal) {
            console.error('AdvancedDataTable: Column settings modal not found (#columnSettingsModal)');
            return;
        }

        console.log('AdvancedDataTable: 找到列设置模态框，开始显示');
        console.log('模态框当前状态:', {
            display: modal.style.display,
            visible: modal.offsetParent !== null,
            classes: modal.className
        });

        // 关键修复：确保模态框完全显示
        modal.removeAttribute('aria-hidden');
        modal.setAttribute('aria-modal', 'true');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '1050';
        
        console.log('AdvancedDataTable: 列设置模态框显示完成');
        
        // 聚焦到模态框内的第一个可聚焦元素
        setTimeout(() => {
            const focusableElements = modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
            console.log('AdvancedDataTable: 找到可聚焦元素:', focusableElements.length);
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
                console.log('AdvancedDataTable: 已聚焦到第一个元素');
            }
        }, 100);
        
        // 绑定关闭事件
        this.bindColumnModalEvents(modal);
        return;
        
        // 原动态创建代码（已禁用）
        const modalHTML_DISABLED = `
            <div class="modal-enhanced" id="columnSettingsModal" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">列设置</h3>
                        <button class="modal-close" aria-label="关闭">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="column-settings-content">
                            <div class="settings-section">
                                <h4 class="section-title">显示列</h4>
                                <div class="column-list" id="columnVisibilityList">
                                    ${this.generateColumnVisibilityOptions()}
                                </div>
                            </div>
                            <div class="settings-section">
                                <h4 class="section-title">列排序</h4>
                                <div class="column-order-list" id="columnOrderList">
                                    ${this.generateColumnOrderOptions()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-enhanced btn-outline" onclick="this.closest('.modal-enhanced').remove()">取消</button>
                        <button class="btn-enhanced btn-primary" onclick="window.advancedTable.applyColumnSettings()">
                            <span class="btn__icon">✓</span>
                            应用设置
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 显示模态框
        const columnModal = document.getElementById('columnSettingsModal');
        columnModal.style.display = 'flex';
        setTimeout(() => columnModal.classList.add('show'), 10);

        // 绑定关闭事件
        columnModal.querySelector('.modal-close').onclick = () => {
            columnModal.classList.remove('show');
            setTimeout(() => columnModal.remove(), 300);
        };
    }
    
    /**
     * 绑定列设置模态框事件
     */
    bindColumnModalEvents(modal) {
        // 关闭按钮事件
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-cancel');
        closeButtons.forEach(btn => {
            btn.onclick = () => {
                this.closeColumnModal();
            };
        });
        
        // 保存按钮事件
        const saveBtn = modal.querySelector('#saveColumnSettings');
        if (saveBtn) {
            saveBtn.onclick = () => {
                this.applyColumnSettings();
                this.closeColumnModal();
            };
        }
        
        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeColumnModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeColumnModal();
            }
        };
    }
    
    /**
     * 关闭列设置模态框
     */
    closeColumnModal() {
        const settingsModal = document.getElementById('columnSettingsModal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
            settingsModal.setAttribute('aria-hidden', 'true');
            settingsModal.removeAttribute('aria-modal');
        }
    }

    /**
     * 生成列可见性选项
     */
    generateColumnVisibilityOptions() {
        const columns = [
            { key: 'orderId', label: '订单编号' },
            { key: 'merchantName', label: '商户名称' },
            { key: 'amount', label: '金额' },
            { key: 'transactionStatus', label: '交易状态' },
            { key: 'paymentType', label: '支付类型' },
            { key: 'auditStatus', label: '审核状态' },
            { key: 'createdAt', label: '创建时间' },
            { key: 'actions', label: '操作' }
        ];

        return columns.map(col => `
            <label class="column-option">
                <input type="checkbox" value="${col.key}" 
                    ${this.state.columnSettings.visible[col.key] ? 'checked' : ''}>
                <span class="column-label">${col.label}</span>
            </label>
        `).join('');
    }

    /**
     * 生成列排序选项
     */
    generateColumnOrderOptions() {
        const columns = [
            { key: 'orderId', label: '订单编号' },
            { key: 'merchantName', label: '商户名称' },
            { key: 'amount', label: '金额' },
            { key: 'transactionStatus', label: '交易状态' },
            { key: 'paymentType', label: '支付类型' },
            { key: 'auditStatus', label: '审核状态' },
            { key: 'createdAt', label: '创建时间' },
            { key: 'actions', label: '操作' }
        ];

        return this.state.columnSettings.order.map((colKey, index) => {
            const col = columns.find(c => c.key === colKey);
            if (!col) return '';
            
            return `
                <div class="order-item" data-column="${col.key}">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="column-label">${col.label}</span>
                    <div class="order-controls">
                        <button class="order-btn" onclick="window.advancedTable.moveColumn('${col.key}', 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="order-btn" onclick="window.advancedTable.moveColumn('${col.key}', 'down')" ${index === this.state.columnSettings.order.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 应用列设置
     */
    applyColumnSettings() {
        const applyModal = document.getElementById('columnSettingsModal');
        
        // 更新列可见性
        const checkboxes = applyModal.querySelectorAll('#columnVisibilityList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            this.state.columnSettings.visible[checkbox.value] = checkbox.checked;
        });

        // 重新渲染表格
        this.renderCurrentView();
        this.updateTableColumns();
        
        // 关闭模态框
        applyModal.classList.remove('show');
        setTimeout(() => applyModal.remove(), 300);
    }

    /**
     * 移动列位置
     */
    moveColumn(columnKey, direction) {
        const order = [...this.state.columnSettings.order];
        const currentIndex = order.indexOf(columnKey);
        
        if (direction === 'up' && currentIndex > 0) {
            [order[currentIndex], order[currentIndex - 1]] = [order[currentIndex - 1], order[currentIndex]];
        } else if (direction === 'down' && currentIndex < order.length - 1) {
            [order[currentIndex], order[currentIndex + 1]] = [order[currentIndex + 1], order[currentIndex]];
        }
        
        this.state.columnSettings.order = order;
        
        // 重新生成列排序选项
        const orderList = document.getElementById('columnOrderList');
        if (orderList) {
            orderList.innerHTML = this.generateColumnOrderOptions();
        }
    }

    /**
     * 根据列设置更新表格列显示
     */
    updateTableColumns() {
        if (!this.elements.dataTable) return;

        const columns = [
            { key: 'orderId', selector: 'th[data-column="orderId"], td[data-column="orderId"]' },
            { key: 'merchantName', selector: 'th[data-column="merchantName"], td[data-column="merchantName"]' },
            { key: 'amount', selector: 'th[data-column="amount"], td[data-column="amount"]' },
            { key: 'transactionStatus', selector: 'th[data-column="transactionStatus"], td[data-column="transactionStatus"]' },
            { key: 'paymentType', selector: 'th[data-column="paymentType"], td[data-column="paymentType"]' },
            { key: 'auditStatus', selector: 'th[data-column="auditStatus"], td[data-column="auditStatus"]' },
            { key: 'createdAt', selector: 'th[data-column="createdAt"], td[data-column="createdAt"]' },
            { key: 'actions', selector: 'th[data-column="actions"], td[data-column="actions"]' }
        ];

        columns.forEach(col => {
            const elements = this.elements.dataTable.querySelectorAll(col.selector);
            const isVisible = this.state.columnSettings.visible[col.key];
            
            elements.forEach(el => {
                if (isVisible) {
                    el.style.display = '';
                } else {
                    el.style.display = 'none';
                }
            });
        });

        // 根据列顺序重新排序列（如果需要）
        this.reorderTableColumns();
    }

    /**
     * 根据设置重新排序表格列
     */
    reorderTableColumns() {
        // 这是一个复杂的功能，需要重新构建表格DOM结构
        // 为了简化，我们暂时跳过列重排序功能
        // 在实际应用中，可以通过重新渲染表格来实现
        console.log('列重排序功能待实现');
    }

    /**
     * 应用筛选条件后，同时应用列设置
     */
    applyFiltersAndColumnSettings() {
        this.applyFiltersAndSearch();
        this.updateTableColumns();
    }

    /**
     * 设置增强筛选面板事件监听器
     */
    setupEnhancedFilterEvents() {
        // 筛选预设和历史按钮
        const filterPresetsBtn = document.getElementById('filterPresetsBtn');
        const filterHistoryBtn = document.getElementById('filterHistoryBtn');
        
        if (filterPresetsBtn) {
            filterPresetsBtn.addEventListener('click', () => {
                this.toggleFilterPresets();
            });
        }

        // 筛选标签页切换 - 修复事件绑定
        console.log('AdvancedDataTable: 设置筛选标签页事件绑定');
        const filterTabs = document.querySelectorAll('.filter-tab');
        console.log(`发现 ${filterTabs.length} 个筛选标签页`);
        
        filterTabs.forEach((tab, index) => {
            const tabName = tab.dataset.tab;
            console.log(`绑定标签页 ${index}: ${tabName}`);
            
            // 移除旧事件监听器
            tab.removeEventListener('click', this._tabClickHandler);
            
            // 创建新的事件处理器
            const clickHandler = (e) => {
                console.log(`标签页点击: ${tabName}`);
                e.preventDefault();
                e.stopPropagation();
                this.switchFilterTab(tabName);
            };
            
            // 保存引用并绑定
            this._tabClickHandler = clickHandler;
            tab.addEventListener('click', clickHandler);
            
            // 确保标签页可点击
            tab.style.pointerEvents = 'auto';
            tab.style.cursor = 'pointer';
        });

        // 筛选复选框事件
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFilterCounts();
                this.updateFilterPreview();
            });
        });

        // 金额预设按钮
        document.querySelectorAll('.amount-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setAmountRange(e.target.dataset.range);
            });
        });

        // 时间范围标签页
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setTimeRange(e.target.dataset.period);
            });
        });

        // 处理时长标签页
        document.querySelectorAll('.time-range-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.toggleProcessingTimeFilter(e.target);
            });
        });

        // 商户搜索输入
        const merchantInput = document.getElementById('merchantNameFilter');
        if (merchantInput) {
            merchantInput.addEventListener('input', (e) => {
                this.searchMerchants(e.target.value);
            });
        }

        // 自定义规则构建器
        const addRuleBtn = document.getElementById('addRuleBtn');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => {
                this.addCustomRule();
            });
        }

        // 预设按钮事件
        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                this.applyFilterPreset(e.target.dataset.preset);
            });
        });

        // 保存预设按钮
        const savePresetBtn = document.getElementById('saveFilterPreset');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => {
                this.saveCurrentFiltersAsPreset();
            });
        }

        // 取消和应用按钮
        const cancelBtn = document.getElementById('cancelAdvancedFilters');
        const applyBtn = document.getElementById('applyAdvancedFilters');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.toggleAdvancedFilters();
            });
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyEnhancedFilters();
            });
        }

        // 输入字段变化时更新预览
        document.querySelectorAll('.form-input--enhanced').forEach(input => {
            input.addEventListener('input', () => {
                this.updateFilterPreview();
            });
        });
    }

    /**
     * 切换筛选预设面板
     */
    toggleFilterPresets() {
        const panel = document.getElementById('filterPresetsPanel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * 切换筛选标签页
     */
    switchFilterTab(tabName) {
        console.log(`AdvancedDataTable: 切换到标签页 ${tabName}`);
        
        // 更新标签页状态
        document.querySelectorAll('.filter-tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            console.log(`标签页 ${tab.dataset.tab}: ${isActive ? '激活' : '未激活'}`);
        });

        // 显示对应内容 - 修复ID匹配逻辑
        const contentIdMap = {
            'basic': 'basicFilters',
            'advanced': 'advancedFilters', 
            'custom': 'customFilters'
        };
        
        document.querySelectorAll('.filter-tab-content').forEach(content => {
            const shouldShow = content.id === contentIdMap[tabName];
            content.style.display = shouldShow ? 'block' : 'none';
            console.log(`内容区域 ${content.id}: ${shouldShow ? '显示' : '隐藏'}`);
        });

        this.state.activeTab = tabName;
        console.log(`当前活跃标签页: ${this.state.activeTab}`);
    }

    /**
     * 更新筛选项计数
     */
    updateFilterCounts() {
        const data = this.state.data;
        const counts = {};

        // 计算每种状态的数量
        ['transactionStatus', 'paymentType', 'auditStatus'].forEach(filterType => {
            counts[filterType] = {};
            
            data.forEach(item => {
                const value = item[filterType] || item.status; // 兼容不同字段名
                if (value) {
                    counts[filterType][value] = (counts[filterType][value] || 0) + 1;
                }
            });
        });

        // 更新UI中的计数显示
        document.querySelectorAll('.item-count').forEach(countElement => {
            const countType = countElement.dataset.count;
            const filterType = countElement.closest('.filter-group-enhanced').querySelector('.filter-checkbox').dataset.filter;
            
            if (counts[filterType] && counts[filterType][countType]) {
                countElement.textContent = counts[filterType][countType];
            }
        });

        this.state.itemCounts = counts;
    }

    /**
     * 更新筛选预览
     */
    updateFilterPreview() {
        const previewCount = document.getElementById('previewCount');
        const activeFilterTags = document.getElementById('activeFilterTags');
        
        if (!previewCount || !activeFilterTags) return;

        // 计算当前筛选条件下的记录数
        const filteredCount = this.calculateFilteredCount();
        previewCount.textContent = `预计匹配 ${filteredCount} 条记录`;

        // 显示活跃的筛选标签
        const tags = this.generateFilterTags();
        activeFilterTags.innerHTML = tags.map(tag => 
            `<span class="filter-tag">${tag}</span>`
        ).join('');
    }

    /**
     * 计算筛选后的记录数
     */
    calculateFilteredCount() {
        // 这里应该根据当前筛选条件计算
        // 暂时返回模拟数据
        return Math.floor(Math.random() * this.state.data.length);
    }

    /**
     * 生成筛选标签
     */
    generateFilterTags() {
        const tags = [];
        
        // 检查已选择的筛选条件
        document.querySelectorAll('.filter-checkbox:checked').forEach(checkbox => {
            const text = checkbox.closest('.checkbox-item-enhanced').querySelector('.checkbox-text').textContent;
            tags.push(text);
        });

        // 检查金额范围
        const minAmount = document.getElementById('minAmount').value;
        const maxAmount = document.getElementById('maxAmount').value;
        if (minAmount || maxAmount) {
            const range = `金额: ${minAmount || '0'} - ${maxAmount || '∞'}`;
            tags.push(range);
        }

        // 检查时间范围
        const activeTimeTab = document.querySelector('.time-tab.active');
        if (activeTimeTab && activeTimeTab.dataset.period !== 'today') {
            tags.push(`时间: ${activeTimeTab.textContent}`);
        }

        return tags;
    }

    /**
     * 设置金额范围
     */
    setAmountRange(range) {
        const [min, max] = range.split('-').map(v => v === '0' ? '' : v);
        
        document.getElementById('minAmount').value = min || '';
        document.getElementById('maxAmount').value = max === '0' ? '' : max;
        
        // 更新按钮状态
        document.querySelectorAll('.amount-preset').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });

        this.updateFilterPreview();
    }

    /**
     * 设置时间范围
     */
    setTimeRange(period) {
        // 更新标签页状态
        document.querySelectorAll('.time-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.period === period);
        });

        // 显示/隐藏自定义日期范围
        const customDateRange = document.getElementById('customDateRange');
        if (customDateRange) {
            customDateRange.style.display = period === 'custom' ? 'block' : 'none';
        }

        // 如果不是自定义，自动设置日期
        if (period !== 'custom') {
            this.setAutomaticDateRange(period);
        }

        this.updateFilterPreview();
    }

    /**
     * 自动设置日期范围
     */
    setAutomaticDateRange(period) {
        const now = new Date();
        let startDate, endDate = now;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        // 这里可以存储到筛选状态中
        this.state.filters.dateRange = { start: startDate, end: endDate };
    }

    /**
     * 切换处理时长筛选
     */
    toggleProcessingTimeFilter(tab) {
        // 切换激活状态
        document.querySelectorAll('.time-range-tab').forEach(t => {
            t.classList.remove('active');
        });
        
        tab.classList.add('active');
        
        this.state.filters.processingTime = tab.dataset.time;
        this.updateFilterPreview();
    }

    /**
     * 搜索商户
     */
    searchMerchants(query) {
        const suggestionsPanel = document.getElementById('merchantSuggestions');
        if (!suggestionsPanel) return;

        if (query.length < 2) {
            suggestionsPanel.style.display = 'none';
            return;
        }

        // 模拟商户搜索
        const merchants = [
            '阿里巴巴(中国)网络技术有限公司',
            '腾讯科技(深圳)有限公司', 
            '北京字节跳动科技有限公司',
            '上海拼多多网络科技有限公司',
            '北京京东世纪贸易有限公司'
        ].filter(merchant => merchant.includes(query));

        if (merchants.length > 0) {
            suggestionsPanel.innerHTML = merchants.map(merchant => 
                `<div class="merchant-suggestion" data-merchant="${merchant}">${merchant}</div>`
            ).join('');
            suggestionsPanel.style.display = 'block';
            
            // 添加点击事件
            suggestionsPanel.querySelectorAll('.merchant-suggestion').forEach(item => {
                item.addEventListener('click', () => {
                    this.selectMerchant(item.dataset.merchant);
                });
            });
        } else {
            suggestionsPanel.style.display = 'none';
        }
    }

    /**
     * 选择商户
     */
    selectMerchant(merchantName) {
        const selectedContainer = document.getElementById('selectedMerchants');
        const suggestionsPanel = document.getElementById('merchantSuggestions');
        
        // 添加商户标签
        const tag = document.createElement('span');
        tag.className = 'merchant-tag';
        tag.innerHTML = `${merchantName} <button class="remove-merchant" data-merchant="${merchantName}">×</button>`;
        
        selectedContainer.appendChild(tag);
        
        // 隐藏建议面板
        suggestionsPanel.style.display = 'none';
        document.getElementById('merchantNameFilter').value = '';
        
        // 添加移除事件
        tag.querySelector('.remove-merchant').addEventListener('click', () => {
            this.removeMerchant(merchantName);
        });
        
        // 更新筛选状态
        if (!this.state.filters.merchants) {
            this.state.filters.merchants = [];
        }
        this.state.filters.merchants.push(merchantName);
        
        this.updateFilterPreview();
    }

    /**
     * 移除商户
     */
    removeMerchant(merchantName) {
        // 移除DOM元素
        document.querySelectorAll('.merchant-tag').forEach(tag => {
            if (tag.textContent.includes(merchantName)) {
                tag.remove();
            }
        });
        
        // 更新筛选状态
        if (this.state.filters.merchants) {
            this.state.filters.merchants = this.state.filters.merchants.filter(m => m !== merchantName);
        }
        
        this.updateFilterPreview();
    }

    /**
     * 添加自定义规则
     */
    addCustomRule() {
        const ruleBuilder = document.getElementById('ruleBuilder');
        const ruleCount = ruleBuilder.children.length;
        const newRuleId = ruleCount + 1;
        
        const ruleHTML = `
            <div class="rule-item" id="rule-${newRuleId}">
                <select class="rule-field">
                    <option value="amount">金额</option>
                    <option value="merchantName">商户名称</option>
                    <option value="createdAt">创建时间</option>
                    <option value="transactionId">交易号</option>
                </select>
                <select class="rule-operator">
                    <option value="equals">等于</option>
                    <option value="not_equals">不等于</option>
                    <option value="greater">大于</option>
                    <option value="less">小于</option>
                    <option value="contains">包含</option>
                    <option value="not_contains">不包含</option>
                </select>
                <input type="text" class="rule-value" placeholder="输入值...">
                <button class="rule-remove-btn" onclick="this.removeRule(${newRuleId})">−</button>
            </div>
        `;
        
        ruleBuilder.insertAdjacentHTML('beforeend', ruleHTML);
    }

    /**
     * 移除自定义规则
     */
    removeRule(ruleId) {
        const ruleElement = document.getElementById(`rule-${ruleId}`);
        if (ruleElement) {
            ruleElement.remove();
        }
    }

    /**
     * 应用筛选预设
     */
    applyFilterPreset(presetName) {
        switch (presetName) {
            case 'today-success':
                this.setTimeRange('today');
                document.querySelector('[value="success"]').checked = true;
                break;
            case 'high-amount':
                this.setAmountRange('100000-0');
                break;
            case 'pending-audit':
                document.querySelector('[value="未审核"]').checked = true;
                break;
            case 'failed-today':
                this.setTimeRange('today');
                document.querySelector('[value="failed"]').checked = true;
                break;
        }
        
        this.updateFilterCounts();
        this.updateFilterPreview();
    }

    /**
     * 保存当前筛选条件为预设
     */
    saveCurrentFiltersAsPreset() {
        const presetName = prompt('请输入预设名称:');
        if (presetName) {
            this.state.presets[presetName] = {
                filters: { ...this.state.filters },
                timestamp: new Date().toISOString()
            };
            
            // 保存到localStorage
            localStorage.setItem('filterPresets', JSON.stringify(this.state.presets));
            
            console.log(`筛选预设 "${presetName}" 已保存`);
        }
    }

    /**
     * 应用增强筛选
     */
    applyEnhancedFilters() {
        // 收集所有筛选条件
        this.collectFilterConditions();
        
        // 保存到筛选历史
        this.saveToFilterHistory();
        
        // 应用筛选
        this.applyFiltersAndSearch();
        
        // 关闭筛选面板
        this.toggleAdvancedFilters();
        
        console.log('已应用增强筛选条件:', this.state.filters);
    }

    /**
     * 收集筛选条件
     */
    collectFilterConditions() {
        const filters = {};
        
        // 收集复选框筛选条件
        document.querySelectorAll('.filter-checkbox:checked').forEach(checkbox => {
            const filterType = checkbox.dataset.filter;
            const value = checkbox.value;
            
            if (!filters[filterType]) {
                filters[filterType] = [];
            }
            filters[filterType].push(value);
        });
        
        // 收集金额范围
        const minAmount = document.getElementById('minAmount').value;
        const maxAmount = document.getElementById('maxAmount').value;
        if (minAmount || maxAmount) {
            filters.amountRange = {
                min: minAmount ? parseFloat(minAmount) : null,
                max: maxAmount ? parseFloat(maxAmount) : null
            };
        }
        
        // 收集时间范围
        const activeTimeTab = document.querySelector('.time-tab.active');
        if (activeTimeTab) {
            filters.timeRange = activeTimeTab.dataset.period;
            
            if (activeTimeTab.dataset.period === 'custom') {
                const startDate = document.getElementById('filterStartDate').value;
                const endDate = document.getElementById('filterEndDate').value;
                filters.customTimeRange = { start: startDate, end: endDate };
            }
        }
        
        // 收集自定义规则
        const customRules = [];
        document.querySelectorAll('.rule-item').forEach(rule => {
            const field = rule.querySelector('.rule-field').value;
            const operator = rule.querySelector('.rule-operator').value;
            const value = rule.querySelector('.rule-value').value;
            
            if (field && operator && value) {
                customRules.push({ field, operator, value });
            }
        });
        
        if (customRules.length > 0) {
            filters.customRules = customRules;
            const logic = document.getElementById('ruleLogic').value;
            filters.ruleLogic = logic;
        }
        
        this.state.filters = filters;
    }

    /**
     * 保存到筛选历史
     */
    saveToFilterHistory() {
        const historyItem = {
            filters: { ...this.state.filters },
            timestamp: new Date().toISOString(),
            description: this.generateFilterDescription()
        };
        
        this.state.filterHistory.unshift(historyItem);
        
        // 限制历史记录数量
        if (this.state.filterHistory.length > 10) {
            this.state.filterHistory = this.state.filterHistory.slice(0, 10);
        }
        
        // 保存到localStorage
        localStorage.setItem('filterHistory', JSON.stringify(this.state.filterHistory));
        
        this.updateFilterHistoryUI();
    }

    /**
     * 生成筛选描述
     */
    generateFilterDescription() {
        const tags = this.generateFilterTags();
        return tags.length > 0 ? tags.join(', ') : '所有数据';
    }

    /**
     * 更新筛选历史UI
     */
    updateFilterHistoryUI() {
        const historyList = document.getElementById('filterHistoryList');
        if (!historyList) return;
        
        historyList.innerHTML = this.state.filterHistory.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-description">${item.description}</div>
                <div class="history-timestamp">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
        
        // 添加点击事件
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.applyHistoryFilter(parseInt(item.dataset.index));
            });
        });
    }

    /**
     * 应用历史筛选
     */
    applyHistoryFilter(index) {
        const historyItem = this.state.filterHistory[index];
        if (historyItem) {
            this.state.filters = { ...historyItem.filters };
            this.applyFiltersAndSearch();
            this.toggleAdvancedFilters();
        }
    }
}

// 全局导出
window.AdvancedDataTable = AdvancedDataTable;

// 模块导出支持
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedDataTable;
}