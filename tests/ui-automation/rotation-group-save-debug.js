const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugRotationGroupSave() {
    const browser = await chromium.launch({ 
        headless: false,  // 显示浏览器以便观察
        slowMo: 1000     // 每步延迟1秒
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: {
            dir: './screenshots/rotation-debug-videos/',
            size: { width: 1920, height: 1080 }
        }
    });
    
    const page = await context.newPage();
    
    // 创建截图目录
    const screenshotDir = './screenshots/rotation-debug';
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const debugData = {
        timestamp: new Date().toISOString(),
        testResults: [],
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
        debugData.consoleLogs.push(logEntry);
        console.log(`控制台[${msg.type()}]: ${msg.text()}`);
    });
    
    // 监听网络请求
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            debugData.networkRequests.push({
                method: request.method(),
                url: request.url(),
                headers: request.headers(),
                timestamp: new Date().toISOString(),
                type: 'request'
            });
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            debugData.networkRequests.push({
                status: response.status(),
                url: response.url(),
                headers: response.headers(),
                timestamp: new Date().toISOString(),
                type: 'response'
            });
        }
    });
    
    // 监听JavaScript错误
    page.on('pageerror', error => {
        const errorEntry = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        debugData.errors.push(errorEntry);
        console.log(`JavaScript错误: ${error.message}`);
    });
    
    try {
        console.log('🔍 开始调试轮询组保存功能...');
        
        // 步骤1: 访问账户管理页面
        console.log('📍 步骤1: 访问 http://127.0.0.1:8091/accounts');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `${screenshotDir}/01-initial-load.png` });
        
        // 步骤2: 切换到轮询规则标签页
        console.log('📍 步骤2: 切换到轮询规则标签页');
        const rotationTab = page.locator('[data-tab="polling-rules"]').first();
        
        if (await rotationTab.count() > 0) {
            await rotationTab.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `${screenshotDir}/02-rotation-rules-tab.png` });
            debugData.testResults.push({ step: '切换到轮询规则标签页', status: 'success' });
        } else {
            console.log('❌ 找不到轮询规则标签页，检查页面结构...');
            
            // 获取页面中所有的标签页
            const allTabs = await page.locator('[data-tab], .tab-nav__item, .nav-tabs .nav-item').all();
            console.log(`页面中共有 ${allTabs.length} 个标签页:`);
            
            for (let i = 0; i < allTabs.length; i++) {
                const tab = allTabs[i];
                const text = await tab.textContent() || '';
                const dataTab = await tab.getAttribute('data-tab') || '';
                const classes = await tab.getAttribute('class') || '';
                console.log(`标签页 ${i+1}: 文本="${text.trim()}" data-tab="${dataTab}" class="${classes}"`);
            }
            
            // 获取页面标题
            const pageTitle = await page.title();
            console.log(`页面标题: ${pageTitle}`);
            
            // 获取页面URL
            const currentUrl = page.url();
            console.log(`当前URL: ${currentUrl}`);
            
            // 尝试等待页面完全加载
            await page.waitForTimeout(3000);
            
            // 再次尝试寻找轮询规则标签页
            const retryTab = page.locator('[data-tab="polling-rules"]').first();
            if (await retryTab.count() > 0) {
                console.log('✅ 重试后找到轮询规则标签页');
                await retryTab.click();
                await page.waitForTimeout(2000);
                await page.screenshot({ path: `${screenshotDir}/02-rotation-rules-tab-retry.png` });
                debugData.testResults.push({ step: '重试后切换到轮询规则标签页', status: 'success' });
            } else {
                await page.screenshot({ path: `${screenshotDir}/02-no-rotation-tab.png` });
                debugData.testResults.push({ step: '切换到轮询规则标签页', status: 'failed', error: '找不到标签页' });
                throw new Error('找不到轮询规则标签页');
            }
        }
        
        // 步骤3: 点击创建轮询组按钮
        console.log('📍 步骤3: 寻找并点击创建轮询组按钮');
        
        // 寻找多种可能的按钮选择器
        const createButtonSelectors = [
            '#createPollingGroupBtn',
            'button:has-text("创建轮询组")',
            'button:has-text("新建轮询组")',
            'button:has-text("添加轮询组")',
            '.btn-primary:has-text("创建")',
            '.create-rotation-group',
            '[data-action="create-rotation-group"]',
            '#createRotationGroup',
            '.rotation-group-create-btn'
        ];
        
        let createButton = null;
        for (const selector of createButtonSelectors) {
            const button = page.locator(selector).first();
            if (await button.count() > 0) {
                createButton = button;
                console.log(`✅ 找到创建按钮: ${selector}`);
                break;
            }
        }
        
        if (!createButton) {
            console.log('❌ 未找到创建轮询组按钮，检查页面元素...');
            
            // 获取页面中所有按钮的信息
            const allButtons = await page.locator('button').all();
            console.log(`页面中共有 ${allButtons.length} 个按钮:`);
            
            for (let i = 0; i < allButtons.length; i++) {
                const button = allButtons[i];
                const text = await button.textContent() || '';
                const classes = await button.getAttribute('class') || '';
                const id = await button.getAttribute('id') || '';
                console.log(`按钮 ${i+1}: 文本="${text}" class="${classes}" id="${id}"`);
            }
            
            // 尝试查找包含相关文字的元素
            const relatedElements = await page.locator('*:has-text("轮询"), *:has-text("创建"), *:has-text("添加")').all();
            console.log(`找到包含相关文字的元素 ${relatedElements.length} 个`);
            
            debugData.testResults.push({ step: '寻找创建轮询组按钮', status: 'failed', error: '未找到按钮' });
        } else {
            // 检查按钮状态
            const isVisible = await createButton.isVisible();
            const isEnabled = await createButton.isEnabled();
            console.log(`按钮状态: 可见=${isVisible}, 启用=${isEnabled}`);
            
            if (isVisible && isEnabled) {
                await createButton.click();
                await page.waitForTimeout(2000);
                await page.screenshot({ path: `${screenshotDir}/03-after-create-click.png` });
                debugData.testResults.push({ step: '点击创建轮询组按钮', status: 'success' });
            } else {
                debugData.testResults.push({ step: '点击创建轮询组按钮', status: 'failed', error: `按钮不可用: 可见=${isVisible}, 启用=${isEnabled}` });
            }
        }
        
        // 步骤4: 检查是否打开了模态框或表单
        console.log('📍 步骤4: 检查轮询组创建界面');
        
        const modalSelectors = [
            '#pollingGroupModalOverlay',
            '#pollingGroupModal',
            '.modal-overlay',
            '.modal-enhanced',
            '.modal',
            '.rotation-group-modal',
            '.modal-dialog',
            '.popup',
            '[role="dialog"]',
            '.overlay'
        ];
        
        let modal = null;
        for (const selector of modalSelectors) {
            const element = page.locator(selector).first();
            if (await element.count() > 0 && await element.isVisible()) {
                modal = element;
                console.log(`✅ 找到模态框: ${selector}`);
                break;
            }
        }
        
        if (modal) {
            await page.screenshot({ path: `${screenshotDir}/04-modal-opened.png` });
            debugData.testResults.push({ step: '模态框打开', status: 'success' });
            
            // 步骤5: 测试权重模式
            await testWeightMode(page, screenshotDir, debugData);
            
            // 步骤6: 测试金额指定模式
            await testAmountMode(page, screenshotDir, debugData);
            
            // 步骤7: 测试顺序模式
            await testSequenceMode(page, screenshotDir, debugData);
            
        } else {
            console.log('❌ 未找到轮询组创建界面');
            debugData.testResults.push({ step: '模态框打开', status: 'failed', error: '未找到创建界面' });
            
            // 检查是否有内联表单
            const formElements = await page.locator('form, .form, .rotation-group-form').all();
            console.log(`找到表单元素 ${formElements.length} 个`);
            
            if (formElements.length > 0) {
                await page.screenshot({ path: `${screenshotDir}/04-inline-form.png` });
                console.log('✅ 找到内联表单');
            }
        }
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
        debugData.errors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            context: 'main_process'
        });
        await page.screenshot({ path: `${screenshotDir}/error-state.png` });
    }
    
    // 生成调试报告
    const reportPath = `${screenshotDir}/debug-report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(debugData, null, 2));
    console.log(`📊 调试报告已保存到: ${reportPath}`);
    
    await browser.close();
}

async function testWeightMode(page, screenshotDir, debugData) {
    console.log('🧪 测试权重模式轮询组');
    
    try {
        // 填写轮询组名称 - 只在轮询组模态框中查找
        const nameInput = page.locator('#pollingGroupModal #pollingGroupName').first();
        if (await nameInput.count() > 0) {
            await nameInput.fill('测试权重轮询组');
            debugData.testResults.push({ step: '填写轮询组名称', status: 'success' });
        }
        
        // 选择权重轮询模式
        const pollingModeSelect = page.locator('#pollingGroupModal #pollingMode').first();
        if (await pollingModeSelect.count() > 0) {
            await pollingModeSelect.selectOption('weight');
            debugData.testResults.push({ step: '选择权重模式', status: 'success' });
        }
        
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${screenshotDir}/05-weight-mode-setup.png` });
        
        // 寻找保存按钮
        const saveButton = await findSaveButton(page);
        if (saveButton) {
            console.log('🔍 检查保存按钮事件监听器...');
            
            // 检查按钮的事件监听器
            const buttonInfo = await page.evaluate((button) => {
                const events = getEventListeners ? getEventListeners(button) : 'getEventListeners not available';
                return {
                    onclick: button.onclick,
                    addEventListener: button.addEventListener,
                    events: events,
                    outerHTML: button.outerHTML
                };
            }, saveButton);
            
            console.log('按钮信息:', buttonInfo);
            
            await saveButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `${screenshotDir}/06-weight-mode-save-attempt.png` });
            
            debugData.testResults.push({ 
                step: '权重模式保存按钮点击', 
                status: 'attempted',
                buttonInfo: buttonInfo
            });
        }
        
    } catch (error) {
        console.error('权重模式测试失败:', error);
        debugData.testResults.push({ step: '权重模式测试', status: 'failed', error: error.message });
    }
}

