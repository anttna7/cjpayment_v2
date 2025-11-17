/**
 * 检查表格表头问题
 */

const puppeteer = require('puppeteer');

async function checkTableHeader() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const headerCheck = await page.evaluate(() => {
            const table = document.querySelector('.merchant-table');
            if (!table) return { error: '表格不存在' };
            
            const headerRow = table.querySelector('.table-header');
            const thead = table.querySelector('thead');
            const allHeaders = table.querySelectorAll('th');
            const tableHTML = table.innerHTML.substring(0, 500) + '...';
            
            return {
                headerRowExists: !!headerRow,
                theadExists: !!thead,
                thCount: allHeaders.length,
                tableStructure: tableHTML,
                tableChildren: Array.from(table.children).map(child => ({
                    tagName: child.tagName,
                    className: child.className,
                    id: child.id
                }))
            };
        });
        
        console.log('表头检查结果:');
        console.log(`  .table-header 存在: ${headerCheck.headerRowExists}`);
        console.log(`  thead 存在: ${headerCheck.theadExists}`);
        console.log(`  th 元素数量: ${headerCheck.thCount}`);
        console.log(`  表格子元素:`, headerCheck.tableChildren);
        console.log(`  表格HTML结构: ${headerCheck.tableStructure}`);
        
        await page.screenshot({ path: 'check-table-header.png', fullPage: true });
        
    } catch (error) {
        console.error('检查过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

checkTableHeader().catch(console.error);