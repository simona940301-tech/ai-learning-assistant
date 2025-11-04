# Vercel 部署配置修复说明

## 问题原因

1. **`vercel.json` 位置错误**
   - ❌ 错误：放在项目根目录 `/Users/simonac/Desktop/moonshot idea/vercel.json`
   - ✅ 正确：应该在 `apps/web/vercel.json`

2. **`rootDirectory` 属性冲突**
   - ❌ 错误：在 `vercel.json` 中设置 `rootDirectory`
   - ✅ 正确：在 Vercel Dashboard 中设置 Root Directory 为 `apps/web`
   - ✅ 正确：`vercel.json` 不应该包含 `rootDirectory` 字段

## 已修复的配置

### 1. 移动 `vercel.json` 到正确位置
```bash
# 已创建: apps/web/vercel.json
# 已删除: 根目录的 vercel.json
```

### 2. 更新 `apps/web/vercel.json` 内容
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

**注意**：
- ✅ 移除了 `rootDirectory`（在 Dashboard 中设置）
- ✅ 移除了 `outputDirectory`（在 Dashboard 中已设置为 `apps/web/.next`）
- ✅ `buildCommand` 设置为 `pnpm build`（因为 rootDirectory 已经是 `apps/web`）

## Vercel Dashboard 配置

根据你的截图，Dashboard 中已正确配置：

- ✅ **Root Directory**: `apps/web`
- ✅ **Output Directory**: `apps/web/.next` (Override: ON)
- ✅ **Install Command**: `pnpm install` (Override: ON)
- ✅ **Development Command**: `cd apps/web && pnpm dev` (Override: ON)
- ✅ **Build Command**: 使用默认（Override: OFF）

## 重新部署

现在可以重新部署：

```bash
cd "/Users/simonac/Desktop/moonshot idea"
vercel --prod
```

## 验证

部署成功后，检查：
- ✅ 没有 `vercel.json` 位置错误
- ✅ 没有 `rootDirectory` 属性错误
- ✅ 构建在 `apps/web` 目录中执行
- ✅ `pnpm build` 成功运行

