# 🔍 Vercel 設定衝突分析與修正

## ❌ 發現的問題

根據你的 Dashboard 截圖，發現以下衝突：

### 1. Production Overrides vs Project Settings

**Production Overrides（錯誤）：**
- Build Command: `pnpm build` ❌
- Install Command: `pnpm install` ❌

**Project Settings（部分正確）：**
- Build Command: `pnpm --filter web build` ✅
- Install Command: `pnpm install --frozen-lockfile` ✅
- Output Directory: `.next` ✅

**問題：** Production Overrides 會覆蓋 Project Settings，導致部署失敗。

---

### 2. vercel.json vs Dashboard 設定不一致

**vercel.json：**
```json
{
  "rootDirectory": "apps/web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**Dashboard Project Settings：**
- Install Command: `pnpm install --frozen-lockfile`（缺少 `cd ../..`）
- Build Command: `pnpm --filter web build`（缺少 `cd ../..`）
- Output Directory: `.next`（相對於 Root Directory，正確）

**問題：** 當 `rootDirectory` 是 `apps/web` 時，執行 `pnpm install` 會失敗，因為需要從根目錄執行才能建立 workspace。

---

## ✅ 正確設定

### 方案 1：使用 Dashboard 設定（推薦）

**Production Overrides：**
- ❌ **移除所有 Production Overrides**（讓它使用 Project Settings）

**Project Settings：**
- Framework Preset: `Next.js`
- Build Command: `cd ../.. && pnpm --filter web build`
- Output Directory: `.next`
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Development Command: `cd apps/web && pnpm dev`

**Root Directory：**
- Root Directory: `apps/web`
- ✅ Enable "Include files outside the root directory in the Build Step"

**Node.js Version：**
- Node.js Version: `20.x`

---

### 方案 2：移除 rootDirectory，使用根目錄（替代方案）

如果方案 1 不行，可以嘗試：

**vercel.json：**
```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**Dashboard：**
- Root Directory: `./`（留空）
- Build Command: `pnpm --filter web build`
- Output Directory: `apps/web/.next`
- Install Command: `pnpm install --frozen-lockfile`

**問題：** 這樣 Vercel 會找不到 Next.js（因為 `next` 在 `apps/web/package.json` 中）

---

## 🎯 推薦修正步驟

### 步驟 1: 修正 Dashboard Project Settings

1. **前往 Framework Settings**
2. **Build Command:** 改為 `cd ../.. && pnpm --filter web build`
3. **Install Command:** 改為 `cd ../.. && pnpm install --frozen-lockfile`
4. **Output Directory:** 保持 `.next`
5. **點擊 Save**

### 步驟 2: 移除 Production Overrides

1. **在 Framework Settings 中找到 "Production Overrides" 區塊**
2. **清空 Build Command 和 Install Command**
3. **或確保它們與 Project Settings 一致**
4. **點擊 Save**

### 步驟 3: 確認 Root Directory

1. **Root Directory:** `apps/web`
2. **✅ Enable "Include files outside the root directory in the Build Step"**
3. **點擊 Save**

### 步驟 4: 確認 Node.js Version

1. **Node.js Version:** `20.x`
2. **點擊 Save**

---

## 📋 完整設定對照表

| 設定項目 | vercel.json | Dashboard Project Settings | Dashboard Production Overrides |
|---------|------------|---------------------------|------------------------------|
| **Root Directory** | `apps/web` | `apps/web` | - |
| **Build Command** | `cd ../.. && pnpm --filter web build` | `pnpm --filter web build` ❌ | `pnpm build` ❌ |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile` ❌ | `pnpm install` ❌ |
| **Output Directory** | `apps/web/.next` | `.next` ✅ | - |
| **Node.js Version** | - | `20.x` ✅ | - |

---

## 🔍 為什麼需要 `cd ../..`

當 `rootDirectory` 設為 `apps/web` 時：
1. Vercel 會切換到 `apps/web` 目錄
2. 執行 install/build 指令
3. 但 `pnpm install` 需要在根目錄執行才能建立 workspace
4. 所以需要 `cd ../..` 回到根目錄

---

## ✅ 修正後驗證

修正設定後：

1. **觸發新部署**
2. **檢查部署日誌：**
   - ✅ 應該看到 "Detected Next.js version: 14.1.0"
   - ✅ 應該看到 "Running: cd ../.. && pnpm install --frozen-lockfile"
   - ✅ 應該看到 "Running: cd ../.. && pnpm --filter web build"
   - ✅ 應該找到 `.next` 輸出目錄

---

## 🚨 關鍵問題

**Production Overrides 會覆蓋 Project Settings！**

即使 Project Settings 正確，如果 Production Overrides 設定錯誤，部署還是會失敗。

**解決方法：**
- 移除 Production Overrides 的所有設定
- 或確保 Production Overrides 與 Project Settings 一致


