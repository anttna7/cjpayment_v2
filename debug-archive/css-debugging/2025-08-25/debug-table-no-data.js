/**
 * 调试表格视图没有数据的问题
 */

const puppeteer = require('puppeteer');

async function debugTableNoData() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 },
        devtools: true  // 打开开发者工具
    });
    
    const page = await browser.newPage();
    
    // 监听所有控制台消息
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[${type.toUpperCase()}] ${text}`);
    });
    
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    page.on('requestfailed', request => console.error(`❌ 请求失败: ${request.url()}`));
    
    try {
        console.log('🔍 开始调试表格数据显示问题...\n');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        // 等待页面完全初始化
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n=== 步骤1: 检查数据管理器 ===');
        const dataManagerCheck = await page.evaluate(() => {
            const manager = window.merchantDataManager;
            return {
                exists: !!manager,
                type: typeof manager,
                merchantCount: manager ? manager.merchants.length : 0,
                firstMerchant: manager ? manager.merchants[0] : null,
                methods: manager ? Object.getOwnPropertyNames(Object.getPrototypeOf(manager)) : []
            };
        });
        
        console.log('数据管理器状态:');
        console.log(`  存在: ${dataManagerCheck.exists}`);
        console.log(`  类型: ${dataManagerCheck.type}`);
        console.log(`  商户数量: ${dataManagerCheck.merchantCount}`);
        console.log(`  可用方法: ${dataManagerCheck.methods.join(', ')}`);
        if (dataManagerCheck.firstMerchant) {
            console.log(`  第一个商户: ${dataManagerCheck.firstMerchant.id} - ${dataManagerCheck.firstMerchant.name}`);
        }
        
        console.log('\n=== 步骤2: 检查增强渲染器 ===');
        const rendererCheck = await page.evaluate(() => {
            const tableRenderer = window.enhancedMerchantTableRenderer;
            const cardRenderer = window.enhancedMerchantCardRenderer;
            
            return {
                tableRenderer: {
                    exists: !!tableRenderer,
                    type: typeof tableRenderer,
                    container: tableRenderer ? !!tableRenderer.container : false,
                    dataManager: tableRenderer ? !!tableRenderer.dataManager : false,
                    methods: tableRenderer ? Object.getOwnPropertyNames(Object.getPrototypeOf(tableRenderer)) : []
                },
                cardRenderer: {
                    exists: !!cardRenderer,
                    type: typeof cardRenderer,
                    container: cardRenderer ? !!cardRenderer.container : false
                }
            };
        });
        
        console.log('表格渲染器状态:');
        console.log(`  存在: ${rendererCheck.tableRenderer.exists}`);
        console.log(`  容器: ${rendererCheck.tableRenderer.container}`);
        console.log(`  数据管理器: ${rendererCheck.tableRenderer.dataManager}`);
        console.log(`  方法: ${rendererCheck.tableRenderer.methods.join(', ')}`);
        
        console.log('\n=== 步骤3: 检查表格容器 ===');
        const containerCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const cardContainer = document.getElementById('merchantGrid');
            
            return {
                tableContainer: {
                    exists: !!tableContainer,
                    display: tableContainer ? tableContainer.style.display : null,
                    innerHTML: tableContainer ? tableContainer.innerHTML.length : 0,
                    children: tableContainer ? tableContainer.children.length : 0
                },
                cardContainer: {
                    exists: !!cardContainer,
                    display: cardContainer ? cardContainer.style.display : null,
                    children: cardContainer ? cardContainer.children.length : 0
                }
            };
        });
        
        console.log('容器状态:');
        console.log(`  表格容器存在: ${containerCheck.tableContainer.exists}`);
        console.log(`  表格容器显示: ${containerCheck.tableContainer.display || 'default'}`);
        console.log(`  表格容器内容长度: ${containerCheck.tableContainer.innerHTML}`);
        console.log(`  表格容器子元素: ${containerCheck.tableContainer.children}`);
        
        console.log('\n=== 步骤4: 点击表格视图按钮 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n=== 步骤5: 检查切换后的状态 ===');
        const afterSwitchCheck = await page.evaluate(() => {
            const tableContainer = document.getElementById('merchantTableContainer');
            const table = document.querySelector('.merchant-table');
            const tbody = document.querySelector('#merchantTableBody');
            const rows = document.querySelectorAll('.merchant-row');
            
            return {
                tableContainer: {
                    display: tableContainer ? tableContainer.style.display : null,
                    innerHTML: tableContainer ? tableContainer.innerHTML.substring(0, 300) + '...' : null
                },
                table: {
                    exists: !!table,
                    innerHTML: table ? table.innerHTML.substring(0, 300) + '...' : null
                },
                tbody: {
                    exists: !!tbody,
                    innerHTML: tbody ? tbody.innerHTML.substring(0, 300) + '...' : null,
                    children: tbody ? tbody.children.length : 0
                },
                rows: {
                    count: rows.length
                }
            };
        });
        
        console.log('切换后状态:');
        console.log(`  表格容器显示: ${afterSwitchCheck.tableContainer.display || 'default'}`);
        console.log(`  表格存在: ${afterSwitchCheck.table.exists}`);
        console.log(`  tbody存在: ${afterSwitchCheck.tbody.exists}`);
        console.log(`  tbody子元素数: ${afterSwitchCheck.tbody.children}`);
        console.log(`  数据行数: ${afterSwitchCheck.rows.count}`);
        
        if (afterSwitchCheck.tbody.innerHTML) {
            console.log(`  tbody内容: ${afterSwitchCheck.tbody.innerHTML}`);
        }
        
        console.log('\n=== 步骤6: 手动调用渲染器 ===');
        const manualRenderResult = await page.evaluate(() => {
            try {
                const renderer = window.enhancedMerchantTableRenderer;
                if (renderer && renderer.render) {
                    renderer.render();
                    return { success: true, message: '渲染器调用成功' };
                } else {
                    return { success: false, message: '渲染器不存在或无render方法' };
                }
            } catch (error) {
                return { success: false, message: `渲染器调用失败: ${error.message}` };
            }
        });
        
        console.log(`手动渲染结果: ${manualRenderResult.message}`);
        
        // 等待渲染完成
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n=== 步骤7: 检查手动渲染后的结果 ===');
        const finalCheck = await page.evaluate(() => {
            const tbody = document.querySelector('#merchantTableBody');
            const rows = document.querySelectorAll('.merchant-row');
            const accounts = document.querySelectorAll('.account-count-badge');
            
            return {
                tbodyContent: tbody ? tbody.innerHTML.substring(0, 500) + '...' : '无内容',
                rowCount: rows.length,
                accountBadgeCount: accounts.length,
                firstRowHTML: rows[0] ? rows[0].outerHTML.substring(0, 300) + '...' : '无行数据'
            };
        });
        
        console.log('最终检查结果:');
        console.log(`  数据行数: ${finalCheck.rowCount}`);
        console.log(`  账户徽章数: ${finalCheck.accountBadgeCount}`);
        console.log(`  tbody内容: ${finalCheck.tbodyContent}`);
        if (finalCheck.rowCount > 0) {
            console.log(`  第一行HTML: ${finalCheck.firstRowHTML}`);
        }
        
        await page.screenshot({ path: 'debug-table-no-data.png', fullPage: true });
        console.log('\n📸 调试截图已保存: debug-table-no-data.png');
        
        // 保持浏览器打开便于调试
        console.log('\n🔧 浏览器将保持打开状态，请手动检查页面...');
        console.log('按任意键继续关闭浏览器...');
        
        // 等待用户输入
        await new Promise(resolve => {
            process.stdin.once('data', () => resolve());
        });
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    } finally {
        await browser.close();
    }
}

debugTableNoData().catch(console.error);