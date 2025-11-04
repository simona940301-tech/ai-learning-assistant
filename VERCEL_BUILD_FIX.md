# Vercel 部署错误修复总结

## 问题原因分析

### 1. **`vercel.json` 位置错误**
- ❌ **错误**：`vercel.json` 放在项目根目录
- ✅ **正确**：`vercel.json` 应该在 `apps/web/` 目录内
- **原因**：Vercel 要求配置文件位于 `rootDirectory` 指定的目录中

### 2. **`rootDirectory` 属性冲突**
- ❌ **错误**：在 `vercel.json` 中设置 `rootDirectory`
- ✅ **正确**：`rootDirectory` 应在 Vercel Dashboard 中设置
- **原因**：`vercel.json` 不支持 `rootDirectory` 字段（这是 Dashboard 专用设置）

### 3. **React 引号转义错误**
- ❌ **错误**：`ReadingExplain.tsx` 第194行使用未转义的引号 `"`
- ✅ **修复**：使用 HTML 实体 `&ldquo;` 和 `&rdquo;`
- **原因**：React 的 `react/no-unescaped-entities` 规则要求转义特殊字符

### 4. **缺失的导入函数**
- ❌ **错误**：`createDetectResponse` 和 `validateContractV2` 函数不存在
- ✅ **修复**：在 `contract-v2.ts` 中添加了这两个函数
- **原因**：`detect/route.ts` 和 `heartbeat.ts` 需要这些函数但未定义

### 5. **React Hook 依赖项警告**
- ❌ **警告**：`TypewriterText.tsx` 的 `useEffect` 缺少 `displayed.length` 依赖
- ✅ **修复**：将依赖项从 `displayed.length` 改为 `displayed`（完整对象）
- **原因**：ESLint 的 `react-hooks/exhaustive-deps` 规则要求包含所有依赖

## 已修复的文件

### 1. `apps/web/vercel.json` ✅
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```
- ✅ 移除了 `rootDirectory`（在 Dashboard 中设置）
- ✅ 移除了 `outputDirectory`（在 Dashboard 中设置为 `apps/web/.next`）

### 2. `apps/web/components/solve/explain/ReadingExplain.tsx` ✅
```tsx
// 修复前：證據："{question.evidenceOneLine}"
// 修复后：證據：&ldquo;{question.evidenceOneLine}&rdquo;
```

### 3. `apps/web/lib/contract-v2.ts` ✅
添加了：
- ✅ `ContractV2Response` 接口
- ✅ `createDetectResponse()` 函数
- ✅ `validateContractV2()` 函数

### 4. `apps/web/components/solve/explain/TypewriterText.tsx` ✅
- ✅ 修复了 `useEffect` 依赖项（从 `displayed.length` 改为 `displayed`）

## Vercel Dashboard 配置

确保在 Dashboard 中设置：
- ✅ **Root Directory**: `apps/web`
- ✅ **Output Directory**: `apps/web/.next` (Override: ON)
- ✅ **Install Command**: `pnpm install` (Override: ON)
- ✅ **Build Command**: 使用默认（`vercel.json` 中已指定）

## 重新部署步骤

```bash
cd "/Users/simonac/Desktop/moonshot idea"
vercel --prod
```

## 验证清单

- ✅ `vercel.json` 位于 `apps/web/vercel.json`
- ✅ `vercel.json` 不包含 `rootDirectory` 字段
- ✅ 所有 ESLint 错误已修复
- ✅ 所有 TypeScript 编译错误已修复
- ✅ 缺失的函数已添加到 `contract-v2.ts`

## 预期结果

部署应该成功，没有构建错误。如果仍有问题，请检查：
1. Vercel Dashboard 中的 Root Directory 设置
2. 环境变量是否正确设置
3. `pnpm-lock.yaml` 是否最新
