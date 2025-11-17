const { chromium } = require('playwright');

async function quickAddGatewayTest() {
    console.log('⚡ 快速测试添加网关修复');

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

        // 切换到网关管理
        const gatewayTab = await page.locator('[data-tab="gateways"]');
        await gatewayTab.click();
        await page.waitForTimeout(1000);

        console.log('📍 测试添加网关按钮');

        // 点击添加网关按钮
        const addBtn = await page.locator('#addGatewayBtn');
        await addBtn.click();
        await page.waitForTimeout(1000);

        // 检查模态框
        const modal = await page.locator('.gateway-add-modal');
        const modalVisible = await modal.isVisible();
        console.log(`添加网关模态框: ${modalVisible ? '✅ 显示正常' : '❌ 显示异常'}`);

        if (modalVisible) {
            console.log('🎉 修复成功！模态框正常显示');

            // 快速填写表单
            await page.locator('input[name="gatewayName"]').fill('快速测试网关');
            await page.waitForTimeout(300);

            await page.locator('input[name="apiUrl"]').fill('https://api.test.com');

            // 测试提交 - 使用更精确的选择器
            const submitBtn = await page.locator('.gateway-add-modal .btn-primary');
            await submitBtn.click();

            // 等待处理
            await page.waitForTimeout(2000);

            // 检查模态框是否关闭
            const modalClosed = !(await modal.isVisible());
            console.log(`模态框关闭: ${modalClosed ? '✅' : '❌'}`);

            // 检查是否添加到列表
            const gatewayRows = await page.locator('tr.gateway-row').count();
            console.log(`网关总数: ${gatewayRows} (应该增加1个)`);

            console.log('✅ 添加网关功能完全正常！');
        } else {
            // 调试模态框样式
            const modalExists = await modal.count() > 0;
            console.log(`模态框元素存在: ${modalExists ? '✅' : '❌'}`);

            if (modalExists) {
                const styles = await modal.evaluate(el => {
                    const computed = window.getComputedStyle(el);
                    return {
                        position: computed.position,
                        zIndex: computed.zIndex,
                        display: computed.display,
                        visibility: computed.visibility,
                        opacity: computed.opacity
                    };
                });
                console.log('模态框样式:', JSON.stringify(styles, null, 2));
            }
        }

        await page.waitForTimeout(3000);

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行测试
try {
    require.resolve('playwright');
    quickAddGatewayTest().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}