/**
 * 快速模态框测试脚本
 * 验证数据修复后模态框是否能正常弹出
 */

console.log('⚡ 快速模态框测试启动...');

// 等待页面和数据加载
setTimeout(() => {
    console.log('🔍 开始模态框测试...');
    
    // 检查数据管理器
    if (window.merchantDataManager && window.merchantDataManager.merchants) {
        const merchants = window.merchantDataManager.merchants;
        console.log(`✅ 找到 ${merchants.length} 个商户`);
        
        if (merchants.length > 0) {
            const testId = merchants[0].id;
            console.log(`🧪 使用测试ID: ${testId}`);
            
            // 测试数据获取
            const merchant = window.merchantDataManager.getMerchantById(testId);
            if (merchant) {
                console.log(`✅ 数据获取成功: ${merchant.name}`);
                
                // 测试详情模态框
                console.log('🔄 测试详情模态框...');
                try {
                    viewMerchantDetails(testId);
                    
                    setTimeout(() => {
                        const modal = document.getElementById('merchantDetailsModal');
                        if (modal && window.getComputedStyle(modal).display !== 'none') {
                            console.log('🎉 详情模态框显示成功！');
                            hideModal('merchantDetailsModal');
                            
                            // 测试编辑模态框
                            setTimeout(() => {
                                console.log('🔄 测试编辑模态框...');
                                editMerchant(testId);
                                
                                setTimeout(() => {
                                    const editModal = document.getElementById('merchantEditModal');
                                    if (editModal && window.getComputedStyle(editModal).display !== 'none') {
                                        console.log('🎉 编辑模态框显示成功！');
                                        hideModal('merchantEditModal');
                                        
                                        // 显示成功提示
                                        if (typeof showToast === 'function') {
                                            showToast('🎉 所有模态框测试通过！', 'success');
                                        }
                                    } else {
                                        console.log('❌ 编辑模态框未显示');
                                    }
                                }, 300);
                            }, 300);
                        } else {
                            console.log('❌ 详情模态框未显示');
                        }
                    }, 300);
                    
                } catch (error) {
                    console.log('❌ 测试异常:', error.message);
                }
            } else {
                console.log('❌ 数据获取失败');
            }
        } else {
            console.log('❌ 没有商户数据');
        }
    } else {
        console.log('❌ 商户数据管理器未初始化');
    }
}, 3000);

console.log('⏳ 等待3秒后开始测试...');