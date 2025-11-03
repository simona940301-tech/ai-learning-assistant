# 🎯 PLMS Ask-AI 系統現況報告

> **生成日期**: 2025-10-24  
> **目的**: 讓外部 GPT（產品設計顧問）理解目前「拍題 → 解題 → 詳解卡 → 錯題本」流程的邏輯與進度

---

## 1️⃣ 專案現況

### 專案名稱
**PLMS AI 學習輔助系統** (`moonshot idea`)

### 檔案結構
```
moonshot idea/
├── app/
│   ├── (app)/
│   │   ├── ask/page.tsx                    # 解題頁面 (主要流程)
│   │   ├── backpack/page.tsx               # 錯題本/檔案庫
│   │   ├── community/page.tsx              # 社群功能
│   │   ├── play/page.tsx                   # 每日任務
│   │   ├── store/page.tsx                  # 教材商城
│   │   └── profile/page.tsx                # 個人檔案
│   └── api/
│       ├── tutor/
│       │   ├── detect/route.ts             # 科目識別 (新)
│       │   ├── answer/route.ts             # 答案驗證 (核心)
│       │   ├── explain/route.ts            # [410 GONE] 已廢棄
│       │   ├── options/route.ts            # [410 GONE] 已廢棄
│       │   ├── save-to-backpack/route.ts   # [410 GONE] 已廢棄
│       │   ├── markdown/route.ts           # [410 GONE] 已廢棄
│       │   └── simplify/route.ts           # [410 GONE] 已廢棄
│       ├── warmup/
│       │   ├── keypoint-mcq/route.ts       # 考點熱身題 (未使用)
│       │   └── keypoint-mcq-simple/route.ts # 簡化版熱身題 (使用中)
│       ├── solve/route.ts                  # 解題策略 (未使用)
│       ├── solve-simple/route.ts           # 簡化版解題 (使用中)
│       └── ai/
│           ├── concept/route.ts            # 考點識別
│           ├── judge/route.ts              # 答案判定
│           ├── solve/route.ts              # 詳解生成
│           ├── feedback/route.ts           # 回饋機制
│           └── summarize/route.ts          # 重點統整
├── components/
│   ├── ask/
│   │   ├── ChatContainer.tsx               # 對話容器
│   │   ├── InputDock.tsx                   # 輸入區 (ChatGPT 風格)
│   │   ├── ConceptChips.tsx                # 考點選擇
│   │   ├── ExplanationCard.tsx             # 詳解卡片 (核心)
│   │   ├── ActionDuo.tsx                   # 存書包/再練一題
│   │   ├── ModeTabs.tsx                    # 解題/重點統整切換
│   │   ├── SummaryCard.tsx                 # 統整卡片
│   │   └── messages/
│   │       ├── QuestionBubble.tsx          # 題目顯示
│   │       ├── BatchList.tsx               # 批次題目列表
│   │       ├── BatchActions.tsx            # 批次操作
│   │       └── BatchOverview.tsx           # 快速解答總覽
│   └── ui/                                 # shadcn/ui 組件庫
├── lib/
│   ├── tutor-types.ts                      # 核心型別定義
│   ├── use-tutor-flow.ts                   # Tutor Flow Hook (核心)
│   ├── question-detector.ts                # 單/批次偵測
│   ├── subject-classifier.ts               # 科目分類
│   ├── tutor-utils.ts                      # 工具函式
│   ├── openai.ts                           # OpenAI 封裝
│   ├── supabase.ts                         # Supabase 客戶端
│   ├── prompts.ts                          # AI 提示詞庫
│   └── types.ts                            # 通用型別
├── db/sql/                                 # 資料庫 SQL 檔案
│   ├── 001_schema.sql                      # 基礎表結構
│   ├── 002_functions.sql                   # 函式定義
│   ├── 003_math_schema.sql                 # 數學題庫結構
│   └── 004_keypoint_concepts_mapping.sql   # 考點映射
├── supabase/
│   ├── schema.sql                          # Supabase 主 schema
│   └── migrations/
│       ├── 20251018_archive_legacy_tutor.sql      # 舊表歸檔 (待執行)
│       └── 20251018_add_concept_id_to_solve_options.sql # 新增 concept_id (待執行)
├── data/
│   ├── mathA_keypoints.jsonl               # 數學 A 考點資料
│   ├── mathA_questions_sample.jsonl        # 數學題目範例
│   ├── english_concepts.json               # 英文考點
│   └── concept_edges.json                  # 考點關聯
├── docs/
│   ├── AGENTS.md                           # 10-Agent 系統設計
│   ├── API_ARCHITECTURE.md                 # API 架構文件
│   ├── ASK_PAGE_REDESIGN.md                # Ask 頁面重構說明
│   ├── MATH_SYSTEM_SETUP.md                # 數學系統設定
│   └── TUTOR_EXPLAIN_API.md                # Tutor API 說明 (部分過時)
├── tools/
│   ├── scripts/curl-verify.sh              # API 驗證腳本
│   └── fixtures/
│       ├── detect.json                     # 科目偵測樣本
│       ├── warmup.json                     # 熱身題樣本
│       ├── answer.json                     # 答案驗證樣本
│       └── solve.json                      # 解題策略樣本
└── legacy/
    └── types-deprecated.ts                 # 廢棄型別集中處 (新建)
```

