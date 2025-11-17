const { chromium } = require('playwright');

async function testEditLinkButton() {
    console.log('🎯 编辑链接按钮功能测试');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 2000
    });

    const page = await browser.newPage();

    try {
        // 监听控制台日志
        page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log(`📄 页面日志: ${msg.text()}`);
            } else if (msg.type() === 'error') {
                console.log(`❌ 页面错误: ${msg.text()}`);
            }
        });

        // 访问页面
        console.log('📍 访问充值支付管理中心');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 切换到链接管理标签
        console.log('📍 切换到链接管理标签');
        const linksTab = await page.locator('[data-tab="links"]');
        await linksTab.click();
        await page.waitForTimeout(2000);

        // 检查JavaScript对象是否存在
        console.log('📍 检查JavaScript对象');
        const jsCheck = await page.evaluate(() => {
            return {
                objectExists: typeof window.rechargePaymentCenter !== 'undefined',
                editMethodExists: window.rechargePaymentCenter && typeof window.rechargePaymentCenter.editLink === 'function',
                copyMethodExists: window.rechargePaymentCenter && typeof window.rechargePaymentCenter.copyLink === 'function',
                deleteMethodExists: window.rechargePaymentCenter && typeof window.rechargePaymentCenter.deleteLink === 'function'
            };
        });

        console.log(`   rechargePaymentCenter对象存在: ${jsCheck.objectExists ? '✅' : '❌'}`);
        console.log(`   editLink方法存在: ${jsCheck.editMethodExists ? '✅' : '❌'}`);
        console.log(`   copyLink方法存在: ${jsCheck.copyMethodExists ? '✅' : '❌'}`);
        console.log(`   deleteLink方法存在: ${jsCheck.deleteMethodExists ? '✅' : '❌'}`);

        // 查找编辑按钮
        console.log('\n📍 检查编辑按钮');
        const editButtons = await page.locator('.btn-action--edit');
        const editButtonCount = await editButtons.count();
        console.log(`   找到编辑按钮数量: ${editButtonCount}`);

        if (editButtonCount > 0) {
            const firstEditBtn = editButtons.first();
            const btnVisible = await firstEditBtn.isVisible();
            console.log(`   第一个编辑按钮可见: ${btnVisible ? '✅' : '❌'}`);

            if (btnVisible) {
                // 获取按钮属性
                const linkId = await firstEditBtn.getAttribute('data-link-id');
                console.log(`   链接ID: ${linkId || '默认link_001'}`);

                // 点击编辑按钮
                console.log('📍 点击编辑按钮');
                await firstEditBtn.click();
                await page.waitForTimeout(2000);

                // 检查编辑模态框是否出现
                const editModal = await page.locator('.edit-link-modal');
                const editModalExists = await editModal.count() > 0;
                const editModalVisible = editModalExists ? await editModal.isVisible() : false;

                console.log(`   编辑模态框存在: ${editModalExists ? '✅' : '❌'}`);
                console.log(`   编辑模态框可见: ${editModalVisible ? '✅' : '❌'}`);

                if (editModalVisible) {
                    // 获取模态框标题
                    const modalTitle = await editModal.locator('.modal-header h3').textContent();
                    console.log(`   模态框标题: ${modalTitle}`);

                    // 检查表单字段
                    const titleInput = await editModal.locator('input[name="linkTitle"]');
                    const titleInputExists = await titleInput.count() > 0;
                    console.log(`   链接标题输入框存在: ${titleInputExists ? '✅' : '❌'}`);

                    if (titleInputExists) {
                        const currentValue = await titleInput.inputValue();
                        console.log(`   当前链接标题: ${currentValue}`);

                        // 修改标题
                        await titleInput.fill('测试编辑后的链接标题');
                        console.log('   ✅ 成功修改链接标题');

                        // 测试保存按钮
                        const saveBtn = await editModal.locator('.btn-primary');
                        const saveBtnExists = await saveBtn.count() > 0;
                        console.log(`   保存按钮存在: ${saveBtnExists ? '✅' : '❌'}`);

                        if (saveBtnExists) {
                            await saveBtn.click();
                            console.log('   ✅ 点击保存按钮');
                            await page.waitForTimeout(2000);

                            // 检查模态框是否关闭
                            const modalClosed = !(await editModal.isVisible());
                            console.log(`   模态框关闭: ${modalClosed ? '✅' : '❌'}`);
                        }
                    }
                } else {
                    // 模态框未显示，检查可能的错误
                    console.log('🔍 模态框未显示，进行错误检查:');

                    const allModals = await page.locator('div[class*="modal"]').count();
                    console.log(`   页面上的模态框数量: ${allModals}`);

                    // 检查是否有其他模态框存在
                    const otherModals = await page.locator('.create-link-modal, .bulk-actions-modal').count();
                    console.log(`   其他模态框数量: ${otherModals}`);
                }
            }
        } else {
            console.log('❌ 未找到编辑按钮');
        }

        // 测试复制按钮
        console.log('\n📍 测试复制按钮');
        const copyButtons = await page.locator('.btn-action--copy');
        const copyButtonCount = await copyButtons.count();
        console.log(`   找到复制按钮数量: ${copyButtonCount}`);

        if (copyButtonCount > 0) {
            const firstCopyBtn = copyButtons.first();
            const copyBtnVisible = await firstCopyBtn.isVisible();
            console.log(`   复制按钮可见: ${copyBtnVisible ? '✅' : '❌'}`);

            if (copyBtnVisible) {
                await firstCopyBtn.click();
                console.log('   ✅ 复制按钮点击成功');
                await page.waitForTimeout(1000);
            }
        }

        console.log('\n🎯 测试结果汇总');
        console.log('==================');
        console.log('✅ 页面加载正常');
        console.log('✅ 链接管理标签切换正常');
        console.log(`${jsCheck.objectExists ? '✅' : '❌'} JavaScript对象初始化`);
        console.log(`${jsCheck.editMethodExists ? '✅' : '❌'} 编辑方法存在`);
        console.log(`${editButtonCount > 0 ? '✅' : '❌'} 编辑按钮存在`);

        console.log('\n⏳ 等待3秒观察最终状态...');
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
    testEditLinkButton().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}