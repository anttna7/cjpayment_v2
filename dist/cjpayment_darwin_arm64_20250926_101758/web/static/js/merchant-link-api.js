/**
 * 商户链接管理API
 */
class MerchantLinkAPI {
    constructor() {
        this.baseUrl = '/api';
    }

    // 生成充值链接
    async generateRechargeLink(merchantData) {
        try {
            const linkData = {
                merchantId: merchantData.merchantId,
                merchantName: merchantData.merchantName,
                utmSource: merchantData.utmSource || 'merchant_portal',
                utmMedium: merchantData.utmMedium || 'link',
                reference: merchantData.reference || '',
                shortUrl: merchantData.generateShortUrl || true
            };

            // 模拟API调用
            await this.delay(500);
            
            const rechargeLink = `https://pay.cjpayment.com/recharge/${merchantData.merchantId}?utm_source=${linkData.utmSource}&utm_medium=${linkData.utmMedium}`;
            const shortLink = linkData.shortUrl ? `https://cj.pay/${merchantData.merchantId}` : rechargeLink;

            return {
                success: true,
                data: {
                    fullLink: rechargeLink,
                    shortLink: shortLink,
                    qrCode: `data:image/svg+xml;base64,${btoa('<svg>QR Code Placeholder</svg>')}`
                }
            };
        } catch (error) {
            console.error('生成充值链接失败:', error);
            return {
                success: false,
                message: '生成充值链接失败'
            };
        }
    }

    // 工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 全局实例
window.MerchantLinkAPI = new MerchantLinkAPI();