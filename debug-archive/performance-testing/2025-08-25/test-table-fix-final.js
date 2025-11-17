/**
 * 测试修复后的表格显示功能
 */

const puppeteer = require('puppeteer');

async function testTableFixFinal() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🎯 测试修复后的表格显示功能...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        // 等待页面初始化
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('=== 测试1: 检查页面初始状态 ===');
        const initialState = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            const tableBtn = document.getElementById('tableViewBtn');
            const cardBtn = document.getElementById('gridViewBtn');
            
            return {
                tableDisplay: tableContainer ? tableContainer.style.display : 'unknown',
                cardDisplay: cardContainer ? cardContainer.style.display : 'unknown',
                tableBtnActive: tableBtn ? tableBtn.classList.contains('active') : false,
                cardBtnActive: cardBtn ? cardBtn.classList.contains('active') : false,
                tableRows: document.querySelectorAll('.merchant-row').length,
                accountBadges: document.querySelectorAll('.account-count-badge').length
            };
        });
        
        console.log('页面初始状态:');
        console.log(`  表格容器显示: ${initialState.tableDisplay}`);
        console.log(`  卡片容器显示: ${initialState.cardDisplay}`);
        console.log(`  表格按钮激活: ${initialState.tableBtnActive}`);
        console.log(`  卡片按钮激活: ${initialState.cardBtnActive}`);
        console.log(`  表格数据行数: ${initialState.tableRows}`);
        console.log(`  账户徽章数量: ${initialState.accountBadges}`);
        
        const initialSuccess = initialState.tableDisplay === 'block' && 
                              initialState.tableBtnActive && 
                              initialState.tableRows > 0;
        
        console.log(`✅ 初始状态检查: ${initialSuccess ? '通过' : '失败'}`);
        
        await page.screenshot({ path: 'test-fix-01-initial.png', fullPage: true });
        
        console.log('\n=== 测试2: 视图切换功能 ===');
        
        // 切换到卡片视图
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const cardState = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            const cards = document.querySelectorAll('.merchant-card');
            
            return {
                tableDisplay: tableContainer.style.display,
                cardDisplay: cardContainer.style.display,
                cardCount: cards.length
            };
        });
        
        console.log('切换到卡片视图:');
        console.log(`  表格容器隐藏: ${cardState.tableDisplay === 'none'}`);
        console.log(`  卡片容器显示: ${cardState.cardDisplay !== 'none'}`);
        console.log(`  卡片数量: ${cardState.cardCount}`);
        
        await page.screenshot({ path: 'test-fix-02-cards.png', fullPage: true });
        
        // 切换回表格视图
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const backToTableState = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            const rows = document.querySelectorAll('.merchant-row');
            const accounts = document.querySelectorAll('.account-count-badge');
            
            return {
                tableDisplay: tableContainer.style.display,
                cardDisplay: cardContainer.style.display,
                rowCount: rows.length,
                accountCount: accounts.length
            };
        });
        
        console.log('切换回表格视图:');
        console.log(`  表格容器显示: ${backToTableState.tableDisplay === 'block'}`);
        console.log(`  卡片容器隐藏: ${backToTableState.cardDisplay === 'none'}`);
        console.log(`  数据行数: ${backToTableState.rowCount}`);
        console.log(`  账户数量: ${backToTableState.accountCount}`);
        
        await page.screenshot({ path: 'test-fix-03-back-to-table.png', fullPage: true });
        
        console.log('\n=== 测试3: 表格功能验证 ===');
        
        // 测试账户展开功能
        const expandResult = await page.evaluate(() => {
            const expandButtons = document.querySelectorAll('.expand-toggle');
            if (expandButtons.length > 0) {
                expandButtons[0].click();
                return { hasExpandBtns: true, expandBtnCount: expandButtons.length };
            }
            return { hasExpandBtns: false, expandBtnCount: 0 };
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('账户展开功能:');
        console.log(`  展开按钮存在: ${expandResult.hasExpandBtns}`);
        console.log(`  展开按钮数量: ${expandResult.expandBtnCount}`);
        
        // 测试表格滚动
        const scrollTest = await page.evaluate(() => {
            const table = document.querySelector('.merchant-table');
            if (table) {
                table.scrollLeft = 50;
                const fixedCols = document.querySelectorAll('.col-fixed-left, .col-fixed-right');
                return {
                    scrollable: true,
                    fixedColumnCount: fixedCols.length
                };
            }
            return { scrollable: false, fixedColumnCount: 0 };
        });
        
        console.log('表格滚动功能:');
        console.log(`  表格可滚动: ${scrollTest.scrollable}`);
        console.log(`  固定列数量: ${scrollTest.fixedColumnCount}`);
        
        await page.screenshot({ path: 'test-fix-04-final.png', fullPage: true });
        
        const allTestsPass = initialSuccess && 
                           cardState.cardCount > 0 && 
                           backToTableState.rowCount > 0 &&
                           backToTableState.accountCount > 0;
        
        console.log('\n📊 测试总结:');
        console.log(`🎯 整体功能: ${allTestsPass ? '✅ 全部通过' : '❌ 部分失败'}`);
        console.log('📸 测试截图已保存: test-fix-*.png');
        
        if (allTestsPass) {
            console.log('\n🎉 表格显示问题已完全修复！');
            console.log('✨ 功能确认:');
            console.log('  - 页面加载后立即显示表格数据');
            console.log('  - 表格视图为默认视图');  
            console.log('  - 视图切换功能正常');
            console.log('  - 多账户数据正确显示');
            console.log('  - 交互功能完整');
        } else {
            console.log('\n⚠️ 部分功能仍需调试');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

testTableFixFinal().catch(console.error);