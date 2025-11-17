#!/bin/bash

# CJPayment 完整服务器部署脚本
# 从本地上传并部署到阿里云服务器

set -e

SERVER_IP="139.196.54.251"
SERVER_USER="root"
SERVER_PASSWORD="Cjpay2025"
PACKAGE_NAME="cjpayment_linux_amd64_20250926_101758.tar.gz"

echo "=========================================="
echo "CJPayment 完整服务器部署流程"
echo "目标服务器: $SERVER_IP"
echo "构建包: $PACKAGE_NAME"
echo "时间: $(date)"
echo "=========================================="

# 第1步：验证本地构建包
echo ""
echo "第1步：验证本地构建包..."

if [ ! -f "dist/$PACKAGE_NAME" ]; then
    echo "❌ 构建包不存在: dist/$PACKAGE_NAME"
    echo "请先运行构建脚本: ./build.sh"
    exit 1
fi

echo "✅ 发现构建包: dist/$PACKAGE_NAME"
ls -lh "dist/$PACKAGE_NAME"

# 第2步：上传构建包到服务器
echo ""
echo "第2步：上传构建包到服务器..."

echo "正在上传构建包到服务器..."
scp "dist/$PACKAGE_NAME" root@$SERVER_IP:/root/

if [ $? -eq 0 ]; then
    echo "✅ 构建包上传成功"
else
    echo "❌ 构建包上传失败"
    exit 1
fi

# 第3步：在服务器上执行部署
echo ""
echo "第3步：在服务器上执行部署..."

echo "连接服务器并执行部署流程..."

# 创建远程部署脚本
ssh root@$SERVER_IP << 'REMOTE_DEPLOY_SCRIPT'

echo "=========================================="
echo "服务器端部署执行"
echo "服务器: $(hostname)"
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "时间: $(date)"
echo "=========================================="

# 停止现有服务
echo ""
echo "步骤1：清理现有进程..."

echo "查找现有CJPayment进程:"
ps aux | grep cjpayment | grep -v grep || echo "未发现CJPayment进程"

echo "强制终止所有CJPayment进程..."
pkill -9 -f cjpayment 2>/dev/null || echo "进程清理完成"

echo "释放端口8091..."
lsof -ti :8091 | xargs kill -9 2>/dev/null || echo "端口8091已释放"

sleep 3

# 解压和部署
echo ""
echo "步骤2：解压和部署新版本..."

PACKAGE="cjpayment_linux_amd64_20250926_101758.tar.gz"

if [ ! -f "$PACKAGE" ]; then
    echo "❌ 构建包文件不存在: $PACKAGE"
    exit 1
fi

echo "解压构建包: $PACKAGE"
tar -xzf "$PACKAGE"

EXTRACT_DIR="cjpayment_linux_amd64_20250926_101758"
if [ ! -d "$EXTRACT_DIR" ]; then
    echo "❌ 解压失败，目录不存在: $EXTRACT_DIR"
    exit 1
fi

echo "进入部署目录: $EXTRACT_DIR"
cd "$EXTRACT_DIR"

# 验证文件完整性
echo ""
echo "步骤3：验证文件完整性..."

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

# 启动服务
echo ""
echo "步骤4：启动服务..."

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

# 验证启动
echo ""
echo "步骤5：验证服务启动..."

echo "等待服务启动..."
sleep 10

if kill -0 $NEW_PID 2>/dev/null; then
    echo "✅ 服务运行正常，PID: $NEW_PID"

    echo ""
    echo "服务启动日志:"
    echo "----------------------------------------"
    head -20 cjpayment.log 2>/dev/null || echo "日志文件尚未生成"
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

# 健康检查
echo ""
echo "步骤6：本地健康检查..."

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
echo "服务器端部署完成！"
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

echo ""
echo "📂 部署位置: $(pwd)"
echo "📊 服务PID: $(cat cjpayment.pid 2>/dev/null || echo '未知')"

REMOTE_DEPLOY_SCRIPT

# 第4步：验证部署结果
echo ""
echo "第4步：验证部署结果..."

echo "等待服务完全启动..."
sleep 5

echo "测试外部访问:"
for endpoint in "" "/login" "/summary"; do
    url="http://$SERVER_IP:8091$endpoint"
    echo -n "检查 $url ... "

    response=$(curl -s -o /dev/null -w "%{http_code}" -L --connect-timeout 10 --max-time 15 "$url" 2>/dev/null || echo "000")

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
    sleep 2
done

echo ""
echo "=========================================="
echo "🎉 CJPayment 部署完成！"
echo "=========================================="

echo ""
echo "📋 最终访问信息:"
echo "🔗 主页面: http://$SERVER_IP:8091"
echo "🔗 登录页面: http://$SERVER_IP:8091/login"
echo "📋 系统总览: http://$SERVER_IP:8091/summary"
echo "🔗 管理后台: http://$SERVER_IP:8091/dashboard"

echo ""
echo "🔑 登录凭据 (修复后的正确账户):"
echo "用户名: admin     密码: 123456"
echo "用户名: manager   密码: manager123"
echo "用户名: auditor   密码: audit123"
echo "用户名: cjpayment 密码: cjpay2025"

echo ""
echo "✅ 修复内容:"
echo "• 修正了auth.js中所有API端点路径"
echo "• 修正了login.html中的token访问路径"
echo "• 更新了跳转页面路径(/admin → /dashboard)"
echo "• 验证了服务器上的文件完整性"

echo ""
echo "🔧 后续管理:"
echo "• SSH登录: ssh root@$SERVER_IP"
echo "• 查看日志: ssh root@$SERVER_IP 'tail -f /root/cjpayment_linux_amd64_20250926_101758/cjpayment.log'"
echo "• 重启服务: ssh root@$SERVER_IP 'cd /root/cjpayment_linux_amd64_20250926_101758 && ./stop.sh && ./start.sh'"

echo ""
echo "现在您可以访问登录页面并使用修复后的账户进行登录测试！"