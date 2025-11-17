/**
 * 强制显示表格数据的调试脚本
 */

const puppeteer = require('puppeteer');

async function forceTableDisplay() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 },
        devtools: true
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[浏览器] ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🔧 强制显示表格数据...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('=== 注入强制显示CSS ===');
        
        // 注入CSS强制显示表格
        await page.addStyleTag({
            content: `
                #merchantTableContainer {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: auto !important;
                    min-height: 400px !important;
                    background: #fff !important;
                    border: 2px solid red !important;
                    position: relative !important;
                    z-index: 1000 !important;
                }
                
                .merchant-table {
                    display: table !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 100% !important;
                    height: auto !important;
                    table-layout: auto !important;
                    border: 1px solid blue !important;
                }
                
                .merchant-table tbody {
                    display: table-row-group !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    border: 1px solid green !important;
                }
                
                .merchant-table tbody tr {
                    display: table-row !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: auto !important;
                    min-height: 40px !important;
                    border: 1px solid orange !important;
                }
                
                .merchant-table tbody tr td {
                    display: table-cell !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    padding: 10px !important;
                    border: 1px solid purple !important;
                    vertical-align: top !important;
                    word-wrap: break-word !important;
                }
                
                .merchant-grid {
                    display: none !important;
                }
            `
        });
        
        console.log('CSS注入完成，等待生效...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查效果
        const afterCSS = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            
            const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
            const tableRect = table ? table.getBoundingClientRect() : null;
            
            return {
                containerSize: containerRect ? `${containerRect.width}x${containerRect.height}` : '0x0',
                tableSize: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                rowCount: rows.length,
                containerHTML: tableContainer ? tableContainer.innerHTML.substring(0, 300) + '...' : 'none',
                firstRowHTML: rows[0] ? rows[0].outerHTML.substring(0, 200) + '...' : 'none'
            };
        });
        
        console.log('强制CSS生效后:');
        console.log(`  容器尺寸: ${afterCSS.containerSize}`);
        console.log(`  表格尺寸: ${afterCSS.tableSize}`);
        console.log(`  数据行数: ${afterCSS.rowCount}`);
        console.log(`  容器内容: ${afterCSS.containerHTML}`);
        console.log(`  第一行HTML: ${afterCSS.firstRowHTML}`);
        
        await page.screenshot({ path: 'force-table-display-01.png', fullPage: true });
        
        // 尝试手动调用渲染器
        console.log('\n=== 手动调用渲染器 ===');
        const renderResult = await page.evaluate(() => {
            try {
                if (window.enhancedMerchantTableRenderer) {
                    console.log('调用渲染器...');
                    window.enhancedMerchantTableRenderer.render();
                    return '渲染器调用成功';
                }
                return '渲染器不存在';
            } catch (error) {
                return `渲染器调用失败: ${error.message}`;
            }
        });
        
        console.log(`渲染结果: ${renderResult}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: 'force-table-display-02.png', fullPage: true });
        
        // 再次检查
        const finalCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const accounts = document.querySelectorAll('.account-count-badge');
            
            const containerRect = tableContainer ? tableContainer.getBoundingClientRect() : null;
            const tableRect = table ? table.getBoundingClientRect() : null;
            
            return {
                containerSize: containerRect ? `${containerRect.width}x${containerRect.height}` : '0x0',
                tableSize: tableRect ? `${tableRect.width}x${tableRect.height}` : '0x0',
                rowCount: rows.length,
                accountCount: accounts.length,
                containerVisible: containerRect && containerRect.height > 0,
                tableVisible: tableRect && tableRect.height > 0
            };
        });
        
        console.log('\n=== 最终检查结果 ===');
        console.log(`  容器尺寸: ${finalCheck.containerSize}`);
        console.log(`  表格尺寸: ${finalCheck.tableSize}`);
        console.log(`  数据行数: ${finalCheck.rowCount}`);
        console.log(`  账户数量: ${finalCheck.accountCount}`);
        console.log(`  容器可见: ${finalCheck.containerVisible}`);
        console.log(`  表格可见: ${finalCheck.tableVisible}`);
        
        const success = finalCheck.containerVisible && finalCheck.tableVisible && 
                       finalCheck.rowCount > 0 && finalCheck.accountCount > 0;
        
        console.log(`\n🎯 强制显示结果: ${success ? '✅ 成功' : '❌ 失败'}`);
        
        if (success) {
            console.log('✨ 表格现在应该可见了！请查看浏览器窗口。');
        } else {
            console.log('⚠️ 即使强制CSS也无法显示表格，可能是JavaScript逻辑问题。');
        }
        
        console.log('\n🔧 浏览器保持开启，请手动检查...');
        console.log('按任意键关闭浏览器');
        
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', () => {
            browser.close();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('强制显示过程中发生错误:', error);
        await browser.close();
    }
}

forceTableDisplay().catch(console.error);