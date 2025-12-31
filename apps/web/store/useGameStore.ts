import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { MOCK_WORDS } from '../lib/mockData';
import { Word } from '../lib/types/game';

// ✅ 單例 Supabase client - 避免每次 loadWords 都重新創建
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface GameState {
    words: Word[];
    currentIndex: number;
    mistakeQueue: string[]; // ids of words swiped left
    favorites: string[]; // ids of bookmarked words (session-based)
    swipeHistory: { wordId: string; direction: 'left' | 'right' }[];
    sessionCounter: number; // tracks cards swiped in current session

    gameStatus: 'artist-selection' | 'level-selection' | 'playing' | 'review';
    selectedArtists: string[];
    selectedLevels: string[];

    // 🎯 Vocabulary Notebook State
    sessionId: string; // Unique session ID for source tracking
    savedVocabularyIds: Set<string>; // Track saved word texts (for deduplication)
    captureModalOpen: boolean; // Control VocabularyCaptureModal
    importantQueue: string[]; // 🎯 Track words marked as important (Star)
    isExiting: boolean; // 🎯 Control early exit state (Game Paused)

    // Actions
    setArtists: (artists: string[]) => void;
    setLevels: (levels: string[]) => void;
    startGame: () => void;
    loadWords: () => void;
    swipe: (direction: 'left' | 'right') => void;
    handleFlowControlSwipe: (direction: 'left' | 'right') => void; // New action for the Flow Control Card
    bookmark: (wordId: string) => void;
    toggleImportant: (wordId: string) => void; // 🎯 Action to toggle important status
    restartGame: () => void;

    // 🎯 Vocabulary Notebook Actions
    generateSessionId: () => string; // Generate UUID for session
    loadSavedVocabularyIds: () => Promise<void>; // Load saved word IDs from API
    markWordsAsSaved: (wordTexts: string[]) => void; // Mark words as saved
    openCaptureModal: () => void; // Open vocabulary capture modal
    closeCaptureModal: () => void; // Close vocabulary capture modal
    setIsExiting: (isExiting: boolean) => void; // 🎯 Set exit state
}

const SESSION_LIMIT = 20;

