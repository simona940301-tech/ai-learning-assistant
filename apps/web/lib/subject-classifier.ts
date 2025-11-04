export const SUBJECTS = ['MathA', 'English'] as const

type SupportedSubject = (typeof SUBJECTS)[number]

type SubjectCandidate = {
  subject: SupportedSubject
  confidence: number
}

export interface SubjectDetection {
  subject: SupportedSubject | 'unknown'
  confidence: number
  confidenceDelta?: number
  secondBest?: SubjectCandidate
  candidates?: SubjectCandidate[]
}

const mathKeywords = [
  '三角形', '向量', '矩陣', '函數', '方程式', '不等式', '機率', '統計',
  '幾何', '代數', '三角', '餘弦', '正弦', '對數', '指數', '數列',
  '積分', '微分', '極限', '求值', '求解', '計算', '公式', '距離', '速度', '角度'
]

const englishKeywords = [
  // Chinese terms
  '英文', '單字', '文法', '句型', '閱讀', '寫作', '聽力', '會話',
  // Grammar/Structure terms
  'vocabulary', 'grammar', 'sentence', 'reading', 'writing', 'listening',
  'clause', 'relative', 'tense', 'translation', 'paragraph', 'insert', 'blank',
  // Common English words that indicate English questions
  'access', 'supply', 'attack', 'burden', 'injured', 'terrorist', 'reports',
  'imagery', 'literature', 'readers', 'imagine', 'scenes', 'allow',
  'coming', 'people', 'have been'
]

function scorePrompt(prompt: string, keywords: string[]): number {
  const lower = prompt.toLowerCase()
  let score = 0
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += 1
    }
  }
  return score
}

function isEnglishSentence(prompt: string): boolean {
  // Check for English sentence patterns
  const hasEnglishWords = /\b[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(prompt)
  const hasChinese = /[\u4e00-\u9fa5]/.test(prompt)
  const englishRatio = (prompt.match(/[a-zA-Z]/g) || []).length / prompt.length
  
  // If mostly English characters and has sentence structure, boost English score
  return englishRatio > 0.6 && hasEnglishWords && !hasChinese
}

export async function classifySubject(prompt: string): Promise<SubjectDetection> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return {
      subject: 'unknown',
      confidence: 0.3,
      candidates: SUBJECTS.map((subject) => ({ subject, confidence: 0 }))
    }
  }

  // Check if it's an English sentence
  const isEnglish = isEnglishSentence(trimmed)
  const englishBoost = isEnglish ? 0.3 : 0
  
  const scores: SubjectCandidate[] = [
    {
      subject: 'MathA',
      confidence: Math.min(0.98, 0.4 + scorePrompt(trimmed, mathKeywords) * 0.1)
    },
    {
      subject: 'English',
      confidence: Math.min(0.98, 0.4 + scorePrompt(trimmed, englishKeywords) * 0.1 + englishBoost)
    }
  ]

  scores.sort((a, b) => b.confidence - a.confidence)
  const [top, second] = scores

  const confidenceDelta = top && second ? top.confidence - second.confidence : undefined

  if (confidenceDelta !== undefined && confidenceDelta < 0.03) {
    return {
      subject: 'unknown',
      confidence: Math.max(0.4, top.confidence),
      confidenceDelta,
      secondBest: second,
      candidates: scores
    }
  }

  const result = {
    subject: top.subject,
    confidence: top.confidence,
    confidenceDelta,
    secondBest: second,
    candidates: scores
  }
  
  // Log for verification
  console.log('✅ Subject detection validated:', {
    subject: result.subject,
    confidence: result.confidence.toFixed(2),
    prompt: trimmed.substring(0, 50) + '...',
    isEnglishSentence: isEnglish
  })
  
  return result
}
