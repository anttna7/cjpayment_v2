/**
 * 商户模态框功能测试脚本
 * 测试详情、编辑、轮询三个模态框的完整功能
 */

console.log('🧪 开始商户模态框功能测试...');

// 测试数据
const testMerchantId = 'M001';

// 等待页面加载完成
function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// 等待元素出现
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`元素 ${selector} 未找到`));
        }, timeout);
    });
}

// 测试操作列固定功能
async function testFixedActionColumn() {
    console.log('📌 测试操作列固定功能...');
    
    try {
        const tableWrapper = await waitForElement('.table-wrapper');
        const actionColumn = await waitForElement('.col-actions');
        
        // 检查操作列是否有正确的样式
        const styles = window.getComputedStyle(actionColumn);
        const isSticky = styles.position === 'sticky';
        const rightValue = styles.right;
        
        console.log('✅ 操作列固定测试:', {
            isSticky,
            rightValue,
            zIndex: styles.zIndex
        });
        
        return isSticky && rightValue === '0px';
    } catch (error) {
        console.error('❌ 操作列固定测试失败:', error.message);
        return false;
    }
}

// 测试商户详情模态框
async function testMerchantDetailsModal() {
    console.log('👁️ 测试商户详情模态框...');
    
    try {
        // 点击详情按钮
        const detailsBtn = document.querySelector(`[onclick="viewMerchantDetails('${testMerchantId}')"]`);
        if (!detailsBtn) {
            console.log('⚠️ 详情按钮未找到，模拟调用函数');
            if (typeof viewMerchantDetails === 'function') {
                viewMerchantDetails(testMerchantId);
            } else {
                throw new Error('viewMerchantDetails 函数不存在');
            }
        } else {
            detailsBtn.click();
        }
        
        // 等待模态框出现
        const modal = await waitForElement('#merchantDetailsModal.active', 3000);
        console.log('✅ 详情模态框已打开');
        
        // 等待内容加载
        await waitForElement('.merchant-details .detail-group', 2000);
        console.log('✅ 详情内容已加载');
        
        // 测试关闭功能
        setTimeout(() => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.click();
                console.log('✅ 详情模态框关闭测试完成');
            }
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('❌ 详情模态框测试失败:', error.message);
        return false;
    }
}

// 测试商户编辑模态框
async function testMerchantEditModal() {
    console.log('✏️ 测试商户编辑模态框...');
    
    try {
        // 等待上个模态框关闭
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 点击编辑按钮
        const editBtn = document.querySelector(`[onclick="editMerchant('${testMerchantId}')"]`);
        if (!editBtn) {
            console.log('⚠️ 编辑按钮未找到，模拟调用函数');
            if (typeof editMerchant === 'function') {
                editMerchant(testMerchantId);
            } else {
                throw new Error('editMerchant 函数不存在');
            }
        } else {
            editBtn.click();
        }
        
        // 等待模态框出现
        const modal = await waitForElement('#merchantEditModal.active', 3000);
        console.log('✅ 编辑模态框已打开');
        
        // 等待表单加载
        await waitForElement('#merchantEditForm', 2000);
        console.log('✅ 编辑表单已加载');
        
        // 测试表单填充
        const merchantNameInput = modal.querySelector('#editMerchantName');
        if (merchantNameInput && merchantNameInput.value) {
            console.log('✅ 表单数据填充正常:', merchantNameInput.value);
        }
        
        // 测试关闭功能
        setTimeout(() => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.click();
                console.log('✅ 编辑模态框关闭测试完成');
            }
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('❌ 编辑模态框测试失败:', error.message);
        return false;
    }
}

// 测试轮询配置模态框
async function testMerchantPollingModal() {
    console.log('⚙️ 测试轮询配置模态框...');
    
    try {
        // 等待上个模态框关闭
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 点击轮询按钮
        const pollingBtn = document.querySelector(`[onclick="configureMerchantPolling('${testMerchantId}')"]`);
        if (!pollingBtn) {
            console.log('⚠️ 轮询按钮未找到，模拟调用函数');
            if (typeof configureMerchantPolling === 'function') {
                configureMerchantPolling(testMerchantId);
            } else {
                throw new Error('configureMerchantPolling 函数不存在');
            }
        } else {
            pollingBtn.click();
        }
        
        // 等待模态框出现
        const modal = await waitForElement('#merchantPollingModal.active', 3000);
        console.log('✅ 轮询模态框已打开');
        
        // 等待配置项加载
        await waitForElement('.polling-config', 2000);
        console.log('✅ 轮询配置已加载');
        
        // 测试轮询开关
        const toggleSwitch = modal.querySelector('#pollingEnabled');
        if (toggleSwitch) {
            const initialState = toggleSwitch.checked;
            toggleSwitch.click();
            
            setTimeout(() => {
                const newState = toggleSwitch.checked;
                console.log('✅ 轮询开关测试:', { initialState, newState, changed: initialState !== newState });
            }, 500);
        }
        
        // 测试连接测试功能
        setTimeout(() => {
            const testBtn = modal.querySelector('[onclick="testPollingConnection()"]');
            if (testBtn) {
                testBtn.click();
                console.log('✅ 连接测试功能已触发');
            }
        }, 1000);
        
        // 测试关闭功能
        setTimeout(() => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.click();
                console.log('✅ 轮询模态框关闭测试完成');
            }
        }, 3000);
        
        return true;
    } catch (error) {
        console.error('❌ 轮询模态框测试失败:', error.message);
        return false;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始完整功能测试...');
    
    await waitForPageLoad();
    
    const results = {
        fixedColumn: await testFixedActionColumn(),
        detailsModal: await testMerchantDetailsModal(),
        editModal: await testMerchantEditModal(),
        pollingModal: await testMerchantPollingModal()
    };
    
    // 等待所有模态框动画完成
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('📊 测试结果汇总:', results);
    
    const passedTests = Object.values(results).filter(result => result).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`🎯 测试完成: ${passedTests}/${totalTests} 项通过`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有测试通过！商户模态框功能正常');
    } else {
        console.log('⚠️ 部分测试失败，请检查相关功能');
    }
    
    return results;
}

// 如果在浏览器环境中直接运行
if (typeof window !== 'undefined') {
    runAllTests().catch(console.error);
}

// 导出给外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testFixedActionColumn,
        testMerchantDetailsModal,
        testMerchantEditModal,
        testMerchantPollingModal,
        runAllTests
    };
}