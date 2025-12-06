import { z } from 'zod';

export const ReadyScoreResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  level: z.enum(['A', 'B', 'C']),
  createdAt: z.string(),
});

export type ReadyScoreResult = z.infer<typeof ReadyScoreResultSchema>;

// Subject types
export type Subject = 'math' | 'english' | 'chinese' | 'science' | 'social';

// Learning level types
export type LearningLevel =
  | 'elementary_1' | 'elementary_2' | 'elementary_3'
  | 'elementary_4' | 'elementary_5' | 'elementary_6'
  | 'junior_high_1' | 'junior_high_2' | 'junior_high_3'
  | 'senior_high_1' | 'senior_high_2' | 'senior_high_3';

// Question type for ready score tests
export interface ReadyScoreQuestion {
  id: string;
  subject: Subject;
  level: LearningLevel;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
}
