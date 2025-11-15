-- ============================================
-- 插入測試題目（詳解卡格式）到 pack_questions
-- ============================================

-- 1) 先插入一個測試 pack（填滿所有必要欄位）
INSERT INTO packs (
  id,
  title,
  description,
  subject,
  topic,
  skill,
  grade,
  status
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '測試詳解卡 Pack',
  '用於測試詳解卡和錯題本功能',
  'math',           -- subject (必填)
  'algebra',        -- topic (必填)
  'linear_equation', -- skill (必填)
  'g9',             -- grade (必填)
  'published'
)
ON CONFLICT (id) DO UPDATE
SET
  subject = EXCLUDED.subject,
  topic = EXCLUDED.topic,
  skill = EXCLUDED.skill,
  grade = EXCLUDED.grade,
  status = EXCLUDED.status;

-- 2) 插入測試題目（choices 使用 TEXT[] 陣列）
INSERT INTO pack_questions (
  pack_id,
  stem,
  choices,
  answer,
  explanation,
  difficulty,
  has_explanation,
  "order"
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '求解方程式：2x + 4 = 10',
  ARRAY[
    'A. x = 1',
    'B. x = 2',
    'C. x = 3',
    'D. x = 4'
  ],
  'C',
  E'## 解題步驟\n\n1. **移項**：將 4 移到右邊\n   - 2x = 10 - 4\n   - 2x = 6\n\n2. **除以係數**：兩邊同除以 2\n   - x = 6 ÷ 2\n   - x = 3\n\n## 答案\n正確答案是 **C. x = 3**\n\n## 重點提示\n- 解一元一次方程式的步驟：移項 → 合併同類項 → 除以未知數係數\n- 等號兩邊進行相同運算，等式不變',
  'medium',
  true,
  1
)
RETURNING
  id AS question_id,
  stem,
  answer,
  '✅ 題目已建立' AS status;

-- 3) 驗證插入結果
SELECT
  pq.id,
  pq.stem,
  pq.choices,
  pq.answer,
  pq.difficulty,
  p.title AS pack_title,
  p.subject,
  p.topic,
  p.skill,
  p.grade
FROM pack_questions pq
JOIN packs p ON pq.pack_id = p.id
WHERE p.id = '11111111-1111-1111-1111-111111111111'
ORDER BY pq.created_at DESC
LIMIT 1;
