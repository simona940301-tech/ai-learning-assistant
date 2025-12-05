// ============================================
// Standardized Game Telemetry Event Types
// Phase A-1: Event System Upgrade
// ============================================

/**
 * Standardized event types for all game modes
 * Follows naming convention: {game}_{action}_{target}
 */
export enum GameEventType {
    // ============================================
    // Session Lifecycle Events
    // ============================================
    SESSION_STARTED = 'session_started',
    SESSION_COMPLETED = 'session_completed',
    SESSION_ABANDONED = 'session_abandoned',

    // ============================================
    // Editor Mode Events
    // ============================================

    // Blank interactions
    EDITOR_BLANK_VIEWED = 'editor_blank_viewed', // User scrolled to blank
    EDITOR_BLANK_FOCUSED = 'editor_blank_focused', // User clicked on blank
    EDITOR_CHIP_DRAGGED = 'editor_chip_dragged', // Started dragging chip
    EDITOR_CHIP_DROPPED = 'editor_chip_dropped', // Dropped chip on blank
    EDITOR_CHIP_SWIPED = 'editor_chip_swiped', // Swiped away chip
    EDITOR_ANSWER_CHANGED = 'editor_answer_changed', // Replaced answer
    EDITOR_ANSWER_REMOVED = 'editor_answer_removed', // Removed from blank

    // Validation
    EDITOR_VALIDATION_TRIGGERED = 'editor_validation_triggered',
    EDITOR_ANSWER_CORRECT = 'editor_answer_correct',
    EDITOR_ANSWER_INCORRECT = 'editor_answer_incorrect',

    // ============================================
    // Detective's Log Events
    // ============================================

    // Evidence interactions
    DETECTIVE_TEXT_HIGHLIGHTED = 'detective_text_highlighted',
    DETECTIVE_HIGHLIGHT_REMOVED = 'detective_highlight_removed',
    DETECTIVE_EVIDENCE_DRAGGED = 'detective_evidence_dragged',
    DETECTIVE_EVIDENCE_PLACED = 'detective_evidence_placed',
    DETECTIVE_EVIDENCE_REMOVED = 'detective_evidence_removed',

    // AI interactions
    DETECTIVE_CHAIN_SUBMITTED = 'detective_chain_submitted',
    DETECTIVE_AI_FEEDBACK_RECEIVED = 'detective_ai_feedback_received',
    DETECTIVE_QUOTA_WARNING = 'detective_quota_warning',
    DETECTIVE_BUDGET_DEPLETED = 'detective_budget_depleted',

    // ============================================
    // Common Game Events
    // ============================================
    GAME_HINT_REQUESTED = 'game_hint_requested',
    GAME_HINT_VIEWED = 'game_hint_viewed',
    GAME_PAUSE = 'game_pause',
    GAME_RESUME = 'game_resume',
    GAME_ERROR = 'game_error',
}

/**
 * Event categories for analytics grouping
 */
export enum EventCategory {
    SESSION = 'session',
    INTERACTION = 'interaction',
    VALIDATION = 'validation',
    AI = 'ai',
    SYSTEM = 'system',
}

/**
 * Get category for event type
 */
export function getEventCategory(eventType: GameEventType): EventCategory {
    if (eventType.includes('session')) return EventCategory.SESSION
    if (eventType.includes('validation') || eventType.includes('correct') || eventType.includes('incorrect')) {
        return EventCategory.VALIDATION
    }
    if (eventType.includes('ai') || eventType.includes('feedback')) return EventCategory.AI
    if (eventType.includes('error')) return EventCategory.SYSTEM
    return EventCategory.INTERACTION
}

// ============================================
// Event Payload Interfaces
// ============================================

/**
 * Base event payload (all events must extend this)
 */
export interface BaseEventPayload {
    timestamp: number // Client-side timestamp (ms since session start)
    sessionId: string
    userId: string
}

/**
 * Editor Mode: Blank viewed event
 */
export interface EditorBlankViewedPayload extends BaseEventPayload {
    blankId: string
    blankNumber: number
    scrollPosition: number
}

