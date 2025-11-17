/**
 * 全新账户管理页面最终验证测试
 */
const { chromium } = require('playwright');

async function finalValidation() {
    console.log('🎯 开始全新账户管理页面最终验证...\n');
    
    let browser, page;
    let testResults = {
        passed: [],
        failed: [],
        warnings: []
    };
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 800,
            viewport: { width: 1440, height: 900 }
        });
        const context = await browser.newContext();
        page = await context.newPage();

        // 监听页面事件
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ 页面错误: ${msg.text()}`);
                testResults.failed.push(`页面Console错误: ${msg.text()}`);
            }
        });

        page.on('pageerror', error => {
            console.error(`💥 JavaScript错误: ${error.message}`);
            testResults.failed.push(`JavaScript错误: ${error.message}`);
        });

        console.log('📱 访问全新账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 1. 基础页面结构验证
        console.log('\n1️⃣ 验证页面基础结构...');
        const pageStructure = await page.evaluate(() => {
            return {
                title: document.title,
                hasHeader: !!document.querySelector('.page-header'),
                hasTabNavigation: !!document.querySelector('.tab-navigation'),
                tabCount: document.querySelectorAll('.tab-nav__item').length,
                activeTabText: document.querySelector('.tab-nav__item--active .tab-nav__text')?.textContent,
                hasMainContent: !!document.querySelector('.accounts-management'),
                hasToastNotification: !!document.getElementById('toastNotification')
            };
        });

        console.log('页面结构检查:', pageStructure);

        if (pageStructure.hasHeader && pageStructure.hasTabNavigation && pageStructure.tabCount === 3) {
            testResults.passed.push('✅ 页面基础结构正确');
        } else {
            testResults.failed.push('❌ 页面基础结构异常');
        }

        // 2. 付款账户功能验证
        console.log('\n2️⃣ 验证付款账户功能...');
        
        await page.locator('.tab-nav__item[data-tab="payment-accounts"]').click();
        await page.waitForTimeout(2000);

        const paymentAccountsState = await page.evaluate(() => {
            const tbody = document.getElementById('paymentAccountsTableBody');
            const rows = tbody?.querySelectorAll('tr') || [];
            const dataRows = Array.from(rows).filter(row => 
                !row.querySelector('.table__loading') && 
                row.cells.length > 1
            );

            return {
                tableExists: !!tbody,
                hasLoadingState: !!tbody?.querySelector('.table__loading'),
                dataRowsCount: dataRows.length,
                hasRealData: dataRows.length > 0 && dataRows[0]?.cells[1]?.textContent?.trim()?.length > 0,
                firstRowSample: dataRows[0] ? {
                    序号: dataRows[0].cells[0]?.textContent?.trim(),
                    付款账号: dataRows[0].cells[1]?.textContent?.trim().substring(0, 20) + '...',
                    账户名称: dataRows[0].cells[2]?.textContent?.trim(),
                    状态: dataRows[0].cells[7]?.textContent?.trim()
                } : null
            };
        });

        console.log('付款账户状态:', paymentAccountsState);

        if (paymentAccountsState.hasRealData) {
            testResults.passed.push('✅ 付款账户数据加载正常');
        } else if (paymentAccountsState.hasLoadingState) {
            testResults.warnings.push('⚠️ 付款账户显示加载状态，可能数据源未配置');
        } else {
            testResults.failed.push('❌ 付款账户数据加载失败');
        }

        // 3. 收款账户功能验证
        console.log('\n3️⃣ 验证收款账户功能...');
        
        await page.locator('.tab-nav__item[data-tab="receiving-accounts"]').click();
        await page.waitForTimeout(2000);

        const receivingAccountsState = await page.evaluate(() => {
            const tbody = document.getElementById('receivingAccountsTableBody');
            const rows = tbody?.querySelectorAll('tr') || [];
            const dataRows = Array.from(rows).filter(row => 
                !row.querySelector('.table__loading') && 
                row.cells.length > 1
            );

            return {
                tableExists: !!tbody,
                dataRowsCount: dataRows.length,
                hasRealData: dataRows.length > 0
            };
        });

        console.log('收款账户状态:', receivingAccountsState);

        if (receivingAccountsState.hasRealData) {
            testResults.passed.push('✅ 收款账户数据展示正常');
        } else {
            testResults.warnings.push('⚠️ 收款账户暂无数据（正常初始状态）');
        }

        // 测试添加收款账户模态框
        console.log('\n4️⃣ 测试收款账户模态框...');
        
        await page.locator('#addReceivingAccountBtn').click();
        await page.waitForTimeout(1500);

        const modalState = await page.evaluate(() => {
            const overlay = document.getElementById('receivingAccountModalOverlay');
            const modal = document.getElementById('receivingAccountModal');
            const form = document.getElementById('receivingAccountForm');
            
            return {
                overlayVisible: overlay?.classList.contains('active'),
                modalExists: !!modal,
                formExists: !!form,
                requiredFieldsExist: {
                    accountName: !!document.getElementById('receivingAccountName'),
                    accountNumber: !!document.getElementById('receivingAccountNumber'),
                    accountType: !!document.getElementById('receivingAccountType')
                }
            };
        });

        console.log('模态框状态:', modalState);

        if (modalState.overlayVisible && modalState.formExists) {
            testResults.passed.push('✅ 收款账户模态框功能正常');
        } else {
            testResults.failed.push('❌ 收款账户模态框异常');
        }

        // 关闭模态框
        await page.locator('#receivingAccountModalClose').click();
        await page.waitForTimeout(1000);

        // 5. 轮询规则功能验证
        console.log('\n5️⃣ 验证轮询规则功能...');
        
        await page.locator('.tab-nav__item[data-tab="polling-rules"]').click();
        await page.waitForTimeout(2000);

        const pollingState = await page.evaluate(() => {
            const modeCards = document.querySelectorAll('.polling-mode-card');
            const createBtn = document.getElementById('createPollingGroupBtn');
            const pollingContainer = document.getElementById('pollingGroupsContainer');
            
            return {
                modeCardsCount: modeCards.length,
                availableModes: Array.from(modeCards).map(card => ({
                    mode: card.dataset.mode,
                    title: card.querySelector('h4')?.textContent
                })),
                hasCreateButton: !!createBtn,
                hasPollingContainer: !!pollingContainer
            };
        });

        console.log('轮询规则状态:', pollingState);

        if (pollingState.modeCardsCount === 5 && pollingState.hasCreateButton) {
            testResults.passed.push('✅ 轮询规则界面完整');
        } else {
            testResults.failed.push('❌ 轮询规则界面不完整');
        }

        // 测试轮询组创建模态框
        console.log('\n6️⃣ 测试轮询组创建功能...');
        
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1500);

        const pollingGroupModalState = await page.evaluate(() => {
            const overlay = document.getElementById('pollingGroupModalOverlay');
            const form = document.getElementById('pollingGroupForm');
            const accountSelector = document.getElementById('accountSelector');
            
            return {
                overlayVisible: overlay?.classList.contains('active'),
                formExists: !!form,
                accountSelectorExists: !!accountSelector
            };
        });

        console.log('轮询组模态框状态:', pollingGroupModalState);

        if (pollingGroupModalState.overlayVisible && pollingGroupModalState.formExists) {
            testResults.passed.push('✅ 轮询组创建模态框正常');
        } else {
            testResults.failed.push('❌ 轮询组模态框异常');
        }

        // 关闭模态框
        await page.locator('#pollingGroupModalClose').click();
        await page.waitForTimeout(1000);

        // 7. 标签切换流畅性测试
        console.log('\n7️⃣ 测试标签切换流畅性...');
        
        const tabs = ['payment-accounts', 'receiving-accounts', 'polling-rules'];
        let switchingSuccess = true;
        
        for (let i = 0; i < 3; i++) {
            for (const tab of tabs) {
                await page.locator(`.tab-nav__item[data-tab="${tab}"]`).click();
                await page.waitForTimeout(500);
                
                const isActive = await page.evaluate((tabName) => {
                    const activeTab = document.querySelector('.tab-nav__item--active');
                    const activePanel = document.querySelector('.tab-panel--active');
                    return activeTab?.dataset.tab === tabName && activePanel?.dataset.tab === tabName;
                }, tab);
                
                if (!isActive) {
                    switchingSuccess = false;
                    break;
                }
            }
            if (!switchingSuccess) break;
        }

        if (switchingSuccess) {
            testResults.passed.push('✅ 标签切换流畅无误');
        } else {
            testResults.failed.push('❌ 标签切换存在问题');
        }

        // 最终截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/final-validation-result.png',
            fullPage: true 
        });

        console.log('\n📸 最终验证截图: final-validation-result.png');

        // 8. 样式和响应式测试
        console.log('\n8️⃣ 测试响应式布局...');
        
        // 测试移动端视图
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);
        
        const mobileLayoutState = await page.evaluate(() => {
            const tabNavigation = document.querySelector('.tab-navigation');
            const pageHeader = document.querySelector('.page-header');
            
            return {
                tabNavigationExists: !!tabNavigation,
                headerExists: !!pageHeader,
                contentVisible: !!document.querySelector('.accounts-management')
            };
        });
        
        if (mobileLayoutState.contentVisible) {
            testResults.passed.push('✅ 移动端布局适配正常');
        } else {
            testResults.failed.push('❌ 移动端布局存在问题');
        }

        // 恢复桌面视图
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(1000);

        console.log('\n📊 最终验证结果汇总:');
        console.log('========================');
        
        console.log(`\n✅ 通过测试 (${testResults.passed.length}):`);
        testResults.passed.forEach(test => console.log(`  ${test}`));
        
        if (testResults.warnings.length > 0) {
            console.log(`\n⚠️ 警告 (${testResults.warnings.length}):`);
            testResults.warnings.forEach(warning => console.log(`  ${warning}`));
        }
        
        if (testResults.failed.length > 0) {
            console.log(`\n❌ 失败测试 (${testResults.failed.length}):`);
            testResults.failed.forEach(failure => console.log(`  ${failure}`));
        }

        // 总体评估
        const totalTests = testResults.passed.length + testResults.failed.length;
        const passRate = (testResults.passed.length / totalTests * 100).toFixed(1);
        
        console.log('\n🎯 总体评估:');
        console.log(`  测试通过率: ${passRate}%`);
        console.log(`  功能完整性: ${testResults.failed.length === 0 ? '完整' : '需要优化'}`);
        console.log(`  用户体验: ${testResults.warnings.length <= 1 ? '优秀' : '良好'}`);

        if (testResults.failed.length === 0) {
            console.log('\n🎉 恭喜！全新账户管理页面验证完全通过！');
            console.log('   页面已经可以正式使用，功能完整且稳定。');
        } else {
            console.log('\n⚠️ 验证发现部分问题，建议进一步优化后投入使用。');
        }

        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('💥 验证过程中出现错误:', error);
        testResults.failed.push(`验证执行错误: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return testResults;
}

// 执行最终验证
finalValidation().catch(console.error);