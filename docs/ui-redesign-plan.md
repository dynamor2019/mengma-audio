# 移动端 UI 重设计方案（Ant Design Mobile + Safe Area）

## 目标
- 统一移动端视觉与交互规范，兼容刘海/挖孔屏安全区。
- 引入 Ant Design Mobile（ADM）提升组件一致性与响应式体验。
- 优化首屏与核心交互性能（减少重渲染、动画开销）。

## 设计原则
- 信息层级清晰：标题/区块/操作按钮分层，减少视觉噪音。
- 适配安全区：`meta viewport-fit=cover` + `SafeArea` + `env(safe-area-inset-*)`。
- 响应式排版：小屏优先，容器内边距与间距随屏宽细化。
- 主题一致：以 `--adm-color-primary` 与现有 HSL 设计系统映射维护色彩。

## 架构与布局
- 顶部：`NavBar`（无返回箭头，产品名/页面名）+ `SafeArea top`。
- 主体：`container + safe-area-padding`，分区块：上传、音轨、合成、播放器、恢复。
- 底部：`SafeArea bottom`。
- 新增：`MobileLayout` 统一包裹首页与后续页面。

## 组件改造
- 上传（AudioUploader）：两卡片并排，小屏间距优化，卡片 hover 态与语义色映射。
- 音轨（AudioTrack）：信息行 + 控制区 + 波形区；按钮紧凑化；拖拽手势显式化。
- 播放器（ComposedAudioPlayer）：主操作左置，状态徽标，进度/音量控件与波形动效。

## 适配与主题
- index.html：加入 `viewport-fit=cover`。
- index.css：增加 `--adm-color-primary` 与 `safe-area` 工具类：`safe-area-padding/safe-area-top/safe-area-bottom`。
- ConfigProvider：ADM 全局启用，后续可扩展全局色板与字号。

## 交互与动效
- 波形动效：控制在 60fps 以内，使用 `will-change: transform, opacity`。
- 按钮/卡片：过渡统一 200–300ms，hover/active 状态可访问性对比符合 WCAG。

## 兼容与开关
- 经典模式：`?classic=1` 关闭移动布局，用于对比截图与回溯。

## 后续路线
- 表单/抽屉/Toast 等替换到 ADM 同类组件，统一触控尺度。
- 深色模式与系统跟随；国际化文本与排版优化。