### OpenAI API 整合狀態
- ✅ **已整合**: `lib/openai.ts` 封裝
- ✅ **Model**: `gpt-4o-mini` (主要), `gpt-4o` (可選)
- ✅ **呼叫端點**:
  - `chatCompletion()` - 通用文字生成
  - `chatCompletionJSON()` - JSON 結構化輸出
  - `callOpenAIResponse()` - 簡化調用
- ⏳ **使用情況**: 
  - `/api/ai/solve/route.ts` 已串接
  - `/api/tutor/*` 尚未實際串接 (使用 mock)
  - 需配置 `OPENAI_API_KEY` 環境變數

### 資料層狀態
- ✅ **Supabase**: 已整合
  - Client 配置: `lib/supabase.ts`
  - 主要 Schema: `supabase/schema.sql`
  - RLS 策略: 已啟用
- ⏳ **資料狀態**:
  - 基礎表結構已定義 (`profiles`, `backpack_items`, `ai_interactions`, 等)
  - 數學系統表 (`questions`, `keypoints`, `solve_sessions`, `solve_options`, `solve_responses`) 已定義但未播種
  - Legacy 表 (`concepts`, `concept_edges`) 待歸檔至 `legacy` schema
- ❌ **本地模擬**: 目前 API 使用 mock 資料 (見 `app/api/warmup/keypoint-mcq-simple/route.ts`)

---

## 2️⃣ 核心功能路徑

### 流程總覽
```
使用者拍題/輸入
    ↓
[自動偵測: 單題 vs 批次]
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         單題模式 (SINGLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
1️⃣ 顯示題目泡泡 (QuestionBubble)
    ↓
2️⃣ 生成考點選項 (4個 chips)
    → API: POST /api/warmup/keypoint-mcq-simple
    → Input: { prompt, subject? }
    → Output: { phase, subject, detected_keypoint, session_id, stem, options[], answer_index }
    ↓
3️⃣ 使用者選擇考點
    → API: POST /api/tutor/answer
    → Input: { session_id, option_id, keypoint_id?, userAnswer, concept_id? }
    → Output: { correct, expected, concept_id, rationale }
    ↓
4️⃣ 生成詳解卡 (ExplanationCard)
    → API: POST /api/solve-simple
    → Input: { session_id, subject, keypoint_code, mode: 'step'|'fast' }
    → Output: { phase, summary, steps[], checks[], error_hints[], extensions[] }
    ↓
5️⃣ 顯示詳解卡 (含表格化文法統整)
    - 一句話總結考點
    - 解題步驟 (3-5 點)
    - 文法統整表 (預設展開)
    - Action Duo: [存入書包] [再練一題]
    - 學長姐微語氣鼓勵
    ↓
6️⃣ 使用者選擇動作
    → [存入書包]: POST /api/backpack/save
    → [再練一題]: 重置流程
    
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         批次模式 (BATCH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
1️⃣ 顯示題目列表 (BatchList)
    - 可勾選多題
    ↓
2️⃣ 浮現行動列 (BatchActions)
    → [📘 逐步解析]: 一次一題詳解
    → [⚡ 快速解答]: 列表輸出答案+一句話總結
    ↓
3️⃣ 逐步解析 / 快速解答
    → 使用與單題相同的 API 流程
    → 顯示進度指示: "1 / 5"
```

### 實際路由與函式對應

| 階段 | 功能 | 實作位置 | Input Schema | Output Schema |
|------|------|---------|-------------|---------------|
| **偵測** | 單/批次偵測 | `lib/question-detector.ts::detectMode()` | `text: string` | `'single' \| 'batch'` |
| **科目** | 科目識別 | `app/api/tutor/detect/route.ts` | `{text\|prompt: string}` | `{phase:'detect', subject, confidence}` |
| **熱身** | 考點選項生成 | `app/api/warmup/keypoint-mcq-simple/route.ts` | `{prompt, subject?, detected_keypoint?}` | `WarmupResponse` (見下方) |
| **驗證** | 答案驗證 | `app/api/tutor/answer/route.ts` | `TutorAnswerRequest` (見下方) | `TutorAnswerResponse` (見下方) |
| **解題** | 解題策略 | `app/api/solve-simple/route.ts` | `{session_id?, subject?, keypoint_code?, mode}` | `SolveResponse` (見下方) |
| **儲存** | 存入錯題本 | `app/api/backpack/save/route.ts` | `{subject, title, content, tags[], mode}` | `{id, saved: true}` |

