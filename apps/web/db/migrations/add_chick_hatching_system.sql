-- Migration: Add Chick Hatching & Naming System
-- Description: Adds columns for chick naming, hatching ceremony, and reunion system
-- Date: 2025-11-30

-- Add chick naming columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS chick_name TEXT,
ADD COLUMN IF NOT EXISTS user_nickname TEXT,
ADD COLUMN IF NOT EXISTS chick_hatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS chick_first_fed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Ensure no default to keep the column nullable and backward compatible
ALTER TABLE profiles
  ALTER COLUMN last_seen_at DROP DEFAULT;

-- Composite index aligned with per-user reunion lookups
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at_user ON profiles(id, last_seen_at);

-- Add comment for documentation
COMMENT ON COLUMN profiles.chick_name IS 'Name given to the chick by the user during hatching ceremony';
COMMENT ON COLUMN profiles.user_nickname IS 'Nickname the chick uses to address the user';
COMMENT ON COLUMN profiles.chick_hatched_at IS 'Timestamp when the user completed the hatching ceremony';
COMMENT ON COLUMN profiles.chick_first_fed_at IS 'Timestamp when the user completed the first feed tutorial';
COMMENT ON COLUMN profiles.last_seen_at IS 'Last time the user was active, used for reunion system';

-- Atomic whistle redemption helper
CREATE OR REPLACE FUNCTION public.use_chick_whistle(p_user_id UUID, p_cost INTEGER DEFAULT 50)
RETURNS TABLE (
  coins INTEGER,
  user_wallet_balance NUMERIC,
  chick_emotion_state TEXT,
  last_seen_at TIMESTAMPTZ,
  chick_name TEXT,
  user_nickname TEXT,
  chick_hatched_at TIMESTAMPTZ
) AS $$
DECLARE
  v_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  SELECT COALESCE(p.coins::NUMERIC, p.user_wallet_balance, 0)
  INTO v_balance
  FROM profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PROFILE_NOT_FOUND';
  END IF;

  IF v_balance < p_cost THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INSUFFICIENT_FUNDS';
  END IF;

  v_new_balance := v_balance - p_cost;

  UPDATE profiles p
  SET
    coins = GREATEST(v_new_balance, 0)::INTEGER,
    user_wallet_balance = GREATEST(v_new_balance, 0),
    chick_emotion_state = 'normal',
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE p.id = p_user_id
  RETURNING p.coins,
            p.user_wallet_balance,
            p.chick_emotion_state,
            p.last_seen_at,
            p.chick_name,
            p.user_nickname,
            p.chick_hatched_at
  INTO coins, user_wallet_balance, chick_emotion_state, last_seen_at, chick_name, user_nickname, chick_hatched_at;

  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;
