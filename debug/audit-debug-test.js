/**
 * 审核页面调试测试脚本
 * 在浏览器控制台运行，检查数据加载问题
 */

console.log('🔍 审核页面调试测试开始...');

// 延迟执行以等待页面加载
setTimeout(() => {
    console.log('📋 检查页面元素和数据...');
    
    // 检查关键DOM元素
    const checks = [
        { name: 'financialAuditTable', element: document.getElementById('financialAuditTable') },
        { name: 'financialAuditTableBody', element: document.getElementById('financialAuditTableBody') },
        { name: 'tableView', element: document.getElementById('tableView') },
        { name: 'cardsView', element: document.getElementById('cardsView') }
    ];
    
    checks.forEach(check => {
        console.log(`${check.element ? '✅' : '❌'} ${check.name}: ${check.element ? '找到' : '未找到'}`);
    });
    
    // 检查财务审核表实例
    if (window.financialAuditTable) {
        console.log('✅ window.financialAuditTable 实例存在');
        console.log('📊 当前数据状态:', {
            originalData: window.financialAuditTable.originalData.length,
            currentData: window.financialAuditTable.currentData.length,
            filteredData: window.financialAuditTable.filteredData.length,
            currentView: window.financialAuditTable.currentView
        });
        
        // 检查表格内容
        const tableRows = document.querySelectorAll('#financialAuditTableBody tr');
        console.log(`📋 表格行数: ${tableRows.length}`);
        
        if (tableRows.length === 0) {
            console.log('⚠️ 表格没有数据行，尝试重新加载...');
            window.financialAuditTable.loadAuditData();
        } else {
            console.log('✅ 表格有数据，检查第一行内容:');
            const firstRow = tableRows[0];
            if (firstRow) {
                const cells = firstRow.querySelectorAll('td');
                console.log(`首行列数: ${cells.length}`);
                console.log('首行内容:', Array.from(cells).map(cell => cell.textContent.trim()));
            }
        }
    } else {
        console.log('❌ window.financialAuditTable 实例不存在');
        console.log('💡 尝试手动创建实例...');
        
        // 检查FinancialAuditTable类是否存在
        if (typeof FinancialAuditTable !== 'undefined') {
            console.log('✅ FinancialAuditTable 类存在，创建实例...');
            window.financialAuditTable = new FinancialAuditTable();
        } else {
            console.log('❌ FinancialAuditTable 类不存在，可能JS文件未加载');
            
            // 检查JS文件加载
            const scripts = Array.from(document.querySelectorAll('script'));
            const auditScript = scripts.find(script => 
                script.src.includes('financial-audit-table.js') || 
                script.textContent.includes('FinancialAuditTable')
            );
            
            console.log(auditScript ? '✅ 财务审核JS文件已加载' : '❌ 财务审核JS文件未加载');
        }
    }
    
    // 检查控制台错误
    console.log('🐛 请检查浏览器控制台是否有JavaScript错误');
    
    // 提供手动测试方法
    console.log('\\n🔧 手动测试方法:');
    console.log('1. 重新加载数据: window.financialAuditTable?.loadAuditData()');
    console.log('2. 生成测试数据: window.financialAuditTable?.generateMockAuditData()');
    console.log('3. 手动渲染: window.financialAuditTable?.renderTableData(testData)');
    
}, 3000);

console.log('⏳ 3秒后开始检查...');