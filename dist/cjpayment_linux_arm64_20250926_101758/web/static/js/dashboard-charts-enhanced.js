/**
 * 仪表板图表增强管理
 * 专门处理交易趋势分析和交易状态分布的数据渲染和交互
 */

class DashboardChartsManager {
    constructor() {
        this.charts = {};
        this.chartData = {};
        this.loadingStates = new Map();
        this.init();
    }

    init() {
        console.log('DashboardChartsManager: 初始化开始');
        
        // 等待Chart.js加载完成
        this.waitForChartJS().then(() => {
            this.initializeCharts();
            this.bindEvents();
            this.startDataRefresh();
            console.log('DashboardChartsManager: 初始化完成');
        }).catch(error => {
            console.error('DashboardChartsManager: 初始化失败', error);
            this.showErrorStates();
        });
    }

    async waitForChartJS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 10秒超时

            const checkChart = () => {
                // 检查Chart.js和DOM元素都准备就绪
                const chartLoaded = typeof Chart !== 'undefined';
                const elementsReady = document.getElementById('trendChartCanvas') && 
                                    document.getElementById('statusChartCanvas');
                
                if (chartLoaded && elementsReady) {
                    console.log('Chart.js和DOM元素都已准备就绪');
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    if (attempts % 10 === 0) {
                        console.log(`等待Chart.js加载... (${attempts}/${maxAttempts})`);
                        console.log(`Chart.js已加载: ${chartLoaded}, DOM元素就绪: ${elementsReady}`);
                    }
                    setTimeout(checkChart, 100);
                } else {
                    reject(new Error(`Chart.js加载超时 - Chart.js: ${chartLoaded}, DOM: ${elementsReady}`));
                }
            };

