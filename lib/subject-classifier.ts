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
  '英文', '單字', '文法', '句型', '閱讀', '寫作', '聽力', '會話',
  'vocabulary', 'grammar', 'sentence', 'reading', 'writing', 'listening',
  'clause', 'relative', 'tense', 'translation', 'paragraph', 'insert', 'blank'
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

export async function classifySubject(prompt: string): Promise<SubjectDetection> {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return {
      subject: 'unknown',
      confidence: 0.3,
      candidates: SUBJECTS.map((subject) => ({ subject, confidence: 0 }))
    }
  }

  const scores: SubjectCandidate[] = [
    {
      subject: 'MathA',
      confidence: Math.min(0.98, 0.4 + scorePrompt(trimmed, mathKeywords) * 0.1)
    },
    {
      subject: 'English',
      confidence: Math.min(0.98, 0.4 + scorePrompt(trimmed, englishKeywords) * 0.1)
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

  return {
    subject: top.subject,
    confidence: top.confidence,
    confidenceDelta,
    secondBest: second,
    candidates: scores
  }
}
