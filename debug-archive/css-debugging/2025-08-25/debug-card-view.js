/**
 * 调试卡片视图问题
 */

const puppeteer = require('puppeteer');

async function debugCardView() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`浏览器: ${msg.text()}`));
    page.on('pageerror', error => console.error(`页面错误: ${error.message}`));
    
    try {
        console.log('访问商户管理页面...');
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== 检查卡片渲染器 ===');
        const rendererCheck = await page.evaluate(() => {
            return {
                enhancedCardRenderer: typeof window.enhancedMerchantCardRenderer,
                enhancedCardRendererExists: !!window.enhancedMerchantCardRenderer,
                cardContainer: !!document.getElementById('merchantGrid'),
                containerDisplay: document.getElementById('merchantGrid')?.style.display,
                dataManager: typeof window.merchantDataManager,
                dataManagerMerchants: window.merchantDataManager?.merchants?.length || 0
            };
        });
        
        console.log('渲染器检查结果:');
        console.log(`  增强卡片渲染器类型: ${rendererCheck.enhancedCardRenderer}`);
        console.log(`  增强卡片渲染器存在: ${rendererCheck.enhancedCardRendererExists}`);
        console.log(`  卡片容器存在: ${rendererCheck.cardContainer}`);
        console.log(`  容器显示状态: ${rendererCheck.containerDisplay || 'default'}`);
        console.log(`  数据管理器商户数量: ${rendererCheck.dataManagerMerchants}`);
        
        console.log('\n=== 手动调用卡片渲染 ===');
        await page.click('#gridViewBtn');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const cardRenderResult = await page.evaluate(() => {
            const container = document.getElementById('merchantGrid');
            return {
                containerHTML: container ? container.innerHTML.substring(0, 500) + '...' : '容器未找到',
                cardCount: document.querySelectorAll('.merchant-card').length,
                enhancedCardCount: document.querySelectorAll('.enhanced-card').length,
                loadingCards: document.querySelectorAll('.merchant-card--loading').length,
                containerChildren: container ? container.children.length : 0
            };
        });
        
        console.log('卡片渲染结果:');
        console.log(`  容器子元素数量: ${cardRenderResult.containerChildren}`);
        console.log(`  普通卡片数量: ${cardRenderResult.cardCount}`);
        console.log(`  增强卡片数量: ${cardRenderResult.enhancedCardCount}`);
        console.log(`  加载中卡片数量: ${cardRenderResult.loadingCards}`);
        console.log(`  容器HTML: ${cardRenderResult.containerHTML}`);
        
        console.log('\n=== 直接测试渲染器方法 ===');
        const directRender = await page.evaluate(() => {
            try {
                if (window.enhancedMerchantCardRenderer) {
                    window.enhancedMerchantCardRenderer.render();
                    return '渲染器调用成功';
                }
                return '渲染器不存在';
            } catch (error) {
                return `渲染器调用失败: ${error.message}`;
            }
        });
        
        console.log(`直接调用结果: ${directRender}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.screenshot({ path: 'debug-card-view.png', fullPage: true });
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

debugCardView().catch(console.error);