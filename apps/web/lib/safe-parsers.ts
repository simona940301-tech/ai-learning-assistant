import { z } from 'zod'
import { safeText } from '@/lib/safe-text'

/**
 * ExplainViewModel Schema with safe defaults
 * 確保所有欄位都有預設值，避免類型錯誤
 */
export const ExplainViewModelSchema = z.object({
  kind: z.enum(['vocab', 'fill-in-cloze', 'sentence-completion', 'discourse', 'reading', 'translation', 'essay', 'hybrid']),
  mode: z.enum(['fast', 'deep']),
  difficultyTag: z.enum(['easy', 'medium', 'hard']).optional(),
  answer: z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]).transform((val) => safeText(val, '')),
  briefReason: z.union([z.string(), z.null(), z.undefined()]).transform((val) => safeText(val, '依據文意判定。')),
  cnTranslation: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) => val ? safeText(val, '') : undefined),
  fullExplanation: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) => val ? safeText(val, '') : undefined),
  distractorNotes: z.array(z.object({
    option: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => safeText(val, '')),
    note: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => safeText(val, '')),
  })).optional(),
  grammarHighlights: z.array(z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => safeText(val, ''))).optional(),
  evidenceBlocks: z.array(z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((val) => safeText(val, ''))).optional(),
  discourseRole: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) => val ? safeText(val, '') : undefined),
  mixAnswerExtra: z.union([z.string(), z.null(), z.undefined()]).optional().transform((val) => val ? safeText(val, '') : undefined),
})

/**
 * Safe parse ExplainViewModel with defaults
 */
export function safeParseExplainViewModel(data: unknown): z.infer<typeof ExplainViewModelSchema> {
  try {
    return ExplainViewModelSchema.parse(data)
  } catch (error) {
    console.error('[safeParseExplainViewModel] Parse error:', error)
    // Return minimal safe default
    return {
      kind: 'vocab',
      mode: 'fast',
      answer: '',
      briefReason: '解析生成失敗，請稍後再試。',
    }
  }
}





