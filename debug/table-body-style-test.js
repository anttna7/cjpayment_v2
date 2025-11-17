/**
 * 表体样式复用验证脚本
 * 验证高级数据表是否完全复用了财务审核表的表体样式
 */

console.log('🎨 开始表体样式复用验证...');

function verifyTableBodyStyleReuse() {
    console.log('📊 验证高级数据表表体样式复用...');
    
    // 验证结果对象
    const results = {
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
        tableFound: false,
        tableClassMatch: false,
        cellClassesMatch: false,
        rowClassesMatch: false,
        auditStylesMatch: false,
        overallMatch: false
    };
    
    // 1. 查找高级数据表
    console.log('🔍 查找高级数据表...');
    const table = document.querySelector('#advancedDataTable') || 
                  document.querySelector('.financial-audit-table');
    
    if (!table) {
        console.error('❌ 未找到高级数据表');
        return results;
    }
    
    console.log('✅ 找到高级数据表');
    results.tableFound = true;
    
    // 2. 验证表格类名是否使用财务审核表样式
    console.log('🏷️ 验证表格类名...');
    const hasAuditTableClass = table.classList.contains('financial-audit-table');
    console.log(`表格类名: ${table.className}`);
    console.log(`包含财务审核表类: ${hasAuditTableClass ? '✅ 是' : '❌ 否'}`);
    
    if (hasAuditTableClass) {
        results.tableClassMatch = true;
    }
    
    // 3. 验证表格行样式
    console.log('📋 验证表格行样式...');
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('❌ 未找到表体');
        return results;
    }
    
    const rows = tbody.querySelectorAll('tr');
    console.log(`表格行数: ${rows.length}`);
    
    if (rows.length > 0) {
        // 检查第一行是否使用了audit-table-row类
        const firstRow = rows[0];
        const hasAuditRowClass = firstRow.classList.contains('audit-table-row');
        
        console.log(`第一行类名: ${firstRow.className}`);
        console.log(`包含audit-table-row类: ${hasAuditRowClass ? '✅ 是' : '❌ 否'}`);
        
        if (hasAuditRowClass) {
            results.rowClassesMatch = true;
        }
        
        // 4. 验证单元格样式类名
        console.log('🔍 验证单元格样式类名...');
        const cells = firstRow.querySelectorAll('td');
        const expectedCellClasses = [
            'col-serial-cell',                    // 序号
            'order-number-cell',                  // 订单号
            'payment-voucher-cell',               // 付款凭证
            'amount-cell',                        // 付款金额
            'account-number-cell',                // 付款账号
            'account-name-cell',                  // 付款账户名称
            'bank-name-cell',                     // 付款账户机构
            'business-type-badge',                // 付款类型
            'account-number-cell',                // 收款账号
            'account-name-cell',                  // 收款账户名称
            'bank-name-cell',                     // 收款账户机构
            'status-badge',                       // 订单状态
            'time-cell',                          // 创建时间
            'time-cell',                          // 付款时间
            'audit-status-badge'                  // 审核状态
        ];
        
        let matchingCells = 0;
        cells.forEach((cell, index) => {
            if (index < expectedCellClasses.length) {
                const expectedClass = expectedCellClasses[index];
                const cellContent = cell.querySelector(`span.${expectedClass}, div.${expectedClass}`);
                const hasExpectedClass = cellContent !== null;
                
                console.log(`列${index + 1}: 期望类名 "${expectedClass}" ${hasExpectedClass ? '✅' : '❌'}`);
                
                if (hasExpectedClass) {
                    matchingCells++;
                } else {
                    // 显示实际的内容类名
                    const spans = cell.querySelectorAll('span, div');
                    if (spans.length > 0) {
                        console.log(`  实际类名: ${Array.from(spans).map(s => s.className).join(', ')}`);
                    }
                }
            }
        });
        
        const cellMatchPercentage = Math.round((matchingCells / expectedCellClasses.length) * 100);
        console.log(`📊 单元格样式匹配度: ${matchingCells}/${expectedCellClasses.length} (${cellMatchPercentage}%)`);
        
        if (cellMatchPercentage >= 80) {
            results.cellClassesMatch = true;
        }
        
        // 5. 验证特定的审核表样式
        console.log('🏷️ 验证财务审核表特有样式...');
        const auditStyleChecks = {
            'col-serial-cell': '序号固定列样式',
            'col-actions-cell': '操作列固定样式',
            'copyable-cell': '可复制单元格样式',
            'privacy-protected': '隐私保护样式',
            'expandable-cell': '可展开单元格样式'
        };
        
        let auditStyleMatches = 0;
        Object.entries(auditStyleChecks).forEach(([className, description]) => {
            const elements = table.querySelectorAll(`.${className}`);
            const hasStyle = elements.length > 0;
            
            console.log(`${description} (${className}): ${elements.length} 个元素 ${hasStyle ? '✅' : '❌'}`);
            
            if (hasStyle) {
                auditStyleMatches++;
            }
        });
        
        const auditStylePercentage = Math.round((auditStyleMatches / Object.keys(auditStyleChecks).length) * 100);
        console.log(`📊 财务审核表样式匹配度: ${auditStyleMatches}/${Object.keys(auditStyleChecks).length} (${auditStylePercentage}%)`);
        
        if (auditStylePercentage >= 80) {
            results.auditStylesMatch = true;
        }
    }
    
    // 6. 计算总体匹配度
    const totalChecks = 5;
    const passedChecks = [
        results.tableFound,
        results.tableClassMatch,
        results.rowClassesMatch,
        results.cellClassesMatch,
        results.auditStylesMatch
    ].filter(check => check === true).length;
    
    const overallPercentage = Math.round((passedChecks / totalChecks) * 100);
    results.overallMatch = overallPercentage >= 80;
    
    // 7. 生成最终报告
    console.log('\n📝 ===== 表体样式复用验证报告 =====');
    console.log('📍 页面URL:', results.pageUrl);
    console.log('🕒 测试时间:', results.timestamp);
    console.log('🔍 表格发现:', results.tableFound ? '✅ 通过' : '❌ 失败');
    console.log('🏷️ 表格类名:', results.tableClassMatch ? '✅ 通过' : '❌ 失败');
    console.log('📋 行样式类:', results.rowClassesMatch ? '✅ 通过' : '❌ 失败');
    console.log('🔍 单元格样式:', results.cellClassesMatch ? '✅ 通过' : '❌ 失败');
    console.log('🎨 审核表样式:', results.auditStylesMatch ? '✅ 通过' : '❌ 失败');
    console.log('📈 总体匹配度:', `${passedChecks}/${totalChecks} (${overallPercentage}%)`);
    console.log('🎯 验证结果:', results.overallMatch ? '✅ 样式复用成功!' : '❌ 样式复用需要改进');
    
    if (results.overallMatch) {
        console.log('\n🎉 恭喜！高级数据表已成功复用财务审核表的表体样式！');
        console.log('🔍 表格使用了相同的CSS类名和样式结构');
        console.log('🎨 具备相同的视觉效果和交互功能');
    } else {
        console.log('\n⚠️ 样式复用不完全，建议检查以下项目:');
        if (!results.tableClassMatch) console.log('  - 表格需要添加 financial-audit-table 类');
        if (!results.rowClassesMatch) console.log('  - 表格行需要添加 audit-table-row 类');
        if (!results.cellClassesMatch) console.log('  - 单元格需要使用财务审核表的CSS类名');
        if (!results.auditStylesMatch) console.log('  - 需要添加财务审核表的特有样式类');
    }
    
    console.log('================================\n');
    
    return results;
}

// 立即执行验证
console.log('🚀 执行表体样式复用验证...');
const verificationResults = verifyTableBodyStyleReuse();

console.log('💡 使用提示:');
console.log('- 重新执行验证: verifyTableBodyStyleReuse()');
console.log('- 检查表格样式: document.querySelector("#advancedDataTable").className');
console.log('- 检查单元格样式: document.querySelectorAll(".audit-table-row td span").forEach(s => console.log(s.className))');