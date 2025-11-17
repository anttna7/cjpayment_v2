const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testAdvancedDataTable() {
    const browser = await puppeteer.launch({ 
        headless: false, // 显示浏览器窗口以便观察
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--start-maximized']
    });
    
    try {
        const page = await browser.newPage();
        
        console.log('📍 正在访问数据报表页面...');
        await page.goto('http://127.0.0.1:8091/reports', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        console.log('✅ 页面加载完成');
        
        // 等待表格元素加载
        await page.waitForSelector('#advancedDataTable', { timeout: 10000 });
        console.log('✅ 高级数据表元素已加载');
        
        // 截图1: 页面整体布局
        await page.screenshot({ 
            path: 'debug/table-test-01-layout.png',
            fullPage: true
        });
        console.log('📸 截图1: 页面整体布局已保存');
        
        // 读取并执行测试脚本
        const testScript = await fs.readFile('debug/table-verification-test.js', 'utf8');
        
        // 执行测试脚本并获取结果
        const result = await page.evaluate(`
            ${testScript}
            // 等待一下让脚本执行完成
            new Promise(resolve => {
                setTimeout(() => {
                    resolve(verifyAdvancedDataTable());
                }, 2000);
            });
        `);
        
        console.log('📊 测试脚本执行结果:', result);
        
        // 截图2: 表头结构
        await page.evaluate(() => {
            const table = document.querySelector('#advancedDataTable');
            if (table) {
                table.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        
        await page.waitForTimeout(1000);
        await page.screenshot({
            path: 'debug/table-test-02-headers.png',
            clip: { x: 0, y: 200, width: 1920, height: 400 }
        });
        console.log('📸 截图2: 表头结构已保存');
        
        // 截图3: 表格数据内容
        await page.screenshot({
            path: 'debug/table-test-03-content.png',
            clip: { x: 0, y: 400, width: 1920, height: 600 }
        });
        console.log('📸 截图3: 表格内容已保存');
        
        // 获取控制台日志
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });
        
        // 再次执行测试以捕获控制台日志
        await page.evaluate(() => {
            if (window.verifyAdvancedDataTable) {
                return window.verifyAdvancedDataTable();
            }
        });
        
        // 截图4: 浏览器控制台
        await page.keyboard.press('F12'); // 打开开发者工具
        await page.waitForTimeout(2000);
        
        await page.screenshot({
            path: 'debug/table-test-04-console.png',
            fullPage: true
        });
        console.log('📸 截图4: 浏览器控制台已保存');
        
        // 保存测试报告
        const report = {
            timestamp: new Date().toISOString(),
            url: 'http://127.0.0.1:8091/reports',
            testResult: result,
            consoleLogs: consoleLogs,
            screenshots: [
                'table-test-01-layout.png',
                'table-test-02-headers.png', 
                'table-test-03-content.png',
                'table-test-04-console.png'
            ]
        };
        
        await fs.writeFile(
            'debug/table-test-report.json',
            JSON.stringify(report, null, 2),
            'utf8'
        );
        
        console.log('📝 测试报告已保存到 debug/table-test-report.json');
        console.log('🎯 测试完成！请检查以下文件:');
        console.log('  - table-test-01-layout.png (页面布局)');
        console.log('  - table-test-02-headers.png (表头结构)');
        console.log('  - table-test-03-content.png (表格内容)');
        console.log('  - table-test-04-console.png (控制台日志)');
        console.log('  - table-test-report.json (完整报告)');
        
        return report;
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// 执行测试
testAdvancedDataTable()
    .then(report => {
        console.log('✅ 自动化测试完成');
        console.log('📊 最终结果:', report.testResult?.status || '未知');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    });