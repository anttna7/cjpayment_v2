// 内嵌权限配置组件 - 适配模态框环境
class InlinePermissionConfig {
    constructor(options = {}) {
        this.options = {
            container: '#inlinePermissionContainer',
            mode: 'compact', // 'compact', 'detailed'
            type: 'user', // 'user', 'role'
            targetId: null,
            targetName: '',
            showRoleSelector: true, // 显示角色选择器
            showPermissionDetails: true, // 显示详细权限
            showTemplates: true, // 显示权限模板
            allowCustomPermissions: true, // 允许自定义权限
            onRoleChange: null,
            onPermissionChange: null,
            onSave: null,
            ...options
        };

        // 数据存储
        this.roles = [];
        this.permissions = [];
        this.permissionTemplates = [];
        this.selectedRole = null;
        this.selectedPermissions = new Set();
        this.customPermissions = new Set();

        this.init();
    }

    async init() {
        this.container = document.querySelector(this.options.container);
        if (!this.container) {
            console.error('Inline permission config container not found:', this.options.container);
            return;
        }

        await this.loadData();
        this.render();
        this.bindEvents();

        console.log('InlinePermissionConfig initialized');
    }

    async loadData() {
        try {
            // 加载角色数据
            const rolesResponse = await fetch('/api/roles');
            const rolesData = await rolesResponse.json();
            this.roles = rolesData.success ? rolesData.roles : this.getMockRoles();

            // 加载权限数据
            const permissionsResponse = await fetch('/api/permissions');
            const permissionsData = await permissionsResponse.json();
            this.permissions = permissionsData.success ? this.flattenPermissions(permissionsData.permissions) : this.getMockPermissions();

            // 加载权限模板
            this.permissionTemplates = this.getPermissionTemplates();

            // 加载当前目标的权限配置
            if (this.options.targetId) {
                await this.loadCurrentPermissions();
            }
        } catch (error) {
            console.error('Failed to load permission data:', error);
            // 使用模拟数据
            this.roles = this.getMockRoles();
            this.permissions = this.getMockPermissions();
            this.permissionTemplates = this.getPermissionTemplates();
        }
    }

    flattenPermissions(permissionGroups) {
        const flattened = [];
        Object.entries(permissionGroups).forEach(([category, perms]) => {
            perms.forEach(perm => {
                flattened.push({
                    ...perm,
                    category: category
                });
            });
        });
        return flattened;
    }

