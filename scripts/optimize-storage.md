# 💾 存储优化指南

## 问题分析

300GB 的 System Data 通常不是项目本身造成的，而是由以下原因：

### 常见占用空间的原因

1. **macOS System Data 包括**：
   - Time Machine 本地快照
   - 系统缓存和日志
   - 其他应用的缓存（Xcode、Docker、浏览器等）
   - 系统更新文件

2. **开发环境占用**：
   - `node_modules`: ~800MB（本项目）
   - `.next` 构建缓存: ~200MB（本项目）
   - pnpm 全局缓存: 可能几GB
   - Docker 镜像和容器: 可能几十GB

## 🧹 清理方案

### 1. 快速清理（项目相关）

```bash
# 运行清理脚本
./scripts/cleanup-storage.sh

# 或深度清理（包括 node_modules）
./scripts/cleanup-storage.sh --deep
```

### 2. 清理 macOS System Data

#### 方法 1: 清理 Time Machine 本地快照
```bash
# 查看本地快照
tmutil listlocalsnapshots /

# 删除所有本地快照
sudo tmutil deletelocalsnapshots /
```

#### 方法 2: 清理系统缓存
```bash
# 清理用户缓存
rm -rf ~/Library/Caches/*

# 清理系统日志（需要管理员权限）
sudo rm -rf /private/var/log/*
```

#### 方法 3: 使用 CleanMyMac 或类似工具
- 推荐使用专业的清理工具
- 可以安全清理系统缓存和临时文件

### 3. 清理开发工具缓存

#### pnpm 缓存
```bash
# 查看 pnpm 缓存位置
pnpm store path

# 清理未使用的包
pnpm store prune
```

#### Docker 缓存（如果使用）
```bash
# 清理未使用的镜像、容器、网络
docker system prune -a --volumes
```

#### Xcode 缓存（如果使用）
```bash
# 清理 Xcode 派生数据
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 清理 Xcode 归档
rm -rf ~/Library/Developer/Xcode/Archives/*
```

## 🚀 优化建议

### 1. 使用外部存储

将大型数据移到外部存储：

```bash
# 创建符号链接到外部存储
ln -s /Volumes/ExternalDrive/node_modules ./node_modules
ln -s /Volumes/ExternalDrive/.next ./apps/web/.next
```

### 2. 使用云服务

- **Supabase**: 数据库使用云端，不占用本地空间
- **Vercel**: 部署和预览使用云端，不占用本地空间
- **GitHub**: 代码存储在云端

### 3. 优化开发工作流

#### 使用 Docker（可选）
```bash
# 将开发环境容器化
# 可以轻松清理和重建
docker-compose down -v
```

#### 使用 .gitignore 避免提交大文件
确保 `.gitignore` 包含：
```
node_modules/
.next/
dist/
build/
*.log
.DS_Store
```

### 4. 定期清理

创建定期清理任务：

```bash
# 添加到 crontab（每周清理一次）
0 0 * * 0 /path/to/scripts/cleanup-storage.sh
```

## 📊 监控空间使用

### 查看项目空间使用
```bash
# 查看各目录大小
du -sh */ | sort -hr

# 查看最大的文件
find . -type f -size +100M -exec ls -lh {} \;
```

### 查看系统空间使用
```bash
# macOS 系统信息
df -h

# 查看各目录大小
du -sh ~/* | sort -hr
```

## ⚠️ 注意事项

1. **不要删除**：
   - `.git/` 目录
   - `package.json` 和 `pnpm-lock.yaml`
   - 源代码文件

2. **谨慎删除**：
   - `node_modules/`（需要重新安装）
   - `.next/`（需要重新构建）
   - 数据库文件（如果有本地数据库）

3. **备份重要数据**：
   - 在清理前备份重要文件
   - 使用 Git 提交代码更改

## 🎯 推荐方案

对于你的情况，推荐：

1. **立即执行**：
   ```bash
   # 清理项目缓存
   ./scripts/cleanup-storage.sh
   
   # 清理 Time Machine 快照
   sudo tmutil deletelocalsnapshots /
   ```

2. **长期优化**：
   - 使用 Supabase 云端数据库（已在使用）
   - 使用 Vercel 云端部署和预览（已在使用）
   - 定期运行清理脚本
   - 考虑使用外部 SSD 存储大型数据

3. **监控**：
   - 定期检查系统空间使用
   - 使用工具监控空间变化

