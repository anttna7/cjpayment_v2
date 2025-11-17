const { chromium } = require('playwright');
const fs = require('fs');

async function completeRotationGroupTest() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const screenshotDir = './screenshots/complete-test';
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // 监听控制台日志
    page.on('console', msg => {
        console.log(`控制台[${msg.type()}]: ${msg.text()}`);
    });
    
    // 监听JavaScript错误
    page.on('pageerror', error => {
        console.log(`❌ JavaScript错误: ${error.message}`);
    });
    
    try {
        console.log('🎯 完整测试轮询组保存功能（包括选择账户）...');
        
        // 访问页面
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        
        // 切换到轮询规则标签页
        await page.locator('#pollingRulesTab').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${screenshotDir}/01-polling-rules-tab.png` });
        
        // 点击创建轮询组按钮
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${screenshotDir}/02-modal-opened.png` });
        
        // 填写轮询组名称
        console.log('📝 填写轮询组名称');
        await page.locator('#pollingGroupModal #pollingGroupName').fill('完整测试轮询组');
        
        // 选择权重轮询模式
        console.log('🔄 选择权重轮询模式');
        await page.locator('#pollingGroupModal #pollingMode').selectOption('weight');
        await page.waitForTimeout(2000); // 等待账户选择器和配置区域加载
        
        await page.screenshot({ path: `${screenshotDir}/03-weight-mode-selected.png` });
        
        // 检查并选择第一个收款账户
        console.log('📋 选择收款账户');
        const checkboxes = await page.locator('.account-selector-checkbox').all();
        console.log(`找到 ${checkboxes.length} 个账户复选框`);
        
        if (checkboxes.length > 0) {
            console.log('✅ 选择第一个账户');
            await checkboxes[0].check();
            await page.waitForTimeout(1000);
            
            const isChecked = await checkboxes[0].isChecked();
            console.log(`第一个账户已选中: ${isChecked}`);
            
            await page.screenshot({ path: `${screenshotDir}/04-account-selected.png` });
            
            // 验证权重配置区域是否有账户项
            const weightItems = await page.locator('#weightPollingConfig .weight-account-item').all();
            console.log(`权重配置中找到 ${weightItems.length} 个账户项`);
            
            if (weightItems.length > 0) {
                // 检查权重输入框
                const weightInput = page.locator('#weightPollingConfig .weight-input').first();
                const weightValue = await weightInput.inputValue();
                console.log(`当前权重值: ${weightValue}`);
                
                // 如果权重为空，设置为默认值
                if (!weightValue || weightValue === '') {
                    console.log('🔧 设置权重为 1');
                    await weightInput.fill('1');
                    await page.waitForTimeout(500);
                }
                
                await page.screenshot({ path: `${screenshotDir}/05-weight-configured.png` });
            }
        } else {
            console.log('❌ 没有找到账户复选框');
            await page.screenshot({ path: `${screenshotDir}/04-no-accounts.png` });
            return;
        }
        
        // 尝试保存
        console.log('💾 点击保存按钮');
        const saveButton = page.locator('#savePollingGroupBtn');
        await saveButton.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: `${screenshotDir}/06-save-attempted.png` });
        
        // 检查保存结果
        const modalVisible = await page.locator('#pollingGroupModal').isVisible();
        console.log(`保存后模态框仍可见: ${modalVisible}`);
        
        if (!modalVisible) {
            console.log('🎉 保存成功！模态框已关闭');
            
            // 检查轮询组是否出现在列表中
            await page.waitForTimeout(1000);
            const pollingGroups = await page.locator('.polling-group-card').all();
            console.log(`页面中找到 ${pollingGroups.length} 个轮询组`);
            
            if (pollingGroups.length > 0) {
                // 查找我们刚创建的轮询组
                const newGroup = await page.locator('.polling-group-card:has-text("完整测试轮询组")').first();
                const newGroupExists = await newGroup.count() > 0;
                console.log(`新创建的轮询组已显示: ${newGroupExists}`);
                
                if (newGroupExists) {
                    await page.screenshot({ path: `${screenshotDir}/07-success-group-created.png` });
                    console.log('✅ 轮询组保存测试完全成功！');
                    return { success: true, message: '轮询组创建成功' };
                }
            }
        } else {
            console.log('❌ 保存失败，模态框仍然打开');
            
            // 检查错误提示
            const toastMessages = await page.locator('.toast, .alert, .notification, .message').all();
            if (toastMessages.length > 0) {
                console.log('发现错误提示:');
                for (let i = 0; i < toastMessages.length; i++) {
                    const message = await toastMessages[i].textContent();
                    console.log(`  - ${message}`);
                }
            } else {
                console.log('没有发现错误提示消息');
            }
            
            await page.screenshot({ path: `${screenshotDir}/06-save-failed.png` });
            return { success: false, message: '轮询组保存失败' };
        }
        
    } catch (error) {
        console.error('测试过程发生错误:', error);
        await page.screenshot({ path: `${screenshotDir}/error.png` });
        return { success: false, message: `测试错误: ${error.message}` };
    } finally {
        await browser.close();
    }
}

// 运行测试
completeRotationGroupTest().then(result => {
    console.log('\\n🏁 测试完成');
    console.log(`状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`消息: ${result.message}`);
}).catch(console.error);