# 📖 部署步驟白話解釋

> **目標**: 用最簡單的方式解釋現階段應該做什麼

---

## 🎯 簡單來說

你的專案有**兩個部分**需要部署：

1. **Battle-WS 服務**（Rust WebSocket 服務）- ✅ **已經部署好了**
2. **Next.js 後端 API**（所有 API 路由和前端）- ⚠️ **還沒部署**

---

## 📦 第一部分：Battle-WS 服務（已完成 ✅）

### 這是什麼？
- 一個**獨立的 WebSocket 服務**，用 Rust 寫的
- 負責處理**對戰的即時通訊**（玩家答題、AI 答題、分數更新等）
- 已經部署在 **Fly.io** 上
- WebSocket URL: `wss://battle-ws.fly.dev/ws/battle`

### 狀態
✅ **已經完成** - 不需要再做什麼

---

## 📦 第二部分：Next.js 後端 API（還沒部署 ⚠️）

### 這是什麼？
- 你的**主要網站**（前端 + 後端 API）
- 包括所有頁面、API 路由、資料庫操作等
- 需要部署到 **Vercel**

### 目前狀態
⚠️ **有很多變更還沒提交和部署**

從 `git status` 可以看到：
- 有**很多檔案被修改**了（100+ 個檔案）
- 包括：
  - API 路由（`apps/web/app/api/` 下的所有檔案）
  - 前端組件（`apps/web/components/`）
  - 後端邏輯（`apps/web/lib/`）
  - Battle-WS 的修復（`services/battle-ws/src/`）

---

## 🚀 現階段應該做什麼？

### 步驟 1: 提交所有變更（必須）

**為什麼要做？**
- 你修改了很多檔案，但這些變更還存在你的電腦上
- 需要先提交到 Git，才能部署到 Vercel

**怎麼做？**
```bash
# 1. 檢查有哪些變更
git status

# 2. 添加所有變更（除了 node_modules）
git add .

# 3. 提交變更（寫一個清楚的訊息）
git commit -m "fix: Battle-WS async recursion loop + 後端 API 更新"

# 4. 推送到遠端
git push origin fix-explaincard-rollback
```

**預計時間**: 5 分鐘

---

### 步驟 2: 設置 Vercel 環境變數（必須）

**為什麼要做？**
- 前端需要知道 WebSocket 服務的網址
- 否則前端會嘗試連接到 `localhost`（開發環境）

**怎麼做？**
1. 打開 Vercel Dashboard: https://vercel.com/dashboard
2. 選擇你的專案
3. 進入 **Settings** → **Environment Variables**
4. 添加：
   ```
   NEXT_PUBLIC_BATTLE_WS_URL = wss://battle-ws.fly.dev/ws/battle
   ```
5. 確認應用到 **Production** 環境
6. 點擊 **Save**

**預計時間**: 3 分鐘

---

### 步驟 3: 部署到 Vercel（必須）

**為什麼要做？**
- 你的所有變更（API、前端、後端邏輯）都在本地
- 需要部署到 Vercel，用戶才能使用

**怎麼做？**

**方式 1: 自動部署（推薦）**
```bash
# 推送到主分支（如果 Vercel 連接到主分支）
git push origin main
# 或
git push origin master
```

**方式 2: 手動部署**
1. 打開 Vercel Dashboard
2. 進入 **Deployments**
3. 點擊 **Create Deployment**
4. 選擇最新的 commit
5. 點擊 **Deploy**

**預計時間**: 5-10 分鐘（等待構建完成）

---

### 步驟 4: 驗證部署（必須）

**為什麼要做？**
- 確認所有功能正常運作
- 確認 WebSocket 連接正常

**怎麼做？**

**檢查 1: 確認部署成功**
- 在 Vercel Dashboard 查看部署狀態
- 確認顯示 ✅ **Success**

**檢查 2: 測試 WebSocket 連接**
```bash
# 在瀏覽器打開生產環境網站
# 打開開發者工具（F12）
# 在 Console 輸入：
const ws = new WebSocket('wss://battle-ws.fly.dev/ws/battle')
ws.onopen = () => console.log('✅ WebSocket 連接成功')
ws.onerror = (e) => console.error('❌ WebSocket 連接失敗', e)
```

**檢查 3: 測試完整流程**
1. 登入網站
2. 進入 Play 頁面
3. 啟動 PVE 對戰
4. 確認可以正常答題
5. 確認結果正確顯示

**預計時間**: 10 分鐘

---

## 📋 完整檢查清單

### ✅ 部署前準備
- [ ] **提交所有變更到 Git**（步驟 1）
- [ ] **設置 Vercel 環境變數**（步驟 2）

### ✅ 部署執行
- [ ] **觸發 Vercel 部署**（步驟 3）
- [ ] **等待構建完成**

### ✅ 部署後驗證
- [ ] **確認部署成功**
- [ ] **測試 WebSocket 連接**
- [ ] **測試完整對戰流程**
- [ ] **檢查服務日誌**

---

## ⚠️ 重要提醒

### 1. 不要跳過步驟
- 每個步驟都很重要
- 跳過任何步驟都可能導致問題

### 2. 先提交再部署
- **必須先提交變更到 Git**
- 否則 Vercel 無法部署你的變更

### 3. 環境變數很重要
- **必須設置 `NEXT_PUBLIC_BATTLE_WS_URL`**
- 否則前端無法連接到 WebSocket 服務

### 4. 部署後要測試
- **必須測試完整流程**
- 確認所有功能正常

---

## 🎯 總結：現階段應該做什麼？

### 必須完成的 3 件事：

1. **提交所有變更**（5 分鐘）
   - 把所有修改的檔案提交到 Git

2. **設置環境變數**（3 分鐘）
   - 在 Vercel 設置 `NEXT_PUBLIC_BATTLE_WS_URL`

3. **部署到 Vercel**（10 分鐘）
   - 觸發部署並等待完成

### 總時間：約 20 分鐘

---

## ❓ 常見問題

### Q: 為什麼 Battle-WS 已經部署了，還要部署 Next.js？
**A**: Battle-WS 只是 WebSocket 服務，你的網站（前端 + API）還需要部署到 Vercel。

### Q: 如果我不設置環境變數會怎樣？
**A**: 前端會嘗試連接到 `localhost:8080`（開發環境），在生產環境會失敗。

### Q: 部署後發現問題怎麼辦？
**A**: 可以在 Vercel Dashboard 回滾到上一個版本。

### Q: 需要部署 Mobile App 嗎？
**A**: 不需要，Mobile App 的類型錯誤不影響 Web 部署。

---

**準備好了嗎？讓我們開始部署！** 🚀













































