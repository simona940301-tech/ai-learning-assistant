# Vercel 部署问题修复

## 问题分析

### 错误 1: `cd: apps/web: No such file or directory`
- **原因**: Vercel 在根目录执行命令，但 `buildCommand` 中的 `cd apps/web` 失败
- **解决**: 需要设置 `rootDirectory: "apps/web"`，让 Vercel 在正确的目录执行命令

### 错误 2: `Unknown or unexpected option: --filter`
- **原因**: `pnpm build --filter=web` 在 `apps/web` 目录中执行
- **问题**: `--filter` 是 pnpm workspace 命令，但 Next.js 的 `next build` 不接受这个参数
- **解决**: 在 `apps/web` 目录中直接执行 `pnpm build`（不需要 `--filter`）

## 正确的 vercel.json 配置

```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "rootDirectory": "apps/web"
}
```

### 配置说明：

1. **`rootDirectory: "apps/web"`**
   - 告诉 Vercel 项目根目录是 `apps/web`
   - 所有命令都在这个目录中执行

2. **`buildCommand: "pnpm build"`**
   - 在 `apps/web` 目录中执行
   - 会自动运行 `apps/web/package.json` 中的 `build` 脚本
   - 即 `next build`

3. **`installCommand: "pnpm install"`**
   - 在 monorepo 根目录执行
   - 安装所有 workspace 依赖

## 部署步骤

1. **确保 vercel.json 配置正确**（已在根目录）
2. **重新部署**:
   ```bash
   vercel --prod
   ```

3. **如果还有问题，可以在 Vercel Dashboard 中设置**:
   - 进入项目设置
   - Settings → General → Root Directory: `apps/web`
   - 移除 Build Command（使用默认）
   - 移除 Install Command（使用默认）

## 验证

部署成功后，检查：
- ✅ 构建日志显示在 `apps/web` 目录中执行
- ✅ `next build` 成功运行
- ✅ 没有 `--filter` 错误
- ✅ 部署 URL 可以访问

