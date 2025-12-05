# WebSocket 完整流程測試指南

## 📋 概述

本指南說明如何測試 WebSocket 對戰系統的完整流程。

## 🎯 測試目標

驗證以下完整流程：
1. ✅ 連接 WebSocket
2. ✅ AUTH 認證
3. ✅ START_MATCH 啟動對戰
4. ✅ LOBBY_CONFIRMING 大廳確認
5. ✅ CONFIRM_LOBBY 確認大廳
6. ✅ MATCH_FOUND 找到對戰
7. ✅ ROUND_STARTED 回合開始
8. ✅ SUBMIT_ANSWER 提交答案
9. ✅ QUESTION_RESULT 答題結果
10. ✅ BATTLE_END 對戰結束

## 🚀 快速開始

### 前置條件

1. **啟動 WebSocket 服務器**
   ```bash
   cd services/battle-ws
   ./start.sh
   # 或
   cargo run
   ```

2. **確認服務器運行在**
   - 默認地址：`ws://localhost:8080/ws/battle`
   - 可通過環境變數 `WS_URL` 自定義

### 執行測試

#### 方法 1：使用 npm script（推薦）

```bash
# 完整測試（使用 TypeScript）
npm run test:websocket

# 或使用 pnpm
pnpm test:websocket

# 簡單測試（使用 JavaScript）
npm run test:websocket:simple
```

#### 方法 2：直接執行

```bash
# 需要先安裝 tsx（如果沒有）
npm install -D tsx

# 執行測試
npx tsx test-websocket-complete.ts

# 或使用環境變數自定義 WebSocket URL
WS_URL=ws://your-server:8080/ws/battle npx tsx test-websocket-complete.ts
```

#### 方法 3：使用 Node.js（需要先編譯）

```bash
# 編譯 TypeScript
npx tsc test-websocket-complete.ts

# 執行
node test-websocket-complete.js
```

## 📊 測試報告

測試完成後會顯示詳細報告：

```
📊 測試報告
============================================================
⏱️  測試時長: 45.23 秒
📨 收到消息數: 25
📤 發送消息數: 12
📝 答題數量: 10
✅ 正確答案: 7
📊 最終分數: 850
🏆 獲勝者: player

✅ 完成的步驟:
   ✓ CONNECTED
   ✓ AUTH_SENT
   ✓ START_MATCH_SENT
   ✓ LOBBY_CONFIRMING_RECEIVED
   ✓ CONFIRM_LOBBY_SENT
   ✓ MATCH_FOUND_RECEIVED
   ✓ ROUND_STARTED_RECEIVED
   ✓ QUESTIONS_ANSWERED
   ✓ BATTLE_END_RECEIVED
```

## 🔍 測試流程詳解

### 1. 連接階段
- 連接到 WebSocket 服務器
- 驗證連接成功

### 2. 認證階段
- 發送 `AUTH` 消息
- 等待認證確認

### 3. 匹配階段
- 發送 `START_MATCH` 消息（PVE_TRAINING 模式）
- 接收 `LOBBY_CONFIRMING` 消息
- 發送 `CONFIRM_LOBBY` 消息
- 接收 `MATCH_FOUND` 消息（包含題目列表）

### 4. 對戰階段
- 接收 `ROUND_STARTED` 消息
- 自動提交答案（`SUBMIT_ANSWER`）
- 接收 `QUESTION_RESULT` 消息
- 重複直到所有題目完成

### 5. 結束階段
- 接收 `BATTLE_END` 消息
- 顯示最終結果
- 生成測試報告

## ⚙️ 配置選項

### 環境變數

- `WS_URL`: WebSocket 服務器地址（默認：`ws://localhost:8080/ws/battle`）

### 測試參數

可在腳本中修改：
- `TEST_TIMEOUT`: 測試超時時間（默認：120 秒）
- `match_type`: 對戰模式（默認：`PVE_TRAINING`）
- `subject`: 學科（默認：`english`）
- `time_limit`: 答題時間限制（默認：20 秒）

## 🐛 故障排除

### 問題 1：連接失敗

```
❌ WebSocket 連接錯誤: connect ECONNREFUSED
```

**解決方案：**
1. 確認 WebSocket 服務器正在運行
2. 檢查端口是否正確（默認 8080）
3. 檢查防火牆設置

### 問題 2：認證失敗

```
❌ 錯誤: Authentication failed
```

**解決方案：**
1. 檢查用戶 ID 格式
2. 確認服務器認證邏輯正常

### 問題 3：沒有收到題目

```
⚠️  警告：沒有收到題目！
```

**解決方案：**
1. 檢查題目 API 是否正常
2. 確認數據庫中有題目數據
3. 檢查 subject 參數是否正確

### 問題 4：測試超時

```
⏱️  測試超時（2 分鐘）
```

**解決方案：**
1. 檢查網絡連接
2. 增加 `TEST_TIMEOUT` 值
3. 檢查服務器日誌

## 📝 測試腳本說明

### test-websocket-complete.ts

完整的 TypeScript 測試腳本，包含：
- ✅ 完整流程驗證
- ✅ 錯誤處理
- ✅ 超時檢測
- ✅ 詳細統計報告
- ✅ 步驟追蹤

### test-websocket.js

簡單的 JavaScript 測試腳本，用於快速驗證連接。

### test-battle-system.ts

原有的對戰系統測試腳本（功能類似，但報告較簡單）。

## 🔄 與現有測試的區別

| 特性 | test-websocket.js | test-battle-system.ts | test-websocket-complete.ts |
|------|-------------------|----------------------|---------------------------|
| 語言 | JavaScript | TypeScript | TypeScript |
| 流程驗證 | ❌ | ✅ | ✅ |
| 錯誤處理 | 基本 | 基本 | 完整 |
| 統計報告 | ❌ | 基本 | 詳細 |
| 步驟追蹤 | ❌ | ❌ | ✅ |
| 超時處理 | 基本 | 基本 | 完整 |

## 📚 相關文檔

- [WebSocket 服務器文檔](../services/battle-ws/README.md)
- [對戰系統測試報告](../BATTLE_SYSTEM_TEST_REPORT.md)
- [WebSocket 快速開始](../services/battle-ws/QUICKSTART.md)

## ✅ 測試檢查清單

- [ ] WebSocket 服務器已啟動
- [ ] 端口 8080 可訪問
- [ ] 數據庫中有測試題目
- [ ] 網絡連接正常
- [ ] 執行測試腳本
- [ ] 檢查測試報告
- [ ] 驗證所有步驟完成
- [ ] 確認無錯誤

## 🎉 成功標準

測試成功的標準：
1. ✅ 所有預期步驟都完成
2. ✅ 無錯誤消息
3. ✅ 收到題目並完成答題
4. ✅ 收到 BATTLE_END 消息
5. ✅ 測試報告顯示通過

---

**最後更新：** 2025-01-XX
**維護者：** 開發團隊








































