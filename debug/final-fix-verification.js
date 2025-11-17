/**
 * 商户表格操作列固定最终验证脚本
 * 验证复用账户管理页样式后的效果
 */

console.log('🔧 开始最终验证商户表格操作列固定效果...');

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

// 检查元素的sticky定位
function checkStickyPositioning(element) {
    const styles = window.getComputedStyle(element);
    return {
        position: styles.position,
        left: styles.left,
        right: styles.right,
        zIndex: styles.zIndex,
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
        borderLeft: styles.borderLeft,
        borderRight: styles.borderRight
    };
}

// 验证统一表格样式是否加载
async function verifyUnifiedTableStyles() {
    console.log('📋 验证统一表格样式...');
    
    try {
        // 检查是否有统一表格样式类
        const hasUnifiedStyles = document.querySelector('link[href*="table-unified.css"]') !== null;
        console.log('统一表格样式加载:', hasUnifiedStyles ? '✅' : '❌');
        
        return hasUnifiedStyles;
    } catch (error) {
        console.error('❌ 验证统一表格样式失败:', error.message);
        return false;
    }
}

// 验证表头固定列
async function verifyHeaderFixedColumns() {
    console.log('🔍 验证表头固定列...');
    
    try {
        // 检查序号列表头
        const headerSerial = await waitForElement('.col-serial.col-fixed-left');
        const serialStyles = checkStickyPositioning(headerSerial);
        console.log('序号列表头样式:', serialStyles);
        
        // 检查操作列表头  
        const headerActions = await waitForElement('.col-actions.col-fixed-right');
        const actionsStyles = checkStickyPositioning(headerActions);
        console.log('操作列表头样式:', actionsStyles);
        
        const serialValid = serialStyles.position === 'sticky' && serialStyles.left !== 'auto';
        const actionsValid = actionsStyles.position === 'sticky' && actionsStyles.right !== 'auto';
        
        console.log('序号列表头固定:', serialValid ? '✅' : '❌');
        console.log('操作列表头固定:', actionsValid ? '✅' : '❌');
        
        return serialValid && actionsValid;
    } catch (error) {
        console.error('❌ 验证表头固定列失败:', error.message);
        return false;
    }
}

// 验证表体固定列
async function verifyBodyFixedColumns() {
    console.log('📊 验证表体固定列...');
    
    try {
        // 等待表格数据加载
        await waitForElement('#merchantTableBody tr');
        
        // 检查序号列单元格
        const serialCell = await waitForElement('.col-serial-cell');
        const serialStyles = checkStickyPositioning(serialCell);
        console.log('序号列单元格样式:', serialStyles);
        
        // 检查操作列单元格
        const actionsCell = await waitForElement('.col-actions-cell');
        const actionsStyles = checkStickyPositioning(actionsCell);
        console.log('操作列单元格样式:', actionsStyles);
        
        const serialValid = serialStyles.position === 'sticky' && serialStyles.left !== 'auto';
        const actionsValid = actionsStyles.position === 'sticky' && actionsStyles.right !== 'auto';
        
        console.log('序号列单元格固定:', serialValid ? '✅' : '❌');
        console.log('操作列单元格固定:', actionsValid ? '✅' : '❌');
        
        return serialValid && actionsValid;
    } catch (error) {
        console.error('❌ 验证表体固定列失败:', error.message);
        return false;
    }
}

// 验证setupFixedColumns函数是否存在并工作
async function verifySetupFunction() {
    console.log('⚙️ 验证setupFixedColumns函数...');
    
    try {
        const setupExists = typeof setupFixedColumns === 'function';
        console.log('setupFixedColumns函数存在:', setupExists ? '✅' : '❌');
        
        if (setupExists) {
            // 手动调用一次确保工作正常
            setupFixedColumns();
            console.log('✅ setupFixedColumns函数执行成功');
        }
        
        return setupExists;
    } catch (error) {
        console.error('❌ 验证setupFixedColumns函数失败:', error.message);
        return false;
    }
}

