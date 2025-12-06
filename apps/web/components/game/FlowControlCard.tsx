import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { RotateCcw, ArrowRight, BookOpen } from 'lucide-react';
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

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className={cn(
                "absolute w-full max-w-sm h-[60vh] rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing",
                "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500", // Gold/Neon-ish
                "dark:from-yellow-600 dark:via-amber-700 dark:to-yellow-800",
                "border-4 border-white/20 overflow-hidden select-none touch-none"
            )}
            whileTap={{ scale: 1.02 }}
        >
            {/* Swipe Indication Overlay */}
            <motion.div
                style={{ opacity: overlayOpacity, backgroundColor: overlayColor }}
                className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay"
            />

            <div className="relative w-full h-full flex flex-col p-8 items-center justify-between text-white">

                {/* Header */}
                <div className="w-full flex justify-between items-center opacity-80">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} />
                        <span className="text-sm font-bold tracking-widest uppercase">Check Point</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col items-center text-center space-y-6">
                    <h2 className="text-4xl font-black drop-shadow-md tracking-tight">
                        Session<br />Complete!
                    </h2>

                    <div className="grid grid-cols-2 gap-4 w-full px-2">
                        <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold">{masteredCount}</div>
                            <div className="text-[10px] opacity-75 uppercase tracking-wide">Mastered</div>
                        </div>
                        <div className="bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <div className="text-3xl font-bold">{reviewCount}</div>
                            <div className="text-[10px] opacity-75 uppercase tracking-wide">To Review</div>
                        </div>
                    </div>
                </div>

                {/* Instructions / Swipe Hints */}
                <div className="w-full flex justify-between items-center px-4 font-bold text-sm tracking-wide">
                    <div className="flex items-center gap-2 text-white/90">
                        <ArrowRight className="rotate-180" size={20} />
                        <span>Review</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                        <span>Continue</span>
                        <ArrowRight size={20} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
