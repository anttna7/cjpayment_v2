const puppeteer = require('puppeteer');

async function testForgotPasswordPages() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 测试忘记密码页面访问...');
        
        // Test 1: 直接访问忘记密码页面
        await page.goto('http://127.0.0.1:8091/forgot-password');
        await page.waitForSelector('#accountId', { timeout: 10000 });
        
        console.log('✅ 忘记密码页面可以直接访问');
        
        // 检查页面元素
        const elements = await page.evaluate(() => {
            const stepContainer = document.querySelector('#step1');
            const accountInput = document.querySelector('#accountId');
            const submitButton = document.querySelector('#sendResetButton');
            const progressSteps = document.querySelector('.progress-steps');
            
            return {
                hasStepContainer: !!stepContainer,
                hasAccountInput: !!accountInput,
                hasSubmitButton: !!submitButton,
                hasProgressSteps: !!progressSteps,
                pageTitle: document.title,
                stepContainerVisible: stepContainer ? !stepContainer.style.display || stepContainer.style.display !== 'none' : false
            };
        });
        
        console.log('📋 页面元素检查结果:');
        console.log('  - 步骤容器:', elements.hasStepContainer);
        console.log('  - 账户输入框:', elements.hasAccountInput);
        console.log('  - 提交按钮:', elements.hasSubmitButton);
        console.log('  - 进度指示器:', elements.hasProgressSteps);
        console.log('  - 页面标题:', elements.pageTitle);
        console.log('  - 步骤容器可见:', elements.stepContainerVisible);
        
        await page.screenshot({ path: 'debug/forgot-password-page-check.png', fullPage: true });
        
        // Test 2: 测试重置密码页面
        console.log('🔍 测试重置密码页面...');
        await page.goto('http://127.0.0.1:8091/reset-password?token=test-token&account=admin');
        
        try {
            await page.waitForSelector('#newPassword', { timeout: 5000 });
            console.log('✅ 重置密码页面可以访问');
            await page.screenshot({ path: 'debug/reset-password-page-check.png', fullPage: true });
        } catch (error) {
            console.log('❌ 重置密码页面访问失败');
            await page.screenshot({ path: 'debug/reset-password-page-error.png', fullPage: true });
        }
        
        console.log('✅ 页面访问测试完成');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        await page.screenshot({ path: 'debug/forgot-password-test-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testForgotPasswordPages();