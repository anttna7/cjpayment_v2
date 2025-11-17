// 验证breadcrumb文字修复效果
const { chromium } = require('playwright');

async function testBreadcrumbTextFix() {
    console.log('🔧 测试breadcrumb文字修复效果...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 检查breadcrumb文字显示
        console.log('\n🍞 1. 检查breadcrumb文字显示...');

        const breadcrumbTextInfo = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            const items = breadcrumb?.querySelectorAll('.breadcrumb__item');
            const currentItem = breadcrumb?.querySelector('.breadcrumb__item--current');

            if (!breadcrumb || !items || !currentItem) {
                return { error: 'breadcrumb元素未找到' };
            }

            const breadcrumbRect = breadcrumb.getBoundingClientRect();
            const currentItemRect = currentItem.getBoundingClientRect();
            const breadcrumbStyle = window.getComputedStyle(breadcrumb);
            const currentItemStyle = window.getComputedStyle(currentItem);

            // 获取完整文字内容
            const allText = breadcrumb.textContent.trim();
            const currentText = currentItem.textContent.trim();

            // 检查文字是否被截断
            const isTextTruncated = currentItemStyle.textOverflow === 'ellipsis' &&
                                  currentItemRect.width < currentItem.scrollWidth;

            return {
                breadcrumbDimensions: {
                    width: breadcrumbRect.width,
                    height: breadcrumbRect.height,
                    maxWidth: breadcrumbStyle.maxWidth,
                    minWidth: breadcrumbStyle.minWidth,
                    overflow: breadcrumbStyle.overflow
                },
                currentItemDimensions: {
                    width: currentItemRect.width,
                    scrollWidth: currentItem.scrollWidth,
                    maxWidth: currentItemStyle.maxWidth,
                    overflow: currentItemStyle.overflow,
                    textOverflow: currentItemStyle.textOverflow,
                    whiteSpace: currentItemStyle.whiteSpace
                },
                textContent: {
                    fullText: allText,
                    currentText: currentText,
                    expectedCurrentText: '充值支付管理中心',
                    isComplete: currentText.includes('充值支付管理中心') || currentText.length >= 7
                },
                isTextTruncated
            };
        });

        console.log('🍞 breadcrumb文字分析:');
        if (breadcrumbTextInfo.error) {
            console.log(`  ❌ 错误: ${breadcrumbTextInfo.error}`);
        } else {
            console.log(`  完整文字: "${breadcrumbTextInfo.textContent?.fullText}"`);
            console.log(`  当前项文字: "${breadcrumbTextInfo.textContent?.currentText}"`);
            console.log(`  文字完整: ${breadcrumbTextInfo.textContent?.isComplete ? '✅ 是' : '❌ 否'}`);
            console.log(`  文字截断: ${breadcrumbTextInfo.isTextTruncated ? '❌ 是' : '✅ 否'}`);
            console.log(`  容器宽度: ${breadcrumbTextInfo.breadcrumbDimensions?.width?.toFixed(2)}px`);
            console.log(`  当前项宽度: ${breadcrumbTextInfo.currentItemDimensions?.width?.toFixed(2)}px`);
            console.log(`  滚动宽度: ${breadcrumbTextInfo.currentItemDimensions?.scrollWidth?.toFixed(2)}px`);
        }

        // 2. 截图对比
        console.log('\n📸 2. 截图记录修复后效果...');

        await page.screenshot({
            path: 'debug/breadcrumb-text-fix-after.png',
            fullPage: true
        });

        // 截取页面顶部区域
        await page.locator('.page__header').screenshot({
            path: 'debug/breadcrumb-text-fix-header.png'
        });

        // 3. 突出显示breadcrumb进行对比
        await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            const currentItem = document.querySelector('.breadcrumb__item--current');
            if (breadcrumb) {
                breadcrumb.style.outline = '2px solid green';
                breadcrumb.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            }
            if (currentItem) {
                currentItem.style.outline = '2px solid blue';
                currentItem.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
            }
        });

        await page.screenshot({
            path: 'debug/breadcrumb-text-fix-highlighted.png',
            fullPage: false
        });

        console.log('✅ 修复测试截图已保存');

        // 4. 评估修复效果
        console.log('\n🏆 4. 修复效果评估...');

        const isFixed = breadcrumbTextInfo.textContent?.isComplete && !breadcrumbTextInfo.isTextTruncated;

        if (isFixed) {
            console.log('🎉 breadcrumb文字显示修复成功！');
        } else {
            console.log('⚠️ breadcrumb文字仍有问题，需要进一步调整');

            // 如果仍有问题，提供调试信息
            console.log('🔍 调试信息:');
            console.log(`  最大宽度限制: ${breadcrumbTextInfo.currentItemDimensions?.maxWidth}`);
            console.log(`  溢出处理: ${breadcrumbTextInfo.currentItemDimensions?.overflow}`);
            console.log(`  文字溢出: ${breadcrumbTextInfo.currentItemDimensions?.textOverflow}`);
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

// 运行测试
testBreadcrumbTextFix().catch(console.error);