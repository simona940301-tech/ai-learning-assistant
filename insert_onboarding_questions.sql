-- ============================================
-- Onboarding Questions - 測試題目
-- ============================================

-- 先檢查是否已有題目
SELECT COUNT(*) as existing_questions FROM onboarding_questions;

-- 插入測試題目（使用 INSERT ... ON CONFLICT DO NOTHING 避免重複）
INSERT INTO onboarding_questions (
  question_text,
  option_a, option_b, option_c, option_d,
  correct_answer,
  difficulty_level,
  subject,
  explanation
) VALUES
-- 難度 1 (容易題 - 第1題用，幾乎都會對)
('下列哪一個是正確的英文問候語？',
 'How are you?', 'How is you?', 'How you are?', 'Are how you?',
 'A', 1, 'english',
 'How are you? 是最常見的英文問候語，用來詢問對方的近況。'),

('下列哪個單字的意思是「快樂的」？',
 'happy', 'sad', 'angry', 'tired',
 'A', 1, 'english',
 'happy 的中文意思是「快樂的」。'),

('選出正確的英文單字：「學生」',
 'student', 'teacher', 'school', 'book',
 'A', 1, 'english',
 'student 是「學生」的意思。'),

-- 難度 2 (中等題 - 第2題用，稍有不確定性)
('選出正確的過去式：I ____ to the store yesterday.',
 'go', 'goes', 'went', 'going',
 'C', 2, 'english',
 'go 的過去式是 went，因為 yesterday 表示過去時間。'),

('下列哪個句子文法正確？',
 'She don''t like coffee.', 'She doesn''t like coffee.',
 'She not like coffee.', 'She no like coffee.',
 'B', 2, 'english',
 '第三人稱單數否定要用 doesn''t，而不是 don''t。'),

('選擇正確的時態：He ____ his homework right now.',
 'do', 'does', 'is doing', 'did',
 'C', 2, 'english',
 '「right now」表示現在進行式，要用 is doing。'),

-- 難度 3 (挑戰題 - 第3題用，選擇性)
('下列哪一個句子使用了正確的被動語態？',
 'The book was written by Shakespeare.',
 'The book write by Shakespeare.',
 'The book is write by Shakespeare.',
 'The book writing by Shakespeare.',
 'A', 3, 'english',
 '被動語態的結構是 be + 過去分詞。這裡使用 was written 是正確的形式。'),

('選出正確的關係代名詞：The girl ____ won the prize is my sister.',
 'which', 'who', 'what', 'where',
 'B', 3, 'english',
 '先行詞是人 (girl)，所以要用 who。'),

('下列哪個句子使用了正確的假設語氣？',
 'If I was rich, I would travel the world.',
 'If I were rich, I would travel the world.',
 'If I am rich, I would travel the world.',
 'If I will be rich, I would travel the world.',
 'B', 3, 'english',
 '假設語氣要用 were，而不是 was。這是表達與現在事實相反的假設。')

ON CONFLICT DO NOTHING;

-- 驗證插入結果
SELECT difficulty_level, COUNT(*) as count
FROM onboarding_questions
WHERE is_active = true
GROUP BY difficulty_level
ORDER BY difficulty_level;
