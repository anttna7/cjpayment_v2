#!/bin/bash

echo "🧹 开始清理临时和中间文件..."

# 要删除的临时测试文件（根目录）
TEMP_FILES=(
    # 临时测试服务器文件
    "test_routes_server.go"
    "test_simple_server.go"
    "test_server_start.go"
    
    # 临时路由测试文件
    "test_routes_404.go"
    "test_routes_simple.go"
    "test_routes.sh"
    "debug_routes.sh"
    
    # 临时HTML测试页面
    "test_admin_direct.html"
    "test_admin_ui.html"
    "test_admin.html"
    "test_dashboard.html"
    "test_enhanced_dashboard.html"
    "test_full_login.html"
    "test_login.html"
    "debug_js.html"
    
    # 临时账户相关测试文件
    "test_account_modal.html"
    "test_accounts_api_debug.go"
    "test_accounts_api.html"
    "test_accounts_fix_simple.html"
    "test_accounts_page_fix.html"
    
    # 临时商户模态框测试文件
    "test_merchant_button_simple.html"
    "test_merchant_complete_fix.html"
    "test_merchant_modal_close.html"
    "test_merchant_modal_debug.html"
    "test_merchant_modal_fix_final.html"
    "test_merchant_modal_fix.html"
    "test_merchant_modal_syntax_fix_final.html"
    "test_ultra_simple_merchant_modal.html"
    
    # 临时模态框测试文件
    "test_modal_fix_final.html"
    "test_emergency_modal_fix.html"
    "test_emergency_merchant_modal_final.html"
    
    # 临时错误处理测试文件
    "test_enhanced_error_handling.html"
    "test_error_handling.go"
    "test_simple_error_handling.go"
    
    # 临时系统管理测试文件
    "test_system_management_fix.html"
    
    # 临时轮询规则测试文件
    "test_rotation_rules.html"
    "test_rotation_rules_api.go"
    "run_rotation_rules_test.sh"
    "demo_rotation_rules.sh"
    
    # 临时初始化和数据库测试文件
    "test_init_steps.go"
    "test_db_connection.go"
    "verify_admin_pages.go"
    
    # 临时API测试文件
    "test_auxiliary_api.go"
    "test_auxiliary_api_complete.go"
    "test_api_server.go"
    "test_recharge_testing_api.go"
    
    # 临时二进制文件
    "api"
    "cjpayment-api"
    "cjpayment-validation"
    "main"
    "test-routes-server"
    "bin/test_server"
    
    # 临时日志文件
    "server.log"
    "validation.log"
)

# 要删除的web/static临时测试文件
WEB_STATIC_TEMP_FILES=(
    # 临时修复文件
    "test_final_modal_fix.html"
    "test_jquery_fix.html"
    "test_modal_priority.html"
    "test_rotation_fix.html"
    "test_rotation_quick.html"
    "test-merchant-modal-fix.html"
    
    # 临时验证文件
    "js/test-error-handler-verification.js"
    "js/test-merchant-integration-verification.js"
    "js/test-validation-verification.js"
    
    # 保留的测试文件（这些是组件测试，有价值）
    # test-framework.js - 保留
    # test-*.html (组件测试) - 大部分保留
)

# 删除根目录临时文件
echo "删除根目录临时文件..."
for file in "${TEMP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  删除: $file"
        rm "$file"
    fi
done

# 删除web/static临时文件
echo "删除web/static临时文件..."
for file in "${WEB_STATIC_TEMP_FILES[@]}"; do
    if [ -f "web/static/$file" ]; then
        echo "  删除: web/static/$file"
        rm "web/static/$file"
    fi
done

# 删除一些明显的临时JavaScript修复文件
echo "删除临时JavaScript修复文件..."
TEMP_JS_FILES=(
    "web/static/js/rotation-modal-instant-fix.js"
    "web/static/js/final-account-modal-fix.js"
    "web/static/js/emergency-account-modal-fix.js"
    "web/static/js/account-modal-fix.js"
    "web/static/js/modal-fix.js"
    "web/static/js/simple-modal-fix.js"
    "web/static/js/merchant-modal-inline-fix.js"
    "web/static/js/merchant-modal-emergency-fix.js"
    "web/static/js/merchant-modal-simple.js"
    "web/static/js/merchant-button-fix.js"
    "web/static/js/emergency-merchant-modal-fix.js"
    "web/static/js/ultra-simple-merchant-modal.js"
    "web/static/js/simple-account-modal.js"
    "web/static/js/unified-modal-manager.js"
    "web/static/js/emergency-color-fix.js"
)

