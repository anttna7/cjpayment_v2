/**
 * 用户权限管理系统 - 已更新支持完整权限选择器
 * 负责用户管理、角色管理、权限配置等功能
 * 版本: 2.0 - 完整权限选择器集成版本
 * 更新时间: 2025-09-22
 */
console.log('🔧 用户管理系统加载中... 版本 2.0 (完整权限选择器集成)');
console.log('📍 文件路径: user-management.js');
console.log('⏰ 更新时间: 2025-09-22');
class UserManagementSystem {
    constructor() {
        console.log('🏗️ UserManagementSystem 构造函数执行');
        this.users = [];
        this.roles = [];
        this.permissions = [];
        this.currentUser = null;
        this.currentRole = null;
        this.fullPermissionSelector = null; // 添加权限选择器实例
        this.filters = {
            role: '',
            status: '',
            search: ''
        };
        this.pagination = {
            currentPage: 1,
            pageSize: 20,
            total: 0
        };

        console.log('✅ UserManagementSystem 实例属性初始化完成');
        this.init();
    }
    
    init() {
        this.initPermissions();
        this.loadRoles();
        this.loadUsers();
        this.bindEvents();
        this.renderUsers();
        this.renderRoles();
        
        console.log('用户权限管理系统已初始化');
    }
    
    /**
     * 初始化权限列表
     */
    initPermissions() {
        this.permissions = [
            {
                id: 'DASHBOARD',
                name: '仪表板',
                children: [
                    { id: 'DASHBOARD_VIEW', name: '查看仪表板' },
                    { id: 'DASHBOARD_EXPORT', name: '导出报表' }
                ]
            },
            {
                id: 'MERCHANT',
                name: '商户管理',
                children: [
                    { id: 'MERCHANT_VIEW', name: '查看商户' },
                    { id: 'MERCHANT_CREATE', name: '创建商户' },
                    { id: 'MERCHANT_EDIT', name: '编辑商户' },
                    { id: 'MERCHANT_DELETE', name: '删除商户' },
                    { id: 'MERCHANT_LINK', name: '管理充值链接' }
                ]
            },
            {
                id: 'ACCOUNT',
                name: '账户管理',
                children: [
                    { id: 'ACCOUNT_VIEW', name: '查看账户' },
                    { id: 'ACCOUNT_CREATE', name: '创建账户' },
                    { id: 'ACCOUNT_EDIT', name: '编辑账户' },
                    { id: 'ACCOUNT_DELETE', name: '删除账户' },
                    { id: 'ACCOUNT_BALANCE', name: '查看余额' }
                ]
            },
            {
                id: 'AUDIT',
                name: '财务审核',
                children: [
                    { id: 'AUDIT_VIEW', name: '查看审核' },
                    { id: 'AUDIT_APPROVE', name: '审核通过' },
                    { id: 'AUDIT_REJECT', name: '审核拒绝' },
                    { id: 'AUDIT_HISTORY', name: '查看历史' }
                ]
            },
            {
                id: 'SYSTEM',
                name: '系统管理',
                children: [
                    { id: 'SYSTEM_USER', name: '用户管理' },
                    { id: 'SYSTEM_ROLE', name: '角色管理' },
                    { id: 'SYSTEM_CONFIG', name: '系统配置' },
                    { id: 'SYSTEM_LOG', name: '系统日志' },
                    { id: 'SYSTEM_BACKUP', name: '系统备份' }
                ]
            }
        ];
    }
    
    /**
     * 加载角色列表
     */
    loadRoles() {
        // 从完整权限数据中获取角色
        if (window.permissionsData) {
            this.roles = window.permissionsData.roles.map(role => ({
                id: role.id,
                name: role.name,
                description: role.description,
                permissions: role.permissions,
                userCount: this.users ? this.users.filter(u => u.role === role.id).length : 0,
                createdAt: role.created_at ? role.created_at.split('T')[0] : '2024-01-01',
                updatedAt: role.updated_at ? role.updated_at.split('T')[0] : '2024-01-01'
            }));
        } else {
            // 如果权限数据还未加载，使用默认角色
            this.roles = [
                {
                    id: 'ADMIN',
                    name: '超级管理员',
                    description: '拥有系统所有权限，可以管理所有模块和用户',
                    permissions: ['DASHBOARD', 'MERCHANT', 'ACCOUNT', 'AUDIT', 'SYSTEM'],
                    userCount: 3,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-08-17'
                },
                {
                    id: 'MANAGER',
                    name: '管理员',
                    description: '拥有业务管理权限，可以管理商户和账户',
                    permissions: ['DASHBOARD', 'MERCHANT', 'ACCOUNT', 'AUDIT'],
                    userCount: 8,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-08-15'
                },
                {
                    id: 'OPERATOR',
                    name: '操作员',
                    description: '拥有日常操作权限，可以处理业务流程',
                    permissions: ['DASHBOARD', 'MERCHANT', 'ACCOUNT'],
                    userCount: 12,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-08-10'
                },
                {
                    id: 'AUDITOR',
                    name: '审核员',
                    description: '专门负责财务审核工作',
                    permissions: ['DASHBOARD', 'AUDIT'],
                    userCount: 4,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-08-12'
                },
                {
                    id: 'VIEWER',
                    name: '查看员',
                    description: '只能查看数据，无修改权限',
                    permissions: ['DASHBOARD'],
                    userCount: 1,
                    createdAt: '2024-01-01',
                    updatedAt: '2024-08-01'
                }
            ];
        }
    }
    
