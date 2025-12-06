import { create } from 'zustand';
import { MOCK_WORDS } from '../lib/mockData';
import { Word } from '../lib/types/game';

interface GameState {
    words: Word[];
    currentIndex: number;
    mistakeQueue: string[]; // ids of words swiped left
    favorites: string[]; // ids of bookmarked words
    swipeHistory: { wordId: string; direction: 'left' | 'right' }[];
    sessionCounter: number; // tracks cards swiped in current session

    gameStatus: 'artist-selection' | 'level-selection' | 'playing' | 'review';
    selectedArtists: string[];
    selectedLevels: string[];

    // Actions
    setArtists: (artists: string[]) => void;
    setLevels: (levels: string[]) => void;
    startGame: () => void;
    loadWords: () => void;
    swipe: (direction: 'left' | 'right') => void;
    handleFlowControlSwipe: (direction: 'left' | 'right') => void; // New action for the Flow Control Card
    bookmark: (wordId: string) => void;
    restartGame: () => void;
}

const SESSION_LIMIT = 20;

export const useGameStore = create<GameState>((set, get) => ({
    words: [],
    currentIndex: 0,
    mistakeQueue: [],
    favorites: [],
    swipeHistory: [],
    sessionCounter: 0,
    gameStatus: 'playing', // SKIP SELECTION: Start directly in playing mode
    selectedArtists: [],
    selectedLevels: [],

    setArtists: (artists) => set({ selectedArtists: artists, gameStatus: 'level-selection' }),
    setLevels: (levels) => set({ selectedLevels: levels }),

    startGame: () => {
        get().loadWords();
        set({ gameStatus: 'playing' });
    },

    loadWords: () => {
        const { selectedLevels } = get();
        // In a real implementation with API:
        // const words = await api.fetchWords({ levels: selectedLevels, artists: selectedArtists });

        console.log('Loading words for levels:', selectedLevels);

        // INFINITE SCROLL SIMULATION:
        // Duplicate the MOCK_WORDS to create a larger deck (e.g., 100+ items).
        // giving them unique IDs to prevent React key issues.
        const baseWords = MOCK_WORDS;
        const multipliedWords: Word[] = [];

        // Create enough words for at least 5 sessions (100 cards)
        // or just a very large number for "infinite" feel.
        for (let i = 0; i < 20; i++) {
            baseWords.forEach(w => {
                multipliedWords.push({
                    ...w,
                    id: `${w.id}-${i}` // Unique ID: originalID-iteration
                });
            });
        }

        set({
            words: multipliedWords,
            currentIndex: 0,
            mistakeQueue: [],
            swipeHistory: [],
            sessionCounter: 0,
            gameStatus: 'playing'
        });
    },

    swipe: (direction) => {
        const { words, currentIndex, sessionCounter } = get();
        const currentWord = words[currentIndex];

        if (!currentWord) return;

        set((state) => {
            const newHistory = [...state.swipeHistory, { wordId: currentWord.id, direction }];
            const newMistakeQueue = direction === 'left'
                ? [...state.mistakeQueue, currentWord.id]
                : state.mistakeQueue;

            const newCounter = state.sessionCounter + 1;

            // Check if we reached the limit. 
            // Note: We do NOT reset sessionCounter here anymore. 
            // The Deck component will detect sessionCounter >= SESSION_LIMIT and show the FlowControlCard.

            return {
                currentIndex: state.currentIndex + 1,
                swipeHistory: newHistory,
                mistakeQueue: newMistakeQueue,
                sessionCounter: newCounter,
            };
        });
    },

    handleFlowControlSwipe: (direction) => {
        if (direction === 'right') {
            // CONTINUE: Reset counter and load new words.
            // In a real "infinite" implementation, we might append more words.
            // For now, reloading ensures we get a fresh counter and "more" words (same set reloaded).
            // A better UX might be just ensuring we have enough words and only resetting the counter.
            // But if we run out? 
            // loadWords() resets everything including currentIndex.
            // If we want TRUE infinite scroll where we just keep going through the big list:
            // we should just reset `sessionCounter` to 0. Use `loadWords` only if near end.

            const { words, currentIndex } = get();

            // If we have plenty of words left, just reset session counter.
            if (currentIndex < words.length - 20) {
                set({ sessionCounter: 0 });
            } else {
                // If running low, reload (which resets to start of list effectively looping)
                get().loadWords();
            }

        } else {
            // REVIEW: Go to review mode
            set({ gameStatus: 'review' });
        }
    },

    bookmark: (wordId) => {
        set((state) => {
            const isBookmarked = state.favorites.includes(wordId);
            return {
                favorites: isBookmarked
                    ? state.favorites.filter(id => id !== wordId)
                    : [...state.favorites, wordId]
            };
        });
    },

    restartGame: () => {
        // Reuse loadWords to restart logic
        get().loadWords();
        set({
            // gameStatus: 'artist-selection', // DISABLED: Skip selection
            gameStatus: 'playing',
            currentIndex: 0,
            mistakeQueue: [],
            swipeHistory: [],
            sessionCounter: 0,
            selectedArtists: [],
            selectedLevels: []
        });
    }
}));
