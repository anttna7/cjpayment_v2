# CJPayment API 接口文档

## 概述

CJPayment API 提供了完整的企业内部支付系统接口，支持充值管理、账户管理、权限控制、数据报表等功能。

## 基础信息

- **Base URL**: `http://localhost:8080/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 认证

所有API请求（除登录接口外）都需要在请求头中包含JWT Token：

```http
Authorization: Bearer <your-jwt-token>
```

## 通用响应格式

### 成功响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {},
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 错误响应
```json
{
  "code": "10001",
  "message": "error message",
  "details": "detailed error information",
  "trace_id": "uuid",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## 错误码

| 错误码 | 描述 |
|--------|------|
| 00000 | 成功 |
| 10001 | 内部服务器错误 |
| 10002 | 参数错误 |
| 10003 | 未授权 |
| 10004 | 禁止访问 |
| 20001 | 充值订单不存在 |
| 20002 | 金额无效 |
| 20003 | 超出限额 |
| 20004 | 账户不可用 |
| 30001 | 商户不存在 |
| 30002 | 收款账户不存在 |
| 30003 | 余额不足 |

## 认证接口

### 用户登录

**POST** `/auth/login`

#### 请求参数
```json
{
  "username": "admin",
  "password": "password123"
}
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-01-02T00:00:00Z",
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "roles": ["admin"]
    }
  }
}
```

### 刷新Token

**POST** `/auth/refresh`

#### 请求头
```http
Authorization: Bearer <current-token>
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "token": "new-jwt-token",
    "expires_at": "2025-01-02T00:00:00Z"
  }
}
```

## 充值管理接口

### 创建充值订单

**POST** `/recharge/orders`

#### 请求参数
```json
{
  "payer_name": "张三",
  "payer_account": "6222021234567890",
  "payment_type": "private",
  "amount": "1000.00",
  "merchant_name": "测试商户",
  "ad_account": "AD123456",
  "remark": "充值备注"
}
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "order_id": "uuid",
    "order_number": "R20250101001",
    "receiver_name": "李四",
    "receiver_account": "6222021234567891",
    "amount": "1000.00",
    "status": "pending",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 查询充值订单

**GET** `/recharge/orders/{order_id}`

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "id": "uuid",
    "order_number": "R20250101001",
    "payer_name": "张三",
    "payer_account": "6222021234567890",
    "payment_type": "private",
    "amount": "1000.00",
    "merchant_name": "测试商户",
    "ad_account": "AD123456",
    "receiver_name": "李四",
    "receiver_account": "6222021234567891",
    "status": "pending",
    "remark": "充值备注",
    "voucher_url": "",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

### 上传付款凭证

**POST** `/recharge/orders/{order_id}/voucher`

#### 请求参数 (multipart/form-data)
- `voucher`: 付款凭证文件 (图片格式)

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "voucher_url": "/uploads/vouchers/uuid.jpg"
  }
}
```

### 财务审核

**POST** `/recharge/orders/{order_id}/audit`

#### 请求参数
```json
{
  "action": "approve",  // approve | reject
  "remark": "审核通过"
}
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "status": "approved",
    "audited_at": "2025-01-01T00:00:00Z"
  }
}
```

### 充值订单列表

**GET** `/recharge/orders`

#### 查询参数
- `page`: 页码 (默认: 1)
- `page_size`: 每页数量 (默认: 20)
- `status`: 订单状态
- `merchant_name`: 商户名称
- `start_date`: 开始日期
- `end_date`: 结束日期

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_number": "R20250101001",
        "payer_name": "张三",
        "amount": "1000.00",
        "merchant_name": "测试商户",
        "status": "pending",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5
  }
}
```

## 商户管理接口

### 创建商户

**POST** `/merchants`

#### 请求参数
```json
{
  "name": "测试商户",
  "code": "TEST001",
  "contact_person": "张三",
  "contact_phone": "13800138000",
  "contact_email": "test@example.com",
  "daily_limit": "50000.00",
  "single_limit": "10000.00"
}
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "测试商户",
    "code": "TEST001",
    "contact_person": "张三",
    "contact_phone": "13800138000",
    "contact_email": "test@example.com",
    "status": "active",
    "daily_limit": "50000.00",
    "single_limit": "10000.00",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 商户列表

**GET** `/merchants`

#### 查询参数
- `page`: 页码
- `page_size`: 每页数量
- `name`: 商户名称（模糊搜索）
- `status`: 状态

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "测试商户",
        "code": "TEST001",
        "status": "active",
        "daily_limit": "50000.00",
        "single_limit": "10000.00",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

