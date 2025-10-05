-- Seed data for Store items

INSERT INTO store_items (subject, title, description, provider, price, is_free, rating, category) VALUES
  -- Math
  ('math', '微積分精通課程', '從基礎到進階，完整學習微積分概念與應用', 'Khan Academy', 0, true, 4.8, 'recommended'),
  ('math', '線性代數實戰', '矩陣運算、向量空間、特徵值分解', 'MIT OpenCourseWare', 0, true, 4.7, 'popular'),
  ('math', '數學奧林匹克訓練', '培養數學思維與解題技巧', '台灣數學學會', 1200, false, 4.9, 'new'),

  -- English
  ('english', 'TOEFL 準備完整教材', '聽說讀寫四大技能全面提升', 'ETS Official', 990, false, 4.9, 'recommended'),
  ('english', '英文寫作精進班', '從句型到段落，打造流暢英文寫作', 'British Council', 680, false, 4.6, 'popular'),
  ('english', '商用英文會話', '職場必備英文溝通技巧', 'Coursera', 0, true, 4.5, 'new'),

  -- Science
  ('science', '物理實驗影片集', '透過實驗理解物理原理', 'MIT OpenCourseWare', 0, true, 4.7, 'recommended'),
  ('science', '化學元素週期表深度解析', '從原子結構到化學鍵結', '台灣化學教育學會', 450, false, 4.8, 'popular'),
  ('science', '生物學精華課程', '細胞、遺傳、演化完整內容', '清華大學開放課程', 0, true, 4.6, 'new'),

  -- Social
  ('social', '世界史全覽', '從古文明到現代社會', '歷史頻道', 0, true, 4.7, 'recommended'),
  ('social', '台灣地理與文化', '認識台灣的自然與人文', '國家地理', 380, false, 4.8, 'popular'),
  ('social', '公民與社會議題探討', '培養批判思考與公民意識', '公民教師行動聯盟', 0, true, 4.5, 'new'),

  -- Chinese
  ('chinese', '古典文學賞析', '唐詩宋詞、古文觀止', '台灣大學中文系', 0, true, 4.9, 'recommended'),
  ('chinese', '現代文學精選', '白先勇、張愛玲等名家作品', '聯合文學', 520, false, 4.7, 'popular'),
  ('chinese', '作文寫作技巧', '從審題到結構，提升寫作能力', '國文教師學會', 0, true, 4.6, 'new');

-- Example tasks (would normally be created by users)
-- These are commented out as they require user_id

-- INSERT INTO tasks (user_id, subject, title, description, xp_reward, coin_reward) VALUES
--   ('user_uuid_here', 'math', '完成微積分練習題 1-10', '練習導數與積分的基本運算', 100, 50),
--   ('user_uuid_here', 'english', '背誦單字 Unit 5', '記住 50 個新單字與例句', 80, 40),
--   ('user_uuid_here', 'chinese', '閱讀文言文並做筆記', '〈出師表〉全文理解與重點整理', 120, 60);
