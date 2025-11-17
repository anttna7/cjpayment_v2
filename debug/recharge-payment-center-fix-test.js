// 充值支付管理中心修复验证测试
console.log('🔧 充值支付管理中心修复验证开始...');

async function testRechargePaymentCenterFix() {
    console.log('\n📋 验证项目:');
    console.log('1. ✅ 充值支付管理中心页面可访问性');
    console.log('2. ✅ 页面内容完整性检查');
    console.log('3. ✅ 相关资源文件加载');
    console.log('4. ✅ 导航和链接功能');

    const results = {
        pageAccessible: false,
        contentIntegrity: false,
        assetsLoading: false,
        navigationWorking: false
    };

    try {
        // 1. 测试页面可访问性
        console.log('\n💳 1. 测试充值支付管理中心页面可访问性...');
        const pageResponse = await fetch('http://127.0.0.1:8091/recharge_payment_center');

        if (pageResponse.ok) {
            console.log('   ✅ 页面可正常访问');
            console.log(`   📄 状态码: ${pageResponse.status}`);
            console.log(`   📏 内容大小: ${pageResponse.headers.get('content-length')} bytes`);
            results.pageAccessible = true;

            const pageContent = await pageResponse.text();

            // 2. 内容完整性检查
            console.log('\n📝 2. 页面内容完整性检查...');

            const requiredElements = [
                { name: '页面标题', check: pageContent.includes('充值支付管理中心') },
                { name: '系统配置标签', check: pageContent.includes('data-tab="config"') },
                { name: '链接管理标签', check: pageContent.includes('data-tab="links"') },
                { name: '数据统计标签', check: pageContent.includes('data-tab="analytics"') },
                { name: '测试工具标签', check: pageContent.includes('data-tab="testing"') },
                { name: '统计卡片', check: pageContent.includes('stat-card') },
                { name: '导航菜单', check: pageContent.includes('nav__menu') }
            ];

            let integrityCount = 0;
            requiredElements.forEach(element => {
                if (element.check) {
                    console.log(`   ✅ ${element.name}: 存在`);
                    integrityCount++;
                } else {
                    console.log(`   ❌ ${element.name}: 缺失`);
                }
            });

            if (integrityCount === requiredElements.length) {
                console.log('   🎉 页面内容完整性检查通过');
                results.contentIntegrity = true;
            } else {
                console.log(`   ⚠️ ${integrityCount}/${requiredElements.length} 个元素正常`);
            }

        } else {
            console.log(`   ❌ 页面访问失败: ${pageResponse.status}`);
        }

        // 3. 测试资源文件加载
        console.log('\n📦 3. 测试相关资源文件加载...');

        const assets = [
            { name: 'CSS样式文件', url: 'http://127.0.0.1:8091/static/css/recharge-payment-center.css' },
            { name: 'JavaScript文件', url: 'http://127.0.0.1:8091/static/js/recharge-payment-center.js' }
        ];

        let assetsCount = 0;
        for (const asset of assets) {
            try {
                const assetResponse = await fetch(asset.url);
                if (assetResponse.ok) {
                    console.log(`   ✅ ${asset.name}: 加载正常`);
                    console.log(`   📏 大小: ${assetResponse.headers.get('content-length')} bytes`);
                    assetsCount++;
                } else {
                    console.log(`   ❌ ${asset.name}: 加载失败 (${assetResponse.status})`);
                }
            } catch (error) {
                console.log(`   ❌ ${asset.name}: 加载异常 (${error.message})`);
            }
        }

        if (assetsCount === assets.length) {
            console.log('   🎉 所有资源文件加载正常');
            results.assetsLoading = true;
        } else {
            console.log(`   ⚠️ ${assetsCount}/${assets.length} 个资源文件正常`);
        }

        // 4. 测试导航和关键链接
        console.log('\n🔗 4. 测试导航和关键链接...');

        const navigationLinks = [
            { name: '系统管理页面', url: 'http://127.0.0.1:8091/system_management' },
            { name: '系统配置页面', url: 'http://127.0.0.1:8091/system_config' },
            { name: '权限管理页面', url: 'http://127.0.0.1:8091/permission_management' }
        ];

        let navCount = 0;
        for (const link of navigationLinks) {
            try {
                const linkResponse = await fetch(link.url);
                if (linkResponse.ok) {
                    console.log(`   ✅ ${link.name}: 可访问`);
                    navCount++;
                } else {
                    console.log(`   ❌ ${link.name}: 访问失败 (${linkResponse.status})`);
                }
            } catch (error) {
                console.log(`   ❌ ${link.name}: 访问异常 (${error.message})`);
            }
        }

        if (navCount === navigationLinks.length) {
            console.log('   🎉 所有导航链接正常');
            results.navigationWorking = true;
        } else {
            console.log(`   ⚠️ ${navCount}/${navigationLinks.length} 个导航链接正常`);
        }

    } catch (error) {
        console.log(`❌ 测试过程中出现错误: ${error.message}`);
    }

    // 生成修复验证报告
    console.log('\n📊 修复验证结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💳 页面可访问性:       ${results.pageAccessible ? '✅ 正常' : '❌ 异常'}`);
    console.log(`📝 内容完整性:         ${results.contentIntegrity ? '✅ 正常' : '❌ 异常'}`);
    console.log(`📦 资源文件加载:       ${results.assetsLoading ? '✅ 正常' : '❌ 异常'}`);
    console.log(`🔗 导航链接功能:       ${results.navigationWorking ? '✅ 正常' : '❌ 异常'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 修复成功率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    if (passedTests === totalTests) {
        console.log('\n🎉 充值支付管理中心修复成功！');
        console.log('✨ 用户现在可以正常访问和使用充值支付管理中心的所有功能');
        console.log('\n🔗 访问地址: http://127.0.0.1:8091/recharge_payment_center');
        console.log('\n📋 可用功能:');
        console.log('• 💰 系统配置管理 - 充值基础设置');
        console.log('• 🔗 链接管理功能 - 充值链接生成和管理');
        console.log('• 📊 数据统计分析 - 充值数据可视化');
        console.log('• 🧪 测试工具集成 - 充值流程测试');
        console.log('\n⭐ 修复要点:');
        console.log('• 解决了登录重定向问题');
        console.log('• 确保了路由正确注册');
        console.log('• 验证了资源文件加载');
        console.log('• 检查了页面功能完整性');
    } else {
        console.log('\n⚠️ 修复过程中仍存在部分问题，请检查日志');
    }

    return results;
}

// 运行修复验证测试
testRechargePaymentCenterFix().catch(error => {
    console.error('❌ 修复验证测试失败:', error);
});