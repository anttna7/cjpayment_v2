// 诊断breadcrumb被覆盖的具体问题
const { chromium } = require('playwright');

async function diagnoseBreadcrumbCoverage() {
    console.log('🔍 诊断breadcrumb被覆盖问题...');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📄 访问页面...');
        await page.goto('http://127.0.0.1:8091/recharge_payment_center');
        await page.waitForTimeout(3000);

        // 1. 检查breadcrumb元素的位置和可见性
        console.log('\n🍞 1. 分析breadcrumb元素状态...');

        const breadcrumbAnalysis = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            if (!breadcrumb) return { error: 'breadcrumb元素未找到' };

            const rect = breadcrumb.getBoundingClientRect();
            const style = window.getComputedStyle(breadcrumb);

            // 检查是否在视口内
            const isInViewport = rect.top >= 0 && rect.left >= 0 &&
                               rect.bottom <= window.innerHeight &&
                               rect.right <= window.innerWidth;

            // 检查是否被其他元素覆盖
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const elementAtCenter = document.elementFromPoint(centerX, centerY);
            const isCovered = elementAtCenter !== breadcrumb && !breadcrumb.contains(elementAtCenter);

            return {
                position: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right
                },
                computedStyle: {
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                    position: style.position,
                    overflow: style.overflow
                },
                isInViewport,
                isCovered,
                elementAtCenter: elementAtCenter ? elementAtCenter.tagName + '.' + elementAtCenter.className : null
            };
        });

        console.log('🍞 breadcrumb分析结果:');
        console.log(`  位置: top=${breadcrumbAnalysis.position?.top}, left=${breadcrumbAnalysis.position?.left}`);
        console.log(`  尺寸: ${breadcrumbAnalysis.position?.width} x ${breadcrumbAnalysis.position?.height}`);
        console.log(`  display: ${breadcrumbAnalysis.computedStyle?.display}`);
        console.log(`  visibility: ${breadcrumbAnalysis.computedStyle?.visibility}`);
        console.log(`  opacity: ${breadcrumbAnalysis.computedStyle?.opacity}`);
        console.log(`  z-index: ${breadcrumbAnalysis.computedStyle?.zIndex}`);
        console.log(`  在视口内: ${breadcrumbAnalysis.isInViewport ? '✅ 是' : '❌ 否'}`);
        console.log(`  被覆盖: ${breadcrumbAnalysis.isCovered ? '❌ 是' : '✅ 否'}`);
        if (breadcrumbAnalysis.elementAtCenter) {
            console.log(`  覆盖元素: ${breadcrumbAnalysis.elementAtCenter}`);
        }

        // 2. 检查可能覆盖breadcrumb的元素
        console.log('\n🔍 2. 查找可能的覆盖元素...');

        const overlappingElements = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            if (!breadcrumb) return [];

            const breadcrumbRect = breadcrumb.getBoundingClientRect();
            const allElements = document.querySelectorAll('*');
            const overlapping = [];

            Array.from(allElements).forEach(element => {
                if (element === breadcrumb || breadcrumb.contains(element)) return;

                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);

                // 检查是否在空间上重叠
                const isOverlapping = !(rect.right <= breadcrumbRect.left ||
                                      rect.left >= breadcrumbRect.right ||
                                      rect.bottom <= breadcrumbRect.top ||
                                      rect.top >= breadcrumbRect.bottom);

                if (isOverlapping && rect.width > 0 && rect.height > 0) {
                    overlapping.push({
                        tagName: element.tagName,
                        className: element.className,
                        id: element.id,
                        zIndex: style.zIndex,
                        position: style.position,
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    });
                }
            });

            return overlapping.sort((a, b) => {
                const zIndexA = a.zIndex === 'auto' ? 0 : parseInt(a.zIndex) || 0;
                const zIndexB = b.zIndex === 'auto' ? 0 : parseInt(b.zIndex) || 0;
                return zIndexB - zIndexA; // 按z-index降序排列
            });
        });

        console.log('🔍 重叠元素分析:');
        overlappingElements.slice(0, 5).forEach((element, index) => {
            console.log(`  ${index + 1}. ${element.tagName}.${element.className}`);
            console.log(`     z-index: ${element.zIndex}, position: ${element.position}`);
            console.log(`     位置: ${element.left.toFixed(2)}, ${element.top.toFixed(2)} (${element.width.toFixed(2)} x ${element.height.toFixed(2)})`);
        });

        // 3. 检查父容器的overflow和定位
        console.log('\n📦 3. 检查容器层次结构...');

        const containerAnalysis = await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            if (!breadcrumb) return [];

            const containers = [];
            let element = breadcrumb.parentElement;

            while (element && element !== document.body) {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();

                containers.push({
                    tagName: element.tagName,
                    className: element.className,
                    id: element.id,
                    position: style.position,
                    overflow: style.overflow,
                    zIndex: style.zIndex,
                    height: rect.height,
                    maxHeight: style.maxHeight
                });

                element = element.parentElement;
            }

            return containers;
        });

        console.log('📦 容器层次结构:');
        containerAnalysis.forEach((container, index) => {
            console.log(`  ${index + 1}. ${container.tagName}.${container.className}`);
            console.log(`     position: ${container.position}, overflow: ${container.overflow}`);
            console.log(`     z-index: ${container.zIndex}, height: ${container.height.toFixed(2)}`);
        });

        // 4. 截图保存当前状态
        console.log('\n📸 4. 截图保存诊断状态...');

        await page.screenshot({
            path: 'debug/breadcrumb-coverage-diagnosis.png',
            fullPage: true
        });

        // 突出显示breadcrumb区域
        await page.evaluate(() => {
            const breadcrumb = document.querySelector('.breadcrumb');
            if (breadcrumb) {
                breadcrumb.style.outline = '3px solid red';
                breadcrumb.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            }
        });

        await page.screenshot({
            path: 'debug/breadcrumb-highlighted.png',
            fullPage: false
        });

        console.log('✅ 诊断完成，截图已保存');

        // 5. 生成修复建议
        console.log('\n💡 5. 生成修复建议...');

        if (breadcrumbAnalysis.isCovered) {
            console.log('🔧 建议修复方案:');
            console.log('  1. 增加breadcrumb的z-index值');
            console.log('  2. 检查覆盖元素的定位和z-index');
            console.log('  3. 调整页面布局，避免元素重叠');
        } else if (!breadcrumbAnalysis.isInViewport) {
            console.log('🔧 建议修复方案:');
            console.log('  1. 调整breadcrumb的位置使其在视口内');
            console.log('  2. 检查容器的overflow属性');
            console.log('  3. 调整页面滚动或布局');
        } else {
            console.log('✅ breadcrumb在技术上是可见的，可能是样式或内容问题');
        }

        // 保持浏览器打开供查看
        console.log('\n⏳ 浏览器将保持打开10秒供查看...');
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error('❌ 诊断过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行诊断
diagnoseBreadcrumbCoverage().catch(console.error);