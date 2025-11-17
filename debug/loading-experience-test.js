const { chromium } = require('playwright');

async function testLoadingExperience() {
    console.log('🧪 测试数据报表页面加载体验...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('📊 测试页面刷新加载体验...');
        
        const loadingEvents = [];
        let startTime = Date.now();
        
        // 监听页面加载事件
        page.on('load', () => {
            loadingEvents.push({
                event: 'page_loaded',
                time: Date.now() - startTime
            });
        });
        
        // 监听DOM内容加载完成
        page.on('domcontentloaded', () => {
            loadingEvents.push({
                event: 'dom_ready',
                time: Date.now() - startTime
            });
        });
        
        // 访问数据报表页面
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 检查是否有加载中的提示元素出现
        const loadingCheck = await page.evaluate(() => {
            const potentialLoaders = [
                document.getElementById('reportFastLoader'),
                document.querySelector('.fast-loading-overlay'),
                document.querySelector('.loading-overlay'),
                ...Array.from(document.querySelectorAll('*')).filter(el => 
                    el.textContent.includes('数据报表加载中') ||
                    el.textContent.includes('加载中') ||
                    el.className.includes('loading')
                )
            ].filter(Boolean);
            
            return potentialLoaders.map(el => ({
                id: el.id,
                className: el.className,
                textContent: el.textContent.substring(0, 50),
                isVisible: window.getComputedStyle(el).display !== 'none',
                tagName: el.tagName
            }));
        });
        
        console.log('🔍 检查到的加载相关元素:', JSON.stringify(loadingCheck, null, 2));
        
        // 检查是否有"数据报表加载中"的文本
        const hasLoadingText = await page.evaluate(() => {
            return document.body.innerText.includes('数据报表加载中');
        });
        
        console.log('📝 是否包含"数据报表加载中"文本:', hasLoadingText);
        
        // 截图记录当前状态
        await page.screenshot({ path: 'debug/loading-experience-test.png', fullPage: true });
        console.log('📸 页面截图已保存: debug/loading-experience-test.png');
        
        // 测试刷新页面的体验
        console.log('🔄 测试页面刷新...');
        startTime = Date.now();
        
        await page.reload({ waitUntil: 'networkidle' });
        
        await page.waitForTimeout(2000);
        
        // 再次检查加载提示
        const afterRefreshCheck = await page.evaluate(() => {
            const hasLoadingOverlay = !!document.querySelector('.fast-loading-overlay');
            const hasLoadingText = document.body.innerText.includes('数据报表加载中');
            
            return {
                hasLoadingOverlay,
                hasLoadingText,
                visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           el.textContent.includes('加载');
                }).map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    text: el.textContent.substring(0, 30)
                }))
            };
        });
        
        console.log('🔄 刷新后检查结果:', JSON.stringify(afterRefreshCheck, null, 2));
        
        // 截图刷新后状态
        await page.screenshot({ path: 'debug/loading-experience-after-refresh.png', fullPage: true });
        
        const testResult = {
            success: true,
            initialLoad: {
                events: loadingEvents,
                loadingElements: loadingCheck,
                hasLoadingText: hasLoadingText
            },
            afterRefresh: afterRefreshCheck,
            recommendation: !hasLoadingText && !afterRefreshCheck.hasLoadingText ? 
                '✅ 成功移除加载中间页面' : 
                '⚠️ 仍有加载提示存在'
        };
        
        // 保存测试报告
        require('fs').writeFileSync(
            'debug/loading-experience-report.json', 
            JSON.stringify(testResult, null, 2)
        );
        
        console.log('📋 加载体验测试报告已保存');
        
        return testResult;
        
    } catch (error) {
        console.error('❌ 测试过程出错:', error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

testLoadingExperience().then(result => {
    console.log('\n🧪 加载体验测试完成');
    if (result.success) {
        console.log('📊 结果:', result.recommendation);
        if (result.initialLoad.hasLoadingText || result.afterRefresh?.hasLoadingText) {
            console.log('💡 需要进一步检查其他加载提示来源');
        } else {
            console.log('🎉 加载中间页面提示已成功移除！');
        }
    }
}).catch(console.error);