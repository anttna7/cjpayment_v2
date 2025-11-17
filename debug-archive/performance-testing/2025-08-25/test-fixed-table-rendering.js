/**
 * 测试修复后的表格渲染
 */

const puppeteer = require('puppeteer');

async function testFixedTableRendering() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        console.log('访问商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== 测试表格视图 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tableTest = await page.evaluate(() => {
            const container = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const adAccountCells = document.querySelectorAll('[class*="ad-account"]');
            
            // 检查第一行的账户数据
            const firstRow = rows[0];
            const firstAdCell = firstRow ? firstRow.querySelector('.col-ad-accounts') : null;
            const firstPaymentCell = firstRow ? firstRow.querySelector('.col-payment-accounts') : null;
            
            return {
                containerVisible: container ? container.style.display !== 'none' : false,
                tableExists: !!table,
                rowCount: rows.length,
                adAccountCellsCount: adAccountCells.length,
                firstAdCellHTML: firstAdCell ? firstAdCell.innerHTML : null,
                firstPaymentCellHTML: firstPaymentCell ? firstPaymentCell.innerHTML : null,
                hasAccountData: !!document.querySelector('.account-badge')
            };
        });
        
        console.log('表格测试结果:');
        console.log(`  容器可见: ${tableTest.containerVisible}`);
        console.log(`  表格存在: ${tableTest.tableExists}`);
        console.log(`  数据行数: ${tableTest.rowCount}`);
        console.log(`  账户单元格数量: ${tableTest.adAccountCellsCount}`);
        console.log(`  有账户数据: ${tableTest.hasAccountData}`);
        
        await page.screenshot({ path: 'test-fixed-table-01.png', fullPage: true });
        
        console.log('\n=== 测试卡片视图 ===');
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardTest = await page.evaluate(() => {
            const container = document.getElementById('merchantGrid');
            const cards = document.querySelectorAll('.enhanced-merchant-card');
            const accountBadges = document.querySelectorAll('.account-badge');
            
            return {
                containerVisible: container ? container.style.display !== 'none' : false,
                cardCount: cards.length,
                accountBadgeCount: accountBadges.length,
                firstCardHTML: cards[0] ? cards[0].innerHTML.substring(0, 300) + '...' : null
            };
        });
        
        console.log('卡片测试结果:');
        console.log(`  容器可见: ${cardTest.containerVisible}`);
        console.log(`  卡片数量: ${cardTest.cardCount}`);
        console.log(`  账户徽章数量: ${cardTest.accountBadgeCount}`);
        
        await page.screenshot({ path: 'test-fixed-card-02.png', fullPage: true });
        
        // 测试账户展开功能
        console.log('\n=== 测试账户展开功能 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const expandTest = await page.evaluate(() => {
            const expandButtons = document.querySelectorAll('.expand-accounts-btn');
            if (expandButtons.length > 0) {
                expandButtons[0].click();
                return { hasExpandButtons: true, expandButtonCount: expandButtons.length };
            }
            return { hasExpandButtons: false, expandButtonCount: 0 };
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'test-fixed-expand-03.png', fullPage: true });
        
        console.log('展开功能测试结果:');
        console.log(`  有展开按钮: ${expandTest.hasExpandButtons}`);
        console.log(`  展开按钮数量: ${expandTest.expandButtonCount}`);
        
        console.log('\n✅ 测试完成，截图已保存');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

testFixedTableRendering().catch(console.error);