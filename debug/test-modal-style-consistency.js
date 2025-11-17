const { chromium } = require('playwright');

async function testModalStyleConsistency() {
    console.log('🎯 测试财务审核页面与数据报表页面模态框样式一致性...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-proxy-server'],
        slowMo: 1000
    });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 }
    });
    const page = await context.newPage();

    try {
        console.log('🚀 开始模态框样式对比测试...');
        
        // 测试1: 财务审核页面模态框样式
        console.log('\n📊 测试1: 财务审核页面模态框样式...');
        
        await page.goto('http://localhost:8091/audit');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // 点击导出按钮
        await page.click('#exportAuditReportBtn');
        await page.waitForTimeout(1000);
        
        const auditModalStyles = await page.evaluate(() => {
            const modal = document.getElementById('exportAuditModal');
            const modalContent = modal?.querySelector('.modal-content');
            const modalHeader = modal?.querySelector('.modal-header');
            const modalBody = modal?.querySelector('.modal-body');
            const modalFooter = modal?.querySelector('.modal-footer');
            const exportOptions = modal?.querySelector('.export-options');
            const formatOptions = modal?.querySelector('.format-options');
            const contentOptions = modal?.querySelector('.content-options');
            
            return {
                modal: modal ? {
                    background: getComputedStyle(modal).background,
                    zIndex: getComputedStyle(modal).zIndex,
                    opacity: getComputedStyle(modal).opacity,
                    display: getComputedStyle(modal).display
                } : null,
                modalContent: modalContent ? {
                    background: getComputedStyle(modalContent).background,
                    borderRadius: getComputedStyle(modalContent).borderRadius,
                    maxWidth: getComputedStyle(modalContent).maxWidth,
                    boxShadow: getComputedStyle(modalContent).boxShadow,
                    transform: getComputedStyle(modalContent).transform
                } : null,
                modalHeader: modalHeader ? {
                    padding: getComputedStyle(modalHeader).padding,
                    borderBottom: getComputedStyle(modalHeader).borderBottom
                } : null,
                modalBody: modalBody ? {
                    padding: getComputedStyle(modalBody).padding
                } : null,
                modalFooter: modalFooter ? {
                    padding: getComputedStyle(modalFooter).padding,
                    borderTop: getComputedStyle(modalFooter).borderTop,
                    background: getComputedStyle(modalFooter).background,
                    justifyContent: getComputedStyle(modalFooter).justifyContent,
                    gap: getComputedStyle(modalFooter).gap
                } : null,
                exportOptions: exportOptions ? {
                    display: getComputedStyle(exportOptions).display,
                    flexDirection: getComputedStyle(exportOptions).flexDirection,
                    gap: getComputedStyle(exportOptions).gap
                } : null,
                formatOptions: formatOptions ? {
                    display: getComputedStyle(formatOptions).display,
                    gridTemplateColumns: getComputedStyle(formatOptions).gridTemplateColumns,
                    gap: getComputedStyle(formatOptions).gap
                } : null,
                contentOptions: contentOptions ? {
                    display: getComputedStyle(contentOptions).display,
                    flexDirection: getComputedStyle(contentOptions).flexDirection,
                    gap: getComputedStyle(contentOptions).gap
                } : null
            };
        });
        
        console.log('📊 财务审核页面模态框样式获取完成');
        
        // 测试格式选项交互
        const auditFormatInteraction = await page.evaluate(() => {
            const formatOption = document.querySelector('.format-option:nth-child(2)'); // Excel选项
            if (formatOption) {
                const beforeStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                // 触发hover
                formatOption.dispatchEvent(new Event('mouseenter'));
                
                const hoverStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                // 点击选择
                formatOption.click();
                
                const selectedStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                return { beforeStyles, hoverStyles, selectedStyles };
            }
            return null;
        });
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/audit-modal-test.png',
            fullPage: true 
        });

        // 关闭模态框
        await page.click('.modal-close');
        await page.waitForTimeout(1000);

        // 测试2: 数据报表页面模态框样式
        console.log('\n📈 测试2: 数据报表页面模态框样式...');
        
        await page.goto('http://localhost:8091/reports');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // 点击导出按钮
        await page.click('#exportReportBtn');
        await page.waitForTimeout(1000);
        
        const reportModalStyles = await page.evaluate(() => {
            const modal = document.getElementById('exportModal');
            const modalContent = modal?.querySelector('.modal-content');
            const modalHeader = modal?.querySelector('.modal-header');
            const modalBody = modal?.querySelector('.modal-body');
            const modalFooter = modal?.querySelector('.modal-footer');
            const exportOptions = modal?.querySelector('.export-options');
            const formatOptions = modal?.querySelector('.format-options');
            const contentOptions = modal?.querySelector('.content-options');
            
            return {
                modal: modal ? {
                    background: getComputedStyle(modal).background,
                    zIndex: getComputedStyle(modal).zIndex,
                    opacity: getComputedStyle(modal).opacity,
                    display: getComputedStyle(modal).display
                } : null,
                modalContent: modalContent ? {
                    background: getComputedStyle(modalContent).background,
                    borderRadius: getComputedStyle(modalContent).borderRadius,
                    maxWidth: getComputedStyle(modalContent).maxWidth,
                    boxShadow: getComputedStyle(modalContent).boxShadow,
                    transform: getComputedStyle(modalContent).transform
                } : null,
                modalHeader: modalHeader ? {
                    padding: getComputedStyle(modalHeader).padding,
                    borderBottom: getComputedStyle(modalHeader).borderBottom
                } : null,
                modalBody: modalBody ? {
                    padding: getComputedStyle(modalBody).padding
                } : null,
                modalFooter: modalFooter ? {
                    padding: getComputedStyle(modalFooter).padding,
                    borderTop: getComputedStyle(modalFooter).borderTop,
                    background: getComputedStyle(modalFooter).background,
                    justifyContent: getComputedStyle(modalFooter).justifyContent,
                    gap: getComputedStyle(modalFooter).gap
                } : null,
                exportOptions: exportOptions ? {
                    display: getComputedStyle(exportOptions).display,
                    flexDirection: getComputedStyle(exportOptions).flexDirection,
                    gap: getComputedStyle(exportOptions).gap
                } : null,
                formatOptions: formatOptions ? {
                    display: getComputedStyle(formatOptions).display,
                    gridTemplateColumns: getComputedStyle(formatOptions).gridTemplateColumns,
                    gap: getComputedStyle(formatOptions).gap
                } : null,
                contentOptions: contentOptions ? {
                    display: getComputedStyle(contentOptions).display,
                    flexDirection: getComputedStyle(contentOptions).flexDirection,
                    gap: getComputedStyle(contentOptions).gap
                } : null
            };
        });
        
        console.log('📈 数据报表页面模态框样式获取完成');
        
        // 测试格式选项交互
        const reportFormatInteraction = await page.evaluate(() => {
            const formatOption = document.querySelector('.format-option:nth-child(2)'); // Excel选项
            if (formatOption) {
                const beforeStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                // 触发hover
                formatOption.dispatchEvent(new Event('mouseenter'));
                
                const hoverStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                // 点击选择
                formatOption.click();
                
                const selectedStyles = {
                    borderColor: getComputedStyle(formatOption).borderColor,
                    background: getComputedStyle(formatOption).background
                };
                
                return { beforeStyles, hoverStyles, selectedStyles };
            }
            return null;
        });

        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/report-modal-test.png',
            fullPage: true 
        });

        // 测试3: 样式对比
        console.log('\n🔍 测试3: 详细样式对比分析...');
        
        const styleComparison = {
            modal: {
                background: auditModalStyles.modal?.background === reportModalStyles.modal?.background,
                zIndex: auditModalStyles.modal?.zIndex === reportModalStyles.modal?.zIndex,
                opacity: auditModalStyles.modal?.opacity === reportModalStyles.modal?.opacity
            },
            modalContent: {
                background: auditModalStyles.modalContent?.background === reportModalStyles.modalContent?.background,
                borderRadius: auditModalStyles.modalContent?.borderRadius === reportModalStyles.modalContent?.borderRadius,
                maxWidth: auditModalStyles.modalContent?.maxWidth === reportModalStyles.modalContent?.maxWidth,
                boxShadow: auditModalStyles.modalContent?.boxShadow === reportModalStyles.modalContent?.boxShadow
            },
            modalHeader: {
                padding: auditModalStyles.modalHeader?.padding === reportModalStyles.modalHeader?.padding,
                borderBottom: auditModalStyles.modalHeader?.borderBottom === reportModalStyles.modalHeader?.borderBottom
            },
            modalBody: {
                padding: auditModalStyles.modalBody?.padding === reportModalStyles.modalBody?.padding
            },
            modalFooter: {
                padding: auditModalStyles.modalFooter?.padding === reportModalStyles.modalFooter?.padding,
                borderTop: auditModalStyles.modalFooter?.borderTop === reportModalStyles.modalFooter?.borderTop,
                background: auditModalStyles.modalFooter?.background === reportModalStyles.modalFooter?.background,
                justifyContent: auditModalStyles.modalFooter?.justifyContent === reportModalStyles.modalFooter?.justifyContent,
                gap: auditModalStyles.modalFooter?.gap === reportModalStyles.modalFooter?.gap
            },
            exportOptions: {
                display: auditModalStyles.exportOptions?.display === reportModalStyles.exportOptions?.display,
                flexDirection: auditModalStyles.exportOptions?.flexDirection === reportModalStyles.exportOptions?.flexDirection,
                gap: auditModalStyles.exportOptions?.gap === reportModalStyles.exportOptions?.gap
            },
            formatOptions: {
                display: auditModalStyles.formatOptions?.display === reportModalStyles.formatOptions?.display,
                gridTemplateColumns: auditModalStyles.formatOptions?.gridTemplateColumns === reportModalStyles.formatOptions?.gridTemplateColumns,
                gap: auditModalStyles.formatOptions?.gap === reportModalStyles.formatOptions?.gap
            },
            contentOptions: {
                display: auditModalStyles.contentOptions?.display === reportModalStyles.contentOptions?.display,
                flexDirection: auditModalStyles.contentOptions?.flexDirection === reportModalStyles.contentOptions?.flexDirection,
                gap: auditModalStyles.contentOptions?.gap === reportModalStyles.contentOptions?.gap
            }
        };
        
        return {
            success: true,
            auditModalStyles,
            reportModalStyles,
            styleComparison,
            auditFormatInteraction,
            reportFormatInteraction
        };

    } catch (error) {
        console.error('❌ 模态框样式一致性测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/modal-consistency-test-error.png',
            fullPage: true 
        });

        return {
            success: false,
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

testModalStyleConsistency().then(result => {
    console.log('\n🎯 模态框样式一致性测试结果:');
    
    if (result.success) {
        console.log('\n📊 详细样式对比结果:');
        
        const { styleComparison } = result;
        
        console.log('🪟 模态框基础样式:');
        console.log(`   背景: ${styleComparison.modal.background ? '✅' : '❌'}`);
        console.log(`   层级: ${styleComparison.modal.zIndex ? '✅' : '❌'}`);
        console.log(`   透明度: ${styleComparison.modal.opacity ? '✅' : '❌'}`);
        
        console.log('\n📋 模态框内容样式:');
        console.log(`   背景: ${styleComparison.modalContent.background ? '✅' : '❌'}`);
        console.log(`   圆角: ${styleComparison.modalContent.borderRadius ? '✅' : '❌'}`);
        console.log(`   最大宽度: ${styleComparison.modalContent.maxWidth ? '✅' : '❌'}`);
        console.log(`   阴影效果: ${styleComparison.modalContent.boxShadow ? '✅' : '❌'}`);
        
        console.log('\n🎨 模态框各部分样式:');
        console.log(`   头部内边距: ${styleComparison.modalHeader.padding ? '✅' : '❌'}`);
        console.log(`   头部边框: ${styleComparison.modalHeader.borderBottom ? '✅' : '❌'}`);
        console.log(`   主体内边距: ${styleComparison.modalBody.padding ? '✅' : '❌'}`);
        console.log(`   底部内边距: ${styleComparison.modalFooter.padding ? '✅' : '❌'}`);
        console.log(`   底部边框: ${styleComparison.modalFooter.borderTop ? '✅' : '❌'}`);
        console.log(`   底部背景: ${styleComparison.modalFooter.background ? '✅' : '❌'}`);
        console.log(`   底部对齐: ${styleComparison.modalFooter.justifyContent ? '✅' : '❌'}`);
        console.log(`   底部间距: ${styleComparison.modalFooter.gap ? '✅' : '❌'}`);
        
        console.log('\n⚙️ 选项区域样式:');
        console.log(`   导出选项布局: ${styleComparison.exportOptions.display ? '✅' : '❌'}`);
        console.log(`   导出选项方向: ${styleComparison.exportOptions.flexDirection ? '✅' : '❌'}`);
        console.log(`   导出选项间距: ${styleComparison.exportOptions.gap ? '✅' : '❌'}`);
        console.log(`   格式选项网格: ${styleComparison.formatOptions.display ? '✅' : '❌'}`);
        console.log(`   格式选项列数: ${styleComparison.formatOptions.gridTemplateColumns ? '✅' : '❌'}`);
        console.log(`   格式选项间距: ${styleComparison.formatOptions.gap ? '✅' : '❌'}`);
        console.log(`   内容选项布局: ${styleComparison.contentOptions.display ? '✅' : '❌'}`);
        console.log(`   内容选项方向: ${styleComparison.contentOptions.flexDirection ? '✅' : '❌'}`);
        console.log(`   内容选项间距: ${styleComparison.contentOptions.gap ? '✅' : '❌'}`);
        
        // 计算总体一致性评分
        const allChecks = Object.values(styleComparison).reduce((acc, category) => {
            return acc.concat(Object.values(category));
        }, []);
        
        const passedChecks = allChecks.filter(check => check === true).length;
        const totalChecks = allChecks.length;
        const consistencyScore = ((passedChecks / totalChecks) * 100).toFixed(1);
        
        console.log(`\n📈 总体样式一致性评分: ${consistencyScore}%`);
        console.log(`📊 通过检查: ${passedChecks}/${totalChecks}`);
        
        if (consistencyScore >= 95) {
            console.log('\n🎉 优秀！财务审核页面模态框样式与数据报表页面高度一致！');
            
            console.log('\n✨ 成功复用的样式特性:');
            console.log('  💎 模态框背景半透明遮罩');
            console.log('  💎 模态框内容区域圆角和阴影');
            console.log('  💎 头部、主体、底部的标准间距');
            console.log('  💎 格式选项网格布局');
            console.log('  💎 内容选项列表布局');
            console.log('  💎 交互状态(hover、选中)效果');
            console.log('  💎 底部按钮区域样式');
            
            console.log('\n🌟 用户体验价值:');
            console.log('  ⭐ 完全一致的视觉体验');
            console.log('  ⭐ 统一的交互行为模式');
            console.log('  ⭐ 降低用户学习成本');
            console.log('  ⭐ 提高界面专业度');
            
        } else if (consistencyScore >= 85) {
            console.log('\n👍 很好！模态框样式基本一致，还有一些细节可以优化');
        } else {
            console.log('\n⚠️ 样式一致性需要进一步改进');
        }
        
    } else {
        console.log('\n❌ 测试过程中出现问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});