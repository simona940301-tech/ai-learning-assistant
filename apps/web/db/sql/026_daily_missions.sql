-- ============================================================
-- Migration: 026_daily_missions.sql
-- Description: Daily mission system with personalized task generation
-- Created: 2025-11-25
-- ============================================================

-- =============================================
-- 1. Daily Missions Table
-- =============================================
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Mission Date (Unique per user per day)
  mission_date DATE DEFAULT CURRENT_DATE,
  
  -- Missions JSONB Structure:
  -- [
  --   {
  --     "id": "mission_1",
  --     "type": "play_battle",
  --     "subtype": "vocabulary",
  --     "title": "單字特訓",
  --     "description": "完成 2 場單字對戰",
  --     "target_count": 2,
  --     "current_count": 0,
  --     "is_completed": false,
  --     "reward": { "xp": 50, "gold": 20 }
  --   },
  --   ...
  -- ]
  missions JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  all_completed BOOLEAN DEFAULT false,
  rewards_claimed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: One record per user per day
  UNIQUE(user_id, mission_date)
);

-- Indexes
CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, mission_date);

-- =============================================
-- 2. RLS Policies
-- =============================================
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily missions"
  ON daily_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own daily missions"
  ON daily_missions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily missions"
  ON daily_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. Mission Generation Function
-- =============================================
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_weak_areas TEXT[];
  v_missions JSONB := '[]'::jsonb;
  v_weakness TEXT;
BEGIN
  -- 1. Check if missions already exist for today
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;
  
  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- 2. Fetch user's weak areas from onboarding config
  SELECT weak_areas INTO v_weak_areas
  FROM onboarding_task_configs
  WHERE user_id = p_user_id;
  
  -- Default if no config
  IF v_weak_areas IS NULL OR array_length(v_weak_areas, 1) = 0 THEN
    v_weak_areas := ARRAY['vocabulary', 'reading', 'cloze'];
  END IF;
  
  -- Pick a random weak area for Mission 1
  v_weakness := v_weak_areas[1 + floor(random() * array_length(v_weak_areas, 1))::int];

  -- 3. Generate 3 Missions
  
  -- Mission 1: Weakness Training (Personalized)
  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', v_weakness,
    'title', CASE 
      WHEN v_weakness = 'vocabulary' THEN '單字特訓'
      WHEN v_weakness = 'cloze' THEN '克漏字挑戰'
      WHEN v_weakness = 'reading' THEN '閱讀理解'
      ELSE '學科強化'
    END,
    'description', '完成 2 場對戰',
    'target_count', 2,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 50, 'gold', 20)
  );
  
  -- Mission 2: Engagement (Feed Chick or Win Battle)
  IF random() > 0.5 THEN
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', 'feed_chick',
      'subtype', 'any',
      'title', '照顧夥伴',
      'description', '餵食你的學習夥伴 1 次',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 30, 'gold', 10)
    );
  ELSE
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', 'win_battle',
      'subtype', 'any',
      'title', '勝利滋味',
      'description', '贏得 1 場對戰',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 40, 'gold', 15)
    );
  END IF;
  
  -- Mission 3: Review (Error Correction)
  v_missions := v_missions || jsonb_build_object(
    'id', 'm3_' || floor(random() * 10000)::text,
    'type', 'review_error',
    'subtype', 'any',
    'title', '溫故知新',
    'description', '複習 3 題錯題',
    'target_count', 3,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 40, 'gold', 15)
  );

  -- 4. Insert into DB
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);
  
  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Mission Progress Update Function
-- =============================================
CREATE OR REPLACE FUNCTION update_mission_progress(
  p_user_id UUID,
  p_mission_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_missions JSONB;
  v_mission JSONB;
  v_updated_missions JSONB := '[]'::jsonb;
  v_all_completed BOOLEAN := true;
BEGIN
  -- Get today's missions
  SELECT missions INTO v_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;
  
  IF v_missions IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update matching missions
  FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions)
  LOOP
    IF (v_mission->>'type') = p_mission_type AND (v_mission->>'is_completed')::boolean = false THEN
      -- Increment progress
      v_mission := jsonb_set(
        v_mission,
        '{current_count}',
        to_jsonb(LEAST((v_mission->>'current_count')::int + p_increment, (v_mission->>'target_count')::int))
      );
      
      -- Check if completed
      IF (v_mission->>'current_count')::int >= (v_mission->>'target_count')::int THEN
        v_mission := jsonb_set(v_mission, '{is_completed}', 'true'::jsonb);
      END IF;
    END IF;
    
    v_updated_missions := v_updated_missions || v_mission;
    
    -- Check if all completed
    IF (v_mission->>'is_completed')::boolean = false THEN
      v_all_completed := false;
    END IF;
  END LOOP;
  
  -- Update database
  UPDATE daily_missions
  SET 
    missions = v_updated_missions,
    all_completed = v_all_completed,
    updated_at = NOW()
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;
  
  RETURN v_updated_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Trigger to update updated_at
-- =============================================
CREATE TRIGGER daily_missions_updated_at
  BEFORE UPDATE ON daily_missions
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at(); -- Reusing existing function

-- =============================================
-- 6. Comments
-- =============================================
COMMENT ON TABLE daily_missions IS 'Personalized daily missions generated based on user onboarding data and weak areas';
COMMENT ON FUNCTION generate_daily_missions IS 'Generates 3 personalized daily missions for a user based on their weak areas from onboarding';
COMMENT ON FUNCTION update_mission_progress IS 'Updates mission progress and marks as completed when target is reached';
