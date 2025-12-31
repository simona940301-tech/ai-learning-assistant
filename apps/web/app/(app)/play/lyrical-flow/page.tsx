'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { Deck } from '@/components/game/Deck';
import { ArtistSelection } from '@/components/game/ArtistSelection';
import { LevelSelection } from '@/components/game/LevelSelection';
import { ReviewMode } from '@/components/game/ReviewMode'; // Import ReviewMode
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LyricalFlowPage() {
    const router = useRouter();
    const {
        gameStatus,
        setArtists,
        setLevels,
        startGame,
        generateSessionId,
        loadSavedVocabularyIds,
        setIsExiting, // 🎯 Global Exit Action
        isExiting, // 🎯 Global Exit State
    } = useGameStore();

    // 🎯 Initialize session and load saved vocabulary on mount
    React.useEffect(() => {
        generateSessionId();
        loadSavedVocabularyIds();
    }, [generateSessionId, loadSavedVocabularyIds]);

    return (
        <div
            className="relative w-full overflow-hidden flex flex-col items-center justify-center"
            style={{
                height: '100dvh', // 🎯 SOTA: Dynamic viewport height (excludes browser UI)
                touchAction: 'none', // 🎯 SOTA: Disable browser pan/zoom gestures
                overscrollBehavior: 'none', // 🎯 SOTA: Disable pull-to-refresh
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                backgroundColor: 'hsl(var(--background))' // Minimalist solid background
            }}
        >
            {/* Minimal Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 left-0 right-0 pt-[calc(env(safe-area-inset-top)+1.5rem)] px-6 pb-6 flex justify-between items-center z-50"
            >
                <button
                    onClick={() => {
                        if (gameStatus === 'playing') {
                            setIsExiting(true); // 🎯 Trigger "Game Paused" summary
                        } else {
                            router.back(); // Standard back for other modes
                        }
                    }}
                    className="group relative p-3 rounded-full overflow-hidden transition-all duration-300 transform active:scale-90"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <X className="w-5 h-5 text-zinc-600 dark:text-zinc-300" strokeWidth={2.5} />
                </button>

                <div className="px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase transition-all duration-300" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(12px)',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }}>
                    Lyrical Flow
                </div>

                <div className="w-10" /> {/* Spacer for centering */}
            </motion.div>

            {/* Main Game Area */}
            <div className="w-full max-w-md h-full max-h-[85vh] flex items-center justify-center">
                {gameStatus === 'artist-selection' && (
                    <ArtistSelection onConfirm={(artists) => setArtists(artists)} />
                )}

                {gameStatus === 'level-selection' && (
                    <LevelSelection onConfirm={(levels) => {
                        setLevels(levels);
                        startGame();
                    }} />
                )}

                {gameStatus === 'playing' && <Deck />}

                {gameStatus === 'review' && <ReviewMode />}
            </div>
        </div>
    );
}
