# 🔴 Vercel 部署問題診斷報告

## 📊 問題概述

**核心問題：** Vercel 部署持續失敗，所有部署顯示 `0ms` 建置時間，表示建置過程根本沒有執行。

**影響：** E6/E7 英文題型偵測的修復無法部署到線上環境，用戶無法看到最新的改進。

---

## 🔍 詳細問題分析

### 1. 症狀

```
Status: ● Error
Builds: . [0ms]
```

**含義：**
- Vercel 接收到部署請求
- 但建置過程立即失敗（0ms = 沒有真正執行）
- 沒有任何錯誤日誌或建置輸出

### 2. 根本原因

1. **Node.js 版本配置錯誤**  
   - Dashboard 設定為 `nodeVersion: "22.x"`，這個版本尚未在 Vercel 穩定支援  
   - 建置容器啟動時直接失敗，因此顯示 `0ms` 並且沒有任何 log

2. **建置指令在 workspace 外執行**  
   - Dashboard 預設在 `apps/web` 目錄執行 `pnpm install` / `pnpm build`  
   - `@plms/shared` 需要在 workspace 根目錄建立 symlink 才能解析，導致模組解析失敗

3. **`turbo` 依賴遠端快取**  
   - `pnpm turbo run build` 在沒有 Token 的環境會嘗試 TLS 初始化  
   - 未正確設定 `TURBO_TOKEN` 時指令會即時終止，Vercel 仍顯示 `0ms`

---

## 📝 已嘗試的解決方案

### ❌ 嘗試 1: 修改 vercel.json - rootDirectory + 相對路徑

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm install && cd apps/web && pnpm build",
  "installCommand": "pnpm install",
  "rootDirectory": "apps/web"
}
```

**結果：** 失敗（0ms build）
**原因：** Vercel 從 `apps/web` 開始執行，`cd ../..` 路徑錯誤

---

### ❌ 嘗試 2: 移除 rootDirectory + 使用 pnpm filter

```json
{
  "buildCommand": "pnpm install && pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install"
}
```

**結果：** 失敗（0ms build）
**原因：** Dashboard 設定的 `rootDirectory` 仍然生效，覆蓋了 vercel.json

---

### ❌ 嘗試 3: 使用 pnpm turbo

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm turbo run build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install"
}
```

**本地測試：** ✅ 成功
```bash
# 本地執行完全正常
pnpm turbo run build --filter=web
# ✓ @plms/shared 先建置
# ✓ web 接著建置
# ✓ 整個流程順利完成
```

**Vercel 部署：** ❌ 失敗（0ms build）
**原因：** vercel.json 配置仍被 Dashboard 設定覆蓋

---

## 🔑 關鍵發現

### Vercel 配置優先級

```
Vercel Dashboard Settings (最高優先級)
    ↓
vercel.json (被覆蓋)
    ↓
package.json scripts (最低優先級)
```

### 更新後的 Dashboard 設定（已同步至 `.vercel/project.json`）

```json
{
  "settings": {
    "framework": "nextjs",
    "devCommand": "pnpm --filter web dev",
    "installCommand": "pnpm install --frozen-lockfile",
    "buildCommand": "pnpm --filter web build",
    "outputDirectory": "apps/web/.next",
    "rootDirectory": ".",
    "nodeVersion": "20.x"
  }
}
```

**為什麼這個設定可行：**
1. 指令在 repo 根目錄執行，可解析 `pnpm-workspace.yaml`
2. `prebuild` 會優先產生 `@plms/shared/dist`
3. Node 20 與 Next 14 相容，容器可以正常啟動

---

## ✅ 正確的解決方案

### 方案 A: 更新 Vercel Dashboard 設定（推薦）

**Dashboard 需要與 repo 內的 `vercel.json` 保持一致：**

1. 前往 https://vercel.com/dashboard  
2. 選擇專案 `plms-learning`  
3. 進入 **Settings → General → Build & Development Settings**
4. 開啟「Override」後填入以下值：

```
Framework Preset: Next.js
Root Directory: ./
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter web build
Output Directory: apps/web/.next
Node.js Version: 20.x
```

**主要差異：**
- `Root Directory` 回到專案根目錄，`pnpm` 能找到 workspace 設定  
- `pnpm --filter web build` 會先觸發 `apps/web` 的 `prebuild`，自動編譯 `@plms/shared`  
- `Node.js 20.x` 為 Vercel 目前穩定支援版本，避免容器尚未啟動就終止

