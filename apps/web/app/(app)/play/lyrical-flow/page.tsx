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
    const { gameStatus, setArtists, setLevels, startGame } = useGameStore();

    return (
        <div className="relative w-full h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 overflow-hidden flex flex-col items-center justify-center">
            {/* Minimal Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50"
            >
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                </button>

                <div className="px-4 py-2 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
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

            {/* Ambient Background Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
}
