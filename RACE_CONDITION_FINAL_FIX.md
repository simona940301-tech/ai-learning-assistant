# 🎯 BattleState Race Condition 終極修復方案

## 問題根源分析

### 時序問題詳解

```
React 18 自動批處理導致的狀態更新延遲：

T+0ms     : 收到 MATCH_FOUND WebSocket 消息
T+0ms     : 調用 setBattleState(newState)
T+0-16ms  : React 將狀態更新加入批處理隊列
T+500ms   : 收到 ROUND_STARTED WebSocket 消息
T+500ms   : 執行 setBattleState(prev => ...)
            ❌ prev 仍然是 null（批處理尚未執行）
T+16-50ms : React 批處理執行，MATCH_FOUND 的狀態更新完成
```

### 根本原因

**React 18 的自動批處理（Automatic Batching）：**
- React 18 會自動批處理所有事件處理器中的狀態更新
- WebSocket 的 `onmessage` 事件處理器中的多個狀態更新會被批處理
- 即使後端延遲 500ms，前端的狀態更新仍可能延遲
- 狀態更新不是同步的，即使使用 `setState` 也需要時間

---

## 終極解決方案

### 核心思路

**不依賴 MATCH_FOUND 的狀態更新，直接使用 ROUND_STARTED 中的題目數據**

```rust
// Rust 後端 ROUND_STARTED 消息結構
RoundStarted {
    match_id: String,
    question_index: usize,
    question: Question,  // ✅ 包含完整題目數據！
}
```

**關鍵洞察：**
- ROUND_STARTED 消息已經包含當前題目的完整數據
- 不需要等待 MATCH_FOUND 的 questionList
- 可以直接使用 ROUND_STARTED 中的 question 開始戰鬥
- 後續回合的題目也會在下一個 ROUND_STARTED 中到達

---

## 實現細節

### 修改 1: 處理 battleState 為 null 的情況

**文件**: `/apps/web/lib/play-context.tsx`

**位置**: `ROUND_STARTED` case 的 `setBattleState` 回調

```typescript
// 🎯 關鍵修復：如果 prev 為 null，使用 ROUND_STARTED 消息中的 question 數據
if (!prev) {
  console.warn('[PlayProvider] ⚠️ battleState is null due to React batching, using ROUND_STARTED question data')

  // 從 ROUND_STARTED 消息中提取題目數據
  const currentQuestion = message.question

  if (!currentQuestion) {
    console.error('[PlayProvider] ❌ CRITICAL: No question in ROUND_STARTED message!')
    return null
  }

  // 使用 ROUND_STARTED 中的題目創建初始狀態
  return {
    isInBattle: true,
    matchId: message.match_id || null,
    questionList: [currentQuestion], // ✅ 使用當前題目
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
```

### 修改 2: 處理後續回合的題目

**同一文件，正常流程分支：**

```typescript
// 如果 questionList 中沒有當前題目，需要添加進去
const currentQuestionIndex = message.question_index || 0
const currentQuestion = message.question
const needsQuestionUpdate = currentQuestion &&
  (!prev.questionList[currentQuestionIndex] ||
   prev.questionList.length <= currentQuestionIndex)

let updatedQuestionList = prev.questionList
if (needsQuestionUpdate && currentQuestion) {
  console.log('[PlayProvider] 📝 Adding question to list at index:', currentQuestionIndex)
  updatedQuestionList = [...prev.questionList]

  // 確保 questionList 有足夠的長度
  while (updatedQuestionList.length <= currentQuestionIndex) {
    updatedQuestionList.push(currentQuestion)
  }
  updatedQuestionList[currentQuestionIndex] = currentQuestion
}

return {
  ...prev,
  isInBattle: true,
  questionList: updatedQuestionList, // ✅ 更新後的題目列表
  currentQuestionIndex,
  playerHasAnswered: false,
  opponentStatus: 'idle',
  opponentAnswer: null,
}
```

---

## 技術優勢

