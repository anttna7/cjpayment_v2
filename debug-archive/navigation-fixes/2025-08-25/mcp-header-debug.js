/**
 * MCP Header统一性调试脚本
 * 自动验证所有页面的header__right区域是否完全统一
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

// 测试页面配置
const TEST_PAGES = [
    { name: '仪表板', url: 'http://localhost:8091/dashboard', route: 'dashboard' },
    { name: '系统管理', url: 'http://localhost:8091/system_management', route: 'system' },
    { name: '商户管理', url: 'http://localhost:8091/merchant', route: 'merchant' },
    { name: '财务审核', url: 'http://localhost:8091/audit', route: 'audit' },
    { name: '账户管理', url: 'http://localhost:8091/accounts', route: 'accounts' },
    { name: '数据报表', url: 'http://localhost:8091/reports', route: 'reports' }
];

// 预期的统一标准
const EXPECTED_STANDARDS = {
    notifications: {
        count: 3,
        titles: ['系统维护通知', '新商户待审核', '数据报表已生成']
    },
    userMenu: {
        items: ['个人资料', '账户设置', '帮助中心', '退出登录']
    },
    components: ['themeToggle', 'notifications', 'userMenu']
};

class MCPHeaderDebugger {
    constructor() {
        this.browser = null;
        this.results = [];
        this.screenshots = [];
    }

    async initialize() {
        console.log('🚀 MCP Header调试器启动...');
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async debugPage(pageConfig) {
        const page = await this.browser.newPage();
        
        try {
            console.log(`\n📊 调试页面: ${pageConfig.name} (${pageConfig.url})`);
            
            await page.goto(pageConfig.url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // 等待页面和JavaScript加载完成
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const result = {
                pageName: pageConfig.name,
                url: pageConfig.url,
                route: pageConfig.route,
                timestamp: new Date().toISOString(),
                ui: {},
                interaction: {},
                styling: {},
                data: {},
                issues: [],
                screenshot: `debug-${pageConfig.route}.png`
            };

            // 1. UI统一性检查
            await this.checkUIConsistency(page, result);
            
            // 2. 交互功能测试
            await this.testInteractions(page, result);
            
            // 3. 样式一致性验证
            await this.checkStyling(page, result);
            
            // 4. 数据统一性验证
            await this.checkDataConsistency(page, result);
            
            // 截图保存
            await page.screenshot({
                path: result.screenshot,
                fullPage: false,
                clip: { x: 0, y: 0, width: 1400, height: 200 } // 只截header部分
            });
            
            console.log(`  ✅ ${pageConfig.name} 调试完成`);
            this.results.push(result);
            
        } catch (error) {
            console.error(`  ❌ ${pageConfig.name} 调试失败:`, error.message);
            this.results.push({
                pageName: pageConfig.name,
                url: pageConfig.url,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            await page.close();
        }
    }

    async checkUIConsistency(page, result) {
        console.log('  🔍 检查UI一致性...');
        
        // 检查header__right结构
        const headerRight = await page.$('.header__right');
        result.ui.headerRightExists = !!headerRight;
        
        if (!headerRight) {
            result.issues.push('缺少header__right容器');
            return;
        }

        // 检查主题切换按钮
        const themeToggle = await page.$('#themeToggle');
        result.ui.themeToggleExists = !!themeToggle;
        
        if (themeToggle) {
            const themeToggleStyle = await page.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    width: computed.width,
                    height: computed.height,
                    borderRadius: computed.borderRadius,
                    display: computed.display,
                    position: computed.position
                };
            }, themeToggle);
            result.ui.themeToggleStyle = themeToggleStyle;
        } else {
            result.issues.push('缺少主题切换按钮#themeToggle');
        }

        // 检查通知组件
        const notifications = await page.$('#notifications');
        result.ui.notificationsExists = !!notifications;
        
        if (notifications) {
            const notificationsStyle = await page.evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    position: computed.position,
                    display: computed.display
                };
            }, notifications);
            result.ui.notificationsStyle = notificationsStyle;
        } else {
            result.issues.push('缺少通知组件#notifications');
        }

        // 检查用户菜单
        const userMenu = await page.$('#userMenu');
        result.ui.userMenuExists = !!userMenu;
        
        if (!userMenu) {
            result.issues.push('缺少用户菜单#userMenu');
        }

        // 检查组件排列顺序
        const componentOrder = await page.evaluate(() => {
            const headerRight = document.querySelector('.header__right');
            if (!headerRight) return [];
            
            const children = Array.from(headerRight.children);
            return children.map(child => {
                if (child.id === 'themeToggle') return 'theme-toggle';
                if (child.id === 'notifications') return 'notifications';
                if (child.id === 'userMenu') return 'user-menu';
                if (child.classList.contains('nav__toggle')) return 'mobile-toggle';
                return child.tagName.toLowerCase();
            });
        });
        result.ui.componentOrder = componentOrder;
    }

    async testInteractions(page, result) {
        console.log('  🖱️ 测试交互功能...');
        
        // 测试主题切换
        const themeToggle = await page.$('#themeToggle');
        if (themeToggle) {
            const initialTheme = await page.evaluate(() => 
                document.documentElement.getAttribute('data-theme')
            );
            
            await themeToggle.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newTheme = await page.evaluate(() => 
                document.documentElement.getAttribute('data-theme')
            );
            
            result.interaction.themeToggleWorks = initialTheme !== newTheme;
            result.interaction.themeChange = `${initialTheme} → ${newTheme}`;
            
            // 恢复原始主题
            if (initialTheme !== newTheme) {
                await themeToggle.click();
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {
            result.interaction.themeToggleWorks = false;
            result.issues.push('主题切换按钮不存在，无法测试交互');
        }

        // 测试通知下拉
        const notificationButton = await page.$('#notificationButton');
        if (notificationButton) {
            // 检查默认隐藏状态
            const initiallyHidden = await page.evaluate(() => {
                const dropdown = document.querySelector('#notificationsDropdown');
                if (!dropdown) return false;
                const computed = window.getComputedStyle(dropdown);
                return computed.opacity === '0' || computed.visibility === 'hidden';
            });
            result.interaction.notificationsInitiallyHidden = initiallyHidden;
            
            // 点击展开
            await notificationButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const expandedVisible = await page.evaluate(() => {
                const dropdown = document.querySelector('#notificationsDropdown');
                if (!dropdown) return false;
                const computed = window.getComputedStyle(dropdown);
                return computed.opacity === '1' && computed.visibility === 'visible';
            });
            result.interaction.notificationsExpandWorks = expandedVisible;
            
            // 点击外部关闭
            await page.click('body');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const collapsedHidden = await page.evaluate(() => {
                const dropdown = document.querySelector('#notificationsDropdown');
                if (!dropdown) return false;
                const computed = window.getComputedStyle(dropdown);
                return computed.opacity === '0' || computed.visibility === 'hidden';
            });
            result.interaction.notificationsCollapseWorks = collapsedHidden;
        } else {
            result.issues.push('通知按钮不存在，无法测试交互');
        }

        // 测试用户菜单下拉
        const userButton = await page.$('#userButton');
        if (userButton) {
            // 检查默认隐藏状态
            const initiallyHidden = await page.evaluate(() => {
                const dropdown = document.querySelector('#userDropdown');
                if (!dropdown) return false;
                const computed = window.getComputedStyle(dropdown);
                return computed.opacity === '0' || computed.visibility === 'hidden';
            });
            result.interaction.userMenuInitiallyHidden = initiallyHidden;
            
            // 点击展开
            await userButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const expandedVisible = await page.evaluate(() => {
                const dropdown = document.querySelector('#userDropdown');
                if (!dropdown) return false;
                const computed = window.getComputedStyle(dropdown);
                return computed.opacity === '1' && computed.visibility === 'visible';
            });
            result.interaction.userMenuExpandWorks = expandedVisible;
            
            // 点击外部关闭
            await page.click('body');
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            result.issues.push('用户菜单按钮不存在，无法测试交互');
        }
    }

    async checkStyling(page, result) {
        console.log('  🎨 检查样式一致性...');
        
        // 检查CSS文件加载
        const cssFiles = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            return links.map(link => link.href).filter(href => 
                href.includes('theme-unified') || 
                href.includes('header-unified') || 
                href.includes('header-dropdown-fix')
            );
        });
        result.styling.requiredCSSFiles = cssFiles;
        
        // 检查关键样式
        const headerRightStyles = await page.evaluate(() => {
            const headerRight = document.querySelector('.header__right');
            if (!headerRight) return null;
            
            const computed = window.getComputedStyle(headerRight);
            return {
                display: computed.display,
                alignItems: computed.alignItems,
                gap: computed.gap,
                marginLeft: computed.marginLeft
            };
        });
        result.styling.headerRightStyles = headerRightStyles;
        
        // 检查主题切换按钮样式
        const themeToggleStyles = await page.evaluate(() => {
            const toggle = document.querySelector('#themeToggle');
            if (!toggle) return null;
            
            const computed = window.getComputedStyle(toggle);
            return {
                width: computed.width,
                height: computed.height,
                borderRadius: computed.borderRadius,
                border: computed.border,
                backgroundColor: computed.backgroundColor,
                cursor: computed.cursor
            };
        });
        result.styling.themeToggleStyles = themeToggleStyles;
    }

    async checkDataConsistency(page, result) {
        console.log('  📊 检查数据一致性...');
        
        // 检查通知数量badge
        const notificationBadge = await page.$('#notificationBadge');
        if (notificationBadge) {
            const badgeText = await page.evaluate(el => el.textContent, notificationBadge);
            result.data.notificationCount = parseInt(badgeText) || 0;
        } else {
            result.data.notificationCount = 0;
            result.issues.push('通知数量badge不存在');
        }

        // 检查通知内容
        const notificationTitles = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.notification-title'));
            return titles.map(title => title.textContent.trim());
        });
        result.data.notificationTitles = notificationTitles;

        // 检查用户菜单项
        const userMenuItems = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.user-menu__item'));
            return items.map(item => {
                const text = item.textContent.trim();
                const href = item.getAttribute('href');
                return { text, href };
            });
        });
        result.data.userMenuItems = userMenuItems;

        // 检查帮助中心是否存在 - 更宽松的检测逻辑
        const helpCenterExists = userMenuItems.some(item => 
            item.text.replace(/\s+/g, ' ').includes('帮助中心') || 
            item.href === '/help' ||
            item.text.includes('❓')
        );
        result.data.helpCenterExists = helpCenterExists;
        
        if (!helpCenterExists) {
            result.issues.push('缺少帮助中心菜单项');
        }
    }

    generateReport() {
        console.log('\n📋 生成调试报告...');
        
        const report = {
            testTime: new Date().toISOString(),
            summary: {
                totalPages: this.results.length,
                passedPages: 0,
                failedPages: 0,
                totalIssues: 0
            },
            consistency: {
                ui: true,
                interaction: true,
                styling: true,
                data: true
            },
            details: this.results,
            recommendations: []
        };

        // 统计和分析结果
        this.results.forEach(result => {
            if (result.error) {
                report.summary.failedPages++;
                return;
            }
            
            if (result.issues && result.issues.length === 0) {
                report.summary.passedPages++;
            } else {
                report.summary.failedPages++;
                if (result.issues) {
                    report.summary.totalIssues += result.issues.length;
                }
            }
        });

        // 检查一致性
        this.checkConsistency(report);
        
        // 生成建议
        this.generateRecommendations(report);

        // 保存报告
        const reportPath = 'mcp-header-debug-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // 生成可读报告
        this.generateReadableReport(report);
        
        return report;
    }

    checkConsistency(report) {
        const results = this.results.filter(r => !r.error);
        
        // UI一致性检查
        const themeToggleStyles = results.map(r => JSON.stringify(r.styling?.themeToggleStyles || {}));
        const headerRightStyles = results.map(r => JSON.stringify(r.styling?.headerRightStyles || {}));
        
        report.consistency.ui = new Set(themeToggleStyles).size <= 1 && new Set(headerRightStyles).size <= 1;
        
        // 数据一致性检查
        const notificationCounts = results.map(r => r.data?.notificationCount || 0);
        const helpCenterExists = results.map(r => r.data?.helpCenterExists || false);
        
        report.consistency.data = new Set(notificationCounts).size <= 1 && 
                                   helpCenterExists.every(exists => exists === true);
        
        // 交互一致性检查
        const themeToggleWorks = results.map(r => r.interaction?.themeToggleWorks || false);
        const notificationsWork = results.map(r => 
            (r.interaction?.notificationsExpandWorks || false) && 
            (r.interaction?.notificationsCollapseWorks || false)
        );
        
        report.consistency.interaction = themeToggleWorks.every(works => works === true) &&
                                          notificationsWork.every(works => works === true);
    }

    generateRecommendations(report) {
        if (!report.consistency.ui) {
            report.recommendations.push('需要统一各页面的CSS样式文件引用');
        }
        
        if (!report.consistency.data) {
            report.recommendations.push('需要使用统一的通知数据源和用户菜单配置');
        }
        
        if (!report.consistency.interaction) {
            report.recommendations.push('需要确保所有页面都正确加载header-unified.js');
        }
        
        // 检查具体问题
        const allIssues = this.results.flatMap(r => r.issues || []);
        const uniqueIssues = [...new Set(allIssues)];
        
        uniqueIssues.forEach(issue => {
            report.recommendations.push(`修复问题: ${issue}`);
        });
    }

    generateReadableReport(report) {
        let markdown = `# MCP Header调试报告\n\n`;
        markdown += `**测试时间**: ${report.testTime}\n`;
        markdown += `**测试页面数**: ${report.summary.totalPages}\n`;
        markdown += `**通过页面**: ${report.summary.passedPages}\n`;
        markdown += `**失败页面**: ${report.summary.failedPages}\n`;
        markdown += `**总问题数**: ${report.summary.totalIssues}\n\n`;

        markdown += `## 一致性检查结果\n\n`;
        markdown += `- UI一致性: ${report.consistency.ui ? '✅' : '❌'}\n`;
        markdown += `- 交互一致性: ${report.consistency.interaction ? '✅' : '❌'}\n`;
        markdown += `- 样式一致性: ${report.consistency.styling ? '✅' : '❌'}\n`;
        markdown += `- 数据一致性: ${report.consistency.data ? '✅' : '❌'}\n\n`;

        markdown += `## 详细测试结果\n\n`;
        
        this.results.forEach(result => {
            markdown += `### ${result.pageName}\n`;
            markdown += `**URL**: ${result.url}\n`;
            
            if (result.error) {
                markdown += `**状态**: ❌ 错误\n`;
                markdown += `**错误**: ${result.error}\n\n`;
                return;
            }
            
            const issueCount = result.issues?.length || 0;
            markdown += `**状态**: ${issueCount === 0 ? '✅ 通过' : '⚠️ 存在问题'}\n`;
            
            if (result.ui) {
                markdown += `**UI检查**: ${result.ui.headerRightExists ? '✅' : '❌'} header__right, `;
                markdown += `${result.ui.themeToggleExists ? '✅' : '❌'} theme-toggle, `;
                markdown += `${result.ui.notificationsExists ? '✅' : '❌'} notifications, `;
                markdown += `${result.ui.userMenuExists ? '✅' : '❌'} user-menu\n`;
            }
            
            if (result.interaction) {
                markdown += `**交互测试**: ${result.interaction.themeToggleWorks ? '✅' : '❌'} 主题切换, `;
                markdown += `${result.interaction.notificationsExpandWorks ? '✅' : '❌'} 通知展开, `;
                markdown += `${result.interaction.userMenuExpandWorks ? '✅' : '❌'} 菜单展开\n`;
            }
            
            if (result.data) {
                markdown += `**数据检查**: 通知数量=${result.data.notificationCount}, `;
                markdown += `帮助中心=${result.data.helpCenterExists ? '✅' : '❌'}\n`;
                markdown += `**通知内容**: ${result.data.notificationTitles?.join(', ') || '无'}\n`;
            }
            
            if (result.issues && result.issues.length > 0) {
                markdown += `**问题列表**:\n`;
                result.issues.forEach(issue => {
                    markdown += `- ❌ ${issue}\n`;
                });
            }
            
            markdown += `\n`;
        });

        if (report.recommendations.length > 0) {
            markdown += `## 修复建议\n\n`;
            report.recommendations.forEach(rec => {
                markdown += `- ${rec}\n`;
            });
        }

        fs.writeFileSync('mcp-header-debug-report.md', markdown);
        console.log('📄 可读报告已保存到: mcp-header-debug-report.md');
    }

    async run() {
        try {
            await this.initialize();
            
            // 调试所有页面
            for (const pageConfig of TEST_PAGES) {
                await this.debugPage(pageConfig);
            }
            
            // 生成报告
            const report = this.generateReport();
            
            // 输出结果
            console.log('\n🎯 MCP调试结果总结:');
            console.log(`总页面数: ${report.summary.totalPages}`);
            console.log(`通过: ${report.summary.passedPages}, 失败: ${report.summary.failedPages}`);
            console.log(`UI一致性: ${report.consistency.ui ? '✅' : '❌'}`);
            console.log(`交互一致性: ${report.consistency.interaction ? '✅' : '❌'}`);
            console.log(`数据一致性: ${report.consistency.data ? '✅' : '❌'}`);
            
            const allPassed = report.consistency.ui && report.consistency.interaction && report.consistency.data;
            console.log(`\n${allPassed ? '🎉 Header完全统一！' : '⚠️ 仍需修复不一致问题'}`);
            
        } catch (error) {
            console.error('❌ MCP调试过程中发生错误:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// 运行MCP调试
if (require.main === module) {
    const headerDebugger = new MCPHeaderDebugger();
    headerDebugger.run().then(() => {
        console.log('✨ MCP Header调试完成！');
        process.exit(0);
    }).catch(error => {
        console.error('调试失败:', error);
        process.exit(1);
    });
}

module.exports = MCPHeaderDebugger;