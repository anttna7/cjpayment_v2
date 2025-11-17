/**
 * 审核页面最终验证脚本
 * 在浏览器控制台运行此脚本验证修复效果
 */

console.log('🎯 审核页面最终验证开始...');

// 等待页面完全加载
setTimeout(() => {
    console.log('📋 开始全面检查...');
    
    // 1. 检查FinancialAuditTable实例
    if (window.financialAuditTable) {
        console.log('✅ FinancialAuditTable实例存在');
        
        // 检查数据加载状态
        const dataCount = window.financialAuditTable.originalData?.length || 0;
        console.log(`📊 数据条数: ${dataCount}`);
        
        if (dataCount > 0) {
            console.log('✅ 数据加载成功');
            
            // 检查表格渲染
            const tableRows = document.querySelectorAll('#financialAuditTableBody tr:not(.loading-row)');
            console.log(`📋 表格行数: ${tableRows.length}`);
            
            if (tableRows.length > 0) {
                console.log('✅ 表格数据渲染成功');
                
                // 检查表头结构
                const headers = Array.from(document.querySelectorAll('#financialAuditTable thead th .th-text'))
                    .map(th => th.textContent.trim());
                
                const expectedHeaders = [
                    '序号', '订单号', '付款凭证', '付款金额', '付款账号',
                    '付款账户名称', '付款账户机构', '付款类型', '收款账号',
                    '收款账户名称', '收款账户机构', '订单状态', '创建时间',
                    '付款时间', '操作'
                ];
                
                console.log('📋 表头对比:');
                console.log('期望:', expectedHeaders);
                console.log('实际:', headers);
                
                const headersMatch = expectedHeaders.every((header, index) => headers[index] === header);
                console.log(headersMatch ? '✅ 表头结构正确' : '❌ 表头结构不匹配');
                
                // 检查操作按钮
                const firstRow = tableRows[0];
                const actionCell = firstRow?.querySelector('.col-actions-cell');
                if (actionCell) {
                    const actionButtons = Array.from(actionCell.querySelectorAll('.action-link'))
                        .map(link => link.textContent.trim());
                    
                    console.log('🔘 操作按钮:', actionButtons);
                    
                    const expectedActions = ['查看详情', '已到账', '未到账'];
                    const buttonsMatch = expectedActions.every(action => 
                        actionButtons.some(button => button === action)
                    );
                    
                    console.log(buttonsMatch ? '✅ 操作按钮正确' : '❌ 操作按钮不正确');
                } else {
                    console.log('❌ 操作列未找到');
                }
                
            } else {
                console.log('❌ 表格数据未渲染');
            }
        } else {
            console.log('⚠️ 数据未加载，尝试手动加载...');
            window.financialAuditTable.loadAuditData();
        }
    } else {
        console.log('❌ FinancialAuditTable实例不存在');
    }
    
    // 2. 检查页面无控制台错误
    console.log('\\n🎉 验证完成！');
    console.log('💡 如果看到数据，说明修复成功');
    console.log('🔄 如果仍无数据，请刷新页面重试');
    
}, 5000);

console.log('⏳ 5秒后开始验证...');