    /**
     * 加载用户列表
     */
    loadUsers() {
        console.log('📋 加载用户数据...');
        this.users = [
            {
                id: 'U001',
                username: 'admin',
                realName: '系统管理员',
                email: 'admin@cjpayment.com',
                phone: '13800000001',
                department: 'ADMIN',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE',
                permissions: ['dashboard:view', 'dashboard:export', 'merchant:view', 'merchant:create', 'merchant:update', 'merchant:delete', 'account:view', 'account:create', 'user:view', 'user:create', 'user:update', 'system:view', 'system:manage'],
                lastLogin: '2024-08-17 14:30:00',
                loginCount: 1250,
                createdAt: '2024-01-01 00:00:00',
                isOnline: true
            },
            {
                id: 'U002',
                username: 'manager1',
                realName: '张经理',
                email: 'zhang@cjpayment.com',
                phone: '13800000002',
                department: 'BUSINESS',
                role: 'ADMIN',
                status: 'ACTIVE',
                permissions: ['dashboard:view', 'merchant:view', 'merchant:create', 'merchant:update', 'account:view', 'financial_audit:view'],
                lastLogin: '2024-08-17 13:45:00',
                loginCount: 890,
                createdAt: '2024-01-15 09:00:00',
                isOnline: true
            },
            {
                id: 'U003',
                username: 'operator1',
                realName: '李操作员',
                email: 'li@cjpayment.com',
                phone: '13800000003',
                department: 'OPERATION',
                role: 'OPERATOR',
                status: 'ACTIVE',
                permissions: ['dashboard:view', 'merchant:view', 'merchant:create', 'account:view', 'recharge:view'],
                lastLogin: '2024-08-17 12:20:00',
                loginCount: 445,
                createdAt: '2024-02-01 10:30:00',
                isOnline: false
            },
            {
                id: 'U004',
                username: 'auditor1',
                realName: '王审核员',
                email: 'wang@cjpayment.com',
                phone: '13800000004',
                department: 'FINANCE',
                role: 'AUDITOR',
                status: 'ACTIVE',
                permissions: ['dashboard:view', 'financial_audit:view', 'financial_audit:audit', 'financial_audit:export', 'report:view'],
                lastLogin: '2024-08-17 11:15:00',
                loginCount: 332,
                createdAt: '2024-02-15 14:00:00',
                isOnline: true
            },
            {
                id: 'U005',
                username: 'operator2',
                realName: '赵操作员',
                email: 'zhao@cjpayment.com',
                phone: '13800000005',
                department: 'OPERATION',
                role: 'OPERATOR',
                status: 'SUSPENDED',
                permissions: ['dashboard:view', 'merchant:view'],
                lastLogin: '2024-08-15 16:30:00',
                loginCount: 278,
                createdAt: '2024-03-01 11:45:00',
                isOnline: false
            },
            {
                id: 'U006',
                username: 'viewer1',
                realName: '钱查看员',
                email: 'qian@cjpayment.com',
                phone: '13800000006',
                department: 'ADMIN',
                role: 'VIEWER',
                status: 'ACTIVE',
                permissions: ['dashboard:view', 'merchant:view', 'account:view', 'financial_audit:view', 'report:view'],
                lastLogin: '2024-08-16 09:00:00',
                loginCount: 156,
                createdAt: '2024-03-15 08:30:00',
                isOnline: false
            }
        ];

        console.log(`✅ 已加载 ${this.users.length} 个用户`);
        console.log('📋 用户列表:', this.users.map(u => ({ id: u.id, username: u.username, permissions: u.permissions.length })));

        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 添加用户按钮
        document.getElementById('addUser').addEventListener('click', () => this.openUserModal());
        
        // 添加角色按钮
        document.getElementById('addRole').addEventListener('click', () => this.openRoleModal());
        
        // 搜索和筛选
        document.getElementById('userSearch').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('roleFilter').addEventListener('change', (e) => this.handleRoleFilter(e.target.value));
        document.getElementById('statusFilter').addEventListener('change', (e) => this.handleStatusFilter(e.target.value));
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());
        
        // 视图切换事件
        this.bindViewToggleEvents();
        
        // 用户模态框事件
        this.bindUserModalEvents();
        
        // 角色模态框事件
        this.bindRoleModalEvents();
        
