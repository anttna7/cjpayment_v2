/**
 * 调试表格HTML生成
 */

const puppeteer = require('puppeteer');

async function debugTableHTML() {
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
        
        console.log('\n=== 检查商户数据结构 ===');
        const dataStructure = await page.evaluate(() => {
            const manager = window.merchantDataManager;
            if (!manager) return { error: '数据管理器未找到' };
            
            const firstMerchant = manager.merchants[0];
            return {
                merchantKeys: Object.keys(firstMerchant),
                adAccountsType: typeof firstMerchant.adAccounts,
                adAccountsLength: firstMerchant.adAccounts?.length,
                adAccountsContent: firstMerchant.adAccounts,
                paymentAccountsType: typeof firstMerchant.paymentAccounts,
                paymentAccountsLength: firstMerchant.paymentAccounts?.length,
                paymentAccountsContent: firstMerchant.paymentAccounts?.slice(0, 2)
            };
        });
        
        console.log('商户数据结构:');
        console.log(`  商户字段: ${dataStructure.merchantKeys?.join(', ')}`);
        console.log(`  adAccounts类型: ${dataStructure.adAccountsType}`);
        console.log(`  adAccounts长度: ${dataStructure.adAccountsLength}`);
        console.log(`  paymentAccounts类型: ${dataStructure.paymentAccountsType}`);
        console.log(`  paymentAccounts长度: ${dataStructure.paymentAccountsLength}`);
        if (dataStructure.adAccountsContent) {
            console.log(`  adAccounts内容:`, dataStructure.adAccountsContent[0]);
        }
        if (dataStructure.paymentAccountsContent) {
            console.log(`  paymentAccounts内容:`, dataStructure.paymentAccountsContent[0]);
        }
        
        console.log('\n=== 测试表格渲染 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tableHTML = await page.evaluate(() => {
            const firstRow = document.querySelector('.merchant-row');
            if (!firstRow) return { error: '没有找到数据行' };
            
            const adCell = firstRow.querySelector('.col-ad-accounts');
            const paymentCell = firstRow.querySelector('.col-payment-accounts');
            
            return {
                firstRowHTML: firstRow.outerHTML.substring(0, 500) + '...',
                adCellHTML: adCell ? adCell.innerHTML : '广告账户单元格未找到',
                paymentCellHTML: paymentCell ? paymentCell.innerHTML : '付款账户单元格未找到',
                adCellExists: !!adCell,
                paymentCellExists: !!paymentCell
            };
        });
        
        console.log('表格HTML检查:');
        console.log(`  广告账户单元格存在: ${tableHTML.adCellExists}`);
        console.log(`  付款账户单元格存在: ${tableHTML.paymentCellExists}`);
        console.log(`  第一行HTML: ${tableHTML.firstRowHTML}`);
        console.log(`  广告账户单元格HTML: ${tableHTML.adCellHTML}`);
        console.log(`  付款账户单元格HTML: ${tableHTML.paymentCellHTML}`);
        
        await page.screenshot({ path: 'debug-table-html.png', fullPage: true });
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

debugTableHTML().catch(console.error);