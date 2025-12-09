-- ============================================================================
-- Migration: Secure Practice Mode Scoring
-- ============================================================================
-- Purpose: 
-- 1. Create a secure RPC function for atomic score updates
-- 2. Restrict client-side updates to practice_participants
-- Date: 2025-12-08
-- ============================================================================

-- Function: Atomic Score Increment
-- This function handles the game logic server-side to prevent race conditions and cheating
CREATE OR REPLACE FUNCTION increment_practice_score(
  p_room_id UUID,
  p_user_id UUID,
  p_is_correct BOOLEAN,
  p_points INTEGER DEFAULT 1
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (postgres/service_role)
SET search_path = public
AS $$
DECLARE
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_current_net INTEGER;
  v_new_net INTEGER;
  v_current_correct INTEGER;
  v_new_correct INTEGER;
  v_record_exists BOOLEAN;
BEGIN
  -- 1. Check if record exists and lock it for update
  SELECT EXISTS(
    SELECT 1 FROM practice_participants 
    WHERE room_id = p_room_id AND user_id = p_user_id
  ) INTO v_record_exists;

  IF NOT v_record_exists THEN
     -- Should not happen in normal flow, but handle gracefully or error
     RETURN jsonb_build_object('success', false, 'error', 'Participant record not found');
  END IF;

  -- 2. Get current values
  SELECT 
    COALESCE(current_streak, 0),
    COALESCE(net_progress, 0),
    COALESCE(correct_count, 0)
  INTO 
    v_current_streak,
    v_current_net,
    v_current_correct
  FROM practice_participants
  WHERE room_id = p_room_id AND user_id = p_user_id
  FOR UPDATE; -- Lock row

  -- 3. Calculate new values
  IF p_is_correct THEN
    v_new_streak := v_current_streak + 1;
    v_new_net := v_current_net + p_points;
    v_new_correct := v_current_correct + 1;
  ELSE
    v_new_streak := 0; -- Reset streak
    -- Optional: Penalize net progress? For now, we only add points for correct answers.
    -- If we wanted penalty: v_new_net := GREATEST(0, v_current_net - 1);
    v_new_net := v_current_net; 
    v_new_correct := v_current_correct;
  END IF;

  -- 4. Update record
  UPDATE practice_participants
  SET 
    current_streak = v_new_streak,
    net_progress = v_new_net,
    correct_count = v_new_correct,
    current_question_index = current_question_index + 1,
    last_active_at = NOW()
  WHERE room_id = p_room_id AND user_id = p_user_id;

  -- 5. Return new state
  RETURN jsonb_build_object(
    'success', true,
    'new_streak', v_new_streak,
    'new_net_progress', v_new_net,
    'new_correct_count', v_new_correct
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RLS: Revoke UPDATE permission for authenticated users
-- Users should rely on the RPC function above via Server Action
ALTER TABLE practice_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it's too permissive (assuming standard policy name)
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON practice_participants;

-- Create stricter policies (if they don't exist, generic names)
-- SELECT: Users can see everyone in the same room (for leaderboard)
CREATE POLICY "Enable select for room participants" 
ON practice_participants FOR SELECT 
USING (
  room_id IN (
    SELECT room_id FROM practice_participants WHERE user_id = auth.uid()
  )
);

-- UPDATE: Only service role can update directly (or via SECURIY DEFINER RPC)
-- No policy needed for UPDATE since default deny applies unless explicit policy exists.
-- The RPC uses SECURITY DEFINER so it bypasses RLS for the update.
