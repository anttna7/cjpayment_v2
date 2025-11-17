// 完整权限选择器组件 - 统一的权限配置界面
class FullPermissionSelector {
    constructor(options = {}) {
        this.options = {
            container: null,
            mode: 'user', // 'user' 或 'role'
            selectedPermissions: [],
            selectedRole: null,
            showRoleSelector: true,
            showSearch: true,
            showCategoryFilter: true,
            showLevelFilter: true,
            onPermissionChange: null,
            onRoleChange: null,
            ...options
        };

        this.permissionsData = window.permissionsData || new PermissionsData();
        this.allPermissions = this.permissionsData.permissions;
        this.allRoles = this.permissionsData.roles;
        this.selectedPermissions = new Set(this.options.selectedPermissions || []);
        this.filteredPermissions = [...this.allPermissions];

        this.init();
    }

    init() {
        if (!this.options.container) {
            console.error('FullPermissionSelector: container is required');
            return;
        }

        this.container = typeof this.options.container === 'string'
            ? document.querySelector(this.options.container)
            : this.options.container;

        if (!this.container) {
            console.error('FullPermissionSelector: container not found');
            return;
        }

        this.render();
        this.bindEvents();
        this.updateDisplay();
    }

    render() {
        console.log('🎨 [MCP调试] 开始渲染权限选择器组件...');

        this.container.innerHTML = `
            <div class="full-permission-selector">
                <!-- 角色选择器 -->
                ${this.options.showRoleSelector && this.options.mode === 'user' ? this.renderRoleSelector() : ''}

                <!-- 搜索和筛选 -->
                <div class="permission-filters">
                    ${this.options.showSearch ? `
                        <div class="permission-search">
                            <input type="text"
                                   id="permissionSearchInput"
                                   class="permission-search-input"
                                   placeholder="搜索权限...">
                        </div>
                    ` : ''}

                    <div class="permission-filter-controls">
                        ${this.options.showCategoryFilter ? `
                            <select id="categoryFilterSelect" class="permission-filter-select">
                                <option value="">所有类别</option>
                                ${this.getCategoryOptions()}
                            </select>
                        ` : ''}

                        ${this.options.showLevelFilter ? `
                            <select id="levelFilterSelect" class="permission-filter-select">
                                <option value="">所有级别</option>
                                <option value="1">基础权限 (L1)</option>
                                <option value="2">普通权限 (L2)</option>
                                <option value="3">重要权限 (L3)</option>
                                <option value="4">高级权限 (L4)</option>
                                <option value="5">超级权限 (L5)</option>
                            </select>
                        ` : ''}

                        <button type="button" id="clearAllBtn" class="permission-action-btn permission-action-btn--danger">
                            清除所有
                        </button>
                    </div>
                </div>

                <!-- 权限选择统计 -->
                <div class="permission-summary">
                    <div class="permission-count">
                        已选择 <span id="selectedCount">0</span> 个权限
                    </div>
                    <div class="permission-level-stats" id="levelStats"></div>
                </div>

                <!-- 权限列表 -->
                <div class="permission-list-container" style="min-height: 400px; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                    <div id="permissionsList" class="permissions-tree" style="width: 100%; min-height: 350px;">
                        <!-- 权限树将在这里渲染 -->
                    </div>
                </div>
            </div>
        `;

        console.log('✅ [MCP调试] 权限选择器HTML结构已生成');

        // 验证关键DOM元素
        setTimeout(() => {
            const permissionsList = document.getElementById('permissionsList');
            const container = this.container.querySelector('.full-permission-selector');
            const roleSelector = this.container.querySelector('.role-selector-section');

            console.log('🔍 [MCP调试] DOM验证:');
            console.log(`  - 权限选择器容器: ${!!container}`);
            console.log(`  - 权限列表元素: ${!!permissionsList}`);
            console.log(`  - 角色选择器: ${!!roleSelector}`);

            if (permissionsList) {
                console.log(`  - 权限列表位置: ${permissionsList.getBoundingClientRect().top}`);
                console.log(`  - 权限列表尺寸: ${permissionsList.offsetWidth}x${permissionsList.offsetHeight}`);
            }
        }, 100);
    }

