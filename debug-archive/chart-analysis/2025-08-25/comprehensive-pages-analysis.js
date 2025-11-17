const { webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

class ComprehensivePagesAnalysis {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    this.browser = await webkit.launch({ 
      headless: false, 
      slowMo: 1000,
      args: ['--disable-web-security', '--allow-running-insecure-content']
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    this.page = await this.context.newPage();
    
    // 启用控制台日志捕获
    this.page.on('console', (msg) => {
      console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    });

    // 捕获网络请求失败
    this.page.on('requestfailed', (request) => {
      console.log(`[NETWORK FAIL]: ${request.url()} - ${request.failure()?.errorText || 'Unknown'}`);
    });
  }

  async analyzePage(pageInfo) {
    const { name, url, description } = pageInfo;
    console.log(`\n📍 正在分析: ${name} (${url})`);

    try {
      // 清除存储和缓存
      await this.context.clearCookies();
      await this.page.goto('about:blank');
      
      // 访问页面
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      
      console.log(`✅ 页面响应状态: ${response?.status()}`);

      // 等待页面加载完成
      await this.page.waitForTimeout(3000);

      // 获取页面源码
      const pageSource = await this.page.content();
      
      // 分析CSS文件
      const cssFiles = await this.extractResourceFiles(pageSource, 'css');
      console.log(`🎨 CSS文件数量: ${cssFiles.length}`);
      
      // 分析JS文件
      const jsFiles = await this.extractResourceFiles(pageSource, 'js');
      console.log(`📜 JS文件数量: ${jsFiles.length}`);

      // 检查文件存在性和响应状态
      const cssStatus = await this.checkFilesStatus(cssFiles);
      const jsStatus = await this.checkFilesStatus(jsFiles);

      // 检查页面样式
      const styleCheck = await this.checkPageStyles();
      
      // 检查JavaScript错误
      const jsErrors = await this.checkJavaScriptErrors();

      // 截图
      const screenshotPath = `/Users/c/Desktop/labs/cjpay/cjpayment/debug-${name.replace(/\s+/g, '-')}.png`;
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });

      // 获取模板文件路径
      const templatePath = this.identifyTemplatePath(url);

      const result = {
        name,
        url,
        description,
        templatePath,
        responseStatus: response?.status(),
        cssFiles: {
          total: cssFiles.length,
          files: cssFiles,
          status: cssStatus
        },
        jsFiles: {
          total: jsFiles.length,
          files: jsFiles,
          status: jsStatus
        },
        styleCheck,
        jsErrors,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      return result;

    } catch (error) {
      console.error(`❌ 分析页面 ${name} 时出错:`, error.message);
      
      const errorResult = {
        name,
        url,
        description,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(errorResult);
      return errorResult;
    }
  }

  extractResourceFiles(pageSource, type) {
    const files = [];
    let regex;
    
    if (type === 'css') {
      regex = /<link[^>]*rel=['"](stylesheet|preload)['"]*[^>]*href=['"]([^'"]*\.css[^'"]*)['"]/gi;
    } else if (type === 'js') {
      regex = /<script[^>]*src=['"]([^'"]*\.js[^'"]*)['"]/gi;
    }
    
    let match;
    while ((match = regex.exec(pageSource)) !== null) {
      const filePath = type === 'css' ? match[2] : match[1];
      if (filePath && !files.includes(filePath)) {
        files.push(filePath);
      }
    }
    
    return files;
  }

  async checkFilesStatus(files) {
    const status = {};
    
    for (const file of files) {
      try {
        let fullUrl;
        if (file.startsWith('http')) {
          fullUrl = file;
        } else if (file.startsWith('/')) {
          fullUrl = `http://127.0.0.1:8091${file}`;
        } else {
          fullUrl = `http://127.0.0.1:8091/${file}`;
        }

        const response = await this.page.goto(fullUrl, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        status[file] = {
          status: response?.status(),
          exists: response?.status() < 400,
          fullUrl
        };

        if (response?.status() >= 400) {
          console.log(`❌ 文件不存在: ${file} (${response.status()})`);
        } else {
          console.log(`✅ 文件存在: ${file}`);
        }
      } catch (error) {
        status[file] = {
          status: 'ERROR',
          exists: false,
          error: error.message,
          fullUrl: file
        };
        console.log(`❌ 检查文件失败: ${file} - ${error.message}`);
      }
    }
    
    return status;
  }

  async checkPageStyles() {
    try {
      // 检查基本样式元素
      const bodyStyles = await this.page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontFamily: styles.fontFamily
        };
      });

      // 检查按钮样式
      const buttonStyles = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn');
        const buttonStyleInfo = [];
        
        buttons.forEach((btn, index) => {
          if (index < 3) { // 只检查前3个按钮
            const styles = window.getComputedStyle(btn);
            buttonStyleInfo.push({
              text: btn.textContent?.trim() || `按钮${index + 1}`,
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              display: styles.display
            });
          }
        });
        
        return buttonStyleInfo;
      });

      return {
        body: bodyStyles,
        buttons: buttonStyles,
        hasStyles: bodyStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' || 
                   bodyStyles.color !== 'rgb(0, 0, 0)'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkJavaScriptErrors() {
    const errors = [];
    
    // 监听页面错误
    this.page.on('pageerror', (error) => {
      errors.push({
        type: 'PAGE_ERROR',
        message: error.message,
        stack: error.stack
      });
    });

    // 检查控制台错误
    try {
      const consoleErrors = await this.page.evaluate(() => {
        const errors = [];
        const originalError = console.error;
        console.error = function(...args) {
          errors.push(args.join(' '));
          originalError.apply(console, args);
        };
        
        // 触发一些可能的错误检查
        setTimeout(() => {
          if (typeof initializePage === 'function') {
            try {
              initializePage();
            } catch (e) {
              errors.push('initializePage error: ' + e.message);
            }
          }
        }, 100);
        
        return errors;
      });
      
      return [...errors, ...consoleErrors.map(msg => ({ type: 'CONSOLE_ERROR', message: msg }))];
    } catch (error) {
      return [{ type: 'CHECK_ERROR', message: error.message }];
    }
  }

  identifyTemplatePath(url) {
    const pathMap = {
      '/login': '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/login.html',
      '/dashboard': '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/dashboard.html',
      '/merchant': '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/merchant_management.html',
      '/system_management': '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/system_management.html',
      '/audit': '/Users/c/Desktop/labs/cjpay/cjpayment/web/templates/financial_audit.html'
    };

    for (const [path, template] of Object.entries(pathMap)) {
      if (url.includes(path)) {
        return template;
      }
    }
    
    return 'Unknown';
  }

  async testSpecificFunctionality(url) {
    const functionality = {};
    
    try {
      if (url.includes('/merchant')) {
        // 测试商户管理页面的添加按钮
        const addButton = await this.page.$('button:has-text("添加商户"), .btn:has-text("添加"), button:has-text("新增")');
        if (addButton) {
          await addButton.click();
          await this.page.waitForTimeout(2000);
          
          const modal = await this.page.$('.modal, .dialog, [role="dialog"]');
          functionality.addMerchantModal = {
            buttonExists: true,
            modalOpened: !!modal
          };
        } else {
          functionality.addMerchantModal = {
            buttonExists: false,
            modalOpened: false
          };
        }
      }
      
      if (url.includes('/dashboard')) {
        // 测试仪表板跳转
        const auditLink = await this.page.$('a[href*="audit"], button:has-text("财务审核")');
        functionality.auditNavigation = {
          linkExists: !!auditLink
        };
      }
    } catch (error) {
      functionality.error = error.message;
    }
    
    return functionality;
  }

  async generateReport() {
    const reportPath = '/Users/c/Desktop/labs/cjpay/cjpayment/comprehensive-pages-analysis-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: this.results.length,
        successfulAnalysis: this.results.filter(r => !r.error).length,
        failedAnalysis: this.results.filter(r => r.error).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 报告已生成: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      if (!result.error) {
        // 检查缺失的CSS文件
        const missingCSS = Object.entries(result.cssFiles.status || {})
          .filter(([_, status]) => !status.exists)
          .map(([file, _]) => file);
        
        if (missingCSS.length > 0) {
          recommendations.push({
            page: result.name,
            type: 'MISSING_CSS',
            files: missingCSS,
            suggestion: `在正确位置创建或修复这些CSS文件`
          });
        }

        // 检查缺失的JS文件
        const missingJS = Object.entries(result.jsFiles.status || {})
          .filter(([_, status]) => !status.exists)
          .map(([file, _]) => file);
        
        if (missingJS.length > 0) {
          recommendations.push({
            page: result.name,
            type: 'MISSING_JS',
            files: missingJS,
            suggestion: `在正确位置创建或修复这些JS文件`
          });
        }
      }
    });
    
    return recommendations;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 主执行函数
async function runComprehensiveAnalysis() {
  const analyzer = new ComprehensivePagesAnalysis();
  
  const pagesToAnalyze = [
    {
      name: '登录页面',
      url: 'http://127.0.0.1:8091/login',
      description: '用户登录界面'
    },
    {
      name: 'Dashboard页面',
      url: 'http://127.0.0.1:8091/dashboard',
      description: '主仪表板页面'
    },
    {
      name: '商户管理页面',
      url: 'http://127.0.0.1:8091/merchant',
      description: '商户管理界面'
    },
    {
      name: '系统管理页面',
      url: 'http://127.0.0.1:8091/system_management',
      description: '系统管理界面'
    },
    {
      name: '财务审核页面',
      url: 'http://127.0.0.1:8091/audit',
      description: '财务审核界面'
    }
  ];

  try {
    console.log('🚀 开始全面页面分析...\n');
    
    await analyzer.init();
    
    // 逐个分析页面
    for (const pageInfo of pagesToAnalyze) {
      const result = await analyzer.analyzePage(pageInfo);
      
      // 测试特定功能
      if (!result.error) {
        const functionality = await analyzer.testSpecificFunctionality(pageInfo.url);
        result.functionality = functionality;
      }
      
      console.log(`\n✅ ${pageInfo.name} 分析完成`);
      await analyzer.page.waitForTimeout(2000);
    }
    
    // 生成报告
    const report = await analyzer.generateReport();
    
    console.log('\n📊 分析总结:');
    console.log(`总页面数: ${report.summary.totalPages}`);
    console.log(`成功分析: ${report.summary.successfulAnalysis}`);
    console.log(`分析失败: ${report.summary.failedAnalysis}`);
    console.log(`建议修复项: ${report.recommendations.length}`);
    
    return report;
    
  } catch (error) {
    console.error('❌ 分析过程中出错:', error);
  } finally {
    await analyzer.cleanup();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runComprehensiveAnalysis()
    .then(() => {
      console.log('\n🎉 全面分析完成!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 分析失败:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensivePagesAnalysis, runComprehensiveAnalysis };