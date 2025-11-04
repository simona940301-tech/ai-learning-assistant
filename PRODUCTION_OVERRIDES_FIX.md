# 🔧 Production Overrides 無法移除的解決方案

## ❌ 問題

Production Overrides 無法從 Dashboard UI 移除，會覆蓋 Project Settings，導致部署失敗。

---

## ✅ 解決方案

### 方案 1: 使用 vercel.json 強制覆蓋（推薦）

`vercel.json` 中的設定會**優先於** Dashboard 的 Production Overrides。

我已更新 `vercel.json`，確保設定正確：

```json
{
  "framework": "nextjs",
  "rootDirectory": "apps/web",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm --filter web build",
  "outputDirectory": "apps/web/.next"
}
```

**重要：** `vercel.json` 必須在**專案根目錄**，Vercel 才會讀取它。

---

### 方案 2: 聯繫 Vercel 支援移除 Production Overrides

如果方案 1 不行，可以聯繫 Vercel 支援：

1. **前往：** https://vercel.com/support
2. **說明問題：**
   ```
   Hi Vercel Support,
   
   I'm unable to remove Production Overrides from my project settings.
   The Production Overrides are:
   - Build Command: pnpm build
   - Install Command: pnpm install
   
   These override settings are causing deployment failures because they don't 
   account for the monorepo structure. I need these Production Overrides removed 
   so that vercel.json or Project Settings can be used instead.
   
   Project: plms-learning
   Repository: simona940301-tech/ai-learning-assistant
   
   Thank you!
   ```

---

### 方案 3: 創建新專案（最後手段）

如果以上都不行，可以：

1. **創建新 Vercel 專案**
2. **連接相同的 GitHub 倉庫**
3. **從一開始就使用正確的設定**

---

## 🔍 驗證 vercel.json 是否生效

### 步驟 1: 確認 vercel.json 位置

```bash
# vercel.json 必須在專案根目錄
ls -la vercel.json
```

### 步驟 2: 提交並推送

```bash
git add vercel.json
git commit -m "fix: update vercel.json to override Production Overrides"
git push origin chore/cleanup-tutor-safe
```

### 步驟 3: 檢查部署日誌

部署後，檢查 Build Logs：

**應該看到：**
```
Running: cd ../.. && pnpm install --frozen-lockfile
Running: cd ../.. && pnpm --filter web build
```

**不應該看到：**
```
Running: pnpm build
Running: pnpm install
```

如果看到 `pnpm build` 或 `pnpm install`（沒有 `cd ../..`），表示 Production Overrides 仍然生效。

---

## 📋 設定優先級

Vercel 設定優先級（從高到低）：

1. **vercel.json**（最高優先級）
2. **Production Overrides**（Dashboard）
3. **Project Settings**（Dashboard）

**關鍵：** `vercel.json` 應該可以覆蓋 Production Overrides。

---

## 🚨 如果 vercel.json 仍不生效

### 檢查項目：

1. ✅ `vercel.json` 是否在專案根目錄？
2. ✅ `vercel.json` 語法是否正確？（可以用 JSON validator 檢查）
3. ✅ 是否已提交並推送到 GitHub？
4. ✅ Vercel 是否已重新讀取 `vercel.json`？（可能需要觸發新部署）

### 強制重新讀取：

```bash
# 透過 Vercel CLI 部署，強制使用 vercel.json
vercel --prod --force
```

---

## 💡 替代方案：使用環境變數強制覆蓋

如果以上都不行，可以在 Vercel Dashboard 設定環境變數：

1. **前往：** Settings → Environment Variables
2. **添加：**
   - `VERCEL_BUILD_COMMAND` = `cd ../.. && pnpm --filter web build`
   - `VERCEL_INSTALL_COMMAND` = `cd ../.. && pnpm install --frozen-lockfile`

**注意：** 這不是標準做法，但可以作為臨時解決方案。

---

## ✅ 最終檢查清單

- [ ] `vercel.json` 在專案根目錄
- [ ] `vercel.json` 設定正確（包含 `cd ../..`）
- [ ] 已提交並推送 `vercel.json`
- [ ] 觸發新部署
- [ ] 檢查 Build Logs 確認使用正確的指令

如果完成以上步驟後仍然失敗，建議聯繫 Vercel 支援移除 Production Overrides。


