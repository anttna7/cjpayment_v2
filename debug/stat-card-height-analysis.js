// 分析stat-card的animate-in-view高度问题
const { chromium } = require('playwright');

async function analyzeStatCardHeight() {
    console.log('📊 分析stat-card高度问题...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(5000); // 等待更长时间确保动画加载

        // 1. 检查stat-card元素和animate-in-view类
        console.log('\n🎯 1. 分析stat-card元素状态...');

        const statCardAnalysis = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const statsRow = document.querySelector('.stats-row');

            if (!statCards.length || !statsRow) {
                return { error: 'stat-card或stats-row元素未找到' };
            }

            const containerRect = statsRow.getBoundingClientRect();
            const containerStyle = window.getComputedStyle(statsRow);

            const cards = Array.from(statCards).map((card, index) => {
                const rect = card.getBoundingClientRect();
                const style = window.getComputedStyle(card);
                const hasAnimateClass = card.classList.contains('animate-in-view');

                return {
                    index: index + 1,
                    hasAnimateClass,
                    dimensions: {
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left
                    },
                    computedStyle: {
                        height: style.height,
                        minHeight: style.minHeight,
                        maxHeight: style.maxHeight,
                        padding: style.padding,
                        margin: style.margin,
                        display: style.display,
                        flexBasis: style.flexBasis,
                        flexGrow: style.flexGrow,
                        flexShrink: style.flexShrink
                    },
                    classList: Array.from(card.classList)
                };
            });

            return {
                container: {
                    width: containerRect.width,
                    height: containerRect.height,
                    computedHeight: containerStyle.height,
                    minHeight: containerStyle.minHeight,
                    maxHeight: containerStyle.maxHeight
                },
                cardCount: cards.length,
                cards: cards,
                averageCardHeight: cards.reduce((sum, card) => sum + card.dimensions.height, 0) / cards.length
            };
        });

        console.log('🎯 stat-card分析结果:');
        if (statCardAnalysis.error) {
            console.log(`  ❌ 错误: ${statCardAnalysis.error}`);
            return;
        }

        console.log(`  容器高度: ${statCardAnalysis.container?.height?.toFixed(2)}px`);
        console.log(`  卡片数量: ${statCardAnalysis.cardCount}`);
        console.log(`  平均卡片高度: ${statCardAnalysis.averageCardHeight?.toFixed(2)}px`);

        statCardAnalysis.cards?.forEach(card => {
            console.log(`  卡片${card.index}:`);
            console.log(`    animate-in-view类: ${card.hasAnimateClass ? '✅ 有' : '❌ 无'}`);
            console.log(`    尺寸: ${card.dimensions.width.toFixed(2)} x ${card.dimensions.height.toFixed(2)}px`);
            console.log(`    computed高度: ${card.computedStyle.height}`);
            console.log(`    所有类: ${card.classList.join(', ')}`);
        });

        // 2. 检查高度与容器的比例关系
        console.log('\n📐 2. 检查高度比例关系...');

        const heightAnalysis = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const statsRow = document.querySelector('.stats-row');

            if (!statCards.length || !statsRow) return null;

            const containerHeight = statsRow.getBoundingClientRect().height;
            const cardHeights = Array.from(statCards).map(card => card.getBoundingClientRect().height);
            const maxCardHeight = Math.max(...cardHeights);
            const minCardHeight = Math.min(...cardHeights);

            const heightRatio = maxCardHeight / containerHeight;
            const isHeightAppropriate = heightRatio <= 0.6; // 卡片高度应该是容器的60%以下

            return {
                containerHeight,
                cardHeights,
                maxCardHeight,
                minCardHeight,
                heightRatio,
                isHeightAppropriate,
                recommendedMaxHeight: containerHeight * 0.5 // 推荐最大高度为容器的50%
            };
        });

        if (heightAnalysis) {
            console.log('📐 高度比例分析:');
            console.log(`  容器高度: ${heightAnalysis.containerHeight.toFixed(2)}px`);
            console.log(`  最大卡片高度: ${heightAnalysis.maxCardHeight.toFixed(2)}px`);
            console.log(`  最小卡片高度: ${heightAnalysis.minCardHeight.toFixed(2)}px`);
            console.log(`  高度比例: ${(heightAnalysis.heightRatio * 100).toFixed(1)}%`);
            console.log(`  高度合适: ${heightAnalysis.isHeightAppropriate ? '✅ 是' : '❌ 否'}`);
            console.log(`  推荐最大高度: ${heightAnalysis.recommendedMaxHeight.toFixed(2)}px`);
        }

        // 3. 截图记录当前状态
        console.log('\n📸 3. 截图记录当前状态...');

        await page.screenshot({
            path: 'debug/stat-card-height-before.png',
            fullPage: true
        });

        // 突出显示stats-row和stat-card
        await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (statsRow) {
                statsRow.style.outline = '3px solid orange';
                statsRow.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
            }

            statCards.forEach((card, index) => {
                card.style.outline = '2px solid blue';
                card.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';

                // 添加序号标识
                const label = document.createElement('div');
                label.textContent = index + 1;
                label.style.cssText = `
                    position: absolute;
                    top: -10px;
                    left: -10px;
                    background: red;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                `;
                card.style.position = 'relative';
                card.appendChild(label);
            });
        });

        await page.screenshot({
            path: 'debug/stat-card-height-highlighted.png',
            fullPage: false
        });

        console.log('✅ 高度分析截图已保存');

        // 4. 生成优化建议
        console.log('\n💡 4. 生成优化建议...');

        if (heightAnalysis && !heightAnalysis.isHeightAppropriate) {
            console.log('🔧 高度优化建议:');
            console.log(`  1. 将卡片最大高度限制为 ${heightAnalysis.recommendedMaxHeight.toFixed(0)}px`);
            console.log('  2. 调整卡片内容的字体大小和间距');
            console.log('  3. 优化卡片的padding和margin');
            console.log('  4. 确保animate-in-view动画不影响最终高度');
        } else {
            console.log('✅ 当前卡片高度比例合理');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 分析过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行分析
analyzeStatCardHeight().catch(console.error);