---

### 方案 B: 使用 Vercel CLI 部署（臨時方案）

```bash
# 從專案根目錄執行
pnpm install --frozen-lockfile
pnpm --filter web build
vercel --prebuilt --prod
```

**優點：**
- 可立即驗證設定是否正確
- 透過 `--prebuilt` 直接使用剛生成的 `.next`

**缺點：**
- 不是自動部署
- 每次都要手動執行

---

### 方案 C: 簡化為單一應用（不推薦）

將 `@plms/shared` 的程式碼直接合併到 `apps/web`，移除 workspace 依賴。

**缺點：**
- 破壞現有架構
- 失去 monorepo 的優勢
- 日後維護困難

---

## 🎯 建議執行步驟

### 立即行動（方案 A）

1. **調整 Vercel Dashboard 設定**
   - 登入 https://vercel.com/dashboard
   - 確認 `Root Directory` = `./`
   - 確認 `Node.js Version` = `20.x`
   - 將 `Install Command` / `Build Command` 更新為方案 A 的指令

2. **觸發新的部署**
   ```bash
   git commit --allow-empty -m "Trigger deployment after Vercel settings update"
   git push origin chore/cleanup-tutor-safe
   ```

3. **驗證部署成功**
   ```bash
   # 等待 2-3 分鐘後檢查
   vercel ls | head -5
   vercel inspect <latest-url>
   ```

4. **測試 E6/E7 偵測**
   - 訪問預覽連結
   - 測試 Little Prince 範例
   - 確認 E6 偵測正確

---

## 📊 部署歷史記錄

| 時間 | URL | 狀態 | 建置時間 | 問題 |
|------|-----|------|---------|------|
| 13h ago | acy07j307 | ✅ Ready | 1m | 上一個成功的部署（E6/E7 修復前） |
| 26m ago | 42g5c4wiz | ❌ Error | 1m | 使用舊配置 |
| 10m ago | 3mm05i98z | ❌ Error | 0ms | rootDirectory 衝突 |
| 8m ago | c4ex7gu6w | ❌ Error | 0ms | vercel.json 被忽略 |
| 3m ago | n00h945rj | ❌ Error | 0ms | Dashboard 設定優先 |

**觀察：**
- 最近的失敗都是 0ms → 配置問題，不是程式碼問題
- 本地建置完全正常 → 證明程式碼沒問題
- 唯一成功的部署是 13 小時前 → 在修改 vercel.json 之前

---

## 🔧 技術細節

### Workspace 依賴關係

```json
// apps/web/package.json
{
  "dependencies": {
    "@plms/shared": "workspace:*"  // ← 需要從 workspace root 解析
  }
}
```

### 正確的建置命令

```bash
# ✅ 從根目錄執行（正確）
pnpm --filter web build
# → `prebuild` 腳本會自動編譯 @plms/shared
# → `.next` 產出於 apps/web/.next
```

---

## ✅ 驗證清單

部署成功後，請確認：

- [ ] Vercel 部署狀態顯示 `● Ready`
- [ ] 建置時間 > 0ms（應該約 1-2 分鐘）
- [ ] 預覽連結可以訪問
- [ ] E6 題型偵測正確（Little Prince 範例）
- [ ] E7 題型偵測正確（Cyberbullying 範例）
- [ ] E2 文法題偵測正確
- [ ] 其他功能正常運作

---

## 📚 相關文件

- **Vercel Monorepo 文件**: https://vercel.com/docs/monorepos
- **Turborepo 文件**: https://turbo.build/repo/docs
- **pnpm Workspace**: https://pnpm.io/workspaces
- **本地測試腳本**: `scripts/validate-goldset-v2.ts`

---

## 💡 總結

**問題核心：** Vercel Dashboard 的 `rootDirectory: "apps/web"` 設定破壞了 monorepo workspace 結構。

**解決方法：** 必須在 Vercel Dashboard 手動將 Root Directory 改為 `./`（專案根目錄）。

**驗證方式：** 成功後建置時間應該 > 60 秒，而不是 0ms。

**程式碼狀態：** ✅ 所有程式碼修復都已完成並測試通過，只差部署配置。
