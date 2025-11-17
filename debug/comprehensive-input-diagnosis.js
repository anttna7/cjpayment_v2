const { chromium } = require('playwright');

async function comprehensiveInputDiagnosis() {
    console.log('🔬 简洁充值页面输入框综合诊断');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();

    try {
        // 监听所有页面事件
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            console.log(`📄 [${type.toUpperCase()}] ${text}`);
        });

        page.on('pageerror', error => {
            console.log(`💥 JavaScript错误: ${error.message}`);
        });

        page.on('dialog', async dialog => {
            console.log(`🔔 弹窗: ${dialog.message()}`);
            await dialog.accept();
        });

        // 访问页面
        console.log('\n📍 Step 1: 访问简洁充值页面');
        await page.goto('http://127.0.0.1:8091/simple_recharge');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 检查页面基本状态
        console.log('\n📍 Step 2: 检查页面基本状态');
        const title = await page.title();
        const url = page.url();
        console.log(`   页面标题: ${title}`);
        console.log(`   当前URL: ${url}`);

        // 检查是否有JavaScript错误
        const jsErrors = await page.evaluate(() => {
            return window.onerror ? '有JavaScript错误处理器' : '无JavaScript错误处理器';
        });
        console.log(`   JavaScript错误状态: ${jsErrors}`);

        // 检查所有输入框的详细状态
        console.log('\n📍 Step 3: 详细检查输入框状态');
        const inputFields = ['accountId', 'accountHolder', 'rechargeAmount'];

        for (const fieldId of inputFields) {
            console.log(`\n   === 检查输入框: ${fieldId} ===`);

            const field = await page.$(`#${fieldId}`);
            if (!field) {
                console.log(`   ❌ 输入框 ${fieldId} 不存在`);
                continue;
            }

            // 基本状态检查
            const isVisible = await field.isVisible();
            const isEnabled = await field.isEnabled();
            const isEditable = await field.isEditable();

            console.log(`   可见性: ${isVisible ? '✅' : '❌'}`);
            console.log(`   启用状态: ${isEnabled ? '✅' : '❌'}`);
            console.log(`   可编辑性: ${isEditable ? '✅' : '❌'}`);

            // HTML属性检查
            const attributes = await page.evaluate((id) => {
                const element = document.getElementById(id);
                if (!element) return null;

                return {
                    tagName: element.tagName,
                    type: element.type,
                    disabled: element.disabled,
                    readonly: element.readOnly,
                    tabIndex: element.tabIndex,
                    className: element.className,
                    style: element.getAttribute('style') || '',
                    autocomplete: element.getAttribute('autocomplete'),
                    placeholder: element.placeholder
                };
            }, fieldId);

            console.log('   HTML属性:');
            Object.entries(attributes || {}).forEach(([key, value]) => {
                console.log(`     ${key}: ${value}`);
            });

            // CSS计算样式检查
            const computedStyle = await page.evaluate((id) => {
                const element = document.getElementById(id);
                if (!element) return null;

                const styles = window.getComputedStyle(element);
                return {
                    pointerEvents: styles.pointerEvents,
                    userSelect: styles.userSelect,
                    cursor: styles.cursor,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    opacity: styles.opacity,
                    display: styles.display,
                    visibility: styles.visibility,
                    transform: styles.transform,
                    backgroundColor: styles.backgroundColor,
                    border: styles.border
                };
            }, fieldId);

            console.log('   计算样式:');
            Object.entries(computedStyle || {}).forEach(([key, value]) => {
                console.log(`     ${key}: ${value}`);
            });

            // 事件监听器检查
            const eventListeners = await page.evaluate((id) => {
                const element = document.getElementById(id);
                if (!element) return null;

                // 检查常见事件监听器
                const events = ['click', 'focus', 'blur', 'input', 'change', 'keydown', 'keyup'];
                const listeners = {};

                events.forEach(eventType => {
                    // 这是一个简化的检查，实际的监听器检查更复杂
                    const hasListener = element['on' + eventType] !== null;
                    listeners[eventType] = hasListener ? '有' : '无';
                });

                return listeners;
            }, fieldId);

            console.log('   事件监听器:');
            Object.entries(eventListeners || {}).forEach(([event, has]) => {
                console.log(`     ${event}: ${has}`);
            });
        }

        // 检查是否有遮罩层或其他阻挡元素
        console.log('\n📍 Step 4: 检查遮罩层和阻挡元素');
        const overlayElements = await page.$$('div, span, section');
        let suspiciousOverlays = 0;

        for (let i = 0; i < Math.min(overlayElements.length, 50); i++) {
            const element = overlayElements[i];
            const styles = await page.evaluate((el) => {
                const computed = window.getComputedStyle(el);
                return {
                    position: computed.position,
                    zIndex: computed.zIndex,
                    pointerEvents: computed.pointerEvents,
                    width: computed.width,
                    height: computed.height,
                    top: computed.top,
                    left: computed.left
                };
            }, element);

            // 检查是否是可疑的遮罩层
            if ((styles.position === 'fixed' || styles.position === 'absolute') &&
                parseInt(styles.zIndex) > 100) {
                suspiciousOverlays++;
                console.log(`   🔍 可疑遮罩层: position=${styles.position}, zIndex=${styles.zIndex}, pointerEvents=${styles.pointerEvents}`);
            }
        }
        console.log(`   发现 ${suspiciousOverlays} 个可疑遮罩层`);

        // 测试各种输入方式
        console.log('\n📍 Step 5: 测试多种输入方式');

        const testInputMethods = async (fieldId, testValue) => {
            console.log(`\n   === 测试输入框 ${fieldId} ===`);

            try {
                // 方法1: 直接点击并输入
                console.log('   方法1: 点击+输入');
                await page.click(`#${fieldId}`);
                await page.waitForTimeout(500);
                await page.type(`#${fieldId}`, testValue);
                await page.waitForTimeout(500);

                let value1 = await page.inputValue(`#${fieldId}`);
                console.log(`   结果1: ${value1 || '(空)'}`);

                // 清空
                await page.fill(`#${fieldId}`, '');

                // 方法2: 聚焦后输入
                console.log('   方法2: 聚焦+输入');
                await page.focus(`#${fieldId}`);
                await page.waitForTimeout(500);
                await page.keyboard.type(testValue);
                await page.waitForTimeout(500);

                let value2 = await page.inputValue(`#${fieldId}`);
                console.log(`   结果2: ${value2 || '(空)'}`);

                // 清空
                await page.fill(`#${fieldId}`, '');

                // 方法3: 直接设置值
                console.log('   方法3: 直接设置');
                await page.fill(`#${fieldId}`, testValue);
                await page.waitForTimeout(500);

                let value3 = await page.inputValue(`#${fieldId}`);
                console.log(`   结果3: ${value3 || '(空)'}`);

                // 方法4: JavaScript设置值
                console.log('   方法4: JavaScript设置');
                await page.evaluate((id, val) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.value = val;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, fieldId, testValue);
                await page.waitForTimeout(500);

                let value4 = await page.inputValue(`#${fieldId}`);
                console.log(`   结果4: ${value4 || '(空)'}`);

                return {
                    method1: value1,
                    method2: value2,
                    method3: value3,
                    method4: value4
                };

            } catch (error) {
                console.log(`   ❌ 输入测试失败: ${error.message}`);
                return null;
            }
        };

        // 测试每个输入框
        const testResults = {};
        testResults.accountId = await testInputMethods('accountId', 'TEST_123');
        testResults.accountHolder = await testInputMethods('accountHolder', '测试公司');
        testResults.rechargeAmount = await testInputMethods('rechargeAmount', '500');

        // 检查SimpleRechargeManager是否正确初始化
        console.log('\n📍 Step 6: 检查JavaScript管理器状态');
        const managerStatus = await page.evaluate(() => {
            const manager = window.simpleRechargeManager;
            if (!manager) return { exists: false };

            return {
                exists: true,
                hasForm: !!manager.form,
                hasSubmitButton: !!manager.submitButton,
                currentPaymentType: manager.currentPaymentType,
                isSubmitting: manager.isSubmitting
            };
        });

        console.log('   管理器状态:');
        Object.entries(managerStatus).forEach(([key, value]) => {
            console.log(`     ${key}: ${value}`);
        });

        // 检查DOM结构
        console.log('\n📍 Step 7: 检查DOM结构');
        const domStructure = await page.evaluate(() => {
            const form = document.getElementById('simpleRechargeForm');
            if (!form) return { formExists: false };

            const inputs = form.querySelectorAll('input');
            const inputInfo = Array.from(inputs).map(input => ({
                id: input.id,
                name: input.name,
                type: input.type,
                hasParent: !!input.parentElement,
                parentTag: input.parentElement?.tagName
            }));

            return {
                formExists: true,
                inputCount: inputs.length,
                inputInfo: inputInfo
            };
        });

        console.log('   DOM结构:');
        console.log(`     表单存在: ${domStructure.formExists}`);
        console.log(`     输入框数量: ${domStructure.inputCount || 0}`);
        domStructure.inputInfo?.forEach(info => {
            console.log(`     输入框 ${info.id}: type=${info.type}, parent=${info.parentTag}`);
        });

        // 生成诊断报告
        console.log('\n🎯 诊断报告汇总');
        console.log('======================');
        console.log(`页面加载: ✅`);
        console.log(`JavaScript管理器: ${managerStatus.exists ? '✅' : '❌'}`);
        console.log(`DOM结构完整: ${domStructure.formExists ? '✅' : '❌'}`);
        console.log(`可疑遮罩层: ${suspiciousOverlays > 0 ? '⚠️ ' + suspiciousOverlays + '个' : '✅ 无'}`);

        console.log('\n输入测试结果:');
        Object.entries(testResults).forEach(([field, results]) => {
            if (results) {
                const success = Object.values(results).some(val => val && val.length > 0);
                console.log(`  ${field}: ${success ? '✅ 可输入' : '❌ 无法输入'}`);
                Object.entries(results).forEach(([method, value]) => {
                    console.log(`    ${method}: ${value || '(空)'}`);
                });
            } else {
                console.log(`  ${field}: ❌ 测试失败`);
            }
        });

        console.log('\n⏳ 保持浏览器打开15秒供手动验证...');
        await page.waitForTimeout(15000);

    } catch (error) {
        console.error('❌ 诊断过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行诊断
try {
    require.resolve('playwright');
    comprehensiveInputDiagnosis().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装，请运行: npm install playwright');
}