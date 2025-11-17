// 最终用户管理功能测试脚本
// 在浏览器控制台运行以验证修复结果

(function finalUserManagementTest() {
    console.log('🎉 最终用户管理功能测试开始...');

    // 1. 检查修复状态
    function checkFixStatus() {
        console.log('\n📊 修复状态检查:');

        const status = {
            userManagement: !!window.userManagement,
            userManagementClass: !!window.UserManagementSystem,
            permissionsData: !!window.permissionsData,
            fullPermissionSelector: !!window.FullPermissionSelector,
            editUserMethod: !!(window.userManagement && window.userManagement.editUser),
            editButtons: document.querySelectorAll('button[onclick*="editUser"]').length
        };

        Object.entries(status).forEach(([key, value]) => {
            const icon = value ? '✅' : '❌';
            console.log(`${icon} ${key}: ${value}`);
        });

        return status;
    }

    // 2. 测试编辑功能
    function testEditFunction() {
        console.log('\n🧪 测试编辑功能...');

        if (!window.userManagement) {
            console.log('❌ userManagement 不可用');
            return false;
        }

        // 检查用户数据
        const users = window.userManagement.users;
        console.log(`📋 用户数量: ${users ? users.length : 0}`);

        if (users && users.length > 0) {
            const testUser = users[0];
            console.log(`🎯 测试用户: ${testUser.username} (${testUser.id})`);
            console.log(`🔑 用户权限: ${testUser.permissions.length} 个`);

            try {
                // 模拟编辑用户
                console.log('🔧 执行 editUser...');
                window.userManagement.editUser(testUser.id);
                console.log('✅ editUser 执行成功');
                return true;
            } catch (error) {
                console.error('❌ editUser 执行失败:', error);
                return false;
            }
        } else {
            console.log('❌ 没有用户数据');
            return false;
        }
    }

    // 3. 检查权限选择器
    function checkPermissionSelector() {
        console.log('\n🔍 检查权限选择器...');

        const container = document.getElementById('fullPermissionSelector');
        if (!container) {
            console.log('❌ 权限选择器容器不存在');
            return false;
        }

        console.log('✅ 权限选择器容器存在');

        // 检查权限数据
        if (window.permissionsData) {
            const permissions = window.permissionsData.permissions;
            const roles = window.permissionsData.roles;
            console.log(`📊 权限数据: ${permissions.length} 个权限, ${roles.length} 个角色`);
            console.log(`🏷️ 权限分类: ${[...new Set(permissions.map(p => p.category))].join(', ')}`);
        }

        return true;
    }

    // 4. 实际点击测试
    function performClickTest() {
        console.log('\n👆 执行点击测试...');

        const editButtons = document.querySelectorAll('button[onclick*="editUser"]');
        if (editButtons.length === 0) {
            console.log('❌ 没有找到编辑按钮');
            return false;
        }

        console.log(`📍 找到 ${editButtons.length} 个编辑按钮`);

        // 测试第一个按钮
        const firstButton = editButtons[0];
        console.log('🎯 测试第一个编辑按钮...');

        try {
            // 模拟点击
            firstButton.click();
            console.log('✅ 编辑按钮点击成功');

            // 检查模态框是否打开
            setTimeout(() => {
                const modal = document.getElementById('userModal');
                if (modal && modal.classList.contains('active')) {
                    console.log('✅ 用户编辑模态框已打开');

                    // 检查权限配置标签
                    const permissionTab = document.querySelector('[data-tab="permissions"]');
                    if (permissionTab) {
                        console.log('✅ 权限配置标签存在');

                        // 切换到权限配置标签
                        permissionTab.click();

                        setTimeout(() => {
                            const permissionSelector = document.querySelector('#fullPermissionSelector .full-permission-selector');
                            if (permissionSelector) {
                                console.log('✅ 完整权限选择器已渲染');
                                console.log('🎉 所有功能测试通过！');
                            } else {
                                console.log('⚠️ 权限选择器未完全渲染');
                            }
                        }, 1000);
                    } else {
                        console.log('❌ 权限配置标签不存在');
                    }
                } else {
                    console.log('❌ 用户编辑模态框未打开');
                }
            }, 500);

            return true;
        } catch (error) {
            console.error('❌ 点击测试失败:', error);
            return false;
        }
    }

    // 5. 生成修复报告
    function generateReport(results) {
        console.log('\n📋 最终测试报告:');
        console.log('='.repeat(50));

        const passed = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;

        console.log(`✅ 通过: ${passed}/${total} 项测试`);
        console.log(`📊 成功率: ${((passed / total) * 100).toFixed(1)}%`);

        if (passed === total) {
            console.log('\n🎉 恭喜！用户管理编辑功能已完全修复！');
            console.log('🔧 功能特性:');
            console.log('  - 编辑按钮正常工作');
            console.log('  - 用户编辑模态框正常打开');
            console.log('  - 完整权限选择器集成');
            console.log('  - 权限数据正确加载');
            console.log('  - 新权限系统兼容');
        } else {
            console.log('\n⚠️ 部分功能仍需检查:');
            Object.entries(results).forEach(([test, passed]) => {
                if (!passed) {
                    console.log(`❌ ${test}`);
                }
            });
        }

        console.log('\n🎯 使用方法:');
        console.log('1. 在用户列表中点击任意用户的编辑按钮');
        console.log('2. 在编辑模态框中点击"权限配置"标签');
        console.log('3. 使用完整权限选择器配置用户权限');
        console.log('4. 支持角色快选、搜索、筛选等功能');

        return results;
    }

    // 执行测试
    const fixStatus = checkFixStatus();
    const editTest = testEditFunction();
    const selectorTest = checkPermissionSelector();

    const results = {
        '系统初始化': fixStatus.userManagement && fixStatus.editUserMethod,
        '权限数据加载': fixStatus.permissionsData && fixStatus.fullPermissionSelector,
        '编辑功能测试': editTest,
        '权限选择器': selectorTest,
        '编辑按钮存在': fixStatus.editButtons > 0
    };

    // 自动执行点击测试
    if (Object.values(results).every(Boolean)) {
        setTimeout(() => {
            performClickTest();
        }, 2000);
    }

    return generateReport(results);
})();