/**
 * 账户管理页面加载测试脚本
 */

const puppeteer = require('puppeteer');

async function testAccountsPage() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1920, height: 1080 }
    });
    
    const page = await browser.newPage();
    
    // 监听控制台日志
    page.on('console', msg => {
        console.log(`浏览器日志[${msg.type()}]:`, msg.text());
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
        console.error('页面错误:', error);
    });
    
    // 监听资源加载错误
    page.on('requestfailed', request => {
        console.error('资源加载失败:', request.url(), request.failure().errorText);
    });
    
    try {
        console.log('🚀 开始测试账户管理页面...');
        
        // 访问页面
        await page.goto('http://127.0.0.1:8091/accounts', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        console.log('✅ 页面加载完成');
        
        // 等待一段时间让JavaScript执行
        await page.waitForTimeout(3000);
        
        // 检查表格状态
        const paymentTableState = await page.evaluate(() => {
            const tbody = document.getElementById('paymentAccountsTableBody');
            if (!tbody) return { exists: false };
            
            return {
                exists: true,
                innerHTML: tbody.innerHTML,
                childrenCount: tbody.children.length,
                hasLoadingMessage: tbody.innerHTML.includes('正在加载'),
                hasNoDataMessage: tbody.innerHTML.includes('暂无'),
                hasActualData: tbody.children.length > 0 && !tbody.innerHTML.includes('正在加载') && !tbody.innerHTML.includes('暂无')
            };
        });
        
        const receivingTableState = await page.evaluate(() => {
            const tbody = document.getElementById('receivingAccountsTableBody');
            if (!tbody) return { exists: false };
            
            return {
                exists: true,
                innerHTML: tbody.innerHTML,
                childrenCount: tbody.children.length,
                hasLoadingMessage: tbody.innerHTML.includes('正在加载'),
                hasNoDataMessage: tbody.innerHTML.includes('暂无'),
                hasActualData: tbody.children.length > 0 && !tbody.innerHTML.includes('正在加载') && !tbody.innerHTML.includes('暂无')
            };
        });
        
        // 检查AccountsManager实例
        const managerState = await page.evaluate(() => {
            return {
                managerExists: typeof window.accountsManager !== 'undefined',
                paymentAccountsCount: window.accountsManager ? window.accountsManager.paymentAccounts.length : 0,
                receivingAccountsCount: window.accountsManager ? window.accountsManager.receivingAccounts.length : 0
            };
        });
        
        console.log('📊 测试结果:');
        console.log('付款账户表格状态:', paymentTableState);
        console.log('收款账户表格状态:', receivingTableState);
        console.log('管理器状态:', managerState);
        
        // 截图保存
        await page.screenshot({ 
            path: 'accounts-page-test.png',
            fullPage: true 
        });
        
        console.log('📸 页面截图已保存: accounts-page-test.png');
        
        // 等待用户查看
        console.log('等待10秒以便查看页面状态...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
    
    await browser.close();
}

// 检查是否有puppeteer
if (typeof require !== 'undefined') {
    try {
        require('puppeteer');
        testAccountsPage();
    } catch (e) {
        console.log('❌ 需要安装 puppeteer: npm install puppeteer');
        console.log('🔄 使用基础检查...\n');
        
        // 基础检查 - 验证文件存在性和基本结构
        const fs = require('fs');
        
        console.log('📁 检查关键文件:');
        const files = [
            'web/templates/account_management.html',
            'web/static/js/account-management-new.js'
        ];
        
        files.forEach(file => {
            const exists = fs.existsSync(file);
            console.log(`  ${exists ? '✅' : '❌'} ${file}`);
        });
        
        // 检查JS文件中的关键函数
        if (fs.existsSync('web/static/js/account-management-new.js')) {
            const jsContent = fs.readFileSync('web/static/js/account-management-new.js', 'utf8');
            
            console.log('\n🔧 检查关键函数:');
            const functions = [
                'loadPaymentAccounts',
                'loadReceivingAccounts', 
                'renderPaymentAccountsTable',
                'renderReceivingAccountsTable',
                'AccountsManager'
            ];
            
            functions.forEach(func => {
                const exists = jsContent.includes(func);
                console.log(`  ${exists ? '✅' : '❌'} ${func}`);
            });
        }
        
        // 检查HTML中的表格结构
        if (fs.existsSync('web/templates/account_management.html')) {
            const htmlContent = fs.readFileSync('web/templates/account_management.html', 'utf8');
            
            console.log('\n🏗️ 检查表格结构:');
            const elements = [
                'paymentAccountsTableBody',
                'receivingAccountsTableBody',
                'account-management-new.js'
            ];
            
            elements.forEach(elem => {
                const exists = htmlContent.includes(elem);
                console.log(`  ${exists ? '✅' : '❌'} ${elem}`);
            });
        }
    }
}