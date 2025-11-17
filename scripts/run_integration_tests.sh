#!/bin/bash

# 充值测试系统 - 集成测试执行脚本
# 运行系统集成测试和用户验收测试

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查测试依赖..."
    
    # 检查Go环境
    if ! command -v go &> /dev/null; then
        log_error "Go 未安装或不在PATH中"
        exit 1
    fi
    
    # 检查数据库连接
    if ! go run scripts/check_db_connection.go; then
        log_error "数据库连接失败"
        exit 1
    fi
    
    # 检查Redis连接
    if command -v redis-cli &> /dev/null; then
        if ! redis-cli ping > /dev/null 2>&1; then
            log_warning "Redis 连接失败，某些测试可能会跳过"
        fi
    else
        log_warning "Redis CLI 未找到，某些测试可能会跳过"
    fi
    
    log_success "依赖检查完成"
}

# 准备测试环境
prepare_test_environment() {
    log_info "准备测试环境..."
    
    # 设置测试环境变量
    export GO_ENV=test
    export DB_NAME=cjpayment_test
    export REDIS_DB=1
    
    # 创建测试数据库
    log_info "创建测试数据库..."
    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};" 2>/dev/null || true
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    go run cmd/migrate/main.go -env=test
    
    # 清理之前的测试数据
    log_info "清理测试数据..."
    go run scripts/database-reset.go -env=test
    
    log_success "测试环境准备完成"
}

# 运行系统集成测试
run_system_integration_tests() {
    log_info "开始运行系统集成测试..."
    
    # 设置测试超时
    export TEST_TIMEOUT=30m
    
    # 运行系统集成测试
    if go test -v -timeout=${TEST_TIMEOUT} ./tests/integration/system_integration_test.go; then
        log_success "系统集成测试通过"
        return 0
    else
        log_error "系统集成测试失败"
        return 1
    fi
}

# 运行业务流程验证测试
run_business_process_tests() {
    log_info "开始运行业务流程验证测试..."
    
    if go test -v -timeout=20m ./tests/integration/business_process_validation_test.go; then
        log_success "业务流程验证测试通过"
        return 0
    else
        log_error "业务流程验证测试失败"
        return 1
    fi
}

# 运行性能和并发测试
run_performance_tests() {
    log_info "开始运行性能和并发测试..."
    
    # 检查是否跳过长时间运行的测试
    if [[ "$SKIP_LONG_TESTS" == "true" ]]; then
        log_warning "跳过长时间运行的性能测试"
        go test -v -short -timeout=10m ./tests/performance/concurrency_stress_test.go
    else
        go test -v -timeout=30m ./tests/performance/concurrency_stress_test.go
    fi
    
    if [[ $? -eq 0 ]]; then
        log_success "性能和并发测试通过"
        return 0
    else
        log_error "性能和并发测试失败"
        return 1
    fi
}

# 运行安全渗透测试
run_security_tests() {
    log_info "开始运行安全渗透测试..."
    
    if go test -v -timeout=15m ./tests/security/penetration_test.go; then
        log_success "安全渗透测试通过"
        return 0
    else
        log_error "安全渗透测试失败"
        return 1
    fi
}

# 运行前端UI/UX测试
run_frontend_tests() {
    log_info "开始运行前端UI/UX测试..."
    
    # 检查Node.js和npm
    if command -v npm &> /dev/null; then
        # 安装测试依赖
        if [[ ! -d "node_modules" ]]; then
            log_info "安装前端测试依赖..."
            npm install --save-dev jest jsdom
        fi
        
        # 运行前端测试
        if npm test -- --testPathPattern=ui-ux-integration.test.js; then
            log_success "前端UI/UX测试通过"
            return 0
        else
            log_error "前端UI/UX测试失败"
            return 1
        fi
    else
        log_warning "Node.js 未安装，跳过前端测试"
        return 0
    fi
}

