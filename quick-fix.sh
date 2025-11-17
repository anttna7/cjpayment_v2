#!/bin/bash

# 快速修复登录功能脚本
# 只更新必要的文件，避免完整重新部署

SERVER_IP="139.196.54.251"

echo "=========================================="
echo "CJPayment 快速登录修复"
echo "服务器: $SERVER_IP"
echo "=========================================="

# 创建修复包目录
FIX_DIR="login_fix_$(date +%H%M%S)"
mkdir -p "$FIX_DIR"

# 复制需要更新的文件
echo "准备修复文件..."
cp web/static/js/auth.js "$FIX_DIR/"
cp web/templates/login.html "$FIX_DIR/"

# 创建远程修复脚本
cat > "$FIX_DIR/apply_fix.sh" << 'EOF'
#!/bin/bash
echo "=== 应用登录修复 ==="

# 查找CJPayment目录
CJPAY_DIR=$(find /opt /root -maxdepth 2 -name "cjpayment_linux_amd64_*" -type d | head -1)
if [ -z "$CJPAY_DIR" ]; then
    echo "❌ 未找到CJPayment部署目录"
    exit 1
fi

echo "发现部署目录: $CJPAY_DIR"

# 备份原文件
echo "备份原文件..."
cp "$CJPAY_DIR/web/static/js/auth.js" "$CJPAY_DIR/web/static/js/auth.js.backup" 2>/dev/null
cp "$CJPAY_DIR/web/templates/login.html" "$CJPAY_DIR/web/templates/login.html.backup" 2>/dev/null

# 应用修复
echo "应用修复文件..."
cp auth.js "$CJPAY_DIR/web/static/js/"
cp login.html "$CJPAY_DIR/web/templates/"

echo "✅ 修复文件已应用"
echo "无需重启服务，刷新浏览器页面即可生效"
EOF

chmod +x "$FIX_DIR/apply_fix.sh"

# 打包
tar -czf "${FIX_DIR}.tar.gz" "$FIX_DIR"

echo "第1步：上传修复包..."
scp "${FIX_DIR}.tar.gz" root@$SERVER_IP:/root/

echo "第2步：在服务器上应用修复..."
ssh root@$SERVER_IP << REMOTE_EOF
cd /root
tar -xzf "${FIX_DIR}.tar.gz"
cd "$FIX_DIR"
./apply_fix.sh
cd ..
rm -rf "$FIX_DIR" "${FIX_DIR}.tar.gz"
REMOTE_EOF

# 清理本地文件
rm -rf "$FIX_DIR" "${FIX_DIR}.tar.gz"

echo ""
echo "🎉 登录修复完成！"
echo ""
echo "修复内容："
echo "✅ 修正了API端点路径（/api/v1/auth/login → /api/login）"
echo "✅ 修正了响应数据结构解析（response.data.tokens.access_token → response.token）"
echo "✅ 修正了登录后跳转路径（/admin → /dashboard）"
echo "✅ 更新了登录页面演示账户信息"
echo ""
echo "📋 现在可以使用以下正确账户登录："
echo "用户名: admin     密码: 123456"
echo "用户名: manager   密码: manager123"
echo "用户名: auditor   密码: audit123"
echo "用户名: cjpayment 密码: cjpay2025"
echo ""
echo "🔗 登录地址: http://$SERVER_IP:8091/login"
echo ""
echo "请刷新浏览器页面，然后尝试登录！"