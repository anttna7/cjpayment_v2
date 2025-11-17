const { chromium } = require('playwright');

/**
 * 包含登录流程的完整测试
 */

async function testWithLogin() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('开始包含登录的完整测试...\n');
        
        // 先尝试访问Dashboard
        await page.goto('http://127.0.0.1:8091/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        console.log(`访问根目录后的URL: ${page.url()}`);

        // 如果被重定向到登录页面，尝试登录
        if (page.url().includes('login')) {
            console.log('需要登录，尝试使用测试账号...');
            
            // 尝试常见的测试账号
            const testCredentials = [
                { username: 'admin', password: 'admin' },
                { username: 'test', password: 'test' },
                { username: 'admin', password: '123456' },
                { username: 'root', password: 'root' }
            ];

            for (const cred of testCredentials) {
                try {
                    // 清空输入框
                    await page.fill('input[name="username"], input[name="email"], #username, #email', '');
                    await page.fill('input[name="password"], #password', '');
                    
                    // 输入凭据
                    await page.fill('input[name="username"], input[name="email"], #username, #email', cred.username);
                    await page.fill('input[name="password"], #password', cred.password);
                    
                    // 点击登录按钮
                    await page.click('button[type="submit"], .login-btn, #loginBtn');
                    await page.waitForTimeout(3000);

                    console.log(`尝试登录: ${cred.username}/${cred.password}`);
                    console.log(`登录后URL: ${page.url()}`);

                    // 如果不再是登录页面，说明登录成功
                    if (!page.url().includes('login')) {
                        console.log('登录成功！');
                        break;
                    }
                } catch (error) {
                    console.log(`登录尝试失败: ${error.message}`);
                }
            }
        }

        // 现在测试Dashboard到财务审核的跳转
        if (!page.url().includes('login')) {
            console.log('\n=== 测试Dashboard财务审核跳转 ===');
            
            // 确保在主页
            if (!page.url().includes('127.0.0.1:8091/') || page.url().includes('127.0.0.1:8091/login')) {
                await page.goto('http://127.0.0.1:8091/', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
            }

            console.log(`Dashboard URL: ${page.url()}`);

            // 查找财务审核相关的链接或按钮
            const auditElements = await page.$$eval('*', elements => {
                return elements
                    .filter(el => {
                        const text = el.textContent || '';
                        const href = el.href || '';
                        return (text.includes('财务') && text.includes('审核')) || 
                               text.includes('审核') || 
                               href.includes('audit') ||
                               (el.tagName === 'A' || el.tagName === 'BUTTON') && text.includes('审核');
                    })
                    .map(el => ({
                        tag: el.tagName,
                        text: el.textContent.trim(),
                        href: el.href || null,
                        className: el.className || null
                    }));
            });

            console.log('找到的审核相关元素:');
            auditElements.forEach(el => {
                console.log(`  ${el.tag}: "${el.text}" ${el.href ? '-> ' + el.href : ''}`);
            });

            // 如果找到审核相关元素，尝试点击
            if (auditElements.length > 0) {
                const firstAuditElement = auditElements[0];
                if (firstAuditElement.href && firstAuditElement.href.includes('audit')) {
                    console.log(`点击审核链接: ${firstAuditElement.href}`);
                    await page.click(`a[href*="audit"]`);
                } else {
                    console.log(`点击审核按钮: ${firstAuditElement.text}`);
                    await page.click(`*:has-text("${firstAuditElement.text}"):first`);
                }
                
                await page.waitForTimeout(2000);
                console.log(`点击后URL: ${page.url()}`);
                
                if (page.url().includes('audit')) {
                    console.log('✓ 成功跳转到财务审核页面');
                } else if (page.url().includes('login')) {
                    console.log('✗ 被重定向到登录页面');
                } else {
                    console.log(`? 跳转到了其他页面: ${page.url()}`);
                }
            } else {
                console.log('未找到财务审核相关的按钮或链接');
                
                // 尝试直接访问财务审核页面
                console.log('直接访问财务审核页面...');
                await page.goto('http://127.0.0.1:8091/audit', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
                
                console.log(`直接访问审核页面URL: ${page.url()}`);
                if (page.url().includes('audit')) {
                    console.log('✓ 直接访问财务审核页面成功');
                } else {
                    console.log('✗ 直接访问财务审核页面失败，被重定向');
                }
            }
        } else {
            console.log('登录失败，无法进行后续测试');
        }

        // 最后截图
        await page.screenshot({ path: '/Users/c/Desktop/labs/cjpay/cjpayment/final-test-screenshot.png', fullPage: true });

    } catch (error) {
        console.log(`测试过程出错: ${error.message}`);
    } finally {
        await browser.close();
    }
}

testWithLogin().catch(console.error);