/**
 * 商户模态框功能测试脚本
 * 验证添加商户模态框的所有功能
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class MerchantModalTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.screenshotIndex = 1;
    }
    
    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 }
        });
        this.page = await this.browser.newPage();
        
        // 监听控制台消息
        this.page.on('console', msg => {
            console.log(`浏览器日志: ${msg.text()}`);
        });
        
        // 监听页面错误
        this.page.on('pageerror', error => {
            console.error(`页面错误: ${error.message}`);
        });
    }
    
    async takeScreenshot(name) {
        const filename = `merchant-modal-test-${String(this.screenshotIndex).padStart(2, '0')}-${name}.png`;
        await this.page.screenshot({ 
            path: filename, 
            fullPage: true 
        });
        console.log(`📸 截图已保存: ${filename}`);
        this.screenshotIndex++;
        return filename;
    }
    
    async testModalOpenClose() {
        console.log('\n🧪 测试模态框开关功能...');
        
        try {
            // 导航到商户管理页面
            await this.page.goto('http://localhost:8092/merchant', { 
                waitUntil: 'networkidle0',
                timeout: 10000 
            });
            
            await this.takeScreenshot('merchant-page-loaded');
            
            // 点击添加商户按钮
            const addBtn = await this.page.$('#addMerchantBtn, .add-merchant-btn, button[onclick*="addMerchant"]');
            if (!addBtn) {
                throw new Error('未找到添加商户按钮');
            }
            
            await addBtn.click();
            await this.page.waitForTimeout(500);
            
            // 检查模态框是否打开
            const modal = await this.page.$('#addMerchantModal.show');
            if (!modal) {
                throw new Error('模态框未正确打开');
            }
            
            await this.takeScreenshot('modal-opened');
            
            // 检查关闭按钮
            const closeBtn = await this.page.$('.modal-close');
            if (closeBtn) {
                await closeBtn.click();
                await this.page.waitForTimeout(300);
                
                const closedModal = await this.page.$('#addMerchantModal.show');
                if (closedModal) {
                    throw new Error('模态框未正确关闭');
                }
                
                console.log('✅ 模态框开关功能正常');
                this.testResults.push({ test: '模态框开关', result: '通过' });
            } else {
                throw new Error('未找到关闭按钮');
            }
            
        } catch (error) {
            console.error('❌ 模态框开关测试失败:', error.message);
            this.testResults.push({ test: '模态框开关', result: '失败', error: error.message });
            await this.takeScreenshot('modal-test-error');
        }
    }
    
    async testAutoGeneration() {
        console.log('\n🧪 测试自动生成功能...');
        
        try {
            // 重新打开模态框
            const addBtn = await this.page.$('#addMerchantBtn, .add-merchant-btn, button[onclick*="addMerchant"]');
            await addBtn.click();
            await this.page.waitForTimeout(500);
            
            // 输入商户名称
            const merchantNameInput = await this.page.$('#merchantName');
            if (!merchantNameInput) {
                throw new Error('未找到商户名称输入框');
            }
            
            await merchantNameInput.clear();
            await merchantNameInput.type('测试商户科技有限公司');
            await this.page.waitForTimeout(800); // 等待防抖动延迟
            
            // 检查商户ID是否自动生成
            const merchantId = await this.page.$eval('#merchantId', el => el.value);
            if (!merchantId || !merchantId.startsWith('M')) {
                throw new Error('商户ID未正确自动生成');
            }
            
            // 检查充值链接是否自动生成
            const rechargeLink = await this.page.$eval('#rechargeLink', el => el.value);
            if (!rechargeLink || !rechargeLink.includes('/recharge/')) {
                throw new Error('充值链接未正确自动生成');
            }
            
            await this.takeScreenshot('auto-generation-test');
            
            console.log('✅ 自动生成功能正常');
            console.log(`   商户ID: ${merchantId}`);
            console.log(`   充值链接: ${rechargeLink}`);
            this.testResults.push({ test: '自动生成', result: '通过', merchantId, rechargeLink });
            
        } catch (error) {
            console.error('❌ 自动生成测试失败:', error.message);
            this.testResults.push({ test: '自动生成', result: '失败', error: error.message });
            await this.takeScreenshot('auto-generation-error');
        }
    }
    
    async testDynamicAccounts() {
        console.log('\n🧪 测试动态账户管理...');
        
        try {
            // 测试添加付款账户
            const addPaymentBtn = await this.page.$('#addPaymentAccount');
            if (!addPaymentBtn) {
                throw new Error('未找到添加付款账户按钮');
            }
            
            await addPaymentBtn.click();
            await this.page.waitForTimeout(300);
            
            // 检查是否添加了付款账户表单
            const paymentAccount = await this.page.$('[data-account-index="1"]');
            if (!paymentAccount) {
                throw new Error('付款账户未正确添加');
            }
            
            // 填写付款账户信息
            await this.page.type('input[name="paymentAccountName_1"]', '招商银行');
            await this.page.type('input[name="paymentAccountNumber_1"]', '6214830123456789');
            await this.page.type('input[name="paymentBank_1"]', '招商银行深圳分行');
            
            await this.takeScreenshot('payment-account-added');
            
            // 测试添加广告账户
            const addAdBtn = await this.page.$('#addAdAccount');
            if (!addAdBtn) {
                throw new Error('未找到添加广告账户按钮');
            }
            
            await addAdBtn.click();
            await this.page.waitForTimeout(300);
            
            // 检查是否添加了广告账户表单
            const adAccount = await this.page.$('[data-ad-account-index="1"]');
            if (!adAccount) {
                throw new Error('广告账户未正确添加');
            }
            
            // 填写广告账户信息
            await this.page.type('input[name="adAccountId_1"]', 'AD123456');
            await this.page.type('input[name="adAccountName_1"]', '测试广告账户');
            
            await this.takeScreenshot('ad-account-added');
            
            console.log('✅ 动态账户管理功能正常');
            this.testResults.push({ test: '动态账户管理', result: '通过' });
            
        } catch (error) {
            console.error('❌ 动态账户管理测试失败:', error.message);
            this.testResults.push({ test: '动态账户管理', result: '失败', error: error.message });
            await this.takeScreenshot('dynamic-accounts-error');
        }
    }
    
    async testFormValidation() {
        console.log('\n🧪 测试表单验证...');
        
        try {
            // 清空必填字段
            await this.page.click('#merchantName');
            await this.page.keyboard.down('Meta');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Meta');
            await this.page.keyboard.press('Backspace');
            
            // 尝试提交表单
            const submitBtn = await this.page.$('#confirmAddMerchant');
            if (!submitBtn) {
                throw new Error('未找到提交按钮');
            }
            
            await submitBtn.click();
            await this.page.waitForTimeout(500);
            
            // 检查是否显示错误提示
            const errorElements = await this.page.$$('.form-error:not(:empty)');
            if (errorElements.length === 0) {
                throw new Error('表单验证未生效');
            }
            
            await this.takeScreenshot('form-validation-test');
            
            console.log('✅ 表单验证功能正常');
            this.testResults.push({ test: '表单验证', result: '通过' });
            
        } catch (error) {
            console.error('❌ 表单验证测试失败:', error.message);
            this.testResults.push({ test: '表单验证', result: '失败', error: error.message });
            await this.takeScreenshot('form-validation-error');
        }
    }
    
    async testCopyFunction() {
        console.log('\n🧪 测试复制功能...');
        
        try {
            // 先填写商户名称以生成充值链接
            await this.page.type('#merchantName', '复制测试商户');
            await this.page.waitForTimeout(800);
            
            // 点击复制按钮
            const copyBtn = await this.page.$('#copyRechargeLink');
            if (!copyBtn) {
                throw new Error('未找到复制按钮');
            }
            
            await copyBtn.click();
            await this.page.waitForTimeout(1000);
            
            // 检查按钮状态变化
            const buttonText = await this.page.$eval('#copyRechargeLink', el => el.textContent);
            if (buttonText.includes('已复制')) {
                console.log('✅ 复制功能正常');
                this.testResults.push({ test: '复制功能', result: '通过' });
            } else {
                throw new Error('复制按钮状态未正确更新');
            }
            
            await this.takeScreenshot('copy-function-test');
            
        } catch (error) {
            console.error('❌ 复制功能测试失败:', error.message);
            this.testResults.push({ test: '复制功能', result: '失败', error: error.message });
            await this.takeScreenshot('copy-function-error');
        }
    }
    
    async testCompleteFlow() {
        console.log('\n🧪 测试完整流程...');
        
        try {
            // 填写完整表单
            await this.page.click('#merchantName');
            await this.page.keyboard.down('Meta');
            await this.page.keyboard.press('a');
            await this.page.keyboard.up('Meta');
            await this.page.type('#merchantName', '完整流程测试商户');
            await this.page.waitForTimeout(500);
            
            // 填写联系信息
            await this.page.type('#contactName', '张三');
            await this.page.type('#contactPhone', '13800138000');
            await this.page.type('#contactEmail', 'test@example.com');
            await this.page.type('#industry', '科技服务');
            await this.page.type('#merchantDescription', '这是一个测试商户的完整描述信息');
            
            await this.takeScreenshot('complete-form-filled');
            
            // 提交表单
            const submitBtn = await this.page.$('#confirmAddMerchant');
            await submitBtn.click();
            
            // 等待提交处理
            await this.page.waitForTimeout(2000);
            
            await this.takeScreenshot('form-submitted');
            
            console.log('✅ 完整流程测试完成');
            this.testResults.push({ test: '完整流程', result: '通过' });
            
        } catch (error) {
            console.error('❌ 完整流程测试失败:', error.message);
            this.testResults.push({ test: '完整流程', result: '失败', error: error.message });
            await this.takeScreenshot('complete-flow-error');
        }
    }
    
    async generateReport() {
        console.log('\n📊 生成测试报告...');
        
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests: this.testResults.filter(t => t.result === '通过').length,
            failedTests: this.testResults.filter(t => t.result === '失败').length,
            results: this.testResults
        };
        
        const reportContent = `
# 商户模态框功能测试报告

**测试时间**: ${report.timestamp}
**总测试数**: ${report.totalTests}
**通过测试**: ${report.passedTests}
**失败测试**: ${report.failedTests}
**通过率**: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%

## 详细结果

${this.testResults.map(result => `
### ${result.test}
- **结果**: ${result.result}
${result.error ? `- **错误**: ${result.error}` : ''}
${result.merchantId ? `- **商户ID**: ${result.merchantId}` : ''}
${result.rechargeLink ? `- **充值链接**: ${result.rechargeLink}` : ''}
`).join('\n')}

## 测试总结

${report.passedTests === report.totalTests 
    ? '🎉 所有测试通过！添加商户模态框功能正常运行。'
    : `⚠️ 有 ${report.failedTests} 个测试失败，需要检查和修复相关功能。`
}
        `;
        
        fs.writeFileSync('merchant-modal-test-report.md', reportContent);
        fs.writeFileSync('merchant-modal-test-results.json', JSON.stringify(report, null, 2));
        
        console.log('📄 测试报告已生成: merchant-modal-test-report.md');
        console.log('📊 测试数据已保存: merchant-modal-test-results.json');
        
        return report;
    }
    
    async runAllTests() {
        console.log('🚀 开始商户模态框功能测试...\n');
        
        try {
            await this.init();
            
            await this.testModalOpenClose();
            await this.testAutoGeneration();
            await this.testDynamicAccounts();
            await this.testFormValidation();
            await this.testCopyFunction();
            await this.testCompleteFlow();
            
            const report = await this.generateReport();
            
            console.log('\n🎯 测试完成总结:');
            console.log(`   总测试数: ${report.totalTests}`);
            console.log(`   通过测试: ${report.passedTests}`);
            console.log(`   失败测试: ${report.failedTests}`);
            console.log(`   通过率: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
            
            if (report.passedTests === report.totalTests) {
                console.log('\n🎉 恭喜！所有功能测试通过！');
            } else {
                console.log('\n⚠️ 部分功能需要修复，请查看详细报告。');
            }
            
        } catch (error) {
            console.error('💥 测试执行过程中发生错误:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// 运行测试
const tester = new MerchantModalTester();
tester.runAllTests().catch(console.error);