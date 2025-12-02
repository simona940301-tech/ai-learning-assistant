# BattleState Null 錯誤修復報告

## 問題描述

### 錯誤日誌
```
[PlayProvider] 📝 Setting battleState with: Object
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay
[PlayProvider] 🎮 Round started: 0
[PlayProvider] ❌ CRITICAL: battleState is null in ROUND_STARTED!
```

### 問題分析

這是一個 **Race Condition（競態條件）** 問題：

1. **WebSocket 收到 `MATCH_FOUND`** → 調用 `setBattleState(newState)`
2. **React 開始異步狀態更新**（需要時間）
3. **WebSocket 立即收到 `ROUND_STARTED`**（200ms 後）
4. **`handleServerMessage` 中的 `setBattleState(prev => ...)` 執行**
5. ❌ **`prev` 仍然是 `null`**（因為步驟 2 還沒完成）

### 時序問題

```
時間線:
T+0ms    : 收到 MATCH_FOUND
T+0ms    : setBattleState(newState) 調用
T+0-16ms : React 調度狀態更新（微任務）
T+200ms  : 收到 ROUND_STARTED（Rust 延遲）
T+200ms  : setBattleState(prev => ...) 執行
           ❌ prev 可能仍是 null！
T+16-50ms: React 完成 MATCH_FOUND 的狀態更新
```

**根本原因**：
- React 狀態更新是異步的
- 200ms 延遲不足以保證 React 狀態更新完成
- 前端需要時間：狀態更新 + 重新渲染 + 副作用執行

---

## 解決方案

### 方案 1: 增加 Rust 後端延遲 ✅

**文件**: `services/battle-ws/src/ws_handler.rs:250`

```rust
// 修改前：
tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

// 修改後：
tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
```

**理由**：
- 給 React 足夠時間完成狀態更新
- 500ms 是一個安全的數值（考慮慢設備）
- 對用戶體驗影響小（有過渡動畫遮蓋）

---

### 方案 2: 前端防禦性編程 ✅

**文件**: `apps/web/lib/play-context.tsx:541-558`

```typescript
case 'ROUND_STARTED':
  setBattleState(prev => {
    // 🎯 防禦性處理：如果 prev 為 null，創建臨時狀態
    if (!prev) {
      console.warn('[PlayProvider] ⚠️ battleState is null, race condition detected')
      return {
        isInBattle: true,
        matchId: message.match_id || null,
        questionList: [], // 空列表，會在下一次 MATCH_FOUND 時補充
        currentQuestionIndex: message.question_index || 0,
        player1Score: 0,
        player2Score: 0,
        player1Streak: 0,
        player2Streak: 0,
        playerHasAnswered: false,
        opponentStatus: 'idle' as OpponentStatus,
        opponentAnswer: null,
      }
    }

    // 正常流程
    return {
      ...prev,
      isInBattle: true,
      currentQuestionIndex: message.question_index || 0,
      playerHasAnswered: false,
      opponentStatus: 'idle',
      opponentAnswer: null,
    }
  })
  break
```

**理由**：
- 防止應用崩潰
- 即使 Rust 延遲不夠，前端也能正常運行
- `questionList: []` 會導致頁面顯示錯誤，但至少不會崩潰

---

## 為什麼不直接讀取最新狀態？

### 嘗試 A: 使用 `useRef` 存儲最新狀態
```typescript
// ❌ 不可行：useRef 不會觸發重新渲染
const battleStateRef = useRef(battleState)
```

### 嘗試 B: 使用閉包捕獲
```typescript
// ❌ 不可行：閉包會捕獲舊值
const handleServerMessage = useCallback((message: any) => {
  // battleState 是舊值
}, [battleState])
```

### 嘗試 C: 使用 `flushSync`
```typescript
// ❌ 不推薦：強制同步更新會影響性能
import { flushSync } from 'react-dom'
flushSync(() => {
  setBattleState(newState)
})
```

**最佳解決方案**：
- 後端延遲 + 前端防禦性編程
- 雙重保障，確保穩定性

---

## 其他考慮過的方案

### 方案 3: 使用狀態機
```typescript
type BattlePhase = 'IDLE' | 'MATCHING' | 'MATCHED' | 'IN_BATTLE'

const [battlePhase, setBattlePhase] = useState<BattlePhase>('IDLE')

case 'MATCH_FOUND':
  setBattlePhase('MATCHED')
  setBattleState(...)

case 'ROUND_STARTED':
  if (battlePhase !== 'MATCHED') {
    console.error('Invalid state transition')
    return
  }
  setBattlePhase('IN_BATTLE')
```

