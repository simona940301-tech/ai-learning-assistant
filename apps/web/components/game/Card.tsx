import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { Lightbulb, RotateCcw, Music, Sparkles } from 'lucide-react';
import { Word } from '../../lib/types/game';
import { cn } from '../../lib/utils';

interface CardProps {
    data: Word;
    onSwipe: (direction: 'left' | 'right') => void;
    active: boolean;
    isImportant?: boolean; // 🎯 New prop
    toggleImportant?: () => void; // 🎯 New prop
}

export const Card: React.FC<CardProps> = ({ data, onSwipe, active, isImportant, toggleImportant }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Motion values for drag - 🚀 OPTIMIZED: Reduced useTransform calls
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);

    // 🚀 OPTIMIZED: Simplified opacity - remove complex calculations
    const opacity = useTransform(x, [-600, 0, 600], [0, 1, 0]);

    // 🚀 OPTIMIZED: Use CSS-based overlays instead of motion values for better performance
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    // Manual drag detection to distinguish between Click and Drag
    const isDragging = React.useRef(false);

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDrag = () => {
        // 🚀 OPTIMIZED: Update swipe direction during drag for visual feedback
        const xVal = x.get();
        if (xVal > 50) {
            setSwipeDirection('right');
        } else if (xVal < -50) {
            setSwipeDirection('left');
        } else {
            setSwipeDirection(null);
        }
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Small timeout to prevent the subsequent click from firing immediately
        setTimeout(() => {
            isDragging.current = false;
        }, 150);

        setSwipeDirection(null); // Reset direction

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
            drag={active ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={cn(
                "absolute w-[80vw] max-w-[340px] h-[64vh] max-h-[600px] perspective-1000 touch-none cursor-grab active:cursor-grabbing will-change-transform",
                !active && "pointer-events-none"
            )}
            whileHover={{ scale: active ? 1.02 : 1 }}
            whileTap={{ scale: active ? 0.98 : 1 }}
            style={{
                x,
                rotate,
                opacity,
                top: '50%',
                left: '50%',
                marginTop: '-32vh',
                marginLeft: 'max(-170px, -40vw)',
                transform: 'translateZ(0)' // 🚀 Force hardware acceleration
            }}
        >
            <motion.div
                className="relative w-full h-full preserve-3d transition-transform duration-200"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                    restDelta: 0.01,
                    duration: 0.25 // 0.25s as requested
                }}
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
                        swipeDirection={swipeDirection}
                        isImportant={isImportant}
                        toggleImportant={toggleImportant}
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
    swipeDirection: 'left' | 'right' | null; // 🚀 OPTIMIZED: CSS-based feedback
    isImportant?: boolean;
    toggleImportant?: () => void;
}

