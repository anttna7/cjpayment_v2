# 高级筛选模态框透明背景宽度诊断报告

## 诊断概要
- **执行时间**: 2025-08-27T06:14:02.778Z
- **发现问题**: 1

## 页面基础信息
```json
{
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "document": {
    "scrollWidth": 1382,
    "scrollHeight": 2747,
    "clientWidth": 1280,
    "clientHeight": 720
  },
  "body": {
    "scrollWidth": 1382,
    "scrollHeight": 2731,
    "clientWidth": 1280,
    "clientHeight": 2731
  }
}
```

## Backdrop分析结果
```json
{
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "document": {
    "scrollWidth": 1382,
    "clientWidth": 1280
  },
  "backdrop": {
    "rect": {
      "width": 1280,
      "height": 720,
      "left": 25,
      "right": 1305,
      "top": 1702.453125,
      "bottom": 2422.453125
    },
    "computed": {
      "width": "1280px",
      "height": "720px",
      "position": "fixed",
      "left": "0px",
      "top": "0px",
      "right": "0px",
      "bottom": "0px",
      "zIndex": "1000",
      "display": "flex",
      "visibility": "visible"
    },
    "exceedsViewport": {
      "width": false,
      "height": false,
      "right": true,
      "bottom": true,
      "excess": {
        "width": 0,
        "height": 0,
        "right": 25,
        "bottom": 1702.453125
      }
    }
  },
  "container": {
    "rect": {
      "width": 1088,
      "height": 612,
      "left": 121,
      "right": 1209,
      "top": 1756.453125,
      "bottom": 2368.453125
    },
    "styles": {
      "width": "1088px",
      "height": "612px",
      "position": "relative",
      "left": "0px",
      "top": "0px",
      "transform": "matrix(1, 0, 0, 1, 0, 0)"
    }
  }
}
```

## 定位分析
```json
{
  "positioning": {
    "position": "fixed",
    "left": "0px",
    "top": "0px",
    "right": "0px",
    "bottom": "0px",
    "width": "1280px",
    "height": "720px"
  },
  "viewport": {
    "width": "1280px",
    "height": "720px"
  },
  "documentSize": {
    "width": "1382px",
    "height": "2731px"
  },
  "shouldBe": {
    "width": "100vw",
    "height": "100vh",
    "position": "fixed",
    "left": "0",
    "top": "0"
  }
}
```

## 发现的问题



### 1. backdrop-width-not-viewport
**消息**: backdrop宽度不是基于视口(100vw)
**严重程度**: medium
**详情**: 
```json
{
  "currentWidth": "1280px",
  "shouldBe": "100vw"
}
```


## 修复建议


基于诊断结果，建议进行以下修复：

### CSS修复方案
1. 确保backdrop使用 `position: fixed`
2. 设置backdrop尺寸为 `width: 100vw; height: 100vh`
3. 设置backdrop位置为 `left: 0; top: 0`
4. 避免backdrop继承父容器的尺寸限制

### 具体代码修改
```css
.modal-backdrop {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 1000 !important;
}
```


## 截图记录
- debug/backdrop-01-initial.png - 初始状态
- debug/backdrop-02-modal-opened.png - 模态框打开状态

## 结论
⚠️ 发现 1 个透明背景相关问题需要修复。
