const { chromium } = require('playwright');
const fs = require('fs');

async function focusedRotationGroupSaveTest() {
    const browser = await chromium.launch({ 
        headless: false,  // 显示浏览器以便观察
        slowMo: 500     // 每步延迟0.5秒
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // 创建截图目录
    const screenshotDir = './screenshots/focused-test';
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const testResults = {
        timestamp: new Date().toISOString(),
        tests: [],
        consoleLogs: [],
        networkRequests: [],
        errors: []
    };
    
    // 监听控制台日志
    page.on('console', msg => {
        const logEntry = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        };
        testResults.consoleLogs.push(logEntry);
        console.log(`控制台[${msg.type()}]: ${msg.text()}`);
    });
    
    // 监听网络请求
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            testResults.networkRequests.push({
                method: request.method(),
                url: request.url(),
                postData: request.postData() || '',
                timestamp: new Date().toISOString(),
                type: 'request'
            });
            console.log(`📤 API请求: ${request.method()} ${request.url()}`);
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            testResults.networkRequests.push({
                status: response.status(),
                url: response.url(),
                timestamp: new Date().toISOString(),
                type: 'response'
            });
            console.log(`📥 API响应: ${response.status()} ${response.url()}`);
        }
    });
    
    // 监听JavaScript错误
    page.on('pageerror', error => {
        const errorEntry = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        testResults.errors.push(errorEntry);
        console.log(`❌ JavaScript错误: ${error.message}`);
    });
    
    try {
        console.log('🎯 专注测试轮询组保存功能...');
        
        // 步骤1: 访问账户管理页面
        console.log('📍 访问账户管理页面');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `${screenshotDir}/01-page-loaded.png` });
        
        // 步骤2: 切换到轮询规则标签页
        console.log('📍 切换到轮询规则标签页');
        await page.locator('#pollingRulesTab').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${screenshotDir}/02-polling-rules-tab.png` });
        
        // 步骤3: 点击创建轮询组按钮
        console.log('📍 点击创建轮询组按钮');
        await page.locator('#createPollingGroupBtn').click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${screenshotDir}/03-modal-opened.png` });
        
        // 检查模态框是否可见
        const modalVisible = await page.locator('#pollingGroupModal').isVisible();
        console.log(`模态框可见性: ${modalVisible}`);
        
        if (!modalVisible) {
            throw new Error('模态框未打开');
        }
        
        // 步骤4: 填写表单并测试权重模式
        console.log('🧪 测试权重模式轮询组保存');
        
        // 填写轮询组名称
        console.log('🖊️ 填写轮询组名称');
        const nameInput = page.locator('#pollingGroupModal #pollingGroupName');
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill('测试权重轮询组');
        console.log('✅ 轮询组名称已填写');
        
        // 选择权重轮询模式
        console.log('🔄 选择权重轮询模式');
        const pollingModeSelect = page.locator('#pollingGroupModal #pollingMode');
        await pollingModeSelect.selectOption('weight');
        await page.waitForTimeout(1000); // 等待模式切换完成
        console.log('✅ 权重模式已选择');
        
        await page.screenshot({ path: `${screenshotDir}/04-form-filled.png` });
        
        // 检查保存按钮状态
        console.log('🔍 检查保存按钮状态');
        const saveButton = page.locator('#savePollingGroupBtn');
        const saveButtonVisible = await saveButton.isVisible();
        const saveButtonEnabled = await saveButton.isEnabled();
        console.log(`保存按钮 - 可见: ${saveButtonVisible}, 启用: ${saveButtonEnabled}`);
        
        if (!saveButtonVisible || !saveButtonEnabled) {
            console.log('⚠️ 保存按钮不可用');
            await page.screenshot({ path: `${screenshotDir}/05-save-button-issue.png` });
        }
        
        // 点击保存按钮
        console.log('💾 点击保存按钮');
        await saveButton.click();
        
        // 等待并观察响应
        console.log('⏳ 等待保存响应...');
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: `${screenshotDir}/06-after-save-click.png` });
        
        // 检查模态框是否关闭（成功保存的指标）
        const modalVisibleAfterSave = await page.locator('#pollingGroupModal').isVisible();
        console.log(`保存后模态框可见性: ${modalVisibleAfterSave}`);
        
        // 检查是否有成功或错误提示
        const toastMessages = await page.locator('.toast, .alert, .notification, .message').all();
        console.log(`找到提示消息 ${toastMessages.length} 个`);
        for (let i = 0; i < toastMessages.length; i++) {
            const message = await toastMessages[i].textContent();
            console.log(`提示消息 ${i+1}: ${message}`);
        }
        
        testResults.tests.push({
            name: '权重模式轮询组保存',
            status: modalVisibleAfterSave ? 'failed' : 'success',
            details: `模态框关闭: ${!modalVisibleAfterSave}`
        });
        
        // 如果模态框仍然打开，尝试测试金额指定模式
        if (modalVisibleAfterSave) {
            console.log('🧪 测试金额指定模式轮询组保存');
            
            await page.locator('#pollingGroupModal #pollingMode').selectOption('amount');
            await page.waitForTimeout(1000);
            await page.screenshot({ path: `${screenshotDir}/07-amount-mode.png` });
            
            await page.locator('#savePollingGroupBtn').click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: `${screenshotDir}/08-amount-save-attempt.png` });
            
            const modalVisibleAfterAmountSave = await page.locator('#pollingGroupModal').isVisible();
            testResults.tests.push({
                name: '金额指定模式轮询组保存',
                status: modalVisibleAfterAmountSave ? 'failed' : 'success',
                details: `模态框关闭: ${!modalVisibleAfterAmountSave}`
            });
        }
        
    } catch (error) {
        console.error('测试失败:', error);
        testResults.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: 'test_execution'
        });
        await page.screenshot({ path: `${screenshotDir}/error.png` });
    }
    
    // 生成测试报告
    const reportPath = `${screenshotDir}/test-report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📊 测试报告已保存到: ${reportPath}`);
    
    await browser.close();
    return testResults;
}

// 运行测试
focusedRotationGroupSaveTest().then(results => {
    console.log('\\n📋 测试总结:');
    results.tests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}: ${test.status}`);
        if (test.details) {
            console.log(`   详情: ${test.details}`);
        }
    });
    
    console.log(`\\n🐛 发现错误 ${results.errors.length} 个`);
    console.log(`📤 网络请求 ${results.networkRequests.length} 个`);
    console.log(`📝 控制台日志 ${results.consoleLogs.length} 条`);
}).catch(console.error);