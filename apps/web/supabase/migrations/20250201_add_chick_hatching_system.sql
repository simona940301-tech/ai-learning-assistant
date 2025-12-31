-- ============================================================================
-- Chick Hatching & Reunion System Migration
-- ============================================================================
-- Adds necessary columns for the hatching ceremony and reunion system
-- Part of the 9 high-priority UX features implementation

-- Add chick naming and hatching columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_nickname TEXT; 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_hatched_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS chick_first_fed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_chick_hatched_at ON profiles(chick_hatched_at);

-- Update existing RLS policies for new columns (already covered by existing profile policies)

-- Add chick whistle function for reunion system
CREATE OR REPLACE FUNCTION use_chick_whistle(
  p_user_id UUID,
  p_cost INTEGER DEFAULT 50
) 
RETURNS TABLE(
  coins INTEGER,
  user_wallet_balance DECIMAL(12,2),
  chick_emotion_state TEXT,
  last_seen_at TIMESTAMPTZ,
  chick_name TEXT,
  user_nickname TEXT,
  chick_hatched_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance DECIMAL(12,2);
  current_coins INTEGER;
BEGIN
  -- Get current user state
  SELECT 
    COALESCE(user_wallet_balance, 0),
    COALESCE(coins, 0)
  INTO 
    current_balance,
    current_coins
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Check if profile exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  
  -- Check if user has enough coins
  IF current_coins < p_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;
  
  -- Deduct coins and reset chick state
  UPDATE profiles 
  SET 
    coins = coins - p_cost,
    chick_emotion_state = 'normal',
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return updated state
  RETURN QUERY
  SELECT 
    p.coins,
    p.user_wallet_balance,
    p.chick_emotion_state,
    p.last_seen_at,
    p.chick_name,
    p.user_nickname,
    p.chick_hatched_at
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION use_chick_whistle(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION use_chick_whistle IS 'Allows users to spend coins to call back a runaway chick';