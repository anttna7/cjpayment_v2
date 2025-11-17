/**
 * 系统配置管理
 * 负责系统参数配置、功能开关和业务规则设置
 */
class SystemConfigManager {
    constructor() {
        this.config = {};
        this.currentTab = 'basic';
        this.hasUnsavedChanges = false;
        this.ipWhitelist = [
            { ip: '192.168.1.0/24', description: '内网IP段' },
            { ip: '203.208.60.1', description: '办公室外网IP' }
        ];
        this.ipBlacklist = [];

        // 域名管理相关数据
        this.domains = [
            {
                id: 1,
                domainName: 'pay.cjpayment.com',
                domainType: 'primary',
                status: 'online',
                priority: 0,
                responseTime: 158,
                consecutiveFailures: 0,
                lastCheckTime: '刚刚',
                sslStatus: 'valid',
                description: '主要支付域名'
            },
            {
                id: 2,
                domainName: 'backup1.cjpayment.com',
                domainType: 'backup',
                status: 'online',
                priority: 1,
                responseTime: 165,
                consecutiveFailures: 0,
                lastCheckTime: '2分钟前',
                sslStatus: 'valid',
                description: '备用支付域名1'
            },
            {
                id: 3,
                domainName: 'backup2.cjpayment.com',
                domainType: 'backup',
                status: 'online',
                priority: 2,
                responseTime: 172,
                consecutiveFailures: 0,
                lastCheckTime: '3分钟前',
                sslStatus: 'valid',
                description: '备用支付域名2'
            }
        ];

        this.domainConfig = {
            autoFailoverEnabled: true,
            healthCheckInterval: 30,
            failureThreshold: 3,
            timeoutSeconds: 10,
            notificationEnabled: true,
            webhookUrl: '',
            logRetentionDays: 30,
            sslCheckEnabled: true
        };

        this.init();
    }
    
    init() {
        this.loadConfig();
        this.bindEvents();
        this.initTabs();
        this.renderIPLists();
        this.initDomainManagement();
        
        console.log('系统配置管理器已初始化');
    }
    
