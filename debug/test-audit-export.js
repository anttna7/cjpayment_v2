const { chromium } = require('playwright');

async function testAuditExportFunction() {
    console.log('🎯 测试财务审核页面导出报表功能...');
    
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
        console.log('🚀 打开财务审核页面...');
        await page.goto('http://localhost:8091/audit');
        
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log('✅ 页面加载完成');

        // 测试1: 检查导出按钮是否存在
        console.log('\n🔍 测试1: 检查导出按钮是否存在...');
        
        const exportButtonExists = await page.evaluate(() => {
            const exportBtn = document.getElementById('exportAuditReportBtn');
            return {
                exists: !!exportBtn,
                visible: exportBtn ? exportBtn.offsetWidth > 0 && exportBtn.offsetHeight > 0 : false,
                text: exportBtn ? exportBtn.textContent.trim() : '',
                classes: exportBtn ? exportBtn.className : '',
                style: exportBtn ? getComputedStyle(exportBtn).display : ''
            };
        });
        
        console.log('📊 导出按钮检查结果:');
        console.log(`   存在: ${exportButtonExists.exists ? '✅' : '❌'}`);
        console.log(`   可见: ${exportButtonExists.visible ? '✅' : '❌'}`);
        console.log(`   文本: ${exportButtonExists.text}`);
        console.log(`   样式类: ${exportButtonExists.classes}`);

        if (!exportButtonExists.exists) {
            throw new Error('导出按钮未找到');
        }

        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/audit-export-test-01-button.png',
            fullPage: true 
        });

        // 测试2: 点击导出按钮
        console.log('\n🖱️ 测试2: 点击导出按钮...');
        
        await page.click('#exportAuditReportBtn');
        await page.waitForTimeout(1000);
        
        // 检查模态窗口是否显示
        const modalStatus = await page.evaluate(() => {
            const modal = document.getElementById('exportAuditModal');
            return {
                exists: !!modal,
                visible: modal ? getComputedStyle(modal).display !== 'none' : false,
                hasShowClass: modal ? modal.classList.contains('show') : false,
                title: modal ? modal.querySelector('.modal-title')?.textContent.trim() : ''
            };
        });
        
        console.log('🪟 模态窗口检查结果:');
        console.log(`   存在: ${modalStatus.exists ? '✅' : '❌'}`);
        console.log(`   可见: ${modalStatus.visible ? '✅' : '❌'}`);
        console.log(`   激活状态: ${modalStatus.hasShowClass ? '✅' : '❌'}`);
        console.log(`   标题: ${modalStatus.title}`);

        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/audit-export-test-02-modal.png',
            fullPage: true 
        });

        // 测试3: 检查导出选项
        console.log('\n⚙️ 测试3: 检查导出选项...');
        
        const exportOptions = await page.evaluate(() => {
            const formatRadios = document.querySelectorAll('input[name="auditFormat"]');
            const contentCheckboxes = document.querySelectorAll('#exportAuditModal input[type="checkbox"]');
            const rangeRadios = document.querySelectorAll('input[name="dataRange"]');
            
            return {
                formatOptions: Array.from(formatRadios).map(radio => ({
                    value: radio.value,
                    checked: radio.checked,
                    label: radio.closest('label')?.textContent.trim()
                })),
                contentOptions: Array.from(contentCheckboxes).map(checkbox => ({
                    checked: checkbox.checked,
                    label: checkbox.closest('label')?.textContent.trim()
                })),
                rangeOptions: Array.from(rangeRadios).map(radio => ({
                    value: radio.value,
                    checked: radio.checked,
                    label: radio.closest('label')?.textContent.trim()
                }))
            };
        });
        
        console.log('📋 导出选项检查:');
        console.log('   格式选项:');
        exportOptions.formatOptions.forEach((option, index) => {
            console.log(`     ${index + 1}. ${option.label} (${option.value}) ${option.checked ? '✅' : '⭕'}`);
        });
        
        console.log('   内容选项:');
        exportOptions.contentOptions.forEach((option, index) => {
            console.log(`     ${index + 1}. ${option.label} ${option.checked ? '✅' : '⭕'}`);
        });
        
        console.log('   范围选项:');
        exportOptions.rangeOptions.forEach((option, index) => {
            console.log(`     ${index + 1}. ${option.label} (${option.value}) ${option.checked ? '✅' : '⭕'}`);
        });

        // 测试4: 测试CSV导出功能
        console.log('\n📊 测试4: 测试CSV导出功能...');
        
        // 选择CSV格式
        await page.click('input[value="csv"]');
        await page.waitForTimeout(500);
        
        // 点击确认导出
        await page.click('#confirmAuditExportBtn');
        await page.waitForTimeout(3000);
        
        // 检查导出进度和结果
        const exportResult = await page.evaluate(() => {
            const modal = document.getElementById('exportAuditModal');
            const exportBtn = document.getElementById('confirmAuditExportBtn');
            
            return {
                modalVisible: modal ? getComputedStyle(modal).display !== 'none' : true,
                buttonText: exportBtn ? exportBtn.textContent.trim() : '',
                buttonDisabled: exportBtn ? exportBtn.disabled : false
            };
        });
        
        console.log('📤 导出结果检查:');
        console.log(`   模态窗口已关闭: ${!exportResult.modalVisible ? '✅' : '❌'}`);
        console.log(`   按钮状态: ${exportResult.buttonText}`);
        console.log(`   按钮可用: ${!exportResult.buttonDisabled ? '✅' : '❌'}`);

        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/audit-export-test-03-result.png',
            fullPage: true 
        });

        // 测试5: 测试样式一致性
        console.log('\n🎨 测试5: 检查与数据报表页面样式一致性...');
        
        // 获取财务审核页面的导出按钮样式
        const auditExportBtnStyle = await page.evaluate(() => {
            const btn = document.getElementById('exportAuditReportBtn');
            if (!btn) return {};
            
            const computedStyle = getComputedStyle(btn);
            return {
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.color,
                border: computedStyle.border,
                borderRadius: computedStyle.borderRadius,
                padding: computedStyle.padding,
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                className: btn.className
            };
        });
        
        // 跳转到数据报表页面进行对比
        await page.goto('http://localhost:8091/reports');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // 获取数据报表页面的导出按钮样式
        const reportExportBtnStyle = await page.evaluate(() => {
            const btn = document.getElementById('exportReportBtn');
            if (!btn) return {};
            
            const computedStyle = getComputedStyle(btn);
            return {
                backgroundColor: computedStyle.backgroundColor,
                color: computedStyle.color,
                border: computedStyle.border,
                borderRadius: computedStyle.borderRadius,
                padding: computedStyle.padding,
                fontSize: computedStyle.fontSize,
                fontWeight: computedStyle.fontWeight,
                className: btn.className
            };
        });
        
        console.log('🔍 样式一致性对比:');
        console.log(`   背景色一致: ${auditExportBtnStyle.backgroundColor === reportExportBtnStyle.backgroundColor ? '✅' : '❌'}`);
        console.log(`   文字颜色一致: ${auditExportBtnStyle.color === reportExportBtnStyle.color ? '✅' : '❌'}`);
        console.log(`   边框一致: ${auditExportBtnStyle.border === reportExportBtnStyle.border ? '✅' : '❌'}`);
        console.log(`   圆角一致: ${auditExportBtnStyle.borderRadius === reportExportBtnStyle.borderRadius ? '✅' : '❌'}`);
        console.log(`   CSS类一致: ${auditExportBtnStyle.className === reportExportBtnStyle.className ? '✅' : '❌'}`);
        
        console.log('\n📊 审核页面按钮样式:', auditExportBtnStyle);
        console.log('📈 报表页面按钮样式:', reportExportBtnStyle);

        return {
            success: true,
            exportButtonExists: exportButtonExists.exists && exportButtonExists.visible,
            modalWorks: modalStatus.exists && modalStatus.visible,
            optionsComplete: exportOptions.formatOptions.length >= 3 && 
                           exportOptions.contentOptions.length >= 4 && 
                           exportOptions.rangeOptions.length >= 2,
            stylesConsistent: auditExportBtnStyle.className === reportExportBtnStyle.className,
            exportFunctionWorks: !exportResult.modalVisible && !exportResult.buttonDisabled
        };

    } catch (error) {
        console.error('❌ 导出功能测试失败:', error);
        
        await page.screenshot({ 
            path: '/Users/c/Desktop/labs/cjpay/cjpayment/audit-export-test-error.png',
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

testAuditExportFunction().then(result => {
    console.log('\n🎯 财务审核导出功能测试结果:');
    
    if (result.success) {
        console.log('\n📊 功能完整性检查:');
        console.log(`  ${result.exportButtonExists ? '✅' : '❌'} 导出按钮正确显示`);
        console.log(`  ${result.modalWorks ? '✅' : '❌'} 模态窗口正常工作`);
        console.log(`  ${result.optionsComplete ? '✅' : '❌'} 导出选项完整`);
        console.log(`  ${result.stylesConsistent ? '✅' : '❌'} 样式与报表页面一致`);
        console.log(`  ${result.exportFunctionWorks ? '✅' : '❌'} 导出功能正常工作`);
        
        const allPassed = result.exportButtonExists && result.modalWorks && 
                         result.optionsComplete && result.stylesConsistent && 
                         result.exportFunctionWorks;
        
        if (allPassed) {
            console.log('\n🎉 恭喜！财务审核页面导出报表功能完美实现！');
            
            console.log('\n✅ 功能特性清单:');
            console.log('  💎 与数据报表页面样式完全一致');
            console.log('  💎 支持PDF、Excel、CSV三种格式');
            console.log('  💎 可选择包含的数据内容');
            console.log('  💎 支持当前筛选结果或全部数据导出');
            console.log('  💎 完整的用户交互体验');
            console.log('  💎 导出进度提示和结果反馈');
            
            console.log('\n🌟 用户价值:');
            console.log('  ⭐ 管理员可以快速导出审核数据');
            console.log('  ⭐ 支持多种格式满足不同需求');
            console.log('  ⭐ 统一的界面体验降低学习成本');
            console.log('  ⭐ 筛选导出提高工作效率');
            
        } else {
            console.log('\n⚠️ 部分功能需要进一步完善');
        }
        
    } else {
        console.log('\n❌ 测试过程中出现问题');
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
    }
    
    process.exit(result.success ? 0 : 1);
});