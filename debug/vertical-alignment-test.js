// 验证stat-card内部元素垂直居中对齐效果
const { chromium } = require('playwright');

async function testVerticalAlignment() {
    console.log('📐 测试stat-card垂直对齐效果...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 分析stat-card整体布局
        console.log('\n📊 1. 分析stat-card整体布局...');

        const cardLayoutAnalysis = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');

            if (!statCards.length) {
                return { error: 'stat-card未找到' };
            }

            return Array.from(statCards).map((card, index) => {
                const cardRect = card.getBoundingClientRect();
                const cardStyle = window.getComputedStyle(card);

                const icon = card.querySelector('.stat-card__icon');
                const content = card.querySelector('.stat-card__content');

                const iconRect = icon ? icon.getBoundingClientRect() : null;
                const contentRect = content ? content.getBoundingClientRect() : null;

                const iconStyle = icon ? window.getComputedStyle(icon) : null;
                const contentStyle = content ? window.getComputedStyle(content) : null;

                return {
                    cardIndex: index + 1,
                    card: {
                        height: cardRect.height,
                        centerY: cardRect.top + cardRect.height / 2,
                        display: cardStyle.display,
                        alignItems: cardStyle.alignItems,
                        justifyContent: cardStyle.justifyContent
                    },
                    icon: iconRect ? {
                        height: iconRect.height,
                        centerY: iconRect.top + iconRect.height / 2,
                        alignSelf: iconStyle.alignSelf,
                        display: iconStyle.display,
                        alignItems: iconStyle.alignItems,
                        justifyContent: iconStyle.justifyContent
                    } : null,
                    content: contentRect ? {
                        height: contentRect.height,
                        centerY: contentRect.top + contentRect.height / 2,
                        alignSelf: contentStyle.alignSelf,
                        display: contentStyle.display,
                        justifyContent: contentStyle.justifyContent
                    } : null
                };
            });
        });

        console.log('📊 卡片布局分析:');
        if (cardLayoutAnalysis.error) {
            console.log(`  ❌ 错误: ${cardLayoutAnalysis.error}`);
        } else {
            cardLayoutAnalysis.forEach(analysis => {
                console.log(`  卡片${analysis.cardIndex}:`);
                console.log(`    卡片高度: ${analysis.card?.height?.toFixed(2)}px`);
                console.log(`    卡片中心Y: ${analysis.card?.centerY?.toFixed(2)}px`);
                console.log(`    卡片布局: display=${analysis.card?.display}, align-items=${analysis.card?.alignItems}`);

                if (analysis.icon) {
                    console.log(`    Icon中心Y: ${analysis.icon.centerY?.toFixed(2)}px`);
                    console.log(`    Icon布局: display=${analysis.icon.display}, align-items=${analysis.icon.alignItems}`);
                }

                if (analysis.content) {
                    console.log(`    Content中心Y: ${analysis.content.centerY?.toFixed(2)}px`);
                    console.log(`    Content布局: display=${analysis.content.display}, justify-content=${analysis.content.justifyContent}`);
                }
            });
        }

        // 2. 检查垂直对齐精度
        console.log('\n🎯 2. 检查垂直对齐精度...');

        const alignmentCheck = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');

            if (!statCards.length) return { error: 'stat-card未找到' };

            const alignmentResults = Array.from(statCards).map((card, index) => {
                const cardRect = card.getBoundingClientRect();
                const cardCenterY = cardRect.top + cardRect.height / 2;

                const icon = card.querySelector('.stat-card__icon');
                const content = card.querySelector('.stat-card__content');

                const iconRect = icon ? icon.getBoundingClientRect() : null;
                const contentRect = content ? content.getBoundingClientRect() : null;

                const iconCenterY = iconRect ? iconRect.top + iconRect.height / 2 : null;
                const contentCenterY = contentRect ? contentRect.top + contentRect.height / 2 : null;

                // 计算偏移量（理想情况下应该接近0）
                const iconOffset = iconCenterY ? Math.abs(iconCenterY - cardCenterY) : null;
                const contentOffset = contentCenterY ? Math.abs(contentCenterY - cardCenterY) : null;

                // 对齐判断（偏移小于2px认为是良好对齐）
                const iconAligned = iconOffset !== null ? iconOffset < 2 : false;
                const contentAligned = contentOffset !== null ? contentOffset < 2 : false;

                return {
                    cardIndex: index + 1,
                    cardCenterY,
                    iconCenterY,
                    contentCenterY,
                    iconOffset,
                    contentOffset,
                    iconAligned,
                    contentAligned,
                    perfectAlignment: iconAligned && contentAligned
                };
            });

            const overallAlignment = alignmentResults.every(result => result.perfectAlignment);

            return {
                alignmentResults,
                overallAlignment
            };
        });

        console.log('🎯 垂直对齐检查:');
        if (alignmentCheck.error) {
            console.log(`  ❌ 错误: ${alignmentCheck.error}`);
        } else {
            alignmentCheck.alignmentResults?.forEach(result => {
                console.log(`  卡片${result.cardIndex}:`);
                console.log(`    卡片中心: ${result.cardCenterY?.toFixed(2)}px`);
                console.log(`    Icon偏移: ${result.iconOffset?.toFixed(2)}px ${result.iconAligned ? '✅' : '❌'}`);
                console.log(`    Content偏移: ${result.contentOffset?.toFixed(2)}px ${result.contentAligned ? '✅' : '❌'}`);
                console.log(`    完美对齐: ${result.perfectAlignment ? '✅ 是' : '❌ 否'}`);
            });

            console.log(`\n🎯 整体对齐: ${alignmentCheck.overallAlignment ? '✅ 完美' : '❌ 需调整'}`);
        }

        // 3. 截图记录对齐效果
        console.log('\n📸 3. 截图记录对齐效果...');

        await page.screenshot({
            path: 'debug/vertical-alignment-after.png',
            fullPage: true
        });

        // 突出显示对齐区域
        await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');

            statCards.forEach((card, index) => {
                // 为卡片添加边框
                card.style.outline = '2px solid blue';
                card.style.position = 'relative';

                const icon = card.querySelector('.stat-card__icon');
                const content = card.querySelector('.stat-card__content');

                // 为icon添加边框
                if (icon) {
                    icon.style.outline = '1px solid red';
                }

                // 为content添加边框
                if (content) {
                    content.style.outline = '1px solid green';
                }

                // 添加中心线辅助
                const centerLine = document.createElement('div');
                centerLine.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: orange;
                    z-index: 1000;
                    transform: translateY(-50%);
                `;
                card.appendChild(centerLine);

                // 添加卡片序号
                const label = document.createElement('div');
                label.textContent = index + 1;
                label.style.cssText = `
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    background: purple;
                    color: white;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: bold;
                    z-index: 1001;
                `;
                card.appendChild(label);
            });
        });

        await page.screenshot({
            path: 'debug/vertical-alignment-highlighted.png',
            fullPage: false
        });

        console.log('✅ 垂直对齐效果截图已保存');

        // 4. 生成对齐评估报告
        console.log('\n🏆 4. 垂直对齐评估报告...');

        if (alignmentCheck.overallAlignment) {
            console.log('🎉 所有卡片元素垂直对齐完美！');
        } else {
            const wellAlignedCount = alignmentCheck.alignmentResults?.filter(r => r.perfectAlignment).length || 0;
            const totalCount = alignmentCheck.alignmentResults?.length || 0;
            console.log(`📊 对齐情况: ${wellAlignedCount}/${totalCount} 卡片完美对齐`);

            if (wellAlignedCount >= totalCount * 0.75) {
                console.log('✅ 大部分卡片对齐良好！');
            } else {
                console.log('⚠️ 需要进一步调整对齐');
            }
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看对齐效果...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 测试过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行垂直对齐测试
testVerticalAlignment().catch(console.error);