const { chromium } = require('playwright');

/**
 * 专门测试Dashboard财务审核跳转功能
 */

async function testDashboardJump() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('测试Dashboard财务审核跳转功能...\n');
        
        // 访问Dashboard页面
        await page.goto('http://127.0.0.1:8091/dashboard', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        console.log(`Dashboard URL: ${page.url()}`);

        // 查找所有可能的财务审核链接
        const auditLinks = await page.$$eval('a', links => {
            return links.map(link => ({
                href: link.href,
                text: link.textContent.trim(),
                title: link.title || '',
                className: link.className || ''
            })).filter(link => {
                const text = link.text.toLowerCase();
                const href = link.href.toLowerCase();
                return text.includes('审核') || href.includes('audit');
            });
        });

        console.log('找到的审核相关链接:');
        auditLinks.forEach((link, index) => {
            console.log(`${index + 1}. 文本: "${link.text}"`);
            console.log(`   链接: ${link.href}`);
            console.log(`   标题: ${link.title}`);
            console.log(`   类名: ${link.className}`);
            console.log('');
        });

        // 测试点击导航菜单中的财务审核
        console.log('尝试点击导航菜单中的财务审核...');
        try {
            // 等待页面完全加载
            await page.waitForSelector('nav a[href*="audit"], .navbar a[href*="audit"]', { timeout: 5000 });
            
            // 点击财务审核链接
            await page.click('nav a[href*="audit"], .navbar a[href*="audit"]');
            await page.waitForTimeout(2000);

            const afterClickUrl = page.url();
            console.log(`点击后URL: ${afterClickUrl}`);

            if (afterClickUrl.includes('audit')) {
                console.log('✅ 成功跳转到财务审核页面');
                
                // 检查页面内容
                const auditTitle = await page.title();
                console.log(`审核页面标题: ${auditTitle}`);
                
                const hasAuditContent = await page.$('table, .audit-table, .financial-audit');
                console.log(`审核内容存在: ${hasAuditContent !== null}`);
                
                return {
                    success: true,
                    finalUrl: afterClickUrl,
                    pageTitle: auditTitle,
                    hasContent: hasAuditContent !== null
                };
            } else if (afterClickUrl.includes('login')) {
                console.log('❌ 被重定向到登录页面');
                return {
                    success: false,
                    redirectedToLogin: true,
                    finalUrl: afterClickUrl
                };
            } else {
                console.log(`? 跳转到了其他页面: ${afterClickUrl}`);
                return {
                    success: false,
                    unexpectedRedirect: true,
                    finalUrl: afterClickUrl
                };
            }

        } catch (error) {
            console.log(`导航点击失败: ${error.message}`);
            
            // 尝试备用方法：直接访问财务审核页面
            console.log('\n尝试直接访问财务审核页面...');
            await page.goto('http://127.0.0.1:8091/audit', { waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);
            
            const directUrl = page.url();
            console.log(`直接访问URL: ${directUrl}`);
            
            if (directUrl.includes('audit')) {
                console.log('✅ 直接访问财务审核页面成功');
                return {
                    success: true,
                    directAccess: true,
                    finalUrl: directUrl,
                    navigationFailed: true
                };
            } else {
                console.log('❌ 直接访问也失败');
                return {
                    success: false,
                    directAccessFailed: true,
                    finalUrl: directUrl
                };
            }
        }

    } catch (error) {
        console.log(`测试过程出错: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

// 运行测试并输出结果
testDashboardJump().then(result => {
    console.log('\n=== Dashboard财务审核跳转测试结果 ===');
    console.log(`测试状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    
    if (result.success) {
        if (result.directAccess) {
            console.log('✅ 虽然导航点击失败，但可以直接访问财务审核页面');
        } else {
            console.log('✅ 导航点击跳转正常');
        }
        console.log(`最终页面: ${result.finalUrl}`);
        if (result.pageTitle) {
            console.log(`页面标题: ${result.pageTitle}`);
        }
        if (result.hasContent !== undefined) {
            console.log(`页面内容: ${result.hasContent ? '正常' : '缺失'}`);
        }
    } else {
        if (result.redirectedToLogin) {
            console.log('❌ 页面被重定向到登录页面，可能需要认证');
        } else if (result.unexpectedRedirect) {
            console.log('❌ 页面跳转到了意外的地址');
        } else if (result.directAccessFailed) {
            console.log('❌ 直接访问也失败，可能服务器有问题');
        }
        if (result.finalUrl) {
            console.log(`最终页面: ${result.finalUrl}`);
        }
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
}).catch(console.error);