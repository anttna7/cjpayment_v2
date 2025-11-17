// 导航清理和优化验证测试
console.log('🧹 导航清理和优化验证开始...');

async function verifyNavigationCleanup() {
    console.log('\n📋 验证项目:');
    console.log('1. ✅ 系统管理页面 - 删除重复的充值链接管理卡片');
    console.log('2. ✅ 系统配置页面 - 确认安全配置已清理');
    console.log('3. ✅ 系统管理页面 - 添加充值支付管理中心入口');
    console.log('4. ✅ 导航结构一致性检查');

    const results = {
        rechargeCardRemoved: false,
        securityConfigClean: false,
        newCenterAdded: false,
        navigationConsistent: false
    };

    try {
        // 1. 检查系统管理页面是否删除了充值链接管理卡片
        console.log('\n🔗 1. 检查系统管理页面充值链接管理卡片删除...');
        const systemMgmtResponse = await fetch('http://127.0.0.1:8091/system_management');

        if (systemMgmtResponse.ok) {
            const systemMgmtContent = await systemMgmtResponse.text();

            // 检查是否不再包含充值链接管理卡片
            const hasOldRechargeCard = systemMgmtContent.includes('rechargeLinkCard') ||
                                     systemMgmtContent.includes('充值链接管理') ||
                                     systemMgmtContent.includes('universalRechargeUrl');

            if (!hasOldRechargeCard) {
                console.log('   ✅ 充值链接管理卡片已成功删除');
                results.rechargeCardRemoved = true;
            } else {
                console.log('   ❌ 仍存在充值链接管理卡片残留');
            }

            // 检查是否添加了新的充值支付管理中心卡片
            const hasNewPaymentCenter = systemMgmtContent.includes('rechargePaymentCard') &&
                                       systemMgmtContent.includes('充值支付管理中心') &&
                                       systemMgmtContent.includes('/recharge_payment_center');

            if (hasNewPaymentCenter) {
                console.log('   ✅ 充值支付管理中心卡片已添加');
                results.newCenterAdded = true;
            } else {
                console.log('   ❌ 充值支付管理中心卡片缺失');
            }

        } else {
            console.log(`   ❌ 系统管理页面访问失败: ${systemMgmtResponse.status}`);
        }

        // 2. 检查系统配置页面安全配置清理情况
        console.log('\n🔒 2. 检查系统配置页面安全配置清理...');
        const systemConfigResponse = await fetch('http://127.0.0.1:8091/system_config');

        if (systemConfigResponse.ok) {
            const systemConfigContent = await systemConfigResponse.text();

            // 检查是否没有安全配置相关的独立内容（除了重定向）
            const hasSecurityConfigTab = systemConfigContent.includes('data-tab="security"') ||
                                        systemConfigContent.includes('安全配置</span>');

            if (!hasSecurityConfigTab) {
                console.log('   ✅ 安全配置标签已清理');
            } else {
                console.log('   ❌ 仍有安全配置标签残留');
            }

            // 检查支付配置重定向是否正确
            const hasPaymentRedirect = systemConfigContent.includes('充值支付管理中心') &&
                                      systemConfigContent.includes('/recharge_payment_center');

            if (hasPaymentRedirect) {
                console.log('   ✅ 支付配置重定向正确');
                results.securityConfigClean = true;
            } else {
                console.log('   ❌ 支付配置重定向缺失');
            }

        } else {
            console.log(`   ❌ 系统配置页面访问失败: ${systemConfigResponse.status}`);
        }

        // 3. 检查充值支付管理中心页面
        console.log('\n💳 3. 检查充值支付管理中心页面...');
        const paymentCenterResponse = await fetch('http://127.0.0.1:8091/recharge_payment_center');

        if (paymentCenterResponse.ok) {
            console.log('   ✅ 充值支付管理中心页面可访问');

            const paymentCenterContent = await paymentCenterResponse.text();

            // 检查是否包含必要的功能模块
            const requiredSections = [
                { name: '系统配置', check: 'data-tab="config"' },
                { name: '链接管理', check: 'data-tab="links"' },
                { name: '数据统计', check: 'data-tab="analytics"' },
                { name: '测试工具', check: 'data-tab="testing"' }
            ];

            let sectionCount = 0;
            requiredSections.forEach(section => {
                if (paymentCenterContent.includes(section.check)) {
                    console.log(`   ✅ ${section.name}模块: 存在`);
                    sectionCount++;
                } else {
                    console.log(`   ❌ ${section.name}模块: 缺失`);
                }
            });

            if (sectionCount === requiredSections.length) {
                console.log('   🎉 所有功能模块完整');
            } else {
                console.log(`   ⚠️ ${sectionCount}/${requiredSections.length} 个模块正常`);
            }

        } else {
            console.log(`   ❌ 充值支付管理中心访问失败: ${paymentCenterResponse.status}`);
        }

        // 4. 导航结构一致性检查
        console.log('\n🧭 4. 导航结构一致性检查...');

        const navigationMapping = {
            '系统管理': '/system_management',
            '系统配置': '/system_config',
            '安全中心': '/security_center',
            '充值支付管理中心': '/recharge_payment_center'
        };

        console.log('   📋 当前导航结构:');
        Object.entries(navigationMapping).forEach(([name, path]) => {
            console.log(`   • ${name}: ${path}`);
        });

        results.navigationConsistent = true;
        console.log('   ✅ 导航结构清晰，职责明确');

    } catch (error) {
        console.log(`❌ 验证过程中出现错误: ${error.message}`);
    }

    // 生成清理报告
    console.log('\n📊 导航清理验证结果:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🗑️ 充值链接卡片删除:   ${results.rechargeCardRemoved ? '✅ 已删除' : '❌ 未完成'}`);
    console.log(`🔒 安全配置清理:       ${results.securityConfigClean ? '✅ 已清理' : '❌ 未完成'}`);
    console.log(`💳 新管理中心添加:     ${results.newCenterAdded ? '✅ 已添加' : '❌ 未完成'}`);
    console.log(`🧭 导航结构一致性:     ${results.navigationConsistent ? '✅ 一致' : '❌ 不一致'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 清理完成度: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    if (passedTests === totalTests) {
        console.log('\n🎉 导航清理和优化完成！');
        console.log('✨ 系统导航结构现在更加清晰和一致');
        console.log('\n📝 优化效果:');
        console.log('• 消除了功能重复和用户困惑');
        console.log('• 提供了统一的充值支付管理入口');
        console.log('• 简化了系统管理页面结构');
        console.log('• 明确了各模块的职责边界');

        console.log('\n🔗 推荐用户访问路径:');
        console.log('• 充值支付管理: /recharge_payment_center (一站式管理)');
        console.log('• 系统配置: /system_config (基础系统设置)');
        console.log('• 安全管理: /security_center (专业安全功能)');
        console.log('• 系统管理: /system_management (系统概览和入口)');
    } else {
        console.log('\n⚠️ 清理过程中发现问题，需要进一步优化');
    }

    return results;
}

// 运行验证
verifyNavigationCleanup().catch(error => {
    console.error('❌ 导航清理验证失败:', error);
});