        // 用户详情模态框事件
        this.bindUserDetailsModalEvents();
    }
    
    /**
     * 绑定用户模态框事件
     */
    bindUserModalEvents() {
        const modal = document.getElementById('userModal');
        const closeBtn = document.getElementById('userModalClose');
        const cancelBtn = document.getElementById('cancelUserBtn');
        const form = document.getElementById('userForm');
        const passwordToggle = document.getElementById('passwordToggle');

        // 关闭模态框
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeUserModal());
            }
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeUserModal();
            }
        });

        // 密码显示切换
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                const passwordInput = document.getElementById('password');
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }

        // 表单提交
        if (form) {
            form.addEventListener('submit', (e) => this.handleUserSave(e));
        }

        // 绑定标签页切换事件
        this.bindUserModalTabEvents();
    }
    
    /**
     * 绑定角色模态框事件
     */
    bindRoleModalEvents() {
        const modal = document.getElementById('roleModal');
        const closeBtn = document.getElementById('roleModalClose');
        const cancelBtn = document.getElementById('cancelRoleBtn');
        const form = document.getElementById('roleForm');
        
        // 关闭模态框
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeRoleModal());
            }
        });
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeRoleModal();
            }
        });
        
        // 表单提交
        if (form) {
            form.addEventListener('submit', (e) => this.handleRoleSave(e));
        }
    }
    
    /**
     * 绑定用户详情模态框事件
     */
    bindUserDetailsModalEvents() {
        const modal = document.getElementById('userDetailsModal');
        const closeBtn = document.getElementById('userDetailsModalClose');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeUserDetailsModal());
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeUserDetailsModal();
            }
        });
    }
    
    /**
     * 绑定视图切换事件
     */
    bindViewToggleEvents() {
        const viewToggle = document.getElementById('viewToggle');
        if (!viewToggle) return;
        
        const viewButtons = viewToggle.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const viewType = button.dataset.view;
                this.switchView(viewType);
                
                // 更新按钮状态
                viewButtons.forEach(btn => btn.classList.remove('view-btn--active'));
                button.classList.add('view-btn--active');
            });
        });
        
        // 初始化当前视图
        this.currentView = 'grid';
    }
    
    /**
     * 切换视图模式
     */
    switchView(viewType) {
        this.currentView = viewType;
        
        const gridContainer = document.getElementById('usersGrid');
        const tableContainer = document.getElementById('usersTableContainer');
        
        if (viewType === 'table') {
            // 显示表格视图
            if (gridContainer) gridContainer.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'block';
            this.renderUsersTable();
        } else {
            // 显示网格视图
            if (gridContainer) gridContainer.style.display = 'grid';
            if (tableContainer) tableContainer.style.display = 'none';
            this.renderUsersGrid();
        }
    }
    
    /**
     * 渲染用户列表 - 统一入口
     */
    renderUsers() {
        if (this.currentView === 'table') {
            this.renderUsersTable();
        } else {
            this.renderUsersGrid();
        }
        this.updatePagination(this.getFilteredUsers().length);
    }
    
    /**
     * 渲染网格视图用户列表
     */
    renderUsersGrid() {
        const grid = document.getElementById('usersGrid');
        if (!grid) return;
        
        const filteredUsers = this.getFilteredUsers();
        grid.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">👤</div>
                    <h4 class="empty-state__title">暂无用户</h4>
                    <p class="empty-state__description">没有找到符合条件的用户</p>
                </div>
            `;
            return;
        }
        
        filteredUsers.forEach(user => {
            const userCard = this.createUserCard(user);
            grid.appendChild(userCard);
        });
    }
    
    /**
     * 渲染表格视图用户列表
     */
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        const filteredUsers = this.getFilteredUsers();
        tbody.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 3rem;">
                        <div class="empty-state">
                            <div class="empty-state__icon">👤</div>
                            <h4 class="empty-state__title">暂无用户</h4>
                            <p class="empty-state__description">没有找到符合条件的用户</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredUsers.forEach(user => {
            const userRow = this.createUserTableRow(user);
            tbody.appendChild(userRow);
        });
        
        // 绑定表格排序事件
        this.bindTableSortEvents();
    }
    
    /**
     * 创建用户卡片
     */
    createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.dataset.userId = user.id;
        
        const role = this.roles.find(r => r.id === user.role);
        const statusClass = {
            'ACTIVE': 'status-active',
            'SUSPENDED': 'status-suspended',
            'DISABLED': 'status-disabled'
        }[user.status] || 'status-active';
        
        const statusText = {
            'ACTIVE': '正常',
            'SUSPENDED': '暂停',
            'DISABLED': '禁用'
        }[user.status] || '未知';
        
        const departmentText = {
            'TECH': '技术部',
            'FINANCE': '财务部',
            'OPERATION': '运营部',
            'BUSINESS': '商务部',
            'ADMIN': '行政部'
        }[user.department] || user.department || '-';
        
        card.innerHTML = `
            ${user.isOnline ? '<div class="online-indicator"></div>' : ''}
            
            <div class="user-card__header">
                <div style="display: flex; align-items: center;">
                    <div class="user-card__avatar">
                        ${user.realName.charAt(0)}
                    </div>
                    <div class="user-card__info">
                        <h4 class="user-card__name">${this.escapeHtml(user.realName)}</h4>
                        <p class="user-card__username">@${user.username}</p>
                        <span class="user-card__role">${role ? role.name : user.role}</span>
                    </div>
                </div>
                <div class="user-card__status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            
            <div class="user-card__details">
                <div class="user-detail">
                    <span class="user-detail__label">邮箱</span>
                    <span class="user-detail__value">${user.email}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail__label">手机</span>
                    <span class="user-detail__value">${user.phone || '-'}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail__label">部门</span>
                    <span class="user-detail__value">${departmentText}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail__label">最后登录</span>
                    <span class="user-detail__value">${user.lastLogin || '-'}</span>
                </div>
                <div class="user-detail">
                    <span class="user-detail__label">登录次数</span>
                    <span class="user-detail__value">${user.loginCount || 0}</span>
                </div>
            </div>
            
            <div class="user-card__actions">
                <button class="user-action-btn user-action-btn--primary" onclick="userManagement.viewUserDetails('${user.id}')">
                    <span>👁️</span>
                    详情
                </button>
                <button class="user-action-btn user-action-btn--outline" onclick="userManagement.editUser('${user.id}')">
                    <span>✏️</span>
                    编辑
                </button>
                <button class="user-action-btn user-action-btn--danger" onclick="userManagement.deleteUser('${user.id}')">
                    <span>🗑️</span>
                    删除
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 渲染角色列表
     */
    renderRoles() {
        const grid = document.getElementById('rolesGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        this.roles.forEach(role => {
            const roleCard = this.createRoleCard(role);
            grid.appendChild(roleCard);
        });
    }
    
    /**
     * 创建角色卡片
     */
    createRoleCard(role) {
        const card = document.createElement('div');
        card.className = 'role-card';
        card.dataset.roleId = role.id;
        
        const permissionTags = role.permissions.map(permId => {
            const perm = this.permissions.find(p => p.id === permId);
            return perm ? `<span class="permission-tag">${perm.name}</span>` : '';
        }).join('');
        
        card.innerHTML = `
            <div class="role-card__header">
                <h4 class="role-card__name">${this.escapeHtml(role.name)}</h4>
            </div>
            
            <p class="role-card__description">${this.escapeHtml(role.description)}</p>
            
            <div class="role-card__permissions">
                ${permissionTags}
            </div>
            
            <div class="role-card__stats">
                <span>用户数: ${role.userCount}</span>
                <span>更新: ${role.updatedAt}</span>
            </div>
            
            <div class="user-card__actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--user-border-light);">
                <button class="user-action-btn user-action-btn--outline" onclick="userManagement.editRole('${role.id}')">
                    <span>✏️</span>
                    编辑
                </button>
                <button class="user-action-btn user-action-btn--danger" onclick="userManagement.deleteRole('${role.id}')">
                    <span>🗑️</span>
                    删除
                </button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * 获取筛选后的用户列表
     */
    getFilteredUsers() {
        return this.users.filter(user => {
            const matchesRole = !this.filters.role || user.role === this.filters.role;
            const matchesStatus = !this.filters.status || user.status === this.filters.status;
            const matchesSearch = !this.filters.search || 
                user.username.toLowerCase().includes(this.filters.search.toLowerCase()) ||
                user.realName.toLowerCase().includes(this.filters.search.toLowerCase()) ||
                user.email.toLowerCase().includes(this.filters.search.toLowerCase());
            
            return matchesRole && matchesStatus && matchesSearch;
        });
    }
    
    /**
     * 处理搜索
     */
    handleSearch(value) {
        this.filters.search = value;
        this.renderUsers();
    }
    
    /**
     * 处理角色筛选
     */
    handleRoleFilter(value) {
        this.filters.role = value;
        this.renderUsers();
    }
    
    /**
     * 处理状态筛选
     */
    handleStatusFilter(value) {
        this.filters.status = value;
        this.renderUsers();
    }
    
    /**
     * 重置筛选条件
     */
    resetFilters() {
        this.filters = { role: '', status: '', search: '' };
        document.getElementById('roleFilter').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('userSearch').value = '';
        this.renderUsers();
    }
    
    /**
     * 打开用户模态框
     */
    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        const passwordSection = document.getElementById('passwordSection');
        const saveText = document.getElementById('saveUserText');

        this.currentUser = userId ? this.users.find(u => u.id === userId) : null;

        if (this.currentUser) {
            title.textContent = '编辑用户';
            saveText.textContent = '更新用户';
            passwordSection.style.display = 'none';
            this.fillUserForm(this.currentUser);
        } else {
            title.textContent = '添加用户';
            saveText.textContent = '保存用户';
            passwordSection.style.display = 'block';
            form.reset();
        }

        // 绑定标签页事件
        this.bindUserModalTabEvents();

        // 初始化标签页（默认显示基本信息）
        this.switchUserModalTab('basic');

        // 初始化完整权限选择器组件
        this.initFullPermissionSelector();

        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 关闭用户模态框
     */
    closeUserModal() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.removeAttribute('aria-modal');
        document.body.style.overflow = '';
        this.currentUser = null;

        // 清理权限配置组件
        if (this.fullPermissionSelector) {
            this.fullPermissionSelector.destroy();
            this.fullPermissionSelector = null;
        }
    }
    
    /**
     * 填充用户表单
     */
    fillUserForm(user) {
        console.log('📝 填充用户表单:', user);

        // 填充基本信息
        const username = document.getElementById('username');
        const realName = document.getElementById('realName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const department = document.getElementById('department');
        const userStatus = document.getElementById('userStatus');

        if (username) username.value = user.username || '';
        if (realName) realName.value = user.realName || '';
        if (email) email.value = user.email || '';
        if (phone) phone.value = user.phone || '';
        if (department) department.value = user.department || '';
        if (userStatus) userStatus.value = user.status || 'ACTIVE';

        console.log('✅ 基本信息填充完成');

        // 不再设置userRole，因为现在使用完整权限选择器
        // 权限将通过权限选择器组件设置，在initFullPermissionSelector中处理

        // 兼容性：如果还存在旧的权限复选框，设置它们
        const checkboxes = document.querySelectorAll('input[name="permissions"]');
        if (checkboxes.length > 0) {
            checkboxes.forEach(cb => {
                cb.checked = user.permissions && user.permissions.includes(cb.value);
            });
            console.log('✅ 传统权限复选框设置完成');
        }

        console.log('📝 用户表单填充完成');
    }
    
    /**
     * 处理用户保存
     */
    handleUserSave(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);

        // 获取权限配置组件的数据
        let permissions = [];
        if (this.fullPermissionSelector) {
            permissions = this.fullPermissionSelector.getSelectedPermissions();
        } else {
            // 如果没有权限组件，尝试从原有的复选框获取
            permissions = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
                .map(cb => cb.value);
        }

        userData.permissions = permissions;

        // 验证数据
        if (!this.validateUserData(userData)) {
            return;
        }

        if (this.currentUser) {
            // 更新用户
            this.updateUser(this.currentUser.id, userData);
        } else {
            // 创建新用户
            this.createUser(userData);
        }

        this.closeUserModal();
        this.renderUsers();
        this.updateStats();

        this.showToast('用户保存成功', 'success');
    }
    
    /**
     * 验证用户数据
     */
    validateUserData(userData) {
        const required = ['username', 'realName', 'email', 'role'];
        
        for (const field of required) {
            if (!userData[field]) {
                this.showToast(`${field} 为必填项`, 'error');
                return false;
            }
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            this.showToast('邮箱格式不正确', 'error');
            return false;
        }
        
        // 检查用户名唯一性
        if (!this.currentUser || this.currentUser.username !== userData.username) {
            if (this.users.some(u => u.username === userData.username)) {
                this.showToast('用户名已存在', 'error');
                return false;
            }
        }
        
        // 检查邮箱唯一性
        if (!this.currentUser || this.currentUser.email !== userData.email) {
            if (this.users.some(u => u.email === userData.email)) {
                this.showToast('邮箱已存在', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 创建用户
     */
    createUser(userData) {
        const newUser = {
            id: 'U' + String(this.users.length + 1).padStart(3, '0'),
            username: userData.username,
            realName: userData.realName,
            email: userData.email,
            phone: userData.phone || '',
            department: userData.department || '',
            role: userData.role,
            status: userData.status || 'ACTIVE',
            permissions: userData.permissions || [],
            lastLogin: null,
            loginCount: 0,
            createdAt: new Date().toLocaleString(),
            isOnline: false
        };
        
        this.users.push(newUser);
    }
    
    /**
     * 更新用户
     */
    updateUser(userId, userData) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = {
                ...this.users[userIndex],
                username: userData.username,
                realName: userData.realName,
                email: userData.email,
                phone: userData.phone || '',
                department: userData.department || '',
                role: userData.role,
                status: userData.status,
                permissions: userData.permissions || []
            };
        }
    }
    
    /**
     * 编辑用户
     */
    editUser(userId) {
        console.log('🔧 editUser 方法被调用, userId:', userId);
        console.log('📍 调用来源:', new Error().stack);
        this.openUserModal(userId);
    }
    
    /**
     * 删除用户
     */
    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        if (confirm(`确定要删除用户 "${user.realName}" 吗？此操作不可撤销。`)) {
            this.users = this.users.filter(u => u.id !== userId);
            this.renderUsers();
            this.updateStats();
            this.showToast('用户删除成功', 'success');
        }
    }
    
    /**
     * 查看用户详情
     */
    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('userDetailsContent');
        
        const role = this.roles.find(r => r.id === user.role);
        const departmentText = {
            'TECH': '技术部',
            'FINANCE': '财务部',
            'OPERATION': '运营部',
            'BUSINESS': '商务部',
            'ADMIN': '行政部'
        }[user.department] || user.department || '-';
        
        const statusText = {
            'ACTIVE': '正常',
            'SUSPENDED': '暂停',
            'DISABLED': '禁用'
        }[user.status] || '未知';
        
        content.innerHTML = `
            <div class="detail-section">
                <h4 class="detail-section-title">基本信息</h4>
                <div class="detail-item">
                    <span class="detail-label">用户ID</span>
                    <span class="detail-value">${user.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">用户名</span>
                    <span class="detail-value">${user.username}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">真实姓名</span>
                    <span class="detail-value">${user.realName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">邮箱地址</span>
                    <span class="detail-value">${user.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">手机号码</span>
                    <span class="detail-value">${user.phone || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">所属部门</span>
                    <span class="detail-value">${departmentText}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4 class="detail-section-title">权限信息</h4>
                <div class="detail-item">
                    <span class="detail-label">用户角色</span>
                    <span class="detail-value">${role ? role.name : user.role}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">账户状态</span>
                    <span class="detail-value">${statusText}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">特殊权限</span>
                    <span class="detail-value">${user.permissions.length > 0 ? user.permissions.join(', ') : '无'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">在线状态</span>
                    <span class="detail-value">${user.isOnline ? '在线' : '离线'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">最后登录</span>
                    <span class="detail-value">${user.lastLogin || '从未登录'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">登录次数</span>
                    <span class="detail-value">${user.loginCount}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">创建时间</span>
                    <span class="detail-value">${user.createdAt}</span>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 关闭用户详情模态框
     */
    closeUserDetailsModal() {
        const modal = document.getElementById('userDetailsModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.removeAttribute('aria-modal');
        document.body.style.overflow = '';
    }
    
    /**
     * 打开角色模态框
     */
    openRoleModal(roleId = null) {
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('roleModalTitle');
        const form = document.getElementById('roleForm');
        
        this.currentRole = roleId ? this.roles.find(r => r.id === roleId) : null;
        
        if (this.currentRole) {
            title.textContent = '编辑角色';
            this.fillRoleForm(this.currentRole);
        } else {
            title.textContent = '添加角色';
            form.reset();
        }
        
        this.renderPermissionsTree();
        
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * 关闭角色模态框
     */
    closeRoleModal() {
        const modal = document.getElementById('roleModal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.removeAttribute('aria-modal');
        document.body.style.overflow = '';
        this.currentRole = null;
    }
    
    /**
     * 渲染权限树
     */
    renderPermissionsTree() {
        const tree = document.getElementById('permissionsTree');
        if (!tree) return;
        
        tree.innerHTML = '';
        
        this.permissions.forEach(parent => {
            const parentNode = document.createElement('div');
            parentNode.className = 'permission-node permission-node--parent';
            
            const parentCheckbox = `
                <label class="checkbox-label">
                    <input type="checkbox" value="${parent.id}" data-parent="true" onchange="userManagement.handlePermissionChange(this)">
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">${parent.name}</span>
                </label>
            `;
            parentNode.innerHTML = parentCheckbox;
            tree.appendChild(parentNode);
            
            if (parent.children) {
                parent.children.forEach(child => {
                    const childNode = document.createElement('div');
                    childNode.className = 'permission-node permission-node--child';
                    
                    const childCheckbox = `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${child.id}" data-parent="${parent.id}">
                            <span class="checkbox-custom"></span>
                            <span class="checkbox-text">${child.name}</span>
                        </label>
                    `;
                    childNode.innerHTML = childCheckbox;
                    tree.appendChild(childNode);
                });
            }
        });
        
        // 如果是编辑模式，设置选中状态
        if (this.currentRole) {
            this.currentRole.permissions.forEach(permId => {
                const checkbox = tree.querySelector(`input[value="${permId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    }
    
    /**
     * 处理权限变更
     */
    handlePermissionChange(checkbox) {
        if (checkbox.dataset.parent === 'true') {
            // 父级权限，控制子级
            const parentId = checkbox.value;
            const childCheckboxes = document.querySelectorAll(`input[data-parent="${parentId}"]`);
            childCheckboxes.forEach(child => {
                child.checked = checkbox.checked;
            });
        } else {
            // 子级权限，检查是否需要选中父级
            const parentId = checkbox.dataset.parent;
            const parentCheckbox = document.querySelector(`input[value="${parentId}"]`);
            const siblingCheckboxes = document.querySelectorAll(`input[data-parent="${parentId}"]`);
            
            if (checkbox.checked) {
                // 如果子级被选中，自动选中父级
                if (parentCheckbox) {
                    parentCheckbox.checked = true;
                }
            } else {
                // 如果子级被取消，检查是否还有其他子级被选中
                const hasCheckedSibling = Array.from(siblingCheckboxes).some(cb => cb.checked);
                if (!hasCheckedSibling && parentCheckbox) {
                    parentCheckbox.checked = false;
                }
            }
        }
    }
    
    /**
     * 填充角色表单
     */
    fillRoleForm(role) {
        document.getElementById('roleName').value = role.name;
        document.getElementById('roleDescription').value = role.description;
    }
    
    /**
     * 处理角色保存
     */
    handleRoleSave(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const roleData = Object.fromEntries(formData);
        
        // 获取选中的权限
        const permissions = Array.from(document.querySelectorAll('#permissionsTree input:checked'))
            .map(cb => cb.value);
        
        roleData.permissions = permissions;
        
        // 验证数据
        if (!roleData.roleName) {
            this.showToast('角色名称为必填项', 'error');
            return;
        }
        
        if (this.currentRole) {
            // 更新角色
            this.updateRole(this.currentRole.id, roleData);
        } else {
            // 创建新角色
            this.createRole(roleData);
        }
        
        this.closeRoleModal();
        this.renderRoles();
        
        this.showToast('角色保存成功', 'success');
    }
    
    /**
     * 创建角色
     */
    createRole(roleData) {
        const newRole = {
            id: 'ROLE_' + Date.now(),
            name: roleData.roleName,
            description: roleData.roleDescription || '',
            permissions: roleData.permissions || [],
            userCount: 0,
            createdAt: new Date().toLocaleDateString(),
            updatedAt: new Date().toLocaleDateString()
        };
        
        this.roles.push(newRole);
    }
    
    /**
     * 更新角色
     */
    updateRole(roleId, roleData) {
        const roleIndex = this.roles.findIndex(r => r.id === roleId);
        if (roleIndex !== -1) {
            this.roles[roleIndex] = {
                ...this.roles[roleIndex],
                name: roleData.roleName,
                description: roleData.roleDescription || '',
                permissions: roleData.permissions || [],
                updatedAt: new Date().toLocaleDateString()
            };
        }
    }
    
    /**
     * 编辑角色
     */
    editRole(roleId) {
        this.openRoleModal(roleId);
    }
    
    /**
     * 删除角色
     */
    deleteRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;
        
        // 检查是否有用户使用此角色
        const usersWithRole = this.users.filter(u => u.role === roleId);
        if (usersWithRole.length > 0) {
            this.showToast(`无法删除角色，还有 ${usersWithRole.length} 个用户在使用此角色`, 'error');
            return;
        }
        
        if (confirm(`确定要删除角色 "${role.name}" 吗？此操作不可撤销。`)) {
            this.roles = this.roles.filter(r => r.id !== roleId);
            this.renderRoles();
            this.showToast('角色删除成功', 'success');
        }
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        const totalUsers = this.users.length;
        const onlineUsers = this.users.filter(u => u.isOnline).length;
        const activeUsers = this.users.filter(u => u.status === 'ACTIVE').length;
        
        document.getElementById('totalUsersCount').textContent = totalUsers;
        document.getElementById('onlineUsersCount').textContent = onlineUsers;
        document.getElementById('activeUsersCount').textContent = activeUsers;
    }
    
    /**
     * 更新分页信息
     */
    updatePagination(totalFiltered) {
        this.pagination.total = totalFiltered;
        const start = (this.pagination.currentPage - 1) * this.pagination.pageSize + 1;
        const end = Math.min(start + this.pagination.pageSize - 1, totalFiltered);
        
        document.getElementById('pageStart').textContent = totalFiltered > 0 ? start : 0;
        document.getElementById('pageEnd').textContent = end;
        document.getElementById('totalUsers').textContent = totalFiltered;
    }
    
    /**
     * 创建用户表格行
     */
    createUserTableRow(user) {
        const tr = document.createElement('tr');
        tr.dataset.userId = user.id;
        
        const role = this.roles.find(r => r.id === user.role);
        const statusClass = {
            'ACTIVE': 'active',
            'SUSPENDED': 'suspended',
            'DISABLED': 'disabled'
        }[user.status] || 'disabled';
        
        const roleClass = {
            'ADMIN': 'admin',
            'MANAGER': 'manager',
            'OPERATOR': 'operator',
            'AUDITOR': 'auditor',
            'VIEWER': 'viewer'
        }[user.role] || 'viewer';
        
        // 获取用户权限标签
        const userPermissions = this.getUserPermissions(user);
        const permissionTags = userPermissions.slice(0, 3).map(perm => 
            `<span class="permission-tag ${this.getPermissionPriority(perm.id)}">${perm.name}</span>`
        ).join('');
        
        const morePermissions = userPermissions.length > 3 ? 
            `<span class="permission-tag">+${userPermissions.length - 3}</span>` : '';
        
        tr.innerHTML = `
            <td class="col-checkbox">
                <input type="checkbox" class="table-checkbox" value="${user.id}">
            </td>
            <td class="col-user">
                <div class="table-user-info">
                    <div class="table-user-avatar">${user.realName.charAt(0)}</div>
                    <div class="table-user-details">
                        <div class="table-user-name">${this.escapeHtml(user.realName)}</div>
                        <div class="table-user-email">${this.escapeHtml(user.email)}</div>
                        <div class="table-user-username">@${this.escapeHtml(user.username)}</div>
                    </div>
                </div>
            </td>
            <td class="col-role">
                <span class="table-role-badge table-role-badge--${roleClass}">
                    ${role ? role.name : user.role}
                </span>
            </td>
            <td class="col-status">
                <span class="table-status-badge table-status-badge--${statusClass}">
                    ${this.getStatusText(user.status)}
                </span>
            </td>
            <td class="col-last-login">
                <div class="table-last-login">
                    <div class="last-login-date">${this.formatDate(user.lastLogin)}</div>
                    <div class="last-login-relative">${this.getRelativeTime(user.lastLogin)}</div>
                </div>
            </td>
            <td class="col-permissions">
                <div class="table-permissions">
                    ${permissionTags}${morePermissions}
                </div>
            </td>
            <td class="col-actions">
                <div class="table-actions">
                    <button class="table-action-btn table-action-btn--primary" 
                            onclick="userManagement.viewUserDetails('${user.id}')" 
                            title="查看详情">
                        👁️
                    </button>
                    <button class="table-action-btn table-action-btn--primary" 
                            onclick="userManagement.editUser('${user.id}')" 
                            title="编辑用户">
                        ✏️
                    </button>
                    <button class="table-action-btn table-action-btn--warning" 
                            onclick="userManagement.toggleUserStatus('${user.id}')" 
                            title="${user.status === 'ACTIVE' ? '暂停用户' : '激活用户'}">
                        ${user.status === 'ACTIVE' ? '⏸️' : '▶️'}
                    </button>
                    <button class="table-action-btn table-action-btn--danger" 
                            onclick="userManagement.deleteUser('${user.id}')" 
                            title="删除用户">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        return tr;
    }
    
    /**
     * 绑定表格排序事件
     */
    bindTableSortEvents() {
        const sortableHeaders = document.querySelectorAll('.users-table th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.dataset.sort;
                this.handleTableSort(sortField);
            });
        });
    }
    
    /**
     * 处理表格排序
     */
    handleTableSort(field) {
        // 简单的排序实现
        const currentOrder = this.sortOrder || 'asc';
        const newOrder = (this.sortField === field && currentOrder === 'asc') ? 'desc' : 'asc';
        
        this.sortField = field;
        this.sortOrder = newOrder;
        
        // 更新排序指示器
        document.querySelectorAll('.users-table th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentHeader = document.querySelector(`.users-table th[data-sort="${field}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${newOrder}`);
        }
        
        // 重新渲染表格
        this.renderUsersTable();
    }
    
    /**
     * 获取用户权限
     */
    getUserPermissions(user) {
        const role = this.roles.find(r => r.id === user.role);
        if (!role || !role.permissions) return [];
        
        const permissions = [];
        role.permissions.forEach(permId => {
            this.permissions.forEach(category => {
                if (category.id === permId) {
                    permissions.push({ id: permId, name: category.name });
                } else if (category.children) {
                    const child = category.children.find(c => c.id === permId);
                    if (child) {
                        permissions.push({ id: child.id, name: child.name });
                    }
                }
            });
        });
        
        return permissions;
    }
    
    /**
     * 获取权限优先级样式
     */
    getPermissionPriority(permId) {
        if (permId.includes('DELETE') || permId.includes('ADMIN')) {
            return 'permission-tag--high';
        } else if (permId.includes('CREATE') || permId.includes('EDIT')) {
            return 'permission-tag--medium';
        }
        return '';
    }
    
    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '从未登录';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * 获取相对时间
     */
    getRelativeTime(dateString) {
        if (!dateString) return '从未';
        
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffDays > 7) {
            return `${diffDays}天前`;
        } else if (diffDays > 0) {
            return `${diffDays}天前`;
        } else if (diffHours > 0) {
            return `${diffHours}小时前`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes}分钟前`;
        } else {
            return '刚刚';
        }
    }
    
    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'ACTIVE': '正常',
            'SUSPENDED': '暂停',
            'DISABLED': '禁用'
        };
        return statusMap[status] || status;
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
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 绑定用户模态框标签页事件
     */
    bindUserModalTabEvents() {
        const tabs = document.querySelectorAll('#userModal .tab-nav__item');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchUserModalTab(tabName);
            });
        });
    }

    /**
     * 切换用户模态框标签页
     */
    switchUserModalTab(tabName) {
        // 更新标签页按钮状态
        const tabs = document.querySelectorAll('#userModal .tab-nav__item');
        tabs.forEach(tab => {
            tab.classList.remove('tab-nav__item--active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('tab-nav__item--active');
            }
        });

        // 显示对应的内容区域
        const tabContents = document.querySelectorAll('#userModal .tab-panel');
        tabContents.forEach(content => {
            content.classList.remove('tab-panel--active');
            if (content.dataset.tab === tabName) {
                content.classList.add('tab-panel--active');
            }
        });

        // 如果切换到权限配置标签页，确保权限组件已初始化
        if (tabName === 'permissions' && !this.fullPermissionSelector) {
            this.initFullPermissionSelector();
        }
    }

    /**
     * 初始化完整权限选择器组件
     */
    initFullPermissionSelector() {
        console.log('🔧 初始化完整权限选择器...');

        const container = document.getElementById('fullPermissionSelector');
        if (!container) {
            console.error('❌ 权限选择器容器不存在');
            return;
        }

        if (!window.FullPermissionSelector) {
            console.error('❌ FullPermissionSelector 组件未加载');
            return;
        }

        if (!window.permissionsData) {
            console.error('❌ 权限数据未加载');
            return;
        }

        console.log('✅ 所有依赖已准备就绪');

        // 如果组件已存在，先销毁
        if (this.fullPermissionSelector) {
            console.log('🗑️ 销毁现有权限选择器');
            this.fullPermissionSelector.destroy();
        }

        // 获取当前用户的权限数据
        const currentPermissions = this.currentUser ? (this.currentUser.permissions || []) : [];
        const currentRole = this.currentUser ? this.currentUser.role : null;

        console.log('👤 当前用户:', this.currentUser ? this.currentUser.username : '新用户');
        console.log('🔑 当前权限:', currentPermissions);
        console.log('👥 当前角色:', currentRole);

        try {
            // 创建新的完整权限选择器组件
            this.fullPermissionSelector = new window.FullPermissionSelector({
                container: container,
                mode: 'user',
                selectedPermissions: currentPermissions,
                selectedRole: currentRole,
                showRoleSelector: true,
                showSearch: true,
                showCategoryFilter: true,
                showLevelFilter: true,
                onPermissionChange: (permissions) => this.handlePermissionChange(permissions),
                onRoleChange: (role) => this.handleRoleChange(role)
            });

            console.log('✅ 完整权限选择器初始化成功');
        } catch (error) {
            console.error('❌ 权限选择器初始化失败:', error);
        }
    }

    /**
     * 处理权限变更
     */
    handlePermissionChange(permissions) {
        console.log('权限已更新:', permissions);
        // 权限变更时可以进行实时验证或其他处理
    }

    /**
     * 处理角色变更
     */
    handleRoleChange(role) {
        console.log('角色已选择:', role);

        // 如果选择了角色，更新用户角色字段
        if (role) {
            const roleSelect = document.getElementById('userRole');
            if (roleSelect) {
                // 如果角色选择框中没有该角色，添加它
                const existingOption = roleSelect.querySelector(`option[value="${role.id}"]`);
                if (!existingOption) {
                    const option = document.createElement('option');
                    option.value = role.id;
                    option.textContent = role.name;
                    roleSelect.appendChild(option);
                }
                roleSelect.value = role.id;
            }
        }
    }
}

// 全局变量
let userManagement;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOMContentLoaded 事件触发');
    console.log('📍 当前页面:', window.location.href);
    console.log('🔍 检查依赖:');
    console.log('  - window.permissionsData:', typeof window.permissionsData);
    console.log('  - window.FullPermissionSelector:', typeof window.FullPermissionSelector);

    try {
        userManagement = new UserManagementSystem();
        console.log('✅ 用户权限管理系统已加载并初始化完成');
        console.log('🎯 userManagement 实例已创建:', userManagement);
        console.log('🔧 editUser 方法可用:', typeof userManagement.editUser);

        // 全局可用性测试
        window.userManagement = userManagement;
        console.log('🌐 userManagement 已设置为全局变量');
    } catch (error) {
        console.error('❌ 用户管理系统初始化失败:', error);
        console.error('📍 错误堆栈:', error.stack);
    }
});