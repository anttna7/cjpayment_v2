const { chromium } = require('playwright');

async function analyzePageWidth() {
    console.log('🔧 分析页面宽度超出的原因...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(2000);
        
        // 分析所有元素的宽度
        const widthAnalysis = await page.evaluate(() => {
            const elements = [];
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                
                // 只关注可能导致水平滚动的元素
                if (rect.right > window.innerWidth || rect.width > window.innerWidth) {
                    elements.push({
                        tagName: el.tagName,
                        id: el.id || '',
                        className: el.className || '',
                        width: rect.width,
                        right: rect.right,
                        left: rect.left,
                        exceedsBy: rect.right - window.innerWidth,
                        styles: {
                            width: styles.width,
                            maxWidth: styles.maxWidth,
                            minWidth: styles.minWidth,
                            overflow: styles.overflow,
                            overflowX: styles.overflowX,
                            position: styles.position,
                            display: styles.display
                        }
                    });
                }
            });
            
            // 按照超出程度排序
            elements.sort((a, b) => b.exceedsBy - a.exceedsBy);
            
            return {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                document: {
                    scrollWidth: document.documentElement.scrollWidth,
                    scrollHeight: document.documentElement.scrollHeight,
                    clientWidth: document.documentElement.clientWidth,
                    clientHeight: document.documentElement.clientHeight
                },
                exceedingElements: elements.slice(0, 10) // 只取前10个最严重的
            };
        });
        
        console.log('页面宽度分析结果:');
        console.log('视口宽度:', widthAnalysis.viewport.width);
        console.log('文档宽度:', widthAnalysis.document.scrollWidth);
        console.log('超出元素数量:', widthAnalysis.exceedingElements.length);
        
        widthAnalysis.exceedingElements.forEach((el, index) => {
            console.log(`${index + 1}. ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`);
            console.log(`   宽度: ${el.width}px, 右边界: ${el.right}px, 超出: ${el.exceedsBy}px`);
        });
        
        // 保存详细分析报告
        require('fs').writeFileSync(
            'debug/page-width-analysis-report.json',
            JSON.stringify(widthAnalysis, null, 2)
        );
        
        // 截图
        await page.screenshot({ path: 'debug/page-width-analysis.png', fullPage: true });
        console.log('📸 截图已保存: debug/page-width-analysis.png');
        
        console.log('📊 页面宽度分析完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 分析过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

analyzePageWidth().catch(console.error);