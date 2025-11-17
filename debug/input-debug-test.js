const { chromium } = require('playwright');

async function debugInputIssue() {
    console.log('🔍 简洁充值页面输入框调试');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000
    });

    const page = await browser.newPage();

    try {
        // 监听控制台消息和错误
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                console.log(`❌ 页面错误: ${text}`);
            } else if (type === 'log') {
                console.log(`📄 页面日志: ${text}`);
            }
        });

        page.on('pageerror', error => {
            console.log(`💥 JavaScript错误: ${error.message}`);
        });

        // 访问简洁充值页面
        console.log('\n📍 访问简洁充值页面');
        await page.goto('http://127.0.0.1:8091/simple_recharge');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 检查页面基本信息
        console.log('\n📍 页面基本检查');
        const title = await page.title();
        console.log(`   页面标题: ${title}`);

        const url = page.url();
        console.log(`   当前URL: ${url}`);

        // 检查输入框元素
        console.log('\n📍 检查输入框元素');

        const accountIdInput = await page.$('#accountId');
        console.log(`   账户ID输入框存在: ${accountIdInput ? '✅' : '❌'}`);

        if (accountIdInput) {
            const isVisible = await accountIdInput.isVisible();
            const isEnabled = await accountIdInput.isEnabled();
            const isEditable = await accountIdInput.isEditable();

            console.log(`   账户ID输入框可见: ${isVisible ? '✅' : '❌'}`);
            console.log(`   账户ID输入框启用: ${isEnabled ? '✅' : '❌'}`);
            console.log(`   账户ID输入框可编辑: ${isEditable ? '✅' : '❌'}`);

            // 获取输入框属性
            const inputType = await accountIdInput.getAttribute('type');
            const inputName = await accountIdInput.getAttribute('name');
            const inputClass = await accountIdInput.getAttribute('class');
            const inputDisabled = await accountIdInput.getAttribute('disabled');
            const inputReadonly = await accountIdInput.getAttribute('readonly');

            console.log(`   输入框类型: ${inputType}`);
            console.log(`   输入框名称: ${inputName}`);
            console.log(`   输入框样式类: ${inputClass}`);
            console.log(`   是否禁用: ${inputDisabled || 'false'}`);
            console.log(`   是否只读: ${inputReadonly || 'false'}`);
        }

        // 检查其他输入框
        const inputs = ['accountHolder', 'rechargeAmount'];
        for (const inputId of inputs) {
            const input = await page.$(`#${inputId}`);
            if (input) {
                const isVisible = await input.isVisible();
                const isEnabled = await input.isEnabled();
                const isEditable = await input.isEditable();
                console.log(`   ${inputId} - 存在:✅ 可见:${isVisible?'✅':'❌'} 启用:${isEnabled?'✅':'❌'} 可编辑:${isEditable?'✅':'❌'}`);
            } else {
                console.log(`   ${inputId} - 存在:❌`);
            }
        }

        // 检查JavaScript文件是否加载
        console.log('\n📍 检查JavaScript加载');
        const scriptLoaded = await page.evaluate(() => {
            return typeof window.simpleRechargeManager !== 'undefined';
        });
        console.log(`   JavaScript管理器加载: ${scriptLoaded ? '✅' : '❌'}`);

        // 检查CSS样式
        console.log('\n📍 检查CSS样式');
        if (accountIdInput) {
            const styles = await page.evaluate((input) => {
                const computed = window.getComputedStyle(input);
                return {
                    pointerEvents: computed.pointerEvents,
                    userSelect: computed.userSelect,
                    position: computed.position,
                    zIndex: computed.zIndex,
                    opacity: computed.opacity,
                    display: computed.display,
                    visibility: computed.visibility
                };
            }, accountIdInput);

            console.log('   计算样式:');
            Object.entries(styles).forEach(([key, value]) => {
                console.log(`     ${key}: ${value}`);
            });
        }

        // 尝试手动输入测试
        console.log('\n📍 尝试手动输入测试');
        try {
            await page.click('#accountId');
            await page.waitForTimeout(500);

            await page.type('#accountId', 'TEST_123');
            await page.waitForTimeout(1000);

            const inputValue = await page.inputValue('#accountId');
            console.log(`   手动输入测试结果: ${inputValue ? '✅ 成功输入:' + inputValue : '❌ 输入失败'}`);

        } catch (error) {
            console.log(`   手动输入测试失败: ${error.message}`);
        }

        // 检查是否有遮罩层
        console.log('\n📍 检查页面遮罩');
        const overlays = await page.$$('div[style*="position: fixed"], div[style*="position: absolute"]');
        console.log(`   找到可能的遮罩层数量: ${overlays.length}`);

        for (let i = 0; i < overlays.length && i < 3; i++) {
            const overlay = overlays[i];
            const isVisible = await overlay.isVisible();
            const styles = await page.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return {
                    position: computed.position,
                    zIndex: computed.zIndex,
                    pointerEvents: computed.pointerEvents,
                    backgroundColor: computed.backgroundColor
                };
            }, overlay);

            if (isVisible) {
                console.log(`   遮罩层 ${i + 1}: ${JSON.stringify(styles)}`);
            }
        }

        console.log('\n⏳ 等待10秒进行手动测试...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 调试失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行调试
try {
    require.resolve('playwright');
    debugInputIssue().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}