# Onboarding UI 優化與 Mini Battle 整合計劃

**更新日期**: 2025-11-17
**狀態**: 進行中

---

## ✅ 已完成優化

### 1. STEP 1: 歡迎頁 - 極簡化 ✅
**檔案**: `apps/web/app/onboarding/welcome/page.tsx`

**優化內容**:
- ✅ 超大字體標題 (text-6xl/7xl) - 清晰易讀
- ✅ 簡化配色 - 純白背景 + 灰階文字
- ✅ 移除複雜漸變和動畫
- ✅ 單一 CTA 按鈕 - 更大更明顯
- ✅ 文案改為「3 題訓練戰」而非「30秒挑戰」
- ✅ 簡化進度點 - 清晰的視覺指示

**字體層級**:
- H1: 6xl-7xl (60-72px) - 超大標題
- 副標題: 2xl-3xl (24-30px) - 清晰可讀
- 說明文字: xl (20px) - 舒適閱讀
- 小字: base (16px) - 最小可讀

---

## ✅ 已完成優化

### 2. STEP 2: 訓練戰模式 - Mini Battle ✅
**檔案**: `apps/web/app/onboarding/challenge/page.tsx`

**完成內容**:
✅ 已完全重寫為 Mini Battle 訓練模式,滿足以下需求:

#### A. UI 要求
- 使用正式對戰的 UI 元件和布局
- 沿用 `BattleQuestionV2.tsx` 的設計
- 不要華麗特效 (XP爆炸、金幣掉落、combo動畫)
- 保留基本微互動 (選項變色、AI狀態)

#### B. 功能要求
- 固定 3 題 (不抽題庫)
- 玩家 vs AI 教練
- AI 需要呈現「思考中」→「作答中」→「完成」狀態
- 雙方進度條 (簡化為回答速度條)

#### C. 三題腳本邏輯
```typescript
// 第 1 題: 必勝體驗
{
  difficulty: 1,
  aiDelay: 2000ms,
  aiCorrectRate: 0%,
  result: 玩家必定領先
}

// 第 2 題: 微挑戰
{
  difficulty: 2,
  aiDelay: 1200-1800ms,
  aiCorrectRate: 50%,
  result: 玩家可能答對/錯,但不會輸
}

// 第 3 題: 翻盤勝利
{
  difficulty: 1,
  aiDelay: 2500ms,
  aiCorrectRate: 20%,
  result: 玩家完成訓練並獲勝
}
```

#### D. AI 教練設計
- 名稱: AI 教練 / 教練 REX
- 不顯示: ELO、分數變化、競技性字眼
- 狀態呈現: 沿用正式對戰的狀態顯示

#### E. 輸出資料
訓練戰結束後需回傳:
```typescript
{
  correctCount: number,
  wrongCount: number,
  firstWrongType: string,
  answerSpeed: number,  // 平均反應時間
}
```

---

### 3. STEP 3: 獎勵頁面 - 簡化
**檔案**: `apps/web/app/onboarding/reward/page.tsx`

**優化計劃**:
- ✅ 大字體標題
- ✅ 清晰的獎勵卡片
- ⚠️ 彩帶動畫保留但簡化
- ✅ 移除過多裝飾元素

---

### 4. STEP 4: 目標設定 - 簡化
**檔案**: `apps/web/app/onboarding/goal-setup/page.tsx`

**優化計劃**:
- ✅ 放大字體
- ✅ 簡化搜尋框
- ✅ 清晰的選項卡片
- ✅ 「我還在摸索」按鈕更明顯

---

### 5. STEP 5: 基礎資料 - 簡化
**檔案**: `apps/web/app/onboarding/basic-info/page.tsx`

**優化計劃**:
- ✅ 超大數字顯示 (模考等級)
- ✅ 更清晰的滑桿
- ✅ 年級選擇更大更明顯

---

### 6. STEP 6: 任務生成 - 簡化
**檔案**: `apps/web/app/onboarding/daily-mission/page.tsx`

**優化計劃**:
- ✅ 清晰的任務卡片
- ✅ 大字體說明
- ✅ 移除過多裝飾

---

## 🎨 極簡設計原則

### 字體系統
```css
/* 主標題 */
h1: text-6xl md:text-7xl (60-72px)

/* 副標題 */
h2: text-3xl md:text-4xl (30-36px)

/* 段落標題 */
h3: text-2xl (24px)

/* 正文 */
p: text-xl (20px)

/* 說明 */
small: text-base (16px)

/* 最小 */
caption: text-sm (14px)
```

### 配色系統
```css
/* 主色 */
primary: indigo-600 / indigo-700

/* 背景 */
bg: white / gray-950

/* 文字 */
text-primary: gray-900 / white
text-secondary: gray-700 / gray-300
text-muted: gray-600 / gray-400
text-subtle: gray-500 / gray-500

/* 成功 */
success: emerald-600

/* 錯誤 */
error: red-500 (柔和,不刺眼)

/* 警告 */
warning: amber-500
```