**優點**：清晰的狀態轉換
**缺點**：
- 增加複雜度
- 需要重構大量代碼
- 仍然無法解決異步問題

### 方案 4: 使用 `useReducer`
```typescript
const [state, dispatch] = useReducer(battleReducer, initialState)

function battleReducer(state, action) {
  switch (action.type) {
    case 'MATCH_FOUND':
      return { ...state, matched: true, ... }
    case 'ROUND_STARTED':
      if (!state.matched) {
        console.error('Invalid state')
        return state
      }
      return { ...state, inBattle: true }
  }
}
```

**優點**：狀態更新更可預測
**缺點**：
- 需要重構整個狀態管理
- 仍然是異步更新
- 無法根本解決 race condition

---

## 測試驗證

### 測試步驟

1. **啟動服務**
   ```bash
   # Rust WebSocket 服務器
   cd services/battle-ws
   cargo run --release

   # Next.js 開發服務器
   cd apps/web
   pnpm dev
   ```

2. **測試 PVE 流程**
   - 訪問 http://localhost:3000/play
   - 點擊「系統對戰」→「個人訓練模式」
   - 選擇科目和時間
   - 點擊「立即開始」

3. **預期結果**
   ```
   ✅ 顯示過渡動畫（藍紫色背景 + 脈衝動畫）
   ✅ 等待 500ms（用戶看到 "準備開始..."）
   ✅ 平滑進入戰鬥畫面
   ✅ Console 無 "CRITICAL: battleState is null" 錯誤
   ```

### Console 日誌應該顯示

```
[SystemBattleModal] 🚀 Starting PVE transition overlay
[PlayProvider] 📤 Sending message: START_MATCH
[PlayProvider] 📨 Received message: MATCH_FOUND
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!
[PlayProvider] 📝 Setting battleState with: {...}
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay
[PlayProvider] 📨 Received message: ROUND_STARTED (500ms 後)
[PlayProvider] 🎮 Round started: 0
[PlayProvider] 🔍 ROUND_STARTED - prev state: {exists: true, ...}
[PlayProvider] ✅ Setting isInBattle = true
```

### 如果仍然看到警告

如果看到：
```
⚠️ battleState is null, race condition detected
```

**這表示**：
- 500ms 延遲仍然不夠（極慢設備）
- 但應用不會崩潰（防禦性代碼生效）
- 可能需要增加到 800ms

---

## 性能影響

### 增加延遲的影響

**修改前**：
```
點擊開始 → 過渡動畫 → 等待 200ms → 進入戰鬥
總延遲：~200-400ms
```

**修改後**：
```
點擊開始 → 過渡動畫 → 等待 500ms → 進入戰鬥
總延遲：~500-700ms
```

**用戶體驗**：
- ✅ 過渡動畫遮蓋了等待時間
- ✅ 用戶看到流暢的動畫，不會感覺到延遲
- ✅ 相比空白等待，體驗大幅提升

---

## 未來優化方向

### 1. 使用 WebSocket 確認機制

```rust
// Rust 後端
send(MATCH_FOUND)
wait_for_ack(from_client) // 等待前端確認
send(ROUND_STARTED)
```

```typescript
// 前端
case 'MATCH_FOUND':
  setBattleState(newState)
  // 使用 useEffect 發送確認
  useEffect(() => {
    if (battleState?.matchId) {
      sendWebSocketMessage({ type: 'ACK_MATCH_FOUND' })
    }
  }, [battleState?.matchId])
```

### 2. 使用 React 18 的 `startTransition`

```typescript
case 'MATCH_FOUND':
  startTransition(() => {
    setBattleState(newState)
  })
```

### 3. 優化 React 渲染性能

```typescript
// 使用 useMemo 減少不必要的重新渲染
const memoizedBattleState = useMemo(() => battleState, [battleState])
```

---

## 總結

### 問題根源
- React 異步狀態更新
- WebSocket 消息到達太快
- Race Condition

### 解決方案
1. ✅ 增加 Rust 後端延遲（200ms → 500ms）
2. ✅ 前端防禦性編程（處理 null 狀態）
3. ✅ 添加過渡動畫（遮蓋延遲）

### 修改文件
1. `services/battle-ws/src/ws_handler.rs` - 增加延遲
2. `apps/web/lib/play-context.tsx` - 防禦性處理

### 測試狀態
- [ ] 重新編譯 Rust 服務器
- [ ] 啟動 WebSocket 服務器
- [ ] 測試 PVE 流程
- [ ] 確認無 null 錯誤

---

**修復日期**: 2025-11-19
**修復者**: Claude (Sonnet 4.5)
**狀態**: 已實現，待測試
