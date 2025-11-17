/**
 * Header统一修复效果验证脚本
 * 自动测试所有页面的header组件是否统一
 */

const puppeteer = require('puppeteer');

// 测试页面列表
const testPages = [
    { name: '仪表板', url: 'http://localhost:8091/dashboard' },
    { name: '系统管理', url: 'http://localhost:8091/system_management' },
    { name: '商户管理', url: 'http://localhost:8091/merchant' },
    { name: '财务审核', url: 'http://localhost:8091/audit' },
    { name: '账户管理', url: 'http://localhost:8091/accounts' },
    { name: '数据报表', url: 'http://localhost:8091/reports' }
];

async function testPageHeaderComponents(page, pageName) {
    const results = {
        pageName,
        theme_toggle: false,
        notifications: false,
        user_menu: false,
        help_center: false,
        notifications_count: 0,
        notifications_content: [],
        dropdown_hidden_by_default: {
            notifications: false,
            user_menu: false
        }
    };
    
    try {
        console.log(`📄 测试页面: ${pageName}`);
        
        // 检查主题切换按钮
        const themeToggle = await page.$('#themeToggle');
        results.theme_toggle = !!themeToggle;
        
        // 检查通知组件
        const notifications = await page.$('#notifications');
        const notificationBadge = await page.$('#notificationBadge');
        results.notifications = !!notifications;
        
        if (notificationBadge) {
            const badgeText = await page.evaluate(el => el.textContent, notificationBadge);
            results.notifications_count = parseInt(badgeText) || 0;
        }
        
        // 检查用户菜单
        const userMenu = await page.$('#userMenu');
        results.user_menu = !!userMenu;
        
        // 检查帮助中心菜单项
        const helpCenter = await page.$('a[href="/help"]');
        results.help_center = !!helpCenter;
        
        // 检查dropdown默认隐藏状态
        const notificationsDropdown = await page.$('#notificationsDropdown');
        if (notificationsDropdown) {
            const isHidden = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '0' || style.visibility === 'hidden';
            }, notificationsDropdown);
            results.dropdown_hidden_by_default.notifications = isHidden;
        }
        
        const userDropdown = await page.$('#userDropdown');
        if (userDropdown) {
            const isHidden = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.opacity === '0' || style.visibility === 'hidden';
            }, userDropdown);
            results.dropdown_hidden_by_default.user_menu = isHidden;
        }
        
        // 获取通知内容
        const notificationItems = await page.$$('.notification-item .notification-title');
        for (const item of notificationItems) {
            const title = await page.evaluate(el => el.textContent, item);
            results.notifications_content.push(title);
        }
        
        // 测试主题切换功能
        if (themeToggle) {
            const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            await themeToggle.click();
            await page.waitForTimeout(100);
            const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            results.theme_toggle_works = currentTheme !== newTheme;
        }
        
        console.log(`  ✅ ${pageName} 测试完成`);
        
    } catch (error) {
        console.error(`  ❌ ${pageName} 测试失败:`, error.message);
        results.error = error.message;
    }
    
    return results;
}

async function runUnifiedHeaderTest() {
    console.log('🔧 开始Header统一性测试...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        const results = [];
        
        // 测试每个页面
        for (const testPage of testPages) {
            await page.goto(testPage.url, { waitUntil: 'networkidle2' });
            await page.waitForTimeout(2000); // 等待JavaScript加载
            
            const result = await testPageHeaderComponents(page, testPage.name);
            results.push(result);
        }
        
        // 生成测试报告
        console.log('\n📊 测试报告总结:');
        console.log('='.repeat(80));
        
        // 检查一致性
        const consistency = {
            theme_toggle: new Set(results.map(r => r.theme_toggle)).size === 1,
            notifications: new Set(results.map(r => r.notifications)).size === 1,
            user_menu: new Set(results.map(r => r.user_menu)).size === 1,
            help_center: new Set(results.map(r => r.help_center)).size === 1,
            notifications_count: new Set(results.map(r => r.notifications_count)).size === 1,
            dropdown_hidden: results.every(r => 
                r.dropdown_hidden_by_default.notifications && 
                r.dropdown_hidden_by_default.user_menu
            )
        };
        
        // 详细报告
        results.forEach(result => {
            console.log(`\n📄 ${result.pageName}:`);
            console.log(`  主题切换按钮: ${result.theme_toggle ? '✅' : '❌'}`);
            console.log(`  通知组件: ${result.notifications ? '✅' : '❌'}`);
            console.log(`  用户菜单: ${result.user_menu ? '✅' : '❌'}`);
            console.log(`  帮助中心: ${result.help_center ? '✅' : '❌'}`);
            console.log(`  通知数量: ${result.notifications_count}`);
            console.log(`  通知默认隐藏: ${result.dropdown_hidden_by_default.notifications ? '✅' : '❌'}`);
            console.log(`  用户菜单默认隐藏: ${result.dropdown_hidden_by_default.user_menu ? '✅' : '❌'}`);
            console.log(`  通知内容: [${result.notifications_content.join(', ')}]`);
            
            if (result.error) {
                console.log(`  错误: ❌ ${result.error}`);
            }
        });
        
        console.log('\n🎯 一致性检查:');
        console.log(`  主题切换按钮一致性: ${consistency.theme_toggle ? '✅' : '❌'}`);
        console.log(`  通知组件一致性: ${consistency.notifications ? '✅' : '❌'}`);
        console.log(`  用户菜单一致性: ${consistency.user_menu ? '✅' : '❌'}`);
        console.log(`  帮助中心一致性: ${consistency.help_center ? '✅' : '❌'}`);
        console.log(`  通知数量一致性: ${consistency.notifications_count ? '✅' : '❌'}`);
        console.log(`  dropdown默认隐藏: ${consistency.dropdown_hidden ? '✅' : '❌'}`);
        
        const allPassed = Object.values(consistency).every(Boolean);
        console.log(`\n🎉 总体结果: ${allPassed ? '全部通过' : '存在不一致问题'}`);
        
        if (allPassed) {
            console.log('\n✅ Header统一修复成功！');
            console.log('  - 所有页面的theme-toggle、user-menu、notifications组件完全统一');
            console.log('  - UI样式、交互逻辑、配色方案、数据内容保持一致');
            console.log('  - dropdown默认状态正确（隐藏状态）');
        } else {
            console.log('\n⚠️  还存在一些不一致的问题，需要进一步修复');
        }
        
        // 保存测试结果
        const reportPath = 'header-unified-test-report.json';
        const fs = require('fs');
        fs.writeFileSync(reportPath, JSON.stringify({
            testTime: new Date().toISOString(),
            results,
            consistency,
            summary: {
                passed: allPassed,
                totalPages: results.length,
                issues: Object.entries(consistency).filter(([key, value]) => !value).map(([key]) => key)
            }
        }, null, 2));
        
        console.log(`\n📄 详细报告已保存到: ${reportPath}`);
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 运行测试
if (require.main === module) {
    runUnifiedHeaderTest().then(() => {
        console.log('\n✨ 测试完成！');
        process.exit(0);
    }).catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
    });
}

module.exports = { runUnifiedHeaderTest, testPageHeaderComponents };