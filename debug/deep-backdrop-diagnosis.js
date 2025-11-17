const { chromium } = require('playwright');

async function deepBackdropDiagnosis() {
    console.log('🔧 深度诊断: backdrop样式覆盖问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        await page.waitForTimeout(2000);
        
        // 点击高级筛选按钮
        await page.click('#toggleAdvancedFilters');
        await page.waitForTimeout(1000);
        
        // 深度分析backdrop的所有CSS来源
        const deepAnalysis = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            if (!backdrop) return { error: 'backdrop not found' };
            
            const styles = window.getComputedStyle(backdrop);
            const rect = backdrop.getBoundingClientRect();
            
            // 获取所有可能影响宽度的CSS属性
            const relevantStyles = {};
            const properties = [
                'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
                'left', 'top', 'right', 'bottom', 'position',
                'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
                'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
                'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth',
                'boxSizing', 'transform', 'transformOrigin'
            ];
            
            properties.forEach(prop => {
                relevantStyles[prop] = styles.getPropertyValue(prop);
            });
            
            // 检查内联样式
            const inlineStyles = backdrop.style.cssText;
            
            // 检查父容器
            const parentInfo = [];
            let current = backdrop.parentElement;
            while (current && current !== document.body) {
                const parentStyles = window.getComputedStyle(current);
                parentInfo.push({
                    tagName: current.tagName,
                    id: current.id,
                    className: current.className,
                    position: parentStyles.position,
                    overflow: parentStyles.overflow,
                    overflowX: parentStyles.overflowX,
                    width: parentStyles.width,
                    height: parentStyles.height
                });
                current = current.parentElement;
            }
            
            // 检查视口和滚动信息
            const viewportInfo = {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight
            };
            
            return {
                computed: relevantStyles,
                rect: {
                    width: rect.width,
                    height: rect.height,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom,
                    x: rect.x,
                    y: rect.y
                },
                inline: inlineStyles,
                parents: parentInfo,
                viewport: viewportInfo,
                // 检查backdrop是否真的使用了fixed定位
                actualPosition: {
                    offsetParent: backdrop.offsetParent ? backdrop.offsetParent.tagName : null,
                    offsetLeft: backdrop.offsetLeft,
                    offsetTop: backdrop.offsetTop,
                    offsetWidth: backdrop.offsetWidth,
                    offsetHeight: backdrop.offsetHeight
                }
            };
        });
        
        console.log('深度分析结果:');
        console.log('=== 计算样式 ===');
        console.log(JSON.stringify(deepAnalysis.computed, null, 2));
        console.log('=== 实际位置 ===');
        console.log(JSON.stringify(deepAnalysis.rect, null, 2));
        console.log('=== 父容器信息 ===');
        console.log(JSON.stringify(deepAnalysis.parents, null, 2));
        console.log('=== 视口信息 ===');
        console.log(JSON.stringify(deepAnalysis.viewport, null, 2));
        
        // 尝试手动强制设置样式
        console.log('🔧 尝试手动强制修复backdrop样式...');
        const manualFix = await page.evaluate(() => {
            const backdrop = document.getElementById('advancedFiltersBackdrop');
            if (!backdrop) return { error: 'backdrop not found' };
            
            // 记录修改前的状态
            const before = {
                width: backdrop.style.width,
                height: backdrop.style.height,
                left: backdrop.style.left,
                top: backdrop.style.top,
                right: backdrop.style.right,
                bottom: backdrop.style.bottom,
                position: backdrop.style.position
            };
            
            // 强制应用正确的样式
            backdrop.style.setProperty('position', 'fixed', 'important');
            backdrop.style.setProperty('top', '0', 'important');
            backdrop.style.setProperty('left', '0', 'important');
            backdrop.style.setProperty('right', '0', 'important');
            backdrop.style.setProperty('bottom', '0', 'important');
            backdrop.style.setProperty('width', '100vw', 'important');
            backdrop.style.setProperty('height', '100vh', 'important');
            backdrop.style.setProperty('min-width', '100vw', 'important');
            backdrop.style.setProperty('min-height', '100vh', 'important');
            backdrop.style.setProperty('max-width', 'none', 'important');
            backdrop.style.setProperty('max-height', 'none', 'important');
            
            // 检查修改后的状态
            const after = backdrop.getBoundingClientRect();
            const computedAfter = window.getComputedStyle(backdrop);
            
            return {
                before,
                after: {
                    rect: {
                        width: after.width,
                        height: after.height,
                        left: after.left,
                        right: after.right,
                        top: after.top,
                        bottom: after.bottom
                    },
                    computed: {
                        width: computedAfter.width,
                        height: computedAfter.height,
                        left: computedAfter.left,
                        right: computedAfter.right,
                        top: computedAfter.top,
                        bottom: computedAfter.bottom,
                        position: computedAfter.position
                    }
                }
            };
        });
        
        console.log('手动修复结果:', JSON.stringify(manualFix, null, 2));
        
        // 最终截图
        await page.screenshot({ path: 'debug/deep-backdrop-diagnosis.png', fullPage: true });
        console.log('📸 截图已保存: debug/deep-backdrop-diagnosis.png');
        
        // 保存完整报告
        const report = {
            timestamp: new Date().toISOString(),
            deepAnalysis,
            manualFix
        };
        
        require('fs').writeFileSync(
            'debug/deep-backdrop-diagnosis-report.json',
            JSON.stringify(report, null, 2)
        );
        
        console.log('📊 深度诊断完成');
        
    } catch (error) {
        console.error('❌ 诊断出错:', error.message);
    } finally {
        await browser.close();
    }
}

deepBackdropDiagnosis().catch(console.error);