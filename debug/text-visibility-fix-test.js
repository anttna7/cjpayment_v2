// 验证stat-card文字显示修复效果
const { chromium } = require('playwright');

async function testTextVisibilityFix() {
    console.log('📝 测试stat-card文字显示修复效果...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 检查stat-card文字可见性
        console.log('\n📝 1. 检查stat-card文字可见性...');

        const textVisibilityCheck = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');

            if (!statCards.length) {
                return { error: 'stat-card未找到' };
            }

            return Array.from(statCards).map((card, index) => {
                const icon = card.querySelector('.stat-card__icon');
                const content = card.querySelector('.stat-card__content');
                const value = card.querySelector('.stat-card__value');
                const label = card.querySelector('.stat-card__label');

                // 检查元素存在性
                const hasIcon = !!icon;
                const hasContent = !!content;
                const hasValue = !!value;
                const hasLabel = !!label;

                // 检查文字内容
                const valueText = value ? value.textContent?.trim() : '';
                const labelText = label ? label.textContent?.trim() : '';

                // 检查样式可见性
                const valueStyle = value ? window.getComputedStyle(value) : null;
                const labelStyle = label ? window.getComputedStyle(label) : null;

                const valueVisible = valueStyle &&
                    valueStyle.display !== 'none' &&
                    valueStyle.visibility !== 'hidden' &&
                    parseFloat(valueStyle.opacity) > 0;

                const labelVisible = labelStyle &&
                    labelStyle.display !== 'none' &&
                    labelStyle.visibility !== 'hidden' &&
                    parseFloat(labelStyle.opacity) > 0;

                // 检查文字是否有内容且可见
                const hasVisibleText = valueVisible && labelVisible &&
                                     valueText.length > 0 && labelText.length > 0;

                return {
                    cardIndex: index + 1,
                    elements: {
                        hasIcon,
                        hasContent,
                        hasValue,
                        hasLabel
                    },
                    text: {
                        valueText,
                        labelText,
                        hasText: valueText.length > 0 || labelText.length > 0
                    },
                    visibility: {
                        valueVisible,
                        labelVisible,
                        hasVisibleText
                    },
                    styles: {
                        valueDisplay: valueStyle?.display,
                        valueVisibility: valueStyle?.visibility,
                        valueOpacity: valueStyle?.opacity,
                        labelDisplay: labelStyle?.display,
                        labelVisibility: labelStyle?.visibility,
                        labelOpacity: labelStyle?.opacity
                    }
                };
            });
        });

        console.log('📝 文字可见性检查:');
        if (textVisibilityCheck.error) {
            console.log(`  ❌ 错误: ${textVisibilityCheck.error}`);
        } else {
            textVisibilityCheck.forEach(card => {
                console.log(`  卡片${card.cardIndex}:`);
                console.log(`    元素完整: ${Object.values(card.elements).every(Boolean) ? '✅ 是' : '❌ 否'}`);
                console.log(`    Value文字: "${card.text?.valueText}" ${card.visibility?.valueVisible ? '✅ 可见' : '❌ 隐藏'}`);
                console.log(`    Label文字: "${card.text?.labelText}" ${card.visibility?.labelVisible ? '✅ 可见' : '❌ 隐藏'}`);
                console.log(`    整体可见: ${card.visibility?.hasVisibleText ? '✅ 是' : '❌ 否'}`);
            });
        }

        // 2. 检查文字垂直居中效果
        console.log('\n📐 2. 检查文字垂直居中效果...');

        const textAlignmentCheck = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');

            return Array.from(statCards).map((card, index) => {
                const cardRect = card.getBoundingClientRect();
                const content = card.querySelector('.stat-card__content');
                const value = card.querySelector('.stat-card__value');
                const label = card.querySelector('.stat-card__label');

                if (!content || !value || !label) {
                    return { cardIndex: index + 1, error: '文字元素缺失' };
                }

                const contentRect = content.getBoundingClientRect();
                const valueRect = value.getBoundingClientRect();
                const labelRect = label.getBoundingClientRect();

                const cardCenterY = cardRect.top + cardRect.height / 2;
                const contentCenterY = contentRect.top + contentRect.height / 2;

                // 计算content区域相对于卡片的垂直位置
                const contentOffset = Math.abs(contentCenterY - cardCenterY);
                const isContentCentered = contentOffset < 3; // 允许3px误差

                return {
                    cardIndex: index + 1,
                    cardHeight: cardRect.height,
                    contentHeight: contentRect.height,
                    contentCenterY,
                    cardCenterY,
                    contentOffset,
                    isContentCentered,
                    textElements: {
                        valueHeight: valueRect.height,
                        labelHeight: labelRect.height,
                        totalTextHeight: valueRect.height + labelRect.height
                    }
                };
            });
        });

        console.log('📐 文字垂直居中检查:');
        textAlignmentCheck.forEach(result => {
            if (result.error) {
                console.log(`  卡片${result.cardIndex}: ❌ ${result.error}`);
            } else {
                console.log(`  卡片${result.cardIndex}:`);
                console.log(`    卡片高度: ${result.cardHeight?.toFixed(2)}px`);
                console.log(`    Content偏移: ${result.contentOffset?.toFixed(2)}px`);
                console.log(`    垂直居中: ${result.isContentCentered ? '✅ 是' : '❌ 否'}`);
                console.log(`    文字总高度: ${result.textElements?.totalTextHeight?.toFixed(2)}px`);
            }
        });

        // 3. 截图记录修复效果
        console.log('\n📸 3. 截图记录修复效果...');

        await page.screenshot({
            path: 'debug/text-visibility-fixed.png',
            fullPage: true
        });

        // 截取stats区域
        await page.locator('.stats-row').screenshot({
            path: 'debug/text-visibility-stats-area.png'
        });

        console.log('✅ 文字显示修复效果截图已保存');

        // 4. 生成修复效果评估
        console.log('\n🏆 4. 文字显示修复效果评估...');

        const allCardsHaveVisibleText = textVisibilityCheck.every(card => card.visibility?.hasVisibleText);
        const allCardsContentCentered = textAlignmentCheck.every(result => !result.error && result.isContentCentered);

        const fixScore = {
            textVisible: allCardsHaveVisibleText ? 1 : 0,
            textCentered: allCardsContentCentered ? 1 : 0
        };

        const totalScore = Object.values(fixScore).reduce((a, b) => a + b, 0);
        const maxScore = Object.keys(fixScore).length;

        console.log('🏆 修复效果评分:');
        console.log(`  1. 文字可见性: ${fixScore.textVisible}/1 ${fixScore.textVisible ? '✅' : '❌'}`);
        console.log(`  2. 文字垂直居中: ${fixScore.textCentered}/1 ${fixScore.textCentered ? '✅' : '❌'}`);
        console.log(`\n🎯 总分: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

        if (totalScore === maxScore) {
            console.log('\n🎉 文字显示修复完全成功！');
        } else if (totalScore >= maxScore * 0.5) {
            console.log('\n✅ 文字显示修复基本成功！');
        } else {
            console.log('\n⚠️ 文字显示仍需进一步修复');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看修复效果...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 测试过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行文字显示修复测试
testTextVisibilityFix().catch(console.error);