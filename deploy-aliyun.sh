#!/bin/bash

# CJPayment系统阿里云自动部署脚本
# 作者：CJPayment开发团队
# 版本：1.0.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "请不要使用root用户运行此脚本，建议创建专用用户"
    fi
}

# 检查系统环境
check_system() {
    log "检查系统环境..."

    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        error "不支持的操作系统"
    fi

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error "Docker未安装，请先安装Docker"
    fi

    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装，请先安装Docker Compose"
    fi

    # 检查Git
    if ! command -v git &> /dev/null; then
        error "Git未安装，请先安装Git"
    fi

    log "系统环境检查通过"
}

# 创建必要目录
create_directories() {
    log "创建项目目录结构..."

    mkdir -p logs/nginx
    mkdir -p data
    mkdir -p ssl
    mkdir -p backups

    log "目录结构创建完成"
}

# 配置环境变量
setup_environment() {
    log "配置环境变量..."

    if [[ ! -f .env.aliyun ]]; then
        error ".env.aliyun配置文件不存在，请先创建并配置"
    fi

    # 复制环境配置
    cp .env.aliyun .env

    log "请确认.env文件中的配置是否正确"
    log "数据库密码、Redis密码等敏感信息需要修改"

    read -p "是否已确认环境配置？(y/n): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        error "请先确认并修改环境配置"
    fi
}

# 构建Docker镜像
build_image() {
    log "构建Docker镜像..."

    docker build -f Dockerfile.aliyun -t cjpayment:latest .

    if [[ $? -eq 0 ]]; then
        log "Docker镜像构建成功"
    else
        error "Docker镜像构建失败"
    fi
}

# 停止现有服务
stop_services() {
    log "停止现有服务..."

    if docker-compose -f docker-compose.aliyun.yml ps | grep -q "Up"; then
        docker-compose -f docker-compose.aliyun.yml down
        log "现有服务已停止"
    else
        log "未发现运行中的服务"
    fi
}

# 启动服务
start_services() {
    log "启动CJPayment服务..."

    # 启动基础服务（不包括监控）
    docker-compose -f docker-compose.aliyun.yml up -d

    if [[ $? -eq 0 ]]; then
        log "服务启动成功"
    else
        error "服务启动失败"
    fi
}

# 启动监控服务
start_monitoring() {
    if [[ "$1" == "--with-monitoring" ]]; then
        log "启动监控服务..."
        docker-compose -f docker-compose.aliyun.yml --profile monitoring up -d
        log "监控服务启动成功"
        log "Prometheus: http://your-server:9090"
        log "Grafana: http://your-server:3000 (admin/admin)"
    fi
}

# 健康检查
health_check() {
    log "执行健康检查..."

    sleep 30  # 等待服务启动

    # 检查应用服务
    for i in {1..10}; do
        if curl -f http://localhost:8091/health &>/dev/null; then
            log "应用服务健康检查通过"
            break
        else
            if [[ $i -eq 10 ]]; then
                error "应用服务健康检查失败"
            fi
            log "等待应用服务启动... ($i/10)"
            sleep 10
        fi
    done

    # 检查Nginx
    if curl -f http://localhost/health &>/dev/null; then
        log "Nginx服务健康检查通过"
    else
        warn "Nginx服务可能未正确启动，请检查配置"
    fi
}

# 显示服务状态
show_status() {
    log "服务状态："
    echo ""
    docker-compose -f docker-compose.aliyun.yml ps
    echo ""

    log "访问地址："
    echo "应用服务: http://localhost:8091"
    echo "Nginx代理: http://localhost"
    echo "MySQL: localhost:3306"
    echo "Redis: localhost:6379"
    echo ""
}

# 显示日志
show_logs() {
    if [[ "$1" == "--logs" ]]; then
        log "显示服务日志..."
        docker-compose -f docker-compose.aliyun.yml logs -f
    fi
}

# 备份功能
backup_data() {
    if [[ "$1" == "--backup" ]]; then
        log "执行数据备份..."

        BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
        BACKUP_DIR="backups/backup_${BACKUP_DATE}"
        mkdir -p "$BACKUP_DIR"

        # 备份MySQL
        docker exec cjpayment-mysql mysqldump -u cjpayment -p${DB_PASSWORD} cjpayment > "$BACKUP_DIR/mysql_backup.sql"

        # 备份Redis
        docker exec cjpayment-redis redis-cli save
        docker cp cjpayment-redis:/data/dump.rdb "$BACKUP_DIR/redis_backup.rdb"

        # 备份应用日志
        cp -r logs "$BACKUP_DIR/"

        log "数据备份完成: $BACKUP_DIR"
    fi
}

# SSL证书配置提醒
ssl_reminder() {
    warn "SSL证书配置提醒："
    echo "1. 请将SSL证书文件放置到 ssl/ 目录下"
    echo "2. 修改 nginx/conf.d/cjpayment.conf 中的域名和证书路径"
    echo "3. 或使用Let's Encrypt自动申请证书"
    echo ""
}

# 主函数
main() {
    log "开始CJPayment系统阿里云部署..."
    echo ""

    check_root
    check_system
    create_directories
    setup_environment

    # 停止现有服务
    stop_services

    # 构建和启动
    build_image
    start_services
    start_monitoring "$@"

    # 健康检查
    health_check

    # 显示状态
    show_status

    # SSL提醒
    ssl_reminder

    log "CJPayment系统部署完成！"
    echo ""
    log "常用命令："
    echo "查看日志: docker-compose -f docker-compose.aliyun.yml logs -f"
    echo "重启服务: docker-compose -f docker-compose.aliyun.yml restart"
    echo "停止服务: docker-compose -f docker-compose.aliyun.yml down"
    echo "备份数据: ./deploy-aliyun.sh --backup"
    echo ""

    # 处理其他参数
    backup_data "$@"
    show_logs "$@"
}

# 脚本帮助信息
show_help() {
    echo "CJPayment阿里云部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help              显示帮助信息"
    echo "  --with-monitoring   启用监控服务(Prometheus + Grafana)"
    echo "  --logs              部署完成后显示日志"
    echo "  --backup            执行数据备份"
    echo ""
    echo "示例:"
    echo "  $0                  基础部署"
    echo "  $0 --with-monitoring --logs  部署并启用监控，显示日志"
    echo "  $0 --backup         仅执行备份"
    echo ""
}

# 参数处理
case "$1" in
    --help)
        show_help
        exit 0
        ;;
    --backup)
        backup_data "$1"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac