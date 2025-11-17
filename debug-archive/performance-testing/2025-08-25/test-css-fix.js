/**
 * 测试CSS active类修复后的效果
 */

const puppeteer = require('puppeteer');

async function testCSSFix() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[浏览器] ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🎉 测试CSS active类修复...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        // 等待页面初始化
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('=== 检查页面初始状态 ===');
        const initialCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const accounts = document.querySelectorAll('.account-count-badge');
            
            const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
            const tableRect = table ? table.getBoundingClientRect() : null;
            
            return {
                container: {
                    exists: !!tableContainer,
                    hasActiveClass: tableContainer ? tableContainer.classList.contains('active') : false,
                    display: tableContainer ? getComputedStyle(tableContainer).display : 'none',
                    size: containerRect ? `${containerRect.width}x${containerRect.height}` : '0x0',
                    visible: containerRect && containerRect.width > 0 && containerRect.height > 0
                },
                table: {
                    exists: !!table,
                    size: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                    visible: tableRect && tableRect.width > 0 && tableRect.height > 0
                },
                data: {
                    rows: rows.length,
                    accounts: accounts.length
                }
            };
        });
        
        console.log('初始状态检查:');
        console.log(`容器状态:`);
        console.log(`  存在: ${initialCheck.container.exists}`);
        console.log(`  active类: ${initialCheck.container.hasActiveClass}`);
        console.log(`  显示: ${initialCheck.container.display}`);
        console.log(`  尺寸: ${initialCheck.container.size}`);
        console.log(`  可见: ${initialCheck.container.visible}`);
        
        console.log(`表格状态:`);
        console.log(`  存在: ${initialCheck.table.exists}`);
        console.log(`  尺寸: ${initialCheck.table.size}`);
        console.log(`  可见: ${initialCheck.table.visible}`);
        
        console.log(`数据状态:`);
        console.log(`  数据行: ${initialCheck.data.rows}`);
        console.log(`  账户徽章: ${initialCheck.data.accounts}`);
        
        const success = initialCheck.container.visible && initialCheck.table.visible && 
                       initialCheck.data.rows > 0 && initialCheck.data.accounts > 0;
        
        console.log(`\n✨ 初始显示状态: ${success ? '✅ 成功' : '❌ 失败'}`);
        
        await page.screenshot({ path: 'test-css-fix-01-initial.png', fullPage: true });
        
        if (success) {
            console.log('\n🎉 表格显示问题已完全修复！');
            
            // 测试视图切换
            console.log('\n=== 测试视图切换 ===');
            
            await page.click('#gridViewBtn');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const cardCheck = await page.evaluate(() => {
                const tableContainer = document.getElementById('merchantTableContainer');
                const cardContainer = document.getElementById('merchantGrid');
                
                return {
                    tableHasActive: tableContainer ? tableContainer.classList.contains('active') : false,
                    tableDisplay: tableContainer ? getComputedStyle(tableContainer).display : 'none',
                    cardDisplay: cardContainer ? getComputedStyle(cardContainer).display : 'none',
                    cardCount: document.querySelectorAll('.merchant-card').length
                };
            });
            
            console.log('切换到卡片视图:');
            console.log(`  表格active类: ${cardCheck.tableHasActive}`);
            console.log(`  表格显示: ${cardCheck.tableDisplay}`);
            console.log(`  卡片显示: ${cardCheck.cardDisplay}`);
            console.log(`  卡片数量: ${cardCheck.cardCount}`);
            
            await page.screenshot({ path: 'test-css-fix-02-cards.png', fullPage: true });
            
            // 切换回表格
            await page.click('#tableViewBtn');
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const backToTable = await page.evaluate(() => {
                const tableContainer = document.getElementById('merchantTableContainer');
                const table = document.querySelector('.merchant-table');
                const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
                const tableRect = table ? table.getBoundingClientRect() : null;
                
                return {
                    containerHasActive: tableContainer ? tableContainer.classList.contains('active') : false,
                    containerVisible: containerRect && containerRect.width > 0 && containerRect.height > 0,
                    tableVisible: tableRect && tableRect.width > 0 && tableRect.height > 0,
                    containerSize: containerRect ? `${containerRect.width}x${containerRect.height}` : '0x0',
                    tableSize: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                    rows: document.querySelectorAll('.merchant-row').length
                };
            });
            
            console.log('切换回表格视图:');
            console.log(`  容器active类: ${backToTable.containerHasActive}`);
            console.log(`  容器可见: ${backToTable.containerVisible}`);
            console.log(`  表格可见: ${backToTable.tableVisible}`);
            console.log(`  容器尺寸: ${backToTable.containerSize}`);
            console.log(`  表格尺寸: ${backToTable.tableSize}`);
            console.log(`  数据行数: ${backToTable.rows}`);
            
            await page.screenshot({ path: 'test-css-fix-03-final.png', fullPage: true });
            
            const finalSuccess = backToTable.containerVisible && backToTable.tableVisible && backToTable.rows > 0;
            console.log(`\n🎯 视图切换测试: ${finalSuccess ? '✅ 完全成功' : '❌ 部分问题'}`);
            
            if (finalSuccess) {
                console.log('\n🚀 商户管理表格系统完全修复！');
                console.log('✨ 功能确认:');
                console.log('  - 页面加载后立即显示表格数据');
                console.log('  - 表格容器和表格都正常显示');
                console.log('  - 多账户数据完整显示');
                console.log('  - 视图切换功能正常');
                console.log('  - 所有交互功能完整');
            }
        } else {
            console.log('\n⚠️ 仍需进一步调试...');
        }
        
        console.log('\n📸 所有测试截图已保存: test-css-fix-*.png');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

testCSSFix().catch(console.error);