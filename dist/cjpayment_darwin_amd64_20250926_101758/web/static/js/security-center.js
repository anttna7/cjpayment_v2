/**
 * 安全中心管理系统
 * 负责安全策略、访问控制和风险监控管理
 */
class SecurityCenter {
    constructor() {
        this.currentTab = 'access-control';
        this.accessControlMode = 'blacklist_only'; // 当前访问控制模式
        this.accessStatistics = {
            allowedRequests: 0,
            blockedRequests: 0,
            totalRequests: 0
        };
        this.whitelist = [
            { ip: '192.168.1.0/24', description: '内网IP段', created: new Date('2024-01-15'), expiry: null },
            { ip: '203.208.60.1', description: '办公室外网IP', created: new Date('2024-02-01'), expiry: null },
            { ip: '110.242.68.3', description: '管理员家庭IP', created: new Date('2024-03-10'), expiry: new Date('2024-12-31') }
        ];
        this.blacklist = [
            { ip: '192.168.100.1', description: '恶意攻击IP', created: new Date('2024-03-15'), expiry: null },
            { ip: '10.0.0.0/8', description: '可疑网段', created: new Date('2024-03-20'), expiry: new Date('2024-06-20') }
        ];
        this.auditLogs = [];
        this.threats = [];
        this.detectionRules = [];
        this.currentLogPage = 1;
        this.logsPerPage = 20;
        this.filters = {
            logType: '',
            logLevel: '',
            search: ''
        };
        
        this.init();
    }
    
    init() {
        this.generateMockData();
        this.generateAccessStatistics();
        this.bindEvents();
        this.initTabs();
        this.initAccessControlMode();
        this.renderWhitelist();
        this.renderBlacklist();
        this.renderAuditLogs();
        this.renderThreats();
        this.renderDetectionRules();
        this.updateStatistics();
        this.updateAccessStatistics();
        
        console.log('安全中心已初始化');
    }
    
    /**
     * 生成模拟数据
     */
    generateMockData() {
        // 生成审计日志
        const logTypes = ['login', 'access', 'operation', 'security'];
        const logLevels = ['info', 'warning', 'error', 'critical'];
        const users = ['系统管理员', '财务管理员', '运营人员', '审计员'];
        const ips = ['192.168.1.100', '203.208.60.15', '110.242.68.3', '59.152.193.11'];
        
        this.auditLogs = [];
        for (let i = 0; i < 892; i++) {
            const type = logTypes[Math.floor(Math.random() * logTypes.length)];
            const level = logLevels[Math.floor(Math.random() * logLevels.length)];
            const user = users[Math.floor(Math.random() * users.length)];
            const ip = ips[Math.floor(Math.random() * ips.length)];
            const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            
            this.auditLogs.push({
                id: `log_${i}`,
                timestamp,
                type,
                level,
                content: this.generateLogContent(type, level),
                user,
                ip
            });
        }
        
        // 按时间倒序排列
        this.auditLogs.sort((a, b) => b.timestamp - a.timestamp);
        
        // 生成威胁数据
        this.threats = [
            {
                id: 'threat_001',
                title: '暴力破解攻击',
                description: '检测到来自IP 192.168.100.1的多次登录失败尝试',
                severity: 'high',
                source: '192.168.100.1',
                detected: new Date(Date.now() - 1800000),
                status: 'active'
            },
            {
                id: 'threat_002',
                title: '异常访问模式',
                description: '用户在非工作时间访问敏感资源',
                severity: 'medium',
                source: '203.208.60.15',
                detected: new Date(Date.now() - 3600000),
                status: 'investigating'
            },
            {
                id: 'threat_003',
                title: 'SQL注入尝试',
                description: '检测到可疑的SQL查询参数',
                severity: 'high',
                source: '110.242.68.99',
                detected: new Date(Date.now() - 900000),
                status: 'blocked'
            }
        ];
        
        // 生成检测规则
        this.detectionRules = [
            {
                id: 'rule_001',
                name: '登录失败检测',
                description: '5分钟内失败次数超过5次',
                status: 'active',
                triggered: 15
            },
            {
                id: 'rule_002',
                name: '异常IP访问',
                description: '非白名单IP访问敏感接口',
                status: 'active',
                triggered: 8
            },
            {
                id: 'rule_003',
                name: '大量数据下载',
                description: '单次下载超过1GB数据',
                status: 'disabled',
                triggered: 0
            }
        ];
    }
    
