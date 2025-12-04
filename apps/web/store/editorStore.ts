import { create } from 'zustand'

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

    // Telemetry
    telemetry: Record<string, BlankAttemptData>
    startTime: number
    blankEntryTimes: Record<string, number> // When a blank entered viewport or game started

    // Actions
    initializeGame: (chips: ChipData[], blankIds: number[]) => void
    handleDragStart: (chipId: string) => void
    handleChipDrop: (chipId: string, blankNumber: number) => void
    handleSwipeAway: (chipId: string) => void
    handleRemoveFromBlank: (blankNumber: number) => void

    // Telemetry Helpers
    recordBlankEntry: (blankId: string) => void
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

        // Telemetry Update
        const prevTelemetry = state.telemetry[blankId] || {
            blankId,
            timeToFirstAction: 0,
            totalTime: 0,
            attempts: 0,
            changedAnswer: false,
            wrongOptions: [],
            chipSequence: []
        }

        const entryTime = state.blankEntryTimes[blankId] || state.startTime
        const timeToFirstAction = prevTelemetry.timeToFirstAction === 0
            ? now - entryTime
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
        }
    }
}))
