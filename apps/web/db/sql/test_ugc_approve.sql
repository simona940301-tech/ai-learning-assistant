-- ============================================
-- 測試用戶自創題目審核
-- ============================================
-- 使用此腳本快速審核待審核的題目

-- 1. 查看所有待審核題目
SELECT
  id,
  question_text,
  subject,
  difficulty,
  review_status,
  created_at,
  designer_id
FROM ugc_questions
WHERE review_status = 'PENDING'
ORDER BY created_at DESC;

-- 2. 審核通過單個題目（替換 'question_id_here' 為實際 ID）
-- UPDATE ugc_questions
-- SET review_status = 'APPROVED'
-- WHERE id = 'question_id_here';

-- 3. 批量審核通過最新的 5 個題目
-- UPDATE ugc_questions
-- SET review_status = 'APPROVED'
-- WHERE id IN (
--   SELECT id FROM ugc_questions
--   WHERE review_status = 'PENDING'
--   ORDER BY created_at DESC
--   LIMIT 5
-- );

-- 4. 拒絕單個題目
-- UPDATE ugc_questions
-- SET review_status = 'REJECTED'
-- WHERE id = 'question_id_here';

-- 5. 查看已審核通過的題目
SELECT
  id,
  question_text,
  subject,
  difficulty,
  usage_count,
  total_rewards,
  created_at
FROM ugc_questions
WHERE review_status = 'APPROVED'
ORDER BY created_at DESC
LIMIT 10;

-- 6. 查看題目統計
SELECT
  review_status,
  subject,
  COUNT(*) as count
FROM ugc_questions
GROUP BY review_status, subject
ORDER BY review_status, subject;
