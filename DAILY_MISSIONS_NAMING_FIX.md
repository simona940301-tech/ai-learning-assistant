# 每日任務命名修正說明

## 🔍 問題分析

你看到的任務名稱（「閱讀理解」、「勝利滋味」、「溫故知新」）來自舊的任務生成函數，該函數使用了錯誤的題型分類。

### 舊的邏輯（錯誤）
```sql
v_weak_areas := ARRAY['vocabulary', 'reading', 'cloze'];  -- ❌ 不符合你們的系統
```

這些分類（vocabulary、reading、cloze）不是你們系統實際使用的分類方式。

---

## ✅ 修正後的邏輯

根據你們的數據庫架構（`seed_questions` 表），你們使用的是 **學科分類**：

- `chinese` - 國文
- `english` - 英文
- `math` - 數學
- `science` - 自然科學
- `social` - 社會科學

### 新的任務命名

| 學科 | 任務標題 | 描述 |
|------|---------|------|
| english | 英文挑戰 | 完成 2 場英文對戰 |
| math | 數學訓練 | 完成 2 場數學對戰 |
| chinese | 國文特訓 | 完成 2 場國文對戰 |
| science | 自然科學 | 完成 2 場自然科對戰 |
| social | 社會科學 | 完成 2 場社會科對戰 |

### Mission 2（隨機二選一）
- **照顧夥伴**：餵食學習夥伴 1 次
- **對戰勝利**：贏得 1 場對戰

### Mission 3（固定）
- **溫故知新**：複習 3 題錯題

---

## 🚀 如何應用修正

### 步驟 1：在 Supabase Dashboard 執行更新

打開 **SQL Editor**，執行以下 SQL：

```sql
-- 複製整個 apps/web/db/sql/027_daily_missions_v2_updated.sql 的內容
```

或者直接執行下方的快速版本：

<details>
<summary>點擊展開完整 SQL</summary>

```sql
-- Drop old function
DROP FUNCTION IF EXISTS generate_daily_missions(UUID);

-- Create updated function with correct subject mapping
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_weak_subjects TEXT[];
  v_missions JSONB := '[]'::jsonb;
  v_weak_subject TEXT;
  v_mission_1_title TEXT;
  v_mission_1_desc TEXT;
BEGIN
  -- Check if missions already exist for today
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- Try to get weak subjects from onboarding
  BEGIN
    SELECT weak_areas INTO v_weak_subjects
    FROM onboarding_task_configs
    WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_weak_subjects := NULL;
  END;

  -- Default subjects if no config
  IF v_weak_subjects IS NULL OR array_length(v_weak_subjects, 1) = 0 THEN
    v_weak_subjects := ARRAY['english', 'math', 'chinese'];
  END IF;

  -- Pick random weak subject
  v_weak_subject := v_weak_subjects[1 + floor(random() * array_length(v_weak_subjects, 1))::int];

  -- Map to user-friendly names
  CASE v_weak_subject
    WHEN 'english' THEN
      v_mission_1_title := '英文挑戰';
      v_mission_1_desc := '完成 2 場英文對戰';
    WHEN 'math' THEN
      v_mission_1_title := '數學訓練';
      v_mission_1_desc := '完成 2 場數學對戰';
    WHEN 'chinese' THEN
      v_mission_1_title := '國文特訓';
      v_mission_1_desc := '完成 2 場國文對戰';
    WHEN 'science' THEN
      v_mission_1_title := '自然科學';
      v_mission_1_desc := '完成 2 場自然科對戰';
    WHEN 'social' THEN
      v_mission_1_title := '社會科學';
      v_mission_1_desc := '完成 2 場社會科對戰';
    ELSE
      v_mission_1_title := '學科挑戰';
      v_mission_1_desc := '完成 2 場對戰';
  END CASE;

  -- Mission 1: Subject battle
  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', v_weak_subject,
    'title', v_mission_1_title,
    'description', v_mission_1_desc,
    'target_count', 2,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 50, 'gold', 20)
  );

  -- Mission 2: Random engagement
  IF random() > 0.5 THEN
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', 'feed_chick',
      'subtype', 'any',
      'title', '照顧夥伴',
      'description', '餵食學習夥伴 1 次',
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
      'title', '對戰勝利',
      'description', '贏得 1 場對戰',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 40, 'gold', 15)
    );
  END IF;

  -- Mission 3: Error review
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

  -- Insert into DB
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

</details>

---

### 步驟 2：刪除舊的任務記錄

執行以下 SQL 來清除今天的舊任務（這樣會重新生成新的）：

```sql
-- 刪除今天的舊任務（將使用新邏輯重新生成）
DELETE FROM daily_missions
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
AND mission_date = CURRENT_DATE;
```

---

### 步驟 3：重新加載頁面

1. 刷新 http://localhost:3000/play
2. Widget 會自動調用 API 生成新任務
3. 你應該會看到更準確的任務名稱（例如「英文挑戰」而不是「閱讀理解」）

---

## 📊 預期結果

更新後，Widget 應該顯示：

```
┌─────────────────────────────────────────────┐
│ ✨ 今日任務               0%                │
│ ────────────────────────────────              │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ 📚 英文挑戰：完成 2 場英文對戰       │     │
│ │ 0/2 · 50 XP + 20 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ❤️ 照顧夥伴：餵食學習夥伴 1 次       │     │
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

## 🎯 進一步優化建議

如果你想讓任務更加個性化，可以考慮：

### 1. 連接用戶弱點數據

修改 `onboarding_task_configs` 表，記錄用戶在 onboarding 時選擇的弱科目：

```sql
-- 為 mock user 設置弱科目（示例）
INSERT INTO onboarding_task_configs (user_id, weak_areas)
VALUES ('e770f9cd-52a7-43de-b983-70f6f78d2f53', ARRAY['english', 'math'])
ON CONFLICT (user_id) DO UPDATE
SET weak_areas = EXCLUDED.weak_areas;
```

### 2. 根據答題歷史動態調整

未來可以從 `battle_history` 或 `error_book` 表分析用戶答題情況，自動更新 `weak_areas`。

### 3. 更多任務變化

可以添加更多任務類型：
- 「連勝挑戰」：連贏 3 場對戰
- 「速戰速決」：20 秒內答對 5 題
- 「完美表現」：達到 90% 正確率

---

## 📝 總結

- ❌ **舊命名**：「閱讀理解」（不符合系統）
- ✅ **新命名**：「英文挑戰」、「數學訓練」等（符合學科分類）
- 🔧 **修復方式**：執行 `027_daily_missions_v2_updated.sql` + 刪除舊任務
- 🎯 **長期優化**：連接用戶弱點數據，實現真正的個性化任務
