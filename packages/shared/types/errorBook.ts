import { z } from 'zod';

export const ErrorItemSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  cause: z.string(),
  mastered: z.boolean(),
  createdAt: z.string(),
});

export type ErrorItem = z.infer<typeof ErrorItemSchema>;
