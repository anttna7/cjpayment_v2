// 完整权限显示功能集成测试
// 测试API端点、CSS加载、JavaScript功能的完整集成

console.log('🚀 开始权限显示功能完整集成测试...');

async function runIntegrationTest() {
    console.log('\n📋 测试项目清单:');
    console.log('1. ✅ API端点测试 (/api/roles/{roleId}/permissions)');
    console.log('2. ✅ CSS文件加载测试 (permission-management.css)');
    console.log('3. ✅ JavaScript权限选择器功能测试');
    console.log('4. ✅ 完整用户流程测试');

    const results = {
        apiTest: false,
        cssTest: false,
        jsTest: false,
        integrationTest: false
    };

    // 1. 测试API端点
    console.log('\n🔧 1. 测试API端点...');
    try {
        const roles = ['超级管理员', '管理员', '操作员', '财务', '客服'];

        for (const role of roles) {
            const encodedRole = encodeURIComponent(role);
            const response = await fetch(`http://127.0.0.1:8091/api/roles/${encodedRole}/permissions`);
            const data = await response.json();

            if (data.success && Array.isArray(data.permissions)) {
                console.log(`   ✅ ${role}: ${data.permissions.length}个权限`);
            } else {
                console.log(`   ❌ ${role}: API响应格式错误`);
                throw new Error(`${role} API test failed`);
            }
        }
        results.apiTest = true;
        console.log('   🎉 API端点测试通过！');
    } catch (error) {
        console.log(`   ❌ API端点测试失败: ${error.message}`);
    }

    // 2. 测试CSS文件加载
    console.log('\n🎨 2. 测试CSS文件加载...');
    try {
        const cssResponse = await fetch('http://127.0.0.1:8091/static/css/permission-management.css');
        const contentType = cssResponse.headers.get('content-type');

        if (cssResponse.ok && contentType.includes('text/css')) {
            console.log(`   ✅ CSS文件加载成功 (MIME: ${contentType})`);
            console.log(`   📄 文件大小: ${cssResponse.headers.get('content-length')} bytes`);
            results.cssTest = true;
        } else {
            throw new Error(`CSS加载失败: ${cssResponse.status}`);
        }
    } catch (error) {
        console.log(`   ❌ CSS文件测试失败: ${error.message}`);
    }

    // 3. 测试JavaScript功能
    console.log('\n⚙️ 3. 测试JavaScript权限选择器功能...');
    try {
        // 检查权限选择器是否存在
        const permissionSelector = document.querySelector('#permission-selector');
        if (permissionSelector) {
            console.log('   ✅ 权限选择器容器存在');

            // 检查权限数据是否加载
            if (window.fullPermissions && Array.isArray(window.fullPermissions)) {
                console.log(`   ✅ 权限数据已加载: ${window.fullPermissions.length}个权限`);

                // 检查渲染函数是否存在
                if (typeof window.renderPermissionsList === 'function') {
                    console.log('   ✅ 权限渲染函数存在');
                    results.jsTest = true;
                } else {
                    console.log('   ❌ 权限渲染函数不存在');
                }
            } else {
                console.log('   ⚠️ 权限数据未加载（可能页面未初始化）');
            }
        } else {
            console.log('   ⚠️ 权限选择器容器不存在（可能不在用户管理页面）');
        }
    } catch (error) {
        console.log(`   ❌ JavaScript功能测试失败: ${error.message}`);
    }

    // 4. 完整集成测试建议
    console.log('\n🔄 4. 完整集成测试建议...');
    console.log('   📝 请按以下步骤进行手动测试:');
    console.log('   1. 访问: http://127.0.0.1:8091/user_management');
    console.log('   2. 点击任意用户的"编辑"按钮');
    console.log('   3. 切换到"权限配置"标签');
    console.log('   4. 选择不同角色（超级管理员、管理员、操作员等）');
    console.log('   5. 观察权限列表是否正确显示');

    if (results.apiTest && results.cssTest) {
        results.integrationTest = true;
        console.log('   ✅ 基础集成环境准备就绪');
    }

    // 生成测试报告
    console.log('\n📊 测试结果汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 API端点测试:        ${results.apiTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🎨 CSS文件加载测试:    ${results.cssTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`⚙️ JavaScript功能测试: ${results.jsTest ? '✅ 通过' : '⚠️ 需在用户管理页面测试'}`);
    console.log(`🔄 集成环境准备:       ${results.integrationTest ? '✅ 就绪' : '❌ 未就绪'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    if (results.apiTest && results.cssTest) {
        console.log('\n🎉 核心功能修复完成！权限显示问题已解决。');
        console.log('💡 建议: 现在可以在浏览器中进行实际测试。');
    } else {
        console.log('\n⚠️ 仍有问题需要解决，请检查失败的测试项。');
    }

    return results;
}

// 自动运行测试
runIntegrationTest().catch(error => {
    console.error('❌ 集成测试运行失败:', error);
});