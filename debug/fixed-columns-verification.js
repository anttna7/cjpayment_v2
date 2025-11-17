/**
 * 固定列样式一致性验证脚本
 * 验证账户管理页面的固定列样式与财务审核页面是否一致
 */

const fs = require('fs');

console.log('🔍 固定列样式一致性验证\n');

// 检查的页面和其固定列实现
const pagesToCheck = [
    {
        name: '财务审核页面',
        jsFile: 'web/static/js/financial-audit-table.js',
        htmlFile: 'web/templates/financial_audit.html'
    },
    {
        name: '账户管理页面',
        jsFile: 'web/static/js/account-management-new.js',
        htmlFile: 'web/templates/account_management.html'
    }
];

// 检查关键实现特性
function checkFixedColumnImplementation(jsContent) {
    const features = {
        hasSetupFixedColumns: jsContent.includes('setupFixedColumns'),
        hasHandleScroll: jsContent.includes('handleScroll'),
        usesSerialCell: jsContent.includes('col-serial-cell'),
        usesActionsCell: jsContent.includes('col-actions-cell'),
        hasStickyPositioning: jsContent.includes('position = \'sticky\''),
        hasZIndexSetting: jsContent.includes('zIndex ='),
        hasShadowEffect: jsContent.includes('boxShadow ='),
        hasScrollLeftHandling: jsContent.includes('scrollLeft')
    };
    
    return features;
}

function checkHTMLStructure(htmlContent) {
    const structure = {
        hasSerialHeader: htmlContent.includes('col-serial col-fixed-left'),
        hasActionsHeader: htmlContent.includes('col-actions col-fixed-right'),
        usesUnifiedWrapper: htmlContent.includes('unified-table-wrapper'),
        hasThContentEnhanced: htmlContent.includes('th-content-enhanced')
    };
    
    return structure;
}

let allConsistent = true;
const results = [];

pagesToCheck.forEach(page => {
    console.log(`📋 检查 ${page.name}...`);
    
    const result = {
        name: page.name,
        jsFile: page.jsFile,
        htmlFile: page.htmlFile,
        jsFeatures: {},
        htmlStructure: {},
        exists: {
            jsFile: false,
            htmlFile: false
        }
    };
    
    // 检查JS文件
    if (fs.existsSync(page.jsFile)) {
        result.exists.jsFile = true;
        const jsContent = fs.readFileSync(page.jsFile, 'utf8');
        result.jsFeatures = checkFixedColumnImplementation(jsContent);
    } else {
        console.log(`  ❌ JS文件不存在: ${page.jsFile}`);
        allConsistent = false;
    }
    
    // 检查HTML文件
    if (fs.existsSync(page.htmlFile)) {
        result.exists.htmlFile = true;
        const htmlContent = fs.readFileSync(page.htmlFile, 'utf8');
        result.htmlStructure = checkHTMLStructure(htmlContent);
    } else {
        console.log(`  ❌ HTML文件不存在: ${page.htmlFile}`);
        allConsistent = false;
    }
    
    results.push(result);
    
    // 显示检查结果
    if (result.exists.jsFile) {
        console.log('  📄 JavaScript实现:');
        Object.entries(result.jsFeatures).forEach(([feature, exists]) => {
            console.log(`    ${exists ? '✅' : '❌'} ${feature}`);
            if (!exists && page.name === '账户管理页面') {
                allConsistent = false;
            }
        });
    }
    
    if (result.exists.htmlFile) {
        console.log('  🔧 HTML结构:');
        Object.entries(result.htmlStructure).forEach(([feature, exists]) => {
            console.log(`    ${exists ? '✅' : '❌'} ${feature}`);
            if (!exists) {
                allConsistent = false;
            }
        });
    }
    
    console.log('');
});

// 一致性对比
console.log('🔗 一致性对比分析:\n');

if (results.length >= 2) {
    const auditResult = results.find(r => r.name.includes('财务审核'));
    const accountResult = results.find(r => r.name.includes('账户管理'));
    
    if (auditResult && accountResult) {
        console.log('📊 JavaScript功能对比:');
        
        Object.keys(auditResult.jsFeatures).forEach(feature => {
            const auditHas = auditResult.jsFeatures[feature];
            const accountHas = accountResult.jsFeatures[feature];
            const consistent = auditHas === accountHas;
            
            console.log(`  ${consistent ? '✅' : '❌'} ${feature}:`);
            console.log(`    财务审核页面: ${auditHas ? '✅' : '❌'}`);
            console.log(`    账户管理页面: ${accountHas ? '✅' : '❌'}`);
            
            if (!consistent) {
                allConsistent = false;
            }
        });
        
        console.log('\n🏗️ HTML结构对比:');
        
        Object.keys(auditResult.htmlStructure).forEach(feature => {
            const auditHas = auditResult.htmlStructure[feature];
            const accountHas = accountResult.htmlStructure[feature];
            const consistent = auditHas === accountHas;
            
            console.log(`  ${consistent ? '✅' : '❌'} ${feature}:`);
            console.log(`    财务审核页面: ${auditHas ? '✅' : '❌'}`);
            console.log(`    账户管理页面: ${accountHas ? '✅' : '❌'}`);
            
            if (!consistent) {
                allConsistent = false;
            }
        });
    }
}

console.log('\n📊 总结:');
if (allConsistent) {
    console.log('🎉 所有固定列样式实现完全一致！');
    console.log('\n✨ 一致性特性:');
    console.log('  🔧 setupFixedColumns() 方法');
    console.log('  📱 handleScroll() 事件处理');
    console.log('  💎 col-serial-cell 和 col-actions-cell 样式类');
    console.log('  🎨 sticky 定位和 z-index 层级管理');
    console.log('  ✨ 动态阴影效果（滚动时）');
    console.log('  📏 统一的表头和数据行结构');
} else {
    console.log('⚠️ 发现固定列实现不一致的问题。');
    console.log('\n🔧 可能需要的修复:');
    console.log('  - 确保JS文件包含完整的固定列处理逻辑');
    console.log('  - 验证HTML结构使用正确的CSS类');
    console.log('  - 检查事件绑定和初始化流程');
}

// 生成验证报告
const reportContent = `# 固定列样式一致性验证报告

**验证时间**: ${new Date().toLocaleString('zh-CN')}

## 验证结果

### JavaScript实现对比
${results.map(result => `
#### ${result.name}
${Object.entries(result.jsFeatures).map(([feature, exists]) => `- ${feature}: ${exists ? '✅' : '❌'}`).join('\n')}
`).join('')}

### HTML结构对比
${results.map(result => `
#### ${result.name}
${Object.entries(result.htmlStructure).map(([feature, exists]) => `- ${feature}: ${exists ? '✅' : '❌'}`).join('\n')}
`).join('')}

## 结论
${allConsistent ? '🎉 固定列样式实现完全一致，用户体验统一' : '⚠️ 存在不一致问题，需要进一步修复'}

## 修复内容
- 统一使用 col-serial-cell 和 col-actions-cell 类
- 添加 setupFixedColumns() 和 handleScroll() 方法
- 实现动态阴影效果和滚动响应
- 保持表头和数据行的结构一致性
`;

fs.writeFileSync('FIXED_COLUMNS_VERIFICATION_REPORT.md', reportContent, 'utf8');
console.log('\n📋 详细验证报告已生成: FIXED_COLUMNS_VERIFICATION_REPORT.md');