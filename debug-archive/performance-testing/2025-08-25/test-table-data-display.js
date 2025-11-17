/**
 * 测试表格数据显示修复
 */

const puppeteer = require('puppeteer');

async function testTableDataDisplay() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        console.log('🚀 访问商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== 检查数据初始化 ===');
        const dataCheck = await page.evaluate(() => {
            const manager = window.merchantDataManager;
            if (!manager) return { error: '数据管理器未找到' };
            
            return {
                merchantCount: manager.merchants.length,
                firstMerchant: manager.merchants[0],
                enhancedTableRenderer: typeof window.enhancedMerchantTableRenderer,
                enhancedCardRenderer: typeof window.enhancedMerchantCardRenderer
            };
        });
        
        console.log('数据检查结果:');
        console.log(`  商户数量: ${dataCheck.merchantCount}`);
        console.log(`  第一个商户ID: ${dataCheck.firstMerchant?.id}`);
        console.log(`  第一个商户名称: ${dataCheck.firstMerchant?.name}`);
        console.log(`  增强表格渲染器: ${dataCheck.enhancedTableRenderer}`);
        console.log(`  增强卡片渲染器: ${dataCheck.enhancedCardRenderer}`);
        
        console.log('\n=== 测试表格视图 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const tableCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const headerRow = document.querySelector('.table-header');
            
            return {
                containerExists: !!tableContainer,
                containerVisible: tableContainer ? tableContainer.style.display !== 'none' : false,
                tableExists: !!table,
                headerExists: !!headerRow,
                rowCount: rows.length,
                containerHTML: tableContainer ? tableContainer.innerHTML.substring(0, 300) + '...' : null,
                tableHTML: table ? table.innerHTML.substring(0, 300) + '...' : null
            };
        });
        
        console.log('表格检查结果:');
        console.log(`  容器存在: ${tableCheck.containerExists}`);
        console.log(`  容器可见: ${tableCheck.containerVisible}`);
        console.log(`  表格存在: ${tableCheck.tableExists}`);
        console.log(`  表头存在: ${tableCheck.headerExists}`);
        console.log(`  数据行数: ${tableCheck.rowCount}`);
        
        if (tableCheck.rowCount === 0) {
            console.log('\n⚠️  表格无数据，检查渲染过程...');
            
            // 手动调用渲染
            const renderResult = await page.evaluate(() => {
                try {
                    if (window.enhancedMerchantTableRenderer) {
                        window.enhancedMerchantTableRenderer.render();
                        return '渲染器调用成功';
                    } else {
                        return '增强表格渲染器不存在';
                    }
                } catch (error) {
                    return `渲染器调用失败: ${error.message}`;
                }
            });
            
            console.log(`手动渲染结果: ${renderResult}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 再次检查
            const recheck = await page.evaluate(() => {
                const rows = document.querySelectorAll('.merchant-row');
                return { rowCount: rows.length };
            });
            
            console.log(`重新渲染后行数: ${recheck.rowCount}`);
        }
        
        await page.screenshot({ path: 'test-table-fix-01.png', fullPage: true });
        
        console.log('\n=== 测试卡片视图 ===');
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardCheck = await page.evaluate(() => {
            const cardContainer = document.getElementById('merchantGrid');
            const cards = document.querySelectorAll('.merchant-card');
            
            return {
                containerExists: !!cardContainer,
                containerVisible: cardContainer ? cardContainer.style.display !== 'none' : false,
                cardCount: cards.length
            };
        });
        
        console.log('卡片检查结果:');
        console.log(`  容器存在: ${cardCheck.containerExists}`);
        console.log(`  容器可见: ${cardCheck.containerVisible}`);
        console.log(`  卡片数量: ${cardCheck.cardCount}`);
        
        await page.screenshot({ path: 'test-table-fix-02.png', fullPage: true });
        
        console.log('\n✅ 测试完成');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

testTableDataDisplay().catch(console.error);