# GitHub 同步指南

## 当前状态
项目已成功重命名为**猛犸(mengma)**，所有配置文件已更新，本地Git提交已完成。

## 网络连接问题解决方案

### 方法1: 重试推送
```bash
git push origin main
```

### 方法2: 使用SSH连接（推荐）
如果HTTPS连接持续失败，可以切换到SSH：
```bash
# 添加SSH远程仓库
git remote set-url origin git@github.com:dynamor2019/mengma-audio.git
git push origin main
```

### 方法3: 使用代理
如果网络环境需要代理：
```bash
# 设置HTTP代理
git config --global http.proxy http://proxy-server:port
git config --global https.proxy https://proxy-server:port

# 推送后清除代理设置
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方法4: 手动上传
如果网络问题持续，可以：
1. 将项目文件夹压缩
2. 在GitHub网页端创建新仓库
3. 手动上传文件

## 验证同步成功
推送成功后，访问 https://github.com/dynamor2019/mengma-audio 确认更新。

## 已完成的更改
- ✅ package.json: 项目名称更新为 "mengma"
- ✅ index.html: 标题更新为 "猛犸 - 音频合成工具"
- ✅ manifest.json: 应用名称更新为 "猛犸"
- ✅ capacitor.config.ts: 应用名称更新为 "猛犸"
- ✅ 本地Git提交完成
- ⏳ GitHub推送待完成（网络问题）