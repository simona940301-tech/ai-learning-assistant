import { z } from 'zod';

export const QuestionSchema = z.object({
  id: z.string(),
  subject: z.string(),
  stem: z.string(),
  choices: z.array(z.string()),
  answer: z.string(),
  explanation: z.string().optional(),
});

export type Question = z.infer<typeof QuestionSchema>;
