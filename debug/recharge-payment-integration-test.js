// 充值支付管理中心整合验证测试
console.log('🚀 充值支付管理中心整合验证开始...');

async function testRechargePaymentIntegration() {
    console.log('\n📋 验证项目:');
    console.log('1. ✅ 新管理中心页面可访问');
    console.log('2. ✅ 系统配置页面支付配置重定向');
    console.log('3. ✅ CSS和JavaScript文件加载');
    console.log('4. ✅ 页面功能完整性检查');

    const results = {
        centerAccessible: false,
        redirectWorking: false,
        assetsLoaded: false,
        functionalityWorking: false
    };

    try {
        // 1. 测试新管理中心页面访问
        console.log('\n💳 1. 测试充值支付管理中心访问...');
        const centerResponse = await fetch('http://127.0.0.1:8091/recharge_payment_center');

        if (centerResponse.ok) {
            console.log('   ✅ 充值支付管理中心页面可访问');
            console.log(`   📄 状态码: ${centerResponse.status}`);

            const centerContent = await centerResponse.text();

            // 检查关键元素
            const hasTabStructure = centerContent.includes('data-tab="config"') &&
                                   centerContent.includes('data-tab="links"') &&
                                   centerContent.includes('data-tab="analytics"') &&
                                   centerContent.includes('data-tab="testing"');

            if (hasTabStructure) {
                console.log('   ✅ 标签页结构完整');
                results.centerAccessible = true;
            } else {
                console.log('   ❌ 标签页结构不完整');
            }

            // 检查统计卡片
            const hasStatsCards = centerContent.includes('stat-card') &&
                                centerContent.includes('totalLinks') &&
                                centerContent.includes('totalAmount');

            if (hasStatsCards) {
                console.log('   ✅ 统计卡片结构正确');
            } else {
                console.log('   ❌ 统计卡片结构缺失');
            }

        } else {
            console.log(`   ❌ 页面访问失败: ${centerResponse.status}`);
        }

        // 2. 测试系统配置页面重定向
        console.log('\n⚙️ 2. 测试系统配置页面支付配置重定向...');
        const configResponse = await fetch('http://127.0.0.1:8091/system_config');

        if (configResponse.ok) {
            const configContent = await configResponse.text();

            // 检查是否包含重定向内容
            const hasRedirect = configContent.includes('充值支付管理中心') &&
                              configContent.includes('/recharge_payment_center') &&
                              configContent.includes('功能整合说明');

            if (hasRedirect) {
                console.log('   ✅ 支付配置重定向设置正确');
                results.redirectWorking = true;
            } else {
                console.log('   ❌ 支付配置重定向设置缺失');
            }

            // 检查是否移除了原有配置内容
            const hasOldConfig = configContent.includes('rechargeBaseDomain') ||
                               configContent.includes('minPayAmount') ||
                               configContent.includes('启动充值测试');

            if (!hasOldConfig) {
                console.log('   ✅ 原有支付配置内容已清理');
            } else {
                console.log('   ⚠️ 仍有原有支付配置内容残留');
            }

        } else {
            console.log(`   ❌ 系统配置页面访问失败: ${configResponse.status}`);
        }

        // 3. 测试CSS和JavaScript资源加载
        console.log('\n📄 3. 测试资源文件加载...');

        // 测试CSS文件
        const cssResponse = await fetch('http://127.0.0.1:8091/static/css/recharge-payment-center.css');
        if (cssResponse.ok && cssResponse.headers.get('content-type').includes('text/css')) {
            console.log('   ✅ CSS文件加载正常');
            console.log(`   📏 文件大小: ${cssResponse.headers.get('content-length')} bytes`);
        } else {
            console.log('   ❌ CSS文件加载失败');
        }

        // 测试JavaScript文件
        const jsResponse = await fetch('http://127.0.0.1:8091/static/js/recharge-payment-center.js');
        if (jsResponse.ok && jsResponse.headers.get('content-type').includes('javascript')) {
            console.log('   ✅ JavaScript文件加载正常');
            console.log(`   📏 文件大小: ${jsResponse.headers.get('content-length')} bytes`);
            results.assetsLoaded = true;
        } else {
            console.log('   ❌ JavaScript文件加载失败');
        }

        // 4. 功能完整性验证
        console.log('\n🔧 4. 功能完整性验证...');

        // 模拟检查各个模块的功能点
        const functionalities = [
            { name: '系统配置模块', check: () => centerContent.includes('config-section') },
            { name: '链接管理模块', check: () => centerContent.includes('links-section') },
            { name: '数据分析模块', check: () => centerContent.includes('analytics-section') },
            { name: '测试工具模块', check: () => centerContent.includes('testing-section') }
        ];

        let functionalCount = 0;
        functionalities.forEach(func => {
            if (func.check()) {
                console.log(`   ✅ ${func.name}: 正常`);
                functionalCount++;
            } else {
                console.log(`   ❌ ${func.name}: 缺失`);
            }
        });

        if (functionalCount === functionalities.length) {
            results.functionalityWorking = true;
            console.log('   🎉 所有功能模块完整');
        } else {
            console.log(`   ⚠️ ${functionalCount}/${functionalities.length} 个模块正常`);
        }

    } catch (error) {
        console.log(`❌ 测试过程中出现错误: ${error.message}`);
    }

    // 生成测试报告
    console.log('\n📊 整合验证结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💳 新管理中心访问:     ${results.centerAccessible ? '✅ 通过' : '❌ 失败'}`);
    console.log(`⚙️ 系统配置重定向:     ${results.redirectWorking ? '✅ 通过' : '❌ 失败'}`);
    console.log(`📄 资源文件加载:       ${results.assetsLoaded ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🔧 功能完整性检查:     ${results.functionalityWorking ? '✅ 通过' : '❌ 失败'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 整合完成度: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    if (passedTests === totalTests) {
        console.log('\n🎉 充值支付管理中心整合完成！');
        console.log('✨ 所有功能模块已成功整合，用户可以享受一站式管理体验');
        console.log('\n🔗 访问地址:');
        console.log('   💳 充值支付管理中心: http://127.0.0.1:8091/recharge_payment_center');
        console.log('   ⚙️ 系统配置（含重定向）: http://127.0.0.1:8091/system_config');
    } else {
        console.log('\n⚠️ 整合过程中发现问题，需要进一步检查和修复');
    }

    console.log('\n📝 用户使用指南:');
    console.log('1. 访问充值支付管理中心进行配置、链接管理、数据分析');
    console.log('2. 系统配置页面的支付配置会自动重定向到管理中心');
    console.log('3. 享受从配置到运营的完整一站式管理体验');

    return results;
}

// 运行测试
testRechargePaymentIntegration().catch(error => {
    console.error('❌ 整合验证失败:', error);
});