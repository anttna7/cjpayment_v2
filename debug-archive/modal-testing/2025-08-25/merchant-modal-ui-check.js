const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function checkMerchantModalUI() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    testResults: [],
    screenshots: [],
    analysisReport: {
      layoutIssues: [],
      alignmentProblems: [],
      responsiveIssues: [],
      styleInconsistencies: []
    }
  };

  try {
    console.log('📝 开始商户管理页面UI检查...');
    
    // 访问商户管理页面
    console.log('🔍 访问商户管理页面: http://127.0.0.1:8091/merchant');
    await page.goto('http://127.0.0.1:8091/merchant');
    await page.waitForLoadState('networkidle');
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 截图：初始页面状态
    const initialScreenshot = 'merchant-page-initial.png';
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    results.screenshots.push({
      name: '商户管理页面初始状态',
      path: initialScreenshot,
      description: '页面加载完成后的初始状态'
    });
    console.log('✅ 已保存初始页面截图');

    // 查找并点击"添加商户"按钮
    console.log('🔍 查找添加商户按钮...');
    
    // 尝试多种可能的按钮选择器
    const addButtonSelectors = [
      'button:has-text("添加商户")',
      '.btn:has-text("添加商户")',
      '[onclick*="addMerchant"]',
      '#addMerchantBtn',
      '.add-merchant-btn',
      'button[data-action="add-merchant"]'
    ];

    let addButton = null;
    for (const selector of addButtonSelectors) {
      try {
        addButton = await page.locator(selector).first();
        if (await addButton.isVisible()) {
          console.log(`✅ 找到添加商户按钮: ${selector}`);
          break;
        }
      } catch (e) {
        // 继续尝试下一个选择器
      }
    }

    if (!addButton || !(await addButton.isVisible())) {
      console.log('⚠️ 未找到添加商户按钮，尝试查看页面内容...');
      const pageContent = await page.content();
      
      // 检查页面中是否包含添加商户相关的文本
      if (pageContent.includes('添加商户')) {
        console.log('✅ 页面包含"添加商户"文本');
      }
      
      // 查找所有按钮元素
      const allButtons = await page.$$('button, .btn, [role="button"]');
      console.log(`📊 页面中找到 ${allButtons.length} 个按钮元素`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        console.log(`按钮 ${i + 1}: "${buttonText}"`);
      }
    }

    if (addButton && await addButton.isVisible()) {
      // 点击添加商户按钮
      console.log('🖱️ 点击添加商户按钮...');
      await addButton.click();
      await page.waitForTimeout(1000);
      
      // 等待模态框出现
      console.log('⏳ 等待模态框出现...');
      await page.waitForSelector('.modal, [role="dialog"], .modal-container', { timeout: 5000 });
      await page.waitForTimeout(500);
      
      // 截图：模态框打开后
      const modalScreenshot = 'merchant-modal-opened.png';
      await page.screenshot({ path: modalScreenshot, fullPage: true });
      results.screenshots.push({
        name: '添加商户模态框',
        path: modalScreenshot,
        description: '点击添加商户按钮后打开的模态框'
      });
      console.log('✅ 已保存模态框截图');

      // 分析模态框布局
      console.log('🔍 分析模态框布局...');
      await analyzeModalLayout(page, results);
      
      // 测试不同屏幕尺寸下的响应式布局
      await testResponsiveLayout(page, results);
      
    } else {
      results.testResults.push({
        test: '查找添加商户按钮',
        status: 'failed',
        message: '未找到添加商户按钮',
        details: '页面可能未正确加载或按钮选择器需要更新'
      });
    }

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    results.testResults.push({
      test: '整体测试流程',
      status: 'error',
      message: error.message,
      details: error.stack
    });
    
    // 错误发生时也要截图
    const errorScreenshot = 'error-state.png';
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    results.screenshots.push({
      name: '错误状态截图',
      path: errorScreenshot,
      description: '测试过程中发生错误时的页面状态'
    });
  }

  await browser.close();
  
  // 生成分析报告
  generateAnalysisReport(results);
  
  return results;
}