    async loadCurrentPermissions() {
        try {
            const url = this.options.type === 'user'
                ? `/api/users/${this.options.targetId}/permissions`
                : `/api/roles/${this.options.targetId}/permissions`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.selectedPermissions = new Set(data.permissions || []);
                this.selectedRole = data.role || null;
            }
        } catch (error) {
            console.error('Failed to load current permissions:', error);
        }
    }

    render() {
        const html = this.generateHTML();
        this.container.innerHTML = html;
        this.renderRoleSelector();
        this.renderPermissionList();
        this.updatePermissionSummary();
    }

    generateHTML() {
        return `
            <div class="inline-permission-config">
                <!-- 权限配置头部 -->
                <div class="permission-header">
                    <h4 class="permission-title">
                        <span class="permission-icon">🔐</span>
                        权限配置
                        <span class="permission-target">${this.options.targetName || ''}</span>
                    </h4>
                    <div class="permission-mode-toggle">
                        <button class="mode-btn mode-btn--active" data-mode="role">角色权限</button>
                        <button class="mode-btn" data-mode="custom">自定义权限</button>
                    </div>
                </div>

                <!-- 角色选择器 -->
                ${this.options.showRoleSelector ? `
                    <div class="permission-section" id="roleSelectorSection">
                        <div class="section-header">
                            <h5 class="section-title">选择角色</h5>
                            <div class="section-help">
                                角色提供基础权限，您可以在此基础上添加额外权限
                            </div>
                        </div>
                        <div class="role-selector" id="roleSelector">
                            <!-- 角色选项将通过JavaScript生成 -->
                        </div>
                    </div>
                ` : ''}

                <!-- 权限模板 -->
                ${this.options.showTemplates ? `
                    <div class="permission-section" id="templateSection">
                        <div class="section-header">
                            <h5 class="section-title">快速权限模板</h5>
                            <div class="section-help">选择常用权限组合，快速配置用户权限</div>
                        </div>
                        <div class="permission-templates" id="permissionTemplates">
                            ${this.renderPermissionTemplates()}
                        </div>
                    </div>
                ` : ''}

                <!-- 详细权限配置 -->
                ${this.options.showPermissionDetails ? `
                    <div class="permission-section" id="permissionDetailsSection">
                        <div class="section-header">
                            <h5 class="section-title">详细权限</h5>
                            <div class="permission-search">
                                <input type="text"
                                       id="permissionSearch"
                                       class="search-input"
                                       placeholder="搜索权限...">
                            </div>
                        </div>
                        <div class="permission-list" id="permissionList">
                            <!-- 权限列表将通过JavaScript生成 -->
                        </div>
                    </div>
                ` : ''}

                <!-- 权限摘要 -->
                <div class="permission-summary" id="permissionSummary">
                    <div class="summary-header">
                        <h5 class="summary-title">权限摘要</h5>
                        <span class="permission-count" id="permissionCount">0个权限</span>
                    </div>
                    <div class="summary-content" id="summaryContent">
                        <!-- 权限摘要将通过JavaScript生成 -->
                    </div>
                </div>

                <!-- 权限冲突警告 -->
                <div class="permission-warnings" id="permissionWarnings" style="display: none;">
                    <div class="warning-header">
                        <span class="warning-icon">⚠️</span>
                        <span class="warning-title">权限冲突提醒</span>
                    </div>
                    <div class="warning-content" id="warningContent">
                        <!-- 冲突警告将通过JavaScript生成 -->
                    </div>
                </div>
            </div>
        `;
    }

    renderRoleSelector() {
        const roleSelector = document.getElementById('roleSelector');
        if (!roleSelector) return;

        const html = this.roles.map(role => `
            <div class="role-option ${this.selectedRole === role.id ? 'selected' : ''}"
                 data-role="${role.id}">
                <div class="role-header">
                    <div class="role-info">
                        <span class="role-name">${role.name}</span>
                        <span class="role-level">级别 ${role.level}</span>
                    </div>
                    <div class="role-permissions-count">
                        ${role.permissions.length} 个权限
                    </div>
                </div>
                <div class="role-description">${role.description}</div>
                <div class="role-permissions-preview">
                    ${role.permissions.slice(0, 3).map(perm =>
                        `<span class="permission-tag">${this.getPermissionName(perm)}</span>`
                    ).join('')}
                    ${role.permissions.length > 3 ? `<span class="more-permissions">+${role.permissions.length - 3}</span>` : ''}
                </div>
            </div>
        `).join('');

        roleSelector.innerHTML = html;
    }

    renderPermissionList() {
        const permissionList = document.getElementById('permissionList');
        if (!permissionList) return;

        // 按分类分组权限
        const groupedPermissions = this.groupPermissionsByCategory();

        const html = Object.entries(groupedPermissions).map(([category, perms]) => `
            <div class="permission-category">
                <div class="category-header">
                    <span class="category-icon">${this.getCategoryIcon(category)}</span>
                    <span class="category-name">${category}</span>
                    <label class="category-toggle">
                        <input type="checkbox" class="category-checkbox" data-category="${category}">
                        <span class="checkbox-custom"></span>
                        <span class="toggle-text">全选</span>
                    </label>
                </div>
                <div class="category-permissions">
                    ${perms.map(perm => `
                        <label class="permission-item">
                            <input type="checkbox"
                                   class="permission-checkbox"
                                   data-permission="${perm.id}"
                                   ${this.selectedPermissions.has(perm.id) ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            <div class="permission-info">
                                <span class="permission-name">${perm.name}</span>
                                <span class="permission-desc">${perm.description || ''}</span>
                                <div class="permission-meta">
                                    <span class="permission-code">${perm.resource}:${perm.action}</span>
                                    <span class="permission-level level-${perm.level}">L${perm.level}</span>
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        permissionList.innerHTML = html;
    }

    groupPermissionsByCategory() {
        const grouped = {};
        this.permissions.forEach(perm => {
            const category = perm.category || '其他';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(perm);
        });
        return grouped;
    }

    renderPermissionTemplates() {
        // 按类别分组权限模板
        const templatesByCategory = {};
        this.permissionTemplates.forEach(template => {
            const category = template.category || 'basic';
            if (!templatesByCategory[category]) {
                templatesByCategory[category] = [];
            }
            templatesByCategory[category].push(template);
        });

        const categoryNames = {
            'basic': '基础权限',
            'service': '客服岗位',
            'finance': '财务岗位',
            'operation': '运营岗位',
            'technical': '技术岗位',
            'analyst': '分析岗位',
            'merchant': '商户岗位',
            'compliance': '合规岗位',
            'emergency': '应急权限'
        };

        return Object.entries(templatesByCategory).map(([category, templates]) => `
            <div class="template-category">
                <h6 class="template-category-title">${categoryNames[category] || category}</h6>
                <div class="template-category-items">
                    ${templates.map(template => `
                        <button class="template-btn" data-template="${template.id}" title="${template.description}">
                            <span class="template-icon">${template.icon}</span>
                            <span class="template-name">${template.name}</span>
                            <span class="template-desc">${template.description}</span>
                            <span class="template-count">${template.permissions.length}个权限</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    bindEvents() {
        // 模式切换
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // 角色选择
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectRole(e.currentTarget.dataset.role);
            });
        });

        // 权限模板
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyTemplate(e.currentTarget.dataset.template);
            });
        });

        // 权限搜索
        const searchInput = document.getElementById('permissionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPermissions(e.target.value);
            });
        }

        // 权限选择
        document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.togglePermission(e.target.dataset.permission, e.target.checked);
            });
        });

        // 分类全选
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleCategoryPermissions(e.target.dataset.category, e.target.checked);
            });
        });
    }

    switchMode(mode) {
        // 更新模式按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('mode-btn--active', btn.dataset.mode === mode);
        });

        // 显示/隐藏对应的区域
        const roleSelectorSection = document.getElementById('roleSelectorSection');
        const templateSection = document.getElementById('templateSection');

        if (mode === 'role') {
            if (roleSelectorSection) roleSelectorSection.style.display = 'block';
            if (templateSection) templateSection.style.display = 'block';
        } else {
            if (roleSelectorSection) roleSelectorSection.style.display = 'none';
            if (templateSection) templateSection.style.display = 'none';
        }
    }

    selectRole(roleId) {
        // 更新选中状态
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.role === roleId);
        });

        // 设置角色权限
        const role = this.roles.find(r => r.id === roleId);
        if (role) {
            this.selectedRole = roleId;
            this.selectedPermissions = new Set(role.permissions);

            // 更新权限复选框状态
            this.updatePermissionCheckboxes();
            this.updatePermissionSummary();

            if (this.options.onRoleChange) {
                this.options.onRoleChange(role);
            }
        }
    }

    applyTemplate(templateId) {
        const template = this.permissionTemplates.find(t => t.id === templateId);
        if (!template) return;

        // 检查是否会覆盖现有权限
        const hasExistingPermissions = this.selectedPermissions.size > 0;

        if (hasExistingPermissions) {
            const message = `当前已有权限配置，应用模板 "${template.name}" 将添加 ${template.permissions.length} 个权限。是否继续？`;
            if (!confirm(message)) {
                return;
            }
        }

        // 记录应用前的状态，用于撤销
        this.lastTemplateState = {
            previousPermissions: new Set(this.selectedPermissions),
            appliedTemplate: template
        };

        // 应用模板权限（累加模式）
        template.permissions.forEach(permId => {
            this.selectedPermissions.add(permId);
        });

        // 更新界面
        this.updatePermissionCheckboxes();
        this.updatePermissionSummary();
        this.showTemplateAppliedNotification(template);
    }

    showTemplateAppliedNotification(template) {
        // 创建带撤销功能的通知
        const notification = document.createElement('div');
        notification.className = 'template-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-text">已应用权限模板 "${template.name}"</span>
                <button class="notification-undo" onclick="this.closest('.template-notification').style.display='none'; userManagement.inlinePermissionConfig?.undoTemplateApplication()">
                    撤销
                </button>
            </div>
        `;

        // 添加到容器顶部
        this.container.insertBefore(notification, this.container.firstChild);

        // 3秒后自动消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    undoTemplateApplication() {
        if (!this.lastTemplateState) return;

        // 恢复到应用模板前的状态
        this.selectedPermissions = new Set(this.lastTemplateState.previousPermissions);

        // 更新界面
        this.updatePermissionCheckboxes();
        this.updatePermissionSummary();

        this.showNotification(`已撤销权限模板 "${this.lastTemplateState.appliedTemplate.name}"`);
        this.lastTemplateState = null;
    }

    togglePermission(permissionId, checked) {
        if (checked) {
            this.selectedPermissions.add(permissionId);
            this.customPermissions.add(permissionId);
        } else {
            this.selectedPermissions.delete(permissionId);
            this.customPermissions.delete(permissionId);
        }

        this.updatePermissionSummary();
        this.checkPermissionConflicts();

        if (this.options.onPermissionChange) {
            this.options.onPermissionChange(permissionId, checked);
        }
    }

    toggleCategoryPermissions(category, checked) {
        const categoryPermissions = this.permissions.filter(p => p.category === category);

        categoryPermissions.forEach(perm => {
            if (checked) {
                this.selectedPermissions.add(perm.id);
            } else {
                this.selectedPermissions.delete(perm.id);
            }
        });

        this.updatePermissionCheckboxes();
        this.updatePermissionSummary();
    }

    updatePermissionCheckboxes() {
        document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
            const permissionId = checkbox.dataset.permission;
            checkbox.checked = this.selectedPermissions.has(permissionId);
        });

        // 更新分类复选框状态
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            const category = checkbox.dataset.category;
            const categoryPermissions = this.permissions.filter(p => p.category === category);
            const checkedCount = categoryPermissions.filter(p => this.selectedPermissions.has(p.id)).length;

            checkbox.checked = checkedCount === categoryPermissions.length;
            checkbox.indeterminate = checkedCount > 0 && checkedCount < categoryPermissions.length;
        });
    }

    updatePermissionSummary() {
        const count = this.selectedPermissions.size;
        const countElement = document.getElementById('permissionCount');
        const summaryContent = document.getElementById('summaryContent');

        if (countElement) {
            countElement.textContent = `${count}个权限`;
        }

        if (summaryContent) {
            const selectedPerms = Array.from(this.selectedPermissions)
                .map(id => this.permissions.find(p => p.id === id))
                .filter(Boolean);

            if (selectedPerms.length === 0) {
                summaryContent.innerHTML = '<div class="no-permissions">暂无选择的权限</div>';
                return;
            }

            // 权限级别统计
            const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            selectedPerms.forEach(perm => {
                levelStats[perm.level] = (levelStats[perm.level] || 0) + 1;
            });

            const levelStatsHtml = Object.entries(levelStats)
                .filter(([level, count]) => count > 0)
                .map(([level, count]) => `
                    <span class="permission-level-stat level-${level}">
                        L${level}: ${count}
                    </span>
                `).join('');

            // 按分类分组显示
            const grouped = {};
            selectedPerms.forEach(perm => {
                const category = perm.category || '其他';
                if (!grouped[category]) grouped[category] = [];
                grouped[category].push(perm);
            });

            const categoryHtml = Object.entries(grouped).map(([category, perms]) => `
                <div class="summary-category">
                    <div class="summary-category-header">
                        <span class="summary-category-name">
                            ${this.getCategoryIcon(category)} ${category}
                        </span>
                        <span class="summary-category-count">${perms.length}</span>
                    </div>
                    <div class="summary-permissions">
                        ${perms.map(perm => `
                            <span class="summary-permission level-${perm.level}" title="${perm.description || perm.name}">
                                ${perm.name}
                                <span class="permission-level-indicator">L${perm.level}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            summaryContent.innerHTML = `
                <div class="permission-level-overview">
                    <div class="level-overview-title">权限级别分布</div>
                    <div class="level-overview-stats">${levelStatsHtml}</div>
                </div>
                ${categoryHtml}
            `;
        }
    }

    checkPermissionConflicts() {
        // 检查权限冲突
        const conflicts = [];
        const warningsContainer = document.getElementById('permissionWarnings');

        // TODO: 实现权限冲突检测逻辑

        if (conflicts.length > 0) {
            const warningContent = document.getElementById('warningContent');
            warningContent.innerHTML = conflicts.map(conflict => `
                <div class="warning-item">
                    <span class="warning-text">${conflict.message}</span>
                </div>
            `).join('');
            warningsContainer.style.display = 'block';
        } else {
            warningsContainer.style.display = 'none';
        }
    }

    filterPermissions(searchTerm) {
        const searchLower = searchTerm.toLowerCase();

        document.querySelectorAll('.permission-item').forEach(item => {
            const permissionName = item.querySelector('.permission-name').textContent.toLowerCase();
            const permissionDesc = item.querySelector('.permission-desc').textContent.toLowerCase();
            const permissionCode = item.querySelector('.permission-code').textContent.toLowerCase();

            const matches = permissionName.includes(searchLower) ||
                          permissionDesc.includes(searchLower) ||
                          permissionCode.includes(searchLower);

            item.style.display = matches ? 'flex' : 'none';
        });

        // 隐藏空分类
        document.querySelectorAll('.permission-category').forEach(category => {
            const visibleItems = category.querySelectorAll('.permission-item[style="flex"]').length;
            category.style.display = visibleItems > 0 ? 'block' : 'none';
        });
    }

    // 获取当前选中的权限
    getSelectedPermissions() {
        return Array.from(this.selectedPermissions);
    }

    // 设置权限选择
    setSelectedPermissions(permissions) {
        this.selectedPermissions = new Set(permissions);
        this.updatePermissionCheckboxes();
        this.updatePermissionSummary();
    }

    // 工具方法
    getPermissionName(permissionId) {
        const perm = this.permissions.find(p => p.id === permissionId);
        return perm ? perm.name : permissionId;
    }

    getCategoryIcon(category) {
        const icons = {
            '核心功能': '🏠',
            '业务管理': '💼',
            '财务管理': '💰',
            '用户权限': '👥',
            '系统管理': '⚙️',
            '其他': '📁'
        };
        return icons[category] || '📁';
    }

    showNotification(message) {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', 'success');
        } else {
            console.log(message);
        }
    }

    // 模拟数据方法
    getMockRoles() {
        return [
            {
                id: 'ADMIN',
                name: '超级管理员',
                level: 5,
                description: '拥有系统所有权限，可以管理所有模块和功能',
                permissions: ['dashboard:view', 'user:manage', 'role:manage', 'system:manage']
            },
            {
                id: 'MANAGER',
                name: '管理员',
                level: 4,
                description: '拥有大部分管理权限，可以管理用户和业务数据',
                permissions: ['dashboard:view', 'user:view', 'merchant:manage', 'report:view']
            },
            {
                id: 'OPERATOR',
                name: '操作员',
                level: 2,
                description: '拥有基本操作权限，可以处理日常业务',
                permissions: ['dashboard:view', 'merchant:view', 'transaction:create']
            },
            {
                id: 'VIEWER',
                name: '查看员',
                level: 1,
                description: '只读权限，可以查看基本信息',
                permissions: ['dashboard:view']
            }
        ];
    }

    getMockPermissions() {
        return [
            {
                id: 'dashboard:view',
                name: '查看仪表板',
                description: '查看系统概览和统计信息',
                resource: 'dashboard',
                action: 'view',
                level: 1,
                category: '核心功能'
            },
            {
                id: 'user:view',
                name: '查看用户',
                description: '查看用户列表和基本信息',
                resource: 'user',
                action: 'view',
                level: 1,
                category: '用户权限'
            },
            {
                id: 'user:manage',
                name: '管理用户',
                description: '创建、编辑、删除用户',
                resource: 'user',
                action: 'manage',
                level: 4,
                category: '用户权限'
            },
            {
                id: 'merchant:view',
                name: '查看商户',
                description: '查看商户列表和信息',
                resource: 'merchant',
                action: 'view',
                level: 1,
                category: '业务管理'
            },
            {
                id: 'merchant:manage',
                name: '管理商户',
                description: '创建、编辑、删除商户',
                resource: 'merchant',
                action: 'manage',
                level: 3,
                category: '业务管理'
            }
        ];
    }

    getPermissionTemplates() {
        return [
            {
                id: 'new_employee',
                name: '新员工',
                icon: '👤',
                description: '适合新入职员工的基础权限',
                permissions: ['dashboard:view', 'merchant:view'],
                category: 'basic'
            },
            {
                id: 'customer_service',
                name: '客服专员',
                icon: '🎧',
                description: '客服人员常用权限：查看订单、处理投诉、客户管理',
                permissions: ['dashboard:view', 'merchant:view', 'order:view', 'customer:manage', 'complaint:handle'],
                category: 'service'
            },
            {
                id: 'financial_staff',
                name: '财务人员',
                icon: '💰',
                description: '财务相关权限：账务查看、报表导出、审核功能',
                permissions: ['dashboard:view', 'finance:view', 'report:export', 'audit:approve', 'transaction:review'],
                category: 'finance'
            },
            {
                id: 'operation_manager',
                name: '运营经理',
                icon: '📊',
                description: '运营管理权限：数据分析、营销活动、业务配置',
                permissions: ['dashboard:view', 'analytics:view', 'marketing:manage', 'config:business', 'report:view'],
                category: 'operation'
            },
            {
                id: 'technical_support',
                name: '技术支持',
                icon: '🔧',
                description: '技术支持权限：系统监控、日志查看、故障处理',
                permissions: ['dashboard:view', 'system:monitor', 'log:view', 'ticket:handle', 'api:debug'],
                category: 'technical'
            },
            {
                id: 'business_analyst',
                name: '业务分析师',
                icon: '📈',
                description: '数据分析权限：报表查看、数据导出、统计分析',
                permissions: ['dashboard:view', 'report:view', 'data:export', 'analytics:advanced', 'chart:create'],
                category: 'analyst'
            },
            {
                id: 'merchant_specialist',
                name: '商户专员',
                icon: '🏪',
                description: '商户管理专用权限：商户审核、资料管理、费率配置',
                permissions: ['dashboard:view', 'merchant:manage', 'merchant:audit', 'rate:config', 'document:review'],
                category: 'merchant'
            },
            {
                id: 'compliance_officer',
                name: '合规官',
                icon: '⚖️',
                description: '合规监察权限：风控审核、合规检查、违规处理',
                permissions: ['dashboard:view', 'compliance:monitor', 'risk:assess', 'violation:handle', 'policy:enforce'],
                category: 'compliance'
            },
            {
                id: 'emergency_response',
                name: '应急响应',
                icon: '🚨',
                description: '紧急情况处理权限：系统恢复、数据修复、紧急操作',
                permissions: ['system:emergency', 'data:repair', 'service:restore', 'alert:handle', 'escalation:manage'],
                category: 'emergency'
            },
            {
                id: 'department_manager',
                name: '部门主管',
                icon: '👔',
                description: '部门管理者的常用权限组合',
                permissions: ['dashboard:view', 'user:view', 'merchant:manage', 'report:view']
            },
            {
                id: 'financial_staff',
                name: '财务人员',
                icon: '💰',
                description: '财务相关权限组合',
                permissions: ['dashboard:view', 'financial:audit', 'report:export']
            }
        ];
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InlinePermissionConfig;
}

// 全局注册
window.InlinePermissionConfig = InlinePermissionConfig;