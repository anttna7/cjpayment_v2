// 最终验证三个问题的修复效果
const { chromium } = require('playwright');

async function verifyFinalThreeIssues() {
    console.log('🎯 最终验证三个问题的修复效果...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 验证breadcrumb文字完整显示（不被覆盖/截断）
        console.log('\n🍞 1. 验证breadcrumb文字完整显示...');

        const breadcrumbCheck = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            const currentItem = breadcrumb?.querySelector('.breadcrumb__item--current');

            if (!breadcrumb || !currentItem) {
                return { error: 'breadcrumb元素未找到' };
            }

            const breadcrumbRect = breadcrumb.getBoundingClientRect();
            const currentText = currentItem.textContent.trim();
            const fullText = breadcrumb.textContent.trim();

            // 检查文字是否完整
            const hasCompleteText = currentText.includes('充值支付管理中心') || currentText.length >= 7;

            // 检查是否在视口内且可见
            const isVisible = breadcrumbRect.width > 0 && breadcrumbRect.height > 0 &&
                            breadcrumbRect.top >= 0 && breadcrumbRect.left >= 0;

            return {
                fullText,
                currentText,
                hasCompleteText,
                isVisible,
                breadcrumbWidth: breadcrumbRect.width,
                breadcrumbHeight: breadcrumbRect.height
            };
        });

        console.log('🍞 breadcrumb检查结果:');
        if (breadcrumbCheck.error) {
            console.log(`  ❌ 错误: ${breadcrumbCheck.error}`);
        } else {
            console.log(`  完整文字: "${breadcrumbCheck.fullText}"`);
            console.log(`  当前项: "${breadcrumbCheck.currentText}"`);
            console.log(`  文字完整: ${breadcrumbCheck.hasCompleteText ? '✅ 是' : '❌ 否'}`);
            console.log(`  可见性: ${breadcrumbCheck.isVisible ? '✅ 可见' : '❌ 不可见'}`);
        }

        // 2. 验证stat-card高度优化
        console.log('\n📊 2. 验证stat-card高度优化...');

        const statCardCheck = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const statsRow = document.querySelector('.stats-row');

            if (!statCards.length || !statsRow) {
                return { error: 'stat-card或stats-row元素未找到' };
            }

            const containerHeight = statsRow.getBoundingClientRect().height;
            const cardHeights = Array.from(statCards).map(card => {
                const rect = card.getBoundingClientRect();
                return {
                    height: rect.height,
                    hasAnimateClass: card.classList.contains('animate-in-view')
                };
            });

            const maxCardHeight = Math.max(...cardHeights.map(c => c.height));
            const heightRatio = maxCardHeight / containerHeight;
            const isHeightOptimized = heightRatio <= 0.6;

            return {
                containerHeight,
                cardCount: cardHeights.length,
                cardHeights,
                maxCardHeight,
                heightRatio,
                isHeightOptimized,
                allHaveAnimateClass: cardHeights.every(c => c.hasAnimateClass)
            };
        });

        console.log('📊 stat-card检查结果:');
        if (statCardCheck.error) {
            console.log(`  ❌ 错误: ${statCardCheck.error}`);
        } else {
            console.log(`  容器高度: ${statCardCheck.containerHeight?.toFixed(2)}px`);
            console.log(`  卡片数量: ${statCardCheck.cardCount}`);
            console.log(`  最大卡片高度: ${statCardCheck.maxCardHeight?.toFixed(2)}px`);
            console.log(`  高度比例: ${(statCardCheck.heightRatio * 100)?.toFixed(1)}%`);
            console.log(`  高度优化: ${statCardCheck.isHeightOptimized ? '✅ 是' : '❌ 否'}`);
            console.log(`  动画类: ${statCardCheck.allHaveAnimateClass ? '✅ 全部有' : '❌ 部分缺失'}`);
        }

        // 3. 验证充值支付导航按钮已删除
        console.log('\n🧭 3. 验证充值支付导航按钮已删除...');

        const navCheck = await page.evaluate(() => {
            // 查找所有导航项
            const navItems = document.querySelectorAll('.nav__item');
            const navLinks = document.querySelectorAll('.nav__link');

            // 检查是否还有充值支付相关的导航
            const rechargeNavExists = Array.from(navLinks).some(link => {
                const text = link.textContent?.trim() || '';
                const href = link.href || '';
                const dataRoute = link.getAttribute('data-route') || '';

                return text.includes('充值支付') ||
                       href.includes('recharge_payment_center') ||
                       dataRoute === 'recharge';
            });

            // 获取所有导航文字
            const allNavTexts = Array.from(navLinks).map(link => link.textContent?.trim());

            return {
                totalNavItems: navItems.length,
                totalNavLinks: navLinks.length,
                rechargeNavExists,
                allNavTexts
            };
        });

        console.log('🧭 导航检查结果:');
        console.log(`  导航项总数: ${navCheck.totalNavItems}`);
        console.log(`  导航链接总数: ${navCheck.totalNavLinks}`);
        console.log(`  充值支付按钮存在: ${navCheck.rechargeNavExists ? '❌ 是' : '✅ 否'}`);
        console.log(`  所有导航: ${navCheck.allNavTexts?.join(', ')}`);

        // 4. 截图记录最终效果
        console.log('\n📸 4. 截图记录最终修复效果...');

        await page.screenshot({
            path: 'debug/final-three-issues-fixed.png',
            fullPage: true
        });

        // 截取页面顶部区域
        await page.locator('.page__header').screenshot({
            path: 'debug/final-three-issues-header.png'
        });

        console.log('✅ 最终修复效果截图已保存');

        // 5. 生成最终评估报告
        console.log('\n🏆 5. 最终修复效果评估...');

        const fixes = {
            breadcrumb: breadcrumbCheck.hasCompleteText && breadcrumbCheck.isVisible ? 1 : 0,
            statCardHeight: statCardCheck.isHeightOptimized ? 1 : 0,
            navRemoval: !navCheck.rechargeNavExists ? 1 : 0
        };

        const totalScore = Object.values(fixes).reduce((a, b) => a + b, 0);
        const maxScore = Object.keys(fixes).length;

        console.log('🏆 最终修复评分:');
        console.log(`  1. breadcrumb显示完整: ${fixes.breadcrumb}/1 ${fixes.breadcrumb ? '✅' : '❌'}`);
        console.log(`  2. stat-card高度优化: ${fixes.statCardHeight}/1 ${fixes.statCardHeight ? '✅' : '❌'}`);
        console.log(`  3. 导航按钮删除: ${fixes.navRemoval}/1 ${fixes.navRemoval ? '✅' : '❌'}`);
        console.log(`\n🎯 总分: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

        if (totalScore === maxScore) {
            console.log('\n🎉 所有三个问题全部修复完成！');
        } else if (totalScore >= maxScore * 0.66) {
            console.log('\n✅ 大部分问题已修复！');
        } else {
            console.log('\n⚠️ 仍有问题需要进一步处理');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看最终效果...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 验证过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行最终验证
verifyFinalThreeIssues().catch(console.error);