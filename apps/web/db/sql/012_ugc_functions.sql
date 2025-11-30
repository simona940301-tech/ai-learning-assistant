-- ============================================
-- UGC Questions Helper Functions
-- ============================================

-- 增加 UGC 題目使用計數的函數
CREATE OR REPLACE FUNCTION increment_ugc_usage_count(question_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE ugc_questions
  SET usage_count = usage_count + 1
  WHERE id = ANY(question_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 批量審核 UGC 題目的函數（管理員使用）
CREATE OR REPLACE FUNCTION approve_ugc_questions(question_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE ugc_questions
  SET review_status = 'APPROVED',
      updated_at = NOW()
  WHERE id = ANY(question_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 批量拒絕 UGC 題目的函數（管理員使用）
CREATE OR REPLACE FUNCTION reject_ugc_questions(question_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE ugc_questions
  SET review_status = 'REJECTED',
      updated_at = NOW()
  WHERE id = ANY(question_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 為 UGC 題目創建者發放獎勵的函數
CREATE OR REPLACE FUNCTION reward_ugc_creator(
  question_id UUID,
  reward_amount DECIMAL(12, 2)
)
RETURNS void AS $$
DECLARE
  creator_id UUID;
BEGIN
  -- 獲取題目創建者 ID
  SELECT designer_id INTO creator_id
  FROM ugc_questions
  WHERE id = question_id;

  IF creator_id IS NOT NULL THEN
    -- 更新創建者錢包餘額
    UPDATE profiles
    SET user_wallet_balance = user_wallet_balance + reward_amount
    WHERE id = creator_id;

    -- 更新題目的累計獎勵
    UPDATE ugc_questions
    SET total_rewards = total_rewards + reward_amount
    WHERE id = question_id;

    -- 創建交易記錄
    INSERT INTO transactions (
      user_id,
      amount,
      transaction_type,
      status,
      metadata
    ) VALUES (
      creator_id,
      reward_amount,
      'REWARD',
      'SUCCESS',
      jsonb_build_object(
        'source', 'ugc_question',
        'question_id', question_id,
        'reason', 'question_usage_reward'
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
