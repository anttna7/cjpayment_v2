
/**
 * 模态框修复脚本
 * 确保所有模态框正常工作
 */

// 全局模态框管理器
window.ModalManager = {
    // 显示添加商户模态框
    showAddMerchant: function() {
        const modal = document.getElementById('addMerchantModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log('✅ 添加商户模态框已显示');
        } else {
            console.error('❌ 找不到添加商户模态框元素');
        }
    },
    
    // 隐藏模态框
    hideModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    }
};

// 重写addMerchant全局函数
window.addMerchant = function() {
    window.ModalManager.showAddMerchant();
};

// 页面加载完成后执行检查
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 模态框修复脚本已加载');
    
    // 检查模态框元素
    const modal = document.getElementById('addMerchantModal');
    if (modal) {
        console.log('✅ 找到添加商户模态框元素');
        
        // 添加关闭按钮事件
        const closeBtn = modal.querySelector('.close, .btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.ModalManager.hideModal('addMerchantModal');
            });
        }
        
        // 点击背景关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.ModalManager.hideModal('addMerchantModal');
            }
        });
    } else {
        console.warn('⚠️ 未找到添加商户模态框元素');
    }
});
