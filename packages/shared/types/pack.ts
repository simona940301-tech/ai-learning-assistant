import { z } from 'zod';

/**
 * Module 2: Shop (題包系統) - Type Definitions
 *
 * Pack: A collection of questions organized by topic/skill
 */

// ========================================
// Core Pack Types
// ========================================

/**
 * Pack status lifecycle
 */
export const PackStatusSchema = z.enum(['draft', 'published', 'archived', 'expired']);
export type PackStatus = z.infer<typeof PackStatusSchema>;

/**
 * Pack source types (V2)
 * publisher: 出版商 (e.g., 康軒, 翰林)
 * school: 學校 (e.g., 建國中學)
 * internal: PLMS 內部團隊
 */
export const PackSourceSchema = z.enum(['publisher', 'school', 'internal']);
export type PackSource = z.infer<typeof PackSourceSchema>;

/**
 * Pack visibility (V2)
 * public: 公開可見
 * limited: 受限顯示（不合規題包）
 * hidden: 隱藏
 */
export const PackVisibilitySchema = z.enum(['public', 'limited', 'hidden']);
export type PackVisibility = z.infer<typeof PackVisibilitySchema>;

/**
 * AI confidence badge levels
 * ≥0.85 = High, 0.7-0.85 = Mid, <0.7 = Low
 */
export const ConfidenceBadgeSchema = z.enum(['high', 'mid', 'low']);
export type ConfidenceBadge = z.infer<typeof ConfidenceBadgeSchema>;

/**
 * Sort strategies for pack listing
 */
export const PackSortBySchema = z.enum(['latest', 'popular', 'confidence']);
export type PackSortBy = z.infer<typeof PackSortBySchema>;

/**
 * Main Pack schema (V2: added source, visibility, sourceName, sourceId)
 */
export const PackSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Classification
  subject: z.string(),
  topic: z.string(),
  skill: z.string(),
  grade: z.string(), // 國小/國中/高中

  // Content metadata
  itemCount: z.number().int().min(0),
  hasExplanation: z.boolean().default(true), // V2: All packs must have explanations
  explanationRate: z.number().min(0).max(1).default(1), // V2: Default to 100%

  // AI metadata
  avgConfidence: z.number().min(0).max(1),
  confidenceBadge: ConfidenceBadgeSchema,

  // Status & visibility (V2: added visibility)
  status: PackStatusSchema,
  visibility: PackVisibilitySchema.default('public'), // V2: Visibility control
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),

  // Source attribution (V2)
  source: PackSourceSchema.default('internal'), // V2: Pack source type
  sourceName: z.string().optional(), // V2: Human-readable source (e.g., "康軒出版社")
  sourceId: z.string().optional(), // V2: Machine-readable ID (e.g., "publisher-knsh")

  // Stats
  installCount: z.number().int().min(0).default(0),
  completionRate: z.number().min(0).max(1).default(0), // For future use

  // QR & aliases
  qrAlias: z.string().optional(), // Short alias for QR code

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),

  // Creator (for internal use)
  createdBy: z.string().optional(),
});

export type Pack = z.infer<typeof PackSchema>;

/**
 * Pack with user installation status
 */
export const PackWithStatusSchema = PackSchema.extend({
  isInstalled: z.boolean().default(false),
  installedAt: z.string().optional(),
});

export type PackWithStatus = z.infer<typeof PackWithStatusSchema>;

// ========================================
// Filter & Query Types
// ========================================

/**
 * Filter options for pack browsing (V2: added source filter)
 */
export const PackFilterSchema = z.object({
  subject: z.string().optional(),
  topic: z.string().optional(),
  skill: z.string().optional(),
  grade: z.string().optional(),
  source: PackSourceSchema.optional(), // V2: Filter by source
  hasExplanation: z.boolean().optional(),
  confidenceBadge: ConfidenceBadgeSchema.optional(),
  sortBy: PackSortBySchema.optional(),
  search: z.string().optional(), // Search in title/description
});

