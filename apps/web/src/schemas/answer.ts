import { z } from 'zod'

export const TutorAnswerRequestSchema = z.object({
  questionId: z.string().min(1, 'questionId is required').optional(), // Make optional since we might use option_id
  userAnswer: z.string().min(1, 'userAnswer is required'),
  concept_id: z.string().optional(),
  keypoint_id: z.string().optional(),
  option_id: z.string().optional(), // Remove UUID requirement for flexibility
  session_id: z.string().optional() // Remove UUID requirement for flexibility
}).refine(
  (data) => data.questionId || data.option_id || data.session_id,
  { message: 'Either questionId, option_id, or session_id is required' }
)

export type TutorAnswerRequest = z.infer<typeof TutorAnswerRequestSchema>

export const TutorAnswerResponseSchema = z.object({
  correct: z.boolean(),
  expected: z.string().nullable(),
  concept_id: z.string().nullable(),
  rationale: z.string().nullable()
})

export type TutorAnswerResponse = z.infer<typeof TutorAnswerResponseSchema>

