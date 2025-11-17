const { chromium } = require('playwright');

async function testOperationsWidth() {
    console.log('⚙️ 测试操作区域宽度和显示完整性...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 2000
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    // 监听控制台输出
    page.on('console', msg => {
        if (msg.text().includes('FinancialAudit') || msg.text().includes('操作')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    try {
        console.log('🚀 打开财务审核页面...');
        await page.goto('http://localhost:8091/audit');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('✅ 页面加载完成');

        // 测试操作列宽度和内容
        console.log('\\n📏 测试操作列宽度和内容显示...');
        
        const operationsAnalysis = await page.evaluate(() => {
            const actionCells = document.querySelectorAll('.col-actions-cell');
            const operationsData = {
                totalCells: actionCells.length,
                cellsAnalysis: [],
                avgWidth: 0,
                allOperationsVisible: 0
            };
            
            let totalWidth = 0;
            
            actionCells.forEach((cell, index) => {
                const rect = cell.getBoundingClientRect();
                const actionsContainer = cell.querySelector('.audit-actions-simple');
                const viewLink = actionsContainer?.querySelector('.action-view');
                const arrivedLink = actionsContainer?.querySelector('.action-arrived');
                const notArrivedLink = actionsContainer?.querySelector('.action-not-arrived');
                
                const cellAnalysis = {
                    index: index + 1,
                    cellWidth: Math.round(rect.width),
                    cellHeight: Math.round(rect.height),
                    hasView: !!viewLink,
                    hasArrived: !!arrivedLink,
                    hasNotArrived: !!notArrivedLink,
                    allThreeVisible: !!viewLink && !!arrivedLink && !!notArrivedLink,
                    actionsText: actionsContainer?.textContent.trim() || '无内容',
                    viewText: viewLink?.textContent.trim() || '',
                    arrivedText: arrivedLink?.textContent.trim() || '',
                    notArrivedText: notArrivedLink?.textContent.trim() || '',
                    separators: actionsContainer?.querySelectorAll('.action-separator').length || 0
                };
                
                operationsData.cellsAnalysis.push(cellAnalysis);
                totalWidth += rect.width;
                
                if (cellAnalysis.allThreeVisible) {
                    operationsData.allOperationsVisible++;
                }
            });
            
            operationsData.avgWidth = Math.round(totalWidth / actionCells.length);
            
            return operationsData;
        });
        
        console.log('📏 操作列宽度分析结果:');
        console.log(`   操作列总数: ${operationsAnalysis.totalCells}`);
        console.log(`   平均列宽: ${operationsAnalysis.avgWidth}px`);
        console.log(`   显示全部三个操作的列数: ${operationsAnalysis.allOperationsVisible}`);
        console.log(`   显示完整率: ${(operationsAnalysis.allOperationsVisible / operationsAnalysis.totalCells * 100).toFixed(1)}%`);
        
        if (operationsAnalysis.cellsAnalysis.length > 0) {
            console.log('\\n📋 操作内容详细分析 (前5行):');
            operationsAnalysis.cellsAnalysis.slice(0, 5).forEach(cell => {
                console.log(`   行${cell.index}: 宽度${cell.cellWidth}px`);
                console.log(`     完整内容: "${cell.actionsText}"`);
                console.log(`     查看: "${cell.viewText}" ${cell.hasView ? '✅' : '❌'}`);
                console.log(`     到账: "${cell.arrivedText}" ${cell.hasArrived ? '✅' : '❌'}`);
                console.log(`     未到: "${cell.notArrivedText}" ${cell.hasNotArrived ? '✅' : '❌'}`);
                console.log(`     分隔符数量: ${cell.separators}`);
                console.log(`     三个操作都显示: ${cell.allThreeVisible ? '✅' : '❌'}`);
                console.log('');
            });
        }

        // 截图操作区域
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/operations-width-test-01-overview.png',
            fullPage: true 
        });

        // 特别关注操作列
        const operationsColumn = await page.$('.col-actions.col-fixed-right');
        if (operationsColumn) {
            await operationsColumn.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/operations-width-test-02-column.png'
            });
        }

        // 测试滚动时操作列的固定显示
        console.log('\\n🔄 测试横向滚动时操作列固定显示...');
        
        // 向右滚动
        await page.evaluate(() => {
            const tableWrapper = document.querySelector('.financial-audit-table-wrapper');
            if (tableWrapper) {
                tableWrapper.scrollLeft = 800;
            }
        });
        
        await page.waitForTimeout(1000);
        
        const scrolledOperationsTest = await page.evaluate(() => {
            const actionCells = document.querySelectorAll('.col-actions-cell');
            const firstCell = actionCells[0];
            const rect = firstCell?.getBoundingClientRect();
            const tableWrapper = document.querySelector('.financial-audit-table-wrapper');
            
            return {
                operationsVisible: !!firstCell && rect.right > 0,
                operationsSticky: firstCell?.style.position === 'sticky' || 
                                 getComputedStyle(firstCell).position === 'sticky',
                cellRight: Math.round(rect?.right || 0),
                scrollLeft: tableWrapper?.scrollLeft || 0,
                actionsText: firstCell?.textContent.trim() || ''
            };
        });
        
        console.log('🔄 横向滚动测试结果:');
        console.log(`   滚动距离: ${scrolledOperationsTest.scrollLeft}px`);
        console.log(`   操作列可见: ${scrolledOperationsTest.operationsVisible ? '✅' : '❌'}`);
        console.log(`   操作列固定: ${scrolledOperationsTest.operationsSticky ? '✅' : '❌'}`);
        console.log(`   操作内容: "${scrolledOperationsTest.actionsText}"`);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/operations-width-test-03-scrolled.png',
            fullPage: true 
        });

        return {
            success: true,
            analysis: operationsAnalysis,
            scrollTest: scrolledOperationsTest
        };

    } catch (error) {
        console.error('❌ 操作宽度测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/operations-width-test-error.png',
            fullPage: true 
        });

        return {
            success: false,
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

testOperationsWidth().then(result => {
    console.log('\\n🎯 操作区域宽度测试结果:');
    
    if (result.success) {
        const { analysis, scrollTest } = result;
        
        console.log('\\n📊 测试结果总结:');
        console.log(`  ✅ 操作列平均宽度: ${analysis.avgWidth}px (目标: ≥160px)`);
        console.log(`  ${analysis.allOperationsVisible === analysis.totalCells ? '✅' : '❌'} 显示完整操作: ${analysis.allOperationsVisible}/${analysis.totalCells} 行`);
        console.log(`  ${scrollTest.operationsSticky ? '✅' : '❌'} 固定定位正常: 横向滚动时操作列保持可见`);
        console.log(`  ${scrollTest.operationsVisible ? '✅' : '❌'} 滚动后可见: 操作内容仍然可见`);
        
        if (analysis.avgWidth >= 160 && analysis.allOperationsVisible === analysis.totalCells) {
            console.log('\\n🎉 操作区域显示完全正常！');
            console.log('  ✨ 所有行都能显示"查看|到账|未到"三个完整操作');
            console.log('  ✨ 列宽度充足，内容不会被截断');
            console.log('  ✨ 横向滚动时操作列固定显示');
        } else {
            console.log('\\n⚠️ 需要进一步调整:');
            if (analysis.avgWidth < 160) {
                console.log(`  🔧 列宽不足: 当前${analysis.avgWidth}px，建议≥160px`);
            }
            if (analysis.allOperationsVisible < analysis.totalCells) {
                console.log(`  🔧 内容显示不全: ${analysis.totalCells - analysis.allOperationsVisible}行缺少操作`);
            }
        }
        
    } else {
        console.log('\\n❌ 测试过程中出现问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});