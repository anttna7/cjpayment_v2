#!/bin/bash

# CJPayment项目编译打包脚本
# 生成可直接部署的二进制文件

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# 项目信息
PROJECT_NAME="cjpayment"
VERSION=$(date +"%Y%m%d_%H%M%S")
BUILD_DIR="build"
DIST_DIR="dist"

# 支持的操作系统和架构
TARGETS=(
    "linux/amd64"   # 阿里云Linux服务器
    "linux/arm64"   # ARM架构服务器
    "darwin/amd64"  # macOS Intel
    "darwin/arm64"  # macOS M1/M2
)

log "开始编译 $PROJECT_NAME v$VERSION"

# 清理旧文件
rm -rf $BUILD_DIR $DIST_DIR
mkdir -p $BUILD_DIR $DIST_DIR

# 检查Go环境
if ! command -v go &> /dev/null; then
    error "Go环境未安装"
fi

info "Go版本: $(go version)"

# 设置Go环境变量
export CGO_ENABLED=0
export GO111MODULE=on

# 编译各个平台版本
for target in "${TARGETS[@]}"; do
    os=$(echo $target | cut -d'/' -f1)
    arch=$(echo $target | cut -d'/' -f2)

    output_name="$PROJECT_NAME"
    if [ "$os" = "windows" ]; then
        output_name+=".exe"
    fi

    output_path="$BUILD_DIR/${PROJECT_NAME}_${os}_${arch}"
    if [ "$os" = "windows" ]; then
        output_path+=".exe"
    fi

    log "编译 $os/$arch..."

    GOOS=$os GOARCH=$arch go build \
        -ldflags="-w -s -X main.Version=$VERSION -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -o "$output_path" \
        frontend_demo.go

    if [ $? -eq 0 ]; then
        info "✅ $os/$arch 编译完成: $output_path"

        # 创建发布包
        release_dir="$DIST_DIR/${PROJECT_NAME}_${os}_${arch}_$VERSION"
        mkdir -p "$release_dir"

        # 复制二进制文件
        cp "$output_path" "$release_dir/$output_name"

        # 复制必要的资源文件
        cp -r web "$release_dir/"

        # 如果有internal目录中的资源文件，也复制
        if [ -d "internal" ]; then
            # 只复制配置文件和模板，不复制Go代码
            find internal -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" | while read file; do
                target_dir="$release_dir/$(dirname $file)"
                mkdir -p "$target_dir"
                cp "$file" "$target_dir/"
            done
        fi

        # 创建启动脚本
        if [ "$os" = "linux" ]; then
            cat > "$release_dir/start.sh" << 'EOF'
#!/bin/bash
# CJPayment启动脚本

# 检查端口是否被占用
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo "端口 $1 已被占用"
        exit 1
    fi
}

# 设置环境变量
export PORT=8091
export GIN_MODE=release

# 检查端口
check_port $PORT

echo "启动 CJPayment 系统..."
echo "访问地址: http://localhost:$PORT"

# 后台运行
nohup ./cjpayment > cjpayment.log 2>&1 &
echo $! > cjpayment.pid

echo "服务已启动，PID: $(cat cjpayment.pid)"
echo "查看日志: tail -f cjpayment.log"
echo "停止服务: kill $(cat cjpayment.pid)"
EOF
            chmod +x "$release_dir/start.sh"

            # 创建停止脚本
            cat > "$release_dir/stop.sh" << 'EOF'
#!/bin/bash
# CJPayment停止脚本

if [ -f "cjpayment.pid" ]; then
    PID=$(cat cjpayment.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "服务已停止 (PID: $PID)"
        rm -f cjpayment.pid
    else
        echo "服务未运行"
        rm -f cjpayment.pid
    fi
else
    echo "PID文件不存在，尝试强制停止..."
    pkill -f cjpayment
fi
EOF
            chmod +x "$release_dir/stop.sh"
        fi

        # 创建README
        cat > "$release_dir/README.md" << EOF
# CJPayment 部署包

版本: $VERSION
编译时间: $(date)
目标平台: $os/$arch

## 快速启动

### Linux系统:
\`\`\`bash
# 给执行权限
chmod +x cjpayment

# 直接运行
./cjpayment

# 或使用启动脚本（后台运行）
./start.sh
\`\`\`

### 访问地址
- 主页: http://localhost:8091
- 健康检查: http://localhost:8091/health

### 停止服务
\`\`\`bash
# 如果使用start.sh启动
./stop.sh

# 或直接kill进程
kill \$(cat cjpayment.pid)
\`\`\`

### 配置说明
- 默认端口: 8091
- 日志文件: cjpayment.log
- 静态资源: web/目录

### 环境变量
可通过环境变量进行配置:
- PORT: 服务端口 (默认8091)
- GIN_MODE: 运行模式 (推荐生产环境设为release)

### 目录结构
- cjpayment: 主程序
- web/: 前端资源
- start.sh: 启动脚本 (仅Linux)
- stop.sh: 停止脚本 (仅Linux)
- README.md: 说明文档
EOF

        # 打包
        cd "$DIST_DIR"
        if command -v tar &> /dev/null; then
            tar -czf "${PROJECT_NAME}_${os}_${arch}_$VERSION.tar.gz" "${PROJECT_NAME}_${os}_${arch}_$VERSION"
            info "📦 已打包: ${PROJECT_NAME}_${os}_${arch}_$VERSION.tar.gz"
        fi
        cd - > /dev/null

    else
        error "❌ $os/$arch 编译失败"
    fi
done

# 显示编译结果
log "编译完成!"
echo ""
info "二进制文件目录: $BUILD_DIR/"
ls -la $BUILD_DIR/

echo ""
info "发布包目录: $DIST_DIR/"
ls -la $DIST_DIR/

echo ""
info "部署说明:"
echo "1. 选择对应平台的二进制文件"
echo "2. 上传到服务器并给执行权限: chmod +x cjpayment"
echo "3. 直接运行: ./cjpayment"
echo "4. 或解压发布包使用启动脚本"

# 生成部署命令示例
echo ""
info "快速部署到阿里云Linux服务器:"
echo "scp $DIST_DIR/${PROJECT_NAME}_linux_amd64_$VERSION.tar.gz root@your-server:/opt/"
echo "ssh root@your-server 'cd /opt && tar -xzf ${PROJECT_NAME}_linux_amd64_$VERSION.tar.gz && cd ${PROJECT_NAME}_linux_amd64_$VERSION && ./start.sh'"