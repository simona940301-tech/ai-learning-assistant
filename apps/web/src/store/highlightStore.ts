import { create } from 'zustand'

interface HighlightState {
    highlightedId: string | null
    setHighlightedId: (id: string | null) => void
}

export const useHighlightStore = create<HighlightState>((set) => ({
    highlightedId: null,
    setHighlightedId: (id) => set({ highlightedId: id }),
}))
