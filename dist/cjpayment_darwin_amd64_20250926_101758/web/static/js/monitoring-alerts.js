/**
 * 监控告警系统
 * 负责系统性能监控、告警规则和通知管理
 */
class MonitoringAlerts {
    constructor() {
        this.currentTab = 'overview';
        this.alerts = [];
        this.rules = [];
        this.services = [];
        this.history = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filters = {
            severity: '',
            status: '',
            dateFrom: '',
            dateTo: ''
        };
        
        this.refreshInterval = null;
        this.realTimeMetrics = {
            cpu: 78.5,
            memory: 92.3,
            disk: 45.3,
            network: 125,
            load: 1.25
        };
        
        this.init();
    }
    
    init() {
        this.loadMockData();
        this.bindEvents();
        this.initTabs();
        this.renderServices();
        this.renderAlerts();
        this.renderRules();
        this.renderHistory();
        this.startRealTimeUpdates();
        
        console.log('监控告警系统已初始化');
    }
    
    /**
     * 加载模拟数据
     */
    loadMockData() {
        // 模拟服务状态
        this.services = [
            {
                id: 'app_server',
                name: '应用服务器',
                description: 'Tomcat 9.0.65',
                status: 'normal',
                uptime: '7天12小时',
                responseTime: 95
            },
            {
                id: 'database',
                name: '数据库服务',
                description: 'MySQL 8.0.32',
                status: 'normal',
                uptime: '15天6小时',
                responseTime: 5
            },
            {
                id: 'redis',
                name: '缓存服务',
                description: 'Redis 6.2.7',
                status: 'warning',
                uptime: '3天2小时',
                responseTime: 12
            },
            {
                id: 'nginx',
                name: '负载均衡',
                description: 'Nginx 1.22.1',
                status: 'normal',
                uptime: '30天8小时',
                responseTime: 2
            }
        ];
        
        // 模拟当前告警
        this.alerts = [
            {
                id: 'alert_001',
                title: '内存使用率过高',
                description: '服务器内存使用率已达到92.3%，超过90%警戒线',
                severity: 'critical',
                status: 'firing',
                service: 'app_server',
                metric: 'memory_usage',
                threshold: 90,
                currentValue: 92.3,
                startTime: new Date(Date.now() - 3600000),
                duration: '1小时前'
            },
            {
                id: 'alert_002',
                title: 'CPU使用率警告',
                description: 'CPU使用率持续高于75%，建议检查系统负载',
                severity: 'warning',
                status: 'firing',
                service: 'app_server',
                metric: 'cpu_usage',
                threshold: 75,
                currentValue: 78.5,
                startTime: new Date(Date.now() - 1800000),
                duration: '30分钟前'
            },
            {
                id: 'alert_003',
                title: '缓存响应时间增加',
                description: 'Redis缓存响应时间超过10ms',
                severity: 'info',
                status: 'pending',
                service: 'redis',
                metric: 'response_time',
                threshold: 10,
                currentValue: 12,
                startTime: new Date(Date.now() - 900000),
                duration: '15分钟前'
            }
        ];
        
        // 模拟告警规则
        this.rules = [
            {
                id: 'rule_001',
                name: 'CPU使用率过高',
                description: '当CPU使用率持续5分钟超过80%时触发告警',
                metric: 'cpu_usage',
                operator: 'gt',
                threshold: 80,
                unit: '%',
                duration: 5,
                severity: 'warning',
                status: 'active',
                notifications: ['email', 'sms'],
                created: new Date('2024-01-15'),
                lastTriggered: new Date(Date.now() - 86400000)
            },
            {
                id: 'rule_002',
                name: '内存使用率严重告警',
                description: '当内存使用率超过90%时立即触发严重告警',
                metric: 'memory_usage',
                operator: 'gt',
                threshold: 90,
                unit: '%',
                duration: 1,
                severity: 'critical',
                status: 'active',
                notifications: ['email', 'sms', 'dingtalk'],
                created: new Date('2024-01-15'),
                lastTriggered: new Date(Date.now() - 3600000)
            },
            {
                id: 'rule_003',
                name: '磁盘使用率监控',
                description: '磁盘使用率超过85%时发出警告',
                metric: 'disk_usage',
                operator: 'gt',
                threshold: 85,
                unit: '%',
                duration: 10,
                severity: 'warning',
                status: 'active',
                notifications: ['email'],
                created: new Date('2024-02-01'),
                lastTriggered: null
            }
        ];
        
        // 生成历史记录
        this.generateMockHistory();
    }
    
