/**
 * Backup Management Enhanced
 * 增强版备份管理系统 - 完整的备份管理功能
 */

class BackupManagement {
    constructor(options = {}) {
        this.options = {
            apiEndpoint: '/api/backups',
            pageSize: 20,
            autoRefresh: 60000,
            enableRealTimeUpdates: true,
            ...options
        };
        
        this.state = {
            backups: [],
            selectedBackups: new Set(),
            currentView: 'list', // 'list' or 'grid'
            currentPage: 1,
            totalPages: 1,
            totalRecords: 0,
            filters: {
                search: '',
                type: ''
            },
            isLoading: false,
            config: {
                autoBackupEnabled: true,
                backupFrequency: 'weekly',
                backupTime: '02:00',
                retentionDays: 30,
                backupTypes: ['database', 'files', 'config']
            }
        };
        
        this.elements = {};
        this.autoRefreshTimer = null;
        
        this.init();
    }
    
    /**
     * 初始化备份管理系统
     */
    init() {
        console.log('Initializing Backup Management...');
        this.initializeElements();
        this.bindEvents();
        this.loadBackups();
        this.loadConfiguration();
        this.updateStatistics();
        this.setupAutoRefresh();
        console.log('Backup Management initialized successfully');
    }
    
    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.elements = {
            // 统计卡片
            totalBackupsCount: document.getElementById('totalBackupsCount'),
            totalBackupSize: document.getElementById('totalBackupSize'),
            lastBackupTime: document.getElementById('lastBackupTime'),
            backupSuccess: document.getElementById('backupSuccess'),
            
            // 配置元素
            autoBackupEnabled: document.getElementById('autoBackupEnabled'),
            backupFrequency: document.getElementById('backupFrequency'),
            backupTime: document.getElementById('backupTime'),
            retentionDays: document.getElementById('retentionDays'),
            
            // 备份类型复选框
            backupTypeCheckboxes: document.querySelectorAll('.backup-type-checkbox'),
            
            // 操作按钮
            refreshBackupList: document.getElementById('refreshBackupList'),
            createBackupBtn: document.getElementById('createBackupBtn'),
            saveConfigBtn: document.getElementById('saveConfigBtn'),
            resetConfigBtn: document.getElementById('resetConfigBtn'),
            
            // 筛选和搜索
            backupSearch: document.getElementById('backupSearch'),
            backupTypeFilter: document.getElementById('backupTypeFilter'),
            
            // 视图切换
            viewToggleBtns: document.querySelectorAll('.view-toggle-btn'),
            
            // 列表和网格视图
            backupListView: document.getElementById('backupListView'),
            backupGridView: document.getElementById('backupGridView'),
            backupTableBody: document.getElementById('backupTableBody'),
            backupGrid: document.getElementById('backupGrid'),
            
            // 批量操作
            selectAllBackups: document.getElementById('selectAllBackups'),
            deleteSelectedBackups: document.getElementById('deleteSelectedBackups'),
            selectAllCheckbox: document.getElementById('selectAllCheckbox'),
            
            // 分页
            pageStart: document.getElementById('pageStart'),
            pageEnd: document.getElementById('pageEnd'),
            totalBackups: document.getElementById('totalBackups'),
            paginationNumbers: document.getElementById('paginationNumbers'),
            firstPage: document.getElementById('firstPage'),
            prevPage: document.getElementById('prevPage'),
            nextPage: document.getElementById('nextPage'),
            lastPage: document.getElementById('lastPage'),
            
            // 模态框
            createBackupModal: document.getElementById('createBackupModal'),
            restoreModal: document.getElementById('restoreModal'),
            deleteBackupModal: document.getElementById('deleteBackupModal')
        };
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 页面操作按钮
        if (this.elements.refreshBackupList) {
            this.elements.refreshBackupList.addEventListener('click', () => this.refreshBackupList());
        }
        
        if (this.elements.createBackupBtn) {
            this.elements.createBackupBtn.addEventListener('click', () => this.showCreateBackupModal());
        }
        
        // 配置保存和重置
        if (this.elements.saveConfigBtn) {
            this.elements.saveConfigBtn.addEventListener('click', () => this.saveConfiguration());
        }
        
        if (this.elements.resetConfigBtn) {
            this.elements.resetConfigBtn.addEventListener('click', () => this.resetConfiguration());
        }
        
