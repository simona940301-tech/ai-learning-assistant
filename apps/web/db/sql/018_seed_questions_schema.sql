-- ============================================
-- Seed Questions Schema (官方題庫)
-- ============================================
-- 用於存儲學測、指考等官方題庫
-- 與 UGC 題目分離，確保權威性和質量

-- 1. Seed Questions 表（官方題庫）
CREATE TABLE IF NOT EXISTS seed_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 題目來源標識
  source TEXT NOT NULL, -- 例如: "GSAT_2024_Paper_1", "AST_2023_Paper_2"
  source_year INTEGER, -- 年份: 2024, 2023
  source_type TEXT CHECK (source_type IN ('GSAT', 'AST', 'OTHER')), -- 學測、指考、其他
  paper_number INTEGER, -- 第幾份試卷（如果有多份）
  question_number TEXT, -- 題號: "1", "7", "選填C"
  
  -- 題目內容
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social')),
  question_text TEXT NOT NULL,
  question_image_url TEXT, -- 題目圖片 URL（如果有圖表、公式等）
  
  -- 選項（標準化為 A, B, C, D）
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  
  -- 難度和標籤（AI 弱點追蹤的關鍵）
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  knowledge_tags TEXT[] NOT NULL DEFAULT '{}', -- 知識點標籤，例如: ["英文-片語動詞-時態", "國文-古詩詞-李白"]
  
  -- 元數據
  has_explanation BOOLEAN DEFAULT FALSE, -- 是否有詳解
  explanation_file_url TEXT, -- 詳解檔案 URL（TXT/PDF）
  usage_count INTEGER DEFAULT 0, -- 使用次數（用於統計）
  avg_time_spent_seconds INTEGER, -- 平均答題時間（秒）
  correct_rate DECIMAL(5, 4), -- 正確率（0.0000-1.0000）
  
  -- 審計字段
  imported_by UUID REFERENCES profiles(id), -- 導入者
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 標記為官方題庫（非 UGC）
  is_official BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE -- 是否啟用（可用於軟刪除）
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_seed_questions_subject ON seed_questions(subject);
CREATE INDEX IF NOT EXISTS idx_seed_questions_difficulty ON seed_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_seed_questions_source ON seed_questions(source);
CREATE INDEX IF NOT EXISTS idx_seed_questions_knowledge_tags ON seed_questions USING GIN(knowledge_tags);
CREATE INDEX IF NOT EXISTS idx_seed_questions_active ON seed_questions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_seed_questions_usage_count ON seed_questions(usage_count DESC);

-- 全文搜索索引（用於題目內容搜索）
CREATE INDEX IF NOT EXISTS idx_seed_questions_text_search ON seed_questions USING GIN(to_tsvector('simple', question_text));

-- ============================================
-- 2. Question Explanations 表（詳解）
-- ============================================
-- 詳解獨立存儲，按需載入（避免對戰時載入延遲）

CREATE TABLE IF NOT EXISTS question_explanations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES seed_questions(id) ON DELETE CASCADE,
  
  -- 詳解內容
  explanation_text TEXT NOT NULL, -- 完整的文字詳解（包含解題步驟、概念說明）
  explanation_image_url TEXT, -- 詳解輔助圖（如果有）
  
  -- 學習重點（AI 弱點強化的關鍵）
  mastery_focus_points TEXT[] DEFAULT '{}', -- 建議用戶在這次錯題後應著重閱讀的知識點或資源連結
  
  -- 選項分析（可選，用於更詳細的解析）
  option_analysis JSONB DEFAULT '{}'::jsonb, -- { "A": "錯誤原因", "B": "正確原因", ... }
  
  -- 元數據
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 確保每個題目只有一個詳解
  UNIQUE(question_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_question_explanations_question_id ON question_explanations(question_id);

-- ============================================
-- 3. RLS Policies（行級安全策略）
-- ============================================

-- Seed Questions: 所有人可讀，只有管理員可寫
ALTER TABLE seed_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seed_questions' 
    AND policyname = 'Everyone can view active seed questions'
  ) THEN
    CREATE POLICY "Everyone can view active seed questions"
      ON seed_questions FOR SELECT
      USING (is_active = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seed_questions' 
    AND policyname = 'Only admins can insert seed questions'
  ) THEN
    CREATE POLICY "Only admins can insert seed questions"
      ON seed_questions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seed_questions' 
    AND policyname = 'Only admins can update seed questions'
  ) THEN
    CREATE POLICY "Only admins can update seed questions"
      ON seed_questions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Question Explanations: 所有人可讀，只有管理員可寫
ALTER TABLE question_explanations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'question_explanations' 
    AND policyname = 'Everyone can view explanations'
  ) THEN
    CREATE POLICY "Everyone can view explanations"
      ON question_explanations FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'question_explanations' 
    AND policyname = 'Only admins can manage explanations'
  ) THEN
    CREATE POLICY "Only admins can manage explanations"
      ON question_explanations FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================
-- 4. Triggers（自動更新時間戳）
-- ============================================

DROP TRIGGER IF EXISTS update_seed_questions_updated_at ON seed_questions;
CREATE TRIGGER update_seed_questions_updated_at 
  BEFORE UPDATE ON seed_questions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_question_explanations_updated_at ON question_explanations;
CREATE TRIGGER update_question_explanations_updated_at 
  BEFORE UPDATE ON question_explanations
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Functions（輔助函數）
-- ============================================

-- 更新題目使用統計
CREATE OR REPLACE FUNCTION update_question_stats(
  p_question_id UUID,
  p_is_correct BOOLEAN,
  p_time_spent_seconds INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE seed_questions
  SET 
    usage_count = usage_count + 1,
    avg_time_spent_seconds = CASE 
      WHEN avg_time_spent_seconds IS NULL THEN p_time_spent_seconds
      ELSE (avg_time_spent_seconds * usage_count + p_time_spent_seconds) / (usage_count + 1)
    END,
    correct_rate = CASE
      WHEN correct_rate IS NULL THEN CASE WHEN p_is_correct THEN 1.0 ELSE 0.0 END
      ELSE (correct_rate * usage_count + CASE WHEN p_is_correct THEN 1.0 ELSE 0.0 END) / (usage_count + 1)
    END
  WHERE id = p_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

