// Public Recharge Page JavaScript

class PublicRechargeApp {
    constructor() {
        this.currentOrderId = null;
        this.transferStatusInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlParams();
    }

    bindEvents() {
        // Form submission
        document.getElementById('rechargeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRechargeOrder();
        });

        // Merchant name autocomplete
        document.getElementById('merchantName').addEventListener('input', (e) => {
            this.handleMerchantSearch(e.target.value);
        });

        // Bank transfer actions
        document.getElementById('initiateBankTransfer').addEventListener('click', () => {
            this.initiateBankTransfer();
        });

        document.getElementById('checkTransferStatus').addEventListener('click', () => {
            this.checkTransferStatus();
        });

        document.getElementById('syncTransferStatus').addEventListener('click', () => {
            this.syncTransferStatus();
        });

        // Navigation buttons
        document.getElementById('backToStep1').addEventListener('click', () => {
            this.showStep(1);
        });

        document.getElementById('continueToAudit').addEventListener('click', () => {
            this.showStep(3);
        });

        document.getElementById('createNewOrder').addEventListener('click', () => {
            this.resetForm();
            this.showStep(1);
        });

        document.getElementById('viewAuditPage').addEventListener('click', () => {
            window.open('/financial-audit', '_blank');
        });

        // Modal events
        this.bindModalEvents();

