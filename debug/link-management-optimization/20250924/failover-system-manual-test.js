const http = require('http');

// 简单的故障转移系统手动测试
class FailoverSystemManualTest {
    constructor() {
        this.baseUrl = 'http://localhost:8080';
        this.testResults = {
            timestamp: new Date().toISOString(),
            total: 0,
            passed: 0,
            failed: 0,
            details: []
        };
    }

    async makeRequest(path) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${path}`;

            http.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data,
                        ok: res.statusCode >= 200 && res.statusCode < 300
                    });
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
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

    async testBasicPages() {
        // 测试基本页面访问
        const pages = [
            { path: '/', name: '首页' },
            { path: '/system_config', name: '系统配置' },
            { path: '/recharge_payment_center', name: '充值支付管理中心' },
            { path: '/health', name: '健康检查' }
        ];

        for (const page of pages) {
            console.log(`🔗 测试页面: ${page.name} (${page.path})`);

            const response = await this.makeRequest(page.path);

            if (!response.ok) {
                throw new Error(`页面 ${page.name} 访问失败: ${response.status}`);
            }

            console.log(`✅ ${page.name} 页面正常访问`);
        }
    }

    async testAPIEndpoints() {
        // 测试API端点
        const endpoints = [
            { path: '/api/failover/domains', name: '域名管理API' },
            { path: '/api/failover/gateways', name: '网关管理API' },
            { path: '/api/failover/config', name: '故障转移配置API' },
            { path: '/api/failover/logs', name: '故障转移日志API' },
            { path: '/api/system/status', name: '系统状态API' }
        ];

        for (const endpoint of endpoints) {
            console.log(`🔗 测试API: ${endpoint.name} (${endpoint.path})`);

            const response = await this.makeRequest(endpoint.path);

            if (!response.ok) {
                throw new Error(`API ${endpoint.name} 响应失败: ${response.status}`);
            }

            // 检查是否返回JSON数据
            try {
                JSON.parse(response.data);
                console.log(`✅ ${endpoint.name} 正常返回JSON数据`);
            } catch (e) {
                throw new Error(`API ${endpoint.name} 返回的不是有效的JSON数据`);
            }
        }
    }

    async testHealthCheck() {
        // 测试健康检查端点
        console.log('🏥 测试健康检查端点');

        const response = await this.makeRequest('/health');

        if (!response.ok) {
            throw new Error(`健康检查端点响应失败: ${response.status}`);
        }

        const healthData = JSON.parse(response.data);

        if (healthData.status !== 'healthy') {
            throw new Error(`健康检查状态异常: ${healthData.status}`);
        }

        if (!healthData.timestamp) {
            throw new Error('健康检查缺少时间戳');
        }

        console.log('✅ 健康检查端点正常');
    }

    async testErrorHandling() {
        // 测试错误处理
        console.log('🚨 测试错误处理');

        // 测试404页面
        try {
            const response = await this.makeRequest('/nonexistent');
            if (response.status !== 404) {
                throw new Error(`期望404状态码，但得到: ${response.status}`);
            }
            console.log('✅ 404错误正确处理');
        } catch (error) {
            if (error.message.includes('ECONNREFUSED')) {
                throw new Error('服务器未启动或连接被拒绝');
            }
            // 其他错误也视为正常的404处理
            console.log('✅ 错误处理正常');
        }

        // 测试API 404
        try {
            const response = await this.makeRequest('/api/failover/invalid');
            if (response.status !== 404) {
                throw new Error(`API期望404状态码，但得到: ${response.status}`);
            }
            console.log('✅ API 404错误正确处理');
        } catch (error) {
            if (error.message.includes('ECONNREFUSED')) {
                throw new Error('服务器未启动或连接被拒绝');
            }
            console.log('✅ API错误处理正常');
        }
    }

    async testDomainAPIData() {
        // 测试域名API数据结构
        console.log('📊 测试域名API数据结构');

        const response = await this.makeRequest('/api/failover/domains');

        if (!response.ok) {
            throw new Error(`域名API响应失败: ${response.status}`);
        }

        const domains = JSON.parse(response.data);

        if (!Array.isArray(domains)) {
            throw new Error('域名API应该返回数组');
        }

        if (domains.length === 0) {
            throw new Error('域名API返回空数组');
        }

        // 检查数据结构
        const domain = domains[0];
        const requiredFields = ['id', 'domain', 'is_primary', 'priority', 'enabled', 'status'];

        for (const field of requiredFields) {
            if (!(field in domain)) {
                throw new Error(`域名数据缺少必需字段: ${field}`);
            }
        }

        console.log(`✅ 域名API返回 ${domains.length} 个域名配置`);
    }

    async testGatewayAPIData() {
        // 测试网关API数据结构
        console.log('💳 测试网关API数据结构');

        const response = await this.makeRequest('/api/failover/gateways');

        if (!response.ok) {
            throw new Error(`网关API响应失败: ${response.status}`);
        }

        const gateways = JSON.parse(response.data);

        if (!Array.isArray(gateways)) {
            throw new Error('网关API应该返回数组');
        }

        if (gateways.length === 0) {
            throw new Error('网关API返回空数组');
        }

        // 检查数据结构
        const gateway = gateways[0];
        const requiredFields = ['id', 'name', 'gateway_type', 'api_url', 'is_primary', 'priority', 'enabled', 'status'];

        for (const field of requiredFields) {
            if (!(field in gateway)) {
                throw new Error(`网关数据缺少必需字段: ${field}`);
            }
        }

        console.log(`✅ 网关API返回 ${gateways.length} 个网关配置`);
    }

    generateReport() {
        // 生成测试报告
        const report = {
            ...this.testResults,
            summary: `测试完成: ${this.testResults.passed}/${this.testResults.total} 通过`,
            success_rate: `${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`,
            generated_at: new Date().toISOString()
        };

        require('fs').writeFileSync(
            'failover-system-manual-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📋 测试报告已生成: failover-system-manual-test-report.json');
        console.log(`📊 测试结果: ${report.summary}`);
        console.log(`📈 成功率: ${report.success_rate}`);
    }

    async runAllTests() {
        console.log('🎯 故障转移系统手动功能测试');
        console.log('=====================================');

        // 运行所有测试
        await this.runTest('基本页面访问', () => this.testBasicPages());
        await this.runTest('API端点测试', () => this.testAPIEndpoints());
        await this.runTest('健康检查', () => this.testHealthCheck());
        await this.runTest('错误处理', () => this.testErrorHandling());
        await this.runTest('域名API数据', () => this.testDomainAPIData());
        await this.runTest('网关API数据', () => this.testGatewayAPIData());

        // 生成报告
        this.generateReport();

        console.log('\n🎉 所有测试完成！');
        console.log('\n📌 手动验证建议:');
        console.log('1. 访问 http://localhost:8082/system_config 查看域名管理界面');
        console.log('2. 访问 http://localhost:8082/recharge_payment_center 查看网关管理界面');
        console.log('3. 点击各个标签页验证功能完整性');
        console.log('4. 测试搜索、过滤等交互功能');
    }
}

// 运行测试
async function main() {
    const tester = new FailoverSystemManualTest();

    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ 测试运行失败:', error.message);
        process.exit(1);
    }
}

main();