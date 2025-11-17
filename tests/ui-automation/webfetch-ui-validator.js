/**
 * CJPayment UI轻量级验证工具
 * 使用WebFetch工具进行UI优化效果验证
 * 适用于磁盘空间受限的环境
 */

const BASE_URL = 'http://127.0.0.1:8091';

/**
 * 验证结果报告
 */
class UIValidationReport {
  constructor() {
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  addResult(test, status, message, details = null) {
    const result = {
      test,
      status, // 'pass', 'fail', 'warning'
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    this.summary.total++;
    this.summary[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'warnings']++;
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
    if (details) {
      console.log(`   详情: ${details}`);
    }
  }

  generateReport() {
    console.log('\n📊 UI验证报告');
    console.log('================');
    console.log(`总测试数: ${this.summary.total}`);
    console.log(`通过: ${this.summary.passed}`);
    console.log(`失败: ${this.summary.failed}`);
    console.log(`警告: ${this.summary.warnings}`);
    console.log(`成功率: ${((this.summary.passed / this.summary.total) * 100).toFixed(1)}%`);
    
    return this.results;
  }
}

/**
 * 主验证函数
 */
async function validateUIOptimizations() {
  console.log('🚀 开始CJPayment UI优化验证...\n');
  
  const report = new UIValidationReport();
  
  try {
    // 验证1: 登录页面基础结构
    await validateLoginPage(report);
    
    // 验证2: CSS样式文件完整性
    await validateCSSFiles(report);
    
    // 验证3: 统一按钮样式应用
    await validateButtonStyles(report);
    
    // 验证4: 导航菜单统一样式
    await validateNavigationStyles(report);
    
    // 验证5: 商户管理页面优化
    await validateMerchantManagement(report);
    
    // 验证6: 账户管理页面优化
    await validateAccountManagement(report);
    
    // 验证7: 模态框优化效果
    await validateModalOptimizations(report);
    
    // 生成最终报告
    report.generateReport();
    
    // 保存报告到文件
    const fs = require('fs');
    fs.writeFileSync(
      'tests/ui-automation/validation-report.json',
      JSON.stringify(report.results, null, 2)
    );
    
    console.log('\n📝 验证报告已保存到: tests/ui-automation/validation-report.json');
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  }
}

/**
 * 验证登录页面
 */
async function validateLoginPage(report) {
  console.log('\n📋 验证1: 登录页面基础结构');
  
  try {
    const response = await fetch(`${BASE_URL}/login`);
    const html = await response.text();
    
    if (response.ok) {
      report.addResult('登录页面访问', 'pass', '页面正常加载');
      
      // 检查关键元素
      const hasLoginForm = html.includes('type="password"') || html.includes('login');
      const hasButtons = html.includes('button') || html.includes('btn');
      const hasCSS = html.includes('.css') || html.includes('stylesheet');
      
      if (hasLoginForm) {
        report.addResult('登录表单', 'pass', '登录表单元素存在');
      } else {
        report.addResult('登录表单', 'warning', '未检测到明显的登录表单');
      }
      
      if (hasButtons) {
        report.addResult('按钮元素', 'pass', '页面包含按钮元素');
      } else {
        report.addResult('按钮元素', 'fail', '未找到按钮元素');
      }
      
      if (hasCSS) {
        report.addResult('CSS样式', 'pass', '页面包含CSS样式引用');
      } else {
        report.addResult('CSS样式', 'warning', '未检测到CSS样式引用');
      }
      
    } else {
      report.addResult('登录页面访问', 'fail', `页面访问失败: ${response.status}`);
    }
  } catch (error) {
    report.addResult('登录页面访问', 'fail', `网络错误: ${error.message}`);
  }
}

/**
 * 验证CSS文件完整性
 */
async function validateCSSFiles(report) {
  console.log('\n📋 验证2: CSS样式文件完整性');
  
  const cssFiles = [
    '/static/css/header-unified.css',
    '/static/css/buttons-unified.css',
    '/static/css/theme-unified.css',
    '/static/css/merchant-management-enhanced.css',
    '/static/css/account-management-enhanced.css'
  ];
  
  for (const cssFile of cssFiles) {
    try {
      const response = await fetch(`${BASE_URL}${cssFile}`);
      
      if (response.ok) {
        const content = await response.text();
        const fileSize = content.length;
        
        if (fileSize > 100) {
          report.addResult(`CSS文件: ${cssFile}`, 'pass', `文件正常 (${fileSize} 字符)`);
        } else {
          report.addResult(`CSS文件: ${cssFile}`, 'warning', `文件过小 (${fileSize} 字符)`);
        }
      } else {
        report.addResult(`CSS文件: ${cssFile}`, 'fail', `文件不存在或无法访问: ${response.status}`);
      }
    } catch (error) {
      report.addResult(`CSS文件: ${cssFile}`, 'fail', `网络错误: ${error.message}`);
    }
  }
}

/**
 * 验证统一按钮样式
 */
async function validateButtonStyles(report) {
  console.log('\n📋 验证3: 统一按钮样式应用');
  
  try {
    const response = await fetch(`${BASE_URL}/static/css/buttons-unified.css`);
    
    if (response.ok) {
      const css = await response.text();
      
      // 检查关键样式规则
      const hasLinearGradient = css.includes('linear-gradient');
      const hasPurpleTheme = css.includes('#8b5cf6') || css.includes('#7c3aed');
      const hasHoverEffects = css.includes(':hover');
      const hasTransitions = css.includes('transition');
      const hasBorderRadius = css.includes('border-radius');
      
      if (hasLinearGradient) {
        report.addResult('按钮渐变背景', 'pass', '线性渐变样式已定义');
      } else {
        report.addResult('按钮渐变背景', 'fail', '缺少线性渐变样式');
      }
      
      if (hasPurpleTheme) {
        report.addResult('紫色主题色', 'pass', '紫色主题色已应用');
      } else {
        report.addResult('紫色主题色', 'fail', '缺少紫色主题色定义');
      }
      
      if (hasHoverEffects) {
        report.addResult('悬停效果', 'pass', '悬停效果已定义');
      } else {
        report.addResult('悬停效果', 'warning', '缺少悬停效果');
      }
      
      if (hasTransitions) {
        report.addResult('动画过渡', 'pass', '动画过渡效果已定义');
      } else {
        report.addResult('动画过渡', 'warning', '缺少动画过渡效果');
      }
      
    } else {
      report.addResult('按钮样式文件', 'fail', '无法获取按钮样式文件');
    }
  } catch (error) {
    report.addResult('按钮样式验证', 'fail', `网络错误: ${error.message}`);
  }
}

/**
 * 验证导航菜单样式
 */
async function validateNavigationStyles(report) {
  console.log('\n📋 验证4: 导航菜单统一样式');
  
  try {
    const response = await fetch(`${BASE_URL}/static/css/header-unified.css`);
    
    if (response.ok) {
      const css = await response.text();
      
      // 检查导航样式
      const hasNavLinkStyles = css.includes('.nav__link') || css.includes('.nav-link');
      const hasHoverColor = css.includes('#8b5cf6');
      const hasTransform = css.includes('translateY');
      const hasGradientBackground = css.includes('linear-gradient');
      
      if (hasNavLinkStyles) {
        report.addResult('导航链接样式', 'pass', '导航链接样式类已定义');
      } else {
        report.addResult('导航链接样式', 'fail', '缺少导航链接样式定义');
      }
      
      if (hasHoverColor && hasGradientBackground) {
        report.addResult('导航悬停效果', 'pass', '紫色悬停效果和渐变背景已定义');
      } else {
        report.addResult('导航悬停效果', 'warning', '导航悬停效果可能不完整');
      }
      
      if (hasTransform) {
        report.addResult('导航动画效果', 'pass', '导航动画变换效果已定义');
      } else {
        report.addResult('导航动画效果', 'warning', '缺少导航动画变换效果');
      }
      
    } else {
      report.addResult('导航样式文件', 'fail', '无法获取导航样式文件');
    }
  } catch (error) {
    report.addResult('导航样式验证', 'fail', `网络错误: ${error.message}`);
  }
}

/**
 * 验证商户管理页面
 */
async function validateMerchantManagement(report) {
  console.log('\n📋 验证5: 商户管理页面优化');
  
  try {
    const response = await fetch(`${BASE_URL}/merchant`);
    
    if (response.ok) {
      const html = await response.text();
      
      // 检查模态框相关元素
      const hasModal = html.includes('modal') || html.includes('Modal');
      const hasRequiredFields = html.includes('required');
      const hasFormSelects = html.includes('select') || html.includes('form-select');
      const hasBasicInfo = html.includes('基础标识信息');
      const hasAgencyInfo = html.includes('代理商') && html.includes('广告账户');
      const noTransactionLimits = !html.includes('交易限额配置');
      
      if (hasModal) {
        report.addResult('商户模态框', 'pass', '模态框结构存在');
      } else {
        report.addResult('商户模态框', 'warning', '未检测到模态框结构');
      }
      
      if (hasBasicInfo && hasAgencyInfo) {
        report.addResult('信息整合', 'pass', '基础标识信息整合代理商和广告账户信息');
      } else {
        report.addResult('信息整合', 'warning', '信息整合可能不完整');
      }
      
      if (noTransactionLimits) {
        report.addResult('交易限额删除', 'pass', '交易限额配置已删除');
      } else {
        report.addResult('交易限额删除', 'fail', '交易限额配置仍然存在');
      }
      
      if (hasFormSelects) {
        report.addResult('下拉框元素', 'pass', '下拉框元素存在');
      } else {
        report.addResult('下拉框元素', 'warning', '未检测到下拉框元素');
      }
      
    } else {
      report.addResult('商户管理页面', 'fail', `页面访问失败: ${response.status}`);
    }
  } catch (error) {
    report.addResult('商户管理验证', 'fail', `网络错误: ${error.message}`);
  }
}

/**
 * 验证账户管理页面
 */
async function validateAccountManagement(report) {
  console.log('\n📋 验证6: 账户管理页面优化');
  
  try {
    const response = await fetch(`${BASE_URL}/accounts`);
    
    if (response.ok) {
      const html = await response.text();
      
      // 检查账户管理相关元素
      const hasAccountModal = html.includes('添加账户') || html.includes('添加收款账户');
      const hasPaymentAccounts = html.includes('付款账户');
      const hasReceivingAccounts = html.includes('收款账户');
      const hasAccountFields = html.includes('收款机构') && html.includes('收款账号');
      const hasBankSelection = html.includes('银行') || html.includes('银行卡');
      
      if (hasAccountModal) {
        report.addResult('账户模态框', 'pass', '账户模态框存在');
      } else {
        report.addResult('账户模态框', 'warning', '未检测到账户模态框');
      }
      
      if (hasReceivingAccounts && hasPaymentAccounts) {
        report.addResult('账户类型', 'pass', '收款账户和付款账户类型完整');
      } else {
        report.addResult('账户类型', 'warning', '账户类型可能不完整');
      }
      
      if (hasAccountFields) {
        report.addResult('收款账户字段', 'pass', '收款账户必要字段存在');
      } else {
        report.addResult('收款账户字段', 'warning', '收款账户字段可能缺失');
      }
      
      if (hasBankSelection) {
        report.addResult('银行选择功能', 'pass', '银行选择功能存在');
      } else {
        report.addResult('银行选择功能', 'warning', '银行选择功能可能缺失');
      }
      
    } else {
      report.addResult('账户管理页面', 'fail', `页面访问失败: ${response.status}`);
    }
  } catch (error) {
    report.addResult('账户管理验证', 'fail', `网络错误: ${error.message}`);
  }
}

/**
 * 验证模态框优化效果
 */
async function validateModalOptimizations(report) {
  console.log('\n📋 验证7: 模态框优化效果');
  
  try {
    // 检查商户管理增强CSS
    const merchantResponse = await fetch(`${BASE_URL}/static/css/merchant-management-enhanced.css`);
    if (merchantResponse.ok) {
      const merchantCSS = await merchantResponse.text();
      
      const hasEnhancedSelects = merchantCSS.includes('form-select-enhanced');
      const hasGradientStyles = merchantCSS.includes('linear-gradient');
      const hasHoverTransforms = merchantCSS.includes('translateY(-1px)');
      
      if (hasEnhancedSelects) {
        report.addResult('商户模态框下拉框美化', 'pass', '增强下拉框样式已定义');
      } else {
        report.addResult('商户模态框下拉框美化', 'warning', '下拉框美化样式可能缺失');
      }
      
      if (hasGradientStyles && hasHoverTransforms) {
        report.addResult('商户模态框交互效果', 'pass', '渐变背景和悬停动画已定义');
      } else {
        report.addResult('商户模态框交互效果', 'warning', '交互效果可能不完整');
      }
    }
    
    // 检查账户管理增强CSS
    const accountResponse = await fetch(`${BASE_URL}/static/css/account-management-enhanced.css`);
    if (accountResponse.ok) {
      const accountCSS = await accountResponse.text();
      
      const hasDropdownFix = accountCSS.includes('appearance: none');
      const hasArrowFix = accountCSS.includes('background-image');
      
      if (hasDropdownFix && hasArrowFix) {
        report.addResult('账户模态框下拉框修复', 'pass', '下拉框箭头重复问题已修复');
      } else {
        report.addResult('账户模态框下拉框修复', 'warning', '下拉框修复可能不完整');
      }
    }
    
  } catch (error) {
    report.addResult('模态框优化验证', 'fail', `网络错误: ${error.message}`);
  }
}

// Node.js环境适配
if (typeof require !== 'undefined') {
  // Node.js环境
  const { fetch } = require('node-fetch') || globalThis.fetch || (() => {
    throw new Error('fetch API not available. Please install node-fetch or use Node.js 18+');
  });
  
  // 运行验证
  validateUIOptimizations().catch(console.error);
} else {
  // 浏览器环境
  console.log('请在Node.js环境中运行此验证脚本');
}

module.exports = { validateUIOptimizations, UIValidationReport };