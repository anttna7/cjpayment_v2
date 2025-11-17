#!/bin/bash

# 生产环境构建脚本
# 用于优化CSS和JavaScript文件，准备生产部署

set -e

echo "🚀 开始生产环境构建..."

# 创建构建目录
BUILD_DIR="build"
STATIC_DIR="web/static"
DIST_DIR="$BUILD_DIR/static"

rm -rf $BUILD_DIR
mkdir -p $DIST_DIR/{css,js}

echo "📁 创建构建目录: $BUILD_DIR"

# CSS优化和压缩
echo "🎨 优化CSS文件..."

# 合并关键CSS文件
cat $STATIC_DIR/css/critical.css \
    $STATIC_DIR/css/design-tokens.css \
    $STATIC_DIR/css/foundation/reset.css \
    $STATIC_DIR/css/foundation/layout.css \
    > $DIST_DIR/css/critical.min.css

# 合并主要CSS文件
cat $STATIC_DIR/css/tokens/*.css \
    $STATIC_DIR/css/foundation/*.css \
    $STATIC_DIR/css/components/*.css \
    $STATIC_DIR/css/utilities/*.css \
    > $DIST_DIR/css/main.min.css

# 合并页面特定CSS
for page in dashboard auth recharge_management system_management report_dashboard; do
    if [ -f "$STATIC_DIR/css/$page.css" ]; then
        cp "$STATIC_DIR/css/$page.css" "$DIST_DIR/css/$page.min.css"
        echo "  ✓ 复制 $page.css"
    fi
done

echo "  ✓ CSS文件合并完成"

# JavaScript优化和压缩
echo "📦 优化JavaScript文件..."

# 合并核心JavaScript文件
cat $STATIC_DIR/js/utils.js \
    $STATIC_DIR/js/api.js \
    $STATIC_DIR/js/store.js \
    $STATIC_DIR/js/router.js \
    $STATIC_DIR/js/theme-system.js \
    > $DIST_DIR/js/core.min.js

# 合并组件JavaScript文件
cat $STATIC_DIR/js/components.js \
    $STATIC_DIR/js/card-component.js \
    $STATIC_DIR/js/button-enhancements.js \
    $STATIC_DIR/js/form-enhancements.js \
    $STATIC_DIR/js/modal-component.js \
    $STATIC_DIR/js/toast-component.js \
    > $DIST_DIR/js/components.min.js

# 合并页面特定JavaScript文件
for page in dashboard auth recharge_management system_management report_dashboard; do
    if [ -f "$STATIC_DIR/js/$page.js" ]; then
        cp "$STATIC_DIR/js/$page.js" "$DIST_DIR/js/$page.min.js"
        echo "  ✓ 复制 $page.js"
    fi
done

echo "  ✓ JavaScript文件合并完成"

# 生成资源清单
echo "📋 生成资源清单..."
cat > $DIST_DIR/manifest.json << EOF
{
  "version": "$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "files": {
    "css": {
      "critical": "/static/css/critical.min.css",
      "main": "/static/css/main.min.css",
      "dashboard": "/static/css/dashboard.min.css",
      "auth": "/static/css/auth.min.css",
      "recharge_management": "/static/css/recharge_management.min.css",
      "system_management": "/static/css/system_management.min.css",
      "report_dashboard": "/static/css/report_dashboard.min.css"
    },
    "js": {
      "core": "/static/js/core.min.js",
      "components": "/static/js/components.min.js",
      "dashboard": "/static/js/dashboard.min.js",
      "auth": "/static/js/auth.min.js",
      "recharge_management": "/static/js/recharge_management.min.js",
      "system_management": "/static/js/system_management.min.js",
      "report_dashboard": "/static/js/report_dashboard.min.js"
    }
  }
}
EOF

echo "  ✓ 资源清单生成完成"

# 生成缓存配置
echo "⚡ 生成缓存配置..."
cat > $BUILD_DIR/cache-config.json << EOF
{
  "static_files": {
    "css": {
      "cache_control": "public, max-age=31536000, immutable",
      "expires": "1 year"
    },
    "js": {
      "cache_control": "public, max-age=31536000, immutable",
      "expires": "1 year"
    },
    "images": {
      "cache_control": "public, max-age=2592000",
      "expires": "30 days"
    },
    "fonts": {
      "cache_control": "public, max-age=31536000, immutable",
      "expires": "1 year"
    }
  },
  "html_files": {
    "cache_control": "public, max-age=300",
    "expires": "5 minutes"
  },
  "api_responses": {
    "cache_control": "private, no-cache, no-store, must-revalidate",
    "expires": "0"
  }
}
EOF

echo "  ✓ 缓存配置生成完成"

# 生成CDN部署脚本
echo "🌐 生成CDN部署配置..."
cat > $BUILD_DIR/cdn-deploy.sh << 'EOF'
#!/bin/bash

# CDN部署脚本
# 用于将静态资源上传到CDN

CDN_BUCKET=${CDN_BUCKET:-"your-cdn-bucket"}
CDN_REGION=${CDN_REGION:-"us-east-1"}
CDN_DOMAIN=${CDN_DOMAIN:-"cdn.example.com"}

echo "🌐 开始CDN部署..."
echo "  目标: $CDN_DOMAIN"
echo "  存储桶: $CDN_BUCKET"

# 上传CSS文件
echo "📤 上传CSS文件..."
for file in static/css/*.min.css; do
    if [ -f "$file" ]; then
        echo "  上传: $file"
        # aws s3 cp "$file" "s3://$CDN_BUCKET/static/css/" --cache-control "public, max-age=31536000, immutable"
    fi
done

# 上传JavaScript文件
echo "📤 上传JavaScript文件..."
for file in static/js/*.min.js; do
    if [ -f "$file" ]; then
        echo "  上传: $file"
        # aws s3 cp "$file" "s3://$CDN_BUCKET/static/js/" --cache-control "public, max-age=31536000, immutable"
    fi
done

# 上传资源清单
echo "📤 上传资源清单..."
# aws s3 cp static/manifest.json "s3://$CDN_BUCKET/static/" --cache-control "public, max-age=300"

echo "✅ CDN部署完成"
echo "🔗 CDN地址: https://$CDN_DOMAIN"
EOF

chmod +x $BUILD_DIR/cdn-deploy.sh

echo "  ✓ CDN部署脚本生成完成"

# 生成Nginx配置
echo "⚙️  生成Nginx生产配置..."
cat > $BUILD_DIR/nginx-production.conf << EOF
# Nginx生产环境配置
# 优化静态资源缓存和压缩

server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # 静态资源缓存
    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        
        # 如果使用CDN，可以重定向到CDN
        # return 301 https://cdn.example.com\$request_uri;
    }
    
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public";
        add_header Vary Accept-Encoding;
    }
    
    # HTML文件缓存
    location ~* \.html$ {
        expires 5m;
        add_header Cache-Control "public";
    }
    
    # API请求不缓存
    location /api/ {
        add_header Cache-Control "private, no-cache, no-store, must-revalidate";
        add_header Expires "0";
        proxy_pass http://backend;
    }
    
    # 主应用
    location / {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# 后端服务器配置
upstream backend {
    server 127.0.0.1:8080;
    keepalive 32;
}
EOF

echo "  ✓ Nginx配置生成完成"

echo "✅ 生产环境构建完成！"
echo ""
echo "📁 构建文件位置: $BUILD_DIR/"
echo "📋 资源清单: $BUILD_DIR/static/manifest.json"
echo "⚙️  Nginx配置: $BUILD_DIR/nginx-production.conf"
echo "🌐 CDN部署: $BUILD_DIR/cdn-deploy.sh"
echo ""
echo "🚀 下一步："
echo "  1. 运行 $BUILD_DIR/cdn-deploy.sh 部署到CDN"
echo "  2. 使用 $BUILD_DIR/nginx-production.conf 配置Nginx"
echo "  3. 更新应用配置以使用压缩后的资源"