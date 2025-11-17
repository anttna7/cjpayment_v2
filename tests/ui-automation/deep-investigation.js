/**
 * 深度调查空白页面问题的根本原因
 */
const { chromium } = require('playwright');

async function deepInvestigation() {
    console.log('🔍 开始深度调查空白页面根本原因...\n');
    
    let browser, page;
    
    try {
        browser = await chromium.launch({ 
            headless: false, 
            slowMo: 1000,
            viewport: { width: 1440, height: 900 }
        });
        const context = await browser.newContext();
        page = await context.newPage();

        // 监听所有网络请求
        page.on('request', request => {
            console.log(`🌐 请求: ${request.method()} ${request.url()}`);
        });

        page.on('response', response => {
            if (!response.ok()) {
                console.log(`❌ 失败响应: ${response.status()} ${response.url()}`);
            }
        });

        // 监听所有console输出
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            const emoji = type === 'error' ? '🔴' : type === 'warn' ? '🟡' : '🔵';
            console.log(`${emoji} Console[${type}]: ${text}`);
        });

        // 监听JavaScript错误
        page.on('pageerror', error => {
            console.log(`💥 JavaScript错误: ${error.message}`);
            console.log(`   堆栈: ${error.stack}`);
        });

        console.log('📱 访问账户管理页面...');
        await page.goto('http://127.0.0.1:8091/accounts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // 等待更长时间

        // 1. 检查基础HTML结构
        console.log('\n1️⃣ 检查页面基础HTML结构...');
        const basicStructure = await page.evaluate(() => {
            return {
                title: document.title,
                bodyClasses: document.body.className,
                headLinks: Array.from(document.querySelectorAll('link')).map(link => ({
                    href: link.href,
                    rel: link.rel,
                    loaded: !link.sheet ? 'NOT_LOADED' : 'LOADED'
                })),
                scripts: Array.from(document.querySelectorAll('script[src]')).map(script => ({
                    src: script.src,
                    loaded: 'unknown'
                })),
                hasMain: !!document.querySelector('main'),
                hasAccountsManagement: !!document.querySelector('.accounts-management')
            };
        });
        
        console.log('基础结构:', JSON.stringify(basicStructure, null, 2));

        // 2. 检查CSS文件加载状态
        console.log('\n2️⃣ 检查CSS文件加载状态...');
        const cssStatus = await page.evaluate(() => {
            const results = [];
            for (let i = 0; i < document.styleSheets.length; i++) {
                try {
                    const sheet = document.styleSheets[i];
                    const href = sheet.href || 'inline';
                    const rules = sheet.cssRules || sheet.rules;
                    results.push({
                        href: href,
                        rulesCount: rules ? rules.length : 0,
                        loaded: true
                    });
                } catch (e) {
                    results.push({
                        href: document.styleSheets[i].href || 'inline',
                        error: e.message,
                        loaded: false
                    });
                }
            }
            return results;
        });
        
        console.log('CSS加载状态:', cssStatus);

        // 3. 检查JavaScript加载和执行状态
        console.log('\n3️⃣ 检查JavaScript状态...');
        const jsStatus = await page.evaluate(() => {
            return {
                accountsManagerExists: typeof window.accountsManager !== 'undefined',
                accountsManagerType: typeof window.accountsManager,
                globalObjects: Object.keys(window).filter(key => 
                    key.includes('account') || 
                    key.includes('Account') ||
                    key.includes('Manager')
                ),
                errors: window.jsErrors || []
            };
        });
        
        console.log('JavaScript状态:', jsStatus);

        // 4. 详细检查DOM元素状态
        console.log('\n4️⃣ 检查DOM元素详细状态...');
        const domStatus = await page.evaluate(() => {
            const tabNavigation = document.querySelector('.tab-navigation');
            const tabs = document.querySelectorAll('.tab-nav__item');
            const panels = document.querySelectorAll('.tab-panel');
            
            return {
                tabNavigation: {
                    exists: !!tabNavigation,
                    visible: tabNavigation ? tabNavigation.offsetHeight > 0 : false,
                    classes: tabNavigation ? tabNavigation.className : 'NOT_FOUND',
                    computedStyle: tabNavigation ? {
                        display: window.getComputedStyle(tabNavigation).display,
                        opacity: window.getComputedStyle(tabNavigation).opacity,
                        visibility: window.getComputedStyle(tabNavigation).visibility
                    } : null
                },
                tabs: Array.from(tabs).map((tab, index) => ({
                    index,
                    exists: true,
                    text: tab.textContent?.trim(),
                    dataTab: tab.dataset.tab,
                    classes: tab.className,
                    visible: tab.offsetHeight > 0,
                    computedStyle: {
                        display: window.getComputedStyle(tab).display,
                        opacity: window.getComputedStyle(tab).opacity
                    }
                })),
                panels: Array.from(panels).map((panel, index) => ({
                    index,
                    id: panel.id,
                    classes: panel.className,
                    visible: panel.offsetHeight > 0,
                    hasContent: panel.innerHTML.length > 100,
                    computedStyle: {
                        display: window.getComputedStyle(panel).display,
                        opacity: window.getComputedStyle(panel).opacity
                    }
                }))
            };
        });
        
        console.log('DOM状态详情:', JSON.stringify(domStatus, null, 2));

        // 5. 尝试手动点击第一个标签
        console.log('\n5️⃣ 尝试手动点击标签...');
        
        try {
            const firstTab = await page.locator('.tab-nav__item').first();
            const isVisible = await firstTab.isVisible();
            console.log(`第一个标签可见性: ${isVisible}`);
            
            if (isVisible) {
                await firstTab.click();
                await page.waitForTimeout(2000);
                
                const afterClick = await page.evaluate(() => {
                    const activeTab = document.querySelector('.tab-nav__item--active');
                    const activePanel = document.querySelector('.tab-panel--active');
                    
                    return {
                        activeTab: activeTab ? {
                            text: activeTab.textContent?.trim(),
                            dataTab: activeTab.dataset.tab
                        } : null,
                        activePanel: activePanel ? {
                            id: activePanel.id,
                            visible: activePanel.offsetHeight > 0,
                            hasContent: activePanel.innerHTML.length > 100
                        } : null
                    };
                });
                
                console.log('点击后状态:', afterClick);
            }
            
        } catch (clickError) {
            console.log(`点击失败: ${clickError.message}`);
        }

        // 6. 检查是否有遮挡或z-index问题
        console.log('\n6️⃣ 检查元素遮挡问题...');
        const overlayCheck = await page.evaluate(() => {
            const tabNav = document.querySelector('.tab-navigation');
            if (!tabNav) return { error: 'tab-navigation not found' };
            
            const rect = tabNav.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const elementAtCenter = document.elementFromPoint(centerX, centerY);
            
            return {
                tabNavRect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                elementAtCenter: elementAtCenter ? {
                    tagName: elementAtCenter.tagName,
                    className: elementAtCenter.className,
                    id: elementAtCenter.id
                } : null,
                zIndex: window.getComputedStyle(tabNav).zIndex,
                position: window.getComputedStyle(tabNav).position
            };
        });
        
        console.log('遮挡检查:', overlayCheck);

        // 7. 强制检查是否是CSS样式问题
        console.log('\n7️⃣ 强制应用基础样式测试...');
        await page.evaluate(() => {
            // 强制显示所有标签页内容
            const panels = document.querySelectorAll('.tab-panel');
            panels.forEach(panel => {
                panel.style.display = 'block !important';
                panel.style.opacity = '1 !important';
                panel.style.visibility = 'visible !important';
                panel.style.height = 'auto !important';
            });
            
            // 强制显示标签导航
            const tabNav = document.querySelector('.tab-navigation');
            if (tabNav) {
                tabNav.style.display = 'flex !important';
                tabNav.style.opacity = '1 !important';
                tabNav.style.visibility = 'visible !important';
            }
            
            console.log('已强制应用显示样式');
        });
        
        await page.waitForTimeout(2000);
        
        const afterForceStyle = await page.evaluate(() => {
            const panels = document.querySelectorAll('.tab-panel');
            return Array.from(panels).map(panel => ({
                id: panel.id,
                visible: panel.offsetHeight > 0,
                display: window.getComputedStyle(panel).display,
                opacity: window.getComputedStyle(panel).opacity
            }));
        });
        
        console.log('强制样式后状态:', afterForceStyle);

        // 8. 截图对比
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/tests/ui-automation/deep-investigation-result.png',
            fullPage: true 
        });
        
        console.log('\n📸 深度调查截图: deep-investigation-result.png');

        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('💥 深度调查过程中出现错误:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

deepInvestigation().catch(console.error);