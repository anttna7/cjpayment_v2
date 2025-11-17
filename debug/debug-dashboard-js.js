const { chromium } = require('playwright');

async function debugDashboardJS() {
    console.log('🔍 开始调试仪表板JavaScript加载...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 监听所有请求
    page.on('request', request => {
        console.log(`➡️  请求: ${request.method()} ${request.url()}`);
    });

    // 监听所有响应
    page.on('response', response => {
        console.log(`⬅️  响应: ${response.status()} ${response.url()}`);
    });

    // 监听控制台日志
    page.on('console', msg => {
        console.log(`🖥️  控制台: ${msg.type()}: ${msg.text()}`);
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
        
        console.log('⏱️  等待DOM内容加载...');
        await page.waitForTimeout(5000);
        
        // 检查相关JavaScript文件是否加载
        const jsFiles = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            return scripts.map(script => script.src);
        });
        console.log('📜 已加载的JS文件:', jsFiles);
        
        // 检查是否存在Dashboard类
        const dashboardExists = await page.evaluate(() => {
            return typeof window.Dashboard !== 'undefined';
        });
        console.log(`🏗️  Dashboard类存在: ${dashboardExists}`);
        
        // 检查是否存在dashboard实例
        const dashboardInstanceExists = await page.evaluate(() => {
            return typeof window.dashboard !== 'undefined';
        });
        console.log(`🎯 dashboard实例存在: ${dashboardInstanceExists}`);
        
        // 检查表格是否存在
        const tableExists = await page.isVisible('#recentTransactionsTable');
        console.log(`📋 交易表格存在: ${tableExists}`);
        
        // 检查tbody是否存在
        const tbodyExists = await page.isVisible('#recentTransactionsTable tbody');
        console.log(`📝 表格tbody存在: ${tbodyExists}`);
        
        // 手动调用API测试
        console.log('🔧 手动测试API调用...');
        const apiTest = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/dashboard/recent-transactions?limit=5');
                const data = await response.json();
                return { success: true, data: data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        console.log('🌐 API测试结果:', apiTest);
        
        // 手动调用loadRecentTransactions
        if (dashboardInstanceExists) {
            console.log('🚀 手动调用loadRecentTransactions...');
            const manualLoad = await page.evaluate(async () => {
                try {
                    if (window.dashboard && window.dashboard.loadRecentTransactions) {
                        await window.dashboard.loadRecentTransactions();
                        return { success: true };
                    } else {
                        return { success: false, error: 'loadRecentTransactions method not found' };
                    }
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });
            console.log('🎯 手动加载结果:', manualLoad);
        }
        
        // 等待看看是否有数据加载
        await page.waitForTimeout(3000);
        
        // 最终检查表格内容
        const finalTableContent = await page.evaluate(() => {
            const tbody = document.querySelector('#recentTransactionsTable tbody');
            if (!tbody) return 'tbody不存在';
            return tbody.innerHTML;
        });
        
        console.log('📊 最终表格内容:', finalTableContent.substring(0, 200));
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-debug-final.png',
            fullPage: true 
        });
        
    } catch (error) {
        console.error('❌ 调试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/dashboard-debug-error.png',
            fullPage: true 
        });
    } finally {
        await browser.close();
    }
}

debugDashboardJS().then(() => {
    console.log('🏁 调试完成');
    process.exit(0);
});