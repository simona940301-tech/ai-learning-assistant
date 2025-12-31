-- ============================================================================
-- EWA (Expected Win-rate Allocation) + DKT (Deep Knowledge Tracing) System
-- ============================================================================

-- Knowledge Point Mastery Tracking (DKT 核心表)
CREATE TABLE IF NOT EXISTS knowledge_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  
  -- DKT 核心指標
  current_mastery DECIMAL(5,4) NOT NULL DEFAULT 0.5000 CHECK (current_mastery >= 0 AND current_mastery <= 1),
  forget_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000 CHECK (forget_rate >= 0 AND forget_rate <= 1),
  learn_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2000 CHECK (learn_rate >= 0 AND learn_rate <= 1),
  
  -- 預測能力
  predicted_correctness DECIMAL(5,4) NOT NULL DEFAULT 0.5000 CHECK (predicted_correctness >= 0 AND predicted_correctness <= 1),
  confidence_level DECIMAL(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence_level >= 0 AND confidence_level <= 1),
  
  -- 統計資料
  total_attempts INTEGER NOT NULL DEFAULT 0,
  correct_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  -- 記憶曲線參數
  memory_strength DECIMAL(5,4) NOT NULL DEFAULT 0.5000,
  time_since_review_hours DECIMAL(8,2) DEFAULT 0,
  optimal_review_interval_hours DECIMAL(8,2) DEFAULT 24,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, concept_id)
);

-- Question Mastery Tracking (題目層級掌握度)
CREATE TABLE IF NOT EXISTS question_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL, -- 可以是 pack_questions.id 或 seed_questions.id
  question_source TEXT NOT NULL DEFAULT 'pack_questions' CHECK (question_source IN ('pack_questions', 'seed_questions', 'ugc_questions')),
  
  -- 變異追蹤 (錯題變異系統)
  original_question_hash TEXT, -- 原始題目的 hash
  mutation_count INTEGER DEFAULT 0, -- 已變異次數
  last_mutation_passed BOOLEAN DEFAULT NULL, -- 最後一次變異是否通過
  
  -- 預測指標
  predicted_correctness DECIMAL(5,4) NOT NULL DEFAULT 0.5000,
  actual_performance DECIMAL(5,4), -- 實際表現追蹤
  
  -- 統計
  total_shown INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  last_shown_at TIMESTAMPTZ,
  
  -- 錯題本狀態
  in_error_book BOOLEAN DEFAULT FALSE,
  error_book_added_at TIMESTAMPTZ,
  mastery_threshold_reached BOOLEAN DEFAULT FALSE,
  mastery_threshold_reached_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, question_id, question_source)
);

-- EWA Battle Sessions (對戰場次配置)
CREATE TABLE IF NOT EXISTS ewa_battle_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- EWA 配置
  target_accuracy_rate DECIMAL(3,2) NOT NULL DEFAULT 0.75 CHECK (target_accuracy_rate >= 0.5 AND target_accuracy_rate <= 0.9),
  session_type TEXT NOT NULL DEFAULT 'standard' CHECK (session_type IN ('standard', 'confidence_build', 'challenge', 'review')),
  
  -- 題目分配策略
  total_questions INTEGER NOT NULL DEFAULT 10,
  planned_old_questions INTEGER NOT NULL DEFAULT 3,
  planned_new_questions INTEGER NOT NULL DEFAULT 7,
  actual_old_questions INTEGER DEFAULT 0,
  actual_new_questions INTEGER DEFAULT 0,
  
  -- 動態調整記錄
  difficulty_adjustments JSONB DEFAULT '[]'::jsonb,
  question_selection_log JSONB DEFAULT '[]'::jsonb,
  
  -- 結果
  final_accuracy DECIMAL(3,2),
  final_score INTEGER,
  user_sentiment TEXT CHECK (user_sentiment IN ('frustrated', 'normal', 'confident', 'bored')),
  
  -- 狀態
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Question Mutations (錯題變異記錄)
CREATE TABLE IF NOT EXISTS question_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_question_id UUID NOT NULL,
  original_question_source TEXT NOT NULL CHECK (original_question_source IN ('pack_questions', 'seed_questions', 'ugc_questions')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 變異內容
  mutated_question_text TEXT NOT NULL,
  mutated_choices TEXT[] NOT NULL,
  mutated_correct_answer TEXT NOT NULL,
  core_concept_preserved TEXT NOT NULL, -- 確保核心考點不變
  
  -- 變異策略
  mutation_type TEXT NOT NULL CHECK (mutation_type IN ('context_change', 'number_swap', 'option_shuffle', 'scenario_shift')),
  difficulty_maintained BOOLEAN DEFAULT TRUE,
  
  -- 使用記錄
  times_used INTEGER DEFAULT 0,
  user_performance DECIMAL(3,2), -- 變異題的答對率
  
  -- LLM 生成資訊
  generated_by TEXT DEFAULT 'gpt-4',
  generation_prompt TEXT,
  generation_tokens_used INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, original_question_id, original_question_source, mutation_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user_concept ON knowledge_mastery(user_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_predicted ON knowledge_mastery(predicted_correctness);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_review ON knowledge_mastery(user_id, last_attempt_at) WHERE last_attempt_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_mastery_user ON question_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_question_mastery_error_book ON question_mastery(user_id, in_error_book) WHERE in_error_book = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_mastery_prediction ON question_mastery(user_id, predicted_correctness);

CREATE INDEX IF NOT EXISTS idx_ewa_sessions_user ON ewa_battle_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ewa_sessions_active ON ewa_battle_sessions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_question_mutations_original ON question_mutations(original_question_id, original_question_source);
CREATE INDEX IF NOT EXISTS idx_question_mutations_user ON question_mutations(user_id);

-- Update triggers
CREATE TRIGGER update_knowledge_mastery_updated_at BEFORE UPDATE ON knowledge_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_mastery_updated_at BEFORE UPDATE ON question_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ewa_sessions_updated_at BEFORE UPDATE ON ewa_battle_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_mutations_updated_at BEFORE UPDATE ON question_mutations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();