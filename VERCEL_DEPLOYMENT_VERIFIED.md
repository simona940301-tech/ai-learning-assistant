# ✅ Vercel 部署配置驗證報告

## 配置狀態檢查

### ✅ 已完成項目

1. **apps/web/package.json** (line 7)
   - ✅ `prebuild` 腳本：`"prebuild": "pnpm --filter @plms/shared build"`
   - ✅ 會在每次 build 前自動編譯 `@plms/shared`

2. **vercel.json** (root)
   - ✅ `installCommand: "pnpm install --frozen-lockfile"`
   - ✅ `buildCommand: "pnpm --filter web build"`
   - ✅ `outputDirectory: "apps/web/.next"`
   - ✅ 從 repo root 執行，可正確解析 workspace

3. **apps/web/vercel.json** (已更新)
   - ✅ 與 root `vercel.json` 一致
   - ✅ 添加 `rootDirectory: "."` 和 `nodeVersion: "20.x"`

4. **本地建置測試**
   - ✅ `pnpm --filter web build` 成功執行
   - ✅ 只有預期的 Next.js dynamic route warnings（非錯誤）
   - ✅ 建置產出於 `apps/web/.next`

5. **文件記錄**
   - ✅ `VERCEL_DEPLOYMENT_ISSUE.md` 已記錄完整配置
   - ✅ 包含 Dashboard 設定指引

---

## 🎯 Vercel Dashboard 設定（需手動更新）

請前往 https://vercel.com/dashboard → 專案設定 → Build & Development Settings：

```
Framework Preset: Next.js
Root Directory: ./
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter web build
Output Directory: apps/web/.next
Node.js Version: 20.x
```

**重要：**
- `Root Directory` 必須是 `./`（專案根目錄），不是 `apps/web`
- `Node.js Version` 必須是 `20.x`，避免 22.x 的容器啟動問題

---

## 🚀 部署指令

### 方法 1：透過 CLI 立即部署（推薦測試）

```bash
cd "/Users/simonac/Desktop/moonshot idea"
pnpm install --frozen-lockfile
pnpm --filter web build
vercel --prebuilt --prod
```

### 方法 2：透過 Git Push（自動部署）

```bash
cd "/Users/simonac/Desktop/moonshot idea"
git add .
git commit -m "chore: align Vercel deployment configuration

- Unified apps/web/vercel.json with root vercel.json
- Added rootDirectory and nodeVersion settings
- Prebuild script ensures @plms/shared is compiled before web build"
git push origin chore/cleanup-tutor-safe
```

---

## ✅ 驗證清單

部署成功後確認：

- [ ] Vercel Dashboard 顯示 `● Ready`（非 `● Error`）
- [ ] 建置時間 > 60 秒（非 0ms）
- [ ] 預覽連結可以訪問
- [ ] E6 題型偵測正確
- [ ] E7 題型偵測正確
- [ ] E2 文法題偵測正確

---

## 📝 配置檔案摘要

### Root vercel.json
```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

### apps/web/vercel.json（已同步）
```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "rootDirectory": ".",
  "nodeVersion": "20.x"
}
```

### apps/web/package.json
```json
{
  "scripts": {
    "prebuild": "pnpm --filter @plms/shared build",
    "build": "next build"
  }
}
```

---

## 🔍 本地建置測試結果

```bash
$ pnpm --filter web build
✓ Compiled successfully
✓ Generating static pages (40/40)
✓ Build completed successfully
```

**狀態：** ✅ 建置成功，只有預期的 Next.js dynamic route warnings

---

## ⚠️ 注意事項

1. **Dashboard 設定優先級最高**
   - Vercel Dashboard 設定會覆蓋 `vercel.json`
   - 必須手動在 Dashboard 更新設定

2. **.vercel 目錄**
   - `.vercel` 目錄被 `.gitignore` 排除
   - 包含本地 CLI 配置，不需要提交到 Git

3. **建置順序**
   - `prebuild` → 編譯 `@plms/shared`
   - `build` → 編譯 Next.js 應用
   - 自動依賴順序執行

---

## 📚 相關文件

- `VERCEL_DEPLOYMENT_ISSUE.md` - 完整問題診斷與解決方案
- `DEPLOYMENT_GUIDE.md` - 部署流程指南

