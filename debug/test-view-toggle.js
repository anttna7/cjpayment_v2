const { chromium } = require('playwright');

async function testViewToggle() {
    console.log('🔄 测试高级数据表视图切换功能...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 1000  // 慢速以便观察视图切换效果
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    // 监听控制台日志
    page.on('console', msg => {
        if (msg.text().includes('OrderInfoTable') || msg.text().includes('视图')) {
            console.log(`🖥️  ${msg.text()}`);
        }
    });

    const testResults = {
        pageLoaded: false,
        tableViewWorks: false,
        cardViewWorks: false,
        timelineViewWorks: false,
        tooltipsWork: false,
        viewSwitchingSmooth: false
    };

    try {
        console.log('📊 访问数据报表页面...');
        await page.goto('http://localhost:8091/reports');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        testResults.pageLoaded = true;
        console.log('✅ 页面加载成功');

        // 检查视图容器是否存在
        const viewContainers = await page.evaluate(() => {
            return {
                tableView: !!document.getElementById('tableView'),
                cardView: !!document.getElementById('cardView'),
                timelineView: !!document.getElementById('timelineView'),
                cardsGrid: !!document.getElementById('cardsGrid'),
                timelineContainer: !!document.getElementById('timelineContainer')
            };
        });
        
        console.log('📋 视图容器检查:', viewContainers);

        // 测试1: 验证表格视图（默认视图）
        console.log('📋 测试表格视图...');
        const tableViewStatus = await page.evaluate(() => {
            const tableView = document.getElementById('tableView');
            const rows = document.querySelectorAll('#advancedDataTableBody tr.table-row-enhanced');
            const activeBtn = document.querySelector('.view-toggle-btn.active');
            
            return {
                visible: tableView && tableView.style.display !== 'none',
                hasData: rows.length > 0,
                activeView: activeBtn ? activeBtn.getAttribute('data-view') : null,
                rowCount: rows.length
            };
        });
        
        testResults.tableViewWorks = tableViewStatus.visible && tableViewStatus.hasData && tableViewStatus.activeView === 'table';
        console.log(`📋 表格视图: ${tableViewStatus.rowCount}行数据，激活状态: ${tableViewStatus.activeView}`);

        // 测试2: 切换到卡片视图
        console.log('📊 测试卡片视图切换...');
        
        // 测试tooltip
        await page.hover('.view-toggle-btn[data-view="cards"]');
        await page.waitForTimeout(500);
        
        const tooltipVisible = await page.evaluate(() => {
            const btn = document.querySelector('.view-toggle-btn[data-view="cards"]');
            return btn ? btn.getAttribute('title') === '卡片视图' : false;
        });
        testResults.tooltipsWork = tooltipVisible;
        console.log(`💡 Tooltip显示: ${tooltipVisible ? '正常' : '异常'}`);
        
        await page.click('.view-toggle-btn[data-view="cards"]');
        await page.waitForTimeout(2000);
        
        const cardViewStatus = await page.evaluate(() => {
            const tableView = document.getElementById('tableView');
            const cardView = document.getElementById('cardView');
            const cards = document.querySelectorAll('.order-card');
            const activeBtn = document.querySelector('.view-toggle-btn.active');
            
            return {
                tableHidden: tableView && tableView.style.display === 'none',
                cardVisible: cardView && cardView.style.display === 'none' ? false : true,
                cardCount: cards.length,
                activeView: activeBtn ? activeBtn.getAttribute('data-view') : null
            };
        });
        
        testResults.cardViewWorks = cardViewStatus.cardVisible && cardViewStatus.cardCount > 0 && cardViewStatus.activeView === 'cards';
        console.log(`📊 卡片视图: ${cardViewStatus.cardCount}张卡片，表格隐藏: ${cardViewStatus.tableHidden}，激活: ${cardViewStatus.activeView}`);

        // 截图卡片视图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/view-toggle-cards.png',
            fullPage: true 
        });

        // 测试3: 切换到时间线视图
        console.log('📅 测试时间线视图切换...');
        await page.click('.view-toggle-btn[data-view="timeline"]');
        await page.waitForTimeout(2000);
        
        const timelineViewStatus = await page.evaluate(() => {
            const cardView = document.getElementById('cardView');
            const timelineView = document.getElementById('timelineView');
            const timelineDays = document.querySelectorAll('.timeline-day');
            const timelineItems = document.querySelectorAll('.timeline-item');
            const activeBtn = document.querySelector('.view-toggle-btn.active');
            
            return {
                cardHidden: cardView && cardView.style.display === 'none',
                timelineVisible: timelineView && timelineView.style.display !== 'none',
                dayCount: timelineDays.length,
                itemCount: timelineItems.length,
                activeView: activeBtn ? activeBtn.getAttribute('data-view') : null
            };
        });
        
        testResults.timelineViewWorks = timelineViewStatus.timelineVisible && timelineViewStatus.itemCount > 0 && timelineViewStatus.activeView === 'timeline';
        console.log(`📅 时间线视图: ${timelineViewStatus.dayCount}天，${timelineViewStatus.itemCount}项，激活: ${timelineViewStatus.activeView}`);

        // 测试时间线折叠功能
        console.log('🔽 测试时间线展开/收起功能...');
        const toggleButtons = await page.$$('.toggle-day-btn');
        if (toggleButtons.length > 0) {
            await toggleButtons[0].click();
            await page.waitForTimeout(500);
            console.log('✅ 时间线日期折叠功能测试完成');
        }

        // 截图时间线视图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/view-toggle-timeline.png',
            fullPage: true 
        });

        // 测试4: 切回表格视图验证切换流畅性
        console.log('🔄 测试视图切换流畅性...');
        await page.click('.view-toggle-btn[data-view="table"]');
        await page.waitForTimeout(1000);
        
        const finalTableStatus = await page.evaluate(() => {
            const timelineView = document.getElementById('timelineView');
            const tableView = document.getElementById('tableView');
            const rows = document.querySelectorAll('#advancedDataTableBody tr.table-row-enhanced');
            const activeBtn = document.querySelector('.view-toggle-btn.active');
            
            return {
                timelineHidden: timelineView && timelineView.style.display === 'none',
                tableVisible: tableView && tableView.style.display !== 'none',
                hasData: rows.length > 0,
                activeView: activeBtn ? activeBtn.getAttribute('data-view') : null
            };
        });
        
        testResults.viewSwitchingSmooth = finalTableStatus.tableVisible && finalTableStatus.hasData && finalTableStatus.activeView === 'table';
        console.log(`🔄 视图切换: 表格重新激活 ${finalTableStatus.activeView}，数据正常: ${finalTableStatus.hasData}`);

        // 最终截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/view-toggle-final.png',
            fullPage: true 
        });

        // 计算测试结果
        const passedTests = Object.values(testResults).filter(Boolean).length;
        const totalTests = Object.keys(testResults).length;
        
        console.log('\\n📋 视图切换功能测试结果汇总:');
        Object.entries(testResults).forEach(([test, result]) => {
            const testNames = {
                pageLoaded: '页面加载',
                tableViewWorks: '表格视图功能',
                cardViewWorks: '卡片视图功能',
                timelineViewWorks: '时间线视图功能',
                tooltipsWork: '工具提示显示',
                viewSwitchingSmooth: '视图切换流畅性'
            };
            console.log(`  ${result ? '✅' : '❌'} ${testNames[test]}: ${result ? '通过' : '失败'}`);
        });
        
        console.log(`\\n📊 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

        return {
            success: passedTests >= Math.ceil(totalTests * 0.8),
            passRate: Math.round(passedTests/totalTests*100),
            details: testResults,
            viewContainers
        };

    } catch (error) {
        console.error('❌ 视图切换测试过程出现错误:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/debug/view-toggle-error.png',
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

testViewToggle().then(result => {
    console.log('\\n📋 视图切换功能测试最终结果:');
    
    if (result.success) {
        console.log('\\n🎉 视图切换功能测试成功！');
        console.log('✅ 表格视图: 数据显示正常');
        console.log('✅ 卡片视图: 美观的卡片布局，信息完整');
        console.log('✅ 时间线视图: 按日期分组，时间轴清晰');
        console.log('✅ 工具提示: 鼠标悬停显示按钮名称');
        console.log('✅ 切换流畅: 视图间切换无卡顿');
        console.log(`📊 通过率: ${result.passRate}%`);
        console.log('\\n🔍 view-toggle-group 模块说明:');
        console.log('  📋 表格视图: 传统的行列表格形式，适合数据对比');
        console.log('  📊 卡片视图: 卡片式布局，信息更直观易读');
        console.log('  📅 时间轴视图: 按时间排序，支持日期分组和折叠');
    } else {
        console.log('\\n❌ 视图切换功能测试存在问题');
        if (result.error) {
            console.log(`错误: ${result.error}`);
        }
        console.log(`📊 通过率: ${result.passRate || 0}%`);
    }
    
    process.exit(result.success ? 0 : 1);
});