export type PackFilter = z.infer<typeof PackFilterSchema>;

/**
 * Paginated pack list response
 */
export const PackListResponseSchema = z.object({
  packs: z.array(PackWithStatusSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  hasMore: z.boolean(),
});

export type PackListResponse = z.infer<typeof PackListResponseSchema>;

// ========================================
// Pack Preview Types
// ========================================

/**
 * Question preview (without correct answer)
 */
export const QuestionPreviewSchema = z.object({
  id: z.string(),
  stem: z.string(),
  choices: z.array(z.string()),
  hasExplanation: z.boolean(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  // Note: answer and explanation are NOT included in preview
});

export type QuestionPreview = z.infer<typeof QuestionPreviewSchema>;

/**
 * Pack chapter/section structure
 */
export const PackChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  previewQuestions: z.array(QuestionPreviewSchema).max(3), // Show max 3 questions per chapter
});

export type PackChapter = z.infer<typeof PackChapterSchema>;

/**
 * Full pack preview with chapters
 */
export const PackPreviewSchema = PackSchema.extend({
  chapters: z.array(PackChapterSchema),
  totalPreviewItems: z.number().int().min(0),
});

export type PackPreview = z.infer<typeof PackPreviewSchema>;

// ========================================
// Installation Types
// ========================================

/**
 * Installation source tracking
 */
export const InstallSourceSchema = z.enum(['shop', 'qr', 'rs_suggest', 'direct']);
export type InstallSource = z.infer<typeof InstallSourceSchema>;

/**
 * Install pack request
 */
export const InstallPackRequestSchema = z.object({
  packId: z.string(),
  source: InstallSourceSchema.default('shop'),
  listPosition: z.number().int().min(0).optional(), // Position in search results
});

export type InstallPackRequest = z.infer<typeof InstallPackRequestSchema>;

/**
 * Install pack response
 */
export const InstallPackResponseSchema = z.object({
  success: z.boolean(),
  packId: z.string(),
  installedAt: z.string(),
  message: z.string().optional(),
});

export type InstallPackResponse = z.infer<typeof InstallPackResponseSchema>;

/**
 * Uninstall pack request
 */
export const UninstallPackRequestSchema = z.object({
  packId: z.string(),
});

export type UninstallPackRequest = z.infer<typeof UninstallPackRequestSchema>;

/**
 * User's installed packs
 */
export const UserPackInstallationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  packId: z.string(),
  installedAt: z.string(),
  source: InstallSourceSchema,
  listPosition: z.number().int().optional(),
});

export type UserPackInstallation = z.infer<typeof UserPackInstallationSchema>;

// ========================================
// QR Entry Point Types
// ========================================

/**
 * QR entry result
 */
export const QREntryResultSchema = z.object({
  found: z.boolean(),
  pack: PackWithStatusSchema.optional(),
  fallback: z
    .object({
      reason: z.enum(['not_found', 'expired', 'archived']),
      suggestedPacks: z.array(PackWithStatusSchema).max(3),
      message: z.string(),
    })
    .optional(),
});

export type QREntryResult = z.infer<typeof QREntryResultSchema>;

// ========================================
// Analytics Event Payloads
// ========================================

/**
 * pack.search event payload
 */
export const PackSearchEventSchema = z.object({
  query: z.string().optional(),
  filters: PackFilterSchema.partial(),
  resultsCount: z.number().int().min(0),
  timestamp: z.string(),
});

export type PackSearchEvent = z.infer<typeof PackSearchEventSchema>;

/**
 * pack.view event payload
 */
export const PackViewEventSchema = z.object({
  packId: z.string(),
  listPosition: z.number().int().min(0).optional(),
  source: z.enum(['search', 'qr', 'recommendation', 'direct']),
  timestamp: z.string(),
});

export type PackViewEvent = z.infer<typeof PackViewEventSchema>;

/**
 * pack.install event payload
 */
