// Playwright 深度布局调试脚本
const { chromium } = require('playwright');

async function deepLayoutDebug() {
    console.log('🎭 启动Playwright深度布局调试...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 访问页面
        console.log('📄 访问充值支付管理中心页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');

        // 等待页面完全加载
        await page.waitForTimeout(3000);

        // 1. 检查统计卡片容器
        console.log('\n🔍 1. 分析统计卡片容器...');

        const statsRowInfo = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            if (!statsRow) return { error: '未找到.stats-row元素' };

            const computedStyle = window.getComputedStyle(statsRow);
            const rect = statsRow.getBoundingClientRect();

            return {
                // 布局属性
                display: computedStyle.display,
                flexDirection: computedStyle.flexDirection,
                flexWrap: computedStyle.flexWrap,
                justifyContent: computedStyle.justifyContent,
                alignItems: computedStyle.alignItems,
                gap: computedStyle.gap,

                // 尺寸属性
                width: rect.width,
                height: rect.height,
                computedWidth: computedStyle.width,
                computedMaxWidth: computedStyle.maxWidth,
                computedMinWidth: computedStyle.minWidth,

                // 间距属性
                margin: computedStyle.margin,
                padding: computedStyle.padding,

                // 位置属性
                position: computedStyle.position,
                top: rect.top,
                left: rect.left,

                // 其他重要属性
                overflow: computedStyle.overflow,
                boxSizing: computedStyle.boxSizing
            };
        });

        console.log('📊 统计容器分析结果:');
        console.log(JSON.stringify(statsRowInfo, null, 2));

        // 2. 检查统计卡片详情
        console.log('\n🎯 2. 分析统计卡片详情...');

        const cardDetails = await page.evaluate(() => {
            const statCards = document.querySelectorAll('.stat-card');
            const cards = [];

            statCards.forEach((card, index) => {
                const computedStyle = window.getComputedStyle(card);
                const rect = card.getBoundingClientRect();

                cards.push({
                    index: index + 1,
                    // 布局属性
                    display: computedStyle.display,
                    flex: computedStyle.flex,
                    flexBasis: computedStyle.flexBasis,
                    flexGrow: computedStyle.flexGrow,
                    flexShrink: computedStyle.flexShrink,

                    // 尺寸
                    width: rect.width,
                    height: rect.height,
                    computedWidth: computedStyle.width,
                    computedMinWidth: computedStyle.minWidth,
                    computedMaxWidth: computedStyle.maxWidth,

                    // 间距
                    margin: computedStyle.margin,
                    padding: computedStyle.padding,

                    // 位置
                    top: rect.top,
                    left: rect.left,

                    // 边框和背景
                    border: computedStyle.border,
                    background: computedStyle.background,
                    borderRadius: computedStyle.borderRadius,
                    boxShadow: computedStyle.boxShadow
                });
            });

            return cards;
        });

        console.log('📋 统计卡片详细分析:');
        cardDetails.forEach(card => {
            console.log(`\n卡片 ${card.index}:`);
            console.log(`  尺寸: ${card.width.toFixed(2)}x${card.height.toFixed(2)}`);
            console.log(`  位置: (${card.left.toFixed(2)}, ${card.top.toFixed(2)})`);
            console.log(`  flex: ${card.flex}`);
            console.log(`  min-width: ${card.computedMinWidth}`);
            console.log(`  max-width: ${card.computedMaxWidth}`);
            console.log(`  margin: ${card.margin}`);
        });

        // 3. 检查父容器层次结构
        console.log('\n👨‍👦 3. 分析父容器层次结构...');

        const parentHierarchy = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            if (!statsRow) return [];

            const hierarchy = [];
            let current = statsRow.parentElement;
            let level = 1;

            while (current && current !== document.body && level <= 5) {
                const computedStyle = window.getComputedStyle(current);
                const rect = current.getBoundingClientRect();

                hierarchy.push({
                    level,
                    tagName: current.tagName,
                    className: current.className,
                    display: computedStyle.display,
                    width: rect.width,
                    computedWidth: computedStyle.width,
                    computedMaxWidth: computedStyle.maxWidth,
                    overflow: computedStyle.overflow,
                    position: computedStyle.position
                });

                current = current.parentElement;
                level++;
            }

            return hierarchy;
        });

        console.log('🏗️ 父容器层次结构:');
        parentHierarchy.forEach(parent => {
            console.log(`  级别 ${parent.level}: ${parent.tagName}.${parent.className}`);
            console.log(`    display: ${parent.display}, width: ${parent.width.toFixed(2)}px`);
            console.log(`    max-width: ${parent.computedMaxWidth}`);
        });

        // 4. 检查CSS规则应用情况
        console.log('\n📜 4. 检查CSS规则应用情况...');

        const cssRules = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            if (!statsRow) return [];

            const rules = [];
            const stylesheets = Array.from(document.styleSheets);

            stylesheets.forEach((stylesheet, sheetIndex) => {
                try {
                    const cssRules = Array.from(stylesheet.cssRules || []);
                    cssRules.forEach((rule, ruleIndex) => {
                        if (rule.selectorText && rule.selectorText.includes('.stats-row')) {
                            rules.push({
                                sheetIndex,
                                ruleIndex,
                                selector: rule.selectorText,
                                cssText: rule.cssText,
                                href: stylesheet.href
                            });
                        }
                    });
                } catch (e) {
                    // 跨域CSS规则访问限制
                }
            });

            return rules;
        });

        console.log('📋 应用的CSS规则:');
        cssRules.forEach((rule, index) => {
            console.log(`  规则 ${index + 1}:`);
            console.log(`    选择器: ${rule.selector}`);
            console.log(`    来源: ${rule.href ? rule.href.split('/').pop() : '内联样式'}`);
            console.log(`    内容: ${rule.cssText.substring(0, 100)}...`);
        });

        // 5. 截图记录当前状态
        console.log('\n📸 5. 截图记录当前布局状态...');

        await page.screenshot({
            path: 'debug/playwright-layout-debug-full.png',
            fullPage: true
        });

        // 只截取统计卡片区域
        const statsRowElement = await page.locator('.stats-row');
        await statsRowElement.screenshot({
            path: 'debug/playwright-layout-debug-stats.png'
        });

        console.log('✅ 截图已保存到 debug/ 目录');

        // 6. 布局问题诊断
        console.log('\n🔍 6. 布局问题诊断...');

        const diagnosis = await page.evaluate(() => {
            const statsRow = document.querySelector('.stats-row');
            const statCards = document.querySelectorAll('.stat-card');

            if (!statsRow || statCards.length === 0) {
                return { error: '元素不存在' };
            }

            const containerRect = statsRow.getBoundingClientRect();
            const containerStyle = window.getComputedStyle(statsRow);

            // 计算卡片布局
            let totalCardWidth = 0;
            let maxCardHeight = 0;
            const cardPositions = [];

            statCards.forEach((card, index) => {
                const rect = card.getBoundingClientRect();
                totalCardWidth += rect.width;
                maxCardHeight = Math.max(maxCardHeight, rect.height);

                cardPositions.push({
                    index,
                    x: rect.left - containerRect.left,
                    y: rect.top - containerRect.top,
                    width: rect.width,
                    height: rect.height
                });
            });

            // 诊断问题
            const issues = [];

            // 检查容器宽度
            if (containerRect.width < totalCardWidth) {
                issues.push({
                    type: 'width_constraint',
                    message: `容器宽度 ${containerRect.width.toFixed(2)}px 小于卡片总宽度 ${totalCardWidth.toFixed(2)}px`
                });
            }

            // 检查卡片排列
            const firstRowCards = cardPositions.filter(card => card.y < maxCardHeight / 2);
            const secondRowCards = cardPositions.filter(card => card.y >= maxCardHeight / 2);

            if (firstRowCards.length !== 2 || secondRowCards.length !== 2) {
                issues.push({
                    type: 'layout_arrangement',
                    message: `卡片排列不符合2x2预期: 第一行 ${firstRowCards.length} 个, 第二行 ${secondRowCards.length} 个`
                });
            }

            // 检查间距
            if (firstRowCards.length === 2) {
                const gap = firstRowCards[1].x - (firstRowCards[0].x + firstRowCards[0].width);
                if (gap < 10 || gap > 50) {
                    issues.push({
                        type: 'spacing_issue',
                        message: `卡片间距异常: ${gap.toFixed(2)}px`
                    });
                }
            }

            return {
                containerSize: { width: containerRect.width, height: containerRect.height },
                cardCount: statCards.length,
                totalCardWidth,
                maxCardHeight,
                cardPositions,
                issues,
                flexDirection: containerStyle.flexDirection,
                justifyContent: containerStyle.justifyContent,
                gap: containerStyle.gap
            };
        });

        console.log('🔍 布局诊断结果:');
        console.log(JSON.stringify(diagnosis, null, 2));

        // 7. 生成修复建议
        console.log('\n💡 7. 生成修复建议...');

        if (diagnosis.issues && diagnosis.issues.length > 0) {
            console.log('❌ 发现以下问题:');
            diagnosis.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.type}: ${issue.message}`);
            });

            console.log('\n🔧 修复建议:');

            if (diagnosis.issues.some(issue => issue.type === 'width_constraint')) {
                console.log('  • 调整容器宽度或卡片最大宽度');
                console.log('  • 使用更灵活的flex-basis设置');
            }

            if (diagnosis.issues.some(issue => issue.type === 'layout_arrangement')) {
                console.log('  • 检查flex-wrap设置');
                console.log('  • 调整卡片的flex属性');
            }

            if (diagnosis.issues.some(issue => issue.type === 'spacing_issue')) {
                console.log('  • 调整gap或margin设置');
                console.log('  • 使用justify-content: space-between');
            }
        } else {
            console.log('✅ 布局基本正常，可能需要微调样式');
        }

        // 等待用户查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 调试过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行调试
deepLayoutDebug().catch(console.error);