# 每日任務快速修復指南

## 🎯 當前問題

1. ❌ **任務顯示錯誤的題型**：「閱讀理解」（不存在於題庫中）
2. ✅ **題庫現狀**：目前只有英文題目

## 🚀 解決方案：改為英文專屬任務

由於你們目前只有英文題庫，我已經創建了一個簡化版的任務生成函數，只生成英文相關的任務。

---

## 📋 執行步驟

### 步驟 1：在 Supabase Dashboard 執行 SQL

打開 **Supabase Dashboard → SQL Editor**，執行以下 SQL：

```sql
-- ============================================================
-- 更新每日任務生成邏輯為「英文專屬」
-- ============================================================

-- 1. 刪除舊函數
DROP FUNCTION IF EXISTS generate_daily_missions(UUID);

-- 2. 創建新的英文專屬任務生成函數
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_missions JSONB := '[]'::jsonb;
BEGIN
  -- 檢查今天是否已有任務
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- 任務 1：英文練習（主要任務）
  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', 'english',
    'title', '英文練習',
    'description', '完成 2 場英文對戰',
    'target_count', 2,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 50, 'gold', 20)
  );

  -- 任務 2：互動任務（隨機二選一）
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

  -- 任務 3：複習錯題
  v_missions := v_missions || jsonb_build_object(
    'id', 'm3_' || floor(random() * 10000)::text,
    'type', 'review_error',
    'subtype', 'any',
    'title', '複習錯題',
    'description', '複習 3 題錯題',
    'target_count', 3,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 40, 'gold', 15)
  );

  -- 插入數據庫
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 刪除今天的舊任務（強制重新生成）
DELETE FROM daily_missions WHERE mission_date = CURRENT_DATE;

-- 4. 驗證
SELECT 'Daily missions updated to English-only mode' as status;
```

---

### 步驟 2：刷新頁面

1. 訪問 http://localhost:3000/play
2. Widget 會自動生成新任務
3. 你應該會看到：
   - ✅ **英文練習**：完成 2 場英文對戰
   - ✅ **照顧夥伴** 或 **對戰勝利**（隨機）
   - ✅ **複習錯題**：複習 3 題錯題

---

## 🎨 預期 UI 效果

更新後的 Widget 應該顯示：

```
┌─────────────────────────────────────────────┐
│ ✨ 今日任務               0%                │
│ 完成所有任務領取大獎                         │
│ ────────────────────────────────              │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ 📖 英文練習                          │     │
│ │ 完成 2 場英文對戰                    │     │
│ │ 0/2 · 50 XP + 20 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ❤️ 照顧夥伴                          │     │
│ │ 餵食學習夥伴 1 次                    │     │
│ │ 0/1 · 30 XP + 10 金幣                │     │
│ └─────────────────────────────────────┘     │
│                                               │
│ ┌─────────────────────────────────────┐     │
│ │ ⭐ 複習錯題                          │     │
│ │ 複習 3 題錯題                        │     │
│ │ 0/3 · 40 XP + 15 金幣                │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 🔄 未來擴展

當你們添加更多學科題庫時，可以修改函數來支持多學科任務：

```sql
-- 示例：多學科版本（未來使用）
CASE (random() * 3)::int
  WHEN 0 THEN
    v_mission_1_title := '英文練習';
    v_subject := 'english';
  WHEN 1 THEN
    v_mission_1_title := '數學訓練';
    v_subject := 'math';
  ELSE
    v_mission_1_title := '國文特訓';
    v_subject := 'chinese';
END CASE;
```

---

## 📝 總結

- ✅ **簡化任務生成**：只生成英文相關任務
- ✅ **移除不存在的題型**：不再顯示「閱讀理解」等
- ✅ **更清晰的命名**：「英文練習」、「對戰勝利」、「複習錯題」
- ✅ **自動清除舊任務**：執行 SQL 後會立即重新生成

執行完 SQL 後，刷新頁面即可看到更新後的任務！