    /**
     * 加载系统配置
     */
    loadConfig() {
        // 模拟从服务器加载配置数据
        this.config = {
            basic: {
                companyName: 'CJPayment 企业支付系统',
                companyLogo: '',
                systemVersion: 'v2.0.1',
                systemDomain: 'pay.cjpayment.com',
                timeZone: 'Asia/Shanghai',
                language: 'zh-CN',
                dateFormat: 'YYYY-MM-DD',
                enableDarkMode: true
            },
            payment: {
                minPayAmount: 0.01,
                maxPayAmount: 1000000,
                dailyPayLimit: 5000000,
                monthlyPayLimit: 100000000,
                feeRate: 0.6,
                minFee: 0.01,
                maxFee: 1000,
                enableDynamicFee: true
            },
            notification: {
                smtpHost: 'smtp.qq.com',
                smtpPort: 587,
                smtpUsername: 'system@cjpayment.com',
                smtpPassword: '**************',
                enableSSL: true,
                smsProvider: 'aliyun',
                smsAccessKey: 'LTAI****************',
                smsSecretKey: '********************************',
                smsSignature: 'CJPayment'
            },
            advanced: {
                cacheExpireTime: 3600,
                maxConcurrentUsers: 1000,
                enableGzipCompression: true,
                logLevel: 'INFO',
                logRetentionDays: 90,
                enableSyslog: true
            }
        };
        
        this.populateFormFields();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 标签页切换
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // 保存配置按钮
        document.getElementById('saveAllConfig').addEventListener('click', () => this.saveAllConfig());
        
        // 导出配置按钮
        document.getElementById('exportConfig').addEventListener('click', () => this.exportConfig());
        
        // 导入配置按钮
        document.getElementById('importConfig').addEventListener('click', () => this.importConfig());
        
        // 监听表单变化
        this.bindFormChangeEvents();
        
        // 支付通道开关
        this.bindChannelSwitches();
        
        // 通知规则开关
        this.bindNotificationRules();
        
        // 页面离开前检查未保存的更改
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
            }
        });
    }
    
    /**
     * 初始化标签页
     */
    initTabs() {
        this.switchTab('basic');
    }
    
    /**
     * 切换标签页
     */
    switchTab(tabName) {
        // 特殊处理安全配置重定向
        if (tabName === 'security-redirect') {
            // 打开安全中心页面
            window.open('/security_center', '_blank');
            return;
        }
        
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
    }
    
    /**
     * 填充表单字段
     */
    populateFormFields() {
        Object.keys(this.config).forEach(section => {
            Object.keys(this.config[section]).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    const value = this.config[section][key];
                    
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                }
            });
        });
    }
    
    /**
     * 绑定表单变化事件
     */
    bindFormChangeEvents() {
        const formElements = document.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            const events = element.type === 'checkbox' ? ['change'] : ['input', 'change'];
            
            events.forEach(event => {
                element.addEventListener(event, () => {
                    this.markAsChanged();
                    this.updateConfigFromForm();
                });
            });
        });
    }
    
    /**
     * 绑定支付通道开关
     */
    bindChannelSwitches() {
        document.querySelectorAll('.channel-card .switch input').forEach(switchInput => {
            switchInput.addEventListener('change', (e) => {
                const channelCard = e.target.closest('.channel-card');
                const channelName = channelCard.querySelector('.channel-name').textContent;
                const statusElement = channelCard.querySelector('.channel-status');
                
                if (e.target.checked) {
                    statusElement.textContent = '已启用';
                    statusElement.className = 'channel-status channel-status--active';
                } else {
                    statusElement.textContent = '已禁用';
                    statusElement.className = 'channel-status channel-status--disabled';
                }
                
                this.markAsChanged();
                this.showToast(`${channelName}支付通道已${e.target.checked ? '启用' : '禁用'}`, 'success');
            });
        });
    }
    
    /**
     * 绑定通知规则开关
     */
    bindNotificationRules() {
        document.querySelectorAll('.rule-item .switch input').forEach(switchInput => {
            switchInput.addEventListener('change', (e) => {
                const ruleItem = e.target.closest('.rule-item');
                const ruleName = ruleItem.querySelector('.rule-name').textContent;
                
                this.markAsChanged();
                this.showToast(`${ruleName}规则已${e.target.checked ? '启用' : '禁用'}`, 'success');
            });
        });
    }
    
    /**
     * 从表单更新配置
     */
    updateConfigFromForm() {
        Object.keys(this.config).forEach(section => {
            Object.keys(this.config[section]).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        this.config[section][key] = element.checked;
                    } else if (element.type === 'number') {
                        this.config[section][key] = parseFloat(element.value) || 0;
                    } else {
                        this.config[section][key] = element.value;
                    }
                }
            });
        });
    }
    
    /**
     * 标记为已更改
     */
    markAsChanged() {
        this.hasUnsavedChanges = true;
        const saveButton = document.getElementById('saveAllConfig');
        if (saveButton) {
            saveButton.classList.add('btn-warning');
            saveButton.querySelector('.btn__text').textContent = '保存更改';
        }
    }
    
    /**
     * 标记为已保存
     */
    markAsSaved() {
        this.hasUnsavedChanges = false;
        const saveButton = document.getElementById('saveAllConfig');
        if (saveButton) {
            saveButton.classList.remove('btn-warning');
            saveButton.classList.add('btn-success');
            saveButton.querySelector('.btn__text').textContent = '已保存';
            
            setTimeout(() => {
                saveButton.classList.remove('btn-success');
                saveButton.querySelector('.btn__text').textContent = '保存配置';
            }, 2000);
        }
    }
    
    /**
     * 保存所有配置
     */
    async saveAllConfig() {
        try {
            document.getElementById('globalLoading').style.display = 'flex';
            
            this.updateConfigFromForm();
            
            // 模拟API调用
            await this.delay(1500);
            
            // 这里应该调用API保存配置
            console.log('保存配置:', this.config);
            
            this.markAsSaved();
            this.showToast('系统配置保存成功', 'success');
            
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showToast('保存配置失败: ' + error.message, 'error');
        } finally {
            document.getElementById('globalLoading').style.display = 'none';
        }
    }
    
    /**
     * 导出配置
     */
    exportConfig() {
        try {
            this.updateConfigFromForm();
            
            const configData = {
                ...this.config,
                exportTime: new Date().toISOString(),
                version: this.config.basic.systemVersion
            };
            
            const dataStr = JSON.stringify(configData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `cjpayment-config-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showToast('配置导出成功', 'success');
            
        } catch (error) {
            console.error('导出配置失败:', error);
            this.showToast('导出配置失败: ' + error.message, 'error');
        }
    }
    
    /**
     * 导入配置
     */
    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const configData = JSON.parse(e.target.result);
                    
                    // 验证配置格式
                    if (!this.validateConfigFormat(configData)) {
                        throw new Error('配置文件格式不正确');
                    }
                    
                    // 更新配置
                    this.config = { ...this.config, ...configData };
                    this.populateFormFields();
                    this.markAsChanged();
                    
                    this.showToast('配置导入成功', 'success');
                    
                } catch (error) {
                    console.error('导入配置失败:', error);
                    this.showToast('导入配置失败: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    /**
     * 验证配置格式
     */
    validateConfigFormat(configData) {
        const requiredSections = ['basic', 'payment', 'security', 'notification', 'advanced'];
        return requiredSections.every(section => configData.hasOwnProperty(section));
    }
    
    /**
     * 渲染IP列表
     */
    renderIPLists() {
        this.renderIPWhitelist();
        this.renderIPBlacklist();
    }
    
    /**
     * 渲染IP白名单
     */
    renderIPWhitelist() {
        const container = document.getElementById('ipWhitelist');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.ipWhitelist.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'ip-item';
            itemElement.innerHTML = `
                <div>
                    <span class="ip-address">${item.ip}</span>
                    <div class="ip-description">${item.description}</div>
                </div>
                <button class="ip-remove" onclick="systemConfig.removeFromWhitelist(${index})">删除</button>
            `;
            container.appendChild(itemElement);
        });
    }
    
    /**
     * 渲染IP黑名单
     */
    renderIPBlacklist() {
        const container = document.getElementById('ipBlacklist');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.ipBlacklist.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--config-secondary);">暂无黑名单IP</div>';
            return;
        }
        
        this.ipBlacklist.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'ip-item';
            itemElement.innerHTML = `
                <div>
                    <span class="ip-address">${item.ip}</span>
                    <div class="ip-description">${item.description}</div>
                </div>
                <button class="ip-remove" onclick="systemConfig.removeFromBlacklist(${index})">删除</button>
            `;
            container.appendChild(itemElement);
        });
    }
    
    /**
     * 添加IP到白名单
     */
    addIPToWhitelist() {
        const ipInput = document.getElementById('newWhitelistIP');
        const descInput = document.getElementById('newWhitelistDesc');
        
        const ip = ipInput.value.trim();
        const description = descInput.value.trim();
        
        if (!ip) {
            this.showToast('请输入IP地址', 'error');
            return;
        }
        
        if (!this.validateIP(ip)) {
            this.showToast('IP地址格式不正确', 'error');
            return;
        }
        
        this.ipWhitelist.push({ ip, description: description || '无描述' });
        this.renderIPWhitelist();
        this.markAsChanged();
        
        ipInput.value = '';
        descInput.value = '';
        
        this.showToast('IP已添加到白名单', 'success');
    }
    
    /**
     * 添加IP到黑名单
     */
    addIPToBlacklist() {
        const ipInput = document.getElementById('newBlacklistIP');
        const descInput = document.getElementById('newBlacklistDesc');
        
        const ip = ipInput.value.trim();
        const description = descInput.value.trim();
        
        if (!ip) {
            this.showToast('请输入IP地址', 'error');
            return;
        }
        
        if (!this.validateIP(ip)) {
            this.showToast('IP地址格式不正确', 'error');
            return;
        }
        
        this.ipBlacklist.push({ ip, description: description || '无描述' });
        this.renderIPBlacklist();
        this.markAsChanged();
        
        ipInput.value = '';
        descInput.value = '';
        
        this.showToast('IP已添加到黑名单', 'success');
    }
    
    /**
     * 从白名单移除IP
     */
    removeFromWhitelist(index) {
        if (confirm('确定要从白名单移除这个IP吗？')) {
            this.ipWhitelist.splice(index, 1);
            this.renderIPWhitelist();
            this.markAsChanged();
            this.showToast('IP已从白名单移除', 'success');
        }
    }
    
    /**
     * 从黑名单移除IP
     */
    removeFromBlacklist(index) {
        if (confirm('确定要从黑名单移除这个IP吗？')) {
            this.ipBlacklist.splice(index, 1);
            this.renderIPBlacklist();
            this.markAsChanged();
            this.showToast('IP已从黑名单移除', 'success');
        }
    }
    
    /**
     * 验证IP地址格式
     */
    validateIP(ip) {
        // 支持IPv4地址和CIDR格式
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:3[0-2]|[12]?[0-9]))?$/;
        return ipv4Regex.test(ip);
    }
    
    /**
     * 测试邮件配置
     */
    async testEmailConfig() {
        try {
            document.getElementById('globalLoading').style.display = 'flex';
            
            // 模拟测试邮件发送
            await this.delay(2000);
            
            this.showToast('测试邮件发送成功', 'success');
            
        } catch (error) {
            console.error('测试邮件失败:', error);
            this.showToast('测试邮件发送失败', 'error');
        } finally {
            document.getElementById('globalLoading').style.display = 'none';
        }
    }
    
    /**
     * 测试短信配置
     */
    async testSMSConfig() {
        try {
            document.getElementById('globalLoading').style.display = 'flex';
            
            // 模拟测试短信发送
            await this.delay(2000);
            
            this.showToast('测试短信发送成功', 'success');
            
        } catch (error) {
            console.error('测试短信失败:', error);
            this.showToast('测试短信发送失败', 'error');
        } finally {
            document.getElementById('globalLoading').style.display = 'none';
        }
    }
    
    /**
     * 运行数据库清理
     */
    async runDatabaseCleanup() {
        if (confirm('确定要运行数据库清理吗？这将删除过期的临时数据。')) {
            try {
                document.getElementById('globalLoading').style.display = 'flex';
                
                await this.delay(3000);
                
                this.showToast('数据库清理完成', 'success');
                
            } catch (error) {
                console.error('数据库清理失败:', error);
                this.showToast('数据库清理失败', 'error');
            } finally {
                document.getElementById('globalLoading').style.display = 'none';
            }
        }
    }
    
    /**
     * 清理系统缓存
     */
    async clearSystemCache() {
        if (confirm('确定要清理系统缓存吗？这将影响系统性能，直到缓存重新建立。')) {
            try {
                document.getElementById('globalLoading').style.display = 'flex';
                
                await this.delay(1500);
                
                this.showToast('系统缓存已清理', 'success');
                
            } catch (error) {
                console.error('清理缓存失败:', error);
                this.showToast('清理缓存失败', 'error');
            } finally {
                document.getElementById('globalLoading').style.display = 'none';
            }
        }
    }
    
    /**
     * 重启系统
     */
    async restartSystem() {
        if (confirm('确定要重启系统吗？这将中断所有用户的连接。请确保在维护时段进行此操作。')) {
            try {
                document.getElementById('globalLoading').style.display = 'flex';
                
                this.showToast('系统重启指令已发送，系统将在30秒后重启', 'warning');
                
                // 模拟重启过程
                await this.delay(2000);
                
            } catch (error) {
                console.error('系统重启失败:', error);
                this.showToast('系统重启失败', 'error');
            } finally {
                document.getElementById('globalLoading').style.display = 'none';
            }
        }
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
     * 延时函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== 域名管理相关方法 =====

    /**
     * 初始化域名管理
     */
    initDomainManagement() {
        this.updateDomainStats();
        this.populateDomainConfig();
        this.bindDomainEvents();
        console.log('域名管理已初始化');
    }

    /**
     * 绑定域名管理事件
     */
    bindDomainEvents() {
        // 刷新域名状态按钮
        const refreshBtn = document.getElementById('refreshDomainStatus');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDomainStatus());
        }

        // 添加域名按钮
        const addBtn = document.getElementById('addDomainBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddDomainModal());
        }

        // 查看全部事件按钮
        const viewAllBtn = document.getElementById('viewAllEvents');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.showAllFailoverEvents());
        }

        // 域名搜索
        const searchInput = document.getElementById('domainSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterDomains(e.target.value));
        }

        // 域名类型筛选
        const typeFilter = document.getElementById('domainTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => this.filterDomainsByType(e.target.value));
        }

        // 域名状态筛选
        const statusFilter = document.getElementById('domainStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filterDomainsByStatus(e.target.value));
        }

        // 域名配置变更事件
        const configInputs = [
            'autoFailoverEnabled', 'healthCheckInterval', 'failureThreshold',
            'timeoutSeconds', 'notificationEnabled', 'webhookUrl',
            'logRetentionDays', 'sslCheckEnabled'
        ];

        configInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, () => {
                    this.updateDomainConfigFromForm();
                    this.markAsChanged();
                });
            }
        });
    }

    /**
     * 更新域名统计
     */
    updateDomainStats() {
        const primaryCount = this.domains.filter(d => d.domainType === 'primary').length;
        const backupCount = this.domains.filter(d => d.domainType === 'backup').length;
        const onlineCount = this.domains.filter(d => d.status === 'online').length;
        const offlineCount = this.domains.filter(d => d.status === 'offline').length;

        // 更新统计显示
        const primaryEl = document.getElementById('primaryDomainCount');
        const backupEl = document.getElementById('backupDomainCount');
        const onlineEl = document.getElementById('onlineDomainCount');
        const offlineEl = document.getElementById('offlineDomainCount');

        if (primaryEl) primaryEl.textContent = primaryCount;
        if (backupEl) backupEl.textContent = backupCount;
        if (onlineEl) onlineEl.textContent = onlineCount;
        if (offlineEl) offlineEl.textContent = offlineCount;
    }

    /**
     * 填充域名配置表单
     */
    populateDomainConfig() {
        Object.keys(this.domainConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.domainConfig[key];
                } else {
                    element.value = this.domainConfig[key];
                }
            }
        });
    }

    /**
     * 从表单更新域名配置
     */
    updateDomainConfigFromForm() {
        Object.keys(this.domainConfig).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    this.domainConfig[key] = element.checked;
                } else if (element.type === 'number') {
                    this.domainConfig[key] = parseInt(element.value) || 0;
                } else {
                    this.domainConfig[key] = element.value;
                }
            }
        });
    }

    /**
     * 刷新域名状态
     */
    async refreshDomainStatus() {
        const refreshBtn = document.getElementById('refreshDomainStatus');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('.btn__text').textContent = '刷新中...';
        }

        try {
            // 模拟健康检查过程
            await this.delay(2000);

            // 随机更新一些域名的响应时间
            this.domains.forEach(domain => {
                if (domain.status === 'online') {
                    const baseTime = domain.domainType === 'primary' ? 150 : 160;
                    domain.responseTime = baseTime + Math.floor(Math.random() * 50);
                    domain.lastCheckTime = '刚刚';
                }
            });

            this.updateDomainStats();
            this.showToast('域名状态已刷新', 'success');

        } catch (error) {
            this.showToast('刷新域名状态失败', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('.btn__text').textContent = '刷新状态';
            }
        }
    }

    /**
     * 筛选域名
     */
    filterDomains(searchTerm) {
        const rows = document.querySelectorAll('.domain-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const domainName = row.querySelector('.domain-name').textContent.toLowerCase();
            const domainDesc = row.querySelector('.domain-desc').textContent.toLowerCase();

            if (domainName.includes(term) || domainDesc.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * 按类型筛选域名
     */
    filterDomainsByType(type) {
        const rows = document.querySelectorAll('.domain-row');

        rows.forEach(row => {
            if (!type) {
                row.style.display = '';
                return;
            }

            const domainType = row.querySelector('.domain-type');
            if (domainType && domainType.classList.contains(type)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * 按状态筛选域名
     */
    filterDomainsByStatus(status) {
        const rows = document.querySelectorAll('.domain-row');

        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
                return;
            }

            const domainStatus = row.querySelector('.domain-status');
            if (domainStatus && domainStatus.classList.contains(status)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * 显示添加域名模态框
     */
    showAddDomainModal() {
        // 这里应该显示一个模态框来添加新域名
        // 由于HTML中没有定义模态框，我们使用简单的prompt
        const domainName = prompt('请输入新域名:');
        if (domainName && this.validateDomainName(domainName)) {
            this.addNewDomain(domainName);
        } else if (domainName) {
            this.showToast('域名格式不正确', 'error');
        }
    }

    /**
     * 验证域名格式
     */
    validateDomainName(domain) {
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
        return domainRegex.test(domain);
    }

    /**
     * 添加新域名
     */
    addNewDomain(domainName) {
        const newDomain = {
            id: Math.max(...this.domains.map(d => d.id)) + 1,
            domainName,
            domainType: 'backup',
            status: 'checking',
            priority: Math.max(...this.domains.map(d => d.priority)) + 1,
            responseTime: 0,
            consecutiveFailures: 0,
            lastCheckTime: '从未',
            sslStatus: 'checking',
            description: '新添加的域名'
        };

        this.domains.push(newDomain);
        this.updateDomainStats();
        this.markAsChanged();
        this.showToast(`域名 ${domainName} 已添加`, 'success');

        // 模拟健康检查
        setTimeout(() => {
            newDomain.status = 'online';
            newDomain.responseTime = 180 + Math.floor(Math.random() * 30);
            newDomain.lastCheckTime = '刚刚';
            newDomain.sslStatus = 'valid';
            this.updateDomainStats();
            this.showToast(`域名 ${domainName} 健康检查完成`, 'success');
        }, 3000);
    }

    /**
     * 编辑域名
     */
    editDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        const newDescription = prompt('请输入域名描述:', domain.description);
        if (newDescription !== null) {
            domain.description = newDescription;
            this.markAsChanged();
            this.showToast('域名信息已更新', 'success');
        }
    }

    /**
     * 检查域名健康状态
     */
    async checkDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        domain.status = 'checking';
        this.showToast(`正在检查域名 ${domain.domainName}...`, 'info');

        try {
            await this.delay(2000);

            // 模拟健康检查结果
            const isHealthy = Math.random() > 0.1; // 90%健康率

            if (isHealthy) {
                domain.status = 'online';
                domain.responseTime = 150 + Math.floor(Math.random() * 100);
                domain.consecutiveFailures = 0;
                domain.lastCheckTime = '刚刚';
                this.showToast(`域名 ${domain.domainName} 检查完成：健康`, 'success');
            } else {
                domain.status = 'offline';
                domain.consecutiveFailures += 1;
                domain.lastCheckTime = '刚刚';
                this.showToast(`域名 ${domain.domainName} 检查完成：异常`, 'error');
            }

            this.updateDomainStats();

        } catch (error) {
            domain.status = 'offline';
            this.showToast(`域名 ${domain.domainName} 检查失败`, 'error');
        }
    }

    /**
     * 查看域名日志
     */
    viewDomainLogs(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        // 模拟日志数据
        const logs = [
            `[${new Date().toLocaleString()}] 域名健康检查 - 正常`,
            `[${new Date(Date.now() - 300000).toLocaleString()}] 域名健康检查 - 正常`,
            `[${new Date(Date.now() - 600000).toLocaleString()}] SSL证书检查 - 有效`,
            `[${new Date(Date.now() - 900000).toLocaleString()}] 域名健康检查 - 正常`
        ];

        alert(`域名 ${domain.domainName} 的最近日志:\n\n${logs.join('\n')}`);
    }

    /**
     * 显示所有故障转移事件
     */
    showAllFailoverEvents() {
        alert('故障转移事件详情页面开发中...\n\n这里将显示完整的故障转移历史记录，包括：\n- 事件时间\n- 事件类型\n- 影响范围\n- 处理结果\n- 恢复时间');
    }

    /**
     * 删除域名
     */
    removeDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        if (domain.domainType === 'primary') {
            this.showToast('不能删除主域名', 'error');
            return;
        }

        if (confirm(`确定要删除域名 ${domain.domainName} 吗？`)) {
            this.domains = this.domains.filter(d => d.id !== domainId);
            this.updateDomainStats();
            this.markAsChanged();
            this.showToast(`域名 ${domain.domainName} 已删除`, 'success');
        }
    }
}

// 全局函数
let systemConfig;

function addIPToWhitelist() {
    if (systemConfig) {
        systemConfig.addIPToWhitelist();
    }
}

function addIPToBlacklist() {
    if (systemConfig) {
        systemConfig.addIPToBlacklist();
    }
}

function testEmailConfig() {
    if (systemConfig) {
        systemConfig.testEmailConfig();
    }
}

function testSMSConfig() {
    if (systemConfig) {
        systemConfig.testSMSConfig();
    }
}

function runDatabaseCleanup() {
    if (systemConfig) {
        systemConfig.runDatabaseCleanup();
    }
}

function clearSystemCache() {
    if (systemConfig) {
        systemConfig.clearSystemCache();
    }
}

function restartSystem() {
    if (systemConfig) {
        systemConfig.restartSystem();
    }
}

// 域名管理全局函数
function editDomain(domainId) {
    if (systemConfig) {
        systemConfig.editDomain(domainId);
    }
}

function checkDomain(domainId) {
    if (systemConfig) {
        systemConfig.checkDomain(domainId);
    }
}

function viewDomainLogs(domainId) {
    if (systemConfig) {
        systemConfig.viewDomainLogs(domainId);
    }
}

function removeDomain(domainId) {
    if (systemConfig) {
        systemConfig.removeDomain(domainId);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    systemConfig = new SystemConfigManager();
    console.log('系统配置管理器已加载并初始化完成');
});