            checkChart();
        });
    }

    initializeCharts() {
        this.initTrendChart();
        this.initStatusChart();
    }

    initTrendChart() {
        const canvas = document.getElementById('trendChartCanvas');
        const container = document.getElementById('trendChart');
        const loading = document.getElementById('trendChartLoading');
        const empty = document.getElementById('trendChartEmpty');

        if (!canvas || !container) {
            console.warn('趋势图表元素未找到');
            return;
        }

        // 显示加载状态
        this.showLoading('trend');

        try {
            const ctx = canvas.getContext('2d');
            
            // 生成模拟数据
            const mockData = this.generateTrendData();
            
            this.charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: mockData.labels,
                    datasets: [{
                        label: '交易金额',
                        data: mockData.amounts,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }, {
                        label: '交易笔数',
                        data: mockData.counts,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(16, 185, 129)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                boxWidth: 12,
                                padding: 15,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label;
                                    const value = context.parsed.y;
                                    if (label === '交易金额') {
                                        return `${label}: ¥${value.toLocaleString('zh-CN')}`;
                                    } else {
                                        return `${label}: ${value.toLocaleString('zh-CN')} 笔`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                maxRotation: 45
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return '¥' + (value / 1000).toFixed(0) + 'K';
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + ' 笔';
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    }
                }
            });

            // 隐藏加载状态
            this.hideLoading('trend');
            console.log('趋势图表初始化成功');

        } catch (error) {
            console.error('趋势图表初始化失败:', error);
            this.showError('trend');
        }
    }

    initStatusChart() {
        const canvas = document.getElementById('statusChartCanvas');
        const container = document.getElementById('statusChart');

        if (!canvas || !container) {
            console.warn('状态图表元素未找到');
            return;
        }

        // 确保canvas尺寸正确
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width || 300;
        canvas.height = rect.height || 200;

        // 显示加载状态
        this.showLoading('status');

        try {
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('无法获取Canvas上下文');
            }
            
            // 生成模拟数据
            const mockData = this.generateStatusData();
            
            this.charts.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: mockData.labels,
                    datasets: [{
                        data: mockData.values,
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',   // 成功 - 绿色
                            'rgba(245, 158, 11, 0.8)',   // 处理中 - 黄色
                            'rgba(239, 68, 68, 0.8)',    // 失败 - 红色
                            'rgba(107, 114, 128, 0.8)'   // 其他 - 灰色
                        ],
                        borderColor: [
                            'rgb(16, 185, 129)',
                            'rgb(245, 158, 11)',
                            'rgb(239, 68, 68)',
                            'rgb(107, 114, 128)'
                        ],
                        borderWidth: 2,
                        cutout: '65%',
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label;
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value.toLocaleString('zh-CN')} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: false,
                        duration: 1000
                    }
                },
                plugins: [{
                    id: 'centerText',
                    beforeDraw: (chart) => {
                        const { ctx } = chart;
                        const total = mockData.values.reduce((a, b) => a + b, 0);
                        
                        ctx.save();
                        ctx.font = 'bold 18px Arial';
                        ctx.fillStyle = '#111827';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        const centerX = chart.chartArea.left + (chart.chartArea.right - chart.chartArea.left) / 2;
                        const centerY = chart.chartArea.top + (chart.chartArea.bottom - chart.chartArea.top) / 2;
                        
                        ctx.fillText(`总计`, centerX, centerY - 10);
                        ctx.font = 'bold 20px Arial';
                        ctx.fillText(`${total.toLocaleString('zh-CN')}`, centerX, centerY + 12);
                        ctx.restore();
                    }
                }]
            });

            // 更新状态统计
            this.updateStatusSummary(mockData);

            // 隐藏加载状态
            this.hideLoading('status');
            console.log('状态图表初始化成功');

        } catch (error) {
            console.error('状态图表初始化失败:', error);
            this.showError('status');
        }
    }

    generateTrendData() {
        const labels = [];
        const amounts = [];
        const counts = [];

        // 生成最近30天的数据
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            
            // 生成趋势性数据（总体向上）
            const baseAmount = 50000 + Math.sin(i / 7) * 10000;
            const trendAmount = baseAmount + (30 - i) * 1000 + (Math.random() - 0.5) * 15000;
            amounts.push(Math.max(20000, Math.floor(trendAmount)));
            
            const baseCount = 150 + Math.sin(i / 5) * 30;
            const trendCount = baseCount + (30 - i) * 3 + (Math.random() - 0.5) * 50;
            counts.push(Math.max(80, Math.floor(trendCount)));
        }

        return { labels, amounts, counts };
    }

    generateStatusData() {
        const totalTransactions = 8342;
        
        return {
            labels: ['交易成功', '处理中', '交易失败', '其他'],
            values: [
                Math.floor(totalTransactions * 0.85), // 85% 成功
                Math.floor(totalTransactions * 0.08), // 8% 处理中
                Math.floor(totalTransactions * 0.05), // 5% 失败
                Math.floor(totalTransactions * 0.02)  // 2% 其他
            ]
        };
    }

    updateStatusSummary(data) {
        const statusSummary = document.getElementById('statusSummary');
        if (!statusSummary) return;

        const successCount = document.getElementById('successCount');
        const pendingCount = document.getElementById('pendingCount');
        const failedCount = document.getElementById('failedCount');

        if (successCount) successCount.textContent = data.values[0].toLocaleString('zh-CN');
        if (pendingCount) pendingCount.textContent = data.values[1].toLocaleString('zh-CN');
        if (failedCount) failedCount.textContent = data.values[2].toLocaleString('zh-CN');
    }

    showLoading(chartType) {
        const loading = document.getElementById(`${chartType}ChartLoading`);
        const empty = document.getElementById(`${chartType}ChartEmpty`);
        
        if (loading) loading.style.display = 'flex';
        if (empty) empty.style.display = 'none';
        
        this.loadingStates.set(chartType, true);
    }

    hideLoading(chartType) {
        const loading = document.getElementById(`${chartType}ChartLoading`);
        
        if (loading) loading.style.display = 'none';
        
        this.loadingStates.set(chartType, false);
    }

    showError(chartType) {
        const loading = document.getElementById(`${chartType}ChartLoading`);
        const empty = document.getElementById(`${chartType}ChartEmpty`);
        
        if (loading) loading.style.display = 'none';
        if (empty) {
            empty.style.display = 'flex';
            empty.querySelector('p').textContent = '数据加载失败';
        }
    }

    showErrorStates() {
        this.showError('trend');
        this.showError('status');
    }

    bindEvents() {
        // 趋势图时间范围切换
        const trendPeriod = document.getElementById('trendPeriod');
        if (trendPeriod) {
            trendPeriod.addEventListener('change', (e) => {
                this.updateTrendChart(e.target.value);
            });
        }

        // 状态图类型切换
        const statusChartType = document.getElementById('statusChartType');
        if (statusChartType) {
            statusChartType.addEventListener('change', (e) => {
                this.updateStatusChartType(e.target.value);
            });
        }
    }

    updateTrendChart(period) {
        if (!this.charts.trend) return;

        console.log(`更新趋势图: ${period}`);
        this.showLoading('trend');

        // 模拟异步数据加载
        setTimeout(() => {
            const newData = this.generateTrendData(); // 可以根据period生成不同数据
            
            this.charts.trend.data.labels = newData.labels;
            this.charts.trend.data.datasets[0].data = newData.amounts;
            this.charts.trend.data.datasets[1].data = newData.counts;
            
            this.charts.trend.update('active');
            this.hideLoading('trend');
        }, 500);
    }

    updateStatusChartType(type) {
        if (!this.charts.status) return;

        console.log(`更新状态图类型: ${type}`);
        
        // 销毁现有图表
        this.charts.status.destroy();
        
        // 重新创建不同类型的图表
        const canvas = document.getElementById('statusChartCanvas');
        const ctx = canvas.getContext('2d');
        const mockData = this.generateStatusData();

        const config = {
            type: type,
            data: {
                labels: mockData.labels,
                datasets: [{
                    data: mockData.values,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(107, 114, 128, 0.8)'
                    ],
                    borderColor: [
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)',
                        'rgb(107, 114, 128)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type === 'bar' ? true : false,
                        position: 'bottom'
                    }
                }
            }
        };

        // 为环形图添加特殊配置
        if (type === 'doughnut') {
            config.data.datasets[0].cutout = '65%';
            config.data.datasets[0].hoverOffset = 8;
        }

        this.charts.status = new Chart(ctx, config);
    }

    startDataRefresh() {
        // 每30秒刷新一次数据
        setInterval(() => {
            if (!this.loadingStates.get('trend')) {
                this.updateTrendChart(document.getElementById('trendPeriod')?.value || '30d');
            }
        }, 30000);
    }

    destroy() {
        // 清理资源
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        this.chartData = {};
        this.loadingStates.clear();
    }
}

// 初始化图表管理器
let dashboardChartsManager;

document.addEventListener('DOMContentLoaded', function() {
    // 确保页面完全加载后再初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initManager);
    } else {
        setTimeout(initManager, 100);
    }
    
    function initManager() {
        // 检查必要元素是否存在
        const trendCanvas = document.getElementById('trendChartCanvas');
        const statusCanvas = document.getElementById('statusChartCanvas');
        
        if (!trendCanvas || !statusCanvas) {
            console.warn('图表Canvas元素未找到，延迟重试');
            setTimeout(initManager, 200);
            return;
        }
        
        dashboardChartsManager = new DashboardChartsManager();
    }
});

// 暴露全局访问
window.DashboardChartsManager = DashboardChartsManager;