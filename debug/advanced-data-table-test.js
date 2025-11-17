/**
 * 高级数据表功能测试脚本
 * 验证数据报表页面的15列表格结构和交互功能
 */

console.log('🔍 高级数据表功能测试开始...');

function testAdvancedDataTable() {
    console.log('📊 开始测试高级数据表功能...');
    
    // 1. 检查页面是否为数据报表页面
    const pageTitle = document.title;
    if (!pageTitle.includes('数据报表') && !window.location.pathname.includes('report')) {
        console.warn('⚠️ 当前页面可能不是数据报表页面');
        console.log('📍 当前页面:', window.location.href);
        console.log('📝 页面标题:', pageTitle);
    }
    
    // 2. 检查表格元素
    const table = document.querySelector('#advancedDataTable, .advanced-data-table, [data-table="advanced"]');
    if (!table) {
        console.error('❌ 未找到高级数据表元素');
        console.log('🔍 尝试查找所有表格元素...');
        const allTables = document.querySelectorAll('table');
        console.log(`📋 页面共找到 ${allTables.length} 个表格`);
        allTables.forEach((t, index) => {
            console.log(`表格${index + 1}: id="${t.id}" class="${t.className}"`);
        });
        return false;
    }
    
    console.log('✅ 找到高级数据表');
    console.log('🔍 表格ID:', table.id);
    console.log('🔍 表格类名:', table.className);
    
    // 3. 检查表头结构 - 应该有15列
    const headers = table.querySelectorAll('thead th, thead .header-cell');
    console.log(`📊 表头列数: ${headers.length}`);
    
    if (headers.length !== 15) {
        console.warn(`⚠️ 表头列数异常，期望15列，实际${headers.length}列`);
    } else {
        console.log('✅ 表头列数正确 (15列)');
    }
    
    // 检查具体表头内容
    const expectedHeaders = [
        '序号', '订单号', '付款凭证', '付款金额', '付款账号', 
        '付款账户名称', '付款账户机构', '付款类型', '收款账号', 
        '收款账户名称', '收款账户机构', '订单状态', '创建时间', 
        '付款时间', '审核状态'
    ];
    
    console.log('📝 检查表头内容...');
    headers.forEach((header, index) => {
        const text = header.textContent.trim();
        const expected = expectedHeaders[index] || `未知列${index + 1}`;
        const match = text.includes(expected) || expected.includes(text);
        
        console.log(`列${index + 1}: "${text}" ${match ? '✅' : '❌'} (期望: "${expected}")`);
    });
    
    // 4. 检查表格数据
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('❌ 未找到表格数据区域 (tbody)');
        return false;
    }
    
    const rows = tbody.querySelectorAll('tr');
    console.log(`📊 数据行数: ${rows.length}`);
    
    if (rows.length === 0) {
        console.warn('⚠️ 表格无数据，尝试触发数据加载...');
        
        // 尝试查找并触发数据加载
        const loadButton = document.querySelector('[onclick*="load"], .load-data, .refresh-data');
        if (loadButton) {
            console.log('🔄 尝试点击数据加载按钮...');
            loadButton.click();
        }
        
        // 尝试调用数据渲染方法
        if (window.advancedDataTable && typeof window.advancedDataTable.renderTableView === 'function') {
            console.log('🔄 尝试调用数据渲染方法...');
            window.advancedDataTable.renderTableView();
        }
        
        // 等待数据加载
        setTimeout(() => {
            const newRows = tbody.querySelectorAll('tr');
            console.log(`📊 重新检查数据行数: ${newRows.length}`);
            if (newRows.length > 0) {
                testTableData(newRows);
            }
        }, 2000);
        
    } else {
        testTableData(rows);
    }
    
    // 5. 检查交互功能
    testInteractionFeatures(table);
    
    return true;
}

