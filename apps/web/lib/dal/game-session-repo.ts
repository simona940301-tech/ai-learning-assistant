import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Types
// ============================================

export type GameType = 'editor_mode' | 'detective_log'
export type GameDifficulty = 'easy' | 'medium' | 'hard'

export interface GameSession {
    id: string
    user_id: string
    game_type: GameType
    difficulty?: GameDifficulty
    started_at: string
    completed_at?: string
    abandoned_at?: string
    score?: number
    total_possible?: number
    accuracy?: number
    time_spent_seconds?: number
    telemetry: Record<string, any>
    xp_granted: number
    coins_granted: number
    progression_applied: boolean
    progression_applied_at?: string
    metadata: Record<string, any>
    created_at: string
    updated_at: string
}

export interface CreateGameSessionParams {
    user_id: string
    game_type: GameType
    difficulty?: GameDifficulty
    metadata?: Record<string, any>
}

export interface UpdateGameSessionParams {
    completed_at?: string
    abandoned_at?: string
    score?: number
    total_possible?: number
    time_spent_seconds?: number
    telemetry?: Record<string, any>
    xp_granted?: number
    coins_granted?: number
    progression_applied?: boolean
    progression_applied_at?: string
    metadata?: Record<string, any>
}

export interface GameTelemetryEvent {
    id: string
    session_id: string
    user_id: string
    event_type: string
    event_data: Record<string, any>
    timestamp_ms: number
    created_at: string
}

export interface CreateTelemetryEventParams {
    session_id: string
    user_id: string
    event_type: string
    event_data: Record<string, any>
    timestamp_ms: number
}

// ============================================
// Repository (DAL Layer)
// ============================================

export class GameSessionRepo {
    constructor(private db: SupabaseClient) { }

    /**
     * Create a new game session
     */
    async create(params: CreateGameSessionParams): Promise<GameSession | null> {
        const { data, error } = await this.db
            .from('game_sessions')
            .insert({
                user_id: params.user_id,
                game_type: params.game_type,
                difficulty: params.difficulty,
                metadata: params.metadata || {},
            })
            .select()
            .single()

        if (error) {
            console.error('[GameSessionRepo] Failed to create session:', error)
            return null
        }

        return data as GameSession
    }

    /**
     * Get session by ID
     */
    async getById(sessionId: string): Promise<GameSession | null> {
        const { data, error } = await this.db
            .from('game_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()

        if (error) {
            console.error('[GameSessionRepo] Failed to get session:', error)
            return null
        }

        return data as GameSession
    }

    /**
     * Update session
     */
    async update(
        sessionId: string,
        params: UpdateGameSessionParams
    ): Promise<GameSession | null> {
        const { data, error } = await this.db
            .from('game_sessions')
            .update(params)
            .eq('id', sessionId)
            .select()
            .single()

        if (error) {
            console.error('[GameSessionRepo] Failed to update session:', error)
            return null
        }

        return data as GameSession
    }

    /**
     * Get user's recent sessions
     */
    async getRecentByUser(
        userId: string,
        gameType?: GameType,
        limit: number = 10
    ): Promise<GameSession[]> {
        let query = this.db
            .from('game_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (gameType) {
            query = query.eq('game_type', gameType)
        }

        const { data, error } = await query

        if (error) {
            console.error('[GameSessionRepo] Failed to get recent sessions:', error)
            return []
        }

        return (data || []) as GameSession[]
    }

    /**
     * Get sessions pending progression
     */
    async getPendingProgression(userId: string): Promise<GameSession[]> {
        const { data, error } = await this.db
            .from('game_sessions')
            .select('*')
            .eq('user_id', userId)
            .not('completed_at', 'is', null)
            .eq('progression_applied', false)
            .order('completed_at', { ascending: true })

        if (error) {
            console.error('[GameSessionRepo] Failed to get pending sessions:', error)
            return []
        }

        return (data || []) as GameSession[]
    }

    /**
     * Mark progression as applied
     */
    async markProgressionApplied(
        sessionId: string,
        xpGranted: number,
        coinsGranted: number
    ): Promise<boolean> {
        const { error } = await this.db
            .from('game_sessions')
            .update({
                progression_applied: true,
                progression_applied_at: new Date().toISOString(),
                xp_granted: xpGranted,
                coins_granted: coinsGranted,
            })
            .eq('id', sessionId)

        if (error) {
            console.error('[GameSessionRepo] Failed to mark progression:', error)
            return false
        }

        return true
    }

    /**
     * Create telemetry event
     */
    async createEvent(
        params: CreateTelemetryEventParams
    ): Promise<GameTelemetryEvent | null> {
        const { data, error } = await this.db
            .from('game_telemetry_events')
            .insert(params)
            .select()
            .single()

        if (error) {
            console.error('[GameSessionRepo] Failed to create event:', error)
            return null
        }

        return data as GameTelemetryEvent
    }

    /**
     * Get events for session
     */
    async getEventsBySession(sessionId: string): Promise<GameTelemetryEvent[]> {
        const { data, error } = await this.db
            .from('game_telemetry_events')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp_ms', { ascending: true })

        if (error) {
            console.error('[GameSessionRepo] Failed to get events:', error)
            return []
        }

        return (data || []) as GameTelemetryEvent[]
    }

    /**
     * Get user statistics for a game type
     */
    async getUserStats(
        userId: string,
        gameType: GameType
    ): Promise<{
        total_sessions: number
        completed_sessions: number
        average_score: number
        average_accuracy: number
        total_xp_earned: number
    } | null> {
        const { data, error } = await this.db.rpc('get_user_game_stats', {
            p_user_id: userId,
            p_game_type: gameType,
        })

        if (error) {
            console.error('[GameSessionRepo] Failed to get stats:', error)
            return null
        }

        return data
    }
}