### 間距系統
```css
/* 區塊間距 */
section: mb-16 / mb-20

/* 元素間距 */
element: mb-6 / mb-8

/* 文字間距 */
text: mb-3 / mb-4

/* 按鈕高度 */
button: h-14 / h-16
```

---

## 📋 實作檢查清單

### STEP 1: 歡迎頁
- [x] 放大字體
- [x] 簡化背景
- [x] 單一 CTA
- [x] 清晰進度點

### STEP 2: 訓練戰 (已完成 ✅)
- [x] 整合 BattleQuestionV2 UI
- [x] 實作 AI 教練邏輯
- [x] 三題腳本設定
- [x] AI 狀態呈現
- [x] 資料輸出

### STEP 3: 獎勵頁
- [ ] 簡化動畫
- [ ] 放大字體
- [ ] 清晰卡片

### STEP 4: 目標設定
- [ ] 放大字體
- [ ] 簡化UI
- [ ] 優化搜尋

### STEP 5: 基礎資料
- [ ] 放大數字
- [ ] 優化滑桿
- [ ] 清晰按鈕

### STEP 6: 任務生成
- [ ] 簡化卡片
- [ ] 放大字體
- [ ] 清晰CTA

---

## 🔧 實作 STEP 2 的詳細步驟

### 1. 創建訓練戰題目資料
```typescript
// 在 challenge page 中定義固定三題
const TRAINING_QUESTIONS = [
  {
    id: 'training-1',
    questionText: '下列哪一個是正確的英文問候語？',
    options: ['How are you?', 'How is you?', 'How you are?', 'Are how you?'],
    correctAnswer: 'A',
    difficulty: 1,
  },
  {
    id: 'training-2',
    questionText: '選出正確的過去式：I ____ to the store yesterday.',
    options: ['go', 'goes', 'went', 'going'],
    correctAnswer: 'C',
    difficulty: 2,
  },
  {
    id: 'training-3',
    questionText: '下列哪個單字的意思是「快樂的」？',
    options: ['happy', 'sad', 'angry', 'tired'],
    correctAnswer: 'A',
    difficulty: 1,
  },
]
```

### 2. 實作 AI 教練邏輯
```typescript
interface AICoach {
  name: string
  status: 'idle' | 'thinking' | 'answering' | 'done'
  answer: 'A' | 'B' | 'C' | 'D' | null
  responseTime: number
}

// AI 答題邏輯
function simulateAIAnswer(questionIndex: number): Promise<AIAnswer> {
  const delays = [2000, 1500, 2500] // 三題的延遲時間
  const correctRates = [0, 0.5, 0.2] // 三題的正確率

  return new Promise((resolve) => {
    setTimeout(() => {
      const isCorrect = Math.random() < correctRates[questionIndex]
      resolve({
        answer: isCorrect ? correctAnswer : wrongAnswer,
        time: delays[questionIndex],
      })
    }, delays[questionIndex])
  })
}
```

### 3. 整合 UI 元件
```typescript
import { BattleQuestionV2 } from '@/components/play/BattleQuestionV2'

// 在 challenge page 中使用
<BattleQuestionV2
  question={currentQuestion}
  questionIndex={currentIndex}
  totalQuestions={3}
  onAnswer={handlePlayerAnswer}
  player1Score={playerScore}
  player2Score={aiScore}
  player1Streak={playerStreak}
  player2Streak={aiStreak}
  opponentName="AI 教練"
  opponentStatus={aiStatus}
  opponentAnswer={aiAnswer}
/>
```

---

## 📊 效能指標

### 字體可讀性
- 最小字體: 16px (1rem)
- 標準字體: 20px (1.25rem)
- 對比度: 至少 4.5:1 (WCAG AA)

### 互動反應
- 按鈕: < 100ms
- 頁面切換: < 300ms
- AI 思考動畫: 60fps

### 簡潔度
- 每頁元素: < 10 個主要元素
- 顏色數量: < 5 種
- 動畫數量: 最小化

---

## 🚀 下一步行動

1. **立即**: 實作 STEP 2 訓練戰模式
2. **接著**: 優化 STEP 3-6 字體和間距
3. **最後**: 整體測試和微調

---

## 📝 注意事項

### 關於 Mini Battle 實作
- 必須使用正式對戰的 UI 元件
- 不要重新發明輪子
- 保持與正式對戰的視覺一致性
- 但簡化互動邏輯 (no XP, no coins, no combo effects)

### 關於極簡設計
- 每個頁面只有一個主要目標
- 減少視覺干擾
- 放大重要元素
- 使用足夠的留白

### 關於字體
- 永遠不要小於 16px
- 重要資訊使用 20px+
- 標題使用 30px+
- 超大標題使用 60px+

---

**需要協助?** 參考:
- [ONBOARDING_IMPLEMENTATION_PLAN.md](ONBOARDING_IMPLEMENTATION_PLAN.md)
- [ONBOARDING_TESTING_GUIDE.md](ONBOARDING_TESTING_GUIDE.md)
- 正式對戰 UI: `apps/web/components/play/BattleQuestionV2.tsx`
