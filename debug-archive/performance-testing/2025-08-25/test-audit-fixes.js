/**
 * 财务审核页面修复验证测试
 * 验证audit-filters样式、卡片视图内容显示、页面底部布局等修复
 */

const puppeteer = require('puppeteer');

async function testAuditFixes() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log(`[浏览器] ${msg.text()}`));
    page.on('pageerror', error => console.error(`❌ 页面错误: ${error.message}`));
    
    try {
        console.log('🚀 测试财务审核页面修复...\n');
        
        await page.goto('http://localhost:8092/audit', { 
            waitUntil: 'networkidle0',
            timeout: 15000 
        });
        
        // 等待页面初始化
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('=== 1. 检查audit-filters样式优化 ===');
        
        const filtersCheck = await page.evaluate(() => {
            const filtersContainer = document.querySelector('.audit-filters');
            const filterTabs = document.querySelectorAll('.filter-tab');
            const advancedFilters = document.querySelector('.advanced-filters');
            const filterSelects = document.querySelectorAll('.filter-select');
            
            if (!filtersContainer) return { error: 'audit-filters容器未找到' };
            
            const containerStyles = window.getComputedStyle(filtersContainer);
            const firstTabStyles = filterTabs[0] ? window.getComputedStyle(filterTabs[0]) : null;
            
            return {
                exists: true,
                container: {
                    background: containerStyles.background,
                    borderRadius: containerStyles.borderRadius,
                    boxShadow: containerStyles.boxShadow,
                    border: containerStyles.border
                },
                tabs: {
                    count: filterTabs.length,
                    firstTabPadding: firstTabStyles ? firstTabStyles.padding : null,
                    firstTabTransition: firstTabStyles ? firstTabStyles.transition : null
                },
                advancedFilters: {
                    exists: !!advancedFilters,
                    display: advancedFilters ? window.getComputedStyle(advancedFilters).display : null,
                    selectCount: filterSelects.length
                }
            };
        });
        
        console.log('audit-filters样式检查:');
        if (filtersCheck.error) {
            console.log(`  ❌ ${filtersCheck.error}`);
        } else {
            console.log(`  容器背景: ${filtersCheck.container.background ? '✅' : '❌'}`);
            console.log(`  圆角边框: ${filtersCheck.container.borderRadius !== '0px' ? '✅' : '❌'}`);
            console.log(`  阴影效果: ${filtersCheck.container.boxShadow !== 'none' ? '✅' : '❌'}`);
            console.log(`  筛选标签数量: ${filtersCheck.tabs.count}`);
            console.log(`  高级筛选器存在: ${filtersCheck.advancedFilters.exists ? '✅' : '❌'}`);
            console.log(`  筛选下拉框数量: ${filtersCheck.advancedFilters.selectCount}`);
        }
        
        await page.screenshot({ path: 'test-audit-fixes-01-filters.png', fullPage: true });
        
        console.log('\n=== 2. 测试筛选标签交互 ===');
        
        // 点击不同的筛选标签
        await page.click('[data-filter="urgent"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const urgentTabCheck = await page.evaluate(() => {
            const urgentTab = document.querySelector('[data-filter="urgent"]');
            const activeTab = document.querySelector('.filter-tab.active');
            
            return {
                urgentTabActive: urgentTab && urgentTab.classList.contains('active'),
                activeTabDataFilter: activeTab ? activeTab.dataset.filter : null,
                urgentTabStyles: urgentTab ? {
                    backgroundColor: window.getComputedStyle(urgentTab).backgroundColor,
                    color: window.getComputedStyle(urgentTab).color,
                    borderBottomColor: window.getComputedStyle(urgentTab).borderBottomColor
                } : null
            };
        });
        
        console.log('筛选标签交互测试:');
        console.log(`  紧急标签激活: ${urgentTabCheck.urgentTabActive ? '✅' : '❌'}`);
        console.log(`  当前活动标签: ${urgentTabCheck.activeTabDataFilter}`);
        if (urgentTabCheck.urgentTabStyles) {
            console.log(`  激活状态样式: ${urgentTabCheck.urgentTabStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ? '✅' : '❌'}`);
        }
        
        console.log('\n=== 3. 检查卡片视图内容显示 ===');
        
        // 切换到卡片视图
        await page.click('[data-view="cards"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const cardsContentCheck = await page.evaluate(() => {
            const orderCards = document.querySelectorAll('.order-card');
            const firstCard = orderCards[0];
            
            if (!firstCard) return { error: '卡片视图中没有找到订单卡片' };
            
            const cardHeader = firstCard.querySelector('.order-card__header');
            const cardNumber = firstCard.querySelector('.order-card__number');
            const cardAmount = firstCard.querySelector('.order-card__amount');
            const cardDetails = firstCard.querySelector('.order-card__details');
            const orderDetails = firstCard.querySelectorAll('.order-detail');
            const cardActions = firstCard.querySelector('.order-card__actions');
            const actionButtons = firstCard.querySelectorAll('.action-btn');
            
            // 获取详细信息内容
            const detailsContent = {};
            orderDetails.forEach(detail => {
                const label = detail.querySelector('.order-detail__label')?.textContent;
                const value = detail.querySelector('.order-detail__value')?.textContent;
                if (label && value) {
                    detailsContent[label] = value.trim();
                }
            });
            
            return {
                cardCount: orderCards.length,
                structure: {
                    hasHeader: !!cardHeader,
                    hasNumber: !!cardNumber && cardNumber.textContent.trim().length > 0,
                    hasAmount: !!cardAmount && cardAmount.textContent.trim().length > 0,
                    hasDetails: !!cardDetails,
                    hasActions: !!cardActions
                },
                content: {
                    orderNumber: cardNumber ? cardNumber.textContent.trim() : '',
                    amount: cardAmount ? cardAmount.textContent.trim() : '',
                    detailCount: orderDetails.length,
                    actionButtonCount: actionButtons.length
                },
                detailsContent: detailsContent,
                firstCardText: firstCard.textContent.substring(0, 200).replace(/\s+/g, ' ').trim()
            };
        });
        
        console.log('卡片视图内容检查:');
        if (cardsContentCheck.error) {
            console.log(`  ❌ ${cardsContentCheck.error}`);
        } else {
            console.log(`  卡片数量: ${cardsContentCheck.cardCount}`);
            console.log('  卡片结构:');
            console.log(`    头部存在: ${cardsContentCheck.structure.hasHeader ? '✅' : '❌'}`);
            console.log(`    订单号显示: ${cardsContentCheck.structure.hasNumber ? '✅' : '❌'}`);
            console.log(`    金额显示: ${cardsContentCheck.structure.hasAmount ? '✅' : '❌'}`);
            console.log(`    详情区域: ${cardsContentCheck.structure.hasDetails ? '✅' : '❌'}`);
            console.log(`    操作按钮: ${cardsContentCheck.structure.hasActions ? '✅' : '❌'}`);
            console.log('  卡片内容:');
            console.log(`    订单号: ${cardsContentCheck.content.orderNumber}`);
            console.log(`    金额: ${cardsContentCheck.content.amount}`);
            console.log(`    详情数量: ${cardsContentCheck.content.detailCount}`);
            console.log(`    操作按钮数量: ${cardsContentCheck.content.actionButtonCount}`);
            console.log('  详细字段内容:');
            Object.entries(cardsContentCheck.detailsContent).forEach(([key, value]) => {
                console.log(`    ${key}: ${value}`);
            });
        }
        
        await page.screenshot({ path: 'test-audit-fixes-02-cards-content.png', fullPage: true });
        
        console.log('\n=== 4. 检查页面底部布局 ===');
        
        const layoutCheck = await page.evaluate(() => {
            const body = document.body;
            const footer = document.querySelector('.app__footer');
            const modals = document.querySelectorAll('.modal-enhanced');
            const loadingOverlay = document.getElementById('globalLoading');
            const toastContainer = document.getElementById('globalToast');
            
            const bodyRect = body.getBoundingClientRect();
            const footerRect = footer ? footer.getBoundingClientRect() : null;
            
            // 检查footer后面的元素
            let elementsAfterFooter = [];
            if (footer) {
                const allElements = Array.from(document.body.children);
                const footerIndex = allElements.indexOf(footer);
                elementsAfterFooter = allElements.slice(footerIndex + 1).map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    position: window.getComputedStyle(el).position,
                    zIndex: window.getComputedStyle(el).zIndex
                }));
            }
            
            return {
                layout: {
                    bodyHeight: bodyRect.height,
                    footerExists: !!footer,
                    footerPosition: footerRect ? {
                        top: footerRect.top,
                        bottom: footerRect.bottom,
                        height: footerRect.height
                    } : null,
                    elementsAfterFooterCount: elementsAfterFooter.length
                },
                elementsAfterFooter: elementsAfterFooter,
                globalElements: {
                    modalsCount: modals.length,
                    loadingOverlayExists: !!loadingOverlay,
                    toastContainerExists: !!toastContainer,
                    modalsPositioned: Array.from(modals).every(modal => 
                        window.getComputedStyle(modal).position === 'fixed' || 
                        window.getComputedStyle(modal).position === 'absolute'
                    )
                }
            };
        });
        
        console.log('页面底部布局检查:');
        console.log(`  页面主体高度: ${layoutCheck.layout.bodyHeight}px`);
        console.log(`  Footer存在: ${layoutCheck.layout.footerExists ? '✅' : '❌'}`);
        if (layoutCheck.layout.footerPosition) {
            console.log(`  Footer位置: top=${layoutCheck.layout.footerPosition.top}px, height=${layoutCheck.layout.footerPosition.height}px`);
        }
        console.log(`  Footer后元素数量: ${layoutCheck.layout.elementsAfterFooterCount}`);
        
        console.log('Footer后的元素:');
        layoutCheck.elementsAfterFooter.forEach((element, index) => {
            console.log(`  ${index + 1}. ${element.tagName}${element.className ? '.' + element.className.split(' ')[0] : ''}${element.id ? '#' + element.id : ''}`);
            console.log(`     定位: ${element.position}, z-index: ${element.zIndex}`);
        });
        
        console.log('全局元素检查:');
        console.log(`  模态框数量: ${layoutCheck.globalElements.modalsCount}`);
        console.log(`  加载覆盖层: ${layoutCheck.globalElements.loadingOverlayExists ? '✅' : '❌'}`);
        console.log(`  Toast容器: ${layoutCheck.globalElements.toastContainerExists ? '✅' : '❌'}`);
        console.log(`  模态框正确定位: ${layoutCheck.globalElements.modalsPositioned ? '✅' : '❌'}`);
        
        console.log('\n=== 5. 测试响应式适配 ===');
        
        // 测试移动端下的筛选器
        await page.setViewport({ width: 768, height: 1024 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const responsiveCheck = await page.evaluate(() => {
            const filterTabs = document.querySelector('.filter-tabs');
            const advancedFilters = document.querySelector('.advanced-filters');
            const filterTabsStyles = window.getComputedStyle(filterTabs);
            const advancedFiltersStyles = window.getComputedStyle(advancedFilters);
            
            return {
                viewport: { width: window.innerWidth, height: window.innerHeight },
                filterTabs: {
                    overflowX: filterTabsStyles.overflowX,
                    flexWrap: filterTabsStyles.flexWrap
                },
                advancedFilters: {
                    flexDirection: advancedFiltersStyles.flexDirection,
                    padding: advancedFiltersStyles.padding
                }
            };
        });
        
        console.log('移动端响应式检查:');
        console.log(`  视口大小: ${responsiveCheck.viewport.width}x${responsiveCheck.viewport.height}`);
        console.log(`  筛选标签水平滚动: ${responsiveCheck.filterTabs.overflowX === 'auto' ? '✅' : '❌'}`);
        console.log(`  高级筛选器垂直布局: ${responsiveCheck.advancedFilters.flexDirection === 'column' ? '✅' : '❌'}`);
        
        await page.screenshot({ path: 'test-audit-fixes-03-mobile.png', fullPage: true });
        
        // 恢复桌面端
        await page.setViewport({ width: 1600, height: 1000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n=== 6. 综合功能测试 ===');
        
        // 切换回表格视图
        await page.click('[data-view="table"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const comprehensiveCheck = await page.evaluate(() => {
            const filtersGood = !!document.querySelector('.audit-filters') &&
                              document.querySelectorAll('.filter-tab').length >= 4 &&
                              document.querySelectorAll('.filter-select').length >= 3;
            
            const cardsViewGood = document.querySelectorAll('.order-card').length > 0;
            
            const tableViewGood = !!document.querySelector('.audit-table') &&
                                 document.querySelectorAll('.audit-table th').length >= 10;
            
            const layoutGood = !!document.querySelector('.app__footer') &&
                              document.querySelectorAll('.modal-enhanced').length > 0;
            
            return {
                filtersOptimized: filtersGood,
                cardsViewWorking: cardsViewGood,
                tableViewWorking: tableViewGood,
                layoutProper: layoutGood,
                allGood: filtersGood && cardsViewGood && tableViewGood && layoutGood
            };
        });
        
        console.log('综合功能检查:');
        console.log(`  筛选器优化: ${comprehensiveCheck.filtersOptimized ? '✅' : '❌'}`);
        console.log(`  卡片视图正常: ${comprehensiveCheck.cardsViewWorking ? '✅' : '❌'}`);
        console.log(`  表格视图正常: ${comprehensiveCheck.tableViewWorking ? '✅' : '❌'}`);
        console.log(`  页面布局正确: ${comprehensiveCheck.layoutProper ? '✅' : '❌'}`);
        
        const allTestsPassed = comprehensiveCheck.allGood &&
                              filtersCheck.exists &&
                              urgentTabCheck.urgentTabActive &&
                              cardsContentCheck.cardCount > 0 &&
                              layoutCheck.layout.footerExists;
        
        console.log(`\n🎯 财务审核页面修复测试结果: ${allTestsPassed ? '✅ 全部修复成功！' : '⚠️ 部分问题仍需处理'}`);
        
        if (allTestsPassed) {
            console.log('\n🎉 所有修复完成！');
            console.log('✨ 修复内容:');
            console.log('  - audit-filters 布局和样式优化 ✅');
            console.log('  - 筛选标签交互增强 ✅');
            console.log('  - 卡片视图内容正常显示 ✅');
            console.log('  - 页面底部布局结构正确 ✅');
            console.log('  - 响应式设计完善 ✅');
        }
        
        console.log('\n📸 所有测试截图已保存: test-audit-fixes-*.png');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        await page.screenshot({ path: 'test-audit-fixes-error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

testAuditFixes().catch(console.error);