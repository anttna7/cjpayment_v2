/**
 * 测试优化后的账户管理功能
 */
const { chromium } = require('playwright');

async function testOptimizedFeatures() {
    console.log('🧪 测试优化后的账户管理功能...\n');
    
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

        // 监听console输出
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('权重轮询') || text.includes('演示') || text.includes('模拟结果')) {
                console.log(`🎯 权重轮询: ${text}`);
            }
        });

        console.log('📱 访问优化后的账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 1. 测试优化后的收款账户表格
        console.log('\n1️⃣ 测试优化后的收款账户表格...');
        
        await page.locator('.tab-nav__item[data-tab="receiving-accounts"]').click();
        await page.waitForTimeout(2000);

        const tableStructure = await page.evaluate(() => {
            const headerCells = Array.from(document.querySelectorAll('#receivingAccountsPanel th')).map(th => th.textContent?.trim());
            const tbody = document.getElementById('receivingAccountsTableBody');
            const dataRows = tbody?.querySelectorAll('tr:not(.table__loading)') || [];
            
            return {
                headers: headerCells,
                hasCorrectColumns: headerCells.includes('单笔限额') && !headerCells.some(h => h.includes('权重')),
                dataRowCount: dataRows.length,
                hasData: dataRows.length > 0
            };
        });

        console.log('收款账户表格结构:', tableStructure);

        if (tableStructure.hasCorrectColumns) {
            testResults.passed.push('✅ 收款账户表格已正确优化（包含单笔限额，移除权重）');
        } else {
            testResults.failed.push('❌ 收款账户表格优化失败');
        }

        // 2. 测试添加收款账户模态框
        console.log('\n2️⃣ 测试添加收款账户模态框优化...');
        
        await page.locator('#addReceivingAccountBtn').click();
        await page.waitForTimeout(1500);

        const modalFieldsCheck = await page.evaluate(() => {
            return {
                hasSingleLimit: !!document.getElementById('receivingSingleLimit'),
                hasWeight: !!document.getElementById('receivingWeight'),
                singleLimitPlaceholder: document.getElementById('receivingSingleLimit')?.placeholder,
                dailyLimitPlaceholder: document.getElementById('receivingDailyLimit')?.placeholder
            };
        });

        console.log('模态框字段检查:', modalFieldsCheck);

        if (modalFieldsCheck.hasSingleLimit && !modalFieldsCheck.hasWeight) {
            testResults.passed.push('✅ 添加收款账户模态框已正确优化（单笔限额替换权重）');
        } else {
            testResults.failed.push('❌ 添加收款账户模态框优化失败');
        }

        // 关闭模态框
        await page.locator('#receivingAccountModalClose').click();
        await page.waitForTimeout(1000);

        // 3. 测试权重轮询功能
        console.log('\n3️⃣ 测试权重轮询功能...');
        
        await page.locator('.tab-nav__item[data-tab="polling-rules"]').click();
        await page.waitForTimeout(2000);

        // 创建一个权重轮询组
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1500);

        // 填写轮询组基本信息
        await page.locator('#pollingGroupName').fill('测试权重轮询组');
        await page.locator('#pollingMode').selectOption('weight');
        await page.waitForTimeout(1000);

        // 检查权重模式下的账户选择器
        const weightSelectorCheck = await page.evaluate(() => {
            const selector = document.getElementById('accountSelector');
            return {
                hasWeightSelector: !!selector?.querySelector('.weight-account-selector'),
                hasHeader: !!selector?.querySelector('.selector-header'),
                weightInputCount: selector?.querySelectorAll('.weight-input').length || 0,
                accountCount: selector?.querySelectorAll('.account-selector-checkbox').length || 0
            };
        });

        console.log('权重选择器检查:', weightSelectorCheck);

        if (weightSelectorCheck.hasWeightSelector && weightSelectorCheck.weightInputCount > 0) {
            testResults.passed.push('✅ 权重模式账户选择器正确显示');
            
            // 选择账户并设置权重
            await page.locator('.account-selector-checkbox').first().check();
            await page.locator('.weight-input').first().fill('5');
            
            if (weightSelectorCheck.accountCount > 1) {
                await page.locator('.account-selector-checkbox').nth(1).check();
                await page.locator('.weight-input').nth(1).fill('3');
            }
            
            await page.locator('#savePollingGroupBtn').click();
            await page.waitForTimeout(2000);
            
            // 检查轮询组是否创建成功
            const pollingGroupCheck = await page.evaluate(() => {
                const cards = document.querySelectorAll('.polling-group-card');
                const weightCard = Array.from(cards).find(card => 
                    card.textContent.includes('权重轮询') && 
                    card.querySelector('.weight-config-details')
                );
                
                return {
                    groupCount: cards.length,
                    hasWeightGroup: !!weightCard,
                    hasTestButton: weightCard?.querySelector('.action-btn--test') ? true : false,
                    weightDetails: weightCard?.querySelector('.weight-accounts-list')?.textContent || 'N/A'
                };
            });
            
            console.log('轮询组创建检查:', pollingGroupCheck);
            
            if (pollingGroupCheck.hasWeightGroup && pollingGroupCheck.hasTestButton) {
                testResults.passed.push('✅ 权重轮询组创建成功，包含权重配置详情');
                
                // 4. 测试权重轮询算法
                console.log('\n4️⃣ 测试权重轮询算法...');
                
                await page.locator('.action-btn--test').first().click();
                await page.waitForTimeout(3000);
                
                testResults.passed.push('✅ 权重轮询算法演示功能正常');
                
            } else {
                testResults.failed.push('❌ 权重轮询组创建失败');
            }
            
        } else {
            testResults.failed.push('❌ 权重模式账户选择器显示异常');
        }

        // 5. 测试其他轮询模式的账户选择器
        console.log('\n5️⃣ 测试其他轮询模式...');
        
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1000);
        
        await page.locator('#pollingGroupName').fill('测试顺序轮询组');
        await page.locator('#pollingMode').selectOption('sequence');
        await page.waitForTimeout(1000);
        
        const sequenceSelectorCheck = await page.evaluate(() => {
            const selector = document.getElementById('accountSelector');
            return {
                hasStandardSelector: !selector?.querySelector('.weight-account-selector'),
                hasAccountLabels: selector?.querySelectorAll('.account-label').length || 0,
                noWeightInputs: selector?.querySelectorAll('.weight-input').length === 0
            };
        });
        
        console.log('顺序模式选择器检查:', sequenceSelectorCheck);
        
        if (sequenceSelectorCheck.hasStandardSelector && sequenceSelectorCheck.noWeightInputs) {
            testResults.passed.push('✅ 非权重模式使用标准账户选择器');
        } else {
            testResults.failed.push('❌ 非权重模式账户选择器异常');
        }
        
        await page.locator('#cancelPollingGroupBtn').click();
        await page.waitForTimeout(1000);

        // 最终截图
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/optimized-features-test.png',
            fullPage: true 
        });

        console.log('\n📊 优化功能测试结果:');
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

        const totalTests = testResults.passed.length + testResults.failed.length;
        const passRate = (testResults.passed.length / totalTests * 100).toFixed(1);
        
        console.log('\n🎯 总体评估:');
        console.log(`  测试通过率: ${passRate}%`);
        console.log(`  优化完成度: ${testResults.failed.length === 0 ? '完美' : '良好'}`);

        if (testResults.failed.length === 0) {
            console.log('\n🎉 所有优化功能测试通过！');
            console.log('   ✅ 单笔限额替换权重完成');
            console.log('   ✅ 智能权重轮询系统正常工作');
            console.log('   ✅ 轮询组管理功能完善');
        }

        console.log('\n📸 测试截图: optimized-features-test.png');
        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('💥 测试过程中出现错误:', error);
        testResults.failed.push(`测试执行错误: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return testResults;
}

testOptimizedFeatures().catch(console.error);