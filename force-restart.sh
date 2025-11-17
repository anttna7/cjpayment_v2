#!/bin/bash

# 强制重启CJPayment服务脚本
# 解决多个进程冲突问题

set -e

SERVER_IP="139.196.54.251"
PACKAGE=$(ls -t dist/cjpayment_linux_amd64_*.tar.gz | head -1)

if [ -z "$PACKAGE" ]; then
    echo "错误：未找到构建包"
    exit 1
fi

echo "=========================================="
echo "CJPayment 强制重启部署"
echo "服务器: $SERVER_IP"
echo "构建包: $(basename "$PACKAGE")"
echo "=========================================="

PACKAGE_NAME=$(basename "$PACKAGE")

echo "第1步：上传最新构建包..."
scp "$PACKAGE" root@$SERVER_IP:/opt/

echo "第2步：强制清理所有进程..."
ssh root@$SERVER_IP << 'CLEANUP_EOF'
echo "=== 强制停止所有CJPayment进程 ==="

# 方法1：使用pkill强制终止
echo "尝试使用pkill..."
pkill -9 -f cjpayment || echo "pkill完成"

# 方法2：查找并逐个kill
echo "查找剩余进程..."
ps aux | grep cjpayment | grep -v grep | while read line; do
    PID=$(echo $line | awk '{print $2}')
    echo "发现进程PID: $PID，强制终止..."
    kill -9 $PID 2>/dev/null || echo "进程$PID已终止"
done

# 方法3：强制释放端口8091
echo "强制释放端口8091..."
lsof -ti :8091 | while read pid; do
    echo "端口8091被PID $pid占用，强制终止..."
    kill -9 $pid 2>/dev/null || echo "PID $pid已终止"
done

# 等待进程完全退出
sleep 3

echo "=== 清理完成，检查剩余进程 ==="
remaining=$(ps aux | grep cjpayment | grep -v grep | wc -l)
if [ $remaining -gt 0 ]; then
    echo "警告：仍有 $remaining 个cjpayment进程在运行"
    ps aux | grep cjpayment | grep -v grep
else
    echo "✅ 所有cjpayment进程已清理完成"
fi

echo "检查端口8091状态..."
if lsof -i :8091 > /dev/null 2>&1; then
    echo "警告：端口8091仍被占用"
    lsof -i :8091
else
    echo "✅ 端口8091已释放"
fi
CLEANUP_EOF

echo "第3步：部署新版本..."
ssh root@$SERVER_IP << DEPLOY_EOF
cd /opt

# 备份旧版本目录
if [ -d cjpayment_current ]; then
    mv cjpayment_current cjpayment_old_\$(date +%H%M%S) 2>/dev/null || echo "无需备份"
fi

# 解压新版本
echo "解压 $PACKAGE_NAME..."
tar -xzf "$PACKAGE_NAME"
EXTRACT_DIR=\$(basename "$PACKAGE_NAME" .tar.gz)

if [ ! -d "\$EXTRACT_DIR" ]; then
    echo "错误：解压失败，目录不存在"
    exit 1
fi

# 创建软链接
ln -sf "\$EXTRACT_DIR" cjpayment_current
cd cjpayment_current

# 设置权限
chmod +x cjpayment
chmod +x *.sh 2>/dev/null || echo "脚本权限设置完成"

echo "=== 验证文件完整性 ==="
echo "二进制文件: \$(ls -lh cjpayment)"
echo "web目录: \$(ls -ld web/)"
echo "模板文件数量: \$(find web/templates -name '*.html' | wc -l)"
echo "静态文件数量: \$(find web/static -type f | wc -l)"

echo "=== 启动新服务 ==="
echo "当前目录: \$(pwd)"
echo "启动命令: nohup ./cjpayment > cjpayment.log 2>&1 &"

# 启动服务
nohup ./cjpayment > cjpayment.log 2>&1 &
NEW_PID=\$!
echo \$NEW_PID > cjpayment.pid

echo "新服务PID: \$NEW_PID"

# 等待启动
echo "等待服务启动..."
for i in {1..10}; do
    if kill -0 \$NEW_PID 2>/dev/null; then
        echo "服务运行正常 (\$i/10)"
        sleep 1
    else
        echo "❌ 服务启动失败"
        echo "查看错误日志："
        tail -20 cjpayment.log 2>/dev/null || echo "无日志文件"
        exit 1
    fi
done

echo "✅ 服务启动成功，PID: \$NEW_PID"

# 显示初始日志
echo "=== 服务启动日志 ==="
head -20 cjpayment.log 2>/dev/null || echo "等待日志生成..."
DEPLOY_EOF

echo "第4步：健康检查..."
echo "等待服务完全启动..."
sleep 10

# 健康检查
check_count=0
success_count=0

endpoints=("" "/login" "/summary" "/dashboard" "/static/css/main.css")

for endpoint in "${endpoints[@]}"; do
    url="http://$SERVER_IP:8091$endpoint"
    echo "检查: $url"

    response=$(curl -s -o /dev/null -w "%{http_code}" -L --connect-timeout 5 --max-time 10 "$url" 2>/dev/null || echo "000")

    check_count=$((check_count + 1))

    case "$response" in
        "200"|"302"|"307")
            echo "✅ $url - HTTP $response"
            success_count=$((success_count + 1))
            ;;
        "404")
            echo "❌ $url - HTTP $response (页面未找到)"
            ;;
        "500")
            echo "❌ $url - HTTP $response (服务器内部错误)"
            ;;
        "000")
            echo "❌ $url - 连接失败"
            ;;
        *)
            echo "❌ $url - HTTP $response"
            ;;
    esac
    sleep 2
done

echo ""
echo "=========================================="
echo "健康检查结果: $success_count/$check_count 通过"
echo "=========================================="

if [ $success_count -eq $check_count ]; then
    echo "🎉 部署成功！所有检查都通过了"
    echo ""
    echo "✅ 可以访问的地址："
    echo "🔗 主页: http://$SERVER_IP:8091"
    echo "📋 页面总结: http://$SERVER_IP:8091/summary"
    echo "🔐 登录页面: http://$SERVER_IP:8091/login"
    echo "🏠 管理后台: http://$SERVER_IP:8091/dashboard"

elif [ $success_count -gt 0 ]; then
    echo "⚠️  部分服务正常，请检查失败的端点"
    echo ""
    echo "正常服务数量: $success_count/$check_count"
    echo "建议检查服务器日志了解详细错误信息"

else
    echo "❌ 部署失败，所有检查都没有通过"
    echo ""
    echo "🔧 故障排除建议："
    echo "1. 检查服务器日志:"
    echo "   ssh root@$SERVER_IP 'cd /opt/cjpayment_current && tail -50 cjpayment.log'"
    echo ""
    echo "2. 检查进程状态:"
    echo "   ssh root@$SERVER_IP 'ps aux | grep cjpayment'"
    echo ""
    echo "3. 检查端口状态:"
    echo "   ssh root@$SERVER_IP 'lsof -i :8091'"
fi

echo ""
echo "🔧 管理命令："
echo "📄 查看日志: ssh root@$SERVER_IP 'cd /opt/cjpayment_current && tail -f cjpayment.log'"
echo "⏹️  停止服务: ssh root@$SERVER_IP 'cd /opt/cjpayment_current && kill \$(cat cjpayment.pid)'"
echo "🔄 重启服务: ssh root@$SERVER_IP 'cd /opt/cjpayment_current && kill \$(cat cjpayment.pid) && nohup ./cjpayment > cjpayment.log 2>&1 & && echo \$! > cjpayment.pid'"

echo ""
echo "部署完成！"