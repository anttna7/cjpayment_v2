/**
 * 调试商户管理页面问题
 */

const puppeteer = require('puppeteer');

async function debugMerchantModal() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        await page.waitForSelector('#merchantTableContainer', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('1. 检查表格结构...');
        
        // 检查表格元素
        const tableWrapper = await page.$('.table-wrapper');
        const enhancedTable = await page.$('.enhanced-table');
        const tableHeader = await page.$('.table-header');
        
        console.log('表格包装器存在:', !!tableWrapper);
        console.log('增强表格存在:', !!enhancedTable);
        console.log('表格头部存在:', !!tableHeader);
        
        if (tableHeader) {
            const headers = await page.$$eval('.table-header th', 
                ths => ths.map(th => th.textContent.trim())
            );
            console.log('表格头部列:', headers);
        }
        
        console.log('2. 测试模态框...');
        
        // 打开模态框
        await page.click('#addMerchant');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查JavaScript错误
        page.on('console', msg => console.log('页面日志:', msg.text()));
        page.on('pageerror', err => console.log('页面错误:', err.message));
        
        // 测试账户ID输入
        await page.type('#accountId', 'TEST123');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 测试链接类型切换
        await page.click('#linkTypeMerchant');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const rechargeUrl = await page.$eval('#rechargeUrl', el => el.value).catch(() => '');
        console.log('专用链接值:', rechargeUrl);
        
        // 测试代理商功能
        await page.type('#agentId', 'AGENT001');
        await page.click('#accountId'); // 触发blur
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const agentName = await page.$eval('#agentName', el => el.value).catch(() => '');
        console.log('代理商名称值:', agentName);
        
        // 测试自定义返点
        await page.select('#rebatePolicy', 'custom');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const customVisible = await page.$eval('#customRebateGroup', 
            el => getComputedStyle(el).display
        ).catch(() => 'none');
        
        console.log('自定义返点显示状态:', customVisible);
        
        // 保持浏览器打开用于手动检查
        console.log('浏览器保持打开状态，可手动检查...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        await browser.close();
    }
}

debugMerchantModal();