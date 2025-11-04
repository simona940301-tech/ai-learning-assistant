import type { Subject, QuestionType, DetectionResult } from '@/lib/tutor-types'

/**
 * @deprecated Superseded by detect → warmup → solve flow. Remove after 14-day observation window.
 */
export interface TutorExplainResult {
  subject: Subject
  type: QuestionType
  question: string
  answer: string
  reasoning: string
  explanation: string
  extras?: {
    translationPairs?: string[]
    diagrams?: string[]
    formulas?: string[]
  }
  meta: {
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    level?: 'Basic' | 'Advanced'
    tags?: string[]
  }
}

/**
 * @deprecated Superseded by detect → warmup → solve flow. Remove after 14-day observation window.
 */
export interface TutorBackpackItem {
  title: string
  type: 'quiz_explanation'
  content: {
    core: string
    reasoning: string
    explanation: string
  }
  metadata: {
    subject: Subject
    type: QuestionType
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    tags: string[]
  }
  render: 'markdown_dual'
}

/**
 * @deprecated Legacy prompt generator. Remove after 14-day observation window.
 */
export function generateTutorPrompt(question: string, detection: DetectionResult): string {
  const { subject, type, intent, language } = detection

  const baseInstruction = language === 'zh'
    ? '你是專業的學測家教老師。用 10 歲小孩能懂的方式解釋，一句一個概念。'
    : "You are a professional tutor. Explain like I'm 10: one idea per line, clear and concise."

  let strategyPrompt = ''

  switch (subject) {
    case 'Chinese':
      strategyPrompt = getChineseStrategy(type as any, question)
      break
    case 'English':
      strategyPrompt = getEnglishStrategy(type as any, question)
      break
    case 'Science':
      strategyPrompt = getScienceStrategy(type as any, question)
      break
    case 'Social':
      strategyPrompt = getSocialStrategy(type as any, question)
      break
  }

  return `${baseInstruction}

**題意意圖：** ${intent}

**題目內容：**
${question}

${strategyPrompt}

**輸出格式（Markdown）：**
請依照以下結構輸出，使用清晰的 Markdown 標題與條列：

### 題意理解
- 題型：${type}
- 關鍵詞/線索：[列出]

### 解題步驟
1. [第一步]
2. [第二步]
3. [第三步]
✅ 正確答案：(X)

### 為什麼
- [解釋為何其他選項錯誤]
- [解釋正確答案的理由]

### 教學化說明
[用例子或類比讓學生更好理解]

**注意事項：**
- 使用繁體中文（若題目是中文）
- 每行一個概念，簡潔清晰
- 數學/科學符號使用 Markdown 格式（x²、H₂O、m/s²）
- 不使用術語，改用白話說明
`
}

function getChineseStrategy(type: string, question: string): string {
  switch (type) {
    case 'modern_text_comprehension':
      return `
**解題重點：**
1. 找主旨句與轉折詞（但是、然而、卻）
2. 分析語氣（肯定/否定/疑問）
3. 對照每個選項的方向

**不要：**
- 不要重複摘要整篇文章
- 不要用「刪去法」這種詞

**要：**
- 直接指出關鍵句
- 說明為什麼這個選項最完整`

    case 'classical_text_comprehension':
      return `
**解題重點：**
1. 翻譯關鍵句（保留原文對照）
2. 解釋重要字義
3. 說明句子語氣與用途

**格式：**
- 原文：[關鍵句]
- 翻譯：[白話翻譯]
- 字義：之=的、者=...的人`

    case 'idiom_usage':
      return `
**解題重點：**
1. 說明成語的字面意思
2. 解釋實際用途與語氣
3. 舉一個生活例子

**格式：**
- 字面：[拆字解釋]
- 意思：[實際意義]
- 例子：[生活中的用法]`

    default:
      return `
**解題重點：**
1. 找出文章主旨
2. 分析選項與主旨的關聯
3. 選出最完整的答案`
  }
}