export const PackInstallEventSchema = z.object({
  packId: z.string(),
  source: InstallSourceSchema,
  listPosition: z.number().int().min(0).optional(),
  timestamp: z.string(),
});

export type PackInstallEvent = z.infer<typeof PackInstallEventSchema>;

/**
 * pack.uninstall event payload
 */
export const PackUninstallEventSchema = z.object({
  packId: z.string(),
  installedDuration: z.number().int().min(0).optional(), // Duration in seconds
  timestamp: z.string(),
});

export type PackUninstallEvent = z.infer<typeof PackUninstallEventSchema>;

// ========================================
// Helper Functions
// ========================================

/**
 * Calculate confidence badge from average confidence score
 */
export function getConfidenceBadge(avgConfidence: number): ConfidenceBadge {
  if (avgConfidence >= 0.85) return 'high';
  if (avgConfidence >= 0.7) return 'mid';
  return 'low';
}

/**
 * Check if pack meets minimum quality standards
 * - Must be published
 * - Must have at least 20 items
 */
export function isPackVisible(pack: Pack): boolean {
  return pack.status === 'published' && pack.itemCount >= 20;
}

/**
 * Check if pack is expired
 */
export function isPackExpired(pack: Pack): boolean {
  if (!pack.expiresAt) return false;
  return new Date(pack.expiresAt) < new Date();
}

// ========================================
// Class Challenge Types (V2)
// ========================================

/**
 * Challenge status
 */
export const ChallengeStatusSchema = z.enum(['draft', 'active', 'closed', 'archived']);
export type ChallengeStatus = z.infer<typeof ChallengeStatusSchema>;

/**
 * Challenge visibility
 */
export const ChallengeVisibilitySchema = z.enum(['class', 'school', 'public']);
export type ChallengeVisibility = z.infer<typeof ChallengeVisibilitySchema>;

/**
 * Participant status
 */
export const ParticipantStatusSchema = z.enum(['invited', 'started', 'submitted', 'late_submitted']);
export type ParticipantStatus = z.infer<typeof ParticipantStatusSchema>;

/**
 * Class Challenge schema
 */
export const ClassChallengeSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Pack reference
  packId: z.string(),

  // Challenge settings
  numQuestions: z.number().int().min(1),
  questionTypes: z.array(z.string()).optional(), // e.g., ['選擇題', '計算題']

  // Timing
  deadline: z.string().optional(),
  durationMinutes: z.number().int().optional(),

  // Display settings
  leaderboardVisible: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
  allowRetry: z.boolean().default(false),

  // Visibility
  visibility: ChallengeVisibilitySchema.default('class'),
  targetClassId: z.string().optional(),
  targetGrade: z.string().optional(),

  // Creator
  createdBy: z.string(),

  // Audit
  createdAt: z.string(),
  updatedAt: z.string(),

  // Status
  status: ChallengeStatusSchema.default('draft'),
});

export type ClassChallenge = z.infer<typeof ClassChallengeSchema>;

/**
 * Challenge participant schema
 */
export const ChallengeParticipantSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  userId: z.string(),

  // Status
  status: ParticipantStatusSchema.default('invited'),

  // Results
  score: z.number().int().min(0).default(0),
  correctCount: z.number().int().min(0).default(0),
  totalCount: z.number().int().min(0).default(0),
  timeSpentSeconds: z.number().int().min(0).default(0),

  // Ranking
  rank: z.number().int().min(1).optional(),

  // Timestamps
  startedAt: z.string().optional(),
  submittedAt: z.string().optional(),
  createdAt: z.string(),
});

export type ChallengeParticipant = z.infer<typeof ChallengeParticipantSchema>;

/**
 * Leaderboard entry (top 5)
 */
export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1),
  userId: z.string(),
  userName: z.string(),
  score: z.number().int().min(0),
  correctCount: z.number().int(),
  timeSpentSeconds: z.number().int(),
  submittedAt: z.string(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
