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
