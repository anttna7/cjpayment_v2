#!/bin/bash

# CJPayment 紧急修复脚本
# 直接使用sshpass或期望的方式连接

SERVER_IP="139.196.54.251"
SERVER_PASS="Cjpay2025"

echo "=========================================="
echo "CJPayment 紧急修复方案"
echo "服务器: $SERVER_IP"
echo "时间: $(date)"
echo "=========================================="

echo ""
echo "方案1：使用sshpass直接连接（如果可用）"
echo "----------------------------------------"
if command -v sshpass >/dev/null 2>&1; then
    echo "发现sshpass，尝试连接..."
    
    # 上传最新构建包
    echo "上传构建包..."
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no dist/cjpayment_linux_amd64_20250926_101758.tar.gz root@$SERVER_IP:/root/
    
    # 执行部署
    echo "执行远程部署..."
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'REMOTE_FIX'
    
    echo "开始紧急修复..."
    
    # 停止现有服务
    pkill -9 -f cjpayment 2>/dev/null || echo "无现有进程"
    lsof -ti :8091 | xargs kill -9 2>/dev/null || echo "端口已释放"
    
    # 解压新版本
    cd /root
    tar -xzf cjpayment_linux_amd64_20250926_101758.tar.gz
    cd cjpayment_linux_amd64_20250926_101758
    
    # 启动服务
    chmod +x cjpayment
    nohup ./cjpayment > cjpayment.log 2>&1 &
    echo $! > cjpayment.pid
    
    echo "服务已启动，PID: $(cat cjpayment.pid)"
    sleep 5
    
    # 检查状态
    ps aux | grep cjpayment | grep -v grep
    lsof -i :8091
    
    echo "日志文件前10行:"
    head -10 cjpayment.log 2>/dev/null || echo "无日志"
    
REMOTE_FIX

else
    echo "❌ sshpass未安装，请手动执行以下步骤:"
    echo ""
    echo "1. SSH连接服务器:"
    echo "   ssh root@$SERVER_IP"
    echo "   密码: $SERVER_PASS"
    echo ""
    echo "2. 在服务器上执行:"
    cat << 'MANUAL_STEPS'
    
    # 停止现有服务
    pkill -9 -f cjpayment
    lsof -ti :8091 | xargs kill -9
    
    # 检查是否有现有部署
    ls -la /root/*cjpayment*
    
    # 如果有旧版本，进入目录
    cd /root/cjpayment_linux_amd64_*
    
    # 启动服务
    chmod +x cjpayment
    nohup ./cjpayment > cjpayment.log 2>&1 &
    echo $! > cjpayment.pid
    
    # 检查状态
    ps aux | grep cjpayment | grep -v grep
    lsof -i :8091
    tail -20 cjpayment.log

MANUAL_STEPS
fi

echo ""
echo "方案2：本地测试服务是否正常"
echo "----------------------------------------"
echo "启动本地测试服务..."

# 清理本地进程
pkill -f "go run" 2>/dev/null || echo "无本地进程"

# 启动本地服务进行测试
echo "启动本地服务在8092端口..."
CJPAY_PORT=8092 go run frontend_demo.go &
LOCAL_PID=$!
echo "本地测试服务PID: $LOCAL_PID"

sleep 5

echo "测试本地服务..."
curl -I http://localhost:8092/ 2>/dev/null || echo "本地服务启动失败"

echo ""
echo "方案3：重新构建并创建最小化版本"
echo "----------------------------------------"
echo "创建最小化二进制版本..."

# 创建最小化构建
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o cjpayment_minimal frontend_demo.go

if [ -f "cjpayment_minimal" ]; then
    echo "✅ 最小化二进制文件创建成功"
    ls -lh cjpayment_minimal
    
    echo "创建快速部署包..."
    mkdir -p minimal_deploy
    cp cjpayment_minimal minimal_deploy/cjpayment
    cp -r web minimal_deploy/
    
    echo "打包..."
    tar -czf cjpayment_minimal_$(date +%H%M%S).tar.gz minimal_deploy/
    
    echo "✅ 最小化部署包已创建"
    ls -lh cjpayment_minimal_*.tar.gz
else
    echo "❌ 最小化构建失败"
fi

echo ""
echo "=========================================="
echo "紧急修复方案总结"
echo "=========================================="
echo ""
echo "1. 如果SSH可连接，构建包会自动上传部署"
echo "2. 如果SSH不可用，请按照手动步骤操作"
echo "3. 最小化版本已准备就绪作为备用方案"
echo ""
echo "建议优先尝试直接SSH登录服务器手动操作"

# 清理本地测试进程
kill $LOCAL_PID 2>/dev/null || echo ""
