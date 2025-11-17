const { chromium } = require('playwright');

async function testGatewayOnClickFix() {
    console.log('🔍 测试网关按钮onclick修复...');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1500
    });

    const page = await browser.newPage();

    try {
        // 访问页面
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 点击网关管理标签
        const gatewayTab = await page.locator('[data-tab="gateways"]');
        await gatewayTab.click();
        await page.waitForTimeout(1000);

        // 修复onclick事件 - 将全局调用改为对象方法调用
        console.log('📍 修复按钮onclick事件...');
        await page.evaluate(() => {
            // 修复编辑按钮
            const editButtons = document.querySelectorAll('button[onclick*="editGateway"]');
            editButtons.forEach(btn => {
                const gatewayId = btn.getAttribute('onclick').match(/editGateway\((\d+)\)/)[1];
                btn.setAttribute('onclick', `window.rechargePaymentCenter.editGateway(${gatewayId})`);
            });

            // 修复健康检查按钮
            const checkButtons = document.querySelectorAll('button[onclick*="checkGateway"]');
            checkButtons.forEach(btn => {
                const gatewayId = btn.getAttribute('onclick').match(/checkGateway\((\d+)\)/)[1];
                btn.setAttribute('onclick', `window.rechargePaymentCenter.checkGateway(${gatewayId})`);
            });

            // 修复测试支付按钮
            const testButtons = document.querySelectorAll('button[onclick*="testGateway"]');
            testButtons.forEach(btn => {
                const gatewayId = btn.getAttribute('onclick').match(/testGateway\((\d+)\)/)[1];
                btn.setAttribute('onclick', `window.rechargePaymentCenter.testGateway(${gatewayId})`);
            });

            // 修复查看日志按钮
            const logButtons = document.querySelectorAll('button[onclick*="viewGatewayLogs"]');
            logButtons.forEach(btn => {
                const gatewayId = btn.getAttribute('onclick').match(/viewGatewayLogs\((\d+)\)/)[1];
                btn.setAttribute('onclick', `window.rechargePaymentCenter.viewGatewayLogs(${gatewayId})`);
            });

            console.log('✅ onclick事件修复完成');
        });

        // 测试编辑按钮
        console.log('📍 测试修复后的编辑按钮...');
        const editBtn = await page.locator('button[onclick*="editGateway"]').first();
        await editBtn.click();
        await page.waitForTimeout(2000);

        // 检查编辑模态框
        const editModal = await page.locator('.gateway-edit-modal');
        const editModalVisible = await editModal.isVisible();
        console.log(`📊 编辑模态框: ${editModalVisible ? '✅ 成功!' : '❌ 失败'}`);

        if (editModalVisible) {
            // 关闭模态框
            const closeBtn = await page.locator('.modal-close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);
        }

        // 测试健康检查按钮
        console.log('📍 测试修复后的健康检查按钮...');
        const checkBtn = await page.locator('button[onclick*="checkGateway"]').first();
        await checkBtn.click();
        await page.waitForTimeout(2000);

        const healthModal = await page.locator('#healthCheckModal');
        const healthModalVisible = await healthModal.isVisible();
        console.log(`📊 健康检查模态框: ${healthModalVisible ? '✅ 成功!' : '❌ 失败'}`);

        if (healthModalVisible) {
            const closeBtn = await page.locator('#healthCheckModal .modal-close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);
        }

        // 测试支付测试按钮
        console.log('📍 测试修复后的支付测试按钮...');
        const testBtn = await page.locator('button[onclick*="testGateway"]').first();
        await testBtn.click();
        await page.waitForTimeout(2000);

        const testModal = await page.locator('#paymentTestModal');
        const testModalVisible = await testModal.isVisible();
        console.log(`📊 支付测试模态框: ${testModalVisible ? '✅ 成功!' : '❌ 失败'}`);

        if (testModalVisible) {
            const closeBtn = await page.locator('#paymentTestModal .modal-close').first();
            await closeBtn.click();
            await page.waitForTimeout(1000);
        }

        // 测试查看日志按钮
        console.log('📍 测试修复后的查看日志按钮...');
        const logBtn = await page.locator('button[onclick*="viewGatewayLogs"]').first();
        await logBtn.click();
        await page.waitForTimeout(2000);

        const logModal = await page.locator('#gatewayLogsModal');
        const logModalVisible = await logModal.isVisible();
        console.log(`📊 日志查看模态框: ${logModalVisible ? '✅ 成功!' : '❌ 失败'}`);

        console.log('⏳ 等待5秒观察结果...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行测试
try {
    require.resolve('playwright');
    testGatewayOnClickFix().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}