/**
 * 监控仪表板
 * 提供实时监控数据的可视化界面
 */
class MonitoringDashboard {
    constructor(container) {
        this.container = typeof container === 'string' ? 
            document.querySelector(container) : container;
        
        this.charts = new Map();
        this.updateInterval = 5000; // 5秒更新一次
        this.isVisible = true;
        
        this.init();
    }

    init() {
        this.createDashboardHTML();
        this.setupEventListeners();
        this.startUpdating();
        
        console.log('Monitoring Dashboard initialized');
    }

    /**
     * 创建仪表板HTML结构
     */
    createDashboardHTML() {
        this.container.innerHTML = `
            <div class="monitoring-dashboard">
                <div class="dashboard-header">
                    <h2>前端监控仪表板</h2>
                    <div class="dashboard-controls">
                        <button class="btn btn-sm" id="refresh-btn">刷新</button>
                        <button class="btn btn-sm" id="export-btn">导出数据</button>
                        <button class="btn btn-sm" id="clear-btn">清空数据</button>
                    </div>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-title">页面性能</div>
                        <div class="stat-value" id="performance-score">-</div>
                        <div class="stat-trend" id="performance-trend"></div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-title">错误数量</div>
                        <div class="stat-value" id="error-count">-</div>
                        <div class="stat-trend" id="error-trend"></div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-title">用户活跃度</div>
                        <div class="stat-value" id="user-activity">-</div>
                        <div class="stat-trend" id="activity-trend"></div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-title">内存使用</div>
                        <div class="stat-value" id="memory-usage">-</div>
                        <div class="stat-trend" id="memory-trend"></div>
                    </div>
                </div>
                
                <div class="dashboard-charts">
                    <div class="chart-container">
                        <h3>性能指标趋势</h3>
                        <canvas id="performance-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>错误分布</h3>
                        <canvas id="error-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h3>用户行为热力图</h3>
                        <div id="heatmap-container"></div>
                    </div>
                    
                    <div class="chart-container">
                        <h3>实时日志</h3>
                        <div id="log-container"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 刷新按钮
        const refreshBtn = this.container.querySelector('#refresh-btn');
        refreshBtn?.addEventListener('click', () => {
            this.updateDashboard();
        });

        // 导出按钮
        const exportBtn = this.container.querySelector('#export-btn');
        exportBtn?.addEventListener('click', () => {
            this.exportData();
        });

        // 清空按钮
        const clearBtn = this.container.querySelector('#clear-btn');
        clearBtn?.addEventListener('click', () => {
            this.clearData();
        });

        // 可见性变化监听
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
        });
    }

    /**
     * 开始更新数据
     */
    startUpdating() {
        setInterval(() => {
            if (this.isVisible) {
                this.updateDashboard();
            }
        }, this.updateInterval);

        // 初始更新
        this.updateDashboard();
    }

    /**
     * 更新仪表板数据
     */
    updateDashboard() {
        this.updatePerformanceStats();
        this.updateErrorStats();
        this.updateUserActivityStats();
        this.updateMemoryStats();
        this.updateCharts();
        this.updateLogs();
    }

    /**
     * 更新性能统计
     */
    updatePerformanceStats() {
        if (window.performanceMonitor) {
            const summary = window.performanceMonitor.getMetricsSummary();
            const scoreElement = this.container.querySelector('#performance-score');
            const trendElement = this.container.querySelector('#performance-trend');
            
            // 计算性能分数（基于LCP、FID、CLS等指标）
            let score = 100;
            if (summary.LCP && summary.LCP.avg > 2500) score -= 20;
            if (summary.FID && summary.FID.avg > 100) score -= 20;
            if (summary.CLS && summary.CLS.avg > 0.1) score -= 20;
            
            scoreElement.textContent = Math.max(0, score);
            scoreElement.className = `stat-value ${this.getScoreClass(score)}`;
            
            // 趋势指示器（简化实现）
            trendElement.innerHTML = score >= 80 ? '↗️ 良好' : score >= 60 ? '→ 一般' : '↘️ 需要优化';
        }
    }

    /**
     * 更新错误统计
     */
    updateErrorStats() {
        if (window.errorMonitor) {
            const stats = window.errorMonitor.getErrorStats();
            const countElement = this.container.querySelector('#error-count');
            const trendElement = this.container.querySelector('#error-trend');
            
            countElement.textContent = stats.total;
            countElement.className = `stat-value ${stats.total > 10 ? 'error' : stats.total > 5 ? 'warning' : 'success'}`;
            
            // 错误趋势
            const recentErrors = stats.recent.length;
            trendElement.innerHTML = recentErrors === 0 ? '✅ 无错误' : 
                                   recentErrors < 3 ? '⚠️ 少量错误' : '❌ 错误较多';
        }
    }

    /**
     * 更新用户活动统计
     */
    updateUserActivityStats() {
        if (window.userBehaviorMonitor) {
            const stats = window.userBehaviorMonitor.getBehaviorStats();
            const activityElement = this.container.querySelector('#user-activity');
            const trendElement = this.container.querySelector('#activity-trend');
            
            const interactions = stats.session.interactions;
            activityElement.textContent = interactions;
            activityElement.className = `stat-value ${interactions > 50 ? 'success' : interactions > 20 ? 'warning' : 'normal'}`;
            
            // 活动趋势
            const recentActivity = stats.recentEvents.filter(e => 
                Date.now() - e.timestamp < 60000
            ).length;
            
            trendElement.innerHTML = recentActivity > 10 ? '🔥 活跃' : 
                                   recentActivity > 5 ? '📈 正常' : '📉 较少';
        }
    }

    /**
     * 更新内存统计
     */
    updateMemoryStats() {
        if (window.performanceMonitor) {
            const memoryUsage = window.performanceMonitor.getMemoryUsage();
            const usageElement = this.container.querySelector('#memory-usage');
            const trendElement = this.container.querySelector('#memory-trend');
            
            if (memoryUsage) {
                const usedMB = Math.round(memoryUsage.used / 1024 / 1024);
                const totalMB = Math.round(memoryUsage.total / 1024 / 1024);
                const percentage = Math.round((memoryUsage.used / memoryUsage.total) * 100);
                
                usageElement.textContent = `${usedMB}MB`;
                usageElement.className = `stat-value ${percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success'}`;
                
                trendElement.innerHTML = percentage > 80 ? '⚠️ 内存紧张' : 
                                       percentage > 60 ? '📊 使用正常' : '✅ 内存充足';
            }
        }
    }

    /**
     * 更新图表
     */
    updateCharts() {
        this.updatePerformanceChart();
        this.updateErrorChart();
        this.updateHeatmap();
    }

    /**
     * 更新性能图表
     */
    updatePerformanceChart() {
        const canvas = this.container.querySelector('#performance-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = 200;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        if (window.performanceMonitor) {
            const metrics = window.performanceMonitor.getMetrics();
            const lcpMetrics = metrics.filter(m => m.name === 'LCP').slice(-20);
            
            if (lcpMetrics.length > 0) {
                this.drawLineChart(ctx, lcpMetrics, width, height, 'LCP (ms)');
            }
        }
    }

    /**
     * 更新错误图表
     */
    updateErrorChart() {
        const canvas = this.container.querySelector('#error-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = 200;

        ctx.clearRect(0, 0, width, height);

        if (window.errorMonitor) {
            const stats = window.errorMonitor.getErrorStats();
            this.drawPieChart(ctx, stats.byType, width, height);
        }
    }

    /**
     * 更新热力图
     */
    updateHeatmap() {
        const container = this.container.querySelector('#heatmap-container');
        if (!container) return;

        // 简化的热力图实现
        container.innerHTML = '<div class="heatmap-placeholder">热力图数据收集中...</div>';
        
        if (window.userBehaviorMonitor) {
            const stats = window.userBehaviorMonitor.getBehaviorStats();
            const clickEvents = stats.recentEvents.filter(e => e.type === 'click');
            
            if (clickEvents.length > 0) {
                container.innerHTML = `
                    <div class="heatmap-info">
                        <p>最近点击次数: ${clickEvents.length}</p>
                        <p>最活跃区域: 页面中心区域</p>
                    </div>
                `;
            }
        }
    }

    /**
     * 更新日志
     */
    updateLogs() {
        const container = this.container.querySelector('#log-container');
        if (!container) return;

        const logs = [];
        
        // 收集性能日志
        if (window.performanceMonitor) {
            const metrics = window.performanceMonitor.getMetrics().slice(-5);
            metrics.forEach(metric => {
                logs.push({
                    time: new Date(metric.timestamp).toLocaleTimeString(),
                    type: 'performance',
                    message: `${metric.name}: ${Math.round(metric.value)}ms`
                });
            });
        }
        
        // 收集错误日志
        if (window.errorMonitor) {
            const stats = window.errorMonitor.getErrorStats();
            stats.recent.slice(-3).forEach(error => {
                logs.push({
                    time: new Date(error.timestamp).toLocaleTimeString(),
                    type: 'error',
                    message: error.message
                });
            });
        }

        // 按时间排序
        logs.sort((a, b) => new Date(b.time) - new Date(a.time));

        container.innerHTML = logs.map(log => `
            <div class="log-entry log-${log.type}">
                <span class="log-time">${log.time}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    /**
     * 绘制折线图
     */
    drawLineChart(ctx, data, width, height, label) {
        if (data.length === 0) return;

        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // 计算数据范围
        const values = data.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue || 1;

        // 绘制坐标轴
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // 绘制数据线
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = height - padding - ((point.value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // 绘制标签
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        ctx.fillText(label, padding, 20);
        ctx.fillText(`${Math.round(minValue)}`, 5, height - padding);
        ctx.fillText(`${Math.round(maxValue)}`, 5, padding);
    }

    /**
     * 绘制饼图
     */
    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;

        const total = Object.values(data).reduce((sum, value) => sum + value, 0);
        if (total === 0) return;

        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
        let currentAngle = 0;

        Object.entries(data).forEach(([key, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.fillStyle = colors[index % colors.length];
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fill();

            // 绘制标签
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 15);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 15);
            
            ctx.fillStyle = '#374151';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${key}: ${value}`, labelX, labelY);

            currentAngle += sliceAngle;
        });
    }

    /**
     * 获取分数对应的CSS类
     */
    getScoreClass(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'error';
    }

    /**
     * 导出数据
     */
    exportData() {
        const data = {
            performance: window.performanceMonitor?.getMetrics() || [],
            errors: window.errorMonitor?.getErrorStats() || {},
            behavior: window.userBehaviorMonitor?.getBehaviorStats() || {},
            timestamp: Date.now()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monitoring-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 清空数据
     */
    clearData() {
        if (confirm('确定要清空所有监控数据吗？')) {
            window.performanceMonitor?.metrics.clear();
            window.errorMonitor?.clearErrors();
            window.userBehaviorMonitor?.events.splice(0);
            
            this.updateDashboard();
        }
    }

    /**
     * 销毁仪表板
     */
    destroy() {
        this.charts.clear();
    }
}

// 导出类
window.MonitoringDashboard = MonitoringDashboard;