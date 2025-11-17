// 用户管理页面调试脚本
// 在浏览器控制台运行以调试用户管理功能

(function debugUserManagement() {
    console.log('🔧 开始调试用户管理页面...');

    // 1. 检查页面基本状态
    console.log('📍 当前页面:', window.location.href);
    console.log('📄 页面标题:', document.title);

    // 2. 检查必要的依赖是否加载
    const dependencies = [
        { name: 'window.permissionsData', obj: window.permissionsData },
        { name: 'window.FullPermissionSelector', obj: window.FullPermissionSelector },
        { name: 'window.userManagement', obj: window.userManagement },
        { name: 'UserManagementSystem class', obj: window.UserManagementSystem }
    ];

    console.log('\n📦 依赖检查:');
    dependencies.forEach(dep => {
        const status = dep.obj ? '✅' : '❌';
        console.log(`${status} ${dep.name}:`, typeof dep.obj);
    });

    // 3. 检查HTML元素
    const elements = [
        { name: '用户表格容器', selector: '#usersTable' },
        { name: '用户模态框', selector: '#userModal' },
        { name: '权限选择器容器', selector: '#fullPermissionSelector' },
        { name: '编辑按钮', selector: 'button[onclick*="editUser"]' }
    ];

    console.log('\n🎯 HTML元素检查:');
    elements.forEach(elem => {
        const element = document.querySelector(elem.selector);
        const status = element ? '✅' : '❌';
        console.log(`${status} ${elem.name} (${elem.selector}):`, element ? '存在' : '不存在');
    });

    // 4. 检查编辑按钮的点击事件
    const editButtons = document.querySelectorAll('button[onclick*="editUser"]');
    console.log(`\n🔘 编辑按钮数量: ${editButtons.length}`);

    if (editButtons.length > 0) {
        console.log('编辑按钮示例:', editButtons[0].outerHTML);

        // 测试第一个编辑按钮
        console.log('\n🧪 测试编辑按钮点击...');
        try {
            const firstButton = editButtons[0];
            const onclickAttr = firstButton.getAttribute('onclick');
            console.log('onclick属性:', onclickAttr);

            // 尝试手动执行onclick代码
            if (window.userManagement && typeof window.userManagement.editUser === 'function') {
                console.log('✅ userManagement.editUser 方法可用');
            } else {
                console.log('❌ userManagement.editUser 方法不可用');
            }
        } catch (error) {
            console.error('❌ 编辑按钮测试失败:', error);
        }
    }

    // 5. 检查JavaScript错误
    console.log('\n🐛 检查控制台错误...');
    const originalError = console.error;
    const errors = [];
    console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
    };

    setTimeout(() => {
        console.error = originalError;
        if (errors.length > 0) {
            console.log('❌ 发现JavaScript错误:');
            errors.forEach(error => console.log('  -', error));
        } else {
            console.log('✅ 未发现JavaScript错误');
        }
    }, 1000);

    // 6. 尝试手动初始化用户管理系统
    console.log('\n🔄 尝试手动初始化...');
    try {
        if (!window.userManagement && window.UserManagementSystem) {
            console.log('正在手动初始化UserManagementSystem...');
            window.userManagement = new window.UserManagementSystem();
            console.log('✅ 手动初始化成功');
        } else if (window.userManagement) {
            console.log('✅ userManagement 已存在');
        } else {
            console.log('❌ 无法初始化，UserManagementSystem 类不存在');
        }
    } catch (error) {
        console.error('❌ 手动初始化失败:', error);
    }

    // 7. 提供修复建议
    console.log('\n💡 修复建议:');
    console.log('1. 检查浏览器控制台是否有JavaScript错误');
    console.log('2. 确认所有依赖文件是否正确加载');
    console.log('3. 验证DOMContentLoaded事件是否正确触发');
    console.log('4. 如果手动初始化成功，请刷新页面重试');

    // 8. 提供测试命令
    console.log('\n🎯 测试命令:');
    console.log('测试编辑用户: userManagement.editUser("test-user-id")');
    console.log('检查权限选择器: window.FullPermissionSelector');
    console.log('检查权限数据: window.permissionsData.permissions.length');

    return {
        dependencies: dependencies.map(d => ({ name: d.name, available: !!d.obj })),
        elements: elements.map(e => ({ name: e.name, exists: !!document.querySelector(e.selector) })),
        editButtonsCount: editButtons.length,
        userManagementAvailable: !!(window.userManagement && window.userManagement.editUser)
    };
})();