/**
 * Editor Mode: Chip dropped event
 */
export interface EditorChipDroppedPayload extends BaseEventPayload {
    blankId: string
    blankNumber: number
    chipId: string
    chipText: string
    interferenceLevel: 'High' | 'Low'
    isCorrect: boolean
    previousChipId?: string // If replacing
    hesitationTime: number // Time from blank focus to drop
}

/**
 * Editor Mode: Chip swiped event
 */
export interface EditorChipSwipedPayload extends BaseEventPayload {
    chipId: string
    chipText: string
    interferenceLevel: 'High' | 'Low'
    swipeDirection: 'left' | 'right' | 'up' | 'down'
}

/**
 * Editor Mode: Answer changed event
 */
export interface EditorAnswerChangedPayload extends BaseEventPayload {
    blankId: string
    blankNumber: number
    oldChipId: string
    newChipId: string
    changeReason: 'second_thought' | 'validation_feedback' | 'accidental'
    timeSinceOriginal: number
}

/**
 * Detective's Log: Text highlighted event
 */
export interface DetectiveTextHighlightedPayload extends BaseEventPayload {
    paragraphId: string
    startOffset: number
    endOffset: number
    highlightedText: string
    textLength: number
    quotaRemaining: number
    isCorrectEvidence: boolean
}

/**
 * Detective's Log: Evidence placed event
 */
export interface DetectiveEvidencePlacedPayload extends BaseEventPayload {
    evidenceId: string
    questionId: string
    position: { x: number; y: number }
    rotation: number
    isCorrectForQuestion: boolean
}

/**
 * Detective's Log: AI feedback received event
 */
export interface DetectiveAIFeedbackPayload extends BaseEventPayload {
    questionId: string
    evidenceCount: number
    isValid: boolean
    confidence: number
    feedbackText: string
    budgetSpent: number
}

/**
 * Validation event
 */
export interface ValidationEventPayload extends BaseEventPayload {
    blankId: string
    isCorrect: boolean
    userAnswer: string
    correctAnswer: string
    timeToValidation: number
}

/**
 * Session completed event
 */
export interface SessionCompletedPayload extends BaseEventPayload {
    score: number
    totalPossible: number
    accuracy: number
    timeSpentSeconds: number
    completionRate: number
}

// ============================================
// Event Payload Union Type
// ============================================

export type GameEventPayload =
    | EditorBlankViewedPayload
    | EditorChipDroppedPayload
    | EditorChipSwipedPayload
    | EditorAnswerChangedPayload
    | DetectiveTextHighlightedPayload
    | DetectiveEvidencePlacedPayload
    | DetectiveAIFeedbackPayload
    | ValidationEventPayload
    | SessionCompletedPayload
    | BaseEventPayload

// ============================================
// Event Metadata for Analytics
// ============================================

/**
 * Metadata about event types for analytics
 */
export const EVENT_METADATA: Record<
    GameEventType,
    {
        category: EventCategory
        description: string
        importance: 'critical' | 'high' | 'medium' | 'low'
    }
