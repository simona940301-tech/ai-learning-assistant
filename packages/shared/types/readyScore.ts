import { z } from 'zod';

export const ReadyScoreResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  level: z.enum(['A', 'B', 'C']),
  createdAt: z.string(),
});

export type ReadyScoreResult = z.infer<typeof ReadyScoreResultSchema>;
