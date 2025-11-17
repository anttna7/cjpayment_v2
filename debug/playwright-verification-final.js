// Playwright 最终修复验证脚本
const { chromium } = require('playwright');

async function finalLayoutVerification() {
    console.log('🎭 启动Playwright最终修复验证...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问修复后的页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 验证容器尺寸改善
        console.log('\n📐 1. 验证容器尺寸改善...');

        const containerInfo = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            if (!statsRow) return { error: '容器未找到' };

            const rect = statsRow.getBoundingClientRect();
            const style = window.getComputedStyle(statsRow);

            return {
                width: rect.width,
                height: rect.height,
                maxWidth: style.maxWidth,
                gap: style.gap,
                justifyContent: style.justifyContent,
                padding: style.padding
            };
        });

        console.log('📊 容器信息:', containerInfo);

        // 2. 验证卡片布局优化
        console.log('\n🎯 2. 验证卡片布局优化...');

        const cardLayout = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const containerRect = document.querySelector('.stats-row').getBoundingClientRect();

            const cards = Array.from(statCards).map((card, index) => {
                const rect = card.getBoundingClientRect();
                const style = window.getComputedStyle(card);

                return {
                    index: index + 1,
                    width: rect.width,
                    height: rect.height,
                    left: rect.left - containerRect.left,
                    top: rect.top - containerRect.top,
                    flex: style.flex,
                    minWidth: style.minWidth,
                    maxWidth: style.maxWidth,
                    margin: style.margin
                };
            });

            // 分析布局质量
            const firstRow = cards.filter(card => card.top < 60);
            const secondRow = cards.filter(card => card.top >= 60);

            let gapBetweenCards = 0;
            if (firstRow.length >= 2) {
                gapBetweenCards = firstRow[1].left - (firstRow[0].left + firstRow[0].width);
            }

            return {
                cards,
                firstRowCount: firstRow.length,
                secondRowCount: secondRow.length,
                gapBetweenCards,
                isLayoutOptimal: firstRow.length === 2 && secondRow.length === 2 && gapBetweenCards > 10
            };
        });

        console.log('📋 卡片布局分析:');
        console.log(`  第一行卡片: ${cardLayout.firstRowCount} 个`);
        console.log(`  第二行卡片: ${cardLayout.secondRowCount} 个`);
        console.log(`  卡片间距: ${cardLayout.gapBetweenCards.toFixed(2)}px`);
        console.log(`  布局是否优化: ${cardLayout.isLayoutOptimal ? '✅ 是' : '❌ 否'}`);

        // 3. 视觉质量检查
        console.log('\n🎨 3. 视觉质量检查...');

        const visualQuality = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (!statsRow || statCards.length === 0) {
                return { error: '元素未找到' };
            }

            const containerStyle = window.getComputedStyle(statsRow);
            const firstCardStyle = window.getComputedStyle(statCards[0]);

            return {
                containerBackground: containerStyle.background,
                containerBorderRadius: containerStyle.borderRadius,
                containerBoxShadow: containerStyle.boxShadow,
                cardBackground: firstCardStyle.background,
                cardBorderRadius: firstCardStyle.borderRadius,
                cardBoxShadow: firstCardStyle.boxShadow,
                cardTransition: firstCardStyle.transition
            };
        });

        console.log('🎨 视觉效果检查:');
        console.log(`  容器背景: ${visualQuality.containerBackground ? '✅ 有' : '❌ 无'}`);
        console.log(`  容器圆角: ${visualQuality.containerBorderRadius}`);
        console.log(`  卡片阴影: ${visualQuality.cardBoxShadow ? '✅ 有' : '❌ 无'}`);
        console.log(`  过渡效果: ${visualQuality.cardTransition ? '✅ 有' : '❌ 无'}`);

        // 4. 响应式测试
        console.log('\n📱 4. 响应式测试...');

        // 测试平板尺寸
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);

        const tabletLayout = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (!statsRow) return { error: '容器未找到' };

            const containerStyle = window.getComputedStyle(statsRow);
            const rect = statsRow.getBoundingClientRect();

            return {
                flexDirection: containerStyle.flexDirection,
                containerWidth: rect.width,
                cardCount: statCards.length
            };
        });

        console.log('📱 平板布局 (768px):');
        console.log(`  flex-direction: ${tabletLayout.flexDirection}`);
        console.log(`  容器宽度: ${tabletLayout.containerWidth?.toFixed(2)}px`);

        // 测试手机尺寸
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000);

        const mobileLayout = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (!statsRow) return { error: '容器未找到' };

            const containerStyle = window.getComputedStyle(statsRow);
            const rect = statsRow.getBoundingClientRect();

            // 检查卡片是否垂直排列
            const cardPositions = Array.from(statCards).map(card => {
                const cardRect = card.getBoundingClientRect();
                return {
                    top: cardRect.top - rect.top,
                    width: cardRect.width
                };
            });

            const isVerticalLayout = cardPositions.every((card, index) => {
                if (index === 0) return true;
                return card.top > cardPositions[index - 1].top + 50; // 垂直间距大于50px
            });

            return {
                flexDirection: containerStyle.flexDirection,
                containerWidth: rect.width,
                isVerticalLayout,
                cardCount: statCards.length
            };
        });

        console.log('📱 手机布局 (375px):');
        console.log(`  flex-direction: ${mobileLayout.flexDirection}`);
        console.log(`  容器宽度: ${mobileLayout.containerWidth?.toFixed(2)}px`);
        console.log(`  垂直排列: ${mobileLayout.isVerticalLayout ? '✅ 是' : '❌ 否'}`);

        // 恢复桌面尺寸
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(1000);

        // 5. 截图对比
        console.log('\n📸 5. 截图记录优化后效果...');

        await page.screenshot({
            path: 'debug/playwright-layout-optimized-full.png',
            fullPage: true
        });

        const statsRowElement = await page.locator('.stats-row');
        await statsRowElement.screenshot({
            path: 'debug/playwright-layout-optimized-stats.png'
        });

        console.log('✅ 优化后截图已保存');

        // 6. 生成最终评估
        console.log('\n🏆 6. 最终修复效果评估...');

        const finalScore = {
            layout: cardLayout.isLayoutOptimal ? 1 : 0,
            responsive: (tabletLayout.flexDirection && mobileLayout.isVerticalLayout) ? 1 : 0,
            visual: (visualQuality.cardBoxShadow && visualQuality.containerBorderRadius) ? 1 : 0,
            container: (containerInfo.width > 500) ? 1 : 0
        };

        const totalScore = Object.values(finalScore).reduce((a, b) => a + b, 0);
        const maxScore = Object.keys(finalScore).length;

        console.log('🏆 修复效果评分:');
        console.log(`  布局优化: ${finalScore.layout}/1 ${finalScore.layout ? '✅' : '❌'}`);
        console.log(`  响应式设计: ${finalScore.responsive}/1 ${finalScore.responsive ? '✅' : '❌'}`);
        console.log(`  视觉效果: ${finalScore.visual}/1 ${finalScore.visual ? '✅' : '❌'}`);
        console.log(`  容器优化: ${finalScore.container}/1 ${finalScore.container ? '✅' : '❌'}`);
        console.log(`\n🎯 总分: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

        if (totalScore === maxScore) {
            console.log('\n🎉 布局优化完美成功！');
            console.log('所有指标都达到预期效果。');
        } else if (totalScore >= maxScore * 0.75) {
            console.log('\n✅ 布局优化基本成功！');
            console.log('大部分指标达到预期，仍有小幅改进空间。');
        } else {
            console.log('\n⚠️ 布局仍需进一步优化');
            console.log('建议检查未达标的指标。');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开15秒供查看最终效果...');
        await page.waitForTimeout(15000);

    } catch (error) {
        console.error('❌ 验证过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行最终验证
finalLayoutVerification().catch(console.error);