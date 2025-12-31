# 檢查每日任務系統狀態

## 問題：看不到每日任務 Widget

### 可能的原因

1. **數據庫遷移未執行** ⚠️
2. **今日任務尚未生成**
3. **API 調用失敗**

---

## 快速診斷步驟

### 步驟 1：檢查數據庫表是否存在

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 檢查 daily_missions 表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'daily_missions'
) AS table_exists;
```

**預期結果：** `table_exists: true`

**如果返回 false：** 需要執行遷移

---

### 步驟 2：執行數據庫遷移

如果表不存在，在 SQL Editor 執行：

```sql
-- 複製整個 apps/web/db/sql/026_daily_missions.sql 的內容
-- 或者執行以下快速版本：
```

<details>
<summary>點擊查看完整 SQL（如果文件不存在）</summary>

```sql
-- ============================================================
-- Migration: 026_daily_missions.sql
-- ============================================================

-- 1. Daily Missions Table
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

CREATE INDEX idx_daily_missions_user_date ON daily_missions(user_id, mission_date);

-- 2. RLS Policies
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

-- 3. Mission Generation Function
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_weak_areas TEXT[];
  v_missions JSONB := '[]'::jsonb;
  v_weakness TEXT;
BEGIN
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  SELECT weak_areas INTO v_weak_areas
  FROM onboarding_task_configs
  WHERE user_id = p_user_id;

  IF v_weak_areas IS NULL OR array_length(v_weak_areas, 1) = 0 THEN
    v_weak_areas := ARRAY['vocabulary', 'reading', 'cloze'];
  END IF;

  v_weakness := v_weak_areas[1 + floor(random() * array_length(v_weak_areas, 1))::int];

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

  -- Mission 2: Engagement
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

  -- Mission 3: Review
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

  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mission Progress Update Function
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
  SELECT missions INTO v_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_missions IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions)
  LOOP
    IF (v_mission->>'type') = p_mission_type AND (v_mission->>'is_completed')::boolean = false THEN
      v_mission := jsonb_set(
        v_mission,
        '{current_count}',
        to_jsonb(LEAST((v_mission->>'current_count')::int + p_increment, (v_mission->>'target_count')::int))
      );

      IF (v_mission->>'current_count')::int >= (v_mission->>'target_count')::int THEN
        v_mission := jsonb_set(v_mission, '{is_completed}', 'true'::jsonb);
      END IF;
    END IF;

    v_updated_missions := v_updated_missions || v_mission;

    IF (v_mission->>'is_completed')::boolean = false THEN
      v_all_completed := false;
    END IF;
  END LOOP;

  UPDATE daily_missions
  SET
    missions = v_updated_missions,
    all_completed = v_all_completed,
    updated_at = NOW()
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  RETURN v_updated_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

</details>

---

### 步驟 3：手動為當前用戶生成任務

執行以下 SQL（替換 `YOUR_USER_ID`）：

```sql
-- 獲取當前用戶 ID（如果不知道）
SELECT id, email FROM auth.users LIMIT 1;

-- 為用戶生成今日任務（替換為您的 user_id）
SELECT generate_daily_missions('YOUR_USER_ID');
```

---

### 步驟 4：檢查 API 是否正常工作

在瀏覽器 Console（F12）執行：

```javascript
// 獲取今日任務
fetch('/api/missions/daily', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Daily Missions:', data))
  .catch(err => console.error('Error:', err))
```

**預期結果：**
```json
{
  "missions": [
    {
      "id": "m1_1234",
      "type": "play_battle",
      "title": "單字特訓",
      "target_count": 2,
      "current_count": 0,
      "is_completed": false,
      "reward": { "xp": 50, "gold": 20 }
    },
    // ... 其他任務
  ],
  "all_completed": false,
  "rewards_claimed": false
}
```

---

## 視覺檢查清單

### Widget 應該顯示在哪裡？

**位置：** Play 頁面（`/play`）

**外觀：**

#### 有任務時：
```
┌─────────────────────────────────────────────┐
│ ✨ 今日任務               75%               │
│ ────────────────────────────────              │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ 🧠 單字特訓：完成 2 場對戰           │     │
│ │ 1/2 · 50 XP + 20 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ❤️ 照顧夥伴：餵食 1 次               │  ✅ │
│ │ 1/1 · 30 XP + 10 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ⭐ 溫故知新：複習 3 題錯題           │     │
│ │ 0/3 · 40 XP + 15 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ [ 領取今日獎勵 ] ← 金色閃爍按鈕             │
└─────────────────────────────────────────────┘
```

#### 無任務或已領取時：
```
┌─────────────────────────────────────────────┐
│ ✨ 今日任務已完成！                         │
│ 明天再來挑戰新任務                           │
└─────────────────────────────────────────────┘
```

---

## 常見問題排查

### Q1: Widget 顯示「載入中...」但一直不變

**原因：** API 調用失敗或表不存在

**解決：**
1. 打開瀏覽器 DevTools（F12）
2. 查看 Console 是否有錯誤
3. 查看 Network 標籤，檢查 `/api/missions/daily` 的響應
4. 如果是 404/500 錯誤，檢查數據庫遷移

---

### Q2: Widget 顯示「今日任務已完成」但我還沒做任何事

**原因：** 任務可能是昨天的，或者數據庫中已有 `rewards_claimed: true`

**解決：**

```sql
-- 檢查當前用戶的任務狀態
SELECT * FROM daily_missions
WHERE user_id = 'YOUR_USER_ID'
AND mission_date = CURRENT_DATE;

-- 重置獎勵領取狀態（僅測試用）
UPDATE daily_missions
SET rewards_claimed = false
WHERE user_id = 'YOUR_USER_ID'
AND mission_date = CURRENT_DATE;
```

---

### Q3: 完成對戰後沒有進度更新

**原因：** 任務追蹤未正確觸發

**檢查：**
1. 打開 Console，完成一場對戰
2. 應該看到：
   ```
   [Mission Tracker] Event: BATTLE_COMPLETED
   ```
3. 如果沒有，檢查 `GamifiedMatchResultModal.tsx` 是否正確導入了 `trackMissionEvent`

---

## 快速測試流程

```bash
# 1. 啟動開發服務器
pnpm dev

# 2. 訪問 Play 頁面
http://localhost:3000/play

# 3. 檢查 Widget 是否顯示
#    - 應該在「選擇你的對戰模式，開始挑戰」下方
#    - 在「系統對戰」等卡片上方

# 4. 如果看到「載入中...」超過 5 秒
#    → 執行步驟 1-3 的數據庫檢查

# 5. 如果看到任務列表
#    → 完成一場對戰
#    → 檢查是否出現 Toast 通知
#    → 檢查進度是否更新

# 6. 如果看到「今日任務已完成」
#    → 執行步驟 2 的 Q2 重置命令
```

---

## 需要幫助？

如果以上步驟都無法解決問題，請提供：

1. 瀏覽器 Console 的錯誤信息
2. Network 標籤中 `/api/missions/daily` 的響應
3. 數據庫中 `daily_missions` 表的內容（可以遮蔽敏感信息）

我會幫您進一步診斷！
