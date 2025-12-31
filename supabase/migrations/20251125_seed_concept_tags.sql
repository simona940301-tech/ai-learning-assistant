-- Seed concept tags for English and Math subjects
-- This provides predefined tags for AI to match against

-- English Grammar Tags
INSERT INTO concept_tags (subject, tag_name, category, description) VALUES
('english', '虛擬語氣', 'grammar', '假設語氣、與現在/過去事實相反的假設'),
('english', '時態', 'grammar', '現在式、過去式、未來式、完成式等'),
('english', '過去完成式', 'grammar', 'had + p.p.'),
('english', '現在完成式', 'grammar', 'have/has + p.p.'),
('english', '被動語態', 'grammar', 'be + p.p.'),
('english', '不定詞', 'grammar', 'to + V'),
('english', '動名詞', 'grammar', 'V-ing 當名詞用'),
('english', '分詞構句', 'grammar', '分詞片語修飾'),
('english', '關係代名詞', 'grammar', 'who, which, that, whose'),
('english', '關係副詞', 'grammar', 'when, where, why, how'),
('english', '比較級', 'grammar', 'more, -er, as...as'),
('english', '最高級', 'grammar', 'most, -est, the + 形容詞'),
('english', '條件句', 'grammar', 'if 條件句'),
('english', '間接問句', 'grammar', '疑問詞 + S + V'),
('english', '倒裝句', 'grammar', '主詞動詞倒裝'),
('english', '連接詞', 'grammar', 'and, but, or, so, because'),
('english', '介系詞', 'grammar', 'in, on, at, for, with'),
('english', '冠詞', 'grammar', 'a, an, the'),

-- English Vocabulary Tags
('english', '同義詞', 'vocabulary', '意思相近的字詞'),
('english', '反義詞', 'vocabulary', '意思相反的字詞'),
('english', '片語動詞', 'vocabulary', 'phrasal verbs'),
('english', '慣用語', 'vocabulary', 'idioms'),
('english', '搭配詞', 'vocabulary', 'collocations'),
('english', '字根字首', 'vocabulary', '詞源分析'),

-- English Reading Tags
('english', '主旨', 'reading', '文章主要意思'),
('english', '推論', 'reading', '根據文章推斷'),
('english', '細節', 'reading', '文章細節理解'),
('english', '作者態度', 'reading', '作者觀點立場'),
('english', '文章結構', 'reading', '段落組織'),
('english', '代名詞指涉', 'reading', '代名詞所指對象'),

-- Math Algebra Tags
('math', '一元一次方程式', 'algebra', 'ax + b = 0'),
('math', '一元二次方程式', 'algebra', 'ax² + bx + c = 0'),
('math', '二元一次方程式', 'algebra', '聯立方程式'),
('math', '因式分解', 'algebra', '多項式分解'),
('math', '多項式', 'algebra', '代數式運算'),
('math', '指數', 'algebra', '指數律、指數方程式'),
('math', '對數', 'algebra', 'log 運算'),
('math', '數列', 'algebra', '等差、等比數列'),
('math', '級數', 'algebra', '數列求和'),
('math', '不等式', 'algebra', '不等式解法'),
('math', '絕對值', 'algebra', '|x| 運算'),

-- Math Geometry Tags
('math', '三角形', 'geometry', '三角形性質、全等、相似'),
('math', '四邊形', 'geometry', '平行四邊形、梯形'),
('math', '圓', 'geometry', '圓的性質、圓周角'),
('math', '三角函數', 'geometry', 'sin, cos, tan'),
('math', '正弦定理', 'geometry', 'a/sinA = b/sinB = c/sinC'),
('math', '餘弦定理', 'geometry', 'c² = a² + b² - 2ab cosC'),
('math', '向量', 'geometry', '向量運算、內積'),
('math', '坐標幾何', 'geometry', '直線、圓方程式'),
('math', '空間幾何', 'geometry', '立體圖形'),

-- Math Calculus Tags
('math', '極限', 'calculus', 'limit'),
('math', '導數', 'calculus', '微分、導函數'),
('math', '積分', 'calculus', '不定積分、定積分'),
('math', '微分應用', 'calculus', '切線、極值'),
('math', '積分應用', 'calculus', '面積、體積'),

-- Math Statistics Tags
('math', '排列組合', 'statistics', 'P, C 計算'),
('math', '機率', 'statistics', '機率計算'),
('math', '期望值', 'statistics', '數學期望'),
('math', '統計', 'statistics', '平均數、標準差'),
('math', '數據分析', 'statistics', '圖表解讀')

ON CONFLICT (subject, tag_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_tags_category ON concept_tags(category);
