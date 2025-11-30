'use client'

/**
 * Chick Event System
 *
 * Centralized event tracking for Chick companion interactions.
 * Sends events to backend to update Chick state (IQ, fatigue, emotions, messages).
 *
 * Key Events:
 * - LOGIN: User logs in
 * - BATTLE_END: User completes a battle (win/loss/draw)
 * - EXPLANATION_VIEWED: User views an explanation
 * - WRONGBOOK_REVIEWED: User reviews wrong book
 * - NOTE_SAVED: User saves a note to backpack
 */

export type ChickEventType =
  | 'LOGIN'
  | 'BATTLE_END'
  | 'EXPLANATION_VIEWED'
  | 'WRONGBOOK_REVIEWED'
  | 'NOTE_SAVED'
  | 'STREAK_CONTINUE'
  | 'STREAK_BREAK'

export interface ChickEventPayload {
  // Common fields
  timestamp?: number
  userId?: string

  // Battle-specific
  battleResult?: 'win' | 'loss' | 'draw'
  battleScore?: number
  questionsCorrect?: number
  questionsTotal?: number
  opponentName?: string

  // Explanation-specific
  questionId?: string
  questionSubject?: string
  timeSpent?: number // milliseconds

  // Streak-specific
  streakDays?: number
  previousStreakDays?: number

  // Generic metadata
  metadata?: Record<string, any>
}

export interface ChickEventResponse {
  ok: boolean
  iqDelta?: number
  fatigueDelta?: number
  newEmotion?: string
  message?: string
  error?: string
}

/**
 * Send a Chick event to the backend
 * This will update Chick state and potentially generate a new message
 */
export async function sendChickEvent(
  type: ChickEventType,
  payload: ChickEventPayload = {}
): Promise<ChickEventResponse> {
  try {
    const response = await fetch('/api/chick/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        type,
        payload: {
          ...payload,
          timestamp: payload.timestamp || Date.now(),
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        ok: false,
        error: errorData.message || `Failed to send ${type} event`,
      }
    }

    const data = await response.json()
    return {
      ok: true,
      ...data,
    }
  } catch (error) {
    console.error(`Failed to send Chick event (${type}):`, error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper: Send LOGIN event
 * Called when user successfully logs in
 */
export async function sendLoginEvent() {
  return sendChickEvent('LOGIN', {
    timestamp: Date.now(),
  })
}

/**
 * Helper: Send BATTLE_END event
 * Called when user completes a battle
 */
export async function sendBattleEndEvent(payload: {
  result: 'win' | 'loss' | 'draw'
  score?: number
  questionsCorrect: number
  questionsTotal: number
  opponentName?: string
}) {
  return sendChickEvent('BATTLE_END', {
    battleResult: payload.result,
    battleScore: payload.score,
    questionsCorrect: payload.questionsCorrect,
    questionsTotal: payload.questionsTotal,
    opponentName: payload.opponentName,
    timestamp: Date.now(),
  })
}

/**
 * Helper: Send EXPLANATION_VIEWED event
 * Called when user views an explanation for the first time
 */
export async function sendExplanationViewedEvent(payload: {
  questionId: string
  subject?: string
  timeSpent?: number
}) {
  return sendChickEvent('EXPLANATION_VIEWED', {
    questionId: payload.questionId,
    questionSubject: payload.subject,
    timeSpent: payload.timeSpent,
    timestamp: Date.now(),
  })
}

/**
 * Helper: Send WRONGBOOK_REVIEWED event
 * Called when user reviews their wrong book
 */
export async function sendWrongbookReviewedEvent(payload?: {
  questionsReviewed?: number
  timeSpent?: number
}) {
  return sendChickEvent('WRONGBOOK_REVIEWED', {
    metadata: {
      questionsReviewed: payload?.questionsReviewed,
      timeSpent: payload?.timeSpent,
    },
    timestamp: Date.now(),
  })
}

/**
 * Helper: Send NOTE_SAVED event
 * Called when user saves a note to backpack
 */
export async function sendNoteSavedEvent(payload?: {
  noteId?: string
  noteType?: string
}) {
  return sendChickEvent('NOTE_SAVED', {
    metadata: {
      noteId: payload?.noteId,
      noteType: payload?.noteType,
    },
    timestamp: Date.now(),
  })
}

/**
 * Helper: Send STREAK events
 * Called when user's streak continues or breaks
 */
export async function sendStreakEvent(payload: {
  type: 'continue' | 'break'
  streakDays: number
  previousStreakDays?: number
}) {
  return sendChickEvent(payload.type === 'continue' ? 'STREAK_CONTINUE' : 'STREAK_BREAK', {
    streakDays: payload.streakDays,
    previousStreakDays: payload.previousStreakDays,
    timestamp: Date.now(),
  })
}

/**
 * Debounced event sender
 * Prevents duplicate events within a short time window
 */
class DebouncedEventSender {
  private lastEventTimes: Map<string, number> = new Map()
  private debounceMs: number

  constructor(debounceMs = 5000) {
    this.debounceMs = debounceMs
  }

  async send(type: ChickEventType, payload: ChickEventPayload = {}): Promise<ChickEventResponse | null> {
    const key = `${type}_${payload.questionId || ''}`
    const now = Date.now()
    const lastTime = this.lastEventTimes.get(key)

    // If event was sent recently, skip
    if (lastTime && now - lastTime < this.debounceMs) {
      console.log(`Skipping duplicate ${type} event (debounced)`)
      return null
    }

    // Update last event time
    this.lastEventTimes.set(key, now)

    // Send event
    return sendChickEvent(type, payload)
  }

  clear() {
    this.lastEventTimes.clear()
  }
}

// Global debounced sender instance
export const debouncedChickEvent = new DebouncedEventSender()

/**
 * Hook for sending Chick events with automatic debouncing
 */
export function useChickEvents() {
  return {
    sendEvent: debouncedChickEvent.send.bind(debouncedChickEvent),
    sendLoginEvent,
    sendBattleEndEvent,
    sendExplanationViewedEvent,
    sendWrongbookReviewedEvent,
    sendNoteSavedEvent,
    sendStreakEvent,
  }
}
