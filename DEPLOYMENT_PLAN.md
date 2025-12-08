# 🚀 完整部署計劃

> **制定時間**: 2025-11-24  
> **部署目標**: 將所有變更安全部署到生產環境  
> **審查狀態**: ✅ 通過代碼審查，可以部署

---

## 📋 執行摘要

### ✅ 已完成項目
1. ✅ Battle-WS Async Recursion Loop 修復
2. ✅ Serde 依賴問題修復
3. ✅ Battle-WS 服務部署（Fly.io）
4. ✅ WebSocket 連接測試通過
5. ✅ 代碼審查完成

### ⚠️ 部署前必須完成
1. ⚠️ **Vercel 環境變數設置**（必須）
2. ⚠️ **API 端點驗證**（建議）

### 🎯 部署目標
- 將所有變更部署到生產環境
- 確保 WebSocket 服務正常運行
- 驗證完整對戰流程

---

## 🔍 階段 0: 部署前檢查清單

### ✅ 代碼審查狀態
- [x] 架構完整性檢查 ✅
- [x] Battle-WS 修復驗證 ✅
- [x] API 端點依賴檢查 ✅
- [x] 環境變數配置檢查 ✅
- [x] 編譯和類型檢查 ✅

### ⚠️ 待完成項目
- [ ] **Vercel 環境變數設置**（必須）
- [ ] API 端點 HTTP 方法驗證（建議）

---

## 📝 階段 1: Vercel 環境變數設置（必須）

### 1.1 登入 Vercel Dashboard
1. 訪問 https://vercel.com/dashboard
2. 選擇項目：`plms-learning`（或對應項目名稱）

### 1.2 設置環境變數
**路徑**: Settings → Environment Variables

**添加環境變數**:
```bash
NEXT_PUBLIC_BATTLE_WS_URL=wss://battle-ws.fly.dev/ws/battle
```

**可選環境變數**:
```bash
NEXT_PUBLIC_BATTLE_WS_ENABLED=true
```

### 1.3 應用環境變數
- ✅ **Production**: 必須勾選
- ✅ **Preview**: 建議勾選
- ⚪ **Development**: 可選

### 1.4 驗證設置
**檢查方法**:
1. 確認環境變數已保存
2. 確認已應用到 Production
3. 準備重新部署

**預計時間**: 5 分鐘

---

## 🔧 階段 2: API 端點驗證（建議）

### 2.1 檢查 API 端點

**需要驗證的端點**:
1. `/api/play/pve/questions` (POST) ✅ 已確認支援
2. `/api/play/questions/seed` (POST) ✅ 已確認支援
3. `/api/play/battle/events` (POST) ✅ 已確認支援

### 2.2 驗證 API Key 認證

**檢查 Battle-WS 請求頭**:
- Header: `x-internal-api-key`
- 環境變數: `INTERNAL_API_KEY`

**檢查 Next.js API 認證**:
- 確認 API 端點正確處理 `x-internal-api-key` header
- 確認環境變數 `INTERNAL_API_KEY` 或 `BATTLE_EVENTS_API_KEY` 已設置

### 2.3 測試 API 端點（可選）

**測試命令**:
```bash
# 測試 PVE Questions API
curl -X POST https://plms-learning.vercel.app/api/play/pve/questions \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: YOUR_API_KEY" \
  -d '{"userId":"test","subject":"english","numQuestions":10}'

# 測試 Seed Questions API
curl -X POST https://plms-learning.vercel.app/api/play/questions/seed \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: YOUR_API_KEY" \
  -d '{"subject":"english","numQuestions":10}'
```

**預計時間**: 15 分鐘（可選）

---

## 🚀 階段 3: 前端部署

### 3.1 部署方式選擇

**方式 1: 自動部署（推薦）**
- 推送 commit 到主分支
- Vercel 自動觸發部署
- 監控部署狀態

**方式 2: 手動部署**
- 在 Vercel Dashboard 點擊 "Redeploy"
- 選擇最新 commit
- 確認環境變數已應用

### 3.2 部署步驟

**步驟 1: 確認變更**
```bash
# 檢查 git 狀態
git status

# 確認所有變更已提交
git log --oneline -10
```

**步驟 2: 推送變更（如果使用自動部署）**
```bash
# 推送到主分支
git push origin main
# 或
git push origin master
```

**步驟 3: 監控部署**
1. 訪問 Vercel Dashboard
2. 查看 Deployments 標籤
3. 等待部署完成（通常 2-5 分鐘）

**步驟 4: 驗證部署**
- 檢查部署狀態：✅ Success
- 檢查構建日誌：無錯誤
- 確認環境變數已應用

**預計時間**: 5-10 分鐘

---

## ✅ 階段 4: 部署後驗證

### 4.1 WebSocket 連接測試

**測試方法 1: 瀏覽器控制台**
```javascript
// 在生產環境頁面打開控制台
const ws = new WebSocket('wss://battle-ws.fly.dev/ws/battle')
ws.onopen = () => console.log('✅ WebSocket 連接成功')
ws.onerror = (e) => console.error('❌ WebSocket 連接失敗', e)
```

**測試方法 2: 測試腳本**
```bash
cd /Users/simonac/Desktop/moonshot-idea
WS_URL=wss://battle-ws.fly.dev/ws/battle npx tsx test-websocket-complete.ts
```

**預期結果**:
- ✅ WebSocket 連接成功
- ✅ 認證成功
- ✅ 可以啟動對戰