    /**
     * 生成日志内容
     */
    generateLogContent(type, level) {
        const contents = {
            login: {
                info: ['用户成功登录系统', '用户退出登录', '密码修改成功'],
                warning: ['密码即将过期提醒', '异地登录警告', '多设备同时登录'],
                error: ['登录失败：密码错误', '登录失败：账户锁定', '登录失败：验证码错误'],
                critical: ['检测到暴力破解攻击', '账户被异常锁定', '管理员权限被滥用']
            },
            access: {
                info: ['访问系统配置页面', '查看用户列表', '导出数据报表'],
                warning: ['访问敏感数据', '尝试访问未授权页面', '频繁刷新页面'],
                error: ['访问被拒绝：权限不足', '访问被拒绝：IP限制', '访问被拒绝：时间限制'],
                critical: ['尝试绕过权限控制', '检测到权限提升攻击', '非法访问管理员功能']
            },
            operation: {
                info: ['创建新用户账户', '修改用户权限', '更新系统配置'],
                warning: ['批量删除数据', '修改关键配置', '导出敏感信息'],
                error: ['操作失败：数据验证错误', '操作失败：权限不足', '操作失败：系统异常'],
                critical: ['删除关键数据', '修改安全策略', '禁用安全功能']
            },
            security: {
                info: ['安全策略更新', '密码策略变更', '会话配置修改'],
                warning: ['检测到可疑行为', '安全策略违规', '异常网络流量'],
                error: ['安全检查失败', '威胁检测触发', '访问控制违规'],
                critical: ['严重安全威胁', '系统被攻击', '数据泄露风险']
            }
        };
        
        const typeContents = contents[type] || contents.info;
        const levelContents = typeContents[level] || typeContents.info;
        return levelContents[Math.floor(Math.random() * levelContents.length)];
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
        document.getElementById('refreshSecurity')?.addEventListener('click', () => {
            this.refreshData();
        });
        
        document.getElementById('exportSecurityLog')?.addEventListener('click', () => {
            this.exportSecurityLog();
        });
        
        document.getElementById('createSecurityRule')?.addEventListener('click', () => {
            this.showToast('创建安全规则功能正在开发中', 'info');
        });
        
        // IP管理按钮
        document.getElementById('addWhitelistIP')?.addEventListener('click', () => {
            this.showIPModal('whitelist');
        });
        
        document.getElementById('addBlacklistIP')?.addEventListener('click', () => {
            this.showIPModal('blacklist');
        });
        
        // 批量操作
        document.getElementById('importIPList')?.addEventListener('click', () => {
            this.importIPList();
        });
        
        document.getElementById('exportIPList')?.addEventListener('click', () => {
            this.exportIPList();
        });
        
        document.getElementById('clearExpiredIPs')?.addEventListener('click', () => {
            this.clearExpiredIPs();
        });
        
        // 二次验证设置
        document.getElementById('testEmailTwoFactor')?.addEventListener('click', () => {
            this.testEmailTwoFactor();
        });
        
        document.getElementById('saveEmailTwoFactor')?.addEventListener('click', () => {
            this.saveEmailTwoFactor();
        });
        
        document.getElementById('testSmsTwoFactor')?.addEventListener('click', () => {
            this.testSmsTwoFactor();
        });
        
        document.getElementById('saveSmsTwoFactor')?.addEventListener('click', () => {
            this.saveSmsTwoFactor();
        });
        
        // 日志过滤
        document.getElementById('logSearch')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderAuditLogs();
        });
        
        document.getElementById('logTypeFilter')?.addEventListener('change', (e) => {
            this.filters.logType = e.target.value;
            this.renderAuditLogs();
        });
        
        document.getElementById('logLevelFilter')?.addEventListener('change', (e) => {
            this.filters.logLevel = e.target.value;
            this.renderAuditLogs();
        });
        
        // 日志分页
        document.getElementById('prevLogPage')?.addEventListener('click', () => {
            if (this.currentLogPage > 1) {
                this.currentLogPage--;
                this.renderAuditLogs();
            }
        });
        
        document.getElementById('nextLogPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.getFilteredLogs().length / this.logsPerPage);
            if (this.currentLogPage < totalPages) {
                this.currentLogPage++;
                this.renderAuditLogs();
            }
        });
        
        // 访问控制模式切换
        document.querySelectorAll('input[name="accessMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.changeAccessMode(e.target.value);
                }
            });
        });
        
        document.getElementById('applyModeSettings')?.addEventListener('click', () => {
            this.applyAccessModeSettings();
        });
        
        // 安全策略
        document.getElementById('resetPolicyDefaults')?.addEventListener('click', () => {
            this.resetPolicyDefaults();
        });
        
        document.getElementById('savePolicySettings')?.addEventListener('click', () => {
            this.savePolicySettings();
        });
        
        // 模态框事件
        this.bindModalEvents();
    }
    
    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        const modal = document.getElementById('ipAddressModal');
        const closeBtn = document.getElementById('ipModalClose');
        const cancelBtn = document.getElementById('cancelIPBtn');
        const form = document.getElementById('ipAddressForm');
        
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
            this.addIPAddress();
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
        this.switchTab('access-control');
    }
    
    /**
     * 初始化访问控制模式
     */
    initAccessControlMode() {
        // 设置默认选中的模式
        const defaultMode = document.getElementById('blacklistOnlyMode');
        if (defaultMode) {
            defaultMode.checked = true;
        }
        this.updateModeStatus();
    }
    
    /**
     * 生成访问统计数据
     */
    generateAccessStatistics() {
        // 模拟访问统计数据
        this.accessStatistics = {
            allowedRequests: Math.floor(Math.random() * 10000) + 5000,
            blockedRequests: Math.floor(Math.random() * 500) + 100,
            totalRequests: 0
        };
        this.accessStatistics.totalRequests = this.accessStatistics.allowedRequests + this.accessStatistics.blockedRequests;
    }
    
    /**
     * 切换访问控制模式
     */
    changeAccessMode(mode) {
        this.accessControlMode = mode;
        this.updateModeStatus();
        
        // 根据模式调整统计数据
        this.adjustStatisticsByMode(mode);
        this.updateAccessStatistics();
        
        console.log(`访问控制模式已切换为: ${mode}`);
    }
    
    /**
     * 更新模式状态显示
     */
    updateModeStatus() {
        const statusElement = document.getElementById('currentModeStatus');
        if (!statusElement) return;
        
        const modeNames = {
            'blacklist_only': '仅黑名单模式',
            'whitelist_only': '仅白名单模式',
            'mixed': '混合模式',
            'disabled': '禁用模式'
        };
        
        statusElement.textContent = `当前模式：${modeNames[this.accessControlMode] || '未知模式'}`;
    }
    
    /**
     * 根据模式调整统计数据
     */
    adjustStatisticsByMode(mode) {
        switch (mode) {
            case 'blacklist_only':
                // 仅黑名单模式：允许大部分请求，少量阻止
                this.accessStatistics.allowedRequests = Math.floor(Math.random() * 8000) + 7000;
                this.accessStatistics.blockedRequests = Math.floor(Math.random() * 200) + 50;
                break;
            case 'whitelist_only':
                // 仅白名单模式：严格控制，阻止大部分请求
                this.accessStatistics.allowedRequests = Math.floor(Math.random() * 1000) + 500;
                this.accessStatistics.blockedRequests = Math.floor(Math.random() * 5000) + 3000;
                break;
            case 'mixed':
                // 混合模式：平衡的访问控制
                this.accessStatistics.allowedRequests = Math.floor(Math.random() * 5000) + 4000;
                this.accessStatistics.blockedRequests = Math.floor(Math.random() * 1000) + 500;
                break;
            case 'disabled':
                // 禁用模式：允许所有请求
                this.accessStatistics.allowedRequests = Math.floor(Math.random() * 10000) + 9000;
                this.accessStatistics.blockedRequests = 0;
                break;
        }
        this.accessStatistics.totalRequests = this.accessStatistics.allowedRequests + this.accessStatistics.blockedRequests;
    }
    
    /**
     * 应用访问模式设置
     */
    applyAccessModeSettings() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        // 模拟应用设置的过程
        setTimeout(() => {
            document.getElementById('globalLoading').style.display = 'none';
            this.showToast(`${this.getCurrentModeDisplayName()} 设置已应用`, 'success');
            
            // 重新生成统计数据以模拟设置应用后的效果
            this.adjustStatisticsByMode(this.accessControlMode);
            this.updateAccessStatistics();
        }, 1500);
    }
    
    /**
     * 获取当前模式的显示名称
     */
    getCurrentModeDisplayName() {
        const modeNames = {
            'blacklist_only': '仅黑名单模式',
            'whitelist_only': '仅白名单模式',
            'mixed': '混合模式',
            'disabled': '禁用模式'
        };
        return modeNames[this.accessControlMode] || '未知模式';
    }
    
    /**
     * 更新访问统计数据显示
     */
    updateAccessStatistics() {
        document.getElementById('allowedRequests').textContent = this.accessStatistics.allowedRequests.toLocaleString();
        document.getElementById('blockedRequests').textContent = this.accessStatistics.blockedRequests.toLocaleString();
        
        // 计算控制效率
        const efficiency = this.accessStatistics.totalRequests > 0 ? 
            ((this.accessStatistics.allowedRequests / this.accessStatistics.totalRequests) * 100).toFixed(1) : 
            100;
        document.getElementById('accessControlEfficiency').textContent = `${efficiency}%`;
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
    }
    
    /**
     * 渲染白名单
     */
    renderWhitelist() {
        const container = document.getElementById('whitelistContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.whitelist.forEach((item, index) => {
            const ipItem = document.createElement('div');
            ipItem.className = 'ip-item';
            
            const expiryText = item.expiry ? 
                `过期时间: ${this.formatDate(item.expiry)}` : 
                '永久有效';
            
            ipItem.innerHTML = `
                <div class="ip-info">
                    <div class="ip-address">${item.ip}</div>
                    <div class="ip-description">${item.description}</div>
                    <div class="ip-description">${expiryText}</div>
                </div>
                <div class="ip-actions">
                    <button class="ip-action-btn ip-action-btn--edit" onclick="securityCenter.editIP('whitelist', ${index})">
                        编辑
                    </button>
                    <button class="ip-action-btn ip-action-btn--delete" onclick="securityCenter.removeIP('whitelist', ${index})">
                        删除
                    </button>
                </div>
            `;
            container.appendChild(ipItem);
        });
        
        if (this.whitelist.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--security-secondary);">暂无白名单IP</div>';
        }
    }
    
    /**
     * 渲染黑名单
     */
    renderBlacklist() {
        const container = document.getElementById('blacklistContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.blacklist.forEach((item, index) => {
            const ipItem = document.createElement('div');
            ipItem.className = 'ip-item';
            
            const expiryText = item.expiry ? 
                `过期时间: ${this.formatDate(item.expiry)}` : 
                '永久有效';
            
            ipItem.innerHTML = `
                <div class="ip-info">
                    <div class="ip-address">${item.ip}</div>
                    <div class="ip-description">${item.description}</div>
                    <div class="ip-description">${expiryText}</div>
                </div>
                <div class="ip-actions">
                    <button class="ip-action-btn ip-action-btn--edit" onclick="securityCenter.editIP('blacklist', ${index})">
                        编辑
                    </button>
                    <button class="ip-action-btn ip-action-btn--delete" onclick="securityCenter.removeIP('blacklist', ${index})">
                        删除
                    </button>
                </div>
            `;
            container.appendChild(ipItem);
        });
        
        if (this.blacklist.length === 0) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--security-secondary);">暂无黑名单IP</div>';
        }
    }
    
    /**
     * 渲染审计日志
     */
    renderAuditLogs() {
        const container = document.getElementById('auditLogContainer');
        if (!container) return;
        
        const filteredLogs = this.getFilteredLogs();
        const startIndex = (this.currentLogPage - 1) * this.logsPerPage;
        const endIndex = startIndex + this.logsPerPage;
        const pageData = filteredLogs.slice(startIndex, endIndex);
        
        container.innerHTML = '';
        
        pageData.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.innerHTML = `
                <div class="log-time">${this.formatTime(log.timestamp)}</div>
                <div class="log-level log-level--${log.level}">${log.level.toUpperCase()}</div>
                <div class="log-content">${log.content}</div>
                <div class="log-user">${log.user}</div>
                <div class="log-ip">${log.ip}</div>
            `;
            container.appendChild(logItem);
        });
        
        // 更新分页信息
        this.updateLogPagination(filteredLogs.length);
    }
    
    /**
     * 渲染威胁列表
     */
    renderThreats() {
        const container = document.getElementById('threatList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.threats.forEach(threat => {
            const threatItem = document.createElement('div');
            threatItem.className = `threat-item threat-item--${threat.severity}`;
            threatItem.innerHTML = `
                <div class="threat-header">
                    <div class="threat-title">${threat.title}</div>
                    <span class="threat-severity threat-severity--${threat.severity}">
                        ${this.getSeverityText(threat.severity)}
                    </span>
                </div>
                <div class="threat-description">${threat.description}</div>
                <div class="threat-actions">
                    <button class="ip-action-btn ip-action-btn--edit" onclick="securityCenter.investigateThreat('${threat.id}')">
                        调查
                    </button>
                    <button class="ip-action-btn ip-action-btn--delete" onclick="securityCenter.blockThreat('${threat.id}')">
                        阻止
                    </button>
                </div>
            `;
            container.appendChild(threatItem);
        });
    }
    
    /**
     * 渲染检测规则
     */
    renderDetectionRules() {
        const container = document.getElementById('detectionRulesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.detectionRules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.innerHTML = `
                <div class="rule-header">
                    <div class="rule-name">${rule.name}</div>
                    <span class="rule-status rule-status--${rule.status}">
                        ${rule.status === 'active' ? '启用' : '禁用'}
                    </span>
                </div>
                <div class="rule-description">${rule.description}</div>
                <div class="rule-description">触发次数: ${rule.triggered}</div>
            `;
            container.appendChild(ruleItem);
        });
    }
    
    /**
     * 更新统计数据
     */
    updateStatistics() {
        document.getElementById('blacklistCount').textContent = this.blacklist.length;
        document.getElementById('whitelistCount').textContent = this.whitelist.length;
        
        // 计算今日风险事件
        const today = new Date();
        const todayThreats = this.threats.filter(threat => {
            return threat.detected.toDateString() === today.toDateString();
        });
        document.getElementById('riskEvents').textContent = todayThreats.length;
    }
    
    /**
     * 获取过滤后的日志
     */
    getFilteredLogs() {
        return this.auditLogs.filter(log => {
            if (this.filters.logType && log.type !== this.filters.logType) {
                return false;
            }
            if (this.filters.logLevel && log.level !== this.filters.logLevel) {
                return false;
            }
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                if (!log.content.toLowerCase().includes(searchTerm) && 
                    !log.user.toLowerCase().includes(searchTerm) &&
                    !log.ip.includes(searchTerm)) {
                    return false;
                }
            }
            return true;
        });
    }
    
    /**
     * 更新日志分页
     */
    updateLogPagination(totalLogs) {
        const startIndex = (this.currentLogPage - 1) * this.logsPerPage + 1;
        const endIndex = Math.min(this.currentLogPage * this.logsPerPage, totalLogs);
        
        document.getElementById('logStart').textContent = startIndex;
        document.getElementById('logEnd').textContent = endIndex;
        document.getElementById('logTotal').textContent = totalLogs;
        
        // 更新按钮状态
        document.getElementById('prevLogPage').disabled = this.currentLogPage === 1;
        document.getElementById('nextLogPage').disabled = endIndex >= totalLogs;
    }
    
    /**
     * 显示IP地址模态框
     */
    showIPModal(type) {
        this.currentIPType = type;
        const modal = document.getElementById('ipAddressModal');
        const title = document.getElementById('ipModalTitle');
        
        if (modal && title) {
            title.textContent = type === 'whitelist' ? '添加白名单IP' : '添加黑名单IP';
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // 重置表单
            document.getElementById('ipAddressForm').reset();
        }
    }
    
    /**
     * 隐藏模态框
     */
    hideModal() {
        const modal = document.getElementById('ipAddressModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
    
    /**
     * 添加IP地址
     */
    addIPAddress() {
        const ip = document.getElementById('ipAddress').value.trim();
        const description = document.getElementById('ipDescription').value.trim();
        const expiryHours = document.getElementById('ipExpiry').value;
        
        if (!ip) {
            this.showToast('请输入IP地址', 'error');
            return;
        }
        
        if (!this.validateIP(ip)) {
            this.showToast('IP地址格式不正确', 'error');
            return;
        }
        
        const expiry = expiryHours ? 
            new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000) : 
            null;
        
        const ipData = {
            ip,
            description: description || '无描述',
            created: new Date(),
            expiry
        };
        
        if (this.currentIPType === 'whitelist') {
            this.whitelist.push(ipData);
            this.renderWhitelist();
        } else {
            this.blacklist.push(ipData);
            this.renderBlacklist();
        }
        
        this.updateStatistics();
        this.hideModal();
        
        const listName = this.currentIPType === 'whitelist' ? '白名单' : '黑名单';
        this.showToast(`IP已添加到${listName}`, 'success');
    }
    
    /**
     * 编辑IP地址
     */
    editIP(type, index) {
        this.showToast('编辑IP功能正在开发中', 'info');
    }
    
    /**
     * 移除IP地址
     */
    removeIP(type, index) {
        const listName = type === 'whitelist' ? '白名单' : '黑名单';
        
        if (confirm(`确定要从${listName}移除这个IP吗？`)) {
            if (type === 'whitelist') {
                this.whitelist.splice(index, 1);
                this.renderWhitelist();
            } else {
                this.blacklist.splice(index, 1);
                this.renderBlacklist();
            }
            
            this.updateStatistics();
            this.showToast(`IP已从${listName}移除`, 'success');
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
     * 导入IP列表
     */
    importIPList() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.txt';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let importData;
                    
                    if (file.type === 'application/json') {
                        importData = JSON.parse(e.target.result);
                    } else {
                        // 处理CSV或TXT格式
                        const lines = e.target.result.split('\n');
                        importData = lines.map(line => {
                            const parts = line.split(',');
                            return {
                                ip: parts[0]?.trim(),
                                description: parts[1]?.trim() || '批量导入',
                                created: new Date(),
                                expiry: null
                            };
                        }).filter(item => item.ip && this.validateIP(item.ip));
                    }
                    
                    if (Array.isArray(importData) && importData.length > 0) {
                        // 简单处理：添加到白名单
                        this.whitelist.push(...importData);
                        this.renderWhitelist();
                        this.updateStatistics();
                        this.showToast(`成功导入 ${importData.length} 个IP地址`, 'success');
                    } else {
                        throw new Error('文件格式不正确或没有有效的IP地址');
                    }
                    
                } catch (error) {
                    console.error('导入IP列表失败:', error);
                    this.showToast('导入失败: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    /**
     * 导出IP列表
     */
    exportIPList() {
        const exportData = {
            whitelist: this.whitelist,
            blacklist: this.blacklist,
            exportTime: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ip-lists-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('IP列表导出成功', 'success');
    }
    
    /**
     * 清理过期IP
     */
    clearExpiredIPs() {
        const now = new Date();
        let expiredCount = 0;
        
        // 清理白名单过期IP
        this.whitelist = this.whitelist.filter(item => {
            if (item.expiry && item.expiry <= now) {
                expiredCount++;
                return false;
            }
            return true;
        });
        
        // 清理黑名单过期IP
        this.blacklist = this.blacklist.filter(item => {
            if (item.expiry && item.expiry <= now) {
                expiredCount++;
                return false;
            }
            return true;
        });
        
        if (expiredCount > 0) {
            this.renderWhitelist();
            this.renderBlacklist();
            this.updateStatistics();
            this.showToast(`已清理 ${expiredCount} 个过期IP`, 'success');
        } else {
            this.showToast('没有发现过期IP', 'info');
        }
    }
    
    /**
     * 测试邮箱二次验证
     */
    async testEmailTwoFactor() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        try {
            // 模拟发送测试邮件
            await this.delay(2000);
            this.showToast('测试邮件发送成功', 'success');
        } catch (error) {
            this.showToast('测试邮件发送失败', 'error');
        } finally {
            document.getElementById('globalLoading').style.display = 'none';
        }
    }
    
    /**
     * 保存邮箱二次验证配置
     */
    saveEmailTwoFactor() {
        this.showToast('邮箱二次验证配置已保存', 'success');
    }
    
    /**
     * 测试短信二次验证
     */
    async testSmsTwoFactor() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        try {
            // 模拟发送测试短信
            await this.delay(2000);
            this.showToast('测试短信发送成功', 'success');
        } catch (error) {
            this.showToast('测试短信发送失败', 'error');
        } finally {
            document.getElementById('globalLoading').style.display = 'none';
        }
    }
    
    /**
     * 保存短信二次验证配置
     */
    saveSmsTwoFactor() {
        this.showToast('短信二次验证配置已保存', 'success');
    }
    
    /**
     * 调查威胁
     */
    investigateThreat(threatId) {
        this.showToast('威胁调查功能正在开发中', 'info');
    }
    
    /**
     * 阻止威胁
     */
    blockThreat(threatId) {
        const threat = this.threats.find(t => t.id === threatId);
        if (threat && confirm('确定要阻止此威胁吗？')) {
            threat.status = 'blocked';
            this.renderThreats();
            this.showToast('威胁已被阻止', 'success');
        }
    }
    
    /**
     * 重置策略默认值
     */
    resetPolicyDefaults() {
        if (confirm('确定要重置所有安全策略为默认值吗？')) {
            this.showToast('安全策略已重置为默认值', 'success');
        }
    }
    
    /**
     * 保存策略设置
     */
    savePolicySettings() {
        this.showToast('安全策略设置已保存', 'success');
    }
    
    /**
     * 刷新数据
     */
    refreshData() {
        document.getElementById('globalLoading').style.display = 'flex';
        
        // 模拟刷新过程
        setTimeout(() => {
            this.generateMockData();
            this.generateAccessStatistics();
            this.adjustStatisticsByMode(this.accessControlMode);
            this.renderWhitelist();
            this.renderBlacklist();
            this.renderAuditLogs();
            this.renderThreats();
            this.renderDetectionRules();
            this.updateStatistics();
            this.updateAccessStatistics();
            
            document.getElementById('globalLoading').style.display = 'none';
            this.showToast('安全数据已刷新', 'success');
        }, 1500);
    }
    
    /**
     * 导出安全日志
     */
    exportSecurityLog() {
        const filteredLogs = this.getFilteredLogs();
        const csvContent = this.convertLogsToCSV(filteredLogs);
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `security-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        
        this.showToast('安全日志导出成功', 'success');
    }
    
    /**
     * 转换日志为CSV格式
     */
    convertLogsToCSV(logs) {
        const headers = ['时间', '类型', '级别', '内容', '用户', 'IP地址'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                this.formatTime(log.timestamp),
                log.type,
                log.level,
                `"${log.content}"`,
                log.user,
                log.ip
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    /**
     * 获取严重程度文本
     */
    getSeverityText(severity) {
        const severityMap = {
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        return severityMap[severity] || severity;
    }
    
    /**
     * 格式化日期
     */
    formatDate(date) {
        return date.toLocaleDateString('zh-CN');
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
     * 延时函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
}

// 全局实例
let securityCenter;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    securityCenter = new SecurityCenter();
    console.log('安全中心已加载并初始化完成');
});