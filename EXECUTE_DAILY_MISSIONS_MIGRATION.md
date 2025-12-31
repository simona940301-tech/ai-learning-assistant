# 執行每日任務系統遷移

## 快速執行指南

### 步驟 1：打開 Supabase Dashboard

1. 訪問 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**

### 步驟 2：執行安全遷移腳本

將以下文件的完整內容複製並粘貼到 SQL Editor：

**文件位置：** `apps/web/db/sql/026_daily_missions_safe.sql`

或者直接複製下方的 SQL：

```sql
-- ============================================================
-- Migration: 026_daily_missions_safe.sql
-- Description: Safe version - can be run multiple times
-- Created: 2025-11-25
-- ============================================================

-- =============================================
-- 1. Daily Missions Table (Safe)
-- =============================================
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_date DATE DEFAULT CURRENT_DATE,
  missions JSONB DEFAULT '[]'::jsonb,
  all_completed BOOLEAN DEFAULT false,
  rewards_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_date)
);

-- Indexes (Safe - only create if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_daily_missions_user_date'
  ) THEN
    CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, mission_date);
  END IF;
END $$;

-- =============================================
-- 2. RLS Policies (Safe)
-- =============================================
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own daily missions" ON daily_missions;
DROP POLICY IF EXISTS "Users can update own daily missions" ON daily_missions;
DROP POLICY IF EXISTS "Users can insert own daily missions" ON daily_missions;

-- Recreate policies
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

  -- Mission 1: Weakness Training
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
-- 5. Trigger to update updated_at (Safe)
-- =============================================
DROP TRIGGER IF EXISTS daily_missions_updated_at ON daily_missions;

-- Check if the function exists before creating trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_onboarding_updated_at'
  ) THEN
    CREATE TRIGGER daily_missions_updated_at
      BEFORE UPDATE ON daily_missions
      FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();
  ELSE
    -- Create a simple updated_at function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_daily_missions_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER daily_missions_updated_at
      BEFORE UPDATE ON daily_missions
      FOR EACH ROW EXECUTE FUNCTION update_daily_missions_updated_at();
  END IF;
END $$;

-- =============================================
-- 6. Comments
-- =============================================
COMMENT ON TABLE daily_missions IS 'Personalized daily missions generated based on user onboarding data and weak areas';
COMMENT ON FUNCTION generate_daily_missions IS 'Generates 3 personalized daily missions for a user based on their weak areas from onboarding';
COMMENT ON FUNCTION update_mission_progress IS 'Updates mission progress and marks as completed when target is reached';

-- =============================================
-- 7. Verification Query
-- =============================================
-- Run this to verify the setup
SELECT
  'daily_missions table' as check_item,
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'daily_missions'
  ) as exists;

SELECT
  'generate_daily_missions function' as check_item,
  EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'generate_daily_missions'
  ) as exists;

SELECT
  'update_mission_progress function' as check_item,
  EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'update_mission_progress'
  ) as exists;
```

### 步驟 3：點擊 RUN 執行

執行後，你應該看到以下驗證結果：

```
check_item                           | exists
-------------------------------------|--------
daily_missions table                 | true
generate_daily_missions function     | true
update_mission_progress function     | true
```

### 步驟 4：為你的帳號生成今日任務

執行以下 SQL（替換 `YOUR_USER_ID`）：

```sql
-- 1. 獲取你的 user_id（如果不知道）
SELECT id, email FROM auth.users LIMIT 5;

-- 2. 為你的帳號生成今日任務（替換下面的 UUID）
SELECT generate_daily_missions('YOUR_USER_ID');
```

### 步驟 5：啟動開發服務器測試

```bash
pnpm dev
```

訪問 [http://localhost:3000/play](http://localhost:3000/play)

你應該會在 Play 頁面看到每日任務 Widget，位置在：
- **「選擇你的對戰模式，開始挑戰」**標題下方
- **系統對戰、自訂對戰等卡片**上方

---

## 預期的 Widget 外觀

```
┌─────────────────────────────────────────────┐
│ ✨ 今日任務               0%                │
│ ────────────────────────────────              │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ 🧠 單字特訓：完成 2 場對戰           │     │
│ │ 0/2 · 50 XP + 20 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ❤️ 照顧夥伴：餵食 1 次               │     │
│ │ 0/1 · 30 XP + 10 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ⭐ 溫故知新：複習 3 題錯題           │     │
│ │ 0/3 · 40 XP + 15 金幣                │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 測試進度追蹤

### 測試 1：完成一場對戰

1. 在 Play 頁面點擊「系統對戰」或「自訂對戰」
2. 完成一場對戰（不論輸贏）
3. 檢查：
   - 是否出現 Toast 通知：「任務進度更新」
   - Widget 中「單字特訓」的進度是否變成 `1/2`

### 測試 2：贏得對戰

1. 完成並贏得一場對戰
2. 檢查：
   - 是否出現額外的 Toast（如果任務包含「勝利滋味」）
   - 進度條百分比是否更新

### 測試 3：餵食 Chick

1. 訪問 Profile 或 Chick 頁面
2. 餵食學習夥伴
3. 檢查：
   - 是否出現 Toast：「照顧夥伴 +1」
   - Widget 中「照顧夥伴」任務是否標記為完成（綠色勾選）

### 測試 4：完成所有任務

1. 完成所有 3 個任務
2. 檢查：
   - Widget 是否顯示金色閃爍的「領取今日獎勵」按鈕
   - 進度條是否顯示 100%

---

## 故障排查

### 問題：執行 SQL 後出現錯誤

**檢查：**
- 確保你在 Supabase Dashboard 的 SQL Editor 中執行
- 檢查錯誤信息是否與表權限相關

### 問題：Widget 仍然不顯示

**檢查：**
1. 打開瀏覽器 DevTools（F12）
2. 查看 Console 是否有錯誤
3. 查看 Network 標籤，檢查 `/api/missions/daily` 的響應：
   - 應返回 200 狀態碼
   - 響應體應包含 `missions` 數組

### 問題：進度沒有更新

**檢查：**
1. Console 中是否看到 `[Mission Tracker]` 日誌
2. Network 標籤中是否有 `/api/missions/progress` 請求
3. 如果沒有，檢查 `mission-tracker.ts` 是否正確導入

---

## 需要幫助？

如果遇到問題，請提供：
1. SQL 執行的錯誤信息（如果有）
2. 瀏覽器 Console 的錯誤日誌
3. Network 請求的響應內容

我會幫你進一步診斷！
