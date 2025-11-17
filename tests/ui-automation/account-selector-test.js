const { chromium } = require('playwright');
const fs = require('fs');

async function testAccountSelector() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const screenshotDir = './screenshots/account-selector-test';
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
        console.log('🔍 测试账户选择器功能...');
        
        // 访问页面
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        
        // 切换到轮询规则标签页
        await page.locator('#pollingRulesTab').click();
        await page.waitForTimeout(1000);
        
        // 点击创建轮询组按钮
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: `${screenshotDir}/01-modal-opened.png` });
        
        // 检查账户选择器容器是否存在
        const accountSelector = page.locator('#accountSelector');
        const selectorExists = await accountSelector.count();
        console.log(`账户选择器容器存在: ${selectorExists > 0}`);
        
        if (selectorExists > 0) {
            const selectorVisible = await accountSelector.isVisible();
            console.log(`账户选择器可见: ${selectorVisible}`);
            
            // 获取选择器内容
            const selectorContent = await accountSelector.innerHTML();
            console.log(`选择器内容长度: ${selectorContent.length}`);
            console.log(`选择器内容: ${selectorContent.slice(0, 200)}...`);
        }
        
        // 填写轮询组名称
        await page.locator('#pollingGroupModal #pollingGroupName').fill('测试账户选择器');
        
        // 选择权重轮询模式
        console.log('🔄 选择权重轮询模式...');
        await page.locator('#pollingGroupModal #pollingMode').selectOption('weight');
        await page.waitForTimeout(2000); // 等待账户选择器渲染
        
        await page.screenshot({ path: `${screenshotDir}/02-weight-mode-selected.png` });
        
        // 再次检查账户选择器
        const selectorContentAfterMode = await accountSelector.innerHTML();
        console.log(`模式选择后选择器内容长度: ${selectorContentAfterMode.length}`);
        console.log(`模式选择后选择器内容: ${selectorContentAfterMode.slice(0, 300)}...`);
        
        // 查找复选框
        const checkboxes = await page.locator('.account-selector-checkbox').all();
        console.log(`找到复选框数量: ${checkboxes.length}`);
        
        if (checkboxes.length > 0) {
            console.log('✅ 找到账户复选框，尝试选择第一个账户');
            
            // 选择第一个账户
            await checkboxes[0].check();
            await page.waitForTimeout(500);
            
            const isChecked = await checkboxes[0].isChecked();
            console.log(`第一个账户已选中: ${isChecked}`);
            
            await page.screenshot({ path: `${screenshotDir}/03-account-selected.png` });
            
            // 尝试保存
            console.log('💾 尝试保存轮询组...');
            await page.locator('#savePollingGroupBtn').click();
            await page.waitForTimeout(3000);
            
            await page.screenshot({ path: `${screenshotDir}/04-save-attempted.png` });
            
            // 检查模态框是否关闭
            const modalVisible = await page.locator('#pollingGroupModal').isVisible();
            console.log(`保存后模态框仍可见: ${modalVisible}`);
            
            // 检查错误提示
            const toastMessages = await page.locator('.toast, .alert, .notification, .message').all();
            if (toastMessages.length > 0) {
                console.log('发现提示消息:');
                for (let i = 0; i < toastMessages.length; i++) {
                    const message = await toastMessages[i].textContent();
                    console.log(`  - ${message}`);
                }
            }
        } else {
            console.log('❌ 没有找到账户复选框');
            
            // 检查是否有错误消息或加载提示
            const loadingElements = await page.locator('.loading, .loading-spinner, [data-loading]').all();
            console.log(`发现加载元素: ${loadingElements.length}`);
            
            // 尝试手动调用populateAccountSelector方法
            console.log('🔧 尝试手动触发账户选择器填充...');
            const hasAccountsManager = await page.evaluate(() => {
                return typeof window.accountsManager !== 'undefined';
            });
            
            console.log(`AccountsManager存在: ${hasAccountsManager}`);
            
            if (hasAccountsManager) {
                const accountsCount = await page.evaluate(() => {
                    return window.accountsManager.receivingAccounts ? window.accountsManager.receivingAccounts.length : 0;
                });
                console.log(`接收到的账户数量: ${accountsCount}`);
                
                if (accountsCount > 0) {
                    // 手动调用填充方法
                    await page.evaluate(() => {
                        window.accountsManager.populateAccountSelector('weight');
                    });
                    
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: `${screenshotDir}/05-manual-populate.png` });
                    
                    // 再次检查复选框
                    const checkboxesAfterManual = await page.locator('.account-selector-checkbox').all();
                    console.log(`手动填充后找到复选框数量: ${checkboxesAfterManual.length}`);
                }
            }
        }
        
    } catch (error) {
        console.error('测试失败:', error);
        await page.screenshot({ path: `${screenshotDir}/error.png` });
    }
    
    await browser.close();
}

// 运行测试
testAccountSelector().catch(console.error);