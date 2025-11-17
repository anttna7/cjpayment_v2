/**
 * Header Dropdown 修复验证测试
 * 测试通知和用户菜单是否正确隐藏
 */

const puppeteer = require('puppeteer');

async function testHeaderDropdownFix() {
    console.log('🔍 开始测试 Header Dropdown 修复...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        
        // 测试仪表板页面
        console.log('📊 测试仪表板页面...');
        await page.goto('http://localhost:8091/dashboard', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // 检查通知dropdown是否隐藏
        const notificationDropdown = await page.$('#notificationDropdown');
        if (notificationDropdown) {
            const isHidden = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '0' || style.visibility === 'hidden';
            }, notificationDropdown);
            
            console.log(`✅ 通知dropdown状态: ${isHidden ? '隐藏' : '显示'}`);
            
            if (!isHidden) {
                console.error('❌ 通知dropdown应该是隐藏状态但当前是显示状态');
            }
        }
        
        // 检查用户菜单dropdown是否隐藏
        const userDropdown = await page.$('#userDropdown');
        if (userDropdown) {
            const isHidden = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '0' || style.visibility === 'hidden';
            }, userDropdown);
            
            console.log(`✅ 用户菜单dropdown状态: ${isHidden ? '隐藏' : '显示'}`);
            
            if (!isHidden) {
                console.error('❌ 用户菜单dropdown应该是隐藏状态但当前是显示状态');
            }
        }
        
        // 测试点击功能
        console.log('🖱️  测试点击通知按钮...');
        const notificationButton = await page.$('#notificationButton');
        if (notificationButton) {
            await notificationButton.click();
            await page.waitForTimeout(500);
            
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '1' && style.visibility === 'visible';
            }, notificationDropdown);
            
            console.log(`✅ 点击后通知dropdown状态: ${isVisible ? '显示' : '隐藏'}`);
            
            // 点击外部关闭
            await page.click('body');
            await page.waitForTimeout(500);
            
            const isHiddenAgain = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '0' || style.visibility === 'hidden';
            }, notificationDropdown);
            
            console.log(`✅ 点击外部后通知dropdown状态: ${isHiddenAgain ? '隐藏' : '显示'}`);
        }
        
        // 测试系统管理页面
        console.log('⚙️  测试系统管理页面...');
        await page.goto('http://localhost:8091/system_management', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // 检查dropdown是否依然正确隐藏
        const systemNotificationDropdown = await page.$('#notificationDropdown');
        const systemUserDropdown = await page.$('#userDropdown');
        
        if (systemNotificationDropdown && systemUserDropdown) {
            const bothHidden = await page.evaluate((notif, user) => {
                const notifStyle = window.getComputedStyle(notif);
                const userStyle = window.getComputedStyle(user);
                
                return (notifStyle.opacity === '0' || notifStyle.visibility === 'hidden') &&
                       (userStyle.opacity === '0' || userStyle.visibility === 'hidden');
            }, systemNotificationDropdown, systemUserDropdown);
            
            console.log(`✅ 系统管理页面dropdown状态: ${bothHidden ? '全部隐藏' : '存在显示'}`);
        }
        
        console.log('🎉 测试完成！');
        
        await page.screenshot({
            path: 'header-dropdown-test-result.png',
            fullPage: false
        });
        console.log('📸 截图已保存为 header-dropdown-test-result.png');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 运行测试
testHeaderDropdownFix().then(() => {
    console.log('✨ 所有测试执行完毕');
}).catch(console.error);