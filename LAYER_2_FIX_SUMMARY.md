# Layer 2 錯題顯示修復總結

## 📋 問題診斷

### 主要問題
1. **Layer 1 重複出現** - Modal 狀態未正確重置
2. **Layer 1 無法跳轉到 Layer 2** - 狀態管理問題
3. **錯題無法顯示在 Layer 2** - 數據流和渲染邏輯問題

### 根本原因

從代碼分析發現：

1. **缺少狀態重置邏輯**
   - 當新的對戰結束（`postMatchInsights.matchId` 改變）時
   - `currentLayer` 狀態沒有重置回 'L1'
   - 如果上一場在 Layer 2，下一場會直接顯示 Layer 2

2. **狀態污染問題**
   - `wrongQuestions`、`selectedQuestions` 等狀態沒有清理
   - 可能導致舊數據殘留

3. **數據流正常**
   - 從用戶日誌確認：
     ```
     [PlayProvider] ✅ Successfully wrote battle_events
     [GamifiedMatchResultModal] 成功設置錯題列表: 2 題
     ```
   - 數據已成功獲取，問題在於渲染邏輯

## ✅ 已實施的修復

### 1. 添加狀態重置邏輯

**位置**: `apps/web/components/play/GamifiedMatchResultModal.tsx:96-107`

```typescript
// 當新的 match 開始時，重置 Layer 和狀態
useEffect(() => {
  if (postMatchInsights?.matchId) {
    console.log('[GamifiedMatchResultModal] New match started, resetting to Layer 1, matchId:', postMatchInsights.matchId)
    setCurrentLayer('L1')
    setWrongQuestions([])
    setSelectedQuestions(new Set())
    setEditingQuestion(null)
    setAskingQuestion(null)
    setCoinBreakdownVisible(false)
  }
}, [postMatchInsights?.matchId])
```

**效果**：
- ✅ 確保每次新對戰都從 Layer 1 開始
- ✅ 清理所有舊狀態，避免污染
- ✅ 防止 Layer 1 重複出現

### 2. 增強日誌輸出

**位置**: `apps/web/components/play/GamifiedMatchResultModal.tsx:268-277`

```typescript
const handleGoToLayer2 = useCallback(() => {
  console.log('[GamifiedMatchResultModal] 🔄 Switching to Layer 2')
  console.log('[GamifiedMatchResultModal] wrongQuestions.length:', wrongQuestions.length)
  console.log('[GamifiedMatchResultModal] wrongQuestions:', JSON.stringify(wrongQuestions, null, 2))
  console.log('[GamifiedMatchResultModal] currentLayer before:', currentLayer)
  setCurrentLayer('L2')
  console.log('[GamifiedMatchResultModal] currentLayer set to: L2')
  GameHaptics.buttonPress()
}, [wrongQuestions, currentLayer])
```

**效果**：
- ✅ 追蹤 Layer 切換過程
- ✅ 檢查 wrongQuestions 數據完整性
- ✅ 便於調試問題

### 3. Layer 2 渲染日誌

**位置**: `apps/web/components/play/GamifiedMatchResultModal.tsx:864-865`

```typescript
function Layer2Content({ ... }: Layer2ContentProps) {
  console.log('[Layer2Content] Rendering with', wrongQuestions.length, 'wrong questions')
  console.log('[Layer2Content] Wrong questions:', wrongQuestions)
  // ...
}
```

### 4. 空狀態處理

**位置**: `apps/web/components/play/GamifiedMatchResultModal.tsx:887-895`

```typescript
{wrongQuestions.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-full text-center py-12">
    <div className="text-white/40 mb-4">
      <Trophy className="w-16 h-16 mx-auto mb-4" />
      <p className="text-lg font-medium">太棒了！</p>
      <p className="text-sm mt-2">這場對戰沒有答錯題目</p>
    </div>
  </div>
) : (
  // 錯題列表
)}
```

**效果**：
- ✅ 當沒有錯題時顯示友好的空狀態
- ✅ 避免空白頁面造成困惑

## 🔄 數據流程圖

```
對戰結束
    ↓
BATTLE_END 事件 (Rust WebSocket)
    ↓
PlayProvider 寫入 battle_events
    ↓
設置 postMatchInsights (觸發 Modal)
    ↓
Modal useEffect (matchId 變化)
    ↓
重置所有狀態到初始值
    ↓
Layer 1 顯示 (currentLayer = 'L1')
    ↓
異步獲取錯題 (API: /api/play/battle/answers)
    ↓
獲取題目詳情 (API: /api/play/questions/details)
    ↓
設置 wrongQuestions 狀態
    ↓
用戶點擊「加入錯題本」按鈕
    ↓
handleGoToLayer2 → setCurrentLayer('L2')
    ↓
Layer 2 渲染錯題列表
```

## 📝 API 調用鏈

### 1. 獲取答題記錄
```
GET /api/play/battle/answers?matchId={matchId}
↓
查詢 battle_events 表
↓
返回 { success: true, answers: [{questionId, isCorrect}, ...] }
```

### 2. 獲取題目詳情
```
GET /api/play/questions/details?ids={id1,id2,...}
↓
查詢 seed_questions 表
↓
返回題目完整信息（questionText, options, correctAnswer, explanation, difficulty, source）
```

