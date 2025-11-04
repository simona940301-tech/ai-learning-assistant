import { BaseClient } from './baseClient';
import { createAuthAPI } from './auth';
import { createReadyScoreAPI } from './readyScore';
import { createQuestionAPI } from './question';
import { createErrorBookAPI } from './errorBook';
import { createQuestionUploadAPI } from './questionUpload';
import { createPackAPI } from './pack';
import { createMissionAPI } from './mission';

export function createPLMSClient(options: {
  baseUrl: string;
  token?: string;
  platform?: 'web' | 'mobile' | 'desktop';
}) {
  const client = new BaseClient(options.baseUrl, options.token);
  return {
    auth: createAuthAPI(client),
    readyScore: createReadyScoreAPI(client),
    question: createQuestionAPI(client),
    errorBook: createErrorBookAPI(client),
    pack: createPackAPI(client), // Module 2: Shop
    mission: createMissionAPI(client), // Module 3: Micro-Missions
    // Internal APIs
    internal: {
      questionUpload: createQuestionUploadAPI(client),
    },
  };
}

export type PLMSClient = ReturnType<typeof createPLMSClient>;
