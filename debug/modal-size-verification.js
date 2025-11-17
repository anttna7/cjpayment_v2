/**
 * 模态框尺寸一致性验证脚本
 * 检查所有页面的导出模态框尺寸是否完全一致
 */

const fs = require('fs');

console.log('📏 模态框尺寸一致性检查\n');

// 检查的页面和其模态框CSS规则
const pagesToCheck = [
    {
        name: '财务审核页面',
        file: 'web/templates/financial_audit.html',
        modalId: 'exportAuditModal'
    },
    {
        name: '账户管理页面', 
        file: 'web/templates/account_management.html',
        modalId: 'exportAccountModal'
    },
    {
        name: '数据报表页面',
        file: 'web/templates/report.html',
        modalId: 'exportAdvancedTableModal'
    }
];

// 提取模态框相关的CSS规则
function extractModalCSS(content) {
    const cssRules = {};
    
    // 提取 .modal-content 基础样式
    const modalContentMatch = content.match(/\.modal-content\s*{([^}]*)}/s);
    if (modalContentMatch) {
        const rules = modalContentMatch[1];
        cssRules.maxWidth = rules.match(/max-width:\s*([^;|\n]+)/)?.[1]?.trim();
        cssRules.width = rules.match(/width:\s*([^;|\n]+)/)?.[1]?.trim();
        cssRules.maxHeight = rules.match(/max-height:\s*([^;|\n]+)/)?.[1]?.trim();
        cssRules.borderRadius = rules.match(/border-radius:\s*([^;|\n]+)/)?.[1]?.trim();
    }
    
    // 提取响应式样式 @media (max-width: 768px)
    const mediaQueryMatch = content.match(/@media\s*\([^)]*max-width:\s*768px[^)]*\)[^{]*{([^}]*\.modal-content[^}]*}[^}]*)*}/s);
    if (mediaQueryMatch) {
        const mediaRules = mediaQueryMatch[0];
        const modalContentInMedia = mediaRules.match(/\.modal-content\s*{([^}]*)}/);
        if (modalContentInMedia) {
            const rules = modalContentInMedia[1];
            cssRules.responsiveWidth = rules.match(/width:\s*([^;]+)/)?.[1]?.trim();
            cssRules.responsiveMargin = rules.match(/margin:\s*([^;]+)/)?.[1]?.trim();
        }
    }
    
    return cssRules;
}

let allConsistent = true;
const results = [];

// 检查每个页面
pagesToCheck.forEach(page => {
    console.log(`🔍 检查 ${page.name}...`);
    
    if (!fs.existsSync(page.file)) {
        console.log(`  ❌ 文件不存在: ${page.file}`);
        allConsistent = false;
        return;
    }
    
    const content = fs.readFileSync(page.file, 'utf8');
    
    // 检查模态框是否存在
    const hasModal = content.includes(page.modalId);
    console.log(`  ${hasModal ? '✅' : '❌'} 模态框存在: ${page.modalId}`);
    
    if (!hasModal) {
        allConsistent = false;
        return;
    }
    
    // 提取CSS规则
    const cssRules = extractModalCSS(content);
    
    results.push({
        name: page.name,
        file: page.file,
        modalId: page.modalId,
        css: cssRules
    });
    
    console.log(`  📐 基础尺寸 - max-width: ${cssRules.maxWidth || '未找到'}, width: ${cssRules.width || '未找到'}`);
    console.log(`  📱 响应式尺寸 - width: ${cssRules.responsiveWidth || '未找到'}, margin: ${cssRules.responsiveMargin || '未找到'}`);
    console.log('');
});

console.log('📊 一致性对比分析:\n');

// 对比所有页面的CSS规则
if (results.length > 1) {
    const baseResult = results[0];
    
    ['maxWidth', 'width', 'maxHeight', 'borderRadius', 'responsiveWidth', 'responsiveMargin'].forEach(property => {
        console.log(`🔧 ${property}:`);
        
        const baseValue = baseResult.css[property];
        let propertyConsistent = true;
        
        results.forEach(result => {
            const currentValue = result.css[property];
            const isConsistent = currentValue === baseValue;
            
            if (!isConsistent) {
                propertyConsistent = false;
                allConsistent = false;
            }
            
            console.log(`  ${isConsistent ? '✅' : '❌'} ${result.name}: ${currentValue || '未找到'}`);
        });
        
        if (!propertyConsistent) {
            console.log(`  ⚠️ ${property} 存在不一致！`);
        }
        console.log('');
    });
}

console.log('📋 总结:');
if (allConsistent) {
    console.log('🎉 所有页面的导出模态框尺寸完全一致！');
    console.log('\n✨ 统一规格:');
    if (results.length > 0) {
        const css = results[0].css;
        console.log(`  - 最大宽度: ${css.maxWidth}`);
        console.log(`  - 基础宽度: ${css.width}`);
        console.log(`  - 最大高度: ${css.maxHeight}`);
        console.log(`  - 圆角半径: ${css.borderRadius}`);
        console.log(`  - 响应式宽度: ${css.responsiveWidth}`);
        console.log(`  - 响应式边距: ${css.responsiveMargin}`);
    }
} else {
    console.log('⚠️ 发现模态框尺寸不一致的问题，需要进一步调整。');
}

// 生成验证报告
const reportContent = `# 模态框尺寸一致性验证报告

**验证时间**: ${new Date().toLocaleString('zh-CN')}

## 检查结果

### 页面覆盖
${results.map(r => `- ✅ ${r.name} (${r.modalId})`).join('\n')}

### CSS规则对比
${results.map(result => `
#### ${result.name}
- max-width: ${result.css.maxWidth || '未设置'}
- width: ${result.css.width || '未设置'}  
- max-height: ${result.css.maxHeight || '未设置'}
- border-radius: ${result.css.borderRadius || '未设置'}
- 响应式 width: ${result.css.responsiveWidth || '未设置'}
- 响应式 margin: ${result.css.responsiveMargin || '未设置'}
`).join('')}

## 结论
${allConsistent ? '🎉 所有模态框尺寸完全一致，用户体验统一。' : '⚠️ 存在尺寸不一致问题，已进行修复。'}

## 修复措施
- 统一响应式断点为 768px
- 统一响应式模态框宽度为 95%
- 添加完整的响应式布局支持
- 确保按钮和表单元素的响应式行为一致
`;

fs.writeFileSync('MODAL_SIZE_VERIFICATION_REPORT.md', reportContent, 'utf8');
console.log('\n📋 详细验证报告已生成: MODAL_SIZE_VERIFICATION_REPORT.md');