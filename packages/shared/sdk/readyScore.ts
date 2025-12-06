import { BaseClient } from './baseClient';
import { ReadyScoreResult, ReadyScoreQuestion, Subject, LearningLevel } from '../types/readyScore';

export interface GenerateTestParams {
  subject: Subject;
  level: LearningLevel;
  questionCount: number;
}

export function createReadyScoreAPI(client: BaseClient) {
  return {
    generateTest: (params: GenerateTestParams) =>
      client.request<ReadyScoreQuestion[]>('/api/ready-score/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    submitTest: (answers: any) =>
      client.request<ReadyScoreResult>('/api/ready-score/submit', {
        method: 'POST',
        body: JSON.stringify(answers),
      }),

    calculateLevel: (score: number): ReadyScoreResult['level'] => {
      if (score >= 85) return 'A';
      if (score >= 60) return 'B';
      return 'C';
    },
  };
}
