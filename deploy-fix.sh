#!/bin/bash
# 简化的部署修复脚本

SERVER_IP="139.196.54.251"
PACKAGE=$(ls -t dist/cjpayment_linux_amd64_*.tar.gz | head -1)

if [ -z "$PACKAGE" ]; then
    echo "错误：未找到构建包"
    exit 1
fi

echo "使用构建包: $PACKAGE"
PACKAGE_NAME=$(basename "$PACKAGE")

echo "第1步：上传构建包..."
scp "$PACKAGE" root@$SERVER_IP:/opt/

echo "第2步：部署和启动..."
ssh root@$SERVER_IP << REMOTE_EOF
cd /opt
pkill -f cjpayment || echo "停止旧进程"
lsof -ti :8091 | xargs kill -9 2>/dev/null || echo "释放端口"
sleep 2

# 解压新版本
tar -xzf "$PACKAGE_NAME"
EXTRACT_DIR=\$(basename "$PACKAGE_NAME" .tar.gz)

# 进入目录并启动
cd "\$EXTRACT_DIR"
chmod +x cjpayment

echo "启动服务..."
nohup ./cjpayment > cjpayment.log 2>&1 &
echo \$! > cjpayment.pid
sleep 5

echo "检查服务状态..."
if kill -0 \$(cat cjpayment.pid) 2>/dev/null; then
    echo "✅ 服务启动成功，PID: \$(cat cjpayment.pid)"
else
    echo "❌ 服务启动失败"
    tail -20 cjpayment.log
    exit 1
fi
REMOTE_EOF

echo "第3步：健康检查..."
sleep 5

for endpoint in "" "/login" "/summary"; do
    url="http://$SERVER_IP:8091$endpoint"
    echo "检查: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url")
    
    if [ "$response" = "200" ] || [ "$response" = "302" ] || [ "$response" = "307" ]; then
        echo "✅ $url - HTTP $response"
    else
        echo "❌ $url - HTTP $response"
    fi
    sleep 2
done

echo ""
echo "🎉 部署完成！"
echo "访问地址: http://$SERVER_IP:8091"
echo "页面总结: http://$SERVER_IP:8091/summary"
echo ""
echo "查看日志: ssh root@$SERVER_IP 'cd /opt/$(basename "$PACKAGE" .tar.gz) && tail -f cjpayment.log'"
