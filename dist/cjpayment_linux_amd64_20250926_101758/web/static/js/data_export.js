// 数据导出JavaScript功能

class DataExport {
    constructor() {
        this.merchants = [];
        this.exportHistory = [];
        this.currentExportId = null;
        this.previewData = null;
        this.exportFields = {
            orders: [
                { key: 'order_no', label: '订单号', group: 'basic' },
                { key: 'merchant_name', label: '商户名称', group: 'basic' },
                { key: 'payer_name', label: '付款人', group: 'basic' },
                { key: 'amount', label: '金额', group: 'basic' },
                { key: 'ad_account', label: '广告账户', group: 'basic' },
                { key: 'payment_type', label: '付款类型', group: 'basic' },
                { key: 'status', label: '状态', group: 'basic' },
                { key: 'created_at', label: '创建时间', group: 'basic' },
                { key: 'updated_at', label: '更新时间', group: 'basic' },
                { key: 'bank_name', label: '收款银行', group: 'account' },
                { key: 'account_number', label: '收款账号', group: 'account' },
                { key: 'account_name', label: '收款户名', group: 'account' },
                { key: 'payment_proof', label: '付款凭证', group: 'payment' },
                { key: 'remark', label: '备注', group: 'payment' }
            ],
            merchants: [
                { key: 'id', label: 'ID', group: 'basic' },
                { key: 'name', label: '商户名称', group: 'basic' },
                { key: 'contact_name', label: '联系人', group: 'contact' },
                { key: 'contact_phone', label: '联系电话', group: 'contact' },
                { key: 'email', label: '邮箱', group: 'contact' },
                { key: 'business_type', label: '业务类型', group: 'basic' },
                { key: 'status', label: '状态', group: 'basic' },
                { key: 'created_at', label: '创建时间', group: 'basic' }
            ],
            accounts: [
                { key: 'id', label: 'ID', group: 'basic' },
                { key: 'bank_name', label: '银行名称', group: 'basic' },
                { key: 'account_number', label: '账号', group: 'basic' },
                { key: 'account_name', label: '户名', group: 'basic' },
                { key: 'account_type', label: '账号类型', group: 'basic' },
                { key: 'daily_limit', label: '日限额', group: 'limit' },
                { key: 'used_amount', label: '已用金额', group: 'limit' },
                { key: 'status', label: '状态', group: 'basic' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadMerchants();
        this.loadExportHistory();
        this.initDateInputs();
        this.renderExportFields();
    }
    
    bindEvents() {
        // 快速导出
        // quickExport方法通过onclick直接调用
        
        // 自定义导出表单
        document.getElementById('customExportForm').addEventListener('submit', (e) => {
            this.handleCustomExport(e);
        });
        
        // 导出类型变化时更新字段选择
        document.getElementById('exportType').addEventListener('change', (e) => {
            this.renderExportFields(e.target.value);
        });
        
        // 预览按钮
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.previewData();
        });
        
        // 预览格式切换
        document.querySelectorAll('input[name="previewFormat"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.switchPreviewFormat(e.target.id === 'previewTable' ? 'table' : 'json');
            });
        });
        
        // 确认导出
        document.getElementById('confirmExportBtn').addEventListener('click', () => {
            this.confirmExport();
        });
        
        // 定时导出
        document.getElementById('scheduleExportBtn').addEventListener('click', () => {
            this.showScheduleExportModal();
        });
        
        document.getElementById('scheduleExportForm').addEventListener('submit', (e) => {
            this.handleScheduleExportSubmit(e);
        });
        
        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadExportHistory();
        });
        
        // 清空历史
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.clearExportHistory();
        });
        
        // 取消导出
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            this.cancelExport();
        });
    }
    
    initDateInputs() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 默认设置为昨天到今天
        document.getElementById('dateFrom').value = yesterday.toISOString().split('T')[0];
        document.getElementById('dateTo').value = today.toISOString().split('T')[0];
    }
    
    async loadMerchants() {
        try {
            const response = await fetch('/api/merchants');
            if (!response.ok) {
                throw new Error('Failed to load merchants');
            }
            
            const data = await response.json();
            this.merchants = data.merchants || [];
            
            this.populateMerchantFilter();
        } catch (error) {
            console.error('Error loading merchants:', error);
            this.showError('加载商户列表失败');
        }
    }
    
    populateMerchantFilter() {
        const select = document.getElementById('merchantFilter');
        const currentValue = select.value;
        
        // 保留第一个选项
        const firstOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption);
        }
        
        this.merchants.forEach(merchant => {
            const option = document.createElement('option');
            option.value = merchant.id;
            option.textContent = merchant.name;
            select.appendChild(option);
        });
        
        // 恢复之前的选择
        if (currentValue) {
            select.value = currentValue;
        }
    }
    
    renderExportFields(exportType = null) {
        const container = document.getElementById('exportFields');
        const type = exportType || document.getElementById('exportType').value;
        
        if (!type || !this.exportFields[type]) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">请先选择导出类型</p></div>';
            return;
        }
        
        const fields = this.exportFields[type];
        const groups = [...new Set(fields.map(f => f.group))];
        
        container.innerHTML = groups.map(group => {
            const groupFields = fields.filter(f => f.group === group);
            const groupTitle = this.getGroupTitle(group);
            
            return `
                <div class="col-md-6">
                    <div class="field-group">
                        <div class="field-group-title">${groupTitle}</div>
                        ${groupFields.map(field => `
                            <div class="form-check field-checkbox">
                                <input class="form-check-input" type="checkbox" 
                                       id="field_${field.key}" 
                                       name="fields[]" 
                                       value="${field.key}" 
                                       ${field.group === 'basic' ? 'checked' : ''}>
                                <label class="form-check-label" for="field_${field.key}">
                                    ${field.label}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getGroupTitle(group) {
        const titles = {
            'basic': '基本信息',
            'contact': '联系信息',
            'account': '账号信息',
            'payment': '付款信息',
            'limit': '限额信息'
        };
        return titles[group] || group;
    }
    
    async quickExport(period) {
        try {
            this.showProgressModal();
            
            let endpoint;
            if (period === 'today') {
                endpoint = '/api/exports/today';
            } else if (period === 'yesterday') {
                endpoint = '/api/exports/yesterday';
            } else {
                throw new Error('Invalid period');
            }
            
            const exportData = {
                include_sensitive: false,
                format: 'excel'
            };
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exportData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Export failed');
            }
            
            const result = await response.json();
            this.hideProgressModal();
            
            // 自动下载文件
            if (result.download_url) {
                this.downloadFile(result.download_url, result.file_name);
            }
            
            this.showSuccess(`导出完成！共导出 ${result.record_count} 条记录`);
            await this.loadExportHistory();
            
        } catch (error) {
            console.error('Error in quick export:', error);
            this.hideProgressModal();
            this.showError(error.message || '快速导出失败');
        }
    }
    
    async handleCustomExport(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const exportData = {
            start_date: formData.get('date_from') + 'T00:00:00Z',
            end_date: formData.get('date_to') + 'T23:59:59Z',
            merchant_id: formData.get('merchant_id') ? parseInt(formData.get('merchant_id')) : null,
            status: formData.get('status') || '',
            include_sensitive: !formData.has('mask_sensitive'),
            format: 'excel'
        };
        
        // 验证必填字段
        if (!formData.get('export_type')) {
            this.showError('请选择导出类型');
            return;
        }
        
        if (!formData.get('date_from') || !formData.get('date_to')) {
            this.showError('请选择日期范围');
            return;
        }
        
        const fields = formData.getAll('fields[]');
        if (fields.length === 0) {
            this.showError('请至少选择一个导出字段');
            return;
        }
        
        try {
            this.showProgressModal();
            
            const response = await fetch('/api/exports/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exportData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Export failed');
            }
            
            const result = await response.json();
            this.hideProgressModal();
            
            // 自动下载文件
            if (result.download_url) {
                this.downloadFile(result.download_url, result.file_name);
            }
            
            this.showSuccess(`导出完成！共导出 ${result.record_count} 条记录`);
            await this.loadExportHistory();
            
        } catch (error) {
            console.error('Error in custom export:', error);
            this.hideProgressModal();
            this.showError(error.message || '自定义导出失败');
        }
    }
    
    async previewData() {
        const form = document.getElementById('customExportForm');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        
        if (!formData.get('export_type')) {
            this.showError('请选择导出类型');
            return;
        }
        
        if (!formData.get('date_from') || !formData.get('date_to')) {
            this.showError('请选择日期范围');
            return;
        }
        
        const fields = formData.getAll('fields[]');
        if (fields.length === 0) {
            this.showError('请至少选择一个导出字段');
            return;
        }
        
        try {
            // 获取日报数据作为预览
            const dateParam = formData.get('date_from');
            const response = await fetch(`/api/exports/daily-report?date=${dateParam}`);
            
            if (!response.ok) {
                throw new Error('Preview failed');
            }
            
            const data = await response.json();
            
            // 构造预览数据格式
            const previewData = {
                total: data.total_orders,
                records: [
                    {
                        '日期': dateParam,
                        '总订单数': data.total_orders,
                        '总金额': data.total_amount,
                        '待付款': data.pending_orders,
                        '已付款': data.paid_orders,
                        '已完成': data.completed_orders,
                        '已取消': data.cancelled_orders
                    }
                ]
            };
            
            // 添加商户统计数据
            if (data.merchant_stats && data.merchant_stats.length > 0) {
                data.merchant_stats.forEach(stat => {
                    previewData.records.push({
                        '商户名称': stat.merchant_name,
                        '订单数量': stat.order_count,
                        '订单金额': stat.total_amount,
                        '成功率': `${stat.success_rate.toFixed(1)}%`
                    });
                });
            }
            
            this.previewData = previewData;
            this.renderPreview(previewData);
            
            // 显示预览模态框
            const modal = new bootstrap.Modal(document.getElementById('dataPreviewModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error previewing data:', error);
            this.showError('数据预览失败');
        }
    }
    
    renderPreview(data) {
        const info = document.getElementById('previewInfo');
        info.textContent = `预览 ${data.records?.length || 0} 条记录（共 ${data.total || 0} 条）`;
        
        // 渲染表格预览
        this.renderTablePreview(data);
        
        // 渲染JSON预览
        this.renderJsonPreview(data);
    }
    
    renderTablePreview(data) {
        const thead = document.getElementById('previewTableHead');
        const tbody = document.getElementById('previewTableBody');
        
        if (!data.records || data.records.length === 0) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td colspan="100%" class="text-center text-muted">暂无数据</td></tr>';
            return;
        }
        
        // 渲染表头
        const headers = Object.keys(data.records[0]);
        thead.innerHTML = `
            <tr>
                ${headers.map(header => `<th>${this.getFieldLabel(header)}</th>`).join('')}
            </tr>
        `;
        
        // 渲染数据
        tbody.innerHTML = data.records.map(record => `
            <tr>
                ${headers.map(header => `<td>${this.escapeHtml(record[header] || '-')}</td>`).join('')}
            </tr>
        `).join('');
    }
    
    renderJsonPreview(data) {
        const container = document.getElementById('previewJsonContent');
        container.textContent = JSON.stringify(data.records, null, 2);
    }
    
    switchPreviewFormat(format) {
        const tableContainer = document.getElementById('previewTableContainer');
        const jsonContainer = document.getElementById('previewJsonContainer');
        
        if (format === 'table') {
            tableContainer.style.display = 'block';
            jsonContainer.style.display = 'none';
        } else {
            tableContainer.style.display = 'none';
            jsonContainer.style.display = 'block';
        }
    }
    
    async confirmExport() {
        if (!this.previewData) {
            this.showError('请先预览数据');
            return;
        }
        
        // 关闭预览模态框
        const previewModal = bootstrap.Modal.getInstance(document.getElementById('dataPreviewModal'));
        previewModal.hide();
        
        // 开始导出
        const form = document.getElementById('customExportForm');
        const formData = new FormData(form);
        const exportData = {
            export_type: formData.get('export_type'),
            export_format: formData.get('export_format'),
            date_from: formData.get('date_from'),
            date_to: formData.get('date_to'),
            merchant_id: formData.get('merchant_id'),
            status: formData.get('status'),
            fields: formData.getAll('fields[]'),
            mask_sensitive: formData.has('mask_sensitive')
        };
        
        await this.startExport(exportData);
    }
    
    async startExport(exportData) {
        try {
            // 显示进度模态框
            this.showProgressModal();
            
            const response = await fetch('/api/export/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exportData)
            });
            
            if (!response.ok) {
                throw new Error('Export start failed');
            }
            
            const result = await response.json();
            this.currentExportId = result.export_id;
            
            // 开始轮询导出进度
            this.pollExportProgress();
            
        } catch (error) {
            console.error('Error starting export:', error);
            this.hideProgressModal();
            this.showError('导出启动失败');
        }
    }
    
    async pollExportProgress() {
        if (!this.currentExportId) {
            return;
        }
        
        try {
            const response = await fetch(`/api/export/progress/${this.currentExportId}`);
            if (!response.ok) {
                throw new Error('Failed to get progress');
            }
            
            const progress = await response.json();
            this.updateProgress(progress);
            
            if (progress.status === 'completed') {
                this.handleExportCompleted(progress);
            } else if (progress.status === 'failed') {
                this.handleExportFailed(progress);
            } else {
                // 继续轮询
                setTimeout(() => this.pollExportProgress(), 1000);
            }
            
        } catch (error) {
            console.error('Error polling progress:', error);
            this.hideProgressModal();
            this.showError('获取导出进度失败');
        }
    }
    
    updateProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        const percent = Math.round(progress.progress || 0);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressText.textContent = progress.message || '处理中...';
        progressDetails.textContent = progress.details || '';
    }
    
    handleExportCompleted(progress) {
        this.hideProgressModal();
        this.showSuccess('导出完成！');
        
        // 自动下载文件
        if (progress.download_url) {
            this.downloadFile(progress.download_url, progress.filename);
        }
        
        // 重新加载导出历史
        this.loadExportHistory();
        
        this.currentExportId = null;
    }
    
    handleExportFailed(progress) {
        this.hideProgressModal();
        this.showError(progress.error || '导出失败');
        this.currentExportId = null;
    }
    
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    async cancelExport() {
        if (!this.currentExportId) {
            return;
        }
        
        try {
            const response = await fetch(`/api/export/cancel/${this.currentExportId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.hideProgressModal();
                this.showInfo('导出已取消');
                this.currentExportId = null;
            }
        } catch (error) {
            console.error('Error canceling export:', error);
        }
    }
    
    showProgressModal() {
        const modal = new bootstrap.Modal(document.getElementById('exportProgressModal'));
        modal.show();
        
        // 重置进度
        this.updateProgress({ progress: 0, message: '准备导出...', details: '' });
    }
    
    hideProgressModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('exportProgressModal'));
        if (modal) {
            modal.hide();
        }
    }
    
    async loadExportHistory() {
        try {
            // 模拟导出历史数据，实际应该从后端API获取
            this.exportHistory = [
                {
                    id: 1,
                    created_at: new Date().toISOString(),
                    export_type: 'orders',
                    export_format: 'xlsx',
                    date_from: new Date().toISOString().split('T')[0],
                    date_to: new Date().toISOString().split('T')[0],
                    record_count: 150,
                    file_size: 25600,
                    status: 'completed',
                    filename: 'recharge_orders_20240101_120000.xlsx',
                    download_url: '/api/exports/download/recharge_orders_20240101_120000.xlsx'
                }
            ];
            
            this.renderExportHistory();
        } catch (error) {
            console.error('Error loading export history:', error);
            this.showError('加载导出历史失败');
        }
    }
    
    renderExportHistory() {
        const tbody = document.getElementById('exportHistoryTableBody');
        
        if (this.exportHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="empty-state">
                            <i class="fas fa-history"></i>
                            <p>暂无导出历史</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.exportHistory.map(item => `
            <tr class="fade-in">
                <td>${this.formatDateTime(item.created_at)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="export-type-icon export-type-${item.export_type}">
                            <i class="fas ${this.getExportTypeIcon(item.export_type)}"></i>
                        </span>
                        ${this.getExportTypeText(item.export_type)}
                    </div>
                </td>
                <td>
                    <span class="file-format-icon format-${item.export_format}">
                        ${item.export_format.toUpperCase()}
                    </span>
                </td>
                <td>
                    <small class="text-muted">
                        ${item.date_from ? this.formatDate(item.date_from) : ''} 
                        ${item.date_to && item.date_to !== item.date_from ? ' ~ ' + this.formatDate(item.date_to) : ''}
                    </small>
                </td>
                <td>${item.record_count || 0}</td>
                <td>
                    <span class="file-size">${this.formatFileSize(item.file_size)}</span>
                </td>
                <td>
                    <span class="status-badge status-${item.status}">
                        ${this.getStatusText(item.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        ${item.status === 'completed' && item.download_url ? `
                            <button type="button" class="btn btn-sm btn-outline-primary btn-action" 
                                    onclick="dataExport.downloadFile('${item.download_url}', '${item.filename}')" 
                                    title="下载">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-sm btn-outline-danger btn-action" 
                                onclick="dataExport.deleteExportHistory(${item.id})" 
                                title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    async deleteExportHistory(id) {
        if (!confirm('确定要删除这条导出记录吗？')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/export/history/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Delete failed');
            }
            
            this.showSuccess('导出记录删除成功');
            await this.loadExportHistory();
            
        } catch (error) {
            console.error('Error deleting export history:', error);
            this.showError('删除失败');
        }
    }
    
    async clearExportHistory() {
        if (!confirm('确定要清空所有导出历史吗？此操作不可恢复！')) {
            return;
        }
        
        try {
            const response = await fetch('/api/export/history', {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Clear failed');
            }
            
            this.showSuccess('导出历史清空成功');
            await this.loadExportHistory();
            
        } catch (error) {
            console.error('Error clearing export history:', error);
            this.showError('清空失败');
        }
    }
    
    showScheduleExportModal() {
        // 重置表单
        document.getElementById('scheduleExportForm').reset();
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('scheduleExportModal'));
        modal.show();
    }
    
    async handleScheduleExportSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const scheduleData = {
            name: formData.get('name'),
            description: formData.get('description'),
            export_type: formData.get('export_type') === 'orders' ? 'daily' : 'weekly',
            schedule: formData.get('frequency'),
            email_list: formData.get('email'),
            status: formData.has('enabled') ? 'active' : 'inactive'
        };
        
        try {
            this.setScheduleSubmitLoading(true);
            
            const response = await fetch('/api/exports/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(scheduleData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Schedule creation failed');
            }
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleExportModal'));
            modal.hide();
            
            this.showSuccess('定时导出任务创建成功');
            
        } catch (error) {
            console.error('Error creating schedule:', error);
            this.showError(error.message || '创建定时任务失败');
        } finally {
            this.setScheduleSubmitLoading(false);
        }
    }
    
    // 工具方法
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour12: false });
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }
    
    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    getExportTypeIcon(type) {
        const icons = {
            'orders': 'fa-list-alt',
            'merchants': 'fa-store',
            'accounts': 'fa-credit-card',
            'statistics': 'fa-chart-bar'
        };
        return icons[type] || 'fa-file';
    }
    
    getExportTypeText(type) {
        const texts = {
            'orders': '订单数据',
            'merchants': '商户数据',
            'accounts': '账号数据',
            'statistics': '统计报表'
        };
        return texts[type] || type;
    }
    
    getStatusText(status) {
        const texts = {
            'pending': '等待中',
            'processing': '处理中',
            'completed': '已完成',
            'failed': '失败'
        };
        return texts[status] || status;
    }
    
    getFieldLabel(key) {
        // 从所有字段定义中查找标签
        for (const type in this.exportFields) {
            const field = this.exportFields[type].find(f => f.key === key);
            if (field) {
                return field.label;
            }
        }
        return key;
    }
    
    setScheduleSubmitLoading(loading) {
        const submitBtn = document.getElementById('scheduleSubmitBtn');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 保存中...';
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.innerHTML = '保存任务';
        }
    }
    
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    showError(message) {
        this.showAlert(message, 'danger');
    }
    
    showWarning(message) {
        this.showAlert(message, 'warning');
    }
    
    showInfo(message) {
        this.showAlert(message, 'info');
    }
    
    showAlert(message, type) {
        // 移除现有的alert
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // 创建新的alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // 插入到主内容区顶部
        const main = document.querySelector('main');
        main.insertBefore(alert, main.firstChild);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 3000);
    }
}

// 初始化
let dataExport;
document.addEventListener('DOMContentLoaded', () => {
    dataExport = new DataExport();
});

// 防止页面刷新时丢失事件绑定
window.dataExport = dataExport;