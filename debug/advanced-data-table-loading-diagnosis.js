const { chromium } = require('playwright');

async function diagnoseAdvancedDataTableLoading() {
    console.log('🔍 开始诊断AdvancedDataTable类加载问题...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 监听所有控制台消息
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `[${msg.type()}] ${msg.text()}`;
        console.log(message);
        consoleMessages.push(message);
    });
    
    // 监听网络请求
    const networkRequests = [];
    page.on('request', request => {
        if (request.url().includes('.js')) {
            console.log(`📡 请求JS文件: ${request.url()}`);
            networkRequests.push({
                url: request.url(),
                type: 'request'
            });
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('.js')) {
            console.log(`📡 JS文件响应: ${response.url()} - ${response.status()}`);
            networkRequests.push({
                url: response.url(),
                status: response.status(),
                type: 'response'
            });
        }
    });
    
    // 监听JavaScript错误
    const jsErrors = [];
    page.on('pageerror', error => {
        console.error(`❌ JavaScript错误: ${error.message}`);
        jsErrors.push({
            message: error.message,
            stack: error.stack
        });
    });
    
    try {
        console.log('🌐 导航到报表页面...');
        await page.goto('http://localhost:8091/reports', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        console.log('🔎 开始检查JavaScript环境...');
        
        // 检查脚本标签
        const scriptTags = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            return scripts.map(script => ({
                src: script.src,
                loaded: script.readyState || 'unknown'
            }));
        });
        
        console.log('📜 页面中的脚本标签:', scriptTags);
        
        // 检查AdvancedDataTable类
        const advancedDataTableCheck = await page.evaluate(() => {
            return {
                classExists: typeof AdvancedDataTable !== 'undefined',
                classType: typeof AdvancedDataTable,
                globalAdvancedDataTable: typeof window.advancedDataTable !== 'undefined',
                globalAdvancedDataTableType: typeof window.advancedDataTable,
                orderInfoTableExists: typeof window.orderInfoTable !== 'undefined',
                allGlobalVars: Object.keys(window).filter(key => 
                    key.toLowerCase().includes('advanced') || 
                    key.toLowerCase().includes('table') ||
                    key.toLowerCase().includes('order')
                )
            };
        });
        
        console.log('🔍 AdvancedDataTable类检查结果:', advancedDataTableCheck);
        
        // 尝试手动执行初始化代码
        console.log('🚀 尝试手动执行AdvancedDataTable初始化...');
        const manualInitResult = await page.evaluate(() => {
            try {
                console.log('手动检查：AdvancedDataTable类是否存在:', typeof AdvancedDataTable !== 'undefined');
                
                if (typeof AdvancedDataTable !== 'undefined') {
                    console.log('手动：开始创建AdvancedDataTable实例...');
                    window.advancedDataTable = new AdvancedDataTable({
                        containerId: 'advancedDataTableContainer',
                        apiEndpoint: '/api/transactions',
                        pageSize: 50,
                        defaultView: 'table',
                        enableSearch: true,
                        enableFilters: true,
                        enableSorting: true,
                        autoRefresh: false
                    });
                    console.log('手动：高级数据表初始化成功');
                    return { success: true, message: '手动初始化成功' };
                } else {
                    return { success: false, message: 'AdvancedDataTable类不存在' };
                }
            } catch (error) {
                return { success: false, message: `手动初始化失败: ${error.message}`, error: error.stack };
            }
        });
        
        console.log('🔧 手动初始化结果:', manualInitResult);
        
        // 再次检查列设置按钮
        const columnSettingsCheck = await page.evaluate(() => {
            const btn = document.getElementById('columnSettingsBtn');
            const modal = document.getElementById('columnSettingsModal');
            
            return {
                button: btn ? {
                    exists: true,
                    text: btn.textContent.trim(),
                    onclick: btn.onclick ? 'has onclick' : 'no onclick',
                    listeners: btn._listeners || 'no _listeners property',
                    clickable: btn.style.pointerEvents !== 'none'
                } : null,
                modal: modal ? {
                    exists: true,
                    display: window.getComputedStyle(modal).display,
                    visibility: window.getComputedStyle(modal).visibility
                } : null,
                advancedDataTableInstance: window.advancedDataTable ? {
                    exists: true,
                    hasShowColumnSettings: typeof window.advancedDataTable.showColumnSettings === 'function'
                } : null
            };
        });
        
        console.log('⚙️ 列设置功能检查:', columnSettingsCheck);
        
        // 如果手动初始化成功，测试列设置功能
        if (manualInitResult.success && columnSettingsCheck.advancedDataTableInstance) {
            console.log('🎯 测试列设置功能...');
            
            const testResult = await page.evaluate(() => {
                try {
                    const btn = document.getElementById('columnSettingsBtn');
                    if (btn) {
                        btn.click();
                        
                        // 等待一小段时间
                        setTimeout(() => {
                            const modal = document.getElementById('columnSettingsModal');
                            return {
                                clicked: true,
                                modalVisible: modal ? window.getComputedStyle(modal).display !== 'none' : false
                            };
                        }, 100);
                        
                        return { clicked: true };
                    }
                    return { clicked: false, reason: '按钮不存在' };
                } catch (error) {
                    return { clicked: false, error: error.message };
                }
            });
            
            console.log('🔬 列设置测试结果:', testResult);
        }
        
        // 截图
        await page.screenshot({ path: 'debug/advanced-data-table-loading-diagnosis.png', fullPage: true });
        
        // 生成报告
        const report = {
            timestamp: new Date().toISOString(),
            networkRequests: networkRequests,
            jsErrors: jsErrors,
            consoleMessages: consoleMessages,
            scriptTags: scriptTags,
            advancedDataTableCheck: advancedDataTableCheck,
            manualInitResult: manualInitResult,
            columnSettingsCheck: columnSettingsCheck
        };
        
        require('fs').writeFileSync(
            'debug/advanced-data-table-loading-diagnosis-report.json', 
            JSON.stringify(report, null, 2)
        );
        
        console.log('📊 诊断完成，报告已保存');
        
    } catch (error) {
        console.error('❌ 诊断过程中出错:', error.message);
    } finally {
        await browser.close();
    }
}

diagnoseAdvancedDataTableLoading().catch(console.error);