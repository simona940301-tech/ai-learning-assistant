import { BaseClient } from './baseClient';
import { ReadyScoreResult } from '../types/readyScore';

export function createReadyScoreAPI(client: BaseClient) {
  return {
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
