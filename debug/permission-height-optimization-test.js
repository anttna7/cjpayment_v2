// 权限选择器高度优化测试脚本
// 在浏览器控制台运行以验证高度优化效果

(function permissionHeightOptimizationTest() {
    console.log('📏 权限选择器高度优化测试开始...');

    // 1. 检查模态框尺寸
    function checkModalDimensions() {
        console.log('\n🖼️ 模态框尺寸检查:');

        const modal = document.getElementById('userModal');
        if (!modal) {
            console.log('❌ 用户模态框不存在');
            return null;
        }

        const modalContent = modal.querySelector('.modal__content');
        const modalBody = modal.querySelector('.modal__body');

        if (!modalContent || !modalBody) {
            console.log('❌ 模态框内容元素不存在');
            return null;
        }

        const contentStyle = window.getComputedStyle(modalContent);
        const bodyStyle = window.getComputedStyle(modalBody);

        const dimensions = {
            modalWidth: contentStyle.width,
            modalMaxHeight: contentStyle.maxHeight,
            modalMinHeight: contentStyle.minHeight,
            bodyMaxHeight: bodyStyle.maxHeight,
            viewportHeight: window.innerHeight
        };

        console.log('📐 模态框尺寸:');
        console.log(`  - 宽度: ${dimensions.modalWidth}`);
        console.log(`  - 最大高度: ${dimensions.modalMaxHeight}`);
        console.log(`  - 最小高度: ${dimensions.modalMinHeight}`);
        console.log(`  - 内容区最大高度: ${dimensions.bodyMaxHeight}`);
        console.log(`  - 视口高度: ${dimensions.viewportHeight}px`);

        return dimensions;
    }

    // 2. 检查权限选择器尺寸
    function checkPermissionSelectorDimensions() {
        console.log('\n🔐 权限选择器尺寸检查:');

        const container = document.querySelector('#fullPermissionSelector');
        const selector = document.querySelector('.full-permission-selector');
        const listContainer = document.querySelector('.permission-list-container');

        if (!container || !selector || !listContainer) {
            console.log('❌ 权限选择器元素不存在');
            return null;
        }

        const containerStyle = window.getComputedStyle(container);
        const selectorStyle = window.getComputedStyle(selector);
        const listStyle = window.getComputedStyle(listContainer);

        const dimensions = {
            containerMinHeight: containerStyle.minHeight,
            containerMaxHeight: containerStyle.maxHeight,
            selectorMinHeight: selectorStyle.minHeight,
            selectorMaxHeight: selectorStyle.maxHeight,
            listMinHeight: listStyle.minHeight,
            listMaxHeight: listStyle.maxHeight,
            actualHeight: container.offsetHeight,
            actualListHeight: listContainer.offsetHeight
        };

        console.log('📊 权限选择器尺寸:');
        console.log(`  - 容器最小高度: ${dimensions.containerMinHeight}`);
        console.log(`  - 容器最大高度: ${dimensions.containerMaxHeight}`);
        console.log(`  - 选择器最小高度: ${dimensions.selectorMinHeight}`);
        console.log(`  - 选择器最大高度: ${dimensions.selectorMaxHeight}`);
        console.log(`  - 列表最小高度: ${dimensions.listMinHeight}`);
        console.log(`  - 列表最大高度: ${dimensions.listMaxHeight}`);
        console.log(`  - 实际容器高度: ${dimensions.actualHeight}px`);
        console.log(`  - 实际列表高度: ${dimensions.actualListHeight}px`);

        return dimensions;
    }

    // 3. 检查权限分类展开状态
    function checkCategoryExpansion() {
        console.log('\n📂 权限分类展开状态检查:');

        const categories = document.querySelectorAll('.permission-category');
        const expandedCategories = document.querySelectorAll('.permission-category.category-expanded');

        console.log(`📋 总分类数: ${categories.length}`);
        console.log(`📖 已展开分类: ${expandedCategories.length}`);

        categories.forEach((category, index) => {
            const categoryName = category.querySelector('.category-name')?.textContent || `分类${index + 1}`;
            const isExpanded = category.classList.contains('category-expanded');
            const permissionsCount = category.querySelectorAll('.permission-item').length;
            const categoryPermissions = category.querySelector('.category-permissions');
            const permissionsStyle = categoryPermissions ? window.getComputedStyle(categoryPermissions) : null;

            console.log(`  ${isExpanded ? '📖' : '📁'} ${categoryName}: ${permissionsCount} 个权限`);
            if (permissionsStyle) {
                console.log(`    - 最大高度: ${permissionsStyle.maxHeight}`);
                console.log(`    - 实际高度: ${categoryPermissions.offsetHeight}px`);
            }
        });

        return {
            totalCategories: categories.length,
            expandedCategories: expandedCategories.length,
            expansionRate: (expandedCategories.length / categories.length * 100).toFixed(1)
        };
    }

    // 4. 测试滚动体验
    function testScrollExperience() {
        console.log('\n📜 滚动体验测试:');

        const listContainer = document.querySelector('.permission-list-container');
        if (!listContainer) {
            console.log('❌ 权限列表容器不存在');
            return null;
        }

        const scrollInfo = {
            scrollHeight: listContainer.scrollHeight,
            clientHeight: listContainer.clientHeight,
            scrollableHeight: listContainer.scrollHeight - listContainer.clientHeight,
            isScrollable: listContainer.scrollHeight > listContainer.clientHeight,
            scrollTop: listContainer.scrollTop
        };

        console.log('📏 滚动信息:');
        console.log(`  - 总内容高度: ${scrollInfo.scrollHeight}px`);
        console.log(`  - 可视区域高度: ${scrollInfo.clientHeight}px`);
        console.log(`  - 可滚动高度: ${scrollInfo.scrollableHeight}px`);
        console.log(`  - 是否需要滚动: ${scrollInfo.isScrollable ? '是' : '否'}`);
        console.log(`  - 当前滚动位置: ${scrollInfo.scrollTop}px`);

        // 计算可视比例
        const visibilityRatio = (scrollInfo.clientHeight / scrollInfo.scrollHeight * 100).toFixed(1);
        console.log(`  - 内容可视比例: ${visibilityRatio}%`);

        return scrollInfo;
    }

    // 5. 模拟角色选择测试
    function testRoleSelectionDisplay() {
        console.log('\n🎭 角色选择显示测试:');

        const roleOptions = document.querySelectorAll('.role-option');
        if (roleOptions.length === 0) {
            console.log('❌ 没有找到角色选项');
            return false;
        }

        try {
            console.log('🎯 模拟选择第一个角色...');
            const firstRole = roleOptions[0];
            firstRole.click();

            setTimeout(() => {
                const roleInfo = document.querySelector('.role-info-banner');
                const expandedCategories = document.querySelectorAll('.permission-category.category-expanded');
                const listContainer = document.querySelector('.permission-list-container');

                console.log('📊 角色选择后的状态:');
                console.log(`  - 角色信息横幅: ${roleInfo ? '✅ 已显示' : '❌ 未显示'}`);
                console.log(`  - 展开的分类数: ${expandedCategories.length}`);

                if (listContainer) {
                    const newScrollInfo = {
                        scrollHeight: listContainer.scrollHeight,
                        clientHeight: listContainer.clientHeight,
                        visibilityRatio: (listContainer.clientHeight / listContainer.scrollHeight * 100).toFixed(1)
                    };
                    console.log(`  - 新的内容可视比例: ${newScrollInfo.visibilityRatio}%`);
                }

                if (roleInfo) {
                    const roleText = roleInfo.querySelector('.role-info-text')?.textContent;
                    console.log(`  - 角色信息: ${roleText}`);
                }
            }, 1000);

            return true;
        } catch (error) {
            console.error('❌ 角色选择测试失败:', error);
            return false;
        }
    }

    // 6. 生成优化效果报告
    function generateOptimizationReport(modalDims, selectorDims, categoryInfo, scrollInfo) {
        console.log('\n📋 高度优化效果报告:');
        console.log('='.repeat(60));

        // 高度优化评估
        const optimizations = {
            modalHeightOptimized: modalDims?.modalMinHeight === '600px',
            selectorHeightOptimized: selectorDims?.selectorMinHeight === '550px',
            listHeightOptimized: selectorDims?.listMinHeight === '350px',
            goodVisibilityRatio: scrollInfo && (scrollInfo.clientHeight / scrollInfo.scrollHeight) >= 0.6,
            categoriesExpandable: categoryInfo?.totalCategories > 0
        };

        console.log('🎯 优化效果评估:');
        Object.entries(optimizations).forEach(([key, value]) => {
            const status = value ? '✅' : '❌';
            const description = {
                modalHeightOptimized: '模态框最小高度优化',
                selectorHeightOptimized: '权限选择器高度优化',
                listHeightOptimized: '权限列表高度优化',
                goodVisibilityRatio: '良好的内容可视比例 (≥60%)',
                categoriesExpandable: '权限分类可展开'
            };
            console.log(`${status} ${description[key]}`);
        });

        const passedOptimizations = Object.values(optimizations).filter(Boolean).length;
        const totalOptimizations = Object.keys(optimizations).length;
        const optimizationScore = (passedOptimizations / totalOptimizations * 100).toFixed(1);

        console.log(`\n📊 优化得分: ${optimizationScore}% (${passedOptimizations}/${totalOptimizations})`);

        // 具体改进点
        console.log('\n🚀 已实施的优化:');
        console.log('  ✨ 增加权限选择器容器最小高度至 550px');
        console.log('  📏 设置权限列表最小高度至 350px');
        console.log('  🖼️ 优化模态框高度至 90vh，最小 600px');
        console.log('  📐 权限分类默认展开更多内容 (300px)');
        console.log('  🔄 角色选择后自动展开所有分类');

        // 用户体验改进
        if (scrollInfo) {
            const visibilityRatio = (scrollInfo.clientHeight / scrollInfo.scrollHeight * 100).toFixed(1);
            console.log('\n👀 可视性改进:');
            console.log(`  - 内容可视比例: ${visibilityRatio}%`);

            if (parseFloat(visibilityRatio) >= 60) {
                console.log('  ✅ 优秀的可视比例，减少了滚动需求');
            } else if (parseFloat(visibilityRatio) >= 40) {
                console.log('  ✅ 良好的可视比例，适度的滚动体验');
            } else {
                console.log('  ⚠️ 仍需要较多滚动，建议进一步优化');
            }
        }

        console.log('\n🎉 使用建议:');
        console.log('1. 在权限配置标签中选择角色，查看权限自动展开');
        console.log('2. 利用增加的可视高度，更方便地浏览权限列表');
        console.log('3. 使用搜索功能快速定位特定权限');
        console.log('4. 角色信息横幅提供清晰的选择状态反馈');

        return {
            optimizationScore: parseFloat(optimizationScore),
            optimizations,
            modalDims,
            selectorDims,
            scrollInfo
        };
    }

    // 执行测试
    console.log('🚀 开始执行权限选择器高度优化测试...');

    const modalDimensions = checkModalDimensions();
    const selectorDimensions = checkPermissionSelectorDimensions();
    const categoryInfo = checkCategoryExpansion();
    const scrollExperience = testScrollExperience();

    const report = generateOptimizationReport(
        modalDimensions,
        selectorDimensions,
        categoryInfo,
        scrollExperience
    );

    // 延迟执行角色选择测试
    setTimeout(() => {
        console.log('\n🎭 开始角色选择显示测试...');
        testRoleSelectionDisplay();
    }, 2000);

    return report;
})();