    /**
     * 生成模拟历史记录
     */
    generateMockHistory() {
        const severities = ['critical', 'warning', 'info'];
        const metrics = ['cpu_usage', 'memory_usage', 'disk_usage', 'response_time'];
        const services = ['app_server', 'database', 'redis', 'nginx'];
        
        this.history = [];
        
        for (let i = 0; i < 156; i++) {
            const severity = severities[Math.floor(Math.random() * severities.length)];
            const metric = metrics[Math.floor(Math.random() * metrics.length)];
            const service = services[Math.floor(Math.random() * services.length)];
            const startTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            const duration = Math.floor(Math.random() * 180) + 5; // 5-185分钟
            
            this.history.push({
                id: `history_${i}`,
                title: `${this.getMetricName(metric)}${severity === 'critical' ? '严重告警' : '告警'}`,
                description: `${this.getServiceName(service)}的${this.getMetricName(metric)}触发告警`,
                severity: severity,
                service: service,
                metric: metric,
                startTime: startTime,
                endTime: new Date(startTime.getTime() + duration * 60000),
                duration: `${duration}分钟`,
                status: 'resolved'
            });
        }
        
        // 按时间倒序排列
        this.history.sort((a, b) => b.startTime - a.startTime);
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
        
        // 页面操作按钮
        document.getElementById('refreshMonitoring')?.addEventListener('click', () => {
            this.refreshData();
        });
        
        document.getElementById('exportReport')?.addEventListener('click', () => {
            this.exportReport();
        });
        
        document.getElementById('createAlert')?.addEventListener('click', () => {
            this.showCreateRuleModal();
        });
        
        // 过滤器
        document.getElementById('alertSeverityFilter')?.addEventListener('change', (e) => {
            this.filters.severity = e.target.value;
            this.renderAlerts();
        });
        
        document.getElementById('alertStatusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.renderAlerts();
        });
        
        // 历史查询
        document.getElementById('searchHistory')?.addEventListener('click', () => {
            this.searchHistory();
        });
        