for file in "${TEMP_JS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  删除: $file"
        rm "$file"
    fi
done

# 删除临时CSS修复文件
echo "删除临时CSS修复文件..."
TEMP_CSS_FILES=(
    "web/static/css/modal-display-fix.css"
    "web/static/css/emergency-accounts-fix.css"
    "web/static/css/accounts-page-fix.css"
    "web/static/css/admin-page-fix.css"
    "web/static/css/report_dashboard_fix.css"
    "web/static/css/unified-color-fix.css"
    "web/static/css/dashboard-fix.css"
)

for file in "${TEMP_CSS_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  删除: $file"
        rm "$file"
    fi
done

# 删除临时修复总结文档
echo "删除临时修复总结文档..."
TEMP_SUMMARY_FILES=(
    "ADMIN_PAGES_404_FIX_SUMMARY.md"
    "ACCOUNTS_PAGE_FIX_SUMMARY.md"
    "ACCOUNTS_UI_MODAL_FIX_SUMMARY.md"
    "ACCOUNT_MODAL_EMERGENCY_FIX_SUMMARY.md"
    "EMERGENCY_MODAL_FIX_SUMMARY.md"
    "EMERGENCY_MERCHANT_MODAL_FIX_COMPLETE.md"
    "JQUERY_FIX_SUMMARY.md"
    "ACCOUNTS_API_FIX_SUMMARY.md"
    "AUXILIARY_API_IMPLEMENTATION_SUMMARY.md"
    "LOGIN_FIX_COMPLETE.md"
    "PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_SUMMARY.md"
    "MODAL_DUPLICATION_FIX_SUMMARY.md"
    "ROTATION_MODAL_FINAL_FIX_SUMMARY.md"
    "NAVIGATION_FIX_COMPLETE.md"
    "ROTATION_MODAL_INSTANT_FIX_SUMMARY.md"
    "MERCHANT_MODAL_FIX_SUMMARY.md"
    "MERCHANT_MODAL_SYNTAX_ERROR_FINAL_FIX_SUMMARY.md"
    "MERCHANT_PAGE_INTEGRATION_COMPLETE.md"
    "MERCHANT_MODAL_MISSING_FIX_SUMMARY.md"
    "MERCHANT_MODAL_NULL_DATA_FIX.md"
    "SYSTEM_MANAGEMENT_API_FIX_SUMMARY.md"
    "ROTATION_RULES_404_FIX_SUMMARY.md"
    "ULTRA_SIMPLE_MERCHANT_MODAL_FIX.md"
    "ROTATION_RULES_IMPLEMENTATION_SUMMARY.md"
    "SYSTEM_MANAGEMENT_JS_FIX_SUMMARY.md"
    "ROUTE_404_FIX_COMPLETE.md"
    "UI_COLOR_FIX_SUMMARY.md"
    "ROTATION_RULES_FIX_SUMMARY.md"
    "ROUTE_FIX_SUCCESS.md"
    "ROUTE_FIX_VERIFICATION.md"
    "RESTART_INSTRUCTIONS.md"
)

for file in "${TEMP_SUMMARY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  删除: $file"
        rm "$file"
    fi
done

echo "✅ 临时文件清理完成！"
echo ""
echo "📋 保留的重要文件："
echo "  • 正式的测试文件（tests/目录下）"
echo "  • 组件测试页面（web/static/test-*.html）"
echo "  • 测试框架（web/static/js/test-framework.js）"
echo "  • 正式的文档（docs/目录下）"
echo "  • 配置文件和部署文件"
echo ""
echo "🗑️  已删除的文件类型："
echo "  • 临时测试HTML页面（test_*.html）"
echo "  • 临时测试Go文件（test_*.go）"
echo "  • 临时修复JavaScript文件"
echo "  • 临时修复CSS文件"
echo "  • 临时修复总结文档（*_FIX_*.md）"
echo "  • 临时二进制文件和日志文件"
echo "  • 临时调试脚本"