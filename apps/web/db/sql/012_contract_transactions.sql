-- ============================================
-- PostgreSQL 臨時交易函數（合約鎖定/結算）
-- ============================================
-- 技術備註：
-- - 使用 SELECT FOR UPDATE 實現悲觀鎖
-- - 確保原子性交易
-- - 臨時解決方案：高併發下延遲較高，後續遷移至 FoundationDB

-- 1. 鎖定合約金額
CREATE OR REPLACE FUNCTION lock_contract_amount(
  p_user_id UUID,
  p_amount DECIMAL(12, 2),
  p_contract_type TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
  v_contract_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 設置過期時間（默認 24 小時）
  v_expires_at := COALESCE(p_expires_at, NOW() + INTERVAL '24 hours');

  -- 使用 SELECT FOR UPDATE 悲觀鎖鎖定用戶餘額
  SELECT user_wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- 檢查餘額是否足夠
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'INSUFFICIENT_BALANCE'
    );
  END IF;

  -- 計算新餘額
  v_new_balance := v_current_balance - p_amount;

  -- 更新用戶餘額
  UPDATE profiles
  SET user_wallet_balance = v_new_balance
  WHERE id = p_user_id;

  -- 創建合約記錄
  INSERT INTO contract_escrows (
    creator_id,
    amount,
    status,
    contract_type,
    expires_at
  )
  VALUES (
    p_user_id,
    p_amount,
    'LOCKED',
    p_contract_type,
    v_expires_at
  )
  RETURNING id INTO v_contract_id;

  -- 創建交易記錄
  INSERT INTO transactions (
    user_id,
    amount,
    transaction_type,
    status,
    contract_id
  )
  VALUES (
    p_user_id,
    -p_amount,
    'ESCROW_LOCK',
    'SUCCESS',
    v_contract_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', v_contract_id,
    'amount', p_amount,
    'expires_at', v_expires_at
  );
END;
$$;

-- 2. 結算合約
CREATE OR REPLACE FUNCTION settle_contract(
  p_contract_id UUID,
  p_winner_id UUID,
  p_match_id UUID DEFAULT NULL,
  p_settled_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_creator_id UUID;
  v_challenger_id UUID;
  v_amount DECIMAL(12, 2);
  v_transaction_id UUID;
BEGIN
  -- 使用 SELECT FOR UPDATE 悲觀鎖鎖定合約記錄
  SELECT * INTO v_contract
  FROM contract_escrows
  WHERE id = p_contract_id
  FOR UPDATE;

  -- 檢查合約是否存在
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CONTRACT_NOT_FOUND'
    );
  END IF;

  -- 檢查合約狀態
  IF v_contract.status != 'LOCKED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CONTRACT_ALREADY_SETTLED'
    );
  END IF;

  v_creator_id := v_contract.creator_id;
  v_challenger_id := v_contract.challenger_id;
  v_amount := v_contract.amount;

  -- 更新合約狀態
  UPDATE contract_escrows
  SET
    status = 'SETTLED',
    winner_id = p_winner_id,
    match_id = p_match_id,
    settled_at = NOW()
  WHERE id = p_contract_id;

  -- 獲勝者獲得全部金額（2倍）
  -- 使用 SELECT FOR UPDATE 鎖定獲勝者餘額
  UPDATE profiles
  SET user_wallet_balance = user_wallet_balance + (v_amount * 2)
  WHERE id = p_winner_id;

  -- 創建獲勝者交易記錄
  INSERT INTO transactions (
    user_id,
    amount,
    transaction_type,
    status,
    contract_id
  )
  VALUES (
    p_winner_id,
    v_amount * 2,
    'CONTRACT_SETTLE',
    'SUCCESS',
    p_contract_id
  )
  RETURNING id INTO v_transaction_id;

-- 3. 承接合約
CREATE OR REPLACE FUNCTION accept_contract(
  p_contract_id UUID,
  p_challenger_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
  v_challenger_balance DECIMAL(12, 2);
  v_amount DECIMAL(12, 2);
BEGIN
  -- 使用 SELECT FOR UPDATE 悲觀鎖鎖定合約記錄
  SELECT * INTO v_contract
  FROM contract_escrows
  WHERE id = p_contract_id
  FOR UPDATE;

  -- 檢查合約是否存在
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CONTRACT_NOT_FOUND'
    );
  END IF;

  -- 檢查合約狀態
  IF v_contract.status != 'PENDING' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CONTRACT_NOT_AVAILABLE'
    );
  END IF;

  -- 檢查是否為自己的合約
  IF v_contract.creator_id = p_challenger_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'CANNOT_ACCEPT_OWN_CONTRACT'
    );
  END IF;

  v_amount := v_contract.amount;

  -- 檢查挑戰者餘額
  SELECT user_wallet_balance INTO v_challenger_balance
  FROM profiles
  WHERE id = p_challenger_id
  FOR UPDATE;

  IF v_challenger_balance < v_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'INSUFFICIENT_BALANCE'
    );
  END IF;

  -- 鎖定挑戰者金額
  UPDATE profiles
  SET user_wallet_balance = user_wallet_balance - v_amount
  WHERE id = p_challenger_id;

  -- 更新合約狀態
  UPDATE contract_escrows
  SET
    status = 'LOCKED',
    challenger_id = p_challenger_id
  WHERE id = p_contract_id;

  -- 創建挑戰者交易記錄
  INSERT INTO transactions (
    user_id,
    amount,
    transaction_type,
    status,
    contract_id
  )
  VALUES (
    p_challenger_id,
    -v_amount,
    'ESCROW_LOCK',
    'SUCCESS',
    p_contract_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'contract_id', p_contract_id,
    'challenger_id', p_challenger_id
  );
END;
$$;