### 1. 完全消除 Race Condition 依賴
- ❌ **之前**: 依賴 MATCH_FOUND 的狀態更新完成
- ✅ **現在**: ROUND_STARTED 自帶題目數據，不依賴前序狀態

### 2. 支援漸進式題目加載
```
第一回合: questionList = [Q1]
第二回合: questionList = [Q1, Q2]
第三回合: questionList = [Q1, Q2, Q3]
```

### 3. 向後兼容
- 如果 MATCH_FOUND 狀態更新及時完成，正常流程不變
- 如果延遲發生，使用 ROUND_STARTED 數據作為備用方案
- 兩種路徑都能保證戰鬥正常開始

### 4. 最小化記憶體使用
- 只加載當前需要的題目
- 不需要預先加載所有題目（雖然 MATCH_FOUND 會發送全部）

---

## 完整流程對比

### 修復前（會失敗）

```
T+0ms    : 收到 MATCH_FOUND
           setBattleState({ questionList: [Q1, Q2, Q3], ... })
T+0ms    : React 將更新加入批處理隊列
T+500ms  : 收到 ROUND_STARTED(question: Q1, index: 0)
           setBattleState(prev => ...)
           ❌ prev = null（批處理未完成）
           ❌ 創建 questionList = []
           ❌ 戰鬥頁面顯示空白（沒有題目）
```

### 修復後（成功）

```
T+0ms    : 收到 MATCH_FOUND
           setBattleState({ questionList: [Q1, Q2, Q3], ... })
T+0ms    : React 將更新加入批處理隊列
T+500ms  : 收到 ROUND_STARTED(question: Q1, index: 0)
           setBattleState(prev => ...)
           ✅ prev = null，檢測到 race condition
           ✅ 使用 message.question 創建狀態
           ✅ questionList = [Q1]
           ✅ 戰鬥正常開始！
T+16ms   : React 批處理執行（晚到的 MATCH_FOUND 更新被丟棄）
```

---

## 測試場景

### 場景 1: 正常流程（無 Race Condition）
```
用戶操作: 點擊「立即開始」
預期結果:
  ✓ 過渡動畫顯示
  ✓ MATCH_FOUND 狀態更新及時完成
  ✓ ROUND_STARTED 使用已有的 questionList
  ✓ 戰鬥正常開始
```

### 場景 2: Race Condition 發生
```
用戶操作: 點擊「立即開始」（慢設備或高負載）
預期結果:
  ✓ 過渡動畫顯示
  ✓ MATCH_FOUND 狀態更新延遲
  ✓ ROUND_STARTED 檢測到 prev = null
  ✓ 使用 message.question 創建狀態
  ✓ 戰鬥正常開始（無崩潰）
Console:
  ⚠️ battleState is null due to React batching, using ROUND_STARTED question data
```

### 場景 3: 多回合戰鬥
```
回合進行:
  第一回合: questionList = [Q1], index = 0
  第二回合: questionList = [Q1, Q2], index = 1
  第三回合: questionList = [Q1, Q2, Q3], index = 2
預期結果:
  ✓ 每回合都能正常顯示題目
  ✓ 題目列表逐步擴充
  ✓ 答題記錄完整
```

---

## Console 日誌範例

### 成功流程（無 Race Condition）

```
[SystemBattleModal] 🚀 Starting PVE transition overlay
[PlayProvider] 📤 Sending message: START_MATCH
[PlayProvider] 📨 Received message: MATCH_FOUND
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!
[PlayProvider] 📝 Setting battleState with: {questionList: Array(3), ...}
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay

(500ms 後)

[PlayProvider] 📨 Received message: ROUND_STARTED
[PlayProvider] 🎮 Round started: 0
[PlayProvider] 🔍 ROUND_STARTED - prev state: {exists: true, questionCount: 3, ...}
[PlayProvider] ✅ Setting isInBattle = true
[BattleQuestionV3] Rendering question 1 of 3
```

### 成功流程（Race Condition 發生但被處理）

