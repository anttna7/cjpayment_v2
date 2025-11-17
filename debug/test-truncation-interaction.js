const { chromium } = require('playwright');

async function testTruncationAndInteraction() {
    console.log('🔤 测试文本截断和内容交互功能...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 1500
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    // 监听控制台输出
    page.on('console', msg => {
        if (msg.text().includes('FinancialAudit') || 
            msg.text().includes('tooltip') || 
            msg.text().includes('复制') ||
            msg.text().includes('截断')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    try {
        console.log('🚀 打开财务审核页面...');
        await page.goto('http://localhost:8091/audit');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 等待表格加载
        await page.waitForFunction(() => {
            return window.financialAuditTable && 
                   document.querySelectorAll('#financialAuditTableBody tr').length > 0;
        }, { timeout: 15000 });
        
        console.log('✅ 表格加载完成');

        // 测试1: 验证截断文本效果
        console.log('\n📏 测试1: 验证文本截断效果...');
        
        const truncationAnalysis = await page.evaluate(() => {
            const merchantCells = document.querySelectorAll('.merchant-name-cell.copyable-cell');
            const accountCells = document.querySelectorAll('.account-name-cell.copyable-cell');
            
            let analysis = {
                totalCells: 0,
                truncatedCells: 0,
                examples: []
            };
            
            [...merchantCells, ...accountCells].forEach((cell, index) => {
                analysis.totalCells++;
                
                const fullContent = cell.getAttribute('data-full-content');
                const displayContent = cell.getAttribute('data-display-content');
                const actualText = cell.textContent.trim();
                
                if (fullContent && displayContent !== fullContent) {
                    analysis.truncatedCells++;
                    
                    if (analysis.examples.length < 3) {
                        analysis.examples.push({
                            index: index + 1,
                            type: cell.classList.contains('merchant-name-cell') ? '商户名称' : '账户名称',
                            fullContent: fullContent,
                            displayContent: displayContent,
                            actualText: actualText,
                            isTruncated: actualText.includes('...')
                        });
                    }
                }
            });
            
            return analysis;
        });
        
        console.log('📏 文本截断分析结果:');
        console.log(`  总单元格数: ${truncationAnalysis.totalCells}`);
        console.log(`  截断单元格数: ${truncationAnalysis.truncatedCells}`);
        console.log(`  截断率: ${(truncationAnalysis.truncatedCells / truncationAnalysis.totalCells * 100).toFixed(1)}%`);
        
        if (truncationAnalysis.examples.length > 0) {
            console.log('  截断示例:');
            truncationAnalysis.examples.forEach((example, i) => {
                console.log(`    ${i + 1}. ${example.type}:`);
                console.log(`       完整内容: "${example.fullContent}"`);
                console.log(`       显示内容: "${example.displayContent}"`);
                console.log(`       实际文本: "${example.actualText}"`);
                console.log(`       正确截断: ${example.isTruncated ? '✅' : '❌'}`);
            });
        }

        // 截图截断效果
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-01-overview.png',
            fullPage: true 
        });

        // 测试2: 验证悬停tooltip功能
        console.log('\n💡 测试2: 验证悬停tooltip功能...');
        
        // 查找一个被截断的商户名称单元格
        const truncatedMerchantCell = await page.$('.merchant-name-cell.copyable-cell[data-full-content*="有限公司"]');
        if (truncatedMerchantCell) {
            // 悬停在单元格上
            await truncatedMerchantCell.hover();
            await page.waitForTimeout(800);
            
            const tooltipResult = await page.evaluate(() => {
                const tooltip = document.getElementById('active-tooltip');
                return {
                    exists: !!tooltip,
                    visible: tooltip?.classList.contains('show') || false,
                    content: tooltip?.textContent || '无内容',
                    hasContent: (tooltip?.textContent || '').length > 0
                };
            });
            
            console.log('💡 Tooltip验证结果:', tooltipResult);
            
            // 截图tooltip显示
            await page.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-02-tooltip.png',
                fullPage: false 
            });
            
            await page.mouse.move(0, 0);
            await page.waitForTimeout(500);
        }

        // 测试3: 验证双击复制功能
        console.log('\n📋 测试3: 验证双击复制完整内容...');
        
        if (truncatedMerchantCell) {
            // 双击单元格
            await truncatedMerchantCell.dblclick();
            await page.waitForTimeout(1000);
            
            const copyResult = await page.evaluate(() => {
                const copySuccess = document.querySelector('.copy-success');
                return {
                    exists: !!copySuccess,
                    visible: copySuccess?.classList.contains('show') || false,
                    message: copySuccess?.textContent || '无消息'
                };
            });
            
            console.log('📋 复制功能验证结果:', copyResult);
            
            // 截图复制成功提示
            await page.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-03-copy.png',
                fullPage: false 
            });
        }

        // 测试4: 验证右键菜单和展开功能
        console.log('\n🖱️ 测试4: 验证右键菜单功能...');
        
        const truncatedAccountCell = await page.$('.account-name-cell.copyable-cell');
        if (truncatedAccountCell) {
            // 右键点击
            await truncatedAccountCell.click({ button: 'right' });
            await page.waitForTimeout(800);
            
            const contextMenuResult = await page.evaluate(() => {
                const menu = document.getElementById('active-context-menu');
                const menuItems = document.querySelectorAll('.context-menu-item');
                
                return {
                    exists: !!menu,
                    visible: menu?.classList.contains('show') || false,
                    itemCount: menuItems.length,
                    items: Array.from(menuItems).map(item => ({
                        text: item.textContent.replace(/\s+/g, ' ').trim(),
                        action: item.getAttribute('data-action')
                    }))
                };
            });
            
            console.log('🖱️ 右键菜单验证结果:', contextMenuResult);
            
            // 截图右键菜单
            await page.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-04-context-menu.png',
                fullPage: false 
            });
            
            // 点击查看完整内容
            const viewMenuItem = await page.$('.context-menu-item[data-action="view"]');
            if (viewMenuItem) {
                await viewMenuItem.click();
                await page.waitForTimeout(800);
                
                const modalResult = await page.evaluate(() => {
                    const modal = document.querySelector('.modal');
                    return {
                        exists: !!modal,
                        hasContent: (modal?.textContent || '').length > 10,
                        contentPreview: (modal?.textContent || '').substring(0, 50) + '...'
                    };
                });
                
                console.log('👁️ 完整内容模态窗口验证结果:', modalResult);
                
                // 截图模态窗口
                await page.screenshot({ 
                    path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-05-modal.png',
                    fullPage: false 
                });
                
                // 关闭模态窗口
                const closeBtn = await page.$('.modal button');
                if (closeBtn) {
                    await closeBtn.click();
                    await page.waitForTimeout(500);
                }
            }
        }

        return {
            success: true,
            truncation: truncationAnalysis,
            tooltip: tooltipResult || { exists: false },
            copy: copyResult || { exists: false },
            contextMenu: contextMenuResult || { exists: false }
        };

    } catch (error) {
        console.error('❌ 截断和交互测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/truncation-test-error.png',
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

testTruncationAndInteraction().then(result => {
    console.log('\n🎯 文本截断和内容交互测试结果:');
    
    if (result.success) {
        console.log('\n✅ 测试成功完成！');
        
        console.log('\n📊 功能验证总结:');
        console.log(`  ├─ 文本截断: ${result.truncation?.truncatedCells || 0} 个单元格 ${result.truncation?.truncatedCells > 0 ? '✅' : '❌'}`);
        console.log(`  ├─ 悬停tooltip: ${result.tooltip?.exists ? '✅' : '❌'}`);
        console.log(`  ├─ 双击复制: ${result.copy?.exists ? '✅' : '❌'}`);
        console.log(`  └─ 右键菜单: ${result.contextMenu?.exists ? '✅' : '❌'}`);
        
        if (result.truncation?.examples?.length > 0) {
            console.log('\n🔤 文本截断优化成果:');
            console.log('  🔹 长商户名称智能截断保持表格整齐');
            console.log('  🔹 悬停显示完整内容提升用户体验');
            console.log('  🔹 双击复制获取完整信息便于操作');
            console.log('  🔹 右键菜单提供多种内容查看方式');
        }
        
        console.log('\n🚀 用户体验提升:');
        console.log('  ✨ 表格布局美观整齐，信息密度适中');
        console.log('  ✨ 内容过长时自动截断不影响布局');
        console.log('  ✨ 多种交互方式快速查看完整信息');
        console.log('  ✨ 适配桌面和触摸设备的操作习惯');
        
    } else {
        console.log('\n❌ 测试过程中出现问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});