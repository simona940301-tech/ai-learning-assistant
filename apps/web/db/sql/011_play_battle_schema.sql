-- ============================================
-- Play Battle System Schema (A++ Architecture)
-- ============================================
-- 擴展 profiles 表（向後兼容）
-- 創建對戰系統相關表

-- 1. 擴展 profiles 表（向後兼容，不影響現有功能）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS daily_energy_count INTEGER DEFAULT 8 CHECK (daily_energy_count >= 0 AND daily_energy_count <= 8),
ADD COLUMN IF NOT EXISTS examiner_contribution_score INTEGER DEFAULT 0 CHECK (examiner_contribution_score >= 0),
ADD COLUMN IF NOT EXISTS user_wallet_balance DECIMAL(12, 2) DEFAULT 0 CHECK (user_wallet_balance >= 0),
ADD COLUMN IF NOT EXISTS skill_mastery_json JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS user_match_history JSONB DEFAULT '[]'::jsonb;

-- 添加索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_balance ON profiles(user_wallet_balance DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_energy_count ON profiles(daily_energy_count);
CREATE INDEX IF NOT EXISTS idx_profiles_contribution_score ON profiles(examiner_contribution_score DESC);

-- ============================================
-- 2. Transactions 表（虛擬貨幣交易記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAW', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'REWARD', 'CONTRACT_SETTLE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK')),
  contract_id UUID, -- 關聯到 contract_escrows
  reference_id TEXT, -- 外部參考 ID（如 FoundationDB transaction ID）
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- 3. UGC Questions 表（用戶生成題目）
-- ============================================
CREATE TABLE IF NOT EXISTS ugc_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  designer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  deceiver_option TEXT NOT NULL, -- 迷惑選項文本
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  subject TEXT NOT NULL CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  skill_tags TEXT[] DEFAULT '{}',
  difficulty INTEGER DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  usage_count INTEGER DEFAULT 0,
  total_rewards DECIMAL(12, 2) DEFAULT 0, -- 累計獲得的獎勵
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ugc_questions_designer_id ON ugc_questions(designer_id);
CREATE INDEX IF NOT EXISTS idx_ugc_questions_review_status ON ugc_questions(review_status);
CREATE INDEX IF NOT EXISTS idx_ugc_questions_subject ON ugc_questions(subject);
CREATE INDEX IF NOT EXISTS idx_ugc_questions_created_at ON ugc_questions(created_at DESC);

-- ============================================
-- 4. Contract Escrows 表（合約鎖定）
-- ============================================
CREATE TABLE IF NOT EXISTS contract_escrows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LOCKED', 'SETTLED', 'CANCELLED', 'EXPIRED')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('PVP_BATTLE', 'CHALLENGE', 'TOURNAMENT')),
  match_id UUID, -- 關聯到 match_history
  foundationdb_tx_id TEXT, -- FoundationDB 事務 ID
  expires_at TIMESTAMP WITH TIME ZONE,
  settled_at TIMESTAMP WITH TIME ZONE,
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_escrows_creator_id ON contract_escrows(creator_id);
CREATE INDEX IF NOT EXISTS idx_contract_escrows_challenger_id ON contract_escrows(challenger_id);
CREATE INDEX IF NOT EXISTS idx_contract_escrows_status ON contract_escrows(status);
CREATE INDEX IF NOT EXISTS idx_contract_escrows_match_id ON contract_escrows(match_id);

-- ============================================
-- 5. Match History 表（對戰歷史記錄）
-- ============================================
CREATE TABLE IF NOT EXISTS match_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_type TEXT NOT NULL CHECK (match_type IN ('PVE_TRAINING', 'PVP_BATTLE', 'CUSTOM_ROOM', 'RANKED', 'CONTRACT')),
  player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES profiles(id),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  question_list JSONB DEFAULT '[]'::jsonb, -- 題目列表
  player1_answers JSONB DEFAULT '[]'::jsonb, -- 玩家1的答案記錄
  player2_answers JSONB DEFAULT '[]'::jsonb, -- 玩家2的答案記錄
  duration_seconds INTEGER DEFAULT 0,
  contract_id UUID REFERENCES contract_escrows(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_history_player1_id ON match_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player2_id ON match_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_history_winner_id ON match_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_match_history_started_at ON match_history(started_at DESC);

-- ============================================
-- 6. RLS Policies（行級安全策略）
-- ============================================
-- 使用 DO 塊來檢查 policy 是否存在，避免重複創建

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'Users can view own transactions'
  ) THEN
    CREATE POLICY "Users can view own transactions"
      ON transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'System can create transactions'
  ) THEN
    CREATE POLICY "System can create transactions"
      ON transactions FOR INSERT
      WITH CHECK (true); -- 由 API 控制權限
  END IF;
END $$;