/**
 * ✅ 正確的 Fisher-Yates shuffle 算法
 * Math.random() - 0.5 不是均勻分布，會導致某些排列永遠不會出現
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const useGameStore = create<GameState>((set, get) => ({
    words: [],
    currentIndex: 0,
    mistakeQueue: [],
    favorites: [],
    swipeHistory: [],
    sessionCounter: 0,
    gameStatus: 'level-selection',
    selectedArtists: [],
    selectedLevels: [],

    // 🎯 Vocabulary Notebook State
    sessionId: '',
    savedVocabularyIds: new Set(),
    captureModalOpen: false,
    importantQueue: [],
    isExiting: false,

    setArtists: (artists) => set({ selectedArtists: artists, gameStatus: 'level-selection' }),
    setLevels: (levels) => set({ selectedLevels: levels }),

    startGame: () => {
        get().loadWords();
        set({ gameStatus: 'playing' });
    },

    loadWords: async () => {
        const { selectedLevels } = get();
        console.log('Fetching words for levels:', selectedLevels);

        try {
            // Map string levels "1","2" to numbers 1,2
            // If no levels selected, default to Level 1
            const levels = selectedLevels.length > 0
                ? selectedLevels.map(Number)
                : [1];

            const { data: { user } } = await supabase.auth.getUser();

            // 🚀 SOTA Optimization: Server-side Sampling & Status Check
            // Use RPC to fetch randomized words with 'is_saved' status in one go.
            const { data, error } = await supabase.rpc('get_random_words_with_status', {
                p_user_id: user?.id,
                p_levels: levels,
                p_limit: 20 // Optimized batch size (user can load more by swiping 'Right' on flow card)
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                console.warn('No words found for selected levels');
                set({
                    words: [],
                    gameStatus: 'playing',
                    currentIndex: 0,
                    mistakeQueue: [],
                    sessionCounter: 0
                });
                return;
            }

            // Map RPC result to Word interface
            const mappedWords: Word[] = data.map((w: any) => ({
                id: w.id || crypto.randomUUID(),
                text: w.text,
                pos: w.pos,
                level: `Level ${w.level}`,
                definition_zh: w.definition_zh,
                example_en: w.example_sentence,
                lyric_snippet: w.lyric_match ? {
                    artist: w.lyric_match.artist,
                    song: w.lyric_match.song_title,
                    line: w.lyric_match.lyric_snippet
                } : undefined,
                is_saved: w.is_saved // From RPC
            }));

            // Infinite Flow Logic:
            // Since we use RPC random sampling, we don't need to duplicate the array locally for "fake infinite".
            // We just let the user swipe. When they hit the FlowControlCard, we trigger 'loadWords' again
            // and the DB gives us a FRESH random batch. This is TRUE infinite flow.

            set({
                words: mappedWords, // No client-side shuffling or duplication needed
                currentIndex: 0,
                mistakeQueue: [],
                swipeHistory: [],
                sessionCounter: 0,
                gameStatus: 'playing',
                importantQueue: [] // Reset important queue on new load? Or keep it? kept per session usually. 
                // But loadWords is called for "Next Batch". We probably want to KEEP importantQueue across batches 
                // if we want to summary at the very end. 
                // HOWEVER, the "Session Recap" happens every 20 words.
                // So resetting here is probably correct for the "Batch Recap".
                // User said: "allow them to save words they feel are important".
                // If they swipe 20, get recap, save some. Then continue.
                // If they exit early, get recap.
                // So resetting on `loadWords` (which is New Batch) makes sense IF `loadWords` is only called for new batch.
                // Wait, `loadWords` is also called on `startGame`.
            });

        } catch (err) {
            console.error('Failed to load words:', err);
            // Fallback to empty or error state handling could go here
        }
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

            // 🎯 FIX: We need to clear queues between batches if we are summarizing per batch.
            // If Flow Control appears, user saw summary. 
            // "Mastered" and "To Review" counts are based on `mistakeQueue` and `sessionCounter`.
            // So we SHOULD reset them for the next batch.

            const { words, currentIndex } = get();

            // If we have plenty of words left, just reset session counter.
            if (currentIndex < words.length - 20) {
                set({
                    sessionCounter: 0,
                    mistakeQueue: [], // Reset for next batch stats
                    importantQueue: [] // Reset for next batch stats
                });
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

    toggleImportant: (wordId) => {
        set((state) => {
            const isImportant = state.importantQueue.includes(wordId);
            return {
                importantQueue: isImportant
                    ? state.importantQueue.filter(id => id !== wordId)
                    : [...state.importantQueue, wordId]
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
            importantQueue: [],
            swipeHistory: [],
            sessionCounter: 0,
            selectedArtists: [],
            selectedLevels: []
        });
    },

    // 🎯 Vocabulary Notebook Actions Implementation
    generateSessionId: () => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const sessionId = `lyrical-flow-${timestamp}-${randomId}`;
        set({ sessionId });
        return sessionId;
    },

    loadSavedVocabularyIds: async () => {
        // 🗑️ DEPRECATED: This massive fetch is no longer needed.
        // The RPC 'get_random_words_with_status' handles this efficiently per batch.
        // We keep the method signature empty to avoid breaking components calling it,
        // but it performs no action.
        console.log('[useGameStore] loadSavedVocabularyIds skipped (Optimized)');
    },

    markWordsAsSaved: (wordTexts: string[]) => {
        // Update local state is_saved flag
        set(state => ({
            words: state.words.map(w =>
                wordTexts.includes(w.text) ? { ...w, is_saved: true } : w
            ),
            // Also update Set for legacy components if any
            savedVocabularyIds: new Set([...state.savedVocabularyIds, ...wordTexts])
        }));
    },

    openCaptureModal: () => set({ captureModalOpen: true }),
    closeCaptureModal: () => set({ captureModalOpen: false }),
    setIsExiting: (isExiting) => set({ isExiting }),
}));
