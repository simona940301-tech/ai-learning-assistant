import { z } from 'zod';

/**
 * Module 3: Micro-Mission Cards - Type Definitions
 *
 * Daily missions with 3-5 questions from installed packs + error book
 */

// ========================================
// Core Mission Types
// ========================================

/**
 * Mission status lifecycle
 */
export const MissionStatusSchema = z.enum(['draft', 'active', 'archived']);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;

/**
 * User mission status lifecycle
 */
export const UserMissionStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'abandoned']);
export type UserMissionStatus = z.infer<typeof UserMissionStatusSchema>;

/**
 * Mission type categories
 */
export const MissionTypeSchema = z.enum(['daily', 'skill_focus', 'review', 'challenge']);
export type MissionType = z.infer<typeof MissionTypeSchema>;

/**
 * Mission event types (for logs)
 */
export const MissionEventTypeSchema = z.enum(['start', 'answer', 'complete', 'abandon']);
export type MissionEventType = z.infer<typeof MissionEventTypeSchema>;

// ========================================
// Mission Template Schema
// ========================================

/**
 * Mission template (reusable configuration)
 */
export const MissionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Target
  targetSkill: z.string().optional(),
  targetTopic: z.string().optional(),
  targetGrade: z.string().optional(),

  // Configuration
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  numQuestions: z.number().int().min(3).max(10).default(5),

  // Source mix
  packRatio: z.number().min(0).max(1).default(0.7), // 70% from packs
  errorBookRatio: z.number().min(0).max(1).default(0.3), // 30% from error book

  // Type
  missionType: MissionTypeSchema.default('daily'),
  status: MissionStatusSchema.default('active'),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
});

export type Mission = z.infer<typeof MissionSchema>;

// ========================================
// User Mission Schema (Instance)
// ========================================

/**
 * User mission instance (one per user per day)
 */
export const UserMissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  missionId: z.string().optional(), // Null for auto-generated daily missions

  // Date
  missionDate: z.string(), // ISO date string (YYYY-MM-DD)

  // Questions
  questionIds: z.array(z.string()), // Array of pack_question IDs
  questionCount: z.number().int().min(0),

  // Source metadata
  packCount: z.number().int().default(0),
  errorBookCount: z.number().int().default(0),

  // Progress
  status: UserMissionStatusSchema.default('pending'),
  correctCount: z.number().int().min(0).default(0),
  totalAnswered: z.number().int().min(0).default(0),

  // Timing
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  timeSpentSeconds: z.number().int().min(0).default(0),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserMission = z.infer<typeof UserMissionSchema>;

/**
 * User mission with question details
 */
export const UserMissionWithQuestionsSchema = UserMissionSchema.extend({
  questions: z.array(
    z.object({
      id: z.string(),
      packId: z.string(),
      stem: z.string(),
      choices: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
      hasExplanation: z.boolean(),
      skill: z.string().optional(),
    })
  ),
});

export type UserMissionWithQuestions = z.infer<typeof UserMissionWithQuestionsSchema>;

// ========================================
// Mission Log Schema
// ========================================

/**
 * Mission event log entry
 */
export const MissionLogSchema = z.object({
  id: z.string(),
  userMissionId: z.string(),
  userId: z.string(),

  // Event
  eventType: MissionEventTypeSchema,
  payload: z.record(z.any()).optional(),

  // Answer-specific fields
  questionId: z.string().optional(),
  isCorrect: z.boolean().optional(),
  timeSpentMs: z.number().int().optional(),

  // Timestamp
  createdAt: z.string(),
});

export type MissionLog = z.infer<typeof MissionLogSchema>;

// ========================================
// Question History Schema
// ========================================

/**
 * User question history (for deduplication)
 */
export const QuestionHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  questionId: z.string(),
  shownAt: z.string(),
  context: z.enum(['mission', 'challenge', 'practice']),
  wasCorrect: z.boolean().optional(),
});

export type QuestionHistory = z.infer<typeof QuestionHistorySchema>;

// ========================================
// API Request/Response Types
// ========================================

/**
 * Start mission request
 */
export const StartMissionRequestSchema = z.object({
  missionDate: z.string().optional(), // Default to today
});

export type StartMissionRequest = z.infer<typeof StartMissionRequestSchema>;

/**
 * Start mission response
 */
export const StartMissionResponseSchema = z.object({
  success: z.boolean(),
  userMission: UserMissionWithQuestionsSchema,
  message: z.string().optional(),
});

export type StartMissionResponse = z.infer<typeof StartMissionResponseSchema>;

/**
 * Answer question request
 */