> = {
    [GameEventType.SESSION_STARTED]: {
        category: EventCategory.SESSION,
        description: 'User started a game session',
        importance: 'critical',
    },
    [GameEventType.SESSION_COMPLETED]: {
        category: EventCategory.SESSION,
        description: 'User completed a game session',
        importance: 'critical',
    },
    [GameEventType.SESSION_ABANDONED]: {
        category: EventCategory.SESSION,
        description: 'User abandoned a game session',
        importance: 'high',
    },
    [GameEventType.EDITOR_BLANK_VIEWED]: {
        category: EventCategory.INTERACTION,
        description: 'User scrolled to a blank',
        importance: 'low',
    },
    [GameEventType.EDITOR_BLANK_FOCUSED]: {
        category: EventCategory.INTERACTION,
        description: 'User clicked on a blank',
        importance: 'medium',
    },
    [GameEventType.EDITOR_CHIP_DRAGGED]: {
        category: EventCategory.INTERACTION,
        description: 'User started dragging a chip',
        importance: 'medium',
    },
    [GameEventType.EDITOR_CHIP_DROPPED]: {
        category: EventCategory.INTERACTION,
        description: 'User dropped a chip on a blank',
        importance: 'high',
    },
    [GameEventType.EDITOR_CHIP_SWIPED]: {
        category: EventCategory.INTERACTION,
        description: 'User swiped away a chip',
        importance: 'high',
    },
    [GameEventType.EDITOR_ANSWER_CHANGED]: {
        category: EventCategory.INTERACTION,
        description: 'User changed an answer',
        importance: 'high',
    },
    [GameEventType.EDITOR_ANSWER_REMOVED]: {
        category: EventCategory.INTERACTION,
        description: 'User removed an answer',
        importance: 'medium',
    },
    [GameEventType.EDITOR_VALIDATION_TRIGGERED]: {
        category: EventCategory.VALIDATION,
        description: 'User triggered validation',
        importance: 'critical',
    },
    [GameEventType.EDITOR_ANSWER_CORRECT]: {
        category: EventCategory.VALIDATION,
        description: 'Answer was correct',
        importance: 'high',
    },
    [GameEventType.EDITOR_ANSWER_INCORRECT]: {
        category: EventCategory.VALIDATION,
        description: 'Answer was incorrect',
        importance: 'high',
    },
    [GameEventType.DETECTIVE_TEXT_HIGHLIGHTED]: {
        category: EventCategory.INTERACTION,
        description: 'User highlighted text as evidence',
        importance: 'high',
    },
    [GameEventType.DETECTIVE_HIGHLIGHT_REMOVED]: {
        category: EventCategory.INTERACTION,
        description: 'User removed a highlight',
        importance: 'medium',
    },
    [GameEventType.DETECTIVE_EVIDENCE_DRAGGED]: {
        category: EventCategory.INTERACTION,
        description: 'User dragged evidence to board',
        importance: 'medium',
    },
    [GameEventType.DETECTIVE_EVIDENCE_PLACED]: {
        category: EventCategory.INTERACTION,
        description: 'User placed evidence on board',
        importance: 'high',
    },
    [GameEventType.DETECTIVE_EVIDENCE_REMOVED]: {
        category: EventCategory.INTERACTION,
        description: 'User removed evidence from board',
        importance: 'medium',
    },
    [GameEventType.DETECTIVE_CHAIN_SUBMITTED]: {
        category: EventCategory.AI,
        description: 'User submitted evidence chain for AI analysis',
        importance: 'critical',
    },
    [GameEventType.DETECTIVE_AI_FEEDBACK_RECEIVED]: {
        category: EventCategory.AI,
        description: 'AI feedback received',
        importance: 'high',
    },
    [GameEventType.DETECTIVE_QUOTA_WARNING]: {
        category: EventCategory.SYSTEM,
        description: 'Highlight quota warning triggered',
        importance: 'medium',
    },
    [GameEventType.DETECTIVE_BUDGET_DEPLETED]: {
        category: EventCategory.SYSTEM,
        description: 'Detective budget depleted',
        importance: 'high',
    },
    [GameEventType.GAME_HINT_REQUESTED]: {
        category: EventCategory.INTERACTION,
        description: 'User requested a hint',
        importance: 'medium',
    },
    [GameEventType.GAME_HINT_VIEWED]: {
        category: EventCategory.INTERACTION,
        description: 'User viewed a hint',
        importance: 'medium',
    },
    [GameEventType.GAME_PAUSE]: {
        category: EventCategory.SYSTEM,
        description: 'Game paused',
        importance: 'low',
    },
    [GameEventType.GAME_RESUME]: {
        category: EventCategory.SYSTEM,
        description: 'Game resumed',
        importance: 'low',
    },
    [GameEventType.GAME_ERROR]: {
        category: EventCategory.SYSTEM,
        description: 'Game error occurred',
        importance: 'critical',
    },
}
