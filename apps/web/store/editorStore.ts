import { create } from 'zustand'
import { GameEventType, type GameEventPayload } from '@/lib/telemetry/event-types'

// ============================================
// Types
// ============================================

export interface ChipData {
    id: string
    text: string
    label: string
    interferenceLevel: 'High' | 'Low'
    distractorTag?: 'Grammar_Mismatch' | 'Collocation_Error' | 'Semantic_Distractor_Removed'
}

export interface BlankAttemptData {
    blankId: string
    timeToFirstAction: number // ms
    totalTime: number // ms
    attempts: number
    changedAnswer: boolean
    wrongOptions: string[]
    chipSequence: Array<{
        chipId: string
        action: 'dragged' | 'swiped_away' | 'replaced'
        timestamp: number
    }>
}

interface EditorState {
    // Game Data
    blanks: Record<number, string | null> // blankNumber -> chipId
    chips: ChipData[] // Available chips in the pool
    removedChips: string[] // IDs of chips swiped away

    // Telemetry (Legacy - for backward compatibility)
    telemetry: Record<string, BlankAttemptData>
    startTime: number
    blankEntryTimes: Record<string, number> // When a blank entered viewport or game started

    // Event System (Phase A-1)
    events: Array<{
        eventType: GameEventType
        payload: any
        timestamp: number
    }>
    sessionId: string | null

    // Actions
    initializeGame: (chips: ChipData[], blankIds: number[]) => void
    setSessionId: (sessionId: string) => void
    handleDragStart: (chipId: string) => void
    handleChipDrop: (chipId: string, blankNumber: number) => void
    handleSwipeAway: (chipId: string) => void
    handleRemoveFromBlank: (blankNumber: number) => void

    // Telemetry Helpers
    recordBlankEntry: (blankId: string) => void

    // Event Helpers (Phase A-1)
    recordEvent: (eventType: GameEventType, payload: any) => void
    getEvents: () => Array<{ eventType: GameEventType; payload: any; timestamp: number }>
    clearEvents: () => void
}

// ============================================
// Store
// ============================================

export const useEditorStore = create<EditorState>((set, get) => ({
    blanks: {},
    chips: [],
    removedChips: [],
    telemetry: {},
    startTime: 0,
    blankEntryTimes: {},
    events: [],
    sessionId: null,

    initializeGame: (chips, blankIds) => {
        const initialTelemetry: Record<string, BlankAttemptData> = {}
        blankIds.forEach(id => {
            initialTelemetry[id] = {
                blankId: id.toString(),
                timeToFirstAction: 0,
                totalTime: 0,
                attempts: 0,
                changedAnswer: false,
                wrongOptions: [],
                chipSequence: []
            }
        })

        set({
            blanks: {},
            chips,
            removedChips: [],
            telemetry: initialTelemetry,
            startTime: Date.now(),
            blankEntryTimes: {} // Should be triggered by UI
        })
    },

    handleDragStart: (chipId) => {
        // Optional: Track drag start globally if needed
    },

    handleChipDrop: (chipId, blankNumber) => {
        const state = get()
        const now = Date.now()
        const blankId = blankNumber.toString()

        // Find chip data
        const chip = state.chips.find(c => c.id === chipId)
        const entryTime = state.blankEntryTimes[blankId] || state.startTime
        const hesitationTime = now - entryTime
        const previousChipId = state.blanks[blankNumber]

        // Record event (Phase A-1)
        get().recordEvent(GameEventType.EDITOR_CHIP_DROPPED, {
            blankId,
            blankNumber,
            chipId,
            chipText: chip?.text || '',
            interferenceLevel: chip?.interferenceLevel || 'Low',
            previousChipId,
            hesitationTime,
            timestamp: now - state.startTime
        })

        // Telemetry Update (Legacy)
        const prevTelemetry = state.telemetry[blankId] || {
            blankId,
            timeToFirstAction: 0,
            totalTime: 0,
            attempts: 0,
            changedAnswer: false,
            wrongOptions: [],
            chipSequence: []
        }

        const timeToFirstAction = prevTelemetry.timeToFirstAction === 0
            ? hesitationTime
            : prevTelemetry.timeToFirstAction

        const newSequence = [
            ...prevTelemetry.chipSequence,
            { chipId, action: 'dragged' as const, timestamp: now }
        ]

        // Check if replacing
        const isReplacing = !!state.blanks[blankNumber]

        set(state => ({
            blanks: { ...state.blanks, [blankNumber]: chipId },
            telemetry: {
                ...state.telemetry,
                [blankId]: {
                    ...prevTelemetry,
                    timeToFirstAction,
                    attempts: prevTelemetry.attempts + 1,
                    changedAnswer: isReplacing,
                    chipSequence: newSequence
                }
            }
        }))
    },

    handleSwipeAway: (chipId) => {
        const state = get()
        const chip = state.chips.find(c => c.id === chipId)

        if (!chip) return

        // Only allow swiping Low interference chips
        if (chip.interferenceLevel === 'High') {
            // Trigger vibration in UI (handled by component state usually, but could be tracked here)
            return
        }

        // Record event (Phase A-1)
        get().recordEvent(GameEventType.EDITOR_CHIP_SWIPED, {
            chipId,
            chipText: chip.text,
            interferenceLevel: chip.interferenceLevel,
            timestamp: Date.now() - state.startTime
        })

        set(state => ({
            removedChips: [...state.removedChips, chipId]
            // Note: Swipe away doesn't map to a specific blank, so we might not add to blank telemetry
            // unless we infer which blank it was "intended" for, which is hard.
            // We could have a global "discarded" telemetry log.
        }))
    },

    handleRemoveFromBlank: (blankNumber) => {
        const state = get()
        const blankId = blankNumber.toString()
        const prevTelemetry = state.telemetry[blankId]

        if (prevTelemetry) {
            set(state => ({
                blanks: { ...state.blanks, [blankNumber]: null },
                telemetry: {
                    ...state.telemetry,
                    [blankId]: {
                        ...prevTelemetry,
                        attempts: prevTelemetry.attempts + 1,
                        chipSequence: [
                            ...prevTelemetry.chipSequence,
                            { chipId: state.blanks[blankNumber]!, action: 'replaced', timestamp: Date.now() } // 'replaced' or 'removed'
                        ]
                    }
                }
            }))
        } else {
            set(state => ({
                blanks: { ...state.blanks, [blankNumber]: null }
            }))
        }
    },

    recordBlankEntry: (blankId) => {
        const state = get()
        if (!state.blankEntryTimes[blankId]) {
            set(state => ({
                blankEntryTimes: { ...state.blankEntryTimes, [blankId]: Date.now() }
            }))

            // Record event
            get().recordEvent(GameEventType.EDITOR_BLANK_VIEWED, {
                blankId,
                blankNumber: parseInt(blankId),
                timestamp: Date.now() - state.startTime
            })
        }
    },

    // ============================================
    // Event System Methods (Phase A-1)
    // ============================================

    setSessionId: (sessionId) => {
        set({ sessionId })
    },

    recordEvent: (eventType, payload) => {
        const state = get()
        const timestamp = Date.now() - state.startTime

        set(state => ({
            events: [
                ...state.events,
                {
                    eventType,
                    payload: {
                        ...payload,
                        sessionId: state.sessionId,
                        timestamp
                    },
                    timestamp
                }
            ]
        }))
    },

    getEvents: () => {
        return get().events
    },

    clearEvents: () => {
        set({ events: [] })
    }
}))
