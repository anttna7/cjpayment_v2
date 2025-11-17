const { chromium } = require('playwright');

/**
 * 系统核心功能测试脚本
 * 测试清理后的系统关键页面功能
 */

async function runCoreTests() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const testResults = [];

    try {
        console.log('开始测试系统核心功能...\n');

        // 测试1: 商户管理页面
        console.log('=== 测试1: 商户管理页面 ===');
        try {
            await page.goto('http://127.0.0.1:8091/merchant', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // 检查页面标题
            const title = await page.title();
            console.log(`页面标题: ${title}`);

            // 检查导航是否存在
            const nav = await page.$('.navbar, nav, .navigation');
            const hasNav = nav !== null;
            console.log(`导航存在: ${hasNav}`);

            // 检查页脚是否存在
            const footer = await page.$('footer, .footer');
            const hasFooter = footer !== null;
            console.log(`页脚存在: ${hasFooter}`);

            // 检查表格是否存在
            const table = await page.$('table, .table');
            const hasTable = table !== null;
            console.log(`表格存在: ${hasTable}`);

            // 检查添加商户按钮
            const addButton = await page.$('button:has-text("添加商户"), .btn:has-text("添加商户"), [onclick*="addMerchant"], #addMerchantBtn');
            const hasAddButton = addButton !== null;
            console.log(`添加商户按钮存在: ${hasAddButton}`);

            // 尝试点击添加商户按钮
            let modalAppeared = false;
            if (hasAddButton) {
                await addButton.click();
                await page.waitForTimeout(1000);
                const modal = await page.$('.modal, .dialog, .popup, [id*="modal"]');
                modalAppeared = modal !== null;
                console.log(`模态框弹出: ${modalAppeared}`);
            }

            testResults.push({
                test: '商户管理页面',
                pageLoaded: true,
                navigation: hasNav,
                footer: hasFooter,
                table: hasTable,
                addButton: hasAddButton,
                modal: modalAppeared,
                status: 'PASS'
            });

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
            console.log(`当前URL: ${currentUrl}`);

            // 检查是否重定向到登录页面
            const isOnLoginPage = currentUrl.includes('login') || currentUrl.includes('signin');
            console.log(`是否重定向到登录页面: ${isOnLoginPage}`);

            // 检查审核表格
            const auditTable = await page.$('table, .table, .audit-table');
            const hasAuditTable = auditTable !== null;
            console.log(`审核表格存在: ${hasAuditTable}`);

            // 检查页面标题
            const auditTitle = await page.title();
            console.log(`页面标题: ${auditTitle}`);

            testResults.push({
                test: '财务审核页面',
                pageLoaded: !isOnLoginPage,
                redirectedToLogin: isOnLoginPage,
                auditTable: hasAuditTable,
                status: isOnLoginPage ? 'FAIL' : 'PASS'
            });

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
            console.log(`当前URL: ${currentUrl}`);

            // 检查管理卡片
            const cards = await page.$$('.card, .management-card, .system-card, .panel');
            const cardCount = cards.length;
            console.log(`管理卡片数量: ${cardCount}`);

            // 检查页面标题
            const sysTitle = await page.title();
            console.log(`页面标题: ${sysTitle}`);

            testResults.push({
                test: '系统管理页面',
                pageLoaded: true,
                cardCount: cardCount,
                hasCards: cardCount > 0,
                status: 'PASS'
            });

        } catch (error) {
            console.log(`系统管理页面测试失败: ${error.message}`);
            testResults.push({
                test: '系统管理页面',
                status: 'FAIL',
                error: error.message
            });
        }

        // 测试4: Dashboard到财务审核的跳转
        console.log('\n=== 测试4: Dashboard财务审核跳转 ===');
        try {
            // 先访问Dashboard
            await page.goto('http://127.0.0.1:8091/', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);

            // 查找财务审核按钮/链接
            const auditButton = await page.$('a[href*="audit"], button:has-text("财务审核"), .audit-btn, [onclick*="audit"]');
            const hasAuditButton = auditButton !== null;
            console.log(`Dashboard财务审核按钮存在: ${hasAuditButton}`);

            if (hasAuditButton) {
                await auditButton.click();
                await page.waitForTimeout(2000);

                const finalUrl = page.url();
                console.log(`跳转后URL: ${finalUrl}`);

                const redirectedToLogin = finalUrl.includes('login') || finalUrl.includes('signin');
                console.log(`是否重定向到登录页面: ${redirectedToLogin}`);

                testResults.push({
                    test: 'Dashboard财务审核跳转',
                    buttonExists: hasAuditButton,
                    redirectedToLogin: redirectedToLogin,
                    finalUrl: finalUrl,
                    status: redirectedToLogin ? 'FAIL' : 'PASS'
                });
            } else {
                testResults.push({
                    test: 'Dashboard财务审核跳转',
                    buttonExists: false,
                    status: 'FAIL',
                    error: '未找到财务审核按钮'
                });
            }

        } catch (error) {
            console.log(`Dashboard跳转测试失败: ${error.message}`);
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
    generateTestReport(testResults);
}

function generateTestReport(results) {
    console.log('\n' + '='.repeat(50));
    console.log('           系统核心功能测试报告');
    console.log('='.repeat(50));

    let passCount = 0;
    let failCount = 0;

    results.forEach(result => {
        console.log(`\n【${result.test}】`);
        console.log(`状态: ${result.status}`);

        if (result.status === 'PASS') {
            passCount++;
            switch (result.test) {
                case '商户管理页面':
                    console.log(`  ✓ 页面加载正常`);
                    console.log(`  ✓ 导航存在: ${result.navigation}`);
                    console.log(`  ✓ 页脚存在: ${result.footer}`);
                    console.log(`  ✓ 表格存在: ${result.table}`);
                    console.log(`  ✓ 添加商户按钮: ${result.addButton}`);
                    console.log(`  ✓ 模态框功能: ${result.modal}`);
                    break;
                case '财务审核页面':
                    console.log(`  ✓ 页面正常加载，未重定向到登录页面`);
                    console.log(`  ✓ 审核表格存在: ${result.auditTable}`);
                    break;
                case '系统管理页面':
                    console.log(`  ✓ 页面正常加载`);
                    console.log(`  ✓ 管理卡片数量: ${result.cardCount}`);
                    break;
                case 'Dashboard财务审核跳转':
                    console.log(`  ✓ 按钮存在: ${result.buttonExists}`);
                    console.log(`  ✓ 正常跳转，未重定向到登录页面`);
                    break;
            }
        } else {
            failCount++;
            console.log(`  ✗ 测试失败`);
            if (result.error) {
                console.log(`  ✗ 错误信息: ${result.error}`);
            }
            if (result.redirectedToLogin) {
                console.log(`  ✗ 页面被重定向到登录页面`);
            }
        }
    });

    console.log('\n' + '='.repeat(50));
    console.log('测试汇总:');
    console.log(`  通过: ${passCount}/${results.length}`);
    console.log(`  失败: ${failCount}/${results.length}`);
    console.log(`  成功率: ${Math.round((passCount / results.length) * 100)}%`);
    console.log('='.repeat(50));
}

// 运行测试
runCoreTests().catch(console.error);