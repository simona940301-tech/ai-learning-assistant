# 🚀 Elite RAG System Migration

## 問題診斷

PDF 上傳失敗的根本原因：**資料庫缺少必要的表**

錯誤訊息：`文件記錄創建失敗` (DATABASE_ERROR)

## 缺少的表

1. `file_analysis` - 儲存 AI 分析結果
2. `exam_question_bank` - 儲存生成的考題

## 解決方案

### 方法 1：使用 Supabase Dashboard (推薦)

1. 開啟 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案
3. 點擊左側 `SQL Editor`
4. 建立新的 Query
5. 複製貼上以下檔案的內容：
   ```
   apps/web/db/migrations/023_elite_rag_system.sql
   ```
6. 點擊 `Run` 執行

### 方法 2：使用本地資料庫 (如果你使用 Supabase Local)

```bash
# 方法 A：使用 supabase CLI
cd /Users/simonac/Desktop/moonshot-idea
supabase db push

# 方法 B：直接執行 SQL
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f apps/web/db/migrations/023_elite_rag_system.sql
```

### 方法 3：手動建立表 (快速測試)

執行以下 SQL 命令：

```sql
-- ============================================
-- Elite RAG System: File Analysis & Exam Prediction
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. file_analysis table
CREATE TABLE IF NOT EXISTS file_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Layer 1: Quick Preview (3s target)
  quick_summary TEXT,
  detected_subject TEXT CHECK (detected_subject IN ('chinese', 'english', 'math', 'science', 'social', 'other')),
  detected_topics TEXT[] DEFAULT '{}',

  -- Layer 2: Deep Analysis (15s target)
  core_concepts JSONB DEFAULT '[]',
  key_insights JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  structured_notes TEXT,

  -- Layer 3: Exam Prediction (30s target)
  exam_predictions JSONB DEFAULT '[]',
  weak_points JSONB DEFAULT '[]',
  study_roadmap JSONB DEFAULT '[]',

  -- Metadata
  analysis_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_analysis_file_id ON file_analysis(file_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_file_analysis_created_at ON file_analysis(created_at DESC);

-- RLS Policies
ALTER TABLE file_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own analysis" ON file_analysis;
CREATE POLICY "Users view own analysis"
  ON file_analysis FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own analysis" ON file_analysis;
CREATE POLICY "Users create own analysis"
  ON file_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own analysis" ON file_analysis;
CREATE POLICY "Users update own analysis"
  ON file_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. exam_question_bank table
CREATE TABLE IF NOT EXISTS exam_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE,

  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'calculation')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,

  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  topic_tags TEXT[] DEFAULT '{}',
  source_pages INTEGER[] DEFAULT '{}',
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_questions_file_id ON exam_question_bank(file_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_user_id ON exam_question_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_analysis_id ON exam_question_bank(analysis_id);

-- RLS Policies
ALTER TABLE exam_question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own exam questions" ON exam_question_bank;
CREATE POLICY "Users view own exam questions"
  ON exam_question_bank FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own exam questions" ON exam_question_bank;
CREATE POLICY "Users create own exam questions"
  ON exam_question_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## 驗證

執行 migration 後，檢查表是否建立成功：

```sql
-- 檢查 file_analysis 表
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'file_analysis';

-- 檢查 exam_question_bank 表
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exam_question_bank';
```

## 測試 PDF 上傳

1. 重新整理瀏覽器
2. 前往「重點統整」頁面
3. 上傳一個 PDF 檔案
4. 應該會看到「開始分析」按鈕正常運作

## 問題排查

如果仍然失敗，檢查：

1. **環境變數**: `GEMINI_API_KEY` 是否設置
2. **API 配額**: Gemini API 是否有剩餘配額
3. **檔案大小**: 是否超過 20MB
4. **網路連線**: 是否能連接到 Gemini API

## 相關文件

- Migration 檔案: `apps/web/db/migrations/023_elite_rag_system.sql`
- Upload API: `apps/web/app/api/rag/upload-elite/route.ts`
- 前端元件: `apps/web/components/ask/SummaryWorkbench.tsx`
- AI 分析: `apps/web/lib/services/elite-rag-analyzer.ts`
