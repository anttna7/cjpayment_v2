/**
 * Header统一修复脚本
 * 批量修复各页面的CSS引用、JavaScript引用、通知内容等
 */

const fs = require('fs');
const path = require('path');

// 需要修复的页面列表
const pagesToFix = [
    'dashboard.html',
    'system_management.html', 
    'merchant_management.html',
    'financial_audit.html',
    'account_management.html',
    'report.html'
];

// 统一的CSS引用（在现有CSS之后添加）
const unifiedCSSIncludes = `
    <!-- 统一主题和布局系统 - 确保header组件样式一致 -->
    <link rel="stylesheet" href="/static/css/theme-unified.css">
    <link rel="stylesheet" href="/static/css/header-unified.css">
    <link rel="stylesheet" href="/static/css/layout-unified.css">
    <link rel="stylesheet" href="/static/css/buttons-unified.css">`;

// 统一的JavaScript引用
const unifiedJSIncludes = `
    <!-- 统一Header系统JavaScript -->
    <script src="/static/js/utils.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/components.js"></script>
    <script src="/static/js/header-unified.js"></script>
    <script src="/static/js/theme-system.js"></script>`;

// 统一的通知数据
const unifiedNotifications = `                            <div class="notification-item notification-unread">
                                <div class="notification-icon unread"></div>
                                <div class="notification-content">
                                    <div class="notification-title">系统维护通知</div>
                                    <div class="notification-text">系统将在今晚22:00-24:00进行例行维护</div>
                                    <div class="notification-meta">
                                        <span class="notification-time">2小时前</span>
                                        <span class="notification-new">新</span>
                                    </div>
                                </div>
                            </div>
                            <div class="notification-item notification-unread">
                                <div class="notification-icon unread"></div>
                                <div class="notification-content">
                                    <div class="notification-title">新商户待审核</div>
                                    <div class="notification-text">有2个新商户申请待审核</div>
                                    <div class="notification-meta">
                                        <span class="notification-time">10分钟前</span>
                                        <span class="notification-new">新</span>
                                    </div>
                                </div>
                            </div>
                            <div class="notification-item">
                                <div class="notification-icon"></div>
                                <div class="notification-content">
                                    <div class="notification-title">数据报表已生成</div>
                                    <div class="notification-text">本月财务报表已生成完成</div>
                                    <div class="notification-meta">
                                        <span class="notification-time">1小时前</span>
                                    </div>
                                </div>
                            </div>`;

console.log('🔧 开始统一Header修复...');

// 处理每个页面
pagesToFix.forEach(filename => {
    const filePath = `web/templates/${filename}`;
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        console.log(`📄 处理 ${filename}...`);
        
        // 1. 确保包含统一CSS引用
        if (!content.includes('theme-unified.css')) {
            // 在Header Dropdown修复CSS之前添加统一CSS
            content = content.replace(
                /<!-- Header Dropdown 修复[^>]*-->\s*<link[^>]+header-dropdown-fix\.css[^>]*>/,
                unifiedCSSIncludes + '\n    \n    <!-- Header Dropdown 修复 - 解决通知和用户菜单默认打开状态问题 -->\n    <link rel="stylesheet" href="/static/css/header-dropdown-fix.css">'
            );
            modified = true;
        }
        
        // 2. 确保包含统一JavaScript引用  
        if (!content.includes('header-unified.js')) {
            // 在</body>前添加统一JS引用
            content = content.replace(
                /<\/body>/,
                unifiedJSIncludes + '\n</body>'
            );
            modified = true;
        }
        
        // 3. 统一通知标题和按钮文案
        content = content.replace(
            /<h4>[^<]*通知<\/h4>/g,
            '<h4>系统通知</h4>'
        );
        content = content.replace(
            /<button[^>]+clearNotifications[^>]*>[^<]*<\/button>/g,
            '<button class="notifications__clear" id="clearNotifications">全部标记为已读</button>'
        );
        
        // 4. 确保所有页面都有帮助中心菜单项
        if (!content.includes('帮助中心')) {
            content = content.replace(
                /(<a href="\/settings"[^>]*>[\s\S]*?账户设置[\s\S]*?<\/a>)\s*(<div class="user-menu__divider"><\/div>)/,
                '$1\n                        <a href="/help" class="user-menu__item">\n                            <span class="user-menu__item-icon">❓</span>\n                            帮助中心\n                        </a>\n                        $2'
            );
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${filename} 修复完成`);
        } else {
            console.log(`⏭️ ${filename} 无需修改`);
        }
        
    } catch (error) {
        console.error(`❌ 处理 ${filename} 时发生错误:`, error.message);
    }
});

console.log('🎉 Header统一修复完成！');