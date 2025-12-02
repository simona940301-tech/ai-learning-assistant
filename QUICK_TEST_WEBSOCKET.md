# 🧪 WebSocket 對戰系統 - 快速測試指南

## ⚡ 快速啟動測試

### 步驟 1: 啟動 WebSocket 服務器

#### 選項 A: 使用啟動腳本（推薦）
```bash
cd /Users/simonac/Desktop/moonshot-idea/services/battle-ws
./start.sh
```

#### 選項 B: 使用 Cargo 直接啟動
```bash
cd /Users/simonac/Desktop/moonshot-idea/services/battle-ws
cargo run
```

#### 選項 C: 背景運行
```bash
cd /Users/simonac/Desktop/moonshot-idea/services/battle-ws
nohup cargo run > battle-ws.log 2>&1 &
```

**驗證服務器運行**:
```bash
# 檢查端口 8080 是否被佔用
lsof -i :8080

# 或使用 curl 測試
curl http://localhost:8080/health 2>/dev/null || echo "服務器未響應"
```

---

### 步驟 2: 執行 WebSocket 測試

#### 方法 1: 使用執行腳本（推薦）
```bash
cd /Users/simonac/Desktop/moonshot-idea
./execute-websocket-test.sh
```

#### 方法 2: 使用 npm script
```bash
cd /Users/simonac/Desktop/moonshot-idea
pnpm test:websocket
# 或
npm run test:websocket
```

#### 方法 3: 直接執行 TypeScript 測試
```bash
cd /Users/simonac/Desktop/moonshot-idea
npx tsx test-websocket-complete.ts
```

#### 方法 4: 自定義 WebSocket URL
```bash
WS_URL=ws://your-server:8080/ws/battle npx tsx test-websocket-complete.ts
```

---

## 🎯 核心功能測試

### 測試 1: 基本連接流程 ✅

**操作步驟**:
```
1. 啟動 WebSocket 服務器
2. 執行測試腳本
3. 觀察連接過程
```

**預期結果**:
- ✅ WebSocket 連接成功（狀態碼 101）
- ✅ AUTH 認證成功
- ✅ START_MATCH 消息發送成功
- ✅ 收到 LOBBY_CONFIRMING 消息
- ✅ 收到 MATCH_FOUND 消息
- ✅ 收到 ROUND_STARTED 消息
- ✅ 答題流程正常
- ✅ 收到 BATTLE_END 消息

**驗證方法**:
```bash
# 查看測試輸出
# 應該看到以下步驟完成標記：
# ✓ CONNECTED
# ✓ AUTH_SENT
# ✓ START_MATCH_SENT
# ✓ LOBBY_CONFIRMING_RECEIVED
# ✓ CONFIRM_LOBBY_SENT
# ✓ MATCH_FOUND_RECEIVED
# ✓ ROUND_STARTED_RECEIVED
# ✓ QUESTIONS_ANSWERED
# ✓ BATTLE_END_RECEIVED
```

---

### 測試 2: PVE 對戰流程 ✅

**操作步驟**:
```
1. 執行測試（默認使用 PVE_TRAINING 模式）
2. 觀察對戰流程
3. 檢查答題結果
```

**預期結果**:
- ✅ 成功匹配 AI 對手
- ✅ 收到題目列表
- ✅ 每題都有 ROUND_STARTED 消息
- ✅ 提交答案後收到 QUESTION_RESULT
- ✅ 正確計算分數
- ✅ 對戰結束時收到最終結果

**驗證 API 請求**:
```json
// 發送的消息
{
  "type": "START_MATCH",
  "match_type": "PVE_TRAINING",
  "subject": "english",
  "time_limit": 20
}

// 收到的消息類型
- AUTH_SUCCESS / AUTHENTICATED
- LOBBY_CONFIRMING
- MATCH_FOUND
- ROUND_STARTED
- QUESTION_RESULT
- BATTLE_END
```

---

### 測試 3: 錯誤處理 ✅

**操作步驟**:
```
1. 不啟動服務器，直接執行測試
2. 觀察錯誤處理
3. 啟動服務器後重試
```

**預期結果**:
- ✅ 連接失敗時顯示友好錯誤
- ✅ 超時處理正常（2 分鐘）
- ✅ 錯誤消息記錄在報告中
- ✅ 測試報告顯示失敗原因

**常見錯誤**:
```
❌ WebSocket 連接錯誤: connect ECONNREFUSED
→ 解決方案: 確認服務器正在運行

❌ 錯誤: Authentication failed
→ 解決方案: 檢查用戶 ID 格式

⚠️  警告：沒有收到題目！
→ 解決方案: 檢查題目 API 和數據庫
```

---

### 測試 4: 消息統計 ✅

**操作步驟**:
```
1. 執行完整測試
2. 查看測試報告
3. 驗證統計數據
```

**預期結果**:
- ✅ 收到消息數 > 0
- ✅ 發送消息數 > 0
- ✅ 答題數量 = 題目數量
- ✅ 正確答案數記錄
- ✅ 最終分數顯示
- ✅ 獲勝者顯示

