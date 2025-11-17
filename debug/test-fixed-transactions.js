const { chromium } = require('playwright');

async function testFixedTransactions() {
    console.log('🔧 测试修复后的仪表板交易记录功能...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 监听控制台日志
    page.on('console', msg => {
        if (msg.text().includes('Dashboard Enhanced')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    // 监听页面错误
    page.on('pageerror', error => {
        console.error(`❌ 页面错误: ${error.message}`);
    });

    try {
        console.log('📊 访问仪表板页面...');
        await page.goto('http://localhost:8091/dashboard');
        
        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        console.log('⏱️  页面加载完成，等待JavaScript初始化...');
        
        // 等待DashboardEnhanced初始化
        await page.waitForTimeout(3000);
        
        // 检查dashboard实例和方法
        const dashboardCheck = await page.evaluate(() => {
            return {
                dashboardExists: typeof window.dashboard !== 'undefined',
                dashboardEnhancedExists: typeof window.dashboardEnhanced !== 'undefined',
                hasLoadMethod: window.dashboard && typeof window.dashboard.loadRecentTransactions === 'function'
            };
        });
        console.log('🔍 Dashboard实例检查:', dashboardCheck);
        
        // 等待交易记录数据加载（自动触发）
        console.log('⏳ 等待交易记录自动加载...');
        
        // 等待表格数据更新或超时
        try {
            await page.waitForFunction(() => {
                const tbody = document.querySelector('#recentTransactionsTable tbody');
                if (!tbody) return false;
                
                const hasLoading = tbody.querySelector('.table__loading');
                const hasData = tbody.querySelector('.table__row');
                const hasEmpty = tbody.querySelector('.table__empty');
                const hasError = tbody.querySelector('.table__error');
                
                // 如果不是加载状态，说明已经有结果了（数据、空或错误）
                return !hasLoading && (hasData || hasEmpty || hasError);
            }, { timeout: 15000 });
            
            console.log('✅ 交易记录状态已更新');
        } catch (timeoutError) {
            console.warn('⚠️  等待超时，检查当前状态...');
        }
        
        // 检查最终表格状态
        const tableStatus = await page.evaluate(() => {
            const tbody = document.querySelector('#recentTransactionsTable tbody');
            if (!tbody) return { status: 'no_tbody', content: '' };
            
            const hasLoading = tbody.querySelector('.table__loading');
            const dataRows = tbody.querySelectorAll('.table__row');
            const hasEmpty = tbody.querySelector('.table__empty');
            const hasError = tbody.querySelector('.table__error');
            
            if (hasLoading) return { status: 'loading', content: 'still loading' };
            if (hasError) return { status: 'error', content: tbody.innerHTML.substring(0, 200) };
            if (hasEmpty) return { status: 'empty', content: 'no data' };
            if (dataRows.length > 0) {
                return { 
                    status: 'success', 
                    rowCount: dataRows.length,
                    firstRowData: {
                        orderId: dataRows[0].children[0]?.textContent?.trim(),
                        payer: dataRows[0].children[1]?.textContent?.trim(),
                        amount: dataRows[0].children[2]?.textContent?.trim(),
                        merchant: dataRows[0].children[3]?.textContent?.trim(),
                        status: dataRows[0].children[4]?.textContent?.trim()
                    }
                };
            }
            
            return { status: 'unknown', content: tbody.innerHTML.substring(0, 200) };
        });
        
        console.log('📊 交易记录表格状态:', tableStatus);
        
        // 截图保存结果
        const screenshotPath = tableStatus.status === 'success' 
            ? '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-transactions-fixed-success.png'
            : '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-transactions-fixed-error.png';
            
        await page.screenshot({ 
            path: screenshotPath,
            fullPage: true 
        });
        
        console.log(`📸 结果截图已保存: ${screenshotPath}`);
        
        // 如果成功，可以测试手动重新加载
        if (tableStatus.status === 'success' && dashboardCheck.hasLoadMethod) {
            console.log('🔄 测试手动重新加载交易记录...');
            
            await page.evaluate(() => {
                window.dashboard.loadRecentTransactions(5);
            });
            
            await page.waitForTimeout(2000);
            console.log('✅ 手动重新加载完成');
        }
        
        return {
            success: tableStatus.status === 'success',
            status: tableStatus.status,
            details: tableStatus
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

testFixedTransactions().then(result => {
    console.log('\n📋 最终测试结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('\n🎉 交易记录功能修复成功！');
    } else {
        console.log('\n❌ 交易记录功能仍有问题');
    }
    
    process.exit(result.success ? 0 : 1);
});