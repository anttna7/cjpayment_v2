#!/bin/bash

echo "=== 服务器环境信息 ==="
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "系统信息: $(uname -a)"
echo "Go版本: $(go version 2>/dev/null || echo '未安装Go')"
echo ""

echo "=== 检查部署目录结构 ==="
if [ -d "/opt" ]; then
    echo "检查 /opt 目录:"
    ls -la /opt/ | head -20
    echo ""

    # 查找CJPayment相关目录
    find /opt -name "*cjpayment*" -type d 2>/dev/null | while read dir; do
        echo "发现CJPayment目录: $dir"
        echo "目录结构:"
        ls -la "$dir"
        echo ""

        # 检查web目录
        if [ -d "$dir/web" ]; then
            echo "✅ web目录存在: $dir/web"
            echo "web目录内容:"
            ls -la "$dir/web/"
            echo ""

            if [ -d "$dir/web/templates" ]; then
                echo "✅ templates目录存在"
                echo "Templates文件数量: $(ls -1 "$dir/web/templates/" 2>/dev/null | wc -l)"
                echo "关键模板文件检查:"
                for template in login.html page_summary.html dashboard.html; do
                    if [ -f "$dir/web/templates/$template" ]; then
                        echo "  ✅ $template 存在"
                    else
                        echo "  ❌ $template 缺失"
                    fi
                done
            else
                echo "❌ templates目录缺失"
            fi

            if [ -d "$dir/web/static" ]; then
                echo "✅ static目录存在"
                echo "Static目录结构:"
                find "$dir/web/static" -type f | head -10
            else
                echo "❌ static目录缺失"
            fi
        else
            echo "❌ web目录缺失在: $dir"
        fi

        # 检查二进制文件
        if [ -f "$dir/cjpayment" ]; then
            echo "✅ 二进制文件存在: $dir/cjpayment"
            echo "文件权限: $(ls -la "$dir/cjpayment")"
            echo "文件大小: $(du -h "$dir/cjpayment")"
        else
            echo "❌ 二进制文件缺失"
        fi
        echo "----------------------------------------"
    done
fi

echo ""
echo "=== 检查进程和端口 ==="
echo "监听端口8091的进程:"
lsof -i :8091 2>/dev/null || echo "端口8091未被监听"
echo ""

echo "CJPayment相关进程:"
ps aux | grep cjpayment | grep -v grep || echo "未发现CJPayment进程"
echo ""

echo "=== 网络连接测试 ==="
echo "本地连接测试:"
curl -I "http://localhost:8091" 2>/dev/null || echo "本地连接失败"
curl -I "http://localhost:8091/login" 2>/dev/null || echo "登录页面连接失败"
curl -I "http://localhost:8091/summary" 2>/dev/null || echo "总结页面连接失败"
echo ""

echo "=== 防火墙状态 ==="
ufw status 2>/dev/null || echo "UFW防火墙未安装或未启用"
echo ""

echo "=== 系统资源 ==="
echo "内存使用:"
free -h
echo ""
echo "磁盘使用:"
df -h | grep -E '(Filesystem|/dev/)'
echo ""

echo "=== 日志检查 ==="
if [ -d "/var/log" ]; then
    echo "最近的系统日志错误:"
    tail -20 /var/log/syslog 2>/dev/null | grep -i error || echo "无明显错误"
fi

echo ""
echo "=== 建议的修复步骤 ==="
echo "1. 确保web目录结构完整"
echo "2. 检查文件权限"
echo "3. 验证进程正常运行"
echo "4. 测试端口连通性"
