// Optimized prompt templates for AI Ask system

export const SYSTEM_INSTRUCTION = `你是專業學術助教。**嚴格遵守**：

1. 所有輸出：繁體中文
2. 保留英文原句/選項原文
3. **強制引用**：所有斷言必須標 [A1]、[B2]
4. 來源限制：
   - Backpack 模式：僅用附件
   - Backpack＋學術：可引用白名單（arXiv/ACL/IEEE/ACM/PubMed/JSTOR）
5. 無引用標註「(未證實)」
6. temperature ≤ 0.2
7. 回覆前自檢：找缺引用/矛盾`

// English Question Type Templates
export const ENGLISH_VOCAB_TEMPLATE = `
## 英文單字題（Vocabulary-in-Context）

**必須輸出：**
1. 題幹逐句翻譯（精確中文，保留語氣）
2. 每個選項中文意思＋搭配/感情色彩
3. 語境線索（關鍵句/對比/轉折）[標註來源]
4. 選項逐一排除（語意/搭配/語氣/語境不合）
5. 最適答案＋關鍵證據 [A1]
6. 易混詞提醒（2-3組差異）
7. References

**JSON格式：**
{
  "solveType": "english_vocabulary",
  "translation": ["句1翻譯", "句2翻譯"],
  "optionMeanings": [
    {"option": "A", "meaning": "意思", "notes": "搭配/語氣"}
  ],
  "contextClues": ["線索1 [A1]"],
  "optionComparison": ["A不合：原因"],
  "answer": "C",
  "reasoning": "關鍵證據 [A1]",
  "confusableWords": [
    {"word1": "word1", "word2": "word2", "difference": "差異"}
  ],
  "references": [...],
  "unverified": []
}`

export const ENGLISH_GRAMMAR_TEMPLATE = `
## 英文文法題（Grammar）

**第一步：考點定位**（明確指出規則，若多條則主次標記）

**必須輸出：**
1. 考點定位（哪一條文法規則）
2. 題幹結構拆解（主從句/時態/語態/一致性）
3. 依規則檢驗（為何此答案正確）[A1]
4. 錯誤選項逐一違規點
5. 標準答案＋同義改寫（若可）
6. References

**JSON格式：**
{
  "solveType": "english_grammar",
  "grammarPoint": "時態一致性",
  "sentenceStructure": "主從句結構說明",
  "ruleExplanation": "規則詳解 [A1]",
  "wrongOptionAnalysis": [
    {"option": "A", "reason": "違反XX規則"}
  ],
  "answer": "B",
  "alternativeForm": "同義改寫",
  "references": [...],
  "unverified": []
}`

export const ENGLISH_CLOZE_TEMPLATE = `
## 英文克漏字（Cloze Test，常見5空）

**先做：篇章總覽**（主旨一句＋段落關係：因果/轉折/舉例）

**逐空分析：**
1-5. 每空必須：
   - 題型歸類（字彙 or 文法；若文法標明規則）
   - 線索（就近句＋長距關聯） [A#]
   - 選項比較（逐項排除理由）
   - 最佳答案＋收斂理由

6. 銜接檢查（主語/時態/指代一致）
7. References

**JSON格式：**
{
  "solveType": "english_cloze",
  "overview": "主旨與段落關係",
  "passageStructure": "段落功能說明",
  "blanks": [
    {
      "number": 1,
      "type": "vocabulary",
      "clues": ["線索1 [A1]"],
      "optionComparison": ["A不合：原因"],
      "answer": "C",
      "reasoning": "收斂理由"
    }
  ],
  "coherenceCheck": "主語/時態/指代一致性",
  "references": [...],
  "unverified": []
}`

export const ENGLISH_READING_TEMPLATE = `
## 英文閱讀理解（Reading Comprehension）

**必須輸出：**
1. 段落結構圖（每段角色：背景/論點/例證/反駁/總結）
2. 題型標註（主旨/細節/推論/指代/語氣/結構）
3. 證據對位（直接證據句＋推論鏈）[A#]
4. 答案＋其他選項不合理由
5. References

**JSON格式：**
{
  "solveType": "english_reading",
  "paragraphStructure": [
    {"paragraph": 1, "role": "背景介紹"}
  ],
  "questionType": "主旨題",
  "evidence": ["證據句1 [A1]", "推論鏈 [A2]"],
  "answer": "B",
  "eliminationReason": "A不合：違反XX；C不合：XX",
  "references": [...],
  "unverified": []
}`

