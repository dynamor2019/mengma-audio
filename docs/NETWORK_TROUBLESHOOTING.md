# 网络连接问题诊断与解决方案

## 问题描述
反复出现GitHub连接失败，包括命令行和GitHub Desktop都无法同步。

## 错误信息
```
fatal: unable to access 'https://github.com/dynamor2019/mengma-audio.git/': 
Recv failure: Connection was reset
```

## 诊断步骤

### 1. 网络连接测试
```bash
# 测试GitHub连接
ping github.com

# 测试DNS解析
nslookup github.com

# 测试HTTPS连接
curl -I https://github.com
```

### 2. Git配置检查
```bash
# 查看当前Git配置
git config --list

# 查看远程仓库配置
git remote -v
```

## 解决方案

### 方案1: 修改Git配置
```bash
# 增加缓冲区大小
git config --global http.postBuffer 524288000

# 设置超时时间
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999

# 禁用SSL验证（临时）
git config --global http.sslVerify false
```

### 方案2: 使用SSH连接
```bash
# 生成SSH密钥（如果没有）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 添加SSH密钥到GitHub账户后，切换到SSH
git remote set-url origin git@github.com:dynamor2019/mengma-audio.git

# 测试SSH连接
ssh -T git@github.com

# 推送
git push origin main
```

### 方案3: 使用代理
```bash
# 如果有HTTP代理
git config --global http.proxy http://proxy-server:port
git config --global https.proxy https://proxy-server:port

# 推送后清除代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### 方案4: 使用GitHub CLI
```bash
# 安装GitHub CLI
winget install GitHub.cli

# 登录
gh auth login

# 推送
gh repo sync
```

### 方案5: 手动上传（最后选择）
1. 压缩项目文件夹
2. 在GitHub网页端删除现有仓库内容
3. 手动上传新文件
4. 或者创建新的仓库

### 方案6: 使用不同的网络
- 尝试手机热点
- 使用VPN
- 更换DNS服务器（8.8.8.8, 1.1.1.1）

## GitHub Desktop 问题解决

### 1. 重新登录
- File → Options → Accounts → Sign out
- 重新登录GitHub账户

### 2. 克隆仓库
- File → Clone repository
- 输入仓库URL重新克隆

### 3. 检查网络设置
- File → Options → Advanced
- 检查代理设置

## 当前项目状态
- ✅ 本地Git仓库：最新（包含所有"猛犸"更新）
- ⚠️ GitHub远程仓库：需要同步

## 建议执行顺序
1. 先尝试方案1（修改Git配置）
2. 如果失败，尝试方案2（SSH连接）
3. 如果仍然失败，尝试方案6（更换网络）
4. 最后考虑方案5（手动上传）

## 注意事项
- 在修改配置前，建议备份当前Git配置
- SSH方式需要在GitHub账户中添加公钥
- 代理设置使用后记得清除
- 手动上传会丢失Git历史记录