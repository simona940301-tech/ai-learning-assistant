# WebSocket Broadcast Channel 錯誤分析報告

## 問題描述
匹配成功後，前端無法收到 `LOBBY_CONFIRMED` 和 `MATCH_FOUND` 事件，導致無法進入對戰頁面。

## 根本原因分析

### 1. Broadcast Channel 接收者未保持活躍 ⚠️ **核心問題**

**問題**：
- `broadcast::Receiver` 必須被保持活躍，否則 `broadcast::Sender` 會立即關閉 channel
- 原始代碼中，`register_connection` 返回的 `Receiver` 被忽略（使用 `_rx`），導致 channel 立即關閉

**錯誤代碼示例**：
```rust
// ❌ 錯誤：接收者被立即丟棄
let _rx = server_clone.register_connection(userId.clone()).await;
// _rx 在這裡被丟棄，channel 立即關閉
```

**影響**：
- 當 `lobby_timer.rs` 嘗試發送 `LOBBY_CONFIRMED` 和 `MATCH_FOUND` 時，channel 已經關閉
- 日誌顯示：`channel closed` 或 `receiver_count() == 0`

**修復方案**：
- 使用 `tokio::select!` 同時處理 WebSocket 消息和 broadcast channel 消息
- 將 `broadcast_rx` 保存在變量中，確保接收者保持活躍

**修復代碼**：
```rust
// ✅ 正確：保持接收者活躍
let mut broadcast_rx: Option<tokio::sync::broadcast::Receiver<ServerMessage>> = None;

loop {
    tokio::select! {
        // 處理 WebSocket 消息
        msg = ws_receiver.next() => { /* ... */ }
        // 處理 broadcast channel 消息
        msg = async {
            if let Some(ref mut rx) = broadcast_rx {
                rx.recv().await.ok()
            } else {
                std::future::pending::<Option<ServerMessage>>().await
            }
        } => {
            // 轉發到 WebSocket
        }
    }
}
```

### 2. PVE 模式確認邏輯錯誤

**問題**：
- PVE 模式下，`player2_id` 是 "AI"，不需要確認
- 原始代碼要求兩個玩家都確認，導致 PVE 模式永遠無法進入對戰

**錯誤代碼示例**：
```rust
// ❌ 錯誤：PVE 模式也需要兩個玩家確認
let both_confirmed = match_record.player1_confirmed && match_record.player2_confirmed;
```

**修復方案**：
- 檢測 PVE 模式（`player2_id == "AI"` 或 `match_type` 為 PVE）
- PVE 模式下，只需要 `player1_confirmed` 即可

**修復代碼**：
```rust
// ✅ 正確：PVE 模式只需要 player1 確認
let is_pve = match_record.player2_id == "AI" 
    || match_record.match_type == "PVE_TRAINING" 
    || match_record.match_type == "PVE_CHALLENGE";
let both_confirmed = if is_pve {
    match_record.player1_confirmed
} else {
    match_record.player1_confirmed && match_record.player2_confirmed
};
```

### 3. WebSocket 連接管理不當

**問題**：
- 沒有同時處理 WebSocket 消息和 broadcast channel 消息
- 當用戶重新連接時，舊連接沒有正確清理

**修復方案**：
- 使用 `tokio::select!` 並發處理兩個消息源
- 在用戶重新連接時，先移除舊連接
- 在連接關閉時，延遲移除註冊，確保計時器有時間發送消息

## 診斷日誌關鍵點

為了快速診斷類似問題，我們在以下關鍵位置添加了日誌：

### 後端日誌關鍵點

1. **連接註冊** (`ws_handler.rs`)
   - `[WSHandler] Authenticated user: {} (connection registered, receiver kept)`
   - 確認接收者已被保持

2. **Broadcast Channel 狀態** (`lobby_timer.rs`)
   - `[LobbyTimer] Sending LOBBY_CONFIRMED to player {} (receivers: {})`
   - `[LobbyTimer] ⚠️ Channel for player {} has no receivers (connection closed)`
   - 監控 channel 的接收者數量

3. **消息轉發** (`ws_handler.rs`)
   - `[WSHandler] 📤 Forwarding broadcast message to WebSocket: {}`
   - 確認消息已成功轉發到 WebSocket

4. **PVE 模式確認** (`ws_handler.rs`, `lobby_timer.rs`)
   - `[WSHandler] Match {} status: PVE={}, player1_confirmed={}, player2_confirmed={}, both_confirmed={}`
   - 確認 PVE 模式的確認邏輯正確

### 前端日誌關鍵點

1. **WebSocket 消息接收** (`play-context.tsx`)
   - `🔴🔴🔴 [PlayProvider] RAW WebSocket message received: {}`
   - `🔴🔴🔴 [PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!`
   - 確認消息是否到達前端

2. **BattleState 狀態** (`play-context.tsx`, `page.tsx`)
   - `[PlayPage] 📊 BattleState status: {isInBattle, questionListLength, ...}`
   - 確認 `questionList` 是否正確設置

## 預防措施

1. **代碼審查檢查清單**：
   - [ ] Broadcast channel 接收者是否被保持？
   - [ ] PVE 模式的確認邏輯是否正確？
   - [ ] WebSocket 和 broadcast channel 是否同時處理？
   - [ ] 連接關閉時是否有適當的清理延遲？

2. **測試檢查清單**：
   - [ ] PVE 模式匹配流程是否正常？
   - [ ] PVP 模式匹配流程是否正常？
   - [ ] 重新連接時是否正常？
   - [ ] 日誌中是否顯示 `receiver_count() > 0`？

3. **監控指標**：
   - Broadcast channel `receiver_count()` 應該始終 > 0（當連接活躍時）
   - `LOBBY_CONFIRMED` 和 `MATCH_FOUND` 應該在 `CONFIRM_LOBBY` 後 1 秒內發送
   - 前端應該在收到 `MATCH_FOUND` 後立即更新 `battleState`

## 修復時間線

1. **初始問題報告**：匹配成功後無法進入對戰頁面
2. **診斷階段**：添加詳細日誌，發現 `channel closed` 錯誤
3. **根本原因識別**：Broadcast channel 接收者未保持活躍
4. **修復實施**：
   - 使用 `tokio::select!` 保持接收者活躍
   - 修正 PVE 模式確認邏輯
   - 添加連接管理改進
5. **驗證**：測試確認問題已解決

## 相關文件

- `services/battle-ws/src/ws_handler.rs` - WebSocket 處理和連接管理
- `services/battle-ws/src/lobby_timer.rs` - Lobby 計時器和消息發送
- `apps/web/lib/play-context.tsx` - 前端 WebSocket 客戶端
- `apps/web/app/(app)/play/page.tsx` - 對戰頁面組件

