-- Seed exam_question_bank from seed_questions
-- Updated at: 2025-11-24 13:45:00
-- This is a temporary solution until we have proper question generation

INSERT INTO exam_question_bank (
  file_id,
  user_id,
  analysis_id,
  question_text,
  question_type,
  options,
  correct_answer,
  explanation,
  difficulty,
  topic_tags,
  confidence_score,
  created_at
)
SELECT
  (SELECT id FROM files LIMIT 1) as file_id,
  (SELECT id FROM auth.users LIMIT 1) as user_id,
  NULL as analysis_id,
  question_text,
  'multiple_choice' as question_type,
  jsonb_build_array(
    jsonb_build_object('label', 'A', 'text', option_a, 'is_correct', correct_answer = 'A'),
    jsonb_build_object('label', 'B', 'text', option_b, 'is_correct', correct_answer = 'B'),
    jsonb_build_object('label', 'C', 'text', option_c, 'is_correct', correct_answer = 'C'),
    jsonb_build_object('label', 'D', 'text', option_d, 'is_correct', correct_answer = 'D')
  ) as options,
  correct_answer,
  COALESCE(explanation_file_url, '暫無詳解') as explanation,
  difficulty_level,
  ARRAY[subject]::TEXT[] as topic_tags,
  0.8 as confidence_score,
  NOW() as created_at
FROM seed_questions
WHERE is_active = TRUE
ON CONFLICT DO NOTHING;

-- Verify the seed
SELECT COUNT(*) as total_questions FROM exam_question_bank;
