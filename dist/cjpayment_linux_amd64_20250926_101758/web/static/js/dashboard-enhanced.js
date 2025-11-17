/**
 * Dashboard增强功能
 * 提供仪表板的交互功能和数据管理
 */

class DashboardEnhanced {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.initializeStatCards();
        this.initializeCharts();
        this.loadRecentTransactions();
        this.bindEvents();
        this.startAutoRefresh();
        console.log('Dashboard Enhanced: 初始化完成');
    }

    initializeStatCards() {
        // 初始化统计卡片
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            this.animateStatCard(card);
        });
    }

    animateStatCard(card) {
        const value = card.querySelector('.stat-card-value');
        if (!value) return;

        const targetValue = parseInt(value.textContent.replace(/[^\d]/g, ''));
        if (isNaN(targetValue)) return;

        // 数字动画效果
        let currentValue = 0;
        const increment = targetValue / 50;
        const animation = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(animation);
            }
            
            // 格式化数字显示
            const formattedValue = this.formatNumber(Math.floor(currentValue));
            const originalText = value.textContent;
            const newText = originalText.replace(/[\d,]+/, formattedValue);
            value.textContent = newText;
        }, 20);
    }

    formatNumber(num) {
        return num.toLocaleString('zh-CN');
    }

    initializeCharts() {
        // 模拟图表数据初始化
        this.initTransactionChart();
        this.initVolumeChart();
        this.initStatusChart();
    }

    initTransactionChart() {
        const chartContainer = document.getElementById('transactionChart');
        if (!chartContainer) return;

        // 模拟图表数据
        const mockData = this.generateMockTransactionData();
        this.renderSimpleChart(chartContainer, mockData, '交易趋势');
    }

    initVolumeChart() {
        const chartContainer = document.getElementById('volumeChart');
        if (!chartContainer) return;

        const mockData = this.generateMockVolumeData();
        this.renderSimpleChart(chartContainer, mockData, '交易量分析');
    }

    initStatusChart() {
        const chartContainer = document.getElementById('statusChart');
        if (!chartContainer) return;

        const mockData = this.generateMockStatusData();
        this.renderPieChart(chartContainer, mockData, '状态分布');
    }

    generateMockTransactionData() {
        const data = [];
        for (let i = 0; i < 7; i++) {
            data.push({
                date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
                value: Math.floor(Math.random() * 10000) + 5000
            });
        }
        return data.reverse();
    }

    generateMockVolumeData() {
        const data = [];
        for (let i = 0; i < 12; i++) {
            data.push({
                month: `${i + 1}月`,
                value: Math.floor(Math.random() * 50000) + 20000
            });
        }
        return data;
    }

    generateMockStatusData() {
        return [
            { label: '成功', value: 85, color: '#10b981' },
            { label: '处理中', value: 10, color: '#f59e0b' },
            { label: '失败', value: 5, color: '#ef4444' }
        ];
    }

    renderSimpleChart(container, data, title) {
        // 创建简单的SVG图表
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '200');
        svg.style.background = '#f8fafc';
        svg.style.borderRadius = '8px';

        const maxValue = Math.max(...data.map(d => d.value));
        const width = container.offsetWidth - 40;
        const height = 160;
        const stepX = width / (data.length - 1);

        // 绘制线条
        let pathD = '';
        data.forEach((point, index) => {
            const x = 20 + index * stepX;
            const y = 180 - (point.value / maxValue) * height;
            
            if (index === 0) {
                pathD += `M ${x} ${y}`;
            } else {
                pathD += ` L ${x} ${y}`;
            }
            
            // 添加数据点
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#667eea');
            svg.appendChild(circle);
        });

        // 添加路径
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('stroke', '#667eea');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        container.innerHTML = '';
        container.appendChild(svg);
    }

    renderPieChart(container, data, title) {
        // 创建简单的饼图
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '200');
        
        const centerX = 100;
        const centerY = 100;
        const radius = 60;
        let currentAngle = 0;

        data.forEach(segment => {
            const angle = (segment.value / 100) * 360;
            const endAngle = currentAngle + angle;
            
            const startX = centerX + radius * Math.cos(currentAngle * Math.PI / 180);
            const startY = centerY + radius * Math.sin(currentAngle * Math.PI / 180);
            const endX = centerX + radius * Math.cos(endAngle * Math.PI / 180);
            const endY = centerY + radius * Math.sin(endAngle * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathD = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('fill', segment.color);
            svg.appendChild(path);
            
            currentAngle = endAngle;
        });

        container.innerHTML = '';
        container.appendChild(svg);
    }

    bindEvents() {
        // 绑定快速操作按钮事件
        document.querySelectorAll('.quick-action-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.getAttribute('href') === '#') {
                    e.preventDefault();
                    this.showToast('功能开发中', 'info');
                }
            });
        });

        // 绑定刷新按钮
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // 绑定时间范围选择
        const timeRangeSelect = document.getElementById('timeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.updateTimeRange(e.target.value);
            });
        }

        // 绑定导出按钮事件
        this.bindExportEvents();
    }

    // 绑定导出相关事件
    bindExportEvents() {
        // 仪表板导出按钮
        const exportDashboardBtn = document.getElementById('exportDashboard');
        if (exportDashboardBtn) {
            exportDashboardBtn.addEventListener('click', () => {
                this.exportDashboard();
            });
        }

        // 交易导出按钮
        const exportTransactionsBtn = document.getElementById('exportTransactions');
        if (exportTransactionsBtn) {
            // 移除原有的onclick属性
            exportTransactionsBtn.removeAttribute('onclick');
            exportTransactionsBtn.addEventListener('click', () => {
                this.exportRecentTransactions();
            });
        }

        // 仪表板导出模态框事件
        const confirmDashboardExportBtn = document.getElementById('confirmDashboardExportBtn');
        const cancelDashboardExportBtn = document.getElementById('cancelDashboardExportBtn');
        const dashboardExportClose = document.querySelector('#exportDashboardModal .modal-close');
        
        if (confirmDashboardExportBtn) {
            confirmDashboardExportBtn.addEventListener('click', () => {
                this.performDashboardExport();
            });
        }
        
        if (cancelDashboardExportBtn) {
            cancelDashboardExportBtn.addEventListener('click', () => {
                this.closeDashboardExportModal();
            });
        }
        
        if (dashboardExportClose) {
            dashboardExportClose.addEventListener('click', () => {
                this.closeDashboardExportModal();
            });
        }

        // 交易导出模态框事件
        const confirmTransactionsExportBtn = document.getElementById('confirmTransactionsExportBtn');
        const cancelTransactionsExportBtn = document.getElementById('cancelTransactionsExportBtn');
        const transactionsExportClose = document.querySelector('#exportTransactionsModal .modal-close');
        
        if (confirmTransactionsExportBtn) {
            confirmTransactionsExportBtn.addEventListener('click', () => {
                this.performTransactionsExport();
            });
        }
        
        if (cancelTransactionsExportBtn) {
            cancelTransactionsExportBtn.addEventListener('click', () => {
                this.closeTransactionsExportModal();
            });
        }
        
        if (transactionsExportClose) {
            transactionsExportClose.addEventListener('click', () => {
                this.closeTransactionsExportModal();
            });
        }

        // 全局模态框关闭事件
        this.setupGlobalModalHandlers();
    }

    // 设置全局模态框处理
    setupGlobalModalHandlers() {
        // 点击模态框外部关闭
        document.addEventListener('click', (e) => {
            const dashboardModal = document.getElementById('exportDashboardModal');
            const transactionsModal = document.getElementById('exportTransactionsModal');
            
            if (dashboardModal && e.target === dashboardModal) {
                this.closeDashboardExportModal();
            }
            
            if (transactionsModal && e.target === transactionsModal) {
                this.closeTransactionsExportModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dashboardModal = document.getElementById('exportDashboardModal');
                const transactionsModal = document.getElementById('exportTransactionsModal');
                
                if (dashboardModal && dashboardModal.classList.contains('show')) {
                    this.closeDashboardExportModal();
                }
                
                if (transactionsModal && transactionsModal.classList.contains('show')) {
                    this.closeTransactionsExportModal();
                }
            }
        });
    }

    refreshData() {
        this.showToast('正在刷新数据...', 'info');
        
        // 刷新所有数据
        setTimeout(async () => {
            this.initializeCharts();
            this.updateStatCards();
            await this.loadRecentTransactions();
            this.showToast('数据刷新完成', 'success');
        }, 1000);
    }

    updateStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const value = card.querySelector('.stat-card-value');
            if (value) {
                // 模拟数据更新
                const currentNum = parseInt(value.textContent.replace(/[^\d]/g, ''));
                const newNum = currentNum + Math.floor(Math.random() * 100) - 50;
                const formattedValue = this.formatNumber(Math.max(0, newNum));
                value.textContent = value.textContent.replace(/[\d,]+/, formattedValue);
            }
        });
    }

    updateTimeRange(range) {
        console.log(`更新时间范围为: ${range}`);
        // 根据时间范围更新图表数据
        this.refreshData();
    }

    startAutoRefresh() {
        // 每5分钟自动刷新一次
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // 加载最近交易记录
    async loadRecentTransactions(limit = 10) {
        try {
            console.log('Dashboard Enhanced: 开始加载交易记录...');
            const response = await fetch(`/api/dashboard/recent-transactions?limit=${limit}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderRecentTransactions(data.data || []);
                console.log('Dashboard Enhanced: 交易记录加载成功');
            } else {
                console.error('API返回失败:', data.message);
                this.showTransactionsError();
            }
        } catch (error) {
            console.error('Dashboard Enhanced: 加载交易记录失败:', error);
            this.showTransactionsError();
        }
    }

    // 渲染交易记录表格
    renderRecentTransactions(transactions) {
        const tbody = document.querySelector('#recentTransactionsTable tbody');
        if (!tbody) {
            console.error('Dashboard Enhanced: 未找到交易记录表格tbody元素');
            return;
        }
        
        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="table__empty">
                        <div class="table__empty-icon">📋</div>
                        <div>暂无交易记录</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = transactions.map(transaction => `
            <tr class="table__row">
                <td class="table__cell">
                    <code class="text-sm">${transaction.orderNumber || transaction.id}</code>
                </td>
                <td class="table__cell">${transaction.payerName || '-'}</td>
                <td class="table__cell font-semibold">¥${Number(transaction.amount).toLocaleString()}</td>
                <td class="table__cell">${transaction.merchantName || '-'}</td>
                <td class="table__cell">
                    <span class="status-badge status-badge--${this.getStatusClass(transaction.status)}">
                        ${this.getStatusText(transaction.status)}
                    </span>
                </td>
                <td class="table__cell text-sm text-gray-600">
                    ${new Date(transaction.createdAt).toLocaleString('zh-CN')}
                </td>
                <td class="table__cell">
                    <button class="btn btn--sm btn-outline" onclick="viewTransaction('${transaction.id}')">
                        详情
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log(`Dashboard Enhanced: 成功渲染 ${transactions.length} 条交易记录`);
    }

    // 获取状态对应的CSS类
    getStatusClass(status) {
        const statusMap = {
            'completed': 'success',
            'processing': 'warning', 
            'pending': 'info',
            'failed': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    // 获取状态显示文本
    getStatusText(status) {
        const statusMap = {
            'completed': '已完成',
            'processing': '处理中',
            'pending': '待处理', 
            'failed': '失败'
        };
        return statusMap[status] || status;
    }

    // 显示交易记录加载错误
    showTransactionsError() {
        const tbody = document.querySelector('#recentTransactionsTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table__error">
                    <div class="table__error-icon">⚠️</div>
                    <div>加载交易记录失败</div>
                    <button class="btn btn--sm btn-outline mt-2" onclick="dashboardEnhanced.loadRecentTransactions()">
                        重新加载
                    </button>
                </td>
            </tr>
        `;
    }

    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }

    // 导出仪表板报表
    exportDashboard() {
        this.showDashboardExportModal();
    }

    // 显示仪表板导出模态框 - 修复版本
    showDashboardExportModal() {
        console.log('🔧 修复版仪表板模态框显示');
        const modal = document.getElementById('exportDashboardModal');
        if (!modal) {
            console.error('仪表板导出模态框未找到');
            return;
        }
        
        // 确保modal在body根级别
        if (modal.parentNode !== document.body) {
            console.log('移动仪表板模态框到body根级别');
            document.body.appendChild(modal);
        }
        
        // 强制清除所有可能冲突的样式和状态
        modal.classList.remove('show', 'hide', 'hidden');
        modal.removeAttribute('aria-hidden');
        
        // 立即设置所有必要的内联样式，强制覆盖任何CSS规则
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        // 强制重排，确保样式立即生效
        modal.offsetHeight;
        
        // 添加show类用于过渡效果
        modal.classList.add('show');
        
        // 设置可访问性属性
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-modal', 'true');
        
        console.log('✅ 仪表板模态框已修复显示');
    }

    // 关闭仪表板导出模态框
    closeDashboardExportModal() {
        const modal = document.getElementById('exportDashboardModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // 执行仪表板导出
    async performDashboardExport() {
        try {
            const selectedFormat = document.querySelector('#exportDashboardModal input[name="dashboardFormat"]:checked')?.value;
            const selectedContent = [];
            
            document.querySelectorAll('#exportDashboardModal input[type="checkbox"]:checked').forEach(checkbox => {
                selectedContent.push(checkbox.value);
            });

            if (!selectedFormat) {
                this.showToast('请选择导出格式', 'warning');
                return;
            }

            if (selectedContent.length === 0) {
                this.showToast('请选择导出内容', 'warning');
                return;
            }

            this.showToast('正在导出仪表板报表...', 'info');

            const exportData = {
                format: selectedFormat,
                content: selectedContent,
                timestamp: new Date().toISOString()
            };

            // 模拟导出API调用
            const response = await fetch('/api/v1/dashboard/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `dashboard-report-${Date.now()}.${selectedFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('仪表板报表导出成功', 'success');
            } else {
                throw new Error(`导出失败: ${response.status}`);
            }

            this.closeDashboardExportModal();
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('导出失败，请稍后重试', 'error');
        }
    }

    // 导出近期交易
    exportRecentTransactions() {
        this.showTransactionsExportModal();
    }

    // 显示交易导出模态框 - 修复版本
    showTransactionsExportModal() {
        console.log('🔧 修复版交易模态框显示');
        const modal = document.getElementById('exportTransactionsModal');
        if (!modal) {
            console.error('交易导出模态框未找到');
            return;
        }
        
        // 确保modal在body根级别
        if (modal.parentNode !== document.body) {
            console.log('移动交易模态框到body根级别');
            document.body.appendChild(modal);
        }
        
        // 强制清除所有可能冲突的样式和状态
        modal.classList.remove('show', 'hide', 'hidden');
        modal.removeAttribute('aria-hidden');
        
        // 立即设置所有必要的内联样式，强制覆盖任何CSS规则
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
            background-color: rgba(0, 0, 0, 0.5) !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        // 强制重排，确保样式立即生效
        modal.offsetHeight;
        
        // 添加show类用于过渡效果
        modal.classList.add('show');
        
        // 设置可访问性属性
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-modal', 'true');
        
        console.log('✅ 交易模态框已修复显示');
    }

    // 关闭交易导出模态框
    closeTransactionsExportModal() {
        const modal = document.getElementById('exportTransactionsModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // 执行交易导出
    async performTransactionsExport() {
        try {
            const selectedFormat = document.querySelector('#exportTransactionsModal input[name="transactionsFormat"]:checked')?.value;
            const selectedContent = [];
            
            document.querySelectorAll('#exportTransactionsModal input[type="checkbox"]:checked').forEach(checkbox => {
                selectedContent.push(checkbox.value);
            });

            if (!selectedFormat) {
                this.showToast('请选择导出格式', 'warning');
                return;
            }

            if (selectedContent.length === 0) {
                this.showToast('请选择导出字段', 'warning');
                return;
            }

            this.showToast('正在导出交易记录...', 'info');

            const exportData = {
                format: selectedFormat,
                content: selectedContent,
                timestamp: new Date().toISOString()
            };

            // 模拟导出API调用
            const response = await fetch('/api/v1/transactions/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `transactions-${Date.now()}.${selectedFormat}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showToast('交易记录导出成功', 'success');
            } else {
                throw new Error(`导出失败: ${response.status}`);
            }

            this.closeTransactionsExportModal();
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('导出失败，请稍后重试', 'error');
        }
    }

    destroy() {
        this.stopAutoRefresh();
        console.log('Dashboard Enhanced: 已销毁');
    }
}

// 初始化Dashboard增强功能
let dashboardEnhanced = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('page-dashboard')) {
        dashboardEnhanced = new DashboardEnhanced();
        
        // 全局暴露实例（兼容性）
        window.dashboardEnhanced = dashboardEnhanced;
        window.dashboard = dashboardEnhanced; // 向后兼容
    }
});

// 页面可见性变化时清理（替代beforeunload）
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dashboardEnhanced) {
        dashboardEnhanced.destroy();
    }
});