# 生成测试报告
generate_test_report() {
    log_info "生成测试报告..."
    
    local report_dir="test-reports"
    local report_file="${report_dir}/integration-test-report-$(date +%Y%m%d-%H%M%S).html"
    
    mkdir -p "$report_dir"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>充值测试系统 - 集成测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .test-section { margin-bottom: 30px; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .skipped { background: #fff3cd; color: #856404; }
        .summary { background: #e9ecef; padding: 15px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>充值测试系统 - 集成测试报告</h1>
        <p>生成时间: $(date)</p>
        <p>测试环境: $(go env GOOS)/$(go env GOARCH)</p>
        <p>Go版本: $(go version)</p>
    </div>
    
    <div class="summary">
        <h2>测试摘要</h2>
        <p>系统集成测试: <span class="test-result ${SYSTEM_TEST_RESULT}">${SYSTEM_TEST_RESULT}</span></p>
        <p>业务流程测试: <span class="test-result ${BUSINESS_TEST_RESULT}">${BUSINESS_TEST_RESULT}</span></p>
        <p>性能测试: <span class="test-result ${PERFORMANCE_TEST_RESULT}">${PERFORMANCE_TEST_RESULT}</span></p>
        <p>安全测试: <span class="test-result ${SECURITY_TEST_RESULT}">${SECURITY_TEST_RESULT}</span></p>
        <p>前端测试: <span class="test-result ${FRONTEND_TEST_RESULT}">${FRONTEND_TEST_RESULT}</span></p>
    </div>
    
    <div class="test-section">
        <h2>测试详情</h2>
        <p>详细的测试日志请查看控制台输出或CI/CD系统日志。</p>
    </div>
    
    <div class="test-section">
        <h2>建议</h2>
        <ul>
            <li>所有测试通过后，系统可以进入生产环境</li>
            <li>如有测试失败，请检查相关功能并修复后重新测试</li>
            <li>定期运行集成测试以确保系统稳定性</li>
        </ul>
    </div>
</body>
</html>
EOF
    
    log_success "测试报告已生成: $report_file"
}

# 清理测试环境
cleanup_test_environment() {
    log_info "清理测试环境..."
    
    # 清理测试数据库
    mysql -u root -p -e "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
    
    # 清理临时文件
    rm -rf /tmp/cjpayment-test-*
    
    log_success "测试环境清理完成"
}

# 主函数
main() {
    local start_time=$(date +%s)
    local failed_tests=0
    
    echo "========================================"
    echo "充值测试系统 - 集成测试和用户验收测试"
    echo "========================================"
    echo
    
    # 检查命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-long)
                export SKIP_LONG_TESTS=true
                log_info "将跳过长时间运行的测试"
                shift
                ;;
            --skip-security)
                export SKIP_SECURITY_TESTS=true
                log_info "将跳过安全测试"
                shift
                ;;
            --skip-frontend)
                export SKIP_FRONTEND_TESTS=true
                log_info "将跳过前端测试"
                shift
                ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  --skip-long      跳过长时间运行的测试"
                echo "  --skip-security  跳过安全测试"
                echo "  --skip-frontend  跳过前端测试"
                echo "  --help, -h       显示此帮助信息"
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                exit 1
                ;;
        esac
    done
    
    # 执行测试步骤
    check_dependencies
    prepare_test_environment
    
    # 运行各类测试
    echo
    log_info "开始执行集成测试..."
    echo
    
    # 系统集成测试
    if run_system_integration_tests; then
        SYSTEM_TEST_RESULT="passed"
    else
        SYSTEM_TEST_RESULT="failed"
        ((failed_tests++))
    fi
    
    # 业务流程验证测试
    if run_business_process_tests; then
        BUSINESS_TEST_RESULT="passed"
    else
        BUSINESS_TEST_RESULT="failed"
        ((failed_tests++))
    fi
    
    # 性能测试
    if run_performance_tests; then
        PERFORMANCE_TEST_RESULT="passed"
    else
        PERFORMANCE_TEST_RESULT="failed"
        ((failed_tests++))
    fi
    
    # 安全测试
    if [[ "$SKIP_SECURITY_TESTS" == "true" ]]; then
        SECURITY_TEST_RESULT="skipped"
    elif run_security_tests; then
        SECURITY_TEST_RESULT="passed"
    else
        SECURITY_TEST_RESULT="failed"
        ((failed_tests++))
    fi
    
    # 前端测试
    if [[ "$SKIP_FRONTEND_TESTS" == "true" ]]; then
        FRONTEND_TEST_RESULT="skipped"
    elif run_frontend_tests; then
        FRONTEND_TEST_RESULT="passed"
    else
        FRONTEND_TEST_RESULT="failed"
        ((failed_tests++))
    fi
    
    # 生成测试报告
    generate_test_report
    
    # 清理环境
    cleanup_test_environment
    
    # 计算总耗时
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo
    echo "========================================"
    echo "测试执行完成"
    echo "========================================"
    echo "总耗时: ${minutes}分${seconds}秒"
    echo "失败测试数: $failed_tests"
    echo
    
    if [[ $failed_tests -eq 0 ]]; then
        log_success "🎉 所有测试都通过了！系统已准备好进入生产环境。"
        exit 0
    else
        log_error "❌ 有 $failed_tests 个测试失败，请检查并修复相关问题。"
        exit 1
    fi
}

# 信号处理
trap cleanup_test_environment EXIT

# 运行主函数
main "$@"