export const AnswerQuestionRequestSchema = z.object({
  userMissionId: z.string(),
  questionId: z.string(),
  answer: z.string(),
  timeSpentMs: z.number().int().min(0),
});

export type AnswerQuestionRequest = z.infer<typeof AnswerQuestionRequestSchema>;

/**
 * Answer question response
 */
export const AnswerQuestionResponseSchema = z.object({
  success: z.boolean(),
  isCorrect: z.boolean(),
  correctAnswer: z.string(),
  explanation: z.string(),
  progress: z.object({
    correctCount: z.number().int(),
    totalAnswered: z.number().int(),
    questionCount: z.number().int(),
  }),
});

export type AnswerQuestionResponse = z.infer<typeof AnswerQuestionResponseSchema>;

/**
 * Complete mission request
 */
export const CompleteMissionRequestSchema = z.object({
  userMissionId: z.string(),
  timeSpentSeconds: z.number().int().min(0),
});

export type CompleteMissionRequest = z.infer<typeof CompleteMissionRequestSchema>;

/**
 * Complete mission response
 */
export const CompleteMissionResponseSchema = z.object({
  success: z.boolean(),
  userMission: UserMissionSchema,
  summary: z.object({
    correctCount: z.number().int(),
    totalQuestions: z.number().int(),
    accuracy: z.number().min(0).max(1),
    timeSpentSeconds: z.number().int(),
  }),
});

export type CompleteMissionResponse = z.infer<typeof CompleteMissionResponseSchema>;

/**
 * Get missions response
 */
export const GetMissionsResponseSchema = z.object({
  today: UserMissionSchema.optional(),
  recent: z.array(UserMissionSchema),
  streak: z.number().int().min(0),
  totalCompleted: z.number().int().min(0),
});

export type GetMissionsResponse = z.infer<typeof GetMissionsResponseSchema>;

// ========================================
// Analytics Event Payloads
// ========================================

/**
 * mission.start event payload
 */
export const MissionStartEventSchema = z.object({
  userMissionId: z.string(),
  missionDate: z.string(),
  questionCount: z.number().int(),
  packCount: z.number().int(),
  errorBookCount: z.number().int(),
  timestamp: z.string(),
});

export type MissionStartEvent = z.infer<typeof MissionStartEventSchema>;

/**
 * practice.answer event payload (extends shop events)
 */
export const PracticeAnswerEventSchema = z.object({
  userMissionId: z.string(),
  questionId: z.string(),
  isCorrect: z.boolean(),
  timeSpentMs: z.number().int(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  skill: z.string().optional(),
  timestamp: z.string(),
});

export type PracticeAnswerEvent = z.infer<typeof PracticeAnswerEventSchema>;

/**
 * mission.complete event payload
 */
export const MissionCompleteEventSchema = z.object({
  userMissionId: z.string(),
  missionDate: z.string(),
  correctCount: z.number().int(),
  totalQuestions: z.number().int(),
  accuracy: z.number().min(0).max(1),
  timeSpentSeconds: z.number().int(),
  timestamp: z.string(),
});

export type MissionCompleteEvent = z.infer<typeof MissionCompleteEventSchema>;

// ========================================
// Immediate Retry Types
// ========================================

/**
 * Similar question request (for Immediate Retry)
 */
export const GetSimilarQuestionRequestSchema = z.object({
  currentQuestionId: z.string(),
  skill: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
});

export type GetSimilarQuestionRequest = z.infer<typeof GetSimilarQuestionRequestSchema>;

/**
 * Similar question response
 */
export const GetSimilarQuestionResponseSchema = z.object({
  success: z.boolean(),
  question: z
    .object({
      id: z.string(),
      stem: z.string(),
      choices: z.array(z.string()),
      difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
      skill: z.string(),
    })
    .optional(),
  message: z.string().optional(),
});

export type GetSimilarQuestionResponse = z.infer<typeof GetSimilarQuestionResponseSchema>;

// ========================================
// Helper Functions
// ========================================

/**
 * Calculate mission accuracy
 */
export function calculateAccuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100) / 100;
}

/**
 * Check if mission is completed
 */
export function isMissionCompleted(mission: UserMission): boolean {
  return mission.status === 'completed';
}

/**
 * Check if mission is in progress
 */
export function isMissionInProgress(mission: UserMission): boolean {
  return mission.status === 'in_progress';
}

/**
 * Get mission progress percentage
 */
export function getMissionProgress(mission: UserMission): number {
  if (mission.questionCount === 0) return 0;
  return Math.round((mission.totalAnswered / mission.questionCount) * 100);
}
