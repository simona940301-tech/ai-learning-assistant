import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Lightbulb, Star, RotateCcw } from 'lucide-react';
import { Word } from '../../lib/types/game';
import { cn } from '../../lib/utils';

interface CardProps {
    data: Word;
    onSwipe: (direction: 'left' | 'right') => void;
    active: boolean; // Only the top card is active/draggable
}

export const Card: React.FC<CardProps> = ({ data, onSwipe, active }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Motion values for drag
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Background color interpolation based on swipe direction
    // Right (Green/Mastered), Left (Red/Review)
    const bgOverlayOpacity = useTransform(x, [-150, 0, 150], [0.4, 0, 0.4]);
    const bgOverlayColor = useTransform(x, [-150, 0, 150], ['rgb(239, 68, 68)', 'rgba(0,0,0,0)', 'rgb(34, 197, 94)']);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!active) return;

        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    const handleLongPress = () => {
        if (!active) return;
        setIsFlipped(!isFlipped);
    };

    // Simple long press detection
    const [touchStart, setTouchStart] = useState<number>(0);
    const handleTouchStart = () => setTouchStart(Date.now());
    const handleTouchEnd = () => {
        if (Date.now() - touchStart > 500) { // 500ms for long press
            handleLongPress();
        }
    };

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag={active ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
                "absolute w-full max-w-sm h-[60vh] rounded-2xl shadow-xl cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden select-none touch-none",
                !active && "pointer-events-none"
            )}
            whileTap={{ scale: 1.05 }}
        >
            {/* Swipe Feedback Overlay */}
            <motion.div
                style={{ opacity: bgOverlayOpacity, backgroundColor: bgOverlayColor }}
                className="absolute inset-0 z-10 pointer-events-none"
            />

            <div className="relative w-full h-full flex flex-col p-6 items-center justify-center text-center">
                {!isFlipped ? (
                    // FRONT
                    <>
                        <div className="absolute top-4 right-4 text-xs font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-full">
                            {data.level}
                        </div>

                        <div className="mb-8">
                            <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{data.text}</h2>
                            <span className="text-lg italic text-zinc-500 dark:text-zinc-400">{data.pos}</span>
                        </div>

                        {/* Hint Section */}
                        <div className="mt-8 w-full max-w-xs">
                            <button
                                onClick={() => setShowHint(!showHint)}
                                className="mx-auto flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-500 hover:bg-amber-200 transition-colors mb-4"
                            >
                                <Lightbulb size={20} />
                            </button>

                            {showHint && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl text-sm text-zinc-600 dark:text-zinc-300"
                                >
                                    "{data.example_en.replace(new RegExp(data.text, 'gi'), '_____')}"
                                </motion.div>
                            )}
                        </div>
                        <div className="absolute bottom-6 text-xs text-zinc-400">
                            Long press to flip
                        </div>
                    </>
                ) : (
                    // BACK
                    <>
                        <div className="absolute top-4 right-4">
                            <button onClick={() => setIsFlipped(false)} className="text-zinc-400 hover:text-zinc-600">
                                <RotateCcw size={20} />
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">{data.text}</h2>
                        <div className="text-xl font-medium text-blue-600 dark:text-blue-400 mb-6">
                            {data.definition_zh}
                        </div>

                        <div className="w-full text-left space-y-4">
                            <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Example</p>
                                <p className="text-zinc-700 dark:text-zinc-300 italic">"{data.example_en}"</p>
                            </div>

                            {data.lyric_snippet && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Lyrical Match</span>
                                    </div>
                                    <p className="text-zinc-800 dark:text-zinc-200 font-medium mb-1">"{data.lyric_snippet.line}"</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">— {data.lyric_snippet.artist}, <span className="italic">{data.lyric_snippet.song}</span></p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};
