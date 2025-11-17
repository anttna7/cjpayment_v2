/**
 * 检查CSS样式导致数据不可见的问题
 */

const puppeteer = require('puppeteer');

async function debugCSSVisibility() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔍 检查CSS样式问题...');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查表格容器和元素的CSS样式
        const cssCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const tbody = document.querySelector('#merchantTableBody');
            const firstRow = document.querySelector('.merchant-row');
            
            function getElementStyles(element, name) {
                if (!element) return { name, exists: false };
                
                const computed = window.getComputedStyle(element);
                return {
                    name,
                    exists: true,
                    display: computed.display,
                    visibility: computed.visibility,
                    opacity: computed.opacity,
                    height: computed.height,
                    width: computed.width,
                    position: computed.position,
                    zIndex: computed.zIndex,
                    overflow: computed.overflow,
                    transform: computed.transform,
                    backgroundColor: computed.backgroundColor,
                    color: computed.color,
                    fontSize: computed.fontSize,
                    // 获取元素的实际位置和大小
                    boundingRect: element.getBoundingClientRect()
                };
            }
            
            return {
                tableContainer: getElementStyles(tableContainer, 'merchantTableContainer'),
                table: getElementStyles(table, 'merchant-table'),
                tbody: getElementStyles(tbody, 'merchantTableBody'),
                firstRow: getElementStyles(firstRow, 'first-merchant-row'),
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollTop: window.scrollY,
                    scrollLeft: window.scrollX
                }
            };
        });
        
        console.log('\n=== CSS样式检查结果 ===');
        
        function logElementStyle(styleInfo) {
            if (!styleInfo.exists) {
                console.log(`❌ ${styleInfo.name}: 元素不存在`);
                return;
            }
            
            console.log(`\n📦 ${styleInfo.name}:`);
            console.log(`  存在: ${styleInfo.exists}`);
            console.log(`  display: ${styleInfo.display}`);
            console.log(`  visibility: ${styleInfo.visibility}`);
            console.log(`  opacity: ${styleInfo.opacity}`);
            console.log(`  尺寸: ${styleInfo.width} x ${styleInfo.height}`);
            console.log(`  位置: (${styleInfo.boundingRect.left}, ${styleInfo.boundingRect.top})`);
            console.log(`  在视口内: ${styleInfo.boundingRect.top >= 0 && styleInfo.boundingRect.left >= 0}`);
            console.log(`  背景色: ${styleInfo.backgroundColor}`);
            console.log(`  文字色: ${styleInfo.color}`);
            console.log(`  字体大小: ${styleInfo.fontSize}`);
            
            // 检查是否可能被隐藏
            const hidden = styleInfo.display === 'none' || 
                          styleInfo.visibility === 'hidden' || 
                          styleInfo.opacity === '0' ||
                          styleInfo.boundingRect.height === 0 ||
                          styleInfo.boundingRect.width === 0;
            
            if (hidden) {
                console.log(`  ⚠️  可能被隐藏的原因:`);
                if (styleInfo.display === 'none') console.log(`     - display: none`);
                if (styleInfo.visibility === 'hidden') console.log(`     - visibility: hidden`);
                if (styleInfo.opacity === '0') console.log(`     - opacity: 0`);
                if (styleInfo.boundingRect.height === 0) console.log(`     - 高度为0`);
                if (styleInfo.boundingRect.width === 0) console.log(`     - 宽度为0`);
            } else {
                console.log(`  ✅ 元素应该可见`);
            }
        }
        
        logElementStyle(cssCheck.tableContainer);
        logElementStyle(cssCheck.table);
        logElementStyle(cssCheck.tbody);
        logElementStyle(cssCheck.firstRow);
        
        console.log(`\n🖼️  视口信息:`);
        console.log(`  尺寸: ${cssCheck.viewport.width} x ${cssCheck.viewport.height}`);
        console.log(`  滚动位置: (${cssCheck.viewport.scrollLeft}, ${cssCheck.viewport.scrollTop})`);
        
        // 检查是否有遮挡元素
        const overlayCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            if (!tableContainer) return { hasOverlay: false };
            
            const rect = tableContainer.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const elementAtCenter = document.elementFromPoint(centerX, centerY);
            const isTableVisible = elementAtCenter && (
                elementAtCenter === tableContainer || 
                tableContainer.contains(elementAtCenter)
            );
            
            return {
                hasOverlay: !isTableVisible,
                elementAtCenter: elementAtCenter ? {
                    tagName: elementAtCenter.tagName,
                    className: elementAtCenter.className,
                    id: elementAtCenter.id
                } : null,
                checkPoint: { x: centerX, y: centerY }
            };
        });
        
        console.log('\n🎯 遮挡检查:');
        console.log(`  检查点坐标: (${overlayCheck.checkPoint.x}, ${overlayCheck.checkPoint.y})`);
        console.log(`  有遮挡: ${overlayCheck.hasOverlay}`);
        if (overlayCheck.elementAtCenter) {
            console.log(`  表格中心处的元素: ${overlayCheck.elementAtCenter.tagName}.${overlayCheck.elementAtCenter.className}#${overlayCheck.elementAtCenter.id}`);
        }
        
        // 尝试强制显示表格
        console.log('\n🔧 尝试强制显示表格...');
        await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            if (tableContainer) {
                // 强制设置显示样式
                tableContainer.style.display = 'block';
                tableContainer.style.visibility = 'visible';
                tableContainer.style.opacity = '1';
                tableContainer.style.zIndex = '1000';
                tableContainer.style.position = 'relative';
                tableContainer.style.backgroundColor = '#ffffff';
                
                // 确保表格也可见
                const table = tableContainer.querySelector('.merchant-table');
                if (table) {
                    table.style.display = 'table';
                    table.style.visibility = 'visible';
                    table.style.opacity = '1';
                }
                
                console.log('🔧 已强制设置表格可见样式');
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.screenshot({ path: 'debug-css-visibility.png', fullPage: true });
        
        // 再次检查
        const afterForceShow = await page.evaluate(() => {
            const rows = document.querySelectorAll('.merchant-row');
            const table = document.querySelector('.merchant-table');
            const tableRect = table ? table.getBoundingClientRect() : null;
            
            return {
                rowCount: rows.length,
                tableVisible: tableRect && tableRect.height > 0 && tableRect.width > 0,
                tableRect: tableRect
            };
        });
        
        console.log('\n强制显示后:');
        console.log(`  数据行数: ${afterForceShow.rowCount}`);
        console.log(`  表格可见: ${afterForceShow.tableVisible}`);
        console.log(`  表格尺寸: ${afterForceShow.tableRect?.width} x ${afterForceShow.tableRect?.height}`);
        
        console.log('\n📸 截图已保存: debug-css-visibility.png');
        
    } catch (error) {
        console.error('检查过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

debugCSSVisibility().catch(console.error);