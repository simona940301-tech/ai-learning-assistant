/**
 * PLMS Solve System - Type Definitions
 * Mobile-first single-entry solve interface
 */

import { z } from 'zod'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SolveSubjectSchema = z.enum([
  'english',
  'math',
  'chinese',
  'social',
  'science',
  'unknown',
])
export type SolveSubject = z.infer<typeof SolveSubjectSchema>

export const SolveIntentSchema = z.enum([
  'ExplainQuestion',
  'GenerateSimilar',
  'SummarizeKeyPoints',
])
export type SolveIntent = z.infer<typeof SolveIntentSchema>

export const DifficultyLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'mixed'])
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>

export const ContentSourceSchema = z.enum(['backpack', 'past_papers'])
export type ContentSource = z.infer<typeof ContentSourceSchema>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT ROUTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const IntentRouterRequestSchema = z.object({
  input: z.string().min(1),
  context: z
    .object({
      hasImage: z.boolean().optional(),
      previousIntent: SolveIntentSchema.optional(),
    })
    .optional(),
})
export type IntentRouterRequest = z.infer<typeof IntentRouterRequestSchema>

export const IntentRouterResponseSchema = z.object({
  intent: SolveIntentSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
})
export type IntentRouterResponse = z.infer<typeof IntentRouterResponseSchema>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SLOT EXTRACTOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Common slots
const BaseSlotSchema = z.object({
  subject: SolveSubjectSchema,
})

// ExplainQuestion slots
export const ExplainQuestionSlotsSchema = BaseSlotSchema.extend({})
export type ExplainQuestionSlots = z.infer<typeof ExplainQuestionSlotsSchema>

// GenerateSimilar slots
export const GenerateSimilarSlotsSchema = BaseSlotSchema.extend({
  difficulty: DifficultyLevelSchema.default('mixed'),
  count: z.number().int().min(1).max(20).default(10),
  skillTags: z.array(z.string()).default([]),
  sources: z.array(ContentSourceSchema).default(['backpack', 'past_papers']),
})
export type GenerateSimilarSlots = z.infer<typeof GenerateSimilarSlotsSchema>

// SummarizeKeyPoints slots
export const SummarizeKeyPointsSlotsSchema = BaseSlotSchema.extend({
  target: z.enum(['exam_tips', 'concepts', 'vocab']).default('exam_tips'),
  maxBullets: z.number().int().min(1).max(10).default(5),
})
export type SummarizeKeyPointsSlots = z.infer<typeof SummarizeKeyPointsSlotsSchema>

export const SlotExtractorRequestSchema = z.object({
  intent: SolveIntentSchema,
  input: z.string(),
})
export type SlotExtractorRequest = z.infer<typeof SlotExtractorRequestSchema>

export const SlotExtractorResponseSchema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('ExplainQuestion'), slots: ExplainQuestionSlotsSchema }),
  z.object({ intent: z.literal('GenerateSimilar'), slots: GenerateSimilarSlotsSchema }),
  z.object({ intent: z.literal('SummarizeKeyPoints'), slots: SummarizeKeyPointsSlotsSchema }),
])
export type SlotExtractorResponse = z.infer<typeof SlotExtractorResponseSchema>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCRIPT GENERATOR (plms.script.v1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ScriptMetadataSchema = z.object({
  requesterRole: z.enum(['student', 'teacher', 'system']).default('student'),
  locale: z.string().default('zh-TW'),
  subject: SolveSubjectSchema,
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  timestamp: z.string().optional(),
})
export type ScriptMetadata = z.infer<typeof ScriptMetadataSchema>

const ExplainParamsSchema = z.object({
  contract: z.literal('AuraExplain.v1').default('AuraExplain.v1'),
})

const SimilarParamsSchema = z.object({
  difficulty: DifficultyLevelSchema,
  count: z.number().int().min(1).max(20),
  skillTags: z.array(z.string()),
  sources: z.array(ContentSourceSchema),
})

const KeyPointsParamsSchema = z.object({
  target: z.enum(['exam_tips', 'concepts', 'vocab']),
  maxBullets: z.number().int().min(1).max(10),
})

export const PLMSScriptSchema = z.discriminatedUnion('kind', [
  z.object({
    version: z.literal('plms.script.v1'),
    kind: z.literal('ExplainQuestion'),
    metadata: ScriptMetadataSchema,
    params: ExplainParamsSchema,
  }),
  z.object({
    version: z.literal('plms.script.v1'),
    kind: z.literal('GenerateSimilar'),
    metadata: ScriptMetadataSchema,
    params: SimilarParamsSchema,
  }),
  z.object({
    version: z.literal('plms.script.v1'),
    kind: z.literal('SummarizeKeyPoints'),
    metadata: ScriptMetadataSchema,
    params: KeyPointsParamsSchema,
  }),
])
export type PLMSScript = z.infer<typeof PLMSScriptSchema>

export const ScriptGeneratorRequestSchema = z.object({
  intent: SolveIntentSchema,
  slots: z.union([ExplainQuestionSlotsSchema, GenerateSimilarSlotsSchema, SummarizeKeyPointsSlotsSchema]),
  input: z.string(),
})
export type ScriptGeneratorRequest = z.infer<typeof ScriptGeneratorRequestSchema>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTOR RESPONSES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DistractorRejectSchema = z.object({
  option: z.string(),
  reason: z.string().optional().default(''),
})

const OptionalTextField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (typeof val !== 'string') return undefined
    const trimmed = val.trim()
    return trimmed.length === 0 ? undefined : trimmed
  })
  .optional()

