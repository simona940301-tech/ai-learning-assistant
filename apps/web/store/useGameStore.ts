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

            // Fetch words from Supabase (using singleton client)
            // Limit to 100 random words (using random sorting RPC would be better, but for MVP fetch and shuffle locally)
            const { data, error } = await supabase
                .from('words')
                .select('*')
                .in('level', levels)
                .limit(100);

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

            // ✅ 使用正確的 Fisher-Yates shuffle
            const shuffled = fisherYatesShuffle(data);

            // ✅ 優化：使用 map 直接轉換，避免不必要的中間變量
            const mappedWords: Word[] = shuffled.map(w => ({
                id: w.id || crypto.randomUUID(), // Ensure ID
                text: w.text,
                pos: w.pos,
                level: `Level ${w.level}`,
                definition_zh: w.definition_zh,
                example_en: w.example_sentence,
                lyric_snippet: w.lyric_match ? {
                    artist: w.lyric_match.artist,
                    song: w.lyric_match.song_title,
                    line: w.lyric_match.lyric_snippet
                } : undefined
            }));

            // ✅ 優化：使用 flatMap 減少迭代次數
            let finalWords = mappedWords;
            if (mappedWords.length < 20) {
                // 重複 3 次，但使用更高效的方式
                finalWords = Array(3).fill(null).flatMap((_, repeatIdx) =>
                    mappedWords.map((w, idx) => ({
                        ...w,
                        id: `${w.id}-${repeatIdx}-${idx}`
                    }))
                );
            }

            set({
                words: finalWords,
                currentIndex: 0,
                mistakeQueue: [],
                swipeHistory: [],
                sessionCounter: 0,
                gameStatus: 'playing'
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