-- UGC Questions
ALTER TABLE ugc_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ugc_questions' 
    AND policyname = 'UGC questions are viewable by everyone'
  ) THEN
    CREATE POLICY "UGC questions are viewable by everyone"
      ON ugc_questions FOR SELECT
      USING (review_status = 'APPROVED' OR auth.uid() = designer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ugc_questions' 
    AND policyname = 'Users can create own UGC questions'
  ) THEN
    CREATE POLICY "Users can create own UGC questions"
      ON ugc_questions FOR INSERT
      WITH CHECK (auth.uid() = designer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ugc_questions' 
    AND policyname = 'Users can update own UGC questions'
  ) THEN
    CREATE POLICY "Users can update own UGC questions"
      ON ugc_questions FOR UPDATE
      USING (auth.uid() = designer_id AND review_status = 'PENDING');
  END IF;
END $$;

-- Contract Escrows
ALTER TABLE contract_escrows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contract_escrows' 
    AND policyname = 'Users can view own contracts'
  ) THEN
    CREATE POLICY "Users can view own contracts"
      ON contract_escrows FOR SELECT
      USING (auth.uid() = creator_id OR auth.uid() = challenger_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contract_escrows' 
    AND policyname = 'Users can create own contracts'
  ) THEN
    CREATE POLICY "Users can create own contracts"
      ON contract_escrows FOR INSERT
      WITH CHECK (auth.uid() = creator_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contract_escrows' 
    AND policyname = 'Users can update own contracts'
  ) THEN
    CREATE POLICY "Users can update own contracts"
      ON contract_escrows FOR UPDATE
      USING (auth.uid() = creator_id OR auth.uid() = challenger_id);
  END IF;
END $$;

-- Match History
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_history' 
    AND policyname = 'Users can view own match history'
  ) THEN
    CREATE POLICY "Users can view own match history"
      ON match_history FOR SELECT
      USING (auth.uid() = player1_id OR auth.uid() = player2_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_history' 
    AND policyname = 'System can create match history'
  ) THEN
    CREATE POLICY "System can create match history"
      ON match_history FOR INSERT
      WITH CHECK (true); -- 由 API 控制權限
  END IF;
END $$;

-- ============================================
-- 7. Functions（輔助函數）
-- ============================================

-- 更新交易表的 updated_at（使用 DROP IF EXISTS 避免重複）
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ugc_questions_updated_at ON ugc_questions;
CREATE TRIGGER update_ugc_questions_updated_at BEFORE UPDATE ON ugc_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_escrows_updated_at ON contract_escrows;
CREATE TRIGGER update_contract_escrows_updated_at BEFORE UPDATE ON contract_escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Match Queue 表（匹配隊列）
-- ============================================
CREATE TABLE IF NOT EXISTS match_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('RANKED', 'WEAKNESS_BATTLE', 'CUSTOM')),
  subject TEXT CHECK (subject IN ('chinese', 'english', 'social', 'science', 'math')),
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'MATCHED', 'CANCELLED')),
  match_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 seconds')
);

CREATE INDEX IF NOT EXISTS idx_match_queue_user_id ON match_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_match_queue_status ON match_queue(status);
CREATE INDEX IF NOT EXISTS idx_match_queue_match_type ON match_queue(match_type);
CREATE INDEX IF NOT EXISTS idx_match_queue_created_at ON match_queue(created_at);

-- Match Queue RLS
ALTER TABLE match_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_queue' 
    AND policyname = 'Users can view own queue entries'
  ) THEN
    CREATE POLICY "Users can view own queue entries"
      ON match_queue FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_queue' 
    AND policyname = 'Users can create own queue entries'
  ) THEN
    CREATE POLICY "Users can create own queue entries"
      ON match_queue FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'match_queue' 
    AND policyname = 'Users can delete own queue entries'
  ) THEN
    CREATE POLICY "Users can delete own queue entries"
      ON match_queue FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 清理過期隊列條目的函數
CREATE OR REPLACE FUNCTION cleanup_expired_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM match_queue 
  WHERE expires_at < NOW() AND status = 'QUEUED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 每日重置精力值的函數（可選，由 cron job 或 API 調用）
CREATE OR REPLACE FUNCTION reset_daily_energy()
RETURNS void AS $$
BEGIN
  UPDATE profiles SET daily_energy_count = 8 WHERE daily_energy_count < 8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 初始化現有用戶的默認值
-- ============================================
UPDATE profiles 
SET 
  daily_energy_count = COALESCE(daily_energy_count, 8),
  examiner_contribution_score = COALESCE(examiner_contribution_score, 0),
  user_wallet_balance = COALESCE(user_wallet_balance, 0),
  skill_mastery_json = COALESCE(skill_mastery_json, '{}'::jsonb),
  user_match_history = COALESCE(user_match_history, '[]'::jsonb)
WHERE 
  daily_energy_count IS NULL 
  OR examiner_contribution_score IS NULL 
  OR user_wallet_balance IS NULL 
  OR skill_mastery_json IS NULL 
  OR user_match_history IS NULL;