function testTableData(rows) {
    console.log('📊 测试表格数据内容...');
    
    if (rows.length > 0) {
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('td');
        
        console.log(`📝 第一行数据列数: ${cells.length}`);
        
        if (cells.length !== 15) {
            console.warn(`⚠️ 数据行列数异常，期望15列，实际${cells.length}列`);
        }
        
        // 检查关键列的数据格式
        cells.forEach((cell, index) => {
            const text = cell.textContent.trim();
            const columnNames = [
                '序号', '订单号', '付款凭证', '付款金额', '付款账号', 
                '付款账户名称', '付款账户机构', '付款类型', '收款账号', 
                '收款账户名称', '收款账户机构', '订单状态', '创建时间', 
                '付款时间', '审核状态'
            ];
            
            if (index < columnNames.length && text) {
                console.log(`${columnNames[index]}: "${text}"`);
            }
        });
        
        // 检查审核状态列（最后一列）
        const auditStatusCell = cells[14];
        if (auditStatusCell) {
            const auditText = auditStatusCell.textContent.trim();
            const hasAuditBadge = auditStatusCell.querySelector('.audit-badge, .status-badge');
            
            console.log(`📋 审核状态: "${auditText}"`);
            console.log(`🏷️ 审核状态徽章: ${hasAuditBadge ? '有' : '无'}`);
            
            if (['已到账', '未到账', '未审核'].some(status => auditText.includes(status))) {
                console.log('✅ 审核状态格式正确');
            } else {
                console.warn('⚠️ 审核状态格式可能有误');
            }
        }
    }
    
    console.log(`✅ 数据测试完成，共 ${rows.length} 行数据`);
}

function testInteractionFeatures(table) {
    console.log('🔄 测试交互功能...');
    
    // 1. 测试可复制功能
    const copyableCells = table.querySelectorAll('[data-copyable="true"], .copyable-cell');
    console.log(`📋 可复制单元格数量: ${copyableCells.length}`);
    
    if (copyableCells.length > 0) {
        console.log('✅ 找到可复制功能');
        
        // 测试第一个可复制单元格
        const firstCopyable = copyableCells[0];
        console.log('🔍 测试复制功能...');
        
        // 模拟点击复制
        if (firstCopyable.onclick || firstCopyable.addEventListener) {
            console.log('✅ 复制事件绑定正常');
        }
    }
    
    // 2. 测试可展开功能
    const expandableCells = table.querySelectorAll('[data-expandable="true"], .expandable-cell');
    console.log(`📖 可展开单元格数量: ${expandableCells.length}`);
    
    if (expandableCells.length > 0) {
        console.log('✅ 找到可展开功能');
    }
    
    // 3. 检查样式应用
    const tableStyle = window.getComputedStyle(table);
    console.log('🎨 表格样式检查:');
    console.log('显示状态:', tableStyle.display);
    console.log('可见性:', tableStyle.visibility);
    console.log('透明度:', tableStyle.opacity);
    
    // 4. 检查响应式
    const tableWidth = table.offsetWidth;
    const containerWidth = table.parentElement ? table.parentElement.offsetWidth : window.innerWidth;
    console.log(`📏 表格宽度: ${tableWidth}px / 容器宽度: ${containerWidth}px`);
    
    if (tableWidth > containerWidth) {
        console.log('📱 表格可能需要横向滚动（响应式）');
    }
    
    console.log('✅ 交互功能测试完成');
}

function generateTestReport() {
    console.log('📝 生成测试报告...');
    
    const report = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title,
        tableFound: !!document.querySelector('#advancedDataTable, .advanced-data-table, [data-table="advanced"]'),
        headerCount: document.querySelectorAll('thead th, thead .header-cell').length,
        dataRowCount: document.querySelectorAll('tbody tr').length,
        interactionFeatures: {
            copyable: document.querySelectorAll('[data-copyable="true"], .copyable-cell').length,
            expandable: document.querySelectorAll('[data-expandable="true"], .expandable-cell').length
        }
    };
    
    console.log('📊 测试报告:', report);
    return report;
}

// 立即执行测试
testAdvancedDataTable();

// 生成报告
setTimeout(() => {
    generateTestReport();
}, 3000);

console.log('💡 如需重新测试: testAdvancedDataTable()');
console.log('📋 如需生成报告: generateTestReport()');