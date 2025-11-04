# 🔧 Vercel Dashboard 設定修正指南

## ❌ 當前問題

你的 Vercel Dashboard 設定與 `vercel.json` 不一致，導致部署失敗。

### 當前 Dashboard 設定（錯誤）

**Framework Settings:**
- ✅ Framework Preset: `Next.js`
- ❌ Build Command: `pnpm build` → 應該是 `pnpm --filter web build`
- ❌ Output Directory: `.next` → 應該是 `apps/web/.next`
- ❌ Install Command: `pnpm install` → 應該是 `pnpm install --frozen-lockfile`
- ✅ Development Command: `cd apps/web && pnpm dev`

**Root Directory:**
- ❌ Root Directory: `apps/web` → 應該是 `./`（空字串或 `.`）

**Node.js Version:**
- ❌ Node.js Version: `22.x` → 應該是 `20.x`

---

## ✅ 正確設定

### 步驟 1: 修正 Framework Settings

前往：**Vercel Dashboard → Project Settings → General → Framework Settings**

1. **Build Command:**
   ```
   pnpm --filter web build
   ```

2. **Output Directory:**
   ```
   apps/web/.next
   ```

3. **Install Command:**
   ```
   pnpm install --frozen-lockfile
   ```

4. **Development Command:**（保持不變）
   ```
   cd apps/web && pnpm dev
   ```

5. 點擊 **Save**

---

### 步驟 2: 修正 Root Directory

前往：**Vercel Dashboard → Project Settings → General → Root Directory**

1. **Root Directory:**
   ```
   ./
   ```
   或直接**留空**（Vercel 會自動使用專案根目錄）

2. **設定選項:**
   - ✅ Enable "Include files outside the root directory in the Build Step"
   - ❌ Disable "Skip deployments when there are no changes to the root directory"

3. 點擊 **Save**

---

### 步驟 3: 修正 Node.js Version

前往：**Vercel Dashboard → Project Settings → General → Node.js Version**

1. **Node.js Version:**
   選擇 `20.x`（不是 22.x）

2. 點擊 **Save**

---

## 📋 完整設定摘要

| 設定項目 | 當前值（錯誤） | 正確值 |
|---------|--------------|--------|
| **Root Directory** | `apps/web` | `./` 或留空 |
| **Build Command** | `pnpm build` | `pnpm --filter web build` |
| **Output Directory** | `.next` | `apps/web/.next` |
| **Install Command** | `pnpm install` | `pnpm install --frozen-lockfile` |
| **Node.js Version** | `22.x` | `20.x` |

---

## 🔍 為什麼這些設定很重要？

### 1. Root Directory = `./`

**原因：** 我們是 monorepo 結構
- 專案根目錄有 `pnpm-workspace.yaml`
- `@plms/shared` 套件在 `packages/shared/`
- 需要在根目錄執行 `pnpm install` 才能正確建立 workspace symlinks

**如果設為 `apps/web`：**
- ❌ Vercel 會在 `apps/web` 目錄執行 `pnpm install`
- ❌ 找不到 `pnpm-workspace.yaml`，無法建立 workspace
- ❌ `@plms/shared` 套件無法解析

### 2. Build Command = `pnpm --filter web build`

**原因：** 只建置 `web` 應用，同時確保 `@plms/shared` 先建置

**如果使用 `pnpm build`：**
- ❌ 會嘗試建置整個 monorepo（包括 mobile）
- ❌ 可能浪費時間和資源

### 3. Output Directory = `apps/web/.next`

**原因：** Next.js 輸出在 `apps/web/.next`

**如果設為 `.next`：**
- ❌ Vercel 會尋找根目錄的 `.next`（不存在）
- ❌ 部署失敗

### 4. Install Command = `pnpm install --frozen-lockfile`

**原因：** 確保依賴版本一致

**如果使用 `pnpm install`：**
- ⚠️ 可能會更新 `pnpm-lock.yaml`
- ⚠️ 導致部署不一致

### 5. Node.js Version = `20.x`

**原因：** Vercel 對 Node 22.x 的支援可能不穩定

**如果使用 `22.x`：**
- ❌ 建置容器可能無法啟動
- ❌ 導致 `0ms` 建置時間（即時失敗）

---

## ✅ 修正後驗證

修正設定後：

1. **手動觸發部署：**
   ```bash
   git commit --allow-empty -m "chore: trigger deployment after settings fix"
   git push origin chore/cleanup-tutor-safe
   ```

2. **檢查部署日誌：**
   - 前往 Vercel Dashboard → Deployments
   - 點擊最新的部署
   - 應該看到：
     - ✅ Build 時間 > 0ms
     - ✅ `pnpm install --frozen-lockfile` 成功
     - ✅ `pnpm --filter web build` 成功
     - ✅ 找到 `apps/web/.next` 輸出

---

## 🚨 如果修正後仍然失敗

### 檢查清單：

1. ✅ Dashboard 設定已全部修正並儲存
2. ✅ `vercel.json` 存在且設定正確
3. ✅ GitHub 倉庫已正確連接
4. ✅ 環境變數已設定（`OPENAI_API_KEY` 等）

### 常見問題：

**Q: Dashboard 設定和 vercel.json 衝突？**  
A: Dashboard 設定優先於 `vercel.json`。確保 Dashboard 設定正確。

**Q: 修正後還是 0ms build？**  
A: 檢查 Node.js 版本是否為 `20.x`，並確認 Root Directory 為 `./`

**Q: 找不到 `@plms/shared` 套件？**  
A: 確認 Root Directory 為 `./`，這樣 `pnpm install` 才能正確建立 workspace

---

## 📝 快速修正步驟

1. 前往 Vercel Dashboard → Project Settings → General
2. 修正 Framework Settings：
   - Build Command: `pnpm --filter web build`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install --frozen-lockfile`
3. 修正 Root Directory: `./`（留空）
4. 修正 Node.js Version: `20.x`
5. 點擊所有 Save 按鈕
6. 觸發新部署測試

**完成後，部署應該會成功！** 🎉


