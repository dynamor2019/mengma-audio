# 音频合成工具 - 图标放置指南

## 目录结构

已为您创建了以下图标存放目录：

### 1. Web应用图标
```
public/
├── favicon.ico          # 浏览器标签页图标 (16x16, 32x32, 48x48)
├── icon-192.png         # PWA图标 (192x192)
├── icon-512.png         # PWA图标 (512x512)
├── apple-touch-icon.png # iOS Safari图标 (180x180)
└── icons/               # 其他尺寸图标
    ├── icon-16.png      # 16x16
    ├── icon-32.png      # 32x32
    ├── icon-48.png      # 48x48
    ├── icon-72.png      # 72x72
    ├── icon-96.png      # 96x96
    ├── icon-128.png     # 128x128
    ├── icon-144.png     # 144x144
    └── icon-256.png     # 256x256
```

### 2. Android应用图标
```
android/app/src/main/res/
├── mipmap-hdpi/
│   └── ic_launcher.png      # 72x72像素
├── mipmap-mdpi/
│   └── ic_launcher.png      # 48x48像素
├── mipmap-xhdpi/
│   └── ic_launcher.png      # 96x96像素
├── mipmap-xxhdpi/
│   └── ic_launcher.png      # 144x144像素
└── mipmap-xxxhdpi/
    └── ic_launcher.png      # 192x192像素
```

## 图标规格要求

### 设计规范
- **格式**: PNG（推荐）或ICO
- **背景**: 透明背景（PNG）
- **设计**: 简洁明了，小尺寸下清晰可辨
- **主色调**: 建议与应用主题色保持一致

### 尺寸规格
| 用途 | 尺寸 | 文件名 | 位置 |
|------|------|--------|------|
| 浏览器图标 | 16x16, 32x32 | favicon.ico | public/ |
| PWA小图标 | 192x192 | icon-192.png | public/ |
| PWA大图标 | 512x512 | icon-512.png | public/ |
| iOS图标 | 180x180 | apple-touch-icon.png | public/ |
| Android MDPI | 48x48 | ic_launcher.png | android/.../mipmap-mdpi/ |
| Android HDPI | 72x72 | ic_launcher.png | android/.../mipmap-hdpi/ |
| Android XHDPI | 96x96 | ic_launcher.png | android/.../mipmap-xhdpi/ |
| Android XXHDPI | 144x144 | ic_launcher.png | android/.../mipmap-xxhdpi/ |
| Android XXXHDPI | 192x192 | ic_launcher.png | android/.../mipmap-xxxhdpi/ |

## 配置文件更新

放置图标后，需要更新以下配置：

### 1. index.html
在 `<head>` 标签中添加：
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
```

### 2. 创建 public/manifest.json
```json
{
  "name": "音频合成工具",
  "short_name": "音频合成",
  "description": "专业的音频文件合成与处理工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 3. capacitor.config.ts
更新应用配置：
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.audiocomposer.app',
  appName: '音频合成工具',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
```

## 图标生成工具推荐

1. **在线工具**:
   - [Favicon.io](https://favicon.io/) - 生成favicon
   - [PWA Builder](https://www.pwabuilder.com/) - 生成PWA图标
   - [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) - 生成Android图标

2. **设计软件**:
   - Adobe Illustrator/Photoshop
   - Figma
   - Canva

## 部署说明

1. 将图标文件放置到对应目录
2. 更新配置文件
3. 运行 `npm run build` 重新构建
4. 测试各平台图标显示效果

## 注意事项

- 确保所有图标文件名完全匹配配置中的路径
- Android图标必须命名为 `ic_launcher.png`
- 建议从一个高分辨率的主图标（如1024x1024）缩放生成其他尺寸
- 测试时清除浏览器缓存以查看最新图标
- 提交到GitHub前确保所有图标文件都已添加到版本控制中