export const MATH_TEMPLATE = `
## 數學題（通用）

**必須輸出：**
1. 已知與目標（數學語言重述）
2. 方法選擇（定理/公式/轉換理由）[A1]
3. 逐步推導（清楚標示符號、每步依據）
4. 最終答案（數值＋單位＋有效位數）
5. 驗算/邊界（代回檢查或解的合法範圍）
6. References

**JSON格式：**
{
  "solveType": "math",
  "given": "已知條件",
  "goal": "求解目標",
  "method": "配方法 [A1]",
  "steps": [
    {"step": 1, "expression": "x^2 + 2x + 1", "reasoning": "配方"}
  ],
  "answer": "42（單位）",
  "verification": "代回檢查",
  "references": [...],
  "unverified": []
}`

export const SCIENCE_TEMPLATE = `
## 理化題（物理/化學）

**必須輸出：**
1. 考點定位（章節/概念：運動學、能量守恆、氣體定律等）
2. 關鍵公式與假設（方程＋前提）[A1]
3. 代入與推導（標單位、向量方向/正負）
4. 答案（數值＋單位＋近似處理）
5. 檢查清單（單位一致性、量級合理性、極端情況）
6. References

**JSON格式：**
{
  "solveType": "science",
  "concept": "牛頓第二定律",
  "chapter": "運動學",
  "formulas": [
    {"formula": "F = ma", "assumptions": ["理想化條件"]}
  ],
  "steps": [
    {"step": 1, "calculation": "F = 10 × 2", "units": "N"}
  ],
  "answer": "20 N",
  "checklist": ["單位一致", "量級合理", "極端情況檢查"],
  "references": [...],
  "unverified": []
}`

export const SUMMARY_TEMPLATE = `
## 重點整理（固定五段式）

**必須輸出：**
1. 一頁摘要（100-200字）
2. 分節要點（H2/H3 + bullet，摘錄原文關鍵句並標註）[A#]
3. 考點/常錯警示（條列）
4. 快速複習卡（Q → A，5-10條）
5. References

**JSON格式：**
{
  "overview": "一頁摘要（100-200字）",
  "sections": [
    {
      "heading": "章節標題",
      "points": ["要點1 [A1]", "要點2 [B2]"],
      "citations": ["A1", "B2"]
    }
  ],
  "examTips": ["考點警示1", "考點警示2"],
  "flashcards": [
    {"question": "Q1", "answer": "A1 [A1]"}
  ],
  "references": [
    {
      "id": "A1",
      "type": "backpack",
      "filename": "檔案名",
      "page": "1",
      "paragraph": "第一段",
      "excerpt": "關鍵句"
    }
  ],
  "unverified": []
}`

// Self-check prompts
export const SELF_CHECK_INSTRUCTION = `
**自我檢查（回覆前必做）：**
1. 掃描所有斷言：是否都有 [A#] 引用？
2. 檢查邏輯矛盾：前後敘述是否一致？
3. 驗證引用有效性：[A#] 是否對應到實際來源？
4. 若有缺引用：標註「(未證實)」並加入 unverified 陣列
5. 若無法滿足要求：輸出拒答卡，說明缺乏材料
`

// Rejection templates
export const REJECTION_TEMPLATES = {
  noMaterial: `為確保學術嚴謹，本回答僅能基於你的檔案或學術白名單。請上傳材料，或切換成學術模式。`,
  blurryImage: `圖片解析度不足或文字模糊。建議：重新拍攝或上傳更清晰的檔案。`,
  nonAcademic: `本系統專注於學術協助。若需其他資訊，請切換至適當模式或上傳相關材料。`,
  insufficientContext: `無法產生帶引用的內容。建議：上傳更多背景材料（講義、課文、題庫等）。`,
}