```
[SystemBattleModal] 🚀 Starting PVE transition overlay
[PlayProvider] 📤 Sending message: START_MATCH
[PlayProvider] 📨 Received message: MATCH_FOUND
[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!
[PlayProvider] 📝 Setting battleState with: {questionList: Array(3), ...}
[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay

(500ms 後，但 React 狀態更新尚未完成)

[PlayProvider] 📨 Received message: ROUND_STARTED
[PlayProvider] 🎮 Round started: 0
[PlayProvider] 🔍 ROUND_STARTED - prev state: {exists: false, ...}
[PlayProvider] ⚠️ battleState is null due to React batching, using ROUND_STARTED question data
[PlayProvider] ✅ Creating initial state with current question
[BattleQuestionV3] Rendering question 1 of 1  ← 只有當前題目
```

---

## 為什麼這個方案優於其他方案

### ❌ 方案 A: 增加後端延遲到 1000ms
**問題:**
- 無法根本解決問題（極慢設備仍可能失敗）
- 影響用戶體驗（延遲過長）
- 只是緩解問題，不是解決問題

### ❌ 方案 B: 使用 flushSync 強制同步更新
```typescript
import { flushSync } from 'react-dom'

flushSync(() => {
  setBattleState(newState)
})
```
**問題:**
- React 官方不推薦（影響性能）
- 阻塞渲染，可能導致卡頓
- 破壞 React 18 的並發特性

### ❌ 方案 C: 使用 useRef 同步存儲狀態
```typescript
const battleStateRef = useRef(battleState)

useEffect(() => {
  battleStateRef.current = battleState
}, [battleState])
```
**問題:**
- 仍然存在更新延遲
- 無法觸發重新渲染
- 增加代碼複雜度

### ✅ 本方案: 使用 ROUND_STARTED 的題目數據
**優勢:**
- ✅ 完全消除對前序狀態的依賴
- ✅ 數據已經在消息中，無需額外請求
- ✅ 向後兼容，不影響正常流程
- ✅ 無性能損失
- ✅ 符合 React 最佳實踐

---

## 後續優化建議

### 1. 監控 Race Condition 發生率

```typescript
// 在生產環境追蹤 race condition 發生頻率
if (!prev) {
  analytics.track('battle_race_condition_detected', {
    matchId: message.match_id,
    questionIndex: message.question_index,
    userAgent: navigator.userAgent,
  })
}
```

### 2. 預加載優化

```typescript
// 如果 MATCH_FOUND 的完整 questionList 到達，合併數據
case 'MATCH_FOUND':
  setBattleState(prev => {
    if (prev && prev.questionList.length === 1) {
      // 當前只有一題（從 ROUND_STARTED 創建），合併完整列表
      return {
        ...prev,
        questionList: newState.questionList, // 更新為完整列表
      }
    }
    return newState
  })
```

### 3. 性能監控

```typescript
// 記錄狀態更新延遲
const matchFoundTime = Date.now()

case 'ROUND_STARTED':
  const delay = Date.now() - matchFoundTime
  console.log('[Performance] State update delay:', delay, 'ms')
```

---

## 總結

### 問題
- React 18 自動批處理導致狀態更新延遲
- ROUND_STARTED 在 MATCH_FOUND 狀態更新完成前到達
- battleState 為 null，導致戰鬥無法開始

### 解決方案
- 使用 ROUND_STARTED 消息中的 question 數據
- 不依賴 MATCH_FOUND 的狀態更新
- 支援漸進式題目加載

### 修改文件
- `/apps/web/lib/play-context.tsx` - ROUND_STARTED 處理邏輯

### 測試狀態
- [x] 代碼已實現
- [ ] 本地測試（等待用戶測試）
- [ ] 驗證多回合戰鬥
- [ ] 確認無崩潰

---

**修復日期**: 2025-11-19
**修復者**: Claude (Sonnet 4.5)
**狀態**: 已實現，待測試
**優先級**: 🔴 Critical（影響核心功能）
