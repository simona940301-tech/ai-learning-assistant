import { nanoid } from 'nanoid'
import { chatCompletionJSON } from '@/lib/openai'
import type { ExplainCard, EnglishQuestionInput } from '@/lib/contracts/explain'

/**
 * Generate minimal fallback card (E1-style)
 * Used when routing fails or validation fails
 */
export async function generateFallbackCard(input: EnglishQuestionInput): Promise<ExplainCard> {
  const { stem, options } = input
  
  // Try to use LLM for minimal analysis
  if (process.env.OPENAI_API_KEY) {
    try {
      
      const prompt = `請為以下題目提供最基本的分析（JSON格式，不要其他文字）：

題目：${stem}
選項：${options.map((o) => `(${o.key}) ${o.text}`).join(', ')}

格式：
{
  "translation": "題幹中譯",
  "options": [
    {"key": "A", "verdict": "fit", "reason": "簡短原因"},
    {"key": "B", "verdict": "unfit", "reason": "簡短原因"},
    ...
  ],
  "correct": {"key": "C", "text": "${options.find((o) => o.key === 'C')?.text || ''}", "reason": "為何正確"}
}`

      const parsed = await chatCompletionJSON<any>(
        [{ role: 'user', content: prompt }],
        {
          model: 'gpt-4o-mini',
          temperature: 0.3,
        }
      )
      
      return {
        id: nanoid(),
        question: stem,
        kind: 'FALLBACK',
        translation: parsed.translation || stem,
        cues: [],
        options: parsed.options || options.map((o) => ({
          key: o.key,
          text: o.text,
          verdict: 'unknown' as const,
        })),
        steps: [],
        correct: parsed.correct || {
          key: options[0]?.key || 'A',
          text: options[0]?.text || '',
          reason: '無法自動判斷',
        },
        vocab: [],
        nextActions: [
          { label: '換同型題', action: 'drill-similar' },
          { label: '加入錯題本', action: 'save-error' },
        ],
      }
    } catch (error) {
      console.warn('[fallback] LLM fallback failed, using static template:', error)
    }
  }
  
  // Ultimate fallback: static template
  return {
    id: nanoid(),
    question: stem,
    kind: 'FALLBACK',
    translation: '（題目翻譯待補充）',
    cues: [],
    options: options.map((o) => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
      reason: '分析中',
    })),
    steps: [],
    correct: {
      key: options[0]?.key || 'A',
      text: options[0]?.text || '',
      reason: '請參考其他資料',
    },
    vocab: [],
    nextActions: [
      { label: '換同型題', action: 'drill-similar' },
      { label: '加入錯題本', action: 'save-error' },
    ],
  }
}

