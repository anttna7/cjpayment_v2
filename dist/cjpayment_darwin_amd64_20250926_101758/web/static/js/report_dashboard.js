/**
 * Report Dashboard Enhanced - 增强版报表仪表板
 * 提供完整的数据报表管理功能
 */

class ReportDashboard {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/reports',
            enableRealTime: true,
            autoRefresh: 60000,
            enableAdvancedAnalytics: true,
            ...options
        };

        this.state = {
            data: null,
            filters: {},
            sortBy: 'created_at',
            sortOrder: 'desc',
            currentPage: 1,
            pageSize: 50
        };

        this.charts = {};
        this.performanceMetrics = {
            startTime: performance.now(),
            loadingPhases: {}
        };
        
        this.init();
    }

    /**
     * 初始化仪表板
     */
    init() {
        console.log('Initializing Report Dashboard...');
        this.initializeElements();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupAutoRefresh();
        console.log('Report Dashboard initialized successfully');
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.elements = {
            // KPI元素
            totalAmount: document.getElementById('totalAmount'),
            totalTransactions: document.getElementById('totalTransactions'),
            successRate: document.getElementById('successRate'),
            activeMerchants: document.getElementById('activeMerchants'),
            failedTransactions: document.getElementById('failedTransactions'),

            // 图表容器
            trendChart: document.getElementById('trendChart'),
            multidimChart: document.getElementById('multidimChart'),
            merchantChart: document.getElementById('merchantChart'),
            heatmapChart: document.getElementById('heatmapChart'),
            funnelChart: document.getElementById('funnelChart'),
            geoChart: document.getElementById('geoChart'),

            // 控制元素
            refreshBtn: document.getElementById('refreshReportBtn'),
            exportBtn: document.getElementById('exportReportBtn'),
            subscribeBtn: document.getElementById('subscribeReportBtn'),

            // 表格元素
            dataTable: document.getElementById('dataTable'),
            tableBody: document.getElementById('tableBody'),
            tableSearch: document.getElementById('tableSearch')
        };
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 刷新按钮
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // 导出按钮
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.showExportModal());
        }

        // 订阅按钮
        if (this.elements.subscribeBtn) {
            this.elements.subscribeBtn.addEventListener('click', () => this.showSubscriptionModal());
        }
        
        // 高级筛选
        const toggleAdvancedFilters = document.getElementById('toggleAdvancedFilters');
        const advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
        const applyAdvancedFilters = document.getElementById('applyAdvancedFilters');
        const resetAdvancedFilters = document.getElementById('resetAdvancedFilters');
        
        if (toggleAdvancedFilters && advancedFiltersPanel) {
            toggleAdvancedFilters.addEventListener('click', () => {
                this.toggleAdvancedFilters();
            });
        }
        
        if (applyAdvancedFilters) {
            applyAdvancedFilters.addEventListener('click', () => {
                this.applyAdvancedFilters();
            });
        }
        
        if (resetAdvancedFilters) {
            resetAdvancedFilters.addEventListener('click', () => {
                this.resetAdvancedFilters();
            });
        }

        // 搜索框
        if (this.elements.tableSearch) {
            this.elements.tableSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 时间预设按钮
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleTimePreset(e.target.dataset.range);
            });
        });

        // 图表标签页
        document.querySelectorAll('.chart-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchChartTab(e.target.dataset.tab);
            });
        });
        
        // 分析标签页
        document.querySelectorAll('.analysis-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalysisTab(e.target.dataset.tab);
            });
        });
    }

    /**
     * 加载初始数据
     */
    async loadInitialData() {
        try {
            this.showLoading();
            
            // 检查缓存
            const cached = this.getCachedData();
            if (cached && this.isCacheValid(cached.timestamp)) {
                console.log('Using cached data');
                this.processData(cached.data);
                this.hideLoading();
                return;
            }
            
            // 分步加载以提高性能
            await this.loadDataProgressive();
            
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('数据加载失败，请刷新页面重试');
            this.hideLoading();
        }
    }

    /**
     * 渐进式数据加载
     */
    async loadDataProgressive() {
        this.performanceMetrics.loadingPhases.start = performance.now();
        
        // 第一步：加载KPI数据（优先级最高）
        const kpiStart = performance.now();
        const kpiData = await this.fetchKPIData();
        this.updateKPIs(kpiData);
        this.performanceMetrics.loadingPhases.kpi = performance.now() - kpiStart;
        console.log(`KPI数据加载完成: ${this.performanceMetrics.loadingPhases.kpi.toFixed(2)}ms`);
        
        // 第二步：延迟加载图表数据
        setTimeout(async () => {
            const chartStart = performance.now();
            const chartData = await this.fetchChartData();
            this.initializeCharts(chartData);
            this.performanceMetrics.loadingPhases.charts = performance.now() - chartStart;
            console.log(`图表数据加载完成: ${this.performanceMetrics.loadingPhases.charts.toFixed(2)}ms`);
        }, 100);
        
        // 第三步：延迟加载高级数据表
        setTimeout(async () => {
            const tableStart = performance.now();
            await this.loadAdvancedTableData();
            this.performanceMetrics.loadingPhases.table = performance.now() - tableStart;
            console.log(`高级数据表加载完成: ${this.performanceMetrics.loadingPhases.table.toFixed(2)}ms`);
        }, 300);
        
        // 第三步：延迟加载表格数据
        setTimeout(async () => {
            const tableStart = performance.now();
            const tableData = await this.fetchTableData();
            this.renderDataTable(tableData);
            this.performanceMetrics.loadingPhases.table = performance.now() - tableStart;
            console.log(`表格数据加载完成: ${this.performanceMetrics.loadingPhases.table.toFixed(2)}ms`);
            
            // 计算总加载时间
            const totalTime = performance.now() - this.performanceMetrics.startTime;
            console.log(`报表页面总加载时间: ${totalTime.toFixed(2)}ms`);
        }, 300);
        
        // 缓存数据（异步操作，不阻塞UI）
        setTimeout(async () => {
            const allData = {
                kpis: kpiData,
                charts: await this.fetchChartData(),
                transactions: await this.fetchTableData()
            };
            this.setCachedData(allData);
        }, 500);
    }

    /**
     * 处理数据
     */
    processData(data) {
        this.updateKPIs(data.kpis);
        this.initializeCharts(data.charts);
        this.renderDataTable(data.transactions);
    }

    /**
     * 缓存管理
     */
    getCachedData() {
        try {
            const cached = localStorage.getItem('report_data_cache');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('Failed to read cache:', error);
            return null;
        }
    }

    setCachedData(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem('report_data_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to write cache:', error);
        }
    }

    isCacheValid(timestamp) {
        const CACHE_DURATION = 5 * 60 * 1000; // 5分钟
        return (Date.now() - timestamp) < CACHE_DURATION;
    }

    /**
     * 获取KPI数据（快速加载）
     */
    async fetchKPIData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    totalAmount: 2856742.30,
                    totalTransactions: 1247,
                    successRate: 98.7,
                    activeMerchants: 128,
                    failedTransactions: 16
                });
            }, 50); // 极快加载
        });
    }

    /**
     * 获取图表数据
     */
    async fetchChartData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    trend: this.generateTrendData(),
                    multidim: this.generateMultidimData(),
                    merchant: this.generateMerchantData()
                });
            }, 200); // 中等速度
        });
    }

    /**
     * 获取表格数据
     */
    async fetchTableData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.generateTransactionData());
            }, 300); // 较慢加载
        });
    }

    /**
     * 获取报表数据（兼容性保留）
     */
    async fetchReportData() {
        const [kpis, charts, transactions] = await Promise.all([
            this.fetchKPIData(),
            this.fetchChartData(),
            this.fetchTableData()
        ]);
        
        return {
            kpis,
            charts,
            transactions
        };
    }

    /**
     * 更新KPI显示
     */
    updateKPIs(kpis) {
        if (this.elements.totalAmount) {
            this.elements.totalAmount.textContent = `¥${kpis.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
        }
        if (this.elements.totalTransactions) {
            this.elements.totalTransactions.textContent = kpis.totalTransactions;
        }
        if (this.elements.successRate) {
            this.elements.successRate.textContent = `${kpis.successRate}%`;
        }
        if (this.elements.activeMerchants) {
            this.elements.activeMerchants.textContent = kpis.activeMerchants;
        }
        if (this.elements.failedTransactions) {
            this.elements.failedTransactions.textContent = kpis.failedTransactions;
        }
    }

    /**
     * 初始化图表
     */
    initializeCharts(chartData) {
        // 趋势图表
        this.initTrendChart(chartData.trend);
        
        // 多维分析图表
        this.initMultidimChart(chartData.multidim);
        
        // 商户排行图表
        this.initMerchantChart(chartData.merchant);
        
        // 热力图
        this.initHeatmapChart();
        
        // 漏斗图
        this.initFunnelChart();
        
        // 智能分析模块
        this.initAdvancedAnalytics();
        
        // 添加样式
        this.addAnalyticsStyles();
    }

    /**
     * 初始化趋势图表
     */
    initTrendChart(data) {
        if (!this.elements.trendChart || !window.Chart) return;

        const ctx = this.elements.trendChart.getContext('2d');
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '交易金额',
                    data: data.amounts,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }, {
                    label: '交易笔数',
                    data: data.counts,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '交易趋势分析'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    /**
     * 初始化多维分析图表
     */
    initMultidimChart(data) {
        if (!this.elements.multidimChart || !window.Chart) return;

        const ctx = this.elements.multidimChart.getContext('2d');
        this.charts.multidim = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '支付方式分布'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * 初始化商户排行图表
     */
    initMerchantChart(data) {
        if (!this.elements.merchantChart || !window.Chart) return;

        const ctx = this.elements.merchantChart.getContext('2d');
        this.charts.merchant = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '交易金额',
                    data: data.amounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 商户排行'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * 初始化热力图
     */
    initHeatmapChart() {
        const container = this.elements.heatmapChart;
        if (!container) return;

        // 创建时段活跃度热力图
        const heatmapData = this.generateHeatmapData();
        let html = '<div class="heatmap-grid">';
        
        // 按小时(x轴)×星期(y轴)布局
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const value = heatmapData[day][hour];
                const intensity = Math.min(value / 150, 1); // 调整强度计算
                const displayValue = value > 50 ? Math.floor(value / 10) : ''; // 只在高活跃度时显示数值
                
                html += `<div class="heatmap-cell" 
                         style="opacity: ${Math.max(0.1, intensity)}" 
                         title="${this.getDayName(day)} ${hour}:00-${hour+1}:00\n交易量: ${value}笔\n活跃度: ${Math.round(intensity * 100)}%"
                         data-value="${value}"
                         data-day="${day}"
                         data-hour="${hour}">
                         ${displayValue}
                         </div>`;
            }
        }
        
        html += '</div>';
        
        // 添加坐标轴标签
        html += '<div class="heatmap-labels">';
        html += '<div class="heatmap-hours">';
        for (let i = 0; i < 24; i += 4) {
            html += `<span class="hour-label" style="left: ${(i / 24) * 100}%">${i}:00</span>`;
        }
        html += '</div>';
        html += '<div class="heatmap-days">';
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        dayNames.forEach((day, index) => {
            html += `<span class="day-label" style="top: ${(index / 7) * 100}%">${day}</span>`;
        });
        html += '</div>';
        html += '</div>';
        
        container.innerHTML = html;
        
        // 添加交互事件
        this.addHeatmapInteractions();
    }

    /**
     * 初始化漏斗图
     */
    initFunnelChart() {
        const container = this.elements.funnelChart;
        if (!container) return;

        const funnelData = [
            { label: '访问支付页面', value: 10000, percentage: 100 },
            { label: '开始支付流程', value: 8500, percentage: 85 },
            { label: '输入支付信息', value: 7200, percentage: 72 },
            { label: '确认支付', value: 6800, percentage: 68 },
            { label: '支付成功', value: 6500, percentage: 65 }
        ];

        let html = '<div class="funnel-chart">';
        funnelData.forEach((item, index) => {
            const width = item.percentage;
            html += `
                <div class="funnel-stage" style="width: ${width}%">
                    <div class="stage-content">
                        <div class="stage-label">${item.label}</div>
                        <div class="stage-count">${item.value.toLocaleString()}</div>
                        <div class="stage-percentage">${item.percentage}%</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    /**
     * 渲染数据表格
     */
    renderDataTable(transactions) {
        if (!this.elements.tableBody) return;

        const html = transactions.map(transaction => `
            <tr>
                <td>
                    <span class="order-number">${transaction.orderNumber}</span>
                </td>
                <td>
                    <span class="amount">¥${transaction.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                </td>
                <td>
                    <div class="payer-info">
                        <div class="payer-name">${transaction.payerName}</div>
                    </div>
                </td>
                <td>
                    <span class="merchant-name">${transaction.merchantName}</span>
                </td>
                <td>
                    <span class="status-badge ${transaction.status}">
                        ${this.getStatusText(transaction.status)}
                    </span>
                </td>
                <td>
                    <span class="payment-type">${transaction.paymentType}</span>
                </td>
                <td>
                    <span class="created-time">${this.formatDate(transaction.createdAt)}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="window.reportManager.viewDetails('${transaction.id}')">
                            查看
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.elements.tableBody.innerHTML = html;
    }

    /**
     * 生成模拟数据
     */
    generateTrendData() {
        const labels = [];
        const amounts = [];
        const counts = [];

        for (let i = 23; i >= 0; i--) {
            const date = new Date();
            date.setHours(date.getHours() - i);
            labels.push(date.getHours() + ':00');
            amounts.push(Math.floor(Math.random() * 100000) + 50000);
            counts.push(Math.floor(Math.random() * 50) + 20);
        }

        return { labels, amounts, counts };
    }

    generateMultidimData() {
        return {
            labels: ['支付宝', '微信支付', '银行卡', '现金', '其他'],
            values: [35, 30, 20, 10, 5]
        };
    }

    generateMerchantData() {
        const merchants = ['商户A', '商户B', '商户C', '商户D', '商户E', '商户F', '商户G', '商户H', '商户I', '商户J'];
        const amounts = merchants.map(() => Math.floor(Math.random() * 500000) + 100000);
        
        return {
            labels: merchants,
            amounts: amounts
        };
    }

    generateHeatmapData() {
        const data = [];
        for (let day = 0; day < 7; day++) {
            data[day] = [];
            for (let hour = 0; hour < 24; hour++) {
                data[day][hour] = Math.floor(Math.random() * 150);
            }
        }
        return data;
    }

    addHeatmapInteractions() {
        const container = this.elements.heatmapChart;
        if (!container) return;

        // 热力图单元格点击事件
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('heatmap-cell')) {
                const day = e.target.dataset.day;
                const hour = e.target.dataset.hour;
                const value = e.target.dataset.value;
                const dayName = this.getDayName(day);
                
                // 显示详细信息模态框或工具提示
                this.showHeatmapDetail({
                    day: dayName,
                    hour,
                    value,
                    intensity: Math.round((value / 150) * 100)
                });
            }
        });
    }

    showHeatmapDetail(data) {
        // 创建详细信息显示
        const detail = document.createElement('div');
        detail.className = 'heatmap-detail-popup';
        detail.innerHTML = `
            <div class="popup-content">
                <h4>🔥 ${data.day} ${data.hour}:00-${parseInt(data.hour)+1}:00</h4>
                <p><strong>交易量:</strong> ${data.value} 笔</p>
                <p><strong>活跃度:</strong> ${data.intensity}%</p>
                <button class="close-popup">关闭</button>
            </div>
        `;
        
        document.body.appendChild(detail);
        
        // 关闭按钮事件
        detail.querySelector('.close-popup').onclick = () => {
            document.body.removeChild(detail);
        };
        
        // 3秒后自动关闭
        setTimeout(() => {
            if (document.body.contains(detail)) {
                document.body.removeChild(detail);
            }
        }, 3000);
    }

    generateTransactionData() {
        const transactions = [];
        for (let i = 0; i < 50; i++) {
            transactions.push({
                id: `txn_${i}`,
                orderNumber: `ORD${String(Date.now() + i).slice(-8)}`,
                amount: Math.floor(Math.random() * 50000) + 1000,
                payerName: `用户${i + 1}`,
                merchantName: `商户${(i % 10) + 1}`,
                status: ['success', 'pending', 'failed'][Math.floor(Math.random() * 3)],
                paymentType: ['对公', '对私'][Math.floor(Math.random() * 2)],
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            });
        }
        return transactions;
    }

    /**
     * 工具方法
     */
    getDayName(day) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[day];
    }

    getStatusText(status) {
        const statusMap = {
            'success': '✅ 成功',
            'pending': '⏳ 待处理',
            'failed': '❌ 失败'
        };
        return statusMap[status] || status;
    }

    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN');
    }

    /**
     * 事件处理方法
     */
    refreshData() {
        this.loadInitialData();
        this.showToast('数据已刷新', 'success');
    }

    handleTimePreset(range) {
        // 更新时间范围选择器状态
        document.querySelectorAll('.time-preset').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        // 重新加载数据
        this.loadInitialData();
        this.showToast(`已切换到${this.getRangeText(range)}`, 'info');
    }

    getRangeText(range) {
        const rangeMap = {
            'today': '今天',
            'yesterday': '昨天', 
            'week': '本周',
            'month': '本月',
            'quarter': '本季',
            'custom': '自定义'
        };
        return rangeMap[range] || range;
    }

    handleSearch(query) {
        // 简单的表格搜索过滤
        if (!this.elements.dataTable) return;

        const rows = this.elements.dataTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(query.toLowerCase());
            row.style.display = match ? '' : 'none';
        });
    }

    switchChartTab(tab) {
        // 更新标签页状态
        document.querySelectorAll('.chart-tab').forEach(tabBtn => {
            tabBtn.classList.toggle('active', tabBtn.dataset.tab === tab);
        });

        // 这里可以根据不同标签页切换图表数据
        console.log('Switched to chart tab:', tab);
    }

    viewDetails(transactionId) {
        this.showToast(`查看交易详情: ${transactionId}`, 'info');
    }

    showExportModal() {
        if (typeof showModal === 'function') {
            showModal('exportModal');
        } else {
            const modal = document.getElementById('exportModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }
        }
    }

    showSubscriptionModal() {
        if (typeof showModal === 'function') {
            showModal('subscriptionModal');
        } else {
            const modal = document.getElementById('subscriptionModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }
        }
    }
    
    /**
     * 切换高级筛选面板
     */
    toggleAdvancedFilters() {
        const panel = document.getElementById('advancedFiltersPanel');
        const button = document.getElementById('toggleAdvancedFilters');
        const container = document.getElementById('advancedFilters');
        
        if (panel && button && container) {
            const isVisible = panel.style.display !== 'none';
            
            if (isVisible) {
                panel.style.display = 'none';
                container.classList.remove('active');
            } else {
                panel.style.display = 'block';
                container.classList.add('active');
            }
        }
    }
    
    /**
     * 应用高级筛选
     */
    async applyAdvancedFilters() {
        try {
            // 显示性能指示器
            this.showPerformanceIndicator('正在应用筛选...', 'loading');
            
            const filters = {
                merchantType: document.getElementById('merchantTypeFilter')?.value || '',
                transactionStatus: document.getElementById('transactionStatusFilter')?.value || '',
                amountRange: document.getElementById('amountRangeFilter')?.value || '',
                paymentMethod: document.getElementById('paymentMethodFilter')?.value || ''
            };
            
            // 更新状态
            this.state.filters = { ...this.state.filters, ...filters };
            
            // 重新加载数据
            await this.loadInitialData();
            
            // 关闭筛选面板
            this.toggleAdvancedFilters();
            
            // 显示成功提示
            this.showPerformanceIndicator('筛选应用成功', 'success');
            
        } catch (error) {
            console.error('Failed to apply advanced filters:', error);
            this.showPerformanceIndicator('筛选应用失败', 'error');
        }
    }
    
    /**
     * 重置高级筛选
     */
    async resetAdvancedFilters() {
        try {
            // 重置筛选器表单
            const filterSelects = [
                'merchantTypeFilter',
                'transactionStatusFilter', 
                'amountRangeFilter',
                'paymentMethodFilter'
            ];
            
            filterSelects.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = '';
                }
            });
            
            // 清空筛选状态
            this.state.filters = {};
            
            // 重新加载数据
            await this.loadInitialData();
            
            this.showPerformanceIndicator('筛选已重置', 'success');
            
        } catch (error) {
            console.error('Failed to reset advanced filters:', error);
            this.showPerformanceIndicator('重置失败', 'error');
        }
    }
    
    /**
     * 显示性能指示器
     */
    showPerformanceIndicator(message, type = 'success') {
        // 移除现有指示器
        const existing = document.querySelector('.performance-indicator');
        if (existing) {
            existing.remove();
        }
        
        // 创建新指示器
        const indicator = document.createElement('div');
        indicator.className = `performance-indicator ${type}`;
        indicator.textContent = message;
        
        document.body.appendChild(indicator);
        
        // 显示动画
        setTimeout(() => {
            indicator.classList.add('show');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
        if (this.options.autoRefresh && this.options.autoRefresh > 0) {
            setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.refreshData();
                }
            }, this.options.autoRefresh);
        }
    }

    /**
     * 显示/隐藏加载状态
     */
    showLoading() {
        // 显示加载指示器
        const loadingElements = document.querySelectorAll('.chart-loading');
        loadingElements.forEach(el => el.classList.remove('hidden'));
    }

    hideLoading() {
        // 隐藏加载指示器
        const loadingElements = document.querySelectorAll('.chart-loading');
        loadingElements.forEach(el => el.classList.add('hidden'));
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

    // 添加CSS样式修复
    addAnalyticsStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .analytics-tab-content {
                display: none;
            }
            
            .analytics-tab-content.active {
                display: block;
            }
            
            .prediction-charts {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
                margin-bottom: 2rem;
            }
            
            .prediction-chart {
                background: white;
                border-radius: 8px;
                padding: 1rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .prediction-chart h4 {
                margin: 0 0 1rem 0;
                font-size: 1rem;
                font-weight: 600;
                color: #374151;
            }
            
            .prediction-chart canvas {
                width: 100% !important;
                height: 200px !important;
            }
            
            .prediction-insights {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            
            .insight-card {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 1rem;
                background: white;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .insight-icon {
                font-size: 1.5rem;
                margin-top: 0.25rem;
            }
            
            .insight-title {
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 0.25rem;
            }
            
            .insight-description {
                color: #6b7280;
                font-size: 0.875rem;
                line-height: 1.4;
            }
            
            .correlation-table {
                overflow-x: auto;
            }
            
            .matrix-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .matrix-table th,
            .matrix-table td {
                padding: 0.75rem;
                text-align: center;
                border: 1px solid #e5e7eb;
            }
            
            .matrix-table th {
                background: #f3f4f6;
                font-weight: 600;
                color: #374151;
            }
            
            .matrix-cell.positive {
                background-color: rgba(34, 197, 94, 0.1);
                color: #059669;
            }
            
            .matrix-cell.negative {
                background-color: rgba(239, 68, 68, 0.1);
                color: #dc2626;
            }
            
            .anomaly-detection {
                margin-bottom: 2rem;
            }
            
            .anomaly-alerts {
                background: white;
                border-radius: 8px;
                padding: 1rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .alert-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .alert-item:last-child {
                border-bottom: none;
            }
            
            .alert-severity {
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .alert-severity.high {
                background: #fee2e2;
                color: #dc2626;
            }
            
            .alert-severity.medium {
                background: #fef3c7;
                color: #d97706;
            }
            
            .alert-message {
                flex: 1;
                color: #374151;
            }
            
            .alert-time {
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            @media (max-width: 768px) {
                .prediction-charts {
                    grid-template-columns: 1fr;
                }
                
                .prediction-insights {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 加载高级数据表数据
     */
    async loadAdvancedTableData() {
        const tableBody = document.getElementById('advancedTableBody');
        if (!tableBody) return;

        try {
            // 显示加载进度
            this.updateLoadingProgress('正在获取交易记录...');
            
            // 模拟数据加载延迟
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 生成模拟交易数据
            const mockData = this.generateMockTransactionData();
            
            // 渲染表格数据
            this.renderAdvancedTableData(mockData);
            
            // 更新统计信息
            this.updateTableStats(mockData);
            
        } catch (error) {
            console.error('Failed to load advanced table data:', error);
            this.showTableError();
        }
    }

    /**
     * 生成模拟交易数据
     */
    generateMockTransactionData() {
        const mockData = [];
        const statuses = ['success', 'failed', 'pending'];
        const paymentTypes = ['对公转账', '对私转账'];
        const merchants = ['商户A', '商户B', '商户C', '电商平台D', '科技公司E'];
        
        for (let i = 1; i <= 50; i++) {
            const amount = Math.random() * 100000 + 1000;
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const processingTime = Math.random() * 300 + 10;
            
            mockData.push({
                id: `TXN${String(i).padStart(6, '0')}`,
                orderNumber: `ORD${Date.now()}${i}`,
                amount: amount,
                payerName: `用户${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${i}`,
                merchantName: merchants[Math.floor(Math.random() * merchants.length)],
                status: status,
                paymentType: paymentTypes[Math.floor(Math.random() * paymentTypes.length)],
                processingTime: processingTime,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString()
            });
        }
        
        return mockData;
    }

    /**
     * 渲染高级数据表数据
     */
    renderAdvancedTableData(data) {
        const tableBody = document.getElementById('advancedTableBody');
        if (!tableBody) return;

        const html = data.map(row => `
            <tr class="table-row" data-id="${row.id}">
                <td class="col-select">
                    <input type="checkbox" class="row-checkbox" value="${row.id}">
                </td>
                <td class="col-order-number">
                    <span class="order-number-link">${row.orderNumber}</span>
                </td>
                <td class="col-amount">
                    <span class="amount-value ${row.amount > 50000 ? 'high-amount' : ''}">
                        ¥${row.amount.toLocaleString()}
                    </span>
                </td>
                <td class="col-payer">${row.payerName}</td>
                <td class="col-merchant">${row.merchantName}</td>
                <td class="col-status">
                    <span class="status-badge status-${row.status}">
                        <span class="status-indicator"></span>
                        ${row.status === 'success' ? '成功' : 
                          row.status === 'failed' ? '失败' : '待处理'}
                    </span>
                </td>
                <td class="col-payment-type">${row.paymentType}</td>
                <td class="col-processing-time">
                    <span class="processing-time ${row.processingTime > 60 ? 'slow' : 'fast'}">
                        ${row.processingTime.toFixed(1)}秒
                    </span>
                </td>
                <td class="col-created-at">${row.createdAt}</td>
                <td class="col-actions">
                    <div class="action-buttons">
                        <button class="action-btn view-details" data-id="${row.id}" title="查看详情">
                            👁️
                        </button>
                        <button class="action-btn export-record" data-id="${row.id}" title="导出">
                            📤
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tableBody.innerHTML = html;
        
        // 添加事件监听
        this.attachTableEventListeners();
    }

    /**
     * 更新加载进度
     */
    updateLoadingProgress(message) {
        const progressElement = document.getElementById('loadingProgress');
        if (progressElement) {
            progressElement.textContent = message;
        }
    }

    /**
     * 更新表格统计信息
     */
    updateTableStats(data) {
        const visibleCount = document.getElementById('visibleRecordsCount');
        const totalCount = document.getElementById('totalRecordsCount');
        
        if (visibleCount) visibleCount.textContent = data.length;
        if (totalCount) totalCount.textContent = data.length;
    }

    /**
     * 显示表格错误
     */
    showTableError() {
        const tableBody = document.getElementById('advancedTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="10" class="error-cell">
                    <div class="error-content">
                        <div class="error-icon">❌</div>
                        <div class="error-message">
                            <h4>数据加载失败</h4>
                            <p>无法获取交易数据，请检查网络连接或稍后重试</p>
                        </div>
                        <button class="btn-retry" onclick="window.reportDashboard.loadAdvancedTableData()">
                            🔄 重新加载
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * 添加表格事件监听
     */
    attachTableEventListeners() {
        const tableBody = document.getElementById('advancedTableBody');
        if (!tableBody) return;

        // 详情按钮事件
        tableBody.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.target.getAttribute('data-id');
                this.showTransactionDetails(recordId);
            });
        });

        // 导出按钮事件
        tableBody.querySelectorAll('.export-record').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.target.getAttribute('data-id');
                this.exportSingleRecord(recordId);
            });
        });

        // 行点击选择
        tableBody.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('.action-btn')) {
                    const checkbox = row.querySelector('.row-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        row.classList.toggle('selected', checkbox.checked);
                    }
                }
            });
        });
    }

    /**
     * 显示交易详情
     */
    showTransactionDetails(recordId) {
        // 这里可以实现详情模态框
        alert(`查看交易详情：${recordId}`);
    }

    /**
     * 初始化高级分析功能
     */
    initAdvancedAnalytics() {
        try {
            console.log('Initializing Advanced Analytics...');
            
            // 检查必要的依赖
            if (!this.state.data) {
                console.warn('Advanced Analytics: No data available');
                return;
            }
            
            // 初始化预测分析
            this.initPredictiveAnalysis();
            
            // 初始化智能洞察
            this.initIntelligentInsights();
            
            // 初始化相关性分析
            this.initCorrelationAnalysis();
            
            console.log('Advanced Analytics initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Advanced Analytics:', error);
            this.showError('高级分析功能初始化失败');
        }
    }

    /**
     * 初始化预测分析
     */
    initPredictiveAnalysis() {
        // 简化的预测分析实现
        const predictionContainer = document.querySelector('.prediction-charts');
        if (!predictionContainer) return;

        // 生成趋势预测数据
        const trendData = this.generateTrendPrediction();
        
        // 如果没有数据就跳过
        if (!trendData || trendData.length === 0) {
            console.log('No trend data available for prediction');
            return;
        }
        
        console.log('Predictive analysis initialized');
    }

    /**
     * 初始化智能洞察
     */
    initIntelligentInsights() {
        const insightsContainer = document.querySelector('.prediction-insights');
        if (!insightsContainer || !this.state.data) return;

        // 生成智能洞察
        const insights = this.generateInsights();
        console.log('Generated insights:', insights.length);
    }

    /**
     * 初始化相关性分析
     */
    initCorrelationAnalysis() {
        const correlationContainer = document.querySelector('.correlation-table');
        if (!correlationContainer || !this.state.data) return;

        console.log('Correlation analysis initialized');
    }

    /**
     * 生成趋势预测数据
     */
    generateTrendPrediction() {
        if (!this.state.data || !this.state.data.transactions) return [];
        
        // 简单的趋势预测逻辑
        return this.state.data.transactions.slice(0, 7); // 取前7天数据作为示例
    }

    /**
     * 生成智能洞察
     */
    generateInsights() {
        if (!this.state.data) return [];
        
        const insights = [];
        
        // 添加基础洞察
        insights.push({
            title: '交易趋势分析',
            description: '基于当前数据的智能分析结果',
            icon: '📊'
        });
        
        return insights;
    }

    /**
     * 导出单条记录
     */
    exportSingleRecord(recordId) {
        // 这里可以实现单条记录导出
        alert(`导出记录：${recordId}`);
    }
}

// 导出到全局
window.ReportDashboard = ReportDashboard;

// 模块导出支持
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportDashboard;
}