## 收款账户管理接口

### 创建收款账户

**POST** `/receive-accounts`

#### 请求参数
```json
{
  "account_name": "支付宝账户",
  "account_number": "13800138000",
  "account_type": "alipay",
  "account_holder": "张三",
  "payment_type": "private",
  "daily_limit": "20000.00",
  "single_limit": "5000.00"
}
```

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "id": "uuid",
    "account_name": "支付宝账户",
    "account_number": "13800138000",
    "account_type": "alipay",
    "account_holder": "张三",
    "payment_type": "private",
    "status": "active",
    "daily_limit": "20000.00",
    "single_limit": "5000.00",
    "daily_used": "0.00",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 收款账户列表

**GET** `/receive-accounts`

#### 查询参数
- `page`: 页码
- `page_size`: 每页数量
- `account_type`: 账户类型
- `payment_type`: 支付类型
- `status`: 状态

## 用户管理接口

### 创建用户

**POST** `/users`

#### 请求参数
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "roles": ["finance"]
}
```

### 用户列表

**GET** `/users`

### 更新用户角色

**PUT** `/users/{user_id}/roles`

#### 请求参数
```json
{
  "roles": ["finance", "operator"]
}
```

## 报表接口

### 交易报表

**GET** `/reports/transactions`

#### 查询参数
- `start_date`: 开始日期
- `end_date`: 结束日期
- `granularity`: 粒度 (daily/weekly/monthly)
- `merchant_id`: 商户ID
- `status`: 订单状态

#### 响应
```json
{
  "code": "00000",
  "message": "success",
  "data": {
    "summary": {
      "total_amount": "100000.00",
      "total_count": 100,
      "success_amount": "95000.00",
      "success_count": 95,
      "failed_amount": "5000.00",
      "failed_count": 5
    },
    "details": [
      {
        "date": "2025-01-01",
        "amount": "10000.00",
        "count": 10,
        "success_rate": 0.95
      }
    ]
  }
}
```

### 导出报表

**GET** `/reports/export`

#### 查询参数
- `type`: 报表类型 (transaction/merchant/account)
- `format`: 导出格式 (excel/csv)
- `start_date`: 开始日期
- `end_date`: 结束日期

#### 响应
返回文件流，Content-Type根据格式设置。

## Webhook接口

### 注册Webhook

**POST** `/webhooks`

#### 请求参数
```json
{
  "url": "https://example.com/webhook",
  "events": ["recharge.success", "recharge.failed"],
  "secret": "webhook-secret"
}
```

### Webhook事件

系统会向注册的URL发送POST请求：

```json
{
  "event": "recharge.success",
  "data": {
    "order_id": "uuid",
    "order_number": "R20250101001",
    "amount": "1000.00",
    "status": "success"
  },
  "timestamp": "2025-01-01T00:00:00Z",
  "signature": "sha256=..."
}
```

## 限流

API接口实施限流策略：
- 每个用户每分钟最多100次请求
- 每个IP每分钟最多1000次请求

## SDK示例

### Go SDK示例

```go
package main

import (
    "fmt"
    "github.com/cjpayment/go-sdk"
)

func main() {
    client := cjpayment.NewClient("your-api-key")
    
    // 创建充值订单
    order, err := client.CreateRechargeOrder(&cjpayment.CreateRechargeRequest{
        PayerName:    "张三",
        PayerAccount: "6222021234567890",
        PaymentType:  "private",
        Amount:       "1000.00",
        MerchantName: "测试商户",
        AdAccount:    "AD123456",
    })
    
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    
    fmt.Printf("Order created: %s\n", order.OrderNumber)
}
```

### JavaScript SDK示例

```javascript
const CJPayment = require('@cjpayment/js-sdk');

const client = new CJPayment({
  apiKey: 'your-api-key',
  baseURL: 'http://localhost:8080/api/v1'
});

// 创建充值订单
client.createRechargeOrder({
  payer_name: '张三',
  payer_account: '6222021234567890',
  payment_type: 'private',
  amount: '1000.00',
  merchant_name: '测试商户',
  ad_account: 'AD123456'
}).then(order => {
  console.log('Order created:', order.order_number);
}).catch(error => {
  console.error('Error:', error);
});
```

## 测试环境

测试环境地址：`http://test.cjpayment.com/api/v1`

测试账号：
- 用户名：`test`
- 密码：`test123`

## 更新日志

### v1.0.0 (2025-01-01)
- 初始版本发布
- 支持基础充值功能
- 支持商户和账户管理
- 支持权限控制
- 支持数据报表