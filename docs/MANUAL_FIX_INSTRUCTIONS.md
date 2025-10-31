# 手动修复GitHub仓库的说明

## 问题描述
由于网络连接问题，无法通过git命令行推送修复到GitHub仓库。GitHub Actions构建失败是因为远程仓库中的文件仍然使用错误的导入路径 `@/lib/utils`（小写），而正确的路径应该是 `@/lib/Utils`（大写U）。

## 解决方案

### 方案1：使用补丁文件（推荐）
1. 在GitHub网页端打开你的仓库：https://github.com/dynamor2019/mengma-audio
2. 下载本地生成的补丁文件：`fix-import-paths.patch`
3. 在仓库设置中启用GitHub CLI或使用git命令行（如果网络恢复）
4. 应用补丁：`git apply fix-import-paths.patch`

### 方案2：手动编辑文件
需要修改以下文件中的导入路径，将 `@/lib/utils` 改为 `@/lib/Utils`：

#### 主要组件文件：
- `src/components/ui/tooltip.tsx` - 第2行
- `src/components/ui/table.tsx` - 第2行  
- `src/components/ui/slider.tsx` - 第2行
- `src/components/ui/switch.tsx` - 第2行
- `src/components/ui/tabs.tsx` - 第2行
- `src/components/ui/textarea.tsx` - 第2行
- `src/components/ui/toast.tsx` - 第2行
- `src/components/ui/toggle-group.tsx` - 第2行
- `src/components/ui/toggle.tsx` - 第2行

#### 以及其他54个文件（详见补丁文件）

### 方案3：等待网络恢复
当网络连接恢复正常后，直接运行：
```bash
git push origin main
```

## 验证修复
修复完成后，GitHub Actions应该能够：
1. 找到正确的 `@/lib/Utils` 文件
2. 成功完成构建
3. 生成APK文件

## 技术细节
- 本地仓库已完全修复（提交 7419d0f）
- 包含54个文件的导入路径修复
- 解决了编码问题
- 构建测试通过

修复后的GitHub Actions构建应该会成功完成。