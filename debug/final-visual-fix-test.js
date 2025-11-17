// 最终视觉修复验证脚本
// 请在实际浏览器控制台中运行此脚本

(function finalVisualFixTest() {
    console.log('🔧 最终视觉修复验证开始...');
    console.log('请确保您已经：');
    console.log('1. 刷新了页面 (Ctrl+F5 或 Cmd+Shift+R)');
    console.log('2. 清除了浏览器缓存');
    console.log('3. 点击了用户编辑按钮并切换到权限配置标签');

    // 立即检查和修复
    function immediateFixAndCheck() {
        console.log('\n🔍 立即检查和修复权限显示...');

        // 检查权限选择器
        const selector = window.userManagement?.fullPermissionSelector;
        if (!selector) {
            console.log('❌ 权限选择器不存在');
            return false;
        }

        // 检查关键DOM元素
        const permissionsList = document.getElementById('permissionsList');
        if (!permissionsList) {
            console.log('❌ permissionsList 元素不存在');
            return false;
        }

        console.log('✅ 基础元素检查通过');

        // 强制设置可见性样式
        console.log('🔧 强制设置可见性样式...');

        // 权限列表容器
        permissionsList.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            height: auto !important;
            max-height: none !important;
            min-height: 400px !important;
            overflow: visible !important;
            background: white !important;
            border: 2px solid #007bff !important;
            border-radius: 8px !important;
            padding: 20px !important;
            margin: 10px 0 !important;
        `;

        // 父容器
        const parentContainer = permissionsList.parentElement;
        if (parentContainer) {
            parentContainer.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
                min-height: 500px !important;
                overflow: visible !important;
            `;
        }

        // 祖父容器
        const grandParent = parentContainer?.parentElement;
        if (grandParent) {
            grandParent.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
            `;
        }

        console.log('✅ 样式强制设置完成');

        // 如果内容为空，强制重新渲染
        if (permissionsList.innerHTML.length < 1000) {
            console.log('🔄 检测到内容不足，强制重新渲染...');

            // 手动创建权限HTML
            const manualHTML = `
                <div style="padding: 20px; background: white; border: 2px solid #28a745; border-radius: 8px; margin: 10px 0;">
                    <h3 style="color: #28a745; margin-bottom: 15px;">🔧 强制渲染测试</h3>
                    <p>如果您能看到这段文字，说明DOM元素是可见的。</p>
                    <p>选择器状态:</p>
                    <ul>
                        <li>选中权限数: ${selector.selectedPermissions.size}</li>
                        <li>当前角色: ${selector.selectedRole || '无'}</li>
                        <li>总权限数: ${selector.allPermissions.length}</li>
                    </ul>
                </div>
            `;

            permissionsList.innerHTML = manualHTML;

            setTimeout(() => {
                // 强制调用原始渲染方法
                if (selector.renderPermissionsList) {
                    console.log('🎨 调用原始渲染方法...');
                    selector.renderPermissionsList();
                }
            }, 1000);
        }

        return true;
    }

    // 角色选择测试
    function testRoleSelection() {
        console.log('\n🎭 角色选择测试...');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return;
        }

        console.log(`📋 找到 ${roleOptions.length} 个角色选项`);

        // 如果还没有选择角色，选择第一个
        const selectedRole = document.querySelector('.role-option--selected');
        if (!selectedRole) {
            console.log('🎯 选择第一个角色...');
            roleOptions[0].click();

            setTimeout(() => {
                console.log('⏱️ 角色选择后等待渲染...');
                immediateFixAndCheck();
            }, 1000);
        }
    }

    // 生成可见性报告
    function generateVisibilityReport() {
        console.log('\n📋 可见性诊断报告:');
        console.log('='.repeat(50));

        const permissionsList = document.getElementById('permissionsList');
        if (!permissionsList) {
            console.log('❌ permissionsList 元素不存在');
            return;
        }

        const computedStyle = window.getComputedStyle(permissionsList);
        const rect = permissionsList.getBoundingClientRect();

        console.log('🎨 CSS 样式:');
        console.log(`  - display: ${computedStyle.display}`);
        console.log(`  - visibility: ${computedStyle.visibility}`);
        console.log(`  - opacity: ${computedStyle.opacity}`);
        console.log(`  - position: ${computedStyle.position}`);
        console.log(`  - z-index: ${computedStyle.zIndex}`);
        console.log(`  - width: ${computedStyle.width}`);
        console.log(`  - height: ${computedStyle.height}`);
        console.log(`  - max-height: ${computedStyle.maxHeight}`);
        console.log(`  - overflow: ${computedStyle.overflow}`);

        console.log('📐 位置信息:');
        console.log(`  - 左上角: (${rect.left}, ${rect.top})`);
        console.log(`  - 尺寸: ${rect.width} x ${rect.height}`);
        console.log(`  - 在视口内: ${rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth}`);

        console.log('📝 内容信息:');
        console.log(`  - innerHTML长度: ${permissionsList.innerHTML.length}`);
        console.log(`  - 子元素数量: ${permissionsList.children.length}`);
        console.log(`  - 文本内容长度: ${permissionsList.textContent.length}`);

        const checkboxes = permissionsList.querySelectorAll('.permission-checkbox');
        const checkedBoxes = permissionsList.querySelectorAll('.permission-checkbox:checked');

        console.log('🔘 复选框信息:');
        console.log(`  - 总复选框数: ${checkboxes.length}`);
        console.log(`  - 选中复选框数: ${checkedBoxes.length}`);

        if (checkboxes.length > 0) {
            console.log('✅ 权限列表已正确渲染');
            if (checkedBoxes.length > 0) {
                console.log('✅ 权限选中状态正确显示');

                // 显示前几个选中的权限
                const selectedPermissions = Array.from(checkedBoxes).slice(0, 5).map(cb => {
                    const permissionName = cb.closest('.permission-item')?.querySelector('.permission-name')?.textContent;
                    return permissionName || cb.dataset.permissionId;
                });
                console.log('📋 选中的权限示例:', selectedPermissions.join(', '));
            } else {
                console.log('⚠️ 权限未显示为选中状态');
            }
        } else {
            console.log('❌ 权限列表未正确渲染');
        }

        return {
            hasContent: permissionsList.innerHTML.length > 1000,
            isVisible: computedStyle.visibility === 'visible' && computedStyle.display !== 'none',
            hasCheckboxes: checkboxes.length > 0,
            hasCheckedBoxes: checkedBoxes.length > 0,
            inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
        };
    }

    // 创建手动测试按钮
    function createTestButton() {
        const existingButton = document.getElementById('manualTestButton');
        if (existingButton) {
            existingButton.remove();
        }

        const button = document.createElement('button');
        button.id = 'manualTestButton';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        button.textContent = '🔧 强制修复权限显示';
        button.onclick = () => {
            immediateFixAndCheck();
            setTimeout(generateVisibilityReport, 500);
        };

        document.body.appendChild(button);
        console.log('🔘 已创建手动测试按钮（右上角）');
    }

    // 执行修复流程
    console.log('🚀 开始执行最终视觉修复...');

    // 立即执行修复
    const fixSuccess = immediateFixAndCheck();

    if (fixSuccess) {
        // 延迟执行其他检查
        setTimeout(testRoleSelection, 1000);
        setTimeout(generateVisibilityReport, 2000);
        setTimeout(createTestButton, 500);

        console.log('\n✅ 修复流程已启动');
        console.log('📋 接下来的步骤:');
        console.log('1. 等待2秒查看诊断报告');
        console.log('2. 如果权限仍不可见，点击右上角的修复按钮');
        console.log('3. 尝试选择不同的角色测试');
    } else {
        console.log('\n❌ 修复流程启动失败');
        console.log('请确保您在正确的页面上并已切换到权限配置标签');
    }

    return {
        fixAttempted: fixSuccess,
        timestamp: new Date().toISOString()
    };
})();