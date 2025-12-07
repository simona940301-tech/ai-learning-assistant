import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Crown, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FlowControlCardProps {
    masteredCount: number;
    reviewCount: number;
    onSwipe: (direction: 'left' | 'right') => void;
}

export const FlowControlCard: React.FC<FlowControlCardProps> = ({ masteredCount, reviewCount, onSwipe }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-10, 10]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Background color prompts for swipe direction
    // Left (Review): Orange/Amber
    // Right (Continue): Blue/Cyan
    const overlayOpacity = useTransform(x, [-150, 0, 150], [0.5, 0, 0.5]);
    const overlayColor = useTransform(x, [-150, 0, 150], ['rgb(245, 158, 11)', 'rgba(0,0,0,0)', 'rgb(6, 182, 212)']);

    // Tutorial State
    const [showTutorial, setShowTutorial] = React.useState(true);

    const handleDragStart = () => {
        if (showTutorial) setShowTutorial(false);
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    return (
        <div className="relative w-full max-w-[340px] h-[55vh] flex items-center justify-center">
            {/* Tutorial Overlay */}
            <AnimatePresence>
                {showTutorial && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center top-[-15%]"
                    >
                        {/* Left Hint */}
                        <div className="absolute left-[-20%] top-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
                            <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg mb-2 whitespace-nowrap">
                                Swipe Left to Review
                            </div>
                            <ArrowRight className="text-amber-500 rotate-180 w-8 h-8 filter drop-shadow-md" />
                        </div>
                        {/* Right Hint */}
                        <div className="absolute right-[-20%] top-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
                            <div className="bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg mb-2 whitespace-nowrap">
                                Swipe Right to Continue
                            </div>
                            <ArrowRight className="text-cyan-500 w-8 h-8 filter drop-shadow-md" />
                        </div>
                        <div className="absolute top-[10%] bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md">
                            Slide to choose
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                style={{ x, rotate, opacity }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                className={cn(
                    "absolute w-full h-full rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing",
                    // Glassmorphism Base
                    "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl",
                    "border border-white/20 dark:border-white/10",
                    "overflow-hidden select-none touch-none"
                )}
                whileTap={{ scale: 1.02 }}
            >
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none" />

                {/* Swipe Indication Overlay */}
                <motion.div
                    style={{ opacity: overlayOpacity, backgroundColor: overlayColor }}
                    className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay"
                />

                <div className="relative w-full h-full flex flex-col p-8 items-center justify-between z-20">

                    {/* Header */}
                    <div className="w-full flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <BookOpen size={16} />
                            </div>
                            <span className="text-xs font-bold tracking-widest uppercase">Session Recap</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col items-center text-center space-y-8">
                        <h2 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
                            Session<br />Complete!
                        </h2>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                                <div className="flex justify-center mb-2 text-emerald-500 dark:text-emerald-400">
                                    <Crown size={24} />
                                </div>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{masteredCount}</div>
                                <div className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest">Mastered</div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                <div className="flex justify-center mb-2 text-amber-500 dark:text-amber-400">
                                    <RefreshCw size={24} />
                                </div>
                                <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mb-1">{reviewCount}</div>
                                <div className="text-[10px] font-bold text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">To Review</div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions / Swipe Hints */}
                    <div className="w-full grid grid-cols-2 gap-4">
                        {/* Left Action */}
                        <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500 group">
                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                                <ArrowRight className="rotate-180 text-zinc-400 dark:text-zinc-500 group-hover:text-amber-500" size={18} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-500 transition-colors">Review</span>
                        </div>

                        {/* Right Action */}
                        <div className="flex items-center justify-end gap-3 text-zinc-400 dark:text-zinc-500 group">
                            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-500 transition-colors">Continue</span>
                            <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                                <ArrowRight className="text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500" size={18} />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
