// 充值链接管理JavaScript功能

class RechargeLinkManagement {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.totalPages = 0;
        this.links = [];
        this.filteredLinks = [];
        this.merchants = [];
        this.currentLink = null;
        this.visitChart = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadMerchants();
        this.loadLinks();
        this.loadStatistics();
    }
    
    bindEvents() {
        // 搜索功能
        document.getElementById('searchBtn').addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        
        // 筛选功能
        document.getElementById('merchantFilter').addEventListener('change', () => this.handleFilter());
        document.getElementById('statusFilter').addEventListener('change', () => this.handleFilter());
        document.getElementById('sortBy').addEventListener('change', () => this.handleFilter());
        
        // 创建链接表单
        document.getElementById('createLinkForm').addEventListener('submit', (e) => this.handleCreateSubmit(e));
        
        // 限制选项切换
        document.getElementById('enableVisitLimit').addEventListener('change', (e) => {
            document.getElementById('visitLimitGroup').style.display = e.target.checked ? 'block' : 'none';
        });
        
        document.getElementById('enableOrderLimit').addEventListener('change', (e) => {
            document.getElementById('orderLimitGroup').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // 刷新按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadLinks();
            this.loadStatistics();
        });
        
        // 详情模态框中的操作按钮
        document.getElementById('copyDetailLinkBtn').addEventListener('click', () => this.copyDetailLink());
        document.getElementById('downloadQrBtn').addEventListener('click', () => this.downloadQrCode());
        document.getElementById('editLinkBtn').addEventListener('click', () => this.editLink());
        document.getElementById('toggleLinkStatusBtn').addEventListener('click', () => this.toggleLinkStatus());
        document.getElementById('regenerateLinkBtn').addEventListener('click', () => this.regenerateLink());
        document.getElementById('deleteLinkBtn').addEventListener('click', () => this.deleteLink());
    }
    
    async loadMerchants() {
        try {
            const response = await fetch('/api/merchants');
            if (!response.ok) {
                throw new Error('Failed to load merchants');
            }
            
            const data = await response.json();
            this.merchants = data.merchants || [];
            
            this.populateMerchantSelects();
        } catch (error) {
            console.error('Error loading merchants:', error);
            this.showError('加载商户列表失败');
        }
    }
    
    populateMerchantSelects() {
        const selects = ['merchantFilter', 'merchantSelect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
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
        });
    }
    
    async loadLinks() {
        try {
            this.showLoading();
            const response = await fetch('/api/recharge-links');
            if (!response.ok) {
                throw new Error('Failed to load links');
            }
            
            const data = await response.json();
            this.links = data.links || [];
            this.filteredLinks = [...this.links];
            this.totalPages = Math.ceil(this.filteredLinks.length / this.pageSize);
            
            this.renderLinks();
            this.renderPagination();
            this.hideLoading();
        } catch (error) {
            console.error('Error loading links:', error);
            this.showError('加载充值链接失败');
            this.hideLoading();
        }
    }
    
    async loadStatistics() {
        try {
            const response = await fetch('/api/recharge-links/statistics');
            if (!response.ok) {
                throw new Error('Failed to load statistics');
            }
            
            const data = await response.json();
            this.updateStatistics(data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }
    
    updateStatistics(stats) {
        document.getElementById('totalLinks').textContent = stats.total_links || 0;
        document.getElementById('activeLinks').textContent = stats.active_links || 0;
        document.getElementById('todayVisits').textContent = stats.today_visits || 0;
        document.getElementById('todayOrders').textContent = stats.today_orders || 0;
    }
    
    renderLinks() {
        const container = document.getElementById('linkCardsContainer');
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredLinks.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-link"></i>
                        <p>暂无充值链接</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = pageData.map(link => `
            <div class="col-md-6 col-lg-4">
                <div class="link-card fade-in ${link.status === 'inactive' ? 'inactive' : ''} ${this.isExpired(link) ? 'expired' : ''}">
                    <div class="card-header">
                        <h5 class="link-name">${this.escapeHtml(link.name)}</h5>
                        <span class="status-badge status-${link.status}">
                            ${link.status === 'active' ? '启用' : '禁用'}
                        </span>
                    </div>
                    
                    <div class="link-info">
                        <div class="info-item">
                            <div class="info-label">商户</div>
                            <div class="info-value">${this.escapeHtml(link.merchant?.name || '-')}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">创建时间</div>
                            <div class="info-value">${this.formatDate(link.created_at)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">过期时间</div>
                            <div class="info-value">${link.expires_at ? this.formatDate(link.expires_at) : '永不过期'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">别名</div>
                            <div class="info-value">${link.alias || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="link-url">
                        ${this.escapeHtml(link.url)}
                        <button class="copy-btn" onclick="rechargeLinkManagement.copyLink('${link.url}')" title="复制链接">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    <div class="link-stats">
                        <div class="stat-item">
                            <div class="stat-number">${link.visit_count || 0}</div>
                            <div class="stat-label">访问次数</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${link.order_count || 0}</div>
                            <div class="stat-label">订单数量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${this.calculateConversionRate(link)}%</div>
                            <div class="stat-label">转化率</div>
                        </div>
                    </div>
                    
                    ${this.renderLimitIndicators(link)}
                    
                    ${this.isExpired(link) ? `
                        <div class="expiry-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            链接已过期
                        </div>
                    ` : ''}
                    
                    <div class="link-actions">
                        <button type="button" class="btn btn-sm btn-outline-primary" 
                                onclick="rechargeLinkManagement.viewLinkDetail(${link.id})" 
                                title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-success" 
                                onclick="rechargeLinkManagement.generateQrCode(${link.id})" 
                                title="生成二维码">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-warning" 
                                onclick="rechargeLinkManagement.toggleStatus(${link.id})" 
                                title="${link.status === 'active' ? '禁用' : '启用'}">
                            <i class="fas fa-power-off"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                onclick="rechargeLinkManagement.deleteLink(${link.id})" 
                                title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderLimitIndicators(link) {
        let html = '';
        
        if (link.visit_limit && link.visit_limit > 0) {
            const percentage = Math.min(100, (link.visit_count / link.visit_limit) * 100);
            const progressClass = percentage >= 90 ? 'bg-danger' : percentage >= 70 ? 'bg-warning' : 'bg-success';
            
            html += `
                <div class="limit-indicator">
                    <div class="limit-progress">
                        <div class="limit-progress-bar ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="limit-text">访问 ${link.visit_count}/${link.visit_limit}</div>
                </div>
            `;
        }
        
        if (link.order_limit && link.order_limit > 0) {
            const percentage = Math.min(100, (link.order_count / link.order_limit) * 100);
            const progressClass = percentage >= 90 ? 'bg-danger' : percentage >= 70 ? 'bg-warning' : 'bg-success';
            
            html += `
                <div class="limit-indicator">
                    <div class="limit-progress">
                        <div class="limit-progress-bar ${progressClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="limit-text">订单 ${link.order_count}/${link.order_limit}</div>
                </div>
            `;
        }
        
        return html;
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // 上一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rechargeLinkManagement.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="rechargeLinkManagement.goToPage(1)">1</a></li>`;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="rechargeLinkManagement.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="rechargeLinkManagement.goToPage(${this.totalPages})">${this.totalPages}</a></li>`;
        }
        
        // 下一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="rechargeLinkManagement.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHtml;
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.renderLinks();
        this.renderPagination();
    }
    
    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        this.applyFilters(searchTerm);
    }
    
    handleFilter() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        this.applyFilters(searchTerm);
    }
    
    applyFilters(searchTerm = '') {
        const merchantFilter = document.getElementById('merchantFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        
        this.filteredLinks = this.links.filter(link => {
            // 搜索过滤
            const matchesSearch = !searchTerm || 
                link.name.toLowerCase().includes(searchTerm) ||
                (link.merchant?.name && link.merchant.name.toLowerCase().includes(searchTerm)) ||
                (link.url && link.url.toLowerCase().includes(searchTerm)) ||
                (link.alias && link.alias.toLowerCase().includes(searchTerm));
            
            // 商户过滤
            const matchesMerchant = !merchantFilter || link.merchant_id == merchantFilter;
            
            // 状态过滤
            const matchesStatus = !statusFilter || link.status === statusFilter;
            
            return matchesSearch && matchesMerchant && matchesStatus;
        });
        
        // 排序
        this.filteredLinks.sort((a, b) => {
            switch (sortBy) {
                case 'visit_count':
                    return (b.visit_count || 0) - (a.visit_count || 0);
                case 'order_count':
                    return (b.order_count || 0) - (a.order_count || 0);
                case 'created_at':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });
        
        this.totalPages = Math.ceil(this.filteredLinks.length / this.pageSize);
        this.currentPage = 1;
        this.renderLinks();
        this.renderPagination();
    }
    
    async handleCreateSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const formData = new FormData(form);
        const linkData = {
            merchant_id: formData.get('merchant_id'),
            name: formData.get('name'),
            alias: formData.get('alias'),
            description: formData.get('description'),
            expires_at: formData.get('expires_at'),
            visit_limit: formData.has('enable_visit_limit') ? formData.get('visit_limit') : null,
            order_limit: formData.has('enable_order_limit') ? formData.get('order_limit') : null,
            status: formData.has('status') ? 'active' : 'inactive'
        };
        
        try {
            this.setCreateSubmitLoading(true);
            
            const response = await fetch('/api/recharge-links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(linkData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Create failed');
            }
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('createLinkModal'));
            modal.hide();
            
            this.showSuccess('充值链接创建成功');
            
            // 重新加载数据
            await this.loadLinks();
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error creating link:', error);
            this.showError(error.message || '创建失败');
        } finally {
            this.setCreateSubmitLoading(false);
        }
    }
    
    async viewLinkDetail(linkId) {
        try {
            const response = await fetch(`/api/recharge-links/${linkId}`);
            if (!response.ok) {
                throw new Error('Failed to load link detail');
            }
            
            const data = await response.json();
            const link = data.link;
            
            this.currentLink = link;
            this.populateLinkDetail(link);
            
            // 加载访问统计
            await this.loadVisitStatistics(linkId);
            
            // 显示模态框
            const modal = new bootstrap.Modal(document.getElementById('linkDetailModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading link detail:', error);
            this.showError('加载链接详情失败');
        }
    }
    
    populateLinkDetail(link) {
        document.getElementById('detailLinkName').textContent = link.name;
        document.getElementById('detailMerchant').textContent = link.merchant?.name || '-';
        document.getElementById('detailLinkUrl').value = link.url;
        document.getElementById('detailLinkStatus').innerHTML = `
            <span class="status-badge status-${link.status}">
                ${link.status === 'active' ? '启用' : '禁用'}
            </span>
        `;
        document.getElementById('detailCreatedAt').textContent = this.formatDateTime(link.created_at);
        document.getElementById('detailExpiresAt').textContent = link.expires_at ? this.formatDateTime(link.expires_at) : '永不过期';
        document.getElementById('detailVisitCount').textContent = link.visit_count || 0;
        document.getElementById('detailOrderCount').textContent = link.order_count || 0;
        document.getElementById('detailDescription').textContent = link.description || '无描述';
        
        // 生成二维码
        this.generateDetailQrCode(link.url);
    }
    
    generateDetailQrCode(url) {
        const qrContainer = document.getElementById('detailQrcode');
        qrContainer.innerHTML = '';
        
        if (url) {
            QRCode.toCanvas(qrContainer, url, {
                width: 200,
                height: 200,
                margin: 2
            }, (error) => {
                if (error) {
                    console.error('QR Code generation failed:', error);
                    qrContainer.innerHTML = '<p class="text-muted">二维码生成失败</p>';
                }
            });
        }
    }
    
    async loadVisitStatistics(linkId) {
        try {
            const response = await fetch(`/api/recharge-links/${linkId}/statistics`);
            if (!response.ok) {
                throw new Error('Failed to load visit statistics');
            }
            
            const data = await response.json();
            this.renderVisitChart(data.daily_visits || []);
            
        } catch (error) {
            console.error('Error loading visit statistics:', error);
        }
    }
    
    renderVisitChart(dailyVisits) {
        const ctx = document.getElementById('visitChart').getContext('2d');
        
        // 销毁现有图表
        if (this.visitChart) {
            this.visitChart.destroy();
        }
        
        const labels = dailyVisits.map(item => this.formatDate(item.date));
        const visitData = dailyVisits.map(item => item.visits);
        const orderData = dailyVisits.map(item => item.orders);
        
        this.visitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '访问次数',
                        data: visitData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '订单数量',
                        data: orderData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
    
    copyLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showSuccess('链接已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showSuccess('链接已复制到剪贴板');
        });
    }
    
    copyDetailLink() {
        const urlInput = document.getElementById('detailLinkUrl');
        urlInput.select();
        document.execCommand('copy');
        this.showSuccess('链接已复制到剪贴板');
    }
    
    downloadQrCode() {
        const canvas = document.querySelector('#detailQrcode canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `qrcode_${this.currentLink?.name || 'recharge'}.png`;
            link.href = canvas.toDataURL();
            link.click();
            this.showSuccess('二维码下载成功');
        }
    }
    
    async generateQrCode(linkId) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) {
            this.showError('链接不存在');
            return;
        }
        
        // 创建临时模态框显示二维码
        const modalHtml = `
            <div class="modal fade" id="qrModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">二维码 - ${this.escapeHtml(link.name)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <div id="tempQrcode"></div>
                            <p class="mt-2 text-muted">${this.escapeHtml(link.url)}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="rechargeLinkManagement.downloadTempQr()">
                                <i class="fas fa-download"></i> 下载
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 生成二维码
        const qrContainer = document.getElementById('tempQrcode');
        QRCode.toCanvas(qrContainer, link.url, {
            width: 300,
            height: 300,
            margin: 2
        });
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('qrModal'));
        modal.show();
        
        // 模态框关闭时清理
        modal._element.addEventListener('hidden.bs.modal', () => {
            document.getElementById('qrModal').remove();
        });
    }
    
    downloadTempQr() {
        const canvas = document.querySelector('#tempQrcode canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `qrcode_${this.currentLink?.name || 'recharge'}.png`;
            link.href = canvas.toDataURL();
            link.click();
            this.showSuccess('二维码下载成功');
        }
    }
    
    async toggleStatus(linkId) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) {
            this.showError('链接不存在');
            return;
        }
        
        const newStatus = link.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? '启用' : '禁用';
        
        if (!confirm(`确定要${action}链接"${link.name}"吗？`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/recharge-links/${linkId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) {
                throw new Error('Status update failed');
            }
            
            this.showSuccess(`链接${action}成功`);
            await this.loadLinks();
            
        } catch (error) {
            console.error('Error updating status:', error);
            this.showError(`${action}失败`);
        }
    }
    
    async deleteLink(linkId) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) {
            this.showError('链接不存在');
            return;
        }
        
        if (!confirm(`确定要删除链接"${link.name}"吗？此操作不可恢复！`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/recharge-links/${linkId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Delete failed');
            }
            
            this.showSuccess('链接删除成功');
            await this.loadLinks();
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error deleting link:', error);
            this.showError('删除失败');
        }
    }
    
    editLink() {
        if (!this.currentLink) {
            return;
        }
        
        // 关闭详情模态框
        const detailModal = bootstrap.Modal.getInstance(document.getElementById('linkDetailModal'));
        detailModal.hide();
        
        // 填充编辑表单（复用创建表单）
        document.getElementById('createLinkModalLabel').textContent = '编辑充值链接';
        document.getElementById('merchantSelect').value = this.currentLink.merchant_id;
        document.getElementById('linkName').value = this.currentLink.name;
        document.getElementById('linkAlias').value = this.currentLink.alias || '';
        document.getElementById('linkDescription').value = this.currentLink.description || '';
        document.getElementById('linkExpiry').value = this.currentLink.expires_at ? 
            new Date(this.currentLink.expires_at).toISOString().slice(0, 16) : '';
        
        if (this.currentLink.visit_limit) {
            document.getElementById('enableVisitLimit').checked = true;
            document.getElementById('visitLimitGroup').style.display = 'block';
            document.getElementById('visitLimit').value = this.currentLink.visit_limit;
        }
        
        if (this.currentLink.order_limit) {
            document.getElementById('enableOrderLimit').checked = true;
            document.getElementById('orderLimitGroup').style.display = 'block';
            document.getElementById('orderLimit').value = this.currentLink.order_limit;
        }
        
        document.getElementById('linkStatus').checked = this.currentLink.status === 'active';
        
        // 显示编辑模态框
        const editModal = new bootstrap.Modal(document.getElementById('createLinkModal'));
        editModal.show();
        
        // 修改表单提交处理为编辑模式
        this.isEditMode = true;
    }
    
    toggleLinkStatus() {
        if (this.currentLink) {
            this.toggleStatus(this.currentLink.id);
        }
    }
    
    regenerateLink() {
        if (!this.currentLink) {
            return;
        }
        
        if (!confirm('确定要重新生成链接吗？原链接将失效！')) {
            return;
        }
        
        // 这里实现重新生成链接的逻辑
        this.showInfo('功能开发中...');
    }
    
    // 工具方法
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN');
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour12: false });
    }
    
    isExpired(link) {
        if (!link.expires_at) return false;
        return new Date(link.expires_at) < new Date();
    }
    
    calculateConversionRate(link) {
        if (!link.visit_count || link.visit_count === 0) return 0;
        return Math.round((link.order_count || 0) / link.visit_count * 100);
    }
    
    showLoading() {
        const container = document.getElementById('linkCardsContainer');
        container.innerHTML = `
            <div class="col-12">
                <div class="loading">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">加载中...</p>
                </div>
            </div>
        `;
    }
    
    hideLoading() {
        // Loading will be replaced by renderLinks()
    }
    
    setCreateSubmitLoading(loading) {
        const submitBtn = document.getElementById('createSubmitBtn');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        if (loading) {
            submitBtn.disabled = true;
            spinner.classList.remove('d-none');
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 创建中...';
        } else {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            submitBtn.innerHTML = '创建链接';
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
let rechargeLinkManagement;
document.addEventListener('DOMContentLoaded', () => {
    rechargeLinkManagement = new RechargeLinkManagement();
});

// 防止页面刷新时丢失事件绑定
window.rechargeLinkManagement = rechargeLinkManagement;