const { chromium } = require('playwright');
const fs = require('fs');

async function testDashboardTransactions() {
    console.log('🔍 开始测试仪表板交易记录数据加载...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 访问仪表板页面
        console.log('📊 访问仪表板页面...');
        await page.goto('http://localhost:8091/dashboard');
        
        // 等待页面加载完成
        await page.waitForTimeout(3000);
        
        // 检查是否存在loading状态
        const loadingExists = await page.isVisible('.table__loading');
        console.log(`⏳ 加载状态可见性: ${loadingExists}`);
        
        // 等待交易记录表格数据加载
        console.log('⏱️  等待交易记录数据加载...');
        await page.waitForFunction(() => {
            const rows = document.querySelectorAll('.table__body .table__row');
            return rows.length > 0 && !document.querySelector('.table__loading');
        }, { timeout: 10000 });
        
        // 检查交易记录表格
        const transactionRows = await page.$$('.table__body .table__row');
        console.log(`📝 交易记录行数: ${transactionRows.length}`);
        
        // 获取第一行交易记录数据
        if (transactionRows.length > 0) {
            const firstRowData = await page.evaluate(() => {
                const firstRow = document.querySelector('.table__body .table__row');
                const cells = firstRow.querySelectorAll('.table__cell');
                return {
                    orderId: cells[0]?.textContent?.trim(),
                    merchant: cells[1]?.textContent?.trim(),
                    amount: cells[2]?.textContent?.trim(),
                    status: cells[3]?.textContent?.trim(),
                    payer: cells[4]?.textContent?.trim(),
                    time: cells[5]?.textContent?.trim()
                };
            });
            console.log('📊 第一条交易记录:', firstRowData);
        }
        
        // 检查是否还有loading状态
        const stillLoading = await page.isVisible('.table__loading');
        console.log(`🔄 是否仍在加载: ${stillLoading}`);
        
        // 截图保存验证结果
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-transactions-test-success.png',
            fullPage: true 
        });
        
        console.log('✅ 交易记录测试完成！数据成功加载');
        
        return {
            success: true,
            transactionCount: transactionRows.length,
            loadingVisible: stillLoading
        };
        
    } catch (error) {
        console.error('❌ 测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-transactions-test-error.png',
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

testDashboardTransactions().then(result => {
    console.log('\n📋 测试结果:', result);
    
    // 保存测试报告
    const report = {
        timestamp: new Date().toISOString(),
        test: '仪表板交易记录数据加载测试',
        result: result
    };
    
    fs.writeFileSync(
        '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-transactions-test-report.json', 
        JSON.stringify(report, null, 2)
    );
    
    console.log('📄 测试报告已保存');
    process.exit(result.success ? 0 : 1);
});