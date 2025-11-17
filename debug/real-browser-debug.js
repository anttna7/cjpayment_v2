// 真实浏览器环境权限显示调试脚本
// 在实际浏览器的控制台中运行，找出与Playwright环境的差异

(function realBrowserDebug() {
    console.log('🔍 真实浏览器环境权限显示调试开始...');

    // 立即检查当前页面状态
    function immediateCheck() {
        console.log('📊 立即检查当前页面状态:');

        const checks = {
            userManagement: !!window.userManagement,
            fullPermissionSelector: !!(window.userManagement?.fullPermissionSelector),
            permissionsData: !!window.permissionsData,
            permissionsList: !!document.getElementById('permissionsList'),
            permissionContainer: !!document.querySelector('.permission-list-container'),
            roleOptions: document.querySelectorAll('.role-option').length,
            userModal: !!document.getElementById('userModal'),
            modalVisible: document.getElementById('userModal')?.style.display !== 'none'
        };

        Object.entries(checks).forEach(([key, value]) => {
            console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
        });

        return checks;
    }

    // 检查CSS样式问题
    function checkCSSIssues() {
        console.log('\n🎨 检查CSS样式问题:');

        const permissionsList = document.getElementById('permissionsList');
        if (!permissionsList) {
            console.log('❌ permissionsList 元素不存在');
            return;
        }

        const computedStyle = window.getComputedStyle(permissionsList);
        const parentStyle = window.getComputedStyle(permissionsList.parentElement);

        console.log('📏 permissionsList 样式:');
        console.log(`  - display: ${computedStyle.display}`);
        console.log(`  - visibility: ${computedStyle.visibility}`);
        console.log(`  - opacity: ${computedStyle.opacity}`);
        console.log(`  - position: ${computedStyle.position}`);
        console.log(`  - z-index: ${computedStyle.zIndex}`);
        console.log(`  - width: ${computedStyle.width}`);
        console.log(`  - height: ${computedStyle.height}`);
        console.log(`  - overflow: ${computedStyle.overflow}`);

        console.log('📏 父容器样式:');
        console.log(`  - display: ${parentStyle.display}`);
        console.log(`  - visibility: ${parentStyle.visibility}`);
        console.log(`  - height: ${parentStyle.height}`);
        console.log(`  - max-height: ${parentStyle.maxHeight}`);

        // 检查是否被其他元素遮挡
        const rect = permissionsList.getBoundingClientRect();
        console.log('📐 位置信息:');
        console.log(`  - 位置: ${rect.left}, ${rect.top}`);
        console.log(`  - 尺寸: ${rect.width} x ${rect.height}`);
        console.log(`  - 是否在视口内: ${rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth}`);

        // 检查内容
        console.log('📝 内容检查:');
        console.log(`  - innerHTML长度: ${permissionsList.innerHTML.length}`);
        console.log(`  - 子元素数量: ${permissionsList.children.length}`);

        if (permissionsList.innerHTML.length === 0) {
            console.log('⚠️ permissionsList 内容为空');
        }
    }

    // 强制重新渲染测试
    function forceRerenderTest() {
        console.log('\n🔧 强制重新渲染测试:');

        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器不存在');
            return;
        }

        console.log('🔄 执行强制重新渲染...');

        // 记录渲染前状态
        const beforeRender = {
            selectedPermissions: selector.selectedPermissions.size,
            currentRole: selector.selectedRole,
            listContent: document.getElementById('permissionsList')?.innerHTML.length || 0
        };

        console.log('📊 渲染前状态:', beforeRender);

        // 强制重新渲染
        try {
            selector.renderPermissionsList();

            setTimeout(() => {
                const afterRender = {
                    selectedPermissions: selector.selectedPermissions.size,
                    currentRole: selector.selectedRole,
                    listContent: document.getElementById('permissionsList')?.innerHTML.length || 0,
                    checkboxes: document.querySelectorAll('.permission-checkbox').length,
                    checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length
                };

                console.log('📈 渲染后状态:', afterRender);

                if (afterRender.listContent > beforeRender.listContent) {
                    console.log('✅ 重新渲染生效');
                } else {
                    console.log('❌ 重新渲染没有效果');
                }
            }, 500);

        } catch (error) {
            console.error('❌ 强制渲染失败:', error);
        }
    }

    // 模拟角色选择测试
    function simulateRoleSelectionInRealBrowser() {
        console.log('\n🎭 模拟角色选择测试:');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return;
        }

        console.log(`📋 找到 ${roleOptions.length} 个角色选项`);

        // 选择第一个角色
        const firstRole = roleOptions[0];
        const roleId = firstRole.dataset.roleId;
        const roleName = firstRole.querySelector('.role-name')?.textContent;

        console.log(`🎯 选择角色: ${roleName} (${roleId})`);

        // 记录选择前状态
        const beforeSelection = {
            checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
            selectedItems: document.querySelectorAll('.permission-item--selected').length,
            listContent: document.getElementById('permissionsList')?.innerHTML.length || 0
        };

        console.log('📊 选择前状态:', beforeSelection);

        // 点击角色
        firstRole.click();

        // 等待后检查状态
        setTimeout(() => {
            const afterSelection = {
                checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
                selectedItems: document.querySelectorAll('.permission-item--selected').length,
                listContent: document.getElementById('permissionsList')?.innerHTML.length || 0,
                roleInfo: !!document.querySelector('.role-info-banner')
            };

            console.log('📈 选择后状态:', afterSelection);

            const success = afterSelection.checkedBoxes > 0 && afterSelection.listContent > beforeSelection.listContent;

            if (success) {
                console.log('✅ 角色选择测试成功');
            } else {
                console.log('❌ 角色选择测试失败');

                // 详细诊断
                console.log('🔍 失败原因分析:');
                if (afterSelection.listContent === beforeSelection.listContent) {
                    console.log('  - 权限列表内容没有变化');
                }
                if (afterSelection.checkedBoxes === 0) {
                    console.log('  - 没有权限被选中');
                }

                // 检查权限选择器状态
                const selector = window.userManagement?.fullPermissionSelector;
                if (selector) {
                    console.log('🔍 权限选择器内部状态:');
                    console.log(`  - selectedPermissions: ${selector.selectedPermissions.size}`);
                    console.log(`  - selectedRole: ${selector.selectedRole}`);
                    console.log(`  - filteredPermissions: ${selector.filteredPermissions.length}`);
                }
            }
        }, 2000);
    }

    // 检查版本问题
    function checkVersionIssues() {
        console.log('\n📦 检查版本和缓存问题:');

        // 检查script标签的版本
        const scripts = Array.from(document.querySelectorAll('script[src*="full-permission-selector"]'));
        scripts.forEach(script => {
            console.log(`📄 脚本版本: ${script.src}`);
        });

        // 检查是否是缓存问题
        const timestamp = Date.now();
        console.log(`🕒 当前时间戳: ${timestamp}`);

        // 检查CSS版本
        const cssLinks = Array.from(document.querySelectorAll('link[href*="full-permission-selector"]'));
        cssLinks.forEach(link => {
            console.log(`🎨 CSS版本: ${link.href}`);
        });
    }

    // 生成对比报告
    function generateComparisonReport() {
        console.log('\n📋 真实浏览器 vs Playwright 对比报告:');
        console.log('='.repeat(60));

        const currentState = {
            permissionsList: !!document.getElementById('permissionsList'),
            checkboxes: document.querySelectorAll('.permission-checkbox').length,
            checkedBoxes: document.querySelectorAll('.permission-checkbox:checked').length,
            categories: document.querySelectorAll('.permission-category').length,
            roleInfo: !!document.querySelector('.role-info-banner'),
            selectorState: window.userManagement?.fullPermissionSelector ? {
                selectedPermissions: window.userManagement.fullPermissionSelector.selectedPermissions.size,
                selectedRole: window.userManagement.fullPermissionSelector.selectedRole
            } : null
        };

        console.log('🌐 真实浏览器状态:');
        Object.entries(currentState).forEach(([key, value]) => {
            console.log(`  - ${key}: ${JSON.stringify(value)}`);
        });

        console.log('\n🎭 Playwright测试结果 (参考):');
        console.log('  - permissionsList: true');
        console.log('  - checkboxes: 42');
        console.log('  - checkedBoxes: 42');
        console.log('  - categories: 7');
        console.log('  - roleInfo: true');

        console.log('\n🔍 差异分析:');
        const expectedCheckboxes = 42;
        const expectedCheckedBoxes = 42;

        if (currentState.checkboxes < expectedCheckboxes) {
            console.log(`❌ 权限复选框数量不足: 期望${expectedCheckboxes}, 实际${currentState.checkboxes}`);
        }
        if (currentState.checkedBoxes < expectedCheckedBoxes) {
            console.log(`❌ 选中权限数量不足: 期望${expectedCheckedBoxes}, 实际${currentState.checkedBoxes}`);
        }
        if (!currentState.roleInfo) {
            console.log('❌ 角色信息横幅未显示');
        }

        return currentState;
    }

    // 执行所有检查
    console.log('🚀 开始执行真实浏览器环境调试...');

    const initialState = immediateCheck();

    if (initialState.permissionsList) {
        checkCSSIssues();
    }

    checkVersionIssues();

    setTimeout(() => {
        forceRerenderTest();
    }, 1000);

    setTimeout(() => {
        simulateRoleSelectionInRealBrowser();
    }, 3000);

    setTimeout(() => {
        generateComparisonReport();
    }, 6000);

    return {
        debugStarted: true,
        initialState,
        message: '调试已开始，请等待6秒查看完整结果'
    };
})();