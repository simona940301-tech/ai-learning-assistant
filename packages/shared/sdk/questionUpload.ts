import { BaseClient } from './baseClient';
import type {
  QuestionRaw,
  QuestionNormalized,
  UploadResult,
  AILabel,
} from '../types/question-upload';

/**
 * Question Upload SDK
 *
 * Internal use only - for importing and processing question sets
 */
export function createQuestionUploadAPI(client: BaseClient) {
  return {
    /**
     * Upload question file (CSV/Excel/PDF)
     */
    uploadFile: (file: FormData) =>
      client.request<UploadResult>('/api/internal/questions/upload', {
        method: 'POST',
        body: file,
        headers: {}, // FormData sets its own headers
      }),

    /**
     * Get raw questions (pending processing)
     */
    getRawQuestions: (params?: { status?: string; limit?: number }) =>
      client.request<QuestionRaw[]>('/api/internal/questions/raw', {
        method: 'GET',
      }),

    /**
     * Process raw question (normalize + AI label)
     */
    processRawQuestion: (rawId: string) =>
      client.request<QuestionNormalized>(`/api/internal/questions/process/${rawId}`, {
        method: 'POST',
      }),

    /**
     * Override difficulty manually
     */
    overrideDifficulty: (params: {
      questionId: string;
      difficulty: 'easy' | 'medium' | 'hard' | 'expert';
      overriddenBy: string;
      source: string;
    }) =>
      client.request<QuestionNormalized>(`/api/internal/questions/${params.questionId}/override`, {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),

    /**
     * Detect duplicates
     */
    detectDuplicates: (questionId: string) =>
      client.request<{
        isDuplicate: boolean;
        duplicateOf?: string;
        similarity: number;
      }>(`/api/internal/questions/${questionId}/duplicates`, {
        method: 'GET',
      }),

    /**
     * Get normalized questions
     */
    getNormalizedQuestions: (params?: {
      subject?: string;
      difficulty?: string;
      limit?: number;
      offset?: number;
    }) =>
      client.request<QuestionNormalized[]>('/api/internal/questions/normalized', {
        method: 'GET',
      }),
  };
}
