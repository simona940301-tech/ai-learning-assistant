import { z } from 'zod'

/**
 * Subject types
 */
export type Subject = 'english' | 'math' | 'chinese' | 'social' | 'science' | 'unknown'

/**
 * ExplainCard model (canonical format)
 */
export interface ExplainCard {
  focus: string
  summary: string
  steps: string[]
  details: string[]
}

/**
 * SolveResult from API
 */
export interface SolveResult {
  subject: Subject
  question?: string
  explainCard?: ExplainCard
  explanation?: any // Legacy support
  meta?: any
}

/**
 * Zod schema for ExplainCard
 */
export const ExplainCardSchema = z.object({
  focus: z.string().min(1),
  summary: z.string().min(1),
  steps: z.array(z.string()).min(1),
  details: z.array(z.string()).min(1),
})

/**
 * Normalize unknown value to string array
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String)
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }
  return []
}

/**
 * Normalize SolveResult to ExplainCard
 * Handles various response formats from different API versions
 */
export function normalizeSolveResult(result: any): ExplainCard | null {
  if (!result) {
    console.warn('[ExplainPipeline] Missing result')
    return null
  }

  console.log('[ExplainPipeline] Normalizing result keys:', Object.keys(result))

  // Try to find card data in various locations
  const rawCard =
    result.explainCard ||
    result.explanation?.card ||
    result.explanation ||
    result.card ||
    null

  if (!rawCard) {
    console.warn('[ExplainPipeline] No card data found in:', Object.keys(result))
    return null
  }

  // Build canonical ExplainCard
  const card: ExplainCard = {
    focus: String(rawCard.focus || rawCard.keyPoint || '考點待補充'),
    summary: String(rawCard.summary || rawCard.oneLiner || '解析待補充'),
    steps: toStringArray(rawCard.steps || rawCard.reasoning || []),
    details: toStringArray(rawCard.details || rawCard.explanation || []),
  }

  // Validate with Zod
  try {
    return ExplainCardSchema.parse(card)
  } catch (err) {
    console.error('[ExplainPipeline] Validation failed:', err)
    // Return partial card anyway (graceful degradation)
    return card
  }
}

/**
 * Create a mock ExplainCard for testing
 */
export function createMockCard(subject: Subject = 'english'): ExplainCard {
  const cards: Record<Subject, ExplainCard> = {
    english: {
      focus: '語境選詞與固定搭配',
      summary: '根據句意「恐怖攻擊」，選擇 attack',
      steps: [
        '1. 分析句子結構：reports + people injured',
        '2. 判斷語境：terrorist 恐怖分子',
        '3. 選擇固定搭配：terrorist attack',
      ],
      details: [
        'terrorist attack 是固定搭配，表示「恐怖攻擊」。',
        '其他選項不符合語境：access（通道）、supply（供應）、burden（負擔）。',
      ],
    },
    math: {
      focus: '基本三角函數',
      summary: '使用正弦定理或餘弦定理求解',
      steps: ['1. 列出已知條件', '2. 套用定理', '3. 計算結果'],
      details: ['正弦定理：a/sin(A) = b/sin(B) = c/sin(C)'],
    },
    chinese: {
      focus: '閱讀理解與文意判斷',
      summary: '根據上下文推測作者意圖',
      steps: ['1. 找出關鍵句', '2. 分析語氣', '3. 推導結論'],
      details: ['注意文章的修辭手法與隱含意義'],
    },
    social: {
      focus: '歷史事件與因果關係',
      summary: '理解事件背景與影響',
      steps: ['1. 確認時間點', '2. 分析原因', '3. 推導結果'],
      details: ['需結合時代背景理解'],
    },
    science: {
      focus: '科學原理與實驗',
      summary: '理解實驗步驟與結果',
      steps: ['1. 確認實驗目的', '2. 分析步驟', '3. 推導結論'],
      details: ['注意控制變因與觀察變因'],
    },
    unknown: {
      focus: '題目分析',
      summary: '根據題目內容判斷考點',
      steps: ['1. 閱讀題目', '2. 分析關鍵字', '3. 推導答案'],
      details: ['請提供更多題目資訊以獲得更精確的解析'],
    },
  }

  return cards[subject] || cards.unknown
}
