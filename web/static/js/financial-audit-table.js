/**
 * 财务审核信息表管理器
 * 功能：数据加载、序号/操作列固定滚动、表格/卡片视图切换、审核操作
 */

class FinancialAuditTable {
    constructor() {
        this.tableElement = document.getElementById('financialAuditTable');
        this.tableBody = document.getElementById('financialAuditTableBody');
        this.cardsGrid = document.getElementById('financialAuditCardsGrid');
        this.tableView = document.getElementById('tableView');
        this.cardsView = document.getElementById('cardsView');
        
        this.originalData = [];
        this.currentData = [];
        this.filteredData = [];
        this.currentView = 'table';
        this.currentPage = 1;
        this.pageSize = 20;
        
        // 筛选状态
        this.activeFilters = {
            search: '',
            status: '',
            paymentType: '',
            amountRange: '',
            dateRange: ''
        };
        
        this.init();
    }

    init() {
        console.log('FinancialAuditTable: 开始初始化...');
        this.bindEvents();
        this.setupFixedColumns();
        this.initializeViewState();
        this.loadAuditData();
        console.log('FinancialAuditTable: 初始化完成');
    }

    /**
     * 初始化视图状态
     */
    initializeViewState() {
        // 确保初始状态下表格视图可见，卡片视图隐藏
        if (this.tableView && this.cardsView) {
            // 设置CSS类而不是style.display，因为CSS规则需要.active类
            this.tableView.classList.add('active');
            this.cardsView.classList.remove('active');
            
            // 设置默认的视图切换按钮状态
            const tableBtn = document.querySelector('.view-btn[data-view="table"]');
            const cardsBtn = document.querySelector('.view-btn[data-view="cards"]');
            
            if (tableBtn) tableBtn.classList.add('active');
            if (cardsBtn) cardsBtn.classList.remove('active');
            
            console.log('FinancialAuditTable: 初始视图状态设置完成 - 默认表格视图，使用active类');
        }
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 绑定视图切换按钮
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view') || e.target.closest('.view-btn').getAttribute('data-view');
                this.handleViewToggle(view, e.target.closest('.view-btn'));
            });
        });

        // 绑定排序事件
        const sortableHeaders = document.querySelectorAll('.col-sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const column = header.getAttribute('data-column');
                this.handleSort(column);
            });
        });

        // 绑定滚动事件以保持固定列效果
        const tableWrapper = document.querySelector('.financial-audit-table-wrapper');
        if (tableWrapper) {
            tableWrapper.addEventListener('scroll', this.handleScroll.bind(this));
        }
    }

    /**
     * 设置固定列功能
     */
    setupFixedColumns() {
        // 确保固定列在页面加载时正确设置
        setTimeout(() => {
            const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
            const actionCells = document.querySelectorAll('.col-actions, .col-actions-cell');
            
            serialCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.left = '0';
                cell.style.zIndex = cell.classList.contains('col-serial') ? '101' : '99';
                cell.style.background = '#ffffff';
            });

            actionCells.forEach(cell => {
                cell.style.position = 'sticky';
                cell.style.right = '0';
                cell.style.zIndex = cell.classList.contains('col-actions') ? '101' : '99';
                cell.style.background = '#ffffff';
            });
        }, 100);
    }

    /**
     * 处理表格滚动事件
     */
    handleScroll(event) {
        const scrollLeft = event.target.scrollLeft;
        
        // 更新固定列的阴影效果
        const serialCells = document.querySelectorAll('.col-serial, .col-serial-cell');
        const actionCells = document.querySelectorAll('.col-actions, .col-actions-cell');
        
        serialCells.forEach(cell => {
            if (scrollLeft > 0) {
                cell.style.boxShadow = '4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });

        actionCells.forEach(cell => {
            const maxScroll = event.target.scrollWidth - event.target.clientWidth;
            if (scrollLeft < maxScroll) {
                cell.style.boxShadow = '-4px 0 12px rgba(0, 0, 0, 0.15)';
            } else {
                cell.style.boxShadow = '-2px 0 8px rgba(0, 0, 0, 0.1)';
            }
        });
    }

    /**
     * 处理视图切换
     */
    handleViewToggle(view, buttonElement) {
        console.log('FinancialAuditTable: 切换视图:', view);
        
        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (buttonElement) {
            buttonElement.classList.add('active');
        }
        
        // 切换视图显示
        this.switchView(view);
    }

    /**
     * 切换视图
     */
    switchView(view) {
        if (view === 'table') {
            // 使用CSS类控制显示隐藏，而不是style.display
            this.tableView.classList.add('active');
            this.cardsView.classList.remove('active');
            this.renderTableData(this.currentData);
        } else {
            this.tableView.classList.remove('active');
            this.cardsView.classList.add('active');
            this.renderCardsData(this.currentData);
        }
        
        this.showNotification(`已切换到${view === 'table' ? '表格' : '卡片'}视图`, 'success');
    }

    /**
     * 处理排序
     */
    handleSort(column) {
        console.log('FinancialAuditTable: 排序列:', column);
        // TODO: 实现排序逻辑
    }

    /**
     * 加载审核数据
     */
    async loadAuditData() {
        try {
            console.log('FinancialAuditTable: 开始加载审核数据...');
            
            // 显示加载状态
            this.showLoadingState();

            // 生成模拟数据
            const mockData = this.generateMockAuditData();
            
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.originalData = mockData;
            this.currentData = mockData;
            this.filteredData = mockData;
            
            // 根据当前视图渲染数据
            if (this.currentView === 'table') {
                this.renderTableData(mockData);
            } else {
                this.renderCardsData(mockData);
            }
            
            console.log(`FinancialAuditTable: 成功加载 ${mockData.length} 条审核记录`);
        } catch (error) {
            console.error('FinancialAuditTable: 加载数据失败:', error);
            this.showErrorState();
        }
    }

    /**
     * 生成模拟审核数据
     */
    generateMockAuditData() {
        const merchants = ['阿里巴巴集团控股有限公司', '腾讯科技(深圳)有限公司', '字节跳动有限公司', '美团', '上海寻梦信息技术有限公司', '京东', '百度在线网络技术(北京)有限公司', '网易', '北京小米科技有限责任公司', '华为技术有限公司'];
        const banks = ['中国银行', '工商银行', '建设银行', '农业银行', '招商银行', '交通银行', '浦发银行', '民生银行'];
        const businessTypes = ['对公', '对私'];
        const statuses = ['交易成功', '交易失败'];
        const auditStatuses = ['已到账', '未到账', '未审核'];
        
        const data = [];
        const now = new Date();
        
        for (let i = 1; i <= 50; i++) {
            const isSuccess = Math.random() > 0.15; // 85% 成功率
            const hasSuccessTime = isSuccess && Math.random() > 0.3;
            const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
            const merchant = merchants[Math.floor(Math.random() * merchants.length)];
            const payerBank = banks[Math.floor(Math.random() * banks.length)];
            const receiverBank = banks[Math.floor(Math.random() * banks.length)];
            const amount = (Math.random() * 999999 + 100).toFixed(2);
            
            const createdTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const successTime = hasSuccessTime ? new Date(createdTime.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null;
            
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
                bank_voucher: `BV${String(Date.now() + i).slice(-10)}`,
                payment_voucher: `PV${String(Date.now() + i).slice(-10)}`, // 新增付款凭证
                amount: amount,
                merchant_name: merchant,
                payer_account_name: `${merchant}账户${i}`,
                payer_account_number: maskedPayerAccountNumber,
                payer_account_number_full: fullPayerAccountNumber,
                payer_bank: payerBank, // 新增付款账户机构
                receiver_account_name: `收款方账户${i}`,
                receiver_account_number: maskedReceiverAccountNumber,
                receiver_account_number_full: fullReceiverAccountNumber,
                receiver_bank: receiverBank, // 新增收款账户机构
                business_type: businessType,
                status: isSuccess ? '交易成功' : '交易失败',
                audit_status: auditStatus,
                created_time: this.formatDateTime(createdTime),
                success_time: successTime ? this.formatDateTime(successTime) : '-',
                payment_time: successTime ? this.formatDateTime(successTime) : '-' // 新增付款时间字段
            });
        }
        
        return data;
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
     * 渲染表格数据
     */
    renderTableData(data) {
        if (!this.tableBody) {
            console.error('FinancialAuditTable: 未找到表格主体元素');
            return;
        }

        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }

        const html = data.map((row, index) => `
            <tr class="audit-table-row">
                <!-- 序号 -->
                <td class="col-serial-cell">
                    <div class="serial-number">${row.serial}</div>
                </td>
                
                <!-- 订单号 -->
                <td data-column="order_number">
                    <span class="order-number-cell copyable-cell" data-full-content="${row.order_number}" title="双击复制完整订单号">${row.order_number}</span>
                </td>
                
                <!-- 付款凭证 -->
                <td data-column="payment_voucher">
                    <span class="payment-voucher-cell copyable-cell" data-full-content="${row.payment_voucher || row.bank_voucher}" title="双击复制付款凭证号">${row.payment_voucher || row.bank_voucher}</span>
                </td>
                
                <!-- 付款金额 -->
                <td data-column="amount">
                    <span class="amount-cell ${parseFloat(row.amount) > 10000 ? 'amount-large' : ''}">¥${parseFloat(row.amount).toLocaleString()}</span>
                </td>
                
                <!-- 付款账号 -->
                <td data-column="payer_account">
                    <span class="account-number-cell copyable-cell privacy-protected" 
                          data-full-content="${row.payer_account_number_full}" 
                          data-masked-content="${row.payer_account_number}"
                          title="双击复制完整付款账号">${row.payer_account_number}</span>
                </td>
                
                <!-- 付款账户名称 -->
                <td data-column="payer_name">
                    <span class="account-name-cell copyable-cell expandable-cell" 
                          data-full-content="${row.payer_account_name}" 
                          data-display-content="${this.truncateText(row.payer_account_name, 8)}"
                          title="悬停查看完整内容，双击复制">${this.truncateText(row.payer_account_name, 8)}</span>
                </td>
                
                <!-- 付款账户机构 -->
                <td data-column="payer_bank">
                    <span class="bank-name-cell">${row.payer_bank || '未知银行'}</span>
                </td>
                
                <!-- 付款类型（对公/对私） -->
                <td data-column="payment_type">
                    <span class="business-type-badge ${row.business_type === '对公' ? 'business-type-public' : 'business-type-private'}">
                        ${row.business_type}
                    </span>
                </td>
                
                <!-- 收款账号 -->
                <td data-column="receiver_account">
                    <span class="account-number-cell copyable-cell privacy-protected" 
                          data-full-content="${row.receiver_account_number_full}" 
                          data-masked-content="${row.receiver_account_number}"
                          title="双击复制完整收款账号">${row.receiver_account_number}</span>
                </td>
                
                <!-- 收款账户名称 -->
                <td data-column="receiver_name">
                    <span class="account-name-cell copyable-cell expandable-cell" 
                          data-full-content="${row.receiver_account_name}" 
                          data-display-content="${this.truncateText(row.receiver_account_name, 8)}"
                          title="悬停查看完整内容，双击复制">${this.truncateText(row.receiver_account_name, 8)}</span>
                </td>
                
                <!-- 收款账户机构 -->
                <td data-column="receiver_bank">
                    <span class="bank-name-cell">${row.receiver_bank || '未知银行'}</span>
                </td>
                
                <!-- 订单状态（交易成功、交易失败） -->
                <td data-column="order_status">
                    <span class="status-badge ${row.status === '交易成功' ? 'status-success' : 'status-failed'}">
                        ${row.status}
                    </span>
                </td>
                
                <!-- 创建时间 -->
                <td data-column="created_time">
                    <span class="time-cell">${row.created_time}</span>
                </td>
                
                <!-- 付款时间 -->
                <td data-column="payment_time">
                    <span class="time-cell">${row.payment_time || row.success_time || '-'}</span>
                </td>
                
                <!-- 操作（查看详情、已到账、未到账） -->
                <td class="col-actions-cell">
                    <div class="audit-actions-simple">
                        <a href="#" class="action-link action-view" onclick="window.financialAuditTable.viewDetails('${row.order_number}'); return false;">查看详情</a>
                        <span class="action-separator">|</span>
                        <a href="#" class="action-link action-arrived ${row.audit_status === '已到账' ? 'active' : ''}" onclick="window.financialAuditTable.markArrived('${row.order_number}'); return false;">已到账</a>
                        <span class="action-separator">|</span>
                        <a href="#" class="action-link action-not-arrived ${row.audit_status === '未到账' ? 'active' : ''}" onclick="window.financialAuditTable.markNotArrived('${row.order_number}'); return false;">未到账</a>
                    </div>
                </td>
            </tr>
        `).join('');

        this.tableBody.innerHTML = html;
        
        // 重新设置固定列
        this.setupFixedColumns();

        // 设置内容查看和复制功能
        this.setupContentInteraction();

        console.log(`FinancialAuditTable: 已渲染 ${data.length} 行表格数据`);
    }

    /**
     * 渲染卡片数据
     */
    renderCardsData(data) {
        if (!this.cardsGrid) {
            console.error('FinancialAuditTable: 未找到卡片容器');
            return;
        }

        if (!data || data.length === 0) {
            this.cardsGrid.innerHTML = `
                <div class="financial-audit-empty">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">暂无审核数据</div>
                </div>
            `;
            return;
        }

        const cardsHtml = data.map(row => `
            <div class="financial-audit-card" data-order-id="${row.order_number}">
                <div class="audit-card-header">
                    <div class="audit-card-title">
                        <div class="audit-card-order-number">${row.order_number}</div>
                        <div class="audit-card-amount ${parseFloat(row.amount) > 10000 ? 'large-amount' : ''}">
                            ¥${parseFloat(row.amount).toLocaleString()}
                        </div>
                    </div>
                </div>
                
                <div class="audit-card-body">
                    <div class="audit-card-field">
                        <div class="audit-card-label">🏪 商户名称</div>
                        <div class="audit-card-value">${row.merchant_name}</div>
                    </div>
                    
                    <div class="audit-card-field">
                        <div class="audit-card-label">🏦 银行凭证</div>
                        <div class="audit-card-value">${row.bank_voucher}</div>
                    </div>
                    
                    <div class="audit-card-field">
                        <div class="audit-card-label">📊 业务类别</div>
                        <div class="audit-card-value">
                            ${row.business_type === '对公' ? '🏛️' : '👤'} ${row.business_type}
                        </div>
                    </div>
                    
                    <div class="audit-card-field">
                        <div class="audit-card-label">📅 创建时间</div>
                        <div class="audit-card-value">${row.created_time}</div>
                    </div>
                    
                    <div class="audit-card-accounts">
                        <div class="audit-card-account-flow">
                            <div class="audit-card-account">
                                <div class="audit-card-account-name">${row.payer_account_name}</div>
                                <div class="audit-card-account-number">${row.payer_account_number}</div>
                            </div>
                            <div class="audit-card-flow-arrow">→</div>
                            <div class="audit-card-account">
                                <div class="audit-card-account-name">${row.receiver_account_name}</div>
                                <div class="audit-card-account-number">${row.receiver_account_number}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="audit-card-footer">
                    <div class="audit-card-status">
                        <span class="status-badge ${row.status === '交易成功' ? 'status-success' : 'status-failed'}">
                            ${row.status === '交易成功' ? '✅' : '❌'} ${row.status}
                        </span>
                        <span class="audit-badge ${this.getAuditBadgeClass(row.audit_status)}">
                            ${this.getAuditStatusIcon(row.audit_status)} ${row.audit_status}
                        </span>
                    </div>
                    
                    <div class="audit-card-actions-simple">
                        <a href="#" class="action-link action-view" onclick="window.financialAuditTable.viewDetails('${row.order_number}'); return false;">查看详情</a>
                        <span class="action-separator">•</span>
                        <a href="#" class="action-link action-arrived ${row.audit_status === '已到账' ? 'active' : ''}" onclick="window.financialAuditTable.markArrived('${row.order_number}'); return false;">到账</a>
                        <span class="action-separator">•</span>
                        <a href="#" class="action-link action-not-arrived ${row.audit_status === '未到账' ? 'active' : ''}" onclick="window.financialAuditTable.markNotArrived('${row.order_number}'); return false;">未到</a>
                    </div>
                </div>
            </div>
        `).join('');

        this.cardsGrid.innerHTML = cardsHtml;
        console.log(`FinancialAuditTable: 已渲染 ${data.length} 张卡片`);
    }

    /**
     * 获取审核状态的CSS类
     */
    getAuditBadgeClass(status) {
        switch (status) {
            case '已到账':
                return 'audit-arrived';
            case '未到账':
                return 'audit-not-arrived';
            case '未审核':
                return 'audit-pending';
            default:
                return 'audit-pending';
        }
    }

    /**
     * 获取审核状态图标
     */
    getAuditStatusIcon(status) {
        switch (status) {
            case '已到账':
                return '✅';
            case '未到账':
                return '❌';
            case '未审核':
                return '⏳';
            default:
                return '⏳';
        }
    }

    /**
     * 显示加载状态
     */
    showLoadingState() {
        if (this.currentView === 'table' && this.tableBody) {
            this.tableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="15" class="financial-audit-loading">
                        <div class="loading-spinner"></div>
                        <div style="margin-top: 12px; color: #6b7280;">正在加载审核数据...</div>
                    </td>
                </tr>
            `;
        } else if (this.currentView === 'cards' && this.cardsGrid) {
            this.cardsGrid.innerHTML = `
                <div class="financial-audit-loading">
                    <div class="loading-spinner"></div>
                    <div style="margin-top: 12px;">正在加载审核数据...</div>
                </div>
            `;
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        if (this.currentView === 'table' && this.tableBody) {
            this.tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="15" class="financial-audit-empty">
                        <div class="empty-icon">📋</div>
                        <div class="empty-text">暂无审核数据</div>
                    </td>
                </tr>
            `;
        } else if (this.currentView === 'cards' && this.cardsGrid) {
            this.cardsGrid.innerHTML = `
                <div class="financial-audit-empty">
                    <div class="empty-icon">📋</div>
                    <div class="empty-text">暂无审核数据</div>
                </div>
            `;
        }
    }

    /**
     * 显示错误状态
     */
    showErrorState() {
        const errorHtml = `
            <div class="financial-audit-loading">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div style="color: #dc2626; font-size: 16px; margin-bottom: 16px;">数据加载失败</div>
                <button onclick="window.financialAuditTable.loadAuditData()" class="audit-action-btn btn-primary">
                    重新加载
                </button>
            </div>
        `;

        if (this.currentView === 'table' && this.tableBody) {
            this.tableBody.innerHTML = `<tr><td colspan="15">${errorHtml}</td></tr>`;
        } else if (this.currentView === 'cards' && this.cardsGrid) {
            this.cardsGrid.innerHTML = errorHtml;
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `audit-notification audit-notification--${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 320px;
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // 自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * 获取通知图标
     */
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            default: return 'ℹ️';
        }
    }

    /**
     * 查看订单详情
     */
    viewDetails(orderNumber) {
        console.log('FinancialAuditTable: 查看订单详情:', orderNumber);
        
        // 查找订单数据
        const orderData = this.originalData.find(item => item.order_number === orderNumber);
        if (!orderData) {
            this.showNotification('订单数据未找到', 'error');
            return;
        }
        
        this.showOrderDetailsModal(orderData);
    }

    /**
     * 显示订单详情模态窗口
     */
    showOrderDetailsModal(orderData) {
        // 创建模态窗口
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        `;
        
        modalContent.innerHTML = `
            <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #374151;">
                        📋 订单详情 - ${orderData.order_number}
                    </h2>
                    <button onclick="this.closest('.modal').remove()" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #6b7280;
                    ">×</button>
                </div>
            </div>
            
            <div style="padding: 24px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <!-- 基本信息 -->
                    <div style="space-y: 16px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
                            💼 基本信息
                        </h3>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">订单号</div>
                            <div style="font-size: 14px; color: #374151; font-family: monospace; background: #f9fafb; padding: 6px 8px; border-radius: 4px;">
                                ${orderData.order_number}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">银行凭证号</div>
                            <div style="font-size: 14px; color: #374151; font-family: monospace; background: #f9fafb; padding: 6px 8px; border-radius: 4px;">
                                ${orderData.bank_voucher}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">交易金额</div>
                            <div style="font-size: 18px; color: ${parseFloat(orderData.amount) > 10000 ? '#dc2626' : '#059669'}; font-weight: 700;">
                                ¥${parseFloat(orderData.amount).toLocaleString()}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">商户名称</div>
                            <div style="font-size: 14px; color: #374151; font-weight: 500;">
                                ${orderData.merchant_name}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">业务类别</div>
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                padding: 4px 10px;
                                border-radius: 12px;
                                font-size: 12px;
                                font-weight: 500;
                                ${orderData.business_type === '对公' ? 
                                    'background: rgba(59, 130, 246, 0.1); color: #1e40af; border: 1px solid rgba(59, 130, 246, 0.2);' : 
                                    'background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2);'}
                            ">
                                ${orderData.business_type === '对公' ? '🏛️' : '👤'} ${orderData.business_type}
                            </span>
                        </div>
                    </div>
                    
                    <!-- 账户信息 -->
                    <div style="space-y: 16px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #10b981; padding-bottom: 8px;">
                            🏦 账户信息
                        </h3>
                        
                        <div style="background: rgba(59, 130, 246, 0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <div style="font-size: 14px; color: #3b82f6; font-weight: 600; margin-bottom: 8px;">💸 付款账户</div>
                            <div style="margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #6b7280;">账户名称</div>
                                <div style="font-size: 14px; color: #374151; font-weight: 500;">${orderData.payer_account_name}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #6b7280;">账户号码</div>
                                <div style="font-size: 14px; color: #374151; font-family: monospace;">${orderData.payer_account_number}</div>
                            </div>
                        </div>
                        
                        <div style="background: rgba(16, 185, 129, 0.05); padding: 16px; border-radius: 8px;">
                            <div style="font-size: 14px; color: #10b981; font-weight: 600; margin-bottom: 8px;">💰 收款账户</div>
                            <div style="margin-bottom: 8px;">
                                <div style="font-size: 12px; color: #6b7280;">账户名称</div>
                                <div style="font-size: 14px; color: #374151; font-weight: 500;">${orderData.receiver_account_name}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; color: #6b7280;">账户号码</div>
                                <div style="font-size: 14px; color: #374151; font-family: monospace;">${orderData.receiver_account_number}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 状态和时间信息 -->
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                        📊 状态信息
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">交易状态</div>
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                padding: 6px 12px;
                                border-radius: 16px;
                                font-size: 12px;
                                font-weight: 600;
                                ${orderData.status === '交易成功' ? 
                                    'background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2);' : 
                                    'background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.2);'}
                            ">
                                ${orderData.status === '交易成功' ? '✅' : '❌'} ${orderData.status}
                            </span>
                        </div>
                        
                        <div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">审核状态</div>
                            <span style="
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                                padding: 6px 12px;
                                border-radius: 16px;
                                font-size: 12px;
                                font-weight: 600;
                                ${orderData.audit_status === '已到账' ? 
                                    'background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2);' : 
                                    orderData.audit_status === '未到账' ? 
                                    'background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2);' :
                                    'background: rgba(107, 114, 128, 0.1); color: #4b5563; border: 1px solid rgba(107, 114, 128, 0.2);'}
                            ">
                                ${orderData.audit_status === '已到账' ? '✅' : orderData.audit_status === '未到账' ? '❌' : '⏳'} ${orderData.audit_status}
                            </span>
                        </div>
                        
                        <div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">创建时间</div>
                            <div style="font-size: 14px; color: #374151; font-family: monospace;">${orderData.created_time}</div>
                        </div>
                        
                        <div>
                            <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">成功时间</div>
                            <div style="font-size: 14px; color: #374151; font-family: monospace;">${orderData.success_time}</div>
                        </div>
                    </div>
                </div>
                
                <!-- 操作按钮 -->
                ${orderData.audit_status === '未审核' ? `
                <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="window.financialAuditTable.markArrived('${orderData.order_number}'); this.closest('.modal').remove();" style="
                            padding: 10px 20px;
                            background: #10b981;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            ✅ 标记已到账
                        </button>
                        <button onclick="window.financialAuditTable.markNotArrived('${orderData.order_number}'); this.closest('.modal').remove();" style="
                            padding: 10px 20px;
                            background: #f59e0b;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            ❌ 标记未到账
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        modal.className = 'modal order-details-modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    /**
     * 标记已到账
     */
    markArrived(orderNumber) {
        console.log('FinancialAuditTable: 标记已到账:', orderNumber);
        this.updateAuditStatus(orderNumber, '已到账');
    }

    /**
     * 标记未到账
     */
    markNotArrived(orderNumber) {
        console.log('FinancialAuditTable: 标记未到账:', orderNumber);
        this.updateAuditStatus(orderNumber, '未到账');
    }

    /**
     * 更新审核状态
     */
    updateAuditStatus(orderNumber, newStatus) {
        // 更新数据
        const order = this.originalData.find(item => item.order_number === orderNumber);
        if (order) {
            order.audit_status = newStatus;
            
            // 重新渲染当前视图
            if (this.currentView === 'table') {
                this.renderTableData(this.currentData);
            } else {
                this.renderCardsData(this.currentData);
            }
            
            this.showNotification(`订单 ${orderNumber} 已标记为${newStatus}`, 'success');
        } else {
            this.showNotification('订单未找到', 'error');
        }
    }

    /**
     * 刷新数据
     */
    refresh() {
        console.log('FinancialAuditTable: 刷新数据...');
        this.showNotification('正在刷新数据...', 'info');
        this.loadAuditData();
    }

    /**
     * 应用筛选
     */
    applyFilters(filters) {
        console.log('FinancialAuditTable: 应用筛选条件:', filters);
        this.activeFilters = { ...this.activeFilters, ...filters };
        
        let filteredData = [...this.originalData];
        
        // 应用各种筛选条件
        Object.entries(this.activeFilters).forEach(([key, value]) => {
            if (!value) return;
            
            switch (key) {
                case 'status':
                    if (value && value !== 'all') {
                        // 根据筛选标签过滤数据
                        if (value === 'pending') {
                            filteredData = filteredData.filter(item => item.audit_status === '未审核');
                        } else if (value === 'urgent') {
                            // 紧急处理：大额且未审核
                            filteredData = filteredData.filter(item => 
                                parseFloat(item.amount) > 10000 && item.audit_status === '未审核'
                            );
                        } else if (value === 'large') {
                            // 大额订单
                            filteredData = filteredData.filter(item => parseFloat(item.amount) > 10000);
                        } else if (value === 'processed') {
                            // 已处理
                            filteredData = filteredData.filter(item => 
                                item.audit_status === '已到账' || item.audit_status === '未到账'
                            );
                        }
                    }
                    break;
                case 'paymentType':
                    if (value === 'private') {
                        filteredData = filteredData.filter(item => item.business_type === '对私');
                    } else if (value === 'public') {
                        filteredData = filteredData.filter(item => item.business_type === '对公');
                    }
                    break;
                case 'amountRange':
                    if (value === 'small') {
                        filteredData = filteredData.filter(item => parseFloat(item.amount) < 1000);
                    } else if (value === 'medium') {
                        filteredData = filteredData.filter(item => 
                            parseFloat(item.amount) >= 1000 && parseFloat(item.amount) <= 10000
                        );
                    } else if (value === 'large') {
                        filteredData = filteredData.filter(item => parseFloat(item.amount) > 10000);
                    }
                    break;
                case 'dateRange':
                    if (value === 'today') {
                        const today = new Date().toDateString();
                        filteredData = filteredData.filter(item => 
                            new Date(item.created_time).toDateString() === today
                        );
                    } else if (value === 'yesterday') {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        filteredData = filteredData.filter(item => 
                            new Date(item.created_time).toDateString() === yesterday.toDateString()
                        );
                    } else if (value === 'week') {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        filteredData = filteredData.filter(item => 
                            new Date(item.created_time) >= weekAgo
                        );
                    }
                    break;
            }
        });
        
        this.filteredData = filteredData;
        this.currentData = filteredData;
        
        // 重新渲染当前视图
        if (this.currentView === 'table') {
            this.renderTableData(this.currentData);
        } else {
            this.renderCardsData(this.currentData);
        }
        
        console.log(`FinancialAuditTable: 筛选结果 ${this.currentData.length} 条记录`);
        
        // 返回筛选统计信息
        return {
            total: this.originalData.length,
            filtered: this.currentData.length,
            pending: this.currentData.filter(item => item.audit_status === '未审核').length,
            urgent: this.currentData.filter(item => 
                parseFloat(item.amount) > 10000 && item.audit_status === '未审核'
            ).length,
            large: this.currentData.filter(item => parseFloat(item.amount) > 10000).length
        };
    }

    /**
     * 获取当前筛选后的数据（用于导出）
     */
    getCurrentFilteredData() {
        return this.currentData || [];
    }

    /**
     * 获取所有原始数据（用于导出）
     */
    getAllData() {
        return this.originalData || [];
    }

    /**
     * 文本截断函数
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    /**
     * 设置内容查看和复制交互功能
     */
    setupContentInteraction() {
        const copyableCells = document.querySelectorAll('.copyable-cell');
        const expandableCells = document.querySelectorAll('.expandable-cell');
        
        copyableCells.forEach(cell => {
            // 悬停显示完整内容
            cell.addEventListener('mouseenter', this.showTooltip.bind(this));
            cell.addEventListener('mouseleave', this.hideTooltip.bind(this));
            
            // 双击复制完整内容
            cell.addEventListener('dblclick', this.copyToClipboard.bind(this));
            
            // 右键菜单
            cell.addEventListener('contextmenu', this.showContextMenu.bind(this));
        });

        // 为可展开单元格添加点击展开功能（触摸屏友好）
        expandableCells.forEach(cell => {
            cell.addEventListener('click', this.toggleCellExpansion.bind(this));
            cell.style.cursor = 'pointer';
        });

        // 点击其他地方隐藏上下文菜单和收缩展开的单元格
        document.addEventListener('click', (e) => {
            this.hideContextMenu();
            // 收缩所有展开的单元格（除非点击的就是可展开单元格）
            if (!e.target.classList.contains('expandable-cell')) {
                this.collapseAllExpandedCells();
            }
        });
        
        console.log(`FinancialAuditTable: 已设置 ${copyableCells.length} 个可复制单元格，${expandableCells.length} 个可展开单元格的交互功能`);
    }

    /**
     * 显示tooltip
     */
    showTooltip(event) {
        const cell = event.target;
        const fullContent = cell.getAttribute('data-full-content');
        const displayContent = cell.getAttribute('data-display-content') || cell.textContent.trim();
        
        // 只有内容被截断或需要完整显示时才显示tooltip
        if (!fullContent || fullContent === displayContent) {
            return;
        }
        
        // 移除已存在的tooltip
        this.hideTooltip();
        
        // 创建tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'cell-tooltip show';
        tooltip.textContent = fullContent;
        tooltip.id = 'active-tooltip';
        
        // 添加到页面
        document.body.appendChild(tooltip);
        
        // 确保tooltip显示
        tooltip.style.cssText = `
            position: fixed;
            background: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 400;
            white-space: nowrap;
            max-width: 300px;
            word-wrap: break-word;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            opacity: 1;
            visibility: visible;
            pointer-events: none;
        `;
        
        // 计算位置
        const cellRect = cell.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = cellRect.left + (cellRect.width - tooltipRect.width) / 2;
        let top = cellRect.top - tooltipRect.height - 10;
        
        // 边界检查
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = cellRect.bottom + 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    /**
     * 隐藏tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('active-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(event) {
        event.preventDefault();
        
        const cell = event.target;
        const fullContent = cell.getAttribute('data-full-content');
        
        if (!fullContent) return;
        
        try {
            await navigator.clipboard.writeText(fullContent);
            this.showCopySuccess(`已复制: ${this.truncateText(fullContent, 20)}`);
        } catch (err) {
            // 备用方法
            const textArea = document.createElement('textarea');
            textArea.value = fullContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showCopySuccess(`已复制: ${this.truncateText(fullContent, 20)}`);
        }
    }

    /**
     * 显示右键菜单
     */
    showContextMenu(event) {
        event.preventDefault();
        
        const cell = event.target;
        const fullContent = cell.getAttribute('data-full-content');
        
        if (!fullContent) return;
        
        // 移除已存在的菜单
        this.hideContextMenu();
        
        // 创建右键菜单
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'active-context-menu';
        
        menu.innerHTML = `
            <div class="context-menu-item" data-action="copy" data-content="${fullContent}">
                <span class="menu-icon">📋</span>
                <span>复制完整内容</span>
            </div>
            <div class="context-menu-item" data-action="view" data-content="${fullContent}">
                <span class="menu-icon">👁️</span>
                <span>查看完整内容</span>
            </div>
        `;
        
        // 添加点击事件
        menu.addEventListener('click', this.handleContextMenuClick.bind(this));
        
        // 添加到页面
        document.body.appendChild(menu);
        
        // 计算位置
        let left = event.clientX;
        let top = event.clientY;
        
        // 边界检查
        const menuRect = menu.getBoundingClientRect();
        if (left + menuRect.width > window.innerWidth) {
            left = window.innerWidth - menuRect.width - 10;
        }
        if (top + menuRect.height > window.innerHeight) {
            top = window.innerHeight - menuRect.height - 10;
        }
        
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        
        // 显示动画
        setTimeout(() => menu.classList.add('show'), 10);
    }

    /**
     * 处理右键菜单点击
     */
    async handleContextMenuClick(event) {
        event.stopPropagation();
        
        const menuItem = event.target.closest('.context-menu-item');
        if (!menuItem) return;
        
        const action = menuItem.getAttribute('data-action');
        const content = menuItem.getAttribute('data-content');
        
        if (action === 'copy') {
            try {
                await navigator.clipboard.writeText(content);
                this.showCopySuccess(`已复制: ${this.truncateText(content, 20)}`);
            } catch (err) {
                // 备用复制方法
                const textArea = document.createElement('textarea');
                textArea.value = content;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showCopySuccess(`已复制: ${this.truncateText(content, 20)}`);
            }
        } else if (action === 'view') {
            this.showContentModal(content);
        }
        
        this.hideContextMenu();
    }

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        const menu = document.getElementById('active-context-menu');
        if (menu) {
            menu.remove();
        }
    }

    /**
     * 显示复制成功提示
     */
    showCopySuccess(message) {
        // 移除已存在的提示
        const existing = document.querySelector('.copy-success');
        if (existing) existing.remove();
        
        // 创建成功提示
        const success = document.createElement('div');
        success.className = 'copy-success';
        success.textContent = message;
        
        document.body.appendChild(success);
        
        // 显示动画
        setTimeout(() => success.classList.add('show'), 10);
        
        // 自动隐藏
        setTimeout(() => {
            success.classList.remove('show');
            setTimeout(() => {
                if (success.parentNode) {
                    success.remove();
                }
            }, 300);
        }, 2000);
    }

    /**
     * 点击展开/收缩单元格内容（触摸屏友好）
     */
    toggleCellExpansion(event) {
        event.stopPropagation();
        
        const cell = event.target;
        const isExpanded = cell.classList.contains('expanded');
        
        // 先收缩所有其他展开的单元格
        this.collapseAllExpandedCells();
        
        if (!isExpanded) {
            this.expandCell(cell);
        }
    }

    /**
     * 展开单元格
     */
    expandCell(cell) {
        const fullContent = cell.getAttribute('data-full-content');
        if (!fullContent) return;
        
        const displayContent = cell.getAttribute('data-display-content') || cell.textContent.trim();
        
        // 只有被截断的内容才需要展开
        if (fullContent === displayContent) return;
        
        // 保存原始内容
        cell.setAttribute('data-original-content', cell.textContent);
        
        // 显示完整内容
        cell.textContent = fullContent;
        cell.classList.add('expanded');
        
        // 添加视觉效果
        cell.style.background = 'rgba(59, 130, 246, 0.1)';
        cell.style.padding = '8px';
        cell.style.borderRadius = '4px';
        cell.style.fontWeight = '500';
    }

    /**
     * 收缩单元格
     */
    collapseCell(cell) {
        const originalContent = cell.getAttribute('data-original-content');
        const displayContent = cell.getAttribute('data-display-content');
        
        if (originalContent || displayContent) {
            cell.textContent = displayContent || originalContent;
            cell.classList.remove('expanded');
            
            // 移除视觉效果
            cell.style.background = '';
            cell.style.padding = '';
            cell.style.borderRadius = '';
            cell.style.fontWeight = '';
        }
    }

    /**
     * 收缩所有展开的单元格
     */
    collapseAllExpandedCells() {
        const expandedCells = document.querySelectorAll('.expandable-cell.expanded');
        expandedCells.forEach(cell => this.collapseCell(cell));
    }

    /**
     * 显示内容查看模态窗口
     */
    showContentModal(content) {
        // 创建模态窗口
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 8px;
            max-width: 500px;
            max-height: 300px;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">完整内容</h3>
            <div style="font-size: 14px; color: #6b7280; line-height: 1.5; word-break: break-all;">${content}</div>
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="this.closest('.modal').remove()" style="
                    padding: 8px 16px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;
        
        modal.className = 'modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// 模态框管理函数 - 复用数据报表页面的标准函数
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function showExportAuditModal() {
    showModal('exportAuditModal');
}

function closeExportAuditModal() {
    hideModal('exportAuditModal');
}

// 处理导出功能
function handleAuditExport() {
    const formatRadios = document.querySelectorAll('input[name="auditFormat"]');
    const contentCheckboxes = document.querySelectorAll('#exportAuditModal input[type="checkbox"]');
    const rangeRadios = document.querySelectorAll('input[name="dataRange"]');
    
    let selectedFormat = 'pdf';
    let selectedContent = [];
    let selectedRange = 'current';
    
    // 获取选择的格式
    formatRadios.forEach(radio => {
        if (radio.checked) {
            selectedFormat = radio.value;
        }
    });
    
    // 获取选择的内容
    contentCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const label = checkbox.closest('label').textContent.trim();
            selectedContent.push(label);
        }
    });
    
    // 获取数据范围
    rangeRadios.forEach(radio => {
        if (radio.checked) {
            selectedRange = radio.value;
        }
    });
    
    console.log('导出配置:', {
        format: selectedFormat,
        content: selectedContent,
        range: selectedRange
    });
    
    // 获取当前筛选的数据
    const currentData = selectedRange === 'current' ? 
        window.financialAuditTable?.getCurrentFilteredData() : 
        window.financialAuditTable?.getAllData();
    
    if (!currentData || currentData.length === 0) {
        alert('没有可导出的数据');
        return;
    }
    
    // 显示导出进度
    const exportBtn = document.getElementById('confirmAuditExportBtn');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span class="btn__icon">⏳</span>正在导出...';
    exportBtn.disabled = true;
    
    // 模拟导出过程
    setTimeout(() => {
        if (selectedFormat === 'excel') {
            exportToExcel(currentData, selectedContent);
        } else if (selectedFormat === 'csv') {
            exportToCSV(currentData, selectedContent);
        } else {
            exportToPDF(currentData, selectedContent);
        }
        
        // 恢复按钮状态
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        
        // 关闭模态窗口
        closeExportAuditModal();
        
        // 显示成功提示
        alert(`${selectedFormat.toUpperCase()}格式的审核报表正在生成中，请稍后查看下载...`);
    }, 2000);
}

// 导出为Excel格式
function exportToExcel(data, selectedContent) {
    console.log('导出Excel格式，数据条数:', data.length, '包含内容:', selectedContent);
    // 这里可以集成真正的Excel导出库，如SheetJS
}

// 导出为CSV格式
function exportToCSV(data, selectedContent) {
    console.log('导出CSV格式，数据条数:', data.length, '包含内容:', selectedContent);
    
    // 构建CSV内容
    const headers = ['序号', '订单号', '银行凭证号', '交易金额', '商户名称', '付款账户名称', '付款账号', '收款账户名称', '收款账号', '业务类别', '状态', '审核', '创建时间', '成功时间'];
    const csvContent = [headers.join(',')];
    
    data.forEach((item, index) => {
        const row = [
            index + 1,
            item.order_id,
            item.voucher_number,
            item.amount,
            item.merchant_name,
            item.payer_account_name,
            item.payer_account_number,
            item.receiver_account_name,
            item.receiver_account_number,
            item.business_type,
            item.status,
            item.audit_status,
            item.created_at,
            item.success_at || ''
        ];
        csvContent.push(row.join(','));
    });
    
    // 创建下载链接
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `财务审核报表_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 导出为PDF格式
function exportToPDF(data, selectedContent) {
    console.log('导出PDF格式，数据条数:', data.length, '包含内容:', selectedContent);
    // 这里可以集成PDF生成库，如jsPDF
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('financialAuditTable')) {
        window.financialAuditTable = new FinancialAuditTable();
        console.log('FinancialAuditTable 全局实例已创建');
    }
    
    // 绑定导出按钮事件
    const exportBtn = document.getElementById('exportAuditReportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportAuditModal);
    }
    
    // 绑定确认导出按钮事件
    const confirmExportBtn = document.getElementById('confirmAuditExportBtn');
    if (confirmExportBtn) {
        confirmExportBtn.addEventListener('click', handleAuditExport);
    }
    
    // 绑定模态窗口关闭事件 - 与数据报表页面保持一致
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-enhanced')) {
            const modalId = e.target.id;
            hideModal(modalId);
        }
    });
    
    // 绑定关闭按钮事件 - 与数据报表页面保持一致
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-enhanced');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
});

// 暴露给全局使用
window.FinancialAuditTable = FinancialAuditTable;