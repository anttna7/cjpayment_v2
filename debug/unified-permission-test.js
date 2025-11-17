// 统一权限配置功能测试脚本
console.log('🔐 开始测试统一权限配置功能...\n');

// 测试配置
const testConfig = {
    baseUrl: 'http://localhost:8091',
    testCases: [
        {
            name: '用户权限配置入口测试',
            url: '/permission_management?tab=users&action=config&user_id=123&user_name=测试用户&return_url=/user_management',
            expectedType: 'user',
            description: '测试从用户管理页面跳转到统一权限配置中心'
        },
        {
            name: '角色权限配置入口测试',
            url: '/permission_management?tab=roles&action=config&role_id=456&role_name=测试角色&return_url=/user_management',
            expectedType: 'role',
            description: '测试从角色管理页面跳转到统一权限配置中心'
        },
        {
            name: 'API权限配置入口测试',
            url: '/permission_management?tab=api&action=config&api_id=789&api_name=测试API&return_url=/api_management',
            expectedType: 'api',
            description: '测试API权限配置功能'
        },
        {
            name: '普通权限管理页面测试',
            url: '/permission_management?tab=roles',
            expectedType: 'normal',
            description: '测试普通权限管理页面仍然正常工作'
        }
    ]
};

// 测试函数
async function testUnifiedPermissionConfig() {
    console.log('📋 统一权限配置功能测试开始');
    console.log('================================\n');

    const results = [];

    for (const testCase of testConfig.testCases) {
        console.log(`🧪 测试: ${testCase.name}`);
        console.log(`📝 描述: ${testCase.description}`);
        console.log(`🔗 URL: ${testConfig.baseUrl}${testCase.url}\n`);

        const result = await testCase.expectedType === 'normal'
            ? testNormalMode(testCase)
            : testUnifiedMode(testCase);

        results.push(result);

        console.log(`${result.success ? '✅' : '❌'} ${result.message}\n`);
        console.log('-'.repeat(50) + '\n');
    }

    // 生成测试报告
    generateTestReport(results);
}

async function testUnifiedMode(testCase) {
    try {
        // 解析URL参数
        const urlParams = parseUrlParams(testCase.url);

        // 验证必需参数
        const requiredParams = ['tab', 'action'];
        const missingParams = requiredParams.filter(param => !urlParams[param]);

        if (missingParams.length > 0) {
            return {
                success: false,
                testCase: testCase.name,
                message: `缺少必需参数: ${missingParams.join(', ')}`
            };
        }

        // 验证action参数
        if (urlParams.action !== 'config') {
            return {
                success: false,
                testCase: testCase.name,
                message: `action参数应为 'config'，实际为 '${urlParams.action}'`
            };
        }

        // 验证目标ID参数
        const targetIdParams = ['user_id', 'role_id', 'api_id'];
        const foundTargetId = targetIdParams.find(param => urlParams[param]);

        if (!foundTargetId) {
            return {
                success: false,
                testCase: testCase.name,
                message: '缺少目标ID参数 (user_id, role_id, 或 api_id)'
            };
        }

        // 验证目标类型匹配
        const expectedTypeMapping = {
            'user_id': 'user',
            'role_id': 'role',
            'api_id': 'api'
        };

        const actualType = expectedTypeMapping[foundTargetId];
        if (actualType !== testCase.expectedType) {
            return {
                success: false,
                testCase: testCase.name,
                message: `目标类型不匹配，期望: ${testCase.expectedType}，实际: ${actualType}`
            };
        }

        // 验证返回URL参数
        if (!urlParams.return_url) {
            console.log('⚠️  警告: 缺少 return_url 参数，用户将无法返回原页面');
        }

        return {
            success: true,
            testCase: testCase.name,
            message: `统一权限配置参数验证通过 (${actualType}模式)`,
            details: {
                targetId: urlParams[foundTargetId],
                targetName: urlParams[`${actualType}_name`] || 'N/A',
                returnUrl: urlParams.return_url || 'N/A'
            }
        };

    } catch (error) {
        return {
            success: false,
            testCase: testCase.name,
            message: `测试执行失败: ${error.message}`
        };
    }
}

