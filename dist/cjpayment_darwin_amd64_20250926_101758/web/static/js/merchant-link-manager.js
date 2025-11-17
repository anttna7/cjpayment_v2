/**
 * 商户链接管理器
 */
class MerchantLinkManager {
    constructor() {
        this.linkAPI = window.MerchantLinkAPI;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // 监听生成链接按钮点击事件
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'generateLinkBtn') {
                this.handleGenerateLink();
            }
        });
    }

    async handleGenerateLink() {
        try {
            // 收集表单数据
            const merchantData = this.collectLinkFormData();
            
            if (!this.validateLinkData(merchantData)) {
                return;
            }

            // 显示加载状态
            this.setLoadingState(true);

            // 生成链接
            const result = await this.linkAPI.generateRechargeLink(merchantData);

            if (result.success) {
                this.displayGeneratedLink(result.data);
                this.showToast('充值链接生成成功', 'success');
            } else {
                this.showToast(result.message || '生成链接失败', 'error');
            }
        } catch (error) {
            console.error('生成链接过程失败:', error);
            this.showToast('生成链接失败', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    collectLinkFormData() {
        return {
            merchantId: document.getElementById('merchantId')?.value || '',
            merchantName: document.getElementById('merchantName')?.value || '',
            utmSource: document.getElementById('linkUtmSource')?.value || 'merchant_portal',
            utmMedium: document.getElementById('linkUtmMedium')?.value || 'link',
            reference: document.getElementById('linkReference')?.value || '',
            generateShortUrl: document.getElementById('generateShortUrl')?.checked || true
        };
    }

    validateLinkData(data) {
        if (!data.merchantId) {
            this.showToast('请先填写商户ID', 'error');
            return false;
        }
        if (!data.merchantName) {
            this.showToast('请先填写商户名称', 'error');
            return false;
        }
        return true;
    }

    displayGeneratedLink(linkData) {
        // 如果有链接显示区域，更新内容
        const linkDisplay = document.getElementById('generatedLinkDisplay');
        if (linkDisplay) {
            linkDisplay.innerHTML = `
                <div class="generated-link-result">
                    <h4>生成的充值链接</h4>
                    <div class="link-item">
                        <label>完整链接:</label>
                        <input type="text" readonly value="${linkData.fullLink}" class="form-input">
                        <button type="button" onclick="navigator.clipboard.writeText('${linkData.fullLink}')">复制</button>
                    </div>
                    <div class="link-item">
                        <label>短链接:</label>
                        <input type="text" readonly value="${linkData.shortLink}" class="form-input">
                        <button type="button" onclick="navigator.clipboard.writeText('${linkData.shortLink}')">复制</button>
                    </div>
                </div>
            `;
        }
    }

    setLoadingState(loading) {
        const btn = document.getElementById('generateLinkBtn');
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? '生成中...' : '生成充值链接';
        }
    }

    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            alert(message);
        }
    }
}

// 初始化链接管理器
document.addEventListener('DOMContentLoaded', () => {
    if (window.MerchantLinkAPI) {
        window.merchantLinkManager = new MerchantLinkManager();
    }
});