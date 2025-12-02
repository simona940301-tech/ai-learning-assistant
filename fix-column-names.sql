-- ============================================================
-- 修復 onboarding_questions 表的列名不匹配問題
-- ============================================================
-- 
-- 問題：數據庫實際列名是 option_a_text, option_b_text 等
-- 但 API 和代碼期望的是 option_a, option_b 等
-- 
-- 解決方案：重命名列名以匹配 schema 定義
-- ============================================================

-- 步驟 1: 檢查當前列名
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND (column_name LIKE 'option%' OR column_name = 'correct_answer')
ORDER BY column_name;

-- 步驟 2: 如果列名是 option_a_text 等，重命名為 option_a 等
-- 注意：執行前請先確認實際列名！

-- 重命名 option_a_text 為 option_a（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'onboarding_questions' 
    AND column_name = 'option_a_text'
  ) THEN
    ALTER TABLE onboarding_questions RENAME COLUMN option_a_text TO option_a;
    RAISE NOTICE 'Renamed option_a_text to option_a';
  END IF;
END $$;

-- 重命名 option_b_text 為 option_b（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'onboarding_questions' 
    AND column_name = 'option_b_text'
  ) THEN
    ALTER TABLE onboarding_questions RENAME COLUMN option_b_text TO option_b;
    RAISE NOTICE 'Renamed option_b_text to option_b';
  END IF;
END $$;

-- 重命名 option_c_text 為 option_c（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'onboarding_questions' 
    AND column_name = 'option_c_text'
  ) THEN
    ALTER TABLE onboarding_questions RENAME COLUMN option_c_text TO option_c;
    RAISE NOTICE 'Renamed option_c_text to option_c';
  END IF;
END $$;

-- 重命名 option_d_text 為 option_d（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'onboarding_questions' 
    AND column_name = 'option_d_text'
  ) THEN
    ALTER TABLE onboarding_questions RENAME COLUMN option_d_text TO option_d;
    RAISE NOTICE 'Renamed option_d_text to option_d';
  END IF;
END $$;

-- 步驟 3: 驗證重命名結果
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'onboarding_questions' 
AND (column_name LIKE 'option%' OR column_name = 'correct_answer')
ORDER BY column_name;

-- 步驟 4: 測試查詢（確認數據可正常讀取）
SELECT 
  id,
  LEFT(question_text, 50) as question_preview,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_answer,
  difficulty_level,
  is_active,
  subject
FROM onboarding_questions
WHERE is_active = true 
  AND subject = 'english'
  AND difficulty_level BETWEEN 1 AND 3
LIMIT 5;

