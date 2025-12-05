import { create } from 'zustand'
import { DetectiveCase, Evidence, EvidenceBoardItem, GameState, NarrativeLogItem } from './types'
import { v4 as uuidv4 } from 'uuid'

interface DetectiveStore extends GameState {
    // Actions
    initializeCase: (gameCase: DetectiveCase) => void
    highlightText: (evidence: Omit<Evidence, 'id'>) => void
    removeHighlight: (evidenceId: string) => void
    addToBoard: (evidenceId: string, position: { x: number; y: number }) => void
    moveBoardItem: (itemId: string, position: { x: number; y: number }) => void
    removeFromBoard: (itemId: string) => void
    deductQuota: (amount?: number) => void
    deductBudget: (amount: number) => void
    addNarrativeLog: (log: Omit<NarrativeLogItem, 'id' | 'timestamp'>) => void
    setAnalyzing: (isAnalyzing: boolean) => void
    setGameStatus: (status: GameState['gameStatus']) => void
    resetGame: () => void
}

const initialState: GameState = {
    caseId: null,
    currentQuota: 5,
    currentBudget: 800,
    highlightedEvidence: [],
    boardItems: [],
    narrativeLog: [],
    isAnalyzing: false,
    gameStatus: 'investigating',
}

export const useDetectiveStore = create<DetectiveStore>((set, get) => ({
    ...initialState,

    initializeCase: (gameCase) => {
        set({
            ...initialState,
            caseId: gameCase.id,
            currentQuota: gameCase.initialQuota,
            currentBudget: gameCase.initialBudget,
        })
    },

    highlightText: (evidenceData) => {
        const newEvidence: Evidence = {
            ...evidenceData,
            id: uuidv4(),
        }

        set((state) => ({
            highlightedEvidence: [...state.highlightedEvidence, newEvidence],
            currentQuota: Math.max(0, state.currentQuota - 1)
        }))

        // Trigger "Chief Slam" warning if quota is low (handled in UI via state subscription)
    },

    removeHighlight: (evidenceId) => {
        set((state) => ({
            highlightedEvidence: state.highlightedEvidence.filter((e) => e.id !== evidenceId),
            // Note: Usually we don't refund quota for removing highlights in this game design
            // to maintain the "Scarcity" drive.
            boardItems: state.boardItems.filter((item) => item.evidenceId !== evidenceId)
        }))
    },

    addToBoard: (evidenceId, position) => {
        const newItem: EvidenceBoardItem = {
            id: uuidv4(),
            evidenceId,
            x: position.x,
            y: position.y,
            rotation: (Math.random() * 10) - 5, // Random rotation between -5 and 5 degrees
        }

        set((state) => ({
            boardItems: [...state.boardItems, newItem]
        }))
    },

    moveBoardItem: (itemId, position) => {
        set((state) => ({
            boardItems: state.boardItems.map((item) =>
                item.id === itemId ? { ...item, x: position.x, y: position.y } : item
            )
        }))
    },

    removeFromBoard: (itemId) => {
        set((state) => ({
            boardItems: state.boardItems.filter((item) => item.id !== itemId)
        }))
    },

    deductQuota: (amount = 1) => {
        set((state) => ({
            currentQuota: Math.max(0, state.currentQuota - amount)
        }))
    },

    deductBudget: (amount) => {
        set((state) => ({
            currentBudget: Math.max(0, state.currentBudget - amount)
        }))
    },

    addNarrativeLog: (log) => {
        const newLog: NarrativeLogItem = {
            ...log,
            id: uuidv4(),
            timestamp: Date.now(),
        }
        set((state) => ({
            narrativeLog: [newLog, ...state.narrativeLog] // Newest first
        }))
    },

    setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

    setGameStatus: (status) => set({ gameStatus: status }),

    resetGame: () => set(initialState),
}))