const CardFront: React.FC<CardFrontProps> = ({ data, showHint, toggleHint, swipeDirection, isImportant, toggleImportant }) => (
    <div className={cn(
        "w-full h-full rounded-3xl overflow-hidden shadow-2xl relative",
        "bg-[#111111]", // 🎯 #111111 Dark Background
        "border border-white/5", // Subtle border
        "flex flex-col items-center justify-between p-6"
    )}>
        {/* 🚀 OPTIMIZED: Removed external noise texture for better performance */}
        {/* Use CSS noise pattern instead */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
        />

        {/* 🚀 OPTIMIZED: CSS-based swipe feedback - no motion values */}
        <div className={cn(
            "absolute inset-0 z-10 pointer-events-none transition-opacity duration-150",
            "bg-orange-500/10",
            swipeDirection === 'left' ? 'opacity-80' : 'opacity-0'
        )} />
        <div className={cn(
            "absolute inset-0 z-10 pointer-events-none transition-opacity duration-150",
            "bg-emerald-500/10",
            swipeDirection === 'right' ? 'opacity-80' : 'opacity-0'
        )} />

        {/* Top Bar */}
        <div className="w-full flex justify-between items-start z-20">
            {/* Level Capsule */}
            <div className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.08] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A46A]" /> {/* Champagne Dot */}
                <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                    {data.level || 'Level 1'}
                </span>
            </div>

            {/* Actions Group (Top Right) */}
            <div className="flex items-center gap-3">
                {/* Important Star Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleImportant && toggleImportant();
                    }}
                    className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300",
                        isImportant
                            ? "bg-[#C8A46A]/20 text-[#C8A46A]"
                            : "bg-white/5 text-zinc-600 hover:text-[#C8A46A] hover:bg-white/10"
                    )}
                >
                    <Sparkles strokeWidth={1.5} className={cn("w-4 h-4", isImportant && "fill-current")} />
                </button>

                {/* Hint Button */}
                <button
                    onClick={toggleHint}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-[#C8A46A] transition-colors"
                >
                    <Lightbulb strokeWidth={1.5} className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center w-full z-10 -mt-8">
            <h2 className="text-5xl font-semibold text-white tracking-tight mb-3 text-center">
                {data.text}
            </h2>
            <span className="text-lg font-normal text-zinc-500 italic font-serif opacity-70">
                {data.pos}
            </span>

            {/* Hint Content - Minimalist */}
            <AnimatePresence>
                {showHint && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-8 p-4 rounded-xl bg-[#C8A46A]/10 border border-[#C8A46A]/20 text-center max-w-[85%]"
                    >
                        <p className="text-sm font-medium text-[#C8A46A]/90 leading-relaxed">
                            "{data.example_en.replace(new RegExp(data.text, 'gi'), '_____')}"
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Bottom Actions / Hints */}
        <div className="w-full relative h-10 flex items-center justify-center z-10">
            {/* Minimalist 'Swipe Hint' - Glowing Bottom Bar */}
            <div className="absolute bottom-2 w-12 h-1 rounded-full bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]" />

            {/* Subtle Animated Arrows (Optional) */}
            <div className="w-full flex justify-between px-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
                {/* Left Arrow Hint */}
                <div className="text-zinc-700 text-xs tracking-wider uppercase font-medium">Review</div>
                {/* Right Arrow Hint */}
                <div className="text-zinc-700 text-xs tracking-wider uppercase font-medium">Master</div>
            </div>
        </div>
    </div>
);

const CardBack = ({ data }: { data: Word }) => (
    <div className={cn(
        "w-full h-full rounded-3xl overflow-hidden shadow-2xl relative",
        "bg-[#111111]", // Dark Background
        "border border-white/5",
        "flex flex-col p-6"
    )}>
        {/* Subtle Gradient Spots */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A46A]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        {/* Word Header */}
        <div className="w-full flex justify-between items-start mb-6 z-10">
            <div className="flex flex-col">
                <h3 className="text-3xl font-semibold text-white leading-tight">{data.text}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm font-normal text-zinc-500 italic font-serif opacity-70">
                        {data.pos}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="text-xs font-medium text-[#C8A46A] tracking-wide">
                        {data.level && !data.level.startsWith('Level') ? `Level ${data.level}` : data.level || 'Level 1'}
                    </span>
                </div>
            </div>

            {/* Note: In Apple style, we usually avoid clutter. The flip back button is implied or handled by clicking. 
                We keep the icon subtle. */}
            <RotateCcw strokeWidth={1.5} size={16} className="text-zinc-600" />
        </div>

        {/* Definition - Highlight */}
        <div className="mb-6 z-10 rounded-2xl p-5 bg-white/[0.08] border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-zinc-500">定義</span>
            <p className="text-lg font-medium leading-relaxed text-zinc-200">
                {data.definition_zh}
            </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 z-10 pr-1 mask-linear-fade scrollbar-hide">
            {/* Lyric Hero Section */}
            {data.lyric_snippet && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C8A46A] to-purple-800 rounded-2xl blur opacity-5 group-hover:opacity-10 transition-opacity" />
                    <div className="relative bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 text-[#C8A46A]">
                            <Music size={12} strokeWidth={1.5} />
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">歌詞出處</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-300 italic leading-relaxed mb-3">
                            "{data.lyric_snippet.line}"
                        </p>
                        <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C8A46A]/20 to-purple-900/20 flex items-center justify-center text-[9px] font-bold text-[#C8A46A]">
                                {data.lyric_snippet.artist[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-semibold text-zinc-300">{data.lyric_snippet.artist}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Example Sentence */}
            <div className="p-4 rounded-xl bg-transparent border border-white/5">
                <span className="text-[10px] font-bold uppercase block mb-1 text-zinc-600">例句</span>
                <p className="text-sm italic leading-relaxed text-zinc-400">
                    "{data.example_en}"
                </p>
            </div>
        </div>
    </div>
);

