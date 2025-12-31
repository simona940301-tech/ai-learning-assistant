import type { SupabaseClient } from '@supabase/supabase-js'
import { GameSessionRepo } from '@/lib/dal/game-session-repo'
import {
    GameEventType,
    type GameEventPayload,
    type BaseEventPayload,
    getEventCategory,
} from '@/lib/telemetry/event-types'

// ============================================
// Types
// ============================================

export interface RecordEventParams {
    sessionId: string
    userId: string
    eventType: GameEventType
    payload: GameEventPayload
    timestampMs: number
}

export interface BatchRecordEventsParams {
    sessionId: string
    userId: string
    events: Array<{
        eventType: GameEventType
        payload: GameEventPayload
        timestampMs: number
    }>
}

export interface EventSummary {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByCategory: Record<string, number>
    criticalEvents: number
    firstEventTime: number
    lastEventTime: number
    sessionDuration: number
}

// ============================================
// Event Telemetry Service
// ============================================

/**
 * Service for recording and analyzing fine-grained game events
 * Complements GameTelemetryService with event-stream capabilities
 */
export class EventTelemetryService {
    private repo: GameSessionRepo

    constructor(db: SupabaseClient) {
        this.repo = new GameSessionRepo(db)
    }

    /**
     * Record a single event
     */
    async recordEvent(params: RecordEventParams): Promise<boolean> {
        const event = await this.repo.createEvent({
            session_id: params.sessionId,
            user_id: params.userId,
            event_type: params.eventType,
            event_data: params.payload as Record<string, any>,
            timestamp_ms: params.timestampMs,
        })

        if (!event) {
            console.error('[EventTelemetryService] Failed to record event:', params.eventType)
            return false
        }

        return true
    }

    /**
     * Record multiple events in batch (more efficient)
     */
    async recordEventsBatch(params: BatchRecordEventsParams): Promise<number> {
        let successCount = 0

        // Note: Could be optimized with bulk insert if needed
        for (const event of params.events) {
            const success = await this.recordEvent({
                sessionId: params.sessionId,
                userId: params.userId,
                eventType: event.eventType,
                payload: event.payload,
                timestampMs: event.timestampMs,
            })

            if (success) successCount++
        }

        console.log(
            `[EventTelemetryService] Recorded ${successCount}/${params.events.length} events for session ${params.sessionId}`
        )

        return successCount
    }

    /**
     * Get all events for a session
     */
    async getSessionEvents(sessionId: string): Promise<any[]> {
        return this.repo.getEventsBySession(sessionId)
    }

    /**
     * Generate event summary for analytics
     * This creates the "compressed summary" that goes in game_sessions.telemetry
     */
    async generateEventSummary(sessionId: string): Promise<EventSummary> {
        const events = await this.getSessionEvents(sessionId)

        if (events.length === 0) {
            return {
                totalEvents: 0,
                eventsByType: {},
                eventsByCategory: {},
                criticalEvents: 0,
                firstEventTime: 0,
                lastEventTime: 0,
                sessionDuration: 0,
            }
        }

        // Count by type
        const eventsByType: Record<string, number> = {}
        const eventsByCategory: Record<string, number> = {}
        let criticalEvents = 0

        events.forEach((event) => {
            const eventType = event.event_type as GameEventType

            // Count by type
            eventsByType[eventType] = (eventsByType[eventType] || 0) + 1

            // Count by category
            const category = getEventCategory(eventType)
            eventsByCategory[category] = (eventsByCategory[category] || 0) + 1

            // Count critical events
            // Note: Could import EVENT_METADATA here if needed
            if (
                eventType.includes('session') ||
                eventType.includes('validation') ||
                eventType.includes('submitted')
            ) {
                criticalEvents++
            }
        })

        // Calculate time metrics
        const timestamps = events.map((e) => e.timestamp_ms).sort((a, b) => a - b)
        const firstEventTime = timestamps[0]
        const lastEventTime = timestamps[timestamps.length - 1]
        const sessionDuration = lastEventTime - firstEventTime

        return {
            totalEvents: events.length,
            eventsByType,
            eventsByCategory,
            criticalEvents,
            firstEventTime,
            lastEventTime,
            sessionDuration,
        }
    }

    /**
     * Analyze user behavior patterns from events
     * Returns cognitive profile metrics
     */
    async analyzeUserBehavior(
        sessionId: string
    ): Promise<{
        hesitationScore: number // 0-100, higher = more hesitant
        changeFrequency: number // Number of answer changes
        swipeAwayRate: number // Ratio of swipes to total interactions
        averageTimeToFirstAction: number // ms
        accuracyOnFirstAttempt: number // 0-1
    }> {
        const events = await this.getSessionEvents(sessionId)

        // Filter relevant events
        const chipDropped = events.filter((e) => e.event_type === GameEventType.EDITOR_CHIP_DROPPED)
        const chipSwiped = events.filter((e) => e.event_type === GameEventType.EDITOR_CHIP_SWIPED)
        const answerChanged = events.filter((e) => e.event_type === GameEventType.EDITOR_ANSWER_CHANGED)
        const blankViewed = events.filter((e) => e.event_type === GameEventType.EDITOR_BLANK_VIEWED)

        // Calculate metrics
        const totalInteractions = chipDropped.length + chipSwiped.length
        const swipeAwayRate = totalInteractions > 0 ? chipSwiped.length / totalInteractions : 0

        // Hesitation: average time from viewing blank to dropping chip
        const hesitationTimes = chipDropped
            .map((drop) => {
                const blankId = drop.event_data.blankId
                const viewEvent = blankViewed.find((v) => v.event_data.blankId === blankId)
                if (!viewEvent) return null
                return drop.timestamp_ms - viewEvent.timestamp_ms
            })
            .filter((t): t is number => t !== null)

        const averageTimeToFirstAction =
            hesitationTimes.length > 0
                ? hesitationTimes.reduce((sum, t) => sum + t, 0) / hesitationTimes.length
                : 0

        // Normalize hesitation to 0-100 scale (assume 5s = 100)
        const hesitationScore = Math.min(100, (averageTimeToFirstAction / 5000) * 100)

        // Accuracy on first attempt (no changes)
        const blanksWithChanges = new Set(answerChanged.map((e) => e.event_data.blankId))
        const totalBlanks = new Set(chipDropped.map((e) => e.event_data.blankId)).size
        const accuracyOnFirstAttempt =
            totalBlanks > 0 ? (totalBlanks - blanksWithChanges.size) / totalBlanks : 0

        return {
            hesitationScore: Math.round(hesitationScore),
            changeFrequency: answerChanged.length,
            swipeAwayRate: Math.round(swipeAwayRate * 100) / 100,
            averageTimeToFirstAction: Math.round(averageTimeToFirstAction),
            accuracyOnFirstAttempt: Math.round(accuracyOnFirstAttempt * 100) / 100,
        }
    }

    /**
     * Get event statistics for analytics dashboard
     */
    async getEventStats(
        userId: string,
        gameType: 'editor_mode' | 'detective_log',
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        totalSessions: number
        totalEvents: number
        averageEventsPerSession: number
        mostCommonEventType: string
        averageSessionDuration: number
    }> {
        // This would require a more complex query
        // For now, return placeholder
        // In production, you'd use a proper analytics query or aggregation table

        return {
            totalSessions: 0,
            totalEvents: 0,
            averageEventsPerSession: 0,
            mostCommonEventType: '',
            averageSessionDuration: 0,
        }
    }
}