        // 搜索和筛选
        if (this.elements.backupSearch) {
            this.elements.backupSearch.addEventListener('input', (e) => {
                this.debounce(() => this.handleSearch(e.target.value), 300);
            });
        }
        
        if (this.elements.backupTypeFilter) {
            this.elements.backupTypeFilter.addEventListener('change', (e) => this.handleTypeFilter(e.target.value));
        }
        
        // 视图切换
        this.elements.viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // 全选操作
        if (this.elements.selectAllBackups) {
            this.elements.selectAllBackups.addEventListener('click', () => this.toggleSelectAll());
        }
        
        if (this.elements.selectAllCheckbox) {
            this.elements.selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAll(e.target.checked));
        }
        
        // 批量删除
        if (this.elements.deleteSelectedBackups) {
            this.elements.deleteSelectedBackups.addEventListener('click', () => this.deleteSelectedBackups());
        }
        
        // 分页事件
        this.bindPaginationEvents();
        
        // 模态框事件
        this.bindModalEvents();
    }
    
    /**
     * 绑定分页事件
     */
    bindPaginationEvents() {
        if (this.elements.firstPage) {
            this.elements.firstPage.addEventListener('click', () => this.goToPage(1));
        }
        
        if (this.elements.prevPage) {
            this.elements.prevPage.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
        }
        
        if (this.elements.nextPage) {
            this.elements.nextPage.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
        }
        
        if (this.elements.lastPage) {
            this.elements.lastPage.addEventListener('click', () => this.goToPage(this.state.totalPages));
        }
    }
    
    /**
     * 绑定模态框事件
     */
    bindModalEvents() {
        // 创建备份模态框
        const createModal = this.elements.createBackupModal;
        if (createModal) {
            const closeBtn = createModal.querySelector('#createBackupModalClose');
            const cancelBtn = createModal.querySelector('#cancelCreateBackup');
            const confirmBtn = createModal.querySelector('#confirmCreateBackup');
            const form = createModal.querySelector('#createBackupForm');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(createModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(createModal));
            if (form) form.addEventListener('submit', (e) => this.handleCreateBackup(e));
            
            // 点击背景关闭
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) this.hideModal(createModal);
            });
        }
        
        // 恢复备份模态框
        const restoreModal = this.elements.restoreModal;
        if (restoreModal) {
            const closeBtn = restoreModal.querySelector('#restoreModalClose');
            const cancelBtn = restoreModal.querySelector('#cancelRestore');
            const confirmBtn = restoreModal.querySelector('#confirmRestore');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(restoreModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(restoreModal));
            if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleRestoreBackup());
            
            restoreModal.addEventListener('click', (e) => {
                if (e.target === restoreModal) this.hideModal(restoreModal);
            });
        }
        
        // 删除确认模态框
        const deleteModal = this.elements.deleteBackupModal;
        if (deleteModal) {
            const closeBtn = deleteModal.querySelector('#deleteBackupModalClose');
            const cancelBtn = deleteModal.querySelector('#cancelDelete');
            const confirmBtn = deleteModal.querySelector('#confirmDelete');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(deleteModal));
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal(deleteModal));
            if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleDeleteBackup());
            
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) this.hideModal(deleteModal);
            });
        }
    }
    
    /**
     * 加载备份列表
     */
    async loadBackups() {
        try {
            this.state.isLoading = true;
            this.showLoadingState();
            
            // 模拟API调用延迟
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 生成演示数据
            const demoBackups = this.generateDemoBackups();
            this.state.backups = demoBackups;
            this.state.totalRecords = demoBackups.length;
            this.state.totalPages = Math.ceil(this.state.totalRecords / this.options.pageSize);
            
            this.renderBackups();
            this.updatePagination();
            this.updateStatistics();
            
            console.log('Backups loaded successfully');
            
        } catch (error) {
            console.error('Failed to load backups:', error);
            this.showToast('加载备份列表失败', 'error');
        } finally {
            this.state.isLoading = false;
        }
    }
    
    /**
     * 生成演示备份数据
     */
    generateDemoBackups() {
        const backups = [];
        const types = ['full', 'incremental', 'manual', 'auto'];
        const statuses = ['completed', 'running', 'failed', 'pending'];
        
        for (let i = 1; i <= 25; i++) {
            const createdDate = new Date();
            createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
            
            const type = types[Math.floor(Math.random() * types.length)];
            const status = i <= 20 ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)];
            
            backups.push({
                id: `backup_${i.toString().padStart(3, '0')}`,
                name: `backup_${createdDate.toISOString().split('T')[0]}_${i.toString().padStart(3, '0')}`,
                type: type,
                size: Math.floor(Math.random() * 5000) + 500, // MB
                status: status,
                progress: status === 'running' ? Math.floor(Math.random() * 80) + 10 : 100,
                createdAt: createdDate,
                completedAt: status === 'completed' ? new Date(createdDate.getTime() + Math.random() * 3600000) : null,
                description: `${type === 'auto' ? '自动' : '手动'}备份 - ${createdDate.toLocaleDateString()}`,
                content: ['database', 'files', 'config'].filter(() => Math.random() > 0.3),
                encrypted: Math.random() > 0.5,
                compressed: Math.random() > 0.3
            });
        }
        
        return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    /**
     * 渲染备份列表
     */
    renderBackups() {
        const filteredBackups = this.getFilteredBackups();
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        const pageBackups = filteredBackups.slice(startIndex, endIndex);
        
        if (this.state.currentView === 'list') {
            this.renderBackupTable(pageBackups);
        } else {
            this.renderBackupGrid(pageBackups);
        }
    }
    
    /**
     * 渲染表格视图
     */
    renderBackupTable(backups) {
        if (!this.elements.backupTableBody) return;
        
        if (backups.length === 0) {
            this.elements.backupTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                            <p>暂无备份数据</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.elements.backupTableBody.innerHTML = backups.map(backup => `
            <tr data-backup-id="${backup.id}">
                <td class="checkbox-column">
                    <input type="checkbox" class="backup-checkbox" value="${backup.id}" 
                           onchange="window.backupManager.handleBackupSelection('${backup.id}', this.checked)">
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="font-weight: 500; color: var(--color-text-primary);">${this.escapeHtml(backup.name)}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">
                            ${backup.description}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="backup-type-badge backup-type-badge--${backup.type}">
                        ${this.getTypeText(backup.type)}
                    </span>
                </td>
                <td>
                    <span style="font-weight: 500;">${this.formatFileSize(backup.size)}</span>
                </td>
                <td>
                    <div style="font-size: 0.875rem;">
                        <div>${this.formatDate(backup.createdAt)}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">
                            ${this.formatTime(backup.createdAt)}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-badge--${backup.status}">
                        ${backup.status === 'running' ? 
                            `<span class="status-progress">${backup.progress}%</span>` : 
                            this.getStatusText(backup.status)
                        }
                    </span>
                </td>
                <td>
                    <div class="backup-actions">
                        ${backup.status === 'completed' ? `
                            <button class="backup-action-btn backup-action-btn--primary" 
                                    onclick="window.backupManager.showRestoreModal('${backup.id}')"
                                    title="恢复备份">
                                <span>📥</span>
                            </button>
                        ` : ''}
                        <button class="backup-action-btn" 
                                onclick="window.backupManager.downloadBackup('${backup.id}')"
                                title="下载备份">
                            <span>⬇️</span>
                        </button>
                        <button class="backup-action-btn backup-action-btn--danger" 
                                onclick="window.backupManager.showDeleteModal('${backup.id}')"
                                title="删除备份">
                            <span>🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    /**
     * 渲染网格视图
     */
    renderBackupGrid(backups) {
        if (!this.elements.backupGrid) return;
        
        if (backups.length === 0) {
            this.elements.backupGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-secondary);">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
                    <h3>暂无备份数据</h3>
                    <p>点击"创建备份"按钮开始创建您的第一个备份</p>
                </div>
            `;
            return;
        }
        
        this.elements.backupGrid.innerHTML = backups.map(backup => `
            <div class="backup-card" data-backup-id="${backup.id}">
                <div class="backup-card__header">
                    <h3 class="backup-card__title">${this.escapeHtml(backup.name)}</h3>
                    <span class="backup-card__type backup-type-badge--${backup.type}">
                        ${this.getTypeText(backup.type)}
                    </span>
                </div>
                
                <div class="backup-card__details">
                    <div class="backup-detail">
                        <span class="backup-detail__label">大小</span>
                        <span class="backup-detail__value">${this.formatFileSize(backup.size)}</span>
                    </div>
                    <div class="backup-detail">
                        <span class="backup-detail__label">状态</span>
                        <span class="backup-detail__value">
                            <span class="status-badge status-badge--${backup.status}">
                                ${this.getStatusText(backup.status)}
                            </span>
                        </span>
                    </div>
                    <div class="backup-detail">
                        <span class="backup-detail__label">创建时间</span>
                        <span class="backup-detail__value">${this.formatDate(backup.createdAt)}</span>
                    </div>
                    <div class="backup-detail">
                        <span class="backup-detail__label">包含内容</span>
                        <span class="backup-detail__value">${backup.content.join(', ')}</span>
                    </div>
                </div>
                
                <div class="backup-card__actions">
                    <input type="checkbox" class="backup-checkbox" value="${backup.id}" 
                           onchange="window.backupManager.handleBackupSelection('${backup.id}', this.checked)"
                           style="margin-right: 0.5rem;">
                    ${backup.status === 'completed' ? `
                        <button class="backup-action-btn backup-action-btn--primary" 
                                onclick="window.backupManager.showRestoreModal('${backup.id}')">
                            📥 恢复
                        </button>
                    ` : ''}
                    <button class="backup-action-btn" 
                            onclick="window.backupManager.downloadBackup('${backup.id}')">
                        ⬇️ 下载
                    </button>
                    <button class="backup-action-btn backup-action-btn--danger" 
                            onclick="window.backupManager.showDeleteModal('${backup.id}')">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * 获取过滤后的备份列表
     */
    getFilteredBackups() {
        let filteredBackups = [...this.state.backups];
        
        // 搜索过滤
        if (this.state.filters.search) {
            const searchTerm = this.state.filters.search.toLowerCase();
            filteredBackups = filteredBackups.filter(backup => 
                backup.name.toLowerCase().includes(searchTerm) ||
                backup.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // 类型过滤
        if (this.state.filters.type) {
            filteredBackups = filteredBackups.filter(backup => backup.type === this.state.filters.type);
        }
        
        return filteredBackups;
    }
    
    /**
     * 切换视图
     */
    switchView(view) {
        this.state.currentView = view;
        
        // 更新按钮状态
        this.elements.viewToggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 切换视图容器
        this.elements.backupListView.classList.toggle('active', view === 'list');
        this.elements.backupGridView.classList.toggle('active', view === 'grid');
        
        this.renderBackups();
    }
    
    /**
     * 处理搜索
     */
    handleSearch(searchTerm) {
        this.state.filters.search = searchTerm;
        this.state.currentPage = 1;
        this.renderBackups();
        this.updatePagination();
    }
    
    /**
     * 处理类型筛选
     */
    handleTypeFilter(type) {
        this.state.filters.type = type;
        this.state.currentPage = 1;
        this.renderBackups();
        this.updatePagination();
    }
    
    /**
     * 处理备份选择
     */
    handleBackupSelection(backupId, isSelected) {
        if (isSelected) {
            this.state.selectedBackups.add(backupId);
        } else {
            this.state.selectedBackups.delete(backupId);
        }
        
        this.updateBatchOperationsState();
    }
    
    /**
     * 处理全选
     */
    handleSelectAll(isSelected) {
        const visibleBackups = this.getFilteredBackups();
        const checkboxes = document.querySelectorAll('.backup-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isSelected;
            const backupId = checkbox.value;
            if (isSelected) {
                this.state.selectedBackups.add(backupId);
            } else {
                this.state.selectedBackups.delete(backupId);
            }
        });
        
        this.updateBatchOperationsState();
    }
    
    /**
     * 切换全选状态
     */
    toggleSelectAll() {
        const isAllSelected = this.elements.selectAllCheckbox.checked;
        this.handleSelectAll(!isAllSelected);
    }
    
    /**
     * 更新批量操作按钮状态
     */
    updateBatchOperationsState() {
        const hasSelection = this.state.selectedBackups.size > 0;
        
        if (this.elements.deleteSelectedBackups) {
            this.elements.deleteSelectedBackups.disabled = !hasSelection;
        }
        
        // 更新全选复选框状态
        if (this.elements.selectAllCheckbox) {
            const allCheckboxes = document.querySelectorAll('.backup-checkbox');
            const checkedCheckboxes = document.querySelectorAll('.backup-checkbox:checked');
            
            if (checkedCheckboxes.length === 0) {
                this.elements.selectAllCheckbox.indeterminate = false;
                this.elements.selectAllCheckbox.checked = false;
            } else if (checkedCheckboxes.length === allCheckboxes.length) {
                this.elements.selectAllCheckbox.indeterminate = false;
                this.elements.selectAllCheckbox.checked = true;
            } else {
                this.elements.selectAllCheckbox.indeterminate = true;
                this.elements.selectAllCheckbox.checked = false;
            }
        }
    }
    
    /**
     * 显示创建备份模态框
     */
    showCreateBackupModal() {
        const modal = this.elements.createBackupModal;
        if (modal) {
            // 重置表单
            const form = modal.querySelector('#createBackupForm');
            if (form) form.reset();
            
            // 设置默认值
            const backupNameInput = modal.querySelector('#backupName');
            if (backupNameInput) {
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
                const timeStr = now.toTimeString().split(':').slice(0, 2).join('');
                backupNameInput.value = `manual_backup_${dateStr}_${timeStr}`;
            }
            
            this.showModal(modal);
        }
    }
    
    /**
     * 显示恢复模态框
     */
    showRestoreModal(backupId) {
        const backup = this.state.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        const modal = this.elements.restoreModal;
        if (modal) {
            // 填充备份信息
            const nameEl = modal.querySelector('#restoreBackupName');
            const dateEl = modal.querySelector('#restoreBackupDate');
            const sizeEl = modal.querySelector('#restoreBackupSize');
            const typeEl = modal.querySelector('#restoreBackupType');
            
            if (nameEl) nameEl.textContent = backup.name;
            if (dateEl) dateEl.textContent = this.formatDateTime(backup.createdAt);
            if (sizeEl) sizeEl.textContent = this.formatFileSize(backup.size);
            if (typeEl) typeEl.textContent = this.getTypeText(backup.type);
            
            // 存储当前备份ID
            modal.dataset.backupId = backupId;
            
            this.showModal(modal);
        }
    }
    
    /**
     * 显示删除模态框
     */
    showDeleteModal(backupId) {
        const backup = this.state.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        const modal = this.elements.deleteBackupModal;
        if (modal) {
            const nameEl = modal.querySelector('#deleteBackupName');
            if (nameEl) nameEl.textContent = backup.name;
            
            modal.dataset.backupId = backupId;
            this.showModal(modal);
        }
    }
    
    /**
     * 处理创建备份
     */
    async handleCreateBackup(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const confirmBtn = document.getElementById('confirmCreateBackup');
        
        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.querySelector('.btn__text').style.display = 'none';
                confirmBtn.querySelector('.btn__loading').style.display = 'flex';
            }
            
            // 收集表单数据
            const backupData = {
                name: formData.get('backupName'),
                type: formData.get('backupType'),
                compressionLevel: formData.get('compressionLevel'),
                content: formData.getAll('backupContent'),
                options: formData.getAll('backupOptions'),
                description: formData.get('backupDescription')
            };
            
            // 验证必填字段
            if (!backupData.name || !backupData.type) {
                this.showToast('请填写必填字段', 'warning');
                return;
            }
            
            // 模拟创建备份API调用
            await this.simulateBackupCreation(backupData);
            
            this.hideModal(this.elements.createBackupModal);
            this.showToast('备份创建任务已启动', 'success');
            
            // 刷新备份列表
            setTimeout(() => {
                this.loadBackups();
            }, 1000);
            
        } catch (error) {
            console.error('Create backup failed:', error);
            this.showToast('创建备份失败，请重试', 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.querySelector('.btn__text').style.display = 'inline';
                confirmBtn.querySelector('.btn__loading').style.display = 'none';
            }
        }
    }
    
    /**
     * 模拟备份创建过程
     */
    async simulateBackupCreation(backupData) {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 创建新的备份记录
        const newBackup = {
            id: `backup_${Date.now()}`,
            name: backupData.name,
            type: backupData.type,
            size: Math.floor(Math.random() * 2000) + 500,
            status: 'running',
            progress: 0,
            createdAt: new Date(),
            completedAt: null,
            description: backupData.description || `手动备份 - ${new Date().toLocaleDateString()}`,
            content: backupData.content,
            encrypted: backupData.options.includes('encrypt'),
            compressed: backupData.compressionLevel !== 'none'
        };
        
        // 添加到备份列表开头
        this.state.backups.unshift(newBackup);
        
        return newBackup;
    }
    
    /**
     * 处理恢复备份
     */
    async handleRestoreBackup() {
        const modal = this.elements.restoreModal;
        const backupId = modal.dataset.backupId;
        const confirmBtn = modal.querySelector('#confirmRestore');
        
        if (!backupId) return;
        
        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.querySelector('.btn__text').style.display = 'none';
                confirmBtn.querySelector('.btn__loading').style.display = 'flex';
            }
            
            // 获取恢复选项
            const createBackupBeforeRestore = modal.querySelector('#createBackupBeforeRestore').checked;
            const restoreWithVerification = modal.querySelector('#restoreWithVerification').checked;
            
            // 模拟恢复过程
            await this.simulateBackupRestore(backupId, {
                createBackupBeforeRestore,
                restoreWithVerification
            });
            
            this.hideModal(modal);
            this.showToast('备份恢复任务已启动', 'success');
            
        } catch (error) {
            console.error('Restore backup failed:', error);
            this.showToast('恢复备份失败，请重试', 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.querySelector('.btn__text').style.display = 'inline';
                confirmBtn.querySelector('.btn__loading').style.display = 'none';
            }
        }
    }
    
    /**
     * 模拟备份恢复过程
     */
    async simulateBackupRestore(backupId, options) {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`Restoring backup ${backupId} with options:`, options);
        
        return { success: true };
    }
    
    /**
     * 处理删除备份
     */
    async handleDeleteBackup() {
        const modal = this.elements.deleteBackupModal;
        const backupId = modal.dataset.backupId;
        const confirmBtn = modal.querySelector('#confirmDelete');
        
        if (!backupId) return;
        
        try {
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.querySelector('.btn__text').style.display = 'none';
                confirmBtn.querySelector('.btn__loading').style.display = 'flex';
            }
            
            // 模拟删除操作
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 从列表中移除
            this.state.backups = this.state.backups.filter(b => b.id !== backupId);
            
            this.hideModal(modal);
            this.showToast('备份已删除', 'success');
            
            // 重新渲染
            this.renderBackups();
            this.updateStatistics();
            
        } catch (error) {
            console.error('Delete backup failed:', error);
            this.showToast('删除备份失败，请重试', 'error');
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.querySelector('.btn__text').style.display = 'inline';
                confirmBtn.querySelector('.btn__loading').style.display = 'none';
            }
        }
    }
    
    /**
     * 批量删除选中的备份
     */
    async deleteSelectedBackups() {
        if (this.state.selectedBackups.size === 0) return;
        
        const selectedCount = this.state.selectedBackups.size;
        if (!confirm(`确定要删除选中的 ${selectedCount} 个备份吗？此操作不可撤销。`)) {
            return;
        }
        
        try {
            this.showToast('正在删除选中的备份...', 'info');
            
            // 模拟批量删除
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 从列表中移除选中的备份
            this.state.backups = this.state.backups.filter(backup => 
                !this.state.selectedBackups.has(backup.id)
            );
            
            // 清空选中状态
            this.state.selectedBackups.clear();
            
            this.showToast(`成功删除 ${selectedCount} 个备份`, 'success');
            
            // 重新渲染
            this.renderBackups();
            this.updateStatistics();
            this.updateBatchOperationsState();
            
        } catch (error) {
            console.error('Batch delete failed:', error);
            this.showToast('批量删除失败，请重试', 'error');
        }
    }
    
    /**
     * 下载备份
     */
    downloadBackup(backupId) {
        const backup = this.state.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        // 模拟下载
        this.showToast(`开始下载备份: ${backup.name}`, 'info');
        
        // 在实际应用中，这里应该触发文件下载
        setTimeout(() => {
            this.showToast('备份下载完成', 'success');
        }, 2000);
    }
    
    /**
     * 加载配置
     */
    loadConfiguration() {
        // 从localStorage加载保存的配置
        try {
            const savedConfig = localStorage.getItem('backup_management_config');
            if (savedConfig) {
                this.state.config = { ...this.state.config, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.warn('Failed to load configuration:', error);
        }
        
        // 应用配置到UI
        this.applyConfigurationToUI();
    }
    
    /**
     * 应用配置到UI
     */
    applyConfigurationToUI() {
        const { config } = this.state;
        
        if (this.elements.autoBackupEnabled) {
            this.elements.autoBackupEnabled.checked = config.autoBackupEnabled;
        }
        
        if (this.elements.backupFrequency) {
            this.elements.backupFrequency.value = config.backupFrequency;
        }
        
        if (this.elements.backupTime) {
            this.elements.backupTime.value = config.backupTime;
        }
        
        if (this.elements.retentionDays) {
            this.elements.retentionDays.value = config.retentionDays;
        }
        
        // 备份类型复选框
        this.elements.backupTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = config.backupTypes.includes(checkbox.value);
        });
    }
    
    /**
     * 保存配置
     */
    async saveConfiguration() {
        try {
            // 收集配置数据
            const newConfig = {
                autoBackupEnabled: this.elements.autoBackupEnabled?.checked || false,
                backupFrequency: this.elements.backupFrequency?.value || 'weekly',
                backupTime: this.elements.backupTime?.value || '02:00',
                retentionDays: parseInt(this.elements.retentionDays?.value || '30'),
                backupTypes: Array.from(this.elements.backupTypeCheckboxes)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.value)
            };
            
            // 验证配置
            if (newConfig.backupTypes.length === 0) {
                this.showToast('请至少选择一种备份类型', 'warning');
                return;
            }
            
            if (newConfig.retentionDays < 7 || newConfig.retentionDays > 365) {
                this.showToast('保留天数必须在7-365天之间', 'warning');
                return;
            }
            
            // 保存到状态和localStorage
            this.state.config = newConfig;
            localStorage.setItem('backup_management_config', JSON.stringify(newConfig));
            
            // 模拟API保存
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast('配置保存成功', 'success');
            
        } catch (error) {
            console.error('Save configuration failed:', error);
            this.showToast('保存配置失败，请重试', 'error');
        }
    }
    
    /**
     * 重置配置
     */
    resetConfiguration() {
        if (!confirm('确定要重置所有配置为默认值吗？')) return;
        
        // 重置为默认配置
        this.state.config = {
            autoBackupEnabled: true,
            backupFrequency: 'weekly',
            backupTime: '02:00',
            retentionDays: 30,
            backupTypes: ['database', 'files', 'config']
        };
        
        // 应用到UI
        this.applyConfigurationToUI();
        
        this.showToast('配置已重置为默认值', 'info');
    }
    
    /**
     * 刷新备份列表
     */
    refreshBackupList() {
        this.showToast('正在刷新备份列表...', 'info');
        this.loadBackups();
    }
    
    /**
     * 更新统计数据
     */
    updateStatistics() {
        const stats = {
            totalCount: this.state.backups.length,
            totalSize: this.state.backups.reduce((sum, backup) => sum + backup.size, 0),
            lastBackup: this.state.backups.find(b => b.status === 'completed'),
            successRate: this.calculateSuccessRate()
        };
        
        if (this.elements.totalBackupsCount) {
            this.elements.totalBackupsCount.textContent = stats.totalCount;
        }
        
        if (this.elements.totalBackupSize) {
            this.elements.totalBackupSize.textContent = this.formatFileSize(stats.totalSize);
        }
        
        if (this.elements.lastBackupTime) {
            this.elements.lastBackupTime.textContent = stats.lastBackup ? 
                this.getRelativeTime(stats.lastBackup.createdAt) : '无';
        }
        
        if (this.elements.backupSuccess) {
            this.elements.backupSuccess.textContent = `${stats.successRate}%`;
        }
    }
    
    /**
     * 计算备份成功率
     */
    calculateSuccessRate() {
        const completedBackups = this.state.backups.filter(b => 
            b.status === 'completed' || b.status === 'failed'
        );
        
        if (completedBackups.length === 0) return 100;
        
        const successfulBackups = completedBackups.filter(b => b.status === 'completed');
        return Math.round((successfulBackups.length / completedBackups.length) * 100);
    }
    
    /**
     * 更新分页
     */
    updatePagination() {
        const filteredBackups = this.getFilteredBackups();
        this.state.totalRecords = filteredBackups.length;
        this.state.totalPages = Math.ceil(this.state.totalRecords / this.options.pageSize);
        
        // 更新分页信息
        const startIndex = (this.state.currentPage - 1) * this.options.pageSize + 1;
        const endIndex = Math.min(this.state.currentPage * this.options.pageSize, this.state.totalRecords);
        
        if (this.elements.pageStart) this.elements.pageStart.textContent = startIndex;
        if (this.elements.pageEnd) this.elements.pageEnd.textContent = endIndex;
        if (this.elements.totalBackups) this.elements.totalBackups.textContent = this.state.totalRecords;
        
        // 更新分页按钮状态
        if (this.elements.firstPage) this.elements.firstPage.disabled = this.state.currentPage === 1;
        if (this.elements.prevPage) this.elements.prevPage.disabled = this.state.currentPage === 1;
        if (this.elements.nextPage) this.elements.nextPage.disabled = this.state.currentPage === this.state.totalPages;
        if (this.elements.lastPage) this.elements.lastPage.disabled = this.state.currentPage === this.state.totalPages;
        
        // 生成页码
        this.generatePaginationNumbers();
    }
    
    /**
     * 生成分页页码
     */
    generatePaginationNumbers() {
        if (!this.elements.paginationNumbers) return;
        
        const currentPage = this.state.currentPage;
        const totalPages = this.state.totalPages;
        const delta = 2; // 当前页前后显示的页码数量
        
        let pages = [];
        
        // 计算显示的页码范围
        const startPage = Math.max(1, currentPage - delta);
        const endPage = Math.min(totalPages, currentPage + delta);
        
        // 添加页码
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        
        // 生成HTML
        this.elements.paginationNumbers.innerHTML = pages.map(page => `
            <button class="pagination-number ${page === currentPage ? 'active' : ''}" 
                    onclick="window.backupManager.goToPage(${page})">
                ${page}
            </button>
        `).join('');
    }
    
    /**
     * 跳转到指定页
     */
    goToPage(page) {
        if (page < 1 || page > this.state.totalPages) return;
        
        this.state.currentPage = page;
        this.renderBackups();
        this.updatePagination();
    }
    
    /**
     * 设置自动刷新
     */
    setupAutoRefresh() {
        if (this.options.autoRefresh && this.options.autoRefresh > 0) {
            this.autoRefreshTimer = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    this.loadBackups();
                }
            }, this.options.autoRefresh);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoadingState() {
        if (this.elements.backupTableBody) {
            this.elements.backupTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="7">
                        <div class="loading-spinner"></div>
                        <span>正在加载备份列表...</span>
                    </td>
                </tr>
            `;
        }
        
        if (this.elements.backupGrid) {
            this.elements.backupGrid.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <div class="loading-spinner" style="margin: 0 auto 1rem auto;"></div>
                    <p>正在加载备份列表...</p>
                </div>
            `;
        }
    }
    
    /**
     * 显示模态框
     */
    showModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
            
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * 隐藏模态框
     */
    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
        }
    }
    
    /**
     * 显示消息提示
     */
    showToast(message, type = 'info') {
        if (window.CJComponents && window.CJComponents.showToast) {
            window.CJComponents.showToast(message, '', type);
        } else {
            console.log(`Toast [${type}]: ${message}`);
        }
    }
    
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
    
    /**
     * 工具方法
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatFileSize(sizeInMB) {
        if (sizeInMB < 1024) {
            return `${sizeInMB.toFixed(1)} MB`;
        } else {
            return `${(sizeInMB / 1024).toFixed(1)} GB`;
        }
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('zh-CN');
    }
    
    formatTime(date) {
        return new Date(date).toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    formatDateTime(date) {
        return new Date(date).toLocaleString('zh-CN');
    }
    
    getRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}天前`;
        } else if (hours > 0) {
            return `${hours}小时前`;
        } else {
            return '刚刚';
        }
    }
    
    getTypeText(type) {
        const typeMap = {
            'full': '完整备份',
            'incremental': '增量备份',
            'manual': '手动备份',
            'auto': '自动备份'
        };
        return typeMap[type] || type;
    }
    
    getStatusText(status) {
        const statusMap = {
            'completed': '已完成',
            'running': '运行中',
            'failed': '失败',
            'pending': '等待中'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}

// 导出到全局
window.BackupManagement = BackupManagement;

// 模块导出支持
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupManagement;
}