import { z } from 'zod'

export const RefSchema = z.object({
  page: z.number().nonnegative(),
  paragraph: z.number().nonnegative(),
})

export type Ref = z.infer<typeof RefSchema>

export const SummarySectionSchema = z.object({
  text: z.string().min(1),
  refs: z.array(RefSchema).min(1),
})

export type SummarySection = z.infer<typeof SummarySectionSchema>

export const FlashcardPreviewSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  refs: z.array(RefSchema),
  tags: z.array(z.string()),
})

export type FlashcardPreview = z.infer<typeof FlashcardPreviewSchema>

export const CoverageEntrySchema = z.object({
  section: z.enum(['executive_summary', 'why', 'what', 'how', 'check']),
  refs: z.array(RefSchema),
})

export type CoverageEntry = z.infer<typeof CoverageEntrySchema>

export const SummarySheetResponseSchema = z.object({
  executive_summary: SummarySectionSchema,
  why: SummarySectionSchema,
  what: SummarySectionSchema,
  how: SummarySectionSchema,
  check: SummarySectionSchema,
  flashcards: z.array(FlashcardPreviewSchema),
  coverage: z.array(CoverageEntrySchema),
  references: z.array(RefSchema).optional().default([]),
})

export type SummarySheetResponse = z.infer<typeof SummarySheetResponseSchema>