**測試報告範例**:
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
```

---

### 測試 5: 多人對戰（PVP 模式）

**操作步驟**:
```
1. 修改測試腳本，使用 PVP 模式
2. 啟動兩個測試實例
3. 觀察匹配過程
```

**預期結果**:
- ✅ 兩個玩家成功匹配
- ✅ 實時同步答題狀態
- ✅ 顯示對手答題進度
- ✅ 正確計算勝負

**注意**: 需要修改測試腳本中的 `match_type` 為 `PVP`

---

## 🐛 邊界情況測試

### 邊界 1: 服務器未運行
```
1. 不啟動服務器
2. 執行測試
```
**預期**: 顯示連接錯誤，測試失敗

---

### 邊界 2: 無效消息格式
```
1. 手動發送格式錯誤的消息
2. 觀察服務器響應
```
**預期**: 服務器返回 ERROR 消息

---

### 邊界 3: 超時處理
```
1. 模擬長時間無響應
2. 等待超時（2 分鐘）
```
**預期**: 測試自動終止並顯示超時報告

---

## 📊 性能測試

### 測試 1: 連接延遲
```bash
# 使用 time 命令測量
time npx tsx test-websocket-complete.ts
```

**驗證**:
- ✅ 連接建立時間 < 1 秒
- ✅ 首個消息響應時間 < 500ms
- ✅ 答題響應時間 < 200ms

---

### 測試 2: 併發連接
```bash
# 使用 k6 進行負載測試
k6 run tests/load/scenarios/02-battle-peak.ts
```

**預期**: 
- ✅ 支援 10k+ 併發連接
- ✅ 95% 答案延遲 < 100ms
- ✅ 99% 倒數消息準確

---

## 🔍 除錯技巧

### Console 日誌
```javascript
// 在測試腳本中查看
console.log('收到消息:', message)
console.log('WebSocket 狀態:', ws.readyState)
```

### 服務器日誌
```bash
# 查看服務器日誌
tail -f services/battle-ws/battle-ws.log

# 或查看背景運行日誌
tail -f /tmp/battle-ws.log
```

### 網路請求檢查
```
打開 Chrome DevTools → Network Tab
過濾: WS (WebSocket)
查看:
  - WebSocket 連接狀態
  - 發送的消息
  - 接收的消息
```

### 資料庫查詢
```sql
-- 檢查對戰記錄
SELECT * FROM battle_events
WHERE match_type = 'PVE_TRAINING'
ORDER BY created_at DESC
LIMIT 10;

-- 檢查用戶進度
SELECT * FROM progression_logs
WHERE match_id IN (
  SELECT match_id FROM battle_events
  ORDER BY created_at DESC LIMIT 1
);
```

---

## ✅ 測試檢查清單

### 功能測試
- [ ] WebSocket 連接成功
- [ ] AUTH 認證成功
- [ ] START_MATCH 消息發送成功
- [ ] 收到 LOBBY_CONFIRMING
- [ ] 收到 MATCH_FOUND
- [ ] 收到 ROUND_STARTED
- [ ] 答題流程正常
- [ ] 收到 QUESTION_RESULT
- [ ] 收到 BATTLE_END
- [ ] 測試報告完整

### 性能測試
- [ ] 連接建立時間 < 1 秒
- [ ] 消息響應時間 < 500ms
- [ ] 答題響應時間 < 200ms
- [ ] 支援併發連接（可選）

### 安全測試
- [ ] 認證機制正常
- [ ] 無效消息被拒絕
- [ ] 超時處理正常
- [ ] 錯誤處理完善

### 兼容性測試
- [ ] Node.js 18+
- [ ] TypeScript 編譯正常
- [ ] WebSocket 庫版本兼容

---

## 🚨 已知問題追蹤

### Issue #1: 服務器啟動失敗
**描述**: 某些環境下服務器無法自動啟動
**影響**: 中等
**解決方案**: 手動啟動服務器
**狀態**: 待修復

### Issue #2: 題目獲取失敗
**描述**: 某些情況下無法獲取題目列表
**影響**: 高
**解決方案**: 檢查題目 API 和數據庫
**狀態**: 已修復

---

## 📞 獲取幫助

### 查看實作文檔
```bash
cat WEBSOCKET_TEST_GUIDE.md
cat services/battle-ws/README.md
```

### 檢查服務器狀態
```bash
# 檢查端口
lsof -i :8080

# 檢查進程
ps aux | grep battle-ws

# 查看日誌
tail -f services/battle-ws/battle-ws.log
```

### 聯繫開發團隊
- 提交 Issue: GitHub Issues
- Slack: #dev-battle-ws
- Email: dev@example.com

---

## 🎉 測試完成

所有測試通過後，請：
1. ✅ 更新 `WEBSOCKET_TEST_EXECUTION_REPORT.md`
2. ✅ 提交測試報告
3. ✅ 準備 PR 審查
4. ✅ 計劃性能優化

---

## 🔄 與錯題本練習系統的整合

### 未來功能預覽
根據 `QUICK_TEST_ERROR_BOOK_PRACTICE.md` 的測試 5，錯題本練習系統計劃支援：
- ✅ 多人練習室（通過 room_code 加入）
- ⚠️ 實時進度同步（Phase 2 功能）

**整合建議**:
1. 錯題本練習室可以使用 WebSocket 實現實時同步
2. 參與者可以通過 WebSocket 看到其他玩家的進度
3. 可以實現實時排行榜更新

---

**測試者**: _____________
**測試日期**: _____________
**測試結果**: ⬜ 通過 / ⬜ 失敗
**備註**: _____________________________________________