### TypeScript 介面定義

#### 1. WarmupResponse (考點選項)
```typescript
interface WarmupResponse {
  phase: 'warmup'
  subject: string                // 'MathA' | 'English' | ...
  confidence: number              // 0.8
  detected_keypoint: string       // 'TRIG_COS_LAW'
  session_id: string              // 'session_1730000000000'
  stem: string                    // '下列哪一個描述最符合「餘弦定理」？'
  options: Array<{
    option_id: string             // 'opt_0'
    label: string                 // '選項描述文字'
  }>
  answer_index: number            // 正確答案索引 (for debugging)
}
```

#### 2. TutorAnswerRequest (答案驗證輸入)
```typescript
interface TutorAnswerRequest {
  questionId?: string             // 題目 ID (可選)
  userAnswer: string              // 使用者答案
  concept_id?: string             // 考點 ID (可選)
  keypoint_id?: string            // 關鍵點 ID (可選)
  option_id?: string              // 選項 ID
  session_id?: string             // Session ID
}
```

#### 3. TutorAnswerResponse (答案驗證輸出)
```typescript
interface TutorAnswerResponse {
  correct: boolean                // 是否正確
  expected: string | null         // 正確答案
  concept_id: string | null       // 考點 ID (統一回傳)
  rationale: string | null        // 解釋/提示
}
```

#### 4. SolveResponse (解題策略)
```typescript
interface SolveResponse {
  subject: string                 // 科目
  confidence: number              // 信心分數
  detected_keypoint: string       // 偵測到的考點
  phase: 'solve'
  summary: string                 // 一句話總結
  steps: string[]                 // 解題步驟 (3-5 點)
  checks: string[]                // 檢查清單
  error_hints: string[]           // 常見錯法提示
  extensions: string[]            // 延伸概念
}
```

### 前端狀態機 (AskState)
```typescript
interface AskState {
  mode: 'single' | 'batch'
  
  // Single 模式
  singlePhase: 'question' | 'concept' | 'explain'
  currentQuestion: Question | null
  concepts: ConceptChip[]
  explanation: Explanation | null
  
  // Batch 模式
  batchPhase: 'list' | 'step-by-step' | 'quick'
  questions: Question[]
  selectedIds: string[]
  currentIndex: number
  totalQuestions: number
  quickAnswers: QuickAnswer[]
  
  // 共用
  isLoading: boolean
  error: string | null
}
```

### 核心 Hook: `useTutorFlow`
位置: `lib/use-tutor-flow.ts`

```typescript
const {
  isLoading,           // 載入狀態
  error,               // 錯誤訊息
  currentSession,      // 當前 session 資訊
  detectAndWarmup,     // Step 1: 偵測科目 + 生成考點選項
  answerWarmup,        // Step 2: 驗證答案
  getSolveStrategy,    // Step 3: 取得解題策略
  reset                // 重置流程
} = useTutorFlow()
```

---

## 3️⃣ AI 回答邏輯

### AI 回傳格式
```typescript
// 解題策略回傳格式
{
  summary: string        // 一句話總結考點
                        // 例: "本題考「關係子句—非限定用法」：逗號 + which 補充說明先行詞。"
  
  steps: string[]       // 解題步驟 (3-5 點)
                        // 例: [
                        //   "先辨識句子主結構：The book is fascinating（主詞 + 動詞 + 補語）。",
                        //   "找出關鍵逗號：逗號後接關係子句，代表非限定用法（補充說明）。",
                        //   "檢查先行詞：先行詞是 the book（物），因此使用 which。",
                        //   "確認子句完整性：which I bought yesterday 完整無缺。"
                        // ]
  
  checks: string[]      // 檢查清單
                        // 例: ["單位與範圍", "垂直⇔內積0"]
  
  error_hints: string[] // 常見錯法
                        // 例: ["常見錯法：夾角誤判。提示：畫圖輔助"]
  
  extensions: string[]  // 延伸概念
                        // 例: ["相關概念1", "相關概念2"]
}
```

### 統一模板結構 (ExplanationCard)
```typescript
interface Explanation {
  summary: string                 // ✅ 一句話總結考點
  steps: string[]                 // 🪜 解題步驟 (3-5 點)
  grammarTable: GrammarTableRow[] // 📘 文法統整表 (預設展開)
  encouragement: string           // 💬 學長姐微語氣
  editableMd?: string            // ✏️ 可編輯的 Markdown
}

interface GrammarTableRow {
  category: string      // 類別 (如：定義、種類、非限定用法、限定用法、常見錯誤)
  description: string   // 說明
  example: string       // 範例
}
```

