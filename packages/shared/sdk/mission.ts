import type { BaseClient } from './baseClient';
import type {
  GetMissionsResponse,
  StartMissionRequest,
  StartMissionResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  CompleteMissionRequest,
  CompleteMissionResponse,
  GetSimilarQuestionRequest,
  GetSimilarQuestionResponse,
} from '../types';
import { track } from '../analytics';

/**
 * Module 3: Micro-Mission Cards - SDK Methods
 *
 * Provides client-side API for daily missions
 */

export function createMissionAPI(client: BaseClient) {
  return {
    /**
     * Get user's missions (today + recent + streak)
     */
    async getMissions(): Promise<GetMissionsResponse> {
      return client.request<GetMissionsResponse>('/api/missions');
    },

    /**
     * Start today's mission
     * Tracks mission.start event
     */
    async startMission(request: StartMissionRequest = {}): Promise<StartMissionResponse> {
      const response = await client.request<StartMissionResponse>('/api/missions/start', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      // Track mission start event
      if (response.success && response.userMission) {
        track('mission.start', {
          userMissionId: response.userMission.id,
          missionDate: response.userMission.missionDate,
          questionCount: response.userMission.questionCount,
          packCount: response.userMission.packCount,
          errorBookCount: response.userMission.errorBookCount,
        });
      }

      return response;
    },

    /**
     * Submit answer for a question
     * Tracks practice.answer event
     */
    async answerQuestion(request: AnswerQuestionRequest): Promise<AnswerQuestionResponse> {
      const response = await client.request<AnswerQuestionResponse>('/api/missions/answer', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      // Track answer event
      if (response.success) {
        track('practice.answer', {
          userMissionId: request.userMissionId,
          questionId: request.questionId,
          isCorrect: response.isCorrect,
          timeSpentMs: request.timeSpentMs,
        });
      }

      return response;
    },

    /**
     * Complete mission
     * Tracks mission.complete event
     */
    async completeMission(request: CompleteMissionRequest): Promise<CompleteMissionResponse> {
      const response = await client.request<CompleteMissionResponse>('/api/missions/complete', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      // Track mission complete event
      if (response.success && response.summary) {
        track('mission.complete', {
          userMissionId: request.userMissionId,
          missionDate: response.userMission.missionDate,
          correctCount: response.summary.correctCount,
          totalQuestions: response.summary.totalQuestions,
          accuracy: response.summary.accuracy,
          timeSpentSeconds: response.summary.timeSpentSeconds,
        });
      }

      return response;
    },

    /**
     * Get similar question for Immediate Retry
     * Same skill, near difficulty
     */
    async getSimilarQuestion(
      request: GetSimilarQuestionRequest
    ): Promise<GetSimilarQuestionResponse> {
      return client.request<GetSimilarQuestionResponse>('/api/missions/similar-question', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    /**
     * Abandon mission (if started but not completed)
     */
    async abandonMission(userMissionId: string): Promise<{ success: boolean }> {
      // Track abandon event
      track('mission.abandon', {
        userMissionId,
      });

      // Note: Backend endpoint can be added later if needed
      // For now, just track the event
      return { success: true };
    },
  };
}
