/**
 * E0 Question Set VM Schema
 * 
 * 題組結構：將多題統一包裝為 E0_QUESTION_SET
 * 單題也會被包成 1 題的題組，簡化渲染邏輯
 */

import { z } from 'zod'
import type { CanonicalKind } from '@/lib/explain/kind-alias'

/**
 * Single question in a question set
 */
export const E0QuestionSchema = z.object({
  qid: z.number().int().positive(),
  kind: z.custom<CanonicalKind>((val) => {
    // Validation happens in toCanonicalKind
    return typeof val === 'string'
  }),
  stem: z.string().min(1),
  choices: z.array(z.string()).min(2),
  answer: z.string().min(1), // 文本答案（或選項文本）
  answer_label: z.enum(['A', 'B', 'C', 'D']).optional(),
  one_line_reason: z.string().optional().default(''),
  distractor_rejects: z.array(z.object({
    option: z.string(),
    reason: z.string().optional().default(''),
  })).optional().default([]),
  meta: z.record(z.any()).optional().default({}),
})

/**
 * Question Set VM
 */
export const QuestionSetVMSchema = z.object({
  type: z.literal('E0_QUESTION_SET'),
  source_context: z.string().optional().default('N/A'),
  questions: z.array(E0QuestionSchema).min(1),
})

export type QuestionSetVM = z.infer<typeof QuestionSetVMSchema>
export type E0Question = z.infer<typeof E0QuestionSchema>