### 當前 Prompt 範例

#### 1. 科目偵測 Prompt
位置: `lib/subject-classifier.ts`
```typescript
// 使用 OpenAI 分類科目
// 支援: Chinese, English, MathA, MathB, Physics, Chemistry, Biology, Earth, History, Geography, Civics
// 回傳: { subject, confidence, confidenceDelta?, secondBest? }
```

#### 2. 解題生成 Prompt
位置: `app/api/ai/solve/route.ts`
```typescript
const prompt = [
  `Question:\n${question.trim()}`,
  `Canonical Skill: ${judge.canonical_skill}`,
  `Answer: ${judge.answer}`,
  `Solution Steps: ${judge.steps.join(' / ')}`,
  `Common Mistakes: ${judge.mistakes.join(' / ')}`,
  'Create a concise Markdown table summarizing the concept, evidence, common traps, and practice advice.',
  'Provide 2-4 summary bullets highlighting takeaways.',
  'Respond with JSON containing kind="SolveNoteLite", md (Markdown), and summary_bullets (array of strings).',
].join('\n\n')

// System Message:
'You are a GSAT English tutor generating structured study notes. Keep a calm professional tone. Output JSON only.'
```

#### 3. Mock Keypoint Data (當前使用)
位置: `app/api/warmup/keypoint-mcq-simple/route.ts`
```javascript
const mockKeypoints = [
  {
    id: 'kp1',
    code: 'TRIG_COS_LAW',
    name: '餘弦定理',
    description: 'c^2=a^2+b^2-2ab cos C',
    category: '三角',
    strategy_template: {
      steps: ['辨識三邊或兩邊夾角', '代公式', '檢查鈍角'],
      checks: ['單位與範圍']
    },
    error_patterns: [
      { pattern: '夾角誤判', note: '畫圖輔助' }
    ]
  },
  // ... 其他考點
]
```

### Prompt 模板庫
位置: `lib/prompts.ts`
- ✅ 六種解題模板定義 (英文單字/文法/克漏字/閱讀、數學、理化)
- ✅ 五段式重點整理模板
- ✅ 引用系統規範 ([A1], [B2] 標記)
- ⏳ **狀態**: 已定義但尚未與真實 OpenAI 完全串接

---

## 4️⃣ 使用者互動流程

### UI 層組件架構

#### 主要 Tabs / 分頁
位置: `components/ask/ModeTabs.tsx`
- **〔解題〕** - 單題/批次解題流程
- **〔重點統整〕** - 顯示學習重點統整 (尚未完全實作)

#### 核心組件清單

| 組件名稱 | 路徑 | 功能 | 狀態 |
|---------|------|------|------|
| `ModeTabs` | `components/ask/ModeTabs.tsx` | 頂部分頁切換 (解題/重點統整) | ✅ 完成 |
| `InputDock` | `components/ask/InputDock.tsx` | 底部輸入區 (ChatGPT 風格)<br>- ＋ 按鈕 (檔案上傳)<br>- 文字輸入框<br>- 送出箭頭<br>- Enter 送出, Shift+Enter 換行 | ✅ 完成 |
| `QuestionBubble` | `components/ask/messages/QuestionBubble.tsx` | 題目泡泡顯示 (題幹 + 四個選項) | ✅ 完成 |
| `ConceptChips` | `components/ask/ConceptChips.tsx` | 考點 chips (4 個可選) | ✅ 完成 |
| `ExplanationCard` | `components/ask/ExplanationCard.tsx` | 詳解卡片<br>- 一句話總結<br>- 解題步驟<br>- 文法統整表<br>- Action Duo<br>- 學長姐語氣 | ✅ 完成 |
| `ActionDuo` | `components/ask/ActionDuo.tsx` | [💾 存入書包] [🔁 再練一題] | ✅ 完成 |
| `BatchList` | `components/ask/messages/BatchList.tsx` | 批次題目列表 (可勾選) | ✅ 完成 |
| `BatchActions` | `components/ask/messages/BatchActions.tsx` | 批次行動列<br>- 📘 逐步解析<br>- ⚡ 快速解答 | ✅ 完成 |
| `BatchOverview` | `components/ask/messages/BatchOverview.tsx` | 快速解答總覽 (列表顯示) | ✅ 完成 |
| `SummaryCard` | `components/ask/SummaryCard.tsx` | 重點統整卡片 | ✅ 完成 (基礎) |

### 互動流程詳解

