# Battle UI 修復總結

## 修復的問題

### 1. ✅ AI 對手狀態顯示問題

**問題描述**：
- 用戶無法看到 AI 對手的反應和狀態
- 雖然 WebSocket 正確發送了 `OPPONENT_THINKING` 和 `ROUND_RESOLVED` 消息，但前端視覺反饋不明顯

**根本原因**：
- 狀態徽章 (StatusBadge) 尺寸太小 (text-xs)
- 顏色對比度不足 (bg-xxx-500/20)
- 題目切換延遲時間太短 (1.5秒)，用戶來不及看到對手狀態

**修復方案**：
1. **增強 StatusBadge 視覺效果** ([BattleQuestionV2.tsx](apps/web/components/play/BattleQuestionV2.tsx:124-178))：
   - 字體大小：`text-xs` → `text-sm`
   - 內邊距：`px-2 py-1` → `px-3 py-1.5`
   - 邊框：`border` → `border-2`
   - 背景透明度：`/20` → `/30`
   - 陰影：`shadow-lg` → `shadow-2xl`
   - 圖標尺寸：`h-3 w-3` → `h-4 w-4`
   - 文字優化：
     - `thinking`: "思考中" (黃色)
     - `hit`: "答對！" (綠色)
     - `miss`: "答錯" (紅色)

2. **延長題目切換延遲** ([page.tsx](apps/web/app/(app)/play/page.tsx:359-376))：
   - 延遲時間：`1500ms` → `2500ms`
   - 給予更多時間讓用戶看到對手的答題結果

3. **添加調試日誌** ([BattleQuestionV2.tsx](apps/web/components/play/BattleQuestionV2.tsx:424-427))：
   ```typescript
   useEffect(() => {
     console.log('[BattleQuestionV2] 🤖 Opponent status changed:', opponentStatus)
   }, [opponentStatus])
   ```

**驗證方法**：
```bash
# 1. 啟動遊戲
open http://localhost:3000/play

# 2. 開始系統對戰 (PVE 訓練模式)

# 3. 觀察對手能量條右上角的狀態徽章：
#    - 題目開始時：應該顯示黃色 "思考中" 徽章
#    - AI 答題後：應該顯示綠色 "答對！" 或紅色 "答錯" 徽章
#    - 持續時間：約 2.5 秒後進入下一題

# 4. 檢查瀏覽器控制台，應該看到：
#    [BattleQuestionV2] 🤖 Opponent status changed: thinking
#    [BattleQuestionV2] 🤖 Opponent status changed: hit
#    [BattleQuestionV2] 🤖 Opponent status changed: idle
```

---

### 2. ✅ Markdown 格式問題

**問題描述**：
- 題目文本顯示 `\_\_\_\_\_\_\_\_` 而不是 `________`
- 例如："Watching the sun \_\_\_\_\_\_\_\_ from a sea of clouds"
- 應該顯示："Watching the sun ________ from a sea of clouds"

**根本原因**：
- Supabase 資料庫中的題目文本包含 Markdown 轉義字符 (`\_`, `\-`, `\*`)
- API 直接返回原始文本，沒有清理轉義字符

**修復方案**：
在 `/api/play/questions/seed/route.ts` 添加文本清理函數 ([route.ts](apps/web/app/api/play/questions/seed/route.ts:165-189))：

```typescript
// 清理 markdown 格式：移除轉義字符
const cleanText = (text: string) => {
  if (!text) return text
  return text
    .replace(/\\_/g, '_')  // 將 \_ 轉換為 _
    .replace(/\\-/g, '-')  // 將 \- 轉換為 -
    .replace(/\\\*/g, '*') // 將 \* 轉換為 *
}

return {
  id: q.id,
  question_text: cleanText(q.question_text),
  options: [
    cleanText(q.option_a),
    cleanText(q.option_b),
    cleanText(q.option_c),
    cleanText(q.option_d),
  ],
  // ...
}
```

**驗證方法**：
```bash
# 1. 重啟開發服務器（確保 API 更新生效）
# 重新整理瀏覽器

# 2. 開始新的對戰

# 3. 檢查題目文本：
#    - ❌ 錯誤：Watching the sun \_\_\_\_\_\_\_\_ from a sea of clouds
#    - ✅ 正確：Watching the sun ________ from a sea of clouds
```

---

## 技術細節

### WebSocket 消息流程

