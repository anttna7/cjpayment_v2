/**
 * 财务审核表优化手动验证脚本
 * 在浏览器控制台中运行此脚本验证优化效果
 */

console.log('📋 财务审核表优化验证脚本');
console.log('🔍 验证以下优化项目:');
console.log('1. 表头修改为15个新列名');
console.log('2. 移除表头图标，使用纯文字');
console.log('3. 取消卡片视图');
console.log('4. 操作按钮更新为：查看详情、已到账、未到账');
console.log('');

// 验证函数
function verifyOptimization() {
    console.log('🚀 开始验证...');
    
    // 1. 检查表头
    console.log('📋 检查表头结构...');
    const headers = Array.from(document.querySelectorAll('#financialAuditTable thead th .th-text'))
        .map(th => th.textContent.trim());
    
    const expectedHeaders = [
        '序号', '订单号', '付款凭证', '付款金额', '付款账号',
        '付款账户名称', '付款账户机构', '付款类型', '收款账号',
        '收款账户名称', '收款账户机构', '订单状态', '创建时间',
        '付款时间', '操作'
    ];
    
    console.log('期望表头:', expectedHeaders);
    console.log('实际表头:', headers);
    
    const headersMatch = expectedHeaders.every((header, index) => headers[index] === header);
    console.log(headersMatch ? '✅ 表头结构正确' : '❌ 表头结构不匹配');
    
    // 2. 检查表头图标
    const icons = document.querySelectorAll('#financialAuditTable thead .th-icon');
    console.log(icons.length === 0 ? '✅ 表头图标已移除' : `❌ 仍有${icons.length}个图标`);
    
    // 3. 检查卡片视图
    const cardView = document.querySelector('#cardsView');
    const viewControls = document.querySelector('.view-controls');
    const noCardView = !cardView || cardView.innerHTML.includes('已移除');
    const noViewControls = !viewControls || viewControls.innerHTML.includes('移除视图切换');
    
    console.log(noCardView && noViewControls ? '✅ 卡片视图已移除' : '❌ 卡片视图组件仍存在');
    
    // 4. 等待数据加载后检查操作按钮
    setTimeout(() => {
        console.log('🔘 检查操作按钮...');
        const actionCells = document.querySelectorAll('.col-actions-cell');
        
        if (actionCells.length > 0) {
            const firstActionCell = actionCells[0];
            const actionLinks = firstActionCell.querySelectorAll('.action-link');
            const actionTexts = Array.from(actionLinks).map(link => link.textContent.trim());
            
            console.log('操作按钮文本:', actionTexts);
            
            const expectedActions = ['查看详情', '已到账', '未到账'];
            const hasCorrectActions = expectedActions.every(action => 
                actionTexts.some(text => text === action)
            );
            
            console.log(hasCorrectActions ? '✅ 操作按钮正确' : '❌ 操作按钮不正确');
        } else {
            console.log('⏳ 表格数据未加载，请等待数据加载后重新检查');
        }
    }, 2000);
    
    console.log('');
    console.log('🎯 验证完成！');
    console.log('💡 如需重新验证，请调用: verifyOptimization()');
}

// 自动延迟执行
setTimeout(() => {
    verifyOptimization();
}, 3000);

console.log('⏳ 3秒后自动开始验证...');
console.log('💡 也可手动调用: verifyOptimization()');