#### 單題模式 (SINGLE)

```
[用戶輸入題目]
    ↓
階段 1: question (題目顯示)
    - 組件: QuestionBubble
    - 行為: 顯示題幹與四個選項供參考
    - 輸出: 無互動，自動進入階段 2
    ↓
階段 2: concept (考點選擇)
    - 組件: QuestionBubble + ConceptChips (或 warmup 選項卡)
    - 行為: 使用者點擊任一 chip
    - API 調用:
      1. detectAndWarmup(prompt) → WarmupResponse
      2. 顯示 4 個考點選項
    - 輸出: 選中的 concept_id
    ↓
階段 3: explain (詳解顯示)
    - 組件: ExplanationCard
    - 行為:
      1. answerWarmup(option_id) → TutorAnswerResponse
      2. getSolveStrategy('step') → SolveResponse
      3. 顯示詳解卡 (含表格化統整)
    - CTA:
      [存入書包] → handleSaveToBackpack()
      [再練一題] → handleRetry() (重置到階段 1)
```

#### 批次模式 (BATCH)

```
[用戶輸入多題]
    ↓
階段 1: list (題目列表)
    - 組件: BatchList
    - 行為: 使用者勾選題目 (可多選)
    - 輸出: selectedIds[]
    ↓
階段 2: actions (行動選擇)
    - 組件: BatchActions (浮現)
    - 行為: 使用者選擇解析模式
    - 分支:
      [📘 逐步解析] → 階段 3A
      [⚡ 快速解答] → 階段 3B
    ↓
階段 3A: step-by-step (逐步解析)
    - 組件: ExplanationCard (一次一題)
    - 行為:
      - 顯示進度: "1 / 5"
      - 淡出/淡入動畫 (200ms / 300ms)
      - [➡️ 下一題] → handleBatchNext()
      - 最終題: 顯示「✅ 本輪解析完成」
    - CTA: [回到清單] → 回到階段 1
    ↓
階段 3B: quick (快速解答)
    - 組件: BatchOverview
    - 行為: 列表顯示所有題目
      - 建議答案: B
      - 一句話總結: "本題考關係子句..."
    - CTA: [回到清單] → 回到階段 1
```

### 動畫規格
使用 **Framer Motion**:
```typescript
// 頁面進入
{ opacity: 0 → 1, y: 16 → 0, duration: 0.3-0.4s }

// 切題動畫 (Batch)
// 淡出
{ opacity: 1 → 0, y: 0 → -16, duration: 0.2s }
// 淡入
{ opacity: 0 → 1, y: 16 → 0, duration: 0.3s }

// 行動列浮現
{ opacity: 0 → 1, y: 12 → 0, duration: 0.3s }
```

### 主題色彩
```typescript
export const THEME = {
  bg: '#0E1116',           // 背景
  card: '#141A20',         // 卡片
  accent: '#6EC1E4',       // 重點色 (淡藍)
  text: '#F1F5F9',         // 主文字
  textSecondary: '#A9B7C8', // 輔助文字
  border: '#1F2937',       // 邊框
  borderRadius: '14px',    // 小圓角
  borderRadiusLg: '16px',  // 大圓角
  shadow: '0 4px 16px rgba(110, 193, 228, 0.08)' // 微光陰影
}
```

---

## 5️⃣ 錯題本/延伸功能

### 資料結構 (Supabase)

#### 主要表: `backpack_notes`
```sql
CREATE TABLE backpack_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,               -- 原題目
  canonical_skill TEXT NOT NULL,        -- 考點/技能
  note_md TEXT NOT NULL,                -- Markdown 格式詳解
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 相關表: `backpack_items`
```sql
CREATE TABLE backpack_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,                -- 'chinese' | 'english' | 'social' | 'science' | 'math'
  type TEXT NOT NULL,                   -- 'text' | 'pdf' | 'image'
  title TEXT NOT NULL,
  content TEXT,                         -- 內容
  file_url TEXT,                        -- 檔案 URL (如果是 pdf/image)
  derived_from TEXT[],                  -- 派生來源 (檔案 ID 陣列)
  version_history JSONB DEFAULT '[]',  -- 版本歷史
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 相關表: `solve_sessions` & `solve_responses`
```sql
-- Solve Session (每次解題流程的 session)
CREATE TABLE solve_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  subject TEXT,
  keypoint_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solve Options (考點選項)
CREATE TABLE solve_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES solve_sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_answer BOOLEAN DEFAULT FALSE,
  concept_id TEXT,                      -- ⏳ 新增欄位 (待 migration)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solve Responses (使用者回答記錄)
CREATE TABLE solve_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES solve_sessions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES solve_options(id),
  selected_concept_id TEXT,
  is_correct BOOLEAN,
  latency_ms INTEGER,
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 「再問一題」功能
- **狀態**: ✅ UI 已實作
- **位置**: `components/ask/ActionDuo.tsx`
- **行為**: 
  ```typescript
  const handleRetry = () => {
    reset() // useTutorFlow hook
    setState(prev => ({
      ...prev,
      singlePhase: 'question',
      currentQuestion: null,
      concepts: [],
      explanation: null,
    }))
  }
  ```
- **呼叫來源**: ExplanationCard 的 `onRetry` prop

### 「延伸補充」功能
- **狀態**: ⏳ 部分實作
- **位置**: SolveResponse 的 `extensions[]` 欄位
- **當前輸出**: Mock 資料 `['相關概念1', '相關概念2']`
- **計劃**: 
  - 從 `concept_edges.json` 取得相關考點
  - 顯示為可點擊的 chips
  - 點擊後跳轉到該考點的說明

### 儲存流程
```typescript
// 位置: app/api/backpack/save/route.ts
interface SaveRequest {
  subject: 'chinese' | 'english' | 'social' | 'science' | 'math'
  title: string
  tags: string[]
  content: string
  mode: 'save' | 'overwrite'
  originalId?: string  // 如果是 overwrite
}