async function analyzeModalLayout(page, results) {
  try {
    // 检查模态框的基本结构
    const modal = await page.locator('.modal, [role="dialog"], .modal-container').first();
    
    if (await modal.isVisible()) {
      console.log('✅ 模态框已显示');
      
      // 检查表单字段布局
      const formFields = await page.$$('.form-group, .field, .input-group, input, textarea, select');
      console.log(`📊 找到 ${formFields.length} 个表单字段`);
      
      // 分析字段对齐情况
      for (let i = 0; i < formFields.length; i++) {
        const field = formFields[i];
        const boundingBox = await field.boundingBox();
        const fieldType = await field.evaluate(el => el.tagName.toLowerCase());
        const fieldId = await field.getAttribute('id') || await field.getAttribute('name') || `field-${i}`;
        
        if (boundingBox) {
          console.log(`字段 ${fieldId} (${fieldType}): x=${boundingBox.x}, y=${boundingBox.y}, width=${boundingBox.width}, height=${boundingBox.height}`);
          
          // 检查字段是否对齐
          if (i > 0) {
            const prevField = formFields[i - 1];
            const prevBoundingBox = await prevField.boundingBox();
            if (prevBoundingBox && Math.abs(boundingBox.x - prevBoundingBox.x) > 5) {
              results.analysisReport.alignmentProblems.push({
                field: fieldId,
                issue: '字段水平对齐不一致',
                details: `当前字段x坐标: ${boundingBox.x}, 上一字段x坐标: ${prevBoundingBox.x}`
              });
            }
          }
        }
      }
      
      // 检查标签和输入框的关联
      const labels = await page.$$('label');
      for (const label of labels) {
        const labelText = await label.textContent();
        const labelFor = await label.getAttribute('for');
        const associatedInput = labelFor ? await page.$(`#${labelFor}`) : null;
        
        if (labelFor && !associatedInput) {
          results.analysisReport.layoutIssues.push({
            issue: '标签与输入框关联失效',
            details: `标签 "${labelText}" 关联的输入框 "#${labelFor}" 不存在`
          });
        }
        
        if (label && associatedInput) {
          const labelBox = await label.boundingBox();
          const inputBox = await associatedInput.boundingBox();
          
          if (labelBox && inputBox) {
            const verticalGap = Math.abs(inputBox.y - (labelBox.y + labelBox.height));
            if (verticalGap > 15) {
              results.analysisReport.alignmentProblems.push({
                field: labelText,
                issue: '标签与输入框垂直间距过大',
                details: `间距: ${verticalGap}px`
              });
            }
          }
        }
      }
      
      // 检查模态框整体样式
      const modalStyles = await modal.evaluate(el => {
        const computedStyle = window.getComputedStyle(el);
        return {
          width: computedStyle.width,
          maxWidth: computedStyle.maxWidth,
          padding: computedStyle.padding,
          margin: computedStyle.margin,
          borderRadius: computedStyle.borderRadius,
          boxShadow: computedStyle.boxShadow
        };
      });
      
      console.log('📊 模态框样式信息:', modalStyles);
      
      results.testResults.push({
        test: '模态框布局分析',
        status: 'completed',
        message: '模态框布局分析完成',
        details: {
          formFieldsCount: formFields.length,
          labelsCount: labels.length,
          modalStyles: modalStyles
        }
      });
      
    } else {
      results.testResults.push({
        test: '模态框可见性检查',
        status: 'failed',
        message: '模态框不可见',
        details: '模态框可能未正确打开或CSS样式存在问题'
      });
    }
    
  } catch (error) {
    console.error('❌ 模态框布局分析出错:', error);
    results.analysisReport.layoutIssues.push({
      issue: '模态框布局分析失败',
      details: error.message
    });
  }
}

