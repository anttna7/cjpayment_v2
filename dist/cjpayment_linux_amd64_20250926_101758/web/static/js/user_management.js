/**
 * User Management Module
 * Handles user CRUD operations, role management, and permissions
 */

window.UserManagement = (function() {
    'use strict';

    class UserManagement {
        constructor() {
            this.users = [];
            this.roles = [];
            this.permissions = [];
            this.currentPage = 1;
            this.pageSize = 20;
            this.totalPages = 1;
            this.filters = {
                search: '',
                status: '',
                role: ''
            };
            this.selectedUsers = new Set();
            this.isLoading = false;
        }

        // ==========================================================================
        // Initialization
        // ==========================================================================

        init() {
            this.bindEvents();
            this.loadUsers();
            this.loadRoles();
            this.loadPermissions();
        }

        bindEvents() {
            // Search functionality
            const searchInput = CJUtils.$('#userSearch');
            if (searchInput) {
                let searchTimeout;
                CJUtils.on(searchInput, 'input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.filters.search = e.target.value.trim();
                        this.currentPage = 1;
                        this.loadUsers();
                    }, 300);
                });
            }

            // Filter controls
            const statusFilter = CJUtils.$('#statusFilter');
            if (statusFilter) {
                CJUtils.on(statusFilter, 'change', (e) => {
                    this.filters.status = e.target.value;
                    this.currentPage = 1;
                    this.loadUsers();
                });
            }

            const roleFilter = CJUtils.$('#roleFilter');
            if (roleFilter) {
                CJUtils.on(roleFilter, 'change', (e) => {
                    this.filters.role = e.target.value;
                    this.currentPage = 1;
                    this.loadUsers();
                });
            }

            // Action buttons
            const addUserBtn = CJUtils.$('#addUserBtn');
            if (addUserBtn) {
                CJUtils.on(addUserBtn, 'click', () => {
                    this.showUserForm();
                });
            }

            const exportUsersBtn = CJUtils.$('#exportUsersBtn');
            if (exportUsersBtn) {
                CJUtils.on(exportUsersBtn, 'click', () => {
                    this.exportUsers();
                });
            }

            const refreshBtn = CJUtils.$('#refreshBtn');
            if (refreshBtn) {
                CJUtils.on(refreshBtn, 'click', () => {
                    this.loadUsers();
                });
            }

            // Select all checkbox
            const selectAll = CJUtils.$('#selectAll');
            if (selectAll) {
                CJUtils.on(selectAll, 'change', (e) => {
                    this.toggleSelectAll(e.target.checked);
                });
            }

            // User form modal events
            this.bindUserFormEvents();
            this.bindRoleManagementEvents();
        }

        bindUserFormEvents() {
            const userForm = CJUtils.$('#userForm');
            const userFormModal = CJUtils.$('#userFormModal');
            const userFormClose = CJUtils.$('#userFormClose');
            const userFormCancel = CJUtils.$('#userFormCancel');

            if (userForm) {
                CJUtils.on(userForm, 'submit', (e) => {
                    e.preventDefault();
                    this.handleUserFormSubmit();
                });
            }

            if (userFormClose) {
                CJUtils.on(userFormClose, 'click', () => {
                    this.hideUserForm();
                });
            }

            if (userFormCancel) {
                CJUtils.on(userFormCancel, 'click', () => {
                    this.hideUserForm();
                });
            }

            if (userFormModal) {
                CJUtils.on(userFormModal, 'click', (e) => {
                    if (e.target === userFormModal) {
                        this.hideUserForm();
                    }
                });
            }

            // Real-time validation
            const formInputs = userForm?.querySelectorAll('input, select');
            formInputs?.forEach(input => {
                CJUtils.on(input, 'blur', () => {
                    this.validateUserFormField(input);
                });

                CJUtils.on(input, 'input', () => {
                    this.clearFieldError(input.name);
                });
            });
        }

        bindRoleManagementEvents() {
            // Role management modal events will be implemented here
            // This is a placeholder for role management functionality
        }

        // ==========================================================================
        // User Data Management
        // ==========================================================================

        async loadUsers() {
            if (this.isLoading) return;

            this.setLoading(true);

            try {
                const params = {
                    page: this.currentPage,
                    limit: this.pageSize,
                    ...this.filters
                };

                const response = await CJApi.get('/api/users', { params });

                if (response.success) {
                    this.users = response.data.users || [];
                    this.totalPages = response.data.totalPages || 1;
                    this.renderUserTable();
                    this.renderPagination();
                } else {
                    CJComponents.toast.error('加载用户列表失败');
                }
            } catch (error) {
                console.error('Load users error:', error);
                CJComponents.toast.error('加载用户列表失败');
            } finally {
                this.setLoading(false);
            }
        }

        async loadRoles() {
            try {
                const response = await CJApi.get('/api/roles');
                if (response.success) {
                    this.roles = response.data.roles || [];
                    this.updateRoleFilter();
                    this.renderRoleList();
                }
            } catch (error) {
                console.error('Load roles error:', error);
            }
        }

        async loadPermissions() {
            try {
                const response = await CJApi.get('/api/permissions');
                if (response.success) {
                    this.permissions = response.data.permissions || [];
                }
            } catch (error) {
                console.error('Load permissions error:', error);
            }
        }

        // ==========================================================================
        // User Table Rendering
        // ==========================================================================

        renderUserTable() {
            const tbody = CJUtils.$('#userTableBody');
            if (!tbody) return;

            if (this.users.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center">
                            <div class="empty-state">
                                <p>暂无用户数据</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = this.users.map(user => this.renderUserRow(user)).join('');

            // Bind row events
            this.bindUserRowEvents();
        }

        renderUserRow(user) {
            const roles = user.roles?.map(role => 
                `<span class="role-tag">${role.name}</span>`
            ).join('') || '';

            const statusClass = user.status === 'active' ? 'active' : 
                               user.status === 'inactive' ? 'inactive' : 'pending';

            return `
                <tr data-user-id="${user.id}">
                    <td>
                        <input type="checkbox" class="checkbox-input user-checkbox" 
                               value="${user.id}" ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="user-info">
                            <div class="user-avatar">${user.fullName?.charAt(0) || user.username?.charAt(0) || '?'}</div>
                            <div class="user-details">
                                <div class="user-name">${user.fullName || user.username}</div>
                                <div class="user-username">@${user.username}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td>
                        <div class="user-roles">${roles}</div>
                    </td>
                    <td>
                        <span class="user-status ${statusClass}">
                            ${this.getStatusText(user.status)}
                        </span>
                    </td>
                    <td>${user.lastLoginAt ? CJUtils.formatDate(user.lastLoginAt) : '从未登录'}</td>
                    <td>${CJUtils.formatDate(user.createdAt)}</td>
                    <td>
                        <div class="user-actions-cell">
                            <button class="action-btn edit" data-action="edit" data-user-id="${user.id}">
                                编辑
                            </button>
                            <button class="action-btn reset" data-action="reset-password" data-user-id="${user.id}">
                                重置密码
                            </button>
                            <button class="action-btn delete" data-action="delete" data-user-id="${user.id}">
                                删除
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        bindUserRowEvents() {
            // User checkboxes
            const userCheckboxes = CJUtils.$('.user-checkbox');
            userCheckboxes.forEach(checkbox => {
                CJUtils.on(checkbox, 'change', (e) => {
                    const userId = e.target.value;
                    if (e.target.checked) {
                        this.selectedUsers.add(userId);
                    } else {
                        this.selectedUsers.delete(userId);
                    }
                    this.updateSelectAllState();
                });
            });

            // Action buttons
            const actionButtons = CJUtils.$('.action-btn');
            actionButtons.forEach(button => {
                CJUtils.on(button, 'click', (e) => {
                    const action = e.target.dataset.action;
                    const userId = e.target.dataset.userId;
                    this.handleUserAction(action, userId);
                });
            });
        }

        // ==========================================================================
        // User Actions
        // ==========================================================================

        async handleUserAction(action, userId) {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            switch (action) {
                case 'edit':
                    this.showUserForm(user);
                    break;
                case 'reset-password':
                    await this.resetUserPassword(user);
                    break;
                case 'delete':
                    await this.deleteUser(user);
                    break;
            }
        }

        async resetUserPassword(user) {
            const confirmed = await CJComponents.Modal.confirm(
                `确定要重置用户 "${user.fullName || user.username}" 的密码吗？`,
                '重置后将生成临时密码并发送到用户邮箱。'
            );

            if (!confirmed) return;

            try {
                const response = await CJApi.post(`/api/users/${user.id}/reset-password`);
                
                if (response.success) {
                    CJComponents.toast.success('密码重置成功，临时密码已发送到用户邮箱');
                } else {
                    CJComponents.toast.error(response.message || '密码重置失败');
                }
            } catch (error) {
                console.error('Reset password error:', error);
                CJComponents.toast.error('密码重置失败');
            }
        }

        async deleteUser(user) {
            const confirmed = await CJComponents.Modal.confirm(
                `确定要删除用户 "${user.fullName || user.username}" 吗？`,
                '此操作不可撤销，用户的所有数据将被永久删除。'
            );

            if (!confirmed) return;

            try {
                const response = await CJApi.delete(`/api/users/${user.id}`);
                
                if (response.success) {
                    CJComponents.toast.success('用户删除成功');
                    this.selectedUsers.delete(user.id);
                    this.loadUsers();
                } else {
                    CJComponents.toast.error(response.message || '用户删除失败');
                }
            } catch (error) {
                console.error('Delete user error:', error);
                CJComponents.toast.error('用户删除失败');
            }
        }

        // ==========================================================================
        // User Form Management
        // ==========================================================================

        showUserForm(user = null) {
            const modal = CJUtils.$('#userFormModal');
            const form = CJUtils.$('#userForm');
            const title = CJUtils.$('#userFormTitle');
            const passwordRow = CJUtils.$('#passwordRow');

            if (!modal || !form) return;

            // Reset form
            form.reset();
            this.clearAllFieldErrors();

            if (user) {
                // Edit mode
                title.textContent = '编辑用户';
                this.populateUserForm(user);
                
                // Hide password fields in edit mode
                if (passwordRow) {
                    passwordRow.style.display = 'none';
                    CJUtils.$('#password').required = false;
                    CJUtils.$('#confirmPassword').required = false;
                }
            } else {
                // Add mode
                title.textContent = '添加用户';
                
                // Show password fields in add mode
                if (passwordRow) {
                    passwordRow.style.display = 'grid';
                    CJUtils.$('#password').required = true;
                    CJUtils.$('#confirmPassword').required = true;
                }
            }

            // Show modal
            modal.style.display = 'block';
            document.body.classList.add('modal-open');

            // Focus first input
            setTimeout(() => {
                const firstInput = form.querySelector('input:not([type="hidden"])');
                if (firstInput) firstInput.focus();
            }, 100);
        }

        hideUserForm() {
            const modal = CJUtils.$('#userFormModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        }

        populateUserForm(user) {
            CJUtils.$('#userId').value = user.id || '';
            CJUtils.$('#username').value = user.username || '';
            CJUtils.$('#email').value = user.email || '';
            CJUtils.$('#fullName').value = user.fullName || '';
            CJUtils.$('#phone').value = user.phone || '';
            CJUtils.$('#status').value = user.status || 'active';

            // Populate roles
            this.populateUserRoles(user.roles || []);
        }

        populateUserRoles(userRoles) {
            const roleList = CJUtils.$('#roleList');
            if (!roleList) return;

            const userRoleIds = userRoles.map(role => role.id);

            roleList.innerHTML = this.roles.map(role => `
                <div class="role-item">
                    <input type="checkbox" id="role_${role.id}" name="roles" value="${role.id}"
                           ${userRoleIds.includes(role.id) ? 'checked' : ''}>
                    <label for="role_${role.id}">
                        <div class="role-name">${role.name}</div>
                        <div class="role-description">${role.description || ''}</div>
                    </label>
                </div>
            `).join('');
        }

        async handleUserFormSubmit() {
            const form = CJUtils.$('#userForm');
            if (!form) return;

            const formData = new FormData(form);
            const userData = {
                id: formData.get('id'),
                username: formData.get('username'),
                email: formData.get('email'),
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                status: formData.get('status'),
                roles: formData.getAll('roles')
            };

            // Add password fields if in add mode
            if (!userData.id) {
                userData.password = formData.get('password');
                userData.confirmPassword = formData.get('confirmPassword');
            }

            // Validate form
            if (!this.validateUserForm(userData)) {
                return;
            }

            this.setFormLoading(true);

            try {
                let response;
                if (userData.id) {
                    // Update existing user
                    response = await CJApi.put(`/api/users/${userData.id}`, userData);
                } else {
                    // Create new user
                    response = await CJApi.post('/api/users', userData);
                }

                if (response.success) {
                    CJComponents.toast.success(userData.id ? '用户更新成功' : '用户创建成功');
                    this.hideUserForm();
                    this.loadUsers();
                } else {
                    CJComponents.toast.error(response.message || '操作失败');
                }
            } catch (error) {
                console.error('User form submit error:', error);
                CJComponents.toast.error('操作失败，请稍后重试');
            } finally {
                this.setFormLoading(false);
            }
        }

        // ==========================================================================
        // Form Validation
        // ==========================================================================

        validateUserForm(userData) {
            let isValid = true;

            // Validate username
            if (!userData.username || userData.username.length < 3) {
                this.showFieldError('username', '用户名至少需要3个字符');
                isValid = false;
            }

            // Validate email
            if (!userData.email || !this.isValidEmail(userData.email)) {
                this.showFieldError('email', '请输入有效的邮箱地址');
                isValid = false;
            }

            // Validate full name
            if (!userData.fullName || userData.fullName.trim().length < 2) {
                this.showFieldError('fullName', '请输入真实姓名');
                isValid = false;
            }

            // Validate password (only for new users)
            if (!userData.id) {
                if (!userData.password || userData.password.length < 6) {
                    this.showFieldError('password', '密码至少需要6个字符');
                    isValid = false;
                }

                if (userData.password !== userData.confirmPassword) {
                    this.showFieldError('confirmPassword', '两次输入的密码不一致');
                    isValid = false;
                }
            }

            // Validate phone (if provided)
            if (userData.phone && !this.isValidPhone(userData.phone)) {
                this.showFieldError('phone', '请输入有效的手机号码');
                isValid = false;
            }

            return isValid;
        }

        validateUserFormField(input) {
            const value = input.value.trim();
            const name = input.name;

            switch (name) {
                case 'username':
                    if (!value) {
                        this.showFieldError(name, '请输入用户名');
                        return false;
                    } else if (value.length < 3) {
                        this.showFieldError(name, '用户名至少需要3个字符');
                        return false;
                    }
                    break;

                case 'email':
                    if (!value) {
                        this.showFieldError(name, '请输入邮箱地址');
                        return false;
                    } else if (!this.isValidEmail(value)) {
                        this.showFieldError(name, '请输入有效的邮箱地址');
                        return false;
                    }
                    break;

                case 'fullName':
                    if (!value) {
                        this.showFieldError(name, '请输入真实姓名');
                        return false;
                    } else if (value.length < 2) {
                        this.showFieldError(name, '姓名至少需要2个字符');
                        return false;
                    }
                    break;

                case 'password':
                    if (!value) {
                        this.showFieldError(name, '请输入密码');
                        return false;
                    } else if (value.length < 6) {
                        this.showFieldError(name, '密码至少需要6个字符');
                        return false;
                    }
                    break;

                case 'confirmPassword':
                    const password = CJUtils.$('#password').value;
                    if (!value) {
                        this.showFieldError(name, '请确认密码');
                        return false;
                    } else if (value !== password) {
                        this.showFieldError(name, '两次输入的密码不一致');
                        return false;
                    }
                    break;

                case 'phone':
                    if (value && !this.isValidPhone(value)) {
                        this.showFieldError(name, '请输入有效的手机号码');
                        return false;
                    }
                    break;
            }

            this.clearFieldError(name);
            return true;
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        renderRoleList() {
            const roleList = CJUtils.$('#roleList');
            if (!roleList || this.roles.length === 0) return;

            roleList.innerHTML = this.roles.map(role => `
                <div class="role-item">
                    <input type="checkbox" id="role_${role.id}" name="roles" value="${role.id}">
                    <label for="role_${role.id}">
                        <div class="role-name">${role.name}</div>
                        <div class="role-description">${role.description || ''}</div>
                    </label>
                </div>
            `).join('');
        }

        updateRoleFilter() {
            const roleFilter = CJUtils.$('#roleFilter');
            if (!roleFilter) return;

            // Keep current selection
            const currentValue = roleFilter.value;
            
            // Clear existing options (except "All roles")
            const options = roleFilter.querySelectorAll('option:not(:first-child)');
            options.forEach(option => option.remove());

            // Add role options
            this.roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.code || role.name.toLowerCase();
                option.textContent = role.name;
                roleFilter.appendChild(option);
            });

            // Restore selection
            roleFilter.value = currentValue;
        }

        renderPagination() {
            const pagination = CJUtils.$('#userPagination');
            if (!pagination) return;

            if (this.totalPages <= 1) {
                pagination.innerHTML = '';
                return;
            }

            const pages = [];
            const maxVisible = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);

            if (endPage - startPage + 1 < maxVisible) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            // Previous button
            pages.push(`
                <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                        data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                    上一页
                </button>
            `);

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
                pages.push(`
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                        ${i}
                    </button>
                `);
            }

            // Next button
            pages.push(`
                <button class="pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                        data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    下一页
                </button>
            `);

            pagination.innerHTML = pages.join('');

            // Bind pagination events
            const paginationBtns = pagination.querySelectorAll('.pagination-btn:not(.disabled)');
            paginationBtns.forEach(btn => {
                CJUtils.on(btn, 'click', (e) => {
                    const page = parseInt(e.target.dataset.page);
                    if (page && page !== this.currentPage) {
                        this.currentPage = page;
                        this.loadUsers();
                    }
                });
            });
        }

        toggleSelectAll(checked) {
            const userCheckboxes = CJUtils.$('.user-checkbox');
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = checked;
                const userId = checkbox.value;
                if (checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
            });
        }

        updateSelectAllState() {
            const selectAll = CJUtils.$('#selectAll');
            const userCheckboxes = CJUtils.$('.user-checkbox');
            
            if (selectAll && userCheckboxes.length > 0) {
                const checkedCount = userCheckboxes.filter(cb => cb.checked).length;
                selectAll.checked = checkedCount === userCheckboxes.length;
                selectAll.indeterminate = checkedCount > 0 && checkedCount < userCheckboxes.length;
            }
        }

        async exportUsers() {
            try {
                const response = await CJApi.get('/api/users/export', {
                    params: this.filters,
                    responseType: 'blob'
                });

                // Create download link
                const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `users_${CJUtils.formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                CJComponents.toast.success('用户数据导出成功');
            } catch (error) {
                console.error('Export users error:', error);
                CJComponents.toast.error('导出失败');
            }
        }

        getStatusText(status) {
            const statusMap = {
                'active': '活跃',
                'inactive': '停用',
                'pending': '待激活'
            };
            return statusMap[status] || status;
        }

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        isValidPhone(phone) {
            const phoneRegex = /^1[3-9]\d{9}$/;
            return phoneRegex.test(phone);
        }

        showFieldError(fieldName, message) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = message;
            }
            
            if (inputElement) {
                inputElement.classList.add('error');
            }
        }

        clearFieldError(fieldName) {
            const errorElement = CJUtils.$(`#${fieldName}Error`);
            const inputElement = CJUtils.$(`#${fieldName}`);
            
            if (errorElement) {
                errorElement.textContent = '';
            }
            
            if (inputElement) {
                inputElement.classList.remove('error');
            }
        }

        clearAllFieldErrors() {
            const errorElements = CJUtils.$('.form-error');
            const inputElements = CJUtils.$('.form-input.error');
            
            errorElements.forEach(el => el.textContent = '');
            inputElements.forEach(el => el.classList.remove('error'));
        }

        setLoading(loading) {
            this.isLoading = loading;
            const tableContainer = CJUtils.$('#userTableContainer');
            
            if (tableContainer) {
                if (loading) {
                    tableContainer.classList.add('loading');
                } else {
                    tableContainer.classList.remove('loading');
                }
            }
        }

        setFormLoading(loading) {
            const submitBtn = CJUtils.$('#userFormSubmit');
            
            if (submitBtn) {
                if (loading) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                } else {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        }
    }

    return UserManagement;
})();