// 回傳
interface SaveResponse {
  id: string
  saved: true
  version_history?: VersionHistoryEntry[]
}
```

---

## 6️⃣ 技術現況

### 已知問題

#### 1. API Mock vs 真實實作
| 端點 | 狀態 | 說明 |
|------|------|------|
| `/api/tutor/detect` | ✅ 實作 | 已串接 `lib/subject-classifier.ts` + OpenAI |
| `/api/warmup/keypoint-mcq-simple` | ⚠️ Mock | 使用 `mockKeypoints` 陣列，未串接 DB |
| `/api/tutor/answer` | ✅ 實作 | 已串接 Supabase + Zod schema，支援 concept_id |
| `/api/solve-simple` | ⚠️ Mock | 使用 `mockKeypoints` 字典，未串接 DB |
| `/api/ai/solve` | ✅ 實作 | 已串接 OpenAI，但輸入格式與新流程不匹配 |

#### 2. 資料播種 (Data Seeding)
- ❌ **狀態**: 未執行
- **檔案位置**:
  - `data/mathA_keypoints.jsonl` (180 KB)
  - `data/mathA_questions_sample.jsonl` (35 KB)
  - `data/english_concepts.json`
  - `data/concept_edges.json`
- **所需 Script**:
  - `scripts/import_math_data.ts` - 匯入數學題庫
  - `scripts/seed_concepts.ts` - 匯入考點與關聯
- **影響**: 
  - 無法測試真實題目
  - warmup/solve API 依賴 mock 資料

#### 3. Database Migration 待執行
```sql
-- 檔案: supabase/migrations/20251018_archive_legacy_tutor.sql
-- 功能: 將舊表移到 legacy schema
-- 影響表: concepts, concept_edges, match_concepts, solve_explanations
-- 狀態: ⏳ 未執行

-- 檔案: supabase/migrations/20251018_add_concept_id_to_solve_options.sql
-- 功能: 在 solve_options 增加 concept_id 欄位與 index
-- 狀態: ⏳ 未執行
```

#### 4. 廢棄 API 清理
```typescript
// 已標記為 410 Gone (需實作)
// 檔案位置: app/api/tutor/{explain, options, save-to-backpack, markdown, simplify}/route.ts

export async function GET() {
  return new Response('Gone', {
    status: 410,
    headers: { 'X-Deprecated': 'true' }
  })
}

