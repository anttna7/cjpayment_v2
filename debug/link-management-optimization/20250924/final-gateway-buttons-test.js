const { chromium } = require('playwright');

async function finalGatewayButtonsTest() {
    console.log('🎯 最终网关按钮功能验证测试');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1500
    });

    const page = await browser.newPage();

    try {
        // 访问页面
        console.log('📍 步骤1: 访问充值支付管理中心');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 点击网关管理标签
        console.log('📍 步骤2: 切换到网关管理标签');
        const gatewayTab = await page.locator('[data-tab="gateways"]');
        await gatewayTab.click();
        await page.waitForTimeout(1000);

        // 测试结果统计
        const testResults = {
            editGateway: false,
            checkGateway: false,
            testGateway: false,
            viewGatewayLogs: false
        };

        // 测试编辑网关按钮
        console.log('📍 步骤3: 测试编辑网关功能');
        try {
            const editBtn = await page.locator('button[onclick*="editGateway(1)"]');
            await editBtn.click();
            await page.waitForTimeout(2000);

            // 检查编辑模态框 - 使用更宽泛的选择器
            const modalSelectors = [
                '.gateway-edit-modal',
                '.modal',
                '[class*="modal"]',
                '[class*="edit"]'
            ];

            let editModalFound = false;
            for (const selector of modalSelectors) {
                const modal = await page.locator(selector);
                if (await modal.count() > 0 && await modal.first().isVisible()) {
                    editModalFound = true;
                    console.log(`✅ 编辑模态框找到 (选择器: ${selector})`);

                    // 关闭模态框
                    const closeBtn = await page.locator('.modal-close, .close, button:has-text("×")');
                    if (await closeBtn.count() > 0) {
                        await closeBtn.first().click();
                        await page.waitForTimeout(1000);
                    }
                    break;
                }
            }

            testResults.editGateway = editModalFound;
            if (!editModalFound) {
                console.log('❌ 编辑模态框未找到');
            }
        } catch (error) {
            console.log(`❌ 编辑功能测试失败: ${error.message}`);
        }

        // 测试健康检查按钮
        console.log('📍 步骤4: 测试健康检查功能');
        try {
            const checkBtn = await page.locator('button[onclick*="checkGateway(1)"]');
            await checkBtn.click();
            await page.waitForTimeout(2000);

            // 检查健康检查模态框
            const healthModalSelectors = [
                '#healthCheckModal',
                '.health-check-modal',
                '.modal',
                '[class*="health"]'
            ];

            let healthModalFound = false;
            for (const selector of healthModalSelectors) {
                const modal = await page.locator(selector);
                if (await modal.count() > 0 && await modal.first().isVisible()) {
                    healthModalFound = true;
                    console.log(`✅ 健康检查模态框找到 (选择器: ${selector})`);

                    // 等待健康检查完成
                    await page.waitForTimeout(1000);

                    // 关闭模态框
                    const closeBtn = await page.locator('.modal-close, .close, button:has-text("×"), button:has-text("关闭")');
                    if (await closeBtn.count() > 0) {
                        await closeBtn.first().click();
                        await page.waitForTimeout(1000);
                    }
                    break;
                }
            }

            testResults.checkGateway = healthModalFound;
            if (!healthModalFound) {
                console.log('❌ 健康检查模态框未找到');
            }
        } catch (error) {
            console.log(`❌ 健康检查功能测试失败: ${error.message}`);
        }

        // 测试支付测试按钮
        console.log('📍 步骤5: 测试支付测试功能');
        try {
            const testBtn = await page.locator('button[onclick*="testGateway(1)"]');
            await testBtn.click();
            await page.waitForTimeout(2000);

            // 检查支付测试模态框
            const testModalSelectors = [
                '#paymentTestModal',
                '.payment-test-modal',
                '.modal',
                '[class*="test"]'
            ];

            let testModalFound = false;
            for (const selector of testModalSelectors) {
                const modal = await page.locator(selector);
                if (await modal.count() > 0 && await modal.first().isVisible()) {
                    testModalFound = true;
                    console.log(`✅ 支付测试模态框找到 (选择器: ${selector})`);

                    // 关闭模态框
                    const closeBtn = await page.locator('.modal-close, .close, button:has-text("×"), button:has-text("关闭")');
                    if (await closeBtn.count() > 0) {
                        await closeBtn.first().click();
                        await page.waitForTimeout(1000);
                    }
                    break;
                }
            }

            testResults.testGateway = testModalFound;
            if (!testModalFound) {
                console.log('❌ 支付测试模态框未找到');
            }
        } catch (error) {
            console.log(`❌ 支付测试功能测试失败: ${error.message}`);
        }

        // 测试查看日志按钮
        console.log('📍 步骤6: 测试查看日志功能');
        try {
            const logBtn = await page.locator('button[onclick*="viewGatewayLogs(1)"]');
            await logBtn.click();
            await page.waitForTimeout(2000);

            // 检查日志模态框
            const logModalSelectors = [
                '#gatewayLogsModal',
                '.gateway-logs-modal',
                '.modal',
                '[class*="logs"]'
            ];

            let logModalFound = false;
            for (const selector of logModalSelectors) {
                const modal = await page.locator(selector);
                if (await modal.count() > 0 && await modal.first().isVisible()) {
                    logModalFound = true;
                    console.log(`✅ 日志模态框找到 (选择器: ${selector})`);

                    // 关闭模态框
                    const closeBtn = await page.locator('.modal-close, .close, button:has-text("×"), button:has-text("关闭")');
                    if (await closeBtn.count() > 0) {
                        await closeBtn.first().click();
                        await page.waitForTimeout(1000);
                    }
                    break;
                }
            }

            testResults.viewGatewayLogs = logModalFound;
            if (!logModalFound) {
                console.log('❌ 日志模态框未找到');
            }
        } catch (error) {
            console.log(`❌ 日志功能测试失败: ${error.message}`);
        }

        // 输出测试结果
        console.log('\n🎯 测试结果汇总:');
        console.log('================');
        console.log(`编辑网关: ${testResults.editGateway ? '✅ 成功' : '❌ 失败'}`);
        console.log(`健康检查: ${testResults.checkGateway ? '✅ 成功' : '❌ 失败'}`);
        console.log(`测试支付: ${testResults.testGateway ? '✅ 成功' : '❌ 失败'}`);
        console.log(`查看日志: ${testResults.viewGatewayLogs ? '✅ 成功' : '❌ 失败'}`);

        const successCount = Object.values(testResults).filter(v => v).length;
        console.log(`\n总体成功率: ${successCount}/4 (${(successCount/4*100).toFixed(1)}%)`);

        if (successCount === 4) {
            console.log('🎉 所有网关管理按钮功能正常！');
        } else {
            console.log('⚠️  部分功能需要继续调试');
        }

        console.log('\n⏳ 等待5秒供最终观察...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ 测试过程失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行最终测试
try {
    require.resolve('playwright');
    finalGatewayButtonsTest().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}