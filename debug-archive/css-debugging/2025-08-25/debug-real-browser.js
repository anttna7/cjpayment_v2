/**
 * 实时浏览器调试 - 保持浏览器开启进行手动调试
 */

const puppeteer = require('puppeteer');

async function debugRealBrowser() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 },
        devtools: true,  // 打开开发者工具
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台消息
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[浏览器-${type.toUpperCase()}] ${text}`);
    });
    
    page.on('pageerror', error => {
        console.error(`❌ 页面错误: ${error.message}`);
        console.error(`   文件: ${error.stack}`);
    });
    
    try {
        console.log('🔍 开始实时调试...');
        console.log('📱 浏览器将保持打开状态，请手动检查页面');
        
        await page.goto('http://localhost:8092/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 20000 
        });
        
        // 等待页面完全加载
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n=== 实时状态检查 ===');
        
        // 执行一系列调试命令
        const debugInfo = await page.evaluate(() => {
            // 检查各种状态
            const results = {
                timestamp: new Date().toISOString(),
                dataManager: {
                    exists: !!window.merchantDataManager,
                    merchantCount: window.merchantDataManager ? window.merchantDataManager.merchants.length : 0
                },
                enhancedRenderers: {
                    tableRenderer: !!window.enhancedMerchantTableRenderer,
                    cardRenderer: !!window.enhancedMerchantCardRenderer
                },
                containers: {
                    tableContainer: {
                        exists: !!document.getElementById('merchantTableContainer'),
                        display: document.getElementById('merchantTableContainer')?.style.display || 'default',
                        innerHTML: document.getElementById('merchantTableContainer')?.innerHTML.length || 0
                    },
                    cardContainer: {
                        exists: !!document.getElementById('merchantGrid'),
                        display: document.getElementById('merchantGrid')?.style.display || 'default'
                    }
                },
                tableElements: {
                    table: !!document.querySelector('.merchant-table'),
                    tbody: !!document.querySelector('#merchantTableBody'),
                    rows: document.querySelectorAll('.merchant-row').length,
                    accountBadges: document.querySelectorAll('.account-count-badge').length
                },
                buttons: {
                    tableBtn: {
                        exists: !!document.getElementById('tableViewBtn'),
                        active: document.getElementById('tableViewBtn')?.classList.contains('active') || false
                    },
                    cardBtn: {
                        exists: !!document.getElementById('gridViewBtn'),
                        active: document.getElementById('gridViewBtn')?.classList.contains('active') || false
                    }
                }
            };
            
            // 尝试手动调用渲染器
            try {
                if (window.enhancedMerchantTableRenderer && window.enhancedMerchantTableRenderer.render) {
                    console.log('🔧 手动调用表格渲染器...');
                    window.enhancedMerchantTableRenderer.render();
                    results.manualRender = '成功调用表格渲染器';
                } else {
                    results.manualRender = '表格渲染器不可用';
                }
            } catch (error) {
                results.manualRender = `渲染器调用失败: ${error.message}`;
            }
            
            return results;
        });
        
        console.log('调试信息:');
        console.log('数据管理器:', debugInfo.dataManager);
        console.log('增强渲染器:', debugInfo.enhancedRenderers);
        console.log('容器状态:', debugInfo.containers);
        console.log('表格元素:', debugInfo.tableElements);
        console.log('按钮状态:', debugInfo.buttons);
        console.log('手动渲染结果:', debugInfo.manualRender);
        
        // 等待渲染完成后再次检查
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const afterManualRender = await page.evaluate(() => {
            return {
                rows: document.querySelectorAll('.merchant-row').length,
                accountBadges: document.querySelectorAll('.account-count-badge').length,
                tbodyHTML: document.querySelector('#merchantTableBody')?.innerHTML.substring(0, 200) + '...'
            };
        });
        
        console.log('\n手动渲染后状态:');
        console.log(`  数据行数: ${afterManualRender.rows}`);
        console.log(`  账户徽章: ${afterManualRender.accountBadges}`);
        console.log(`  tbody内容: ${afterManualRender.tbodyHTML}`);
        
        // 尝试点击表格视图按钮
        console.log('\n=== 点击表格视图按钮 ===');
        await page.click('#tableViewBtn');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const afterClick = await page.evaluate(() => {
            return {
                tableDisplay: document.getElementById('merchantTableContainer')?.style.display,
                rows: document.querySelectorAll('.merchant-row').length,
                accountBadges: document.querySelectorAll('.account-count-badge').length
            };
        });
        
        console.log('点击后状态:');
        console.log(`  表格显示: ${afterClick.tableDisplay}`);
        console.log(`  数据行数: ${afterClick.rows}`);
        console.log(`  账户徽章: ${afterClick.accountBadges}`);
        
        await page.screenshot({ path: 'debug-real-browser.png', fullPage: true });
        
        console.log('\n🎯 调试完成');
        console.log('📸 截图保存: debug-real-browser.png');
        console.log('\n⚠️  浏览器将保持开启，请手动检查：');
        console.log('   1. 打开开发者工具 (F12)');
        console.log('   2. 在控制台执行: window.enhancedMerchantTableRenderer.render()');
        console.log('   3. 检查表格容器: document.getElementById("merchantTableContainer")');
        console.log('   4. 检查数据: window.merchantDataManager.merchants');
        
        console.log('\n按 Enter 键关闭浏览器...');
        
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

debugRealBrowser().catch(console.error);