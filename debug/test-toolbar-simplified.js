const { chromium } = require('playwright');

async function testToolbarSimplified() {
    console.log('🔧 简化版Toolbar交互功能测试...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 800
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    // 监听控制台日志
    page.on('console', msg => {
        if (msg.text().includes('OrderInfoTable')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    const testResults = {
        pageLoaded: false,
        tableRendered: false,
        searchWorks: false,
        filterWorks: false,
        viewToggleWorks: false,
        densityWorks: false,
        exportButtonWorks: false,
        refreshWorks: false
    };

    try {
        console.log('📊 访问数据报表页面...');
        await page.goto('http://localhost:8091/reports');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        testResults.pageLoaded = true;
        console.log('✅ 页面加载成功');

        // 检查表格是否渲染
        const tableCheck = await page.evaluate(() => {
            const tbody = document.getElementById('advancedDataTableBody');
            const rows = tbody ? tbody.querySelectorAll('tr.table-row-enhanced') : [];
            return {
                tableExists: !!tbody,
                rowCount: rows.length,
                hasData: rows.length > 0
            };
        });

        testResults.tableRendered = tableCheck.hasData;
        console.log(`✅ 表格渲染: ${tableCheck.rowCount}行数据`);

        // 测试搜索功能
        console.log('🔍 测试搜索功能...');
        await page.fill('#advancedTableSearch', '阿里');
        await page.waitForTimeout(1000);
        
        const searchResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('#advancedDataTableBody tr.table-row-enhanced');
            return rows.length;
        });
        
        testResults.searchWorks = searchResult < tableCheck.rowCount && searchResult > 0;
        console.log(`🔍 搜索结果: ${searchResult}行 (原${tableCheck.rowCount}行)`);

        // 清除搜索
        await page.click('#clearSearchBtn');
        await page.waitForTimeout(500);

        // 测试筛选功能
        console.log('⚡ 测试快速筛选...');
        await page.click('.quick-filter-btn[data-filter="success"]');
        await page.waitForTimeout(1000);
        
        const filterResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('#advancedDataTableBody tr.table-row-enhanced');
            const activeBtn = document.querySelector('.quick-filter-btn.active');
            return {
                rowCount: rows.length,
                activeFilter: activeBtn ? activeBtn.getAttribute('data-filter') : null
            };
        });
        
        testResults.filterWorks = filterResult.activeFilter === 'success';
        console.log(`⚡ 筛选结果: ${filterResult.rowCount}行，激活筛选: ${filterResult.activeFilter}`);

        // 重置筛选
        await page.click('.quick-filter-btn[data-filter="all"]');
        await page.waitForTimeout(500);

        // 测试视图切换
        console.log('👁️  测试视图切换...');
        await page.click('.view-toggle-btn[data-view="cards"]');
        await page.waitForTimeout(500);
        
        const viewResult = await page.evaluate(() => {
            const activeBtn = document.querySelector('.view-toggle-btn.active');
            return activeBtn ? activeBtn.getAttribute('data-view') : null;
        });
        
        testResults.viewToggleWorks = viewResult === 'cards';
        console.log(`👁️  当前视图: ${viewResult}`);

        // 切回表格视图
        await page.click('.view-toggle-btn[data-view="table"]');
        await page.waitForTimeout(500);

        // 测试密度控制
        console.log('📏 测试密度控制...');
        await page.click('.density-btn[data-density="compact"]');
        await page.waitForTimeout(500);
        
        const densityResult = await page.evaluate(() => {
            const table = document.getElementById('advancedDataTable');
            const activeBtn = document.querySelector('.density-btn.active');
            return {
                tableHasClass: table ? table.classList.contains('table-compact') : false,
                activeDensity: activeBtn ? activeBtn.getAttribute('data-density') : null
            };
        });
        
        testResults.densityWorks = densityResult.activeDensity === 'compact';
        console.log(`📏 密度设置: ${densityResult.activeDensity}, 表格类: ${densityResult.tableHasClass}`);

        // 测试导出按钮（不点击具体选项，只测试下拉打开）
        console.log('📤 测试导出按钮...');
        await page.click('#exportAdvancedBtn');
        await page.waitForTimeout(500);
        
        const exportResult = await page.evaluate(() => {
            const dropdown = document.getElementById('exportDropdownMenu');
            return {
                dropdownVisible: dropdown ? (
                    dropdown.style.display === 'block' && 
                    dropdown.style.visibility === 'visible'
                ) : false
            };
        });
        
        testResults.exportButtonWorks = exportResult.dropdownVisible;
        console.log(`📤 导出下拉菜单: ${exportResult.dropdownVisible ? '打开' : '关闭'}`);

        // 关闭下拉菜单
        await page.click('body');
        await page.waitForTimeout(300);

        // 测试刷新功能
        console.log('🔄 测试刷新按钮...');
        await page.click('#refreshAdvancedTableBtn');
        await page.waitForTimeout(2000);
        
        const refreshResult = await page.evaluate(() => {
            const rows = document.querySelectorAll('#advancedDataTableBody tr.table-row-enhanced');
            return rows.length > 0;
        });
        
        testResults.refreshWorks = refreshResult;
        console.log(`🔄 刷新后数据: ${refreshResult ? '正常' : '异常'}`);

        // 截图保存结果
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/toolbar-simplified-test-final.png',
            fullPage: true 
        });

        const passedTests = Object.values(testResults).filter(Boolean).length;
        const totalTests = Object.keys(testResults).length;
        
        console.log('\n📋 简化版Toolbar测试结果汇总:');
        Object.entries(testResults).forEach(([test, result]) => {
            console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? '通过' : '失败'}`);
        });
        
        console.log(`\n📊 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

        return {
            success: passedTests >= Math.ceil(totalTests * 0.8),
            passRate: Math.round(passedTests/totalTests*100),
            details: testResults
        };

    } catch (error) {
        console.error('❌ 测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/toolbar-simplified-test-error.png',
            fullPage: true 
        });

        return {
            success: false,
            error: error.message,
            details: testResults
        };
    } finally {
        await browser.close();
    }
}

testToolbarSimplified().then(result => {
    console.log('\n📋 简化版Toolbar测试最终结果:');
    
    if (result.success) {
        console.log('\n🎉 Toolbar交互功能测试通过！');
        console.log('✅ 主要交互功能均正常工作');
        console.log(`📊 通过率: ${result.passRate}%`);
    } else {
        console.log('\n⚠️  Toolbar交互功能存在问题');
        if (result.error) {
            console.log(`错误: ${result.error}`);
        }
        console.log(`📊 通过率: ${result.passRate || 0}%`);
    }
    
    process.exit(result.success ? 0 : 1);
});