import type { SupabaseClient } from '@supabase/supabase-js'
import {
    GameSessionRepo,
    type GameType,
    type GameDifficulty,
    type GameSession,
    type CreateTelemetryEventParams,
} from '@/lib/dal/game-session-repo'

// ============================================
// Types
// ============================================

export interface StartGameSessionParams {
    userId: string
    gameType: GameType
    difficulty?: GameDifficulty
    metadata?: Record<string, any>
}

export interface RecordGameProgressParams {
    sessionId: string
    telemetry: Record<string, any>
    currentScore?: number
    currentTotal?: number
}

export interface CompleteGameSessionParams {
    sessionId: string
    score: number
    totalPossible: number
    telemetry: Record<string, any>
    timeSpentSeconds: number
}

export interface RecordEventParams {
    sessionId: string
    userId: string
    eventType: string
    eventData: Record<string, any>
    timestampMs: number
}

// ============================================
// Service Layer
// ============================================

export class GameTelemetryService {
    private repo: GameSessionRepo

    constructor(db: SupabaseClient) {
        this.repo = new GameSessionRepo(db)
    }

    /**
     * Start a new game session
     * Returns session ID for tracking
     */
    async startSession(params: StartGameSessionParams): Promise<string | null> {
        const session = await this.repo.create({
            user_id: params.userId,
            game_type: params.gameType,
            difficulty: params.difficulty,
            metadata: params.metadata,
        })

        if (!session) {
            console.error('[GameTelemetryService] Failed to start session')
            return null
        }

        console.log(`[GameTelemetryService] Started session ${session.id} for user ${params.userId}`)
        return session.id
    }

    /**
     * Record progress during gameplay
     * Updates telemetry and optionally current score
     */
    async recordProgress(params: RecordGameProgressParams): Promise<boolean> {
        const updateData: any = {
            telemetry: params.telemetry,
        }

        if (params.currentScore !== undefined) {
            updateData.score = params.currentScore
        }

        if (params.currentTotal !== undefined) {
            updateData.total_possible = params.currentTotal
        }

        const updated = await this.repo.update(params.sessionId, updateData)

        if (!updated) {
            console.error('[GameTelemetryService] Failed to record progress')
            return false
        }

        return true
    }

    /**
     * Complete a game session
     * Marks session as complete with final score and telemetry
     */
    async completeSession(params: CompleteGameSessionParams): Promise<GameSession | null> {
        const session = await this.repo.update(params.sessionId, {
            completed_at: new Date().toISOString(),
            score: params.score,
            total_possible: params.totalPossible,
            telemetry: params.telemetry,
            time_spent_seconds: params.timeSpentSeconds,
        })

        if (!session) {
            console.error('[GameTelemetryService] Failed to complete session')
            return null
        }

        console.log(
            `[GameTelemetryService] Completed session ${params.sessionId}: ${params.score}/${params.totalPossible}`
        )

        return session
    }

    /**
     * Abandon a session (user quit without completing)
     */
    async abandonSession(sessionId: string): Promise<boolean> {
        const session = await this.repo.update(sessionId, {
            abandoned_at: new Date().toISOString(),
        })

        return !!session
    }

    /**
     * Record a fine-grained telemetry event
     * For detailed tracking (e.g., individual chip drags, highlights)
     */
    async recordEvent(params: RecordEventParams): Promise<boolean> {
        const event = await this.repo.createEvent({
            session_id: params.sessionId,
            user_id: params.userId,
            event_type: params.eventType,
            event_data: params.eventData,
            timestamp_ms: params.timestampMs,
        })

        return !!event
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string): Promise<GameSession | null> {
        return this.repo.getById(sessionId)
    }

    /**
     * Get user's recent sessions
     */
    async getUserRecentSessions(
        userId: string,
        gameType?: GameType,
        limit?: number
    ): Promise<GameSession[]> {
        return this.repo.getRecentByUser(userId, gameType, limit)
    }

    /**
     * Get sessions pending progression
     * Used by progression service to apply rewards
     */
    async getPendingProgression(userId: string): Promise<GameSession[]> {
        return this.repo.getPendingProgression(userId)
    }

    /**
     * Mark progression as applied
     * Called by progression service after granting XP/rewards
     */
    async markProgressionApplied(
        sessionId: string,
        xpGranted: number,
        coinsGranted: number
    ): Promise<boolean> {
        return this.repo.markProgressionApplied(sessionId, xpGranted, coinsGranted)
    }

    /**
     * Get user statistics for analytics
     */
    async getUserStats(userId: string, gameType: GameType) {
        return this.repo.getUserStats(userId, gameType)
    }

    /**
     * Validate session belongs to user (for security)
     */
    async validateSessionOwnership(sessionId: string, userId: string): Promise<boolean> {
        const session = await this.repo.getById(sessionId)
        return session?.user_id === userId
    }
}
