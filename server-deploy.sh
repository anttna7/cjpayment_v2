#!/bin/bash

# 服务器端CJPayment部署脚本
# 在阿里云服务器上直接执行

set -e

echo "=========================================="
echo "CJPayment 服务器端部署脚本"
echo "服务器: $(hostname)"
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "时间: $(date)"
echo "=========================================="

# 第1步：强制停止现有进程
echo ""
echo "第1步：清理现有进程..."

echo "查找现有CJPayment进程:"
ps aux | grep cjpayment | grep -v grep || echo "未发现CJPayment进程"

echo "强制终止所有CJPayment进程..."
pkill -9 -f cjpayment 2>/dev/null || echo "进程清理完成"

echo "释放端口8091..."
lsof -ti :8091 | xargs kill -9 2>/dev/null || echo "端口8091已释放"

sleep 3

echo "验证进程清理结果:"
remaining=$(ps aux | grep cjpayment | grep -v grep | wc -l)
if [ $remaining -gt 0 ]; then
    echo "警告: 仍有 $remaining 个CJPayment进程在运行"
    ps aux | grep cjpayment | grep -v grep
    echo "继续手动清理..."
    ps aux | grep cjpayment | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || echo "手动清理完成"
else
    echo "✅ 所有CJPayment进程已清理"
fi

# 第2步：检查并获取构建包
echo ""
echo "第2步：检查构建包..."

# 检查是否已有构建包
if [ -f "cjpayment_linux_amd64_*.tar.gz" ]; then
    PACKAGE=$(ls -t cjpayment_linux_amd64_*.tar.gz | head -1)
    echo "发现本地构建包: $PACKAGE"
else
    echo "未找到构建包，需要从开发机获取"
    echo "请使用以下命令从开发机上传:"
    echo "scp dist/cjpayment_linux_amd64_*.tar.gz root@$(hostname -I | awk '{print $1}'):/root/"
    echo ""
    echo "或者如果已上传到其他位置，请将文件移动到当前目录:"
    echo "find / -name 'cjpayment_linux_amd64_*.tar.gz' 2>/dev/null | head -5"

    # 尝试查找可能的构建包位置
    echo ""
    echo "搜索可能的构建包位置:"
    find /opt /tmp /root -name 'cjpayment_linux_amd64_*.tar.gz' 2>/dev/null | head -5 || echo "未找到构建包文件"

    # 如果在/opt目录找到，复制过来
    if find /opt -name 'cjpayment_linux_amd64_*.tar.gz' 2>/dev/null | head -1; then
        FOUND_PACKAGE=$(find /opt -name 'cjpayment_linux_amd64_*.tar.gz' 2>/dev/null | head -1)
        echo "发现构建包: $FOUND_PACKAGE"
        echo "复制到当前目录..."
        cp "$FOUND_PACKAGE" ./
        PACKAGE=$(basename "$FOUND_PACKAGE")
    else
        echo "❌ 未找到构建包，请先上传文件"
        exit 1
    fi
fi

# 第3步：解压和部署
echo ""
echo "第3步：解压和部署..."

if [ ! -f "$PACKAGE" ]; then
    echo "❌ 构建包文件不存在: $PACKAGE"
    exit 1
fi

echo "解压构建包: $PACKAGE"
tar -xzf "$PACKAGE"

EXTRACT_DIR=$(basename "$PACKAGE" .tar.gz)
if [ ! -d "$EXTRACT_DIR" ]; then
    echo "❌ 解压失败，目录不存在: $EXTRACT_DIR"
    exit 1
fi

echo "进入部署目录: $EXTRACT_DIR"
cd "$EXTRACT_DIR"

# 第4步：验证文件完整性
echo ""
echo "第4步：验证文件完整性..."

echo "当前目录内容:"
ls -la

if [ ! -f "cjpayment" ]; then
    echo "❌ 二进制文件不存在"
    exit 1
fi