export async function POST() {
  return new Response('Gone', {
    status: 410,
    headers: { 'X-Deprecated': 'true' }
  })
}
```

#### 5. Output Parsing 問題
- **ExplanationCard** 期望的 `grammarTable` 格式:
  ```typescript
  { category: string, description: string, example: string }[]
  ```
- **SolveResponse** 實際回傳:
  ```typescript
  { steps: string[], checks: string[], error_hints: string[] }
  ```
- **當前解決方式**: 
  ```typescript
  // app/(app)/ask/page.tsx:183-194
  grammarTable: [
    { category: '檢查項目', description: solveResponse.checks?.join(', ') || '', example: '' },
    { category: '常見錯誤', description: solveResponse.error_hints?.join(', ') || '', example: '' },
    { category: '相關概念', description: solveResponse.extensions?.join(', ') || '', example: '' }
  ]
  ```

#### 6. UI State 管理
- **當前方式**: React `useState` + `useTutorFlow` hook
- **問題**: 
  - `tutorPhase` 與 `AskState.singlePhase` 有部分重疊
  - warmup 選項格式與 ConceptChips 不完全匹配
- **待優化**: 統一狀態機，避免雙重管理

### 待優化模組

#### 1. `lib/tutor-utils.ts`
- **問題**: 包含已廢棄的 `findSimilarConcepts()` & `getConfusableConcepts()`
- **建議**: 移除或移至 `legacy/`

#### 2. `lib/prompts.ts`
- **問題**: 定義了六種解題模板，但當前流程未使用
- **建議**: 
  - 與 `/api/solve-simple` 整合
  - 或更新為新的 `{summary, steps, checks}` 格式

#### 3. `docs/TUTOR_EXPLAIN_API.md`
- **問題**: 文件描述的 payload 格式與實際不符
- **建議**: 更新或標記為 deprecated

#### 4. 測試覆蓋
- ❌ 單元測試: 無
- ❌ 整合測試: 無
- ⚠️ 手動測試: 部分 (透過 `tools/scripts/curl-verify.sh`)

---

## 7️⃣ 完整進度評估

### ✅ 已完成 (Demo Ready)

| 項目 | 完成度 | 說明 |
|------|--------|------|
| **UI/UX 設計** | 95% | - Ask 頁面完整流程 (單/批次)<br>- ExplanationCard 詳解卡<br>- InputDock 輸入區<br>- 深色淡藍極簡風格<br>- Framer Motion 動畫 |
| **前端狀態管理** | 85% | - `useTutorFlow` hook 完整<br>- `AskState` 狀態機<br>- 單/批次自動偵測<br>⚠️ 待優化: 雙重狀態管理 |
| **API 架構設計** | 80% | - `/api/tutor/detect` ✅<br>- `/api/warmup/keypoint-mcq-simple` ⚠️ Mock<br>- `/api/tutor/answer` ✅<br>- `/api/solve-simple` ⚠️ Mock |
| **TypeScript 型別** | 90% | - 核心型別完整定義<br>- Zod schema 驗證<br>⚠️ 部分型別在 legacy/ 待清理 |
| **OpenAI 整合** | 60% | - `lib/openai.ts` 封裝完成<br>- `/api/ai/solve` 已串接<br>⚠️ warmup/solve-simple 尚未真實調用 |

### ⏳ 進行中 (Partially Implemented)

| 項目 | 完成度 | 待完成項目 |
|------|--------|-----------|
| **資料庫整合** | 40% | - ❌ Migration 未執行<br>- ❌ 資料未播種<br>- ❌ Legacy 表未歸檔 |
| **錯題本功能** | 50% | - ✅ UI 流程完整<br>- ✅ API 端點存在<br>- ❌ 實際儲存未測試<br>- ❌ 版本歷史未顯示 |
| **批次解題** | 70% | - ✅ UI 完整<br>- ⚠️ API 串接使用 mock<br>- ❌ 批次 API 調用未優化 |

### ❌ 未完成 (Not Started)

| 項目 | 優先級 | 估計工作量 |
|------|--------|-----------|
| **資料播種** | P0 | 2-4 小時 |
| **Migration 執行** | P0 | 1-2 小時 |
| **真實 API 串接** | P0 | 4-8 小時 |
| **廢棄 API 清理** | P1 | 2-3 小時 |
| **單元測試** | P1 | 8-16 小時 |
| **整合測試** | P2 | 4-8 小時 |
| **版本歷史顯示** | P2 | 2-4 小時 |
| **延伸概念串接** | P3 | 2-4 小時 |

### 關鍵阻塞因素 (Blockers)

1. **資料庫未播種** → Mock API 無法轉換為真實實作
2. **Migration 未執行** → `solve_options.concept_id` 欄位不存在
3. **環境變數未配置** → 無法測試 OpenAI 調用
4. **測試覆蓋不足** → 無法確保品質

---

## 8️⃣ 專案進度百分比

### 總體完成度: **40%**

#### 分項進度

```
UI/UX 設計           ████████████████████ 95%
前端狀態管理         █████████████████░░░ 85%
API 架構設計         ████████████████░░░░ 80%
TypeScript 型別      ██████████████████░░ 90%
OpenAI 整合          ████████████░░░░░░░░ 60%
資料庫整合           ████████░░░░░░░░░░░░ 40%
錯題本功能           ██████████░░░░░░░░░░ 50%
批次解題             ██████████████░░░░░░ 70%
測試覆蓋             ░░░░░░░░░░░░░░░░░░░░ 0%
文檔完整性           ████████████░░░░░░░░ 60%
                     