        // Click outside suggestions to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-group')) {
                this.hideSuggestions();
            }
        });
    }

    bindModalEvents() {
        // Error modal
        document.getElementById('closeErrorModal').addEventListener('click', () => {
            this.hideModal('errorModal');
        });
        document.getElementById('confirmError').addEventListener('click', () => {
            this.hideModal('errorModal');
        });

        // Success modal
        document.getElementById('closeSuccessModal').addEventListener('click', () => {
            this.hideModal('successModal');
        });
        document.getElementById('confirmSuccess').addEventListener('click', () => {
            this.hideModal('successModal');
        });

        // Click outside modal to close
        document.getElementById('errorModal').addEventListener('click', (e) => {
            if (e.target.id === 'errorModal') {
                this.hideModal('errorModal');
            }
        });
        document.getElementById('successModal').addEventListener('click', (e) => {
            if (e.target.id === 'successModal') {
                this.hideModal('successModal');
            }
        });
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        
        if (orderId) {
            this.currentOrderId = orderId;
            this.loadOrderInfo(orderId);
        }
    }

    async loadOrderInfo(orderId) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/v1/recharge/${orderId}`);
            const data = await response.json();
            
            if (data.success) {
                this.populateOrderInfo(data.data);
                this.showStep(2);
                this.checkTransferStatus();
            } else {
                this.showError('加载订单信息失败');
            }
        } catch (error) {
            console.error('Load order error:', error);
            this.showError('加载订单信息失败');
        } finally {
            this.hideLoading();
        }
    }

    async handleMerchantSearch(keyword) {
        if (keyword.length < 2) {
            this.hideSuggestions();
            return;
        }

        try {
            const response = await fetch(`/api/v1/merchants?search=${encodeURIComponent(keyword)}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                this.showSuggestions(data.data);
            } else {
                this.hideSuggestions();
            }
        } catch (error) {
            console.error('Merchant search error:', error);
            this.hideSuggestions();
        }
    }

    showSuggestions(merchants) {
        const suggestionsDiv = document.getElementById('merchantSuggestions');
        suggestionsDiv.innerHTML = '';
        
        merchants.forEach(merchant => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = merchant.name;
            item.addEventListener('click', () => {
                this.selectMerchant(merchant);
            });
            suggestionsDiv.appendChild(item);
        });
        
        suggestionsDiv.style.display = 'block';
    }

    hideSuggestions() {
        document.getElementById('merchantSuggestions').style.display = 'none';
    }

    selectMerchant(merchant) {
        document.getElementById('merchantName').value = merchant.name;
        document.getElementById('merchantId').value = merchant.id;
        this.hideSuggestions();
    }

    async createRechargeOrder() {
        const formData = new FormData(document.getElementById('rechargeForm'));
        const data = {
            payer_name: formData.get('payer_name'),
            payer_account: formData.get('payer_account'),
            payment_type: 'public',
            amount: parseFloat(formData.get('amount')),
            merchant_id: formData.get('merchant_id'),
            ad_account: formData.get('ad_account'),
            remark: formData.get('remark') || null
        };

        // Validation
        if (!data.merchant_id) {
            this.showError('请选择有效的商户');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch('/api/v1/recharge/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentOrderId = result.data.id;
                this.populateOrderInfo(result.data);
                await this.loadReceiveInfo(result.data.id);
                this.showStep(2);
                this.showSuccess('充值订单创建成功');
            } else {
                this.showError(result.error || '创建订单失败');
            }
        } catch (error) {
            console.error('Create order error:', error);
            this.showError('创建订单失败');
        } finally {
            this.hideLoading();
        }
    }

    async loadReceiveInfo(orderId) {
        try {
            const response = await fetch(`/api/v1/recharge/${orderId}/receive-info`);
            const data = await response.json();
            
            if (data.success) {
                this.populateReceiveInfo(data.data);
            } else {
                this.showError('获取收款信息失败');
            }
        } catch (error) {
            console.error('Load receive info error:', error);
            this.showError('获取收款信息失败');
        }
    }

    populateOrderInfo(order) {
        document.getElementById('orderNumber').textContent = order.order_number;
        document.getElementById('orderAmount').textContent = `¥${order.amount}`;
        document.getElementById('orderPayerName').textContent = order.payer_name;
        document.getElementById('orderPayerAccount').textContent = order.payer_account;
    }

    populateReceiveInfo(info) {
        document.getElementById('receiverName').textContent = info.receiver_name;
        document.getElementById('receiverAccount').textContent = info.receiver_account;
        document.getElementById('bankName').textContent = info.bank_name || '未指定';
        document.getElementById('bankBranch').textContent = info.bank_branch || '未指定';
    }

    async initiateBankTransfer() {
        if (!this.currentOrderId) {
            this.showError('订单信息不存在');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/v1/recharge/${this.currentOrderId}/initiate-bank-transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayTransferInfo(data.data);
                this.showSuccess('银行转账已发起');
                this.startStatusPolling();
            } else {
                this.showError(data.error || '发起银行转账失败');
            }
        } catch (error) {
            console.error('Initiate bank transfer error:', error);
            this.showError('发起银行转账失败');
        } finally {
            this.hideLoading();
        }
    }

    displayTransferInfo(transferData) {
        document.getElementById('transferId').textContent = transferData.transfer_id;
        document.getElementById('bankReference').textContent = transferData.bank_reference;
        document.getElementById('transferStatusText').textContent = this.getStatusText(transferData.status);
        document.getElementById('expiresAt').textContent = new Date(transferData.expires_at).toLocaleString();
        
        if (transferData.transfer_url) {
            document.getElementById('transferUrl').href = transferData.transfer_url;
            document.getElementById('transferUrlSection').style.display = 'block';
        }
        
        document.getElementById('transferInfo').style.display = 'block';
        document.getElementById('initiateBankTransfer').style.display = 'none';
        document.getElementById('checkTransferStatus').style.display = 'inline-block';
        document.getElementById('syncTransferStatus').style.display = 'inline-block';
        
        this.updateTransferStatus(transferData.status);
    }

    async checkTransferStatus() {
        if (!this.currentOrderId) {
            this.showError('订单信息不存在');
            return;
        }

        try {
            const response = await fetch(`/api/v1/recharge/${this.currentOrderId}/bank-transfer-status`);
            const data = await response.json();
            
            if (data.success) {
                this.updateTransferStatusDisplay(data.data);
            } else {
                this.showError('查询转账状态失败');
            }
        } catch (error) {
            console.error('Check transfer status error:', error);
            this.showError('查询转账状态失败');
        }
    }

    async syncTransferStatus() {
        if (!this.currentOrderId) {
            this.showError('订单信息不存在');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(`/api/v1/recharge/${this.currentOrderId}/sync-bank-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateTransferStatusDisplay(data.data);
                this.showSuccess('转账状态已同步');
            } else {
                this.showError('同步转账状态失败');
            }
        } catch (error) {
            console.error('Sync transfer status error:', error);
            this.showError('同步转账状态失败');
        } finally {
            this.hideLoading();
        }
    }

    updateTransferStatusDisplay(statusData) {
        document.getElementById('transferStatusText').textContent = this.getStatusText(statusData.status);
        this.updateTransferStatus(statusData.status);
        
        if (statusData.bank_reference) {
            document.getElementById('bankReference').textContent = statusData.bank_reference;
        }
    }

    updateTransferStatus(status) {
        const statusIndicator = document.getElementById('transferStatus').querySelector('.status-indicator');
        const statusText = statusIndicator.querySelector('.status-text');
        
        // Remove all status classes
        statusIndicator.classList.remove('pending', 'success', 'failed', 'expired');
        
        switch (status) {
            case 'pending':
                statusIndicator.classList.add('pending');
                statusText.textContent = '等待银行转账';
                break;
            case 'success':
                statusIndicator.classList.add('success');
                statusText.textContent = '转账成功';
                document.getElementById('continueToAudit').style.display = 'inline-block';
                this.stopStatusPolling();
                break;
            case 'failed':
                statusIndicator.classList.add('failed');
                statusText.textContent = '转账失败';
                this.stopStatusPolling();
                break;
            case 'expired':
                statusIndicator.classList.add('expired');
                statusText.textContent = '转账已过期';
                this.stopStatusPolling();
                break;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '等待中',
            'success': '成功',
            'failed': '失败',
            'expired': '已过期',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    startStatusPolling() {
        // Poll every 10 seconds
        this.transferStatusInterval = setInterval(() => {
            this.checkTransferStatus();
        }, 10000);
    }

    stopStatusPolling() {
        if (this.transferStatusInterval) {
            clearInterval(this.transferStatusInterval);
            this.transferStatusInterval = null;
        }
    }

    showStep(stepNumber) {
        // Hide all steps
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'none';
        document.getElementById('step3').style.display = 'none';
        
        // Show target step
        document.getElementById(`step${stepNumber}`).style.display = 'block';
        
        // Stop polling when leaving step 2
        if (stepNumber !== 2) {
            this.stopStatusPolling();
        }
    }

    resetForm() {
        document.getElementById('rechargeForm').reset();
        document.getElementById('merchantId').value = '';
        this.currentOrderId = null;
        this.hideSuggestions();
        
        // Reset transfer info
        document.getElementById('transferInfo').style.display = 'none';
        document.getElementById('initiateBankTransfer').style.display = 'inline-block';
        document.getElementById('checkTransferStatus').style.display = 'none';
        document.getElementById('syncTransferStatus').style.display = 'none';
        document.getElementById('continueToAudit').style.display = 'none';
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.showModal('errorModal');
    }

    showSuccess(message) {
        document.getElementById('successMessage').textContent = message;
        this.showModal('successModal');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PublicRechargeApp();
});