if [ ! -d "web" ]; then
    echo "❌ web目录不存在"
    exit 1
fi

if [ ! -d "web/templates" ]; then
    echo "❌ web/templates目录不存在"
    exit 1
fi

# 检查关键模板文件
critical_templates=("login.html" "page_summary.html" "dashboard.html")
for template in "${critical_templates[@]}"; do
    if [ -f "web/templates/$template" ]; then
        echo "✅ 模板文件存在: $template"
    else
        echo "❌ 模板文件缺失: $template"
        echo "模板目录内容:"
        ls -la web/templates/
        exit 1
    fi
done

echo "✅ 文件完整性验证通过"

# 第5步：设置权限和启动服务
echo ""
echo "第5步：设置权限和启动服务..."

echo "设置二进制文件权限..."
chmod +x cjpayment

echo "设置脚本权限..."
chmod +x *.sh 2>/dev/null || echo "无启动脚本文件"

echo "当前工作目录: $(pwd)"
echo "二进制文件信息: $(ls -lh cjpayment)"

echo "启动CJPayment服务..."
nohup ./cjpayment > cjpayment.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > cjpayment.pid

echo "新服务PID: $NEW_PID"

# 第6步：验证启动
echo ""
echo "第6步：验证服务启动..."

echo "等待服务启动..."
sleep 10

if kill -0 $NEW_PID 2>/dev/null; then
    echo "✅ 服务运行正常，PID: $NEW_PID"

    echo ""
    echo "服务启动日志:"
    echo "----------------------------------------"
    head -30 cjpayment.log 2>/dev/null || echo "日志文件尚未生成"
    echo "----------------------------------------"

    echo ""
    echo "进程状态:"
    ps aux | grep cjpayment | grep -v grep

    echo ""
    echo "端口监听状态:"
    lsof -i :8091 2>/dev/null || echo "端口检查失败，但服务可能正在启动"

else
    echo "❌ 服务启动失败"
    echo "错误日志:"
    tail -50 cjpayment.log 2>/dev/null || echo "无日志文件"
    exit 1
fi

# 第7步：健康检查
echo ""
echo "第7步：本地健康检查..."

sleep 5

echo "测试本地连接:"
for endpoint in "" "/login" "/summary" "/dashboard"; do
    url="http://localhost:8091$endpoint"
    echo -n "检查 $url ... "

    response=$(curl -s -o /dev/null -w "%{http_code}" -L --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    case "$response" in
        "200"|"302"|"307")
            echo "✅ HTTP $response"
            ;;
        "404")
            echo "❌ HTTP $response (页面未找到)"
            ;;
        "500")
            echo "❌ HTTP $response (服务器内部错误)"
            ;;
        "000")
            echo "❌ 连接失败"
            ;;
        *)
            echo "❌ HTTP $response"
            ;;
    esac
    sleep 1
done

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="

echo ""
echo "📋 访问信息:"
echo "🔗 外部访问: http://$(curl -s ifconfig.me):8091"
echo "🔗 内网访问: http://$(hostname -I | awk '{print $1}'):8091"
echo "📋 页面总结: http://$(curl -s ifconfig.me):8091/summary"
echo "🔐 登录页面: http://$(curl -s ifconfig.me):8091/login"

echo ""
echo "🔧 管理命令:"
echo "📄 查看日志: tail -f $(pwd)/cjpayment.log"
echo "⏹️  停止服务: kill $(cat cjpayment.pid)"
echo "🔄 重启服务: kill $(cat cjpayment.pid) && nohup ./cjpayment > cjpayment.log 2>&1 & && echo \\$! > cjpayment.pid"
echo "📊 进程状态: ps aux | grep cjpayment | grep -v grep"
echo "🌐 端口状态: lsof -i :8091"

echo ""
echo "📂 部署位置: $(pwd)"
echo "📊 服务PID: $(cat cjpayment.pid 2>/dev/null || echo '未知')"

echo ""
echo "✅ CJPayment 部署成功！"