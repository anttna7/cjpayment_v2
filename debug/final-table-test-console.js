// 🔍 高级数据表15列结构完整验证脚本
// 请复制此脚本到浏览器控制台执行

console.log('%c🔍 高级数据表15列结构验证开始...', 'color: #2563eb; font-size: 16px; font-weight: bold;');

function verifyAdvancedDataTable() {
    const timestamp = new Date().toLocaleString('zh-CN');
    console.log(`⏰ 测试时间: ${timestamp}`);
    console.log(`🌐 当前页面: ${window.location.href}`);
    console.log(`📝 页面标题: ${document.title}`);
    
    // 1. 查找高级数据表
    const table = document.querySelector('#advancedDataTable');
    if (!table) {
        console.error('%c❌ 未找到高级数据表 #advancedDataTable', 'color: #dc2626; font-weight: bold;');
        
        // 尝试查找所有表格
        const allTables = document.querySelectorAll('table');
        console.log(`🔍 页面共找到 ${allTables.length} 个表格:`);
        allTables.forEach((t, i) => {
            console.log(`  表格${i+1}: id="${t.id}" class="${t.className}"`);
        });
        return { status: '失败', reason: '未找到表格' };
    }
    
    console.log('%c✅ 找到高级数据表', 'color: #059669; font-weight: bold;');
    
    // 2. 验证表头15列结构
    const headers = table.querySelectorAll('thead th');
    console.log(`📊 表头列数: ${headers.length}`);
    
    const expectedColumns = [
        '序号', '订单号', '付款凭证', '付款金额', '付款账号',
        '付款账户名称', '付款账户机构', '付款类型', '收款账号',
        '收款账户名称', '收款账户机构', '订单状态', '创建时间',
        '付款时间', '审核状态'
    ];
    
    console.log('%c📋 验证15列表头结构:', 'color: #7c3aed; font-weight: bold;');
    let headerMatch = true;
    const headerResults = [];
    
    headers.forEach((header, index) => {
        const text = header.textContent.trim();
        const expected = expectedColumns[index] || `未知列${index + 1}`;
        const isMatch = text.includes(expected) || expected.includes(text);
        
        if (!isMatch) headerMatch = false;
        
        const result = { 
            column: index + 1, 
            actual: text, 
            expected: expected, 
            match: isMatch 
        };
        headerResults.push(result);
        
        console.log(`  第${index + 1}列: "${text}" %c${isMatch ? '✅' : '❌'}%c (期望: "${expected}")`, 
                   isMatch ? 'color: #059669;' : 'color: #dc2626;', 'color: inherit;');
    });
    
    // 3. 表头验证结果
    if (headers.length === 15 && headerMatch) {
        console.log('%c✅ 表头15列结构验证通过!', 'color: #059669; font-size: 14px; font-weight: bold;');
    } else {
        console.warn(`%c⚠️ 表头验证失败 - 列数: ${headers.length}/15, 内容匹配: ${headerMatch}`, 
                    'color: #d97706; font-weight: bold;');
    }
    
    // 4. 验证表格数据
    const tbody = table.querySelector('tbody');
    const dataRows = tbody ? tbody.querySelectorAll('tr:not(.loading-row):not(.empty-row)') : [];
    
    console.log(`%c📊 数据验证:`, 'color: #7c3aed; font-weight: bold;');
    console.log(`  数据行数: ${dataRows.length}`);
    
    let dataValidation = { hasData: false, columnsMatch: false, auditStatusValid: false };
    
    if (dataRows.length > 0) {
        const firstRow = dataRows[0];
        const cells = firstRow.querySelectorAll('td');
        
        console.log(`  第一行列数: ${cells.length}`);
        dataValidation.hasData = true;
        dataValidation.columnsMatch = cells.length === 15;
        
        if (cells.length === 15) {
            console.log('%c✅ 数据行列数正确 (15列)', 'color: #059669;');
        } else {
            console.warn(`⚠️ 数据行列数异常，期望15列，实际${cells.length}列`);
        }
        
        // 5. 重点检查审核状态列（第15列）
        if (cells.length >= 15) {
            const auditCell = cells[14]; // 第15列（索引14）
            const auditText = auditCell ? auditCell.textContent.trim() : '';
            const hasStatusBadge = auditCell ? auditCell.querySelector('.audit-badge, .status-badge') : null;
            
            console.log('%c📋 审核状态列验证:', 'color: #7c3aed; font-weight: bold;');
            console.log(`  内容: "${auditText}"`);
            console.log(`  状态徽章: ${hasStatusBadge ? '有' : '无'}`);
            
            const validStatuses = ['已到账', '未到账', '未审核'];
            const hasValidStatus = validStatuses.some(status => auditText.includes(status));
            dataValidation.auditStatusValid = hasValidStatus;
            
            if (hasValidStatus) {
                console.log('%c✅ 审核状态格式正确', 'color: #059669;');
            } else {
                console.warn(`⚠️ 审核状态格式异常: "${auditText}"`);
                console.log(`💡 期望包含以下状态之一: ${validStatuses.join(', ')}`);
            }
        }
        
        // 6. 显示数据示例
        console.log('%c📋 数据示例 (前5列):', 'color: #7c3aed; font-weight: bold;');
        cells.forEach((cell, index) => {
            if (index < 5) {
                const content = cell.textContent.trim().substring(0, 30);
                console.log(`  ${expectedColumns[index]}: "${content}${content.length === 30 ? '...' : ''}"`);
            }
        });
        
    } else {
        console.warn('%c⚠️ 表格暂无数据行', 'color: #d97706; font-weight: bold;');
        
        // 尝试触发数据加载
        if (window.advancedDataTable) {
            console.log('🔄 尝试触发数据加载...');
            if (typeof window.advancedDataTable.loadData === 'function') {
                window.advancedDataTable.loadData();
                console.log('✅ 数据加载方法已调用，请等待几秒后重新运行测试');
            } else if (typeof window.advancedDataTable.renderTableView === 'function') {
                window.advancedDataTable.renderTableView();
                console.log('✅ 表格渲染方法已调用');
            }
        }
    }
    
    // 7. 检查交互功能
    console.log('%c🔄 交互功能检查:', 'color: #7c3aed; font-weight: bold;');
    const copyableCells = table.querySelectorAll('[data-copyable="true"], .copyable-cell');
    const expandableCells = table.querySelectorAll('[data-expandable="true"], .expandable-cell');
    
    console.log(`  可复制单元格: ${copyableCells.length}个`);
    console.log(`  可展开单元格: ${expandableCells.length}个`);
    
    // 8. 样式和显示检查
    const tableStyle = window.getComputedStyle(table);
    console.log('%c🎨 表格显示状态:', 'color: #7c3aed; font-weight: bold;');
    console.log(`  显示状态: ${tableStyle.display}`);
    console.log(`  可见性: ${tableStyle.visibility}`);
    console.log(`  透明度: ${tableStyle.opacity}`);
    console.log(`  表格宽度: ${table.offsetWidth}px`);
    
    // 9. 生成最终验证报告
    const finalStatus = (headers.length === 15 && headerMatch && dataValidation.hasData && dataValidation.columnsMatch && dataValidation.auditStatusValid) ? '通过' : '需要检查';
    
    const report = {
        timestamp: timestamp,
        url: window.location.href,
        testResults: {
            tableFound: !!table,
            headerCount: headers.length,
            headerContentMatch: headerMatch,
            dataRows: dataRows.length,
            dataValidation: dataValidation,
            interactiveFeatures: {
                copyable: copyableCells.length,
                expandable: expandableCells.length
            }
        },
        status: finalStatus,
        headerDetails: headerResults
    };
    
    console.log('%c📊 最终验证报告:', 'color: #1f2937; font-size: 14px; font-weight: bold; background: #f3f4f6; padding: 8px;');
    console.table(report.testResults);
    
    if (finalStatus === '通过') {
        console.log('%c🎉 验证完成！高级数据表15列结构和功能正常!', 'color: #059669; font-size: 16px; font-weight: bold; background: #d1fae5; padding: 8px;');
    } else {
        console.log('%c⚠️ 验证未完全通过，请检查上述问题', 'color: #d97706; font-size: 14px; font-weight: bold; background: #fef3c7; padding: 8px;');
    }
    
    console.log('%c💾 完整报告数据:', 'color: #6b7280;');
    console.log(report);
    
    return report;
}

// 立即执行验证
const result = verifyAdvancedDataTable();

// 提供便捷的重新测试方法
console.log('%c💡 如需重新测试，请执行: verifyAdvancedDataTable()', 'color: #6366f1; font-style: italic;');
window.verifyAdvancedDataTable = verifyAdvancedDataTable;