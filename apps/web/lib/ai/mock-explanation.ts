import type { ExplainResult, SolveSubject } from '@/lib/solve-types'

export type MockChoice = {
  label?: string
  text: string
}

type FallbackDefinition = {
  answer: string
  focus: string
  summary: string
  one_line_reason: string
  confidence_badge: 'high' | 'medium' | 'low'
  steps: string[]
  details: string[]
  evidence_sentence?: string
  grammarTable?: ExplainResult['grammarTable']
  encouragement?: string
}

const SUBJECT_FALLBACKS: Record<SolveSubject, FallbackDefinition> = {
  english: {
    answer: '答案：請參考詳解',
    focus: '字彙判斷',
    summary: '利用上下文線索選出最符合語意的選項。',
    one_line_reason: '抓上下文語意判斷正解',
    confidence_badge: 'medium',
    steps: ['閱讀題幹，找出線索', '判斷詞性與語氣', '比較選項語意差異'],
    details: [
      '題幹重點：%QUESTION%',
      '先確認句子前後語境，找出描述事件性質的詞彙。',
      '檢查詞性與語氣是否與題目一致，排除語意不合的選項。',
    ],
    evidence_sentence: '回到題幹句子，利用上下文線索比對選項。',
    grammarTable: [
      { category: '語意線索', description: '找出描述事件的核心名詞或動詞', example: 'a terrorist attack' },
      { category: '詞性確認', description: '確定填入的單字符合句型需求', example: 'injured in a terrorist attack' },
    ],
    encouragement: '保持語感，逐步比較選項，就能找出最合適的答案！',
  },
  chinese: {
    answer: '答案：請參考詳解',
    focus: '語意理解',
    summary: '釐清語境與語氣，選出最貼合文意的句子。',
    one_line_reason: '語境語氣需一致',
    confidence_badge: 'medium',
    steps: ['通讀題幹掌握語氣', '找出關鍵修辭或語法線索', '檢查選項是否吻合語境'],
    details: [
      '題目核心：%QUESTION%',
      '先理解段落語氣與主題，再檢查語句邏輯是否通順。',
      '對照選項詞語的情感強度與語體，排除不合語境的句子。',
    ],
    evidence_sentence: '利用段落中與答案語氣一致的句子作為依據。',
    grammarTable: [
      { category: '語氣', description: '辨識作者情感或語氣的變化', example: '語調平穩 → 選用中性詞彙' },
      { category: '修辭', description: '留意是否有對偶、排比等修辭', example: '排比句需維持節奏一致' },
    ],
    encouragement: '抓住語感與語氣，就能穩定拿下語文詳解題！',
  },
  math: {
    answer: '答案：請參考詳解',
    focus: '題意分析',
    summary: '確認已知量與未知量，套用適當的公式或性質。',
    one_line_reason: '列出已知量與公式',
    confidence_badge: 'medium',
    steps: ['整理已知條件', '選擇合適公式', '代入計算並檢查'],
    details: [
      '題目摘要：%QUESTION%',
      '將題目轉換成數學符號，確認需要求解的量。',
      '套用相關公式或幾何性質，完成計算後再次檢查單位與合理性。',
    ],
    evidence_sentence: '列出條件並以對應公式驗證答案。',
    encouragement: '按照步驟整理條件與公式，就能穩定完成解題！',
  },
  science: {
    answer: '答案：請參考詳解',
    focus: '概念應用',
    summary: '判斷題目考察的科學概念並套用對應原理。',
    one_line_reason: '抓出對應科學原理',
    confidence_badge: 'medium',
    steps: ['辨識章節主題', '回想核心原理', '套用原理解釋現象'],
    details: [
      '題目摘要：%QUESTION%',
      '先辨認題目描述的現象屬於哪個科學領域與概念。',
      '利用相關定律或實驗結果，解釋題目中的問題並檢查條件是否合理。',
    ],
    evidence_sentence: '從題幹中找出對應原理的關鍵描述。',
    encouragement: '理解原理解釋現象，比死記答案更可靠，加油！',
  },
  social: {
    answer: '答案：請參考詳解',
    focus: '概念對應',
    summary: '以關鍵字對應章節概念，找出最貼切的選項。',
    one_line_reason: '依題幹關鍵字配對概念',
    confidence_badge: 'medium',
    steps: ['抓出關鍵歷史或社會概念', '連結課本章節知識', '選擇與情境最吻合的選項'],
    details: [
      '題目重點：%QUESTION%',
      '先確認題目描述的時代、地點或制度，縮小概念範圍。',
      '套用課本中的關聯知識，推論出最合理的答案。',
    ],
    evidence_sentence: '以題幹事件或地點對應課本章節。',
    encouragement: '把事件放回課本脈絡，就能準確連結到正確概念！',
  },
  unknown: {
    answer: '答案：請參考詳解',
    focus: '題意釐清',
    summary: '回到題目文本，逐步釐清想解的核心問題。',
    one_line_reason: '釐清題目核心需求',
    confidence_badge: 'low',
    steps: ['重述題目要求', '整理已知資訊', '假設可行策略並驗證'],
    details: [
      '題目摘要：%QUESTION%',
      '把題目拆解成較小的資訊塊，先釐清真正要求的內容。',
      '依序帶入已知資訊，測試可能的解法或選項，再確認是否合理。',
    ],
    evidence_sentence: '回到題幹描述，重新確認要解的重點。',
    encouragement: '先釐清題意，再動手求解，就能穩住節奏完成作答！',
  },
}

function buildDetails(templates: string[], questionText: string): string[] {
  const compact = questionText.replace(/\s+/g, ' ').trim()
  const snippet = compact.length > 80 ? `${compact.slice(0, 77)}…` : compact
  const display = snippet.length > 0 ? snippet : '題目文字'
  return templates.map((detail) => detail.replace('%QUESTION%', display))
}

function buildFallbackDistractors(choices: MockChoice[] = []): ExplainResult['distractor_rejects'] {
  if (!choices || choices.length === 0) return []
  return choices.map((choice, index) => ({
    option: (choice.label ?? String.fromCharCode(65 + index)).toUpperCase(),
    reason: `與題幹線索不符，建議重新比對：${choice.text.slice(0, 20)}`,
  }))
}

export function buildMockExplanation(
  questionText: string,
  subject: SolveSubject = 'unknown',
  choices: MockChoice[] = []
): ExplainResult {
  const base = SUBJECT_FALLBACKS[subject] ?? SUBJECT_FALLBACKS.unknown
  const grammarTable = subject === 'english' || subject === 'chinese' ? base.grammarTable : undefined

  return {
    answer: base.answer,
    focus: base.focus,
    summary: base.summary,
    one_line_reason: base.one_line_reason,
    confidence_badge: base.confidence_badge,
    steps: [...base.steps],
    details: buildDetails(base.details, questionText),
    distractor_rejects: buildFallbackDistractors(choices),
    evidence_sentence: base.evidence_sentence,
    tested_rule: undefined,
    grammatical_focus: undefined,
    transition_word: undefined,
    before_after_fit: undefined,
    native_upgrade: undefined,
    maws_scores: undefined,
    grammarTable,
    encouragement: base.encouragement,
  }
}
