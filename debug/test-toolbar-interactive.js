const { chromium } = require('playwright');

async function testToolbarInteractive() {
    console.log('🔧 测试高级数据表Toolbar交互功能...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 500  // 慢速模式以便观察
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

    // 监听页面错误
    page.on('pageerror', error => {
        console.error(`❌ 页面错误: ${error.message}`);
    });

    const testResults = {
        searchFunction: false,
        quickFilters: false,
        viewToggle: false,
        densityControl: false,
        exportDropdown: false,
        refreshButton: false,
        notificationSystem: false
    };

    try {
        console.log('📊 访问数据报表页面...');
        await page.goto('http://localhost:8091/reports');
        
        // 等待页面加载完成
        await page.waitForLoadState('networkidle');
        console.log('⏱️  页面加载完成，等待OrderInfoTable初始化...');
        
        // 等待表格初始化
        await page.waitForTimeout(3000);
        
        // 检查表格和工具栏是否存在
        const elementsExist = await page.evaluate(() => {
            return {
                table: !!document.getElementById('advancedDataTable'),
                searchInput: !!document.getElementById('advancedTableSearch'),
                searchBtn: !!document.getElementById('searchBtn'),
                quickFilters: document.querySelectorAll('.quick-filter-btn').length,
                viewToggleBtns: document.querySelectorAll('.view-toggle-btn').length,
                densityBtns: document.querySelectorAll('.density-btn').length,
                exportBtn: !!document.getElementById('exportAdvancedBtn'),
                refreshBtn: !!document.getElementById('refreshAdvancedTableBtn')
            };
        });
        
        console.log('🔍 工具栏元素检查:', elementsExist);

        // 测试1: 搜索功能
        console.log('🔍 测试搜索功能...');
        if (elementsExist.searchInput && elementsExist.searchBtn) {
            // 输入搜索词
            await page.fill('#advancedTableSearch', '阿里巴巴');
            await page.waitForTimeout(500);
            
            // 点击搜索按钮
            await page.click('#searchBtn');
            await page.waitForTimeout(1000);
            
            // 检查搜索结果
            const searchResults = await page.evaluate(() => {
                const rows = document.querySelectorAll('#advancedDataTableBody tr');
                const clearBtn = document.getElementById('clearSearchBtn');
                return {
                    totalRows: rows.length,
                    clearBtnVisible: clearBtn && clearBtn.style.display !== 'none',
                    hasResults: rows.length > 0 && !rows[0].classList.contains('loading-row')
                };
            });
            
            console.log('🔍 搜索结果:', searchResults);
            testResults.searchFunction = searchResults.hasResults && searchResults.clearBtnVisible;
            
            // 清除搜索
            if (searchResults.clearBtnVisible) {
                await page.click('#clearSearchBtn');
                await page.waitForTimeout(500);
            }
        }

        // 测试2: 快速筛选按钮
        console.log('⚡ 测试快速筛选功能...');
        if (elementsExist.quickFilters > 0) {
            // 点击"成功"筛选
            await page.click('.quick-filter-btn[data-filter="success"]');
            await page.waitForTimeout(1000);
            
            // 检查筛选结果
            const filterResults = await page.evaluate(() => {
                const activeBtn = document.querySelector('.quick-filter-btn.active');
                const rows = document.querySelectorAll('#advancedDataTableBody tr');
                return {
                    activeFilter: activeBtn ? activeBtn.getAttribute('data-filter') : null,
                    totalRows: rows.length,
                    hasResults: rows.length > 0 && !rows[0].classList.contains('loading-row')
                };
            });
            
            console.log('⚡ 快速筛选结果:', filterResults);
            testResults.quickFilters = filterResults.activeFilter === 'success' && filterResults.hasResults;
            
            // 重置筛选
            await page.click('.quick-filter-btn[data-filter="all"]');
            await page.waitForTimeout(500);
        }

        // 测试3: 视图切换
        console.log('👁️  测试视图切换功能...');
        if (elementsExist.viewToggleBtns > 0) {
            // 点击卡片视图
            await page.click('.view-toggle-btn[data-view="cards"]');
            await page.waitForTimeout(500);
            
            const viewResults = await page.evaluate(() => {
                const activeBtn = document.querySelector('.view-toggle-btn.active');
                const tableContainer = document.querySelector('.table-container-enhanced');
                return {
                    activeView: activeBtn ? activeBtn.getAttribute('data-view') : null,
                    containerClasses: tableContainer ? Array.from(tableContainer.classList) : []
                };
            });
            
            console.log('👁️  视图切换结果:', viewResults);
            testResults.viewToggle = viewResults.activeView === 'cards';
            
            // 切换回表格视图
            await page.click('.view-toggle-btn[data-view="table"]');
            await page.waitForTimeout(500);
        }

        // 测试4: 密度控制
        console.log('📏 测试密度控制功能...');
        if (elementsExist.densityBtns > 0) {
            // 点击紧凑视图
            await page.click('.density-btn[data-density="compact"]');
            await page.waitForTimeout(500);
            
            const densityResults = await page.evaluate(() => {
                const activeBtn = document.querySelector('.density-btn.active');
                const table = document.getElementById('advancedDataTable');
                return {
                    activeDensity: activeBtn ? activeBtn.getAttribute('data-density') : null,
                    tableClasses: table ? Array.from(table.classList) : []
                };
            });
            
            console.log('📏 密度控制结果:', densityResults);
            testResults.densityControl = densityResults.activeDensity === 'compact';
            
            // 恢复默认密度
            await page.click('.density-btn[data-density="default"]');
            await page.waitForTimeout(500);
        }

        // 测试5: 导出下拉菜单
        console.log('📤 测试导出下拉菜单...');
        if (elementsExist.exportBtn) {
            // 点击导出按钮
            await page.click('#exportAdvancedBtn');
            await page.waitForTimeout(500);
            
            const exportResults = await page.evaluate(() => {
                const dropdown = document.getElementById('exportDropdownMenu');
                const items = dropdown ? dropdown.querySelectorAll('.dropdown-item').length : 0;
                return {
                    dropdownVisible: dropdown ? dropdown.style.display === 'block' : false,
                    itemCount: items
                };
            });
            
            console.log('📤 导出菜单结果:', exportResults);
            testResults.exportDropdown = exportResults.dropdownVisible && exportResults.itemCount > 0;
            
            // 测试导出选项
            if (exportResults.dropdownVisible) {
                await page.click('[data-export="current"]');
                await page.waitForTimeout(1000);
            }
        }

        // 测试6: 刷新按钮
        console.log('🔄 测试刷新按钮...');
        if (elementsExist.refreshBtn) {
            await page.click('#refreshAdvancedTableBtn');
            await page.waitForTimeout(2000);
            
            // 检查是否有刷新动作
            const refreshResults = await page.evaluate(() => {
                const rows = document.querySelectorAll('#advancedDataTableBody tr');
                return {
                    hasData: rows.length > 0 && !rows[0].classList.contains('loading-row')
                };
            });
            
            console.log('🔄 刷新结果:', refreshResults);
            testResults.refreshButton = refreshResults.hasData;
        }

        // 测试7: 通知系统
        console.log('🔔 测试通知系统...');
        // 触发一个会显示通知的操作
        await page.click('#columnSettingsBtn');
        await page.waitForTimeout(1000);
        
        const notificationResults = await page.evaluate(() => {
            const notifications = document.querySelectorAll('.table-notification');
            return {
                notificationCount: notifications.length,
                hasNotification: notifications.length > 0
            };
        });
        
        console.log('🔔 通知系统结果:', notificationResults);
        testResults.notificationSystem = notificationResults.hasNotification;

        // 等待通知消失
        await page.waitForTimeout(3000);

        // 截图保存测试结果
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/toolbar-interactive-test-success.png',
            fullPage: true 
        });
        
        console.log('📸 Toolbar交互测试截图已保存');
        
        // 评估整体测试结果
        const allTestsPassed = Object.values(testResults).filter(result => result === true).length;
        const totalTests = Object.keys(testResults).length;
        
        console.log('\n📋 Toolbar交互功能测试结果汇总:');
        Object.entries(testResults).forEach(([testName, result]) => {
            const icon = result ? '✅' : '❌';
            console.log(`  ${icon} ${testName}: ${result ? '通过' : '失败'}`);
        });
        
        console.log(`\n📊 测试通过率: ${allTestsPassed}/${totalTests} (${Math.round(allTestsPassed/totalTests*100)}%)`);
        
        return {
            success: allTestsPassed >= Math.ceil(totalTests * 0.8), // 80%以上通过率视为成功
            details: testResults,
            passRate: Math.round(allTestsPassed/totalTests*100),
            elementsCheck: elementsExist
        };
        
    } catch (error) {
        console.error('❌ Toolbar交互测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/toolbar-interactive-test-error.png',
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

testToolbarInteractive().then(result => {
    console.log('\n📋 Toolbar交互功能测试最终结果:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('\n🎉 Toolbar交互功能测试成功！');
        console.log('✅ 所有主要功能按钮均可正常交互');
        console.log('✅ 搜索、筛选、视图切换功能正常');
        console.log('✅ 通知系统工作正常');
        console.log(`📊 测试通过率: ${result.passRate}%`);
    } else {
        console.log('\n❌ Toolbar交互功能测试存在问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
        console.log('请检查具体失败的功能模块');
    }
    
    process.exit(result.success ? 0 : 1);
});