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
