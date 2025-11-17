// 统一权限配置组件
class UnifiedPermissionConfig {
    constructor(options = {}) {
        this.options = {
            container: '#permissionConfigContainer',
            mode: 'edit', // 'edit', 'view', 'select'
            type: 'user', // 'user', 'role', 'api'
            targetId: null,
            targetName: '',
            viewType: 'list', // 'list', 'tree', 'matrix'
            allowMultiple: true,
            readOnly: false,
            showSearch: true,
            showLevels: true,
            showCategories: true,
            returnUrl: null,
            onSave: null,
            onCancel: null,
            onPermissionChange: null,
            ...options
        };

        this.permissions = [];
        this.selectedPermissions = new Set();
        this.permissionCategories = {};
        this.permissionLevels = {};
        this.roles = [];
        this.isInitialized = false;

        this.init();
    }

    async init() {
        this.container = document.querySelector(this.options.container);
        if (!this.container) {
            console.error('Permission config container not found:', this.options.container);
            return;
        }

        await this.loadPermissions();
        await this.loadCurrentPermissions();
        this.render();
        this.bindEvents();
        this.isInitialized = true;

        console.log('UnifiedPermissionConfig initialized for:', this.options.type, this.options.targetId);
    }

    async loadPermissions() {
        try {
            const response = await fetch('/api/permissions');
            const data = await response.json();

            if (data.success) {
                this.permissions = data.permissions;
                this.permissionCategories = data.categories || {};
                this.permissionLevels = data.levels || {};

                // 扁平化权限数据以便处理
                this.flatPermissions = [];
                Object.entries(data.permissions).forEach(([category, perms]) => {
                    perms.forEach(perm => {
                        this.flatPermissions.push({
                            ...perm,
                            category: category
                        });
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
            this.showError('加载权限数据失败');
        }
    }

    async loadCurrentPermissions() {
        if (!this.options.targetId) return;

        try {
            let url = '';
            switch (this.options.type) {
                case 'user':
                    url = `/api/users/${this.options.targetId}/permissions`;
                    break;
                case 'role':
                    url = `/api/roles/${this.options.targetId}/permissions`;
                    break;
                case 'api':
                    url = `/api/api-keys/${this.options.targetId}/permissions`;
                    break;
            }

            if (url) {
                const response = await fetch(url);
                const data = await response.json();

                if (data.success && data.permissions) {
                    this.selectedPermissions = new Set(data.permissions);
                }
            }
        } catch (error) {
            console.error('Failed to load current permissions:', error);
        }
    }

    render() {
        const html = this.generateHTML();
        this.container.innerHTML = html;
        this.renderPermissions();
    }

    generateHTML() {
        const targetTypeName = this.getTargetTypeName();
        const targetName = this.options.targetName || `${targetTypeName} ${this.options.targetId}`;

        return `
            <div class="unified-permission-config">
                <!-- 头部信息 -->
                <div class="permission-config-header">
                    <div class="config-title">
                        <h3>${this.getConfigTitle()}</h3>
                        <p class="config-subtitle">为 "${targetName}" 配置${targetTypeName}权限</p>
                    </div>

                    ${this.options.returnUrl ? `
                        <div class="config-actions">
                            <button type="button" class="btn btn-outline btn--sm" id="backToSource">
                                <span class="btn__icon">←</span>
                                返回
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- 搜索和筛选 -->
                ${this.options.showSearch ? `
                    <div class="permission-filters">
                        <div class="filter-row">
                            <div class="filter-item">
                                <input type="text"
                                       id="permissionSearch"
                                       class="form-input"
                                       placeholder="搜索权限...">
                            </div>

                            ${this.options.showCategories ? `
                                <div class="filter-item">
                                    <select id="categoryFilter" class="form-select">
                                        <option value="">所有分类</option>
                                        ${Object.entries(this.permissionCategories).map(([key, name]) =>
                                            `<option value="${key}">${name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            ` : ''}

                            ${this.options.showLevels ? `
                                <div class="filter-item">
                                    <select id="levelFilter" class="form-select">
                                        <option value="">所有级别</option>
                                        ${Object.entries(this.permissionLevels).map(([level, name]) =>
                                            `<option value="${level}">级别${level} - ${name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                            ` : ''}

                            <div class="filter-item">
                                <select id="viewTypeFilter" class="form-select">
                                    <option value="list" ${this.options.viewType === 'list' ? 'selected' : ''}>列表视图</option>
                                    <option value="tree" ${this.options.viewType === 'tree' ? 'selected' : ''}>树形视图</option>
                                    <option value="matrix" ${this.options.viewType === 'matrix' ? 'selected' : ''}>矩阵视图</option>
                                </select>
                            </div>
                        </div>

                        <div class="filter-stats">
                            <span class="stat-item">已选择: <strong id="selectedCount">0</strong></span>
                            <span class="stat-item">总计: <strong id="totalCount">0</strong></span>
                        </div>
                    </div>
                ` : ''}

                <!-- 权限配置区域 -->
                <div class="permission-config-content">
                    <div id="permissionList" class="permission-display"></div>
                </div>

                <!-- 操作按钮 -->
                ${!this.options.readOnly ? `
                    <div class="config-footer">
                        <div class="config-actions">
                            <button type="button" class="btn btn-outline" id="cancelConfig">
                                取消
                            </button>
                            <button type="button" class="btn btn-primary" id="saveConfig">
                                <span class="btn__icon">💾</span>
                                保存权限配置
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- 权限预览 -->
                <div class="permission-preview" style="display: none;" id="permissionPreview">
                    <h4>权限变更预览</h4>
                    <div class="preview-content" id="previewContent"></div>
                </div>
            </div>
        `;
    }

    renderPermissions() {
        const container = document.getElementById('permissionList');
        if (!container) return;

        const filteredPermissions = this.getFilteredPermissions();

        switch (this.options.viewType) {
            case 'list':
                container.innerHTML = this.renderListView(filteredPermissions);
                break;
            case 'tree':
                container.innerHTML = this.renderTreeView(filteredPermissions);
                break;
            case 'matrix':
                container.innerHTML = this.renderMatrixView(filteredPermissions);
                break;
        }

        this.updateStats();
    }

    renderListView(permissions) {
        const grouped = this.groupPermissionsByCategory(permissions);

        return Object.entries(grouped).map(([category, perms]) => `
            <div class="permission-category">
                <div class="category-header">
                    <div class="category-info">
                        <span class="category-icon">${this.getCategoryIcon(category)}</span>
                        <h4 class="category-title">${this.permissionCategories[category] || category}</h4>
                    </div>
                    <div class="category-actions">
                        <label class="category-toggle">
                            <input type="checkbox"
                                   class="category-checkbox"
                                   data-category="${category}"
                                   ${this.isCategoryFullySelected(perms) ? 'checked' : ''}>
                            <span class="checkbox-custom"></span>
                            <span class="checkbox-text">全选</span>
                        </label>
                        <span class="category-count">${perms.length}</span>
                    </div>
                </div>

                <div class="permission-list">
                    ${perms.map(perm => this.renderPermissionItem(perm)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderTreeView(permissions) {
        // 树形视图：按资源类型和操作类型组织
        const resourceGroups = {};

        permissions.forEach(perm => {
            const resource = perm.resource || 'unknown';
            if (!resourceGroups[resource]) {
                resourceGroups[resource] = [];
            }
            resourceGroups[resource].push(perm);
        });

        return `
            <div class="permission-tree">
                ${Object.entries(resourceGroups).map(([resource, perms]) => `
                    <div class="tree-node">
                        <div class="tree-header">
                            <span class="tree-toggle" data-resource="${resource}">▼</span>
                            <label class="tree-checkbox">
                                <input type="checkbox"
                                       class="resource-checkbox"
                                       data-resource="${resource}"
                                       ${this.isResourceFullySelected(perms) ? 'checked' : ''}>
                                <span class="checkbox-custom"></span>
                                <span class="resource-name">${resource}</span>
                                <span class="resource-count">(${perms.length})</span>
                            </label>
                        </div>
                        <div class="tree-content" data-resource="${resource}">
                            ${perms.map(perm => this.renderTreePermissionItem(perm)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMatrixView(permissions) {
        // 矩阵视图：资源 vs 操作类型
        const resources = [...new Set(permissions.map(p => p.resource))];
        const actions = [...new Set(permissions.map(p => p.action))];

        return `
            <div class="permission-matrix">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th class="matrix-corner">资源/操作</th>
                            ${actions.map(action => `
                                <th class="action-header" title="${action}">
                                    ${this.getActionDisplay(action)}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${resources.map(resource => `
                            <tr>
                                <td class="resource-header">${resource}</td>
                                ${actions.map(action => {
                                    const perm = permissions.find(p => p.resource === resource && p.action === action);
                                    return `
                                        <td class="matrix-cell">
                                            ${perm ? `
                                                <input type="checkbox"
                                                       class="matrix-checkbox"
                                                       data-permission="${perm.id}"
                                                       ${this.selectedPermissions.has(perm.id) ? 'checked' : ''}
                                                       ${this.options.readOnly ? 'disabled' : ''}>
                                            ` : '-'}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPermissionItem(permission) {
        const isSelected = this.selectedPermissions.has(permission.id);

        return `
            <div class="permission-item ${isSelected ? 'selected' : ''}">
                <div class="permission-checkbox">
                    <label class="checkbox-label">
                        <input type="checkbox"
                               class="permission-input"
                               data-permission="${permission.id}"
                               ${isSelected ? 'checked' : ''}
                               ${this.options.readOnly ? 'disabled' : ''}>
                        <span class="checkbox-custom"></span>
                    </label>
                </div>

                <div class="permission-info">
                    <div class="permission-name">${permission.name}</div>
                    <div class="permission-desc">${permission.description || ''}</div>
                    <div class="permission-meta">
                        <span class="permission-code">${permission.resource}:${permission.action}</span>
                        ${this.options.showLevels ? `
                            <span class="permission-level level-${permission.level}">
                                级别${permission.level}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderTreePermissionItem(permission) {
        const isSelected = this.selectedPermissions.has(permission.id);

        return `
            <div class="tree-permission-item">
                <label class="tree-permission-label">
                    <input type="checkbox"
                           class="permission-input"
                           data-permission="${permission.id}"
                           ${isSelected ? 'checked' : ''}
                           ${this.options.readOnly ? 'disabled' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="permission-action">${permission.action}</span>
                    <span class="permission-level level-${permission.level}">L${permission.level}</span>
                </label>
            </div>
        `;
    }

    bindEvents() {
        if (!this.isInitialized) return;

        // 搜索功能
        const searchInput = document.getElementById('permissionSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPermissions();
            });
        }

        // 筛选功能
        ['categoryFilter', 'levelFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.filterPermissions();
                });
            }
        });

        // 视图切换
        const viewTypeFilter = document.getElementById('viewTypeFilter');
        if (viewTypeFilter) {
            viewTypeFilter.addEventListener('change', (e) => {
                this.options.viewType = e.target.value;
                this.renderPermissions();
                this.bindPermissionEvents();
            });
        }

        // 权限选择事件
        this.bindPermissionEvents();

        // 操作按钮
        this.bindActionEvents();
    }

    bindPermissionEvents() {
        // 权限复选框事件
        document.querySelectorAll('.permission-input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const permissionId = e.target.dataset.permission;
                if (e.target.checked) {
                    this.selectedPermissions.add(permissionId);
                } else {
                    this.selectedPermissions.delete(permissionId);
                }

                this.updateStats();
                this.updateCategoryStates();

                if (this.options.onPermissionChange) {
                    this.options.onPermissionChange(permissionId, e.target.checked);
                }
            });
        });

        // 分类全选事件
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                this.toggleCategorySelection(category, e.target.checked);
            });
        });

        // 资源全选事件
        document.querySelectorAll('.resource-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const resource = e.target.dataset.resource;
                this.toggleResourceSelection(resource, e.target.checked);
            });
        });

        // 树形节点展开/收起
        document.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const resource = e.target.dataset.resource;
                this.toggleTreeNode(resource);
            });
        });
    }

    bindActionEvents() {
        // 保存按钮
        const saveBtn = document.getElementById('saveConfig');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePermissions();
            });
        }

        // 取消按钮
        const cancelBtn = document.getElementById('cancelConfig');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelConfig();
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('backToSource');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }
    }

    // 工具方法
    getFilteredPermissions() {
        let filtered = [...this.flatPermissions];

        // 搜索筛选
        const searchTerm = document.getElementById('permissionSearch')?.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(perm =>
                perm.name.toLowerCase().includes(searchTerm) ||
                perm.description?.toLowerCase().includes(searchTerm) ||
                perm.resource.toLowerCase().includes(searchTerm) ||
                perm.action.toLowerCase().includes(searchTerm)
            );
        }

        // 分类筛选
        const category = document.getElementById('categoryFilter')?.value;
        if (category) {
            filtered = filtered.filter(perm => perm.category === category);
        }

        // 级别筛选
        const level = document.getElementById('levelFilter')?.value;
        if (level) {
            filtered = filtered.filter(perm => perm.level.toString() === level);
        }

        return filtered;
    }

    groupPermissionsByCategory(permissions) {
        const grouped = {};
        permissions.forEach(perm => {
            const category = perm.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(perm);
        });
        return grouped;
    }

    toggleCategorySelection(category, selected) {
        const categoryPerms = this.flatPermissions.filter(p => p.category === category);

        categoryPerms.forEach(perm => {
            if (selected) {
                this.selectedPermissions.add(perm.id);
            } else {
                this.selectedPermissions.delete(perm.id);
            }
        });

        // 更新UI
        this.updatePermissionCheckboxes();
        this.updateStats();
    }

    toggleResourceSelection(resource, selected) {
        const resourcePerms = this.flatPermissions.filter(p => p.resource === resource);

        resourcePerms.forEach(perm => {
            if (selected) {
                this.selectedPermissions.add(perm.id);
            } else {
                this.selectedPermissions.delete(perm.id);
            }
        });

        this.updatePermissionCheckboxes();
        this.updateStats();
    }

    updatePermissionCheckboxes() {
        document.querySelectorAll('.permission-input').forEach(checkbox => {
            const permissionId = checkbox.dataset.permission;
            checkbox.checked = this.selectedPermissions.has(permissionId);
        });
    }

    updateStats() {
        const selectedCount = document.getElementById('selectedCount');
        const totalCount = document.getElementById('totalCount');

        if (selectedCount) {
            selectedCount.textContent = this.selectedPermissions.size;
        }

        if (totalCount) {
            totalCount.textContent = this.getFilteredPermissions().length;
        }
    }

    updateCategoryStates() {
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            const category = checkbox.dataset.category;
            const categoryPerms = this.flatPermissions.filter(p => p.category === category);
            checkbox.checked = this.isCategoryFullySelected(categoryPerms);
        });
    }

    isCategoryFullySelected(categoryPerms) {
        return categoryPerms.every(perm => this.selectedPermissions.has(perm.id));
    }

    isResourceFullySelected(resourcePerms) {
        return resourcePerms.every(perm => this.selectedPermissions.has(perm.id));
    }

    filterPermissions() {
        this.renderPermissions();
        this.bindPermissionEvents();
    }

    async savePermissions() {
        if (this.options.readOnly) return;

        try {
            const saveBtn = document.getElementById('saveConfig');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="btn__icon">⏳</span>保存中...';
            }

            let url = '';
            switch (this.options.type) {
                case 'user':
                    url = `/api/users/${this.options.targetId}/permissions`;
                    break;
                case 'role':
                    url = `/api/roles/${this.options.targetId}/permissions`;
                    break;
                case 'api':
                    url = `/api/api-keys/${this.options.targetId}/permissions`;
                    break;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permissions: Array.from(this.selectedPermissions)
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('权限配置保存成功');

                if (this.options.onSave) {
                    this.options.onSave(Array.from(this.selectedPermissions));
                }

                // 延迟返回，让用户看到成功消息
                setTimeout(() => {
                    this.goBack();
                }, 1500);
            } else {
                throw new Error(result.message || '保存失败');
            }
        } catch (error) {
            console.error('Save permissions failed:', error);
            this.showError('保存权限配置失败: ' + error.message);
        } finally {
            const saveBtn = document.getElementById('saveConfig');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span class="btn__icon">💾</span>保存权限配置';
            }
        }
    }

    cancelConfig() {
        if (this.options.onCancel) {
            this.options.onCancel();
        } else {
            this.goBack();
        }
    }

    goBack() {
        if (this.options.returnUrl) {
            window.location.href = this.options.returnUrl;
        } else {
            window.history.back();
        }
    }

    // UI辅助方法
    getConfigTitle() {
        const typeNames = {
            'user': '用户权限配置',
            'role': '角色权限配置',
            'api': 'API权限配置'
        };
        return typeNames[this.options.type] || '权限配置';
    }

    getTargetTypeName() {
        const typeNames = {
            'user': '用户',
            'role': '角色',
            'api': 'API'
        };
        return typeNames[this.options.type] || '目标';
    }

    getCategoryIcon(category) {
        const icons = {
            'core': '🏗️',
            'business': '🏪',
            'finance': '💰',
            'user': '👥',
            'system': '⚙️',
            'api': '🔌'
        };
        return icons[category] || '📁';
    }

    getActionDisplay(action) {
        const displays = {
            'view': '查看',
            'create': '创建',
            'update': '更新',
            'delete': '删除',
            'export': '导出',
            'import': '导入',
            'audit': '审核',
            'manage': '管理'
        };
        return displays[action] || action;
    }

    toggleTreeNode(resource) {
        const toggle = document.querySelector(`[data-resource="${resource}"].tree-toggle`);
        const content = document.querySelector(`[data-resource="${resource}"].tree-content`);

        if (toggle && content) {
            const isExpanded = content.style.display !== 'none';
            content.style.display = isExpanded ? 'none' : 'block';
            toggle.textContent = isExpanded ? '▶' : '▼';
        }
    }

    showSuccess(message) {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', 'error');
        } else {
            alert(message);
        }
    }

    // 公共API
    getSelectedPermissions() {
        return Array.from(this.selectedPermissions);
    }

    setSelectedPermissions(permissions) {
        this.selectedPermissions = new Set(permissions);
        this.updatePermissionCheckboxes();
        this.updateStats();
        this.updateCategoryStates();
    }

    addPermission(permissionId) {
        this.selectedPermissions.add(permissionId);
        this.updatePermissionCheckboxes();
        this.updateStats();
    }

    removePermission(permissionId) {
        this.selectedPermissions.delete(permissionId);
        this.updatePermissionCheckboxes();
        this.updateStats();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedPermissionConfig;
}

// 全局注册
window.UnifiedPermissionConfig = UnifiedPermissionConfig;