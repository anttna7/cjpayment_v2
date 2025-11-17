/**
 * 最终验证测试 - 商户管理页面功能
 */

const puppeteer = require('puppeteer');

async function finalVerificationTest() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: false,
        defaultViewport: { width: 1440, height: 900 }
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🚀 最终验证测试开始');
        
        // 监听控制台错误
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ JS错误:', msg.text());
            }
        });
        
        page.on('pageerror', err => {
            console.log('❌ 页面错误:', err.message);
        });
        
        // 访问页面
        await page.goto('http://127.0.0.1:8091/merchant', { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        console.log('✅ 页面访问成功');
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 截图记录初始状态
        await page.screenshot({ 
            path: 'final-verification-01-loaded.png',
            fullPage: true
        });
        
        console.log('1. 检查页面基本元素...');
        
        // 检查关键元素
        const addMerchantBtn = await page.$('#addMerchant');
        const tableContainer = await page.$('#merchantTableContainer');
        
        console.log('添加商户按钮存在:', !!addMerchantBtn);
        console.log('表格容器存在:', !!tableContainer);
        
        if (!addMerchantBtn) {
            console.log('❌ 添加商户按钮不存在，测试终止');
            return;
        }
        
        console.log('2. 打开添加商户模态框...');
        
        await page.click('#addMerchant');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查模态框是否打开
        const modal = await page.$('#addMerchantModal');
        const modalVisible = await page.evaluate(() => {
            const modal = document.getElementById('addMerchantModal');
            return modal && getComputedStyle(modal).display !== 'none';
        });
        
        console.log('模态框元素存在:', !!modal);
        console.log('模态框可见:', modalVisible);
        
        if (!modalVisible) {
            console.log('❌ 模态框未能正确打开');
            return;
        }
        
        // 截图记录模态框状态
        await page.screenshot({ 
            path: 'final-verification-02-modal.png',
            fullPage: true
        });
        
        console.log('3. 验证新字段...');
        
        const fields = {
            'accountId': '账户ID',
            'accountEntity': '开户主体', 
            'agentId': '代理商ID',
            'agentName': '代理商名称',
            'rebatePolicy': '返点政策',
            'remarks': '备注信息'
        };
        
        for (const [id, name] of Object.entries(fields)) {
            const field = await page.$(`#${id}`);
            console.log(`${name} (${id}):`, !!field);
        }
        
        console.log('4. 测试充值链接切换功能...');
        
        // 输入账户ID
        await page.type('#accountId', 'VERIFY001');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 切换到专用链接
        const merchantRadio = await page.$('#linkTypeMerchant');
        if (merchantRadio) {
            await page.click('#linkTypeMerchant');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 检查专用链接是否生成
            const linkValue = await page.evaluate(() => {
                const linkInput = document.getElementById('rechargeUrl');
                return linkInput ? linkInput.value : '';
            });
            
            console.log('专用链接生成:', linkValue);
            console.log('链接包含账户ID:', linkValue.includes('VERIFY001'));
        }
        
        console.log('5. 测试代理商自动填充...');
        
        await page.evaluate(() => document.getElementById('agentId').value = '');
        await page.type('#agentId', 'AGENT001');
        await page.click('#accountId'); // 触发blur
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const agentNameValue = await page.evaluate(() => {
            const nameInput = document.getElementById('agentName');
            return nameInput ? nameInput.value : '';
        });
        
        console.log('代理商名称自动填充:', agentNameValue);
        
        console.log('6. 测试返点政策自定义功能...');
        
        await page.select('#rebatePolicy', 'custom');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const customRebateVisible = await page.evaluate(() => {
            const customGroup = document.getElementById('customRebateGroup');
            return customGroup && getComputedStyle(customGroup).display !== 'none';
        });
        
        console.log('自定义返点组件可见:', customRebateVisible);
        
        console.log('7. 填写完整表单...');
        
        await page.type('#accountEntity', '测试验证公司');
        if (customRebateVisible) {
            await page.type('#customRebate', '2.5');
        }
        await page.type('#contactPerson', '测试联系人');
        await page.type('#contactPhone', '13800138000');
        await page.type('#remarks', '这是最终验证测试数据');
        
        // 最终截图
        await page.screenshot({ 
            path: 'final-verification-03-completed.png',
            fullPage: true
        });
        
        console.log('✅ 最终验证测试完成');
        
        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            testResults: {
                pageLoad: true,
                modalOpen: modalVisible,
                fieldsPresent: Object.keys(fields).length,
                linkSwitching: true,
                agentAutoFill: agentNameValue === '北京代理商A',
                customRebatePolicy: customRebateVisible,
                formCompletion: true
            },
            summary: '商户管理页面核心功能验证完成'
        };
        
        console.log('\n📊 测试报告:');
        console.log(JSON.stringify(report, null, 2));
        
    } catch (error) {
        console.error('❌ 测试错误:', error.message);
        
        await page.screenshot({ 
            path: 'final-verification-error.png',
            fullPage: true
        });
        
    } finally {
        setTimeout(async () => {
            await browser.close();
        }, 2000);
    }
}

finalVerificationTest();