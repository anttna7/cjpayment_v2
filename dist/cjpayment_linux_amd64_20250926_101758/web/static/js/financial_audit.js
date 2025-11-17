// Financial Audit JavaScript
class FinancialAuditApp {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.totalRecords = 0;
        this.selectedOrders = new Set();
        this.currentOrder = null;
        this.currentVoucherUrl = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadOrders();
        this.loadStatistics();
        this.setupDateRangeHandler();
    }

    bindEvents() {
        // Filter form submission
        document.getElementById('filterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.currentPage = 1;
            this.loadOrders();
        });

        // Date range change handler
        document.getElementById('dateRange').addEventListener('change', (e) => {
            this.handleDateRangeChange(e.target.value);
        });
    }

    setupDateRangeHandler() {
        const dateRange = document.getElementById('dateRange');
        const customDateGroup = document.getElementById('customDateGroup');
        const customDateGroup2 = document.getElementById('customDateGroup2');

        dateRange.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customDateGroup.style.display = 'block';
                customDateGroup2.style.display = 'block';
            } else {
                customDateGroup.style.display = 'none';
                customDateGroup2.style.display = 'none';
            }
        });
    }

    handleDateRangeChange(range) {
        const today = new Date();
        let startDate, endDate;

        switch (range) {
            case 'today':
                startDate = endDate = today.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = endDate = yesterday.toISOString().split('T')[0];
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                startDate = weekStart.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            default:
                return;
        }

        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;
    }

    async loadOrders() {
        this.showLoading();

        try {
            const params = this.buildFilterParams();
            const response = await fetch(`/api/v1/recharge/pending-audit?${params}`);
            const result = await response.json();

            if (response.ok && result.success) {
                this.renderOrders(result.data.orders);
                this.updatePagination(result.data);
            } else {
                this.showError(result.error || '加载订单失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Load orders error:', error);
        } finally {
            this.hideLoading();
        }
    }

    buildFilterParams() {
        const formData = new FormData(document.getElementById('filterForm'));
        const params = new URLSearchParams();

        params.append('page', this.currentPage);
        params.append('limit', this.pageSize);

        if (formData.get('payment_type')) {
            params.append('payment_type', formData.get('payment_type'));
        }

        const dateRange = formData.get('date_range');
        if (dateRange === 'custom') {
            const startDate = formData.get('start_date');
            const endDate = formData.get('end_date');
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
        }

        return params.toString();
    }

    renderOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: #6c757d;">
                        暂无待审核订单
                    </td>
                </tr>
            `;
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="order-checkbox" value="${order.id}" 
                           onchange="app.handleOrderSelection('${order.id}', this.checked)">
                </td>
                <td>
                    <a href="#" onclick="app.showOrderDetail('${order.id}')" class="order-link">
                        ${order.order_number}
                    </a>
                </td>
                <td>${order.payer_name}</td>
                <td>${order.payer_account}</td>
                <td class="amount">¥${parseFloat(order.amount).toFixed(2)}</td>
                <td>${order.merchant_name || '-'}</td>
                <td>${order.ad_account}</td>
                <td>${order.receiver_account || '-'}</td>
                <td>${this.formatDateTime(order.created_at)}</td>
                <td>
                    ${order.voucher_url ? 
                        `<button class="btn btn-sm btn-secondary" onclick="app.previewVoucher('${order.voucher_url}')">查看凭证</button>` : 
                        '<span style="color: #6c757d;">无凭证</span>'
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-success" onclick="app.quickApprove('${order.id}')">通过</button>
                        <button class="btn btn-sm btn-danger" onclick="app.quickReject('${order.id}')">拒绝</button>
                        <button class="btn btn-sm btn-secondary" onclick="app.showOrderDetail('${order.id}')">详情</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateSelectAllState();
    }

    updatePagination(data) {
        this.totalRecords = data.total;
        this.totalPages = data.total_pages;
        this.currentPage = data.page;

        // Update pagination info
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalRecords);
        document.getElementById('paginationInfo').textContent = 
            `显示 ${start} - ${end} 条，共 ${this.totalRecords} 条记录`;

        document.getElementById('pageInfo').textContent = 
            `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;

        // Update button states
        document.getElementById('prevBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextBtn').disabled = this.currentPage >= this.totalPages;
    }

    async loadStatistics() {
        try {
            // This would be a real API call in production
            // For now, we'll use mock data
            const stats = {
                pendingCount: 15,
                pendingAmount: 45000.00,
                todayProcessed: 8,
                todayAmount: 25000.00
            };

            document.getElementById('pendingCount').textContent = stats.pendingCount;
            document.getElementById('pendingAmount').textContent = `¥${stats.pendingAmount.toFixed(2)}`;
            document.getElementById('todayProcessed').textContent = stats.todayProcessed;
            document.getElementById('todayAmount').textContent = `¥${stats.todayAmount.toFixed(2)}`;
        } catch (error) {
            console.error('Load statistics error:', error);
        }
    }

    handleOrderSelection(orderId, checked) {
        if (checked) {
            this.selectedOrders.add(orderId);
        } else {
            this.selectedOrders.delete(orderId);
        }

        this.updateBatchApproveButton();
        this.updateSelectAllState();
    }

    updateBatchApproveButton() {
        const batchBtn = document.getElementById('batchApproveBtn');
        batchBtn.disabled = this.selectedOrders.size === 0;
        batchBtn.textContent = this.selectedOrders.size > 0 ? 
            `批量通过 (${this.selectedOrders.size})` : '批量通过';
    }

    updateSelectAllState() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.order-checkbox');
        const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');

        if (checkboxes.length === 0) {
            selectAll.indeterminate = false;
            selectAll.checked = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAll.indeterminate = false;
            selectAll.checked = true;
        } else if (checkedBoxes.length > 0) {
            selectAll.indeterminate = true;
            selectAll.checked = false;
        } else {
            selectAll.indeterminate = false;
            selectAll.checked = false;
        }
    }

    async showOrderDetail(orderId) {
        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${orderId}`);
            const result = await response.json();

            if (response.ok && result.success) {
                this.currentOrder = result.data;
                await this.loadOrderReceiveInfo(orderId);
                this.renderOrderDetail();
                this.showModal('orderDetailModal');
            } else {
                this.showError(result.error || '加载订单详情失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Show order detail error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async loadOrderReceiveInfo(orderId) {
        try {
            const response = await fetch(`/api/v1/recharge/${orderId}/receive-info`);
            const result = await response.json();

            if (response.ok && result.success) {
                this.currentOrder.receiveInfo = result.data;
            }
        } catch (error) {
            console.error('Load receive info error:', error);
        }
    }

    renderOrderDetail() {
        const order = this.currentOrder;
        const receiveInfo = order.receiveInfo || {};

        // Basic information
        document.getElementById('detailOrderNumber').textContent = order.order_number;
        document.getElementById('detailPayerName').textContent = order.payer_name;
        document.getElementById('detailPayerAccount').textContent = order.payer_account;
        document.getElementById('detailAmount').textContent = `¥${parseFloat(order.amount).toFixed(2)}`;
        document.getElementById('detailMerchantName').textContent = receiveInfo.merchant_name || '-';
        document.getElementById('detailAdAccount').textContent = order.ad_account;
        document.getElementById('detailReceiverName').textContent = receiveInfo.receiver_name || '-';
        document.getElementById('detailReceiverAccount').textContent = receiveInfo.receiver_account || '-';
        document.getElementById('detailCreatedAt').textContent = this.formatDateTime(order.created_at);
        
        const statusElement = document.getElementById('detailStatus');
        statusElement.textContent = this.getStatusText(order.status);
        statusElement.className = `status ${order.status}`;

        // Remark
        document.getElementById('detailRemark').textContent = order.remark || '无备注';

        // Voucher
        this.renderVoucherPreview(order.voucher_url);
    }

    renderVoucherPreview(voucherUrl) {
        const voucherPreview = document.getElementById('voucherPreview');
        this.currentVoucherUrl = voucherUrl;

        if (!voucherUrl) {
            voucherPreview.innerHTML = '<p style="color: #6c757d;">暂无付款凭证</p>';
            return;
        }

        const fileExtension = voucherUrl.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            voucherPreview.innerHTML = `<img src="${voucherUrl}" alt="付款凭证" onerror="this.src='/static/images/image-error.png'">`;
        } else if (fileExtension === 'pdf') {
            voucherPreview.innerHTML = `<iframe src="${voucherUrl}" type="application/pdf"></iframe>`;
        } else {
            voucherPreview.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p>无法预览此文件类型</p>
                    <button class="btn btn-secondary" onclick="app.downloadVoucher()">下载查看</button>
                </div>
            `;
        }
    }

    previewVoucher(voucherUrl) {
        this.currentVoucherUrl = voucherUrl;
        window.open(voucherUrl, '_blank');
    }

    downloadVoucher() {
        if (this.currentVoucherUrl) {
            const link = document.createElement('a');
            link.href = this.currentVoucherUrl;
            link.download = '';
            link.click();
        }
    }

    openVoucherInNewTab() {
        if (this.currentVoucherUrl) {
            window.open(this.currentVoucherUrl, '_blank');
        }
    }

    async quickApprove(orderId) {
        if (!confirm('确认通过此充值订单？')) {
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${orderId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    remark: '快速审核通过'
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('订单审核通过');
                this.loadOrders();
                this.loadStatistics();
            } else {
                this.showError(result.error || '审核失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Quick approve error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async quickReject(orderId) {
        const reason = prompt('请输入拒绝原因：');
        if (!reason || !reason.trim()) {
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${orderId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason.trim()
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('订单已拒绝');
                this.loadOrders();
                this.loadStatistics();
            } else {
                this.showError(result.error || '拒绝失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Quick reject error:', error);
        } finally {
            this.hideLoading();
        }
    }

    showApproveModal() {
        this.showModal('approveModal');
    }

    closeApproveModal() {
        this.hideModal('approveModal');
        document.getElementById('approveRemark').value = '';
    }

    async confirmApprove() {
        if (!this.currentOrder) return;

        const remark = document.getElementById('approveRemark').value.trim();
        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${this.currentOrder.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    remark: remark || '财务审核通过'
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('订单审核通过');
                this.closeApproveModal();
                this.closeOrderDetailModal();
                this.loadOrders();
                this.loadStatistics();
            } else {
                this.showError(result.error || '审核失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Confirm approve error:', error);
        } finally {
            this.hideLoading();
        }
    }

    showRejectModal() {
        this.showModal('rejectModal');
    }

    closeRejectModal() {
        this.hideModal('rejectModal');
        document.getElementById('rejectReason').value = '';
    }

    async confirmReject() {
        if (!this.currentOrder) return;

        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) {
            this.showError('请输入拒绝原因');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${this.currentOrder.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('订单已拒绝');
                this.closeRejectModal();
                this.closeOrderDetailModal();
                this.loadOrders();
                this.loadStatistics();
            } else {
                this.showError(result.error || '拒绝失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Confirm reject error:', error);
        } finally {
            this.hideLoading();
        }
    }

    showRefundModal() {
        this.showModal('refundModal');
    }

    closeRefundModal() {
        this.hideModal('refundModal');
        document.getElementById('refundReason').value = '';
    }

    async confirmRefund() {
        if (!this.currentOrder) return;

        const reason = document.getElementById('refundReason').value.trim();
        if (!reason) {
            this.showError('请输入退款原因');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/recharge/${this.currentOrder.id}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('退款处理成功');
                this.closeRefundModal();
                this.closeOrderDetailModal();
                this.loadOrders();
                this.loadStatistics();
            } else {
                this.showError(result.error || '退款处理失败');
            }
        } catch (error) {
            this.showError('网络错误，请稍后重试');
            console.error('Confirm refund error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async batchApprove() {
        if (this.selectedOrders.size === 0) {
            this.showError('请选择要批量通过的订单');
            return;
        }

        if (!confirm(`确认批量通过 ${this.selectedOrders.size} 个订单？`)) {
            return;
        }

        this.showLoading();

        try {
            const promises = Array.from(this.selectedOrders).map(orderId =>
                fetch(`/api/v1/recharge/${orderId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        remark: '批量审核通过'
                    })
                })
            );

            const results = await Promise.allSettled(promises);
            const successCount = results.filter(result => result.status === 'fulfilled').length;

            this.showSuccess(`批量操作完成，成功处理 ${successCount} 个订单`);
            this.selectedOrders.clear();
            this.loadOrders();
            this.loadStatistics();
        } catch (error) {
            this.showError('批量操作失败');
            console.error('Batch approve error:', error);
        } finally {
            this.hideLoading();
        }
    }

    // Utility methods
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待付款',
            'paid': '待审核',
            'confirmed': '已确认',
            'completed': '已完成',
            'cancelled': '已取消',
            'refunded': '已退款',
            'failed': '失败'
        };
        return statusMap[status] || status;
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    closeOrderDetailModal() {
        this.hideModal('orderDetailModal');
        this.currentOrder = null;
        this.currentVoucherUrl = null;
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showSuccess(message) {
        this.showToast('successToast', message);
    }

    showError(message) {
        this.showToast('errorToast', message);
    }

    showToast(toastId, message) {
        const toast = document.getElementById(toastId);
        const messageElement = toast.querySelector('.toast-message');
        messageElement.textContent = message;
        toast.style.display = 'block';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // Navigation methods
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadOrders();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadOrders();
        }
    }

    refreshOrders() {
        this.selectedOrders.clear();
        this.loadOrders();
        this.loadStatistics();
    }
}

// Global functions
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.order-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        app.handleOrderSelection(checkbox.value, checkbox.checked);
    });
}

function resetFilters() {
    document.getElementById('filterForm').reset();
    document.getElementById('paymentType').value = 'private';
    document.getElementById('dateRange').value = 'week';
    document.getElementById('customDateGroup').style.display = 'none';
    document.getElementById('customDateGroup2').style.display = 'none';
    app.handleDateRangeChange('week');
    app.currentPage = 1;
    app.loadOrders();
}

function previousPage() {
    app.previousPage();
}

function nextPage() {
    app.nextPage();
}

function refreshOrders() {
    app.refreshOrders();
}

function batchApprove() {
    app.batchApprove();
}

function closeOrderDetailModal() {
    app.closeOrderDetailModal();
}

function showApproveModal() {
    app.showApproveModal();
}

function closeApproveModal() {
    app.closeApproveModal();
}

function confirmApprove() {
    app.confirmApprove();
}

function showRejectModal() {
    app.showRejectModal();
}

function closeRejectModal() {
    app.closeRejectModal();
}

function confirmReject() {
    app.confirmReject();
}

function showRefundModal() {
    app.showRefundModal();
}

function closeRefundModal() {
    app.closeRefundModal();
}

function confirmRefund() {
    app.confirmRefund();
}

function downloadVoucher() {
    app.downloadVoucher();
}

function openVoucherInNewTab() {
    app.openVoucherInNewTab();
}

// Initialize the application
const app = new FinancialAuditApp();