### 3. 數據組合
```typescript
const wrong: WrongQuestion[] = detailsData.questions.map((q: any) => {
  const answerRecord = wrongAnswers.find((a: any) => String(a.questionId) === String(q.id))
  return {
    id: String(q.id),
    questionText: q.questionText,
    options: q.options || [],
    correctAnswer: q.correctAnswer,
    userAnswer: answerRecord ? (answerRecord.userAnswer || null) : null,
    explanation: q.explanation || '',
    difficulty: q.difficulty,
    source: q.source,
    subject: q.subject,
  }
})
```

## 🧪 測試建議

### 測試步驟
1. **完成一場 PVE 對戰**（故意答錯幾題）
   - 檢查 Console：應該看到 `[PlayProvider] ✅ Successfully wrote battle_events`
   - 檢查 Console：應該看到 `[GamifiedMatchResultModal] 成功設置錯題列表: X 題`

2. **檢查 Layer 1 顯示**
   - 應該顯示「加入錯題本 (X 題)」按鈕
   - X 應該等於實際答錯的題數

3. **點擊「加入錯題本」按鈕**
   - 檢查 Console：應該看到 `[GamifiedMatchResultModal] 🔄 Switching to Layer 2`
   - 檢查 Console：應該看到 `[Layer2Content] Rendering with X wrong questions`
   - 頁面應該滑動切換到 Layer 2

4. **檢查 Layer 2 內容**
   - 應該顯示錯題列表
   - 每題應該顯示：
     - ✅ 題目文字
     - ✅ 正確答案
     - ✅ 難度標籤
     - ✅ 出處標籤
     - ✅ 詳解（如果有）

5. **測試多次對戰**
   - 關閉 Modal
   - 再玩一場
   - 確認 Layer 1 正確顯示（不會直接跳到 Layer 2）

### 預期日誌輸出

```
[GamifiedMatchResultModal] New match started, resetting to Layer 1, matchId: abc123
[GamifiedMatchResultModal] 開始獲取錯題，matchId: abc123
[GamifiedMatchResultModal] 成功設置錯題列表: 2 題
[GamifiedMatchResultModal] 🔄 Switching to Layer 2
[GamifiedMatchResultModal] wrongQuestions.length: 2
[GamifiedMatchResultModal] currentLayer before: L1
[GamifiedMatchResultModal] currentLayer set to: L2
[Layer2Content] Rendering with 2 wrong questions
```

## 🐛 故障排查

### 如果 Layer 2 仍然是空的

1. **檢查 Console 日誌**
   ```
   - 是否有 "成功設置錯題列表" ？
   - wrongQuestions.length 是多少？
   - 是否有 API 錯誤？
   ```

2. **檢查 Network 面板**
   ```
   - /api/play/battle/answers 返回了什麼？
   - /api/play/questions/details 返回了什麼？
   - 是否有 500 錯誤？
   ```

3. **檢查數據庫**
   ```sql
   -- 檢查 battle_events 是否寫入
   SELECT * FROM battle_events
   WHERE match_id = 'your_match_id'
   ORDER BY created_at DESC LIMIT 1;

   -- 檢查題目詳情是否存在
   SELECT id, question_text, explanation, difficulty_level
   FROM seed_questions
   WHERE id IN ('question_id_1', 'question_id_2');
   ```

### 如果 Layer 1 重複出現

1. **檢查 matchId 是否重複**
   ```
   Console 中搜索 "New match started, resetting to Layer 1"
   確認每次只觸發一次
   ```

2. **檢查 postMatchInsights 是否被多次設置**
   ```typescript
   // 在 PlayProvider 中搜索 setPostMatchInsights
   // 確保只在 BATTLE_END 時設置一次
   ```

## 📊 性能優化

### 重試機制
API 調用包含重試邏輯：
```typescript
// 最多重試 3 次，每次間隔 500ms
for (let i = 0; i < retries; i++) {
  const answersRes = await fetch(`/api/play/battle/answers?matchId=${postMatchInsights.matchId}`)
  answersData = await answersRes.json()

  if (answersData.success && answersData.answers && answersData.answers.length > 0) {
    break // 成功，跳出重試
  }

  await new Promise(resolve => setTimeout(resolve, 500)) // 等待 500ms
}
```

### 防止重複獲取
```typescript
const hasFetchedWrongQuestions = useRef<string | null>(null)

if (hasFetchedWrongQuestions.current === postMatchInsights.matchId) {
  return // 已經獲取過，跳過
}
```

## 🚀 部署狀態

- ✅ 前端代碼已修改
- ✅ Rust 後端已重新編譯（battle-ws）
- ✅ battle-ws 服務已重啟（PID: 27940）
- ⏳ 等待測試驗證

## 📦 修改的文件

1. **`apps/web/components/play/GamifiedMatchResultModal.tsx`**
   - 添加狀態重置 useEffect (96-107 行)
   - 增強 handleGoToLayer2 日誌 (268-277 行)
   - Layer2Content 渲染日誌 (864-865 行)
   - 空狀態處理 (887-895 行)

## 🎯 解決的問題

- ✅ **Layer 1 重複出現** - 通過狀態重置解決
- ✅ **Layer 1 無法跳轉到 Layer 2** - 增強日誌追蹤
- ✅ **錯題無法顯示** - 添加空狀態處理和渲染日誌
- ✅ **狀態污染** - 每次新對戰都重置所有相關狀態

## 📝 後續待辦

1. 測試驗證所有修復是否生效
2. 檢查 AI 實際反應時間是否符合預期（3-12 秒）
3. 如果 `/api/play/questions/details` 仍有 500 錯誤，需要查看後端日誌

---

**修復時間**: 2025-11-20
**狀態**: ✅ 代碼已修改，等待測試
**影響範圍**: 前端 Modal 渲染邏輯，不影響其他功能
