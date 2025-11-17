/**
 * System Configuration Module
 * Handles system configuration management with card-based interface
 */

window.SystemConfig = (function() {
    'use strict';

    class SystemConfig {
        constructor() {
            this.currentCategory = 'payment';
            this.configurations = {};
            this.originalConfigurations = {};
            this.isLoading = false;
            this.hasUnsavedChanges = false;
            this.searchQuery = '';
            this.categoryFilter = '';
        }

        // ==========================================================================
        // Initialization
        // ==========================================================================

        init() {
            this.bindEvents();
            this.loadConfigurations();
        }

        bindEvents() {
            // Category navigation
            const categoryBtns = CJUtils.$('.category-btn');
            categoryBtns.forEach(btn => {
                CJUtils.on(btn, 'click', (e) => {
                    const category = e.target.dataset.category;
                    this.switchCategory(category);
                });
            });

            // Search functionality
            const searchInput = CJUtils.$('#configSearch');
            if (searchInput) {
                let searchTimeout;
                CJUtils.on(searchInput, 'input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchQuery = e.target.value.trim();
                        this.filterConfigurations();
                    }, 300);
                });
            }

            // Category filter
            const categoryFilter = CJUtils.$('#categoryFilter');
            if (categoryFilter) {
                CJUtils.on(categoryFilter, 'change', (e) => {
                    this.categoryFilter = e.target.value;
                    this.filterConfigurations();
                });
            }

            // Global actions
            const resetConfigBtn = CJUtils.$('#resetConfigBtn');
            if (resetConfigBtn) {
                CJUtils.on(resetConfigBtn, 'click', () => {
                    this.resetAllConfigurations();
                });
            }

            const saveAllConfigBtn = CJUtils.$('#saveAllConfigBtn');
            if (saveAllConfigBtn) {
                CJUtils.on(saveAllConfigBtn, 'click', () => {
                    this.saveAllConfigurations();
                });
            }

            // Form change detection
            this.bindFormChangeEvents();

            // Card action buttons
            this.bindCardActionEvents();

            // Modal events
            this.bindModalEvents();

            // Prevent accidental navigation
            window.addEventListener('beforeunload', (e) => {
                if (this.hasUnsavedChanges) {
                    e.preventDefault();
                    e.returnValue = '您有未保存的配置更改，确定要离开吗？';
                    return e.returnValue;
                }
            });
        }

        bindFormChangeEvents() {
            // Monitor all form inputs for changes
            const formInputs = CJUtils.$('input, select, textarea');
            formInputs.forEach(input => {
                CJUtils.on(input, 'change', () => {
                    this.markAsChanged();
                    this.validateInput(input);
                });

                CJUtils.on(input, 'input', () => {
                    this.markAsChanged();
                    this.clearInputError(input);
                });
            });
        }

        bindCardActionEvents() {
            // Bind action buttons in config cards
            const actionButtons = CJUtils.$('.config-card .btn');
            actionButtons.forEach(button => {
                CJUtils.on(button, 'click', (e) => {
                    const action = e.target.dataset.action;
                    const card = e.target.closest('.config-card');
                    this.handleCardAction(action, card);
                });
            });
        }

        bindModalEvents() {
            // Configuration preview modal
            const previewModal = CJUtils.$('#configPreviewModal');
            const previewClose = CJUtils.$('#configPreviewClose');
            const previewCancel = CJUtils.$('#configPreviewCancel');
            const previewConfirm = CJUtils.$('#configPreviewConfirm');

            if (previewClose) {
                CJUtils.on(previewClose, 'click', () => {
                    this.hidePreviewModal();
                });
            }

            if (previewCancel) {
                CJUtils.on(previewCancel, 'click', () => {
                    this.hidePreviewModal();
                });
            }

            if (previewConfirm) {
                CJUtils.on(previewConfirm, 'click', () => {
                    this.confirmConfigurationChanges();
                });
            }

            if (previewModal) {
                CJUtils.on(previewModal, 'click', (e) => {
                    if (e.target === previewModal) {
                        this.hidePreviewModal();
                    }
                });
            }
        }

        // ==========================================================================
        // Category Management
        // ==========================================================================

        switchCategory(category) {
            if (this.currentCategory === category) return;

            // Update category buttons
            const categoryBtns = CJUtils.$('.category-btn');
            categoryBtns.forEach(btn => {
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update category content
            const categoryContents = CJUtils.$('.config-category');
            categoryContents.forEach(content => {
                if (content.id === `${category}Config`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            this.currentCategory = category;
        }

        // ==========================================================================
        // Data Loading and Management
        // ==========================================================================

        async loadConfigurations() {
            if (this.isLoading) return;

            this.setLoading(true);

            try {
                const response = await CJApi.get('/api/v1/system/config');

                if (response.success) {
                    this.configurations = response.data || {};
                    this.originalConfigurations = JSON.parse(JSON.stringify(this.configurations));
                    this.populateConfigurationForms();
                    this.updateConfigurationStatus();
                } else {
                    CJComponents.toast.error('加载系统配置失败');
                }
            } catch (error) {
                console.error('Load configurations error:', error);
                CJComponents.toast.error('加载系统配置失败');
            } finally {
                this.setLoading(false);
            }
        }

        populateConfigurationForms() {
            // Populate form fields with configuration values
            Object.keys(this.configurations).forEach(category => {
                const categoryConfig = this.configurations[category];
                Object.keys(categoryConfig).forEach(key => {
                    const input = CJUtils.$(`[name="${key}"]`);
                    if (input) {
                        const value = categoryConfig[key];
                        if (input.type === 'checkbox') {
                            input.checked = Boolean(value);
                        } else if (input.type === 'radio') {
                            const radioInput = CJUtils.$(`[name="${key}"][value="${value}"]`);
                            if (radioInput) {
                                radioInput.checked = true;
                            }
                        } else {
                            input.value = value || '';
                        }
                    }
                });
            });
        }

        updateConfigurationStatus() {
            // Update status indicators for each configuration card
            const configCards = CJUtils.$('.config-card');
            configCards.forEach(card => {
                const cardTitle = card.querySelector('.config-card-title').textContent;
                const statusIndicator = card.querySelector('.status-indicator');
                const statusText = card.querySelector('.status-text');
                
                // Determine status based on configuration completeness
                const isConfigured = this.isCardConfigured(card);
                const hasWarnings = this.hasCardWarnings(card);
                
                if (isConfigured && !hasWarnings) {
                    statusIndicator.className = 'status-indicator active';
                    statusText.textContent = '已配置';
                } else if (isConfigured && hasWarnings) {
                    statusIndicator.className = 'status-indicator warning';
                    statusText.textContent = '需要注意';
                } else {
                    statusIndicator.className = 'status-indicator inactive';
                    statusText.textContent = '未配置';
                }
            });
        }

        isCardConfigured(card) {
            // Check if all required fields in the card are configured
            const requiredInputs = card.querySelectorAll('input[required], select[required]');
            return Array.from(requiredInputs).every(input => {
                if (input.type === 'checkbox') {
                    return true; // Checkboxes are optional by nature
                }
                return input.value && input.value.trim() !== '';
            });
        }

        hasCardWarnings(card) {
            // Check if the card has any warning conditions
            const inputs = card.querySelectorAll('input, select, textarea');
            return Array.from(inputs).some(input => {
                return input.classList.contains('warning') || 
                       input.hasAttribute('data-warning');
            });
        }

        // ==========================================================================
        // Form Validation
        // ==========================================================================

        validateInput(input) {
            const value = input.value;
            const type = input.type;
            const name = input.name;
            
            // Clear previous validation state
            input.classList.remove('error', 'warning');
            this.clearInputError(input);

            // Validate based on input type and name
            if (type === 'email' && value) {
                if (!this.isValidEmail(value)) {
                    this.setInputError(input, '请输入有效的邮箱地址');
                    return false;
                }
            }

            if (type === 'number' && value) {
                const numValue = parseFloat(value);
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                
                if (isNaN(numValue)) {
                    this.setInputError(input, '请输入有效的数字');
                    return false;
                }
                
                if (!isNaN(min) && numValue < min) {
                    this.setInputError(input, `值不能小于 ${min}`);
                    return false;
                }
                
                if (!isNaN(max) && numValue > max) {
                    this.setInputError(input, `值不能大于 ${max}`);
                    return false;
                }
            }

            // Custom validation rules
            if (name === 'ip_whitelist' && value) {
                const ips = value.split('\n').filter(ip => ip.trim());
                for (const ip of ips) {
                    if (!this.isValidIPOrCIDR(ip.trim())) {
                        this.setInputError(input, `无效的IP地址或CIDR: ${ip}`);
                        return false;
                    }
                }
            }

            if (name.includes('password') && value && value.length < 8) {
                this.setInputWarning(input, '建议密码长度至少8位');
            }

            return true;
        }

        setInputError(input, message) {
            input.classList.add('error');
            const errorElement = this.getOrCreateErrorElement(input);
            errorElement.textContent = message;
            errorElement.className = 'config-message error';
        }

        setInputWarning(input, message) {
            input.classList.add('warning');
            const errorElement = this.getOrCreateErrorElement(input);
            errorElement.textContent = message;
            errorElement.className = 'config-message warning';
        }

        clearInputError(input) {
            input.classList.remove('error', 'warning');
            const errorElement = input.parentNode.querySelector('.config-message');
            if (errorElement) {
                errorElement.remove();
            }
        }

        getOrCreateErrorElement(input) {
            let errorElement = input.parentNode.querySelector('.config-message');
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'config-message';
                input.parentNode.appendChild(errorElement);
            }
            return errorElement;
        }

        // ==========================================================================
        // Card Actions
        // ==========================================================================

        async handleCardAction(action, card) {
            const cardTitle = card.querySelector('.config-card-title').textContent;
            
            switch (action) {
                case 'save':
                    await this.saveCardConfiguration(card);
                    break;
                case 'test':
                    await this.testCardConfiguration(card);
                    break;
                case 'preview':
                    this.previewCardConfiguration(card);
                    break;
                case 'clear':
                    await this.clearCardConfiguration(card);
                    break;
                default:
                    console.warn('Unknown card action:', action);
            }
        }

        async saveCardConfiguration(card) {
            const cardData = this.getCardFormData(card);
            const cardTitle = card.querySelector('.config-card-title').textContent;
            
            // Validate card data
            const isValid = this.validateCardData(card);
            if (!isValid) {
                CJComponents.toast.error('请修正配置错误后再保存');
                return;
            }

            this.setCardLoading(card, true);

            try {
                const response = await CJApi.post('/api/v1/system/config/save', {
                    category: this.currentCategory,
                    config: cardData
                });

                if (response.success) {
                    CJComponents.toast.success(`${cardTitle} 配置保存成功`);
                    this.setCardSuccess(card);
                    this.updateConfigurationStatus();
                } else {
                    CJComponents.toast.error(response.message || '配置保存失败');
                    this.setCardError(card);
                }
            } catch (error) {
                console.error('Save card configuration error:', error);
                CJComponents.toast.error('配置保存失败');
                this.setCardError(card);
            } finally {
                this.setCardLoading(card, false);
            }
        }

        async testCardConfiguration(card) {
            const cardData = this.getCardFormData(card);
            const cardTitle = card.querySelector('.config-card-title').textContent;
            
            this.setCardLoading(card, true);

            try {
                const response = await CJApi.post('/api/v1/system/config/test', {
                    category: this.currentCategory,
                    config: cardData
                });

                if (response.success) {
                    CJComponents.toast.success(`${cardTitle} 测试成功`);
                    this.setCardSuccess(card);
                } else {
                    CJComponents.toast.error(response.message || '配置测试失败');
                    this.setCardError(card);
                }
            } catch (error) {
                console.error('Test card configuration error:', error);
                CJComponents.toast.error('配置测试失败');
                this.setCardError(card);
            } finally {
                this.setCardLoading(card, false);
            }
        }

        previewCardConfiguration(card) {
            const cardData = this.getCardFormData(card);
            const cardTitle = card.querySelector('.config-card-title').textContent;
            
            this.showPreviewModal(cardTitle, cardData);
        }

        async clearCardConfiguration(card) {
            const cardTitle = card.querySelector('.config-card-title').textContent;
            
            const confirmed = await CJComponents.modal.confirm({
                title: '清空配置',
                message: `确定要清空 ${cardTitle} 的配置吗？此操作不可撤销。`,
                confirmText: '清空',
                cancelText: '取消',
                type: 'warning'
            });

            if (!confirmed) return;

            this.setCardLoading(card, true);

            try {
                const response = await CJApi.post('/api/v1/system/config/clear', {
                    category: this.currentCategory,
                    card: cardTitle
                });

                if (response.success) {
                    CJComponents.toast.success(`${cardTitle} 配置已清空`);
                    this.clearCardFormData(card);
                    this.updateConfigurationStatus();
                } else {
                    CJComponents.toast.error(response.message || '清空配置失败');
                }
            } catch (error) {
                console.error('Clear card configuration error:', error);
                CJComponents.toast.error('清空配置失败');
            } finally {
                this.setCardLoading(card, false);
            }
        }

        // ==========================================================================
        // Form Data Management
        // ==========================================================================

        getCardFormData(card) {
            const formData = {};
            const inputs = card.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                const name = input.name;
                if (!name) return;
                
                if (input.type === 'checkbox') {
                    formData[name] = input.checked;
                } else if (input.type === 'radio') {
                    if (input.checked) {
                        formData[name] = input.value;
                    }
                } else {
                    formData[name] = input.value;
                }
            });
            
            return formData;
        }

        validateCardData(card) {
            const inputs = card.querySelectorAll('input, select, textarea');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!this.validateInput(input)) {
                    isValid = false;
                }
            });
            
            return isValid;
        }

        clearCardFormData(card) {
            const inputs = card.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
                this.clearInputError(input);
            });
        }

        // ==========================================================================
        // Global Actions
        // ==========================================================================

        async resetAllConfigurations() {
            const confirmed = await CJComponents.modal.confirm({
                title: '重置所有配置',
                message: '确定要重置所有配置到默认值吗？此操作不可撤销。',
                confirmText: '重置',
                cancelText: '取消',
                type: 'danger'
            });

            if (!confirmed) return;

            this.setLoading(true);

            try {
                const response = await CJApi.post('/api/v1/system/config/reset');

                if (response.success) {
                    CJComponents.toast.success('所有配置已重置为默认值');
                    this.loadConfigurations();
                } else {
                    CJComponents.toast.error(response.message || '重置配置失败');
                }
            } catch (error) {
                console.error('Reset configurations error:', error);
                CJComponents.toast.error('重置配置失败');
            } finally {
                this.setLoading(false);
            }
        }

        async saveAllConfigurations() {
            if (!this.hasUnsavedChanges) {
                CJComponents.toast.info('没有需要保存的配置更改');
                return;
            }

            // Validate all configurations
            const allCards = CJUtils.$('.config-card');
            let hasErrors = false;
            
            allCards.forEach(card => {
                if (!this.validateCardData(card)) {
                    hasErrors = true;
                }
            });

            if (hasErrors) {
                CJComponents.toast.error('请修正所有配置错误后再保存');
                return;
            }

            this.setLoading(true);

            try {
                const allConfigurations = this.getAllConfigurations();
                const response = await CJApi.post('/api/v1/system/config/save-all', {
                    configurations: allConfigurations
                });

                if (response.success) {
                    CJComponents.toast.success('所有配置保存成功');
                    this.hasUnsavedChanges = false;
                    this.updateSaveButtonState();
                    this.updateConfigurationStatus();
                } else {
                    CJComponents.toast.error(response.message || '保存配置失败');
                }
            } catch (error) {
                console.error('Save all configurations error:', error);
                CJComponents.toast.error('保存配置失败');
            } finally {
                this.setLoading(false);
            }
        }

        getAllConfigurations() {
            const configurations = {};
            const categories = CJUtils.$('.config-category');
            
            categories.forEach(category => {
                const categoryId = category.id.replace('Config', '');
                configurations[categoryId] = {};
                
                const cards = category.querySelectorAll('.config-card');
                cards.forEach(card => {
                    const cardTitle = card.querySelector('.config-card-title').textContent;
                    configurations[categoryId][cardTitle] = this.getCardFormData(card);
                });
            });
            
            return configurations;
        }

        // ==========================================================================
        // Search and Filter
        // ==========================================================================

        filterConfigurations() {
            const cards = CJUtils.$('.config-card');
            
            cards.forEach(card => {
                const cardTitle = card.querySelector('.config-card-title').textContent.toLowerCase();
                const cardContent = card.textContent.toLowerCase();
                
                const matchesSearch = !this.searchQuery || 
                    cardTitle.includes(this.searchQuery.toLowerCase()) ||
                    cardContent.includes(this.searchQuery.toLowerCase());
                
                const matchesCategory = !this.categoryFilter || 
                    card.closest('.config-category').id === `${this.categoryFilter}Config`;
                
                if (matchesSearch && matchesCategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // ==========================================================================
        // Preview Modal
        // ==========================================================================

        showPreviewModal(title, configData) {
            const modal = CJUtils.$('#configPreviewModal');
            const previewContent = CJUtils.$('#currentConfigPreview');
            const changeSummary = CJUtils.$('#changeSummary');
            
            if (!modal || !previewContent || !changeSummary) return;
            
            // Format configuration data for preview
            previewContent.textContent = JSON.stringify(configData, null, 2);
            
            // Generate change summary
            const changes = this.generateChangeSummary(configData);
            changeSummary.innerHTML = changes;
            
            modal.style.display = 'flex';
        }

        hidePreviewModal() {
            const modal = CJUtils.$('#configPreviewModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        generateChangeSummary(configData) {
            const changes = [];
            
            Object.keys(configData).forEach(key => {
                const newValue = configData[key];
                const oldValue = this.originalConfigurations[this.currentCategory]?.[key];
                
                if (oldValue !== newValue) {
                    if (oldValue === undefined) {
                        changes.push(`
                            <div class="change-item">
                                <span class="change-type added">新增</span>
                                <span>${key}: ${newValue}</span>
                            </div>
                        `);
                    } else {
                        changes.push(`
                            <div class="change-item">
                                <span class="change-type modified">修改</span>
                                <span>${key}: ${oldValue} → ${newValue}</span>
                            </div>
                        `);
                    }
                }
            });
            
            if (changes.length === 0) {
                return '<div class="change-item">没有配置更改</div>';
            }
            
            return changes.join('');
        }

        async confirmConfigurationChanges() {
            // Apply the previewed changes
            this.hidePreviewModal();
            CJComponents.toast.success('配置更改已应用');
        }

        // ==========================================================================
        // UI State Management
        // ==========================================================================

        setLoading(loading) {
            this.isLoading = loading;
            const configContent = CJUtils.$('.config-content');
            
            if (loading) {
                configContent?.classList.add('loading');
            } else {
                configContent?.classList.remove('loading');
            }
        }

        setCardLoading(card, loading) {
            if (loading) {
                card.classList.add('loading');
            } else {
                card.classList.remove('loading');
                // Clear any previous state classes after a delay
                setTimeout(() => {
                    card.classList.remove('success', 'error');
                }, 3000);
            }
        }

        setCardSuccess(card) {
            card.classList.remove('error');
            card.classList.add('success');
        }

        setCardError(card) {
            card.classList.remove('success');
            card.classList.add('error');
        }

        markAsChanged() {
            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
        }

        updateSaveButtonState() {
            const saveAllBtn = CJUtils.$('#saveAllConfigBtn');
            if (saveAllBtn) {
                if (this.hasUnsavedChanges) {
                    saveAllBtn.classList.add('btn-warning');
                    saveAllBtn.classList.remove('btn-primary');
                } else {
                    saveAllBtn.classList.add('btn-primary');
                    saveAllBtn.classList.remove('btn-warning');
                }
            }
        }

        // ==========================================================================
        // Utility Methods
        // ==========================================================================

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        isValidIPOrCIDR(ip) {
            // Simple IP/CIDR validation
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
            if (!ipRegex.test(ip)) return false;
            
            const parts = ip.split('/')[0].split('.');
            return parts.every(part => {
                const num = parseInt(part);
                return num >= 0 && num <= 255;
            });
        }
    }

    return SystemConfig;
})();