async function testAmountMode(page, screenshotDir, debugData) {
    console.log('🧪 测试金额指定模式轮询组');
    
    try {
        // 选择金额指定模式
        const pollingModeSelect = page.locator('#pollingGroupModal #pollingMode').first();
        if (await pollingModeSelect.count() > 0) {
            await pollingModeSelect.selectOption('amount');
            await page.waitForTimeout(1000);
            debugData.testResults.push({ step: '选择金额指定模式', status: 'success' });
        }
        
        await page.screenshot({ path: `${screenshotDir}/07-amount-mode-setup.png` });
        
        // 尝试保存
        const saveButton = await findSaveButton(page);
        if (saveButton) {
            await saveButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `${screenshotDir}/08-amount-mode-save-attempt.png` });
            debugData.testResults.push({ step: '金额模式保存按钮点击', status: 'attempted' });
        }
        
    } catch (error) {
        console.error('金额指定模式测试失败:', error);
        debugData.testResults.push({ step: '金额指定模式测试', status: 'failed', error: error.message });
    }
}

async function testSequenceMode(page, screenshotDir, debugData) {
    console.log('🧪 测试顺序模式轮询组');
    
    try {
        // 选择顺序轮询模式
        const pollingModeSelect = page.locator('#pollingGroupModal #pollingMode').first();
        if (await pollingModeSelect.count() > 0) {
            await pollingModeSelect.selectOption('sequence');
            await page.waitForTimeout(1000);
            debugData.testResults.push({ step: '选择顺序模式', status: 'success' });
        }
        
        await page.screenshot({ path: `${screenshotDir}/09-sequence-mode-setup.png` });
        
        // 尝试保存
        const saveButton = await findSaveButton(page);
        if (saveButton) {
            await saveButton.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: `${screenshotDir}/10-sequence-mode-save-attempt.png` });
            debugData.testResults.push({ step: '顺序模式保存按钮点击', status: 'attempted' });
        }
        
    } catch (error) {
        console.error('顺序模式测试失败:', error);
        debugData.testResults.push({ step: '顺序模式测试', status: 'failed', error: error.message });
    }
}

async function findSaveButton(page) {
    const saveButtonSelectors = [
        '#savePollingGroupBtn',
        'button:has-text("保存")',
        'button:has-text("确定")',
        'button:has-text("提交")',
        'button[type="submit"]',
        '.btn-save',
        '.save-btn',
        '#saveButton',
        '.btn-primary:has-text("保存")'
    ];
    
    for (const selector of saveButtonSelectors) {
        const button = page.locator(selector).first();
        if (await button.count() > 0 && await button.isVisible()) {
            console.log(`✅ 找到保存按钮: ${selector}`);
            return button;
        }
    }
    
    console.log('❌ 未找到保存按钮');
    return null;
}

// 运行调试
debugRotationGroupSave().catch(console.error);