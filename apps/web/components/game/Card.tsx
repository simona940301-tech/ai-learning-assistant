import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Lightbulb, RotateCcw, Music, Sparkles } from 'lucide-react';
import { Word } from '../../lib/types/game';
import { cn } from '../../lib/utils';

interface CardProps {
    data: Word;
    onSwipe: (direction: 'left' | 'right') => void;
    active: boolean;
}

export const Card: React.FC<CardProps> = ({ data, onSwipe, active }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Motion values for drag
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    // Extended opacity range to allow card to fly off screen visibly
    // Fade out starts at 400px, complete at 900px
    const opacity = useTransform(x, [-900, -400, 0, 400, 900], [0, 1, 1, 1, 0]);

    // Background overlays for swipe feedback
    const rejectOpacity = useTransform(x, [-150, -50], [0.8, 0]);
    const likeOpacity = useTransform(x, [50, 150], [0, 0.8]);

    // Manual drag detection to distinguish between Click and Drag
    const isDragging = React.useRef(false);

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Small timeout to prevent the subsequent click from firing immediately
        setTimeout(() => {
            isDragging.current = false;
        }, 150);

        if (!active) return;
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    const handleClick = () => {
        if (!active || isDragging.current) return;
        setIsFlipped(!isFlipped);
    };

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag={active ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={cn(
                "absolute w-[75vw] max-w-[320px] h-[50vh] max-h-[500px] perspective-1000 touch-none cursor-grab active:cursor-grabbing",
                !active && "pointer-events-none"
            )}
            whileHover={{ scale: active ? 1.02 : 1 }}
            whileTap={{ scale: active ? 0.98 : 1 }}
        >
            <motion.div
                className="relative w-full h-full preserve-3d transition-transform duration-200"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, duration: 0.2 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* --- FRONT SIDE --- */}
                <motion.div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <CardFront
                        data={data}
                        showHint={showHint}
                        toggleHint={(e) => {
                            e.stopPropagation();
                            setShowHint(!showHint);
                        }}
                        rejectOpacity={rejectOpacity}
                        likeOpacity={likeOpacity}
                    />
                </motion.div>

                {/* --- BACK SIDE --- */}
                <motion.div
                    className="absolute inset-0 backface-hidden"
                    initial={{ rotateY: 180 }}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <CardBack data={data} />
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

// --- Sub-components for Cleaner Code ---

interface CardFrontProps {
    data: Word;
    showHint: boolean;
    toggleHint: (e: React.MouseEvent) => void;
    rejectOpacity: any; // MotionValue
    likeOpacity: any; // MotionValue
}

const CardFront: React.FC<CardFrontProps> = ({ data, showHint, toggleHint, rejectOpacity, likeOpacity }) => (
    <div className={cn(
        "w-full h-full rounded-3xl overflow-hidden shadow-2xl",
        "bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-white/20 dark:border-white/10",
        "flex flex-col items-center justify-between p-8 relative"
    )}>
        {/* Swipe Feedback Overlay - REVIEW (Red/Orange) */}
        <motion.div style={{ opacity: rejectOpacity }} className="absolute inset-0 z-10 bg-gradient-to-r from-red-500/40 to-transparent pointer-events-none" />
        {/* Swipe Feedback Overlay - MASTER (Green/Blue) */}
        <motion.div style={{ opacity: likeOpacity }} className="absolute inset-0 z-10 bg-gradient-to-l from-emerald-500/40 to-transparent pointer-events-none" />

        <div className="w-full flex justify-between items-start z-0">
            <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-500">
                {data.level || 'Level 1'}
            </div>
            {/* Hint Button */}
            <button
                onClick={toggleHint}
                className="p-2 rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 transition-colors"
            >
                <Lightbulb size={20} />
            </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full z-0">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 mb-4 text-center">
                {data.text}
            </h2>
            <span className="text-lg font-medium text-zinc-400 dark:text-zinc-500 italic font-serif">
                {data.pos}
            </span>

            {/* Hint Content */}
            <AnimatePresence>
                {showHint && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-8 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 text-center max-w-[80%]"
                    >
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            "{data.example_en.replace(new RegExp(data.text, 'gi'), '_____')}"
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <div className="w-full text-center z-0">
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-widest animate-pulse">
                Tap to Flip
            </p>
        </div>
    </div>
);

const CardBack = ({ data }: { data: Word }) => (
    <div className={cn(
        "w-full h-full rounded-3xl overflow-hidden shadow-2xl",
        "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-900",
        "border border-white/20 dark:border-white/10",
        "flex flex-col p-6 relative"
    )}>
        {/* Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="w-full flex justify-between items-start mb-4 z-10">
            <div className="flex flex-col">
                <h3 className="text-3xl font-black text-black dark:text-white leading-tight">{data.text}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 italic font-serif">
                        {data.pos}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {data.level && !data.level.startsWith('Level') ? `Level ${data.level}` : data.level || 'Level 1'}
                    </span>
                </div>
            </div>
            <RotateCcw size={18} className="text-zinc-400 mt-1" />
        </div>

        {/* Definition */}
        <div className="mb-6 z-10 bg-white/60 dark:bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/20 dark:border-white/5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Definition</span>
            <p className="text-xl font-medium text-indigo-900 dark:text-indigo-100 leading-snug">
                {data.definition_zh}
            </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 z-10 pr-1 mask-linear-fade">
            {/* Lyric Hero Section */}
            {data.lyric_snippet && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition-opacity" />
                    <div className="relative bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-pink-100 dark:border-pink-500/20 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-pink-600 dark:text-pink-400">
                            <Music size={14} />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">Lyrics Match</span>
                        </div>
                        <p className="text-base font-medium text-zinc-800 dark:text-zinc-100 italic leading-relaxed mb-3">
                            "{data.lyric_snippet.line}"
                        </p>
                        <div className="flex items-center gap-2 border-t border-pink-100 dark:border-pink-500/20 pt-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 flex items-center justify-center text-[9px] font-bold text-pink-700 dark:text-pink-300">
                                {data.lyric_snippet.artist[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-200">{data.lyric_snippet.artist}</span>
                                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">{data.lyric_snippet.song}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Example is NOW ALWAYS SHOWN */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                <span className="text-xs font-bold text-zinc-400 uppercase block mb-2">Example Sentence</span>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                    "{data.example_en}"
                </p>
            </div>
        </div>
    </div>
);