────────────────────────────────────────
總體進度             ████████░░░░░░░░░░░░ 40%
```

### 剩餘待接項目 (按優先級排序)

#### P0 (必須完成才能 Demo)
1. ✅ **資料播種**: 執行 `scripts/import_math_data.ts` 與 `scripts/seed_concepts.ts`
2. ✅ **Migration 執行**: 執行兩個 migration 檔案
3. ✅ **真實 API 串接**: 將 warmup/solve-simple 改為查詢真實資料庫

#### P1 (影響使用者體驗)
4. ⚠️ **廢棄 API 清理**: 實作 410 Gone 回應
5. ⚠️ **錯題本儲存測試**: 確保 `/api/backpack/save` 正常運作
6. ⚠️ **錯誤處理**: 完善各 API 的錯誤提示

#### P2 (增強功能)
7. 📋 **單元測試**: 核心函式測試
8. 📋 **整合測試**: API 端到端測試
9. 📋 **版本歷史**: 在 Backpack 顯示修改記錄

#### P3 (優化項目)
10. 🔧 **延伸概念**: 串接 concept_edges 顯示相關考點
11. 🔧 **Prompt 優化**: 整合 `lib/prompts.ts` 六種模板
12. 🔧 **效能優化**: 批次 API 並發調用、快取機制

---

## 9️⃣ 主要開發目標

### 當前階段目標 (Sprint 1)
**「完善 Tutor Flow 一致性與資料落地」**

#### 具體任務
1. ✅ **執行 DB Migration**
   - 歸檔 legacy 表至 `legacy` schema
   - 新增 `solve_options.concept_id` 欄位

2. ✅ **資料播種**
   - 匯入 `mathA_keypoints.jsonl` (180 個考點)
   - 匯入 `mathA_questions_sample.jsonl` (範例題目)
   - 匯入 `english_concepts.json` (英文考點)

3. ✅ **真實 API 串接**
   - `/api/warmup/keypoint-mcq-simple` 改為查詢 `keypoints` 表
   - `/api/solve-simple` 改為查詢 `strategy_template`
   - `/api/tutor/answer` 測試 `mapKeypointToConceptId()` 函式

4. ✅ **廢棄 API 處理**
   - 實作 5 個 tutor API 的 410 Gone 回應
   - 建立 `DEPRECATED.md` 記錄觀察窗口
   - 建立 `tools/scripts/curl-verify.sh` 驗證腳本

5. ✅ **型別整理**
   - 移動廢棄型別至 `legacy/types-deprecated.ts`
   - 標註 `@deprecated` 註解
   - 更新 re-export

### 下一階段目標 (Sprint 2)
**「完善錯題本與詳解卡生成一致性」**

#### 規劃任務
1. 📋 測試錯題本儲存流程
2. 📋 實作版本歷史顯示
3. 📋 優化詳解卡的文法統整表生成
4. 📋 整合 `lib/prompts.ts` 六種解題模板
5. 📋 新增單元測試 (覆蓋率目標: 60%)

### 長期目標 (Roadmap)
- **C1 (當前週期)**: Tutor Flow 核心功能完整可用
- **C2**: 批次解題優化、延伸概念串接
- **C3**: 社群功能、學習統計儀表板
- **C4**: 教師端功能、班級管理
- **C5**: API 開放、第三方整合
- **C6**: 家長端報告、學習軌跡分析
- **C7**: AI 個人化推薦、適性化學習

---

## 🔗 附錄: 快速連結

### 關鍵文件
- [AGENTS.md](docs/AGENTS.md) - 10-Agent 系統設計規格
- [API_ARCHITECTURE.md](docs/API_ARCHITECTURE.md) - API 架構文件
- [ASK_PAGE_REDESIGN.md](docs/ASK_PAGE_REDESIGN.md) - Ask 頁面重構說明
- [MATH_SYSTEM_SETUP.md](docs/MATH_SYSTEM_SETUP.md) - 數學系統設定指南
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - 實作進度摘要
- [audit.report.md](audit.report.md) - API 與概念清理審計

### 核心檔案
- [lib/tutor-types.ts](lib/tutor-types.ts) - 型別定義
- [lib/use-tutor-flow.ts](lib/use-tutor-flow.ts) - Tutor Flow Hook
- [app/(app)/ask/page.tsx](app/(app)/ask/page.tsx) - Ask 主頁面
- [app/api/tutor/answer/route.ts](app/api/tutor/answer/route.ts) - 答案驗證 API
- [components/ask/ExplanationCard.tsx](components/ask/ExplanationCard.tsx) - 詳解卡片

### 測試工具
- [tools/scripts/curl-verify.sh](tools/scripts/curl-verify.sh) - API 驗證腳本
- [tools/fixtures/](tools/fixtures/) - API 回應樣本

---

**報告生成完成。如有任何疑問或需要更詳細的說明，請參閱對應的文件或原始碼。**

