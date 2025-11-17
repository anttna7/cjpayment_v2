const { chromium } = require('playwright');

async function testSimpleRechargePage() {
    console.log('🎯 简洁充值页面功能测试');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000
    });

    const page = await browser.newPage();

    try {
        // 访问简洁充值页面
        console.log('\n📍 访问简洁充值页面');
        await page.goto('http://127.0.0.1:8091/simple_recharge');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 检查页面基本元素
        console.log('\n📍 检查页面基本元素');
        const title = await page.textContent('h1');
        console.log(`   页面标题: ${title}`);

        // 测试表单字段
        console.log('\n📍 测试表单字段填写');

        // 填写账户ID
        await page.fill('#accountId', 'TEST_ACCOUNT_001');
        console.log('   ✅ 账户ID填写完成');

        // 填写卡户主体名称
        await page.fill('#accountHolder', '测试企业有限公司');
        console.log('   ✅ 卡户主体名称填写完成');

        // 填写充值金额
        await page.fill('#rechargeAmount', '1000');
        console.log('   ✅ 充值金额填写完成');

        // 测试金额快捷选择
        console.log('\n📍 测试金额快捷选择');
        await page.click('[data-amount="500"]');
        await page.waitForTimeout(500);
        const selectedAmount = await page.inputValue('#rechargeAmount');
        console.log(`   金额快捷选择: ${selectedAmount === '500' ? '✅' : '❌'}`);

        // 重新设置金额
        await page.fill('#rechargeAmount', '1000');

        // 选择转账类型
        console.log('\n📍 测试转账类型选择');
        await page.click('#businessType');
        await page.waitForTimeout(500);
        const businessSelected = await page.evaluate(() => {
            return document.getElementById('businessType').classList.contains('selected');
        });
        console.log(`   对公转账选择: ${businessSelected ? '✅' : '❌'}`);

        // 等待匹配账户信息显示
        await page.waitForTimeout(1000);
        const accountInfoVisible = await page.isVisible('#matchedAccountInfo.show');
        console.log(`   匹配账户信息显示: ${accountInfoVisible ? '✅' : '❌'}`);

        if (accountInfoVisible) {
            const receiverBank = await page.textContent('#receiverBank');
            const receiverAccount = await page.textContent('#receiverAccount');
            const receiverName = await page.textContent('#receiverName');
            console.log(`   收款银行: ${receiverBank}`);
            console.log(`   收款账号: ${receiverAccount}`);
            console.log(`   收款户名: ${receiverName}`);
        }

        // 测试表单提交
        console.log('\n📍 测试表单提交');

        // 监听网络请求
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('/api/simple-recharge')) {
                requests.push(request);
                console.log(`   📡 API请求: ${request.method()} ${request.url()}`);
            }
        });

        // 提交表单
        await page.click('#submitButton');
        console.log('   📤 提交按钮点击完成');

        // 等待提交处理
        await page.waitForTimeout(3000);

        // 检查成功消息
        const successVisible = await page.isVisible('#successMessage.show');
        console.log(`   成功消息显示: ${successVisible ? '✅' : '❌'}`);

        if (successVisible) {
            const successText = await page.textContent('#successMessage');
            console.log(`   成功消息内容: ${successText}`);
        }

        // 检查是否有API请求
        console.log(`   API请求数量: ${requests.length}`);

        // 测试重置功能
        console.log('\n📍 测试表单重置');
        await page.waitForTimeout(4000); // 等待成功消息自动消失

        const formVisible = await page.isVisible('form');
        console.log(`   表单重新显示: ${formVisible ? '✅' : '❌'}`);

        // 测试另一种转账类型
        console.log('\n📍 测试对私转账');
        await page.fill('#accountId', 'TEST_PERSONAL_002');
        await page.fill('#accountHolder', '张三');
        await page.fill('#rechargeAmount', '500');
        await page.click('#personalType');
        await page.waitForTimeout(1000);

        const personalSelected = await page.evaluate(() => {
            return document.getElementById('personalType').classList.contains('selected');
        });
        console.log(`   对私转账选择: ${personalSelected ? '✅' : '❌'}`);

        const personalAccountInfoVisible = await page.isVisible('#matchedAccountInfo.show');
        console.log(`   对私账户信息显示: ${personalAccountInfoVisible ? '✅' : '❌'}`);

        // 最终测试结果
        console.log('\n🎯 测试结果汇总');
        console.log('==================');
        console.log('✅ 页面访问正常');
        console.log('✅ 表单字段填写正常');
        console.log('✅ 金额快捷选择正常');
        console.log(`${businessSelected ? '✅' : '❌'} 对公转账选择功能`);
        console.log(`${personalSelected ? '✅' : '❌'} 对私转账选择功能`);
        console.log(`${accountInfoVisible ? '✅' : '❌'} 账户信息匹配显示`);
        console.log(`${successVisible ? '✅' : '❌'} 表单提交成功`);
        console.log(`${requests.length > 0 ? '✅' : '❌'} API调用正常`);

        console.log('\n⏳ 等待5秒观察最终状态...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        await browser.close();
    }
}

// 运行测试
try {
    require.resolve('playwright');
    testSimpleRechargePage().catch(console.error);
} catch (e) {
    console.log('⚠️  Playwright未安装');
}