// Permission Management JavaScript
class PermissionManager {
    constructor() {
        this.permissions = [];
        this.roles = [];
        this.currentTab = 'permissions';
        this.currentRoleId = null; // 当前编辑的角色ID
        this.rolePermissionSelector = null; // 角色权限选择器实例
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPermissions();
        this.loadRoles();
        this.initializeTabs();
        this.initKeyboardShortcuts();
        this.enhanceDragAndDrop();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.permission-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Search and filter
        document.getElementById('permissionSearch')?.addEventListener('input', (e) => {
            this.filterPermissions(e.target.value);
        });

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });

        document.getElementById('levelFilter')?.addEventListener('change', (e) => {
            this.filterByLevel(e.target.value);
        });

        // Role management
        document.getElementById('createRole')?.addEventListener('click', () => {
            this.showRoleModal();
        });

        document.getElementById('closeRoleModal')?.addEventListener('click', () => {
            this.hideRoleModal();
        });

        document.getElementById('cancelRole')?.addEventListener('click', () => {
            this.hideRoleModal();
        });

        document.getElementById('roleForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRole();
        });

        // Export functions
        document.getElementById('exportPermissions')?.addEventListener('click', () => {
            this.exportPermissions();
        });

        document.getElementById('exportRoles')?.addEventListener('click', () => {
            this.exportRoles();
        });

        // Import functions
        document.getElementById('importRoles')?.addEventListener('click', () => {
            this.showImportRolesModal();
        });

        document.getElementById('roleTemplates')?.addEventListener('click', () => {
            this.showRoleTemplatesModal();
        });

        // Modal overlay click
        document.getElementById('roleModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'roleModal') {
                this.hideRoleModal();
            }
        });
    }

    initializeTabs() {
        // 检查URL参数，确定初始标签
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const actionParam = urlParams.get('action');

        // 验证标签参数是否有效
        const validTabs = ['permissions', 'roles', 'matrix', 'config', 'users'];
        let initialTab = validTabs.includes(tabParam) ? tabParam : 'permissions';

        // 处理统一权限配置模式
        if (actionParam === 'config') {
            this.handleUnifiedPermissionConfig(urlParams);
            return; // 直接返回，不执行普通的标签切换
        }

        this.switchTab(initialTab);
    }

    handleUnifiedPermissionConfig(urlParams) {
        // 获取配置参数
        const tab = urlParams.get('tab');
        const userId = urlParams.get('user_id');
        const roleId = urlParams.get('role_id');
        const apiId = urlParams.get('api_id');
        const userName = urlParams.get('user_name');
        const roleName = urlParams.get('role_name');
        const apiName = urlParams.get('api_name');
        const returnUrl = urlParams.get('return_url');

        // 确定配置类型和目标
        let configType, targetId, targetName;

        if (userId) {
            configType = 'user';
            targetId = userId;
            targetName = userName || `用户 ${userId}`;
        } else if (roleId) {
            configType = 'role';
            targetId = roleId;
            targetName = roleName || `角色 ${roleId}`;
        } else if (apiId) {
            configType = 'api';
            targetId = apiId;
            targetName = apiName || `API ${apiId}`;
        } else {
            // 参数无效，回到普通模式
            this.switchTab(tab || 'permissions');
            return;
        }

        // 显示统一权限配置界面
        this.showUnifiedPermissionConfig({
            type: configType,
            targetId: targetId,
            targetName: targetName,
            returnUrl: returnUrl,
            initialTab: tab
        });
    }

    showUnifiedPermissionConfig(options) {
        // 隐藏普通标签界面
        this.hideAllTabContents();

        // 创建统一权限配置容器
        const mainContent = document.querySelector('.permission-management');
        if (!mainContent) return;

        // 创建或获取统一配置容器
        let configContainer = document.getElementById('unifiedPermissionContainer');
        if (!configContainer) {
            configContainer = document.createElement('div');
            configContainer.id = 'unifiedPermissionContainer';
            configContainer.className = 'unified-permission-container';
            mainContent.appendChild(configContainer);
        }

        // 显示配置容器
        configContainer.style.display = 'block';

        // 隐藏原有的标签和内容
        const tabsContainer = document.querySelector('.permission-tabs');
        const tabContents = document.querySelectorAll('.tab-content');

        if (tabsContainer) tabsContainer.style.display = 'none';
        tabContents.forEach(content => content.style.display = 'none');

        // 初始化统一权限配置组件
        if (window.UnifiedPermissionConfig) {
            this.unifiedConfig = new UnifiedPermissionConfig({
                container: '#unifiedPermissionContainer',
                type: options.type,
                targetId: options.targetId,
                targetName: options.targetName,
                returnUrl: options.returnUrl,
                onSave: (permissions) => {
                    this.handlePermissionConfigSave(permissions, options);
                },
                onCancel: () => {
                    this.handlePermissionConfigCancel(options);
                }
            });
        } else {
            // 如果统一权限配置组件未加载，显示错误并返回
            this.showNotification('权限配置组件未加载，请刷新页面重试', 'error');
            this.goBackToNormalMode(options.initialTab);
        }
    }

    hideAllTabContents() {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
    }

    handlePermissionConfigSave(permissions, options) {
        console.log('权限配置已保存:', permissions);
        this.showNotification(`${options.targetName} 的权限配置已保存`, 'success');

        // 返回原页面
        if (options.returnUrl) {
            setTimeout(() => {
                window.location.href = options.returnUrl;
            }, 1500);
        } else {
            this.goBackToNormalMode(options.initialTab);
        }
    }

    handlePermissionConfigCancel(options) {
        // 返回原页面或普通模式
        if (options.returnUrl) {
            window.location.href = options.returnUrl;
        } else {
            this.goBackToNormalMode(options.initialTab);
        }
    }

    goBackToNormalMode(tab = 'permissions') {
        // 显示普通标签界面
        const tabsContainer = document.querySelector('.permission-tabs');
        const configContainer = document.getElementById('unifiedPermissionContainer');

        if (tabsContainer) tabsContainer.style.display = 'flex';
        if (configContainer) configContainer.style.display = 'none';

        // 清理URL参数
        const url = new URL(window.location);
        url.searchParams.delete('action');
        url.searchParams.delete('user_id');
        url.searchParams.delete('role_id');
        url.searchParams.delete('api_id');
        url.searchParams.delete('user_name');
        url.searchParams.delete('role_name');
        url.searchParams.delete('api_name');
        url.searchParams.delete('return_url');
        window.history.replaceState({}, '', url);

        // 切换到指定标签
        this.switchTab(tab);
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.permission-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // 更新URL参数，不刷新页面
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        window.history.replaceState({}, '', url);

        // 更新页面标题
        this.updatePageTitle(tabName);

        // Load specific content
        switch (tabName) {
            case 'permissions':
                this.renderPermissions();
                break;
            case 'roles':
                this.renderRoles();
                break;
            case 'matrix':
                this.renderPermissionMatrix();
                break;
            case 'config':
                this.loadAdvancedConfig();
                break;
        }
    }

    updatePageTitle(tabName) {
        const tabConfig = {
            'permissions': {
                title: '🔑 权限点管理',
                subtitle: '查看和管理系统中所有权限点的配置与分类',
                breadcrumb: '权限点管理'
            },
            'roles': {
                title: '🎭 角色管理',
                subtitle: '创建、编辑角色并配置角色权限分配策略',
                breadcrumb: '角色管理'
            },
            'matrix': {
                title: '📊 权限矩阵',
                subtitle: '可视化配置角色与权限的关系矩阵',
                breadcrumb: '权限矩阵'
            },
            'config': {
                title: '⚙️ 高级配置',
                subtitle: '系统安全策略、权限继承和审计日志配置',
                breadcrumb: '高级配置'
            }
        };

        const config = tabConfig[tabName] || tabConfig['permissions'];

        // 更新页面标题
        document.title = `${config.breadcrumb} - CJPayment 企业内部支付管理系统`;

        // 更新页面元素
        const titleElement = document.getElementById('pageTitle');
        const subtitleElement = document.getElementById('pageSubtitle');
        const breadcrumbElement = document.getElementById('currentBreadcrumb');

        if (titleElement) titleElement.textContent = config.title;
        if (subtitleElement) subtitleElement.textContent = config.subtitle;
        if (breadcrumbElement) breadcrumbElement.textContent = config.breadcrumb;
    }

    async loadPermissions() {
        try {
            // 使用统一的权限数据源
            if (window.permissionsData) {
                this.permissions = window.permissionsData.permissions;
            } else {
                // 后备方案：使用Mock数据
                this.permissions = this.getMockPermissions();
            }
            this.renderPermissions();
            this.updateStats();
        } catch (error) {
            console.error('加载权限失败:', error);
            this.showNotification('加载权限失败', 'error');
        }
    }

    async loadRoles() {
        try {
            // 使用统一的权限数据源
            if (window.permissionsData) {
                this.roles = window.permissionsData.roles;
            } else {
                // 后备方案：使用Mock数据
                this.roles = this.getMockRoles();
            }
            this.renderRoles();
        } catch (error) {
            console.error('加载角色失败:', error);
            this.showNotification('加载角色失败', 'error');
        }
    }

    renderPermissions() {
        const grid = document.getElementById('permissionGrid');
        if (!grid) return;

        // Group permissions by category
        const permissionsByCategory = this.groupPermissionsByCategory();

        const categoryIcons = {
            '核心功能': '🏠',
            '业务管理': '💼',
            '财务管理': '💰',
            '数据分析': '📊',
            '用户权限': '👥',
            '系统管理': '⚙️',
            '充值管理': '💳'
        };

        grid.innerHTML = Object.entries(permissionsByCategory).map(([category, permissions]) => `
            <div class="permission-category">
                <div class="category-header">
                    <span class="category-icon">${categoryIcons[category] || '📋'}</span>
                    <span class="category-title">${category}</span>
                    <span class="category-count">${permissions.length}</span>
                </div>
                <div class="permission-list">
                    ${permissions.map(permission => `
                        <div class="permission-item" data-permission-id="${permission.id}">
                            <div class="permission-info">
                                <div class="permission-name">${permission.name}</div>
                                <div class="permission-desc">${permission.description}</div>
                            </div>
                            <div class="permission-level">
                                <span class="level-badge level-${permission.level}">
                                    级别 ${permission.level}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderRoles() {
        const rolesList = document.getElementById('rolesList');
        if (!rolesList) return;

        rolesList.innerHTML = this.roles.map(role => `
            <div class="role-card" data-role-id="${role.id}">
                <div class="role-header">
                    <div class="role-info">
                        <h3>${role.name}</h3>
                        <p class="role-description">${role.description}</p>
                        <div class="role-meta">
                            <span class="level-badge level-${role.level}">级别 ${role.level}</span>
                            <span class="permission-count">${role.permissions.length} 个权限</span>
                            <span class="status ${role.is_active ? 'active' : 'inactive'}">
                                ${role.is_active ? '激活' : '停用'}
                            </span>
                        </div>
                    </div>
                    <div class="role-actions">
                        <button class="btn btn-sm btn-outline" onclick="permissionManager.editRole('${role.id}')">
                            编辑
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="permissionManager.cloneRole('${role.id}')">
                            复制
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="permissionManager.deleteRole('${role.id}')">
                            删除
                        </button>
                    </div>
                </div>
                <div class="role-permissions">
                    ${this.getRolePermissionNames(role.permissions).slice(0, 6).map(name => `
                        <span class="permission-chip">${name}</span>
                    `).join('')}
                    ${role.permissions.length > 6 ? `<span class="permission-chip">... 还有 ${role.permissions.length - 6} 个</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderPermissionMatrix() {
        const matrix = document.getElementById('permissionMatrix');
        if (!matrix) return;

        const tbody = matrix.querySelector('tbody');
        tbody.innerHTML = '';

        // Group permissions by resource for better organization
        const permissionsByResource = this.groupPermissionsByResource();

        Object.entries(permissionsByResource).forEach(([resource, permissions]) => {
            permissions.forEach(permission => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: left; font-weight: 500;">${permission.name}</td>
                    ${this.roles.map(role => `
                        <td>
                            <div class="permission-toggle ${this.hasPermission(role, permission.id) ? 'enabled' : ''}"
                                 onclick="permissionManager.togglePermission('${role.id}', '${permission.id}')">
                            </div>
                        </td>
                    `).join('')}
                `;
                tbody.appendChild(row);
            });
        });
    }

    groupPermissionsByCategory() {
        const grouped = {};
        this.permissions.forEach(permission => {
            if (!grouped[permission.category]) {
                grouped[permission.category] = [];
            }
            grouped[permission.category].push(permission);
        });
        return grouped;
    }

    groupPermissionsByResource() {
        const grouped = {};
        this.permissions.forEach(permission => {
            if (!grouped[permission.resource]) {
                grouped[permission.resource] = [];
            }
            grouped[permission.resource].push(permission);
        });
        return grouped;
    }

    getRolePermissionNames(permissionIds) {
        return permissionIds.map(id => {
            const permission = this.permissions.find(p => p.id === id);
            return permission ? permission.name : '未知权限';
        });
    }

    hasPermission(role, permissionId) {
        return role.permissions.includes(permissionId);
    }

    togglePermission(roleId, permissionId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        const index = role.permissions.indexOf(permissionId);
        if (index > -1) {
            role.permissions.splice(index, 1);
        } else {
            role.permissions.push(permissionId);
        }

        // Update the visual state
        this.renderPermissionMatrix();

        // Save changes (call API)
        this.saveRolePermissions(roleId, role.permissions);
    }

    async saveRolePermissions(roleId, permissions) {
        try {
            // Mock API call
            console.log(`保存角色 ${roleId} 的权限:`, permissions);
            this.showNotification('权限更新成功', 'success');
        } catch (error) {
            console.error('保存权限失败:', error);
            this.showNotification('保存权限失败', 'error');
        }
    }

    showRoleModal(roleId = null) {
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('roleModalTitle');
        const form = document.getElementById('roleForm');

        this.currentRoleId = roleId;

        if (roleId) {
            const role = this.roles.find(r => r.id === roleId);
            title.textContent = '编辑角色';
            this.fillRoleForm(role);
        } else {
            title.textContent = '创建新角色';
            form.reset();
        }

        this.initRolePermissionSelector(roleId);
        modal.classList.add('show');
    }

    hideRoleModal() {
        const modal = document.getElementById('roleModal');
        modal.classList.remove('show');

        // 清理权限选择器
        if (this.rolePermissionSelector) {
            this.rolePermissionSelector.destroy();
            this.rolePermissionSelector = null;
        }

        this.currentRoleId = null;
    }

    fillRoleForm(role) {
        document.getElementById('roleName').value = role.name;
        document.getElementById('roleDescription').value = role.description;
        document.getElementById('roleLevel').value = role.level;
        // Permission selector will be populated in loadPermissionSelector
    }

    initRolePermissionSelector(roleId = null) {
        const container = document.getElementById('rolePermissionSelector');
        if (!container) {
            console.error('Role permission selector container not found');
            return;
        }

        // 清理现有的权限选择器
        if (this.rolePermissionSelector) {
            this.rolePermissionSelector.destroy();
        }

        // 获取当前角色的权限
        let currentPermissions = [];
        let currentRole = null;

        if (roleId) {
            currentRole = this.roles.find(r => r.id === roleId);
            currentPermissions = currentRole ? currentRole.permissions : [];
        }

        // 确保权限数据已加载
        if (!window.permissionsData) {
            console.error('PermissionsData not found, make sure permissions-data.js is loaded');
            return;
        }

        // 初始化完整权限选择器
        this.rolePermissionSelector = new window.FullPermissionSelector({
            container: container,
            mode: 'role',
            selectedPermissions: currentPermissions,
            selectedRole: currentRole ? currentRole.id : null,
            showRoleSelector: false, // 角色编辑时不显示角色选择器
            showSearch: true,
            showCategoryFilter: true,
            showLevelFilter: true,
            onPermissionChange: (permissions) => {
                this.handleRolePermissionChange(permissions);
            },
            onRoleChange: null // 角色编辑时不需要角色变更回调
        });
    }

    handleRolePermissionChange(permissions) {
        console.log('角色权限变更:', permissions);
        // 这里可以添加实时权限变更的处理逻辑
        // 权限数据会在保存时通过 getSelectedPermissions() 获取
    }

    async saveRole() {
        const form = document.getElementById('roleForm');
        const formData = new FormData(form);

        // 从权限选择器获取已选择的权限
        let permissions = [];
        if (this.rolePermissionSelector) {
            permissions = this.rolePermissionSelector.getSelectedPermissions();
        }

        const roleData = {
            name: formData.get('roleName'),
            description: formData.get('roleDescription'),
            level: parseInt(formData.get('roleLevel')),
            permissions: permissions
        };

        try {
            // Mock API call
            console.log('保存角色:', roleData);

            if (this.currentRoleId) {
                // 更新现有角色
                const existingRoleIndex = this.roles.findIndex(r => r.id === this.currentRoleId);
                if (existingRoleIndex > -1) {
                    this.roles[existingRoleIndex] = {
                        ...this.roles[existingRoleIndex],
                        ...roleData,
                        updated_at: new Date().toISOString()
                    };
                }
                this.showNotification('角色更新成功', 'success');
            } else {
                // 创建新角色
                const newRole = {
                    id: 'ROLE_' + Date.now(),
                    ...roleData,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                this.roles.push(newRole);
                this.showNotification('角色创建成功', 'success');
            }

            this.renderRoles();
            this.hideRoleModal();
        } catch (error) {
            console.error('保存角色失败:', error);
            this.showNotification('保存角色失败', 'error');
        }
    }

    editRole(roleId) {
        this.showRoleModal(roleId);
    }

    cloneRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        const clonedRole = {
            ...role,
            id: 'ROLE_' + Date.now(),
            name: role.name + ' (副本)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.roles.push(clonedRole);
        this.renderRoles();
        this.showNotification('角色复制成功', 'success');
    }

    async deleteRole(roleId) {
        if (!confirm('确定要删除这个角色吗？此操作不可撤销。')) {
            return;
        }

        try {
            const index = this.roles.findIndex(r => r.id === roleId);
            if (index > -1) {
                this.roles.splice(index, 1);
                this.renderRoles();
                this.showNotification('角色删除成功', 'success');
            }
        } catch (error) {
            console.error('删除角色失败:', error);
            this.showNotification('删除角色失败', 'error');
        }
    }

    filterPermissions(searchTerm) {
        const items = document.querySelectorAll('.permission-item');
        items.forEach(item => {
            const name = item.querySelector('.permission-name').textContent.toLowerCase();
            const desc = item.querySelector('.permission-desc').textContent.toLowerCase();
            const matches = name.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    filterByCategory(category) {
        const categories = document.querySelectorAll('.permission-category');
        categories.forEach(cat => {
            const title = cat.querySelector('.category-title').textContent;
            const matches = !category || title === category;
            cat.style.display = matches ? 'block' : 'none';
        });
    }

    filterByLevel(level) {
        const items = document.querySelectorAll('.permission-item');
        items.forEach(item => {
            const badge = item.querySelector('.level-badge');
            const itemLevel = badge.className.match(/level-(\d+)/)[1];
            const matches = !level || itemLevel === level;
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    exportPermissions() {
        const data = {
            permissions: this.permissions,
            exported_at: new Date().toISOString(),
            version: '2.0'
        };

        this.downloadJSON(data, 'permissions_export.json');
        this.showNotification('权限配置导出成功', 'success');
    }

    exportRoles() {
        const data = {
            roles: this.roles,
            exported_at: new Date().toISOString(),
            version: '2.0'
        };

        this.downloadJSON(data, 'roles_export.json');
        this.showNotification('角色配置导出成功', 'success');
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 显示导入角色模态框
    showImportRolesModal() {
        const modalHtml = `
            <div class="import-modal-overlay" id="importRolesModal">
                <div class="import-modal">
                    <div class="import-modal-header">
                        <h3>📥 导入角色配置</h3>
                        <button class="close-btn" onclick="permissionManager.hideImportRolesModal()">&times;</button>
                    </div>
                    <div class="import-modal-body">
                        <div class="import-section">
                            <div class="import-description">
                                <p>支持导入以下格式的角色配置文件：</p>
                                <ul>
                                    <li>🗃️ JSON 格式 (.json) - 系统导出的标准格式</li>
                                    <li>📋 CSV 格式 (.csv) - 简化的角色信息表格</li>
                                    <li>📄 Excel 格式 (.xlsx) - 包含角色和权限的电子表格</li>
                                </ul>
                            </div>

                            <div class="file-upload-area" id="roleFileUpload">
                                <div class="upload-icon">📁</div>
                                <p>拖放文件到此处或点击选择文件</p>
                                <input type="file" id="roleFileInput" accept=".json,.csv,.xlsx" style="display: none;">
                                <button class="btn btn-primary" onclick="document.getElementById('roleFileInput').click()">
                                    选择文件
                                </button>
                            </div>

                            <div class="import-options" style="display: none;" id="importOptions">
                                <h4>导入设置</h4>
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="overwriteExisting" checked>
                                        <span>覆盖已存在的同名角色</span>
                                    </label>
                                </div>
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="validatePermissions" checked>
                                        <span>验证权限有效性</span>
                                    </label>
                                </div>
                                <div class="option-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="createBackup">
                                        <span>导入前创建当前角色备份</span>
                                    </label>
                                </div>
                            </div>

                            <div class="file-preview" style="display: none;" id="filePreview">
                                <h4>文件预览</h4>
                                <div class="preview-content" id="previewContent"></div>
                            </div>
                        </div>
                    </div>
                    <div class="import-modal-footer">
                        <button class="btn btn-secondary" onclick="permissionManager.hideImportRolesModal()">
                            取消
                        </button>
                        <button class="btn btn-primary" id="confirmImport" onclick="permissionManager.executeRoleImport()" disabled>
                            导入角色
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.bindImportEvents();
    }

    // 绑定导入相关事件
    bindImportEvents() {
        const fileInput = document.getElementById('roleFileInput');
        const uploadArea = document.getElementById('roleFileUpload');

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // 拖拽上传事件
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files[0]);
        });
    }

    // 处理文件选择
    handleFileSelect(file) {
        if (!file) return;

        const allowedTypes = ['application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const allowedExtensions = ['.json', '.csv', '.xlsx'];

        const fileName = file.name.toLowerCase();
        const isValidType = allowedTypes.includes(file.type) || allowedExtensions.some(ext => fileName.endsWith(ext));

        if (!isValidType) {
            this.showNotification('不支持的文件格式，请选择 JSON、CSV 或 Excel 文件', 'error');
            return;
        }

        // 显示文件信息和预览
        this.displayFileInfo(file);
        this.previewFile(file);
    }

    // 显示文件信息
    displayFileInfo(file) {
        const uploadArea = document.getElementById('roleFileUpload');
        const importOptions = document.getElementById('importOptions');
        const confirmBtn = document.getElementById('confirmImport');

        uploadArea.innerHTML = `
            <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <p class="file-name">${file.name}</p>
                    <p class="file-size">${this.formatFileSize(file.size)}</p>
                    <p class="file-type">${this.getFileTypeDisplay(file.name)}</p>
                </div>
                <button class="btn btn-sm btn-outline" onclick="document.getElementById('roleFileInput').click()">
                    重新选择
                </button>
            </div>
        `;

        importOptions.style.display = 'block';
        confirmBtn.disabled = false;
        this.selectedFile = file;
    }

    // 预览文件内容
    async previewFile(file) {
        const preview = document.getElementById('filePreview');
        const content = document.getElementById('previewContent');

        try {
            let data;
            const fileExtension = file.name.toLowerCase().split('.').pop();

            switch (fileExtension) {
                case 'json':
                    data = await this.parseJSONFile(file);
                    break;
                case 'csv':
                    data = await this.parseCSVFile(file);
                    break;
                case 'xlsx':
                    data = await this.parseExcelFile(file);
                    break;
                default:
                    throw new Error('不支持的文件格式');
            }

            content.innerHTML = this.generatePreviewHtml(data);
            preview.style.display = 'block';

        } catch (error) {
            console.error('文件预览失败:', error);
            content.innerHTML = `<p class="error">文件预览失败: ${error.message}</p>`;
            preview.style.display = 'block';
        }
    }

    // 解析 JSON 文件
    parseJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('JSON 格式错误'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 解析 CSV 文件
    parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(',').map(h => h.trim());

                    const roles = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const role = {};
                        headers.forEach((header, index) => {
                            role[header] = values[index] || '';
                        });
                        return role;
                    });

                    resolve({ roles, format: 'csv' });
                } catch (error) {
                    reject(new Error('CSV 解析失败'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 解析 Excel 文件（简化版本，实际需要引入库如 xlsx.js）
    parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            // 这里应该使用 xlsx.js 库来解析 Excel 文件
            // 现在提供一个简化的实现
            reject(new Error('Excel 解析功能正在开发中，请使用 JSON 或 CSV 格式'));
        });
    }

    // 生成预览 HTML
    generatePreviewHtml(data) {
        if (data.roles && Array.isArray(data.roles)) {
            const roles = data.roles.slice(0, 5); // 只显示前5个角色
            return `
                <div class="preview-summary">
                    <p>✅ 发现 ${data.roles.length} 个角色配置</p>
                    ${data.roles.length > 5 ? '<p>（仅显示前5个）</p>' : ''}
                </div>
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>角色名称</th>
                            <th>描述</th>
                            <th>权限级别</th>
                            <th>权限数量</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${roles.map(role => `
                            <tr>
                                <td>${role.name || '未命名'}</td>
                                <td>${role.description || '无描述'}</td>
                                <td>${role.level || 'N/A'}</td>
                                <td>${role.permissions ? role.permissions.length : 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            return '<p class="error">无效的角色配置格式</p>';
        }
    }

    // 执行角色导入
    async executeRoleImport() {
        if (!this.selectedFile) {
            this.showNotification('请先选择要导入的文件', 'error');
            return;
        }

        const overwriteExisting = document.getElementById('overwriteExisting').checked;
        const validatePermissions = document.getElementById('validatePermissions').checked;
        const createBackup = document.getElementById('createBackup').checked;

        try {
            // 显示加载状态
            const confirmBtn = document.getElementById('confirmImport');
            const originalText = confirmBtn.textContent;
            confirmBtn.textContent = '正在导入...';
            confirmBtn.disabled = true;

            // 创建备份
            if (createBackup) {
                this.createRolesBackup();
            }

            // 解析文件数据
            let importData;
            const fileExtension = this.selectedFile.name.toLowerCase().split('.').pop();

            switch (fileExtension) {
                case 'json':
                    importData = await this.parseJSONFile(this.selectedFile);
                    break;
                case 'csv':
                    importData = await this.parseCSVFile(this.selectedFile);
                    break;
                default:
                    throw new Error('不支持的文件格式');
            }

            // 验证和导入角色
            const result = await this.importRolesData(importData, {
                overwriteExisting,
                validatePermissions
            });

            // 更新界面
            this.renderRoles();
            this.showNotification(`成功导入 ${result.imported} 个角色，跳过 ${result.skipped} 个`, 'success');
            this.hideImportRolesModal();

        } catch (error) {
            console.error('导入失败:', error);
            this.showNotification(`导入失败: ${error.message}`, 'error');
        } finally {
            const confirmBtn = document.getElementById('confirmImport');
            if (confirmBtn) {
                confirmBtn.textContent = originalText;
                confirmBtn.disabled = false;
            }
        }
    }

    // 导入角色数据
    async importRolesData(data, options) {
        const { overwriteExisting, validatePermissions } = options;
        let imported = 0;
        let skipped = 0;

        if (!data.roles || !Array.isArray(data.roles)) {
            throw new Error('无效的角色数据格式');
        }

        for (const roleData of data.roles) {
            try {
                // 验证必需字段
                if (!roleData.name) {
                    console.warn('跳过无名称的角色:', roleData);
                    skipped++;
                    continue;
                }

                // 检查是否已存在
                const existingRole = this.roles.find(r => r.name === roleData.name);
                if (existingRole && !overwriteExisting) {
                    console.log(`跳过已存在的角色: ${roleData.name}`);
                    skipped++;
                    continue;
                }

                // 验证权限
                if (validatePermissions && roleData.permissions) {
                    roleData.permissions = this.validateAndFilterPermissions(roleData.permissions);
                }

                // 创建或更新角色
                const newRole = {
                    id: roleData.id || 'ROLE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    name: roleData.name,
                    description: roleData.description || '',
                    level: parseInt(roleData.level) || 1,
                    permissions: roleData.permissions || [],
                    is_active: roleData.is_active !== undefined ? roleData.is_active : true,
                    created_at: roleData.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (existingRole) {
                    // 更新现有角色
                    const index = this.roles.findIndex(r => r.name === roleData.name);
                    this.roles[index] = { ...existingRole, ...newRole, id: existingRole.id };
                } else {
                    // 添加新角色
                    this.roles.push(newRole);
                }

                imported++;

            } catch (error) {
                console.error(`导入角色 ${roleData.name} 失败:`, error);
                skipped++;
            }
        }

        return { imported, skipped };
    }

    // 验证和过滤权限
    validateAndFilterPermissions(permissions) {
        const validPermissions = this.permissions.map(p => p.id);
        return permissions.filter(permissionId => {
            const isValid = validPermissions.includes(permissionId);
            if (!isValid) {
                console.warn(`无效的权限ID: ${permissionId}`);
            }
            return isValid;
        });
    }

    // 创建角色备份
    createRolesBackup() {
        const backup = {
            roles: this.roles,
            backup_date: new Date().toISOString(),
            version: '2.0'
        };

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.downloadJSON(backup, `roles_backup_${timestamp}.json`);
    }

    // 隐藏导入角色模态框
    hideImportRolesModal() {
        const modal = document.getElementById('importRolesModal');
        if (modal) {
            modal.remove();
        }
        this.selectedFile = null;
    }

    // 显示角色模版模态框
    showRoleTemplatesModal() {
        const modalHtml = `
            <div class="template-modal-overlay" id="roleTemplatesModal">
                <div class="template-modal">
                    <div class="template-modal-header">
                        <h3>📋 角色模版管理</h3>
                        <button class="close-btn" onclick="permissionManager.hideRoleTemplatesModal()">&times;</button>
                    </div>
                    <div class="template-modal-body">
                        <div class="template-tabs">
                            <button class="template-tab active" data-tab="predefined" onclick="permissionManager.switchTemplateTab('predefined')">
                                🏪 预定义模版
                            </button>
                            <button class="template-tab" data-tab="custom" onclick="permissionManager.switchTemplateTab('custom')">
                                🎨 自定义模版
                            </button>
                            <button class="template-tab" data-tab="create" onclick="permissionManager.switchTemplateTab('create')">
                                ➕ 创建模版
                            </button>
                        </div>

                        <div class="template-content">
                            <!-- 预定义模版 -->
                            <div class="template-tab-content active" id="predefinedTab">
                                <div class="template-description">
                                    <p>🏪 选择系统预设的角色模版，快速创建标准化角色配置</p>
                                </div>
                                <div class="template-grid" id="predefinedTemplates">
                                    ${this.renderPredefinedTemplates()}
                                </div>
                            </div>

                            <!-- 自定义模版 -->
                            <div class="template-tab-content" id="customTab">
                                <div class="template-description">
                                    <p>🎨 管理您创建的自定义角色模版</p>
                                    <button class="btn btn-sm btn-outline" onclick="permissionManager.loadCustomTemplates()">
                                        🔄 刷新列表
                                    </button>
                                </div>
                                <div class="template-grid" id="customTemplates">
                                    ${this.renderCustomTemplates()}
                                </div>
                            </div>

                            <!-- 创建模版 -->
                            <div class="template-tab-content" id="createTab">
                                <div class="template-description">
                                    <p>➕ 基于现有角色创建新的角色模版</p>
                                </div>
                                <form id="templateCreateForm" class="template-form">
                                    <div class="form-group">
                                        <label for="templateName">模版名称 *</label>
                                        <input type="text" id="templateName" name="templateName" placeholder="输入模版名称" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="templateDescription">模版描述</label>
                                        <textarea id="templateDescription" name="templateDescription" placeholder="描述模版的用途和适用场景" rows="3"></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="templateCategory">模版分类</label>
                                        <select id="templateCategory" name="templateCategory">
                                            <option value="business">业务类型</option>
                                            <option value="technical">技术类型</option>
                                            <option value="management">管理类型</option>
                                            <option value="custom">自定义类型</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="baseRole">基于角色</label>
                                        <select id="baseRole" name="baseRole">
                                            <option value="">从空白开始</option>
                                            ${this.roles.map(role => `<option value="${role.id}">${role.name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>权限配置</label>
                                        <div id="templatePermissionSelector">
                                            <!-- 权限选择器将在这里动态生成 -->
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="template-modal-footer">
                        <button class="btn btn-secondary" onclick="permissionManager.hideRoleTemplatesModal()">
                            关闭
                        </button>
                        <button class="btn btn-primary" id="saveTemplate" onclick="permissionManager.saveTemplate()" style="display: none;">
                            保存模版
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.initializeTemplateModal();
    }

    // 初始化模版模态框
    initializeTemplateModal() {
        // 为基于角色选择器绑定事件
        const baseRoleSelect = document.getElementById('baseRole');
        if (baseRoleSelect) {
            baseRoleSelect.addEventListener('change', (e) => {
                this.loadTemplatePermissionSelector(e.target.value);
            });
        }

        // 初始化权限选择器
        this.loadTemplatePermissionSelector();
    }

    // 切换模版标签
    switchTemplateTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.template-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 更新内容区域
        document.querySelectorAll('.template-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // 显示/隐藏保存按钮
        const saveBtn = document.getElementById('saveTemplate');
        if (tabName === 'create') {
            saveBtn.style.display = 'inline-block';
        } else {
            saveBtn.style.display = 'none';
        }
    }

    // 渲染预定义模版
    renderPredefinedTemplates() {
        const predefinedTemplates = [
            {
                id: 'admin_template',
                name: '系统管理员',
                description: '拥有完整系统管理权限的标准管理员角色',
                category: 'management',
                permissions: this.getMockPermissions().filter(p => p.level <= 4).map(p => p.id),
                icon: '👑'
            },
            {
                id: 'financial_template',
                name: '财务主管',
                description: '专注于财务管理和审核的专业角色',
                category: 'business',
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'account', 'financial_audit'].includes(p.resource)
                ).map(p => p.id),
                icon: '💰'
            },
            {
                id: 'operator_template',
                name: '业务操作员',
                description: '负责日常业务操作的标准操作员角色',
                category: 'business',
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'merchant', 'account'].includes(p.resource) && p.level <= 3
                ).map(p => p.id),
                icon: '👤'
            },
            {
                id: 'auditor_template',
                name: '审核员',
                description: '专门负责审核工作的角色模版',
                category: 'business',
                permissions: this.getMockPermissions().filter(p =>
                    p.action === 'view' || p.action === 'audit' || p.action === 'export'
                ).map(p => p.id),
                icon: '🔍'
            },
            {
                id: 'viewer_template',
                name: '只读用户',
                description: '只能查看数据的基础用户角色',
                category: 'business',
                permissions: this.getMockPermissions().filter(p => p.action === 'view').map(p => p.id),
                icon: '👁️'
            }
        ];

        return predefinedTemplates.map(template => `
            <div class="template-card predefined" data-template-id="${template.id}">
                <div class="template-header">
                    <span class="template-icon">${template.icon}</span>
                    <h4>${template.name}</h4>
                </div>
                <div class="template-body">
                    <p class="template-description">${template.description}</p>
                    <div class="template-meta">
                        <span class="template-category">${this.getCategoryDisplayName(template.category)}</span>
                        <span class="template-permissions">${template.permissions.length} 个权限</span>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-sm btn-primary" onclick="permissionManager.applyTemplate('${template.id}', 'predefined')">
                        应用模版
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="permissionManager.previewTemplate('${template.id}', 'predefined')">
                        预览
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 渲染自定义模版
    renderCustomTemplates() {
        const customTemplates = this.getCustomTemplates();

        if (customTemplates.length === 0) {
            return `
                <div class="empty-templates">
                    <div class="empty-icon">📝</div>
                    <p>还没有自定义模版</p>
                    <p class="empty-hint">点击"创建模版"标签来创建您的第一个自定义模版</p>
                </div>
            `;
        }

        return customTemplates.map(template => `
            <div class="template-card custom" data-template-id="${template.id}">
                <div class="template-header">
                    <span class="template-icon">${template.icon || '🎨'}</span>
                    <h4>${template.name}</h4>
                </div>
                <div class="template-body">
                    <p class="template-description">${template.description}</p>
                    <div class="template-meta">
                        <span class="template-category">${this.getCategoryDisplayName(template.category)}</span>
                        <span class="template-permissions">${template.permissions.length} 个权限</span>
                        <span class="template-date">创建于 ${new Date(template.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-sm btn-primary" onclick="permissionManager.applyTemplate('${template.id}', 'custom')">
                        应用模版
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="permissionManager.previewTemplate('${template.id}', 'custom')">
                        预览
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="permissionManager.editTemplate('${template.id}')">
                        编辑
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="permissionManager.deleteTemplate('${template.id}')">
                        删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 获取分类显示名称
    getCategoryDisplayName(category) {
        const categoryMap = {
            'business': '业务类型',
            'technical': '技术类型',
            'management': '管理类型',
            'custom': '自定义类型'
        };
        return categoryMap[category] || '未知类型';
    }

    // 获取自定义模版（从本地存储）
    getCustomTemplates() {
        try {
            const templates = localStorage.getItem('customRoleTemplates');
            return templates ? JSON.parse(templates) : [];
        } catch (error) {
            console.error('获取自定义模版失败:', error);
            return [];
        }
    }

    // 保存自定义模版到本地存储
    saveCustomTemplate(template) {
        try {
            const templates = this.getCustomTemplates();
            const existingIndex = templates.findIndex(t => t.id === template.id);

            if (existingIndex > -1) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }

            localStorage.setItem('customRoleTemplates', JSON.stringify(templates));
            return true;
        } catch (error) {
            console.error('保存自定义模版失败:', error);
            return false;
        }
    }

    // 加载模版权限选择器
    loadTemplatePermissionSelector(baseRoleId = null) {
        const container = document.getElementById('templatePermissionSelector');
        if (!container) return;

        // 清理现有的选择器
        if (this.templatePermissionSelector) {
            this.templatePermissionSelector.destroy();
        }

        // 获取基础角色的权限
        let initialPermissions = [];
        if (baseRoleId) {
            const baseRole = this.roles.find(r => r.id === baseRoleId);
            if (baseRole) {
                initialPermissions = baseRole.permissions;
            }
        }

        // 初始化权限选择器
        this.templatePermissionSelector = new window.FullPermissionSelector({
            container: container,
            mode: 'template',
            selectedPermissions: initialPermissions,
            showRoleSelector: false,
            showSearch: true,
            showCategoryFilter: true,
            showLevelFilter: true,
            onPermissionChange: (permissions) => {
                this.handleTemplatePermissionChange(permissions);
            }
        });
    }

    // 处理模版权限变更
    handleTemplatePermissionChange(permissions) {
        console.log('模版权限变更:', permissions);
        // 这里可以添加实时权限变更的处理逻辑
    }

    // 保存模版
    async saveTemplate() {
        const form = document.getElementById('templateCreateForm');
        const formData = new FormData(form);

        // 从权限选择器获取已选择的权限
        let permissions = [];
        if (this.templatePermissionSelector) {
            permissions = this.templatePermissionSelector.getSelectedPermissions();
        }

        const templateData = {
            id: 'TEMPLATE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: formData.get('templateName'),
            description: formData.get('templateDescription') || '',
            category: formData.get('templateCategory'),
            permissions: permissions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // 验证必需字段
        if (!templateData.name.trim()) {
            this.showNotification('请输入模版名称', 'error');
            return;
        }

        if (permissions.length === 0) {
            this.showNotification('请至少选择一个权限', 'error');
            return;
        }

        try {
            // 保存模版
            const success = this.saveCustomTemplate(templateData);

            if (success) {
                this.showNotification('模版创建成功', 'success');

                // 清空表单
                form.reset();
                if (this.templatePermissionSelector) {
                    this.templatePermissionSelector.clearSelection();
                }

                // 刷新自定义模版列表
                this.refreshCustomTemplates();

                // 切换到自定义模版标签
                this.switchTemplateTab('custom');
            } else {
                this.showNotification('模版保存失败', 'error');
            }
        } catch (error) {
            console.error('保存模版失败:', error);
            this.showNotification('模版保存失败', 'error');
        }
    }

    // 应用模版
    applyTemplate(templateId, type) {
        let template;

        if (type === 'predefined') {
            // 这里应该从预定义模版中获取
            template = this.getPredefinedTemplate(templateId);
        } else {
            // 从自定义模版中获取
            const customTemplates = this.getCustomTemplates();
            template = customTemplates.find(t => t.id === templateId);
        }

        if (!template) {
            this.showNotification('模版未找到', 'error');
            return;
        }

        // 创建基于模版的新角色
        this.createRoleFromTemplate(template);
    }

    // 从模版创建角色
    createRoleFromTemplate(template) {
        // 隐藏模版模态框
        this.hideRoleTemplatesModal();

        // 显示角色创建模态框，并预填模版数据
        this.showRoleModal();

        // 预填表单数据
        setTimeout(() => {
            document.getElementById('roleName').value = template.name + ' (副本)';
            document.getElementById('roleDescription').value = template.description;
            document.getElementById('roleLevel').value = template.level || 2;

            // 设置权限选择器的权限
            if (this.rolePermissionSelector && template.permissions) {
                this.rolePermissionSelector.setSelectedPermissions(template.permissions);
            }
        }, 100);
    }

    // 获取预定义模版
    getPredefinedTemplate(templateId) {
        const templates = {
            'admin_template': {
                name: '系统管理员',
                description: '拥有完整系统管理权限的标准管理员角色',
                level: 4,
                permissions: this.getMockPermissions().filter(p => p.level <= 4).map(p => p.id)
            },
            'financial_template': {
                name: '财务主管',
                description: '专注于财务管理和审核的专业角色',
                level: 3,
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'account', 'financial_audit'].includes(p.resource)
                ).map(p => p.id)
            },
            'operator_template': {
                name: '业务操作员',
                description: '负责日常业务操作的标准操作员角色',
                level: 2,
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'merchant', 'account'].includes(p.resource) && p.level <= 3
                ).map(p => p.id)
            },
            'auditor_template': {
                name: '审核员',
                description: '专门负责审核工作的角色模版',
                level: 2,
                permissions: this.getMockPermissions().filter(p =>
                    p.action === 'view' || p.action === 'audit' || p.action === 'export'
                ).map(p => p.id)
            },
            'viewer_template': {
                name: '只读用户',
                description: '只能查看数据的基础用户角色',
                level: 1,
                permissions: this.getMockPermissions().filter(p => p.action === 'view').map(p => p.id)
            }
        };

        return templates[templateId];
    }

    // 刷新自定义模版列表
    refreshCustomTemplates() {
        const container = document.getElementById('customTemplates');
        if (container) {
            container.innerHTML = this.renderCustomTemplates();
        }
    }

    // 删除模版
    deleteTemplate(templateId) {
        if (!confirm('确定要删除这个模版吗？此操作不可撤销。')) {
            return;
        }

        try {
            const templates = this.getCustomTemplates();
            const filteredTemplates = templates.filter(t => t.id !== templateId);
            localStorage.setItem('customRoleTemplates', JSON.stringify(filteredTemplates));

            this.showNotification('模版删除成功', 'success');
            this.refreshCustomTemplates();
        } catch (error) {
            console.error('删除模版失败:', error);
            this.showNotification('删除模版失败', 'error');
        }
    }

    // 隐藏角色模版模态框
    hideRoleTemplatesModal() {
        const modal = document.getElementById('roleTemplatesModal');
        if (modal) {
            modal.remove();
        }

        // 清理权限选择器
        if (this.templatePermissionSelector) {
            this.templatePermissionSelector.destroy();
            this.templatePermissionSelector = null;
        }
    }

    // 文件大小格式化
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取文件类型显示名称
    getFileTypeDisplay(filename) {
        const extension = filename.toLowerCase().split('.').pop();
        const typeMap = {
            'json': 'JSON 配置文件',
            'csv': 'CSV 表格文件',
            'xlsx': 'Excel 电子表格'
        };
        return typeMap[extension] || '未知文件类型';
    }

    // 预览模版功能
    previewTemplate(templateId, type) {
        let template;

        if (type === 'predefined') {
            template = this.getPredefinedTemplate(templateId);
        } else {
            const customTemplates = this.getCustomTemplates();
            template = customTemplates.find(t => t.id === templateId);
        }

        if (!template) {
            this.showNotification('模版未找到', 'error');
            return;
        }

        // 创建预览模态框
        const previewHtml = `
            <div class="preview-modal-overlay" id="templatePreviewModal">
                <div class="preview-modal">
                    <div class="preview-modal-header">
                        <h3>📋 模版预览: ${template.name}</h3>
                        <button class="close-btn" onclick="permissionManager.hideTemplatePreview()">&times;</button>
                    </div>
                    <div class="preview-modal-body">
                        <div class="template-preview-info">
                            <div class="preview-section">
                                <h4>📝 基本信息</h4>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>模版名称:</label>
                                        <span>${template.name}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>模版描述:</label>
                                        <span>${template.description || '无描述'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>模版类型:</label>
                                        <span>${type === 'predefined' ? '系统预设' : '自定义模版'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>权限级别:</label>
                                        <span>级别 ${template.level || 'N/A'}</span>
                                    </div>
                                    <div class="info-item">
                                        <label>权限数量:</label>
                                        <span>${template.permissions ? template.permissions.length : 0} 个权限</span>
                                    </div>
                                </div>
                            </div>

                            <div class="preview-section">
                                <h4>🔑 权限详情</h4>
                                <div class="permissions-preview">
                                    ${this.renderPermissionsPreview(template.permissions)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="preview-modal-footer">
                        <button class="btn btn-secondary" onclick="permissionManager.hideTemplatePreview()">
                            关闭
                        </button>
                        <button class="btn btn-primary" onclick="permissionManager.applyTemplate('${templateId}', '${type}')">
                            应用模版
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', previewHtml);
    }

    // 渲染权限预览
    renderPermissionsPreview(permissionIds) {
        if (!permissionIds || permissionIds.length === 0) {
            return '<p class="no-permissions">此模版没有配置权限</p>';
        }

        const permissionsByCategory = {};

        permissionIds.forEach(permissionId => {
            const permission = this.permissions.find(p => p.id === permissionId);
            if (permission) {
                if (!permissionsByCategory[permission.category]) {
                    permissionsByCategory[permission.category] = [];
                }
                permissionsByCategory[permission.category].push(permission);
            }
        });

        return Object.entries(permissionsByCategory).map(([category, permissions]) => `
            <div class="preview-category">
                <h5 class="preview-category-title">${category} (${permissions.length})</h5>
                <div class="preview-permissions-list">
                    ${permissions.map(permission => `
                        <div class="preview-permission-item">
                            <span class="permission-name">${permission.name}</span>
                            <span class="permission-level level-${permission.level}">级别 ${permission.level}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // 隐藏模版预览
    hideTemplatePreview() {
        const modal = document.getElementById('templatePreviewModal');
        if (modal) {
            modal.remove();
        }
    }

    // 编辑自定义模版
    editTemplate(templateId) {
        const templates = this.getCustomTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            this.showNotification('模版未找到', 'error');
            return;
        }

        // 隐藏模版模态框
        this.hideRoleTemplatesModal();

        // 重新显示模版模态框并切换到创建标签
        this.showRoleTemplatesModal();
        setTimeout(() => {
            this.switchTemplateTab('create');

            // 预填表单数据
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateDescription').value = template.description || '';
            document.getElementById('templateCategory').value = template.category || 'custom';

            // 设置权限选择器的权限
            if (this.templatePermissionSelector && template.permissions) {
                this.templatePermissionSelector.setSelectedPermissions(template.permissions);
            }

            // 更新保存按钮为编辑模式
            const saveBtn = document.getElementById('saveTemplate');
            saveBtn.textContent = '更新模版';
            saveBtn.onclick = () => this.updateTemplate(template.id);
        }, 100);
    }

    // 更新模版
    async updateTemplate(templateId) {
        const form = document.getElementById('templateCreateForm');
        const formData = new FormData(form);

        // 从权限选择器获取已选择的权限
        let permissions = [];
        if (this.templatePermissionSelector) {
            permissions = this.templatePermissionSelector.getSelectedPermissions();
        }

        const templateData = {
            id: templateId,
            name: formData.get('templateName'),
            description: formData.get('templateDescription') || '',
            category: formData.get('templateCategory'),
            permissions: permissions,
            updated_at: new Date().toISOString()
        };

        // 验证必需字段
        if (!templateData.name.trim()) {
            this.showNotification('请输入模版名称', 'error');
            return;
        }

        if (permissions.length === 0) {
            this.showNotification('请至少选择一个权限', 'error');
            return;
        }

        try {
            // 保存模版
            const success = this.saveCustomTemplate(templateData);

            if (success) {
                this.showNotification('模版更新成功', 'success');

                // 清空表单
                form.reset();
                if (this.templatePermissionSelector) {
                    this.templatePermissionSelector.clearSelection();
                }

                // 刷新自定义模版列表
                this.refreshCustomTemplates();

                // 切换到自定义模版标签
                this.switchTemplateTab('custom');

                // 重置保存按钮
                const saveBtn = document.getElementById('saveTemplate');
                saveBtn.textContent = '保存模版';
                saveBtn.onclick = () => this.saveTemplate();
            } else {
                this.showNotification('模版更新失败', 'error');
            }
        } catch (error) {
            console.error('更新模版失败:', error);
            this.showNotification('模版更新失败', 'error');
        }
    }

    // 加载自定义模版 (刷新功能)
    loadCustomTemplates() {
        this.refreshCustomTemplates();
        this.showNotification('自定义模版列表已刷新', 'success');
    }

    // 优化用户交互体验 - 添加快捷键支持
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + S 或 Cmd + S 保存
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();

                // 检查当前是否在编辑模式
                const roleModal = document.getElementById('roleModal');
                const templateModal = document.getElementById('roleTemplatesModal');

                if (roleModal && roleModal.classList.contains('show')) {
                    this.saveRole();
                } else if (templateModal && document.getElementById('createTab').classList.contains('active')) {
                    const saveBtn = document.getElementById('saveTemplate');
                    if (saveBtn.style.display !== 'none') {
                        saveBtn.click();
                    }
                }
            }

            // Esc 键关闭模态框
            if (e.key === 'Escape') {
                const modals = [
                    'roleModal',
                    'importRolesModal',
                    'roleTemplatesModal',
                    'templatePreviewModal'
                ];

                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        const closeMethod = {
                            'roleModal': () => this.hideRoleModal(),
                            'importRolesModal': () => this.hideImportRolesModal(),
                            'roleTemplatesModal': () => this.hideRoleTemplatesModal(),
                            'templatePreviewModal': () => this.hideTemplatePreview()
                        };
                        closeMethod[modalId]();
                    }
                });
            }
        });
    }

    // 优化拖拽体验
    enhanceDragAndDrop() {
        // 为整个页面添加拖拽防护，避免意外拖拽文件到浏览器
        document.addEventListener('dragover', (e) => {
            // 只允许在上传区域拖拽
            if (!e.target.closest('.file-upload-area')) {
                e.preventDefault();
                e.dataTransfer.effectAllowed = 'none';
                e.dataTransfer.dropEffect = 'none';
            }
        });

        document.addEventListener('drop', (e) => {
            if (!e.target.closest('.file-upload-area')) {
                e.preventDefault();
            }
        });
    }

    // 增强表单验证
    enhanceFormValidation() {
        // 实时验证角色名称唯一性
        const roleNameInput = document.getElementById('roleName');
        if (roleNameInput) {
            let validationTimeout;
            roleNameInput.addEventListener('input', (e) => {
                clearTimeout(validationTimeout);
                validationTimeout = setTimeout(() => {
                    this.validateRoleName(e.target.value);
                }, 300);
            });
        }
    }

    // 验证角色名称
    validateRoleName(name) {
        const existingRole = this.roles.find(r =>
            r.name.toLowerCase() === name.toLowerCase() &&
            r.id !== this.currentRoleId
        );

        const roleNameInput = document.getElementById('roleName');
        const feedback = document.querySelector('.role-name-feedback') ||
                         document.createElement('div');

        if (!document.querySelector('.role-name-feedback')) {
            feedback.className = 'role-name-feedback';
            roleNameInput.parentNode.insertBefore(feedback, roleNameInput.nextSibling);
        }

        if (existingRole) {
            feedback.textContent = '⚠️ 角色名称已存在';
            feedback.style.color = '#dc2626';
            roleNameInput.style.borderColor = '#dc2626';
        } else if (name.trim()) {
            feedback.textContent = '✅ 角色名称可用';
            feedback.style.color = '#059669';
            roleNameInput.style.borderColor = '#10b981';
        } else {
            feedback.textContent = '';
            roleNameInput.style.borderColor = '';
        }
    }

    updateStats() {
        document.getElementById('totalPermissions').textContent = this.permissions.length;
        document.getElementById('totalRoles').textContent = this.roles.length;
        document.getElementById('activeUsers').textContent = '28'; // Mock data
        document.getElementById('permissionCategories').textContent = Object.keys(this.groupPermissionsByCategory()).length;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-left: 4px solid ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            z-index: 1001;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    loadAdvancedConfig() {
        // Load advanced configuration settings
        console.log('Loading advanced configuration...');
    }

    // Mock data methods
    getMockPermissions() {
        return [
            // Dashboard permissions
            { id: 'dashboard:view', resource: 'dashboard', action: 'view', name: '仪表板查看', description: '查看系统仪表板和统计信息', category: '核心功能', level: 1 },
            { id: 'dashboard:export', resource: 'dashboard', action: 'export', name: '仪表板导出', description: '导出仪表板数据和报表', category: '核心功能', level: 2 },

            // Merchant permissions
            { id: 'merchant:view', resource: 'merchant', action: 'view', name: '商户查看', description: '查看商户信息和列表', category: '业务管理', level: 1 },
            { id: 'merchant:create', resource: 'merchant', action: 'create', name: '商户创建', description: '创建新的商户账户', category: '业务管理', level: 2 },
            { id: 'merchant:update', resource: 'merchant', action: 'update', name: '商户更新', description: '修改商户信息', category: '业务管理', level: 3 },
            { id: 'merchant:delete', resource: 'merchant', action: 'delete', name: '商户删除', description: '删除商户账户', category: '业务管理', level: 4 },
            { id: 'merchant:export', resource: 'merchant', action: 'export', name: '商户导出', description: '导出商户数据', category: '业务管理', level: 2 },
            { id: 'merchant:audit', resource: 'merchant', action: 'audit', name: '商户审核', description: '审核商户资质', category: '业务管理', level: 4 },

            // Account permissions
            { id: 'account:view', resource: 'account', action: 'view', name: '账户查看', description: '查看账户信息', category: '业务管理', level: 1 },
            { id: 'account:create', resource: 'account', action: 'create', name: '账户创建', description: '创建新账户', category: '业务管理', level: 2 },
            { id: 'account:update', resource: 'account', action: 'update', name: '账户更新', description: '修改账户信息', category: '业务管理', level: 3 },
            { id: 'account:delete', resource: 'account', action: 'delete', name: '账户删除', description: '删除账户', category: '业务管理', level: 4 },

            // Financial Audit permissions
            { id: 'financial_audit:view', resource: 'financial_audit', action: 'view', name: '财务审核查看', description: '查看财务审核记录', category: '财务管理', level: 1 },
            { id: 'financial_audit:audit', resource: 'financial_audit', action: 'audit', name: '财务审核操作', description: '执行财务审核', category: '财务管理', level: 4 },
            { id: 'financial_audit:export', resource: 'financial_audit', action: 'export', name: '财务审核导出', description: '导出审核数据', category: '财务管理', level: 2 },

            // User management permissions
            { id: 'user:view', resource: 'user', action: 'view', name: '用户查看', description: '查看用户信息', category: '用户权限', level: 1 },
            { id: 'user:create', resource: 'user', action: 'create', name: '用户创建', description: '创建新用户', category: '用户权限', level: 3 },
            { id: 'user:update', resource: 'user', action: 'update', name: '用户更新', description: '修改用户信息', category: '用户权限', level: 3 },
            { id: 'user:delete', resource: 'user', action: 'delete', name: '用户删除', description: '删除用户账户', category: '用户权限', level: 4 },

            // Role permissions
            { id: 'role:view', resource: 'role', action: 'view', name: '角色查看', description: '查看角色信息', category: '用户权限', level: 1 },
            { id: 'role:create', resource: 'role', action: 'create', name: '角色创建', description: '创建新角色', category: '用户权限', level: 4 },
            { id: 'role:update', resource: 'role', action: 'update', name: '角色更新', description: '修改角色权限', category: '用户权限', level: 4 },
            { id: 'role:delete', resource: 'role', action: 'delete', name: '角色删除', description: '删除角色', category: '用户权限', level: 5 },

            // System permissions
            { id: 'system:view', resource: 'system', action: 'view', name: '系统查看', description: '查看系统设置', category: '系统管理', level: 1 },
            { id: 'system:manage', resource: 'system', action: 'manage', name: '系统管理', description: '完全管理系统设置', category: '系统管理', level: 5 },

            // Recharge permissions
            { id: 'recharge:view', resource: 'recharge', action: 'view', name: '充值查看', description: '查看充值记录', category: '充值管理', level: 1 },
            { id: 'recharge:create', resource: 'recharge', action: 'create', name: '充值创建', description: '创建充值订单', category: '充值管理', level: 2 },
            { id: 'recharge:update', resource: 'recharge', action: 'update', name: '充值更新', description: '修改充值配置', category: '充值管理', level: 3 },
            { id: 'recharge:manage', resource: 'recharge', action: 'manage', name: '充值管理', description: '完全管理充值系统', category: '充值管理', level: 4 }
        ];
    }

    getMockRoles() {
        return [
            {
                id: 'SUPER_ADMIN',
                name: '超级管理员',
                description: '拥有系统所有权限，可以管理用户、角色和系统配置',
                level: 5,
                permissions: this.getMockPermissions().map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'ADMIN',
                name: '管理员',
                description: '拥有大部分管理权限，但不能管理超级管理员',
                level: 4,
                permissions: this.getMockPermissions().filter(p => p.level <= 4).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'FINANCIAL_MANAGER',
                name: '财务主管',
                description: '负责财务相关的审核和管理工作',
                level: 3,
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'account', 'financial_audit', 'report'].includes(p.resource)
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'AUDITOR',
                name: '审核员',
                description: '主要负责审核工作和数据查看',
                level: 2,
                permissions: this.getMockPermissions().filter(p =>
                    p.action === 'view' || p.action === 'audit' || p.action === 'export'
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'OPERATOR',
                name: '操作员',
                description: '负责日常业务操作',
                level: 2,
                permissions: this.getMockPermissions().filter(p =>
                    ['dashboard', 'merchant', 'account', 'recharge'].includes(p.resource) && p.level <= 3
                ).map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            },
            {
                id: 'VIEWER',
                name: '查看员',
                description: '只能查看数据，无修改权限',
                level: 1,
                permissions: this.getMockPermissions().filter(p => p.action === 'view').map(p => p.id),
                is_active: true,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
            }
        ];
    }
}

// Initialize permission manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.permissionManager = new PermissionManager();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .permission-category-selector {
        margin-bottom: 1.5rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
    }

    .permission-category-selector .category-header {
        background: var(--bg-secondary);
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--border-color);
        font-weight: 600;
    }

    .permission-checkboxes {
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 0.5rem;
    }

    .permission-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .permission-checkbox:hover {
        background: var(--bg-hover);
    }

    .permission-checkbox input[type="checkbox"] {
        margin: 0;
    }

    .notification {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .notification-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 0;
        margin-left: 1rem;
    }

    .role-meta {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-top: 0.5rem;
    }

    .permission-count {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .status {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status.active {
        background: #dcfce7;
        color: #166534;
    }

    .status.inactive {
        background: #fef2f2;
        color: #dc2626;
    }

    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }
`;
document.head.appendChild(style);