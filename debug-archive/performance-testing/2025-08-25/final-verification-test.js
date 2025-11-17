/**
 * 最终验证测试 - 确认所有功能正常
 */

const puppeteer = require('puppeteer');

async function finalVerificationTest() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    let results = {
        tests: [],
        passed: 0,
        failed: 0
    };
    
    function addResult(name, success, details = '') {
        results.tests.push({ name, success, details });
        if (success) {
            results.passed++;
            console.log(`✅ ${name}`);
        } else {
            results.failed++;
            console.log(`❌ ${name} - ${details}`);
        }
    }
    
    try {
        console.log('🎯 开始最终验证测试...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 测试1: 基础数据加载
        const dataTest = await page.evaluate(() => {
            const manager = window.merchantDataManager;
            return {
                hasData: manager && manager.merchants.length > 0,
                merchantCount: manager ? manager.merchants.length : 0,
                hasEnhancedRenderers: !!(window.enhancedMerchantTableRenderer && window.enhancedMerchantCardRenderer)
            };
        });
        
        addResult('数据加载', dataTest.hasData, `商户数量: ${dataTest.merchantCount}`);
        addResult('增强渲染器初始化', dataTest.hasEnhancedRenderers);
        
        // 测试2: 表格视图
        console.log('\n🔍 测试表格视图...');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tableTest = await page.evaluate(() => {
            const container = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const rows = document.querySelectorAll('.merchant-row');
            const accounts = document.querySelectorAll('.account-count-badge');
            
            return {
                containerVisible: container && container.style.display !== 'none',
                tableExists: !!table,
                hasRows: rows.length > 0,
                rowCount: rows.length,
                hasAccountBadges: accounts.length > 0,
                accountBadgeCount: accounts.length
            };
        });
        
        addResult('表格容器显示', tableTest.containerVisible);
        addResult('表格结构正确', tableTest.tableExists);
        addResult('数据行渲染', tableTest.hasRows, `${tableTest.rowCount} 行`);
        addResult('账户数据显示', tableTest.hasAccountBadges, `${tableTest.accountBadgeCount} 个徽章`);
        
        // 测试3: 账户展开功能
        console.log('\n🔍 测试账户展开功能...');
        const expandTest = await page.evaluate(() => {
            const expandBtns = document.querySelectorAll('.expand-toggle');
            if (expandBtns.length > 0) {
                expandBtns[0].click();
                return { hasExpandBtns: true, expandBtnCount: expandBtns.length };
            }
            return { hasExpandBtns: false, expandBtnCount: 0 };
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        addResult('账户展开按钮', expandTest.hasExpandBtns, `${expandTest.expandBtnCount} 个按钮`);
        
        await page.screenshot({ path: 'final-verify-01-table.png', fullPage: true });
        
        // 测试4: 卡片视图
        console.log('\n🔍 测试卡片视图...');
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardTest = await page.evaluate(() => {
            const container = document.getElementById('merchantGrid');
            const cards = document.querySelectorAll('.merchant-card');
            
            return {
                containerVisible: container && container.style.display !== 'none',
                hasCards: cards.length > 0,
                cardCount: cards.length
            };
        });
        
        addResult('卡片容器显示', cardTest.containerVisible);
        addResult('卡片渲染', cardTest.hasCards, `${cardTest.cardCount} 张卡片`);
        
        await page.screenshot({ path: 'final-verify-02-cards.png', fullPage: true });
        
        // 测试5: 视图切换
        console.log('\n🔍 测试视图切换...');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const switchTest1 = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            return {
                tableVisible: tableContainer.style.display !== 'none',
                cardHidden: cardContainer.style.display === 'none'
            };
        });
        
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const switchTest2 = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            return {
                tableHidden: tableContainer.style.display === 'none',
                cardVisible: cardContainer.style.display !== 'none'
            };
        });
        
        addResult('表格→卡片切换', switchTest1.tableVisible && switchTest1.cardHidden);
        addResult('卡片→表格切换', switchTest2.cardVisible && switchTest2.tableHidden);
        
        console.log('\n📊 测试总结');
        console.log(`总测试数: ${results.passed + results.failed}`);
        console.log(`✅ 通过: ${results.passed}`);
        console.log(`❌ 失败: ${results.failed}`);
        console.log(`📈 通过率: ${(results.passed / (results.passed + results.failed) * 100).toFixed(1)}%`);
        
        if (results.failed === 0) {
            console.log('\n🎉 所有功能测试通过！商户管理表格系统工作正常！');
        } else {
            console.log('\n⚠️  部分测试未通过，需要进一步检查。');
        }
        
        // 保存测试报告
        require('fs').writeFileSync(
            'final-verification-report.json',
            JSON.stringify({
                timestamp: new Date().toISOString(),
                summary: {
                    total: results.passed + results.failed,
                    passed: results.passed,
                    failed: results.failed,
                    passRate: (results.passed / (results.passed + results.failed) * 100).toFixed(1) + '%'
                },
                tests: results.tests
            }, null, 2)
        );
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        addResult('整体测试执行', false, error.message);
    } finally {
        await browser.close();
    }
    
    return results;
}

finalVerificationTest().catch(console.error);