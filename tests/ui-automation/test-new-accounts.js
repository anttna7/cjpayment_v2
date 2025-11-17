/**
 * 测试全新账户管理页面功能
 */
const { chromium } = require('playwright');

async function testNewAccountsPage() {
    console.log('🚀 开始测试全新账户管理页面...\n');
    
    let browser, page;
    let issues = [];
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 1000,
            viewport: { width: 1440, height: 900 }
        });
        const context = await browser.newContext();
        page = await context.newPage();

        // 监听console日志和错误
        page.on('console', msg => console.log(`页面Console: ${msg.text()}`));
        page.on('pageerror', error => {
            console.error(`页面错误: ${error.message}`);
            issues.push(`JavaScript错误: ${error.message}`);
        });

        console.log('📱 访问新账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts_new');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 检查页面基础加载
        console.log('\n1️⃣ 检查页面基础加载...');
        const pageTitle = await page.title();
        console.log(`页面标题: ${pageTitle}`);

        const mainElements = await page.evaluate(() => {
            return {
                header: !!document.querySelector('.page-header'),
                tabs: document.querySelectorAll('.tab-nav__item').length,
                activeTab: document.querySelector('.tab-nav__item--active')?.dataset.tab,
                activePanel: document.querySelector('.tab-panel--active')?.id
            };
        });
        
        console.log('主要元素检查:', mainElements);
        
        if (mainElements.tabs !== 3) {
            issues.push(`标签数量不正确: 期望3个，实际${mainElements.tabs}个`);
        }

        // 测试标签切换
        console.log('\n2️⃣ 测试标签切换功能...');
        
        const tabs = ['payment-accounts', 'receiving-accounts', 'polling-rules'];
        
        for (const tab of tabs) {
            console.log(`  切换到 ${tab} 标签...`);
            await page.locator(`[data-tab="${tab}"]`).click();
            await page.waitForTimeout(1000);
            
            const tabState = await page.evaluate((tabName) => {
                const activeTab = document.querySelector('.tab-nav__item--active');
                const activePanel = document.querySelector('.tab-panel--active');
                return {
                    isTabActive: activeTab?.dataset.tab === tabName,
                    isPanelActive: activePanel?.dataset.tab === tabName,
                    panelContent: activePanel?.innerHTML?.length > 100
                };
            }, tab);
            
            console.log(`  ${tab} 状态:`, tabState);
            
            if (!tabState.isTabActive || !tabState.isPanelActive) {
                issues.push(`${tab} 标签切换异常`);
            }
        }

        // 测试付款账户数据加载
        console.log('\n3️⃣ 测试付款账户数据加载...');
        await page.locator('[data-tab="payment-accounts"]').click();
        await page.waitForTimeout(1500);
        
        const paymentAccountsData = await page.evaluate(() => {
            const tbody = document.getElementById('paymentAccountsTableBody');
            const rows = tbody?.querySelectorAll('tr') || [];
            const dataRows = Array.from(rows).filter(row => !row.querySelector('.table__loading'));
            
            return {
                totalRows: rows.length,
                dataRows: dataRows.length,
                hasData: dataRows.length > 0,
                firstRowData: dataRows[0] ? {
                    序号: dataRows[0].cells[0]?.textContent.trim(),
                    付款账号: dataRows[0].cells[1]?.textContent.trim(),
                    账户名称: dataRows[0].cells[2]?.textContent.trim(),
                    状态: dataRows[0].cells[7]?.textContent.trim()
                } : null
            };
        });
        
        console.log('付款账户数据:', paymentAccountsData);
        
        if (!paymentAccountsData.hasData) {
            issues.push('付款账户数据未正确加载');
        }

        // 测试收款账户功能
        console.log('\n4️⃣ 测试收款账户功能...');
        await page.locator('[data-tab="receiving-accounts"]').click();
        await page.waitForTimeout(1500);
        
        const receivingAccountsData = await page.evaluate(() => {
            const tbody = document.getElementById('receivingAccountsTableBody');
            const rows = tbody?.querySelectorAll('tr') || [];
            const dataRows = Array.from(rows).filter(row => !row.querySelector('.table__loading'));
            
            return {
                hasData: dataRows.length > 0,
                dataRows: dataRows.length
            };
        });
        
        console.log('收款账户数据:', receivingAccountsData);

        // 测试添加收款账户模态框
        console.log('\n5️⃣ 测试添加收款账户模态框...');
        await page.locator('#addReceivingAccountBtn').click();
        await page.waitForTimeout(1000);
        
        const modalState = await page.evaluate(() => {
            const modal = document.getElementById('receivingAccountModalOverlay');
            const form = document.getElementById('receivingAccountForm');
            return {
                modalVisible: modal?.classList.contains('active'),
                formExists: !!form,
                requiredFields: {
                    accountName: !!document.getElementById('receivingAccountName'),
                    accountNumber: !!document.getElementById('receivingAccountNumber'),
                    accountType: !!document.getElementById('receivingAccountType')
                }
            };
        });
        
        console.log('模态框状态:', modalState);
        
        if (!modalState.modalVisible) {
            issues.push('收款账户模态框未正确显示');
        }
        
        // 关闭模态框
        await page.locator('#receivingAccountModalClose').click();
        await page.waitForTimeout(500);

        // 测试轮询规则页面
        console.log('\n6️⃣ 测试轮询规则功能...');
        await page.locator('[data-tab="polling-rules"]').click();
        await page.waitForTimeout(1500);
        
        const pollingRulesState = await page.evaluate(() => {
            const modeCards = document.querySelectorAll('.polling-mode-card');
            const pollingContainer = document.getElementById('pollingGroupsContainer');
            
            return {
                modeCards: modeCards.length,
                modesAvailable: Array.from(modeCards).map(card => card.dataset.mode),
                pollingGroupsContainer: !!pollingContainer,
                createButtonExists: !!document.getElementById('createPollingGroupBtn')
            };
        });
        
        console.log('轮询规则状态:', pollingRulesState);
        
        if (pollingRulesState.modeCards !== 5) {
            issues.push(`轮询模式卡片数量不正确: 期望5个，实际${pollingRulesState.modeCards}个`);
        }

        // 测试轮询组创建模态框
        console.log('\n7️⃣ 测试轮询组创建...');
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1000);
        
        const pollingGroupModalState = await page.evaluate(() => {
            const modal = document.getElementById('pollingGroupModalOverlay');
            const accountSelector = document.getElementById('accountSelector');
            return {
                modalVisible: modal?.classList.contains('active'),
                accountSelectorExists: !!accountSelector,
                accountSelectorHasContent: accountSelector?.innerHTML?.length > 50
            };
        });
        
        console.log('轮询组模态框状态:', pollingGroupModalState);
        
        if (!pollingGroupModalState.modalVisible) {
            issues.push('轮询组模态框未正确显示');
        }
        
        // 关闭模态框
        await page.locator('#pollingGroupModalClose').click();
        await page.waitForTimeout(500);

        // 最终页面截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/new-accounts-final.png',
            fullPage: true 
        });
        
        console.log('\n📸 最终截图: new-accounts-final.png');

        // 测试总结
        console.log('\n📊 测试总结:');
        if (issues.length === 0) {
            console.log('✅ 所有功能测试通过！新账户管理页面工作正常。');
        } else {
            console.log('⚠️ 发现以下问题:');
            issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }

        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
        issues.push(`测试执行错误: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return issues;
}

// 自动修复函数
async function autoFixIssues(issues) {
    console.log('\n🔧 开始自动修复发现的问题...');
    
    if (issues.length === 0) {
        console.log('✅ 无需修复，所有功能正常！');
        return;
    }
    
    // 这里可以添加具体的自动修复逻辑
    console.log('待修复问题列表:');
    issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
    });
}

// 执行测试并自动修复
testNewAccountsPage()
    .then(autoFixIssues)
    .catch(console.error);