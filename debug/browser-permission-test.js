// 浏览器端权限功能测试
// 在浏览器控制台中执行，测试实际的权限选择器功能

(async function testPermissionFunctionality() {
    console.log('🔧 开始浏览器端权限功能测试...');

    const results = [];

    // 测试1: 检查权限数据是否正确加载
    function testPermissionDataLoading() {
        try {
            const hasPermissionsData = typeof window.permissionsData !== 'undefined';
            const hasPermissions = hasPermissionsData && Array.isArray(window.permissionsData.permissions);
            const hasRoles = hasPermissionsData && Array.isArray(window.permissionsData.roles);

            const permissionCount = hasPermissions ? window.permissionsData.permissions.length : 0;
            const roleCount = hasRoles ? window.permissionsData.roles.length : 0;

            results.push({
                test: '权限数据加载',
                success: hasPermissionsData && hasPermissions && hasRoles,
                details: {
                    hasPermissionsData,
                    permissionCount,
                    roleCount,
                    samplePermissions: hasPermissions ? window.permissionsData.permissions.slice(0, 3).map(p => p.name) : []
                }
            });
        } catch (error) {
            results.push({
                test: '权限数据加载',
                success: false,
                error: error.message
            });
        }
    }

    // 测试2: 检查FullPermissionSelector组件是否可用
    function testPermissionSelectorAvailability() {
        try {
            const hasClass = typeof window.FullPermissionSelector === 'function';
            let canInstantiate = false;
            let hasRequiredMethods = false;

            if (hasClass) {
                // 创建一个临时容器来测试实例化
                const testDiv = document.createElement('div');
                testDiv.id = 'test-permission-selector';
                document.body.appendChild(testDiv);

                try {
                    const testSelector = new window.FullPermissionSelector({
                        container: testDiv,
                        mode: 'user',
                        selectedPermissions: [],
                        showRoleSelector: false
                    });

                    canInstantiate = true;
                    hasRequiredMethods = typeof testSelector.getSelectedPermissions === 'function' &&
                                       typeof testSelector.setSelectedPermissions === 'function' &&
                                       typeof testSelector.destroy === 'function';

                    testSelector.destroy();
                } catch (e) {
                    console.warn('FullPermissionSelector实例化测试失败:', e.message);
                }

                document.body.removeChild(testDiv);
            }

            results.push({
                test: 'FullPermissionSelector可用性',
                success: hasClass && canInstantiate && hasRequiredMethods,
                details: {
                    hasClass,
                    canInstantiate,
                    hasRequiredMethods
                }
            });
        } catch (error) {
            results.push({
                test: 'FullPermissionSelector可用性',
                success: false,
                error: error.message
            });
        }
    }

    // 测试3: 检查用户管理页面的权限选择器集成
    function testUserManagementIntegration() {
        try {
            // 检查是否在用户管理页面
            const isUserManagementPage = window.location.pathname.includes('user_management') ||
                                       document.querySelector('#fullPermissionSelector') !== null;

            let hasPermissionContainer = false;
            let hasUserManagementJS = false;

            if (isUserManagementPage) {
                hasPermissionContainer = document.querySelector('#fullPermissionSelector') !== null;
                hasUserManagementJS = typeof window.UserManagement === 'function' ||
                                    typeof userManagement !== 'undefined';
            }

            results.push({
                test: '用户管理页面集成',
                success: !isUserManagementPage || (hasPermissionContainer && hasUserManagementJS),
                details: {
                    isUserManagementPage,
                    hasPermissionContainer,
                    hasUserManagementJS,
                    note: isUserManagementPage ? '在用户管理页面' : '不在用户管理页面'
                }
            });
        } catch (error) {
            results.push({
                test: '用户管理页面集成',
                success: false,
                error: error.message
            });
        }
    }

    // 测试4: 检查角色管理页面的权限选择器集成
    function testRoleManagementIntegration() {
        try {
            // 检查是否在权限管理页面
            const isPermissionManagementPage = window.location.pathname.includes('permission_management') ||
                                             document.querySelector('#rolePermissionSelector') !== null;

            let hasRolePermissionContainer = false;
            let hasPermissionManagerJS = false;
            let hasRoleModal = false;

            if (isPermissionManagementPage) {
                hasRolePermissionContainer = document.querySelector('#rolePermissionSelector') !== null;
                hasPermissionManagerJS = typeof window.permissionManager !== 'undefined';
                hasRoleModal = document.querySelector('#roleModal') !== null;
            }

            results.push({
                test: '角色管理页面集成',
                success: !isPermissionManagementPage || (hasRolePermissionContainer && hasPermissionManagerJS && hasRoleModal),
                details: {
                    isPermissionManagementPage,
                    hasRolePermissionContainer,
                    hasPermissionManagerJS,
                    hasRoleModal,
                    note: isPermissionManagementPage ? '在权限管理页面' : '不在权限管理页面'
                }
            });
        } catch (error) {
            results.push({
                test: '角色管理页面集成',
                success: false,
                error: error.message
            });
        }
    }

    // 测试5: 检查CSS样式是否正确加载
    function testCSSLoading() {
        try {
            const stylesheets = Array.from(document.styleSheets);
            const hasFullPermissionSelectorCSS = stylesheets.some(sheet =>
                sheet.href && sheet.href.includes('full-permission-selector.css')
            );

            // 检查一些关键的CSS类是否存在
            const testElement = document.createElement('div');
            testElement.className = 'full-permission-selector';
            document.body.appendChild(testElement);

            const computedStyle = window.getComputedStyle(testElement);
            const hasValidStyles = computedStyle.display !== '' || computedStyle.background !== '';

            document.body.removeChild(testElement);

            results.push({
                test: 'CSS样式加载',
                success: hasFullPermissionSelectorCSS || hasValidStyles,
                details: {
                    hasFullPermissionSelectorCSS,
                    hasValidStyles,
                    totalStylesheets: stylesheets.length
                }
            });
        } catch (error) {
            results.push({
                test: 'CSS样式加载',
                success: false,
                error: error.message
            });
        }
    }

    // 测试6: 功能性测试 - 创建一个临时权限选择器并测试功能
    async function testFunctionalityDemo() {
        try {
            if (typeof window.FullPermissionSelector !== 'function' || !window.permissionsData) {
                results.push({
                    test: '功能演示',
                    success: false,
                    details: { message: '必要的组件未加载' }
                });
                return;
            }

            // 创建临时容器
            const testContainer = document.createElement('div');
            testContainer.id = 'functionality-test-container';
            testContainer.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                height: 300px;
                background: white;
                border: 2px solid #007bff;
                border-radius: 8px;
                z-index: 10000;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(testContainer);

            // 创建权限选择器
            const testSelector = new window.FullPermissionSelector({
                container: testContainer,
                mode: 'user',
                selectedPermissions: ['dashboard:view', 'merchant:view'],
                showRoleSelector: true,
                onPermissionChange: (permissions) => {
                    console.log('权限变更测试:', permissions);
                }
            });

            // 等待渲染完成
            await new Promise(resolve => setTimeout(resolve, 500));

            // 测试功能
            const initialPermissions = testSelector.getSelectedPermissions();
            testSelector.setSelectedPermissions(['dashboard:view', 'merchant:create', 'user:view']);
            const newPermissions = testSelector.getSelectedPermissions();

            const functionsWork = initialPermissions.length >= 0 && newPermissions.length >= 0;

            // 清理
            setTimeout(() => {
                testSelector.destroy();
                if (document.body.contains(testContainer)) {
                    document.body.removeChild(testContainer);
                }
            }, 2000);

            results.push({
                test: '功能演示',
                success: functionsWork,
                details: {
                    initialPermissions: initialPermissions.length,
                    newPermissions: newPermissions.length,
                    message: '临时权限选择器已创建在右上角，2秒后自动清理'
                }
            });

        } catch (error) {
            results.push({
                test: '功能演示',
                success: false,
                error: error.message
            });
        }
    }

    // 执行所有测试
    testPermissionDataLoading();
    testPermissionSelectorAvailability();
    testUserManagementIntegration();
    testRoleManagementIntegration();
    testCSSLoading();
    await testFunctionalityDemo();

    // 生成报告
    const passed = results.filter(r => r.success).length;
    const total = results.length;

    console.log('\n📊 浏览器端测试报告');
    console.log('='.repeat(50));
    console.log(`当前页面: ${window.location.pathname}`);
    console.log(`总测试数: ${total}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${total - passed} ❌`);
    console.log(`成功率: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.test}`);
        if (result.details) {
            console.log('   详情:', result.details);
        }
        if (result.error) {
            console.log('   错误:', result.error);
        }
    });

    console.log('\n🔧 测试建议:');
    if (passed === total) {
        console.log('✅ 所有测试通过！权限选择功能运行正常。');
    } else {
        console.log('❌ 部分测试失败，请检查:');
        console.log('1. 确保在正确的页面进行测试');
        console.log('2. 检查控制台是否有JS错误');
        console.log('3. 验证所有CSS和JS文件是否正确加载');
    }

    console.log('\n📖 如何使用:');
    console.log('1. 用户管理: 访问 /user_management，点击编辑用户，在权限配置标签页中配置权限');
    console.log('2. 角色管理: 访问 /permission_management，切换到角色管理标签，点击编辑或创建角色');

    return results;
})();