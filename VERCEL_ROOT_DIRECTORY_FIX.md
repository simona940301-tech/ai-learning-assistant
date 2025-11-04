# 🔧 Vercel Root Directory 設定修正

## ❌ 問題

Vercel 錯誤訊息：
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

**原因：**
- Root Directory 設為 `./`（根目錄）
- Vercel 在根目錄查找 `package.json` 中的 `next`
- 但 `next` 在 `apps/web/package.json` 中，不在根目錄

---

## ✅ 解決方案

### 方案 1：Root Directory = `apps/web` + 調整建置指令（推薦）

**Vercel Dashboard 設定：**

1. **Root Directory:** `apps/web`
2. **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
3. **Build Command:** `cd ../.. && pnpm --filter web build`
4. **Output Directory:** `apps/web/.next`（相對 Root Directory，實際會是 `.next`）

**說明：**
- Root Directory 設為 `apps/web`，Vercel 會在這裡查找 `next`
- Install Command 先回到根目錄執行 `pnpm install`，建立 workspace
- Build Command 也在根目錄執行，確保 `@plms/shared` 先建置
- Output Directory 相對於 Root Directory，所以設為 `.next` 即可

---

### 方案 2：保持 Root Directory = `./` + 在 vercel.json 明確指定

**Vercel Dashboard 設定：**
- Root Directory: `./`（留空或 `.`）

**vercel.json 內容：**
```json
{
  "framework": "nextjs",
  "rootDirectory": "apps/web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**注意：** `vercel.json` 中的 `rootDirectory` 會覆蓋 Dashboard 設定。

---

## 🎯 推薦設定（已更新 vercel.json）

我已更新 `vercel.json`，設定如下：

```json
{
  "framework": "nextjs",
  "rootDirectory": "apps/web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**請在 Vercel Dashboard 中設定：**

1. **Root Directory:** `apps/web`
2. **Build Command:** `cd ../.. && pnpm --filter web build`
3. **Output Directory:** `.next`（相對於 Root Directory）
4. **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
5. **Node.js Version:** `20.x`

---

## 📋 完整設定對照表

| 設定項目 | Dashboard 值 | vercel.json 值 | 說明 |
|---------|-------------|---------------|------|
| **Root Directory** | `apps/web` | `apps/web` | Next.js 專案目錄 |
| **Build Command** | `cd ../.. && pnpm --filter web build` | 同上 | 從根目錄執行 |
| **Output Directory** | `.next` | `apps/web/.next` | 相對於 Root Directory |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` | 同上 | 從根目錄執行 |
| **Node.js Version** | `20.x` | - | Dashboard 設定 |

---

## ✅ 驗證步驟

設定完成後：

1. **提交並推送 vercel.json 變更**
2. **觸發新部署**
3. **檢查部署日誌：**
   - ✅ 應該看到 "Detected Next.js version: 14.1.0"
   - ✅ 應該看到 "Running: cd ../.. && pnpm install --frozen-lockfile"
   - ✅ 應該看到 "Running: cd ../.. && pnpm --filter web build"
   - ✅ 應該找到 `.next` 輸出目錄

---

## 🔍 為什麼這樣設定？

### Root Directory = `apps/web`
- Vercel 會在 `apps/web` 查找 `package.json` 中的 `next`
- 找到 `next: "14.1.0"`，正確識別 Next.js 版本

### Install Command = `cd ../.. && pnpm install --frozen-lockfile`
- 先回到根目錄（`cd ../..`）
- 在根目錄執行 `pnpm install`，建立 workspace
- 確保 `@plms/shared` 套件正確安裝

### Build Command = `cd ../.. && pnpm --filter web build`
- 先回到根目錄
- 執行 `pnpm --filter web build`
- 確保 `@plms/shared` 先建置，然後建置 `web`

### Output Directory = `.next`（相對於 Root Directory）
- Root Directory 是 `apps/web`
- Output Directory 設為 `.next`
- 實際輸出路徑：`apps/web/.next` ✅

---

## 🚀 下一步

1. **更新 Vercel Dashboard 設定**（如上所述）
2. **提交 vercel.json 變更**
3. **觸發新部署**
4. **檢查部署是否成功**

