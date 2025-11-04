import { z } from 'zod';

/**
 * Question Upload Pipeline Types
 *
 * For internal use only - importing question sets from CSV/Excel/PDF
 */

export const QuestionRawSchema = z.object({
  id: z.string(),
  sourceFile: z.string(),
  rawContent: z.string(),
  uploadedAt: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  errorMessage: z.string().optional(),
});

export type QuestionRaw = z.infer<typeof QuestionRawSchema>;

export const AILabelSchema = z.object({
  topic: z.string(),
  skill: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  errorTypes: z.array(z.string()),
  grade: z.string(),
  confidence: z.number().min(0).max(1),
  labeledAt: z.string(),
  version: z.string(),
});

export type AILabel = z.infer<typeof AILabelSchema>;

export const QuestionNormalizedSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  subject: z.string(),
  stem: z.string(),
  choices: z.array(z.string()).min(4), // CR5: At least 4 choices
  answer: z.string(),
  explanation: z.string().optional(),
  aiLabel: AILabelSchema,
  // CR2: Label traceability
  labelSource: z.enum(['ai', 'teacher_override', 'system']).default('ai'),
  labelVersion: z.number().int().positive().default(1),
  lastModifiedBy: z.string().optional(),
  modifiedAt: z.string().optional(),
  // CR2: Separate predicted vs final
  predictedDifficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  finalDifficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  // CR3: Confidence with reason
  confidence: z.number().min(0).max(1),
  confidenceReason: z.string().optional(),
  manualOverride: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
    overriddenBy: z.string().optional(),
    overriddenAt: z.string().optional(),
    source: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
  // CR1: Enhanced deduplication
  semanticHash: z.string().optional(),
  isDuplicate: z.boolean().default(false),
  duplicateOf: z.string().optional(),
  duplicateGroupId: z.string().optional(),
  dedupeMethod: z.enum(['semantic', 'lexical']).optional(),
  // CR4: Batch tracking
  batchId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuestionNormalized = z.infer<typeof QuestionNormalizedSchema>;

export const UploadResultSchema = z.object({
  // CR4: Batch tracking
  batchId: z.string(),
  totalRows: z.number(),
  processed: z.number(),
  duplicates: z.number(),
  errors: z.number(),
  retried: z.number().default(0),
  questionIds: z.array(z.string()),
  errorDetails: z.array(z.object({
    row: z.number(),
    error: z.string(),
  })),
  // CR4: Idempotency
  idempotencyKey: z.string().optional(),
  isResubmission: z.boolean().default(false),
});

export type UploadResult = z.infer<typeof UploadResultSchema>;