    renderRoleSelector() {
        return `
            <div class="role-selector-section">
                <h4 class="section-title">快速角色选择</h4>
                <div class="role-selector-grid">
                    ${this.allRoles.map(role => `
                        <div class="role-option" data-role-id="${role.id}">
                            <div class="role-info">
                                <div class="role-name">${role.name}</div>
                                <div class="role-description">${role.description}</div>
                                <div class="role-meta">
                                    <span class="role-level level-${role.level}">L${role.level}</span>
                                    <span class="role-permission-count">${role.permissions.length}个权限</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="role-selector-actions">
                    <button type="button" id="clearRoleBtn" class="permission-action-btn permission-action-btn--outline">
                        清除角色
                    </button>
                </div>
            </div>
        `;
    }

    getCategoryOptions() {
        const categories = [...new Set(this.allPermissions.map(p => p.category))];
        return categories.map(category =>
            `<option value="${category}">${category}</option>`
        ).join('');
    }

    renderPermissionsList() {
        console.log('🎨 [MCP强化版] 渲染权限列表...');

        let permissionsList = document.getElementById('permissionsList');

        // 如果元素不存在，尝试创建它
        if (!permissionsList) {
            console.log('⚠️ [MCP调试] permissionsList 不存在，尝试创建...');
            const container = this.container.querySelector('.permission-list-container');
            if (container) {
                container.innerHTML = '<div id="permissionsList" class="permissions-tree" style="width: 100%; min-height: 350px;"></div>';
                permissionsList = document.getElementById('permissionsList');
                console.log('✅ [MCP调试] permissionsList 已创建');
            } else {
                console.log('❌ [MCP调试] 无法找到权限列表容器');
                return;
            }
        }

        const groupedPermissions = this.groupPermissions(this.filteredPermissions);

        console.log(`📊 [MCP强化版] 分组权限数据:`, Object.keys(groupedPermissions).map(cat =>
            `${cat}: ${groupedPermissions[cat].length}个`
        ).join(', '));

        console.log(`🔍 [MCP强化版] 当前选中权限数: ${this.selectedPermissions.size}`);
        console.log(`📋 [MCP强化版] 选中权限列表:`, Array.from(this.selectedPermissions));

        // 强制显示样式确保权限列表可见
        permissionsList.style.display = 'block';
        permissionsList.style.visibility = 'visible';
        permissionsList.style.opacity = '1';
        permissionsList.style.height = 'auto';
        permissionsList.style.maxHeight = 'none';
        permissionsList.style.overflow = 'visible';

        // 确保父容器也可见
        const parentContainer = permissionsList.parentElement;
        if (parentContainer) {
            parentContainer.style.display = 'block';
            parentContainer.style.visibility = 'visible';
            parentContainer.style.opacity = '1';
            parentContainer.style.height = 'auto';
            parentContainer.style.minHeight = '400px';
        }

        const html = Object.entries(groupedPermissions).map(([category, permissions]) => `
            <div class="permission-category category-expanded" style="margin: 10px 0; border: 2px solid #007bff; border-radius: 8px; background: white; display: block !important;">
                <div class="category-header" style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; display: block;">
                    <div style="display: flex; align-items: center; font-weight: bold; font-size: 16px;">
                        <span style="margin-right: 10px;">📁</span>
                        <span>${category}</span>
                        <span style="margin-left: 10px; color: #666; font-size: 14px;">(${permissions.length}个权限)</span>
                    </div>
                </div>
                <div class="category-permissions" style="padding: 15px; max-height: none !important; display: block !important; visibility: visible !important; opacity: 1 !important; overflow: visible !important;">
                    ${permissions.map(permission => {
                        const isSelected = this.selectedPermissions.has(permission.id);
                        console.log(`🔍 [MCP强化版] 权限 ${permission.id} (${permission.name}): 选中=${isSelected}`);
                        return `
                        <div class="permission-item ${isSelected ? 'permission-item--selected' : ''}"
                             data-permission-id="${permission.id}"
                             style="margin: 8px 0; padding: 12px; border: 2px solid ${isSelected ? '#007bff' : '#ddd'};
                                    border-radius: 6px; background: ${isSelected ? 'rgba(0,123,255,0.1)' : 'white'};
                                    display: block !important; visibility: visible !important;">
                            <label style="display: flex; align-items: flex-start; cursor: pointer; width: 100%;">
                                <input type="checkbox"
                                       class="permission-checkbox"
                                       data-permission-id="${permission.id}"
                                       ${isSelected ? 'checked' : ''}
                                       style="margin-right: 12px; margin-top: 2px; width: 18px; height: 18px; display: inline-block !important;">
                                <div style="flex: 1; display: block;">
                                    <div class="permission-name" style="font-weight: 600; font-size: 14px; color: ${isSelected ? '#007bff' : '#333'}; margin-bottom: 4px; display: block;">
                                        ${permission.name}
                                    </div>
                                    <div class="permission-description" style="font-size: 12px; color: #666; line-height: 1.4; margin-bottom: 8px; display: block;">
                                        ${permission.description}
                                    </div>
                                    <div class="permission-meta" style="display: flex; gap: 6px; flex-wrap: wrap;">
                                        <span style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #495057;">
                                            📦 ${permission.resource}
                                        </span>
                                        <span style="background: #e9ecef; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #495057;">
                                            ⚡ ${permission.action}
                                        </span>
                                        <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                                            L${permission.level}
                                        </span>
                                    </div>
                                </div>
                            </label>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');

        permissionsList.innerHTML = html;

        console.log('✅ [MCP强化版] 权限列表HTML已生成并插入DOM');
        console.log(`📏 [MCP强化版] HTML长度: ${html.length} 字符`);

        // 强制刷新DOM
        permissionsList.offsetHeight; // 触发重排

        // 验证渲染结果
        setTimeout(() => {
            const renderedCheckboxes = permissionsList.querySelectorAll('.permission-checkbox');
            const checkedCheckboxes = permissionsList.querySelectorAll('.permission-checkbox:checked');
            const categoryDivs = permissionsList.querySelectorAll('.permission-category');

            console.log(`🎯 [MCP强化版] 渲染验证:`);
            console.log(`  - 权限分类: ${categoryDivs.length} 个`);
            console.log(`  - 权限复选框: ${renderedCheckboxes.length} 个`);
            console.log(`  - 选中复选框: ${checkedCheckboxes.length} 个`);
            console.log(`  - 容器尺寸: ${permissionsList.offsetWidth}x${permissionsList.offsetHeight}`);
            console.log(`  - 容器可见性: ${window.getComputedStyle(permissionsList).visibility}`);

            if (renderedCheckboxes.length === 0) {
                console.log('❌ [MCP强化版] 没有渲染出任何权限复选框，检查数据...');
                console.log('数据检查:', {
                    filteredPermissions: this.filteredPermissions.length,
                    allPermissions: this.allPermissions.length,
                    groupedPermissions: Object.keys(groupedPermissions).length
                });
            }
        }, 100);

        // 更新分类复选框状态
        setTimeout(() => {
            this.updateCategoryCheckboxes();
        }, 150);
    }

    groupPermissions(permissions) {
        const grouped = {};
        permissions.forEach(permission => {
            const category = permission.category || '其他';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(permission);
        });

        // 按权限级别排序每个分类内的权限
        Object.keys(grouped).forEach(category => {
            grouped[category].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
        });

        return grouped;
    }

    bindEvents() {
        // 搜索事件
        const searchInput = document.getElementById('permissionSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 筛选事件
        const categoryFilter = document.getElementById('categoryFilterSelect');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.handleCategoryFilter(e.target.value);
            });
        }

        const levelFilter = document.getElementById('levelFilterSelect');
        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.handleLevelFilter(e.target.value);
            });
        }

        // 清除所有按钮
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllPermissions();
            });
        }

        // 角色选择器事件
        const clearRoleBtn = document.getElementById('clearRoleBtn');
        if (clearRoleBtn) {
            clearRoleBtn.addEventListener('click', () => {
                this.clearRole();
            });
        }

        // 使用事件委托绑定权限复选框事件
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('permission-checkbox')) {
                this.handlePermissionChange(e.target);
            } else if (e.target.classList.contains('category-checkbox')) {
                this.handleCategoryChange(e.target);
            }
        });

        // 角色选择事件
        this.container.addEventListener('click', (e) => {
            const roleOption = e.target.closest('.role-option');
            if (roleOption) {
                this.handleRoleSelect(roleOption.dataset.roleId);
            }
        });
    }

    handleSearch(searchTerm) {
        if (!searchTerm) {
            this.filteredPermissions = [...this.allPermissions];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredPermissions = this.allPermissions.filter(permission =>
                permission.name.toLowerCase().includes(term) ||
                permission.description.toLowerCase().includes(term) ||
                permission.resource.toLowerCase().includes(term) ||
                permission.action.toLowerCase().includes(term)
            );
        }
        this.applyFilters();
    }

    handleCategoryFilter(category) {
        this.categoryFilter = category;
        this.applyFilters();
    }

    handleLevelFilter(level) {
        this.levelFilter = level;
        this.applyFilters();
    }

    applyFilters() {
        let filtered = [...this.allPermissions];

        // 应用搜索
        const searchInput = document.getElementById('permissionSearchInput');
        if (searchInput && searchInput.value) {
            const term = searchInput.value.toLowerCase();
            filtered = filtered.filter(permission =>
                permission.name.toLowerCase().includes(term) ||
                permission.description.toLowerCase().includes(term) ||
                permission.resource.toLowerCase().includes(term) ||
                permission.action.toLowerCase().includes(term)
            );
        }

        // 应用类别筛选
        if (this.categoryFilter) {
            filtered = filtered.filter(permission => permission.category === this.categoryFilter);
        }

        // 应用级别筛选
        if (this.levelFilter) {
            filtered = filtered.filter(permission => permission.level <= parseInt(this.levelFilter));
        }

        this.filteredPermissions = filtered;
        this.renderPermissionsList();
    }

    handlePermissionChange(checkbox) {
        const permissionId = checkbox.dataset.permissionId;

        if (checkbox.checked) {
            this.selectedPermissions.add(permissionId);
        } else {
            this.selectedPermissions.delete(permissionId);
        }

        this.updateDisplay();
        this.updateCategoryCheckboxes();

        if (this.options.onPermissionChange) {
            this.options.onPermissionChange(Array.from(this.selectedPermissions));
        }
    }

    handleCategoryChange(checkbox) {
        const category = checkbox.dataset.category;
        const categoryPermissions = this.filteredPermissions.filter(p => p.category === category);

        if (checkbox.checked) {
            // 选中该类别下的所有权限
            categoryPermissions.forEach(permission => {
                this.selectedPermissions.add(permission.id);
            });
        } else {
            // 取消选中该类别下的所有权限
            categoryPermissions.forEach(permission => {
                this.selectedPermissions.delete(permission.id);
            });
        }

        this.updateDisplay();
        this.renderPermissionsList(); // 重新渲染以更新复选框状态
    }

    handleRoleSelect(roleId) {
        console.log('🎯 [强化版] 选择角色:', roleId);

        // 清除之前的角色选择状态
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('role-option--selected');
        });

        // 设置新的角色选择状态
        const roleOption = document.querySelector(`[data-role-id="${roleId}"]`);
        if (roleOption) {
            roleOption.classList.add('role-option--selected');
        }

        // 获取角色权限并设置
        const role = this.allRoles.find(r => r.id === roleId);
        if (role) {
            console.log('📋 [强化版] 角色权限:', role.permissions);
            console.log('📊 [强化版] 权限数量:', role.permissions.length);

            // 清除所有现有权限选择
            this.selectedPermissions.clear();

            // 逐个添加角色权限到选中集合
            role.permissions.forEach(permissionId => {
                this.selectedPermissions.add(permissionId);
                console.log(`➕ 添加权限: ${permissionId}`);
            });

            this.selectedRole = roleId;

            console.log('✅ [强化版] 最终选中权限:', Array.from(this.selectedPermissions));

            // 立即更新显示计数
            this.updateDisplay();

            // 重置过滤状态确保显示所有权限
            this.filteredPermissions = [...this.allPermissions];

            // 强制重新渲染权限列表
            console.log('🔄 [强化版] 强制重新渲染权限列表...');
            this.renderPermissionsList();

            // 多重确保选中状态正确应用
            setTimeout(() => {
                this.forceUpdateAllPermissionStates();
            }, 50);

            setTimeout(() => {
                this.forceUpdateAllPermissionStates();
            }, 200);

            // 强制展开所有权限分类
            setTimeout(() => {
                this.expandAllCategories();
            }, 100);

            // 显示角色信息
            setTimeout(() => {
                this.showRoleInfo(role);
            }, 150);

            if (this.options.onRoleChange) {
                this.options.onRoleChange(role);
            }
        } else {
            console.error('❌ [强化版] 未找到角色:', roleId);
        }
    }

    // 强化版权限状态更新
    forceUpdateAllPermissionStates() {
        console.log('💪 [强化版] 强制更新所有权限状态...');

        const permissionsList = document.getElementById('permissionsList');
        if (!permissionsList) {
            console.log('❌ 权限列表容器不存在');
            return;
        }

        // 找到所有权限复选框
        const allCheckboxes = permissionsList.querySelectorAll('.permission-checkbox');
        console.log(`📋 [强化版] 找到 ${allCheckboxes.length} 个权限复选框`);

        let updatedCount = 0;
        let checkedCount = 0;

        allCheckboxes.forEach((checkbox, index) => {
            const permissionId = checkbox.dataset.permissionId;
            const shouldBeChecked = this.selectedPermissions.has(permissionId);

            console.log(`🔍 [强化版] 权限 ${permissionId}: 应该选中=${shouldBeChecked}, 当前选中=${checkbox.checked}`);

            // 强制设置复选框状态
            if (checkbox.checked !== shouldBeChecked) {
                checkbox.checked = shouldBeChecked;
                console.log(`🔄 [强化版] 更新权限 ${permissionId}: ${shouldBeChecked}`);
                updatedCount++;
            }

            // 更新父级样式
            const permissionItem = checkbox.closest('.permission-item');
            if (permissionItem) {
                if (shouldBeChecked) {
                    permissionItem.classList.add('permission-item--selected');
                    checkedCount++;
                } else {
                    permissionItem.classList.remove('permission-item--selected');
                }
            }
        });

        console.log(`✅ [强化版] 共更新 ${updatedCount} 个权限状态`);
        console.log(`✅ [强化版] 共设置 ${checkedCount} 个权限为选中状态`);

        // 更新分类复选框状态
        this.updateCategoryCheckboxes();

        // 确保DOM更新完成
        setTimeout(() => {
            const finalCheckedCount = document.querySelectorAll('.permission-checkbox:checked').length;
            console.log(`🎯 [强化版] 最终检查: ${finalCheckedCount} 个复选框被选中`);
        }, 100);
    }

    // 保留原方法作为备用
    forceUpdatePermissionStates() {
        this.forceUpdateAllPermissionStates();
    }

    // 展开所有权限分类
    expandAllCategories() {
        setTimeout(() => {
            const categoryHeaders = document.querySelectorAll('.category-header');
            categoryHeaders.forEach(header => {
                const category = header.closest('.permission-category');
                if (category) {
                    category.classList.add('category-expanded');
                }
            });
        }, 100);
    }

    // 显示角色信息
    showRoleInfo(role) {
        const permissionsList = document.getElementById('permissionsList');
        if (permissionsList) {
            // 在权限列表顶部添加角色信息提示
            const roleInfo = document.createElement('div');
            roleInfo.className = 'role-info-banner';
            roleInfo.innerHTML = `
                <div class="role-info-content">
                    <span class="role-info-icon">👥</span>
                    <span class="role-info-text">已选择角色 "${role.name}"，包含 ${role.permissions.length} 个权限</span>
                    <button class="role-info-clear" onclick="this.closest('.full-permission-selector').permissionSelector?.clearRole()">
                        清除角色
                    </button>
                </div>
            `;

            // 移除之前的角色信息
            const existingInfo = permissionsList.parentNode.querySelector('.role-info-banner');
            if (existingInfo) {
                existingInfo.remove();
            }

            // 插入新的角色信息
            permissionsList.parentNode.insertBefore(roleInfo, permissionsList);
        }
    }

    clearRole() {
        // 清除角色选择状态
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('role-option--selected');
        });
        this.selectedRole = null;

        // 移除角色信息横幅
        const roleInfo = document.querySelector('.role-info-banner');
        if (roleInfo) {
            roleInfo.remove();
        }

        if (this.options.onRoleChange) {
            this.options.onRoleChange(null);
        }
    }

    clearAllPermissions() {
        this.selectedPermissions.clear();
        this.clearRole();
        this.updateDisplay();
        this.renderPermissionsList();

        if (this.options.onPermissionChange) {
            this.options.onPermissionChange([]);
        }
    }

    updateDisplay() {
        this.updateSelectedCount();
        this.updateLevelStats();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedPermissions.size;
        }
    }

    updateLevelStats() {
        const statsElement = document.getElementById('levelStats');
        if (!statsElement) return;

        const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        this.selectedPermissions.forEach(permissionId => {
            const permission = this.allPermissions.find(p => p.id === permissionId);
            if (permission) {
                levelCounts[permission.level]++;
            }
        });

        statsElement.innerHTML = Object.entries(levelCounts)
            .filter(([level, count]) => count > 0)
            .map(([level, count]) => `
                <span class="level-stat level-${level}">L${level}: ${count}</span>
            `).join('');
    }

    updateCategoryCheckboxes() {
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            const category = checkbox.dataset.category;
            const categoryPermissions = this.filteredPermissions.filter(p => p.category === category);
            const selectedInCategory = categoryPermissions.filter(p => this.selectedPermissions.has(p.id));

            if (selectedInCategory.length === 0) {
                checkbox.checked = false;
                checkbox.indeterminate = false;
            } else if (selectedInCategory.length === categoryPermissions.length) {
                checkbox.checked = true;
                checkbox.indeterminate = false;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
            }
        });
    }

    // 公共方法
    getSelectedPermissions() {
        return Array.from(this.selectedPermissions);
    }

    setSelectedPermissions(permissions) {
        this.selectedPermissions = new Set(permissions);
        this.updateDisplay();
        this.renderPermissionsList();
    }

    getSelectedRole() {
        return this.selectedRole;
    }

    setSelectedRole(roleId) {
        if (roleId) {
            this.handleRoleSelect(roleId);
        } else {
            this.clearRole();
        }
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 导出到全局
window.FullPermissionSelector = FullPermissionSelector;