function getEnglishStrategy(type: string, question: string): string {
  switch (type) {
    case 'vocabulary':
    case 'grammar':
      return `
**Solving Steps:**
1. Identify the sentence core (subject + verb).
2. Check each option's meaning and part of speech.
3. Choose the word that fits context and grammar.

**Format:**
### Sentence Core
[Main structure]

### Reasoning
1. Check meaning of each word.
2. Match context and grammar.
✅ Answer: (X)

### Explanation
- Why others are wrong.
- Why this is correct.`

    case 'cloze':
      return `
**重要：必須先列出所有選項的中譯與詞性**

**解題步驟：**
1. 列出選項總覽（中英對照 + 詞性）
2. 逐格分析前後文
3. 選擇最符合語意與文法的詞

**格式：**
### 選項總覽
- consequently（因此，adv.）
- fragile（脆弱的，adj.）
- [其他選項]
`

    case 'text_insertion':
      return `
**解題步驟：**
1. 分析上下文的主題/時態/代名詞
2. 找出段落功能（舉例、對比、總結）
3. 確認承先啟後是否順暢`

    case 'reading_comprehension':
      return `
**解題步驟：**
1. 先讀題幹，標記疑問詞
2. 回文定位關鍵句
3. 用「證據句 + 推論」回答`

    case 'translation':
      return `
**解題步驟：**
1. 找主詞 + 動詞（若有非限定子句，先處理）
2. 套入對應時態/語態
3. 核對片語與介系詞是否對應`

    default:
      return `
**解題重點：**
1. 判斷題型是字彙還是文法
2. 解析句子結構
3. 比對選項差異`
  }
}

function getScienceStrategy(type: string, question: string): string {
  switch (type) {
    case 'numerical_calculation':
      return `
**解題重點：**
1. 列已知條件與所求
2. 選擇公式並代入
3. 檢查單位與有效數字`

    case 'chart_interpretation':
      return `
**解題重點：**
1. 讀圖表標題與軸向
2. 找趨勢或極值
3. 對照選項，避免想當然`

    case 'experiment_design':
      return `
**解題重點：**
1. 分析變因（自變/應變/控制）
2. 確認對照組與實驗組差異
3. 推論可能結果`

    default:
      return `
**解題重點：**
1. 定義關鍵概念
2. 列出公式或圖像
3. 逐步推理`
  }
}

function getSocialStrategy(type: string, question: string): string {
  switch (type) {
    case 'chronological_order':
      return `
**解題重點：**
1. 標記事件年份或先後語
2. 建立時間軸
3. 核對事件間的因果`

    case 'map_interpretation':
      return `
**解題重點：**
1. 辨識圖例與方向
2. 找出關鍵地理特徵
3. 比對題目描述`

    case 'civic_law':
      return `
**解題重點：**
1. 判斷題目所屬權力或制度
2. 比對選項是否符合權責分工
3. 注意關鍵條文用語`

    default:
      return `
**解題重點：**
1. 確認題目是史料還是概念
2. 擷取關鍵資訊（時間、人物、事件）
3. 逐項排除不符合的選項`
  }
}

/**
 * @deprecated Legacy subject/type detector. Remove after 14-day observation window.
 */
export function detectSubjectAndType(question: string): DetectionResult {
  const q = question.toLowerCase()
  const hasChinese = /[\u4e00-\u9fa5]/.test(question)
  const language: 'zh' | 'en' = hasChinese ? 'zh' : 'en'

  if (detectEnglishPatterns(q)) {
    const type = detectEnglishType(question)
    return {
      subject: 'English',
      type,
      intent: getEnglishIntent(type),
      language,
      confidence: 0.95
    }
  }

  if (detectSciencePatterns(q)) {
    const type = detectScienceType(question)
    return {
      subject: 'Science',
      type,
      intent: getScienceIntent(type),
      language,
      confidence: 0.9
    }
  }

  if (detectSocialPatterns(question)) {
    const type = detectSocialType(question)
    return {
      subject: 'Social',
      type,
      intent: getSocialIntent(type),
      language,
      confidence: 0.85
    }
  }

  const type = detectChineseType(question)
  return {
    subject: 'Chinese',
    type,
    intent: getChineseIntent(type),
    language,
    confidence: 0.8
  }
}

function detectEnglishPatterns(q: string): boolean {
  const patterns = [
    /\b(is|are|was|were|have|has|will|would|should|can|could)\b/,
    /\b(the|a|an|this|that|these|those)\b/,
    /\b[a-z]+ly\b/,
    /__+/
  ]
  return patterns.some((p) => p.test(q))
}

