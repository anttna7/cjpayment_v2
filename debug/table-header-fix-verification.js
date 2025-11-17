/**
 * 表格操作列固定效果验证脚本
 * 验证表头和表体操作列是否正确固定在右侧
 */

console.log('🔍 开始验证操作列固定效果...');

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

// 检查CSS属性
function checkStickyProperties(element, expectedRight = '0px') {
    const styles = window.getComputedStyle(element);
    return {
        position: styles.position,
        right: styles.right,
        zIndex: styles.zIndex,
        background: styles.background || styles.backgroundColor,
        isSticky: styles.position === 'sticky',
        isRightFixed: styles.right === expectedRight
    };
}

// 验证表头操作列
async function verifyHeaderActionColumn() {
    console.log('📋 验证表头操作列...');
    
    try {
        const headerActionColumn = await waitForElement('.table-header th.col-actions.col-fixed');
        const properties = checkStickyProperties(headerActionColumn);
        
        console.log('表头操作列样式:', properties);
        
        const isValid = properties.isSticky && properties.isRightFixed;
        console.log(isValid ? '✅ 表头操作列固定正常' : '❌ 表头操作列固定异常');
        
        return isValid;
    } catch (error) {
        console.error('❌ 表头操作列验证失败:', error.message);
        return false;
    }
}

// 验证表体操作列
async function verifyBodyActionColumn() {
    console.log('📊 验证表体操作列...');
    
    try {
        // 等待表格数据加载
        await waitForElement('#merchantTableBody tr');
        const bodyActionColumn = await waitForElement('#merchantTableBody td.col-actions.col-fixed');
        const properties = checkStickyProperties(bodyActionColumn);
        
        console.log('表体操作列样式:', properties);
        
        const isValid = properties.isSticky && properties.isRightFixed;
        console.log(isValid ? '✅ 表体操作列固定正常' : '❌ 表体操作列固定异常');
        
        return isValid;
    } catch (error) {
        console.error('❌ 表体操作列验证失败:', error.message);
        return false;
    }
}

// 验证序号列固定
async function verifyIndexColumn() {
    console.log('🔢 验证序号列固定...');
    
    try {
        const headerIndexColumn = await waitForElement('.table-header th.col-index.col-fixed');
        const headerProperties = checkStickyProperties(headerIndexColumn, '0px');
        
        const bodyIndexColumn = await waitForElement('#merchantTableBody td.col-index.col-fixed');
        const bodyProperties = checkStickyProperties(bodyIndexColumn, '0px');
        
        console.log('序号列表头样式:', headerProperties);
        console.log('序号列表体样式:', bodyProperties);
        
        const isValid = headerProperties.isSticky && 
                       bodyProperties.isSticky && 
                       headerProperties.right === '0px' && 
                       bodyProperties.right === '0px';
        
        console.log(isValid ? '✅ 序号列固定正常' : '❌ 序号列固定异常');
        
        return isValid;
    } catch (error) {
        console.error('❌ 序号列验证失败:', error.message);
        return false;
    }
}

// 测试滚动效果
async function testScrollEffect() {
    console.log('🖱️ 测试滚动效果...');
    
    try {
        const tableWrapper = await waitForElement('.table-wrapper');
        
        // 记录初始位置
        const actionColumn = await waitForElement('#merchantTableBody td.col-actions.col-fixed');
        const indexColumn = await waitForElement('#merchantTableBody td.col-index.col-fixed');
        
        const initialActionRect = actionColumn.getBoundingClientRect();
        const initialIndexRect = indexColumn.getBoundingClientRect();
        
        console.log('初始位置 - 操作列:', initialActionRect.right, '序号列:', initialIndexRect.left);
        
        // 模拟水平滚动
        tableWrapper.scrollLeft = 200;
        
        // 等待滚动完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const scrolledActionRect = actionColumn.getBoundingClientRect();
        const scrolledIndexRect = indexColumn.getBoundingClientRect();
        
        console.log('滚动后位置 - 操作列:', scrolledActionRect.right, '序号列:', scrolledIndexRect.left);
        
        // 检查固定列位置是否保持不变（允许1px误差）
        const actionStayFixed = Math.abs(initialActionRect.right - scrolledActionRect.right) <= 1;
        const indexStayFixed = Math.abs(initialIndexRect.left - scrolledIndexRect.left) <= 1;
        
        console.log(actionStayFixed ? '✅ 操作列滚动时保持固定' : '❌ 操作列跟随滚动');
        console.log(indexStayFixed ? '✅ 序号列滚动时保持固定' : '❌ 序号列跟随滚动');
        
        // 重置滚动位置
        tableWrapper.scrollLeft = 0;
        
        return actionStayFixed && indexStayFixed;
    } catch (error) {
        console.error('❌ 滚动效果测试失败:', error.message);
        return false;
    }
}

// 运行所有验证
async function runAllVerifications() {
    console.log('🚀 开始完整验证...');
    
    // 等待页面加载完成
    if (document.readyState !== 'complete') {
        await new Promise(resolve => window.addEventListener('load', resolve));
    }
    
    // 等待一下表格渲染
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = {
        headerAction: await verifyHeaderActionColumn(),
        bodyAction: await verifyBodyActionColumn(), 
        indexColumn: await verifyIndexColumn(),
        scrollEffect: await testScrollEffect()
    };
    
    console.log('📊 验证结果汇总:', results);
    
    const passedCount = Object.values(results).filter(result => result).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`🎯 验证完成: ${passedCount}/${totalCount} 项通过`);
    
    if (passedCount === totalCount) {
        console.log('🎉 所有验证通过！操作列固定效果正常');
    } else {
        console.log('⚠️ 部分验证失败，需要检查CSS样式');
    }
    
    return results;
}

// 自动运行验证
if (typeof window !== 'undefined') {
    // 延迟执行，确保页面完全加载
    setTimeout(() => {
        runAllVerifications().catch(console.error);
    }, 2000);
}

// 导出函数供外部调用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verifyHeaderActionColumn,
        verifyBodyActionColumn,
        verifyIndexColumn,
        testScrollEffect,
        runAllVerifications
    };
}