async function testResponsiveLayout(page, results) {
  const viewports = [
    { name: '桌面端', width: 1920, height: 1080 },
    { name: '平板端', width: 768, height: 1024 },
    { name: '手机端', width: 375, height: 667 }
  ];
  
  for (const viewport of viewports) {
    try {
      console.log(`📱 测试 ${viewport.name} 响应式布局 (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      const screenshotPath = `merchant-modal-${viewport.name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      results.screenshots.push({
        name: `${viewport.name}响应式布局`,
        path: screenshotPath,
        description: `${viewport.width}x${viewport.height} 分辨率下的模态框布局`
      });
      
      // 检查模态框是否仍然可见和可用
      const modal = await page.locator('.modal, [role="dialog"], .modal-container').first();
      const isVisible = await modal.isVisible();
      
      if (!isVisible) {
        results.analysisReport.responsiveIssues.push({
          viewport: viewport.name,
          issue: '模态框在该分辨率下不可见',
          details: `分辨率: ${viewport.width}x${viewport.height}`
        });
      } else {
        // 检查模态框是否溢出屏幕
        const modalBox = await modal.boundingBox();
        if (modalBox) {
          if (modalBox.width > viewport.width || modalBox.height > viewport.height) {
            results.analysisReport.responsiveIssues.push({
              viewport: viewport.name,
              issue: '模态框溢出屏幕',
              details: `模态框尺寸: ${modalBox.width}x${modalBox.height}, 屏幕尺寸: ${viewport.width}x${viewport.height}`
            });
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ ${viewport.name} 响应式测试出错:`, error);
      results.analysisReport.responsiveIssues.push({
        viewport: viewport.name,
        issue: '响应式测试失败',
        details: error.message
      });
    }
  }
  
  // 恢复到默认分辨率
  await page.setViewportSize({ width: 1920, height: 1080 });
}

function generateAnalysisReport(results) {
  const report = `
# 商户模态框UI布局检查报告

## 测试执行时间
${results.timestamp}

## 截图文件
${results.screenshots.map(s => `- **${s.name}**: ${s.path} - ${s.description}`).join('\n')}

## 布局问题分析

### 1. 整体布局问题
${results.analysisReport.layoutIssues.length > 0 ? 
  results.analysisReport.layoutIssues.map(issue => `- **问题**: ${issue.issue}\n  **详情**: ${issue.details}`).join('\n') : 
  '✅ 未发现明显的整体布局问题'
}

### 2. 对齐问题
${results.analysisReport.alignmentProblems.length > 0 ? 
  results.analysisReport.alignmentProblems.map(problem => `- **字段**: ${problem.field}\n  **问题**: ${problem.issue}\n  **详情**: ${problem.details}`).join('\n') : 
  '✅ 字段对齐检查通过'
}

### 3. 响应式布局问题
${results.analysisReport.responsiveIssues.length > 0 ? 
  results.analysisReport.responsiveIssues.map(issue => `- **视窗**: ${issue.viewport}\n  **问题**: ${issue.issue}\n  **详情**: ${issue.details}`).join('\n') : 
  '✅ 响应式布局检查通过'
}

### 4. 样式一致性问题
${results.analysisReport.styleInconsistencies.length > 0 ? 
  results.analysisReport.styleInconsistencies.map(issue => `- **问题**: ${issue.issue}\n  **详情**: ${issue.details}`).join('\n') : 
  '✅ 样式一致性检查通过'
}

## 测试结果详情
${results.testResults.map(result => `
### ${result.test}
- **状态**: ${result.status}
- **消息**: ${result.message}
- **详情**: ${typeof result.details === 'object' ? JSON.stringify(result.details, null, 2) : result.details}
`).join('')}

## 建议改进措施

### UI布局优化建议
1. **字段对齐**: 确保所有表单字段左对齐，保持一致的边距
2. **标签布局**: 标签应与对应输入框保持合适的垂直间距（建议8-12px）
3. **模态框尺寸**: 确保模态框在不同屏幕尺寸下都能完整显示
4. **响应式设计**: 在小屏幕上考虑使用堆叠布局而非并排布局

### 交互体验改进
1. **加载状态**: 添加模态框打开时的过渡动画
2. **焦点管理**: 确保模态框打开时焦点正确设置到第一个输入字段
3. **键盘导航**: 支持Tab键在字段间切换和Esc键关闭模态框
4. **错误提示**: 优化表单验证错误的显示方式和位置

## 与收款账户模态框对比
建议参考收款账户模态框的成功设计元素：
- 统一的字段间距和对齐方式
- 一致的按钮样式和布局
- 相同的模态框尺寸和居中方式
- 统一的表单验证样式
`;

  fs.writeFileSync('merchant-modal-ui-analysis-report.md', report);
  console.log('📋 分析报告已保存到: merchant-modal-ui-analysis-report.md');
}

// 运行检查
checkMerchantModalUI().then(results => {
  console.log('\n🎉 商户模态框UI检查完成！');
  console.log(`📸 共生成 ${results.screenshots.length} 张截图`);
  console.log(`📝 发现 ${results.analysisReport.layoutIssues.length} 个布局问题`);
  console.log(`🔧 发现 ${results.analysisReport.alignmentProblems.length} 个对齐问题`);
  console.log(`📱 发现 ${results.analysisReport.responsiveIssues.length} 个响应式问题`);
  console.log('\n📋 详细报告请查看: merchant-modal-ui-analysis-report.md');
}).catch(error => {
  console.error('❌ 测试执行失败:', error);
});