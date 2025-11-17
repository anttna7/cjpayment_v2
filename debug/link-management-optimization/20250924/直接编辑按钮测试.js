const { chromium } = require('playwright');

async function directEditButtonTest() {
    console.log('🎯 直接编辑按钮测试');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000
    });

    const page = await browser.newPage();

    try {
        // 访问页面
        console.log('📍 访问页面');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 直接切换到链接管理标签
        console.log('📍 切换到链接管理标签');
        await page.click('[data-tab="links"]');
        await page.waitForTimeout(2000);

        // 检查JavaScript对象状态
        console.log('📍 检查JavaScript对象状态');
        const jsStatus = await page.evaluate(() => {
            return {
                rechargePaymentCenter: typeof window.rechargePaymentCenter !== 'undefined',
                editLink: window.rechargePaymentCenter && typeof window.rechargePaymentCenter.editLink === 'function'
            };
        });

        console.log(`rechargePaymentCenter存在: ${jsStatus.rechargePaymentCenter ? '✅' : '❌'}`);
        console.log(`editLink方法存在: ${jsStatus.editLink ? '✅' : '❌'}`);

        // 查找编辑按钮
        console.log('📍 查找编辑按钮');
        const editButton = await page.$('.btn-action--edit');
        console.log(`编辑按钮找到: ${editButton ? '✅' : '❌'}`);

        if (editButton) {
            // 检查按钮是否可见
            const isVisible = await editButton.isVisible();
            console.log(`编辑按钮可见: ${isVisible ? '✅' : '❌'}`);

            if (isVisible) {
                // 直接测试JavaScript方法调用
                console.log('📍 直接调用editLink方法');
                const directCallResult = await page.evaluate(() => {
                    try {
                        window.rechargePaymentCenter.editLink('link_001');
                        return { success: true };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                });

                console.log(`直接调用结果: ${directCallResult.success ? '✅' : '❌'}`);
                if (!directCallResult.success) {
                    console.log(`错误: ${directCallResult.error}`);
                }

                await page.waitForTimeout(2000);

                // 检查编辑模态框
                const editModal = await page.$('.edit-link-modal');
                console.log(`编辑模态框出现: ${editModal ? '✅' : '❌'}`);

                if (editModal) {
                    const modalVisible = await editModal.isVisible();
                    console.log(`编辑模态框可见: ${modalVisible ? '✅' : '❌'}`);

                    if (modalVisible) {
                        console.log('🎉 编辑链接功能正常工作！');

                        // 关闭模态框
                        const closeBtn = await page.$('.edit-link-modal .modal-close');
                        if (closeBtn) {
                            await closeBtn.click();
                            await page.waitForTimeout(1000);
                        }
                    }
                }

                // 测试按钮点击
                console.log('📍 测试按钮点击');
                await editButton.click();
                await page.waitForTimeout(2000);

                const modalAfterClick = await page.$('.edit-link-modal');
                const clickResult = modalAfterClick && await modalAfterClick.isVisible();
                console.log(`按钮点击后模态框出现: ${clickResult ? '✅' : '❌'}`);
            }
        }

        console.log('\n🎯 测试完成');
        console.log('================');

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
    directEditButtonTest().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}