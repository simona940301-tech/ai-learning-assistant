# 🚨 清理 337GB System Data 完整指南

## 问题诊断

你的 System Data 占用了 **337.12 GB**，这是导致磁盘空间不足的主要原因。

## 🎯 清理方案（按优先级）

### 优先级 1: Time Machine 本地快照（最可能的原因）

Time Machine 本地快照通常占用最多空间（可能 200-300GB）。

#### 方法 1: 通过系统设置（最简单）

1. 打开 **系统设置** > **通用** > **存储空间**
2. 点击 **推荐** 标签
3. 查找 **"Time Machine 快照"** 或 **"本地快照"**
4. 点击 **清理** 或 **优化**

#### 方法 2: 通过终端（需要管理员权限）

```bash
# 步骤 1: 禁用本地快照
sudo tmutil disablelocal

# 步骤 2: 删除所有本地快照
sudo tmutil deletelocalsnapshots /

# 步骤 3: 如果失败，重启后重试
sudo reboot
# 重启后再次运行：
sudo tmutil deletelocalsnapshots /
```

#### 方法 3: 重启 Mac（有时有效）

重启后，系统可能会自动释放被占用的快照：

```bash
sudo reboot
```

### 优先级 2: 系统缓存和临时文件

```bash
# 清理系统缓存（需要管理员权限）
sudo rm -rf /private/var/folders/*/C/*
sudo rm -rf /Library/Caches/*
sudo rm -rf /System/Library/Caches/*

# 清理系统日志
sudo rm -rf /private/var/log/*
sudo rm -rf /Library/Logs/*
```

### 优先级 3: 虚拟机交换文件

重启 Mac 后，交换文件会自动清理：

```bash
sudo reboot
```

### 优先级 4: Spotlight 索引重建

```bash
# 清理并重建 Spotlight 索引
sudo mdutil -E /
```

**注意**：重建索引可能需要一些时间，但可以释放一些空间。

## 📋 完整清理步骤

### 步骤 1: 运行自动清理脚本

```bash
./scripts/fix-337gb-system-data.sh
```

这会清理所有不需要管理员权限的部分。

### 步骤 2: 手动执行需要管理员权限的命令

在终端中依次运行：

```bash
# 1. 禁用并删除 Time Machine 快照
sudo tmutil disablelocal
sudo tmutil deletelocalsnapshots /

# 2. 清理系统缓存
sudo rm -rf /private/var/folders/*/C/*

# 3. 清理系统日志
sudo rm -rf /private/var/log/*

# 4. 重建 Spotlight 索引
sudo mdutil -E /
```

### 步骤 3: 重启 Mac

```bash
sudo reboot
```

重启后，系统会自动清理一些被占用的资源。

### 步骤 4: 验证清理结果

重启后，检查存储空间：

1. 打开 **系统设置** > **通用** > **存储空间**
2. 查看 System Data 是否减少
3. 如果仍然很大，继续下一步

## 🔧 如果仍然很大

### 使用第三方工具

1. **CleanMyMac X**（推荐）
   - 可以安全清理 System Data
   - 有免费试用版

2. **DaisyDisk**
   - 可视化查看占用空间的文件
   - 可以找到隐藏的大文件

3. **OmniDiskSweeper**
   - 免费工具
   - 可以查找大文件

### 检查其他可能的原因

```bash
# 查看最大的目录
sudo du -sh /* 2>/dev/null | sort -hr | head -10

# 查看用户目录大小
du -sh ~/* | sort -hr | head -10

# 查看系统目录大小（需要管理员权限）
sudo du -sh /private/var/* 2>/dev/null | sort -hr | head -10
```

## ⚠️ 注意事项

### ✅ 可以安全删除的

- Time Machine 本地快照（不影响 Time Machine 备份）
- 系统缓存（会重新生成）
- 系统日志（会重新生成）
- Spotlight 索引（会重新建立）

### ❌ 不要删除的

- `/System` 目录
- `/Library` 目录（除了 Caches 和 Logs）
- `/private/var/db` 目录
- 应用程序数据

## 📊 预期效果

执行完整清理后，通常可以释放：

- **Time Machine 快照**：200-300GB（最常见）
- **系统缓存**：10-50GB
- **系统日志**：5-20GB
- **其他**：5-10GB

**总计**：可能释放 **220-380GB**

## 🎯 推荐操作顺序

1. ✅ **运行自动清理脚本**：`./scripts/fix-337gb-system-data.sh`
2. 🔑 **清理 Time Machine 快照**：`sudo tmutil disablelocal && sudo tmutil deletelocalsnapshots /`
3. 🔑 **清理系统缓存**：`sudo rm -rf /private/var/folders/*/C/*`
4. 🔑 **清理系统日志**：`sudo rm -rf /private/var/log/*`
5. 🔄 **重启 Mac**：`sudo reboot`
6. ✅ **验证结果**：检查系统设置中的存储空间

## 💡 长期维护

1. **定期清理**：每月运行一次清理脚本
2. **监控空间**：定期检查存储空间使用情况
3. **使用云端服务**：将大型数据存储在云端（已在使用 Supabase、Vercel）

