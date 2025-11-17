#!/bin/bash

# CJPayment服务器诊断脚本
SERVER_IP="139.196.54.251"

echo "=========================================="
echo "CJPayment 服务器诊断工具"
echo "目标服务器: $SERVER_IP"
echo "时间: $(date)"
echo "=========================================="

echo ""
echo "连接服务器进行全面诊断..."

ssh root@$SERVER_IP << 'REMOTE_DIAGNOSIS'

echo "=========================================="
echo "服务器状态诊断"
echo "服务器: $(hostname)"
echo "时间: $(date)"  
echo "=========================================="

echo ""
echo "1. 检查CJPayment进程状态:"
echo "----------------------------------------"
ps aux | grep cjpayment | grep -v grep || echo "❌ 未发现CJPayment进程在运行"

echo ""
echo "2. 检查端口8091占用情况:"
echo "----------------------------------------"  
lsof -i :8091 || echo "❌ 端口8091未被占用"

echo ""
echo "3. 查找CJPayment相关文件:"
echo "----------------------------------------"
echo "在/root目录下查找:"
find /root -name "*cjpayment*" 2>/dev/null || echo "未找到CJPayment相关文件"

echo ""
echo "4. 检查构建包和解压目录:"
echo "----------------------------------------"
ls -la /root/*.tar.gz 2>/dev/null | grep cjpayment || echo "未找到构建包"
ls -la /root/ | grep cjpayment || echo "未找到解压目录"

echo ""
echo "5. 详细检查CJPayment部署状态:"
echo "----------------------------------------"
CJPAY_DIR=$(find /root -maxdepth 2 -name "*cjpayment*" -type d | head -1)
if [ -n "$CJPAY_DIR" ]; then
    echo "发现部署目录: $CJPAY_DIR"
    cd "$CJPAY_DIR"
    
    echo "目录内容:"
    ls -la
    
    echo ""
    echo "检查关键文件:"
    if [ -f "cjpayment" ]; then
        echo "✅ 二进制文件存在"
        ls -lh cjpayment
        if [ -x "cjpayment" ]; then
            echo "✅ 有执行权限"
        else
            echo "❌ 缺少执行权限"
        fi
    else
        echo "❌ 二进制文件不存在"
    fi
    
    if [ -d "web" ]; then
        echo "✅ web目录存在"
        if [ -d "web/templates" ]; then
            echo "✅ templates目录存在，文件数量: $(ls web/templates/ | wc -l)"
        else
            echo "❌ templates目录不存在"
        fi
    else
        echo "❌ web目录不存在"
    fi
    
    if [ -f "cjpayment.log" ]; then
        echo "✅ 日志文件存在，最近10行:"
        tail -10 cjpayment.log
    else
        echo "❌ 无日志文件"
    fi
    
    if [ -f "cjpayment.pid" ]; then
        PID=$(cat cjpayment.pid 2>/dev/null)
        echo "✅ PID文件存在: $PID"
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ 进程正在运行"
        else
            echo "❌ 进程未运行"
        fi
    else
        echo "❌ PID文件不存在"
    fi
else
    echo "❌ 未找到CJPayment部署目录"
fi

echo ""
echo "6. 系统状态检查:"
echo "----------------------------------------"
echo "端口监听状态:"
netstat -tlnp | grep 8091 || echo "端口8091未监听"

echo ""
echo "磁盘空间:"
df -h | head -5

REMOTE_DIAGNOSIS

echo ""
echo "本地连接测试:"
echo "----------------------------------------"
curl -I http://$SERVER_IP:8091/ 2>/dev/null | head -5 || echo "无法连接到服务器"

echo ""
echo "=========================================="
echo "诊断完成 - 请根据以上信息排查问题"
echo "=========================================="
