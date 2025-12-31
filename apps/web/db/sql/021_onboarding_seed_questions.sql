-- ============================================================
-- Seed Questions for Onboarding Flow (學測級別題目)
-- ============================================================

-- Clear existing test questions (optional)
-- DELETE FROM onboarding_questions WHERE subject = 'english';

-- =============================================
-- Difficulty Level 1 (簡單題 - 建立信心)
-- =============================================

INSERT INTO onboarding_questions (
  question_text, option_a, option_b, option_c, option_d,
  correct_answer, difficulty_level, subject, explanation
) VALUES
(
  'Before John got on the stage to give the speech, he took a deep _________ to calm himself down.',
  'order',
  'rest',
  'effort',
  'breath',
  'D',
  1,
  'english',
  '【核心考點】考查固定搭配 take a deep breath (深呼吸)。根據動作目的「讓自己平靜下來」（to calm himself down），判斷上台前可以採取的行動是深呼吸。'
),
(
  'Microscopes are used in medical research labs for studying bacteria or _________ that are too small to be visible to the naked eye.',
  'agencies',
  'codes',
  'germs',
  'indexes',
  'C',
  1,
  'english',
  '【核心考點】根據語境「醫學研究實驗室」和「研究細菌」，判斷空格應填入另一個與細菌類似的微小致病生物。germs (病菌) 最符合顯微鏡下觀察的致病微生物。'
),
(
  'The manager agreed to rent his apartment to me. Even though the agreement was not put in writing, I am sure he will keep his word.',
  'barely',
  'stably',
  'verbally',
  'massively',
  'C',
  1,
  'english',
  '【核心考點】根據語境「儘管協議沒有寫成書面」（not put in writing），判斷協議是以口頭形式達成的。verbally (口頭上地) 與 not in writing 相對應。'
),
(
  'After several rounds of intense fighting, the boxer punched his _________ right in the face, knocked him out, and won the match.',
  'performer',
  'attendant',
  'opponent',
  'messenger',
  'C',
  1,
  'english',
  '【核心考點】根據語境「拳擊手」、「激烈搏鬥」和「贏得比賽」，判斷拳擊手攻擊並擊倒的對象應是比賽的對手 (opponent)。'
),
(
  'As David finished the last drop of the delicious chicken soup, he licked his lips and gave out sounds of _________.',
  'contentment',
  'dominance',
  'explosion',
  'affection',
  'A',
  1,
  'english',
  '【核心考點】根據語境「美味的雞湯」和動作「舔嘴唇」，判斷 David 對食物表達的是享受和滿足的情緒。contentment (滿足) 最符合享用美食後的狀態。'
);

-- =============================================
-- Difficulty Level 2 (中等題 - 稍有挑戰)
-- =============================================

INSERT INTO onboarding_questions (
  question_text, option_a, option_b, option_c, option_d,
  correct_answer, difficulty_level, subject, explanation
) VALUES
(
  'The sign in front of the Johnsons'' house says that no one is allowed to set foot on their _________ without permission.',
  'margin',
  'shelter',
  'reservation',
  'property',
  'D',
  2,
  'english',
  '【核心考點】根據句意「未經允許不得踏上...」，判斷這個空間是私人擁有且禁止進入的地產或領地。property (房產；財產) 最符合私人住宅周圍的土地或建築。'
),
(
  'Instead of giving negative criticism, our teachers usually try to give us _________ feedback so that we can improve on our papers.',
  'absolute',
  'constructive',
  'influential',
  'peculiar',
  'B',
  2,
  'english',
  '【核心考點】根據對比結構「而不是給予負面批評」和目的「這樣我們才能改進」，判斷老師提供的反饋必須是有益的。constructive (有建設性的) 與 negative 相對，且有助於 improve。'
),
(
  'The athlete rolled up his sleeves to show his _________ forearms, thick and strong from years of training in weight-lifting.',
  'barren',
  'chubby',
  'ragged',
  'muscular',
  'D',
  2,
  'english',
  '【核心考點】根據修飾對象「前臂」和原因「多年重訓」及描述詞「厚實而強壯」，判斷運動員的前臂應具備肌肉發達的特性。muscular (肌肉發達的) 最符合舉重訓練的結果。'
),
(
  'Martha has been trying to _________ her roommate since their quarrel last week, as she doesn''t want to continue the argument.',
  'overgrow',
  'bother',
  'pursue',
  'avoid',
  'D',
  2,
  'english',
  '【核心考點】根據結果「她並不想繼續爭執」，判斷 Martha 對室友採取的行動是避免接觸。avoid (避開) 符合不想繼續爭吵而保持距離的行為。'
),
(
  'The high-tech company''s _________ earnings surely made its shareholders happy since they were getting a good return on their investment.',
  'robust',
  'solitary',
  'imperative',
  'terminal',
  'A',
  2,
  'english',
  '【核心考點】根據語境「股東很高興」和原因「獲得了良好的投資回報」，判斷這家高科技公司的收益一定是強勁且穩定的。robust (強勁的) 形容經濟、收益的強大和穩定。'
);