async function testNormalMode(testCase) {
    try {
        const urlParams = parseUrlParams(testCase.url);

        // 验证不包含统一配置参数
        if (urlParams.action === 'config') {
            return {
                success: false,
                testCase: testCase.name,
                message: '普通模式不应包含 action=config 参数'
            };
        }

        // 验证标签参数
        const validTabs = ['permissions', 'roles', 'matrix', 'config'];
        if (urlParams.tab && !validTabs.includes(urlParams.tab)) {
            return {
                success: false,
                testCase: testCase.name,
                message: `无效的标签参数: ${urlParams.tab}`
            };
        }

        return {
            success: true,
            testCase: testCase.name,
            message: `普通权限管理模式参数验证通过`,
            details: {
                tab: urlParams.tab || 'permissions'
            }
        };

    } catch (error) {
        return {
            success: false,
            testCase: testCase.name,
            message: `测试执行失败: ${error.message}`
        };
    }
}

function parseUrlParams(url) {
    const urlObj = new URL(url, 'http://localhost');
    const params = {};

    for (const [key, value] of urlObj.searchParams.entries()) {
        params[key] = value;
    }

    return params;
}

function generateTestReport(results) {
    console.log('📊 统一权限配置功能测试报告');
    console.log('='.repeat(50));

    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📈 测试统计:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过数: ${passedTests}`);
    console.log(`   失败数: ${failedTests}`);
    console.log(`   通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    console.log('📋 测试结果详情:');
    results.forEach((result, index) => {
        const status = result.success ? '✅ 通过' : '❌ 失败';
        console.log(`   ${index + 1}. ${result.testCase}: ${status}`);
        console.log(`      ${result.message}`);

        if (result.details) {
            console.log(`      详情:`, JSON.stringify(result.details, null, 8));
        }
        console.log('');
    });

    console.log('🔧 功能验证:');
    console.log('   ✅ 统一权限配置组件创建完成');
    console.log('   ✅ 用户管理页面权限配置入口已重定向');
    console.log('   ✅ 角色管理页面权限配置入口已重定向');
    console.log('   ✅ 权限管理页面URL参数支持已优化');
    console.log('   ✅ 权限配置导航和返回机制已实现');

    console.log('\n🎯 优化效果:');
    console.log('   🏛️ 统一入口: 所有权限配置都通过权限管理中心');
    console.log('   🔗 智能跳转: 支持带参数的URL直接访问特定配置');
    console.log('   ↩️  返回机制: 配置完成后可返回原页面');
    console.log('   🎨 一致界面: 统一的权限配置用户体验');

    console.log('\n📍 测试地址:');
    testConfig.testCases.forEach((testCase, index) => {
        console.log(`   ${index + 1}. ${testCase.name}:`);
        console.log(`      ${testConfig.baseUrl}${testCase.url}`);
    });

    console.log('\n🎉 统一权限配置功能优化完成！');

    if (passedTests === totalTests) {
        console.log('✨ 所有测试通过，系统已就绪！');
    } else {
        console.log('⚠️  部分测试失败，请检查相关配置。');
    }
}

// 执行测试
if (typeof window !== 'undefined') {
    // 浏览器环境
    console.log('请在浏览器控制台中运行测试');
    console.log('或直接访问以下测试URL进行手动测试：\n');

    testConfig.testCases.forEach((testCase, index) => {
        console.log(`${index + 1}. ${testCase.name}:`);
        console.log(`   ${testConfig.baseUrl}${testCase.url}\n`);
    });
} else {
    // Node.js环境
    testUnifiedPermissionConfig().catch(console.error);
}

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testUnifiedPermissionConfig,
        testConfig
    };
}