# 性能优化报告（移动端）

## 概述
- 目标：减少不必要的重渲染、提升滚动与交互流畅度、保持动画性能稳定。
- 改动范围：核心交互组件（上传、音轨列表、合成播放器）、布局与样式、移动端安全区适配。

## 已实施优化
- 组件重渲染控制
  - 对 `AudioUploader`、`AudioTrack`、`ComposedAudioPlayer` 使用 `React.memo` 包裹，避免父级状态细微变化导致的非必要渲染。
  - 在 `AudioUploader` 保留 `useCallback` 的文件选择处理，以稳定回调引用，配合 memo 效果更佳。
- 动画与绘制
  - 在全局样式中为波形动画增加 `will-change: transform, opacity` 提示，减少合成器抖动、提升动画流畅度。
- 安全区与布局
  - `index.html` 增加 `viewport-fit=cover`，并在 `index.css` 中加入 `safe-area-top`/`safe-area-bottom`/`safe-area-padding` 工具类。
  - 新增 `MobileLayout` 使用 `Ant Design Mobile` 的 `SafeArea`，在刘海/挖孔屏上避免内容被遮挡。
- UI 组件库统一
  - 全局引入 `Ant Design Mobile` 的 `ConfigProvider`，在移动端统一交互与触控尺寸；使用 CSS 变量 `--adm-color-primary` 映射现有设计系统主色。
- 对比开关与可回溯性
  - 增加 `?classic=1` 查询参数：关闭新移动布局便于拍摄改造前截图与对比测试。

## 预期影响（定性）
- 重渲染次数降低：列表与播放器在父状态变化时不再重复渲染；交互响应更稳定。
- 首屏与滚动流畅度提升：减少不必要绘制与布局抖动；动画帧率更稳定（目标 60fps）。
- 安全区适配可靠：顶部/底部操作不被遮挡，避免误触风险。

## 建议的度量与验证
- 浏览器 DevTools
  - Performance：录制滚动与播放交互，观察 `Recalculate Style`/`Layout`/`Paint` 次数与耗时。
  - Memory：对频繁操作做快照，验证对象与监听器未异常增长。
- React Profiler
  - 对 `AudioTrack` 与 `ComposedAudioPlayer` 的交互路径进行采样，比较改造前后 commit 次数与渲染耗时。
- Lighthouse（移动端）
  - 检查可交互时间（TTI）、CLS（布局偏移）与可访问性评分。

## 后续优化路线（可选）
- 列表虚拟化：当音轨文件数较多时，引入虚拟滚动以进一步降低渲染成本。
- 资源加载优化：对音频元数据解析做任务切片或 Web Worker，避免主线程阻塞。
- 事件节流与防抖：对拖拽与滑块更新做微调，平衡流畅度与响应性。
- 主题与国际化：统一 ADM 组件主题 token，补充中英文文案与排版优化。