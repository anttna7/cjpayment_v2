// 数据报表管理系统
class DataReportsManager {
    constructor() {
        this.trendChart = null;
        this.paymentTypeChart = null;
        this.currentDateRange = this.getDefaultDateRange();
        
        this.initEventListeners();
        this.loadReportData();
    }
    
    initEventListeners() {
        // 刷新数据按钮
        document.getElementById('refreshDataBtn').addEventListener('click', () => this.loadReportData());
        
        // 快速日期选择
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setQuickDate(parseInt(e.target.dataset.days)));
        });
        
        // 导出按钮
        document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportData('excel'));
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportData('pdf'));
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportData('csv'));
        
        // 日期变化监听
        document.getElementById('startDate').addEventListener('change', () => this.updateDateRange());
        document.getElementById('endDate').addEventListener('change', () => this.updateDateRange());
    }
    
    getDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        // 设置输入框默认值
        document.getElementById('endDate').value = this.formatDate(endDate);
        document.getElementById('startDate').value = this.formatDate(startDate);
        
        return {
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate)
        };
    }
    
    setQuickDate(days) {
        const endDate = new Date();
        const startDate = new Date();
        
        if (days === 1) {
            startDate.setDate(startDate.getDate());
        } else {
            startDate.setDate(startDate.getDate() - days + 1);
        }
        
        document.getElementById('startDate').value = this.formatDate(startDate);
        document.getElementById('endDate').value = this.formatDate(endDate);
        
        // 更新按钮样式
        document.querySelectorAll('.quick-date-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.updateDateRange();
        this.loadReportData();
    }
    
    updateDateRange() {
        this.currentDateRange = {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        };
    }
    
    async loadReportData() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.loadOverviewData(),
                this.loadChartData(),
                this.loadTableData(),
                this.loadLinkStats()
            ]);
        } catch (error) {
            console.error('加载报表数据失败:', error);
            this.showError('数据加载失败，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadOverviewData() {
        try {
            const params = new URLSearchParams({
                start_date: this.currentDateRange.startDate,
                end_date: this.currentDateRange.endDate
            });
            
            const response = await fetch(`/api/reports/overview?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderOverviewData(data.data);
            }
        } catch (error) {
            console.error('加载概览数据失败:', error);
        }
    }
    
    renderOverviewData(data) {
        // 充值概览
        document.getElementById('totalOrders').textContent = data.total_orders || 0;
        document.getElementById('totalAmount').textContent = `¥${(data.total_amount || 0).toLocaleString()}`;
        document.getElementById('avgAmount').textContent = `¥${(data.avg_amount || 0).toLocaleString()}`;
        
        // 成功率分析
        document.getElementById('successOrders').textContent = data.success_orders || 0;
        document.getElementById('successRate').textContent = `${(data.success_rate || 0).toFixed(1)}%`;
        document.getElementById('failedOrders').textContent = data.failed_orders || 0;
        
        // 支付方式分析
        document.getElementById('businessPayments').textContent = data.business_payments || 0;
        document.getElementById('personalPayments').textContent = data.personal_payments || 0;
        document.getElementById('businessRatio').textContent = `${(data.business_ratio || 0).toFixed(1)}%`;
        
        // 增长指标
        this.updateGrowthIndicators(data.growth || {});
    }
    
    updateGrowthIndicators(growth) {
        const rechargeGrowth = document.getElementById('rechargeGrowth');
        const successGrowth = document.getElementById('successGrowth');
        
        if (growth.recharge_growth !== undefined) {
            const growthRate = growth.recharge_growth;
            const icon = growthRate > 0 ? '📈' : growthRate < 0 ? '📉' : '📊';
            const className = growthRate > 0 ? 'growth-up' : growthRate < 0 ? 'growth-down' : 'growth-flat';
            rechargeGrowth.innerHTML = `<span class="${className}">${icon} 较上期${growthRate >= 0 ? '增长' : '下降'} ${Math.abs(growthRate).toFixed(1)}%</span>`;
        }
        
        if (growth.success_rate_change !== undefined) {
            const changeRate = growth.success_rate_change;
            const icon = changeRate > 0 ? '📈' : changeRate < 0 ? '📉' : '📊';
            const status = changeRate > 0 ? '提升' : changeRate < 0 ? '下降' : '稳定';
            successGrowth.innerHTML = `<span>${icon} 成功率${status} ${Math.abs(changeRate).toFixed(1)}%</span>`;
        }
    }
    
    async loadChartData() {
        try {
            const params = new URLSearchParams({
                start_date: this.currentDateRange.startDate,
                end_date: this.currentDateRange.endDate
            });
            
            const response = await fetch(`/api/reports/charts?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderCharts(data.data);
            }
        } catch (error) {
            console.error('加载图表数据失败:', error);
        }
    }
    
    renderCharts(data) {
        // 销毁已存在的图表
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        if (this.paymentTypeChart) {
            this.paymentTypeChart.destroy();
        }
        
        // 创建趋势图表
        this.createTrendChart(data.trend || []);
        
        // 创建支付方式分布图表
        this.createPaymentTypeChart(data.payment_types || {});
    }
    
    createTrendChart(trendData) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.map(item => this.formatDateLabel(item.date)),
                datasets: [{
                    label: '订单数量',
                    data: trendData.map(item => item.orders),
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: '充值金额',
                    data: trendData.map(item => item.amount),
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '订单数量'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '金额 (元)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    createPaymentTypeChart(paymentData) {
        const ctx = document.getElementById('paymentTypeChart').getContext('2d');
        
        this.paymentTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['对公转账', '对私转账'],
                datasets: [{
                    data: [paymentData.business || 0, paymentData.personal || 0],
                    backgroundColor: [
                        '#4299e1',
                        '#38a169'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    async loadTableData() {
        try {
            const params = new URLSearchParams({
                start_date: this.currentDateRange.startDate,
                end_date: this.currentDateRange.endDate
            });
            
            const response = await fetch(`/api/reports/tables?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderTables(data.data);
            }
        } catch (error) {
            console.error('加载表格数据失败:', error);
        }
    }
    
    renderTables(data) {
        // 渲染热门商户排行
        this.renderTopMerchants(data.top_merchants || []);
        
        // 渲染收款账户效率
        this.renderAccountEfficiency(data.account_efficiency || []);
    }
    
    renderTopMerchants(merchants) {
        const tbody = document.getElementById('topMerchantsTable');
        
        if (merchants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #718096;">暂无数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = merchants.map((merchant, index) => {
            const trendClass = merchant.trend > 0 ? 'trend-up' : merchant.trend < 0 ? 'trend-down' : '';
            const trendIcon = merchant.trend > 0 ? '↗' : merchant.trend < 0 ? '↘' : '→';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${merchant.company_name}</td>
                    <td>${merchant.order_count}</td>
                    <td class="amount-cell">¥${merchant.total_amount.toLocaleString()}</td>
                    <td>
                        <span class="trend-indicator ${trendClass}">
                            ${trendIcon} ${Math.abs(merchant.trend || 0).toFixed(1)}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderAccountEfficiency(accounts) {
        const tbody = document.getElementById('accountEfficiencyTable');
        
        if (accounts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #718096;">暂无数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = accounts.map(account => `
            <tr>
                <td>${account.account_name}</td>
                <td>${account.usage_count}</td>
                <td>${account.success_rate.toFixed(1)}%</td>
                <td class="amount-cell">¥${account.total_amount.toLocaleString()}</td>
            </tr>
        `).join('');
    }
    
    async loadLinkStats() {
        try {
            const response = await fetch('/api/reports/link-stats');
            const data = await response.json();
            
            if (data.success) {
                this.renderLinkStats(data.data || []);
            }
        } catch (error) {
            console.error('加载链接统计失败:', error);
        }
    }
    
    renderLinkStats(linkStats) {
        const grid = document.getElementById('linkStatsGrid');
        
        if (linkStats.length === 0) {
            grid.innerHTML = '<div style="text-align: center; color: #718096; grid-column: 1 / -1;">暂无链接统计数据</div>';
            return;
        }
        
        grid.innerHTML = linkStats.map(link => {
            const conversionRate = link.visit_count > 0 ? ((link.order_count / link.visit_count) * 100).toFixed(1) : 0;
            
            return `
                <div class="link-stat-item">
                    <div class="link-type">${link.link_type === 'general' ? '通用链接' : '专用链接'}</div>
                    <div class="link-name">${link.company_name || '通用充值链接'}</div>
                    <div class="link-metrics">
                        <div class="link-metric">
                            <div class="link-metric-value">${link.visit_count}</div>
                            <div class="link-metric-label">访问量</div>
                        </div>
                        <div class="link-metric">
                            <div class="link-metric-value">${link.order_count}</div>
                            <div class="link-metric-label">订单数</div>
                        </div>
                        <div class="link-metric">
                            <div class="link-metric-value">${conversionRate}%</div>
                            <div class="link-metric-label">转化率</div>
                        </div>
                    </div>
                    <div style="margin-top: 8px; text-align: center; color: #38a169; font-weight: 600;">
                        ¥${link.success_amount.toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async exportData(format) {
        try {
            const params = new URLSearchParams({
                format: format,
                start_date: this.currentDateRange.startDate,
                end_date: this.currentDateRange.endDate
            });
            
            const response = await fetch(`/api/reports/export?${params}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                const filename = `充值系统数据报表_${this.currentDateRange.startDate}_${this.currentDateRange.endDate}.${format}`;
                a.href = url;
                a.download = filename;
                a.click();
                
                window.URL.revokeObjectURL(url);
                this.showSuccess(`${format.toUpperCase()}文件导出成功`);
            } else {
                throw new Error('导出失败');
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showError('数据导出失败，请稍后重试');
        }
    }
    
    // 工具方法
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatDateLabel(dateStr) {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        indicator.style.display = show ? 'block' : 'none';
    }
    
    showSuccess(message) {
        // 使用toast组件或简单的alert
        alert('✅ ' + message);
    }
    
    showError(message) {
        // 使用toast组件或简单的alert
        alert('❌ ' + message);
    }
}

// 初始化数据报表管理器
const reportsManager = new DataReportsManager();