-- =============================================
-- Difficulty Level 3 (挑戰題 - 測試實力)
-- =============================================

INSERT INTO onboarding_questions (
  question_text, option_a, option_b, option_c, option_d,
  correct_answer, difficulty_level, subject, explanation
) VALUES
(
  'The film Life of Pi won Ang Lee an Oscar in 2013 for Best Director—one of the most _________ awards in the movie industry.',
  'populated',
  'surpassed',
  'coveted',
  'rotated',
  'C',
  3,
  'english',
  '【核心考點】根據語境「奧斯卡最佳導演獎」，判斷這個獎項在電影界是人人都想要、極度渴求的。coveted (夢寐以求的) 形容許多人熱烈追求的獎項。'
),
(
  'Due to the worldwide recession, the World Bank''s forecast for next year''s global economic growth is _________.',
  'keen',
  'mild',
  'grim',
  'foul',
  'C',
  3,
  'english',
  '【核心考點】根據語境「全球經濟衰退」，判斷世界銀行對全球經濟增長的預測應該是不樂觀的。grim (嚴峻的；黯淡的) 最符合經濟衰退期對增長的悲觀預期。'
),
(
  'The kingdom began to _________ after the death of its ruler, and was soon taken over by a neighboring country.',
  'collapse',
  'dismiss',
  'rebel',
  'withdraw',
  'A',
  3,
  'english',
  '【核心考點】根據語境「統治者去世後」和後果「很快被鄰國接管」，判斷這個國家在失去領導者後面臨瓦解。collapse (崩潰；瓦解) 最符合國家結構徹底失敗的狀態。'
),
(
  'Plants and animals in some deserts must cope with a climate of _________ freezing winters and very hot summers.',
  'extremes',
  'forecasts',
  'atmospheres',
  'homelands',
  'A',
  3,
  'english',
  '【核心考點】根據語境「沙漠」、「冰凍的冬天」和「炎熱的夏天」，判斷沙漠的氣候特點是溫差極大。extremes (極端) 符合「冰凍」和「炎熱」這兩種相反且強烈的氣候狀況。'
),
(
  'If student enrollment _________, some programs at the university may be eliminated to reduce the operation costs.',
  'relieved',
  'eliminated',
  'projected',
  'drops',
  'D',
  3,
  'english',
  '【核心考點】根據語境「大學課程可能會被淘汰以減少營運成本」，判斷課程被淘汰的原因是學生入學人數減少。drops (下降；減少) 最符合導致削減成本的經濟因素。'
);

-- =============================================
-- Verify Insertion
-- =============================================

-- Check total count
SELECT
  difficulty_level,
  COUNT(*) as question_count
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
GROUP BY difficulty_level
ORDER BY difficulty_level;

-- Expected output:
-- difficulty_level | question_count
-- -----------------+---------------
--                1 |             5
--                2 |             5
--                3 |             5

-- Preview sample questions
SELECT
  difficulty_level,
  LEFT(question_text, 50) || '...' as question_preview,
  correct_answer
FROM onboarding_questions
WHERE is_active = true AND subject = 'english'
ORDER BY difficulty_level, created_at
LIMIT 10;
