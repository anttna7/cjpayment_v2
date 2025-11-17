/**
 * 调试商户数据生成
 */

const puppeteer = require('puppeteer');

async function debugMerchantData() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        console.log('导航到商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n检查商户数据...');
        const dataCheck = await page.evaluate(() => {
            const manager = window.merchantDataManager;
            if (!manager) return { error: '数据管理器未找到' };
            
            const sample = manager.merchants.slice(0, 3);
            return {
                totalMerchants: manager.merchants.length,
                sampleMerchant: sample[0],
                hasAdAccounts: sample[0]?.adAccounts?.length || 0,
                hasPaymentAccounts: sample[0]?.paymentAccounts?.length || 0,
                dataManagerType: manager.constructor.name,
                methods: Object.getOwnPropertyNames(Object.getPrototypeOf(manager))
            };
        });
        
        console.log('数据检查结果:');
        console.log(`  商户总数: ${dataCheck.totalMerchants}`);
        console.log(`  数据管理器类型: ${dataCheck.dataManagerType}`);
        console.log(`  样本商户广告账户数: ${dataCheck.hasAdAccounts}`);
        console.log(`  样本付款账户数: ${dataCheck.hasPaymentAccounts}`);
        if (dataCheck.sampleMerchant) {
            console.log(`  样本商户名称: ${dataCheck.sampleMerchant.name}`);
            console.log(`  样本商户ID: ${dataCheck.sampleMerchant.id}`);
            console.log(`  充值链接: ${dataCheck.sampleMerchant.rechargeUrl || '未设置'}`);
            console.log(`  行业: ${dataCheck.sampleMerchant.industry || '未设置'}`);
        }
        
        console.log('\n检查渲染器...');
        const rendererCheck = await page.evaluate(() => {
            return {
                enhancedCardRenderer: typeof window.enhancedMerchantCardRenderer,
                enhancedTableRenderer: typeof window.enhancedMerchantTableRenderer,
                regularCardRenderer: typeof window.merchantCardRenderer,
                regularTableRenderer: typeof window.merchantTableRenderer,
                cardContainer: !!document.getElementById('merchantGrid'),
                tableContainer: !!document.getElementById('merchantTableContainer')
            };
        });
        
        console.log('渲染器检查结果:');
        console.log(`  增强卡片渲染器: ${rendererCheck.enhancedCardRenderer}`);
        console.log(`  增强表格渲染器: ${rendererCheck.enhancedTableRenderer}`);
        console.log(`  卡片容器: ${rendererCheck.cardContainer ? '存在' : '不存在'}`);
        console.log(`  表格容器: ${rendererCheck.tableContainer ? '存在' : '不存在'}`);
        
        // 手动调用表格渲染
        console.log('\n手动调用表格渲染...');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const tableCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            
            return {
                containerExists: !!tableContainer,
                containerDisplay: tableContainer ? tableContainer.style.display : null,
                tableExists: !!table,
                rowCount: rows.length,
                containerHTML: tableContainer ? tableContainer.innerHTML.substring(0, 200) + '...' : null
            };
        });
        
        console.log('表格检查结果:');
        console.log(`  表格容器存在: ${tableCheck.containerExists}`);
        console.log(`  容器显示状态: ${tableCheck.containerDisplay}`);
        console.log(`  表格元素存在: ${tableCheck.tableExists}`);
        console.log(`  数据行数量: ${tableCheck.rowCount}`);
        if (tableCheck.containerHTML) {
            console.log(`  容器HTML片段: ${tableCheck.containerHTML}`);
        }
        
        await page.screenshot({ path: 'debug-merchant-data.png', fullPage: true });
        console.log('\n截图已保存: debug-merchant-data.png');
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

debugMerchantData().catch(console.error);