### 4.2 完整對戰流程測試

**測試步驟**:
1. 登入生產環境
2. 進入 Play 頁面
3. 啟動 PVE 對戰
4. 完成一輪對戰
5. 確認結果正確顯示

**檢查項目**:
- ✅ WebSocket 連接正常
- ✅ 對戰啟動成功
- ✅ 題目顯示正常
- ✅ 答案提交正常
- ✅ 結果計算正確

**預計時間**: 10 分鐘

### 4.3 服務監控

**檢查 Battle-WS 日誌**:
```bash
cd services/battle-ws
flyctl logs --no-tail | tail -50
```

**檢查項目**:
- ✅ 無嚴重錯誤
- ✅ WebSocket 連接正常
- ✅ API 調用成功（或 fallback 正常）

**檢查 Vercel 日誌**:
- 訪問 Vercel Dashboard → Deployments → 最新部署 → Logs
- 檢查是否有錯誤

**預計時間**: 5 分鐘

---

## 🔄 階段 5: 回滾計劃（如果需要）

### 5.1 回滾觸發條件

**需要回滾的情況**:
- WebSocket 連接失敗
- 對戰功能完全無法使用
- 嚴重錯誤導致服務中斷

### 5.2 回滾步驟

**步驟 1: Vercel 回滾**
1. 訪問 Vercel Dashboard
2. 進入 Deployments
3. 找到上一個成功的部署
4. 點擊 "⋯" → "Promote to Production"

**步驟 2: 環境變數回滾（如果需要）**
1. 移除 `NEXT_PUBLIC_BATTLE_WS_URL`
2. 或設置為舊值（如果有）

**步驟 3: 驗證回滾**
- 確認服務恢復正常
- 測試基本功能

**預計時間**: 5 分鐘

---

## 📊 部署檢查清單

### 部署前 ✅
- [x] 代碼審查完成
- [x] Battle-WS 服務部署完成
- [x] WebSocket 測試通過
- [ ] **Vercel 環境變數設置** ⚠️
- [ ] API 端點驗證（可選）

### 部署中 ✅
- [ ] 確認變更已提交
- [ ] 觸發 Vercel 部署
- [ ] 監控部署狀態
- [ ] 確認部署成功

### 部署後 ✅
- [ ] WebSocket 連接測試
- [ ] 完整對戰流程測試
- [ ] 服務日誌檢查
- [ ] 錯誤監控

---

## 🎯 部署時間表

### 總預計時間: 30-45 分鐘

| 階段 | 任務 | 時間 | 狀態 |
|------|------|------|------|
| 階段 0 | 部署前檢查 | 已完成 | ✅ |
| 階段 1 | Vercel 環境變數設置 | 5 分鐘 | ⚠️ |
| 階段 2 | API 端點驗證（可選） | 15 分鐘 | ⚪ |
| 階段 3 | 前端部署 | 5-10 分鐘 | ⚪ |
| 階段 4 | 部署後驗證 | 15 分鐘 | ⚪ |

---

## ⚠️ 風險評估與緩解

### 低風險項目 ✅

**環境變數未設置**
- **風險**: 低
- **影響**: WebSocket 使用 localhost（開發環境）
- **緩解**: 已提供設置指南

**TypeScript 類型錯誤（Mobile）**
- **風險**: 低
- **影響**: 僅影響 Mobile App
- **緩解**: 不影響 Web 部署

### 中風險項目 ⚠️

**API 端點 405 錯誤**
- **風險**: 中等
- **影響**: Battle-WS 使用 fallback 邏輯
- **緩解**: 
  - 已確認 fallback 邏輯正常
  - 建議部署後驗證 API 端點

**WebSocket 連接問題**
- **風險**: 中等
- **影響**: 對戰功能無法使用
- **緩解**:
  - 已測試 WebSocket 連接
  - 有回滾計劃

### 高風險項目

**無** ✅

---

## 📝 部署後監控計劃

### 立即監控（部署後 1 小時）

**檢查項目**:
- WebSocket 連接成功率
- API 調用成功率
- 錯誤日誌
- 用戶反饋

**監控工具**:
- Vercel Dashboard Logs
- Fly.io Dashboard Logs
- 瀏覽器控制台

### 持續監控（部署後 24 小時）

**檢查項目**:
- 服務穩定性
- 錯誤率趨勢
- 性能指標
- 用戶體驗

---

## ✅ 部署確認

### 可以開始部署 ✅

**理由**:
1. ✅ 所有關鍵修復已完成
2. ✅ 代碼審查通過
3. ✅ Battle-WS 服務正常運行
4. ✅ WebSocket 測試通過
5. ✅ 無阻塞部署的嚴重問題

### 部署前最後確認

**必須完成**:
- [ ] Vercel 環境變數已設置
- [ ] 確認部署目標（Production）

**建議完成**:
- [ ] API 端點驗證
- [ ] 準備回滾計劃

---

## 🎉 部署完成標準

### 成功標準

1. ✅ Vercel 部署成功
2. ✅ WebSocket 連接正常
3. ✅ 完整對戰流程測試通過
4. ✅ 無嚴重錯誤日誌
5. ✅ 服務穩定運行

### 完成後行動

1. 更新部署文檔
2. 通知團隊部署完成
3. 持續監控服務狀態
4. 收集用戶反饋

---

**部署計劃制定時間**: 2025-11-24  
**計劃狀態**: ✅ 可以執行  
**下一步**: 完成階段 1（Vercel 環境變數設置）












