// 测试滚动时固定效果
async function testScrollFixedEffect() {
    console.log('🖱️ 测试滚动时固定效果...');
    
    try {
        const tableWrapper = await waitForElement('.table-responsive-wrapper');
        
        // 获取固定列的初始位置
        const serialCell = document.querySelector('.col-serial-cell');
        const actionsCell = document.querySelector('.col-actions-cell');
        
        if (!serialCell || !actionsCell) {
            throw new Error('固定列单元格未找到');
        }
        
        const initialSerialRect = serialCell.getBoundingClientRect();
        const initialActionsRect = actionsCell.getBoundingClientRect();
        
        console.log('滚动前位置 - 序号列:', initialSerialRect.left, '操作列:', initialActionsRect.right);
        
        // 执行水平滚动
        tableWrapper.scrollLeft = 300;
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const scrolledSerialRect = serialCell.getBoundingClientRect();
        const scrolledActionsRect = actionsCell.getBoundingClientRect();
        
        console.log('滚动后位置 - 序号列:', scrolledSerialRect.left, '操作列:', scrolledActionsRect.right);
        
        // 检查位置是否保持不变（允许1px误差）
        const serialFixed = Math.abs(initialSerialRect.left - scrolledSerialRect.left) <= 1;
        const actionsFixed = Math.abs(initialActionsRect.right - scrolledActionsRect.right) <= 1;
        
        console.log('滚动时序号列保持固定:', serialFixed ? '✅' : '❌');
        console.log('滚动时操作列保持固定:', actionsFixed ? '✅' : '❌');
        
        // 重置滚动位置
        tableWrapper.scrollLeft = 0;
        
        return serialFixed && actionsFixed;
    } catch (error) {
        console.error('❌ 测试滚动固定效果失败:', error.message);
        return false;
    }
}

// 验证模态框功能是否仍然正常
async function verifyModalFunctions() {
    console.log('🔧 验证模态框功能...');
    
    try {
        const functionsExist = {
            viewMerchantDetails: typeof viewMerchantDetails === 'function',
            editMerchant: typeof editMerchant === 'function',
            configureMerchantPolling: typeof configureMerchantPolling === 'function'
        };
        
        console.log('模态框函数检查:', functionsExist);
        
        const allExist = Object.values(functionsExist).every(exists => exists);
        console.log('所有模态框函数正常:', allExist ? '✅' : '❌');
        
        return allExist;
    } catch (error) {
        console.error('❌ 验证模态框功能失败:', error.message);
        return false;
    }
}

// 运行完整验证
async function runCompleteVerification() {
    console.log('🚀 开始完整的最终验证...');
    
    // 等待页面加载完成
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }
    
    // 等待表格渲染
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = {
        unifiedStyles: await verifyUnifiedTableStyles(),
        headerFixed: await verifyHeaderFixedColumns(),
        bodyFixed: await verifyBodyFixedColumns(),
        setupFunction: await verifySetupFunction(),
        scrollEffect: await testScrollFixedEffect(),
        modalFunctions: await verifyModalFunctions()
    };
    
    console.log('📊 最终验证结果:', results);
    
    const passedCount = Object.values(results).filter(result => result).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`🎯 验证完成: ${passedCount}/${totalCount} 项通过`);
    
    if (passedCount === totalCount) {
        console.log('🎉 所有验证通过！商户表格操作列固定效果完美！');
        console.log('✨ 修复成功，表头和表体的操作列都已正确固定');
    } else {
        console.log('⚠️ 部分验证失败，需要进一步检查');
        
        // 输出具体的失败项
        Object.entries(results).forEach(([key, passed]) => {
            if (!passed) {
                console.log(`❌ 失败项: ${key}`);
            }
        });
    }
    
    return results;
}

// 自动运行验证
if (typeof window !== 'undefined') {
    setTimeout(() => {
        runCompleteVerification().catch(console.error);
    }, 3000);
}

// 导出供外部调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verifyUnifiedTableStyles,
        verifyHeaderFixedColumns,
        verifyBodyFixedColumns,
        verifySetupFunction,
        testScrollFixedEffect,
        verifyModalFunctions,
        runCompleteVerification
    };
}