function detectEnglishType(question: string): QuestionType {
  if (/___+|fill\s+in|blank/.test(question.toLowerCase())) {
    const blanks = (question.match(/___+/g) || []).length
    return blanks >= 5 ? 'cloze' : 'vocabulary'
  }

  if (/insert|place|sentence|paragraph/.test(question.toLowerCase())) {
    return 'text_insertion'
  }

  if (/translate|translation|中譯英|英譯中/.test(question.toLowerCase())) {
    return 'translation'
  }

  if (/grammar|tense|subject|verb|clause/.test(question.toLowerCase())) {
    return 'grammar'
  }

  if (/passage|article|according to/.test(question.toLowerCase())) {
    return 'reading_comprehension'
  }

  return 'vocabulary'
}

function getEnglishIntent(type: QuestionType): string {
  const intents: Record<string, string> = {
    vocabulary: '選擇最符合語境的單字',
    grammar: '判斷正確的文法結構',
    cloze: '根據上下文填入適當的詞彙',
    text_insertion: '找出句子最適合插入的位置',
    reading_comprehension: '理解文章內容並回答問題',
    translation: '翻譯句子或段落'
  }
  return intents[type] || '理解並選擇正確答案'
}

function detectSciencePatterns(q: string): boolean {
  const patterns = [
    /\d+\s*(m|km|cm|mm|kg|g|mg|l|ml|n|j|w|v|a|℃|°c)/i,
    /[=+\-×÷]|\/|\*/,
    /公式|計算|求|已知|設/,
    /實驗|變因|對照組|控制/
  ]
  return patterns.some((p) => p.test(q))
}

function detectScienceType(question: string): QuestionType {
  if (/計算|求|已知.*設/.test(question)) {
    return 'numerical_calculation'
  }

  if (/圖|表|座標|趨勢/.test(question)) {
    return 'chart_interpretation'
  }

  if (/實驗|變因|對照|控制/.test(question)) {
    return 'experiment_design'
  }

  return 'concept_understanding'
}

function getScienceIntent(type: QuestionType): string {
  const intents: Record<string, string> = {
    concept_understanding: '理解科學概念並應用',
    numerical_calculation: '使用公式計算數值',
    chart_interpretation: '解讀圖表並推論結果',
    experiment_design: '設計或分析實驗流程'
  }
  return intents[type] || '解決科學問題'
}

function detectSocialPatterns(question: string): boolean {
  const patterns = [
    /\d{3,4}年|民國|清朝|明朝|宋朝|唐朝/,
    /條約|戰爭|革命|改革/,
    /憲法|法律|權力|政府|立法|行政|司法/,
    /經度|緯度|地圖|氣候|地形/
  ]
  return patterns.some((p) => p.test(question))
}

function detectSocialType(question: string): QuestionType {
  if (/先後|順序|時序|排列/.test(question)) {
    return 'chronological_order'
  }

  if (/地圖|座標|經緯|地形/.test(question)) {
    return 'map_interpretation'
  }

  if (/憲法|法律|權力|制度/.test(question)) {
    return 'civic_law'
  }

  return 'historical_material'
}

function getSocialIntent(type: QuestionType): string {
  const intents: Record<string, string> = {
    historical_material: '分析歷史資料並推論',
    chronological_order: '按時間順序排列事件',
    map_interpretation: '解讀地圖資訊',
    civic_law: '理解法律或政治制度'
  }
  return intents[type] || '理解社會科學問題'
}

function detectChineseType(question: string): QuestionType {
  if (/成語|諺語|俗語|慣用語/.test(question)) {
    return 'idiom_usage'
  }

  if (/文言文|古文|之乎者也/.test(question) || /[\u4e4b\u4e4e\u8005\u4e5f]/.test(question)) {
    return 'classical_text_comprehension'
  }

  if (/本文|作者|文章|段落/.test(question)) {
    return 'writing_analysis'
  }

  return 'modern_text_comprehension'
}

function getChineseIntent(type: QuestionType): string {
  const intents: Record<string, string> = {
    modern_text_comprehension: '理解現代文章主旨與細節',
    classical_text_comprehension: '理解文言文並解釋字義',
    idiom_usage: '理解成語或慣用語的意義與用法',
    writing_analysis: '分析文章結構與寫作手法'
  }
  return intents[type] || '理解文章內容'
}