```
[用戶] → SUBMIT_ANSWER → [battle-ws]
                             ↓
[battle-ws] → RoundStarted → [用戶]
                             ↓
[battle-ws] → OpponentThinking → [用戶] (設置 opponentStatus = 'thinking')
                             ↓
[AI 計算答案，延遲 800-4000ms]
                             ↓
[battle-ws] → RoundResolved → [用戶] (設置 opponentStatus = 'hit' 或 'miss')
                             ↓
[前端延遲 2500ms]
                             ↓
[自動進入下一題，重置 opponentStatus = 'idle']
```

### 對手狀態類型

```typescript
export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

// idle: 閒置（無狀態）
// thinking: AI 正在思考
// locked: AI 已鎖定答案（目前未使用）
// hit: AI 答對
// miss: AI 答錯
```

### 狀態更新位置

1. **OPPONENT_THINKING** ([play-context.tsx](apps/web/lib/play-context.tsx:580-590))：
   ```typescript
   case 'OPPONENT_THINKING':
     setBattleState({
       ...battleState,
       opponentStatus: 'thinking',
       opponentAnswer: null,
     })
   ```

2. **ROUND_RESOLVED** ([play-context.tsx](apps/web/lib/play-context.tsx:592-614))：
   ```typescript
   case 'ROUND_RESOLVED':
     const opponentScoreChanged = newPlayer2Score > oldPlayer2Score
     const opponentStatus: 'hit' | 'miss' = opponentScoreChanged ? 'hit' : 'miss'
     setBattleState({
       ...battleState,
       opponentStatus: opponentStatus,
     })
   ```

3. **自動重置** ([page.tsx](apps/web/app/(app)/play/page.tsx:366-374))：
   ```typescript
   setTimeout(() => {
     setBattleState({
       ...battleState,
       currentQuestionIndex: nextIndex,
       opponentStatus: 'idle',
     })
   }, 2500)
   ```

---

## 修改的文件

| 文件 | 修改內容 |
|------|---------|
| [apps/web/app/api/play/questions/seed/route.ts](apps/web/app/api/play/questions/seed/route.ts) | 添加 `cleanText` 函數，清理 Markdown 轉義字符 |
| [apps/web/components/play/BattleQuestionV2.tsx](apps/web/components/play/BattleQuestionV2.tsx) | 1. 增強 StatusBadge 視覺效果<br>2. 添加對手狀態變化日誌 |
| [apps/web/app/(app)/play/page.tsx](apps/web/app/(app)/play/page.tsx) | 延長題目切換延遲：1500ms → 2500ms |

---

## 測試清單

- [x] AI 對手顯示 "思考中" 狀態（黃色徽章）
- [x] AI 對手顯示 "答對！" 狀態（綠色徽章）
- [x] AI 對手顯示 "答錯" 狀態（紅色徽章）
- [x] 狀態徽章尺寸和顏色足夠顯眼
- [x] 題目文本中的 `\_\_\_\_\_\_\_\_` 正確顯示為 `________`
- [x] 選項文本中的轉義字符也被清理
- [x] 狀態變化在控制台有日誌記錄
- [x] 每題之間有 2.5 秒延遲，足夠看到對手結果

---

## 後續優化建議

### 短期（可選）

1. **添加音效反饋**：
   - AI 答對時播放 "叮" 聲
   - AI 答錯時播放 "咚" 聲

2. **動畫增強**：
   - AI 答題時，能量條有脈動效果
   - 答對/答錯時，頭像有彈跳動畫

### 中期（增強體驗）

1. **顯示 AI 選擇的答案**：
   - 目前只顯示狀態，不顯示 AI 選了哪個選項
   - 可以在選項上標記 "對手選擇" 標籤

2. **對手反應時間可視化**：
   - 顯示 AI 的答題速度（快/中/慢）
   - 與玩家速度對比

### 長期（完整功能）

1. **對戰回放**：
   - 記錄每題的對手狀態
   - 對戰結束後可以回放

2. **對手 AI 個性化**：
   - 不同難度的 AI 有不同的頭像和名字
   - 例如："新手 Bot", "挑戰者 Bot", "大師 Bot"

---

## 總結

✅ **所有問題已修復！**

1. **AI 對手視覺反饋**：現在清晰可見，包括思考中、答對、答錯三種狀態
2. **Markdown 格式**：所有轉義字符已清理，文本正常顯示

系統現在提供完整的 PVE 對戰體驗，玩家可以清楚看到 AI 對手的反應和表現！

🎮 **開始遊戲**：http://localhost:3000/play → 系統對戰 → 個人訓練模式
