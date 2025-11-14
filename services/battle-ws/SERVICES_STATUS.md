# 🎉 服務啟動完成！

## ✅ 當前狀態

### 1. WebSocket 服務器
- **狀態**: ✅ 運行中
- **端口**: 8080
- **PID**: 22790
- **地址**: `ws://localhost:8080/ws/battle`
- **日誌**: `/tmp/battle-ws.log`

### 2. 前端開發服務器
- **狀態**: ✅ 運行中
- **端口**: 3000
- **PID**: 36246
- **地址**: `http://localhost:3000`
- **日誌**: `/tmp/web-dev.log`

---

## 🚀 下一步：開始端到端測試

### 1. 訪問測試頁面
打開瀏覽器訪問：
```
http://localhost:3000/play
```

### 2. 開啟開發者工具
- 按 `F12` 或 `Cmd+Option+I` (Mac)
- 切換到 **Console** 標籤
- 切換到 **Network** 標籤（可選，用於監控 WebSocket 消息）

### 3. 驗證 WebSocket 連接
在 Console 中應該看到：
```
[PlayProvider] WebSocket connected
```

### 4. 執行測試場景
按照 `services/battle-ws/E2E_TEST_GUIDE.md` 執行以下測試：

#### 場景 1: DDA 激勵測試（玩家連輸 4 題）
- 故意答錯 4 題
- 觀察 AI 命中率是否下降（≤ 70%）
- 觀察 AI 反應時間是否上升（≥ 2000ms）

#### 場景 2: DDA 挑戰測試（玩家連勝 4 題）
- 故意答對 4 題
- 觀察 AI 命中率是否上升（≥ 75%）
- 觀察 AI 反應時間是否下降（≤ 1200ms）
- 確認 AI 仍有失誤（≥ 15% 下限）

#### 場景 3: 擬人化競態測試
- 正常答題（混合對錯）
- 觀察「AI 先答」和「玩家先答」兩種情況都會發生

#### 場景 4: 異步任務取消測試
- 極快答題（< 0.5 秒）
- 確認 AI 任務被正確取消
- 確認無重複結算

---

## 📊 觀察日誌

### WebSocket 服務器日誌
```bash
tail -f /tmp/battle-ws.log
```

**重點觀察**：
- `[INFO] WebSocket handshake successful` - 連接成功
- `[INFO] Authenticated user: ...` - 用戶認證
- `[INFO] AI plan: q=0, correct=true/false, p=0.XX, m_ai=0.XX, user_factor=0.XX, rt=XXXXms` - **DDA 參數（重點）**

### 前端日誌
在瀏覽器 Console 中觀察：
- `[PlayProvider] WebSocket connected` - 連接成功
- `[PlayProvider] Unknown message type: ...` - 消息類型（可忽略）

---

## 🛠️ 管理服務

### 查看服務器日誌
```bash
# WebSocket 服務器
tail -f /tmp/battle-ws.log

# 前端服務器
tail -f /tmp/web-dev.log
```

### 停止服務
```bash
# 停止 WebSocket 服務器
kill 22790

# 停止前端服務器
kill 36246
# 或
lsof -ti:3000 | xargs kill -9
```

### 重啟服務
```bash
# 重啟 WebSocket 服務器
cd /Users/simonac/Desktop/moonshot\ idea/services/battle-ws
cargo run > /tmp/battle-ws.log 2>&1 &

# 重啟前端服務器
cd /Users/simonac/Desktop/moonshot\ idea/apps/web
pnpm dev > /tmp/web-dev.log 2>&1 &
```

---

## 📝 測試記錄

請使用 `services/battle-ws/E2E_TEST_GUIDE.md` 中的測試記錄表模板記錄測試結果。

---

**現在可以開始測試了！** 🎉

如有問題，請查看日誌或告訴我。

