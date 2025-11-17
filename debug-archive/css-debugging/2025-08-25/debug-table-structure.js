/**
 * 深度调试表格结构问题
 */

const puppeteer = require('puppeteer');

async function debugTableStructure() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 },
        devtools: true
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[浏览器] ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🔍 深度调试表格结构问题...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('=== 分析表格DOM结构 ===');
        const domStructure = await page.evaluate(() => {
            const container = document.getElementById('merchantTableContainer');
            if (!container) return { error: '容器不存在' };
            
            function analyzeElement(element, depth = 0) {
                const indent = '  '.repeat(depth);
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                let info = `${indent}${element.tagName}`;
                if (element.id) info += `#${element.id}`;
                if (element.className) info += `.${element.className.split(' ').join('.')}`;
                info += ` [${rect.width}x${rect.height}]`;
                info += ` display:${styles.display}`;
                info += ` position:${styles.position}`;
                if (styles.display === 'none') info += ' ❌隐藏';
                if (rect.width === 0 || rect.height === 0) info += ' ❌无尺寸';
                
                const result = [info];
                
                // 递归分析子元素（只分析前几层）
                if (depth < 4 && element.children.length > 0) {
                    for (let child of element.children) {
                        result.push(...analyzeElement(child, depth + 1));
                    }
                }
                
                return result;
            }
            
            return {
                structure: analyzeElement(container),
                containerHTML: container.innerHTML.substring(0, 500) + '...',
                tableHTML: (() => {
                    const table = container.querySelector('.merchant-table');
                    return table ? table.outerHTML.substring(0, 800) + '...' : '表格不存在';
                })()
            };
        });
        
        console.log('DOM结构分析:');
        domStructure.structure.forEach(line => console.log(line));
        
        console.log('\n=== 分析CSS计算值 ===');
        const cssAnalysis = await page.evaluate(() => {
            const table = document.querySelector('.merchant-table');
            if (!table) return { error: '表格不存在' };
            
            const styles = window.getComputedStyle(table);
            const rect = table.getBoundingClientRect();
            
            // 检查所有可能影响尺寸的CSS属性
            return {
                dimensions: {
                    width: styles.width,
                    height: styles.height,
                    minWidth: styles.minWidth,
                    minHeight: styles.minHeight,
                    maxWidth: styles.maxWidth,
                    maxHeight: styles.maxHeight
                },
                display: {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity
                },
                position: {
                    position: styles.position,
                    top: styles.top,
                    left: styles.left,
                    zIndex: styles.zIndex
                },
                box: {
                    boxSizing: styles.boxSizing,
                    padding: styles.padding,
                    margin: styles.margin,
                    border: styles.border
                },
                table: {
                    tableLayout: styles.tableLayout,
                    borderCollapse: styles.borderCollapse,
                    borderSpacing: styles.borderSpacing
                },
                overflow: {
                    overflow: styles.overflow,
                    overflowX: styles.overflowX,
                    overflowY: styles.overflowY
                },
                actualRect: {
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                }
            };
        });
        
        console.log('CSS计算值分析:');
        Object.entries(cssAnalysis).forEach(([category, values]) => {
            console.log(`  ${category}:`);
            Object.entries(values).forEach(([prop, value]) => {
                console.log(`    ${prop}: ${value}`);
            });
        });
        
        console.log('\n=== 检查表格内容 ===');
        const contentAnalysis = await page.evaluate(() => {
            const tbody = document.querySelector('#merchantTableBody');
            const rows = document.querySelectorAll('.merchant-row');
            const firstRow = rows[0];
            
            if (!tbody) return { error: 'tbody不存在' };
            if (rows.length === 0) return { error: '无数据行' };
            
            const tbodyRect = tbody.getBoundingClientRect();
            const firstRowRect = firstRow ? firstRow.getBoundingClientRect() : null;
            
            return {
                tbody: {
                    exists: true,
                    rect: `${tbodyRect.width}x${tbodyRect.height}`,
                    display: window.getComputedStyle(tbody).display,
                    childCount: tbody.children.length
                },
                rows: {
                    count: rows.length,
                    firstRowRect: firstRowRect ? `${firstRowRect.width}x${firstRowRect.height}` : '0x0',
                    firstRowDisplay: firstRow ? window.getComputedStyle(firstRow).display : 'none'
                },
                cells: {
                    firstRowCellCount: firstRow ? firstRow.children.length : 0,
                    firstCellContent: firstRow && firstRow.children[0] ? 
                        firstRow.children[0].textContent.substring(0, 50) : '无内容'
                }
            };
        });
        
        console.log('表格内容分析:');
        Object.entries(contentAnalysis).forEach(([category, values]) => {
            console.log(`  ${category}:`);
            if (typeof values === 'object') {
                Object.entries(values).forEach(([prop, value]) => {
                    console.log(`    ${prop}: ${value}`);
                });
            } else {
                console.log(`    ${values}`);
            }
        });
        
        await page.screenshot({ path: 'debug-table-structure.png', fullPage: true });
        
        console.log('\n📸 调试截图已保存');
        console.log('\n🔧 浏览器保持开启用于手动检查');
        console.log('请在开发者工具中检查表格元素');
        console.log('按回车键继续...');
        
        // 等待用户输入
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', () => {
            browser.close();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
        await browser.close();
    }
}

debugTableStructure().catch(console.error);