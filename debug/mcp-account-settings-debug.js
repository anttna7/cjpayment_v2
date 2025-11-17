/**
 * MCP调试脚本 - 账户设置页面UI一致性问题诊断
 * 检查与系统其他页面的差异并分析原因
 */

console.log('🔍 MCP调试: 账户设置页面UI一致性问题诊断');
console.log('================================================');

// 页面加载后立即执行的调试代码
window.addEventListener('load', function() {
    console.log('📊 开始页面UI分析...');
    
    // 1. 检查页面基础结构
    function checkPageStructure() {
        console.log('\n🏗️ 页面结构检查:');
        
        const pageStructure = {
            'HTML根元素': document.documentElement.tagName,
            'Body类名': document.body.className,
            'Header结构': document.querySelector('header') ? '✅ 存在' : '❌ 缺失',
            'Main容器': document.querySelector('main') ? '✅ 存在' : '❌ 缺失',
            '导航栏': document.querySelector('.nav') ? '✅ 存在' : '❌ 缺失',
            '用户菜单': document.querySelector('.user-menu') ? '✅ 存在' : '❌ 缺失'
        };
        
        Object.entries(pageStructure).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }
    
    // 2. 检查CSS变量和主题
    function checkThemeVariables() {
        console.log('\n🎨 主题变量检查:');
        
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        const themeVars = [
            '--dashboard-primary',
            '--dashboard-bg-surface', 
            '--dashboard-bg-secondary',
            '--dashboard-text-primary',
            '--dashboard-border-light'
        ];
        
        themeVars.forEach(varName => {
            const value = computedStyle.getPropertyValue(varName);
            console.log(`  ${varName}: ${value || '❌ 未定义'}`);
        });
    }
    
    // 3. 检查关键样式类
    function checkStyleClasses() {
        console.log('\n📋 样式类检查:');
        
        const keyClasses = [
            '.main-container',
            '.page-header',
            '.content-card',
            '.tab-nav',
            '.tab-nav-item',
            '.form-control',
            '.btn'
        ];
        
        keyClasses.forEach(className => {
            const elements = document.querySelectorAll(className);
            console.log(`  ${className}: ${elements.length > 0 ? '✅ ' + elements.length + '个' : '❌ 未找到'}`);
        });
    }
    
    // 4. 检查标签页内容
    function checkTabContent() {
        console.log('\n📑 标签页内容检查:');
        
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach((pane, index) => {
            const id = pane.id;
            const isActive = pane.classList.contains('active');
            const contentText = pane.textContent.trim();
            const hasContent = contentText.length > 50; // 判断是否有实际内容
            
            console.log(`  标签页 ${index + 1} (${id}):`);
            console.log(`    活动状态: ${isActive ? '✅ 激活' : '⭕ 非活动'}`);
            console.log(`    内容状态: ${hasContent ? '✅ 有内容' : '❌ 内容不足'}`);
            console.log(`    内容长度: ${contentText.length} 字符`);
            
            if (!hasContent && contentText.includes('正在开发中')) {
                console.log(`    ⚠️ 发现占位符内容: "${contentText.substring(0, 50)}..."`);
            }
        });
    }
    
    // 5. 截图并分析视觉差异
    function capturePageScreenshot() {
        console.log('\n📷 准备页面截图分析...');
        
        // 获取页面尺寸信息
        const pageInfo = {
            '视口宽度': window.innerWidth,
            '视口高度': window.innerHeight,
            '页面宽度': document.body.scrollWidth,
            '页面高度': document.body.scrollHeight,
            '当前滚动位置': window.scrollY
        };
        
        console.log('页面尺寸信息:');
        Object.entries(pageInfo).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}px`);
        });
        
        // 分析可视区域内的关键元素
        const visibleElements = {
            'Header高度': document.querySelector('header')?.offsetHeight || 0,
            'Navigation宽度': document.querySelector('.nav')?.offsetWidth || 0,
            '主内容区高度': document.querySelector('main')?.offsetHeight || 0,
            '标签页导航高度': document.querySelector('.tab-nav')?.offsetHeight || 0,
            '内容卡片高度': document.querySelector('.content-card')?.offsetHeight || 0
        };
        
        console.log('关键元素尺寸:');
        Object.entries(visibleElements).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}px`);
        });
    }
    
    // 6. 对比其他页面的差异点
    function identifyDifferences() {
        console.log('\n🔍 差异点分析:');
        
        // 检查可能导致不一致的问题
        const issues = [];
        
        // 检查是否使用了正确的CSS文件
        const stylesheets = Array.from(document.styleSheets);
        const expectedStyles = [
            'cjpayment-unified.css',
            'theme-unified.css',
            'header-unified.css',
            'layout-unified.css'
        ];
        
        console.log('已加载的样式文件:');
        stylesheets.forEach(sheet => {
            if (sheet.href) {
                console.log(`  📄 ${sheet.href}`);
            }
        });
        
        expectedStyles.forEach(expectedStyle => {
            const isLoaded = stylesheets.some(sheet => 
                sheet.href && sheet.href.includes(expectedStyle)
            );
            if (!isLoaded) {
                issues.push(`缺少样式文件: ${expectedStyle}`);
            }
        });
        
        // 检查内联样式是否覆盖了统一样式
        const elementsWithInlineStyles = document.querySelectorAll('[style]');
        if (elementsWithInlineStyles.length > 0) {
            console.log(`⚠️ 发现 ${elementsWithInlineStyles.length} 个带内联样式的元素`);
            elementsWithInlineStyles.forEach(el => {
                console.log(`  - ${el.tagName}.${el.className}: ${el.style.cssText}`);
            });
        }
        
        // 检查是否有自定义样式标签
        const styleElements = document.querySelectorAll('style');
        if (styleElements.length > 0) {
            console.log(`📝 发现 ${styleElements.length} 个自定义样式块`);
            issues.push('存在自定义样式块，可能覆盖统一样式');
        }
        
        if (issues.length > 0) {
            console.log('🚨 发现的问题:');
            issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        } else {
            console.log('✅ 未发现明显的样式问题');
        }
    }
    
    // 7. 生成详细诊断报告
    function generateDiagnosticReport() {
        console.log('\n📋 综合诊断报告:');
        
        const report = {
            '页面标题': document.title,
            '当前URL': window.location.href,
            '页面加载时间': performance.now() + 'ms',
            '用户代理': navigator.userAgent.substring(0, 50) + '...',
            'JavaScript错误': window.onerror ? '存在错误监听' : '无错误监听'
        };
        
        Object.entries(report).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
        
        // 检查控制台错误
        const originalError = console.error;
        let errorCount = 0;
        console.error = function(...args) {
            errorCount++;
            originalError.apply(console, args);
        };
        
        setTimeout(() => {
            console.log(`\n❌ JavaScript错误数量: ${errorCount}`);
        }, 1000);
    }
    
    // 执行所有检查
    checkPageStructure();
    checkThemeVariables();
    checkStyleClasses();
    checkTabContent();
    capturePageScreenshot();
    identifyDifferences();
    generateDiagnosticReport();
    
    console.log('\n🎯 MCP调试建议:');
    console.log('1. 检查样式文件加载顺序和优先级');
    console.log('2. 确保CSS变量定义正确');
    console.log('3. 移除或修复自定义样式块');
    console.log('4. 完善标签页内容，移除占位符');
    console.log('5. 统一页面结构和组件类名');
    
    console.log('\n✅ MCP调试分析完成！');
});

// 立即执行基础检查
console.log('🚀 开始MCP调试...');

// 检查页面是否已加载
if (document.readyState === 'loading') {
    console.log('⏳ 页面正在加载，等待完成...');
} else {
    console.log('✅ 页面已加载完成');
    window.dispatchEvent(new Event('load'));
}