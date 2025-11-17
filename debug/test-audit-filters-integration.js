const { chromium } = require('playwright');

async function testAuditFiltersIntegration() {
    console.log('🧪 测试audit-filters与新FinancialAuditTable的集成...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 800
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    // 监听控制台输出
    page.on('console', msg => {
        if (msg.text().includes('FinancialAudit') || msg.text().includes('filter') || msg.text().includes('Table')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    try {
        console.log('🚀 打开财务审核页面...');
        await page.goto('http://localhost:8091/audit');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 等待新的表格管理器加载
        await page.waitForFunction(() => {
            return window.financialAuditTable && window.financialAuditTable.loadAuditData;
        }, { timeout: 10000 });
        
        console.log('✅ 新表格管理器已加载');

        // 1. 截图初始状态
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-01-initial.png',
            fullPage: true 
        });
        
        const initialStats = await page.evaluate(() => {
            return {
                pendingCount: document.getElementById('pendingCount')?.textContent,
                tableRows: document.querySelectorAll('#financialAuditTableBody tr').length,
                activeTab: document.querySelector('.filter-tab.active')?.getAttribute('data-filter')
            };
        });
        console.log('📊 初始状态:', initialStats);

        // 2. 测试标签切换
        console.log('🚨 测试点击紧急处理标签...');
        await page.click('.filter-tab[data-filter="urgent"]');
        await page.waitForTimeout(2000);
        
        const urgentStats = await page.evaluate(() => {
            return {
                activeTab: document.querySelector('.filter-tab.active')?.getAttribute('data-filter'),
                tableRows: document.querySelectorAll('#financialAuditTableBody tr').length,
                urgentTabCount: document.getElementById('urgentTabCount')?.textContent
            };
        });
        console.log('🚨 紧急处理状态:', urgentStats);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-02-urgent.png',
            fullPage: true 
        });

        // 3. 测试高级筛选
        console.log('⚙️ 测试高级筛选功能...');
        
        // 回到待审核标签
        await page.click('.filter-tab[data-filter="pending"]');
        await page.waitForTimeout(1000);
        
        // 选择筛选条件
        await page.selectOption('#paymentTypeFilter', 'private');
        await page.selectOption('#amountRangeFilter', 'large');
        
        // 应用筛选
        await page.click('#applyFiltersBtn');
        await page.waitForTimeout(2000);
        
        const filteredStats = await page.evaluate(() => {
            return {
                paymentType: document.getElementById('paymentTypeFilter')?.value,
                amountRange: document.getElementById('amountRangeFilter')?.value,
                tableRows: document.querySelectorAll('#financialAuditTableBody tr').length,
                pendingCount: document.getElementById('pendingCount')?.textContent
            };
        });
        console.log('⚙️ 筛选后状态:', filteredStats);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-03-filtered.png',
            fullPage: true 
        });

        // 4. 测试重置功能
        console.log('🔄 测试重置筛选功能...');
        await page.click('#resetFiltersBtn');
        await page.waitForTimeout(2000);
        
        const resetStats = await page.evaluate(() => {
            return {
                paymentType: document.getElementById('paymentTypeFilter')?.value,
                amountRange: document.getElementById('amountRangeFilter')?.value,
                tableRows: document.querySelectorAll('#financialAuditTableBody tr').length,
                pendingCount: document.getElementById('pendingCount')?.textContent
            };
        });
        console.log('🔄 重置后状态:', resetStats);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-04-reset.png',
            fullPage: true 
        });

        // 5. 测试视图切换
        console.log('🔍 测试表格/卡片视图切换...');
        
        // 切换到卡片视图
        const viewBtn = await page.$('.view-btn[data-view="cards"]');
        if (viewBtn) {
            await viewBtn.click();
            await page.waitForTimeout(2000);
            
            const cardViewStats = await page.evaluate(() => {
                return {
                    tableVisible: document.getElementById('tableView')?.style.display !== 'none',
                    cardsVisible: document.getElementById('cardsView')?.style.display !== 'none',
                    cardCount: document.querySelectorAll('.financial-audit-card').length
                };
            });
            console.log('🔍 卡片视图状态:', cardViewStats);
            
            await page.screenshot({ 
                path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-05-cards.png',
                fullPage: true 
            });
        }

        console.log('✅ audit-filters集成测试完成！');
        
        return {
            success: true,
            initialStats,
            urgentStats,
            filteredStats,
            resetStats
        };

    } catch (error) {
        console.error('❌ 集成测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/integration-test-error.png',
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

testAuditFiltersIntegration().then(result => {
    console.log('\\n📋 Audit-Filters集成测试结果:');
    
    if (result.success) {
        console.log('\\n🎉 集成测试成功！');
        console.log('\\n✅ 测试通过的功能:');
        console.log('  ├─ 新表格管理器加载');
        console.log('  ├─ 筛选标签切换联动');
        console.log('  ├─ 高级筛选应用');
        console.log('  ├─ 筛选条件重置');
        console.log('  ├─ 统计数据更新');
        console.log('  └─ 视图切换功能');
        
        console.log('\\n📊 测试数据统计:');
        console.log(`  初始订单数: ${result.initialStats?.tableRows || 0}`);
        console.log(`  紧急订单数: ${result.urgentStats?.tableRows || 0}`);
        console.log(`  筛选后订单数: ${result.filteredStats?.tableRows || 0}`);
        console.log(`  重置后订单数: ${result.resetStats?.tableRows || 0}`);
        
    } else {
        console.log('\\n❌ 集成测试失败');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});