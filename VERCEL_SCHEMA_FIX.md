# 🔧 Vercel 部署錯誤修正

## ❌ 發現的錯誤

### 錯誤 1: vercel.json schema validation failed
```
The `vercel.json` schema validation failed with the following message: 
should NOT have additional property `rootDirectory`
```

**原因：** `vercel.json` 中**不能**包含 `rootDirectory` 屬性。這是 Dashboard 專屬設定。

### 錯誤 2: Root Directory does not exist
```
The specified Root Directory "apps/web" does not exist. 
Please update your Project Settings.
```

**原因：** Dashboard 和 `vercel.json` 設定衝突。

---

## ✅ 正確設定

### vercel.json（已修正）

```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**重要：**
- ❌ **不要**在 `vercel.json` 中包含 `rootDirectory`
- ✅ `rootDirectory` 只在 Dashboard 設定

---

### Dashboard 設定

**Root Directory:**
- Root Directory: `apps/web`
- ✅ Enable "Include files outside the root directory in the Build Step"

**Framework Settings:**
- Build Command: `cd ../.. && pnpm --filter web build`
- Output Directory: `.next`（相對於 Root Directory）
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`

**Node.js Version:**
- Node.js Version: `20.x`

---

## 📋 14 小時前成功部署的設定

根據 Git 歷史，14 小時前成功的設定是：

```json
{
  "buildCommand": "pnpm install && pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install"
}
```

**關鍵差異：**
- ✅ 沒有 `rootDirectory` 屬性
- ✅ 在根目錄執行（不需要 `cd ../..`）
- ✅ 當時 Dashboard 的 Root Directory 可能是 `./`（根目錄）

---

## 🔍 為什麼現在失敗？

### 問題 1: vercel.json 包含不被允許的屬性

`vercel.json` 添加了 `rootDirectory`，但 Vercel schema 不允許這個屬性。

### 問題 2: 設定衝突

當 Dashboard Root Directory = `apps/web` 時：
- Vercel 切換到 `apps/web` 目錄
- 執行 `cd ../..` 回到根目錄
- 但如果 `apps/web` 不存在或路徑錯誤，會失敗

---

## ✅ 解決方案

### 方案 1: 使用 Dashboard Root Directory（推薦）

**Dashboard 設定：**
- Root Directory: `apps/web`
- ✅ Enable "Include files outside the root directory"

**vercel.json：**
```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**已修正：** 移除了 `rootDirectory` 屬性。

---

### 方案 2: 使用根目錄（替代方案）

如果方案 1 不行，可以嘗試：

**Dashboard 設定：**
- Root Directory: `./`（留空或 `.`）

**vercel.json：**
```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**問題：** Vercel 可能找不到 Next.js（因為 `next` 在 `apps/web/package.json`）

---

## 🎯 立即修正步驟

### 步驟 1: 更新 vercel.json（已完成）

已移除 `rootDirectory` 屬性。

### 步驟 2: 確認 Dashboard 設定

1. **Root Directory:** `apps/web`
2. **✅ Enable "Include files outside the root directory"**
3. **Build Command:** `cd ../.. && pnpm --filter web build`
4. **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
5. **Output Directory:** `.next`
6. **Node.js Version:** `20.x`

### 步驟 3: 提交並推送

```bash
git add vercel.json
git commit -m "fix: remove rootDirectory from vercel.json (not allowed in schema)"
git push origin chore/cleanup-tutor-safe
```

---

## ✅ 修正後驗證

修正後，應該：

1. ✅ Schema validation 通過
2. ✅ Root Directory 存在（Dashboard 設定）
3. ✅ Build Command 正確執行
4. ✅ 部署成功

---

## 📝 關鍵要點

1. **`vercel.json` 不能包含 `rootDirectory`**
   - `rootDirectory` 只在 Dashboard 設定

2. **Dashboard 和 `vercel.json` 配合使用**
   - Dashboard: Root Directory
   - `vercel.json`: Build/Install Command

3. **路徑要正確**
   - 如果 Root Directory = `apps/web`
   - 需要 `cd ../..` 回到根目錄執行 `pnpm install`

---

## 🚀 下一步

1. ✅ `vercel.json` 已修正（移除 `rootDirectory`）
2. ⏳ 提交並推送
3. ⏳ 觸發新部署
4. ⏳ 檢查是否成功


