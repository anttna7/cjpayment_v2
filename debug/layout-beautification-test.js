// 验证页面美化效果：删除breadcrumb + 优化卡片高度
const { chromium } = require('playwright');

async function testLayoutBeautification() {
    console.log('🎨 测试页面美化效果...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 验证breadcrumb已删除
        console.log('\n🗑️ 1. 验证breadcrumb已删除...');

        const breadcrumbCheck = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            const pageHeader = document.querySelector('.page__header');

            return {
                breadcrumbExists: !!breadcrumb,
                pageHeaderExists: !!pageHeader,
                pageHeaderChildren: pageHeader ? Array.from(pageHeader.children).map(child => child.className) : []
            };
        });

        console.log('🗑️ breadcrumb删除检查:');
        console.log(`  breadcrumb存在: ${breadcrumbCheck.breadcrumbExists ? '❌ 是' : '✅ 否'}`);
        console.log(`  page__header存在: ${breadcrumbCheck.pageHeaderExists ? '✅ 是' : '❌ 否'}`);
        console.log(`  header子元素: ${breadcrumbCheck.pageHeaderChildren.join(', ')}`);

        // 2. 检查页面布局的整体高度比例
        console.log('\n📐 2. 检查页面布局高度比例...');

        const layoutCheck = await page.evaluate(() => {
            const titleSection = document.querySelector('.page__title-section');
            const statsRow = document.querySelector('.stats-row');

            if (!titleSection || !statsRow) {
                return { error: '关键元素未找到' };
            }

            const titleRect = titleSection.getBoundingClientRect();
            const statsRect = statsRow.getBoundingClientRect();

            return {
                titleSection: {
                    height: titleRect.height,
                    top: titleRect.top
                },
                statsRow: {
                    height: statsRect.height,
                    top: statsRect.top
                },
                heightConsistent: Math.abs(titleRect.height - statsRect.height) < 10,
                verticalSpacing: statsRect.top - (titleRect.top + titleRect.height)
            };
        });

        console.log('📐 布局高度检查:');
        if (layoutCheck.error) {
            console.log(`  ❌ 错误: ${layoutCheck.error}`);
        } else {
            console.log(`  title-section高度: ${layoutCheck.titleSection?.height?.toFixed(2)}px`);
            console.log(`  stats-row高度: ${layoutCheck.statsRow?.height?.toFixed(2)}px`);
            console.log(`  高度一致: ${layoutCheck.heightConsistent ? '✅ 是' : '❌ 否'}`);
            console.log(`  垂直间距: ${layoutCheck.verticalSpacing?.toFixed(2)}px`);
        }

        // 3. 检查stat-card的优化效果
        console.log('\n🎯 3. 检查stat-card美观度优化...');

        const cardCheck = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const statsRow = document.querySelector('.stats-row');

            if (!statCards.length || !statsRow) {
                return { error: 'stat-card或stats-row未找到' };
            }

            const containerRect = statsRow.getBoundingClientRect();

            const cards = Array.from(statCards).map((card, index) => {
                const rect = card.getBoundingClientRect();
                const style = window.getComputedStyle(card);

                return {
                    index: index + 1,
                    dimensions: {
                        width: rect.width,
                        height: rect.height
                    },
                    style: {
                        padding: style.padding,
                        borderRadius: style.borderRadius,
                        boxShadow: style.boxShadow,
                        background: style.background
                    }
                };
            });

            const avgCardHeight = cards.reduce((sum, card) => sum + card.dimensions.height, 0) / cards.length;
            const heightRatio = avgCardHeight / containerRect.height;

            // 检查是否美观（高度比例合理，不会太扁）
            const isBeautiful = heightRatio >= 0.35 && heightRatio <= 0.5; // 35%-50%的高度比例比较美观

            return {
                containerHeight: containerRect.height,
                cardCount: cards.length,
                cards: cards,
                avgCardHeight,
                heightRatio,
                isBeautiful
            };
        });

        console.log('🎯 stat-card美观度检查:');
        if (cardCheck.error) {
            console.log(`  ❌ 错误: ${cardCheck.error}`);
        } else {
            console.log(`  容器高度: ${cardCheck.containerHeight?.toFixed(2)}px`);
            console.log(`  卡片数量: ${cardCheck.cardCount}`);
            console.log(`  平均卡片高度: ${cardCheck.avgCardHeight?.toFixed(2)}px`);
            console.log(`  高度比例: ${(cardCheck.heightRatio * 100)?.toFixed(1)}%`);
            console.log(`  美观度: ${cardCheck.isBeautiful ? '✅ 美观' : '❌ 需调整'}`);

            cardCheck.cards?.forEach(card => {
                console.log(`  卡片${card.index}: ${card.dimensions.width.toFixed(2)} x ${card.dimensions.height.toFixed(2)}px`);
            });
        }

        // 4. 截图对比效果
        console.log('\n📸 4. 截图记录美化效果...');

        await page.screenshot({
            path: 'debug/layout-beautified-full.png',
            fullPage: true
        });

        // 截取页面顶部区域
        await page.locator('.page__header').screenshot({
            path: 'debug/layout-beautified-header.png'
        });

        // 突出显示优化区域
        await page.evaluate(() => {
            const titleSection = document.querySelector('.page__title-section');
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (titleSection) {
                titleSection.style.outline = '2px solid green';
                titleSection.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            }

            if (statsRow) {
                statsRow.style.outline = '2px solid blue';
                statsRow.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
            }

            statCards.forEach((card, index) => {
                card.style.outline = '1px solid orange';
                card.style.position = 'relative';

                // 添加卡片序号
                const label = document.createElement('div');
                label.textContent = index + 1;
                label.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: red;
                    color: white;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                `;
                card.appendChild(label);
            });
        });

        await page.screenshot({
            path: 'debug/layout-beautified-highlighted.png',
            fullPage: false
        });

        console.log('✅ 美化效果截图已保存');

        // 5. 生成美化评估报告
        console.log('\n🏆 5. 美化效果评估...');

        const beautificationScore = {
            breadcrumbRemoved: !breadcrumbCheck.breadcrumbExists ? 1 : 0,
            heightConsistent: layoutCheck.heightConsistent ? 1 : 0,
            cardBeautiful: cardCheck.isBeautiful ? 1 : 0
        };

        const totalScore = Object.values(beautificationScore).reduce((a, b) => a + b, 0);
        const maxScore = Object.keys(beautificationScore).length;

        console.log('🏆 美化效果评分:');
        console.log(`  1. breadcrumb删除: ${beautificationScore.breadcrumbRemoved}/1 ${beautificationScore.breadcrumbRemoved ? '✅' : '❌'}`);
        console.log(`  2. 高度一致性: ${beautificationScore.heightConsistent}/1 ${beautificationScore.heightConsistent ? '✅' : '❌'}`);
        console.log(`  3. 卡片美观度: ${beautificationScore.cardBeautiful}/1 ${beautificationScore.cardBeautiful ? '✅' : '❌'}`);
        console.log(`\n🎯 总分: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

        if (totalScore === maxScore) {
            console.log('\n🎉 页面美化完全成功！');
        } else if (totalScore >= maxScore * 0.66) {
            console.log('\n✅ 页面美化基本成功！');
        } else {
            console.log('\n⚠️ 页面美化需要进一步调整');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看美化效果...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 测试过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行美化测试
testLayoutBeautification().catch(console.error);