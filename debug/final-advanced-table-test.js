/**
 * 高级数据表最终验证脚本
 * 在数据报表页面浏览器控制台中执行此脚本
 */

function verifyAdvancedDataTable() {
    console.log('🚀 开始高级数据表最终验证...');
    
    // 验证结果对象
    const results = {
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
        tableFound: false,
        headerStructure: false,
        dataContent: false,
        auditStatusColumn: false,
        interactionFeatures: false,
        overallStatus: 'failed'
    };
    
    // 1. 验证页面是否为数据报表页面
    console.log('📊 验证数据报表页面...');
    if (window.location.pathname.includes('report') || document.title.includes('数据报表')) {
        console.log('✅ 页面验证通过: 数据报表页面');
    } else {
        console.warn('⚠️ 页面验证警告: 可能不是数据报表页面');
        console.log('当前URL:', window.location.href);
    }
    
    // 2. 查找高级数据表
    console.log('🔍 查找高级数据表...');
    const table = document.querySelector('#advancedDataTable') || 
                  document.querySelector('.advanced-data-table') ||
                  document.querySelector('[data-table="advanced"]') ||
                  document.querySelector('table.columns-15');
    
    if (!table) {
        console.error('❌ 未找到高级数据表元素');
        console.log('🔍 页面所有表格:');
        const allTables = document.querySelectorAll('table');
        allTables.forEach((t, i) => {
            console.log(`  表格${i+1}: id="${t.id}" class="${t.className}"`);
        });
        return results;
    }
    
    console.log('✅ 找到高级数据表');
    console.log('表格元素:', table);
    results.tableFound = true;
    
    // 3. 验证15列表头结构
    console.log('📋 验证15列表头结构...');
    const headers = table.querySelectorAll('thead th, thead .header-cell, thead .th-text');
    const headerTexts = Array.from(headers).map(h => h.textContent.trim());
    
    console.log(`📊 实际表头数量: ${headers.length}`);
    console.log('📊 表头内容:', headerTexts);
    
    const expectedHeaders = [
        '序号', '订单号', '付款凭证', '付款金额', '付款账号', 
        '付款账户名称', '付款账户机构', '付款类型', '收款账号', 
        '收款账户名称', '收款账户机构', '订单状态', '创建时间', 
        '付款时间', '审核状态'
    ];
    
    let headerMatch = 0;
    expectedHeaders.forEach((expected, index) => {
        const actual = headerTexts[index] || '';
        const match = actual.includes(expected) || expected.includes(actual) || 
                     actual.replace(/[()（）]/g, '').includes(expected);
        
        if (match) {
            headerMatch++;
            console.log(`✅ 列${index+1}: "${actual}" (匹配 "${expected}")`);
        } else {
            console.log(`❌ 列${index+1}: "${actual}" (期望 "${expected}")`);
        }
    });
    
    if (headerMatch >= 14 && headers.length === 15) {
        console.log('✅ 表头15列结构验证通过!');
        results.headerStructure = true;
    } else {
        console.warn(`⚠️ 表头验证失败: 匹配${headerMatch}/15列，实际${headers.length}列`);
    }
    
    // 4. 验证审核状态列（最后一列）
    console.log('🏷️ 验证审核状态列...');
    const lastHeader = headerTexts[headerTexts.length - 1];
    if (lastHeader && (lastHeader.includes('审核状态') || lastHeader.includes('审核'))) {
        console.log(`✅ 审核状态列验证通过: "${lastHeader}"`);
        results.auditStatusColumn = true;
    } else {
        console.warn(`⚠️ 审核状态列验证失败: "${lastHeader}"`);
    }
    
    // 5. 验证表格数据内容
    console.log('📊 验证表格数据内容...');
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('❌ 未找到表格数据区域');
        return results;
    }
    
    let rows = tbody.querySelectorAll('tr');
    console.log(`📋 当前数据行数: ${rows.length}`);
    
    // 如果没有数据，尝试触发数据加载
    if (rows.length === 0) {
        console.log('🔄 尝试触发数据加载...');
        
        // 方法1: 调用高级数据表方法
        if (window.advancedDataTable) {
            console.log('🔧 方法1: 调用 advancedDataTable 方法...');
            if (typeof window.advancedDataTable.loadData === 'function') {
                window.advancedDataTable.loadData();
            }
            if (typeof window.advancedDataTable.renderTableView === 'function') {
                window.advancedDataTable.renderTableView();
            }
        }
        
        // 方法2: 查找并点击加载按钮
        const loadButtons = document.querySelectorAll('[onclick*="load"], .load-data, .refresh-data, .reload-btn');
        if (loadButtons.length > 0) {
            console.log('🔧 方法2: 点击加载按钮...');
            loadButtons[0].click();
        }
        
        // 方法3: 触发页面事件
        const tabButton = document.querySelector('[onclick*="showAdvanced"], [data-target="advanced"]');
        if (tabButton) {
            console.log('🔧 方法3: 点击高级数据标签...');
            tabButton.click();
        }
        
        // 等待数据加载
        setTimeout(() => {
            rows = tbody.querySelectorAll('tr');
            console.log(`📋 重新检查数据行数: ${rows.length}`);
            continueDataValidation();
        }, 2000);
        
    } else {
        continueDataValidation();
    }
    
    function continueDataValidation() {
        if (rows.length > 0) {
            console.log(`✅ 表格数据验证通过: ${rows.length}行数据`);
            results.dataContent = true;
            
            // 验证第一行数据结构
            const firstRow = rows[0];
            const cells = firstRow.querySelectorAll('td');
            console.log(`📋 第一行数据列数: ${cells.length}`);
            
            if (cells.length === 15) {
                console.log('✅ 数据列数验证通过: 15列');
                
                // 特别验证审核状态列内容
                const auditCell = cells[14]; // 最后一列
                if (auditCell) {
                    const auditText = auditCell.textContent.trim();
                    console.log(`🏷️ 审核状态内容: "${auditText}"`);
                    
                    const validStatuses = ['已到账', '未到账', '未审核'];
                    const hasValidStatus = validStatuses.some(status => auditText.includes(status));
                    
                    if (hasValidStatus) {
                        console.log('✅ 审核状态内容验证通过');
                    } else {
                        console.warn('⚠️ 审核状态内容验证失败');
                    }
                }
            } else {
                console.warn(`⚠️ 数据列数验证失败: ${cells.length}列，期望15列`);
            }
        } else {
            console.warn('⚠️ 表格数据验证失败: 无数据行');
        }
        
        // 6. 验证交互功能
        console.log('🔄 验证交互功能...');
        const copyableCells = table.querySelectorAll('[data-copyable="true"], .copyable-cell');
        const expandableCells = table.querySelectorAll('[data-expandable="true"], .expandable-cell');
        
        console.log(`📋 可复制单元格: ${copyableCells.length}`);
        console.log(`📖 可展开单元格: ${expandableCells.length}`);
        
        if (copyableCells.length > 0 || expandableCells.length > 0) {
            console.log('✅ 交互功能验证通过');
            results.interactionFeatures = true;
        }
        
        // 7. 生成最终验证结果
        generateFinalResults();
    }
    
    function generateFinalResults() {
        console.log('📝 生成最终验证结果...');
        
        const passedTests = Object.values(results).filter(v => v === true).length;
        const totalTests = Object.keys(results).length - 3; // 排除 pageUrl, timestamp, overallStatus
        
        results.overallStatus = passedTests >= totalTests - 1 ? 'passed' : 'failed';
        
        console.log('\n📊 ===== 最终验证报告 =====');
        console.log('📍 页面URL:', results.pageUrl);
        console.log('🕒 测试时间:', results.timestamp);
        console.log('🔍 表格发现:', results.tableFound ? '✅ 通过' : '❌ 失败');
        console.log('📋 表头结构:', results.headerStructure ? '✅ 通过' : '❌ 失败');
        console.log('📊 数据内容:', results.dataContent ? '✅ 通过' : '❌ 失败');
        console.log('🏷️ 审核状态:', results.auditStatusColumn ? '✅ 通过' : '❌ 失败');
        console.log('🔄 交互功能:', results.interactionFeatures ? '✅ 通过' : '❌ 失败');
        console.log('📈 总体状态:', results.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败');
        console.log('🎯 通过率:', `${passedTests}/${totalTests}`);
        
        if (results.overallStatus === 'passed') {
            console.log('\n🎉 验证完成！高级数据表15列结构和功能正常!');
        } else {
            console.log('\n⚠️ 验证发现问题，请检查上述失败项目');
        }
        
        console.log('\n💡 提示: 可手动验证表格显示效果和交互功能');
        console.log('==============================\n');
        
        return results;
    }
    
    // 如果是同步数据，立即执行最终结果生成
    if (rows.length > 0) {
        continueDataValidation();
    }
    
    return results;
}

// 立即执行验证
console.log('🔥 执行验证脚本...');
const testResults = verifyAdvancedDataTable();

console.log('\n💡 使用提示:');
console.log('- 重新执行验证: verifyAdvancedDataTable()');
console.log('- 手动触发数据加载: window.advancedDataTable?.loadData?.()');
console.log('- 手动渲染数据: window.advancedDataTable?.renderTableView?.()');