        // 分页
        document.getElementById('prevHistoryPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderHistory();
            }
        });
        
        document.getElementById('nextHistoryPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.getFilteredHistory().length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderHistory();
            }
        });
        
        // 规则导入导出
        document.getElementById('importRules')?.addEventListener('click', () => {
            this.importRules();
        });
        
        document.getElementById('exportRules')?.addEventListener('click', () => {
            this.exportRules();
        });
        
        // 通知渠道
        document.getElementById('addNotificationChannel')?.addEventListener('click', () => {
            this.showToast('添加通知渠道功能正在开发中', 'info');
        });
        
        // 模态框事件
        this.bindModalEvents();
    }
    
    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        const modal = document.getElementById('alertRuleModal');
        const closeBtn = document.getElementById('alertRuleModalClose');
        const cancelBtn = document.getElementById('cancelAlertRuleBtn');
        const form = document.getElementById('alertRuleForm');
        
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
            this.createAlertRule();
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
        this.switchTab('overview');
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
        
        // 根据当前标签页执行特定操作
        switch (tabName) {
            case 'overview':
                this.updateMetrics();
                break;
            case 'alerts':
                this.renderAlerts();
                break;
            case 'rules':
                this.renderRules();
                break;
            case 'history':
                this.renderHistory();
                break;
        }
    }
    
    /**
     * 更新实时指标
     */
    updateMetrics() {
        // 模拟指标变化
        this.realTimeMetrics.cpu += (Math.random() - 0.5) * 2;
        this.realTimeMetrics.memory += (Math.random() - 0.5) * 1;
        this.realTimeMetrics.disk += (Math.random() - 0.5) * 0.5;
        this.realTimeMetrics.network += (Math.random() - 0.5) * 10;
        this.realTimeMetrics.load += (Math.random() - 0.5) * 0.1;
        
        // 限制范围
        this.realTimeMetrics.cpu = Math.max(0, Math.min(100, this.realTimeMetrics.cpu));
        this.realTimeMetrics.memory = Math.max(0, Math.min(100, this.realTimeMetrics.memory));
        this.realTimeMetrics.disk = Math.max(0, Math.min(100, this.realTimeMetrics.disk));
        this.realTimeMetrics.network = Math.max(0, this.realTimeMetrics.network);
        this.realTimeMetrics.load = Math.max(0, this.realTimeMetrics.load);
        
        // 更新DOM显示
        this.updateMetricDisplays();
    }
    
    /**
     * 更新指标显示
     */
    updateMetricDisplays() {
        const metricCards = document.querySelectorAll('.metric-card');
        
        metricCards.forEach(card => {
            const title = card.querySelector('.metric-title').textContent;
            const valueElement = card.querySelector('.metric-value');
            const statusElement = card.querySelector('.metric-status');
            
            let value, status, statusText;
            
            switch (title) {
                case 'CPU使用率':
                    value = this.realTimeMetrics.cpu.toFixed(1) + '%';
                    status = this.realTimeMetrics.cpu > 80 ? 'critical' : 
                            this.realTimeMetrics.cpu > 70 ? 'warning' : 'normal';
                    break;
                case '内存使用率':
                    value = this.realTimeMetrics.memory.toFixed(1) + '%';
                    status = this.realTimeMetrics.memory > 90 ? 'critical' : 
                            this.realTimeMetrics.memory > 80 ? 'warning' : 'normal';
                    break;
                case '系统负载':
                    value = this.realTimeMetrics.load.toFixed(2);
                    status = this.realTimeMetrics.load > 2 ? 'critical' : 
                            this.realTimeMetrics.load > 1.5 ? 'warning' : 'normal';
                    break;
                case '网络流量':
                    value = this.realTimeMetrics.network.toFixed(0) + 'MB/s';
                    status = 'normal';
                    break;
            }
            
            statusText = status === 'critical' ? '严重' : 
                        status === 'warning' ? '警告' : '正常';
            
            if (valueElement) valueElement.textContent = value;
            if (statusElement) {
                statusElement.textContent = statusText;
                statusElement.className = `metric-status status-${status}`;
            }
        });
    }
    
    /**
     * 渲染服务状态
     */
    renderServices() {
        const container = document.getElementById('servicesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.services.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item';
            serviceItem.innerHTML = `
                <div class="service-info">
                    <div class="service-name">${service.name}</div>
                    <div class="service-description">${service.description}</div>
                </div>
                <div class="service-status">
                    <div class="status-indicator status-indicator--${service.status}"></div>
                    <span>${this.getStatusText(service.status)}</span>
                </div>
            `;
            container.appendChild(serviceItem);
        });
    }
    
    /**
     * 渲染告警列表
     */
    renderAlerts() {
        const container = document.getElementById('alertsList');
        if (!container) return;
        
        const filteredAlerts = this.getFilteredAlerts();
        
        container.innerHTML = '';
        
        filteredAlerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item alert-item--${alert.severity}`;
            alertItem.innerHTML = `
                <div class="alert-header">
                    <h4 class="alert-title">${alert.title}</h4>
                    <span class="alert-severity alert-severity--${alert.severity}">${this.getSeverityText(alert.severity)}</span>
                </div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-meta">
                    <div class="alert-meta-item">
                        <div class="alert-meta-label">服务</div>
                        <div class="alert-meta-value">${this.getServiceName(alert.service)}</div>
                    </div>
                    <div class="alert-meta-item">
                        <div class="alert-meta-label">当前值</div>
                        <div class="alert-meta-value">${alert.currentValue}${alert.metric.includes('usage') ? '%' : 'ms'}</div>
                    </div>
                    <div class="alert-meta-item">
                        <div class="alert-meta-label">阈值</div>
                        <div class="alert-meta-value">${alert.threshold}${alert.metric.includes('usage') ? '%' : 'ms'}</div>
                    </div>
                    <div class="alert-meta-item">
                        <div class="alert-meta-label">持续时间</div>
                        <div class="alert-meta-value">${alert.duration}</div>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="alert-action-btn alert-action-btn--primary" onclick="monitoringAlerts.acknowledgeAlert('${alert.id}')">
                        确认
                    </button>
                    <button class="alert-action-btn alert-action-btn--outline" onclick="monitoringAlerts.silenceAlert('${alert.id}')">
                        静默
                    </button>
                    <button class="alert-action-btn alert-action-btn--danger" onclick="monitoringAlerts.resolveAlert('${alert.id}')">
                        解决
                    </button>
                </div>
            `;
            container.appendChild(alertItem);
        });
        
        if (filteredAlerts.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--monitoring-secondary);">暂无符合条件的告警</div>';
        }
    }
    
    /**
     * 渲染规则列表
     */
    renderRules() {
        const container = document.getElementById('rulesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.rules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.innerHTML = `
                <div class="rule-header">
                    <h4 class="rule-name">${rule.name}</h4>
                    <span class="rule-status rule-status--${rule.status}">${this.getStatusText(rule.status)}</span>
                </div>
                <div class="rule-description">${rule.description}</div>
                <div class="rule-config">
                    ${this.getMetricName(rule.metric)} ${this.getOperatorText(rule.operator)} ${rule.threshold}${rule.unit} 持续 ${rule.duration}分钟
                </div>
                <div class="rule-actions">
                    <button class="alert-action-btn alert-action-btn--primary" onclick="monitoringAlerts.editRule('${rule.id}')">
                        编辑
                    </button>
                    <button class="alert-action-btn alert-action-btn--outline" onclick="monitoringAlerts.toggleRule('${rule.id}')">
                        ${rule.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button class="alert-action-btn alert-action-btn--danger" onclick="monitoringAlerts.deleteRule('${rule.id}')">
                        删除
                    </button>
                </div>
            `;
            container.appendChild(ruleItem);
        });
    }
    
    /**
     * 渲染历史记录
     */
    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        const filteredHistory = this.getFilteredHistory();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = filteredHistory.slice(startIndex, endIndex);
        
        container.innerHTML = '';
        
        pageData.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-time">${this.formatTime(item.startTime)}</div>
                <div class="history-content">
                    <div class="history-title">${item.title}</div>
                    <div class="history-description">${item.description}</div>
                </div>
                <span class="history-severity alert-severity--${item.severity}">${this.getSeverityText(item.severity)}</span>
                <div class="history-duration">${item.duration}</div>
            `;
            container.appendChild(historyItem);
        });
        
        // 更新分页信息
        this.updateHistoryPagination(filteredHistory.length);
    }
    
    /**
     * 更新历史记录分页
     */
    updateHistoryPagination(totalItems) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        document.getElementById('historyStart').textContent = startIndex;
        document.getElementById('historyEnd').textContent = endIndex;
        document.getElementById('historyTotal').textContent = totalItems;
        
        // 更新按钮状态
        document.getElementById('prevHistoryPage').disabled = this.currentPage === 1;
        document.getElementById('nextHistoryPage').disabled = endIndex >= totalItems;
    }
    
    /**
     * 获取过滤后的告警
     */
    getFilteredAlerts() {
        return this.alerts.filter(alert => {
            if (this.filters.severity && alert.severity !== this.filters.severity) {
                return false;
            }
            if (this.filters.status && alert.status !== this.filters.status) {
                return false;
            }
            return true;
        });
    }
    
    /**
     * 获取过滤后的历史记录
     */
    getFilteredHistory() {
        return this.history.filter(item => {
            if (this.filters.dateFrom) {
                const fromDate = new Date(this.filters.dateFrom);
                if (item.startTime < fromDate) return false;
            }
            if (this.filters.dateTo) {
                const toDate = new Date(this.filters.dateTo + 'T23:59:59');
                if (item.startTime > toDate) return false;
            }
            return true;
        });
    }
    
    /**
     * 显示创建规则模态框
     */
    showCreateRuleModal() {
        const modal = document.getElementById('alertRuleModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // 重置表单
            document.getElementById('alertRuleForm').reset();
        }
    }
    
    /**
     * 隐藏模态框
     */
    hideModal() {
        const modal = document.getElementById('alertRuleModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * 创建告警规则
     */
    createAlertRule() {
        const form = document.getElementById('alertRuleForm');
        const formData = new FormData(form);
        
        const rule = {
            id: `rule_${Date.now()}`,
            name: formData.get('ruleName') || document.getElementById('ruleName').value,
            description: formData.get('ruleDescription') || document.getElementById('ruleDescription').value,
            metric: formData.get('ruleMetric') || document.getElementById('ruleMetric').value,
            operator: formData.get('ruleOperator') || document.getElementById('ruleOperator').value,
            threshold: parseFloat(formData.get('ruleThreshold') || document.getElementById('ruleThreshold').value),
            unit: formData.get('ruleUnit') || document.getElementById('ruleUnit').value,
            duration: parseInt(formData.get('ruleDuration') || document.getElementById('ruleDuration').value),
            severity: formData.get('ruleSeverity') || document.getElementById('ruleSeverity').value,
            status: 'active',
            notifications: ['email'],
            created: new Date(),
            lastTriggered: null
        };
        
        if (!rule.name || !rule.metric || !rule.threshold || !rule.duration) {
            this.showToast('请填写所有必填字段', 'error');
            return;
        }
        
        this.rules.unshift(rule);
        this.renderRules();
        this.hideModal();
        
        this.showToast('告警规则创建成功', 'success');
    }
    
    /**
     * 确认告警
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'acknowledged';
            this.renderAlerts();
            this.showToast('告警已确认', 'success');
        }
    }
    
    /**
     * 静默告警
     */
    silenceAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'silenced';
            this.renderAlerts();
            this.showToast('告警已静默', 'success');
        }
    }
    
    /**
     * 解决告警
     */
    resolveAlert(alertId) {
        if (confirm('确定要标记此告警为已解决吗？')) {
            const alertIndex = this.alerts.findIndex(a => a.id === alertId);
            if (alertIndex !== -1) {
                const alert = this.alerts.splice(alertIndex, 1)[0];
                alert.status = 'resolved';
                alert.endTime = new Date();
                
                // 添加到历史记录
                this.history.unshift({
                    ...alert,
                    duration: this.calculateDuration(alert.startTime, alert.endTime)
                });
                
                this.renderAlerts();
                this.showToast('告警已解决', 'success');
            }
        }
    }
    
    /**
     * 编辑规则
     */
    editRule(ruleId) {
        this.showToast('编辑规则功能正在开发中', 'info');
    }
    
    /**
     * 切换规则状态
     */
    toggleRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            rule.status = rule.status === 'active' ? 'disabled' : 'active';
            this.renderRules();
            this.showToast(`规则已${rule.status === 'active' ? '启用' : '禁用'}`, 'success');
        }
    }
    
    /**
     * 删除规则
     */
    deleteRule(ruleId) {
        if (confirm('确定要删除此告警规则吗？此操作不可恢复。')) {
            const index = this.rules.findIndex(r => r.id === ruleId);
            if (index !== -1) {
                this.rules.splice(index, 1);
                this.renderRules();
                this.showToast('规则已删除', 'success');
            }
        }
    }
    
    /**
     * 刷新数据
     */
    refreshData() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        // 模拟刷新过程
        setTimeout(() => {
            this.updateMetrics();
            this.renderServices();
            this.renderAlerts();
            
            document.getElementById('globalLoading').style.display = 'none';
            this.showToast('监控数据已刷新', 'success');
        }, 1500);
    }
    
    /**
     * 导出报告
     */
    exportReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            metrics: this.realTimeMetrics,
            alerts: this.alerts,
            services: this.services,
            summary: {
                totalAlerts: this.alerts.length,
                criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
                warningAlerts: this.alerts.filter(a => a.severity === 'warning').length,
                activeRules: this.rules.filter(r => r.status === 'active').length
            }
        };
        
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `monitoring-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('监控报告导出成功', 'success');
    }
    
    /**
     * 导入规则
     */
    importRules() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const rulesData = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (Array.isArray(rulesData)) {
                        this.rules = [...this.rules, ...rulesData];
                        this.renderRules();
                        this.showToast(`成功导入 ${rulesData.length} 条规则`, 'success');
                    } else {
                        throw new Error('规则文件格式不正确');
                    }
                    
                } catch (error) {
                    console.error('导入规则失败:', error);
                    this.showToast('导入规则失败: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    /**
     * 导出规则
     */
    exportRules() {
        const dataStr = JSON.stringify(this.rules, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `alert-rules-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('告警规则导出成功', 'success');
    }
    
    /**
     * 搜索历史记录
     */
    searchHistory() {
        this.filters.dateFrom = document.getElementById('historyDateFrom').value;
        this.filters.dateTo = document.getElementById('historyDateTo').value;
        this.currentPage = 1;
        this.renderHistory();
    }
    
    /**
     * 开始实时更新
     */
    startRealTimeUpdates() {
        // 每30秒更新一次指标
        this.refreshInterval = setInterval(() => {
            if (this.currentTab === 'overview') {
                this.updateMetrics();
            }
        }, 30000);
    }
    
    /**
     * 停止实时更新
     */
    stopRealTimeUpdates() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'normal': '正常',
            'warning': '警告',
            'critical': '严重',
            'error': '错误',
            'active': '启用',
            'disabled': '禁用',
            'firing': '触发中',
            'pending': '待处理',
            'resolved': '已解决',
            'acknowledged': '已确认',
            'silenced': '已静默'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 获取严重程度文本
     */
    getSeverityText(severity) {
        const severityMap = {
            'critical': '严重',
            'warning': '警告',
            'info': '信息'
        };
        return severityMap[severity] || severity;
    }
    
    /**
     * 获取指标名称
     */
    getMetricName(metric) {
        const metricMap = {
            'cpu_usage': 'CPU使用率',
            'memory_usage': '内存使用率',
            'disk_usage': '磁盘使用率',
            'network_in': '网络入流量',
            'network_out': '网络出流量',
            'response_time': '响应时间',
            'error_rate': '错误率'
        };
        return metricMap[metric] || metric;
    }
    
    /**
     * 获取服务名称
     */
    getServiceName(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        return service ? service.name : serviceId;
    }
    
    /**
     * 获取操作符文本
     */
    getOperatorText(operator) {
        const operatorMap = {
            'gt': '>',
            'gte': '>=',
            'lt': '<',
            'lte': '<=',
            'eq': '='
        };
        return operatorMap[operator] || operator;
    }
    
    /**
     * 计算持续时间
     */
    calculateDuration(startTime, endTime) {
        const duration = Math.floor((endTime - startTime) / 60000);
        if (duration < 60) {
            return `${duration}分钟`;
        } else if (duration < 1440) {
            return `${Math.floor(duration / 60)}小时${duration % 60}分钟`;
        } else {
            return `${Math.floor(duration / 1440)}天${Math.floor((duration % 1440) / 60)}小时`;
        }
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
            minute: '2-digit'
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
    
    /**
     * 销毁实例
     */
    destroy() {
        this.stopRealTimeUpdates();
    }
}

// 全局实例
let monitoringAlerts;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    monitoringAlerts = new MonitoringAlerts();
    console.log('监控告警系统已加载并初始化完成');
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (monitoringAlerts) {
        monitoringAlerts.destroy();
    }
});