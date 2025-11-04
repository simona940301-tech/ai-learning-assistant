import { z } from 'zod'
import { nanoid } from 'nanoid'

/**
 * English Question Type Router Output
 */
export type EnglishType = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'FALLBACK'

export const EnglishRouteSchema = z.object({
  type: z.enum(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'FALLBACK']),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string()),
  reason: z.string().optional(),
})

export type EnglishRoute = z.infer<typeof EnglishRouteSchema>

/**
 * Explain Card Building Blocks
 */
export const ExplainStepSchema = z.object({
  title: z.string(),
  detail: z.string().optional(),
})

export const NextActionSchema = z.object({
  label: z.string(),
  action: z.string(),
})

export const VocabItemSchema = z.object({
  term: z.string(),
  pos: z.string().optional(),
  zh: z.string().optional(),
})

export const OptionAnalysisSchema = z.object({
  key: z.string(),
  text: z.string(),
  zh: z.string().optional(),
  verdict: z.enum(['fit', 'unfit', 'unknown']).default('unknown'),
  reason: z.string().optional(),
})

export const CorrectAnswerSchema = z.object({
  key: z.string(),
  text: z.string(),
  reason: z.string().optional(),
})

/**
 * Unified ExplainCard Schema
 */
export const ExplainCardSchema = z.object({
  id: z.string(),
  question: z.string(),
  kind: z.enum(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'FALLBACK']),
  translation: z.string().optional(),
  cues: z.array(z.string()).default([]),
  options: z.array(OptionAnalysisSchema).default([]),
  steps: z.array(ExplainStepSchema).default([]),
  correct: CorrectAnswerSchema.optional(),
  vocab: z.array(VocabItemSchema).default([]),
  meta: z.record(z.string(), z.any()).optional(),
  nextActions: z.array(NextActionSchema).default([
    { label: '換同型題', action: 'drill-similar' },
    { label: '加入錯題本', action: 'save-error' },
  ]),
})

export type ExplainCard = z.infer<typeof ExplainCardSchema>
export type ExplainStep = z.infer<typeof ExplainStepSchema>
export type VocabItem = z.infer<typeof VocabItemSchema>
export type OptionAnalysis = z.infer<typeof OptionAnalysisSchema>
export type CorrectAnswer = z.infer<typeof CorrectAnswerSchema>

/**
 * Input for English Explanation Pipeline
 */
export interface EnglishQuestionInput {
  stem: string
  options: Array<{ key: string; text: string }>
  meta?: Record<string, any>
}

/**
 * Output from Orchestrator
 */
export interface EnglishExplanationResult {
  card: ExplainCard
  routing: EnglishRoute
  issues?: string[]
}

/**
 * Normalize API response to ExplainCard
 * Accepts ONLY new ExplainCard format (E1-E5, FALLBACK)
 * Legacy conversion is DISABLED - API must return proper ExplainCard
 */
export function normalizeSolveResult(result: any): ExplainCard | null {
  console.log('[explain_pipeline] Normalizing result, keys:', Object.keys(result || {}))

  // Try to get card from API response
  const rawCard = result.explanation?.card

  if (!rawCard) {
    console.error('[explain_pipeline] No card found in response.explanation.card')
    console.error('[explain_pipeline] Available keys:', Object.keys(result || {}))
    return null
  }

  // Validate it's a proper ExplainCard
  const parseResult = ExplainCardSchema.safeParse(rawCard)

  if (!parseResult.success) {
    console.error('[explain_pipeline] Card validation failed:', parseResult.error.issues)
    console.error('[explain_pipeline] Raw card:', rawCard)
    return null
  }

  const card = parseResult.data
  console.log('[explain_pipeline] card.accepted=true kind=' + card.kind + ' options=' + (card.options?.length ?? 0) + ' vocab=' + (card.vocab?.length ?? 0))

  return card
}

