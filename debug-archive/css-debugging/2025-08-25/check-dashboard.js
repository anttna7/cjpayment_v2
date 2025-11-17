const { chromium } = require('playwright');

/**
 * 检查Dashboard页面财务审核按钮
 */

async function checkDashboard() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('检查Dashboard页面...\n');
        
        await page.goto('http://127.0.0.1:8091/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        console.log(`当前URL: ${page.url()}`);
        console.log(`页面标题: ${await page.title()}`);

        // 获取页面HTML结构，查找可能的财务审核相关元素
        const pageContent = await page.content();
        
        // 查找所有包含"审核"的元素
        const auditElements = await page.$$eval('*', elements => {
            return elements
                .filter(el => el.textContent && el.textContent.includes('审核'))
                .map(el => ({
                    tag: el.tagName,
                    text: el.textContent.trim(),
                    href: el.href || null,
                    onclick: el.onclick ? el.onclick.toString() : null,
                    className: el.className || null,
                    id: el.id || null
                }));
        });

        console.log('\n找到的包含"审核"的元素:');
        auditElements.forEach((el, index) => {
            console.log(`${index + 1}. ${el.tag}: "${el.text}"`);
            if (el.href) console.log(`   链接: ${el.href}`);
            if (el.onclick) console.log(`   点击事件: ${el.onclick}`);
            if (el.className) console.log(`   CSS类: ${el.className}`);
            if (el.id) console.log(`   ID: ${el.id}`);
        });

        // 查找所有链接和按钮
        const allLinks = await page.$$eval('a, button', elements => {
            return elements.map(el => ({
                tag: el.tagName,
                text: el.textContent.trim(),
                href: el.href || null,
                onclick: el.onclick ? el.onclick.toString() : null
            })).filter(el => el.text.length > 0);
        });

        console.log('\n页面所有链接和按钮:');
        allLinks.forEach((el, index) => {
            console.log(`${index + 1}. ${el.tag}: "${el.text}"`);
            if (el.href) console.log(`   链接: ${el.href}`);
        });

        // 截图保存
        await page.screenshot({ path: '/Users/c/Desktop/labs/cjpay/cjpayment/dashboard-screenshot.png', fullPage: true });
        console.log('\n截图已保存至: dashboard-screenshot.png');

    } catch (error) {
        console.log(`检查失败: ${error.message}`);
    } finally {
        await browser.close();
    }
}

checkDashboard().catch(console.error);