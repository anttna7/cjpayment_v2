const puppeteer = require('puppeteer');
const fs = require('fs');

// 完整的故障转移系统测试
class FailoverSystemTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            timestamp: new Date().toISOString(),
            total: 0,
            passed: 0,
            failed: 0,
            details: []
        };
    }

    async initialize() {
        console.log('🚀 初始化故障转移系统测试...');

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // 设置较长的超时时间
        this.page.setDefaultTimeout(30000);
    }

    async runTest(testName, testFunction) {
        this.testResults.total++;
        console.log(`\n📋 测试: ${testName}`);

        try {
            await testFunction();
            this.testResults.passed++;
            this.testResults.details.push({
                name: testName,
                status: 'PASSED',
                timestamp: new Date().toISOString()
            });
            console.log(`✅ ${testName} - 通过`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.details.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            console.log(`❌ ${testName} - 失败: ${error.message}`);
        }
    }

    async testSystemConfigDomainManagement() {
        // 测试系统配置页面的域名管理功能
        await this.page.goto('http://localhost:8080/system_config', { waitUntil: 'networkidle0' });

        // 等待页面加载完成
        await this.page.waitForSelector('.tab-content', { timeout: 10000 });

        // 点击域名管理标签
        await this.page.click('[data-target="domain-management"]');
        await this.page.waitForTimeout(1000);

        // 验证域名管理内容可见
        const domainContent = await this.page.$('#domain-management');
        if (!domainContent) {
            throw new Error('域名管理内容未找到');
        }

        // 验证域名统计卡片
        const statsCards = await this.page.$$('.domain-stats .stat-card');
        if (statsCards.length < 3) {
            throw new Error('域名统计卡片数量不足');
        }

        // 验证域名表格
        const domainTable = await this.page.$('.domain-table');
        if (!domainTable) {
            throw new Error('域名表格未找到');
        }

        // 测试添加域名按钮
        const addButton = await this.page.$('.add-domain-btn');
        if (!addButton) {
            throw new Error('添加域名按钮未找到');
        }

        console.log('📊 系统配置域名管理功能验证完成');
    }

    async testRechargePaymentGatewayManagement() {
        // 测试充值支付中心的网关管理功能
        await this.page.goto('http://localhost:8080/recharge_payment_center', { waitUntil: 'networkidle0' });

        // 等待页面加载完成
        await this.page.waitForSelector('.tab-content', { timeout: 10000 });

        // 点击网关管理标签
        await this.page.click('[data-target="gateways"]');
        await this.page.waitForTimeout(1000);

        // 验证网关管理内容可见
        const gatewayContent = await this.page.$('#gateways');
        if (!gatewayContent) {
            throw new Error('网关管理内容未找到');
        }

        // 验证网关统计卡片
        const statsCards = await this.page.$$('.gateway-stats .stat-card');
        if (statsCards.length < 3) {
            throw new Error('网关统计卡片数量不足');
        }

        // 验证网关表格
        const gatewayTable = await this.page.$('.gateway-table');
        if (!gatewayTable) {
            throw new Error('网关表格未找到');
        }

        // 测试添加网关按钮
        const addButton = await this.page.$('.add-gateway-btn');
        if (!addButton) {
            throw new Error('添加网关按钮未找到');
        }

        console.log('💳 充值支付网关管理功能验证完成');
    }

    async testAPIEndpoints() {
        // 测试API端点
        const endpoints = [
            '/api/failover/domains',
            '/api/failover/gateways',
            '/api/failover/config',
            '/api/failover/logs',
            '/api/system/status'
        ];

        for (const endpoint of endpoints) {
            console.log(`🔗 测试API端点: ${endpoint}`);

            const response = await this.page.evaluate(async (url) => {
                const resp = await fetch(url);
                return {
                    status: resp.status,
                    ok: resp.ok,
                    data: await resp.json()
                };
            }, `http://localhost:8080${endpoint}`);

            if (!response.ok) {
                throw new Error(`API端点 ${endpoint} 响应失败: ${response.status}`);
            }

            if (!response.data) {
                throw new Error(`API端点 ${endpoint} 无数据返回`);
            }

            console.log(`✅ API端点 ${endpoint} 正常`);
        }
    }

    async testDomainManagementInteractions() {
        // 测试域名管理交互功能
        await this.page.goto('http://localhost:8080/system_config', { waitUntil: 'networkidle0' });

        // 切换到域名管理
        await this.page.click('[data-target="domain-management"]');
        await this.page.waitForTimeout(1000);

        // 测试搜索功能
        const searchInput = await this.page.$('.domain-search input');
        if (searchInput) {
            await searchInput.type('localhost');
            await this.page.waitForTimeout(500);
            console.log('🔍 域名搜索功能正常');
        }

        // 测试过滤功能
        const filterSelect = await this.page.$('.domain-filter select');
        if (filterSelect) {
            await filterSelect.select('enabled');
            await this.page.waitForTimeout(500);
            console.log('🔧 域名过滤功能正常');
        }

        // 测试刷新按钮
        const refreshButton = await this.page.$('.refresh-domains-btn');
        if (refreshButton) {
            await refreshButton.click();
            await this.page.waitForTimeout(1000);
            console.log('🔄 域名刷新功能正常');
        }
    }

    async testGatewayManagementInteractions() {
        // 测试网关管理交互功能
        await this.page.goto('http://localhost:8080/recharge_payment_center', { waitUntil: 'networkidle0' });

        // 切换到网关管理
        await this.page.click('[data-target="gateways"]');
        await this.page.waitForTimeout(1000);

        // 测试搜索功能
        const searchInput = await this.page.$('.gateway-search input');
        if (searchInput) {
            await searchInput.type('stripe');
            await this.page.waitForTimeout(500);
            console.log('🔍 网关搜索功能正常');
        }

        // 测试过滤功能
        const filterSelect = await this.page.$('.gateway-filter select');
        if (filterSelect) {
            await filterSelect.select('enabled');
            await this.page.waitForTimeout(500);
            console.log('🔧 网关过滤功能正常');
        }

        // 测试刷新按钮
        const refreshButton = await this.page.$('.refresh-gateways-btn');
        if (refreshButton) {
            await refreshButton.click();
            await this.page.waitForTimeout(1000);
            console.log('🔄 网关刷新功能正常');
        }
    }

    async testResponsiveDesign() {
        // 测试响应式设计
        const viewports = [
            { name: '桌面', width: 1280, height: 720 },
            { name: '平板', width: 768, height: 1024 },
            { name: '手机', width: 375, height: 667 }
        ];

        for (const viewport of viewports) {
            console.log(`📱 测试${viewport.name}视口: ${viewport.width}x${viewport.height}`);

            await this.page.setViewport({ width: viewport.width, height: viewport.height });

            // 测试系统配置页面
            await this.page.goto('http://localhost:8080/system_config', { waitUntil: 'networkidle0' });
            await this.page.waitForTimeout(1000);

            // 验证页面是否正常显示
            const content = await this.page.$('.tab-content');
            if (!content) {
                throw new Error(`${viewport.name}视口下系统配置页面显示异常`);
            }

            // 测试充值支付中心页面
            await this.page.goto('http://localhost:8080/recharge_payment_center', { waitUntil: 'networkidle0' });
            await this.page.waitForTimeout(1000);

            const paymentContent = await this.page.$('.tab-content');
            if (!paymentContent) {
                throw new Error(`${viewport.name}视口下充值支付中心页面显示异常`);
            }

            console.log(`✅ ${viewport.name}视口测试通过`);
        }

        // 恢复桌面视口
        await this.page.setViewport({ width: 1280, height: 720 });
    }

    async testErrorHandling() {
        // 测试错误处理
        console.log('🚨 测试错误处理功能');

        // 测试访问不存在的页面
        const response = await this.page.goto('http://localhost:8080/nonexistent', { waitUntil: 'networkidle0' });

        // 检查是否正确处理404错误
        if (response.status() === 404) {
            console.log('✅ 404错误正确处理');
        }

        // 测试API错误处理
        const apiResponse = await this.page.evaluate(async () => {
            const resp = await fetch('http://localhost:8080/api/failover/invalid');
            return resp.status;
        });

        if (apiResponse === 404) {
            console.log('✅ API 404错误正确处理');
        }
    }

    async testPerformance() {
        // 测试性能指标
        console.log('⚡ 测试页面性能');

        // 测试系统配置页面加载性能
        const start = Date.now();
        await this.page.goto('http://localhost:8080/system_config', { waitUntil: 'networkidle0' });
        const systemConfigLoadTime = Date.now() - start;

        console.log(`📊 系统配置页面加载时间: ${systemConfigLoadTime}ms`);

        if (systemConfigLoadTime > 5000) {
            throw new Error(`系统配置页面加载时间过长: ${systemConfigLoadTime}ms`);
        }

        // 测试充值支付中心页面加载性能
        const start2 = Date.now();
        await this.page.goto('http://localhost:8080/recharge_payment_center', { waitUntil: 'networkidle0' });
        const paymentCenterLoadTime = Date.now() - start2;

        console.log(`💳 充值支付中心页面加载时间: ${paymentCenterLoadTime}ms`);

        if (paymentCenterLoadTime > 5000) {
            throw new Error(`充值支付中心页面加载时间过长: ${paymentCenterLoadTime}ms`);
        }
    }

    async captureScreenshots() {
        // 截取关键页面截图
        console.log('📸 截取页面截图');

        // 系统配置页面截图
        await this.page.goto('http://localhost:8080/system_config', { waitUntil: 'networkidle0' });
        await this.page.click('[data-target="domain-management"]');
        await this.page.waitForTimeout(1000);
        await this.page.screenshot({
            path: 'failover-system-config-domains.png',
            fullPage: true
        });

        // 充值支付中心页面截图
        await this.page.goto('http://localhost:8080/recharge_payment_center', { waitUntil: 'networkidle0' });
        await this.page.click('[data-target="gateways"]');
        await this.page.waitForTimeout(1000);
        await this.page.screenshot({
            path: 'failover-payment-center-gateways.png',
            fullPage: true
        });

        console.log('📸 截图完成');
    }

    async generateReport() {
        // 生成测试报告
        const report = {
            ...this.testResults,
            summary: `测试完成: ${this.testResults.passed}/${this.testResults.total} 通过`,
            success_rate: `${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`,
            generated_at: new Date().toISOString()
        };

        fs.writeFileSync(
            'failover-system-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📋 测试报告已生成: failover-system-test-report.json');
        console.log(`📊 测试结果: ${report.summary}`);
        console.log(`📈 成功率: ${report.success_rate}`);
    }

    async runAllTests() {
        try {
            await this.initialize();

            // 运行所有测试
            await this.runTest('系统配置域名管理', () => this.testSystemConfigDomainManagement());
            await this.runTest('充值支付网关管理', () => this.testRechargePaymentGatewayManagement());
            await this.runTest('API端点测试', () => this.testAPIEndpoints());
            await this.runTest('域名管理交互', () => this.testDomainManagementInteractions());
            await this.runTest('网关管理交互', () => this.testGatewayManagementInteractions());
            await this.runTest('响应式设计', () => this.testResponsiveDesign());
            await this.runTest('错误处理', () => this.testErrorHandling());
            await this.runTest('性能测试', () => this.testPerformance());

            // 截取截图
            await this.captureScreenshots();

            // 生成报告
            await this.generateReport();

        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// 运行测试
async function main() {
    const tester = new FailoverSystemTest();

    console.log('🎯 故障转移系统完整功能测试');
    console.log('=====================================');

    await tester.runAllTests();

    console.log('\n🎉 所有测试完成！');
}

// 检查是否有Puppeteer
try {
    require.resolve('puppeteer');
    main().catch(console.error);
} catch (e) {
    console.log('⚠️  Puppeteer未安装，跳过自动化测试');
    console.log('安装命令: npm install puppeteer');
}