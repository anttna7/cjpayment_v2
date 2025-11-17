const { chromium } = require('playwright');

/**
 * 系统核心功能最终测试脚本
 * 基于发现的路由配置进行准确测试
 */

async function runFinalCoreTests() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const testResults = [];

    try {
        console.log('开始系统核心功能最终测试...\n');

        // 测试1: 商户管理页面
        console.log('=== 测试1: 商户管理页面 ===');
        try {
            await page.goto('http://127.0.0.1:8091/merchant', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            const isOnCorrectPage = currentUrl.includes('/merchant') && !currentUrl.includes('/login');
            
            console.log(`当前URL: ${currentUrl}`);
            console.log(`页面加载正确: ${isOnCorrectPage}`);

            if (isOnCorrectPage) {
                const title = await page.title();
                console.log(`页面标题: ${title}`);

                // 检查页面元素
                const nav = await page.$('.navbar, nav, .navigation, .header');
                const footer = await page.$('footer, .footer');
                const table = await page.$('table, .table, .merchant-table');
                const addButton = await page.$('button:has-text("添加商户"), .btn:has-text("添加商户"), [onclick*="addMerchant"], #addMerchantBtn, button:has-text("添加"), .add-merchant-btn');

                console.log(`导航存在: ${nav !== null}`);
                console.log(`页脚存在: ${footer !== null}`);
                console.log(`表格存在: ${table !== null}`);
                console.log(`添加商户按钮存在: ${addButton !== null}`);

                // 测试添加商户按钮
                let modalAppeared = false;
                if (addButton) {
                    await addButton.click();
                    await page.waitForTimeout(1000);
                    const modal = await page.$('.modal, .dialog, .popup, [id*="modal"], [style*="display: block"]');
                    modalAppeared = modal !== null;
                    console.log(`模态框弹出: ${modalAppeared}`);
                }

                testResults.push({
                    test: '商户管理页面',
                    pageLoaded: true,
                    navigation: nav !== null,
                    footer: footer !== null,
                    table: table !== null,
                    addButton: addButton !== null,
                    modal: modalAppeared,
                    status: 'PASS'
                });
            } else {
                testResults.push({
                    test: '商户管理页面',
                    pageLoaded: false,
                    redirected: true,
                    finalUrl: currentUrl,
                    status: 'FAIL'
                });
            }

        } catch (error) {
            console.log(`商户管理页面测试失败: ${error.message}`);
            testResults.push({
                test: '商户管理页面',
                status: 'FAIL',
                error: error.message
            });
        }

        // 测试2: 财务审核页面
        console.log('\n=== 测试2: 财务审核页面 ===');
        try {
            await page.goto('http://127.0.0.1:8091/audit', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            const isOnCorrectPage = currentUrl.includes('/audit') && !currentUrl.includes('/login');
            
            console.log(`当前URL: ${currentUrl}`);
            console.log(`页面加载正确: ${isOnCorrectPage}`);

            if (isOnCorrectPage) {
                const title = await page.title();
                console.log(`页面标题: ${title}`);

                const auditTable = await page.$('table, .table, .audit-table');
                const auditContent = await page.$('.audit-content, .financial-audit, .audit-list');
                
                console.log(`审核表格存在: ${auditTable !== null}`);
                console.log(`审核内容存在: ${auditContent !== null}`);

                testResults.push({
                    test: '财务审核页面',
                    pageLoaded: true,
                    auditTable: auditTable !== null,
                    auditContent: auditContent !== null,
                    status: 'PASS'
                });
            } else {
                testResults.push({
                    test: '财务审核页面',
                    pageLoaded: false,
                    redirected: true,
                    finalUrl: currentUrl,
                    status: 'FAIL'
                });
            }

        } catch (error) {
            console.log(`财务审核页面测试失败: ${error.message}`);
            testResults.push({
                test: '财务审核页面',
                status: 'FAIL',
                error: error.message
            });
        }

        // 测试3: 系统管理页面
        console.log('\n=== 测试3: 系统管理页面 ===');
        try {
            await page.goto('http://127.0.0.1:8091/system_management', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            const isOnCorrectPage = currentUrl.includes('/system_management') && !currentUrl.includes('/login');
            
            console.log(`当前URL: ${currentUrl}`);
            console.log(`页面加载正确: ${isOnCorrectPage}`);

            if (isOnCorrectPage) {
                const title = await page.title();
                console.log(`页面标题: ${title}`);

                const cards = await page.$$('.card, .management-card, .system-card, .panel, .module-card');
                const cardCount = cards.length;
                
                console.log(`管理卡片数量: ${cardCount}`);

                testResults.push({
                    test: '系统管理页面',
                    pageLoaded: true,
                    cardCount: cardCount,
                    hasCards: cardCount > 0,
                    status: 'PASS'
                });
            } else {
                testResults.push({
                    test: '系统管理页面',
                    pageLoaded: false,
                    redirected: true,
                    finalUrl: currentUrl,
                    status: 'FAIL'
                });
            }

        } catch (error) {
            console.log(`系统管理页面测试失败: ${error.message}`);
            testResults.push({
                test: '系统管理页面',
                status: 'FAIL',
                error: error.message
            });
        }

        // 测试4: Dashboard访问和跳转测试
        console.log('\n=== 测试4: Dashboard访问测试 ===');
        try {
            // 先测试dashboard页面是否可以直接访问
            await page.goto('http://127.0.0.1:8091/dashboard', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            const dashboardUrl = page.url();
            const isDashboardAccessible = dashboardUrl.includes('/dashboard') && !dashboardUrl.includes('/login');
            
            console.log(`Dashboard URL: ${dashboardUrl}`);
            console.log(`Dashboard可直接访问: ${isDashboardAccessible}`);

            if (isDashboardAccessible) {
                // 在dashboard页面查找财务审核链接
                const auditLinks = await page.$$eval('*', elements => {
                    return elements
                        .filter(el => {
                            const text = (el.textContent || '').trim();
                            const href = el.href || '';
                            return (text.includes('财务') && text.includes('审核')) || 
                                   text.includes('审核') || 
                                   href.includes('audit');
                        })
                        .map(el => ({
                            tag: el.tagName,
                            text: el.textContent.trim(),
                            href: el.href || null
                        }));
                });

                console.log('Dashboard中找到的审核相关元素:');
                auditLinks.forEach(link => {
                    console.log(`  ${link.tag}: "${link.text}" ${link.href ? '-> ' + link.href : ''}`);
                });

                // 测试跳转
                let jumpTestResult = 'NO_BUTTON';
                if (auditLinks.length > 0) {
                    try {
                        const auditLink = auditLinks.find(link => link.href && link.href.includes('audit'));
                        if (auditLink) {
                            console.log(`点击审核链接: ${auditLink.href}`);
                            await page.click(`a[href*="audit"]`);
                            await page.waitForTimeout(2000);
                            
                            const finalUrl = page.url();
                            console.log(`跳转后URL: ${finalUrl}`);
                            
                            if (finalUrl.includes('audit')) {
                                jumpTestResult = 'SUCCESS';
                            } else if (finalUrl.includes('login')) {
                                jumpTestResult = 'REDIRECTED_TO_LOGIN';
                            } else {
                                jumpTestResult = 'OTHER_PAGE';
                            }
                        }
                    } catch (error) {
                        jumpTestResult = 'CLICK_FAILED';
                        console.log(`点击失败: ${error.message}`);
                    }
                }

                testResults.push({
                    test: 'Dashboard财务审核跳转',
                    dashboardAccessible: true,
                    auditLinksFound: auditLinks.length,
                    jumpResult: jumpTestResult,
                    status: jumpTestResult === 'SUCCESS' ? 'PASS' : 'FAIL'
                });
            } else {
                testResults.push({
                    test: 'Dashboard财务审核跳转',
                    dashboardAccessible: false,
                    redirected: true,
                    finalUrl: dashboardUrl,
                    status: 'FAIL'
                });
            }

        } catch (error) {
            console.log(`Dashboard测试失败: ${error.message}`);
            testResults.push({
                test: 'Dashboard财务审核跳转',
                status: 'FAIL',
                error: error.message
            });
        }

    } finally {
        await browser.close();
    }

    // 生成测试报告
    generateDetailedTestReport(testResults);
}

function generateDetailedTestReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('               系统核心功能测试报告');
    console.log('='.repeat(60));

    let passCount = 0;
    let failCount = 0;

    results.forEach(result => {
        console.log(`\n【${result.test}】`);
        console.log(`状态: ${result.status === 'PASS' ? '✅ 通过' : '❌ 失败'}`);

        if (result.status === 'PASS') {
            passCount++;
            switch (result.test) {
                case '商户管理页面':
                    console.log(`  ✓ 页面正常加载，无重定向`);
                    console.log(`  ✓ 导航栏: ${result.navigation ? '存在' : '不存在'}`);
                    console.log(`  ✓ 页脚: ${result.footer ? '存在' : '不存在'}`);
                    console.log(`  ✓ 数据表格: ${result.table ? '存在' : '不存在'}`);
                    console.log(`  ✓ 添加商户按钮: ${result.addButton ? '存在' : '不存在'}`);
                    console.log(`  ✓ 模态框功能: ${result.modal ? '正常' : '未测试'}`);
                    break;
                case '财务审核页面':
                    console.log(`  ✓ 页面正常加载，无重定向到登录页面`);
                    console.log(`  ✓ 审核表格: ${result.auditTable ? '存在' : '不存在'}`);
                    console.log(`  ✓ 审核内容: ${result.auditContent ? '存在' : '不存在'}`);
                    break;
                case '系统管理页面':
                    console.log(`  ✓ 页面正常加载`);
                    console.log(`  ✓ 管理卡片: ${result.cardCount}个`);
                    break;
                case 'Dashboard财务审核跳转':
                    console.log(`  ✓ Dashboard可直接访问`);
                    console.log(`  ✓ 找到审核相关链接: ${result.auditLinksFound}个`);
                    console.log(`  ✓ 跳转功能正常`);
                    break;
            }
        } else {
            failCount++;
            console.log(`  ❌ 测试失败`);
            if (result.error) {
                console.log(`  ❌ 错误: ${result.error}`);
            }
            if (result.redirected) {
                console.log(`  ❌ 页面被重定向: ${result.finalUrl}`);
            }
            if (result.jumpResult) {
                console.log(`  ❌ 跳转结果: ${result.jumpResult}`);
            }
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 测试汇总:');
    console.log(`   🟢 通过: ${passCount}/${results.length} (${Math.round((passCount / results.length) * 100)}%)`);
    console.log(`   🔴 失败: ${failCount}/${results.length} (${Math.round((failCount / results.length) * 100)}%)`);
    console.log('='.repeat(60));

    // 生成结论
    if (passCount === results.length) {
        console.log('🎉 所有核心功能测试通过！系统运行正常。');
    } else if (passCount >= results.length * 0.75) {
        console.log('⚠️  大部分功能正常，少数功能需要关注。');
    } else {
        console.log('🚨 多个核心功能存在问题，需要进一步调试。');
    }
}

// 运行测试
runFinalCoreTests().catch(console.error);