# 手动上传GitHub Actions修复指南

## 🚨 紧急解决方案

由于网络连接问题无法直接推送，以下是手动上传修复的方法：

## 📋 方法1：使用GitHub Web界面

### 步骤1：访问GitHub仓库
1. 打开浏览器访问：https://github.com/dynamor2019/mengma-audio
2. 导航到 `.github/workflows/build-android.yml` 文件

### 步骤2：编辑工作流文件
1. 点击文件右上角的铅笔图标（Edit this file）
2. 找到第43行左右的内容：
   ```yaml
   - name: Capacitor sync
     run: npx cap sync android
   ```
3. 将其修改为：
   ```yaml
   - name: Capacitor sync
     run: npm run cap:sync:android
   ```

### 步骤3：提交更改
1. 滚动到页面底部
2. 在"Commit changes"部分填写：
   - 标题：`fix: use npm script for Capacitor sync in GitHub Actions to avoid Node.js version conflicts`
   - 描述：`Replace npx cap sync android with npm run cap:sync:android to use pinned Capacitor CLI version`
3. 选择"Commit directly to the main branch"
4. 点击"Commit changes"

## 📋 方法2：使用Git Bundle（推荐）

### 如果您有其他网络环境可用：

1. **复制bundle文件**：
   - 将 `github-actions-fix.bundle` 复制到有良好网络的设备

2. **在其他设备上执行**：
   ```bash
   # 克隆仓库
   git clone https://github.com/dynamor2019/mengma-audio.git
   cd mengma-audio
   
   # 验证并应用bundle
   git bundle verify ../github-actions-fix.bundle
   git pull ../github-actions-fix.bundle main
   
   # 推送到GitHub
   git push origin main
   ```

## 📋 方法3：使用移动网络

1. **切换到移动热点**
2. **重新尝试推送**：
   ```bash
   git push origin main
   ```

## ✅ 验证修复效果

修复完成后：
1. 访问：https://github.com/dynamor2019/mengma-audio/actions
2. 触发新的构建（推送代码或手动触发workflow）
3. 确认不再出现"The Capacitor CLI requires NodeJS >=20.0.0"错误

## 🔍 修复内容说明

**问题**：GitHub Actions使用的Node.js版本与Capacitor CLI要求不匹配

**解决方案**：使用package.json中定义的npm脚本，该脚本指定了兼容的Capacitor CLI版本

**关键更改**：
- 原来：`npx cap sync android`（使用最新版本，可能不兼容）
- 修复后：`npm run cap:sync:android`（使用指定版本@^7.4.3）

## 📞 如需帮助

如果以上方法都无法解决，请：
1. 检查网络防火墙设置
2. 尝试使用VPN
3. 联系网络管理员
4. 考虑使用GitHub Desktop等GUI工具