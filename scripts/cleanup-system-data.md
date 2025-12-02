# 🧹 系统数据清理指南（不影响项目）

## ⚠️ 重要说明

以下清理操作**只清理系统缓存和临时文件**，**不会影响项目运行**。

所有清理的文件都可以自动重新生成，项目功能完全不受影响。

---

## 🎯 项目相关清理（安全）

### 方法 1: 使用安全清理脚本（推荐）

```bash
# 运行安全清理脚本
./scripts/safe-cleanup.sh
```

**清理内容**：
- ✅ Next.js 构建缓存 (`.next/`) - 运行 `pnpm dev` 时自动重新构建
- ✅ TypeScript 构建输出 (`dist/`, `build/`) - 可以重新构建
- ✅ 日志文件 (`*.log`) - 可以重新生成
- ✅ 临时文件 (`*.tmp`, `.DS_Store`) - 可以重新生成
- ✅ Turbo 缓存 (`.turbo/`) - 可以重新生成
- ✅ ESLint 缓存 (`.eslintcache`) - 可以重新生成

**不会删除**：
- ❌ 源代码文件
- ❌ 配置文件 (`package.json`, `tsconfig.json` 等)
- ❌ 依赖 (`node_modules/`)
- ❌ Git 历史 (`.git/`)
- ❌ 环境变量文件 (`.env*`)

---

## 🍎 macOS 系统数据清理（不影响项目）

### 1. 清理 Time Machine 本地快照（最有效）

```bash
# 查看本地快照大小
tmutil listlocalsnapshots /

# 删除所有本地快照（可释放 50-200GB）
sudo tmutil deletelocalsnapshots /
```

**影响**：只删除本地快照，不影响 Time Machine 备份，不影响项目。

### 2. 清理用户缓存

```bash
# 清理用户缓存（不影响项目）
rm -rf ~/Library/Caches/*

# 清理特定应用缓存（可选）
rm -rf ~/Library/Caches/com.apple.dt.Xcode
rm -rf ~/Library/Caches/com.docker.docker
```

**影响**：只清理缓存，应用会重新生成缓存，不影响项目。

### 3. 清理系统日志

```bash
# 清理系统日志（需要管理员权限）
sudo rm -rf /private/var/log/*

# 清理用户日志
rm -rf ~/Library/Logs/*
```

**影响**：只清理日志文件，不影响项目运行。

---

## 📦 开发工具缓存清理（不影响项目）

### pnpm 缓存

```bash
# 查看 pnpm 缓存位置
pnpm store path

# 清理未使用的包（不影响已安装的依赖）
pnpm store prune
```

**影响**：只清理未使用的包，已安装的依赖不受影响。

### Docker 缓存（如果使用）

```bash
# 查看 Docker 占用空间
docker system df

# 清理未使用的镜像、容器、网络（不影响正在运行的容器）
docker system prune -a --volumes
```

**影响**：只清理未使用的资源，正在运行的容器不受影响。

### Xcode 缓存（如果使用）

```bash
# 清理 Xcode 派生数据（不影响项目）
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 清理 Xcode 归档（不影响项目）
rm -rf ~/Library/Developer/Xcode/Archives/*
```

**影响**：只清理构建缓存，项目可以重新构建。

---

## 🚀 推荐清理流程

### 步骤 1: 清理项目缓存（最安全）

```bash
./scripts/safe-cleanup.sh
```

**预期释放**：100-500MB

### 步骤 2: 清理 Time Machine 快照（最有效）

```bash
sudo tmutil deletelocalsnapshots /
```

**预期释放**：50-200GB

### 步骤 3: 清理系统缓存

```bash
rm -rf ~/Library/Caches/*
```

**预期释放**：10-50GB

### 步骤 4: 清理开发工具缓存

```bash
# pnpm
pnpm store prune

# Docker（如果使用）
docker system prune -a --volumes
```

**预期释放**：5-20GB

---

## ✅ 验证项目运行

清理后，验证项目是否正常运行：

```bash
# 1. 安装依赖（如果需要）
pnpm install

# 2. 启动开发服务器
pnpm dev

# 3. 检查功能是否正常
# - 打开浏览器访问应用
# - 测试主要功能
```

---

## 📊 监控空间使用

### 查看项目空间

```bash
# 查看项目总大小
du -sh .

# 查看各目录大小
du -sh */ | sort -hr
```

### 查看系统空间

```bash
# 查看磁盘使用情况
df -h

# 查看用户目录大小
du -sh ~/* | sort -hr
```

---

## ⚠️ 注意事项

### ✅ 可以安全删除的

- 构建缓存 (`.next/`, `dist/`, `build/`)
- 日志文件 (`*.log`)
- 临时文件 (`*.tmp`, `.DS_Store`)
- Time Machine 本地快照
- 系统缓存

### ❌ 不要删除的

- 源代码文件
- 配置文件 (`package.json`, `tsconfig.json`, `.env*`)
- 依赖 (`node_modules/`)
- Git 历史 (`.git/`)
- 数据库文件（如果有本地数据库）

---

## 🎯 预期效果

执行完整清理后，通常可以释放：

- **项目缓存**：100-500MB
- **Time Machine 快照**：50-200GB
- **系统缓存**：10-50GB
- **开发工具缓存**：5-20GB

**总计**：约 65-270GB

---

## 💡 长期优化建议

1. **定期清理**：每周运行一次 `./scripts/safe-cleanup.sh`
2. **使用云端服务**：数据库和部署使用云端（已在使用）
3. **监控空间**：定期检查系统空间使用情况
4. **避免本地数据库**：使用 Supabase 云端数据库（已在使用）

---

## 🆘 如果出现问题

如果清理后项目无法运行：

1. **重新安装依赖**：
   ```bash
   pnpm install
   ```

2. **重新构建项目**：
   ```bash
   pnpm dev
   ```

3. **检查 Git 状态**：
   ```bash
   git status
   ```

4. **恢复文件**（如果需要）：
   ```bash
   git checkout .
   ```

