/**
 * 最终集成测试 - 验证所有增强功能
 */

const puppeteer = require('puppeteer');

async function finalIntegrationTest() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    let testResults = {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        tests: []
    };
    
    function addTestResult(name, passed, details = {}) {
        testResults.totalTests++;
        if (passed) {
            testResults.passedTests++;
        } else {
            testResults.failedTests++;
        }
        testResults.tests.push({
            name,
            result: passed ? '✅ 通过' : '❌ 失败',
            details
        });
        console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? '通过' : '失败'}`);
        if (Object.keys(details).length > 0) {
            console.log(`   详情:`, details);
        }
    }
    
    try {
        console.log('🚀 开始最终集成测试...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 测试1: 表格视图基本功能
        console.log('\n=== 测试表格视图 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tableTest = await page.evaluate(() => {
            const container = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const accountBadges = document.querySelectorAll('.account-count-badge');
            
            return {
                containerVisible: container && container.style.display !== 'none',
                tableExists: !!table,
                rowCount: rows.length,
                accountBadgeCount: accountBadges.length,
                firstRowId: rows[0]?.getAttribute('data-merchant-id')
            };
        });
        
        addTestResult('表格视图基本渲染', 
            tableTest.containerVisible && tableTest.tableExists && tableTest.rowCount > 0,
            { 
                容器可见: tableTest.containerVisible,
                表格存在: tableTest.tableExists,
                数据行数: tableTest.rowCount
            });
            
        addTestResult('多账户数据显示', 
            tableTest.accountBadgeCount > 0,
            { 
                账户徽章数量: tableTest.accountBadgeCount
            });
        
        await page.screenshot({ path: 'final-test-01-table.png', fullPage: true });
        
        // 测试2: 固定列滚动
        console.log('\n=== 测试固定列滚动 ===');
        const scrollTest = await page.evaluate(() => {
            const table = document.querySelector('.merchant-table');
            const fixedLeftCols = document.querySelectorAll('.col-fixed-left');
            const fixedRightCols = document.querySelectorAll('.col-fixed-right');
            
            if (table) {
                table.scrollLeft = 100;
                return {
                    hasFixedLeft: fixedLeftCols.length > 0,
                    hasFixedRight: fixedRightCols.length > 0,
                    scrolled: table.scrollLeft > 0
                };
            }
            return { hasFixedLeft: false, hasFixedRight: false, scrolled: false };
        });
        
        addTestResult('固定列功能', 
            scrollTest.hasFixedLeft && scrollTest.hasFixedRight,
            scrollTest);
        
        // 测试3: 账户展开功能
        console.log('\n=== 测试账户展开功能 ===');
        const expandTest = await page.evaluate(() => {
            const expandButtons = document.querySelectorAll('.expand-toggle');
            if (expandButtons.length > 0) {
                expandButtons[0].click();
                return {
                    expandButtonCount: expandButtons.length,
                    clickedSuccessfully: true
                };
            }
            return { expandButtonCount: 0, clickedSuccessfully: false };
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const expandResult = await page.evaluate(() => {
            const expandedContainers = document.querySelectorAll('.accounts-expanded');
            return {
                expandedContainers: expandedContainers.length
            };
        });
        
        addTestResult('账户展开交互', 
            expandTest.expandButtonCount > 0,
            { 
                展开按钮数量: expandTest.expandButtonCount,
                展开容器数量: expandResult.expandedContainers
            });
        
        await page.screenshot({ path: 'final-test-02-table-expanded.png', fullPage: true });
        
        // 测试4: 卡片视图
        console.log('\n=== 测试卡片视图 ===');
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardTest = await page.evaluate(() => {
            const container = document.getElementById('merchantGrid');
            const cards = document.querySelectorAll('.enhanced-card');
            const accountSections = document.querySelectorAll('.account-section');
            
            return {
                containerVisible: container && container.style.display !== 'none',
                cardCount: cards.length,
                accountSectionCount: accountSections.length,
                firstCardId: cards[0]?.getAttribute('data-merchant-id')
            };
        });
        
        addTestResult('卡片视图基本渲染', 
            cardTest.containerVisible && cardTest.cardCount > 0,
            {
                容器可见: cardTest.containerVisible,
                卡片数量: cardTest.cardCount,
                账户部分数量: cardTest.accountSectionCount
            });
        
        await page.screenshot({ path: 'final-test-03-cards.png', fullPage: true });
        
        // 测试5: 卡片账户展开
        console.log('\n=== 测试卡片账户展开功能 ===');
        const cardExpandTest = await page.evaluate(() => {
            const expandButtons = document.querySelectorAll('.account-expand-btn');
            if (expandButtons.length > 0) {
                expandButtons[0].click();
                return {
                    expandButtonCount: expandButtons.length,
                    clicked: true
                };
            }
            return { expandButtonCount: 0, clicked: false };
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'final-test-04-cards-expanded.png', fullPage: true });
        
        addTestResult('卡片账户展开功能', 
            cardExpandTest.expandButtonCount > 0,
            cardExpandTest);
        
        // 测试6: 视图切换
        console.log('\n=== 测试视图切换 ===');
        let switchTests = [];
        
        // 切换到表格
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const tableSwitch = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            return {
                tableVisible: tableContainer.style.display !== 'none',
                cardHidden: cardContainer.style.display === 'none'
            };
        });
        switchTests.push('表格切换: ' + (tableSwitch.tableVisible && tableSwitch.cardHidden ? '成功' : '失败'));
        
        // 切换到卡片
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const cardSwitch = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            return {
                tableHidden: tableContainer.style.display === 'none',
                cardVisible: cardContainer.style.display !== 'none'
            };
        });
        switchTests.push('卡片切换: ' + (cardSwitch.tableHidden && cardSwitch.cardVisible ? '成功' : '失败'));
        
        addTestResult('视图切换功能', 
            tableSwitch.tableVisible && cardSwitch.cardVisible,
            { 切换测试: switchTests });
        
        console.log('\n=== 测试总结 ===');
        console.log(`📊 测试完成: ${testResults.passedTests}/${testResults.totalTests} 通过`);
        console.log(`✅ 通过: ${testResults.passedTests}`);
        console.log(`❌ 失败: ${testResults.failedTests}`);
        console.log(`📈 通过率: ${(testResults.passedTests / testResults.totalTests * 100).toFixed(1)}%`);
        
        // 保存测试报告
        require('fs').writeFileSync(
            'final-integration-test-report.json', 
            JSON.stringify(testResults, null, 2)
        );
        
        console.log('\n📋 详细测试报告已保存到: final-integration-test-report.json');
        console.log('📸 测试截图已保存: final-test-*.png');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        addTestResult('整体测试', false, { error: error.message });
    } finally {
        await browser.close();
    }
    
    return testResults;
}

finalIntegrationTest().catch(console.error);