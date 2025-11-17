const puppeteer = require('puppeteer');

async function testLoginButtonColor() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 测试登录按钮颜色...');
        
        // 访问登录页面
        await page.goto('http://127.0.0.1:8091/login');
        await page.waitForSelector('.btn-enhanced.btn-primary', { timeout: 10000 });
        
        // 获取按钮的计算样式
        const buttonStyles = await page.evaluate(() => {
            const button = document.querySelector('.btn-enhanced.btn-primary');
            if (!button) return null;
            
            const computedStyles = window.getComputedStyle(button);
            return {
                background: computedStyles.background,
                backgroundImage: computedStyles.backgroundImage,
                backgroundColor: computedStyles.backgroundColor,
                classNames: button.className,
                innerHTML: button.innerHTML
            };
        });
        
        console.log('🎨 按钮样式信息:');
        console.log('  类名:', buttonStyles.classNames);
        console.log('  背景:', buttonStyles.background);
        console.log('  背景图像:', buttonStyles.backgroundImage);
        console.log('  背景颜色:', buttonStyles.backgroundColor);
        
        // 检查是否包含紫色渐变
        const hasPurpleGradient = buttonStyles.backgroundImage && 
            (buttonStyles.backgroundImage.includes('139, 92, 246') || // #8b5cf6
             buttonStyles.backgroundImage.includes('124, 58, 237') || // #7c3aed
             buttonStyles.backgroundImage.includes('rgb(139, 92, 246)') ||
             buttonStyles.backgroundImage.includes('rgb(124, 58, 237)'));
        
        // 截图保存
        await page.screenshot({ 
            path: 'debug/login-button-color-verification.png',
            fullPage: true 
        });
        
        console.log('✅ 测试完成');
        console.log('📸 截图已保存: debug/login-button-color-verification.png');
        
        if (hasPurpleGradient) {
            console.log('🎉 成功: 按钮使用了紫色渐变背景');
        } else {
            console.log('⚠️  警告: 按钮可能未使用紫色渐变背景');
        }
        
        // 等待一下查看效果
        await page.waitForTimeout(3000);
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    } finally {
        await browser.close();
    }
}

testLoginButtonColor();