const GrammarTableRowSchema = z.object({
  category: z.string(),
  description: z.string(),
  example: z.string(),
})

const MawsScoresSchema = z.object({
  content: z.number().min(0).max(5),
  organization: z.number().min(0).max(5),
  sentence_structure: z.number().min(0).max(5),
  vocabulary: z.number().min(0).max(5),
})

const OptionalMawsScoresSchema = z
  .union([MawsScoresSchema, z.null(), z.undefined()])
  .transform((val) => {
    if (!val || typeof val !== 'object') return undefined
    return val
  })
  .optional()

export const ExplainResultSchema = z.object({
  answer: z.string(), // 正確答案 e.g., "答案：A"
  focus: z.string(), // 單詞考點，如「關係子句」
  summary: z.string(), // 一句話解析
  one_line_reason: z.string(), // 首屏 10-20 字理由
  confidence_badge: z.enum(['high', 'medium', 'low']),
  steps: z.array(z.string()).min(3).max(5), // 解題步驟 (3-5 steps)
  details: z.array(z.string()).min(1).max(4), // 詳解段落 (≤4, collapsible)
  distractor_rejects: z.array(DistractorRejectSchema).max(6).default([]),
  evidence_sentence: OptionalTextField,
  tested_rule: OptionalTextField,
  grammatical_focus: OptionalTextField,
  transition_word: OptionalTextField,
  before_after_fit: OptionalTextField,
  native_upgrade: OptionalTextField,
  maws_scores: OptionalMawsScoresSchema,
  grammarTable: z.array(GrammarTableRowSchema).optional(),
  encouragement: z.string().optional(), // 學長姐風格鼓勵（可選）
})
export type ExplainResult = z.infer<typeof ExplainResultSchema>

export const SimilarQuestionSchema = z.object({
  id: z.string(),
  stem: z.string(),
  options: z.array(z.string()).optional(),
  source: z.string(), // e.g., "109年學測 | 第12題"
  difficulty: DifficultyLevelSchema,
  tags: z.array(z.string()),
})
export type SimilarQuestion = z.infer<typeof SimilarQuestionSchema>

export const SimilarResultSchema = z.object({
  questions: z.array(SimilarQuestionSchema).max(20),
  totalFound: z.number(),
  searchQuery: z.string(),
})
export type SimilarResult = z.infer<typeof SimilarResultSchema>

export const KeyPointsResultSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()).max(10),
  examples: z
    .array(
      z.object({
        label: z.string(),
        example: z.string(),
      })
    )
    .optional(),
})
export type KeyPointsResult = z.infer<typeof KeyPointsResultSchema>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SolveView = 'explain' | 'similar' | 'keypoints'

export interface SolveUIState {
  view: SolveView
  isLoading: boolean
  progress: {
    current: number
    total: number
    message: string
  } | null
  error: string | null
  explainResult: ExplainResult | null
  similarResult: SimilarResult | null
  keyPointsResult: KeyPointsResult | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENTS (for analytics)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SolveEvent {
  type:
    | 'ai.intent_routed'
    | 'ai.slots_extracted'
    | 'ai.script_generated'
    | 'ai.executor_started'
    | 'ai.executor_succeeded'
    | 'ai.executor_failed'
    | 'ui.view_switched'
    | 'learning.quiz_added'
  payload: Record<string, unknown>
  timestamp: number
}
