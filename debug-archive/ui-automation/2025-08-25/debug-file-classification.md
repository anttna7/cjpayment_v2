# 调试文件分类清单

## 调试脚本 (debug_*.{ext} / temp_*.{ext})
- debug-card-view.js
- debug-css-visibility.js  
- debug-merchant-data.js
- debug-real-browser.js
- debug-table-html.js
- debug-table-no-data.js
- debug-table-structure.js
- check-dashboard.js
- check-table-header.js
- comprehensive-pages-analysis.js
- comprehensive-test-report.js
- comprehensive-validation-test.js
- dashboard-css-debug.js
- audit-redirect-debug.js
- login-debug-playwright.js
- login-verification-test.js
- merchant-modal-ui-check.js
- modal-debug-test.js
- simple-modal-test-fixed.js
- simple-modal-test.js
- test-*.js (所有test开头的JS文件)
- unify-header-fix.js

## 测试数据 (test_data_*.{ext} / sample_*.{ext})
- final-core-test.js
- final-integration-test.js
- final-modal-test.js
- final-verification-test.js
- force-table-display.js
- enhanced-merchant-table-test.js
- merchant-modal-test.js

## 日志文件 (*.log / debug_log_*.{ext})
- server.log
- validation.log
- tmp/build-errors.log

## 临时配置 (temp_config_*.{ext} / debug_*.config)
- validation.db

## 调试截图和媒体文件
- debug-*.png (所有debug开头的PNG文件)
- test-*.png (所有test开头的PNG文件) 
- *.png (项目根目录的所有PNG文件)
- debug-videos/ (整个目录)
- screenshots/ (整个目录)
- audit-debug-results-*/ (整个目录)

## 调试报告文件
- *_DEBUG_*.md
- *_REPORT.md  
- *_COMPREHENSIVE_REPORT.md
- *.json (调试相关的JSON文件)

## 临时脚本
- cleanup_temp_files.sh

## 已有调试目录
- debug/ (已存在的调试目录)
- node_modules/ (第三方依赖)
- tmp/ (临时文件目录)

## 生产文件 (需保留)
- 所有在 web/, internal/, pkg/, cmd/, configs/, migrations/, docs/ 下的文件
- go.mod, go.sum, Makefile, README.md, Dockerfile等核心文件
- scripts/ 下的生产脚本