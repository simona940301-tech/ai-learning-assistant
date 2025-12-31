-- ============================================
-- Week 3: P9/P10 - Battle Events 表（臨時數據流）
-- ============================================
-- 用於儲存 Rust 引擎發送的戰鬥結果事件
-- 替代 Kafka，使用 Supabase Realtime 進行事件流處理

-- 1. 創建 battle_events 表
CREATE TABLE IF NOT EXISTS battle_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 戰鬥基本信息
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('PVP', 'PVE_TRAINING', 'PVE_CHALLENGE')),
  
  -- 題目和答案數據
  question_id_array JSONB NOT NULL DEFAULT '[]'::jsonb, -- 題目 ID 數組
  is_correct_array JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 答案正確性數組（對應 question_id_array）
  
  -- 分數信息
  final_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "player1": 100, "player2": 80 }
  
  -- 時間戳
  server_timestamp BIGINT NOT NULL, -- Rust 服務端時間戳（毫秒）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 處理狀態（用於 UGC 收益計算）
  processed BOOLEAN DEFAULT FALSE, -- 是否已處理 UGC 收益
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- 元數據（用於擴展）
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. 創建索引以優化查詢性能
CREATE INDEX IF NOT EXISTS idx_battle_events_user_id ON battle_events(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_match_id ON battle_events(match_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_match_type ON battle_events(match_type);
CREATE INDEX IF NOT EXISTS idx_battle_events_processed ON battle_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_battle_events_created_at ON battle_events(created_at DESC);

-- 3. 創建 GIN 索引以優化 JSONB 查詢
CREATE INDEX IF NOT EXISTS idx_battle_events_question_ids ON battle_events USING GIN (question_id_array);
CREATE INDEX IF NOT EXISTS idx_battle_events_metadata ON battle_events USING GIN (metadata);

-- 4. 啟用 Row Level Security (RLS)
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略：用戶只能查看自己的戰鬥事件
-- 先刪除現有策略（如果存在），避免重複創建錯誤
DROP POLICY IF EXISTS "Users can view their own battle events" ON battle_events;
CREATE POLICY "Users can view their own battle events"
  ON battle_events
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = opponent_id);

-- 6. RLS 策略：服務端可以插入（通過 service_role）
-- 先刪除現有策略（如果存在），避免重複創建錯誤
DROP POLICY IF EXISTS "Service can insert battle events" ON battle_events;
CREATE POLICY "Service can insert battle events"
  ON battle_events
  FOR INSERT
  WITH CHECK (true); -- 實際部署時應該檢查 service_role

-- 7. 創建函數：更新處理狀態
CREATE OR REPLACE FUNCTION mark_battle_event_processed(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE battle_events
  SET processed = TRUE,
      processed_at = NOW()
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 創建函數：獲取未處理的事件（用於後台服務）
CREATE OR REPLACE FUNCTION get_unprocessed_battle_events(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  opponent_id UUID,
  match_id TEXT,
  match_type TEXT,
  question_id_array JSONB,
  is_correct_array JSONB,
  final_scores JSONB,
  server_timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    be.id,
    be.user_id,
    be.opponent_id,
    be.match_id,
    be.match_type,
    be.question_id_array,
    be.is_correct_array,
    be.final_scores,
    be.server_timestamp,
    be.created_at,
    be.metadata
  FROM battle_events be
  WHERE be.processed = FALSE
  ORDER BY be.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 創建函數：結算 UGC 收益（P10）
CREATE OR REPLACE FUNCTION settle_ugc_reward(
    p_question_id UUID,
    p_user_id UUID,
    p_match_id TEXT,
    p_reward_amount NUMERIC DEFAULT 1.0
)
RETURNS JSONB AS $$
DECLARE
    v_creator_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- 獲取題目創作者 ID
    SELECT creator_id INTO v_creator_id
    FROM pack_questions
    WHERE id = p_question_id AND is_ugc = TRUE;

    -- 如果沒有創作者或不是 UGC 題目，返回
    IF v_creator_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Question is not UGC or has no creator'
        );
    END IF;

    -- 獲取創作者當前餘額
    SELECT COALESCE(user_wallet_balance::numeric, 0) INTO v_current_balance
    FROM profiles
    WHERE id = v_creator_id;

    -- 計算新餘額
    v_new_balance := v_current_balance + p_reward_amount;

    -- 更新創作者餘額
    UPDATE profiles
    SET user_wallet_balance = v_new_balance::text,
        updated_at = NOW()
    WHERE id = v_creator_id;

    -- 記錄收益日誌（可選，如果有收益記錄表）
    -- INSERT INTO ugc_reward_logs (creator_id, question_id, match_id, amount, created_at)
    -- VALUES (v_creator_id, p_question_id, p_match_id, p_reward_amount, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'creator_id', v_creator_id,
        'reward_amount', p_reward_amount,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 添加註釋說明
COMMENT ON TABLE battle_events IS '戰鬥結果事件表（P9/P10），用於 UGC 收益追蹤和數據回流';
COMMENT ON COLUMN battle_events.question_id_array IS '題目 ID 數組，對應 is_correct_array';
COMMENT ON COLUMN battle_events.is_correct_array IS '答案正確性數組，與 question_id_array 一一對應';
COMMENT ON COLUMN battle_events.processed IS '是否已處理 UGC 收益計算';
COMMENT ON COLUMN battle_events.server_timestamp IS 'Rust 服務端時間戳（毫秒）';
COMMENT ON FUNCTION settle_ugc_reward IS '結算 UGC 創作者的收益（P10）';
